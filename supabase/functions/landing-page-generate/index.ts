/**
 * landing-page-generate/index.ts
 * Generates a complete local SEO landing page using Claude AI
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-sonnet-4-5";

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

    const { service, city, tone, focus, sections, profile, client_id } = await req.json();
    if (!service?.trim()) return jsonError("service is required", 400);
    if (!city?.trim()) return jsonError("city is required", 400);

    // Get anthropic key
    const { data: settings } = await supabase
      .from("settings").select("anthropic_key").eq("user_id", user.id).single();
    const anthropicKey = settings?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return jsonError("No Anthropic API key found. Please add your key in the API Keys tab.", 400);

    // Always fetch fresh from DB — don't rely solely on frontend-passed profile
    let dbProfile: Record<string, string> = {};
    if (client_id) {
      // Try with client_id first
      const { data: clientData } = await supabase
        .from("client_data")
        .select("biz_name, biz_phone, biz_website, biz_addr, biz_city, biz_state, biz_zip, biz_desc, biz_kw, biz_cat")
        .eq("id", client_id)
        .single();
      if (clientData) {
        dbProfile = clientData;
        console.log("[landing-page] client_data found:", JSON.stringify(dbProfile));
      } else {
        // Fallback: fetch by user_id
        const { data: userData } = await supabase
          .from("client_data")
          .select("biz_name, biz_phone, biz_website, biz_addr, biz_city, biz_state, biz_zip, biz_desc, biz_kw, biz_cat")
          .eq("user_id", user.id)
          .limit(1)
          .single();
        if (userData) {
          dbProfile = userData;
          console.log("[landing-page] fallback client_data found:", JSON.stringify(dbProfile));
        } else {
          console.log("[landing-page] no client_data found for client_id:", client_id, "user_id:", user.id);
        }
      }
    }

    // DB takes priority over frontend-passed profile
    const merged = { ...profile, ...dbProfile };

    const bizName    = merged.biz_name    || "Local Business";
    const bizPhone   = merged.biz_phone   || "";
    const bizWebsite = merged.biz_website || "";
    const bizAddr    = merged.biz_addr    || "";
    const bizCity    = merged.biz_city    || city.split(",")[0].trim();
    const bizState   = merged.biz_state   || "";
    const bizZip     = merged.biz_zip     || "";
    const bizDesc    = merged.biz_desc    || "";
    const bizKw      = merged.biz_kw      || merged.biz_cat || service;

    const toneInstructions: Record<string, string> = {
      professional: "Write in a professional, trustworthy, authoritative tone. Inspire confidence.",
      friendly:     "Write in a warm, friendly, approachable tone. Feel like a neighbor helping a neighbor.",
      urgent:       "Write with urgency and action-focus. Use strong CTAs. Make the reader feel they need to act now.",
      premium:      "Write in a premium, expert tone. Position the business as the top-tier choice in the area.",
    };

    const focusInstructions: Record<string, string> = {
      seo:        "Optimise heavily for search engines. Use the service and city keywords naturally throughout. Long-form, keyword-rich content.",
      conversion: "Focus on conversion. Every section should drive the reader toward calling or contacting. CTA-heavy.",
      local:      "Hyper-local focus. Mention neighbourhood landmarks, local context, community connection.",
      balanced:   "Balance SEO optimisation with conversion elements. Good keyword density AND strong CTAs.",
    };

    const wantSections = sections || ["meta","hero","services","faq","cta","schema"];

    const prompt = `You are an expert local SEO copywriter. Generate a complete, publish-ready HTML landing page.

SERVICE: ${service}
CITY: ${city}
BUSINESS NAME: ${bizName}
PHONE: ${bizPhone || "[PHONE NUMBER]"}
WEBSITE: ${bizWebsite || "[WEBSITE]"}
ADDRESS: ${bizAddr ? `${bizAddr}, ${bizCity}, ${bizState} ${bizZip}` : `${bizCity}, ${bizState}`}
DESCRIPTION: ${bizDesc || `Professional ${service} services`}
KEYWORDS: ${bizKw}

TONE: ${toneInstructions[tone] || toneInstructions.professional}
FOCUS: ${focusInstructions[focus] || focusInstructions.balanced}

SECTIONS TO INCLUDE: ${wantSections.join(", ")}

REQUIREMENTS:
- Complete HTML document with <!DOCTYPE html>, <head>, and <body>
- Title tag: "[Service] in [City] [State] | [Business Name]" — under 60 chars
- Meta description: compelling, includes service + city, under 160 chars
- H1: unique, includes service and city naturally
- Intro paragraph: 80-120 words, establishes local authority
- Services list: 4-6 specific services with brief descriptions (not generic)
- FAQ section: 3 questions specific to this service in this city, with full answers
- CTA section: clear call to action with phone number and urgency
- JSON-LD schema: Service schema + FAQPage schema, properly formatted
- CSS: clean, professional, mobile-responsive inline styles
- Use the brand color #0057e7 for headers and accents
- Include the city name naturally at least 5 times throughout the page
- Footer: business name, address, phone, "Generated by RankForge AI", copyright year ${new Date().getFullYear()}

OUTPUT: Return ONLY the complete HTML. No explanation, no markdown, no code fences. Start with <!DOCTYPE html>.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();
    if (!res.ok) return jsonError(`AI generation failed: ${aiData.error?.message || "Unknown error"}`, 500);

    let html = aiData.content?.[0]?.text?.trim() || "";
    if (!html) return jsonError("AI returned empty response.", 500);

    // Strip any accidental markdown fences
    html = html.replace(/^```html\n?/i, "").replace(/\n?```$/i, "").trim();

    // Calculate SEO score
    const lower = html.toLowerCase();
    const svcLower = service.toLowerCase();
    const cityLower = city.toLowerCase().split(",")[0].trim();
    let score = 0;
    if (lower.includes("<title>")) score += 15;
    if (lower.includes('meta name="description"')) score += 15;
    if (lower.includes("<h1")) score += 10;
    if (lower.includes(svcLower)) score += 10;
    if (lower.includes(cityLower)) score += 10;
    if (lower.includes("application/ld+json")) score += 15;
    if (lower.includes("faqpage")) score += 10;
    if (lower.includes("<ul") || lower.includes("<li")) score += 5;
    if ((lower.match(new RegExp(cityLower, "g")) || []).length >= 5) score += 10;
    score = Math.min(score, 100);

    return jsonResponse({ success: true, html, score });

  } catch (err) {
    console.error("[landing-page-generate] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
