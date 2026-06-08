/**
 * local-links-email/index.ts
 * Generates a personalized outreach email for a local link prospect using Claude AI
 *
 * POST /functions/v1/local-links-email
 * Body: {
 *   prospect: { name, url, type, da, notes },
 *   city: string,
 *   service: string,
 *   tone: "friendly" | "professional" | "direct" | "collaborative",
 *   model?: string
 * }
 * Response: { success: true, email: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-sonnet-4-5";

const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly:      "Write in a warm, friendly, conversational tone. Be personable and genuine. Light and approachable — like reaching out to a neighbor.",
  professional:  "Write in a professional, polished tone. Respectful and concise. Clear value proposition. No fluff.",
  direct:        "Write in a direct, brief tone. Get to the point fast. No preamble. Short sentences. Respect their time.",
  collaborative: "Write in a collaborative, partnership-focused tone. Emphasize mutual benefit and community. Frame it as building something together.",
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
    const { prospect, city, service, tone, model } = body;

    if (!prospect?.name) return jsonError("prospect.name is required", 400);
    if (!prospect?.url)  return jsonError("prospect.url is required", 400);
    if (!city?.trim())   return jsonError("city is required", 400);
    if (!service?.trim()) return jsonError("service is required", 400);

    const selectedModel = model || CLAUDE_MODEL;
    const toneKey = tone || "professional";
    const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.professional;

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

    // ── Prompt ──────────────────────────────────────────────────────────────
    const prompt = `You are an expert local SEO outreach specialist writing a link building email on behalf of a local business owner.

BUSINESS CONTEXT:
- Location: ${city}
- Service / Industry: ${service}

TARGET PROSPECT:
- Organization: ${prospect.name}
- Website: ${prospect.url}
- Type: ${prospect.type}
- Est. Domain Authority: ${prospect.da}
${prospect.notes ? `- Notes: ${prospect.notes}` : ""}

TONE INSTRUCTIONS:
${toneInstruction}

Write a complete outreach email including:
1. Subject line (prefixed with "Subject: ")
2. A blank line
3. The email body

Rules:
- Use [Your Name], [Business Name], [Phone], [Email], [Website] as placeholders where appropriate
- Reference the prospect's organization by name naturally in the email
- Mention ${city} to establish local connection
- Keep it under 200 words for the body
- Make the link/partnership ask specific and clear — what exactly are you asking for?
- Do NOT add any explanation or preamble outside the email itself
- Do NOT wrap in quotes or code blocks — just the raw email text`;

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
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();

    if (!res.ok) {
      return jsonError(`AI generation failed: ${aiData.error?.message || "Unknown error"}`, 500);
    }

    const email = aiData.content?.[0]?.text?.trim() || "";

    if (!email) {
      return jsonError("AI returned an empty response. Please try again.", 500);
    }

    return jsonResponse({ success: true, email });

  } catch (err) {
    console.error("[local-links-email] error:", err);
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
