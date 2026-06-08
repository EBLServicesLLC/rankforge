/**
 * voice-search-snippet/index.ts
 * Writes a 40-60 word featured snippet for a target question + keyword
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

    const { question, keyword, services, city } = await req.json();
    if (!question?.trim()) return jsonError("question is required", 400);
    if (!keyword?.trim())  return jsonError("keyword is required", 400);

    const { data: settings } = await supabase
      .from("settings")
      .select("anthropic_key")
      .eq("user_id", user.id)
      .single();

    const anthropicKey = settings?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) return jsonError("No Anthropic API key found. Please add your key in the API Keys tab.", 400);

    const prompt = `You are a local SEO expert writing a featured snippet to win Position Zero on Google.

Business: ${services || "local business"}
Location: ${city || ""}
Target question: ${question}
Target keyword: ${keyword}

Write a featured snippet answer that:
- Is exactly 40-60 words (count carefully)
- Starts directly with the answer — no preamble, no "Great question"
- Includes the target keyword "${keyword}" naturally
- Sounds natural when read aloud by a voice assistant
- Is factual, helpful, and authoritative

Respond with ONLY the snippet text. No explanation, no quotes, no labels.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();
    if (!res.ok) return jsonError(`AI generation failed: ${aiData.error?.message || "Unknown error"}`, 500);

    const snippet = aiData.content?.[0]?.text?.trim() || "";
    if (!snippet) return jsonError("AI returned empty response. Please try again.", 500);

    return jsonResponse({ success: true, snippet });

  } catch (err) {
    console.error("[voice-search-snippet] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
