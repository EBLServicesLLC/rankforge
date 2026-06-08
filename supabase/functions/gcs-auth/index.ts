/**
 * gsc-auth/index.ts
 * Google Search Console OAuth Handler
 *
 * Actions:
 *   GET  ?action=get_url&redirect_uri=...  → Returns Google OAuth URL
 *   POST ?action=exchange_code             → Exchanges code for token, saves to Supabase
 *
 * Supabase Secrets required:
 *   GOOGLE_CLIENT_ID      — From Google Cloud Console
 *   GOOGLE_CLIENT_SECRET  — From Google Cloud Console
 *
 * Google Cloud Setup:
 *   1. Go to console.cloud.google.com
 *   2. Create project → Enable "Google Search Console API"
 *   3. OAuth 2.0 Credentials → Web Application
 *   4. Add redirect URI: https://rankforgedai-5ipq.vercel.app/social/callback
 *   5. Copy Client ID and Client Secret
 *   6. supabase secrets set GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return jsonError("Google credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Supabase secrets.", 503);
    }

    // ── get_url ──────────────────────────────────────────────────────────────
    if (action === "get_url" && req.method === "GET") {
      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) return jsonError("redirect_uri is required", 400);

      const state = `gsc_${crypto.randomUUID()}`;

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", GSC_SCOPES);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      return jsonResponse({ url: authUrl.toString(), state });
    }

    // ── exchange_code ─────────────────────────────────────────────────────────
    if (action === "exchange_code" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonError("Unauthorized", 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return jsonError("Unauthorized", 401);

      const { code, redirect_uri } = await req.json();
      if (!code)         return jsonError("code is required", 400);
      if (!redirect_uri) return jsonError("redirect_uri is required", 400);

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri,
          grant_type:    "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return jsonError(`Google token error: ${tokenData.error_description || tokenData.error}`, 400);
      }

      const accessToken  = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Get user email
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userRes.json();

      // Get list of Search Console properties
      const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sitesData = await sitesRes.json();
      const sites = sitesData.siteEntry || [];

      // Save tokens to Supabase settings
      const { error: saveError } = await supabase
        .from("settings")
        .upsert({
          user_id:          user.id,
          gsc_access_token:  accessToken,
          gsc_refresh_token: refreshToken,
          gsc_email:         userData.email || "",
          gsc_connected:     true,
        }, { onConflict: "user_id" });

      if (saveError) {
        return jsonError(`Failed to save token: ${saveError.message}`, 500);
      }

      return jsonResponse({
        success:       true,
        token:         accessToken,
        refresh_token: refreshToken,
        email:         userData.email,
        sites:         sites.map((s: Record<string, string>) => s.siteUrl),
        message:       `Google Search Console connected for ${userData.email}`,
      });
    }

    // ── refresh_token ─────────────────────────────────────────────────────────
    if (action === "refresh_token" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonError("Unauthorized", 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return jsonError("Unauthorized", 401);

      const { data: settings } = await supabase
        .from("settings").select("gsc_refresh_token").eq("user_id", user.id).single();

      if (!settings?.gsc_refresh_token) return jsonError("No refresh token found. Please reconnect Google Search Console.", 400);

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: settings.gsc_refresh_token,
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type:    "refresh_token",
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) return jsonError(`Token refresh failed: ${tokenData.error}`, 400);

      await supabase.from("settings").upsert(
        { user_id: user.id, gsc_access_token: tokenData.access_token },
        { onConflict: "user_id" }
      );

      return jsonResponse({ success: true, token: tokenData.access_token });
    }

    return jsonError("Invalid action or method", 400);

  } catch (err) {
    console.error("[gsc-auth] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
