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
    const { custName, service, tone, reviewLink, type, bizName } = await req.json();
    if (!custName || !service) return jsonError("custName and service are required", 400);
    const isEmail = type !== "sms";
    const systemPrompt = isEmail
      ? `You are an expert at writing warm, effective review request emails for local businesses. Write in a ${tone?.toLowerCase() || "warm & personal"} tone. Never offer incentives. Keep it under 120 words. Output only the email body.`
      : `You are an expert at writing concise review request SMS messages for local businesses. Write in a ${tone?.toLowerCase() || "warm & personal"} tone. Never offer incentives. Keep it under 60 words. Output only the SMS text.`;
    const userPrompt = isEmail
      ? `Write a review request email from "${bizName || "our business"}" to a customer named ${custName}. They recently received: ${service}. ${reviewLink ? `Google review link: ${reviewLink}` : "Ask them to search for the business on Google to leave a review."} Tone: ${tone || "Warm & personal"}`
      : `Write a review request SMS from "${bizName || "our business"}" to ${custName}. They recently received: ${service}. ${reviewLink ? `Review link: ${reviewLink}` : "Ask them to search for us on Google."} Keep it short and friendly.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 400, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
    });
    const aiData = await res.json();
    if (aiData.error) throw new Error(aiData.error.message || "Anthropic API error");
    const message = aiData.content?.[0]?.text?.trim() || "";
    if (!message) throw new Error("Empty response from AI");
    return jsonResponse({ message });
  } catch (err) {
    console.error("[review-message-generate]", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function jsonError(error, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
