import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS = {
  facebook: {
    id: "facebook",
    label: "Facebook",
    icon: "ti ti-brand-facebook",
    color: "#1877F2",
    tokenKey: "fb_token",
    pageIdKey: "fb_page_id",
    charLimit: 63206,
    authEndpoint: "/functions/v1/social-auth-facebook",
    tone: "friendly, conversational, and engaging. Use emojis sparingly. End with a call to action.",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    icon: "ti ti-brand-linkedin",
    color: "#0A66C2",
    tokenKey: "linkedin_token",
    pageIdKey: null,
    charLimit: 3000,
    authEndpoint: "/functions/v1/social-auth-linkedin",
    tone: "professional, insightful, and concise. No emojis. End with a thought-provoking question or insight.",
  },
};

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";
const CLAUDE_MODEL = "claude-sonnet-4-6";

function getHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

// ─── Platform Card ────────────────────────────────────────────────────────────

function PlatformCard({ platform, connected, onConnect, onDisconnect, connecting }) {
  const isConnecting = connecting === platform.id;
  return (
    <div style={{
      background: connected ? "#0d1f13" : "#161b27",
      border: `1px solid ${connected ? "#166534" : "#1e2740"}`,
      borderRadius: 12, padding: 16,
      display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: platform.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, color: "white", flexShrink: 0,
        }}>
          <i className={platform.icon}></i>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{platform.label}</div>
          <div style={{ fontSize: 12, marginTop: 2, display: "flex", alignItems: "center", gap: 4,
            color: connected ? "#4ade80" : "#64748b" }}>
            <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
            {connected ? "Connected" : "Not connected"}
          </div>
        </div>
      </div>
      {connected ? (
        <button onClick={() => onDisconnect(platform.id)} style={{
          background: "transparent", border: "1px solid #2d3748",
          color: "#94a3b8", padding: "6px 12px", borderRadius: 8,
          fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        }}>
          <i className="ti ti-unlink"></i> Disconnect
        </button>
      ) : (
        <button onClick={() => onConnect(platform.id)} disabled={isConnecting} style={{
          background: isConnecting ? "#1e2740" : "#2563eb",
          border: "none", color: "white", padding: "6px 14px",
          borderRadius: 8, fontSize: 12, cursor: isConnecting ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 5, opacity: isConnecting ? 0.7 : 1,
        }}>
          <i className={`ti ${isConnecting ? "ti-loader-2" : "ti-link"}`}
            style={isConnecting ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
          {isConnecting ? "Connecting…" : `Connect`}
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocialPublisherPage() {
  const [session, setSession] = useState(null);
  const [settings, setSettings] = useState({});
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState(null);

  // AI + compose state
  const [topic, setTopic] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posts, setPosts] = useState({}); // { facebook: "...", linkedin: "..." }
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // ── Load settings ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("settings")
          .select("fb_token, fb_page_id, linkedin_token, anthropic_key, agency_name")
          .eq("user_id", session.user.id)
          .single();
        const s = data || {};
        setSettings(s);
        setConnections({ facebook: !!s.fb_token, linkedin: !!s.linkedin_token });
        if (s.agency_name) setBusinessName(s.agency_name);
      } catch (err) {
        setError("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  // ── OAuth message listener ────────────────────────────────────────────────
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

  // ── Connect ───────────────────────────────────────────────────────────────
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

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async (platformId) => {
    if (!session) return;
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: null };
    if (platform.pageIdKey) update[platform.pageIdKey] = null;
    const { error } = await supabase.from("settings").update(update).eq("user_id", session.user.id);
    if (error) { setError(`Failed to disconnect: ${error.message}`); return; }
    setConnections(prev => ({ ...prev, [platformId]: false }));
    setPosts(prev => { const n = { ...prev }; delete n[platformId]; return n; });
    setSelectedPlatforms(prev => prev.filter(p => p !== platformId));
  }, [session]);

  // ── Save token ────────────────────────────────────────────────────────────
  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return;
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: token };
    if (platform.pageIdKey && pageId) update[platform.pageIdKey] = pageId;
    await supabase.from("settings").upsert({ user_id: session.user.id, ...update }, { onConflict: "user_id" });
    setConnections(prev => ({ ...prev, [platformId]: true }));
    setConnecting(null);
  }, [session]);

  // ── Refresh connections ───────────────────────────────────────────────────
  const refreshConnections = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("settings").select("fb_token, fb_page_id, linkedin_token")
      .eq("user_id", session.user.id).single();
    if (data) setConnections({ facebook: !!data.fb_token, linkedin: !!data.linkedin_token });
  }, [session]);

  // ── AI Generate ───────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError("Please enter a topic or message first."); return; }
    const connectedList = Object.values(PLATFORMS).filter(p => connections[p.id]);
    if (connectedList.length === 0) { setError("Connect at least one platform first."); return; }

    setGenerating(true);
    setError(null);
    setPublishResult(null);

    try {
      const newPosts = {};

      for (const platform of connectedList) {
        const prompt = `You are a social media expert writing for a local business.

Business name: ${businessName || "the business"}
Platform: ${platform.label}
Tone: ${platform.tone}
Character limit: ${platform.charLimit}

Topic / message to post about:
${topic}

Write a single social media post for ${platform.label}. 
- Stay under ${platform.id === "linkedin" ? 1300 : 500} characters for best engagement
- Do not include quotation marks around the post
- Do not add any explanation, just the post text itself`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        newPosts[platform.id] = text.trim();
      }

      setPosts(newPosts);
      setSelectedPlatforms(connectedList.map(p => p.id));
    } catch (err) {
      setError(`AI generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [topic, businessName, connections]);

  // ── Publish ───────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!session || selectedPlatforms.length === 0) return;
    setPublishing(true);
    setPublishResult(null);

    try {
      const results = [];
      for (const pid of selectedPlatforms) {
        const content = posts[pid];
        if (!content) continue;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
          method: "POST",
          headers: getHeaders(session),
          body: JSON.stringify({ content, platforms: [pid] }),
        });
        const data = await res.json();
        if (data.results) results.push(...data.results);
      }
      const allOk = results.every(r => r.success);
      setPublishResult({ success: allOk, results });
      if (allOk) { setTopic(""); setPosts({}); }
    } catch (err) {
      setPublishResult({ success: false, results: [{ platform: "All", success: false, message: err.message }] });
    } finally {
      setPublishing(false);
    }
  }, [session, selectedPlatforms, posts]);

  // ── Back ──────────────────────────────────────────────────────────────────
  function handleBack() {
    window.location.href = "/";
  }

  const connectedPlatforms = Object.values(PLATFORMS).filter(p => connections[p.id]);
  const hasPosts = Object.keys(posts).length > 0;

  if (!session) return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex",
      alignItems: "center", justifyContent: "center", color: "#64748b",
      fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <i className="ti ti-loader-2" style={{ fontSize: 32, animation: "sp-spin 0.8s linear infinite", display: "block", marginBottom: 10 }}></i>
        Checking authentication…
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ background: "#161b27", borderBottom: "1px solid #1e2740",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={handleBack} style={{ background: "none", border: "1px solid #2d3748",
              color: "#94a3b8", padding: "6px 12px", borderRadius: 6, cursor: "pointer",
              fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-arrow-left"></i> Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#4a90d9,#7c5fc7)",
                borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                <i className="ti ti-share-2" style={{ color: "white" }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>Social Publisher</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>AI-powered posting to all your platforms</div>
              </div>
            </div>
          </div>
          <button onClick={refreshConnections} style={{ background: "none", border: "1px solid #2d3748",
            color: "#64748b", width: 34, height: 34, borderRadius: 8, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}
            title="Refresh connections">
            <i className="ti ti-refresh"></i>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#2d1515", borderBottom: "1px solid #7f1d1d",
            color: "#fca5a5", padding: "10px 24px", fontSize: 13,
            display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-alert-triangle"></i>
            {error}
            <button onClick={() => setError(null)} style={{ background: "none", border: "none",
              color: "#fca5a5", cursor: "pointer", marginLeft: "auto", fontSize: 16 }}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "flex",
          flexDirection: "column", gap: 20 }}>

          {/* STEP 1 — Connected Accounts */}
          <div style={{ background: "#161b27", border: "1px solid #1e2740", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "#64748b", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-plug-connected"></i> Step 1 — Connect Your Accounts
            </div>
            {loading ? (
              <div style={{ color: "#475569", fontSize: 13 }}>Loading…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.values(PLATFORMS).map(platform => (
                  <PlatformCard key={platform.id} platform={platform}
                    connected={connections[platform.id]}
                    onConnect={handleConnect} onDisconnect={handleDisconnect}
                    connecting={connecting} />
                ))}
              </div>
            )}
            {connectedPlatforms.length === 0 && !loading && (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 10,
                padding: "8px 12px", background: "#0f1117", borderRadius: 8 }}>
                <i className="ti ti-info-circle"></i> Connect at least one platform to start publishing.
              </div>
            )}
          </div>

          {/* STEP 2 — AI Generate */}
          <div style={{ background: "#161b27", border: "1px solid #1e2740", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "#64748b", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-sparkles"></i> Step 2 — Tell AI What to Post About
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                Business Name (optional)
              </label>
              <input value={businessName} onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Austin Plumbing Pros"
                style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2740",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "9px 12px",
                  outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>
                What do you want to post about? <span style={{ color: "#475569" }}>(describe in a few words or sentences)</span>
              </label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. We just added same-day AC repair to our services. Summer special — 10% off first visit."
                rows={4} style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2740",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "10px 12px",
                  outline: "none", resize: "vertical", fontFamily: "inherit",
                  lineHeight: 1.6, boxSizing: "border-box" }} />
            </div>

            <button onClick={handleGenerate}
              disabled={generating || !topic.trim() || connectedPlatforms.length === 0}
              style={{ background: generating ? "#1e2740" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
                border: "none", color: "white", padding: "11px 24px", borderRadius: 9,
                fontSize: 14, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, opacity: generating ? 0.7 : 1 }}>
              <i className={`ti ${generating ? "ti-loader-2" : "ti-sparkles"}`}
                style={generating ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
              {generating ? "Generating posts…" : "Generate Posts with AI"}
            </button>
          </div>

          {/* STEP 3 — Review & Publish */}
          {hasPosts && (
            <div style={{ background: "#161b27", border: "1px solid #1e2740", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "#64748b", marginBottom: 14,
                display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-pencil"></i> Step 3 — Review & Publish
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 18 }}>
                {Object.entries(posts).map(([pid, content]) => {
                  const platform = PLATFORMS[pid];
                  if (!platform) return null;
                  const isSelected = selectedPlatforms.includes(pid);
                  return (
                    <div key={pid} style={{ border: `1px solid ${isSelected ? platform.color + "44" : "#1e2740"}`,
                      borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ background: isSelected ? platform.color + "18" : "#0f1117",
                        padding: "10px 14px", display: "flex", alignItems: "center",
                        justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9" }}>{platform.label}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{content.length} chars</span>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6,
                          cursor: "pointer", fontSize: 12, color: "#94a3b8" }}>
                          <input type="checkbox" checked={isSelected}
                            onChange={e => setSelectedPlatforms(prev =>
                              e.target.checked ? [...prev, pid] : prev.filter(p => p !== pid)
                            )}
                            style={{ accentColor: platform.color }} />
                          Include
                        </label>
                      </div>
                      <textarea value={content}
                        onChange={e => setPosts(prev => ({ ...prev, [pid]: e.target.value }))}
                        rows={5} style={{ width: "100%", background: "#0f1117", border: "none",
                          borderTop: "1px solid #1e2740", color: "#e2e8f0", fontSize: 13,
                          padding: "12px 14px", outline: "none", resize: "vertical",
                          fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 12 }}>
                <button onClick={handleGenerate} disabled={generating}
                  style={{ background: "transparent", border: "1px solid #2d3748",
                    color: "#94a3b8", padding: "9px 16px", borderRadius: 8,
                    fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-refresh"></i> Regenerate
                </button>
                <button onClick={handlePublish}
                  disabled={publishing || selectedPlatforms.length === 0}
                  style={{ background: publishing ? "#1e2740" : "linear-gradient(135deg,#2563eb,#7c3aed)",
                    border: "none", color: "white", padding: "11px 28px", borderRadius: 9,
                    fontSize: 14, fontWeight: 700, cursor: publishing ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8, opacity: publishing ? 0.7 : 1 }}>
                  <i className={`ti ${publishing ? "ti-loader-2" : "ti-send"}`}
                    style={publishing ? { animation: "sp-spin 0.8s linear infinite", display: "inline-block" } : {}}></i>
                  {publishing ? "Publishing…" : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`}
                </button>
              </div>

              {/* Publish result */}
              {publishResult && (
                <div style={{ marginTop: 16, padding: 14, borderRadius: 8,
                  background: publishResult.success ? "#0d2318" : "#2d1515",
                  border: `1px solid ${publishResult.success ? "#166534" : "#7f1d1d"}` }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8,
                    color: publishResult.success ? "#4ade80" : "#fca5a5" }}>
                    <i className={`ti ${publishResult.success ? "ti-circle-check" : "ti-circle-x"}`}></i>
                    {" "}{publishResult.success ? "Published successfully!" : "Some platforms failed"}
                  </div>
                  {publishResult.results?.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: r.success ? "#86efac" : "#fca5a5",
                      display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                      {r.platform}: {r.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Help */}
          <div style={{ background: "#161b27", border: "1px solid #1e2740", borderRadius: 10,
            padding: 14, display: "flex", gap: 10, fontSize: 12, color: "#64748b" }}>
            <i className="ti ti-info-circle" style={{ color: "#4a90d9", fontSize: 16, flexShrink: 0 }}></i>
            <div>
              <strong style={{ color: "#94a3b8", display: "block", marginBottom: 3 }}>How it works</strong>
              Connect your accounts once, then use AI to write platform-optimized posts from a simple topic.
              Facebook gets a friendly, engaging version. LinkedIn gets a professional version.
              Review, edit if needed, then publish to all connected platforms in one click.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

const CSS = `
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
  @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
  textarea:focus, input:focus { border-color: #2563eb !important; }
  button:hover:not(:disabled) { opacity: 0.88; }
`;
