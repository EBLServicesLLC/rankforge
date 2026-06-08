/**
 * kw-gap-analyse/index.ts
 * AI keyword gap analysis against a competitor URL
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
    const { compUrl, compName, service, city, bizName, yourKeywords = [] } = await req.json();

    if (!compUrl) return jsonError("compUrl is required", 400);

    // If no Anthropic key, return empty so frontend uses fallback
    if (!anthropicKey) return jsonResponse({ keywords: [] });

    const prompt = `You are an SEO analyst. A competitor website is: ${compUrl} (${compName || compUrl}).
Our business: ${bizName || "our business"} offering ${service || "services"} in ${city || "our area"}.
Our current keywords: ${yourKeywords.slice(0, 20).join(", ")}

Generate 15 keyword gap opportunities this competitor likely targets that we might miss.
For each keyword respond with exactly this format on one line:
KW: [keyword]|INTENT: [transactional/local/informational/commercial]|STATUS: [gap/opportunity/win]|SOURCE: [title/meta/heading/schema/url]|ACTION: [brief 1-sentence content recommendation]
STATUS gap=they have it we don't. opportunity=both could improve. win=we already cover it.
Write ONLY the 15 KW: lines, nothing else.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiData = await res.json();
    if (aiData.error) return jsonResponse({ keywords: [] });

    const raw = aiData.content?.[0]?.text || "";
    const comp = compName || compUrl;

    const keywords = raw.split("\n")
      .filter((line: string) => line.trim().startsWith("KW:"))
      .map((line: string) => {
        const parts = line.split("|").reduce((acc: Record<string, string>, part: string) => {
          const idx = part.indexOf(":");
          if (idx >= 0) acc[part.substring(0, idx).trim().toUpperCase()] = part.substring(idx + 1).trim();
          return acc;
        }, {});
        return {
          keyword: (parts.KW || "").toLowerCase(),
          intent:  (parts.INTENT || "local").toLowerCase(),
          status:  (parts.STATUS || "gap").toLowerCase(),
          source:  (parts.SOURCE || "title").toLowerCase(),
          action:  parts.ACTION || "",
          comp,
        };
      })
      .filter((k: { keyword: string }) => k.keyword.length > 0);

    return jsonResponse({ keywords });

  } catch (err) {
    console.error("[kw-gap-analyse]", err);
    return jsonResponse({ keywords: [] }); // fallback to client-side on error
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
