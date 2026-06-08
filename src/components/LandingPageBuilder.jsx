import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  pageBg:'#060d1a', cardBg:'#0d1f3c', cardBg2:'#080f1e',
  border:'#0f2040', border2:'#1a3560',
  text:'#e2e8f0', textSub:'#c8d8f0', muted:'#4a6080',
  accent:'#3b82f6', accentHi:'#60a5fa',
  green:'#10b981', red:'#f87171', yellow:'#f59e0b',
  orange:'#f97316', purple:'#8b5cf6', cyan:'#22d3ee',
}

const PC = {
  google:    { bg:'#0d1f14', border:'#10b981', color:'#10b981', icon:'ti-brand-google'    },
  facebook:  { bg:'#0d1221', border:'#3b82f6', color:'#60a5fa', icon:'ti-brand-facebook'  },
  instagram: { bg:'#1a0d21', border:'#8b5cf6', color:'#a78bfa', icon:'ti-brand-instagram' },
  linkedin:  { bg:'#0d1a21', border:'#22d3ee', color:'#22d3ee', icon:'ti-brand-linkedin'  },
  blog:      { bg:'#1f0d05', border:'#f97316', color:'#fb923c', icon:'ti-file-text'       },
  email:     { bg:'#1f0d0d', border:'#f87171', color:'#fca5a5', icon:'ti-mail'            },
}

const PLATFORMS  = ['google','facebook','instagram','linkedin','blog','email']
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS       = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const TONES      = ['Professional','Friendly','Urgent','Inspirational','Humorous','Educational','Promotional']
const LENGTHS    = ['Short (50-100 words)','Medium (100-200 words)','Long (200-400 words)']

