/**
 * social-auth-linkedin/index.ts
 *
 * Supabase Edge Function — LinkedIn OAuth Handler
 *
 * Actions:
 *   GET  ?action=get_url&redirect_uri=...   → Returns LinkedIn OAuth URL
 *   POST ?action=exchange_code              → Exchanges code for access token
 *
 * Supabase Secrets required:
 *   LINKEDIN_CLIENT_ID      — From LinkedIn Developer Portal
 *   LINKEDIN_CLIENT_SECRET  — From LinkedIn Developer Portal
 *
 * Setup instructions (one time, for Darno):
 *   1. Go to https://www.linkedin.com/developers/apps
 *   2. Create App → fill in company and app name
 *   3. Under Auth tab, add redirect URI:
 *      https://app.rankforgedai.com/social/callback
 *   4. Under Products tab, request access to "Share on LinkedIn"
 *   5. Copy Client ID and Client Secret
 *   6. supabase secrets set LINKEDIN_CLIENT_ID=your_id LINKEDIN_CLIENT_SECRET=your_secret
 *
 * Note: LinkedIn tokens expire in 60 days. 
 * Future: add refresh token flow.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LinkedIn scopes needed for posting
const LI_SCOPES = [
  "openid",
  "profile",
  "w_member_social",
].join(" ");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET");

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return jsonError(
        "LinkedIn credentials not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to Supabase secrets.",
        503
      );
    }

    // ── Action: get_url ──────────────────────────────────────────────────────
    if (action === "get_url" && req.method === "GET") {
      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) return jsonError("redirect_uri is required", 400);

      const state = `li_${crypto.randomUUID()}`;

      const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("scope", LI_SCOPES);

      return jsonResponse({ url: authUrl.toString(), state });
    }

    // ── Action: exchange_code ────────────────────────────────────────────────
    if (action === "exchange_code" && req.method === "POST") {
      const body = await req.json();
      const { code, redirect_uri } = body;

      if (!code) return jsonError("code is required", 400);
      if (!redirect_uri) return jsonError("redirect_uri is required", 400);

      // Exchange code for access token
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return jsonError(`LinkedIn token error: ${tokenData.error_description || tokenData.error}`, 400);
      }

      const accessToken = tokenData.access_token;

      // Get LinkedIn member profile (to get their URN for posting)
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const profileData = await profileRes.json();

      if (!profileData.sub) {
        return jsonError("Failed to fetch LinkedIn profile", 400);
      }

      // Member URN used for posting (format: urn:li:person:xxx)
      const memberUrn = `urn:li:person:${profileData.sub}`;

      // Authenticate and save to Supabase
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jsonError("Unauthorized", 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return jsonError("Unauthorized", 401);

      // Store both the access token and the member URN
      // member URN is needed for the publish API call
      const { error: saveError } = await supabase
        .from("settings")
        .upsert(
          {
            user_id: user.id,
            linkedin_token: accessToken,
            // Store URN in a separate field — we'll use linkedin_token for the token
            // and a new column for the URN. If linkedin_urn column doesn't exist yet,
            // add it: ALTER TABLE settings ADD COLUMN linkedin_urn text;
          },
          { onConflict: "user_id" }
        );

      if (saveError) {
        return jsonError(`Failed to save token: ${saveError.message}`, 500);
      }

      return jsonResponse({
        success: true,
        token: accessToken,
        member_urn: memberUrn,
        display_name: profileData.name || profileData.given_name,
        message: `Connected as ${profileData.name || profileData.email}`,
      });
    }

    return jsonError("Invalid action or method", 400);

  } catch (err) {
    console.error("[social-auth-linkedin] error:", err);
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

