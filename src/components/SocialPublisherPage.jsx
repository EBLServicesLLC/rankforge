/**
 * SocialPublisherPage.jsx
 * Rendered inline inside DashboardShell when activeTab === 'social-pub'
 *
 * LAYOUT:
 * ┌─────────────────────────────────────────────────────────┐
 * │  Stats bar (4 numbers)                                  │
 * ├────────────┬────────────────────────────────────────────┤
 * │ Connect    │  Write & Post                              │
 * │ Accounts   │  AI Model · Biz Name · Post Type           │
 * │ (1/4)      │  Keywords · Topic · Publish To             │
 * │            │  Generate → editors → Publish              │
 * ├────────────┴────────────────────────────────────────────┤
 * │ Post History (left 1/2) │ Publish btn + Setup (right)  │
 * └─────────────────────────────────────────────────────────┘
 *
 * Colors match rankforge3 exactly:
 *   Page bg:   #060d1a
 *   Card bg:   #0d1f3c
 *   Border:    #0f2040  /  #1a3560
 *   Text:      #e2e8f0  /  #c8d8f0
 *   Muted:     #4a6080
 *   Accent:    #3b82f6
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://ybhpbpahhywiokhqpldj.supabase.co'

// ── Platform definitions ──────────────────────────────────────────────────────
const LIVE_PLATFORMS = [
  { id:'facebook', label:'Facebook',        icon:'ti ti-brand-facebook',  color:'#1877F2', tokenKey:'fb_token',       pageIdKey:'fb_page_id',  authEndpoint:'/functions/v1/social-auth-facebook', hint:'Best under 280 chars' },
  { id:'linkedin', label:'LinkedIn',        icon:'ti ti-brand-linkedin',  color:'#0A66C2', tokenKey:'linkedin_token', pageIdKey:null,          authEndpoint:'/functions/v1/social-auth-linkedin', hint:'Best under 1,300 chars' },
  { id:'gmb',      label:'Google Business', icon:'ti ti-brand-google',    color:'#4285F4', tokenKey:'google_key',     pageIdKey:'gmb_location', authEndpoint:'/functions/v1/social-auth-gmb',      hint:'Updates, offers, events' },
]

const COMING_SOON = [
  { id:'instagram', label:'Instagram',   icon:'ti ti-brand-instagram', color:'#E1306C' },
  { id:'x',         label:'X / Twitter', icon:'ti ti-brand-x',         color:'#94a3b8' },
  { id:'pinterest', label:'Pinterest',   icon:'ti ti-brand-pinterest',  color:'#E60023' },
]

// ── AI models ─────────────────────────────────────────────────────────────────
const AI_MODELS = [
  { value:'claude-sonnet-4-20250514',  label:'Claude Sonnet 4 (Recommended)' },
  { value:'claude-haiku-4-5-20251001', label:'Claude Haiku 4.5 (Fast)' },
  { value:'gpt-4o',                    label:'GPT-4o (OpenAI)' },
  { value:'gpt-4o-mini',               label:'GPT-4o Mini (Fast)' },
  { value:'gemini-1.5-pro',            label:'Gemini 1.5 Pro (Google)' },
  { value:'gemini-1.5-flash',          label:'Gemini 1.5 Flash (Fast)' },
]

// ── Post types ────────────────────────────────────────────────────────────────
const POST_TYPES = [
  { value:'update',      label:'Business Update' },
  { value:'offer',       label:'Special Offer / Promotion' },
  { value:'tip',         label:'Expert Tip / Educational' },
  { value:'review',      label:'Customer Review Spotlight' },
  { value:'event',       label:'Event / Announcement' },
  { value:'service',     label:'Service Spotlight' },
  { value:'seasonal',    label:'Seasonal / Holiday' },
  { value:'behind',      label:'Behind the Scenes' },
  { value:'team',        label:'Team Spotlight' },
  { value:'faq',         label:'FAQ Post' },
  { value:'testimonial', label:'Testimonial Request' },
  { value:'launch',      label:'Product / Service Launch' },
  { value:'community',   label:'Community Involvement' },
  { value:'news',        label:'Industry News' },
  { value:'job',         label:'Job Opening' },
  { value:'beforeafter', label:'Before & After' },
  { value:'casestudy',   label:'Case Study' },
  { value:'thankyou',    label:'Thank You Post' },
]

function hdrs(session) {
  return { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}`, apikey:session.access_token }
}

// ── Shared style tokens (match rankforge3) ────────────────────────────────────
const T = {
  pageBg:   '#060d1a',
  cardBg:   '#0d1f3c',
  cardBg2:  '#080f1e',
  border:   '#0f2040',
  border2:  '#1a3560',
  text:     '#e2e8f0',
  textSub:  '#c8d8f0',
  muted:    '#4a6080',
  muted2:   '#3a5070',
  accent:   '#3b82f6',
  accentHi: '#60a5fa',
  green:    '#10b981',
  red:      '#f87171',
  yellow:   '#f59e0b',
}

// ── Reusable sub-components ───────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border2}`, borderRadius:10, ...style }}>
      {children}
    </div>
  )
}

function CardHead({ icon, title, sub, right }) {
  return (
    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:28, height:28, borderRadius:7, background:'rgba(59,130,246,.12)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
        <i className={icon} style={{ color:T.accentHi }}></i>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:T.muted, marginBottom:6 }}>{children}</div>
}

function Input({ style, ...props }) {
  return (
    <input style={{ width:'100%', background:T.cardBg2, border:`1px solid ${T.border2}`,
      borderRadius:7, color:T.text, fontSize:13, fontFamily:'inherit',
      padding:'8px 11px', outline:'none', boxSizing:'border-box', ...style }}
      onFocus={e => e.target.style.borderColor = T.accent}
      onBlur={e  => e.target.style.borderColor = T.border2}
      {...props} />
  )
}

function Select({ children, style, ...props }) {
  return (
    <select style={{ width:'100%', background:T.cardBg2, border:`1px solid ${T.border2}`,
      borderRadius:7, color:T.text, fontSize:13, fontFamily:'inherit',
      padding:'8px 28px 8px 11px', outline:'none', cursor:'pointer', boxSizing:'border-box',
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234a6080' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
      backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center',
      appearance:'none', WebkitAppearance:'none', ...style }}
      onFocus={e => e.target.style.borderColor = T.accent}
      onBlur={e  => e.target.style.borderColor = T.border2}
      {...props}>
      {children}
    </select>
  )
}

function Textarea({ style, ...props }) {
  return (
    <textarea style={{ width:'100%', background:T.cardBg2, border:`1px solid ${T.border2}`,
      borderRadius:7, color:T.text, fontSize:13, fontFamily:'inherit',
      padding:'8px 11px', outline:'none', resize:'vertical', lineHeight:1.65,
      boxSizing:'border-box', ...style }}
      onFocus={e => e.target.style.borderColor = T.accent}
      onBlur={e  => e.target.style.borderColor = T.border2}
      {...props} />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SocialPublisherPage({ session }) {
  const [connections, setConnections]         = useState({})
  const [loadingConns, setLoadingConns]       = useState(true)
  const [connecting, setConnecting]           = useState(null)
  const [stats, setStats]                     = useState({ sent:0, connected:0, scheduled:0, failed:0 })

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

  const [error, setError]                     = useState(null)
  const [successMsg, setSuccessMsg]           = useState(null)
  const [setupOpen, setSetupOpen]             = useState(false)
  const [postHistory]                         = useState([])

  // ── Load settings ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    setLoadingConns(true)
    supabase.from('settings')
      .select('fb_token,fb_page_id,linkedin_token,google_key,agency_name')
      .eq('user_id', session.user.id).single()
      .then(({ data }) => {
        const s = data || {}
        const conns = { facebook:!!s.fb_token, linkedin:!!s.linkedin_token, gmb:!!s.google_key }
        setConnections(conns)
        if (s.agency_name) setBusinessName(s.agency_name)
        setSelectedPlatforms(Object.entries(conns).filter(([,v])=>v).map(([k])=>k))
        setStats(p => ({ ...p, connected:Object.values(conns).filter(Boolean).length }))
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoadingConns(false))
  }, [session])

  // ── OAuth popup listener ────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'SESSION_TOKEN_REQUEST') {
        supabase.auth.getSession().then(({ data:{ session } }) =>
          event.source?.postMessage({ type:'SESSION_TOKEN_RESPONSE', accessToken:session?.access_token||null }, window.location.origin)
        )
        return
      }
      if (event.data?.type !== 'SOCIAL_AUTH_COMPLETE') return
      const { platform, success, token, pageId, error:ae } = event.data
      if (!success) { setError(`${platform} failed: ${ae||'Unknown error'}`); setConnecting(null); return }
      saveToken(platform, token, pageId)
    }
    window.addEventListener('message', fn)
    return () => window.removeEventListener('message', fn)
  }, [session])

  // ── Connect ─────────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async (platformId) => {
    if (!session) return
    setConnecting(platformId); setError(null)
    const p = LIVE_PLATFORMS.find(x => x.id === platformId)
    try {
      const res = await fetch(`${SUPABASE_URL}${p.authEndpoint}?action=get_url&redirect_uri=${encodeURIComponent(window.location.origin+'/social/callback')}`, { headers:hdrs(session) })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to get auth URL')
      const { url } = await res.json()
      const popup = window.open(url, `${platformId}_oauth`, 'width=600,height=700,scrollbars=yes')
      if (!popup) throw new Error('Popup blocked — please allow popups.')
      const poll = setInterval(async () => { if (popup.closed) { clearInterval(poll); setConnecting(null); refreshConnections() } }, 500)
    } catch (err) { setError(err.message); setConnecting(null) }
  }, [session])

  // ── Disconnect ──────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async (platformId) => {
    if (!session) return
    const p = LIVE_PLATFORMS.find(x => x.id === platformId)
    const upd = { [p.tokenKey]:null }
    if (p.pageIdKey) upd[p.pageIdKey] = null
    await supabase.from('settings').update(upd).eq('user_id', session.user.id)
    setConnections(prev => ({ ...prev, [platformId]:false }))
    setSelectedPlatforms(prev => prev.filter(x => x !== platformId))
    setStats(p => ({ ...p, connected:Math.max(0, p.connected-1) }))
  }, [session])

  // ── Save token ──────────────────────────────────────────────────────────────
  const saveToken = useCallback(async (platformId, token, pageId) => {
    if (!session) return
    const p = LIVE_PLATFORMS.find(x => x.id === platformId)
    const upd = { [p.tokenKey]:token }
    if (p.pageIdKey && pageId) upd[p.pageIdKey] = pageId
    await supabase.from('settings').upsert({ user_id:session.user.id, ...upd }, { onConflict:'user_id' })
    setConnections(prev => ({ ...prev, [platformId]:true }))
    setSelectedPlatforms(prev => prev.includes(platformId) ? prev : [...prev, platformId])
    setConnecting(null)
    setStats(p => ({ ...p, connected:p.connected+1 }))
    setSuccessMsg(`${platformId.charAt(0).toUpperCase()+platformId.slice(1)} connected!`)
    setTimeout(() => setSuccessMsg(null), 4000)
  }, [session])

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const refreshConnections = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.from('settings').select('fb_token,linkedin_token,google_key').eq('user_id', session.user.id).single()
    if (data) {
      const conns = { facebook:!!data.fb_token, linkedin:!!data.linkedin_token, gmb:!!data.google_key }
      setConnections(conns)
      setSelectedPlatforms(Object.entries(conns).filter(([,v])=>v).map(([k])=>k))
      setStats(p => ({ ...p, connected:Object.values(conns).filter(Boolean).length }))
    }
  }, [session])

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Describe what you want to post about.'); return }
    if (!selectedPlatforms.length) { setError('Select at least one connected platform.'); return }
    setGenerating(true); setError(null); setPublishResult(null); setPosts({})
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method:'POST', headers:hdrs(session),
        body:JSON.stringify({ action:'generate', topic, businessName, postType, keywords, platforms:selectedPlatforms, model:aiModel }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')
      setPosts(data.posts)
    } catch (err) { setError(`AI generation failed: ${err.message}`) }
    finally { setGenerating(false) }
  }, [topic, businessName, postType, keywords, selectedPlatforms, session, aiModel])

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!session || !selectedPlatforms.length) return
    setPublishing(true); setPublishResult(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
        method:'POST', headers:hdrs(session),
        body:JSON.stringify({ action:'publish', posts, platforms:selectedPlatforms }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      setPublishResult({ success:data.allSucceeded, results:data.results })
      if (data.allSucceeded) { setTopic(''); setPosts({}); setStats(p => ({ ...p, sent:p.sent+selectedPlatforms.length })) }
    } catch (err) {
      setPublishResult({ success:false, results:[{ platform:'All', success:false, message:err.message }] })
    }
    finally { setPublishing(false) }
  }, [session, selectedPlatforms, posts])

  const connectedPlatforms = LIVE_PLATFORMS.filter(p => connections[p.id])
  const hasPosts = Object.keys(posts).length > 0

  // ── Common style shortcuts ──────────────────────────────────────────────────
  const field = { marginBottom:14 }
  const row2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        @keyframes sp-spin    { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
        @keyframes sp-fadein  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sp-slidedn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
        .sp-spin { animation:sp-spin .8s linear infinite; display:inline-block; }
        .sp-fadein { animation:sp-fadein .25s ease both; }
        .sp-slidedn { animation:sp-slidedn .2s ease both; }

        /* scrollbar to match rankforge3 */
        .sp-scroll::-webkit-scrollbar { width:6px; }
        .sp-scroll::-webkit-scrollbar-track { background:transparent; }
        .sp-scroll::-webkit-scrollbar-thumb { background:#1a3560; border-radius:3px; }

        /* platform row hover */
        .sp-plat-row { transition:background .12s; }
        .sp-plat-row:hover { background:rgba(59,130,246,.04) !important; }

        /* checkbox platform pill */
        .sp-chk { transition:all .15s; cursor:pointer; }
        .sp-chk:hover { border-color:#1a5fd4 !important; color:#93c5fd !important; }

        /* buttons */
        .sp-btn-primary { transition:all .15s; }
        .sp-btn-primary:hover:not(:disabled) { filter:brightness(1.12); transform:translateY(-1px); }
        .sp-btn-primary:active:not(:disabled) { transform:scale(.97); }
        .sp-btn-primary:disabled { opacity:.35; cursor:not-allowed; transform:none; }

        .sp-btn-ghost { transition:all .15s; }
        .sp-btn-ghost:hover:not(:disabled) { border-color:#1a5fd4 !important; color:#60a5fa !important; }
        .sp-btn-ghost:disabled { opacity:.35; cursor:not-allowed; }

        /* post editor focus */
        .sp-editor:focus-within { border-color:#1a5fd4 !important; }

        /* setup guide toggle */
        .sp-setup-btn { transition:color .15s; }
        .sp-setup-btn:hover { color:#60a5fa !important; }
      `}</style>

      <div style={{ background:T.pageBg, minHeight:'100%', fontFamily:"'Segoe UI',system-ui,sans-serif",
        color:T.text, WebkitFontSmoothing:'antialiased' }}>

        {/* ── BANNERS ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="sp-slidedn" style={{ padding:'10px 20px', background:'rgba(248,113,113,.07)',
            borderBottom:'1px solid rgba(248,113,113,.18)', color:'#fca5a5',
            fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
            <i className="ti ti-alert-circle"></i> {error}
            <button onClick={() => setError(null)} style={{ marginLeft:'auto', background:'none', border:'none',
              color:'#fca5a5', cursor:'pointer', fontSize:16, display:'flex', opacity:.7 }}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}
        {successMsg && (
          <div className="sp-slidedn" style={{ padding:'10px 20px', background:'rgba(16,185,129,.07)',
            borderBottom:'1px solid rgba(16,185,129,.18)', color:'#6ee7b7',
            fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
            <i className="ti ti-circle-check-filled"></i> {successMsg}
            <button onClick={() => setSuccessMsg(null)} style={{ marginLeft:'auto', background:'none', border:'none',
              color:'#6ee7b7', cursor:'pointer', fontSize:16, display:'flex', opacity:.7 }}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        {/* ── STATS BAR ────────────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
          borderBottom:`1px solid ${T.border}`, background:T.cardBg2 }}>
          {[
            { val:stats.sent,      label:'Posts Sent',          color:'#60a5fa' },
            { val:stats.connected, label:'Platforms Connected',  color:'#34d399' },
            { val:stats.scheduled, label:'Scheduled',            color:'#fbbf24' },
            { val:stats.failed,    label:'Failed',               color:'#f87171' },
          ].map((s,i) => (
            <div key={s.label} style={{ padding:'14px 20px',
              borderRight: i < 3 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontSize:26, fontWeight:800, color:s.color, letterSpacing:'-.5px', lineHeight:1, marginBottom:3 }}>{s.val}</div>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:T.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding:'18px 20px' }}>

          {/* ── TOP ROW: Connect (1/4) + Write & Post (3/4) ─────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 3fr', gap:14, marginBottom:14 }}>

            {/* ── LEFT: Connect Accounts ────────────────────────────────── */}
            <Card>
              <CardHead
                icon="ti ti-plug-connected"
                title="Accounts"
                sub="Connect your channels"
                right={
                  <button onClick={refreshConnections} title="Refresh"
                    style={{ background:'none', border:'none', cursor:'pointer', color:T.muted,
                      fontSize:15, display:'flex', padding:2, transition:'color .15s' }}
                    onMouseEnter={e=>e.currentTarget.style.color=T.accentHi}
                    onMouseLeave={e=>e.currentTarget.style.color=T.muted}>
                    <i className="ti ti-refresh"></i>
                  </button>
                }
              />
              <div>
                {/* Live platforms */}
                {loadingConns ? (
                  <div style={{ padding:'14px 16px', color:T.muted, fontSize:12,
                    display:'flex', alignItems:'center', gap:8 }}>
                    <i className="ti ti-loader-2 sp-spin"></i> Checking…
                  </div>
                ) : (
                  LIVE_PLATFORMS.map((plat, i) => {
                    const connected = connections[plat.id]
                    const isConn = connecting === plat.id
                    return (
                      <div key={plat.id} className="sp-plat-row"
                        style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10,
                          borderBottom: i < LIVE_PLATFORMS.length-1 ? `1px solid ${T.border}` : `1px solid ${T.border}`,
                          background:'transparent' }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:plat.color,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:17, color:'#fff', flexShrink:0 }}>
                          <i className={plat.icon}></i>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:T.text,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {plat.label}
                          </div>
                          <div style={{ fontSize:11, marginTop:2, display:'flex', alignItems:'center', gap:4,
                            color: connected ? '#34d399' : T.muted, fontWeight:500 }}>
                            <i className={`ti ${connected ? 'ti-circle-check-filled' : 'ti-circle-x'}`}></i>
                            {connected ? 'Connected' : 'Not connected'}
                          </div>
                        </div>
                        {connected ? (
                          <button className="sp-btn-ghost"
                            onClick={() => handleDisconnect(plat.id)}
                            style={{ background:'transparent', border:`1px solid ${T.border2}`,
                              color:T.muted, fontSize:11, fontWeight:600, padding:'4px 9px',
                              borderRadius:6, cursor:'pointer', fontFamily:'inherit',
                              display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
                            <i className="ti ti-unlink"></i>
                          </button>
                        ) : (
                          <button className="sp-btn-primary"
                            onClick={() => handleConnect(plat.id)}
                            disabled={!!isConn}
                            style={{ background:'linear-gradient(135deg,#1a5fd4,#0e3fa8)',
                              color:'#fff', fontSize:11, fontWeight:600, padding:'5px 10px',
                              borderRadius:6, border:'none', cursor:'pointer', fontFamily:'inherit',
                              display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap',
                              boxShadow:'0 2px 8px rgba(26,95,212,.3)' }}>
                            <i className={`ti ${isConn ? 'ti-loader-2 sp-spin' : 'ti-link'}`}></i>
                            {isConn ? '…' : 'Connect'}
                          </button>
                        )}
                      </div>
                    )
                  })
                )}

                {/* Divider + coming soon label */}
                <div style={{ padding:'8px 14px 4px', borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'.1em', color:'#1a3560', marginBottom:6 }}>Coming Soon</div>
                  {COMING_SOON.map((plat, i) => (
                    <div key={plat.id}
                      style={{ padding:'7px 0', display:'flex', alignItems:'center', gap:8,
                        opacity:.38, borderBottom: i < COMING_SOON.length-1 ? `1px solid ${T.border}` : 'none' }}>
                      <div style={{ width:26, height:26, borderRadius:7, background:plat.color,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:14, color:'#fff', flexShrink:0 }}>
                        <i className={plat.icon}></i>
                      </div>
                      <div style={{ fontSize:11, fontWeight:500, color:T.muted, flex:1,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {plat.label}
                      </div>
                      <div style={{ fontSize:9, fontWeight:700, color:'#1a3560',
                        background:T.cardBg2, border:`1px solid ${T.border}`,
                        padding:'2px 6px', borderRadius:980, textTransform:'uppercase',
                        letterSpacing:'.2px', flexShrink:0 }}>Soon</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── RIGHT: Write & Post ───────────────────────────────────── */}
            <Card>
              <CardHead icon="ti ti-sparkles" title="Write & Post"
                sub="Describe your message — AI writes platform-optimised posts for each channel" />
              <div style={{ padding:'16px' }}>

                {/* Row 1: AI Model · Business Name · Post Type */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:14 }}>
                  <div>
                    <Label>AI Model</Label>
                    <Select value={aiModel} onChange={e=>setAiModel(e.target.value)}>
                      {AI_MODELS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Business Name</Label>
                    <Input value={businessName} onChange={e=>setBusinessName(e.target.value)}
                      placeholder="e.g. Crystal Coast HR" />
                  </div>
                  <div>
                    <Label>Post Type</Label>
                    <Select value={postType} onChange={e=>setPostType(e.target.value)}>
                      {POST_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </div>
                </div>

                {/* Keywords */}
                <div style={field}>
                  <Label>Keywords <span style={{ textTransform:'none', letterSpacing:0, fontWeight:400, color:'#1e3050', fontSize:10, marginLeft:4 }}>optional — AI weaves these into the posts</span></Label>
                  <Input value={keywords} onChange={e=>setKeywords(e.target.value)}
                    placeholder="e.g. same-day service, licensed plumber, Austin TX, free estimate" />
                </div>

                {/* Topic */}
                <div style={field}>
                  <Label>What do you want to post about? <span style={{ textTransform:'none', letterSpacing:0, fontWeight:400, color:'#1e3050', fontSize:10, marginLeft:4 }}>plain English — AI handles the rest</span></Label>
                  <Textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3}
                    placeholder="e.g. We just added same-day AC repair. Summer special — 10% off for new customers. Coupon code SUMMER10." />
                </div>

                {/* Publish To */}
                <div style={field}>
                  <Label>Publish To</Label>
                  {connectedPlatforms.length === 0 ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, background:T.cardBg2,
                      border:`1px solid ${T.border2}`, borderRadius:7, padding:'10px 12px',
                      fontSize:12, color:T.muted }}>
                      <i className="ti ti-alert-triangle" style={{ color:'#fbbf24', fontSize:14, flexShrink:0 }}></i>
                      Connect at least one account on the left first.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {connectedPlatforms.map(plat => {
                        const sel = selectedPlatforms.includes(plat.id)
                        return (
                          <label key={plat.id} className="sp-chk"
                            onClick={() => setSelectedPlatforms(prev =>
                              sel ? prev.filter(x=>x!==plat.id) : [...prev, plat.id]
                            )}
                            style={{ display:'flex', alignItems:'center', gap:7,
                              padding:'7px 12px', borderRadius:7, cursor:'pointer', userSelect:'none',
                              background: sel ? 'rgba(59,130,246,.1)' : T.cardBg2,
                              border: `1.5px solid ${sel ? T.accent : T.border2}`,
                              fontSize:12, fontWeight:600,
                              color: sel ? T.accentHi : T.muted }}>
                            <input type="checkbox" readOnly checked={sel} style={{ display:'none' }} />
                            <i className={plat.icon} style={{ color:plat.color, fontSize:15 }}></i>
                            {plat.label}
                            {sel && <i className="ti ti-check" style={{ marginLeft:2, fontSize:12, color:T.accent }}></i>}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <button className="sp-btn-primary"
                  onClick={handleGenerate}
                  disabled={generating || !topic.trim() || !selectedPlatforms.length}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                    gap:8, background:'linear-gradient(135deg,#1a5fd4,#5856d6)', color:'#fff',
                    fontFamily:'inherit', fontSize:13, fontWeight:700, padding:'12px 0',
                    borderRadius:8, border:'none', cursor:'pointer',
                    boxShadow:'0 4px 16px rgba(26,95,212,.35)' }}>
                  <i className={`ti ${generating ? 'ti-loader-2 sp-spin' : 'ti-sparkles'}`}></i>
                  {generating ? 'AI is writing your posts…' : 'Generate Posts with AI'}
                </button>

                {/* ── Post editors (appear after generation) ── */}
                {hasPosts && (
                  <div className="sp-fadein">
                    <div style={{ height:1, background:T.border, margin:'18px 0 14px' }}></div>
                    <Label>Review &amp; Edit — then Publish</Label>

                    {selectedPlatforms.map(pid => {
                      const plat = LIVE_PLATFORMS.find(p=>p.id===pid)
                      if (!plat || !posts[pid]) return null
                      return (
                        <div key={pid} className="sp-editor"
                          style={{ border:`1px solid ${T.border2}`, borderRadius:8,
                            overflow:'hidden', marginBottom:10 }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'8px 12px', background:T.cardBg2,
                            borderBottom:`1px solid ${T.border}` }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7,
                              fontSize:12, fontWeight:700, color:T.text }}>
                              <i className={plat.icon} style={{ color:plat.color, fontSize:14 }}></i>
                              {plat.label}
                              <span style={{ fontSize:10, color:T.muted, fontWeight:400 }}>
                                · {posts[pid].length} chars
                              </span>
                            </div>
                            <span style={{ fontSize:10, color:'#1e3050' }}>{plat.hint}</span>
                          </div>
                          <textarea value={posts[pid]}
                            onChange={e=>setPosts(prev=>({...prev,[pid]:e.target.value}))}
                            rows={4}
                            style={{ width:'100%', display:'block', background:T.cardBg,
                              border:'none', color:T.textSub, fontSize:12, fontFamily:'inherit',
                              padding:'10px 12px', resize:'vertical', lineHeight:1.65,
                              minHeight:90, outline:'none', boxSizing:'border-box' }} />
                        </div>
                      )
                    })}

                    {/* Publish result */}
                    {publishResult && (
                      <div className="sp-slidedn" style={{ borderRadius:8, padding:'12px 14px', marginBottom:12,
                        background: publishResult.success ? 'rgba(16,185,129,.07)' : 'rgba(248,113,113,.07)',
                        border: `1px solid ${publishResult.success ? 'rgba(16,185,129,.2)' : 'rgba(248,113,113,.2)'}` }}>
                        <div style={{ fontSize:13, fontWeight:700, display:'flex', alignItems:'center',
                          gap:6, marginBottom:7,
                          color: publishResult.success ? '#34d399' : '#fca5a5' }}>
                          <i className={`ti ${publishResult.success ? 'ti-circle-check-filled' : 'ti-circle-x'}`}></i>
                          {publishResult.success ? 'Published successfully!' : 'Some platforms failed'}
                        </div>
                        {publishResult.results?.map((r,i) => (
                          <div key={i} style={{ fontSize:12, display:'flex', alignItems:'center', gap:5,
                            marginBottom:3, color: r.success ? '#34d399' : '#fca5a5' }}>
                            <i className={`ti ${r.success ? 'ti-check' : 'ti-x'}`}></i>
                            <strong>{r.platform}:</strong>&nbsp;{r.message}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Regenerate + Publish row */}
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="sp-btn-ghost"
                        onClick={() => { setPosts({}); setPublishResult(null) }}
                        style={{ display:'flex', alignItems:'center', gap:6,
                          background:'transparent', border:`1px solid ${T.border2}`,
                          color:T.muted, fontSize:12, fontWeight:600, padding:'10px 14px',
                          borderRadius:8, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        <i className="ti ti-refresh"></i> Regenerate
                      </button>
                      <button className="sp-btn-primary"
                        onClick={handlePublish}
                        disabled={publishing || !selectedPlatforms.length}
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                          gap:8, background:'linear-gradient(135deg,#1a9b4e,#16803e)', color:'#fff',
                          fontFamily:'inherit', fontSize:13, fontWeight:700, padding:'10px 0',
                          borderRadius:8, border:'none', cursor:'pointer',
                          boxShadow:'0 3px 12px rgba(16,185,129,.3)' }}>
                        <i className={`ti ${publishing ? 'ti-loader-2 sp-spin' : 'ti-send'}`}></i>
                        {publishing ? 'Publishing…' : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length!==1?'s':''}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ── BOTTOM ROW: Post History (left 1/2) + Publish/Setup (right 1/2) ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

            {/* Post History */}
            <Card>
              <CardHead icon="ti ti-history" title="Post History" sub="Your recently published posts" />
              <div>
                {postHistory.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'32px 20px' }}>
                    <i className="ti ti-clock-off" style={{ fontSize:28, color:'#1a3560', display:'block', marginBottom:10 }}></i>
                    <div style={{ fontSize:13, color:T.muted }}>No posts published yet.</div>
                    <div style={{ fontSize:12, color:'#1a3560', marginTop:4 }}>
                      Generate and publish your first post using the form above.
                    </div>
                  </div>
                ) : (
                  postHistory.map((p,i) => (
                    <div key={i} style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`,
                      fontSize:12, color:T.textSub }}>
                      {p.text}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Right column: Publish CTA + Setup Guide */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Quick Publish CTA — shows when posts are ready */}
              {hasPosts && (
                <Card style={{ border:`1px solid rgba(16,185,129,.3)` }}>
                  <div style={{ padding:'14px 16px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#34d399', marginBottom:4,
                      display:'flex', alignItems:'center', gap:6 }}>
                      <i className="ti ti-circle-check-filled"></i> Posts ready to publish
                    </div>
                    <div style={{ fontSize:11, color:T.muted, marginBottom:12 }}>
                      Review the generated posts in the Write &amp; Post box, then click publish.
                    </div>
                    <button className="sp-btn-primary"
                      onClick={handlePublish}
                      disabled={publishing || !selectedPlatforms.length}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
                        gap:8, background:'linear-gradient(135deg,#1a9b4e,#16803e)', color:'#fff',
                        fontFamily:'inherit', fontSize:13, fontWeight:700, padding:'11px 0',
                        borderRadius:8, border:'none', cursor:'pointer',
                        boxShadow:'0 3px 12px rgba(16,185,129,.3)' }}>
                      <i className={`ti ${publishing ? 'ti-loader-2 sp-spin' : 'ti-send'}`}></i>
                      {publishing ? 'Publishing…' : `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length!==1?'s':''}`}
                    </button>
                  </div>
                </Card>
              )}

              {/* Setup Guide */}
              <Card style={{ flex:1 }}>
                <button className="sp-setup-btn"
                  onClick={() => setSetupOpen(o=>!o)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'12px 16px', background:'none', border:'none', cursor:'pointer',
                    color:T.text, fontFamily:'inherit', borderBottom: setupOpen ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:'rgba(16,185,129,.1)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                      <i className="ti ti-book" style={{ color:'#34d399' }}></i>
                    </div>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>Setup Guide</div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>How to connect and start publishing</div>
                    </div>
                  </div>
                  <i className={`ti ${setupOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                    style={{ color:T.muted, fontSize:14 }}></i>
                </button>

                {setupOpen && (
                  <div className="sp-fadein" style={{ padding:'14px 16px', fontSize:12,
                    color:T.muted, lineHeight:1.7 }}>
                    {[
                      { n:1, head:'Create your business pages first.', body:<>You need a <a href="https://www.facebook.com/pages/create" target="_blank" rel="noreferrer" style={{color:T.accentHi}}>Facebook Business Page</a>, <a href="https://www.linkedin.com/company/setup" target="_blank" rel="noreferrer" style={{color:T.accentHi}}>LinkedIn Company Page</a>, and a verified <a href="https://business.google.com" target="_blank" rel="noreferrer" style={{color:T.accentHi}}>Google Business Profile</a>.</> },
                      { n:2, head:'Connect your accounts.', body:'Click Connect next to each platform. A popup will open — log in and authorise RankForged AI to post on your behalf.' },
                      { n:3, head:'Choose your AI model.', body:'Claude Sonnet gives the best quality. Haiku is faster. GPT-4o and Gemini are available if you have those API keys set under API Keys.' },
                      { n:4, head:'Describe your post.', body:'Write in plain English. Add keywords to make sure they appear. The AI writes a tailored version for each platform.' },
                      { n:5, head:'Review and publish.', body:'Edit the generated posts if needed. Posts go live immediately when you click Publish.' },
                    ].map(s => (
                      <div key={s.n} style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
                        <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0,
                          background:'rgba(59,130,246,.12)', border:`1px solid rgba(59,130,246,.25)`,
                          color:T.accentHi, fontSize:10, fontWeight:700,
                          display:'flex', alignItems:'center', justifyContent:'center', marginTop:1 }}>
                          {s.n}
                        </div>
                        <div><strong style={{ color:T.textSub }}>{s.head}</strong> {s.body}</div>
                      </div>
                    ))}
                    <div style={{ marginTop:4, padding:'10px 12px', background:T.cardBg2,
                      border:`1px solid ${T.border2}`, borderRadius:7, fontSize:11 }}>
                      <strong style={{ color:T.accentHi }}>GMB tip:</strong> Google Business Profile posts expire after 7 days (except Events and Offers which have their own dates). We recommend posting weekly.
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
