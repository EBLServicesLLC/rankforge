/**
 * local-links-generate/index.ts
 * Generates local link prospecting opportunities using Claude AI
 *
 * POST /functions/v1/local-links-generate
 * Body: {
 *   city: string,
 *   service: string,
 *   types: string[],
 *   model?: string,
 *   client_id?: string
 * }
 * Response: { success: true, prospects: [{ name, url, type, da, notes }] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-sonnet-4-5";

// Keys match PROSPECT_TYPES ids in LocalLinksPage.jsx exactly
const TYPE_META: Record<string, { label: string; daRange: string; description: string }> = {
  chamber:       { label: "Chamber of Commerce & Business Associations", daRange: "40–70", description: "local chamber of commerce membership or listing pages, business association member directories" },
  blogs:         { label: "Local Blogs & Community Websites",            daRange: "20–45", description: "local community blogs, neighborhood websites, city lifestyle publications" },
  news:          { label: "Local News Sites & Directories",              daRange: "30–60", description: "local newspapers, news sites, city magazines, business journals" },
  sponsorship:   { label: "Sponsorship Opportunities",                   daRange: "25–55", description: "community events, sports teams, festivals, or nonprofits that list sponsors on their website" },
  edu:           { label: "Educational / .edu Connections",              daRange: "50–80", description: "university resource pages, community college vendor lists, school district partners" },
  gov:           { label: "Government & Municipal Pages",                daRange: "50–85", description: "city government vendor lists, municipal resource pages, county business directories" },
  complementary: { label: "Complementary Business Partners",             daRange: "15–45", description: "non-competing local businesses that could link or cross-promote on their website" },
  nonprofit:     { label: "Nonprofits & Community Orgs",                 daRange: "20–50", description: "local nonprofits that list donors, partners, or sponsors on their site" },
  events:        { label: "Local Events & Calendars",                    daRange: "20–40", description: "local event calendars, community bulletin boards, city event listing sites" },
  podcasts:      { label: "Local Podcasts & Interviews",                 daRange: "15–35", description: "local podcasts, YouTube channels, community interview shows that feature businesses" },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json();
    let { city, service, types, model, client_id } = body;

    // Pull defaults from client_data if city/service not supplied
    if ((!city || !service) && client_id) {
      const { data: clientData } = await supabase
        .from("client_data")
        .select("biz_city, biz_cat, biz_state")
        .eq("id", client_id)
        .eq("user_id", user.id)
        .single();

      if (clientData) {
        if (!city) city = clientData.biz_city
          ? `${clientData.biz_city}${clientData.biz_state ? ", " + clientData.biz_state : ""}`
          : "";
        if (!service) service = clientData.biz_cat || "";
      }
    }

    if (!city?.trim())    return jsonError("city is required", 400);
    if (!service?.trim()) return jsonError("service is required", 400);
    if (!types?.length)   return jsonError("types array is required", 400);

    const selectedModel = model || CLAUDE_MODEL;

    // ── Anthropic key ───────────────────────────────────────────────────────
    const { data: settings } = await supabase
      .from("settings")
      .select("anthropic_key")
      .eq("user_id", user.id)
      .single();

    const anthropicKey = settings?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return jsonError("No Anthropic API key found. Please add your API key in the API Keys tab.", 400);
    }

    // ── Build type context for prompt ───────────────────────────────────────
    const typeLines = types
      .map((t: string) => {
        const meta = TYPE_META[t];
        return meta
          ? `- ${meta.label} (Est. DA ${meta.daRange}): ${meta.description}`
          : `- ${t}`;
      })
      .join("\n");

    // ── Prompt ──────────────────────────────────────────────────────────────
    const prompt = `You are a local SEO link building expert. Generate a list of real, specific link prospecting opportunities for a local business.

Business location: ${city}
Primary service / industry: ${service}

Prospect types requested:
${typeLines}

Instructions:
- Generate 3 to 5 prospects per requested type
- Each prospect must be a REAL, SPECIFIC organization, website, or platform — not generic examples
- For each prospect provide:
  - name: the organization or website name
  - url: the most likely real URL (best guess based on known organizations — do not invent domains)
  - type: the EXACT type label string from the list above (e.g. "Chamber of Commerce & Business Associations")
  - da: an integer estimate within the DA range for that type
  - notes: one sentence on WHY this is a good link target and HOW to approach them

Respond ONLY with a valid JSON array. No explanation, no markdown, no code fences. Start with [ and end with ].

Example format:
[
  {
    "name": "Charlotte Chamber of Commerce",
    "url": "https://charlottechamber.com",
    "type": "Chamber of Commerce & Business Associations",
    "da": 58,
    "notes": "Member directory page — apply for business membership to get a listed backlink."
  }
]`;

    // ── Call Claude ─────────────────────────────────────────────────────────
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();

    if (!res.ok) {
      return jsonError(`AI generation failed: ${aiData.error?.message || "Unknown error"}`, 500);
    }

    const raw = aiData.content?.[0]?.text?.trim() || "[]";

    // ── Parse response ──────────────────────────────────────────────────────
    let prospects = [];
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      prospects = JSON.parse(clean);

      if (!Array.isArray(prospects)) throw new Error("Response was not an array");

      prospects = prospects.map((p: Record<string, unknown>) => ({
        name:  String(p.name  || "").trim(),
        url:   String(p.url   || "").trim(),
        type:  String(p.type  || "").trim(),
        da:    Number(p.da)   || 0,
        notes: String(p.notes || "").trim(),
      })).filter(p => p.name && p.url);

    } catch (parseErr) {
      console.error("[local-links-generate] JSON parse error:", parseErr, "\nRaw:", raw);
      return jsonError("AI returned invalid data. Please try again.", 500);
    }

    return jsonResponse({ success: true, prospects });

  } catch (err) {
    console.error("[local-links-generate] error:", err);
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
