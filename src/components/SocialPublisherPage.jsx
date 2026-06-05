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
  },
};

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabaseHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlatformCard({ platform, connected, pageId, onConnect, onDisconnect, connecting }) {
  const isConnecting = connecting === platform.id;

  return (
    <div className="sp-platform-card" data-connected={connected}>
      <div className="sp-platform-header">
        <div className="sp-platform-icon" style={{ background: platform.color }}>
          <i className={platform.icon}></i>
        </div>
        <div className="sp-platform-info">
          <div className="sp-platform-name">{platform.label}</div>
          {connected ? (
            <div className="sp-platform-status connected">
              <i className="ti ti-circle-check-filled"></i>
              {pageId ? `Page connected` : "Connected"}
            </div>
          ) : (
            <div className="sp-platform-status disconnected">
              <i className="ti ti-circle-x"></i>
              Not connected
            </div>
          )}
        </div>
      </div>
      <div className="sp-platform-actions">
        {connected ? (
          <button
            className="sp-btn sp-btn-outline"
            onClick={() => onDisconnect(platform.id)}
          >
            <i className="ti ti-unlink"></i> Disconnect
          </button>
        ) : (
          <button
            className="sp-btn sp-btn-primary"
            onClick={() => onConnect(platform.id)}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <><i className="ti ti-loader-2 sp-spin"></i> Connecting…</>
            ) : (
              <><i className="ti ti-link"></i> Connect {platform.label}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function ComposerSection({ connections, publishing, publishResult, onPublish }) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [charWarning, setCharWarning] = useState(null);

  const connectedPlatforms = Object.values(PLATFORMS).filter(
    (p) => connections[p.id]
  );

  useEffect(() => {
    // Auto-select all connected platforms
    setSelectedPlatforms(connectedPlatforms.map((p) => p.id));
  }, [JSON.stringify(Object.keys(connections))]);

  useEffect(() => {
    if (!content || selectedPlatforms.length === 0) {
      setCharWarning(null);
      return;
    }
    const warnings = selectedPlatforms
      .map((pid) => PLATFORMS[pid])
      .filter((p) => content.length > p.charLimit)
      .map((p) => `${p.label}: ${content.length}/${p.charLimit} chars`);
    setCharWarning(warnings.length > 0 ? warnings.join(" · ") : null);
  }, [content, selectedPlatforms]);

  function togglePlatform(pid) {
    setSelectedPlatforms((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  }

  function handlePublish() {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    onPublish({ content, platforms: selectedPlatforms });
  }

  if (connectedPlatforms.length === 0) {
    return (
      <div className="sp-composer sp-composer-empty">
        <i className="ti ti-brand-social-instagram sp-empty-icon"></i>
        <p>Connect at least one platform above to start publishing.</p>
      </div>
    );
  }

  return (
    <div className="sp-composer">
      <div className="sp-composer-header">
        <h3>Compose Post</h3>
        <div className="sp-platform-toggles">
          {connectedPlatforms.map((p) => (
            <button
              key={p.id}
              className={`sp-toggle-btn ${selectedPlatforms.includes(p.id) ? "active" : ""}`}
              style={{ "--platform-color": p.color }}
              onClick={() => togglePlatform(p.id)}
              title={p.label}
            >
              <i className={p.icon}></i>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="sp-textarea"
        placeholder="Write your post here…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
      />

      <div className="sp-composer-footer">
        <div className="sp-char-info">
          {charWarning ? (
            <span className="sp-char-warning">
              <i className="ti ti-alert-triangle"></i> {charWarning}
            </span>
          ) : (
            <span className="sp-char-count">{content.length} characters</span>
          )}
        </div>
        <button
          className="sp-btn sp-btn-publish"
          onClick={handlePublish}
          disabled={
            publishing ||
            !content.trim() ||
            selectedPlatforms.length === 0 ||
            !!charWarning
          }
        >
          {publishing ? (
            <><i className="ti ti-loader-2 sp-spin"></i> Publishing…</>
          ) : (
            <><i className="ti ti-send"></i> Publish Now</>
          )}
        </button>
      </div>

      {publishResult && (
        <div className={`sp-result ${publishResult.success ? "sp-result-success" : "sp-result-error"}`}>
          <i className={`ti ${publishResult.success ? "ti-circle-check" : "ti-circle-x"}`}></i>
          <div>
            <strong>{publishResult.success ? "Published!" : "Publish failed"}</strong>
            <p>{publishResult.message}</p>
            {publishResult.results && (
              <ul className="sp-result-list">
                {publishResult.results.map((r, i) => (
                  <li key={i} className={r.success ? "ok" : "fail"}>
                    <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                    {r.platform}: {r.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [error, setError] = useState(null);

  // ── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load settings ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return;

    async function loadSettings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("fb_token, fb_page_id, linkedin_token")
          .eq("user_id", session.user.id)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        const s = data || {};
        setSettings(s);
        setConnections({
          facebook: !!s.fb_token,
          linkedin: !!s.linkedin_token,
        });
      } catch (err) {
        setError("Failed to load connection status. Please refresh.");
        console.error("[SocialPublisher] load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [session]);

  // ── OAuth popup listener ────────────────────────────────────────────────────

  useEffect(() => {
    function handleOAuthMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (!event.data?.type === "SOCIAL_AUTH_COMPLETE") return;

      const { platform, success, token, pageId, error: authError } = event.data;

      if (!success) {
        setError(`${platform} connection failed: ${authError || "Unknown error"}`);
        setConnecting(null);
        return;
      }

      // Save token to Supabase settings
      saveToken(platform, token, pageId);
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [session]);

  // ── Connect platform ────────────────────────────────────────────────────────

  const handleConnect = useCallback(async (platformId) => {
    if (!session) return;
    setConnecting(platformId);
    setError(null);

    const platform = PLATFORMS[platformId];

    try {
      // Get the OAuth URL from our edge function
      const res = await fetch(
        `${SUPABASE_URL}${platform.authEndpoint}?action=get_url&redirect_uri=${encodeURIComponent(window.location.origin + "/social/callback")}`,
        { headers: getSupabaseHeaders(session) }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get auth URL");
      }

      const { url } = await res.json();

      // Open OAuth popup
      const popup = window.open(
        url,
        `${platformId}_oauth`,
        "width=600,height=700,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll for popup close (fallback if postMessage fails)
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setConnecting(null);
          // Re-load settings to check if token was saved
          await refreshConnections();
        }
      }, 500);

    } catch (err) {
      setError(err.message);
      setConnecting(null);
    }
  }, [session]);

  // ── Disconnect platform ─────────────────────────────────────────────────────

  const handleDisconnect = useCallback(async (platformId) => {
    if (!session) return;
    setError(null);

    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: null };
    if (platform.pageIdKey) update[platform.pageIdKey] = null;

    try {
      const { error } = await supabase
        .from("settings")
        .update(update)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setConnections((prev) => ({ ...prev, [platformId]: false }));
      setSettings((prev) => {
        const next = { ...prev };
        delete next[platform.tokenKey];
        if (platform.pageIdKey) delete next[platform.pageIdKey];
        return next;
      });
    } catch (err) {
      setError(`Failed to disconnect ${platform.label}: ${err.message}`);
    }
  }, [session]);

  // ── Save token (called after OAuth success) ─────────────────────────────────

  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return;
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: token };
    if (platform.pageIdKey && pageId) update[platform.pageIdKey] = pageId;

    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ user_id: session.user.id, ...update }, { onConflict: "user_id" });

      if (error) throw error;

      setConnections((prev) => ({ ...prev, [platformId]: true }));
      setSettings((prev) => ({ ...prev, [platform.tokenKey]: token }));
    } catch (err) {
      setError(`Failed to save ${platform.label} token: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  }, [session]);

  // ── Refresh connections from DB ─────────────────────────────────────────────

  const refreshConnections = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("settings")
      .select("fb_token, fb_page_id, linkedin_token")
      .eq("user_id", session.user.id)
      .single();

    if (data) {
      setSettings(data);
      setConnections({
        facebook: !!data.fb_token,
        linkedin: !!data.linkedin_token,
      });
    }
  }, [session]);

  // ── Publish ─────────────────────────────────────────────────────────────────

  const handlePublish = useCallback(async ({ content, platforms }) => {
    if (!session) return;
    setPublishing(true);
    setPublishResult(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method: "POST",
        headers: getSupabaseHeaders(session),
        body: JSON.stringify({ content, platforms }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPublishResult({
          success: false,
          message: data.error || "Publish failed. Please try again.",
        });
      } else {
        setPublishResult({
          success: data.allSucceeded,
          message: data.allSucceeded
            ? "Your post was published successfully!"
            : "Some platforms failed. See details below.",
          results: data.results,
        });
      }
    } catch (err) {
      setPublishResult({
        success: false,
        message: `Network error: ${err.message}`,
      });
    } finally {
      setPublishing(false);
    }
  }, [session]);

  // ── Back navigation ─────────────────────────────────────────────────────────

  function handleBack() {
    const clientId = sessionStorage.getItem("rf_client");
    if (clientId) {
      window.location.href = `/?client=${clientId}`;
    } else {
      window.location.href = "/";
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="sp-page sp-centered">
        <div className="sp-loader">
          <i className="ti ti-loader-2 sp-spin"></i>
          <p>Checking authentication…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="sp-page">
        {/* Header */}
        <div className="sp-header">
          <div className="sp-header-left">
            <button className="sp-back-btn" onClick={handleBack}>
              <i className="ti ti-arrow-left"></i>
              Back to RankForged
            </button>
            <div className="sp-title">
              <div className="sp-logo">
                <i className="ti ti-share-2"></i>
              </div>
              <div>
                <h1>Social Publisher</h1>
                <p>Connect your accounts and publish posts directly</p>
              </div>
            </div>
          </div>
          <button className="sp-refresh-btn" onClick={refreshConnections} title="Refresh connections">
            <i className="ti ti-refresh"></i>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="sp-error-banner">
            <i className="ti ti-alert-triangle"></i>
            {error}
            <button onClick={() => setError(null)}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        <div className="sp-body">
          {/* Left column — connections */}
          <div className="sp-left">
            <div className="sp-section-title">
              <i className="ti ti-plug-connected"></i>
              Connected Accounts
            </div>

            {loading ? (
              <div className="sp-loading-cards">
                <div className="sp-skeleton"></div>
                <div className="sp-skeleton"></div>
              </div>
            ) : (
              <div className="sp-platform-list">
                {Object.values(PLATFORMS).map((platform) => (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    connected={connections[platform.id]}
                    pageId={platform.pageIdKey ? settings[platform.pageIdKey] : null}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    connecting={connecting}
                  />
                ))}
              </div>
            )}

            {/* Help box */}
            <div className="sp-help-box">
              <i className="ti ti-info-circle"></i>
              <div>
                <strong>How it works</strong>
                <p>Click Connect, log into your account, and approve RankForged AI. Your credentials are stored securely and never shared.</p>
              </div>
            </div>
          </div>

          {/* Right column — composer */}
          <div className="sp-right">
            <div className="sp-section-title">
              <i className="ti ti-pencil"></i>
              Create & Publish
            </div>
            <ComposerSection
              connections={connections}
              publishing={publishing}
              publishResult={publishResult}
              onPublish={handlePublish}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');

  .sp-page {
    min-height: 100vh;
    background: #0f1117;
    color: #e2e8f0;
    font-family: 'Segoe UI', system-ui, sans-serif;
    padding: 0;
  }

  .sp-page.sp-centered {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Header */
  .sp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: #161b27;
    border-bottom: 1px solid #1e2740;
    gap: 16px;
  }

  .sp-header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .sp-back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: 1px solid #2d3748;
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .sp-back-btn:hover { border-color: #4a90d9; color: #4a90d9; }

  .sp-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sp-logo {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #4a90d9, #7c5fc7);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .sp-title h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.2;
  }

  .sp-title p {
    margin: 0;
    font-size: 12px;
    color: #64748b;
  }

  .sp-refresh-btn {
    background: none;
    border: 1px solid #2d3748;
    color: #64748b;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .sp-refresh-btn:hover { border-color: #4a90d9; color: #4a90d9; }

  /* Error banner */
  .sp-error-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #2d1515;
    border: 1px solid #7f1d1d;
    color: #fca5a5;
    padding: 10px 20px;
    font-size: 13px;
  }
  .sp-error-banner button {
    background: none;
    border: none;
    color: #fca5a5;
    cursor: pointer;
    margin-left: auto;
    padding: 2px;
    font-size: 16px;
    line-height: 1;
  }

  /* Body layout */
  .sp-body {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 24px;
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .sp-body { grid-template-columns: 1fr; }
  }

  /* Section titles */
  .sp-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin-bottom: 14px;
  }

  /* Platform cards */
  .sp-platform-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .sp-platform-card {
    background: #161b27;
    border: 1px solid #1e2740;
    border-radius: 12px;
    padding: 16px;
    transition: border-color 0.15s;
  }
  .sp-platform-card[data-connected="true"] {
    border-color: #1e3a2f;
    background: #131e18;
  }

  .sp-platform-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .sp-platform-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
    flex-shrink: 0;
  }

  .sp-platform-name {
    font-weight: 600;
    font-size: 15px;
    color: #f1f5f9;
  }

  .sp-platform-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    margin-top: 2px;
  }
  .sp-platform-status.connected { color: #4ade80; }
  .sp-platform-status.disconnected { color: #64748b; }

  .sp-platform-actions {
    display: flex;
    gap: 8px;
  }

  /* Buttons */
  .sp-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .sp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .sp-btn-primary {
    background: #2563eb;
    color: white;
  }
  .sp-btn-primary:hover:not(:disabled) { background: #1d4ed8; }

  .sp-btn-outline {
    background: transparent;
    border: 1px solid #2d3748;
    color: #94a3b8;
  }
  .sp-btn-outline:hover { border-color: #ef4444; color: #ef4444; }

  .sp-btn-publish {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: white;
    padding: 10px 20px;
    font-size: 14px;
  }
  .sp-btn-publish:hover:not(:disabled) { opacity: 0.9; }

  /* Help box */
  .sp-help-box {
    display: flex;
    gap: 10px;
    background: #161b27;
    border: 1px solid #1e2740;
    border-radius: 10px;
    padding: 14px;
    font-size: 12px;
    color: #64748b;
    align-items: flex-start;
  }
  .sp-help-box i { color: #4a90d9; font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .sp-help-box strong { color: #94a3b8; display: block; margin-bottom: 4px; }
  .sp-help-box p { margin: 0; line-height: 1.5; }

  /* Composer */
  .sp-composer {
    background: #161b27;
    border: 1px solid #1e2740;
    border-radius: 12px;
    padding: 20px;
  }

  .sp-composer-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    color: #475569;
    text-align: center;
  }
  .sp-empty-icon { font-size: 48px; opacity: 0.3; }

  .sp-composer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .sp-composer-header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #f1f5f9;
  }

  .sp-platform-toggles {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .sp-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid #2d3748;
    background: transparent;
    color: #64748b;
    transition: all 0.15s;
  }
  .sp-toggle-btn.active {
    background: var(--platform-color, #2563eb);
    border-color: var(--platform-color, #2563eb);
    color: white;
  }

  .sp-textarea {
    width: 100%;
    background: #0f1117;
    border: 1px solid #1e2740;
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 14px;
    line-height: 1.6;
    padding: 12px;
    resize: vertical;
    min-height: 140px;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .sp-textarea:focus {
    outline: none;
    border-color: #2563eb;
  }
  .sp-textarea::placeholder { color: #334155; }

  .sp-composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .sp-char-count { font-size: 12px; color: #475569; }
  .sp-char-warning {
    font-size: 12px;
    color: #f59e0b;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Publish result */
  .sp-result {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    padding: 14px;
    border-radius: 8px;
    font-size: 13px;
    align-items: flex-start;
  }
  .sp-result i { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
  .sp-result strong { display: block; margin-bottom: 3px; font-size: 14px; }
  .sp-result p { margin: 0; color: #94a3b8; }

  .sp-result-success {
    background: #0d2318;
    border: 1px solid #166534;
    color: #4ade80;
  }
  .sp-result-error {
    background: #2d1515;
    border: 1px solid #7f1d1d;
    color: #fca5a5;
  }

  .sp-result-list {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sp-result-list li {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #94a3b8;
  }
  .sp-result-list li.ok i { color: #4ade80; }
  .sp-result-list li.fail i { color: #f87171; }

  /* Loading states */
  .sp-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #64748b;
    font-size: 14px;
  }
  .sp-loader i { font-size: 32px; }

  .sp-loading-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .sp-skeleton {
    height: 90px;
    background: linear-gradient(90deg, #161b27 25%, #1e2740 50%, #161b27 75%);
    background-size: 200% 100%;
    border-radius: 12px;
    animation: sp-shimmer 1.5s infinite;
  }

  @keyframes sp-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes sp-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .sp-spin { animation: sp-spin 0.8s linear infinite; display: inline-block; }
`;
