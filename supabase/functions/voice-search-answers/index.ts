/**
 * voice-search-answers/index.ts
 * Writes 40-60 word voice-optimised answers for a list of questions
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

    const { questions, biz_name, services, city } = await req.json();
    if (!questions?.length) return jsonError("questions array is required", 400);

    const { data: settings } = await supabase
      .from("settings")
      .select("anthropic_key")
      .eq("user_id", user.id)
      .single();

    const anthropicKey = settings?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return jsonError("No Anthropic API key found. Please add your key in the API Keys tab.", 400);

    const qList = questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n");

    const prompt = `You are a local SEO expert writing voice-optimised FAQ answers for a specific local business.

Business Name: ${biz_name || services}
Business Type / Services: ${services}
Location: ${city}

Write a 40-60 word answer for each question below. Answers must:
- Start with the direct answer (no preamble)
- Sound natural when read aloud
- ALWAYS mention the business by name ("${biz_name || services}") at least once per answer
- Promote the specific business — not generic advice about the industry
- Include the city (${city}) where it fits naturally
- Be between 40-60 words each
- Be factual, helpful, and specific to this business

Questions:
${qList}

Respond ONLY with a valid JSON object where keys are the exact question text and values are the answers.
No explanation, no markdown, no code fences.
Example: {"Question one?": "Answer one here...", "Question two?": "Answer two here..."}`;

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

    const raw = aiData.content?.[0]?.text?.trim() || "{}";
    let answers: Record<string, string> = {};
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      answers = JSON.parse(clean);
      if (typeof answers !== "object" || Array.isArray(answers)) throw new Error("Not an object");
    } catch (e) {
      console.error("[voice-search-answers] parse error:", e, "\nRaw:", raw);
      return jsonError("AI returned invalid data. Please try again.", 500);
    }

    return jsonResponse({ success: true, answers });

  } catch (err) {
    console.error("[voice-search-answers] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
