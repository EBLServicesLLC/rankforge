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

const PLATFORM_COLORS = {
  google:    { bg:'#1a2a1a', border:'#10b981', text:'#10b981', icon:'ti-brand-google' },
  facebook:  { bg:'#1a1f3a', border:'#3b82f6', text:'#60a5fa', icon:'ti-brand-facebook' },
  instagram: { bg:'#2a1a2a', border:'#8b5cf6', text:'#a78bfa', icon:'ti-brand-instagram' },
  linkedin:  { bg:'#1a2535', border:'#22d3ee', text:'#22d3ee', icon:'ti-brand-linkedin' },
  blog:      { bg:'#2a1a10', border:'#f97316', text:'#fb923c', icon:'ti-file-text' },
  email:     { bg:'#2a1a1a', border:'#f87171', text:'#fca5a5', icon:'ti-mail' },
}

const POST_TYPES = ['google','facebook','instagram','linkedin','blog','email']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function Card({ children, style }) {
  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:12, ...style }}>
      {children}
    </div>
  )
}
function CardHead({ icon, title, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <i className={`ti ${icon}`} style={{ color:T.accent, fontSize:16 }} />
        <span style={{ fontWeight:700, color:T.text, fontSize:14 }}>{title}</span>
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

export default function ContentCalendarPage({ clientId, userId, bizName }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState({})          // key: "YYYY-MM-DD", value: array of posts
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editPost, setEditPost] = useState(null)   // post being edited/created
  const [genPlatforms, setGenPlatforms] = useState(['google','facebook','instagram'])
  const [genTopic, setGenTopic] = useState('')
  const [genMonthMode, setGenMonthMode] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [bizProfile, setBizProfile] = useState({})
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [showGenPanel, setShowGenPanel] = useState(false)

  // Load business profile for AI context
  useEffect(() => {
    if (!clientId || !userId) return
    supabase.from('client_data').select('*').eq('client_id', clientId).single()
      .then(({ data }) => { if (data) setBizProfile(data) })
  }, [clientId, userId])

  // Load posts from Supabase
  const loadPosts = useCallback(async () => {
    if (!clientId || !userId) return
    setLoading(true)
    const startDate = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01`
    const endDate = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${getDaysInMonth(viewYear,viewMonth)}`
    const { data } = await supabase
      .from('content_calendar')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .gte('post_date', startDate)
      .lte('post_date', endDate)
      .order('post_date', { ascending: true })
    if (data) {
      const grouped = {}
      data.forEach(p => {
        if (!grouped[p.post_date]) grouped[p.post_date] = []
        grouped[p.post_date].push(p)
      })
      setPosts(grouped)
    } else {
      setPosts({})
    }
    setLoading(false)
  }, [clientId, userId, viewYear, viewMonth])

  useEffect(() => { loadPosts() }, [loadPosts])

  // Save / upsert a post
  const savePost = async (post) => {
    setSaving(true)
    const row = {
      user_id: userId,
      client_id: clientId,
      post_date: post.post_date,
      platform: post.platform,
      content: post.content,
      status: post.status || 'draft',
      topic: post.topic || '',
    }
    let result
    if (post.id) {
      result = await supabase.from('content_calendar').update(row).eq('id', post.id)
    } else {
      result = await supabase.from('content_calendar').insert(row)
    }
    setSaving(false)
    if (!result.error) {
      setShowModal(false)
      setEditPost(null)
      loadPosts()
    }
  }

  // Delete a post
  const deletePost = async (id) => {
    await supabase.from('content_calendar').delete().eq('id', id)
    loadPosts()
  }

  // AI generate posts
  const generatePosts = async (forDate) => {
    if (!genPlatforms.length) return
    setGenerating(true)
    setAiStatus('Calling Claude...')

    const biz = bizProfile
    const context = `Business: ${biz.biz_name || bizName || 'Unknown'}
Category: ${biz.biz_cat || ''}
Location: ${biz.biz_city || ''}, ${biz.biz_state || ''}
Phone: ${biz.biz_phone || ''}
Website: ${biz.biz_website || ''}
Keywords: ${biz.biz_kw || ''}
Description: ${biz.biz_desc || ''}`

    const targetDate = forDate || `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-15`
    const topicLine = genTopic ? `Topic/focus: ${genTopic}` : ''

    const prompt = genMonthMode
      ? `You are a local SEO content strategist. Generate a month of social posts for a local business.

${context}
${topicLine}
Month: ${MONTHS[viewMonth]} ${viewYear}
Platforms: ${genPlatforms.join(', ')}

Return ONLY a JSON array. Each item must have exactly these fields:
- post_date: "YYYY-MM-DD" (spread across the month, 1-2 posts per platform)
- platform: one of ${genPlatforms.map(p=>`"${p}"`).join(', ')}
- content: post text (platform-appropriate length and tone)
- topic: brief topic label (2-4 words)

Spread posts across the month. Return 15-20 posts total. No markdown, no explanation, just the JSON array.`
      : `You are a local SEO content strategist. Generate social media posts for a local business.

${context}
${topicLine}
Date: ${targetDate}
Platforms: ${genPlatforms.join(', ')}

Return ONLY a JSON array. Each item must have exactly these fields:
- post_date: "${targetDate}"
- platform: one of ${genPlatforms.map(p=>`"${p}"`).join(', ')}
- content: post text (platform-appropriate length and tone)
- topic: brief topic label (2-4 words)

Return one post per platform. No markdown, no explanation, just the JSON array.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const raw = data.content?.[0]?.text || ''
      let parsed
      try {
        const clean = raw.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        setAiStatus('Parse error - try again')
        setGenerating(false)
        return
      }

      setAiStatus(`Saving ${parsed.length} posts...`)
      const rows = parsed.map(p => ({
        user_id: userId,
        client_id: clientId,
        post_date: p.post_date,
        platform: p.platform,
        content: p.content,
        topic: p.topic || '',
        status: 'draft',
      }))
      await supabase.from('content_calendar').insert(rows)
      setAiStatus(`Done - ${parsed.length} posts created`)
      loadPosts()
      setShowGenPanel(false)
      setGenTopic('')
    } catch (err) {
      setAiStatus('Error: ' + err.message)
    }
    setGenerating(false)
  }

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  const calCells = []
  for (let i = 0; i < firstDay; i++) calCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d)

  function dateStr(d) {
    return `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11) }
    else setViewMonth(m=>m-1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0) }
    else setViewMonth(m=>m+1)
  }

  // Count posts by platform for stats
  const allPosts = Object.values(posts).flat()
  const platformCounts = POST_TYPES.reduce((acc, p) => {
    acc[p] = allPosts.filter(x => x.platform === p).length
    return acc
  }, {})

  const inp = {
    background:'#060d1a', border:`1px solid ${T.border2}`, borderRadius:8,
    color:T.text, padding:'8px 12px', fontSize:13, width:'100%', boxSizing:'border-box', outline:'none'
  }
  const lbl = { color:T.textSub, fontSize:12, fontWeight:600, marginBottom:4, display:'block' }

  // Selected day posts (filtered)
  const selectedDateStr = selectedDay ? dateStr(selectedDay) : null
  const dayPosts = selectedDateStr
    ? (posts[selectedDateStr] || []).filter(p => filterPlatform === 'all' || p.platform === filterPlatform)
    : []

  return (
    <div style={{ padding:'24px', background:T.pageBg, minHeight:'100%', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:T.text, letterSpacing:'-0.5px' }}>
            <i className="ti ti-calendar-event" style={{ color:T.accent, marginRight:10 }} />
            Content Calendar
          </div>
          {bizName && <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>{bizName}</div>}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => { setShowGenPanel(p=>!p); setAiStatus('') }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px',
              background:showGenPanel?'#1d4ed8':'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <i className="ti ti-sparkles" />
            AI Generate
          </button>
          <button onClick={() => {
              setEditPost({ post_date: dateStr(now.getDate()), platform:'google', content:'', status:'draft', topic:'' })
              setShowModal(true)
            }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px',
              background:'transparent', color:T.accentHi, border:`1px solid ${T.border2}`,
              borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            <i className="ti ti-plus" />
            Add Post
          </button>
        </div>
      </div>

      {/* AI Generate Panel */}
      {showGenPanel && (
        <Card style={{ marginBottom:20, padding:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <i className="ti ti-sparkles" style={{ color:T.accent, fontSize:16 }} />
            <span style={{ fontWeight:700, color:T.text, fontSize:14 }}>AI Content Generator</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Topic or Focus (optional)</label>
              <input value={genTopic} onChange={e=>setGenTopic(e.target.value)}
                placeholder="e.g. summer promotion, new service, holiday..." style={inp} />
            </div>
            <div>
              <label style={lbl}>Mode</label>
              <div style={{ display:'flex', gap:8, marginTop:2 }}>
                {[['single','Single Day'],['month','Full Month']].map(([v,l])=>(
                  <button key={v} onClick={()=>setGenMonthMode(v==='month')}
                    style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:13, fontWeight:600,
                      cursor:'pointer', border:`1px solid ${(genMonthMode===(v==='month'))?T.accent:T.border2}`,
                      background:(genMonthMode===(v==='month'))?'#1d3a6a':'transparent',
                      color:(genMonthMode===(v==='month'))?T.accentHi:T.muted }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Platforms</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {POST_TYPES.map(p => {
                const col = PLATFORM_COLORS[p]
                const active = genPlatforms.includes(p)
                return (
                  <button key={p} onClick={()=>setGenPlatforms(prev=>active?prev.filter(x=>x!==p):[...prev,p])}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                      borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:`1px solid ${active?col.border:T.border}`,
                      background:active?col.bg:'transparent', color:active?col.text:T.muted }}>
                    <i className={`ti ${col.icon}`} />
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>generatePosts(null)} disabled={generating || !genPlatforms.length}
              style={{ padding:'9px 24px', borderRadius:8, fontSize:13, fontWeight:700,
                cursor:generating||!genPlatforms.length?'not-allowed':'pointer',
                background:generating||!genPlatforms.length?'#0d1f3c':'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color:generating||!genPlatforms.length?T.muted:'#fff', border:'none' }}>
              {generating ? 'Generating...' : `Generate for ${genMonthMode?MONTHS[viewMonth]:selectedDay?dateStr(selectedDay):'this month'}`}
            </button>
            {aiStatus && (
              <span style={{ fontSize:12, color:aiStatus.includes('Error')||aiStatus.includes('error')?T.red:T.green }}>
                {aiStatus}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10,
          padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
          <i className="ti ti-layout-grid" style={{ color:T.accent }} />
          <span style={{ color:T.text, fontWeight:700, fontSize:15 }}>{allPosts.length}</span>
          <span style={{ color:T.muted, fontSize:12 }}>total posts</span>
        </div>
        {POST_TYPES.filter(p=>platformCounts[p]>0).map(p=>{
          const col = PLATFORM_COLORS[p]
          return (
            <div key={p} style={{ background:col.bg, border:`1px solid ${col.border}`,
              borderRadius:10, padding:'10px 18px', display:'flex', alignItems:'center', gap:8 }}>
              <i className={`ti ${col.icon}`} style={{ color:col.text }} />
              <span style={{ color:col.text, fontWeight:700, fontSize:15 }}>{platformCounts[p]}</span>
              <span style={{ color:col.text, fontSize:12, opacity:0.7 }}>{p}</span>
            </div>
          )
        })}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {['all',...POST_TYPES].map(p=>(
            <button key={p} onClick={()=>setFilterPlatform(p)}
              style={{ padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:600,
                cursor:'pointer', border:`1px solid ${filterPlatform===p?T.accent:T.border}`,
                background:filterPlatform===p?'#1d3a6a':'transparent',
                color:filterPlatform===p?T.accentHi:T.muted }}>
              {p==='all'?'All':p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar + Side panel */}
      <div style={{ display:'grid', gridTemplateColumns: selectedDay ? '1fr 340px' : '1fr', gap:16 }}>

        {/* Calendar grid */}
        <Card>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:`1px solid ${T.border}` }}>
            <button onClick={prevMonth} style={{ background:'transparent', border:`1px solid ${T.border2}`, borderRadius:8,
              color:T.textSub, padding:'6px 12px', cursor:'pointer', fontSize:13 }}>
              <i className="ti ti-chevron-left" />
            </button>
            <span style={{ fontWeight:800, color:T.text, fontSize:16 }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background:'transparent', border:`1px solid ${T.border2}`, borderRadius:8,
              color:T.textSub, padding:'6px 12px', cursor:'pointer', fontSize:13 }}>
              <i className="ti ti-chevron-right" />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 14px 0' }}>
            {DAYS.map(d=>(
              <div key={d} style={{ textAlign:'center', color:T.muted, fontSize:11, fontWeight:700, paddingBottom:8 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, padding:'0 14px 14px' }}>
            {calCells.map((day, i) => {
              if (!day) return <div key={i} />
              const ds = dateStr(day)
              const dayPts = (posts[ds] || []).filter(p => filterPlatform==='all' || p.platform===filterPlatform)
              const isToday = ds === todayStr
              const isSelected = selectedDay === day
              const hasPosts = dayPts.length > 0

              return (
                <div key={i} onClick={()=>setSelectedDay(isSelected?null:day)}
                  style={{ minHeight:80, borderRadius:8, padding:'6px 7px',
                    background:isSelected?'#1d3a6a':isToday?'#0d1f3c':'transparent',
                    border:`1px solid ${isSelected?T.accent:isToday?T.border2:T.border}`,
                    cursor:'pointer', transition:'all 0.15s' }}>
                  <div style={{ fontSize:12, fontWeight:isToday?800:600,
                    color:isToday?T.accentHi:T.textSub, marginBottom:4 }}>
                    {day}
                  </div>
                  {/* Post dots */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                    {dayPts.slice(0,6).map((p,pi)=>{
                      const col = PLATFORM_COLORS[p.platform]
                      return (
                        <div key={pi} title={`${p.platform}: ${p.topic||p.content.slice(0,40)}`}
                          style={{ width:8, height:8, borderRadius:'50%', background:col.border }} />
                      )
                    })}
                    {dayPts.length > 6 && (
                      <span style={{ fontSize:9, color:T.muted }}>+{dayPts.length-6}</span>
                    )}
                  </div>
                  {hasPosts && (
                    <div style={{ marginTop:3, fontSize:10, color:T.muted }}>{dayPts.length} post{dayPts.length>1?'s':''}</div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Side panel - selected day */}
        {selectedDay && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Card>
              <CardHead
                icon="ti-calendar-day"
                title={`${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`}
                right={
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>generatePosts(dateStr(selectedDay))} disabled={generating}
                      title="AI generate for this day"
                      style={{ padding:'5px 10px', borderRadius:8, fontSize:12, cursor:'pointer',
                        background:'transparent', color:T.accent, border:`1px solid ${T.border2}` }}>
                      <i className="ti ti-sparkles" />
                    </button>
                    <button onClick={()=>{
                        setEditPost({ post_date:dateStr(selectedDay), platform:'google', content:'', status:'draft', topic:'' })
                        setShowModal(true)
                      }}
                      style={{ padding:'5px 10px', borderRadius:8, fontSize:12, cursor:'pointer',
                        background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', border:'none' }}>
                      <i className="ti ti-plus" />
                    </button>
                  </div>
                }
              />
              <div style={{ padding:'12px', maxHeight:480, overflowY:'auto' }}>
                {dayPosts.length === 0 ? (
                  <div style={{ textAlign:'center', color:T.muted, fontSize:13, padding:'20px 0' }}>
                    <i className="ti ti-calendar-off" style={{ fontSize:28, display:'block', marginBottom:8 }} />
                    No posts scheduled
                  </div>
                ) : dayPosts.map(p => {
                  const col = PLATFORM_COLORS[p.platform] || PLATFORM_COLORS.blog
                  return (
                    <div key={p.id} style={{ background:col.bg, border:`1px solid ${col.border}`,
                      borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <i className={`ti ${col.icon}`} style={{ color:col.text, fontSize:14 }} />
                          <span style={{ color:col.text, fontSize:12, fontWeight:700 }}>
                            {p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}
                          </span>
                          {p.topic && (
                            <span style={{ color:T.muted, fontSize:11, background:T.border,
                              borderRadius:10, padding:'1px 8px' }}>{p.topic}</span>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:4 }}>
                          <StatusBadge status={p.status} />
                          <button onClick={()=>{setEditPost(p);setShowModal(true)}}
                            style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:13 }}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button onClick={()=>deletePost(p.id)}
                            style={{ background:'transparent', border:'none', color:T.red, cursor:'pointer', fontSize:13 }}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </div>
                      <div style={{ color:T.text, fontSize:12.5, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                        {p.content}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && editPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:T.cardBg, border:`1px solid ${T.border2}`, borderRadius:14,
            width:520, maxHeight:'80vh', overflowY:'auto', padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
              <span style={{ fontWeight:800, color:T.text, fontSize:16 }}>
                {editPost.id ? 'Edit Post' : 'New Post'}
              </span>
              <button onClick={()=>{setShowModal(false);setEditPost(null)}}
                style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Date</label>
              <input type="date" value={editPost.post_date}
                onChange={e=>setEditPost(p=>({...p,post_date:e.target.value}))} style={inp} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={lbl}>Platform</label>
                <select value={editPost.platform} onChange={e=>setEditPost(p=>({...p,platform:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  {POST_TYPES.map(pt=>(
                    <option key={pt} value={pt}>{pt.charAt(0).toUpperCase()+pt.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select value={editPost.status || 'draft'} onChange={e=>setEditPost(p=>({...p,status:e.target.value}))}
                  style={{ ...inp, cursor:'pointer' }}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Topic</label>
              <input value={editPost.topic || ''} onChange={e=>setEditPost(p=>({...p,topic:e.target.value}))}
                placeholder="Brief topic label..." style={inp} />
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={lbl}>Content</label>
              <textarea value={editPost.content} onChange={e=>setEditPost(p=>({...p,content:e.target.value}))}
                rows={6} placeholder="Post content..." style={{ ...inp, resize:'vertical', lineHeight:1.6 }} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{setShowModal(false);setEditPost(null)}}
                style={{ flex:1, padding:'10px 0', background:'transparent', color:T.muted,
                  border:`1px solid ${T.border2}`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={()=>savePost(editPost)} disabled={saving||!editPost.content.trim()}
                style={{ flex:2, padding:'10px 0', borderRadius:8, fontSize:13, fontWeight:700,
                  cursor:saving||!editPost.content.trim()?'not-allowed':'pointer',
                  background:saving||!editPost.content.trim()?T.cardBg2:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  color:saving||!editPost.content.trim()?T.muted:'#fff', border:'none' }}>
                {saving ? 'Saving...' : editPost.id ? 'Save Changes' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft:     { bg:'#1a2535', color:'#4a6080', label:'Draft' },
    scheduled: { bg:'#1a2a1a', color:'#10b981', label:'Scheduled' },
    published: { bg:'#1a2030', color:'#3b82f6', label:'Published' },
  }
  const s = map[status] || map.draft
  return (
    <span style={{ background:s.bg, color:s.color, borderRadius:10,
      padding:'2px 8px', fontSize:10, fontWeight:700 }}>
      {s.label}
    </span>
  )
}
