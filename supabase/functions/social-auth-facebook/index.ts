/**
 * social-auth-facebook/index.ts
 *
 * Supabase Edge Function — Facebook OAuth Handler
 *
 * Actions:
 *   GET  ?action=get_url&redirect_uri=...   → Returns Facebook OAuth URL
 *   POST ?action=exchange_code              → Exchanges code for page token
 *
 * Supabase Secrets required:
 *   FACEBOOK_APP_ID       — From Facebook Developer Portal
 *   FACEBOOK_APP_SECRET   — From Facebook Developer Portal
 *
 * Setup instructions (one time, for Darno):
 *   1. Go to https://developers.facebook.com
 *   2. Create App → Business type
 *   3. Add "Facebook Login" product
 *   4. Set redirect URI: https://app.rankforgedai.com/social/callback
 *   5. Copy App ID and App Secret
 *   6. supabase secrets set FACEBOOK_APP_ID=your_id FACEBOOK_APP_SECRET=your_secret
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Facebook permissions needed: manage_pages + pages_show_list + publish_pages
const FB_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
].join(",");

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const APP_ID = Deno.env.get("FACEBOOK_APP_ID");
    const APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET");

    if (!APP_ID || !APP_SECRET) {
      return jsonError(
        "Facebook app credentials not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to Supabase secrets.",
        503
      );
    }

    // ── Action: get_url ──────────────────────────────────────────────────────
    if (action === "get_url" && req.method === "GET") {
      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) return jsonError("redirect_uri is required", 400);

      // State includes platform prefix so callback knows which platform
      const state = `fb_${crypto.randomUUID()}`;

      const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
      authUrl.searchParams.set("client_id", APP_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", FB_SCOPES);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("response_type", "code");

      return jsonResponse({ url: authUrl.toString(), state });
    }

    // ── Action: exchange_code ────────────────────────────────────────────────
    if (action === "exchange_code" && req.method === "POST") {
      const body = await req.json();
      const { code, redirect_uri } = body;

      if (!code) return jsonError("code is required", 400);
      if (!redirect_uri) return jsonError("redirect_uri is required", 400);

      // Exchange code for short-lived user access token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `client_id=${APP_ID}&` +
        `client_secret=${APP_SECRET}&` +
        `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
        `code=${code}`
      );

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return jsonError(`Facebook token error: ${tokenData.error.message}`, 400);
      }

      const shortLivedToken = tokenData.access_token;

      // Exchange for long-lived token (60 days)
      const longLivedRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${APP_ID}&` +
        `client_secret=${APP_SECRET}&` +
        `fb_exchange_token=${shortLivedToken}`
      );

      const longLivedData = await longLivedRes.json();

      if (longLivedData.error) {
        return jsonError(`Long-lived token error: ${longLivedData.error.message}`, 400);
      }

      const userToken = longLivedData.access_token;

      // Get pages this user manages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
      );

      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        return jsonError(`Pages fetch error: ${pagesData.error.message}`, 400);
      }

      if (!pagesData.data || pagesData.data.length === 0) {
        return jsonError(
          "No Facebook Pages found. Make sure you manage at least one Facebook Page.",
          400
        );
      }

      // Use the first page (subscriber's primary page)
      // Future: let subscriber pick from multiple pages
      const page = pagesData.data[0];
      const pageToken = page.access_token; // Page tokens are long-lived
      const pageId = page.id;
      const pageName = page.name;

      // Save to Supabase settings (authenticate the user first)
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonError("Unauthorized", 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return jsonError("Unauthorized", 401);

      const { error: saveError } = await supabase
        .from("settings")
        .upsert(
          { user_id: user.id, fb_token: pageToken, fb_page_id: pageId },
          { onConflict: "user_id" }
        );

      if (saveError) {
        return jsonError(`Failed to save token: ${saveError.message}`, 500);
      }

      return jsonResponse({
        success: true,
        token: pageToken,
        page_id: pageId,
        page_name: pageName,
        message: `Connected to Facebook Page: ${pageName}`,
      });
    }

    return jsonError("Invalid action or method", 400);

  } catch (err) {
    console.error("[social-auth-facebook] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

