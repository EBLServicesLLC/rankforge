/**
 * SocialPublisherPage.jsx
 * Rendered inline inside DashboardShell when activeTab === 'social-pub'
 * Single scrollable page — dark pro theme matching rankforge3
 *
 * Layout (top → bottom):
 *   Stats bar
 *   Section 1: Connect Accounts (live + coming soon greyed out)
 *   Section 2: Write & Post
 *     AI Model selector
 *     Business Name + Post Type (expanded)
 *     Keywords
 *     Topic textarea
 *     Publish To checkboxes
 *     Generate button
 *     → Post editors + Publish (appear after generation)
 *   Section 3: Post History  (placeholder)
 *   Section 4: Setup Guide   (collapsible)
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://ybhpbpahhywiokhqpldj.supabase.co'

const LIVE_PLATFORMS = [
  {
    id: 'facebook', label: 'Facebook',
    icon: 'ti ti-brand-facebook', color: '#1877F2',
    tokenKey: 'fb_token', pageIdKey: 'fb_page_id',
    authEndpoint: '/functions/v1/social-auth-facebook',
    hint: 'Friendly & conversational · best under 280 chars',
  },
  {
    id: 'linkedin', label: 'LinkedIn',
    icon: 'ti ti-brand-linkedin', color: '#0A66C2',
    tokenKey: 'linkedin_token', pageIdKey: null,
    authEndpoint: '/functions/v1/social-auth-linkedin',
    hint: 'Professional & insightful · best under 1,300 chars',
  },
]

const COMING_SOON_PLATFORMS = [
  { id: 'instagram', label: 'Instagram',       icon: 'ti ti-brand-instagram', color: '#E1306C' },
  { id: 'x',         label: 'X / Twitter',     icon: 'ti ti-brand-x',         color: '#94a3b8' },
  { id: 'gbp',       label: 'Google Business', icon: 'ti ti-brand-google',    color: '#4285F4' },
  { id: 'pinterest', label: 'Pinterest',        icon: 'ti ti-brand-pinterest', color: '#E60023' },
]

const AI_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)' },
  { value: 'gpt-4o',                   label: 'GPT-4o (OpenAI)' },
  { value: 'gpt-4o-mini',              label: 'GPT-4o Mini (OpenAI, Fast)' },
  { value: 'gemini-1.5-pro',           label: 'Gemini 1.5 Pro (Google)' },
  { value: 'gemini-1.5-flash',         label: 'Gemini 1.5 Flash (Google, Fast)' },
]

const POST_TYPES = [
  { value: 'update',      label: 'Business Update' },
  { value: 'offer',       label: 'Special Offer / Promotion' },
  { value: 'tip',         label: 'Expert Tip / Educational' },
  { value: 'review',      label: 'Customer Review Spotlight' },
  { value: 'event',       label: 'Event / Announcement' },
  { value: 'service',     label: 'Service Spotlight' },
  { value: 'seasonal',    label: 'Seasonal / Holiday' },
  { value: 'behind',      label: 'Behind the Scenes' },
  { value: 'team',        label: 'Team Spotlight' },
  { value: 'faq',         label: 'FAQ Post' },
  { value: 'testimonial', label: 'Testimonial Request' },
  { value: 'launch',      label: 'Product / Service Launch' },
  { value: 'community',   label: 'Community Involvement' },
  { value: 'news',        label: 'Industry News' },
  { value: 'job',         label: 'Job Opening' },
  { value: 'beforeafter', label: 'Before & After' },
  { value: 'casestudy',   label: 'Case Study' },
  { value: 'thankyou',    label: 'Thank You Post' },
]

function getHeaders(session) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    apikey: session.access_token,
  }
}

export default function SocialPublisherPage({ session }) {
  // ── Connection state ──────────────────────────────────────────────────────────
  const [connections, setConnections]         = useState({})
  const [loadingConns, setLoadingConns]       = useState(true)
  const [connecting, setConnecting]           = useState(null)
  const [stats, setStats]                     = useState({ sent: 0, connected: 0, scheduled: 0, failed: 0 })

  // ── Wizard state ──────────────────────────────────────────────────────────────
  const [aiModel, setAiModel]                 = useState(AI_MODELS[0].value)
  const [businessName, setBusinessName]       = useState('')
  const [postType, setPostType]               = useState('update')
  const [keywords, setKeywords]               = useState('')
  const [topic, setTopic]                     = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [generating, setGenerating]           = useState(false)
  const [posts, setPosts]                     = useState({})
  const [publishing, setPublishing]           = useState(false)
  const [publishResult, setPublishResult]     = useState(null)

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [error, setError]                     = useState(null)
  const [successMsg, setSuccessMsg]           = useState(null)
  const [setupOpen, setSetupOpen]             = useState(false)
  const [postHistory]                         = useState([]) // placeholder

  // ── Load settings ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    async function load() {
      setLoadingConns(true)
      try {
        const { data } = await supabase
          .from('settings')
          .select('fb_token, fb_page_id, linkedin_token, agency_name')
          .eq('user_id', session.user.id)
          .single()
        const s = data || {}
        const conns = { facebook: !!s.fb_token, linkedin: !!s.linkedin_token }
        setConnections(conns)
        if (s.agency_name) setBusinessName(s.agency_name)
        setSelectedPlatforms(
          Object.entries(conns).filter(([, v]) => v).map(([k]) => k)
        )
        setStats(prev => ({ ...prev, connected: Object.values(conns).filter(Boolean).length }))
      } catch {
        setError('Failed to load settings.')
      } finally {
        setLoadingConns(false)
      }
    }
    load()
  }, [session])

  // ── OAuth popup message listener ──────────────────────────────────────────────
  useEffect(() => {
    function handleMsg(event) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'SESSION_TOKEN_REQUEST') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          event.source?.postMessage(
            { type: 'SESSION_TOKEN_RESPONSE', accessToken: session?.access_token || null },
            window.location.origin
          )
        })
        return
      }
      if (event.data?.type !== 'SOCIAL_AUTH_COMPLETE') return
      const { platform, success, token, pageId, error: authError } = event.data
      if (!success) {
        setError(`${platform} connection failed: ${authError || 'Unknown error'}`)
        setConnecting(null)
        return
      }
      saveToken(platform, token, pageId)
    }
    window.addEventListener('message', handleMsg)
    return () => window.removeEventListener('message', handleMsg)
  }, [session])

  // ── Connect ───────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async (platformId) => {
    if (!session) return
    setConnecting(platformId)
    setError(null)
    const platform = LIVE_PLATFORMS.find(p => p.id === platformId)
    try {
      const res = await fetch(
        `${SUPABASE_URL}${platform.authEndpoint}?action=get_url&redirect_uri=${encodeURIComponent(window.location.origin + '/social/callback')}`,
        { headers: getHeaders(session) }
      )
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to get auth URL')
      const { url } = await res.json()
      const popup = window.open(url, `${platformId}_oauth`, 'width=600,height=700,scrollbars=yes')
      if (!popup) throw new Error('Popup blocked — please allow popups for this site.')
      const poll = setInterval(async () => {
        if (popup.closed) {
          clearInterval(poll)
          setConnecting(null)
          await refreshConnections()
        }
      }, 500)
    } catch (err) {
      setError(err.message)
      setConnecting(null)
    }
  }, [session])

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async (platformId) => {
    if (!session) return
    const platform = LIVE_PLATFORMS.find(p => p.id === platformId)
    const update = { [platform.tokenKey]: null }
    if (platform.pageIdKey) update[platform.pageIdKey] = null
    await supabase.from('settings').update(update).eq('user_id', session.user.id)
    setConnections(prev => ({ ...prev, [platformId]: false }))
    setSelectedPlatforms(prev => prev.filter(p => p !== platformId))
    setStats(prev => ({ ...prev, connected: prev.connected - 1 }))
  }, [session])

  // ── Save token ────────────────────────────────────────────────────────────────
  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return
    const platform = LIVE_PLATFORMS.find(p => p.id === platformId)
    const update = { [platform.tokenKey]: token }
    if (platform.pageIdKey && pageId) update[platform.pageIdKey] = pageId
    await supabase.from('settings').upsert(
      { user_id: session.user.id, ...update },
      { onConflict: 'user_id' }
    )
    setConnections(prev => ({ ...prev, [platformId]: true }))
    setSelectedPlatforms(prev => prev.includes(platformId) ? prev : [...prev, platformId])
    setConnecting(null)
    setStats(prev => ({ ...prev, connected: prev.connected + 1 }))
    setSuccessMsg(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} connected!`)
    setTimeout(() => setSuccessMsg(null), 4000)
  }, [session])

  // ── Refresh connections ───────────────────────────────────────────────────────
  const refreshConnections = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('settings').select('fb_token, linkedin_token')
      .eq('user_id', session.user.id).single()
    if (data) {
      const conns = { facebook: !!data.fb_token, linkedin: !!data.linkedin_token }
      setConnections(conns)
      setSelectedPlatforms(Object.entries(conns).filter(([, v]) => v).map(([k]) => k))
      setStats(prev => ({ ...prev, connected: Object.values(conns).filter(Boolean).length }))
    }
  }, [session])

  // ── Generate ──────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Please describe what you want to post about.'); return }
    if (selectedPlatforms.length === 0) { setError('Select at least one connected platform.'); return }
    setGenerating(true)
    setError(null)
    setPublishResult(null)
    setPosts({})
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method: 'POST',
        headers: getHeaders(session),
        body: JSON.stringify({
          action: 'generate',
          topic, businessName, postType, keywords,
          platforms: selectedPlatforms,
          model: aiModel,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')
      setPosts(data.posts)
    } catch (err) {
      setError(`AI generation failed: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }, [topic, businessName, postType, keywords, selectedPlatforms, session, aiModel])

  // ── Publish ───────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!session || selectedPlatforms.length === 0) return
    setPublishing(true)
    setPublishResult(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method: 'POST',
        headers: getHeaders(session),
        body: JSON.stringify({ action: 'publish', posts, platforms: selectedPlatforms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      setPublishResult({ success: data.allSucceeded, results: data.results })
      if (data.allSucceeded) {
        setTopic('')
        setPosts({})
        setStats(prev => ({ ...prev, sent: prev.sent + selectedPlatforms.length }))
      }
    } catch (err) {
      setPublishResult({ success: false, results: [{ platform: 'All', success: false, message: err.message }] })
    } finally {
      setPublishing(false)
    }
  }, [session, selectedPlatforms, posts])

  const connectedPlatforms = LIVE_PLATFORMS.filter(p => connections[p.id])
  const hasPosts = Object.keys(posts).length > 0

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');

        @keyframes sp-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes sp-fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sp-slidedown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

        .sp-wrap { background:#060c18; min-height:100%; font-family:'Segoe UI',system-ui,sans-serif; color:#c8d8f0; -webkit-font-smoothing:antialiased; }

        /* ── STATS BAR ── */
        .sp-stats { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid #0f1e35; }
        .sp-stat { padding:16px 20px; border-right:1px solid #0f1e35; }
        .sp-stat:last-child { border-right:none; }
        .sp-stat-val { font-size:28px; font-weight:800; letter-spacing:-.5px; line-height:1; margin-bottom:4px; }
        .sp-stat-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#2a4060; }

        /* ── SECTION ── */
        .sp-section { padding:28px 32px; border-bottom:1px solid #0f1e35; }
        .sp-section:last-child { border-bottom:none; }
        .sp-section-head { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
        .sp-section-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .sp-section-title { font-size:13px; font-weight:700; color:#e2e8f0; letter-spacing:-.1px; }
        .sp-section-sub { font-size:12px; color:#2a4060; margin-top:2px; }

        /* ── PLATFORM ROWS ── */
        .sp-plat-list { display:flex; flex-direction:column; gap:0; border:1px solid #162035; border-radius:12px; overflow:hidden; }
        .sp-plat-row { display:flex; align-items:center; padding:14px 18px; gap:14px; border-bottom:1px solid #0e1a2e; background:#0a1628; transition:background .12s; }
        .sp-plat-row:last-child { border-bottom:none; }
        .sp-plat-row:hover { background:#0c1c30; }
        .sp-plat-avatar { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:20px; color:#fff; flex-shrink:0; }
        .sp-plat-name { font-size:13px; font-weight:600; color:#e2e8f0; }
        .sp-plat-status { font-size:11px; margin-top:3px; display:flex; align-items:center; gap:4px; font-weight:500; color:#2a4060; }
        .sp-plat-status.on { color:#34c759; }
        .sp-plat-soon { margin-left:auto; background:#080f1e; border:1px solid #162035; color:#1e3050; font-size:9px; font-weight:700; padding:3px 8px; border-radius:980px; letter-spacing:.3px; text-transform:uppercase; flex-shrink:0; }

        /* ── BUTTONS ── */
        .sp-btn { display:inline-flex; align-items:center; gap:6px; font-family:inherit; font-size:12px; font-weight:600; border-radius:7px; cursor:pointer; padding:7px 14px; border:none; transition:all .15s; white-space:nowrap; letter-spacing:-.1px; }
        .sp-btn:hover:not(:disabled) { filter:brightness(1.12); }
        .sp-btn:active:not(:disabled) { transform:scale(.97); }
        .sp-btn:disabled { opacity:.38; cursor:not-allowed; }
        .sp-btn-connect { background:linear-gradient(135deg,#1a5fd4,#0e3fa8); color:#fff; box-shadow:0 2px 8px rgba(26,95,212,.3); }
        .sp-btn-disconnect { background:transparent; border:1px solid #1a2840; color:#3a5070; }
        .sp-btn-disconnect:hover:not(:disabled) { filter:none; border-color:#c0392b; color:#e74c3c; background:rgba(231,76,60,.06); }
        .sp-btn-refresh { background:none; border:none; cursor:pointer; color:#2a4060; font-size:17px; display:flex; padding:4px; transition:color .15s; margin-left:auto; }
        .sp-btn-refresh:hover { color:#4a90d9; }

        /* ── FORM ── */
        .sp-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }
        .sp-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:18px; }
        .sp-field { margin-bottom:18px; }
        .sp-field:last-of-type { margin-bottom:0; }
        .sp-label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#2a4060; margin-bottom:7px; }
        .sp-label-note { text-transform:none; letter-spacing:0; font-weight:400; color:#1e3050; margin-left:6px; font-size:10px; }
        .sp-input { width:100%; background:#080f1e; border:1px solid #162035; border-radius:8px; color:#c8d8f0; font-size:13px; font-family:inherit; padding:10px 12px; transition:border-color .15s,box-shadow .15s; -webkit-appearance:none; appearance:none; }
        .sp-input:focus { outline:none; border-color:#1a5fd4; box-shadow:0 0 0 3px rgba(26,95,212,.12); }
        .sp-input::placeholder { color:#162035; }
        textarea.sp-input { resize:vertical; line-height:1.65; min-height:90px; }
        select.sp-input { cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%232a4060' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }

        /* ── PLATFORM CHECKBOXES ── */
        .sp-checks { display:flex; flex-wrap:wrap; gap:10px; }
        .sp-check { flex:1; min-width:140px; display:flex; align-items:center; gap:9px; padding:11px 14px; background:#080f1e; border:1.5px solid #162035; border-radius:9px; cursor:pointer; transition:all .15s; font-size:13px; font-weight:600; color:#2a4060; user-select:none; }
        .sp-check:hover { border-color:#1a3560; color:#6a90b8; }
        .sp-check.on { border-color:#1a5fd4; background:rgba(26,95,212,.09); color:#4a90d9; }
        .sp-check input { display:none; }
        .sp-check-tick { margin-left:auto; font-size:12px; color:#1a5fd4; display:none; }
        .sp-check.on .sp-check-tick { display:block; }
        .sp-no-conn { display:flex; align-items:center; gap:10px; background:#080f1e; border:1px solid #162035; border-radius:8px; padding:12px 14px; font-size:12px; color:#2a4060; }
        .sp-no-conn i { color:#f59e0b; font-size:15px; flex-shrink:0; }

        /* ── GENERATE BUTTON ── */
        .sp-btn-generate { width:100%; display:flex; align-items:center; justify-content:center; gap:9px; background:linear-gradient(135deg,#1a5fd4,#5856d6); color:#fff; font-family:inherit; font-size:14px; font-weight:700; padding:14px 0; border-radius:10px; border:none; cursor:pointer; transition:all .15s; box-shadow:0 4px 18px rgba(26,95,212,.35); margin-top:4px; }
        .sp-btn-generate:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); box-shadow:0 6px 22px rgba(26,95,212,.45); }
        .sp-btn-generate:active:not(:disabled) { transform:translateY(0); }
        .sp-btn-generate:disabled { opacity:.35; cursor:not-allowed; box-shadow:none; transform:none; }

        /* ── POST EDITORS ── */
        .sp-editor { border:1px solid #162035; border-radius:10px; overflow:hidden; margin-bottom:12px; transition:border-color .15s; animation:sp-fadein .25s ease both; }
        .sp-editor:last-child { margin-bottom:0; }
        .sp-editor:focus-within { border-color:#1a5fd4; }
        .sp-editor-head { display:flex; align-items:center; justify-content:space-between; padding:9px 13px; background:#080f1e; border-bottom:1px solid #162035; }
        .sp-editor-plat { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:#c8d8f0; }
        .sp-editor-meta { font-size:10px; color:#2a4060; font-weight:400; }
        .sp-editor-hint { font-size:10px; color:#1e3050; }
        .sp-editor textarea { width:100%; display:block; background:#0a1628; border:none; color:#a8c0e0; font-size:13px; font-family:inherit; padding:13px; resize:vertical; line-height:1.7; min-height:100px; }
        .sp-editor textarea:focus { outline:none; }

        /* ── PUBLISH ROW ── */
        .sp-publish-row { display:flex; gap:10px; margin-top:16px; }
        .sp-btn-regen { display:inline-flex; align-items:center; gap:6px; font-family:inherit; font-size:13px; font-weight:600; background:transparent; border:1px solid #162035; color:#2a4060; border-radius:9px; cursor:pointer; padding:12px 18px; transition:all .15s; white-space:nowrap; }
        .sp-btn-regen:hover { border-color:#1a3560; color:#6a90b8; }
        .sp-btn-publish { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg,#1a9b4e,#16803e); color:#fff; font-family:inherit; font-size:14px; font-weight:700; padding:12px 0; border-radius:9px; border:none; cursor:pointer; transition:all .15s; box-shadow:0 4px 14px rgba(26,155,78,.3); }
        .sp-btn-publish:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
        .sp-btn-publish:active:not(:disabled) { transform:translateY(0); }
        .sp-btn-publish:disabled { opacity:.35; cursor:not-allowed; box-shadow:none; transform:none; }

        /* ── RESULT ── */
        .sp-result { border-radius:9px; padding:13px 15px; margin-bottom:14px; font-size:12px; animation:sp-slidedown .2s ease both; }
        .sp-result.ok { background:rgba(52,199,89,.07); border:1px solid rgba(52,199,89,.2); }
        .sp-result.fail { background:rgba(231,76,60,.07); border:1px solid rgba(231,76,60,.2); }
        .sp-result-title { font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px; margin-bottom:7px; }
        .sp-result-row { display:flex; align-items:center; gap:5px; margin-bottom:3px; }

        /* ── BANNER ── */
        .sp-banner { padding:10px 32px; font-size:13px; display:flex; align-items:center; gap:10px; animation:sp-slidedown .2s ease both; }
        .sp-banner.error { background:rgba(231,76,60,.07); border-bottom:1px solid rgba(231,76,60,.15); color:#e05a50; }
        .sp-banner.success { background:rgba(52,199,89,.07); border-bottom:1px solid rgba(52,199,89,.15); color:#34c759; }
        .sp-banner-close { background:none; border:none; cursor:pointer; font-size:16px; opacity:.6; display:flex; padding:0; color:inherit; margin-left:auto; transition:opacity .15s; }
        .sp-banner-close:hover { opacity:1; }

        /* ── HISTORY ── */
        .sp-history-empty { text-align:center; padding:32px; color:#1e3050; font-size:13px; }
        .sp-history-empty i { font-size:32px; display:block; margin-bottom:10px; color:#162035; }

        /* ── SETUP GUIDE ── */
        .sp-setup-toggle { width:100%; display:flex; align-items:center; justify-content:space-between; background:none; border:none; cursor:pointer; color:#3a5070; font-family:inherit; font-size:13px; font-weight:600; padding:0; transition:color .15s; }
        .sp-setup-toggle:hover { color:#6a90b8; }
        .sp-setup-body { margin-top:16px; font-size:13px; color:#3a5070; line-height:1.7; }
        .sp-setup-body a { color:#4a90d9; text-decoration:none; }
        .sp-setup-body a:hover { text-decoration:underline; }
        .sp-setup-step { display:flex; gap:10px; margin-bottom:10px; align-items:flex-start; }
        .sp-setup-num { width:22px; height:22px; border-radius:50%; background:rgba(26,95,212,.15); border:1px solid rgba(26,95,212,.3); color:#4a90d9; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }

        /* ── SPINNER ── */
        .sp-spin { animation:sp-spin .8s linear infinite; display:inline-block; }

        /* ── DIVIDER ── */
        .sp-sep { height:1px; background:#0f1e35; margin:24px 0; }

        @media(max-width:640px) {
          .sp-stats { grid-template-columns:1fr 1fr; }
          .sp-grid2, .sp-grid3 { grid-template-columns:1fr; }
          .sp-section { padding:20px 16px; }
        }
      `}</style>

      <div className="sp-wrap">

        {/* ── BANNERS ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="sp-banner error">
            <i className="ti ti-alert-circle"></i> {error}
            <button className="sp-banner-close" onClick={() => setError(null)}><i className="ti ti-x"></i></button>
          </div>
        )}
        {successMsg && (
          <div className="sp-banner success">
            <i className="ti ti-circle-check-filled"></i> {successMsg}
            <button className="sp-banner-close" onClick={() => setSuccessMsg(null)}><i className="ti ti-x"></i></button>
          </div>
        )}

        {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
        <div className="sp-stats">
          {[
            { val: stats.sent,      label: 'Posts Sent',          color: '#4a90d9' },
            { val: stats.connected, label: 'Platforms Connected',  color: '#34c759' },
            { val: stats.scheduled, label: 'Scheduled',            color: '#f59e0b' },
            { val: stats.failed,    label: 'Failed',               color: '#e74c3c' },
          ].map(s => (
            <div key={s.label} className="sp-stat">
              <div className="sp-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="sp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1 — CONNECT ACCOUNTS
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="sp-section">
          <div className="sp-section-head">
            <div className="sp-section-icon" style={{ background: 'rgba(26,95,212,.12)' }}>
              <i className="ti ti-plug-connected" style={{ color: '#4a90d9' }}></i>
            </div>
            <div>
              <div className="sp-section-title">Connect Accounts</div>
              <div className="sp-section-sub">Connect once — your tokens are stored securely in your account</div>
            </div>
            <button className="sp-btn-refresh" onClick={refreshConnections} title="Refresh status">
              <i className="ti ti-refresh"></i>
            </button>
          </div>

          <div className="sp-plat-list">
            {/* Live platforms */}
            {loadingConns ? (
              <div className="sp-plat-row">
                <i className="ti ti-loader-2 sp-spin" style={{ color: '#2a4060', fontSize: 16 }}></i>
                <span style={{ fontSize: 13, color: '#2a4060' }}>Checking connections…</span>
              </div>
            ) : (
              LIVE_PLATFORMS.map(platform => {
                const connected = connections[platform.id]
                const isConnecting = connecting === platform.id
                return (
                  <div key={platform.id} className="sp-plat-row">
                    <div className="sp-plat-avatar" style={{ background: platform.color }}>
                      <i className={platform.icon}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sp-plat-name">{platform.label}</div>
                      <div className={`sp-plat-status ${connected ? 'on' : ''}`}>
                        <i className={`ti ${connected ? 'ti-circle-check-filled' : 'ti-circle-x'}`}></i>
                        {connected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                    {connected ? (
                      <button className="sp-btn sp-btn-disconnect" onClick={() => handleDisconnect(platform.id)}>
                        <i className="ti ti-unlink"></i> Disconnect
                      </button>
                    ) : (
                      <button className="sp-btn sp-btn-connect" onClick={() => handleConnect(platform.id)} disabled={!!isConnecting}>
                        <i className={`ti ${isConnecting ? 'ti-loader-2 sp-spin' : 'ti-link'}`}></i>
                        {isConnecting ? 'Connecting…' : `Connect ${platform.label}`}
                      </button>
                    )}
                  </div>
                )
              })
            )}
            {/* Coming soon — greyed out, same rows */}
            {COMING_SOON_PLATFORMS.map(platform => (
              <div key={platform.id} className="sp-plat-row" style={{ opacity: .38 }}>
                <div className="sp-plat-avatar" style={{ background: platform.color }}>
                  <i className={platform.icon}></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sp-plat-name" style={{ color: '#2a4060' }}>{platform.label}</div>
                  <div className="sp-plat-status">
                    <i className="ti ti-clock"></i> Coming soon
                  </div>
                </div>
                <span className="sp-plat-soon">Soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2 — WRITE & POST
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="sp-section">
          <div className="sp-section-head">
            <div className="sp-section-icon" style={{ background: 'rgba(88,86,214,.12)' }}>
              <i className="ti ti-sparkles" style={{ color: '#7c7ae8' }}></i>
            </div>
            <div>
              <div className="sp-section-title">Write &amp; Post</div>
              <div className="sp-section-sub">Describe your message — AI writes platform-optimised posts for each channel</div>
            </div>
          </div>

          {/* AI Model + Post Type + Business Name */}
          <div className="sp-grid3">
            <div>
              <label className="sp-label">AI Model</label>
              <select className="sp-input" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="sp-label">Business Name</label>
              <input className="sp-input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Crystal Coast HR" />
            </div>
            <div>
              <label className="sp-label">Post Type</label>
              <select className="sp-input" value={postType} onChange={e => setPostType(e.target.value)}>
                {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Keywords */}
          <div className="sp-field">
            <label className="sp-label">
              Keywords to Use
              <span className="sp-label-note">Optional — AI will weave these into the posts</span>
            </label>
            <input
              className="sp-input"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. same-day service, licensed plumber, Austin TX, free estimate"
            />
          </div>

          {/* Topic */}
          <div className="sp-field">
            <label className="sp-label">
              What do you want to post about?
              <span className="sp-label-note">Plain English — AI handles the rest</span>
            </label>
            <textarea
              className="sp-input"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. We just added same-day AC repair. Summer special — 10% off for new customers this month. Mention the coupon code SUMMER10."
              rows={4}
            />
          </div>

          {/* Publish To */}
          <div className="sp-field">
            <label className="sp-label">Publish To</label>
            {connectedPlatforms.length === 0 ? (
              <div className="sp-no-conn">
                <i className="ti ti-alert-triangle"></i>
                No accounts connected yet — connect Facebook or LinkedIn above first.
              </div>
            ) : (
              <div className="sp-checks">
                {connectedPlatforms.map(platform => {
                  const selected = selectedPlatforms.includes(platform.id)
                  return (
                    <label
                      key={platform.id}
                      className={`sp-check ${selected ? 'on' : ''}`}
                      onClick={() => setSelectedPlatforms(prev =>
                        selected ? prev.filter(p => p !== platform.id) : [...prev, platform.id]
                      )}
                    >
                      <input type="checkbox" readOnly checked={selected} />
                      <i className={platform.icon} style={{ color: platform.color, fontSize: 17 }}></i>
                      {platform.label}
                      <i className="ti ti-check sp-check-tick"></i>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Generate */}
          <button
            className="sp-btn-generate"
            onClick={handleGenerate}
            disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
          >
            <i className={`ti ${generating ? 'ti-loader-2 sp-spin' : 'ti-sparkles'}`}></i>
            {generating ? 'AI is writing your posts…' : 'Generate Posts with AI'}
          </button>

          {/* ── Post editors + Publish (appear after generation) ── */}
          {hasPosts && (
            <>
              <div className="sp-sep"></div>
              <label className="sp-label" style={{ marginBottom: 14 }}>
                Review &amp; Edit — then Publish
              </label>
              {selectedPlatforms.map(pid => {
                const platform = LIVE_PLATFORMS.find(p => p.id === pid)
                if (!platform || !posts[pid]) return null
                return (
                  <div key={pid} className="sp-editor">
                    <div className="sp-editor-head">
                      <div className="sp-editor-plat">
                        <i className={platform.icon} style={{ color: platform.color, fontSize: 15 }}></i>
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
                )
              })}

              {publishResult && (
                <div className={`sp-result ${publishResult.success ? 'ok' : 'fail'}`} style={{ marginTop: 14 }}>
                  <div className="sp-result-title" style={{ color: publishResult.success ? '#34c759' : '#e05a50' }}>
                    <i className={`ti ${publishResult.success ? 'ti-circle-check-filled' : 'ti-circle-x'}`}></i>
                    {publishResult.success ? 'Published successfully!' : 'Some platforms failed'}
                  </div>
                  {publishResult.results?.map((r, i) => (
                    <div key={i} className="sp-result-row" style={{ color: r.success ? '#34c759' : '#e05a50' }}>
                      <i className={`ti ${r.success ? 'ti-check' : 'ti-x'}`}></i>
                      <strong>{r.platform}:</strong>&nbsp;{r.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="sp-publish-row">
                <button className="sp-btn-regen" onClick={() => { setPosts({}); setPublishResult(null) }}>
                  <i className="ti ti-refresh"></i> Regenerate
                </button>
                <button
                  className="sp-btn-publish"
                  onClick={handlePublish}
                  disabled={publishing || selectedPlatforms.length === 0}
                >
                  <i className={`ti ${publishing ? 'ti-loader-2 sp-spin' : 'ti-send'}`}></i>
                  {publishing
                    ? 'Publishing…'
                    : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3 — POST HISTORY
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="sp-section">
          <div className="sp-section-head">
            <div className="sp-section-icon" style={{ background: 'rgba(245,158,11,.1)' }}>
              <i className="ti ti-history" style={{ color: '#f59e0b' }}></i>
            </div>
            <div>
              <div className="sp-section-title">Post History</div>
              <div className="sp-section-sub">Your recently published posts</div>
            </div>
          </div>
          {postHistory.length === 0 ? (
            <div className="sp-history-empty">
              <i className="ti ti-clock-off"></i>
              No posts published yet. Generate and publish your first post above.
            </div>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 4 — SETUP GUIDE (collapsible)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="sp-section">
          <button className="sp-setup-toggle" onClick={() => setSetupOpen(o => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="sp-section-icon" style={{ background: 'rgba(52,199,89,.1)' }}>
                <i className="ti ti-book" style={{ color: '#34c759' }}></i>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="sp-section-title">Setup Guide</div>
                <div className="sp-section-sub">How to connect and start publishing</div>
              </div>
            </div>
            <i className={`ti ${setupOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16 }}></i>
          </button>

          {setupOpen && (
            <div className="sp-setup-body" style={{ animation: 'sp-fadein .2s ease both' }}>
              <div style={{ marginTop: 4 }}>
                <div className="sp-setup-step">
                  <div className="sp-setup-num">1</div>
                  <div><strong style={{ color: '#c8d8f0' }}>Set up your business pages first.</strong> You need a <a href="https://www.facebook.com/pages/create" target="_blank" rel="noreferrer">Facebook Business Page</a> and a <a href="https://www.linkedin.com/company/setup" target="_blank" rel="noreferrer">LinkedIn Company Page</a> before connecting.</div>
                </div>
                <div className="sp-setup-step">
                  <div className="sp-setup-num">2</div>
                  <div><strong style={{ color: '#c8d8f0' }}>Connect your accounts.</strong> Click "Connect Facebook" or "Connect LinkedIn" above. A popup will open — log in and authorise RankForged AI to post on your behalf.</div>
                </div>
                <div className="sp-setup-step">
                  <div className="sp-setup-num">3</div>
                  <div><strong style={{ color: '#c8d8f0' }}>Choose your AI model.</strong> Claude Sonnet is recommended for best quality. Haiku is faster and cheaper. GPT-4o and Gemini are available if you have those API keys set.</div>
                </div>
                <div className="sp-setup-step">
                  <div className="sp-setup-num">4</div>
                  <div><strong style={{ color: '#c8d8f0' }}>Describe your post.</strong> Write in plain English — the AI will generate platform-optimised versions for each channel. Add keywords to make sure they appear in the posts.</div>
                </div>
                <div className="sp-setup-step">
                  <div className="sp-setup-num">5</div>
                  <div><strong style={{ color: '#c8d8f0' }}>Review and publish.</strong> Edit the AI-generated posts if needed, then click Publish. Posts go live immediately.</div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  )
}
