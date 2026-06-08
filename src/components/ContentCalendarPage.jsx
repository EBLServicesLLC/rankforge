import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

const PLATFORMS = ['google','facebook','instagram','linkedin','blog','email']
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const STATUS_META = {
  draft:     { label:'Draft',     bg:'#0d1a2a', color:'#4a6080' },
  scheduled: { label:'Scheduled', bg:'#0d1f14', color:'#10b981' },
  published: { label:'Published', bg:'#0d1430', color:'#60a5fa' },
}

function getDays(y,m){ return new Date(y,m+1,0).getDate() }
function getFirst(y,m){ return new Date(y,m,1).getDay() }
function pad(n){ return String(n).padStart(2,'0') }
function toDateStr(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}` }

const inp = {
  background:'#060d1a', border:`1px solid #1a3560`, borderRadius:8,
  color:'#e2e8f0', padding:'8px 12px', fontSize:13, width:'100%',
  boxSizing:'border-box', outline:'none',
}
const lbl = { color:'#c8d8f0', fontSize:12, fontWeight:600, marginBottom:4, display:'block' }

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft
  return <span style={{ background:m.bg, color:m.color, borderRadius:10, padding:'2px 9px', fontSize:10, fontWeight:700 }}>{m.label}</span>
}

function Btn({ children, onClick, disabled, variant='primary', small, style={} }) {
  const base = {
    display:'flex', alignItems:'center', gap:6,
    padding: small ? '6px 12px' : '9px 18px',
    borderRadius:8, fontSize: small ? 12 : 13, fontWeight:700,
    cursor: disabled ? 'not-allowed' : 'pointer', border:'none', transition:'opacity 0.15s',
    opacity: disabled ? 0.5 : 1,
  }
  const variants = {
    primary: { background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff' },
    ghost:   { background:'transparent', color:'#60a5fa', border:`1px solid #1a3560` },
    danger:  { background:'transparent', color:'#f87171', border:`1px solid #2a1a1a` },
  }
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ContentCalendarPage({ clientId, userId, bizName }) {
  const now      = new Date()
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate())

  const [tab,         setTab]         = useState('calendar')   // 'calendar' | 'drafts'
  const [viewYear,    setViewYear]    = useState(now.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(now.getMonth())
  const [posts,       setPosts]       = useState({})            // grouped by date string
  const [allDrafts,   setAllDrafts]   = useState([])            // flat list for drafts tab
  const [loading,     setLoading]     = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  // Generate panel
  const [genOpen,      setGenOpen]      = useState(false)
  const [genTopic,     setGenTopic]     = useState('')
  const [genPlatforms, setGenPlatforms] = useState(['google','facebook','instagram'])
  const [generating,   setGenerating]   = useState(false)
  const [genStatus,    setGenStatus]    = useState(null)        // null | {type:'ok'|'err', msg}

  // Post modal
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)

  // Business context for AI
  const [biz, setBiz] = useState({})
  useEffect(() => {
    if (!clientId || !userId) return
    supabase.from('client_data').select('*').eq('client_id', clientId).single()
      .then(({ data }) => { if (data) setBiz(data) })
  }, [clientId, userId])

  // ── Load posts for current month ──────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    if (!clientId || !userId) return
    setLoading(true)
    const start = toDateStr(viewYear, viewMonth, 1)
    const end   = toDateStr(viewYear, viewMonth, getDays(viewYear, viewMonth))
    const { data } = await supabase
      .from('content_calendar')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .gte('post_date', start)
      .lte('post_date', end)
      .order('post_date')
    const grouped = {}
    ;(data || []).forEach(p => {
      if (!grouped[p.post_date]) grouped[p.post_date] = []
      grouped[p.post_date].push(p)
    })
    setPosts(grouped)
    setAllDrafts(data || [])
    setLoading(false)
  }, [clientId, userId, viewYear, viewMonth])

  useEffect(() => { loadPosts() }, [loadPosts])

  // ── Save / upsert ──────────────────────────────────────────────────────────
  const savePost = async (post) => {
    setSaving(true)
    const row = { user_id:userId, client_id:clientId,
      post_date:post.post_date, platform:post.platform,
      content:post.content, topic:post.topic||'', status:post.status||'draft' }
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
    await supabase.from('content_calendar').delete().eq('id', id)
    loadPosts()
  }

  const markPublished = async (post) => {
    await supabase.from('content_calendar').update({ status:'published' }).eq('id', post.id)
    loadPosts()
  }

  // ── AI Generate ───────────────────────────────────────────────────────────
  const generate = async () => {
    if (!genPlatforms.length) return
    setGenerating(true)
    setGenStatus(null)

    const bizContext = [
      biz.biz_name   && `Business: ${biz.biz_name}`,
      biz.biz_cat    && `Category: ${biz.biz_cat}`,
      biz.biz_city   && `Location: ${biz.biz_city}, ${biz.biz_state||''}`,
      biz.biz_phone  && `Phone: ${biz.biz_phone}`,
      biz.biz_website&& `Website: ${biz.biz_website}`,
      biz.biz_kw     && `Keywords: ${biz.biz_kw}`,
      biz.biz_desc   && `About: ${biz.biz_desc}`,
    ].filter(Boolean).join('\n') || `Business: ${bizName || 'Local Business'}`

    const prompt = `You are a local SEO content strategist creating a month of social media content.

${bizContext}
${genTopic ? `Campaign focus: ${genTopic}` : ''}
Month: ${MONTHS[viewMonth]} ${viewYear}
Platforms: ${genPlatforms.join(', ')}

Generate 16-20 posts spread across the month (roughly 2-3 per week per platform selected).
Return ONLY a valid JSON array with no markdown fences, no explanation.
Each object must have exactly these keys:
- post_date: "YYYY-MM-DD" within ${MONTHS[viewMonth]} ${viewYear}
- platform: one of: ${genPlatforms.join(', ')}
- content: the full post text appropriate for that platform's style and length
- topic: 2-4 word label summarising the post

Spread dates evenly. Vary topics. Use a local, authentic voice. Return only the JSON array.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4000,
          messages: [{ role:'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        setGenStatus({ type:'err', msg:`API error ${res.status}: ${err.slice(0,120)}` })
        setGenerating(false)
        return
      }

      const data = await res.json()
      const raw  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')

      let parsed
      try {
        // strip possible markdown fences
        const clean = raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim()
        parsed = JSON.parse(clean)
        if (!Array.isArray(parsed)) throw new Error('Not an array')
      } catch (e) {
        setGenStatus({ type:'err', msg:`Could not parse AI response. Try again. (${e.message})` })
        setGenerating(false)
        return
      }

      const rows = parsed
        .filter(p => p.post_date && p.platform && p.content)
        .map(p => ({
          user_id: userId, client_id: clientId,
          post_date: p.post_date, platform: p.platform,
          content: p.content, topic: p.topic || '', status: 'draft',
        }))

      if (!rows.length) {
        setGenStatus({ type:'err', msg:'AI returned 0 valid posts. Try again.' })
        setGenerating(false)
        return
      }

      await supabase.from('content_calendar').insert(rows)
      setGenStatus({ type:'ok', msg:`${rows.length} draft posts saved to calendar. See them below or in Drafts.` })
      setGenOpen(false)
      setGenTopic('')
      loadPosts()
      setTab('calendar')   // bring user back to calendar to see results
    } catch (err) {
      setGenStatus({ type:'err', msg: err.message })
    }
    setGenerating(false)
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11) }
    else setViewMonth(m => m-1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0) }
    else setViewMonth(m => m+1)
    setSelectedDay(null)
  }

  const daysInMonth = getDays(viewYear, viewMonth)
  const firstDay    = getFirst(viewYear, viewMonth)
  const allPostsFlat = Object.values(posts).flat()

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding:24, background:T.pageBg, minHeight:'100%', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>
            <i className="ti ti-calendar-event" style={{ color:T.accent, marginRight:10 }} />
            Content Calendar
          </div>
          {bizName && <div style={{ color:T.muted, fontSize:13, marginTop:3 }}>{bizName} — {MONTHS[viewMonth]} {viewYear}</div>}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Btn variant="ghost" onClick={() => { setEditing({ post_date: todayStr, platform:'google', content:'', topic:'', status:'draft' }); setModal(true) }}>
            <i className="ti ti-plus" /> New Post
          </Btn>
          <Btn onClick={() => { setGenOpen(o=>!o); setGenStatus(null) }}>
            <i className="ti ti-sparkles" /> AI Generate Month
          </Btn>
        </div>
      </div>

      {/* ── AI Generate Panel ── */}
      {genOpen && (
        <div style={{ background:T.cardBg, border:`1px solid ${T.border2}`, borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <i className="ti ti-sparkles" style={{ color:T.accent, fontSize:16 }} />
            <span style={{ fontWeight:700, color:T.text, fontSize:15 }}>
              Generate content for {MONTHS[viewMonth]} {viewYear}
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Campaign topic or focus <span style={{ color:T.muted, fontWeight:400 }}>(optional)</span></label>
              <input value={genTopic} onChange={e=>setGenTopic(e.target.value)}
                placeholder="e.g. summer sale, new location, holiday hours..."
                style={inp} />
            </div>
            <div>
              <label style={lbl}>Platforms to generate for</label>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:4 }}>
                {PLATFORMS.map(p => {
                  const c = PC[p], on = genPlatforms.includes(p)
                  return (
                    <button key={p}
                      onClick={() => setGenPlatforms(prev => on ? prev.filter(x=>x!==p) : [...prev,p])}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px',
                        borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                        border:`1px solid ${on ? c.border : T.border}`,
                        background: on ? c.bg : 'transparent',
                        color: on ? c.color : T.muted }}>
                      <i className={`ti ${c.icon}`} />
                      {p.charAt(0).toUpperCase()+p.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <Btn onClick={generate} disabled={generating || !genPlatforms.length}>
              {generating
                ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Generating...</>
                : <><i className="ti ti-wand" /> Generate {genPlatforms.length} platform{genPlatforms.length!==1?'s':''} for {MONTHS[viewMonth]}</>
              }
            </Btn>
            <Btn variant="ghost" small onClick={()=>setGenOpen(false)}>Cancel</Btn>
          </div>

          {genStatus && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8,
              background: genStatus.type==='ok' ? '#0d1f14' : '#1f0d0d',
              border:`1px solid ${genStatus.type==='ok' ? T.green : T.red}`,
              color: genStatus.type==='ok' ? T.green : T.red, fontSize:13 }}>
              <i className={`ti ${genStatus.type==='ok'?'ti-check':'ti-alert-circle'}`} style={{ marginRight:8 }} />
              {genStatus.msg}
            </div>
          )}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        {[
          { id:'calendar', icon:'ti-calendar', label:'Calendar View' },
          { id:'drafts',   icon:'ti-list',     label:`Drafts & Posts (${allPostsFlat.length})` },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
              background:'transparent', border:'none', borderBottom:`2px solid ${tab===t.id?T.accent:'transparent'}`,
              color: tab===t.id ? T.accentHi : T.muted, fontSize:13, fontWeight:700,
              cursor:'pointer', marginBottom:-1 }}>
            <i className={`ti ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB: CALENDAR
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'calendar' && (
        <div style={{ display:'grid', gridTemplateColumns: selectedDay ? '1fr 340px' : '1fr', gap:16, alignItems:'start' }}>

          {/* Calendar card */}
          <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:12 }}>

            {/* Month nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
              <button onClick={prevMonth} style={{ background:'transparent', border:`1px solid ${T.border2}`,
                borderRadius:8, color:T.textSub, padding:'6px 12px', cursor:'pointer' }}>
                <i className="ti ti-chevron-left" />
              </button>
              <span style={{ fontWeight:800, color:T.text, fontSize:16 }}>{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} style={{ background:'transparent', border:`1px solid ${T.border2}`,
                borderRadius:8, color:T.textSub, padding:'6px 12px', cursor:'pointer' }}>
                <i className="ti ti-chevron-right" />
              </button>
            </div>

            {/* Day labels */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 12px 0' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign:'center', color:T.muted, fontSize:11, fontWeight:700, paddingBottom:8 }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, padding:'0 12px 14px' }}>
              {/* Empty lead cells */}
              {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i} />)}

              {Array.from({length:daysInMonth}).map((_,i) => {
                const day = i + 1
                const ds  = toDateStr(viewYear, viewMonth, day)
                const dp  = posts[ds] || []
                const isToday    = ds === todayStr
                const isSelected = selectedDay === day

                return (
                  <div key={day} onClick={()=>setSelectedDay(isSelected ? null : day)}
                    style={{ minHeight:78, borderRadius:8, padding:'6px 7px',
                      background: isSelected ? '#1a3060' : isToday ? '#0d1f3c' : 'transparent',
                      border:`1px solid ${isSelected ? T.accent : isToday ? T.border2 : T.border}`,
                      cursor:'pointer', transition:'border-color 0.15s' }}>
                    <div style={{ fontSize:12, fontWeight: isToday ? 800 : 500,
                      color: isToday ? T.accentHi : T.textSub, marginBottom:4 }}>{day}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {dp.slice(0,8).map((p,pi) => (
                        <div key={pi}
                          title={`${p.platform}: ${p.topic || p.content.slice(0,50)}`}
                          style={{ width:7, height:7, borderRadius:'50%', background: PC[p.platform]?.border || T.muted }} />
                      ))}
                      {dp.length > 8 && <span style={{ fontSize:9, color:T.muted }}>+{dp.length-8}</span>}
                    </div>
                    {dp.length > 0 && (
                      <div style={{ marginTop:3, fontSize:10, color:T.muted }}>{dp.length} post{dp.length>1?'s':''}</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Platform legend */}
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', padding:'12px 18px',
              borderTop:`1px solid ${T.border}` }}>
              {PLATFORMS.map(p => (
                <div key={p} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:PC[p].border }} />
                  <span style={{ color:T.muted, fontSize:11 }}>{p.charAt(0).toUpperCase()+p.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected day panel */}
          {selectedDay && (() => {
            const ds = toDateStr(viewYear, viewMonth, selectedDay)
            const dp = posts[ds] || []
            return (
              <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ fontWeight:700, color:T.text, fontSize:14 }}>
                    <i className="ti ti-calendar-day" style={{ color:T.accent, marginRight:8 }} />
                    {MONTHS[viewMonth]} {selectedDay}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn small variant="ghost" onClick={() => {
                      setEditing({ post_date:ds, platform:'google', content:'', topic:'', status:'draft' })
                      setModal(true)
                    }}>
                      <i className="ti ti-plus" /> Add
                    </Btn>
                    <button onClick={()=>setSelectedDay(null)}
                      style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:16 }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
                <div style={{ padding:12, maxHeight:520, overflowY:'auto' }}>
                  {dp.length === 0 ? (
                    <div style={{ textAlign:'center', color:T.muted, padding:'30px 0', fontSize:13 }}>
                      <i className="ti ti-calendar-off" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                      No posts scheduled
                    </div>
                  ) : dp.map(p => <PostCard key={p.id} post={p} onEdit={()=>{setEditing(p);setModal(true)}} onDelete={()=>deletePost(p.id)} onPublish={()=>markPublished(p)} />)}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB: DRAFTS LIST
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 'drafts' && (
        <div>
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:T.muted }}>
              <i className="ti ti-loader-2" style={{ fontSize:28, display:'block', marginBottom:8, animation:'spin 1s linear infinite' }} />
              Loading posts...
            </div>
          ) : allDrafts.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:T.muted }}>
              <i className="ti ti-calendar-off" style={{ fontSize:40, display:'block', marginBottom:12 }} />
              <div style={{ fontSize:15, fontWeight:700, color:T.textSub, marginBottom:6 }}>No posts this month yet</div>
              <div style={{ fontSize:13, marginBottom:18 }}>Use AI Generate to fill the calendar, or add posts manually.</div>
              <Btn onClick={()=>setGenOpen(true)}><i className="ti ti-sparkles" /> AI Generate Month</Btn>
            </div>
          ) : (
            <div>
              {/* Group by date */}
              {Object.entries(posts)
                .sort(([a],[b]) => a.localeCompare(b))
                .map(([date, dayPosts]) => (
                  <div key={date} style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.muted, marginBottom:8,
                      textTransform:'uppercase', letterSpacing:1 }}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
                      {dayPosts.map(p => (
                        <PostCard key={p.id} post={p}
                          onEdit={()=>{setEditing(p);setModal(true)}}
                          onDelete={()=>deletePost(p.id)}
                          onPublish={()=>markPublished(p)} />
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* ── Post Edit / Create Modal ── */}
      {modal && editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e=>{ if(e.target===e.currentTarget){setModal(false);setEditing(null)} }}>
          <div style={{ background:'#0d1f3c', border:`1px solid #1a3560`, borderRadius:14,
            width:520, maxHeight:'85vh', overflowY:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <span style={{ fontWeight:800, color:T.text, fontSize:17 }}>
                {editing.id ? 'Edit Post' : 'New Post'}
              </span>
              <button onClick={()=>{setModal(false);setEditing(null)}}
                style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:20 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Date */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Date</label>
              <input type="date" value={editing.post_date}
                onChange={e=>setEditing(p=>({...p, post_date:e.target.value}))}
                style={inp} />
            </div>

            {/* Platform + Status */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={lbl}>Platform</label>
                <select value={editing.platform} onChange={e=>setEditing(p=>({...p,platform:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {PLATFORMS.map(pt=>(
                    <option key={pt} value={pt}>{pt.charAt(0).toUpperCase()+pt.slice(1)}</option>
                  ))}
                </select>
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

            {/* Topic */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Topic <span style={{ color:T.muted, fontWeight:400 }}>(short label)</span></label>
              <input value={editing.topic||''} onChange={e=>setEditing(p=>({...p,topic:e.target.value}))}
                placeholder="e.g. summer promo, new hours..." style={inp} />
            </div>

            {/* Content */}
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Content</label>
              <textarea value={editing.content} onChange={e=>setEditing(p=>({...p,content:e.target.value}))}
                rows={7} placeholder="Write your post content here..."
                style={{ ...inp, resize:'vertical', lineHeight:1.65 }} />
              <div style={{ textAlign:'right', fontSize:11, color:T.muted, marginTop:4 }}>
                {editing.content.length} chars
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <Btn variant="ghost" onClick={()=>{setModal(false);setEditing(null)}} style={{ flex:1, justifyContent:'center' }}>
                Cancel
              </Btn>
              <button onClick={()=>savePost(editing)} disabled={saving || !editing.content.trim()}
                style={{ flex:2, padding:'10px 0', borderRadius:8, fontSize:13, fontWeight:700,
                  cursor: saving||!editing.content.trim() ? 'not-allowed' : 'pointer',
                  background: saving||!editing.content.trim() ? T.cardBg2 : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  color: saving||!editing.content.trim() ? T.muted : '#fff', border:'none' }}>
                {saving ? 'Saving...' : editing.id ? 'Save Changes' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── PostCard ─────────────────────────────────────────────────────────────────
function PostCard({ post, onEdit, onDelete, onPublish }) {
  const c = PC[post.platform] || PC.blog
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
      <div style={{ color:'#e2e8f0', fontSize:12.5, lineHeight:1.65,
        whiteSpace:'pre-wrap', marginBottom:10, maxHeight:120, overflowY:'auto' }}>
        {post.content}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {post.status !== 'published' && (
          <button onClick={onPublish}
            style={{ flex:1, padding:'5px 0', background:'#0d1f14', border:'1px solid #10b981',
              borderRadius:7, color:'#10b981', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            <i className="ti ti-check" style={{ marginRight:4 }} />Mark Published
          </button>
        )}
        <button onClick={onEdit}
          style={{ padding:'5px 12px', background:'transparent', border:'1px solid #1a3560',
            borderRadius:7, color:'#4a6080', fontSize:11, cursor:'pointer' }}>
          <i className="ti ti-pencil" />
        </button>
        <button onClick={onDelete}
          style={{ padding:'5px 12px', background:'transparent', border:'1px solid #2a1a1a',
            borderRadius:7, color:'#f87171', fontSize:11, cursor:'pointer' }}>
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  )
}
