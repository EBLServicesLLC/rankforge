/**
 * social-publish/index.ts
 *
 * Supabase Edge Function — Social Media Publisher
 *
 * POST /functions/v1/social-publish
 * Body: { content: string, platforms: string[] }
 *
 * Reads subscriber's stored tokens from settings table.
 * Posts to each requested platform.
 * Returns per-platform success/failure results.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Unauthorized", 401);

    // Authenticate user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    // Parse request body
    const body = await req.json();
    const { content, platforms } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return jsonError("content is required", 400);
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return jsonError("platforms array is required", 400);
    }

    // Load subscriber's tokens from settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("fb_token, fb_page_id, linkedin_token")
      .eq("user_id", user.id)
      .single();

    if (settingsError) {
      return jsonError("Failed to load account settings", 500);
    }

    // Publish to each platform
    const results: Array<{
      platform: string;
      success: boolean;
      message: string;
      post_id?: string;
    }> = [];

    for (const platform of platforms) {
      if (platform === "facebook") {
        const result = await publishToFacebook(
          settings.fb_token,
          settings.fb_page_id,
          content
        );
        results.push({ platform: "Facebook", ...result });
      }

      if (platform === "linkedin") {
        const result = await publishToLinkedIn(
          settings.linkedin_token,
          content
        );
        results.push({ platform: "LinkedIn", ...result });
      }
    }

    const allSucceeded = results.every((r) => r.success);
    const anySucceeded = results.some((r) => r.success);

    return jsonResponse({
      allSucceeded,
      anySucceeded,
      results,
      message: allSucceeded
        ? "Published to all platforms"
        : anySucceeded
        ? "Published to some platforms (see details)"
        : "All platforms failed (see details)",
    });

  } catch (err) {
    console.error("[social-publish] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

// ─── Facebook Publisher ───────────────────────────────────────────────────────

async function publishToFacebook(
  pageToken: string | null,
  pageId: string | null,
  content: string
): Promise<{ success: boolean; message: string; post_id?: string }> {
  if (!pageToken || !pageId) {
    return {
      success: false,
      message: "Facebook not connected. Please connect your account first.",
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          access_token: pageToken,
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      // Token expired
      if (data.error.code === 190) {
        return {
          success: false,
          message: "Facebook token expired. Please reconnect your account.",
        };
      }
      return {
        success: false,
        message: `Facebook error: ${data.error.message}`,
      };
    }

    return {
      success: true,
      message: "Posted successfully",
      post_id: data.id,
    };

  } catch (err) {
    return {
      success: false,
      message: `Network error: ${err.message}`,
    };
  }
}

// ─── LinkedIn Publisher ───────────────────────────────────────────────────────

async function publishToLinkedIn(
  accessToken: string | null,
  content: string
): Promise<{ success: boolean; message: string; post_id?: string }> {
  if (!accessToken) {
    return {
      success: false,
      message: "LinkedIn not connected. Please connect your account first.",
    };
  }

  try {
    // Get the member URN (needed for posting)
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      const errData = await profileRes.json();
      if (profileRes.status === 401) {
        return {
          success: false,
          message: "LinkedIn token expired. Please reconnect your account.",
        };
      }
      return {
        success: false,
        message: `LinkedIn profile error: ${errData.message || "Unknown error"}`,
      };
    }

    const profile = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.sub}`;

    // Post using LinkedIn Share API (UGC Posts endpoint)
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
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (!postRes.ok) {
      const errData = await postRes.json();
      if (postRes.status === 401) {
        return {
          success: false,
          message: "LinkedIn token expired. Please reconnect your account.",
        };
      }
      return {
        success: false,
        message: `LinkedIn post error: ${errData.message || errData.status || "Unknown error"}`,
      };
    }

    const postData = await postRes.json();

    return {
      success: true,
      message: "Posted successfully",
      post_id: postData.id,
    };

  } catch (err) {
    return {
      success: false,
      message: `Network error: ${err.message}`,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
