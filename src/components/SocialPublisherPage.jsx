/**
 * SocialPublisherPage.jsx
 * /social — Single scrollable page
 * Apple aesthetic redesign — all logic unchanged from previous version
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

const COMING_SOON = [
  { id: "instagram", label: "Instagram", icon: "ti ti-brand-instagram", color: "#E1306C" },
  { id: "x",        label: "X / Twitter", icon: "ti ti-brand-x",        color: "#14171A" },
  { id: "gbp",      label: "Google Business", icon: "ti ti-brand-google", color: "#4285F4" },
  { id: "pinterest",label: "Pinterest",  icon: "ti ti-brand-pinterest", color: "#E60023" },
];

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
  const [session, setSession]                 = useState(null);
  const [connections, setConnections]         = useState({});
  const [loading, setLoading]                 = useState(true);
  const [connecting, setConnecting]           = useState(null);
  const [error, setError]                     = useState(null);

  const [businessName, setBusinessName]       = useState("");
  const [topic, setTopic]                     = useState("");
  const [postType, setPostType]               = useState("update");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [generating, setGenerating]           = useState(false);
  const [posts, setPosts]                     = useState({});
  const [publishing, setPublishing]           = useState(false);
  const [publishResult, setPublishResult]     = useState(null);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── Load settings ─────────────────────────────────────────────────────────────
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
      } catch {
        setError("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  // ── OAuth message listener ────────────────────────────────────────────────────
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

  // ── Connect ───────────────────────────────────────────────────────────────────
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

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async (platformId) => {
    if (!session) return;
    const platform = PLATFORMS[platformId];
    const update = { [platform.tokenKey]: null };
    if (platform.pageIdKey) update[platform.pageIdKey] = null;
    await supabase.from("settings").update(update).eq("user_id", session.user.id);
    setConnections(prev => ({ ...prev, [platformId]: false }));
    setSelectedPlatforms(prev => prev.filter(p => p !== platformId));
  }, [session]);

  // ── Save token ────────────────────────────────────────────────────────────────
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

  // ── Refresh ───────────────────────────────────────────────────────────────────
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

  // ── Generate ──────────────────────────────────────────────────────────────────
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

  // ── Publish ───────────────────────────────────────────────────────────────────
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

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (!session) return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f5f7",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 44, height: 44,
          border: "3px solid #e5e5ea",
          borderTopColor: "#007AFF",
          borderRadius: "50%",
          animation: "sp-spin 0.9s linear infinite",
        }} />
        <span style={{ fontSize: 15, color: "#8e8e93", fontWeight: 500 }}>Loading…</span>
      </div>
    </div>
  );

  const connectedPlatforms = Object.values(PLATFORMS).filter(p => connections[p.id]);
  const hasPosts = Object.keys(posts).length > 0;

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');

        @keyframes sp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sp-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .sp-page {
          min-height: 100vh;
          background: #f5f5f7;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif;
          color: #1d1d1f;
        }

        /* ── Header ── */
        .sp-header {
          background: rgba(255,255,255,0.82);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 0 24px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sp-header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sp-header-logo {
          width: 30px;
          height: 30px;
          background: linear-gradient(145deg, #007AFF, #5856D6);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          color: white;
          flex-shrink: 0;
        }

        .sp-header-title {
          font-size: 17px;
          font-weight: 600;
          color: #1d1d1f;
          letter-spacing: -0.2px;
        }

        .sp-back-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          color: #007AFF;
          font-size: 15px;
          font-family: inherit;
          font-weight: 400;
          cursor: pointer;
          padding: 4px 0;
          letter-spacing: -0.1px;
          transition: opacity 0.15s;
        }
        .sp-back-btn:hover { opacity: 0.7; }
        .sp-back-btn i { font-size: 17px; }

        /* ── Body ── */
        .sp-body {
          max-width: 720px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: sp-fade-in 0.35s ease both;
        }

        /* ── Hero ── */
        .sp-hero {
          text-align: center;
          padding: 8px 0 24px;
        }
        .sp-hero h1 {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.8px;
          color: #1d1d1f;
          margin-bottom: 8px;
          line-height: 1.1;
        }
        .sp-hero p {
          font-size: 16px;
          color: #6e6e73;
          font-weight: 400;
          letter-spacing: -0.1px;
        }

        /* ── Card ── */
        .sp-card {
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04);
        }

        .sp-card-header {
          padding: 18px 20px 14px;
          border-bottom: 1px solid #f2f2f7;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sp-card-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sp-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .sp-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #1d1d1f;
          letter-spacing: -0.2px;
        }

        .sp-card-subtitle {
          font-size: 12px;
          color: #8e8e93;
          margin-top: 1px;
          font-weight: 400;
        }

        .sp-card-body {
          padding: 20px;
        }

        /* ── Platform rows ── */
        .sp-platform-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #f2f2f7;
          gap: 12px;
        }
        .sp-platform-row:last-child { border-bottom: none; }

        .sp-platform-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sp-platform-avatar {
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
          font-size: 15px;
          font-weight: 600;
          color: #1d1d1f;
          letter-spacing: -0.2px;
        }

        .sp-platform-status {
          font-size: 12px;
          color: #8e8e93;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sp-platform-status.connected { color: #34C759; }

        /* ── Buttons ── */
        .sp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          border: none;
          border-radius: 980px;
          cursor: pointer;
          padding: 8px 18px;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: -0.1px;
          white-space: nowrap;
        }
        .sp-btn:active:not(:disabled) { transform: scale(0.97); }
        .sp-btn:hover:not(:disabled) { opacity: 0.85; }
        .sp-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .sp-btn-primary {
          background: #007AFF;
          color: white;
        }
        .sp-btn-secondary {
          background: #f2f2f7;
          color: #1d1d1f;
        }
        .sp-btn-danger {
          background: #fff1f0;
          color: #FF3B30;
        }
        .sp-btn-generate {
          background: linear-gradient(135deg, #5856D6, #007AFF);
          color: white;
          font-size: 15px;
          font-weight: 600;
          padding: 13px 28px;
          border-radius: 14px;
          width: 100%;
          justify-content: center;
        }
        .sp-btn-publish {
          background: #34C759;
          color: white;
          font-size: 15px;
          font-weight: 600;
          padding: 13px 28px;
          border-radius: 14px;
          flex: 1;
          justify-content: center;
        }

        /* ── Coming Soon grid ── */
        .sp-coming-soon-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 20px;
          padding-top: 0;
        }

        .sp-coming-soon-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: #f9f9fb;
          border-radius: 12px;
          border: 1px solid #f2f2f7;
        }

        .sp-coming-soon-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: white;
          flex-shrink: 0;
          opacity: 0.55;
        }

        .sp-coming-soon-label {
          font-size: 13px;
          font-weight: 500;
          color: #8e8e93;
        }

        .sp-soon-badge {
          margin-left: auto;
          background: #f2f2f7;
          color: #8e8e93;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 980px;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        /* ── Form fields ── */
        .sp-label {
          font-size: 13px;
          font-weight: 500;
          color: #3a3a3c;
          display: block;
          margin-bottom: 7px;
          letter-spacing: -0.1px;
        }

        .sp-input {
          width: 100%;
          background: #f9f9fb;
          border: 1px solid #e5e5ea;
          border-radius: 10px;
          color: #1d1d1f;
          font-size: 15px;
          font-family: inherit;
          padding: 11px 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
          -webkit-appearance: none;
        }
        .sp-input:focus {
          outline: none;
          border-color: #007AFF;
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
        }
        .sp-input::placeholder { color: #c7c7cc; }

        textarea.sp-input {
          resize: vertical;
          line-height: 1.6;
        }

        select.sp-input {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238e8e93' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }

        .sp-field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .sp-field { margin-bottom: 16px; }
        .sp-field:last-child { margin-bottom: 0; }

        /* ── Platform checkboxes ── */
        .sp-platform-checks {
          display: flex;
          gap: 10px;
        }

        .sp-check-label {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1.5px solid #e5e5ea;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          background: #f9f9fb;
          font-size: 14px;
          font-weight: 500;
          color: #1d1d1f;
          user-select: none;
        }
        .sp-check-label input[type="checkbox"] { display: none; }
        .sp-check-label.checked {
          border-color: #007AFF;
          background: rgba(0,122,255,0.06);
        }

        /* ── Post editors ── */
        .sp-post-editor {
          border: 1.5px solid #e5e5ea;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 12px;
          transition: border-color 0.15s;
        }
        .sp-post-editor:last-child { margin-bottom: 0; }
        .sp-post-editor:focus-within { border-color: #007AFF; }

        .sp-post-editor-header {
          padding: 10px 14px;
          background: #f9f9fb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #f2f2f7;
        }

        .sp-post-editor-platform {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #1d1d1f;
        }

        .sp-post-editor-hint {
          font-size: 11px;
          color: #8e8e93;
        }

        .sp-post-editor textarea {
          width: 100%;
          background: white;
          border: none;
          color: #1d1d1f;
          font-size: 14px;
          font-family: inherit;
          padding: 14px;
          resize: vertical;
          line-height: 1.65;
          display: block;
        }
        .sp-post-editor textarea:focus { outline: none; }

        /* ── Publish result ── */
        .sp-result {
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 14px;
          font-size: 13px;
        }
        .sp-result.success {
          background: rgba(52,199,89,0.08);
          border: 1px solid rgba(52,199,89,0.25);
        }
        .sp-result.error {
          background: rgba(255,59,48,0.06);
          border: 1px solid rgba(255,59,48,0.2);
        }
        .sp-result-title {
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        /* ── Error banner ── */
        .sp-error-banner {
          background: rgba(255,59,48,0.06);
          border-bottom: 1px solid rgba(255,59,48,0.15);
          color: #FF3B30;
          padding: 12px 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sp-error-close {
          background: none;
          border: none;
          color: #FF3B30;
          cursor: pointer;
          margin-left: auto;
          font-size: 18px;
          display: flex;
          opacity: 0.6;
          transition: opacity 0.15s;
        }
        .sp-error-close:hover { opacity: 1; }

        /* ── Empty platform warning ── */
        .sp-platform-warning {
          background: rgba(255,149,0,0.07);
          border: 1px solid rgba(255,149,0,0.2);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          color: #c57800;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Divider ── */
        .sp-divider {
          height: 1px;
          background: #f2f2f7;
          margin: 4px 0;
        }

        /* ── Publish row ── */
        .sp-publish-row {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }

        .sp-regen-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          background: #f2f2f7;
          color: #3a3a3c;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          padding: 13px 20px;
          transition: opacity 0.15s;
          letter-spacing: -0.1px;
          white-space: nowrap;
        }
        .sp-regen-btn:hover { opacity: 0.75; }

        /* ── Spinner in button ── */
        .sp-spinner {
          animation: sp-spin 0.8s linear infinite;
          display: inline-block;
        }

        /* ── How it works ── */
        .sp-howto {
          display: flex;
          gap: 10px;
          padding: 16px 20px;
          font-size: 13px;
          color: #6e6e73;
          line-height: 1.55;
        }
        .sp-howto i {
          font-size: 17px;
          color: #007AFF;
          flex-shrink: 0;
          margin-top: 1px;
        }

        @media (max-width: 600px) {
          .sp-field-row { grid-template-columns: 1fr; }
          .sp-coming-soon-grid { grid-template-columns: 1fr; }
          .sp-body { padding: 24px 14px 60px; }
          .sp-hero h1 { font-size: 26px; }
        }
      `}</style>

      <div className="sp-page">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="sp-header">
          <div className="sp-header-brand">
            <div className="sp-header-logo">
              <i className="ti ti-share-2"></i>
            </div>
            <span className="sp-header-title">Social Publisher</span>
          </div>
          <button className="sp-back-btn" onClick={handleBack}>
            <i className="ti ti-chevron-left"></i>
            RankForged
          </button>
        </header>

        {/* ── Error banner ────────────────────────────────────────────────────── */}
        {error && (
          <div className="sp-error-banner">
            <i className="ti ti-alert-circle"></i>
            {error}
            <button className="sp-error-close" onClick={() => setError(null)}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        <div className="sp-body">

          {/* ── Hero ──────────────────────────────────────────────────────────── */}
          <div className="sp-hero">
            <h1>Publish to Social</h1>
            <p>AI writes platform-optimised posts. You review and publish in one click.</p>
          </div>

          {/* ── SECTION 1: Connected Accounts ─────────────────────────────────── */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-card-header-left">
                <div className="sp-card-icon" style={{ background: "rgba(0,122,255,0.1)" }}>
                  <i className="ti ti-plug-connected" style={{ color: "#007AFF" }}></i>
                </div>
                <div>
                  <div className="sp-card-title">Connected Accounts</div>
                  <div className="sp-card-subtitle">Connect once, publish any time</div>
                </div>
              </div>
              <button
                onClick={refreshConnections}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "#8e8e93", fontSize: 18, display: "flex", padding: 4 }}
                title="Refresh"
              >
                <i className="ti ti-refresh"></i>
              </button>
            </div>

            <div className="sp-card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {loading ? (
                <div style={{ color: "#8e8e93", fontSize: 14, padding: "12px 0",
                  display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ti ti-loader-2 sp-spinner"></i> Loading accounts…
                </div>
              ) : (
                Object.values(PLATFORMS).map(platform => {
                  const connected = connections[platform.id];
                  const isConnecting = connecting === platform.id;
                  return (
                    <div key={platform.id} className="sp-platform-row">
                      <div className="sp-platform-info">
                        <div className="sp-platform-avatar" style={{ background: platform.color }}>
                          <i className={platform.icon}></i>
                        </div>
                        <div>
                          <div className="sp-platform-name">{platform.label}</div>
                          <div className={`sp-platform-status ${connected ? "connected" : ""}`}>
                            <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle"}`}></i>
                            {connected ? "Connected" : "Not connected"}
                          </div>
                        </div>
                      </div>
                      {connected ? (
                        <button
                          className="sp-btn sp-btn-danger"
                          onClick={() => handleDisconnect(platform.id)}
                        >
                          <i className="ti ti-unlink"></i> Disconnect
                        </button>
                      ) : (
                        <button
                          className="sp-btn sp-btn-primary"
                          onClick={() => handleConnect(platform.id)}
                          disabled={isConnecting}
                        >
                          <i className={`ti ${isConnecting ? "ti-loader-2 sp-spinner" : "ti-link"}`}></i>
                          {isConnecting ? "Connecting…" : `Connect`}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Coming soon divider */}
            <div style={{ padding: "12px 20px 8px", borderTop: "1px solid #f2f2f7" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#c7c7cc",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Coming Soon
              </div>
            </div>
            <div className="sp-coming-soon-grid" style={{ paddingTop: 0 }}>
              {COMING_SOON.map(p => (
                <div key={p.id} className="sp-coming-soon-item">
                  <div className="sp-coming-soon-avatar" style={{ background: p.color }}>
                    <i className={p.icon}></i>
                  </div>
                  <span className="sp-coming-soon-label">{p.label}</span>
                  <span className="sp-soon-badge">Soon</span>
                </div>
              ))}
            </div>
            <div style={{ height: 8 }}></div>
          </div>

          {/* ── SECTION 2: Write Your Post ─────────────────────────────────────── */}
          <div className="sp-card">
            <div className="sp-card-header">
              <div className="sp-card-header-left">
                <div className="sp-card-icon" style={{ background: "rgba(88,86,214,0.1)" }}>
                  <i className="ti ti-sparkles" style={{ color: "#5856D6" }}></i>
                </div>
                <div>
                  <div className="sp-card-title">Write Your Post</div>
                  <div className="sp-card-subtitle">Describe your message — AI does the rest</div>
                </div>
              </div>
            </div>

            <div className="sp-card-body">
              <div className="sp-field-row">
                <div>
                  <label className="sp-label">Business Name</label>
                  <input
                    className="sp-input"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Austin Plumbing Pros"
                  />
                </div>
                <div>
                  <label className="sp-label">Post Type</label>
                  <select
                    className="sp-input"
                    value={postType}
                    onChange={e => setPostType(e.target.value)}
                  >
                    <option value="update">Business Update</option>
                    <option value="offer">Special Offer / Promotion</option>
                    <option value="tip">Expert Tip / Educational</option>
                    <option value="review">Customer Review Spotlight</option>
                    <option value="event">Event / Announcement</option>
                    <option value="service">Service Spotlight</option>
                  </select>
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-label">
                  What do you want to post about?
                  <span style={{ fontWeight: 400, color: "#8e8e93", marginLeft: 6 }}>
                    (plain English — AI writes the posts)
                  </span>
                </label>
                <textarea
                  className="sp-input"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. We just added same-day AC repair. Summer special — 10% off for new customers this month."
                  rows={4}
                />
              </div>

              <div className="sp-field">
                <label className="sp-label">Publish to</label>
                {connectedPlatforms.length === 0 ? (
                  <div className="sp-platform-warning">
                    <i className="ti ti-alert-triangle"></i>
                    No platforms connected. Connect Facebook or LinkedIn above first.
                  </div>
                ) : (
                  <div className="sp-platform-checks">
                    {connectedPlatforms.map(platform => {
                      const checked = selectedPlatforms.includes(platform.id);
                      return (
                        <label
                          key={platform.id}
                          className={`sp-check-label ${checked ? "checked" : ""}`}
                          onClick={() => setSelectedPlatforms(prev =>
                            checked ? prev.filter(p => p !== platform.id) : [...prev, platform.id]
                          )}
                        >
                          <input type="checkbox" readOnly checked={checked} />
                          <i className={platform.icon} style={{ color: platform.color, fontSize: 17 }}></i>
                          {platform.label}
                          {checked && <i className="ti ti-check" style={{ marginLeft: "auto", color: "#007AFF", fontSize: 14 }}></i>}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                className="sp-btn sp-btn-generate"
                onClick={handleGenerate}
                disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
              >
                <i className={`ti ${generating ? "ti-loader-2 sp-spinner" : "ti-sparkles"}`}></i>
                {generating ? "Writing your posts…" : "Generate with AI"}
              </button>
            </div>
          </div>

          {/* ── SECTION 3: Review & Publish ─────────────────────────────────────── */}
          {hasPosts && (
            <div className="sp-card" style={{ animation: "sp-fade-in 0.3s ease both" }}>
              <div className="sp-card-header">
                <div className="sp-card-header-left">
                  <div className="sp-card-icon" style={{ background: "rgba(52,199,89,0.1)" }}>
                    <i className="ti ti-pencil" style={{ color: "#34C759" }}></i>
                  </div>
                  <div>
                    <div className="sp-card-title">Review & Edit</div>
                    <div className="sp-card-subtitle">Edit if needed — then publish</div>
                  </div>
                </div>
              </div>

              <div className="sp-card-body">
                {selectedPlatforms.map(pid => {
                  const platform = PLATFORMS[pid];
                  if (!platform || !posts[pid]) return null;
                  return (
                    <div key={pid} className="sp-post-editor">
                      <div className="sp-post-editor-header">
                        <div className="sp-post-editor-platform">
                          <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                          {platform.label}
                          <span style={{ fontWeight: 400, color: "#8e8e93", fontSize: 12 }}>
                            · {posts[pid].length} chars
                          </span>
                        </div>
                        <span className="sp-post-editor-hint">{platform.hint}</span>
                      </div>
                      <textarea
                        value={posts[pid]}
                        onChange={e => setPosts(prev => ({ ...prev, [pid]: e.target.value }))}
                        rows={5}
                      />
                    </div>
                  );
                })}

                {publishResult && (
                  <div className={`sp-result ${publishResult.success ? "success" : "error"}`}>
                    <div className="sp-result-title" style={{ color: publishResult.success ? "#34C759" : "#FF3B30" }}>
                      <i className={`ti ${publishResult.success ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                      {publishResult.success ? "Published successfully!" : "Some platforms failed"}
                    </div>
                    {publishResult.results?.map((r, i) => (
                      <div key={i} style={{ fontSize: 13, color: r.success ? "#34C759" : "#FF3B30",
                        display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                        <strong>{r.platform}:</strong> {r.message}
                      </div>
                    ))}
                  </div>
                )}

                <div className="sp-publish-row">
                  <button
                    className="sp-regen-btn"
                    onClick={() => { setPosts({}); setPublishResult(null); }}
                  >
                    <i className="ti ti-refresh"></i> Regenerate
                  </button>
                  <button
                    className="sp-btn sp-btn-publish"
                    onClick={handlePublish}
                    disabled={publishing || selectedPlatforms.length === 0}
                  >
                    <i className={`ti ${publishing ? "ti-loader-2 sp-spinner" : "ti-send"}`}></i>
                    {publishing
                      ? "Publishing…"
                      : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── How it works ────────────────────────────────────────────────────── */}
          <div className="sp-card">
            <div className="sp-howto">
              <i className="ti ti-info-circle"></i>
              <div>
                <strong style={{ color: "#3a3a3c", display: "block", marginBottom: 3, fontWeight: 600 }}>
                  How it works
                </strong>
                Connect your accounts once. Describe what you want to post in plain English —
                AI writes a platform-optimised version for each channel. Review and edit if needed,
                then publish in one click.
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