const STATUS_MAP = {
  draft:     { label:'Draft',     bg:'#0d1a2a', color:'#4a6080' },
  scheduled: { label:'Scheduled', bg:'#0d1f14', color:'#10b981' },
  published: { label:'Published', bg:'#0d1430', color:'#60a5fa' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDays(y,m)  { return new Date(y,m+1,0).getDate() }
function getFirst(y,m) { return new Date(y,m,1).getDay() }
function pad(n)        { return String(n).padStart(2,'0') }
function toDS(y,m,d)   { return `${y}-${pad(m+1)}-${pad(d)}` }
function fmtDate(ds)   {
  return new Date(ds+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})
}

const inp = {
  background:'#060d1a', border:'1px solid #1a3560', borderRadius:8,
  color:'#e2e8f0', padding:'8px 12px', fontSize:13,
  width:'100%', boxSizing:'border-box', outline:'none',
}
const lbl = { color:'#c8d8f0', fontSize:12, fontWeight:600, marginBottom:4, display:'block' }

function Badge({ status }) {
  const m = STATUS_MAP[status] || STATUS_MAP.draft
  return <span style={{ background:m.bg, color:m.color, borderRadius:10, padding:'2px 9px', fontSize:10, fontWeight:700 }}>{m.label}</span>
}

// ─── API call helper ──────────────────────────────────────────────────────────
async function callClaude(apiKey, prompt, maxTokens=4000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model:'claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages:[{ role:'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`API ${res.status}: ${txt.slice(0,200)}`)
  }
  const data = await res.json()
  return (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContentCalendarPage({ clientId, userId, bizName }) {
  const now      = new Date()
  const todayStr = toDS(now.getFullYear(), now.getMonth(), now.getDate())

  // Navigation
  const [tab,         setTab]         = useState('calendar')
  const [viewYear,    setViewYear]    = useState(now.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  // Data
  const [posts,     setPosts]     = useState({})
  const [allPosts,  setAllPosts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [apiKey,    setApiKey]    = useState('')
  const [biz,       setBiz]       = useState({})

  // Generate panel
  const [genOpen,      setGenOpen]      = useState(false)
  const [genTopic,     setGenTopic]     = useState('')
  const [genPlatforms, setGenPlatforms] = useState(['google','facebook','instagram'])
  const [genTone,      setGenTone]      = useState('Professional')
  const [genKw,        setGenKw]        = useState('')
  const [generating,   setGenerating]   = useState(false)
  const [genStatus,    setGenStatus]    = useState(null) // {type:'ok'|'err'|'info', msg}

  // Repurpose panel
  const [repurposeOpen,    setRepurposeOpen]    = useState(false)
  const [articleText,      setArticleText]      = useState('')
  const [repPlatforms,     setRepPlatforms]     = useState(['facebook','instagram','linkedin'])
  const [repTone,          setRepTone]          = useState('Professional')
  const [repurposing,      setRepurposing]      = useState(false)
  const [repurposeStatus,  setRepurposeStatus]  = useState(null)

  // Post modal
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [aiDraft, setAiDraft] = useState(false)  // generating content inside modal
  const [saving,  setSaving]  = useState(false)

  // View post drawer
  const [viewPost, setViewPost] = useState(null)

  // Load API key + biz profile
  useEffect(() => {
    if (!userId) return
    supabase.from('settings').select('anthropic_key').eq('user_id', userId).single()
      .then(({ data }) => { if (data?.anthropic_key) setApiKey(data.anthropic_key) })
    if (clientId) {
      supabase.from('client_data').select('*').eq('client_id', clientId).single()
        .then(({ data }) => { if (data) setBiz(data) })
    }
  }, [userId, clientId])

  // Load posts for current month
  const loadPosts = useCallback(async () => {
    if (!clientId || !userId) return
    setLoading(true)
    const start = toDS(viewYear, viewMonth, 1)
    const end   = toDS(viewYear, viewMonth, getDays(viewYear, viewMonth))
    const { data } = await supabase
      .from('content_calendar').select('*')
      .eq('user_id', userId).eq('client_id', clientId)
      .gte('post_date', start).lte('post_date', end)
      .order('post_date')
    const flat = data || []
    const grouped = {}
    flat.forEach(p => {
      if (!grouped[p.post_date]) grouped[p.post_date] = []
      grouped[p.post_date].push(p)
    })
    setPosts(grouped)
    setAllPosts(flat)
    setLoading(false)
  }, [clientId, userId, viewYear, viewMonth])

  useEffect(() => { loadPosts() }, [loadPosts])

  // ── Biz context string for prompts ────────────────────────────────────────
  function bizCtx() {
    return [
      (biz.biz_name||bizName) && `Business: ${biz.biz_name||bizName}`,
      biz.biz_cat   && `Category: ${biz.biz_cat}`,
      biz.biz_city  && `Location: ${biz.biz_city}${biz.biz_state?', '+biz.biz_state:''}`,
      biz.biz_phone && `Phone: ${biz.biz_phone}`,
      biz.biz_website && `Website: ${biz.biz_website}`,
      biz.biz_kw    && `Keywords: ${biz.biz_kw}`,
      biz.biz_desc  && `About: ${biz.biz_desc}`,
    ].filter(Boolean).join('\n') || `Business: ${bizName||'Local Business'}`
  }

  // ── Save / update post ────────────────────────────────────────────────────
  const savePost = async (post) => {
    setSaving(true)
    const row = {
      user_id:userId, client_id:clientId,
      post_date:post.post_date, platform:post.platform,
      content:post.content, topic:post.topic||'',
      status:post.status||'draft',
      keywords:post.keywords||'', tone:post.tone||'', length:post.length||'',
    }
    if (post.id) {
      await supabase.from('content_calendar').update(row).eq('id', post.id)
    } else {
      await supabase.from('content_calendar').insert(row)
    }
    setSaving(false)
    setModal(false)
    setEditing(null)
    loadPosts()
  }

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return
    await supabase.from('content_calendar').delete().eq('id', id)
    if (viewPost?.id === id) setViewPost(null)
    loadPosts()
  }

  const updateStatus = async (post, status) => {
    await supabase.from('content_calendar').update({ status }).eq('id', post.id)
    if (viewPost?.id === post.id) setViewPost({ ...post, status })
    loadPosts()
  }

  // ── AI: Generate full month ───────────────────────────────────────────────
  const generateMonth = async () => {
    if (!apiKey) { setGenStatus({ type:'err', msg:'No Anthropic API key found. Add it in API Keys tab.' }); return }
    if (!genPlatforms.length) { setGenStatus({ type:'err', msg:'Select at least one platform.' }); return }
    setGenerating(true)
    setGenStatus({ type:'info', msg:'Calling Claude...' })

    const prompt = `You are a local SEO content strategist.

${bizCtx()}
${genTopic ? `Campaign focus: ${genTopic}` : ''}
${genKw    ? `Target keywords: ${genKw}`   : ''}
Tone: ${genTone}
Month: ${MONTHS[viewMonth]} ${viewYear}
Platforms: ${genPlatforms.join(', ')}

Generate 16-20 social posts spread evenly across the month.
Return ONLY a valid JSON array, no markdown fences, no explanation.
Each object must have exactly:
- post_date: "YYYY-MM-DD" within ${MONTHS[viewMonth]} ${viewYear}
- platform: one of ${genPlatforms.join(', ')}
- content: full post text in ${genTone} tone, appropriate length per platform
- topic: 2-4 word label

Spread dates evenly. Vary topics. Use a local, authentic voice.`

    try {
      const raw   = await callClaude(apiKey, prompt, 4000)
      const clean = raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim()
      let parsed
      try { parsed = JSON.parse(clean) } catch { throw new Error('JSON parse failed - try again') }
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('AI returned no posts - try again')

      const rows = parsed
        .filter(p => p.post_date && p.platform && p.content)
        .map(p => ({
          user_id:userId, client_id:clientId,
          post_date:p.post_date, platform:p.platform,
          content:p.content, topic:p.topic||'',
          status:'draft', keywords:genKw, tone:genTone, length:'',
        }))

      if (!rows.length) throw new Error('No valid posts in response - try again')
      await supabase.from('content_calendar').insert(rows)
      setGenStatus({ type:'ok', msg:`${rows.length} draft posts saved. View them in the calendar or Drafts tab.` })
      setGenOpen(false)
      loadPosts()
    } catch (err) {
      setGenStatus({ type:'err', msg: err.message })
    }
    setGenerating(false)
  }

  // ── AI: Repurpose article ─────────────────────────────────────────────────
  const repurposeArticle = async () => {
    if (!apiKey)        { setRepurposeStatus({ type:'err', msg:'No Anthropic API key found.' }); return }
    if (!articleText.trim()) { setRepurposeStatus({ type:'err', msg:'Paste an article first.' }); return }
    if (!repPlatforms.length) { setRepurposeStatus({ type:'err', msg:'Select at least one platform.' }); return }
    setRepurposing(true)
    setRepurposeStatus({ type:'info', msg:'Repurposing article...' })

    const prompt = `You are a social media content strategist.

${bizCtx()}

ORIGINAL ARTICLE:
${articleText.slice(0, 3000)}

Repurpose this article into social media posts.
Tone: ${repTone}
Platforms: ${repPlatforms.join(', ')}

Create one post per platform, each adapted to that platform's style and character limits.
Schedule them across the next 7 days starting from today (${todayStr}).

Return ONLY a valid JSON array, no markdown fences:
- post_date: "YYYY-MM-DD"
- platform: one of ${repPlatforms.join(', ')}
- content: platform-appropriate post adapted from the article
- topic: 2-4 word label`

    try {
      const raw   = await callClaude(apiKey, prompt, 2000)
      const clean = raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim()
      let parsed
      try { parsed = JSON.parse(clean) } catch { throw new Error('JSON parse failed - try again') }
      if (!Array.isArray(parsed)||!parsed.length) throw new Error('AI returned no posts')

      const rows = parsed
        .filter(p => p.post_date && p.platform && p.content)
        .map(p => ({
          user_id:userId, client_id:clientId,
          post_date:p.post_date, platform:p.platform,
          content:p.content, topic:p.topic||'Repurposed',
          status:'draft', keywords:'', tone:repTone, length:'',
        }))

      await supabase.from('content_calendar').insert(rows)
      setRepurposeStatus({ type:'ok', msg:`${rows.length} repurposed posts saved as drafts.` })
      setArticleText('')
      setRepurposeOpen(false)
      loadPosts()
    } catch (err) {
      setRepurposeStatus({ type:'err', msg: err.message })
    }
    setRepurposing(false)
  }

  // ── AI: Generate single post content inside modal ─────────────────────────
  const generateSinglePost = async () => {
    if (!apiKey) { alert('No Anthropic API key found. Add it in API Keys tab.'); return }
    if (!editing) return
    setAiDraft(true)

    const lenMap = {
      'Short (50-100 words)':'50-100 words',
      'Medium (100-200 words)':'100-200 words',
      'Long (200-400 words)':'200-400 words',
    }
    const prompt = `Write a single social media post for ${editing.platform}.

${bizCtx()}
${editing.topic   ? `Topic: ${editing.topic}` : ''}
${editing.keywords? `Keywords to include: ${editing.keywords}` : ''}
Tone: ${editing.tone||'Professional'}
Length: ${lenMap[editing.length]||'100-200 words'}

Write only the post text, no labels or explanation.`

    try {
      const content = await callClaude(apiKey, prompt, 800)
      setEditing(p => ({ ...p, content: content.trim() }))
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setAiDraft(false)
  }

  // ── Calendar nav ──────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth===0) { setViewYear(y=>y-1); setViewMonth(11) }
    else setViewMonth(m=>m-1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (viewMonth===11) { setViewYear(y=>y+1); setViewMonth(0) }
    else setViewMonth(m=>m+1)
    setSelectedDay(null)
  }

  const daysInMonth = getDays(viewYear, viewMonth)
  const firstDay    = getFirst(viewYear, viewMonth)

  // ── Status action label ───────────────────────────────────────────────────
  function nextStatusAction(status) {
    if (status==='draft')     return { label:'Mark Scheduled', next:'scheduled' }
    if (status==='scheduled') return { label:'Mark Published',  next:'published'  }
    return null
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding:24, background:T.pageBg, minHeight:'100%', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .cal-day:hover{border-color:#3b82f6 !important}`}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>
            <i className="ti ti-calendar-event" style={{ color:T.accent, marginRight:10 }} />
            Content Calendar
          </div>
          {bizName && <div style={{ color:T.muted, fontSize:13, marginTop:3 }}>{bizName} - {MONTHS[viewMonth]} {viewYear}</div>}
          {!apiKey && (
            <div style={{ marginTop:8, padding:'6px 12px', background:'#1f0d05', border:'1px solid #f97316',
              borderRadius:8, color:'#fb923c', fontSize:12 }}>
              <i className="ti ti-alert-circle" style={{ marginRight:6 }} />
              No Anthropic API key found. Add it in the API Keys tab to use AI features.
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <button onClick={() => { setRepurposeOpen(o=>!o); setRepurposeStatus(null) }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px',
              background:'transparent', color:T.cyan, border:`1px solid ${T.cyan}33`,
              borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <i className="ti ti-refresh" /> Repurpose Article
          </button>
          <button onClick={() => { setEditing({ post_date:todayStr, platform:'google', content:'', topic:'', status:'draft', keywords:'', tone:'Professional', length:'Medium (100-200 words)' }); setModal(true) }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px',
              background:'transparent', color:T.accentHi, border:`1px solid ${T.border2}`,
              borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <i className="ti ti-plus" /> New Post
          </button>
          <button onClick={() => { setGenOpen(o=>!o); setGenStatus(null) }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px',
              background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff',
              border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <i className="ti ti-sparkles" /> AI Generate Month
          </button>
        </div>
      </div>

      {/* ── Status after generate ── */}
      {genStatus && !genOpen && (
        <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:8,
          background: genStatus.type==='ok'?'#0d1f14':genStatus.type==='info'?T.cardBg:'#1f0d0d',
          border:`1px solid ${genStatus.type==='ok'?T.green:genStatus.type==='info'?T.border2:T.red}`,
          color: genStatus.type==='ok'?T.green:genStatus.type==='info'?T.muted:T.red,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span><i className={`ti ${genStatus.type==='ok'?'ti-check':'genStatus.type==="info"?ti-loader-2':'ti-alert-circle'}`} style={{ marginRight:8 }} />{genStatus.msg}</span>
          <button onClick={()=>setGenStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* ── Repurpose status ── */}
      {repurposeStatus && !repurposeOpen && (
        <div style={{ marginBottom:16, padding:'10px 16px', borderRadius:8,
          background: repurposeStatus.type==='ok'?'#0d1f14':'#1f0d0d',
          border:`1px solid ${repurposeStatus.type==='ok'?T.green:T.red}`,
          color: repurposeStatus.type==='ok'?T.green:T.red,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span><i className={`ti ${repurposeStatus.type==='ok'?'ti-check':'ti-alert-circle'}`} style={{ marginRight:8 }} />{repurposeStatus.msg}</span>
          <button onClick={()=>setRepurposeStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* ── AI Generate Panel ── */}
      {genOpen && (
        <div style={{ background:T.cardBg, border:`1px solid ${T.border2}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <i className="ti ti-sparkles" style={{ color:T.accent, fontSize:16 }} />
              <span style={{ fontWeight:700, color:T.text, fontSize:15 }}>
                AI Generate - {MONTHS[viewMonth]} {viewYear}
              </span>
            </div>
            <button onClick={()=>setGenOpen(false)} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>
              <i className="ti ti-x" />
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Campaign topic <span style={{ color:T.muted, fontWeight:400 }}>(optional)</span></label>
              <input value={genTopic} onChange={e=>setGenTopic(e.target.value)}
                placeholder="e.g. summer sale, new service..." style={inp} />
            </div>
            <div>
              <label style={lbl}>Target keywords <span style={{ color:T.muted, fontWeight:400 }}>(optional)</span></label>
              <input value={genKw} onChange={e=>setGenKw(e.target.value)}
                placeholder="e.g. plumber Austin, drain cleaning" style={inp} />
            </div>
            <div>
              <label style={lbl}>Tone</label>
              <select value={genTone} onChange={e=>setGenTone(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {TONES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Platforms</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {PLATFORMS.map(p => {
                const c = PC[p], on = genPlatforms.includes(p)
                return (
                  <button key={p} onClick={()=>setGenPlatforms(prev=>on?prev.filter(x=>x!==p):[...prev,p])}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px',
                      borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:`1px solid ${on?c.border:T.border}`,
                      background:on?c.bg:'transparent', color:on?c.color:T.muted }}>
                    <i className={`ti ${c.icon}`} />
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={generateMonth} disabled={generating||!genPlatforms.length}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px',
                borderRadius:8, fontSize:13, fontWeight:700, border:'none',
                cursor:generating||!genPlatforms.length?'not-allowed':'pointer',
                background:generating||!genPlatforms.length?T.cardBg2:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color:generating||!genPlatforms.length?T.muted:'#fff', opacity:generating?0.8:1 }}>
              {generating
                ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Generating...</>
                : <><i className="ti ti-wand" /> Generate {genPlatforms.length} platform{genPlatforms.length!==1?'s':''} for {MONTHS[viewMonth]}</>}
            </button>
          </div>

          {genStatus && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8,
              background:genStatus.type==='ok'?'#0d1f14':genStatus.type==='info'?T.cardBg2:'#1f0d0d',
              border:`1px solid ${genStatus.type==='ok'?T.green:genStatus.type==='info'?T.border2:T.red}`,
              color:genStatus.type==='ok'?T.green:genStatus.type==='info'?T.muted:T.red, fontSize:13 }}>
              <i className={`ti ${genStatus.type==='ok'?'ti-check':'ti-alert-circle'}`} style={{ marginRight:8 }} />
              {genStatus.msg}
            </div>
          )}
        </div>
      )}

      {/* ── Repurpose Article Panel ── */}
      {repurposeOpen && (
        <div style={{ background:T.cardBg, border:`1px solid ${T.cyan}33`, borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <i className="ti ti-refresh" style={{ color:T.cyan, fontSize:16 }} />
              <span style={{ fontWeight:700, color:T.text, fontSize:15 }}>Repurpose Article into Social Posts</span>
            </div>
            <button onClick={()=>setRepurposeOpen(false)} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>
              <i className="ti ti-x" />
            </button>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Paste your article or blog post</label>
            <textarea value={articleText} onChange={e=>setArticleText(e.target.value)}
              rows={8} placeholder="Paste the full article text here. Claude will adapt it for each selected platform..."
              style={{ ...inp, resize:'vertical', lineHeight:1.65 }} />
            <div style={{ textAlign:'right', fontSize:11, color:T.muted, marginTop:3 }}>{articleText.length} chars (first 3000 used)</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Tone for repurposed posts</label>
              <select value={repTone} onChange={e=>setRepTone(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                {TONES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Target platforms</label>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:4 }}>
                {PLATFORMS.map(p => {
                  const c = PC[p], on = repPlatforms.includes(p)
                  return (
                    <button key={p} onClick={()=>setRepPlatforms(prev=>on?prev.filter(x=>x!==p):[...prev,p])}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px',
                        borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                        border:`1px solid ${on?c.border:T.border}`,
                        background:on?c.bg:'transparent', color:on?c.color:T.muted }}>
                      <i className={`ti ${c.icon}`} />
                      {p.charAt(0).toUpperCase()+p.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={repurposeArticle} disabled={repurposing||!articleText.trim()||!repPlatforms.length}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 24px',
                borderRadius:8, fontSize:13, fontWeight:700, border:'none',
                cursor:repurposing||!articleText.trim()||!repPlatforms.length?'not-allowed':'pointer',
                background:repurposing||!articleText.trim()||!repPlatforms.length?T.cardBg2:`linear-gradient(135deg,${T.cyan},#0891b2)`,
                color:repurposing||!articleText.trim()||!repPlatforms.length?T.muted:'#fff' }}>
              {repurposing
                ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Repurposing...</>
                : <><i className="ti ti-refresh" /> Repurpose into {repPlatforms.length} post{repPlatforms.length!==1?'s':''}</>}
            </button>
          </div>

          {repurposeStatus && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8,
              background:repurposeStatus.type==='ok'?'#0d1f14':'#1f0d0d',
              border:`1px solid ${repurposeStatus.type==='ok'?T.green:T.red}`,
              color:repurposeStatus.type==='ok'?T.green:T.red, fontSize:13 }}>
              <i className={`ti ${repurposeStatus.type==='ok'?'ti-check':'ti-alert-circle'}`} style={{ marginRight:8 }} />
              {repurposeStatus.msg}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:`1px solid ${T.border}` }}>
        {[
          { id:'calendar', icon:'ti-calendar',     label:'Calendar'                         },
          { id:'drafts',   icon:'ti-list',          label:`Drafts & Scheduled (${allPosts.filter(p=>p.status!=='published').length})` },
          { id:'published',icon:'ti-circle-check',  label:`Published (${allPosts.filter(p=>p.status==='published').length})` },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px',
              background:'transparent', border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
              borderBottom:`2px solid ${tab===t.id?T.accent:'transparent'}`,
              color:tab===t.id?T.accentHi:T.muted, marginBottom:-1 }}>
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* ════════════ CALENDAR TAB ════════════ */}
      {tab==='calendar' && (
        <div style={{ display:'grid', gridTemplateColumns:selectedDay?'1fr 360px':'1fr', gap:16, alignItems:'start' }}>

          {/* Calendar grid */}
          <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
              <button onClick={prevMonth} style={{ background:'transparent', border:`1px solid ${T.border2}`,
                borderRadius:8, color:T.textSub, padding:'6px 14px', cursor:'pointer' }}>
                <i className="ti ti-chevron-left" />
              </button>
              <span style={{ fontWeight:800, color:T.text, fontSize:16 }}>{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} style={{ background:'transparent', border:`1px solid ${T.border2}`,
                borderRadius:8, color:T.textSub, padding:'6px 14px', cursor:'pointer' }}>
                <i className="ti ti-chevron-right" />
              </button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 12px 0' }}>
              {DAYS.map(d=><div key={d} style={{ textAlign:'center', color:T.muted, fontSize:11, fontWeight:700, paddingBottom:8 }}>{d}</div>)}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, padding:'0 12px 14px' }}>
              {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i} />)}
              {Array.from({length:daysInMonth}).map((_,i)=>{
                const day = i+1
                const ds  = toDS(viewYear,viewMonth,day)
                const dp  = posts[ds]||[]
                const isToday    = ds===todayStr
                const isSelected = selectedDay===day
                return (
                  <div key={day} className="cal-day" onClick={()=>setSelectedDay(isSelected?null:day)}
                    style={{ minHeight:76, borderRadius:8, padding:'6px 7px', cursor:'pointer',
                      background:isSelected?'#1a3060':isToday?'#0d1f3c':'transparent',
                      border:`1px solid ${isSelected?T.accent:isToday?T.border2:T.border}`,
                      transition:'border-color 0.15s' }}>
                    <div style={{ fontSize:12, fontWeight:isToday?800:500,
                      color:isToday?T.accentHi:T.textSub, marginBottom:4 }}>{day}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {dp.slice(0,8).map((p,pi)=>(
                        <div key={pi} title={`${p.platform}: ${p.topic||p.content.slice(0,40)}`}
                          style={{ width:7, height:7, borderRadius:'50%', background:PC[p.platform]?.border||T.muted }} />
                      ))}
                      {dp.length>8 && <span style={{ fontSize:9, color:T.muted }}>+{dp.length-8}</span>}
                    </div>
                    {dp.length>0 && <div style={{ marginTop:3, fontSize:10, color:T.muted }}>{dp.length} post{dp.length!==1?'s':''}</div>}
                  </div>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:14, flexWrap:'wrap', padding:'10px 16px', borderTop:`1px solid ${T.border}` }}>
              {PLATFORMS.map(p=>(
                <div key={p} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:PC[p].border }} />
                  <span style={{ color:T.muted, fontSize:11 }}>{p.charAt(0).toUpperCase()+p.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day panel */}
          {selectedDay && (()=>{
            const ds = toDS(viewYear,viewMonth,selectedDay)
            const dp = posts[ds]||[]
            return (
              <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'13px 16px', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ fontWeight:700, color:T.text, fontSize:14 }}>
                    <i className="ti ti-calendar-day" style={{ color:T.accent, marginRight:8 }} />
                    {MONTHS[viewMonth]} {selectedDay}
                  </span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>{ setEditing({ post_date:ds, platform:'google', content:'', topic:'', status:'draft', keywords:'', tone:'Professional', length:'Medium (100-200 words)' }); setModal(true) }}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                        background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff',
                        border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      <i className="ti ti-plus" /> Add Post
                    </button>
                    <button onClick={()=>setSelectedDay(null)}
                      style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
                <div style={{ padding:12, maxHeight:540, overflowY:'auto' }}>
                  {dp.length===0 ? (
                    <div style={{ textAlign:'center', color:T.muted, padding:'30px 0', fontSize:13 }}>
                      <i className="ti ti-calendar-off" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                      No posts - click Add Post to create one
                    </div>
                  ) : dp.map(p=>(
                    <MiniPostCard key={p.id} post={p}
                      onView={()=>setViewPost(p)}
                      onEdit={()=>{ setEditing({...p}); setModal(true) }}
                      onDelete={()=>deletePost(p.id)}
                      onStatus={(next)=>updateStatus(p,next)}
                      nextAction={nextStatusAction(p.status)} />
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ════════════ DRAFTS / SCHEDULED TAB ════════════ */}
      {tab==='drafts' && (
        <PostList
          posts={allPosts.filter(p=>p.status!=='published')}
          loading={loading}
          onView={setViewPost}
          onEdit={p=>{ setEditing({...p}); setModal(true) }}
          onDelete={deletePost}
          onStatus={updateStatus}
          nextStatusAction={nextStatusAction}
          emptyMsg="No drafts or scheduled posts this month."
          emptyAction={()=>setGenOpen(true)}
        />
      )}

      {/* ════════════ PUBLISHED TAB ════════════ */}
      {tab==='published' && (
        <PostList
          posts={allPosts.filter(p=>p.status==='published')}
          loading={loading}
          onView={setViewPost}
          onEdit={p=>{ setEditing({...p}); setModal(true) }}
          onDelete={deletePost}
          onStatus={updateStatus}
          nextStatusAction={nextStatusAction}
          emptyMsg="No published posts this month yet."
        />
      )}

      {/* ════════════ VIEW POST DRAWER ════════════ */}
      {viewPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:900,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>{if(e.target===e.currentTarget)setViewPost(null)}}>
          <div style={{ background:'#0d1f3c', border:`1px solid ${PC[viewPost.platform]?.border||T.border2}`,
            borderRadius:14, width:560, maxHeight:'85vh', overflowY:'auto', padding:26 }}>
            {(() => {
              const c = PC[viewPost.platform]||PC.blog
              const na = nextStatusAction(viewPost.status)
              return (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <i className={`ti ${c.icon}`} style={{ color:c.color, fontSize:20 }} />
                      <div>
                        <div style={{ fontWeight:800, color:T.text, fontSize:16 }}>
                          {viewPost.platform.charAt(0).toUpperCase()+viewPost.platform.slice(1)} Post
                        </div>
                        <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>{fmtDate(viewPost.post_date)}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <Badge status={viewPost.status} />
                      <button onClick={()=>setViewPost(null)}
                        style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:20 }}>
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  </div>

                  {viewPost.topic && (
                    <div style={{ marginBottom:12 }}>
                      <span style={{ color:T.muted, fontSize:11, background:T.border,
                        borderRadius:10, padding:'2px 10px', fontWeight:600 }}>
                        {viewPost.topic}
                      </span>
                    </div>
                  )}

                  <div style={{ background:T.pageBg, border:`1px solid ${T.border}`, borderRadius:10,
                    padding:16, marginBottom:16, color:T.text, fontSize:14, lineHeight:1.75,
                    whiteSpace:'pre-wrap', minHeight:100 }}>
                    {viewPost.content}
                  </div>

                  {(viewPost.keywords||viewPost.tone) && (
                    <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                      {viewPost.tone && <MetaChip icon="ti-mood-smile" label="Tone" value={viewPost.tone} />}
                      {viewPost.keywords && <MetaChip icon="ti-key" label="Keywords" value={viewPost.keywords} />}
                    </div>
                  )}

                  {/* Platform note - about Published status */}
                  <div style={{ background:T.cardBg2, border:`1px solid ${T.border}`, borderRadius:8,
                    padding:'10px 14px', marginBottom:16, fontSize:12, color:T.muted, lineHeight:1.6 }}>
                    <i className="ti ti-info-circle" style={{ marginRight:6, color:T.accent }} />
                    <strong style={{ color:T.textSub }}>About publishing:</strong> RankForged tracks status internally.
                    Copy this content and post it manually on {viewPost.platform.charAt(0).toUpperCase()+viewPost.platform.slice(1)},
                    then mark it Published here to keep your records accurate.
                    {viewPost.platform==='google' && ' Google Business Post: post.google.com'}
                    {viewPost.platform==='facebook' && ' Facebook: facebook.com'}
                    {viewPost.platform==='instagram' && ' Instagram: instagram.com'}
                    {viewPost.platform==='linkedin' && ' LinkedIn: linkedin.com'}
                  </div>

                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={()=>{ navigator.clipboard.writeText(viewPost.content) }}
                      style={{ flex:1, padding:'9px 0', background:T.cardBg2, border:`1px solid ${T.border2}`,
                        borderRadius:8, color:T.accentHi, fontSize:13, fontWeight:700, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      <i className="ti ti-copy" /> Copy Text
                    </button>
                    {na && (
                      <button onClick={()=>{ updateStatus(viewPost, na.next); setViewPost({...viewPost,status:na.next}) }}
                        style={{ flex:1, padding:'9px 0',
                          background: na.next==='published'?'linear-gradient(135deg,#10b981,#059669)':'linear-gradient(135deg,#f59e0b,#d97706)',
                          border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700,
                          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <i className={`ti ${na.next==='published'?'ti-check':'ti-calendar-event'}`} />
                        {na.label}
                      </button>
                    )}
                    <button onClick={()=>{ setEditing({...viewPost}); setModal(true); setViewPost(null) }}
                      style={{ padding:'9px 14px', background:'transparent', border:`1px solid ${T.border2}`,
                        borderRadius:8, color:T.muted, fontSize:13, cursor:'pointer' }}>
                      <i className="ti ti-pencil" />
                    </button>
                    <button onClick={()=>deletePost(viewPost.id)}
                      style={{ padding:'9px 14px', background:'transparent', border:'1px solid #2a1a1a',
                        borderRadius:8, color:T.red, fontSize:13, cursor:'pointer' }}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ════════════ NEW / EDIT POST MODAL ════════════ */}
      {modal && editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>{if(e.target===e.currentTarget){setModal(false);setEditing(null)}}}>
          <div style={{ background:'#0d1f3c', border:`1px solid #1a3560`, borderRadius:14,
            width:560, maxHeight:'88vh', overflowY:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
              <span style={{ fontWeight:800, color:T.text, fontSize:17 }}>
                {editing.id ? 'Edit Post' : 'New Post'}
              </span>
              <button onClick={()=>{setModal(false);setEditing(null)}}
                style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:20 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Row 1: Date + Platform */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={editing.post_date}
                  onChange={e=>setEditing(p=>({...p,post_date:e.target.value}))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Platform</label>
                <select value={editing.platform} onChange={e=>setEditing(p=>({...p,platform:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {PLATFORMS.map(pt=><option key={pt} value={pt}>{pt.charAt(0).toUpperCase()+pt.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Topic + Status */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={lbl}>Topic / Title</label>
                <input value={editing.topic||''} onChange={e=>setEditing(p=>({...p,topic:e.target.value}))}
                  placeholder="Short label for this post..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={editing.status||'draft'} onChange={e=>setEditing(p=>({...p,status:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {/* Row 3: Keywords */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>
                <i className="ti ti-key" style={{ marginRight:6, color:T.accent }} />
                Target Keywords
                <span style={{ color:T.muted, fontWeight:400, marginLeft:6 }}>(optional - AI will weave these in)</span>
              </label>
              <input value={editing.keywords||''} onChange={e=>setEditing(p=>({...p,keywords:e.target.value}))}
                placeholder="e.g. plumber Austin, emergency drain cleaning" style={inp} />
            </div>

            {/* Row 4: Tone + Length */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={lbl}>
                  <i className="ti ti-mood-smile" style={{ marginRight:6, color:T.accent }} />Tone
                </label>
                <select value={editing.tone||'Professional'} onChange={e=>setEditing(p=>({...p,tone:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {TONES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>
                  <i className="ti ti-text-size" style={{ marginRight:6, color:T.accent }} />Length
                </label>
                <select value={editing.length||'Medium (100-200 words)'} onChange={e=>setEditing(p=>({...p,length:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {LENGTHS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Content + AI button */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <label style={{ ...lbl, marginBottom:0 }}>Content</label>
                <button onClick={generateSinglePost} disabled={aiDraft}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 12px',
                    background:aiDraft?T.cardBg2:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                    color:aiDraft?T.muted:'#fff', border:'none', borderRadius:7,
                    fontSize:11, fontWeight:700, cursor:aiDraft?'not-allowed':'pointer' }}>
                  {aiDraft
                    ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Generating...</>
                    : <><i className="ti ti-sparkles" /> AI Draft</>}
                </button>
              </div>
              <textarea value={editing.content} onChange={e=>setEditing(p=>({...p,content:e.target.value}))}
                rows={7} placeholder="Write your post content here, or use AI Draft above..."
                style={{ ...inp, resize:'vertical', lineHeight:1.7 }} />
              <div style={{ textAlign:'right', fontSize:11, color:T.muted, marginTop:3 }}>{(editing.content||'').length} chars</div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setModal(false);setEditing(null)}}
                style={{ flex:1, padding:'10px 0', background:'transparent', color:T.muted,
                  border:`1px solid ${T.border2}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={()=>savePost(editing)} disabled={saving||!(editing.content||'').trim()}
                style={{ flex:2, padding:'10px 0', borderRadius:8, fontSize:13, fontWeight:700, border:'none',
                  cursor:saving||!(editing.content||'').trim()?'not-allowed':'pointer',
                  background:saving||!(editing.content||'').trim()?T.cardBg2:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  color:saving||!(editing.content||'').trim()?T.muted:'#fff' }}>
                {saving?'Saving...' : editing.id?'Save Changes':'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Post list (drafts / published tabs) ─────────────────────────────────────
function PostList({ posts, loading, onView, onEdit, onDelete, onStatus, nextStatusAction, emptyMsg, emptyAction }) {
  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:'#4a6080' }}>
      <i className="ti ti-loader-2" style={{ fontSize:32, display:'block', marginBottom:10, animation:'spin 1s linear infinite' }} />
      Loading...
    </div>
  )
  if (!posts.length) return (
    <div style={{ textAlign:'center', padding:60, color:'#4a6080' }}>
      <i className="ti ti-calendar-off" style={{ fontSize:40, display:'block', marginBottom:12 }} />
      <div style={{ fontSize:14, fontWeight:700, color:'#c8d8f0', marginBottom:6 }}>{emptyMsg}</div>
      {emptyAction && (
        <button onClick={emptyAction}
          style={{ marginTop:8, padding:'9px 20px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <i className="ti ti-sparkles" style={{ marginRight:6 }} /> AI Generate Month
        </button>
      )}
    </div>
  )

  // Group by date
  const byDate = {}
  posts.forEach(p => { if (!byDate[p.post_date]) byDate[p.post_date] = []; byDate[p.post_date].push(p) })

  return (
    <div>
      {Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([date, dp]) => (
        <div key={date} style={{ marginBottom:22 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#4a6080', marginBottom:8,
            textTransform:'uppercase', letterSpacing:1 }}>
            {new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {dp.map(p => (
              <MiniPostCard key={p.id} post={p}
                onView={()=>onView(p)}
                onEdit={()=>onEdit(p)}
                onDelete={()=>onDelete(p.id)}
                onStatus={(next)=>onStatus(p,next)}
                nextAction={nextStatusAction(p.status)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── MiniPostCard ─────────────────────────────────────────────────────────────
function MiniPostCard({ post, onView, onEdit, onDelete, onStatus, nextAction }) {
  const c = PC[post.platform]||PC.blog
  return (
    <div style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:10, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <i className={`ti ${c.icon}`} style={{ color:c.color, fontSize:14 }} />
          <span style={{ color:c.color, fontSize:12, fontWeight:700 }}>
            {post.platform.charAt(0).toUpperCase()+post.platform.slice(1)}
          </span>
          {post.topic && (
            <span style={{ color:'#4a6080', fontSize:11, background:'#0d1f3c',
              borderRadius:10, padding:'1px 9px', border:'1px solid #0f2040' }}>
              {post.topic}
            </span>
          )}
        </div>
        <Badge status={post.status} />
      </div>

      {/* Preview - click to open full view */}
      <div onClick={onView}
        style={{ color:'#c8d8f0', fontSize:12.5, lineHeight:1.6, marginBottom:10,
          maxHeight:64, overflow:'hidden', cursor:'pointer',
          display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' }}>
        {post.content}
      </div>

      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        {/* View full post */}
        <button onClick={onView}
          style={{ flex:1, padding:'5px 0', background:'#0d1f3c', border:`1px solid ${c.border}33`,
            borderRadius:7, color:c.color, fontSize:11, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
          <i className="ti ti-eye" /> View
        </button>
        {/* Next status action */}
        {nextAction && (
          <button onClick={()=>onStatus(nextAction.next)}
            style={{ flex:1, padding:'5px 0',
              background: nextAction.next==='published'?'#0d1f14':'#0d1a14',
              border:`1px solid ${nextAction.next==='published'?'#10b981':'#f59e0b'}`,
              borderRadius:7,
              color: nextAction.next==='published'?'#10b981':'#f59e0b',
              fontSize:11, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
            <i className={`ti ${nextAction.next==='published'?'ti-check':'ti-calendar-event'}`} />
            {nextAction.label}
          </button>
        )}
        <button onClick={onEdit}
          style={{ padding:'5px 10px', background:'transparent', border:'1px solid #1a3560',
            borderRadius:7, color:'#4a6080', fontSize:11, cursor:'pointer' }}>
          <i className="ti ti-pencil" />
        </button>
        <button onClick={onDelete}
          style={{ padding:'5px 10px', background:'transparent', border:'1px solid #2a1a1a',
            borderRadius:7, color:'#f87171', fontSize:11, cursor:'pointer' }}>
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  )
}

function MetaChip({ icon, label, value }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px',
      background:'#080f1e', border:'1px solid #0f2040', borderRadius:8 }}>
      <i className={`ti ${icon}`} style={{ color:'#4a6080', fontSize:12 }} />
      <span style={{ color:'#4a6080', fontSize:11, fontWeight:600 }}>{label}:</span>
      <span style={{ color:'#c8d8f0', fontSize:11 }}>{value}</span>
    </div>
  )
}