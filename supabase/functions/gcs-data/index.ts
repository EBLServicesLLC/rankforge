import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/v135/@supabase/supabase-js@2.39.3/es2022/supabase-js.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getUserIdFromJwt(authHeader: string): string | null {
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch {
    return null;
  }
}

async function getValidToken(supabase: any, userId: string): Promise<string> {
  const { data: settings } = await supabase
    .from("settings")
    .select("google_key, gsc_refresh_token")
    .eq("user_id", userId)
    .single();

  if (!settings?.google_key) throw new Error("Google Search Console not connected. Please connect it first.");

  const testRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${settings.google_key}` },
  });

  if (testRes.ok) return settings.google_key;

  if (!settings.gsc_refresh_token) throw new Error("Token expired. Please reconnect Google Search Console.");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: settings.gsc_refresh_token,
      client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type:    "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error("Token refresh failed. Please reconnect Google Search Console.");

  await supabase.from("settings").upsert(
    { user_id: userId, google_key: tokenData.access_token },
    { onConflict: "user_id" }
  );

  return tokenData.access_token;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Unauthorized", 401);

    const userId = getUserIdFromJwt(authHeader);
    if (!userId) return err("Invalid token", 401);

    // Use service role key so RLS doesn't block — user_id filter ensures data isolation
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { site_url, date_range = "last28days", row_limit = 100 } = await req.json();
    if (!site_url) return err("site_url is required", 400);

    const token = await getValidToken(supabase, userId);

    const endDate = new Date();
    const startDate = new Date();
    const days = date_range === "last7days" ? 7 : date_range === "last90days" ? 90 : 28;
    startDate.setDate(endDate.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const gscPost = (dimensions: string[], rowLimit: number) =>
      fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site_url)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions, rowLimit, dataState: "all" }),
        }
      ).then(r => r.json());

    const [kwData, pageData, deviceData] = await Promise.all([
      gscPost(["query"], row_limit),
      gscPost(["page"], 25),
      gscPost(["device"], 10),
    ]);

    if (kwData.error) throw new Error(kwData.error.message || "Search Console API error");

    const rows = kwData.rows || [];
    const band1_3   = rows.filter((r: any) => r.position <= 3);
    const band4_10  = rows.filter((r: any) => r.position > 3  && r.position <= 10);
    const band11_20 = rows.filter((r: any) => r.position > 10 && r.position <= 20);
    const band21    = rows.filter((r: any) => r.position > 20);

    const totalClicks      = rows.reduce((a: number, r: any) => a + r.clicks, 0);
    const totalImpressions = rows.reduce((a: number, r: any) => a + r.impressions, 0);
    const avgPosition      = rows.length ? (rows.reduce((a: number, r: any) => a + r.position, 0) / rows.length).toFixed(1) : 0;
    const avgCtr           = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(1) : 0;

    return ok({
      success: true,
      summary: { totalKeywords: rows.length, totalClicks, totalImpressions, avgPosition, avgCtr,
        top3: band1_3.length, top10: band1_3.length + band4_10.length,
        top20: band1_3.length + band4_10.length + band11_20.length, beyond: band21.length },
      keywords: rows,
      pages:    pageData.rows || [],
      devices:  deviceData.rows || [],
      bands: { mapsPackEligible: band1_3, page1: band4_10, opportunities: band11_20, needsWork: band21 },
      dateRange: { startDate: fmt(startDate), endDate: fmt(endDate), days },
    });

  } catch (e: any) {
    console.error("[gcs-data]", e);
    return err(e.message || "Internal server error", 500);
  }
});

const ok  = (data: unknown, s = 200) => new Response(JSON.stringify(data), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const err = (error: string, s = 400) => new Response(JSON.stringify({ error }), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
