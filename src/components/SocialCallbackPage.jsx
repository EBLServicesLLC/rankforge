/**
 * SocialCallbackPage.jsx
 * Handles OAuth redirect from Facebook and LinkedIn at /social/callback
 *
 * Fix: Popup gets session token from parent window via postMessage
 * instead of trying to read its own session (which may not exist in popup)
 */

import { useEffect, useState } from "react";

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";

export default function SocialCallbackPage() {
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Completing connection…");

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      // OAuth denied by user
      if (error) {
        notifyParent(null, false, errorDescription || error);
        setStatus("error");
        setMessage(errorDescription || "Authorization was denied.");
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Invalid callback. Missing code or state.");
        return;
      }

      const platform = state.startsWith("fb_") ? "facebook" : "linkedin";

      try {
        // Request session token from parent window
        const accessToken = await getTokenFromParent();

        if (!accessToken) {
          throw new Error("Could not get session from parent window. Please try again.");
        }

        const endpoint = platform === "facebook"
          ? `${SUPABASE_URL}/functions/v1/social-auth-facebook`
          : `${SUPABASE_URL}/functions/v1/social-auth-linkedin`;

        // Exchange code for token via edge function
        const res = await fetch(`${endpoint}?action=exchange_code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: accessToken,
          },
          body: JSON.stringify({
            code,
            state,
            redirect_uri: window.location.origin + "/social/callback",
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || "Token exchange failed");
        }

        // Notify parent of success
        notifyParent(platform, true, null, data.token, data.page_id);
        setStatus("success");
        setMessage(
          platform === "facebook"
            ? `Facebook Page connected: ${data.page_name || "Success"}`
            : `LinkedIn connected: ${data.display_name || "Success"}`
        );

        // Auto-close after brief delay
        setTimeout(() => window.close(), 2000);

      } catch (err) {
        console.error("[SocialCallback] error:", err);
        notifyParent(platform, false, err.message);
        setStatus("error");
        setMessage(err.message || "Connection failed. Please try again.");
      }
    }

    handleCallback();
  }, []);

  // Ask parent window for its session access token via postMessage
  function getTokenFromParent() {
    return new Promise((resolve) => {
      if (!window.opener) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => resolve(null), 5000);

      function handleMessage(event) {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== "SESSION_TOKEN_RESPONSE") return;
        clearTimeout(timeout);
        window.removeEventListener("message", handleMessage);
        resolve(event.data.accessToken || null);
      }

      window.addEventListener("message", handleMessage);

      // Request the token from parent
      window.opener.postMessage(
        { type: "SESSION_TOKEN_REQUEST" },
        window.location.origin
      );
    });
  }

  function notifyParent(platform, success, error, token, pageId) {
    if (window.opener) {
      window.opener.postMessage(
        { type: "SOCIAL_AUTH_COMPLETE", platform, success, token, pageId, error },
        window.location.origin
      );
    }
  }

  const colors = { processing: "#4a90d9", success: "#4ade80", error: "#f87171" };

  return (
    <div style={{
      minHeight: "100vh", background: "#0f1117",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#161b27", border: "1px solid #1e2740",
        borderRadius: "16px", padding: "40px", textAlign: "center",
        maxWidth: "360px", width: "90%",
      }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: colors[status] + "22",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", fontSize: "28px", color: colors[status],
        }}>
          {status === "processing" ? "⟳" : status === "success" ? "✓" : "✕"}
        </div>
        <h2 style={{ margin: "0 0 8px", color: "#f1f5f9", fontSize: "18px" }}>
          {status === "processing" && "Connecting…"}
          {status === "success" && "Connected!"}
          {status === "error" && "Connection Failed"}
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: "1.5" }}>
          {message}
        </p>
        {status !== "processing" && (
          <button onClick={() => window.close()} style={{
            marginTop: "20px", background: "#1e2740", border: "none",
            color: "#94a3b8", padding: "8px 20px", borderRadius: "8px",
            cursor: "pointer", fontSize: "13px",
          }}>
            Close window
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
