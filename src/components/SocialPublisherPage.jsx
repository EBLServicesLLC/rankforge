/**
 * SocialPublisherPage.jsx
 * /social — Single scrollable page
 * Connect accounts + AI generate + publish — all on one page
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";

const PLATFORMS = {
  facebook: {
    id: "facebook",
    label: "Facebook",
    icon: "ti ti-brand-facebook",
    color: "#1877F2",
    tokenKey: "fb_token",
    pageIdKey: "fb_page_id",
    authEndpoint: "/functions/v1/social-auth-facebook",
    hint: "Friendly & conversational · best under 280 chars",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    icon: "ti ti-brand-linkedin",
    color: "#0A66C2",
    tokenKey: "linkedin_token",
    pageIdKey: null,
    authEndpoint: "/functions/v1/social-auth-linkedin",
    hint: "Professional & insightful · best under 1,300 chars",
  },
};

function getHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

function handleBack() {
  const clientId = new URLSearchParams(window.location.search).get("client");
  if (clientId) {
    window.location.href = "/?client=" + clientId;
  } else {
    window.location.href = "/";
  }
}

export default function SocialPublisherPage() {
  const [session, setSession] = useState(null);
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState(null);

  const [businessName, setBusinessName] = useState("");
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("update");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState({});
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Load settings ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("settings")
          .select("fb_token, fb_page_id, linkedin_token, agency_name")
          .eq("user_id", session.user.id)
          .single();
        const s = data || {};
        setConnections({ facebook: !!s.fb_token, linkedin: !!s.linkedin_token });
        if (s.agency_name) setBusinessName(s.agency_name);
        setSelectedPlatforms(
          Object.entries({ facebook: !!s.fb_token, linkedin: !!s.linkedin_token })
            .filter(([, v]) => v).map(([k]) => k)
        );
      } catch (err) {
        setError("Failed to load settings.");
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
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: null };
    if (platform.pageIdKey) update[platform.pageIdKey] = null;
    await supabase.from("settings").update(update).eq("user_id", session.user.id);
    setConnections(prev => ({ ...prev, [platformId]: false }));
    setSelectedPlatforms(prev => prev.filter(p => p !== platformId));
  }, [session]);

  // ── Save token ──────────────────────────────────────────────────────────────
  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return;
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: token };
    if (platform.pageIdKey && pageId) update[platform.pageIdKey] = pageId;
    await supabase.from("settings").upsert(
      { user_id: session.user.id, ...update },
      { onConflict: "user_id" }
    );
    setConnections(prev => ({ ...prev, [platformId]: true }));
    setSelectedPlatforms(prev => prev.includes(platformId) ? prev : [...prev, platformId]);
    setConnecting(null);
  }, [session]);

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const refreshConnections = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("settings").select("fb_token, linkedin_token")
      .eq("user_id", session.user.id).single();
    if (data) {
      const conns = { facebook: !!data.fb_token, linkedin: !!data.linkedin_token };
      setConnections(conns);
      setSelectedPlatforms(Object.entries(conns).filter(([, v]) => v).map(([k]) => k));
    }
  }, [session]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError("Please describe what you want to post about."); return; }
    if (selectedPlatforms.length === 0) { setError("Select at least one connected platform."); return; }
    setGenerating(true);
    setError(null);
    setPublishResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method: "POST",
        headers: getHeaders(session),
        body: JSON.stringify({
          action: "generate",
          topic, businessName, postType,
          platforms: selectedPlatforms,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      setPosts(data.posts);
    } catch (err) {
      setError(`AI generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [topic, businessName, postType, selectedPlatforms, session]);

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!session || selectedPlatforms.length === 0) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method: "POST",
        headers: getHeaders(session),
        body: JSON.stringify({ action: "publish", posts, platforms: selectedPlatforms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      setPublishResult({ success: data.allSucceeded, results: data.results });
      if (data.allSucceeded) { setTopic(""); setPosts({}); }
    } catch (err) {
      setPublishResult({ success: false, results: [{ platform: "All", success: false, message: err.message }] });
    } finally {
      setPublishing(false);
    }
  }, [session, selectedPlatforms, posts]);

  if (!session) return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex",
      alignItems: "center", justifyContent: "center", color: "#64748b",
      fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      Loading…
    </div>
  );

  const connectedPlatforms = Object.values(PLATFORMS).filter(p => connections[p.id]);
  const hasPosts = Object.keys(posts).length > 0;

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, textarea, select { font-family: inherit; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: #2563eb !important; }
        button:hover:not(:disabled) { opacity: 0.88; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ background: "#161b27", borderBottom: "1px solid #1e2740",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36,
              background: "linear-gradient(135deg,#4a90d9,#7c5fc7)",
              borderRadius: 9, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18 }}>
              <i className="ti ti-share-2" style={{ color: "white" }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>Social Publisher</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>AI-powered · Facebook · LinkedIn</div>
            </div>
          </div>
          <button onClick={handleBack} style={{ background: "none",
            border: "1px solid #2d3748", color: "#94a3b8", padding: "6px 14px",
            borderRadius: 6, cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-arrow-left"></i> Back to RankForged
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#2d1515", borderBottom: "1px solid #7f1d1d",
            color: "#fca5a5", padding: "10px 24px", fontSize: 13,
            display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-alert-triangle"></i> {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none",
              color: "#fca5a5", cursor: "pointer", marginLeft: "auto", fontSize: 16 }}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px",
          display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── SECTION 1: Connected Accounts ───────────────────────────── */}
          <div style={{ background: "#161b27", border: "1px solid #1e2740",
            borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "#64748b", marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span><i className="ti ti-plug-connected"></i> Connected Accounts</span>
              <button onClick={refreshConnections} style={{ background: "none", border: "none",
                color: "#475569", cursor: "pointer", fontSize: 13, padding: 0 }}
                title="Refresh">
                <i className="ti ti-refresh"></i>
              </button>
            </div>

            {loading ? (
              <div style={{ color: "#475569", fontSize: 13 }}>Loading…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.values(PLATFORMS).map(platform => {
                  const connected = connections[platform.id];
                  const isConnecting = connecting === platform.id;
                  return (
                    <div key={platform.id} style={{
                      background: connected ? "#0d1f13" : "#0f1117",
                      border: `1px solid ${connected ? "#166534" : "#1e2740"}`,
                      borderRadius: 10, padding: "12px 16px",
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 9,
                          background: platform.color, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: 20, color: "white", flexShrink: 0 }}>
                          <i className={platform.icon}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>
                            {platform.label}
                          </div>
                          <div style={{ fontSize: 12, color: connected ? "#4ade80" : "#64748b",
                            display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                            {connected ? "Connected" : "Not connected"}
                          </div>
                        </div>
                      </div>
                      {connected ? (
                        <button onClick={() => handleDisconnect(platform.id)} style={{
                          background: "transparent", border: "1px solid #2d3748",
                          color: "#94a3b8", padding: "6px 14px", borderRadius: 8,
                          fontSize: 12, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5 }}>
                          <i className="ti ti-unlink"></i> Disconnect
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(platform.id)}
                          disabled={isConnecting} style={{
                          background: isConnecting ? "#1e2740" : "#2563eb",
                          border: "none", color: "white", padding: "6px 16px",
                          borderRadius: 8, fontSize: 12, fontWeight: 600,
                          cursor: isConnecting ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 5 }}>
                          <i className={`ti ${isConnecting ? "ti-loader-2" : "ti-link"}`}
                            style={isConnecting ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                          {isConnecting ? "Connecting…" : `Connect ${platform.label}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SECTION 2: Write Your Post ───────────────────────────────── */}
          <div style={{ background: "#161b27", border: "1px solid #1e2740",
            borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "#64748b", marginBottom: 16 }}>
              <i className="ti ti-sparkles"></i> Write Your Post
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  Business Name
                </label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Austin Plumbing Pros"
                  style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2740",
                    borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "9px 12px" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                  Post Type
                </label>
                <select value={postType} onChange={e => setPostType(e.target.value)}
                  style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2740",
                    borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "9px 12px",
                    cursor: "pointer" }}>
                  <option value="update">Business Update</option>
                  <option value="offer">Special Offer / Promotion</option>
                  <option value="tip">Expert Tip / Educational</option>
                  <option value="review">Customer Review Spotlight</option>
                  <option value="event">Event / Announcement</option>
                  <option value="service">Service Spotlight</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                What do you want to post about?
                <span style={{ color: "#475569", fontWeight: 400, marginLeft: 6 }}>
                  (plain English — AI writes the posts)
                </span>
              </label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. We just added same-day AC repair. Summer special — 10% off for new customers this month."
                rows={4} style={{ width: "100%", background: "#0f1117",
                  border: "1px solid #1e2740", borderRadius: 8, color: "#e2e8f0",
                  fontSize: 13, padding: "10px 12px", resize: "vertical", lineHeight: 1.6 }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 8 }}>
                Publish to
              </label>
              {connectedPlatforms.length === 0 ? (
                <div style={{ fontSize: 12, color: "#f59e0b", padding: "8px 12px",
                  background: "#1c1500", border: "1px solid #78350f", borderRadius: 8 }}>
                  <i className="ti ti-alert-triangle"></i> No platforms connected. Connect Facebook or LinkedIn above first.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  {connectedPlatforms.map(platform => (
                    <label key={platform.id} style={{
                      display: "flex", alignItems: "center", gap: 8, flex: 1,
                      justifyContent: "center", padding: "9px 14px", borderRadius: 8,
                      cursor: "pointer",
                      background: selectedPlatforms.includes(platform.id) ? platform.color + "22" : "#0f1117",
                      border: `1px solid ${selectedPlatforms.includes(platform.id) ? platform.color : "#1e2740"}`,
                    }}>
                      <input type="checkbox" checked={selectedPlatforms.includes(platform.id)}
                        onChange={e => setSelectedPlatforms(prev =>
                          e.target.checked ? [...prev, platform.id] : prev.filter(p => p !== platform.id)
                        )}
                        style={{ accentColor: platform.color }} />
                      <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                        {platform.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleGenerate}
              disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
              style={{ background: generating ? "#1e2740" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                border: "none", color: "white", padding: "11px 28px",
                borderRadius: 9, fontSize: 14, fontWeight: 700,
                cursor: generating ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                opacity: generating || !topic.trim() || selectedPlatforms.length === 0 ? 0.6 : 1 }}>
              <i className={`ti ${generating ? "ti-loader-2" : "ti-sparkles"}`}
                style={generating ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
              {generating ? "Writing your posts…" : "Generate Posts with AI"}
            </button>
          </div>

          {/* ── SECTION 3: Review & Publish ──────────────────────────────── */}
          {hasPosts && (
            <div style={{ background: "#161b27", border: "1px solid #1e2740",
              borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#64748b", marginBottom: 16 }}>
                <i className="ti ti-pencil"></i> Review & Edit — then Publish
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                {selectedPlatforms.map(pid => {
                  const platform = PLATFORMS[pid];
                  if (!platform || !posts[pid]) return null;
                  return (
                    <div key={pid} style={{ border: `1px solid ${platform.color}44`,
                      borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ background: platform.color + "18", padding: "10px 14px",
                        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>
                            {platform.label}
                          </span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {posts[pid].length} chars
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#475569" }}>{platform.hint}</span>
                      </div>
                      <textarea value={posts[pid]}
                        onChange={e => setPosts(prev => ({ ...prev, [pid]: e.target.value }))}
                        rows={5} style={{ width: "100%", background: "#0f1117",
                          border: "none", borderTop: "1px solid #1e2740",
                          color: "#e2e8f0", fontSize: 13, padding: "12px 14px",
                          resize: "vertical", lineHeight: 1.7 }} />
                    </div>
                  );
                })}
              </div>

              {publishResult && (
                <div style={{ marginBottom: 16, padding: 14, borderRadius: 8,
                  background: publishResult.success ? "#0d2318" : "#2d1515",
                  border: `1px solid ${publishResult.success ? "#166534" : "#7f1d1d"}` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8,
                    color: publishResult.success ? "#4ade80" : "#fca5a5",
                    display: "flex", alignItems: "center", gap: 6 }}>
                    <i className={`ti ${publishResult.success ? "ti-circle-check" : "ti-circle-x"}`}></i>
                    {publishResult.success ? "Published successfully!" : "Some platforms failed"}
                  </div>
                  {publishResult.results?.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: r.success ? "#86efac" : "#fca5a5",
                      display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                      <strong>{r.platform}:</strong> {r.message}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setPosts({}); setPublishResult(null); }}
                  style={{ background: "transparent", border: "1px solid #2d3748",
                    color: "#94a3b8", padding: "10px 18px", borderRadius: 9,
                    fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-refresh"></i> Regenerate
                </button>
                <button onClick={handlePublish}
                  disabled={publishing || selectedPlatforms.length === 0}
                  style={{ flex: 1, background: publishing ? "#1e2740" : "linear-gradient(135deg,#2563eb,#7c3aed)",
                    border: "none", color: "white", padding: "11px 0",
                    borderRadius: 9, fontSize: 14, fontWeight: 700,
                    cursor: publishing ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: publishing ? 0.7 : 1 }}>
                  <i className={`ti ${publishing ? "ti-loader-2" : "ti-send"}`}
                    style={publishing ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                  {publishing ? "Publishing…" : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Help ─────────────────────────────────────────────────────── */}
          <div style={{ background: "#161b27", border: "1px solid #1e2740",
            borderRadius: 10, padding: 14, display: "flex", gap: 10,
            fontSize: 12, color: "#64748b" }}>
            <i className="ti ti-info-circle" style={{ color: "#4a90d9", fontSize: 16, flexShrink: 0 }}></i>
            <div>
              <strong style={{ color: "#94a3b8", display: "block", marginBottom: 3 }}>How it works</strong>
              Connect your accounts once. Then describe what you want to post — AI writes a
              platform-optimised version for each. Review, edit if needed, and publish in one click.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
