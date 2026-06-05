/**
 * SocialPublisherPage.jsx
 * /social — Two-tab layout: Connect Accounts | Write & Post
 * Dark pro theme matching rankforge3
 * All logic identical to previous version
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
  { id: "instagram", label: "Instagram",       icon: "ti ti-brand-instagram", color: "#E1306C" },
  { id: "x",         label: "X / Twitter",     icon: "ti ti-brand-x",         color: "#e2e8f0" },
  { id: "gbp",       label: "Google Business", icon: "ti ti-brand-google",    color: "#4285F4" },
  { id: "pinterest", label: "Pinterest",        icon: "ti ti-brand-pinterest", color: "#E60023" },
];

function getHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

function handleBack() {
  // /social is always opened in a new tab from rankforge3
  // so closing the tab returns the user to rankforge3 naturally
  if (window.opener || window.history.length <= 1) {
    window.close();
    // fallback if window.close() is blocked
    setTimeout(() => { window.location.href = "/"; }, 300);
  } else {
    window.history.back();
  }
}

export default function SocialPublisherPage() {
  const [session, setSession]                     = useState(null);
  const [connections, setConnections]             = useState({});
  const [loading, setLoading]                     = useState(true);
  const [connecting, setConnecting]               = useState(null);
  const [error, setError]                         = useState(null);
  const [activeTab, setActiveTab]                 = useState("connect");

  const [businessName, setBusinessName]           = useState("");
  const [topic, setTopic]                         = useState("");
  const [postType, setPostType]                   = useState("update");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [generating, setGenerating]               = useState(false);
  const [posts, setPosts]                         = useState({});
  const [publishing, setPublishing]               = useState(false);
  const [publishResult, setPublishResult]         = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────────
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

  const connectedCount = Object.values(connections).filter(Boolean).length;
  const connectedPlatforms = Object.values(PLATFORMS).filter(p => connections[p.id]);
  const hasPosts = Object.keys(posts).length > 0;

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (!session) return (
    <div style={{
      minHeight: "100vh", background: "#080e1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 40, height: 40, border: "3px solid #0f2040",
          borderTopColor: "#1a5fd4", borderRadius: "50%",
          animation: "sp-spin 0.9s linear infinite",
        }} />
        <span style={{ fontSize: 13, color: "#1a3050" }}>Loading…</span>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');

        @keyframes sp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sp-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        *, *::before, *::after { box-sizing: border-box; }

        .sp-page {
          min-height: 100vh;
          background: #080e1a;
          font-family: 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          -webkit-font-smoothing: antialiased;
        }

        /* ── HEADER ── */
        .sp-header {
          background: #0d1f3c;
          border-bottom: 1px solid #1a2840;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .sp-header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sp-logo {
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #1a5fd4, #0e3fa8);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(26,95,212,0.4);
        }

        .sp-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.2px;
        }

        .sp-header-sub {
          font-size: 11px;
          color: #3a5070;
          margin-top: 1px;
          font-weight: 400;
        }

        .sp-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #1a2840;
          color: #7a9cc0;
          font-size: 13px;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          padding: 7px 14px;
          border-radius: 7px;
          transition: all 0.15s;
          letter-spacing: -0.1px;
        }
        .sp-back-btn:hover {
          border-color: #1a5fd4;
          color: #4a90d9;
          background: rgba(26,95,212,0.06);
        }

        /* ── TABS ── */
        .sp-tabs {
          background: #0a1628;
          border-bottom: 1px solid #1a2840;
          padding: 0 28px;
          display: flex;
          gap: 2px;
        }

        .sp-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 20px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          color: #3a5070;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: -0.1px;
          position: relative;
          bottom: -1px;
        }
        .sp-tab:hover { color: #7a9cc0; }
        .sp-tab.active {
          color: #4a90d9;
          border-bottom-color: #1a5fd4;
        }
        .sp-tab i { font-size: 15px; }

        .sp-tab-badge {
          background: #0f2a50;
          color: #4a90d9;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 980px;
          letter-spacing: 0.2px;
        }
        .sp-tab-badge.connected {
          background: #0d2a1a;
          color: #34c759;
        }

        /* ── BODY ── */
        .sp-body {
          max-width: 780px;
          margin: 0 auto;
          padding: 32px 24px 80px;
          animation: sp-fadein 0.25s ease both;
        }

        /* ── SECTION LABEL ── */
        .sp-section-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #2a4060;
          margin-bottom: 16px;
        }

        /* ── CARD ── */
        .sp-card {
          background: #0d1f3c;
          border: 1px solid #1a2840;
          border-radius: 14px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .sp-card-head {
          padding: 16px 20px;
          border-bottom: 1px solid #1a2840;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sp-card-head-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .sp-card-head-text h3 {
          font-size: 14px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 2px;
          letter-spacing: -0.2px;
        }

        .sp-card-head-text p {
          font-size: 12px;
          color: #3a5070;
          margin: 0;
          font-weight: 400;
        }

        .sp-card-body {
          padding: 20px;
        }

        /* ── PLATFORM ROWS ── */
        .sp-platform-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #0f1a2e;
          gap: 12px;
          transition: background 0.12s;
        }
        .sp-platform-row:last-child { border-bottom: none; }
        .sp-platform-row:hover { background: rgba(255,255,255,0.015); }

        .sp-platform-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sp-platform-avatar {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: white;
          flex-shrink: 0;
        }

        .sp-platform-name {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: -0.1px;
        }

        .sp-platform-status {
          font-size: 12px;
          color: #2a4060;
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
        }
        .sp-platform-status.ok { color: #34c759; }

        /* ── COMING SOON GRID ── */
        .sp-cs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 16px 20px 20px;
        }

        .sp-cs-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: #080e1a;
          border: 1px solid #111d33;
          border-radius: 10px;
        }

        .sp-cs-avatar {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          color: white;
          flex-shrink: 0;
          opacity: 0.35;
        }

        .sp-cs-label {
          font-size: 13px;
          font-weight: 500;
          color: #2a4060;
        }

        .sp-soon-pill {
          margin-left: auto;
          background: #0a1628;
          color: #2a4060;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 980px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          border: 1px solid #1a2840;
          flex-shrink: 0;
        }

        /* ── BUTTONS ── */
        .sp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          padding: 8px 16px;
          border: none;
          transition: all 0.15s;
          letter-spacing: -0.1px;
          white-space: nowrap;
        }
        .sp-btn:hover:not(:disabled) { filter: brightness(1.1); }
        .sp-btn:active:not(:disabled) { transform: scale(0.97); }
        .sp-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .sp-btn-connect {
          background: linear-gradient(135deg, #1a5fd4, #0e3fa8);
          color: white;
          box-shadow: 0 2px 8px rgba(26,95,212,0.3);
        }

        .sp-btn-disconnect {
          background: transparent;
          border: 1px solid #1a2840;
          color: #4a5c7a;
        }
        .sp-btn-disconnect:hover:not(:disabled) {
          border-color: #ff3b30;
          color: #ff3b30;
          background: rgba(255,59,48,0.06);
          filter: none;
        }

        /* ── FORM ── */
        .sp-field { margin-bottom: 18px; }
        .sp-field:last-of-type { margin-bottom: 0; }

        .sp-label {
          font-size: 12px;
          font-weight: 600;
          color: #4a6080;
          display: block;
          margin-bottom: 7px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .sp-label span {
          text-transform: none;
          font-weight: 400;
          color: #2a4060;
          letter-spacing: 0;
          margin-left: 6px;
          font-size: 11px;
        }

        .sp-input {
          width: 100%;
          background: #080e1a;
          border: 1px solid #1a2840;
          border-radius: 9px;
          color: #e2e8f0;
          font-size: 14px;
          font-family: inherit;
          padding: 10px 13px;
          transition: border-color 0.15s, box-shadow 0.15s;
          -webkit-appearance: none;
        }
        .sp-input:focus {
          outline: none;
          border-color: #1a5fd4;
          box-shadow: 0 0 0 3px rgba(26,95,212,0.15);
        }
        .sp-input::placeholder { color: #1a2840; }

        textarea.sp-input {
          resize: vertical;
          line-height: 1.65;
          min-height: 100px;
        }

        select.sp-input {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7' viewBox='0 0 11 7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%232a4060' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 13px center;
          padding-right: 34px;
        }

        .sp-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        /* ── PLATFORM CHECKBOXES ── */
        .sp-checks {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sp-check {
          flex: 1;
          min-width: 140px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 14px;
          background: #080e1a;
          border: 1.5px solid #1a2840;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 13px;
          font-weight: 600;
          color: #4a6080;
          user-select: none;
        }
        .sp-check input { display: none; }
        .sp-check:hover { border-color: #1a3560; color: #7a9cc0; }
        .sp-check.checked {
          border-color: #1a5fd4;
          background: rgba(26,95,212,0.08);
          color: #4a90d9;
        }
        .sp-check-tick {
          margin-left: auto;
          color: #1a5fd4;
          font-size: 13px;
          display: none;
        }
        .sp-check.checked .sp-check-tick { display: block; }

        .sp-no-platforms {
          background: #080e1a;
          border: 1px solid #1a2840;
          border-radius: 9px;
          padding: 12px 14px;
          font-size: 13px;
          color: #3a5070;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sp-no-platforms i { color: #f59e0b; }

        /* ── GENERATE BUTTON ── */
        .sp-btn-generate {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: linear-gradient(135deg, #1a5fd4, #5856d6);
          color: white;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          padding: 13px 0;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: -0.1px;
          box-shadow: 0 4px 16px rgba(26,95,212,0.35);
          margin-top: 20px;
        }
        .sp-btn-generate:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .sp-btn-generate:active:not(:disabled) { transform: translateY(0); }
        .sp-btn-generate:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

        /* ── POST EDITORS ── */
        .sp-post-editors { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }

        .sp-post-editor {
          border: 1px solid #1a2840;
          border-radius: 11px;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .sp-post-editor:focus-within { border-color: #1a5fd4; }

        .sp-post-editor-head {
          background: #080e1a;
          padding: 10px 14px;
          border-bottom: 1px solid #1a2840;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sp-post-editor-platform {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .sp-post-editor-meta {
          font-size: 11px;
          color: #2a4060;
          font-weight: 400;
        }

        .sp-post-editor-hint {
          font-size: 11px;
          color: #2a4060;
        }

        .sp-post-editor textarea {
          width: 100%;
          background: #0d1f3c;
          border: none;
          color: #c8d8f0;
          font-size: 13px;
          font-family: inherit;
          padding: 14px;
          resize: vertical;
          line-height: 1.7;
          display: block;
          min-height: 110px;
        }
        .sp-post-editor textarea:focus { outline: none; }

        /* ── PUBLISH ROW ── */
        .sp-publish-row {
          display: flex;
          gap: 10px;
        }

        .sp-btn-regen {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          border: 1px solid #1a2840;
          color: #4a6080;
          border-radius: 10px;
          cursor: pointer;
          padding: 12px 18px;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .sp-btn-regen:hover { border-color: #1a3560; color: #7a9cc0; }

        .sp-btn-publish {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #1a9b4e, #16803e);
          color: white;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 0;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(26,155,78,0.3);
          letter-spacing: -0.1px;
        }
        .sp-btn-publish:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .sp-btn-publish:active:not(:disabled) { transform: translateY(0); }
        .sp-btn-publish:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

        /* ── RESULT ── */
        .sp-result {
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 16px;
          font-size: 13px;
          animation: sp-fadein 0.2s ease both;
        }
        .sp-result.success {
          background: rgba(52,199,89,0.07);
          border: 1px solid rgba(52,199,89,0.2);
        }
        .sp-result.fail {
          background: rgba(255,59,48,0.06);
          border: 1px solid rgba(255,59,48,0.18);
        }
        .sp-result-title {
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .sp-result-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        /* ── ERROR BANNER ── */
        .sp-error {
          background: rgba(255,59,48,0.06);
          border-bottom: 1px solid rgba(255,59,48,0.15);
          color: #ff6b60;
          padding: 11px 28px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sp-error-close {
          background: none;
          border: none;
          color: #ff6b60;
          cursor: pointer;
          margin-left: auto;
          font-size: 17px;
          opacity: 0.6;
          display: flex;
          transition: opacity 0.15s;
          padding: 0;
        }
        .sp-error-close:hover { opacity: 1; }

        /* ── EMPTY STATE ── */
        .sp-write-tip {
          text-align: center;
          padding: 40px 20px;
          color: #2a4060;
        }
        .sp-write-tip i { font-size: 36px; display: block; margin-bottom: 12px; color: #1a3050; }
        .sp-write-tip h4 { font-size: 15px; font-weight: 600; color: #3a5070; margin: 0 0 6px; }
        .sp-write-tip p { font-size: 13px; line-height: 1.6; margin: 0; }

        /* ── SPINNER ── */
        .sp-spin { animation: sp-spin 0.8s linear infinite; display: inline-block; }

        @media (max-width: 580px) {
          .sp-row-2 { grid-template-columns: 1fr; }
          .sp-cs-grid { grid-template-columns: 1fr; }
          .sp-body { padding: 20px 14px 60px; }
          .sp-tabs { padding: 0 14px; }
          .sp-header { padding: 0 16px; }
        }
      `}</style>

      <div className="sp-page">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <header className="sp-header">
          <div className="sp-header-brand">
            <div className="sp-logo">
              <i className="ti ti-share-2"></i>
            </div>
            <div>
              <div className="sp-header-title">Social Publisher</div>
              <div className="sp-header-sub">AI-powered · Facebook · LinkedIn</div>
            </div>
          </div>
          <button className="sp-back-btn" onClick={handleBack}>
            <i className="ti ti-arrow-left"></i>
            Back to RankForged
          </button>
        </header>

        {/* ── TABS ────────────────────────────────────────────────────────────── */}
        <nav className="sp-tabs">
          <button
            className={`sp-tab ${activeTab === "connect" ? "active" : ""}`}
            onClick={() => setActiveTab("connect")}
          >
            <i className="ti ti-plug-connected"></i>
            Connect Accounts
            <span className={`sp-tab-badge ${connectedCount > 0 ? "connected" : ""}`}>
              {connectedCount > 0 ? `${connectedCount} connected` : "None"}
            </span>
          </button>
          <button
            className={`sp-tab ${activeTab === "write" ? "active" : ""}`}
            onClick={() => setActiveTab("write")}
          >
            <i className="ti ti-sparkles"></i>
            Write &amp; Post
            {connectedCount === 0 && (
              <span className="sp-tab-badge" style={{ background: "#1a1500", color: "#f59e0b", borderColor: "#2a2000" }}>
                Connect first
              </span>
            )}
          </button>
        </nav>

        {/* ── ERROR BANNER ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="sp-error">
            <i className="ti ti-alert-circle"></i>
            {error}
            <button className="sp-error-close" onClick={() => setError(null)}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1 — CONNECT ACCOUNTS
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "connect" && (
          <div className="sp-body">

            {/* Active platforms */}
            <div className="sp-card">
              <div className="sp-card-head">
                <div className="sp-card-head-icon" style={{ background: "rgba(26,95,212,0.12)" }}>
                  <i className="ti ti-plug-connected" style={{ color: "#4a90d9", fontSize: 17 }}></i>
                </div>
                <div className="sp-card-head-text">
                  <h3>Your Social Accounts</h3>
                  <p>Connect once — your credentials are stored securely and never shared</p>
                </div>
                <button
                  onClick={refreshConnections}
                  title="Refresh status"
                  style={{ marginLeft: "auto", background: "none", border: "none",
                    color: "#2a4060", cursor: "pointer", fontSize: 17, display: "flex",
                    padding: 4, transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#4a90d9"}
                  onMouseLeave={e => e.currentTarget.style.color = "#2a4060"}
                >
                  <i className="ti ti-refresh"></i>
                </button>
              </div>

              {loading ? (
                <div style={{ padding: "24px 20px", color: "#2a4060", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="ti ti-loader-2 sp-spin"></i> Checking connections…
                </div>
              ) : (
                Object.values(PLATFORMS).map(platform => {
                  const connected = connections[platform.id];
                  const isConnecting = connecting === platform.id;
                  return (
                    <div key={platform.id} className="sp-platform-row">
                      <div className="sp-platform-left">
                        <div
                          className="sp-platform-avatar"
                          style={{ background: platform.color }}
                        >
                          <i className={platform.icon}></i>
                        </div>
                        <div>
                          <div className="sp-platform-name">{platform.label}</div>
                          <div className={`sp-platform-status ${connected ? "ok" : ""}`}>
                            <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                            {connected ? "Connected and ready" : "Not connected"}
                          </div>
                        </div>
                      </div>
                      {connected ? (
                        <button
                          className="sp-btn sp-btn-disconnect"
                          onClick={() => handleDisconnect(platform.id)}
                        >
                          <i className="ti ti-unlink"></i> Disconnect
                        </button>
                      ) : (
                        <button
                          className="sp-btn sp-btn-connect"
                          onClick={() => handleConnect(platform.id)}
                          disabled={isConnecting}
                        >
                          <i className={`ti ${isConnecting ? "ti-loader-2 sp-spin" : "ti-link"}`}></i>
                          {isConnecting ? "Connecting…" : `Connect ${platform.label}`}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Coming soon */}
            <div className="sp-card">
              <div className="sp-card-head">
                <div className="sp-card-head-icon" style={{ background: "rgba(255,149,0,0.1)" }}>
                  <i className="ti ti-clock" style={{ color: "#f59e0b", fontSize: 17 }}></i>
                </div>
                <div className="sp-card-head-text">
                  <h3>Coming Soon</h3>
                  <p>More platforms are on the way</p>
                </div>
              </div>
              <div className="sp-cs-grid">
                {COMING_SOON.map(p => (
                  <div key={p.id} className="sp-cs-item">
                    <div className="sp-cs-avatar" style={{ background: p.color }}>
                      <i className={p.icon}></i>
                    </div>
                    <span className="sp-cs-label">{p.label}</span>
                    <span className="sp-soon-pill">Soon</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA to write tab */}
            {connectedCount > 0 && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  onClick={() => setActiveTab("write")}
                  className="sp-btn-generate"
                  style={{ maxWidth: 280, margin: "0 auto" }}
                >
                  <i className="ti ti-arrow-right"></i>
                  Go to Write &amp; Post
                </button>
              </div>
            )}

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 2 — WRITE & POST
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "write" && (
          <div className="sp-body">

            {connectedCount === 0 ? (
              /* No platforms connected yet */
              <div className="sp-card">
                <div className="sp-write-tip">
                  <i className="ti ti-plug-connected"></i>
                  <h4>No accounts connected yet</h4>
                  <p>
                    Go to the <strong style={{ color: "#4a90d9", cursor: "pointer" }}
                      onClick={() => setActiveTab("connect")}>Connect Accounts</strong> tab
                    and connect at least one platform before writing posts.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Step 1: Tell us about your post ── */}
                <div className="sp-card">
                  <div className="sp-card-head">
                    <div className="sp-card-head-icon" style={{ background: "rgba(88,86,214,0.12)" }}>
                      <i className="ti ti-pencil" style={{ color: "#7c7ae8", fontSize: 17 }}></i>
                    </div>
                    <div className="sp-card-head-text">
                      <h3>Step 1 — Describe Your Post</h3>
                      <p>Tell the AI what you want to say in plain English</p>
                    </div>
                  </div>
                  <div className="sp-card-body">
                    <div className="sp-row-2" style={{ marginBottom: 18 }}>
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
                        <span>Write in plain English — AI handles the rest</span>
                      </label>
                      <textarea
                        className="sp-input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g. We just added same-day AC repair. Summer special — 10% off for new customers this month."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Step 2: Choose platforms ── */}
                <div className="sp-card">
                  <div className="sp-card-head">
                    <div className="sp-card-head-icon" style={{ background: "rgba(26,95,212,0.12)" }}>
                      <i className="ti ti-share" style={{ color: "#4a90d9", fontSize: 17 }}></i>
                    </div>
                    <div className="sp-card-head-text">
                      <h3>Step 2 — Choose Where to Post</h3>
                      <p>Select one or more connected platforms</p>
                    </div>
                  </div>
                  <div className="sp-card-body">
                    <div className="sp-checks">
                      {connectedPlatforms.map(platform => {
                        const checked = selectedPlatforms.includes(platform.id);
                        return (
                          <label
                            key={platform.id}
                            className={`sp-check ${checked ? "checked" : ""}`}
                            onClick={() => setSelectedPlatforms(prev =>
                              checked
                                ? prev.filter(p => p !== platform.id)
                                : [...prev, platform.id]
                            )}
                          >
                            <input type="checkbox" readOnly checked={checked} />
                            <i className={platform.icon} style={{ color: platform.color, fontSize: 18 }}></i>
                            {platform.label}
                            <i className="ti ti-check sp-check-tick"></i>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Step 3: Generate ── */}
                <button
                  className="sp-btn-generate"
                  onClick={handleGenerate}
                  disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
                >
                  <i className={`ti ${generating ? "ti-loader-2 sp-spin" : "ti-sparkles"}`}></i>
                  {generating ? "AI is writing your posts…" : "Generate Posts with AI"}
                </button>

                {/* ── Step 4: Review & publish (appears after generation) ── */}
                {hasPosts && (
                  <div className="sp-card" style={{ animation: "sp-fadein 0.25s ease both" }}>
                    <div className="sp-card-head">
                      <div className="sp-card-head-icon" style={{ background: "rgba(52,199,89,0.1)" }}>
                        <i className="ti ti-eye" style={{ color: "#34c759", fontSize: 17 }}></i>
                      </div>
                      <div className="sp-card-head-text">
                        <h3>Step 3 — Review &amp; Publish</h3>
                        <p>Edit if needed, then hit Publish</p>
                      </div>
                    </div>
                    <div className="sp-card-body">
                      <div className="sp-post-editors">
                        {selectedPlatforms.map(pid => {
                          const platform = PLATFORMS[pid];
                          if (!platform || !posts[pid]) return null;
                          return (
                            <div key={pid} className="sp-post-editor">
                              <div className="sp-post-editor-head">
                                <div className="sp-post-editor-platform">
                                  <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                                  {platform.label}
                                  <span className="sp-post-editor-meta">· {posts[pid].length} chars</span>
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
                      </div>

                      {publishResult && (
                        <div className={`sp-result ${publishResult.success ? "success" : "fail"}`}>
                          <div
                            className="sp-result-title"
                            style={{ color: publishResult.success ? "#34c759" : "#ff6b60" }}
                          >
                            <i className={`ti ${publishResult.success ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                            {publishResult.success ? "Published successfully!" : "Some platforms failed"}
                          </div>
                          {publishResult.results?.map((r, i) => (
                            <div key={i} className="sp-result-row"
                              style={{ color: r.success ? "#34c759" : "#ff6b60" }}>
                              <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                              <strong>{r.platform}:</strong> {r.message}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="sp-publish-row">
                        <button
                          className="sp-btn-regen"
                          onClick={() => { setPosts({}); setPublishResult(null); }}
                        >
                          <i className="ti ti-refresh"></i> Regenerate
                        </button>
                        <button
                          className="sp-btn-publish"
                          onClick={handlePublish}
                          disabled={publishing || selectedPlatforms.length === 0}
                        >
                          <i className={`ti ${publishing ? "ti-loader-2 sp-spin" : "ti-send"}`}></i>
                          {publishing
                            ? "Publishing…"
                            : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? "s" : ""}`
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}
