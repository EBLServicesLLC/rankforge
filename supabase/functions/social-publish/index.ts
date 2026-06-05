/**
 * social-publish/index.ts
 * Handles both AI generation and publishing to social platforms
 *
 * POST /functions/v1/social-publish
 * Action: generate — { action: "generate", topic: string, businessName: string, platforms: string[] }
 * Action: publish  — { action: "publish", posts: { facebook: string, linkedin: string }, platforms: string[] }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAUDE_MODEL = "claude-sonnet-4-6";

const PLATFORM_CONFIG = {
  facebook: {
    label: "Facebook",
    tone: "friendly, conversational, and engaging. Use 1-2 emojis. End with a call to action.",
    maxChars: 500,
  },
  linkedin: {
    label: "LinkedIn",
    tone: "professional, insightful, and concise. No emojis. End with a thought-provoking question or insight.",
    maxChars: 1300,
  },
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

    const body = await req.json();
    const { action } = body;

    // ── ACTION: generate ────────────────────────────────────────────────────
    if (action === "generate") {
      const { topic, businessName, platforms } = body;

      if (!topic?.trim()) return jsonError("topic is required", 400);
      if (!platforms?.length) return jsonError("platforms array is required", 400);

      // Get Anthropic key from settings
      const { data: settings } = await supabase
        .from("settings")
        .select("anthropic_key")
        .eq("user_id", user.id)
        .single();

      const anthropicKey = settings?.anthropic_key || Deno.env.get("ANTHROPIC_API_KEY");

      if (!anthropicKey) {
        return jsonError("No Anthropic API key found. Please add your API key in the API Keys tab.", 400);
      }

      const posts: Record<string, string> = {};

      for (const pid of platforms) {
        const config = PLATFORM_CONFIG[pid as keyof typeof PLATFORM_CONFIG];
        if (!config) continue;

        const prompt = `You are a social media expert writing for a local business.

Business name: ${businessName || "the business"}
Platform: ${config.label}
Tone: ${config.tone}
Target length: Under ${config.maxChars} characters for best engagement

Topic / message to post about:
${topic}

Write a single social media post for ${config.label}.
- Do not include quotation marks around the post
- Do not add any explanation, preamble, or label — just the post text itself
- Stay under ${config.maxChars} characters`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          return jsonError(`AI generation failed: ${data.error?.message || "Unknown error"}`, 500);
        }

        posts[pid] = data.content?.[0]?.text?.trim() || "";
      }

      return jsonResponse({ success: true, posts });
    }

    // ── ACTION: publish ─────────────────────────────────────────────────────
    if (action === "publish") {
      const { posts, platforms } = body;

      if (!posts || typeof posts !== "object") return jsonError("posts object is required", 400);
      if (!platforms?.length) return jsonError("platforms array is required", 400);

      // Load subscriber's tokens
      const { data: settings } = await supabase
        .from("settings")
        .select("fb_token, fb_page_id, linkedin_token")
        .eq("user_id", user.id)
        .single();

      if (!settings) return jsonError("Failed to load account settings", 500);

      const results = [];

      for (const pid of platforms) {
        const content = posts[pid];
        if (!content) continue;

        if (pid === "facebook") {
          results.push({ platform: "Facebook", ...(await publishToFacebook(settings.fb_token, settings.fb_page_id, content)) });
        }
        if (pid === "linkedin") {
          results.push({ platform: "LinkedIn", ...(await publishToLinkedIn(settings.linkedin_token, content)) });
        }
      }

      const allSucceeded = results.every(r => r.success);
      return jsonResponse({ allSucceeded, anySucceeded: results.some(r => r.success), results });
    }

    // Legacy support — old publish format without action field
    if (!action && body.content && body.platforms) {
      const { content, platforms } = body;
      const { data: settings } = await supabase
        .from("settings")
        .select("fb_token, fb_page_id, linkedin_token")
        .eq("user_id", user.id)
        .single();

      const results = [];
      for (const pid of platforms) {
        if (pid === "facebook") results.push({ platform: "Facebook", ...(await publishToFacebook(settings?.fb_token, settings?.fb_page_id, content)) });
        if (pid === "linkedin") results.push({ platform: "LinkedIn", ...(await publishToLinkedIn(settings?.linkedin_token, content)) });
      }
      const allSucceeded = results.every(r => r.success);
      return jsonResponse({ allSucceeded, anySucceeded: results.some(r => r.success), results });
    }

    return jsonError("Invalid action. Use 'generate' or 'publish'.", 400);

  } catch (err) {
    console.error("[social-publish] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

// ─── Facebook Publisher ───────────────────────────────────────────────────────

async function publishToFacebook(pageToken: string | null, pageId: string | null, content: string) {
  if (!pageToken || !pageId) return { success: false, message: "Facebook not connected." };
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, access_token: pageToken }),
    });
    const data = await res.json();
    if (data.error) {
      if (data.error.code === 190) return { success: false, message: "Facebook token expired. Please reconnect." };
      return { success: false, message: `Facebook error: ${data.error.message}` };
    }
    return { success: true, message: "Posted successfully", post_id: data.id };
  } catch (err) {
    return { success: false, message: `Network error: ${err.message}` };
  }
}

// ─── LinkedIn Publisher ───────────────────────────────────────────────────────

async function publishToLinkedIn(accessToken: string | null, content: string) {
  if (!accessToken) return { success: false, message: "LinkedIn not connected." };
  try {
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) return { success: false, message: "LinkedIn token expired. Please reconnect." };
    const profile = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.sub}`;

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: content },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!postRes.ok) {
      const err = await postRes.json();
      return { success: false, message: `LinkedIn error: ${err.message || "Unknown error"}` };
    }
    const postData = await postRes.json();
    return { success: true, message: "Posted successfully", post_id: postData.id };
  } catch (err) {
    return { success: false, message: `Network error: ${err.message}` };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
