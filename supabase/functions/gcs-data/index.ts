/**
 * gsc-data/index.ts
 * Fetches Search Console data for the Rank Tracker
 *
 * POST /functions/v1/gsc-data
 * Body: { site_url, date_range, dimensions, row_limit }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLIENT_ID_KEY     = "GOOGLE_CLIENT_ID";
const CLIENT_SECRET_KEY = "GOOGLE_CLIENT_SECRET";

async function getValidToken(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: settings } = await supabase
    .from("settings")
    .select("google_key, gsc_refresh_token")
    .eq("user_id", userId)
    .single();

  if (!settings?.google_key) throw new Error("Google Search Console not connected. Please connect it first.");

  // Test the token
  const testRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${settings.google_key}` },
  });

  if (testRes.ok) return settings.google_key;

  // Token expired — refresh it
  if (!settings.gsc_refresh_token) throw new Error("Token expired. Please reconnect Google Search Console.");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: settings.gsc_refresh_token,
      client_id:     Deno.env.get(CLIENT_ID_KEY)!,
      client_secret: Deno.env.get(CLIENT_SECRET_KEY)!,
      grant_type:    "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error("Token refresh failed. Please reconnect Google Search Console.");

  // Save new token
  await supabase.from("settings").upsert(
    { user_id: userId, google_key: tokenData.access_token },
    { onConflict: "user_id" }
  );

  return tokenData.access_token;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { site_url, date_range = "last28days", row_limit = 100 } = await req.json();
    if (!site_url) return jsonError("site_url is required", 400);

    const token = await getValidToken(supabase, user.id);

    // Calculate date range
    const endDate   = new Date();
    const startDate = new Date();
    const days = date_range === "last7days" ? 7 : date_range === "last90days" ? 90 : 28;
    startDate.setDate(endDate.getDate() - days);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    // Fetch keyword data
    const kwRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate:   fmt(endDate),
          dimensions: ["query"],
          rowLimit:  row_limit,
          dataState: "all",
        }),
      }
    );

    const kwData = await kwRes.json();
    if (kwData.error) throw new Error(kwData.error.message || "Search Console API error");

    // Fetch page data
    const pageRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate:   fmt(endDate),
          dimensions: ["page"],
          rowLimit:  25,
          dataState: "all",
        }),
      }
    );
    const pageData = await pageRes.json();

    // Fetch device breakdown
    const deviceRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate:   fmt(endDate),
          dimensions: ["device"],
          rowLimit:  10,
          dataState: "all",
        }),
      }
    );
    const deviceData = await deviceRes.json();

    const rows = kwData.rows || [];

    // Categorise keywords by position band
    const band1_3   = rows.filter((r: Record<string, number>) => r.position <= 3);
    const band4_10  = rows.filter((r: Record<string, number>) => r.position > 3 && r.position <= 10);
    const band11_20 = rows.filter((r: Record<string, number>) => r.position > 10 && r.position <= 20);
    const band21    = rows.filter((r: Record<string, number>) => r.position > 20);

    const totalClicks      = rows.reduce((a: number, r: Record<string, number>) => a + r.clicks, 0);
    const totalImpressions = rows.reduce((a: number, r: Record<string, number>) => a + r.impressions, 0);
    const avgPosition      = rows.length ? (rows.reduce((a: number, r: Record<string, number>) => a + r.position, 0) / rows.length).toFixed(1) : 0;
    const avgCtr           = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(1) : 0;

    return jsonResponse({
      success: true,
      summary: {
        totalKeywords:    rows.length,
        totalClicks,
        totalImpressions,
        avgPosition,
        avgCtr,
        top3:   band1_3.length,
        top10:  band1_3.length + band4_10.length,
        top20:  band1_3.length + band4_10.length + band11_20.length,
        beyond: band21.length,
      },
      keywords:    rows,
      pages:       pageData.rows || [],
      devices:     deviceData.rows || [],
      bands: {
        mapsPackEligible: band1_3,
        page1:            band4_10,
        opportunities:    band11_20,
        needsWork:        band21,
      },
      dateRange: { startDate: fmt(startDate), endDate: fmt(endDate), days },
    });

  } catch (err) {
    console.error("[gsc-data] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}