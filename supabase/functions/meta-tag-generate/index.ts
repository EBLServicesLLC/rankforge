/**
 * meta-tag-generate/index.ts
 * Generates SEO title tag, meta description, and H1 for a service × city combo.
 *
 * POST /functions/v1/meta-tag-generate
 * Body: { service, city, state, bizName, cta, client_id }
 * Returns: { title, meta, h1 }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CTA_HINTS: Record<string, string> = {
  call:   "Include a strong call-to-action (Call Now, Get a Quote, Book Today, Request Service)",
  urgent: "Include urgency signals (Same-Day, Fast Response, 24/7 Available, Emergency Service)",
  trust:  "Include trust signals (Licensed, Certified, Insured, Guaranteed, Award-Winning)",
  value:  "Include value signals (Free Estimate, No Hidden Fees, Best Price, Affordable)",
  local:  "Include hyperlocal signals (Serving [city], Local Experts, Based in [city])",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
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

    const { data: settings } = await supabase
      .from("settings")
      .select("anthropic_key")
      .eq("user_id", user.id)
      .single();

    const anthropicKey = settings?.anthropic_key;
    if (!anthropicKey) return jsonError("Anthropic API key not configured. Add it in API Keys settings.", 400);

    const { service, city, state, bizName, cta = "call" } = await req.json();
    if (!service || !city) return jsonError("service and city are required", 400);

    const location = state ? `${city}, ${state}` : city;
    const ctaHint  = CTA_HINTS[cta] || CTA_HINTS.call;

    const prompt = `Write SEO meta tags for: ${service} services in ${location} for ${bizName || "a local business"}.

Rules:
- TITLE: max 60 chars. Include service + city. ${ctaHint}. No clickbait.
- META: max 155 chars. Include service + city + CTA. Active voice. End with a call to action.
- H1: max 65 chars. Different phrasing from title. Include service + city naturally.

Format exactly:
TITLE: [text]
META: [text]
H1: [text]

Write ONLY these 3 lines. No preamble, no explanation.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();
    if (aiData.error) throw new Error(aiData.error.message || "Anthropic API error");

    const raw = aiData.content?.[0]?.text?.trim() || "";
    if (!raw) throw new Error("Empty response from AI");

    // Parse the 3 lines
    const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
    const metaMatch  = raw.match(/^META:\s*(.+)$/m);
    const h1Match    = raw.match(/^H1:\s*(.+)$/m);

    const title = titleMatch?.[1]?.trim() || "";
    const meta  = metaMatch?.[1]?.trim()  || "";
    const h1    = h1Match?.[1]?.trim()    || "";

    if (!title || !meta || !h1) throw new Error("AI did not return all three fields");

    return jsonResponse({ title, meta, h1 });

  } catch (err) {
    console.error("[meta-tag-generate]", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
