/**
 * SocialPublisherPage.jsx
 * Full Social Publisher experience at /social
 * - Connect accounts (Facebook, LinkedIn)
 * - AI post generation
 * - Review, edit, publish
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
    hint: "Friendly, conversational · under 280 chars for best reach",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    icon: "ti ti-brand-linkedin",
    color: "#0A66C2",
    tokenKey: "linkedin_token",
    pageIdKey: null,
    authEndpoint: "/functions/v1/social-auth-linkedin",
    hint: "Professional, insightful · under 1,300 chars for best reach",
  },
};

function getHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }) {
  const steps = ["Connect", "Write", "Review & Publish"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? "#4ade80" : active ? "#2563eb" : "#1e2740",
                border: `2px solid ${done ? "#4ade80" : active ? "#2563eb" : "#2d3748"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                color: done || active ? "white" : "#475569",
              }}>
                {done ? <i className="ti ti-check"></i> : num}
              </div>
              <div style={{ fontSize: 11, fontWeight: active ? 700 : 400,
                color: active ? "#f1f5f9" : done ? "#4ade80" : "#475569",
                whiteSpace: "nowrap" }}>
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#4ade80" : "#1e2740",
                margin: "0 8px", marginBottom: 20 }}></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SocialPublisherPage() {
  const [session, setSession] = useState(null);
  const [settings, setSettings] = useState({});
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState(null);

  // Wizard state
  const [step, setStep] = useState(1);
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
        setSettings(s);
        const conns = { facebook: !!s.fb_token, linkedin: !!s.linkedin_token };
        setConnections(conns);
        if (s.agency_name) setBusinessName(s.agency_name);
        // Auto-select connected platforms
        setSelectedPlatforms(Object.keys(conns).filter(k => conns[k]));
        // Skip to step 2 if already connected
        if (s.fb_token || s.linkedin_token) setStep(2);
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
    await supabase.from("settings").upsert({ user_id: session.user.id, ...update }, { onConflict: "user_id" });
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
      setSelectedPlatforms(Object.keys(conns).filter(k => conns[k]));
    }
  }, [session]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError("Please describe what you want to post about."); return; }
    if (selectedPlatforms.length === 0) { setError("Select at least one platform."); return; }
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method: "POST",
        headers: getHeaders(session),
        body: JSON.stringify({
          action: "generate",
          topic,
          businessName,
          postType,
          platforms: selectedPlatforms,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      setPosts(data.posts);
      setStep(3);
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
      if (data.allSucceeded) {
        setTopic(""); setPosts({}); setStep(2);
      }
    } catch (err) {
      setPublishResult({ success: false, results: [{ platform: "All", success: false, message: err.message }] });
    } finally {
      setPublishing(false);
    }
  }, [session, selectedPlatforms, posts]);

  const connectedCount = Object.values(connections).filter(Boolean).length;

  if (!session) return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex",
      alignItems: "center", justifyContent: "center", color: "#64748b",
      fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      Loading…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, textarea, select { font-family: inherit; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: #2563eb !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ background: "#161b27", borderBottom: "1px solid #1e2740",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#4a90d9,#7c5fc7)",
              borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              <i className="ti ti-share-2" style={{ color: "white" }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>Social Publisher</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>AI-powered · Facebook · LinkedIn</div>
            </div>
          </div>
          <button onClick={() => window.close()} style={{ background: "none",
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

        <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
          <Steps current={step} />

          {/* ── STEP 1: Connect ─────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                  Connect Your Accounts
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  Connect once — then publish from here anytime.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {Object.values(PLATFORMS).map(platform => {
                  const connected = connections[platform.id];
                  const isConnecting = connecting === platform.id;
                  return (
                    <div key={platform.id} style={{
                      background: connected ? "#0d1f13" : "#161b27",
                      border: `1px solid ${connected ? "#166534" : "#1e2740"}`,
                      borderRadius: 12, padding: "18px 20px",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: platform.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 24, color: "white", flexShrink: 0 }}>
                          <i className={platform.icon}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{platform.label}</div>
                          <div style={{ fontSize: 12, marginTop: 2,
                            color: connected ? "#4ade80" : "#64748b",
                            display: "flex", alignItems: "center", gap: 4 }}>
                            <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                            {connected ? "Connected" : "Not connected"}
                          </div>
                        </div>
                      </div>
                      {connected ? (
                        <button onClick={() => handleDisconnect(platform.id)} style={{
                          background: "transparent", border: "1px solid #2d3748",
                          color: "#94a3b8", padding: "8px 16px", borderRadius: 8,
                          fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="ti ti-unlink"></i> Disconnect
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(platform.id)} disabled={isConnecting} style={{
                          background: isConnecting ? "#1e2740" : "#2563eb",
                          border: "none", color: "white", padding: "8px 20px",
                          borderRadius: 8, fontSize: 13, fontWeight: 600,
                          cursor: isConnecting ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 6 }}>
                          <i className={`ti ${isConnecting ? "ti-loader-2" : "ti-link"}`}
                            style={isConnecting ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                          {isConnecting ? "Connecting…" : `Connect ${platform.label}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setStep(2)}
                disabled={connectedCount === 0}
                style={{ width: "100%", background: connectedCount > 0 ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "#1e2740",
                  border: "none", color: "white", padding: "13px 0", borderRadius: 10,
                  fontSize: 15, fontWeight: 700, cursor: connectedCount > 0 ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {connectedCount > 0 ? <><i className="ti ti-arrow-right"></i> Continue to Write Post</> : "Connect at least one platform to continue"}
              </button>
            </div>
          )}

          {/* ── STEP 2: Write ────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                  Tell AI What to Post
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  Describe your message in plain English — AI writes the posts.
                </p>
              </div>

              {/* Business name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8",
                  display: "block", marginBottom: 6 }}>Business Name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Austin Plumbing Pros"
                  style={{ width: "100%", background: "#161b27", border: "1px solid #1e2740",
                    borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "10px 14px" }} />
              </div>

              {/* Post type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8",
                  display: "block", marginBottom: 6 }}>Post Type</label>
                <select value={postType} onChange={e => setPostType(e.target.value)}
                  style={{ width: "100%", background: "#161b27", border: "1px solid #1e2740",
                    borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "10px 14px",
                    cursor: "pointer" }}>
                  <option value="update">Business Update</option>
                  <option value="offer">Special Offer / Promotion</option>
                  <option value="tip">Expert Tip / Educational</option>
                  <option value="review">Customer Review Spotlight</option>
                  <option value="event">Event / Announcement</option>
                  <option value="service">Service Spotlight</option>
                </select>
              </div>

              {/* Topic */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8",
                  display: "block", marginBottom: 6 }}>
                  What do you want to post about?
                  <span style={{ fontWeight: 400, color: "#475569", marginLeft: 6 }}>
                    (plain English — AI does the writing)
                  </span>
                </label>
                <textarea value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. We just added same-day AC repair to our services. Summer special — 10% off for new customers this month."
                  rows={5} style={{ width: "100%", background: "#161b27", border: "1px solid #1e2740",
                    borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "10px 14px",
                    resize: "vertical", lineHeight: 1.6 }} />
              </div>

              {/* Platform selection */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8",
                  display: "block", marginBottom: 8 }}>Publish to</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {Object.values(PLATFORMS).filter(p => connections[p.id]).map(platform => (
                    <label key={platform.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: selectedPlatforms.includes(platform.id) ? platform.color + "22" : "#161b27",
                      border: `1px solid ${selectedPlatforms.includes(platform.id) ? platform.color : "#1e2740"}`,
                      borderRadius: 8, padding: "8px 14px", cursor: "pointer", flex: 1,
                      justifyContent: "center",
                    }}>
                      <input type="checkbox" checked={selectedPlatforms.includes(platform.id)}
                        onChange={e => setSelectedPlatforms(prev =>
                          e.target.checked ? [...prev, platform.id] : prev.filter(p => p !== platform.id)
                        )}
                        style={{ accentColor: platform.color }} />
                      <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{platform.label}</span>
                    </label>
                  ))}
                </div>
                {connectedCount === 0 && (
                  <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
                    <i className="ti ti-alert-triangle"></i> No platforms connected.
                    <button onClick={() => setStep(1)} style={{ background: "none", border: "none",
                      color: "#60a5fa", cursor: "pointer", fontSize: 12, marginLeft: 4 }}>
                      Connect now →
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(1)} style={{
                  background: "transparent", border: "1px solid #2d3748",
                  color: "#94a3b8", padding: "12px 20px", borderRadius: 10,
                  fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-arrow-left"></i> Back
                </button>
                <button onClick={handleGenerate}
                  disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
                  style={{ flex: 1, background: generating ? "#1e2740" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", color: "white", padding: "12px 0", borderRadius: 10,
                    fontSize: 15, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: generating ? 0.7 : 1 }}>
                  <i className={`ti ${generating ? "ti-loader-2" : "ti-sparkles"}`}
                    style={generating ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                  {generating ? "Writing your posts…" : "Generate Posts with AI"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Publish ─────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>
                  Review & Publish
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  Edit the posts if needed, then publish to all platforms.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                {selectedPlatforms.map(pid => {
                  const platform = PLATFORMS[pid];
                  if (!platform || !posts[pid]) return null;
                  return (
                    <div key={pid} style={{ background: "#161b27",
                      border: `1px solid ${platform.color}44`, borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ background: platform.color + "18", padding: "10px 16px",
                        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <i className={platform.icon} style={{ color: platform.color, fontSize: 18 }}></i>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{platform.label}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{posts[pid].length} chars</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#475569" }}>{platform.hint}</span>
                      </div>
                      <textarea value={posts[pid]}
                        onChange={e => setPosts(prev => ({ ...prev, [pid]: e.target.value }))}
                        rows={6} style={{ width: "100%", background: "#0f1117",
                          border: "none", borderTop: "1px solid #1e2740",
                          color: "#e2e8f0", fontSize: 13, padding: "14px 16px",
                          resize: "vertical", lineHeight: 1.7 }} />
                    </div>
                  );
                })}
              </div>

              {/* Publish result */}
              {publishResult && (
                <div style={{ marginBottom: 20, padding: 16, borderRadius: 10,
                  background: publishResult.success ? "#0d2318" : "#2d1515",
                  border: `1px solid ${publishResult.success ? "#166534" : "#7f1d1d"}` }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10,
                    color: publishResult.success ? "#4ade80" : "#fca5a5",
                    display: "flex", alignItems: "center", gap: 8 }}>
                    <i className={`ti ${publishResult.success ? "ti-circle-check" : "ti-circle-x"}`}></i>
                    {publishResult.success ? "Published successfully!" : "Some platforms failed"}
                  </div>
                  {publishResult.results?.map((r, i) => (
                    <div key={i} style={{ fontSize: 13, color: r.success ? "#86efac" : "#fca5a5",
                      display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                      <strong>{r.platform}:</strong> {r.message}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={{
                  background: "transparent", border: "1px solid #2d3748",
                  color: "#94a3b8", padding: "12px 20px", borderRadius: 10,
                  fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-arrow-left"></i> Back
                </button>
                <button onClick={() => { setPosts({}); setStep(2); }} style={{
                  background: "transparent", border: "1px solid #2d3748",
                  color: "#94a3b8", padding: "12px 20px", borderRadius: 10,
                  fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-refresh"></i> Regenerate
                </button>
                <button onClick={handlePublish}
                  disabled={publishing || selectedPlatforms.length === 0}
                  style={{ flex: 1, background: publishing ? "#1e2740" : "linear-gradient(135deg,#2563eb,#7c3aed)",
                    border: "none", color: "white", padding: "12px 0", borderRadius: 10,
                    fontSize: 15, fontWeight: 700, cursor: publishing ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: publishing ? 0.7 : 1 }}>
                  <i className={`ti ${publishing ? "ti-loader-2" : "ti-send"}`}
                    style={publishing ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                  {publishing ? "Publishing…" : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
