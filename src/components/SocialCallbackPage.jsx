/**
 * SocialCallbackPage.jsx
 *
 * Handles the OAuth redirect from Facebook and LinkedIn.
 * Loaded at /social/callback
 *
 * Flow:
 * 1. OAuth provider redirects here with ?code=xxx&state=yyy
 * 2. This page calls the appropriate edge function to exchange code for token
 * 3. Edge function returns the token + page info
 * 4. This page sends postMessage to parent (SocialPublisherPage)
 * 5. Parent saves token to Supabase → closes popup
 */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";

export default function SocialCallbackPage() {
  const [status, setStatus] = useState("processing"); // processing | success | error
  const [message, setMessage] = useState("Completing connection…");

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state"); // contains platform identifier
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      // OAuth was denied by the user
      if (error) {
        notifyParent(null, false, errorDescription || error);
        setStatus("error");
        setMessage(errorDescription || "Authorization was denied.");
        return;
      }

      if (!code || !state) {
        notifyParent(null, false, "Missing authorization code or state.");
        setStatus("error");
        setMessage("Invalid callback. Missing code or state parameter.");
        return;
      }

      // Determine platform from state param (set by edge function on initiation)
      const platform = state.startsWith("fb_") ? "facebook" : "linkedin";

      try {
        // Get current session to authenticate the edge function call
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("No active session. Please log in first.");
        }

        const endpoint = platform === "facebook"
          ? `${SUPABASE_URL}/functions/v1/social-auth-facebook`
          : `${SUPABASE_URL}/functions/v1/social-auth-linkedin`;

        // Exchange code for token via edge function
        const res = await fetch(`${endpoint}?action=exchange_code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: session.access_token,
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

        // Send success to parent window
        notifyParent(platform, true, null, data.token, data.page_id);
        setStatus("success");
        setMessage(`${platform === "facebook" ? "Facebook" : "LinkedIn"} connected successfully!`);

        // Auto-close after brief delay
        setTimeout(() => window.close(), 1500);

      } catch (err) {
        console.error("[SocialCallback] error:", err);
        notifyParent(platform, false, err.message);
        setStatus("error");
        setMessage(err.message || "Connection failed. Please try again.");
      }
    }

    handleCallback();
  }, []);

  function notifyParent(platform, success, error, token, pageId) {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "SOCIAL_AUTH_COMPLETE",
          platform,
          success,
          token,
          pageId,
          error,
        },
        window.location.origin
      );
    }
  }

  const icons = {
    processing: "⟳",
    success: "✓",
    error: "✕",
  };

  const colors = {
    processing: "#4a90d9",
    success: "#4ade80",
    error: "#f87171",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#161b27",
        border: "1px solid #1e2740",
        borderRadius: "16px",
        padding: "40px",
        textAlign: "center",
        maxWidth: "360px",
        width: "90%",
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: colors[status] + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "28px",
          color: colors[status],
          animation: status === "processing" ? "spin 1s linear infinite" : "none",
        }}>
          {status === "processing" ? (
            <span style={{ display: "inline-block" }}>⟳</span>
          ) : (
            icons[status]
          )}
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
          <button
            onClick={() => window.close()}
            style={{
              marginTop: "20px",
              background: "#1e2740",
              border: "none",
              color: "#94a3b8",
              padding: "8px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Close window
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
