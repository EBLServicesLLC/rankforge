import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Unauthorized", 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);
    const { data: settings } = await supabase.from("settings").select("anthropic_key").eq("user_id", user.id).single();
    const anthropicKey = settings?.anthropic_key;
    if (!anthropicKey) return jsonError("Anthropic API key not configured. Add it in API Keys settings.", 400);
    const { reviewText, starRating, bizName } = await req.json();
    if (!reviewText) return jsonError("reviewText is required", 400);
    const stars = Number(starRating) || 5;
    const sentiment = stars >= 4 ? "positive" : stars === 3 ? "neutral/mixed" : "negative/critical";
    const systemPrompt = `You are an expert at writing professional owner responses to Google reviews. For negative reviews: apologise sincerely, take responsibility, offer to resolve offline. For neutral: acknowledge mixed experience, invite them back. For positive: express genuine gratitude. Keep responses 60-120 words. Sound human, not corporate. Output only the response text.`;
    const userPrompt = `Business name: "${bizName || "our business"}"\nStar rating: ${stars}/5 (${sentiment} review)\nReview text: "${reviewText}"\n\nWrite a personalised owner response.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 300, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
    });
    const aiData = await res.json();
    if (aiData.error) throw new Error(aiData.error.message || "Anthropic API error");
    const response = aiData.content?.[0]?.text?.trim() || "";
    if (!response) throw new Error("Empty response from AI");
    return jsonResponse({ response });
  } catch (err) {
    console.error("[review-response-generate]", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function jsonError(error, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
