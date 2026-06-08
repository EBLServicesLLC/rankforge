/**
 * voice-search-generate/index.ts
 * Generates voice search questions using Claude AI
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-sonnet-4-5";

const TYPE_PROMPTS: Record<string, string> = {
  how:        "How [action] questions (e.g. 'How much does X cost in [city]?', 'How do I find X?')",
  what:       "What questions (e.g. 'What is the best X near me?', 'What does X include?')",
  who:        "Who questions (e.g. 'Who are the top rated X in [city]?')",
  where:      "Where questions (e.g. 'Where can I find X in [city]?')",
  cost:       "Cost & price questions (e.g. 'How much does X cost per hour?', 'What is the price of X?')",
  nearme:     "Near me queries (e.g. 'Best X near me open now', 'X services near me')",
  best:       "Best & top questions (e.g. 'Best X in [city]', 'Top rated X near me')",
  comparison: "Comparison questions (e.g. 'X vs Y — which is better?', 'Should I use X or Y?')",
};

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

    const { services, city, types, client_id } = await req.json();

    if (!services?.trim()) return jsonError("services is required", 400);
    if (!city?.trim())     return jsonError("city is required", 400);
    if (!types?.length)    return jsonError("types array is required", 400);

    const { data: settings } = await supabase
      .from("settings")
      .select("anthropic_key")
      .eq("user_id", user.id)
      .single();

    const anthropicKey = settings?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return jsonError("No Anthropic API key found. Please add your key in the API Keys tab.", 400);

    const typeLines = types.map((t: string) => TYPE_PROMPTS[t] || t).join("\n");

    const prompt = `You are a local SEO voice search expert. Generate voice search questions for a local business.

Business: ${services}
Location: ${city}

Generate 4-5 questions for each of these types:
${typeLines}

Rules:
- Questions must sound natural when spoken aloud
- Use the actual city name (${city}) in location-specific questions
- Make questions specific to the services (${services})
- Mix different phrasings — avoid repetition

Respond ONLY with a valid JSON array of question strings. No explanation, no markdown, no code fences.
Example: ["How much does HR consulting cost in Emerald Isle?", "What is the best HR service near me?"]`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();
    if (!res.ok) return jsonError(`AI generation failed: ${aiData.error?.message || "Unknown error"}`, 500);

    const raw = aiData.content?.[0]?.text?.trim() || "[]";
    let questions = [];
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      questions = JSON.parse(clean);
      if (!Array.isArray(questions)) throw new Error("Not an array");
      questions = questions.filter((q: unknown) => typeof q === "string" && q.trim());
    } catch (e) {
      console.error("[voice-search-generate] parse error:", e, "\nRaw:", raw);
      return jsonError("AI returned invalid data. Please try again.", 500);
    }

    return jsonResponse({ success: true, questions });

  } catch (err) {
    console.error("[voice-search-generate] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
