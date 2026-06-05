/**
 * SocialPublisherPage.jsx
 * /social — Account connection wizard only
 * Opens in a new tab from rankforge3 Social Publisher tab
 * "Done" button closes this tab and returns user to rankforge3
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const PLATFORMS = {
  facebook: {
    id: "facebook",
    label: "Facebook",
    icon: "ti ti-brand-facebook",
    color: "#1877F2",
    tokenKey: "fb_token",
    pageIdKey: "fb_page_id",
    authEndpoint: "/functions/v1/social-auth-facebook",
    description: "Post to your Facebook Business Page",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    icon: "ti ti-brand-linkedin",
    color: "#0A66C2",
    tokenKey: "linkedin_token",
    pageIdKey: null,
    authEndpoint: "/functions/v1/social-auth-linkedin",
    description: "Post to your LinkedIn profile",
  },
};

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";

function getHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

export default function SocialPublisherPage() {
  const [session, setSession] = useState(null);
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Load connection status ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("settings")
          .select("fb_token, fb_page_id, linkedin_token")
          .eq("user_id", session.user.id)
          .single();
        const s = data || {};
        setConnections({ facebook: !!s.fb_token, linkedin: !!s.linkedin_token });
      } catch (err) {
        setError("Failed to load connection status.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  // ── OAuth message listener ──────────────────────────────────────────────────
  useEffect(() => {
    function handleMsg(event) {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "SESSION_TOKEN_REQUEST") {
        supabase.auth.getSession().then(({ data: { session } }) => {
          event.source?.postMessage(
            { type: "SESSION_TOKEN_RESPONSE", accessToken: session?.access_token || null },
            window.location.origin
          );
        });
        return;
      }

      if (event.data?.type !== "SOCIAL_AUTH_COMPLETE") return;
      const { platform, success, token, pageId, error: authError } = event.data;

      if (!success) {
        setError(`${platform} connection failed: ${authError || "Unknown error"}`);
        setConnecting(null);
        return;
      }

      saveToken(platform, token, pageId);
    }

    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [session]);

  // ── Connect ─────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async (platformId) => {
    if (!session) return;
    setConnecting(platformId);
    setError(null);
    const platform = PLATFORMS[platformId];

    try {
      const res = await fetch(
        `${SUPABASE_URL}${platform.authEndpoint}?action=get_url&redirect_uri=${encodeURIComponent(window.location.origin + "/social/callback")}`,
        { headers: getHeaders(session) }
      );
      if (!res.ok) throw new Error((await res.json()).error || "Failed to get auth URL");
      const { url } = await res.json();

      const popup = window.open(url, `${platformId}_oauth`, "width=600,height=700,scrollbars=yes");
      if (!popup) throw new Error("Popup blocked. Please allow popups for this site.");

      const poll = setInterval(async () => {
        if (popup.closed) {
          clearInterval(poll);
          setConnecting(null);
          await refreshConnections();
        }
      }, 500);
    } catch (err) {
      setError(err.message);
      setConnecting(null);
    }
  }, [session]);

  // ── Disconnect ──────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async (platformId) => {
    if (!session) return;
    setError(null);
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: null };
    if (platform.pageIdKey) update[platform.pageIdKey] = null;

    const { error } = await supabase
      .from("settings").update(update).eq("user_id", session.user.id);
    if (error) { setError(`Failed to disconnect: ${error.message}`); return; }
    setConnections(prev => ({ ...prev, [platformId]: false }));
  }, [session]);

  // ── Save token ──────────────────────────────────────────────────────────────
  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return;
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: token };
    if (platform.pageIdKey && pageId) update[platform.pageIdKey] = pageId;

    await supabase.from("settings")
      .upsert({ user_id: session.user.id, ...update }, { onConflict: "user_id" });
    setConnections(prev => ({ ...prev, [platformId]: true }));
    setConnecting(null);
  }, [session]);

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const refreshConnections = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("settings").select("fb_token, linkedin_token")
      .eq("user_id", session.user.id).single();
    if (data) setConnections({ facebook: !!data.fb_token, linkedin: !!data.linkedin_token });
  }, [session]);

  // ── Done — close tab ────────────────────────────────────────────────────────
  function handleDone() {
    setSaved(true);
    setTimeout(() => window.close(), 800);
  }

  const connectedCount = Object.values(connections).filter(Boolean).length;

  if (!session) return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex",
      alignItems: "center", justifyContent: "center", color: "#64748b",
      fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      Checking authentication…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24 }}>

        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#4a90d9,#7c5fc7)",
              borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, margin: "0 auto 16px" }}>
              <i className="ti ti-plug-connected" style={{ color: "white" }}></i>
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
              Connect Social Accounts
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
              Connect once — then publish directly from the Social Publisher tab in RankForged.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#2d1515", border: "1px solid #7f1d1d",
              color: "#fca5a5", padding: "10px 14px", borderRadius: 8,
              fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-alert-triangle"></i>
              {error}
              <button onClick={() => setError(null)} style={{ background: "none", border: "none",
                color: "#fca5a5", cursor: "pointer", marginLeft: "auto", fontSize: 16 }}>
                <i className="ti ti-x"></i>
              </button>
            </div>
          )}

          {/* Platform Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {loading ? (
              <>
                <div style={{ height: 72, background: "#161b27", borderRadius: 12,
                  animation: "sp-spin 0s" }}></div>
                <div style={{ height: 72, background: "#161b27", borderRadius: 12 }}></div>
              </>
            ) : (
              Object.values(PLATFORMS).map(platform => {
                const connected = connections[platform.id];
                const isConnecting = connecting === platform.id;
                return (
                  <div key={platform.id} style={{
                    background: connected ? "#0d1f13" : "#161b27",
                    border: `1px solid ${connected ? "#166534" : "#1e2740"}`,
                    borderRadius: 12, padding: "16px 20px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 11,
                        background: platform.color, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 22, color: "white", flexShrink: 0 }}>
                        <i className={platform.icon}></i>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
                          {platform.label}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2,
                          color: connected ? "#4ade80" : "#64748b",
                          display: "flex", alignItems: "center", gap: 4 }}>
                          <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                          {connected ? "Connected ✓" : platform.description}
                        </div>
                      </div>
                    </div>

                    {connected ? (
                      <button onClick={() => handleDisconnect(platform.id)} style={{
                        background: "transparent", border: "1px solid #2d3748",
                        color: "#94a3b8", padding: "7px 14px", borderRadius: 8,
                        fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                        display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="ti ti-unlink"></i> Disconnect
                      </button>
                    ) : (
                      <button onClick={() => handleConnect(platform.id)} disabled={isConnecting} style={{
                        background: isConnecting ? "#1e2740" : "#2563eb",
                        border: "none", color: "white", padding: "7px 16px",
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: isConnecting ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                        <i className={`ti ${isConnecting ? "ti-loader-2" : "ti-link"}`}
                          style={isConnecting ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                        {isConnecting ? "Connecting…" : `Connect ${platform.label}`}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Status + Done button */}
          <div style={{ textAlign: "center" }}>
            {connectedCount > 0 && (
              <div style={{ fontSize: 13, color: "#4ade80", marginBottom: 16,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <i className="ti ti-circle-check-filled"></i>
                {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected
              </div>
            )}

            <button onClick={handleDone} style={{
              background: saved
                ? "#166534"
                : connectedCount > 0
                  ? "linear-gradient(135deg,#2563eb,#7c3aed)"
                  : "#1e2740",
              border: "none", color: "white", padding: "12px 32px",
              borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: "pointer", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className={`ti ${saved ? "ti-check" : "ti-arrow-left"}`}></i>
              {saved ? "Saved! Closing…" : "Done — Go Back to RankForged"}
            </button>

            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#475569" }}>
              This tab will close and return you to RankForged AI
            </p>
          </div>

          {/* Help */}
          <div style={{ marginTop: 24, background: "#161b27", border: "1px solid #1e2740",
            borderRadius: 10, padding: 14, fontSize: 12, color: "#64748b",
            display: "flex", gap: 10 }}>
            <i className="ti ti-info-circle" style={{ color: "#4a90d9", fontSize: 16, flexShrink: 0 }}></i>
            <div>
              <strong style={{ color: "#94a3b8", display: "block", marginBottom: 3 }}>How it works</strong>
              Click Connect, log into your account, and approve RankForged AI.
              Your tokens are stored securely. Once connected, return to the
              Social Publisher tab in RankForged to write and publish posts with AI.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
