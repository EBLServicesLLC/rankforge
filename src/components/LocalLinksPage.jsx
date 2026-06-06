/**
 * LocalLinksPage.jsx
 * Rendered inline inside DashboardShell when activeTab === 'locallinks'
 *
 * LAYOUT (matches Social Publisher):
 * ┌──────────────────────────────────────────────────────────┐
 * │  Panel header                                            │
 * │  Stats bar (5 numbers)                                   │
 * ├────────────┬─────────────────────────────────────────────┤
 * │ Config     │  1. Prospect Results table                  │
 * │ (1/4)      │  2. AI Outreach Email                       │
 * │  City      │  3. Google Search Templates                 │
 * │  Service   │  4. Link Tracker                            │
 * │  AI Model  │                                             │
 * │  Types     │                                             │
 * │  Generate  │                                             │
 * └────────────┴─────────────────────────────────────────────┘
 *
 * Colors: exact rankforge3 palette
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://ybhpbpahhywiokhqpldj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaHBicGFoaHl3aW9raHFwbGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODc5MjAsImV4cCI6MjA5NDM2MzkyMH0.adIhREcxG5uzKTjSOCuikPMdUxX_Y-PQtWut423OuwQ'

// ── Prospect types ────────────────────────────────────────────────────────────
const PROSPECT_TYPES = [
  { id:'chamber',       label:'Chamber of Commerce & Business Associations', da:'40–70', icon:'ti ti-building-community' },
  { id:'blogs',         label:'Local Blogs & Community Websites',            da:'20–45', icon:'ti ti-news' },
  { id:'news',          label:'Local News Sites & Directories',              da:'30–60', icon:'ti ti-speakerphone' },
  { id:'sponsorship',   label:'Sponsorship Opportunities',                   da:'25–55', icon:'ti ti-award' },
  { id:'edu',           label:'Educational / .edu Connections',              da:'50–80', icon:'ti ti-school' },
  { id:'gov',           label:'Government & Municipal Pages',                da:'50–85', icon:'ti ti-building-arch' },
  { id:'complementary', label:'Complementary Business Partners',             da:'15–45', icon:'ti ti-handshake' },
  { id:'nonprofit',     label:'Nonprofits & Community Orgs',                 da:'20–50', icon:'ti ti-heart-handshake' },
  { id:'events',        label:'Local Events & Calendars',                    da:'20–40', icon:'ti ti-calendar-event' },
  { id:'podcasts',      label:'Local Podcasts & Interviews',                 da:'15–35', icon:'ti ti-microphone' },
]

const AI_MODELS = [
  { value:'claude-sonnet-4-5',  label:'Claude Sonnet 4 (Recommended)' },
  { value:'claude-haiku-4-5-20251001', label:'Claude Haiku 4.5 (Fast)' },
  { value:'gpt-4o',                    label:'GPT-4o (OpenAI)' },
  { value:'gpt-4o-mini',               label:'GPT-4o Mini (Fast)' },
  { value:'gemini-1.5-pro',            label:'Gemini 1.5 Pro (Google)' },
]

const EMAIL_TONES = [
  { value:'friendly',     label:'Friendly & Warm' },
  { value:'professional', label:'Professional' },
  { value:'direct',       label:'Direct & Brief' },
  { value:'collaborative',label:'Collaborative Partnership' },
]

const STATUS_COLORS = {
  'New':     { bg:'rgba(59,130,246,.12)',  text:'#60a5fa',  border:'rgba(59,130,246,.3)'  },
  'Pitched': { bg:'rgba(251,191,36,.1)',   text:'#fbbf24',  border:'rgba(251,191,36,.3)'  },
  'Won':     { bg:'rgba(16,185,129,.1)',   text:'#34d399',  border:'rgba(16,185,129,.3)'  },
  'Lost':    { bg:'rgba(248,113,113,.1)',  text:'#fca5a5',  border:'rgba(248,113,113,.3)' },
  'Follow':  { bg:'rgba(167,139,250,.1)',  text:'#a78bfa',  border:'rgba(167,139,250,.3)' },
}

// ── Style tokens — exact rankforge3 palette ───────────────────────────────────
const T = {
  pageBg:  '#060d1a',
  cardBg:  '#0d1f3c',
  cardBg2: '#080f1e',
  border:  '#0f2040',
  border2: '#1a3560',
  text:    '#e2e8f0',
  textSub: '#c8d8f0',
  muted:   '#4a6080',
  muted2:  '#3a5070',
  accent:  '#3b82f6',
  accentHi:'#60a5fa',
  green:   '#10b981',
  red:     '#f87171',
  yellow:  '#f59e0b',
}

// ── Reusable UI primitives ────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border2}`,
      borderRadius:10, overflow:'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionHead({ icon, title, sub, right }) {
  return (
    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`,
      display:'flex', alignItems:'center', gap:10, background:T.cardBg2 }}>
      <div style={{ width:28, height:28, borderRadius:7,
        background:'rgba(59,130,246,.12)', display:'flex',
        alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
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
  return <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
    letterSpacing:'.06em', color:T.muted, marginBottom:6 }}>{children}</div>
}

function Input({ style, ...props }) {
  return (
    <input style={{ width:'100%', background:T.cardBg2, border:`1px solid ${T.border2}`,
      borderRadius:7, color:T.text, fontSize:13, fontFamily:'inherit',
      padding:'8px 11px', outline:'none', boxSizing:'border-box', ...style }}
      onFocus={e=>e.target.style.borderColor=T.accent}
      onBlur={e=>e.target.style.borderColor=T.border2}
      {...props} />
  )
}

function Select({ children, style, ...props }) {
  return (
    <select style={{ width:'100%', background:T.cardBg2, border:`1px solid ${T.border2}`,
      borderRadius:7, color:T.text, fontSize:13, fontFamily:'inherit',
      padding:'8px 28px 8px 11px', outline:'none', cursor:'pointer',
      boxSizing:'border-box', appearance:'none', WebkitAppearance:'none',
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234a6080' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
      backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center', ...style }}
      onFocus={e=>e.target.style.borderColor=T.accent}
      onBlur={e=>e.target.style.borderColor=T.border2}
      {...props}>
      {children}
    </select>
  )
}

function PrimaryBtn({ children, style, ...props }) {
  return (
    <button style={{ display:'flex', alignItems:'center', justifyContent:'center',
      gap:7, background:'linear-gradient(135deg,#1a5fd4,#0e3fa8)', color:'#fff',
      fontFamily:'inherit', fontSize:13, fontWeight:700, padding:'11px 0',
      borderRadius:8, border:'none', cursor:'pointer', width:'100%',
      boxShadow:'0 4px 16px rgba(26,95,212,.35)', transition:'all .15s', ...style }}
      onMouseEnter={e=>{ if(!props.disabled){e.currentTarget.style.filter='brightness(1.12)';e.currentTarget.style.transform='translateY(-1px)'}}}
      onMouseLeave={e=>{ e.currentTarget.style.filter='';e.currentTarget.style.transform=''}}
      {...props}>
      {children}
    </button>
  )
}

function GhostBtn({ children, style, ...props }) {
  return (
    <button style={{ display:'flex', alignItems:'center', justifyContent:'center',
      gap:6, background:'transparent', border:`1px solid ${T.border2}`,
      color:T.muted, fontFamily:'inherit', fontSize:12, fontWeight:600,
      padding:'8px 14px', borderRadius:7, cursor:'pointer',
      transition:'all .15s', ...style }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accentHi }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border2; e.currentTarget.style.color=T.muted }}
      {...props}>
      {children}
    </button>
  )
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['New']
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px',
      borderRadius:980, background:c.bg, color:c.text,
      border:`1px solid ${c.border}`, whiteSpace:'nowrap' }}>
      {status}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LocalLinksPage({ session }) {
  // Config
  const [city, setCity]             = useState('')
  const [service, setService]       = useState('')
  const [aiModel, setAiModel]       = useState(AI_MODELS[0].value)
  const [selectedTypes, setSelectedTypes] = useState(
    PROSPECT_TYPES.slice(0,4).map(t=>t.id)
  )

  // Prospects
  const [prospects, setProspects]   = useState([])
  const [generating, setGenerating] = useState(false)
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [selectedProspect, setSelectedProspect] = useState(null)

  // Outreach
  const [emailTone, setEmailTone]   = useState('professional')
  const [outreachEmail, setOutreachEmail] = useState('')
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [copied, setCopied]         = useState(false)

  // Tracker
  const [trackerRows, setTrackerRows] = useState([])
  const [newNote, setNewNote]       = useState({})

  // Search templates
  const [searchTemplates, setSearchTemplates] = useState([])

  // UI
  const [error, setError]           = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = {
    prospects: prospects.length,
    pitched:   prospects.filter(p=>p.status==='Pitched').length + trackerRows.length,
    won:       prospects.filter(p=>p.status==='Won').length,
    avgDa:     prospects.length
      ? Math.round(prospects.reduce((a,p)=>a+(p.da||0),0)/prospects.length)
      : 0,
    winRate:   prospects.filter(p=>p.status==='Won').length
      ? Math.round(prospects.filter(p=>p.status==='Won').length/
          Math.max(prospects.filter(p=>['Pitched','Won','Lost'].includes(p.status)).length,1)*100)
      : 0,
  }

  // ── Toggle prospect type ────────────────────────────────────────────────────
  const toggleType = (id) => setSelectedTypes(prev =>
    prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
  )

  // ── Generate prospects ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!city.trim()) { setError('Enter a city or area first.'); return }
    if (!service.trim()) { setError('Enter your primary service.'); return }
    if (!selectedTypes.length) { setError('Select at least one prospect type.'); return }
    setGenerating(true); setError(null)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/local-links-generate`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json',
          Authorization:`Bearer ${session.access_token}`,
          apikey:SUPABASE_ANON_KEY },
        body:JSON.stringify({ city, service, types:selectedTypes, model:aiModel }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error||'Generation failed')

      const newProspects = (data.prospects||[]).map((p,i)=>({
        id: Date.now()+i, ...p, status:'New',
        da: p.da || Math.floor(Math.random()*40)+15,
      }))
      setProspects(newProspects)

      // Build Google search templates
      setSearchTemplates([
        `"${city}" + "${service}" + "resources"`,
        `"${city}" + "business association" + "${service}"`,
        `"${city}" + "local blog" inurl:links`,
        `"${city}" + "${service}" + "partner"`,
        `site:.edu "${city}" + "${service}"`,
        `site:.gov "${city}" + "${service}" + "resources"`,
        `"${city}" + "chamber of commerce" + "${service}"`,
        `"${city}" + "community" + "${service}" + "sponsor"`,
        `intitle:"${service}" + "${city}" + "directory"`,
        `"${city}" + "${service}" + "recommended" -site:yelp.com`,
      ])
      setSuccessMsg(`Generated ${newProspects.length} prospects for ${city}`)
      setTimeout(()=>setSuccessMsg(null), 4000)
    } catch (err) {
      // Fallback: generate mock prospects for demo when edge function not yet built
      const types = PROSPECT_TYPES.filter(t=>selectedTypes.includes(t.id))
      const mock = types.flatMap(t=>[
        { id:Date.now()+Math.random(), name:`${city} ${t.label.split('&')[0].trim()}`,
          url:`https://www.${city.toLowerCase().replace(/\s+/g,'')}${t.id}.org`,
          type:t.label, da:Math.floor(Math.random()*40)+20, status:'New',
          notes:'', followUp:'' },
        { id:Date.now()+Math.random(), name:`${service} ${t.label.split('&')[0].trim()} Network`,
          url:`https://www.${t.id}${service.toLowerCase().replace(/\s+/g,'')}.com`,
          type:t.label, da:Math.floor(Math.random()*35)+15, status:'New',
          notes:'', followUp:'' },
      ])
      setProspects(mock)
      setSearchTemplates([
        `"${city}" + "${service}" + "resources"`,
        `"${city}" + "business association" + "${service}"`,
        `"${city}" + "local blog" inurl:links`,
        `"${city}" + "${service}" + "partner"`,
        `site:.edu "${city}" + "${service}"`,
        `site:.gov "${city}" + "${service}" + "resources"`,
        `"${city}" + "chamber of commerce" + "${service}"`,
        `"${city}" + "community" + "${service}" + "sponsor"`,
        `intitle:"${service}" + "${city}" + "directory"`,
        `"${city}" + "${service}" + "recommended" -site:yelp.com`,
      ])
      setError(`FALLBACK TRIGGERED: ${err.message}`)
      setTimeout(()=>setSuccessMsg(null), 4000)
    } finally {
      setGenerating(false)
    }
  }, [city, service, selectedTypes, aiModel, session])

  // ── Update prospect status ──────────────────────────────────────────────────
  const updateStatus = (id, status) => {
    setProspects(prev=>prev.map(p=>p.id===id?{...p,status}:p))
    if (status==='Pitched') {
      setTrackerRows(prev=>{
        const p = prospects.find(x=>x.id===id)
        if (!p || prev.find(r=>r.id===id)) return prev
        return [...prev, { id, name:p.name, url:p.url, type:p.type,
          pitched:new Date().toLocaleDateString(), followUp:'', status:'Pitched', notes:'' }]
      })
    }
  }

  // ── Generate outreach email ─────────────────────────────────────────────────
  const handleGenerateEmail = useCallback(async () => {
    if (!selectedProspect) return
    setGeneratingEmail(true); setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/local-links-email`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json',
          Authorization:`Bearer ${session.access_token}`,
          apikey:SUPABASE_ANON_KEY },
        body:JSON.stringify({
          prospect:selectedProspect, city, service,
          tone:emailTone, model:aiModel,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error||'Email generation failed')
      setOutreachEmail(data.email)
    } catch (err) {
      setError(err.message || 'Email generation failed — check console')
      console.error('[local-links-email]', err)
      return
      setOutreachEmail(
`Subject: Partnership Opportunity — ${service} + ${selectedProspect.name}

Hi there,

My name is [Your Name] and I run ${service} services in ${city}. I came across ${selectedProspect.name} and was impressed by the work you do in our community.

I'd love to explore a potential partnership or resource-sharing opportunity. Specifically, I thought it might be mutually beneficial to:

• Feature each other on our respective resources/links pages
• Collaborate on community content relevant to ${city} residents
• Cross-promote services that complement each other

Many of your visitors are likely looking for trusted ${service} professionals in the area, and I'd be happy to refer my clients to you as well.

Would you be open to a quick 15-minute call to explore this? I'm flexible and happy to work around your schedule.

Thanks so much for your time — looking forward to connecting.

Best regards,
[Your Name]
[Business Name]
[Phone] | [Email] | [Website]`
      )
    } finally {
      setGeneratingEmail(false)
    }
  }, [selectedProspect, city, service, emailTone, aiModel, session])

  // ── Copy to clipboard ───────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(outreachEmail)
    setCopied(true); setTimeout(()=>setCopied(false), 2000)
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Name','URL','Type','Est. DA','Status','Notes']]
    prospects.forEach(p=>rows.push([p.name,p.url,p.type,p.da,p.status,p.notes||'']))
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = `local-links-${city}-${Date.now()}.csv`
    a.click()
  }

  // ── Filtered prospects ──────────────────────────────────────────────────────
  const filtered = prospects.filter(p=>
    (filterType==='All' || p.type===filterType) &&
    (filterStatus==='All' || p.status===filterStatus)
  )

  const uniqueTypes = ['All', ...new Set(prospects.map(p=>p.type))]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        @keyframes ll-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes ll-fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ll-spin    { animation:ll-spin .8s linear infinite; display:inline-block; }
        .ll-fadein  { animation:ll-fadein .25s ease both; }
        .ll-row:hover { background:rgba(59,130,246,.04) !important; }
        .ll-type-chk:hover { border-color:#1a5fd4 !important; }
        .ll-prospect-row:hover { background:rgba(59,130,246,.05) !important; cursor:pointer; }
        .ll-prospect-row.selected { background:rgba(59,130,246,.1) !important; border-left:2px solid #3b82f6 !important; }
        .ll-copy-btn:hover { border-color:#1a5fd4 !important; color:#60a5fa !important; }
        .ll-template:hover { background:rgba(59,130,246,.06) !important; }
        textarea:focus { outline:none; border-color:#1a5fd4 !important; }
        input:focus, select:focus { outline:none; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#1a3560; border-radius:3px; }
      `}</style>

      <div style={{ background:T.pageBg, minHeight:'100%',
        fontFamily:"'Segoe UI',system-ui,sans-serif", color:T.text,
        WebkitFontSmoothing:'antialiased' }}>

        {/* ── PANEL HEADER ──────────────────────────────────────────────── */}
        <div style={{ padding:'14px 20px 12px', borderBottom:`1px solid ${T.border}`,
          background:T.cardBg2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
            <span style={{ fontSize:18, fontWeight:800, color:T.text, letterSpacing:'-.3px' }}>
              Local Link Prospecting Engine
            </span>
          </div>
          <p style={{ margin:0, fontSize:12.5, color:T.muted, lineHeight:1.6, maxWidth:900 }}>
            Generates hyperlocal backlink opportunities specific to your city and service —
            Chamber of Commerce, local associations, neighbourhood blogs, local news, sponsorship pages,
            and more. City-specific authority that generic prospect lists miss entirely.
          </p>
        </div>

        {/* ── BANNERS ───────────────────────────────────────────────────── */}
        {error && (
          <div style={{ padding:'10px 20px', background:'rgba(248,113,113,.07)',
            borderBottom:'1px solid rgba(248,113,113,.18)', color:'#fca5a5',
            fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
            <i className="ti ti-alert-circle"></i> {error}
            <button onClick={()=>setError(null)} style={{ marginLeft:'auto', background:'none',
              border:'none', color:'#fca5a5', cursor:'pointer', fontSize:16, display:'flex' }}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}
        {successMsg && (
          <div style={{ padding:'10px 20px', background:'rgba(16,185,129,.07)',
            borderBottom:'1px solid rgba(16,185,129,.18)', color:'#34d399',
            fontSize:13, display:'flex', alignItems:'center', gap:10 }}>
            <i className="ti ti-circle-check-filled"></i> {successMsg}
            <button onClick={()=>setSuccessMsg(null)} style={{ marginLeft:'auto', background:'none',
              border:'none', color:'#34d399', cursor:'pointer', fontSize:16, display:'flex' }}>
              <i className="ti ti-x"></i>
            </button>
          </div>
        )}

        {/* ── STATS BAR ─────────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)',
          borderBottom:`1px solid ${T.border}`, background:T.cardBg2 }}>
          {[
            { val:stats.prospects, label:'Prospects',  color:'#60a5fa' },
            { val:stats.pitched,   label:'Pitched',    color:'#fbbf24' },
            { val:stats.won,       label:'Links Won',  color:'#34d399' },
            { val:stats.avgDa||'—',label:'Avg Est. DA',color:'#a78bfa' },
            { val:`${stats.winRate}%`, label:'Win Rate', color:'#60a5fa' },
          ].map((s,i)=>(
            <div key={s.label} style={{ padding:'13px 16px',
              borderRight:i<4?`1px solid ${T.border}`:'none' }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.color,
                letterSpacing:'-.5px', lineHeight:1, marginBottom:3 }}>{s.val}</div>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                letterSpacing:'.08em', color:T.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 3fr',
          gap:14, padding:'16px' }}>

          {/* ════════════════════════════════════════════════════════════
              LEFT — Config panel
          ════════════════════════════════════════════════════════════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <SectionHead icon="ti ti-settings" title="Prospect Generator"
                sub="Configure your search" />
              <div style={{ padding:'14px' }}>

                <div style={{ marginBottom:12 }}>
                  <Label>City / Area</Label>
                  <Input value={city} onChange={e=>setCity(e.target.value)}
                    placeholder="e.g. Emerald Isle, NC" />
                </div>

                <div style={{ marginBottom:12 }}>
                  <Label>Primary Service</Label>
                  <Input value={service} onChange={e=>setService(e.target.value)}
                    placeholder="e.g. HR, Plumbing, Dentist" />
                </div>

                <div style={{ marginBottom:14 }}>
                  <Label>AI Model</Label>
                  <Select value={aiModel} onChange={e=>setAiModel(e.target.value)}>
                    {AI_MODELS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                </div>

                <div style={{ marginBottom:14 }}>
                  <Label>Prospect Types to Find</Label>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {PROSPECT_TYPES.map(t=>{
                      const sel = selectedTypes.includes(t.id)
                      return (
                        <label key={t.id} className="ll-type-chk"
                          onClick={()=>toggleType(t.id)}
                          style={{ display:'flex', alignItems:'flex-start', gap:8,
                            padding:'7px 10px', borderRadius:7, cursor:'pointer',
                            userSelect:'none', transition:'all .15s',
                            background: sel?'rgba(59,130,246,.1)':T.cardBg2,
                            border:`1px solid ${sel?T.accent:T.border2}` }}>
                          <input type="checkbox" readOnly checked={sel}
                            style={{ marginTop:1, accentColor:T.accent, flexShrink:0 }} />
                          <div>
                            <div style={{ fontSize:11, fontWeight:600,
                              color:sel?T.accentHi:T.muted, lineHeight:1.4 }}>
                              {t.label}
                            </div>
                            <div style={{ fontSize:10, color:'#1e3050', marginTop:2 }}>
                              Est. DA {t.da}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <PrimaryBtn onClick={handleGenerate}
                  disabled={generating||!city.trim()||!service.trim()}
                  style={{ opacity:generating||!city.trim()||!service.trim()?0.45:1 }}>
                  <i className={`ti ${generating?'ti-loader-2 ll-spin':'ti-search'}`}></i>
                  {generating?'Generating…':'Generate Prospects'}
                </PrimaryBtn>

                {prospects.length>0 && (
                  <GhostBtn onClick={exportCSV} style={{ marginTop:8, width:'100%' }}>
                    <i className="ti ti-download"></i> Export CSV
                  </GhostBtn>
                )}
              </div>
            </Card>

            {/* Anchor text tips card */}
            <Card>
              <SectionHead icon="ti ti-link" title="Anchor Text Tips"
                sub="Best practices for your links" />
              <div style={{ padding:'12px 14px', fontSize:12, color:T.muted,
                lineHeight:1.7, display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Branded', example:`${service||'Your Brand'} in ${city||'Your City'}`, pct:'40%' },
                  { label:'Partial match', example:`${city||'City'} ${service||'service'}`, pct:'30%' },
                  { label:'Natural', example:'click here, this page, our site', pct:'20%' },
                  { label:'Exact match', example:`${service||'service'} ${city||'city'}`, pct:'10%' },
                ].map(a=>(
                  <div key={a.label} style={{ background:T.cardBg2,
                    border:`1px solid ${T.border}`, borderRadius:7, padding:'7px 10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:T.textSub }}>{a.label}</span>
                      <span style={{ fontSize:10, color:T.accent, fontWeight:700 }}>{a.pct}</span>
                    </div>
                    <div style={{ fontSize:10, color:'#1e3050', fontStyle:'italic' }}>"{a.example}"</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════════
              RIGHT — Results + workflow
          ════════════════════════════════════════════════════════════ */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* ── 1. Prospect Results ──────────────────────────────── */}
            <Card>
              <SectionHead icon="ti ti-list-search" title="Local Prospects"
                sub={prospects.length?`${filtered.length} of ${prospects.length} prospects`:'Generate prospects using the form on the left'}
                right={
                  prospects.length>0 && (
                    <div style={{ display:'flex', gap:7 }}>
                      <Select value={filterType} onChange={e=>setFilterType(e.target.value)}
                        style={{ width:'auto', padding:'5px 26px 5px 9px', fontSize:11 }}>
                        {uniqueTypes.map(t=><option key={t} value={t}>{t}</option>)}
                      </Select>
                      <Select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                        style={{ width:'auto', padding:'5px 26px 5px 9px', fontSize:11 }}>
                        {['All','New','Pitched','Won','Lost','Follow'].map(s=>(
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </div>
                  )
                }
              />

              {prospects.length===0 ? (
                <div style={{ padding:'40px 20px', textAlign:'center' }}>
                  <i className="ti ti-search" style={{ fontSize:32, color:'#1a3560',
                    display:'block', marginBottom:10 }}></i>
                  <div style={{ fontSize:13, color:T.muted }}>No prospects yet.</div>
                  <div style={{ fontSize:12, color:'#1a3560', marginTop:4 }}>
                    Fill in the form on the left and click Generate Prospects.
                  </div>
                </div>
              ) : (
                <div>
                  {/* Table header */}
                  <div style={{ display:'grid',
                    gridTemplateColumns:'2fr 1.5fr 80px 90px 160px',
                    padding:'8px 14px', background:T.cardBg2,
                    borderBottom:`1px solid ${T.border}`,
                    fontSize:10, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'.07em', color:T.muted, gap:8 }}>
                    <div>Prospect</div>
                    <div>Type</div>
                    <div>Est. DA</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>

                  {filtered.map(p=>(
                    <div key={p.id}
                      className={`ll-prospect-row ${selectedProspect?.id===p.id?'selected':''}`}
                      onClick={()=>setSelectedProspect(p)}
                      style={{ display:'grid',
                        gridTemplateColumns:'2fr 1.5fr 80px 90px 160px',
                        padding:'10px 14px', borderBottom:`1px solid ${T.border}`,
                        gap:8, alignItems:'center', transition:'background .1s',
                        borderLeft:`2px solid ${selectedProspect?.id===p.id?T.accent:'transparent'}` }}>

                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:T.text,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {p.name}
                        </div>
                        <a href={p.url} target="_blank" rel="noreferrer"
                          onClick={e=>e.stopPropagation()}
                          style={{ fontSize:10, color:T.accent, textDecoration:'none',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                            display:'block' }}>
                          {p.url}
                        </a>
                      </div>

                      <div style={{ fontSize:11, color:T.muted,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.type}
                      </div>

                      <div style={{ fontSize:13, fontWeight:700, color:T.accentHi }}>
                        {p.da}
                      </div>

                      <div><StatusPill status={p.status} /></div>

                      <div style={{ display:'flex', gap:5 }} onClick={e=>e.stopPropagation()}>
                        {['Pitched','Won','Lost'].map(s=>(
                          <button key={s} onClick={()=>updateStatus(p.id,s)}
                            title={`Mark as ${s}`}
                            style={{ fontSize:10, fontWeight:600, padding:'3px 7px',
                              borderRadius:5, border:'none', cursor:'pointer',
                              fontFamily:'inherit', transition:'all .15s',
                              background: p.status===s
                                ? (STATUS_COLORS[s]?.bg||'transparent')
                                : T.cardBg2,
                              color: p.status===s
                                ? (STATUS_COLORS[s]?.text||T.muted)
                                : T.muted }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ padding:'10px 14px', display:'flex',
                    alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'#1e3050' }}>
                      Click a row to generate an outreach email below
                    </span>
                    <GhostBtn onClick={()=>setProspects([])}
                      style={{ fontSize:11, padding:'5px 10px', color:'#7f1d1d',
                        borderColor:'rgba(248,113,113,.2)' }}>
                      <i className="ti ti-trash"></i> Clear
                    </GhostBtn>
                  </div>
                </div>
              )}
            </Card>

            {/* ── 2. AI Outreach Email ─────────────────────────────── */}
            <Card>
              <SectionHead icon="ti ti-mail" title="AI Outreach Email"
                sub={selectedProspect
                  ? `Generating for: ${selectedProspect.name}`
                  : 'Select a prospect above to generate a personalised pitch email'} />
              <div style={{ padding:'14px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  <div>
                    <Label>Email Tone</Label>
                    <Select value={emailTone} onChange={e=>setEmailTone(e.target.value)}>
                      {EMAIL_TONES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end' }}>
                    <PrimaryBtn onClick={handleGenerateEmail}
                      disabled={!selectedProspect||generatingEmail}
                      style={{ opacity:!selectedProspect||generatingEmail?0.45:1 }}>
                      <i className={`ti ${generatingEmail?'ti-loader-2 ll-spin':'ti-mail-forward'}`}></i>
                      {generatingEmail?'Writing…':'Generate Email'}
                    </PrimaryBtn>
                  </div>
                </div>

                {outreachEmail ? (
                  <div className="ll-fadein">
                    <div style={{ position:'relative' }}>
                      <textarea value={outreachEmail}
                        onChange={e=>setOutreachEmail(e.target.value)}
                        rows={14}
                        style={{ width:'100%', background:T.cardBg2,
                          border:`1px solid ${T.border2}`, borderRadius:8,
                          color:T.textSub, fontSize:12, fontFamily:"'Courier New',monospace",
                          padding:'12px', resize:'vertical', lineHeight:1.7,
                          boxSizing:'border-box' }} />
                      <button className="ll-copy-btn" onClick={handleCopy}
                        style={{ position:'absolute', top:8, right:8,
                          background:T.cardBg, border:`1px solid ${T.border2}`,
                          color: copied?'#34d399':T.muted, fontSize:11, fontWeight:600,
                          padding:'4px 10px', borderRadius:6, cursor:'pointer',
                          fontFamily:'inherit', display:'flex', alignItems:'center',
                          gap:4, transition:'all .15s' }}>
                        <i className={`ti ${copied?'ti-check':'ti-copy'}`}></i>
                        {copied?'Copied!':'Copy'}
                      </button>
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <GhostBtn onClick={()=>setOutreachEmail('')}
                        style={{ flex:1 }}>
                        <i className="ti ti-refresh"></i> Regenerate
                      </GhostBtn>
                      {selectedProspect && (
                        <GhostBtn
                          onClick={()=>updateStatus(selectedProspect.id,'Pitched')}
                          style={{ flex:1, borderColor:'rgba(251,191,36,.3)', color:'#fbbf24' }}>
                          <i className="ti ti-send"></i> Mark as Pitched
                        </GhostBtn>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:'28px', textAlign:'center',
                    background:T.cardBg2, border:`1px solid ${T.border}`,
                    borderRadius:8 }}>
                    <i className="ti ti-mail" style={{ fontSize:28, color:'#1a3560',
                      display:'block', marginBottom:8 }}></i>
                    <div style={{ fontSize:12, color:T.muted }}>
                      {selectedProspect
                        ? 'Click Generate Email to write a personalised outreach.'
                        : 'Select a prospect from the table above first.'}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ── 3. Google Search Templates ───────────────────────── */}
            <Card>
              <SectionHead icon="ti ti-brand-google" title="Google Search Templates"
                sub="Copy these into Google to find real local link opportunities" />
              <div style={{ padding:'14px' }}>
                {searchTemplates.length===0 ? (
                  <div style={{ padding:'20px', textAlign:'center',
                    color:T.muted, fontSize:12 }}>
                    Generate prospects to see search templates.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {searchTemplates.map((tpl,i)=>(
                      <div key={i} className="ll-template"
                        style={{ display:'flex', alignItems:'center',
                          justifyContent:'space-between', padding:'9px 12px',
                          background:T.cardBg2, border:`1px solid ${T.border}`,
                          borderRadius:7, gap:10, transition:'background .12s' }}>
                        <code style={{ fontSize:11, color:T.accentHi, flex:1,
                          fontFamily:"'Courier New',monospace", wordBreak:'break-all' }}>
                          {tpl}
                        </code>
                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                          <button onClick={()=>navigator.clipboard.writeText(tpl)}
                            title="Copy"
                            style={{ background:'none', border:`1px solid ${T.border2}`,
                              color:T.muted, fontSize:11, padding:'3px 8px',
                              borderRadius:5, cursor:'pointer', fontFamily:'inherit',
                              display:'flex', alignItems:'center', gap:3 }}>
                            <i className="ti ti-copy"></i>
                          </button>
                          <a href={`https://www.google.com/search?q=${encodeURIComponent(tpl)}`}
                            target="_blank" rel="noreferrer"
                            style={{ background:'rgba(59,130,246,.1)', border:`1px solid ${T.border2}`,
                              color:T.accentHi, fontSize:11, padding:'3px 8px',
                              borderRadius:5, textDecoration:'none', fontWeight:600,
                              display:'flex', alignItems:'center', gap:3 }}>
                            <i className="ti ti-external-link"></i> Search
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* ── 4. Link Tracker ──────────────────────────────────── */}
            <Card>
              <SectionHead icon="ti ti-table" title="Link Tracker"
                sub="Track your outreach progress — updated when you mark prospects as Pitched" />
              <div style={{ padding:'14px' }}>
                {trackerRows.length===0 ? (
                  <div style={{ padding:'24px', textAlign:'center',
                    color:T.muted, fontSize:12 }}>
                    <i className="ti ti-table-off" style={{ fontSize:26, color:'#1a3560',
                      display:'block', marginBottom:8 }}></i>
                    Mark a prospect as "Pitched" above to add it here.
                  </div>
                ) : (
                  <div>
                    {/* Tracker table header */}
                    <div style={{ display:'grid',
                      gridTemplateColumns:'2fr 1fr 1fr 100px 1fr',
                      padding:'7px 12px', background:T.cardBg2,
                      borderBottom:`1px solid ${T.border}`,
                      fontSize:10, fontWeight:700, textTransform:'uppercase',
                      letterSpacing:'.07em', color:T.muted, gap:8,
                      borderRadius:'4px 4px 0 0' }}>
                      <div>Prospect</div>
                      <div>Pitched</div>
                      <div>Follow-up</div>
                      <div>Status</div>
                      <div>Notes</div>
                    </div>
                    {trackerRows.map((r,i)=>(
                      <div key={r.id} className="ll-row"
                        style={{ display:'grid',
                          gridTemplateColumns:'2fr 1fr 1fr 100px 1fr',
                          padding:'9px 12px', borderBottom:`1px solid ${T.border}`,
                          gap:8, alignItems:'center', fontSize:12,
                          background:'transparent', transition:'background .1s' }}>
                        <div>
                          <div style={{ fontWeight:600, color:T.text,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize:10, color:T.muted }}>{r.type}</div>
                        </div>
                        <div style={{ color:T.muted, fontSize:11 }}>{r.pitched}</div>
                        <div>
                          <input type="date"
                            value={r.followUp}
                            onChange={e=>setTrackerRows(prev=>prev.map((x,j)=>
                              j===i?{...x,followUp:e.target.value}:x
                            ))}
                            style={{ background:T.cardBg2, border:`1px solid ${T.border2}`,
                              borderRadius:5, color:T.muted, fontSize:11,
                              padding:'3px 6px', fontFamily:'inherit', outline:'none',
                              width:'100%', boxSizing:'border-box' }} />
                        </div>
                        <div>
                          <Select value={r.status}
                            onChange={e=>setTrackerRows(prev=>prev.map((x,j)=>
                              j===i?{...x,status:e.target.value}:x
                            ))}
                            style={{ padding:'4px 24px 4px 7px', fontSize:11 }}>
                            {['Pitched','Follow','Won','Lost'].map(s=>(
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <input value={r.notes}
                            onChange={e=>setTrackerRows(prev=>prev.map((x,j)=>
                              j===i?{...x,notes:e.target.value}:x
                            ))}
                            placeholder="Add note…"
                            style={{ background:T.cardBg2, border:`1px solid ${T.border2}`,
                              borderRadius:5, color:T.text, fontSize:11,
                              padding:'4px 7px', fontFamily:'inherit', outline:'none',
                              width:'100%', boxSizing:'border-box' }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ padding:'10px 12px' }}>
                      <GhostBtn onClick={()=>{
                        const rows=[['Name','URL','Type','Pitched','Follow-up','Status','Notes']]
                        trackerRows.forEach(r=>rows.push([r.name,r.url,r.type,r.pitched,r.followUp,r.status,r.notes]))
                        const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
                        const a=document.createElement('a')
                        a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
                        a.download=`link-tracker-${Date.now()}.csv`
                        a.click()
                      }} style={{ fontSize:11 }}>
                        <i className="ti ti-download"></i> Export Tracker CSV
                      </GhostBtn>
                    </div>
                  </div>
                )}
              </div>
            </Card>

          </div>{/* end right column */}
        </div>{/* end main grid */}
      </div>
    </>
  )
}
