/**
 * gbp-qa-generate/index.ts
 * Generates AI answers for GBP FAQ Q&A pairs.
 *
 * POST /functions/v1/gbp-qa-generate
 * Body (all at once):  { questions, service, city, bizName, phone, style, client_id }
 * Body (single):       { question, service, city, bizName, phone, style, client_id }
 * Returns: { answers: string[] } or { answer: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const body = await req.json();
    const { service, city, bizName, phone, style } = body;

    const styleHint = style || "40-60 words, voice-search optimised";
    const isSingle = !!body.question;

    if (isSingle) {
      // Single question mode
      const prompt = `Write a Google Business Profile answer for ${bizName || "our business"} (${service || "our service"} in ${city || "our area"}${phone ? `, phone: ${phone}` : ""}).
Style: ${styleHint}
Question: ${body.question}
Write ONLY the answer text, nothing else.`;

      const res = await callAnthropic(anthropicKey, prompt, 250);
      const answer = res.trim();
      return jsonResponse({ answer });

    } else {
      // Batch mode
      const questions = body.questions as string;
      if (!questions) return jsonError("questions or question is required", 400);

      const prompt = `Write Google Business Profile answers for ${bizName || "our business"} (${service || "our service"} in ${city || "our area"}${phone ? `, phone: ${phone}` : ""}).

Answer style: ${styleHint}
Format: A1: [answer]\nA2: [answer]\netc. One answer per line starting with A+number.
ONLY write the answers, nothing else.

${questions}`;

      const raw = await callAnthropic(anthropicKey, prompt, 2000);
      const matches = raw.match(/A\d+:\s*([\s\S]+?)(?=\nA\d+:|$)/g) || [];
      const answers = matches.map(m => m.replace(/^A\d+:\s*/, "").trim()).filter(Boolean);

      return jsonResponse({ answers });
    }

  } catch (err) {
    console.error("[gbp-qa-generate]", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

async function callAnthropic(key: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Anthropic API error");
  return data.content?.[0]?.text || "";
}

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
