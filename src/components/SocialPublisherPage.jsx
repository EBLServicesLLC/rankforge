/**
 * SocialPublisherPage.jsx
 * /social — Single scrollable page
 * Section 1: Connect Accounts (live + coming soon greyed out)
 * Section 2: Write & Post wizard
 * Dark pro theme matching rankforge3
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const SUPABASE_URL = "https://ybhpbpahhywiokhqpldj.supabase.co";

const LIVE_PLATFORMS = [
  {
    id: "facebook",
    label: "Facebook",
    icon: "ti ti-brand-facebook",
    color: "#1877F2",
    tokenKey: "fb_token",
    pageIdKey: "fb_page_id",
    authEndpoint: "/functions/v1/social-auth-facebook",
    hint: "Friendly & conversational · best under 280 chars",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "ti ti-brand-linkedin",
    color: "#0A66C2",
    tokenKey: "linkedin_token",
    pageIdKey: null,
    authEndpoint: "/functions/v1/social-auth-linkedin",
    hint: "Professional & insightful · best under 1,300 chars",
  },
];

const COMING_SOON = [
  { id: "instagram", label: "Instagram",        icon: "ti ti-brand-instagram", color: "#E1306C" },
  { id: "x",         label: "X / Twitter",      icon: "ti ti-brand-x",         color: "#94a3b8" },
  { id: "gbp",       label: "Google Business",  icon: "ti ti-brand-google",    color: "#4285F4" },
  { id: "pinterest", label: "Pinterest",         icon: "ti ti-brand-pinterest", color: "#E60023" },
];

const POST_TYPES = [
  { value: "update",  label: "Business Update" },
  { value: "offer",   label: "Special Offer / Promotion" },
  { value: "tip",     label: "Expert Tip / Educational" },
  { value: "review",  label: "Customer Review Spotlight" },
  { value: "event",   label: "Event / Announcement" },
  { value: "service", label: "Service Spotlight" },
];

function getHeaders(session) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  };
}

// /social is opened in a new tab from rankforge3 — closing returns user there
function handleBack() {
  if (window.opener || window.history.length <= 1) {
    window.close();
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
  const [successMsg, setSuccessMsg]               = useState(null);

  // Wizard state
  const [businessName, setBusinessName]           = useState("");
  const [postType, setPostType]                   = useState("update");
  const [topic, setTopic]                         = useState("");
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
        const conns = { facebook: !!s.fb_token, linkedin: !!s.linkedin_token };
        setConnections(conns);
        if (s.agency_name) setBusinessName(s.agency_name);
        // Auto-select any already-connected platforms
        setSelectedPlatforms(
          Object.entries(conns).filter(([, v]) => v).map(([k]) => k)
        );
      } catch {
        setError("Failed to load your settings. Please refresh.");
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
    const platform = LIVE_PLATFORMS.find(p => p.id === platformId);
    try {
      const res = await fetch(
        `${SUPABASE_URL}${platform.authEndpoint}?action=get_url&redirect_uri=${encodeURIComponent(window.location.origin + "/social/callback")}`,
        { headers: getHeaders(session) }
      );
      if (!res.ok) throw new Error((await res.json()).error || "Failed to get auth URL");
      const { url } = await res.json();
      const popup = window.open(url, `${platformId}_oauth`, "width=600,height=700,scrollbars=yes");
      if (!popup) throw new Error("Popup blocked — please allow popups for this site.");
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
    const platform = LIVE_PLATFORMS.find(p => p.id === platformId);
    const update = { [platform.tokenKey]: null };
    if (platform.pageIdKey) update[platform.pageIdKey] = null;
    await supabase.from("settings").update(update).eq("user_id", session.user.id);
    setConnections(prev => ({ ...prev, [platformId]: false }));
    setSelectedPlatforms(prev => prev.filter(p => p !== platformId));
  }, [session]);

  // ── Save token ────────────────────────────────────────────────────────────────
  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return;
    const platform = LIVE_PLATFORMS.find(p => p.id === platformId);
    const update = { [platform.tokenKey]: token };
    if (platform.pageIdKey && pageId) update[platform.pageIdKey] = pageId;
    await supabase.from("settings").upsert(
      { user_id: session.user.id, ...update },
      { onConflict: "user_id" }
    );
    setConnections(prev => ({ ...prev, [platformId]: true }));
    setSelectedPlatforms(prev => prev.includes(platformId) ? prev : [...prev, platformId]);
    setConnecting(null);
    setSuccessMsg(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} connected successfully!`);
    setTimeout(() => setSuccessMsg(null), 4000);
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
    if (selectedPlatforms.length === 0) { setError("Select at least one platform below."); return; }
    setGenerating(true);
    setError(null);
    setPublishResult(null);
    setPosts({});
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

  const connectedPlatforms = LIVE_PLATFORMS.filter(p => connections[p.id]);
  const hasPosts = Object.keys(posts).length > 0;

  // ── Loading splash ────────────────────────────────────────────────────────────
  if (!session) return (
    <div style={{
      minHeight: "100vh", background: "#080e1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 38, height: 38, border: "3px solid #0f2040",
          borderTopColor: "#1a5fd4", borderRadius: "50%",
          animation: "sp-spin 0.9s linear infinite",
        }} />
        <span style={{ fontSize: 13, color: "#1a3050" }}>Loading Social Publisher…</span>
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
        @keyframes sp-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sp-page {
          min-height: 100vh;
          background: #060c18;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: #c8d8f0;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── TOPBAR ─────────────────────────────────────────────────────────── */
        .sp-topbar {
          background: #0a1628;
          border-bottom: 1px solid #1a2840;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 200;
        }
        .sp-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sp-topbar-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #1a5fd4, #0e3fa8);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(26,95,212,.35);
        }
        .sp-topbar-title {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -.2px;
        }
        .sp-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid #1a2840;
          color: #4a6a90;
          font-size: 13px;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          padding: 7px 14px;
          border-radius: 7px;
          transition: all .15s;
          letter-spacing: -.1px;
        }
        .sp-back-btn:hover {
          border-color: #1a5fd4;
          color: #4a90d9;
          background: rgba(26,95,212,.07);
        }

        /* ─── CONTENT WRAPPER ────────────────────────────────────────────────── */
        .sp-content {
          max-width: 740px;
          margin: 0 auto;
          padding: 36px 24px 100px;
        }

        /* ─── SECTION DIVIDER ────────────────────────────────────────────────── */
        .sp-section {
          margin-bottom: 14px;
        }
        .sp-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: #1e3050;
          margin-bottom: 10px;
          padding-left: 2px;
        }

        /* ─── CARD ───────────────────────────────────────────────────────────── */
        .sp-card {
          background: #0d1f3c;
          border: 1px solid #162035;
          border-radius: 14px;
          overflow: hidden;
        }

        /* ─── PLATFORM ROW (live) ────────────────────────────────────────────── */
        .sp-plat-row {
          display: flex;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid #0e1a2e;
          gap: 14px;
          transition: background .12s;
        }
        .sp-plat-row:last-child { border-bottom: none; }
        .sp-plat-row:hover { background: rgba(255,255,255,.015); }

        .sp-plat-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
          color: #fff;
          flex-shrink: 0;
        }
        .sp-plat-info { flex: 1; min-width: 0; }
        .sp-plat-name {
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
          letter-spacing: -.1px;
        }
        .sp-plat-status {
          font-size: 12px;
          margin-top: 3px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
          color: #2a4060;
        }
        .sp-plat-status.connected { color: #34c759; }

        /* ─── PLATFORM ROW (coming soon) ─────────────────────────────────────── */
        .sp-plat-row-soon {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid #0e1a2e;
          gap: 14px;
          opacity: .45;
        }
        .sp-plat-row-soon:last-child { border-bottom: none; }
        .sp-soon-badge {
          margin-left: auto;
          background: #0a1628;
          border: 1px solid #1a2840;
          color: #2a4060;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 980px;
          letter-spacing: .25px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        /* ─── BUTTONS ────────────────────────────────────────────────────────── */
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
          transition: all .15s;
          white-space: nowrap;
          letter-spacing: -.1px;
        }
        .sp-btn:hover:not(:disabled) { filter: brightness(1.12); }
        .sp-btn:active:not(:disabled) { transform: scale(.97); }
        .sp-btn:disabled { opacity: .4; cursor: not-allowed; }

        .sp-btn-connect {
          background: linear-gradient(135deg, #1a5fd4, #0e3fa8);
          color: #fff;
          box-shadow: 0 2px 10px rgba(26,95,212,.3);
        }
        .sp-btn-disconnect {
          background: transparent;
          border: 1px solid #1a2840;
          color: #3a5070;
        }
        .sp-btn-disconnect:hover:not(:disabled) {
          filter: none;
          border-color: #c0392b;
          color: #e74c3c;
          background: rgba(231,76,60,.06);
        }

        /* ─── DIVIDER BETWEEN SECTIONS ───────────────────────────────────────── */
        .sp-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #1a2840, transparent);
          margin: 28px 0;
        }

        /* ─── WIZARD CARD ────────────────────────────────────────────────────── */
        .sp-wizard-card {
          background: #0d1f3c;
          border: 1px solid #162035;
          border-radius: 14px;
          padding: 28px 24px;
        }

        /* ─── FORM ELEMENTS ──────────────────────────────────────────────────── */
        .sp-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .07em;
          color: #3a5878;
          margin-bottom: 8px;
        }
        .sp-label-note {
          font-size: 11px;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          color: #1e3050;
          margin-left: 6px;
        }
        .sp-input {
          width: 100%;
          background: #060c18;
          border: 1px solid #1a2840;
          border-radius: 9px;
          color: #c8d8f0;
          font-size: 14px;
          font-family: inherit;
          padding: 10px 13px;
          transition: border-color .15s, box-shadow .15s;
          -webkit-appearance: none;
          appearance: none;
        }
        .sp-input:focus {
          outline: none;
          border-color: #1a5fd4;
          box-shadow: 0 0 0 3px rgba(26,95,212,.14);
        }
        .sp-input::placeholder { color: #1a2840; }

        textarea.sp-input {
          resize: vertical;
          line-height: 1.65;
          min-height: 96px;
        }
        select.sp-input {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%232a4060' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 32px;
        }
        .sp-field { margin-bottom: 20px; }
        .sp-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }

        /* ─── PLATFORM CHECKBOXES ─────────────────────────────────────────────── */
        .sp-plat-checks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .sp-plat-check {
          flex: 1;
          min-width: 150px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 14px;
          background: #060c18;
          border: 1.5px solid #1a2840;
          border-radius: 9px;
          cursor: pointer;
          transition: all .15s;
          font-size: 13px;
          font-weight: 600;
          color: #3a5070;
          user-select: none;
        }
        .sp-plat-check:hover { border-color: #1a3560; color: #6a90b8; }
        .sp-plat-check.selected {
          border-color: #1a5fd4;
          background: rgba(26,95,212,.09);
          color: #4a90d9;
        }
        .sp-plat-check input[type="checkbox"] { display: none; }
        .sp-check-icon { font-size: 17px; flex-shrink: 0; }
        .sp-check-tick {
          margin-left: auto;
          font-size: 13px;
          color: #1a5fd4;
          display: none;
        }
        .sp-plat-check.selected .sp-check-tick { display: block; }

        .sp-no-conn-msg {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #060c18;
          border: 1px solid #1a2840;
          border-radius: 9px;
          padding: 12px 16px;
          font-size: 13px;
          color: #3a5070;
        }
        .sp-no-conn-msg i { color: #f59e0b; font-size: 16px; flex-shrink: 0; }

        /* ─── GENERATE BUTTON ─────────────────────────────────────────────────── */
        .sp-btn-generate {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: linear-gradient(135deg, #1a5fd4, #5856d6);
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          padding: 14px 0;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all .15s;
          letter-spacing: -.1px;
          box-shadow: 0 4px 18px rgba(26,95,212,.35);
          margin-top: 4px;
        }
        .sp-btn-generate:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(26,95,212,.45);
        }
        .sp-btn-generate:active:not(:disabled) { transform: translateY(0); }
        .sp-btn-generate:disabled {
          opacity: .38;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* ─── POST EDITORS ────────────────────────────────────────────────────── */
        .sp-editors { display: flex; flex-direction: column; gap: 12px; }
        .sp-editor {
          border: 1px solid #1a2840;
          border-radius: 11px;
          overflow: hidden;
          transition: border-color .15s;
          animation: sp-fade-up .25s ease both;
        }
        .sp-editor:focus-within { border-color: #1a5fd4; }
        .sp-editor-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #060c18;
          border-bottom: 1px solid #1a2840;
        }
        .sp-editor-plat {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #c8d8f0;
        }
        .sp-editor-meta { font-size: 11px; color: #2a4060; font-weight: 400; }
        .sp-editor-hint { font-size: 11px; color: #2a4060; }
        .sp-editor textarea {
          width: 100%;
          display: block;
          background: #0d1f3c;
          border: none;
          color: #a8c0e0;
          font-size: 13px;
          font-family: inherit;
          padding: 14px;
          resize: vertical;
          line-height: 1.7;
          min-height: 110px;
        }
        .sp-editor textarea:focus { outline: none; }

        /* ─── PUBLISH ROW ─────────────────────────────────────────────────────── */
        .sp-publish-row {
          display: flex;
          gap: 10px;
          margin-top: 16px;
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
          color: #3a5070;
          border-radius: 10px;
          cursor: pointer;
          padding: 12px 18px;
          transition: all .15s;
          white-space: nowrap;
        }
        .sp-btn-regen:hover { border-color: #1a3560; color: #6a90b8; }
        .sp-btn-publish {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #1a9b4e, #16803e);
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          padding: 13px 0;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all .15s;
          box-shadow: 0 4px 14px rgba(26,155,78,.3);
          letter-spacing: -.1px;
        }
        .sp-btn-publish:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .sp-btn-publish:active:not(:disabled) { transform: translateY(0); }
        .sp-btn-publish:disabled {
          opacity: .38;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* ─── RESULT BANNER ───────────────────────────────────────────────────── */
        .sp-result {
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 16px;
          font-size: 13px;
          animation: sp-slide-down .2s ease both;
        }
        .sp-result.ok {
          background: rgba(52,199,89,.07);
          border: 1px solid rgba(52,199,89,.2);
        }
        .sp-result.fail {
          background: rgba(231,76,60,.07);
          border: 1px solid rgba(231,76,60,.2);
        }
        .sp-result-title {
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
        }
        .sp-result-row {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 3px;
        }

        /* ─── BANNERS ─────────────────────────────────────────────────────────── */
        .sp-banner {
          padding: 11px 32px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: sp-slide-down .2s ease both;
        }
        .sp-banner.error {
          background: rgba(231,76,60,.07);
          border-bottom: 1px solid rgba(231,76,60,.18);
          color: #e05a50;
        }
        .sp-banner.success {
          background: rgba(52,199,89,.07);
          border-bottom: 1px solid rgba(52,199,89,.18);
          color: #34c759;
        }
        .sp-banner-close {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 17px;
          opacity: .6;
          display: flex;
          padding: 0;
          color: inherit;
          transition: opacity .15s;
        }
        .sp-banner-close:hover { opacity: 1; }

        /* ─── SPINNER ─────────────────────────────────────────────────────────── */
        .sp-spin { animation: sp-spin .8s linear infinite; display: inline-block; }

        /* ─── RESPONSIVE ──────────────────────────────────────────────────────── */
        @media (max-width: 560px) {
          .sp-topbar { padding: 0 16px; }
          .sp-content { padding: 24px 14px 80px; }
          .sp-row-2 { grid-template-columns: 1fr; }
          .sp-plat-check { min-width: 120px; }
          .sp-wizard-card { padding: 20px 16px; }
        }
      `}</style>

      <div className="sp-page">

        {/* ─── TOPBAR ──────────────────────────────────────────────────────────── */}
        <header className="sp-topbar">
          <div className="sp-topbar-left">
            <div className="sp-topbar-icon">
              <i className="ti ti-share-2"></i>
            </div>
            <span className="sp-topbar-title">Social Publisher</span>
          </div>
          <button className="sp-back-btn" onClick={handleBack}>
            <i className="ti ti-arrow-left"></i>
            Back to RankForged
          </button>
        </header>

        {/* ─── BANNERS ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="sp-banner error">
            <i className="ti ti-alert-circle"></i>
            {error}
            <button className="sp-banner-close" onClick={() => setError(null)}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}
        {successMsg && (
          <div className="sp-banner success">
            <i className="ti ti-circle-check-filled"></i>
            {successMsg}
            <button className="sp-banner-close" onClick={() => setSuccessMsg(null)}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        <div className="sp-content">

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 1 — CONNECT ACCOUNTS
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="sp-section">
            <div className="sp-section-title">Connect Accounts</div>
            <div className="sp-card">

              {/* Live platforms */}
              {loading ? (
                <div style={{ padding: "20px", color: "#2a4060", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="ti ti-loader-2 sp-spin"></i> Checking your connections…
                </div>
              ) : (
                LIVE_PLATFORMS.map(platform => {
                  const connected = connections[platform.id];
                  const isConnecting = connecting === platform.id;
                  return (
                    <div key={platform.id} className="sp-plat-row">
                      <div className="sp-plat-avatar" style={{ background: platform.color }}>
                        <i className={platform.icon}></i>
                      </div>
                      <div className="sp-plat-info">
                        <div className="sp-plat-name">{platform.label}</div>
                        <div className={`sp-plat-status ${connected ? "connected" : ""}`}>
                          <i className={`ti ${connected ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                          {connected ? "Connected" : "Not connected"}
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
                          disabled={!!isConnecting}
                        >
                          <i className={`ti ${isConnecting ? "ti-loader-2 sp-spin" : "ti-link"}`}></i>
                          {isConnecting ? "Connecting…" : `Connect ${platform.label}`}
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {/* Coming soon — greyed out, same list style */}
              {COMING_SOON.map(platform => (
                <div key={platform.id} className="sp-plat-row-soon">
                  <div className="sp-plat-avatar" style={{ background: platform.color, opacity: .5 }}>
                    <i className={platform.icon}></i>
                  </div>
                  <div className="sp-plat-info">
                    <div className="sp-plat-name" style={{ color: "#2a4060" }}>{platform.label}</div>
                    <div className="sp-plat-status" style={{ color: "#1a2840" }}>
                      <i className="ti ti-clock"></i> Coming soon
                    </div>
                  </div>
                  <span className="sp-soon-badge">Soon</span>
                </div>
              ))}

            </div>
          </div>

          {/* Divider */}
          <div className="sp-divider"></div>

          {/* ═══════════════════════════════════════════════════════════════════
              SECTION 2 — WRITE & POST WIZARD
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="sp-section">
            <div className="sp-section-title">Write &amp; Post</div>
            <div className="sp-wizard-card">

              {/* Business Name + Post Type */}
              <div className="sp-row-2">
                <div>
                  <label className="sp-label">Business Name</label>
                  <input
                    className="sp-input"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Crystal Coast HR"
                  />
                </div>
                <div>
                  <label className="sp-label">Post Type</label>
                  <select
                    className="sp-input"
                    value={postType}
                    onChange={e => setPostType(e.target.value)}
                  >
                    {POST_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Topic */}
              <div className="sp-field">
                <label className="sp-label">
                  What do you want to post about?
                  <span className="sp-label-note">Write in plain English — AI handles the rest</span>
                </label>
                <textarea
                  className="sp-input"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. We just added same-day AC repair. Summer special — 10% off for new customers this month."
                  rows={4}
                />
              </div>

              {/* Platform checkboxes */}
              <div className="sp-field">
                <label className="sp-label">Publish to</label>
                {connectedPlatforms.length === 0 ? (
                  <div className="sp-no-conn-msg">
                    <i className="ti ti-alert-triangle"></i>
                    No accounts connected yet. Connect Facebook or LinkedIn above first.
                  </div>
                ) : (
                  <div className="sp-plat-checks">
                    {connectedPlatforms.map(platform => {
                      const selected = selectedPlatforms.includes(platform.id);
                      return (
                        <label
                          key={platform.id}
                          className={`sp-plat-check ${selected ? "selected" : ""}`}
                          onClick={() => setSelectedPlatforms(prev =>
                            selected
                              ? prev.filter(p => p !== platform.id)
                              : [...prev, platform.id]
                          )}
                        >
                          <input type="checkbox" readOnly checked={selected} />
                          <i className={`${platform.icon} sp-check-icon`} style={{ color: platform.color }}></i>
                          {platform.label}
                          <i className="ti ti-check sp-check-tick"></i>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Generate button */}
              <button
                className="sp-btn-generate"
                onClick={handleGenerate}
                disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
              >
                <i className={`ti ${generating ? "ti-loader-2 sp-spin" : "ti-sparkles"}`}></i>
                {generating ? "AI is writing your posts…" : "Generate Posts with AI"}
              </button>

              {/* ── Post editors + Publish (appear after generation) ── */}
              {hasPosts && (
                <>
                  <div style={{
                    height: 1, background: "#1a2840",
                    margin: "28px 0 22px"
                  }}></div>

                  <label className="sp-label" style={{ marginBottom: 14 }}>
                    Review &amp; Edit — then Publish
                  </label>

                  <div className="sp-editors">
                    {selectedPlatforms.map(pid => {
                      const platform = LIVE_PLATFORMS.find(p => p.id === pid);
                      if (!platform || !posts[pid]) return null;
                      return (
                        <div key={pid} className="sp-editor">
                          <div className="sp-editor-head">
                            <div className="sp-editor-plat">
                              <i className={platform.icon} style={{ color: platform.color, fontSize: 16 }}></i>
                              {platform.label}
                              <span className="sp-editor-meta">· {posts[pid].length} chars</span>
                            </div>
                            <span className="sp-editor-hint">{platform.hint}</span>
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
                    <div className={`sp-result ${publishResult.success ? "ok" : "fail"}`}
                      style={{ marginTop: 16 }}>
                      <div
                        className="sp-result-title"
                        style={{ color: publishResult.success ? "#34c759" : "#e05a50" }}
                      >
                        <i className={`ti ${publishResult.success ? "ti-circle-check-filled" : "ti-circle-x"}`}></i>
                        {publishResult.success ? "Published successfully!" : "Some platforms failed"}
                      </div>
                      {publishResult.results?.map((r, i) => (
                        <div key={i} className="sp-result-row"
                          style={{ color: r.success ? "#34c759" : "#e05a50" }}>
                          <i className={`ti ${r.success ? "ti-check" : "ti-x"}`}></i>
                          <strong>{r.platform}:</strong>&nbsp;{r.message}
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
                </>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
