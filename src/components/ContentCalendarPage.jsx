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
const TONES     = ['Professional','Friendly','Urgent','Inspirational','Humorous','Educational','Promotional']
const LENGTHS   = ['Short (50-100 words)','Medium (100-200 words)','Long (200-400 words)']

function getDays(y,m)  { return new Date(y,m+1,0).getDate() }
function getFirst(y,m) { return new Date(y,m,1).getDay() }
function pad(n)        { return String(n).padStart(2,'0') }
function toDS(y,m,d)   { return `${y}-${pad(m+1)}-${pad(d)}` }

const field = {
  background:'#060d1a', border:'1px solid #1a3560', borderRadius:8,
  color:'#e2e8f0', padding:'9px 12px', fontSize:13,
  width:'100%', boxSizing:'border-box', outline:'none',
}
const lbl = { color:'#94a3b8', fontSize:11, fontWeight:700, marginBottom:5,
  display:'block', textTransform:'uppercase', letterSpacing:'0.5px' }

async function callClaude(apiKey, prompt, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens || 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error('API error ' + res.status + ': ' + t.slice(0, 150))
  }
  const data = await res.json()
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
}

// ============================================================
export default function ContentCalendarPage({ clientId, userId, bizName }) {
  const now      = new Date()
  const todayStr = toDS(now.getFullYear(), now.getMonth(), now.getDate())

  // View
  const [mainTab,     setMainTab]     = useState('create')   // 'create' | 'posts'
  const [viewYear,    setViewYear]    = useState(now.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const [calDayPosts, setCalDayPosts] = useState([])

  // Data
  const [posts,     setPosts]   = useState({})   // grouped by date for calendar
  const [allPosts,  setAllPosts] = useState([])
  const [apiKey,    setApiKey]  = useState('')
  const [biz,       setBiz]     = useState({})
  const [loading,   setLoading] = useState(true)

  // Generator form
  const [platform,  setPlatform]  = useState('google')
  const [postDate,  setPostDate]  = useState(todayStr)
  const [topic,     setTopic]     = useState('')
  const [keywords,  setKeywords]  = useState('')
  const [tone,      setTone]      = useState('Professional')
  const [postLen,   setPostLen]   = useState('Medium (100-200 words)')
  const [repurpose, setRepurpose] = useState(false)
  const [article,   setArticle]   = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')

  // Preview cards (approve / reject)
  const [previews, setPreviews] = useState([])   // [{platform, post_date, content, topic, approved}]

  // Saving
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // View / edit modal
  const [editPost,    setEditPost]    = useState(null)
  const [editSaving,  setEditSaving]  = useState(false)
  const [editTab,     setEditTab]     = useState('edit')   // 'edit' | 'rewrite'
  const [rewriteTone, setRewriteTone] = useState('Professional')
  const [rewriteLen,  setRewriteLen]  = useState('Medium (100-200 words)')
  const [rewriting,   setRewriting]   = useState(false)

  // Posts view filter
  const [filterPlatform, setFilterPlatform] = useState('all')

  // Load settings + biz
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
    // refresh selected day
    if (selectedDay) {
      const ds = toDS(viewYear, viewMonth, selectedDay)
      setCalDayPosts(grouped[ds] || [])
    }
  }, [clientId, userId, viewYear, viewMonth, selectedDay])

  useEffect(() => { loadPosts() }, [loadPosts])

  function bizCtx() {
    return [
      (biz.biz_name || bizName) && 'Business: ' + (biz.biz_name || bizName),
      biz.biz_cat     && 'Category: '  + biz.biz_cat,
      biz.biz_city    && 'Location: '  + biz.biz_city + (biz.biz_state ? ', ' + biz.biz_state : ''),
      biz.biz_phone   && 'Phone: '     + biz.biz_phone,
      biz.biz_website && 'Website: '   + biz.biz_website,
      biz.biz_kw      && 'Keywords: '  + biz.biz_kw,
      biz.biz_desc    && 'About: '     + biz.biz_desc,
    ].filter(Boolean).join('\n') || ('Business: ' + (bizName || 'Local Business'))
  }

  // Generate single post
  const handleGenerate = async () => {
    if (!apiKey) { setGenError('No Anthropic API key found. Add it in the API Keys tab.'); return }
    setGenerating(true)
    setGenError('')
    setPreviews([])

    const lenMap = {
      'Short (50-100 words)':   '50-100 words',
      'Medium (100-200 words)': '100-200 words',
      'Long (200-400 words)':   '200-400 words',
    }

    let prompt
    if (repurpose && article.trim()) {
      prompt = `You are a social media content strategist.

${bizCtx()}

ORIGINAL ARTICLE TO REPURPOSE:
${article.slice(0, 3000)}

Create social media posts for the following platforms by repurposing the article above.
Platforms: ${platform === 'all' ? PLATFORMS.join(', ') : platform}
Tone: ${tone}
Length per post: ${lenMap[postLen]}
Date to schedule: ${postDate}
${keywords ? 'Keywords to include: ' + keywords : ''}

Return ONLY a valid JSON array. No markdown. No explanation. Each object:
{ "platform": "...", "post_date": "${postDate}", "content": "...", "topic": "Repurposed post" }`
    } else {
      const platforms = platform === 'all' ? PLATFORMS : [platform]
      prompt = `You are a local SEO content strategist.

${bizCtx()}

Create ${platforms.length > 1 ? 'one post per platform' : 'a social media post'} with these settings:
Platform${platforms.length > 1 ? 's' : ''}: ${platforms.join(', ')}
${topic    ? 'Topic: '    + topic    : ''}
${keywords ? 'Keywords to include: ' + keywords : ''}
Tone: ${tone}
Length: ${lenMap[postLen]}
Date: ${postDate}

Return ONLY a valid JSON array. No markdown. No explanation. Each object:
{ "platform": "...", "post_date": "${postDate}", "content": "...", "topic": "${topic || 'Social post'}" }`
    }

    try {
      const raw   = await callClaude(apiKey, prompt, 3000)
      const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      let parsed
      try { parsed = JSON.parse(clean) } catch { throw new Error('Could not parse AI response. Try again.') }
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('AI returned no posts. Try again.')
      setPreviews(parsed.map(p => ({ ...p, approved: true })))
    } catch (err) {
      setGenError(err.message)
    }
    setGenerating(false)
  }

  // Save approved previews
  const saveApproved = async () => {
    const toSave = previews.filter(p => p.approved)
    if (!toSave.length) { setSaveMsg('No posts selected.'); return }
    setSaving(true)
    const rows = toSave.map(p => ({
      user_id: userId, client_id: clientId,
      post_date: p.post_date, platform: p.platform,
      content: p.content, topic: p.topic || '',
      status: 'draft', keywords, tone, length: postLen,
    }))
    await supabase.from('content_calendar').insert(rows)
    setSaving(false)
    setSaveMsg(toSave.length + ' post' + (toSave.length > 1 ? 's' : '') + ' saved to calendar.')
    setPreviews([])
    loadPosts()
    setTimeout(() => setSaveMsg(''), 4000)
  }

  // Save edit
  const saveEdit = async () => {
    if (!editPost) return
    setEditSaving(true)
    const row = {
      post_date: editPost.post_date, platform: editPost.platform,
      content: editPost.content, topic: editPost.topic || '',
      status: editPost.status || 'draft',
    }
    if (editPost.id) {
      await supabase.from('content_calendar').update(row).eq('id', editPost.id)
    } else {
      await supabase.from('content_calendar').insert({ ...row, user_id: userId, client_id: clientId })
    }
    setEditSaving(false)
    setEditPost(null)
    loadPosts()
  }

  const rewritePost = async () => {
    if (!apiKey || !editPost) return
    setRewriting(true)
    const lenMap = {
      'Short (50-100 words)':   '50-100 words',
      'Medium (100-200 words)': '100-200 words',
      'Long (200-400 words)':   '200-400 words',
    }
    const prompt = `Rewrite the following social media post for ${editPost.platform} in a ${rewriteTone} tone.
Length: ${lenMap[rewriteLen]}
${bizCtx()}

ORIGINAL POST:
${editPost.content}

Return only the rewritten post text, no explanation or labels.`
    try {
      const result = await callClaude(apiKey, prompt, 1000)
      setEditPost(p => ({ ...p, content: result.trim() }))
      setEditTab('edit')
    } catch (err) {
      alert('Rewrite error: ' + err.message)
    }
    setRewriting(false)
  }


    if (!window.confirm('Delete this post?')) return
    await supabase.from('content_calendar').delete().eq('id', id)
    loadPosts()
  }

  const setStatus = async (id, status) => {
    await supabase.from('content_calendar').update({ status }).eq('id', id)
    loadPosts()
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null); setCalDayPosts([])
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null); setCalDayPosts([])
  }

  function clickDay(day) {
    const ds = toDS(viewYear, viewMonth, day)
    setSelectedDay(day)
    setCalDayPosts(posts[ds] || [])
  }

  const daysInMonth = getDays(viewYear, viewMonth)
  const firstDay    = getFirst(viewYear, viewMonth)
  const filteredPosts = filterPlatform === 'all'
    ? allPosts
    : allPosts.filter(p => p.platform === filterPlatform)
  const byPlatform = {}
  filteredPosts.forEach(p => {
    if (!byPlatform[p.platform]) byPlatform[p.platform] = []
    byPlatform[p.platform].push(p)
  })

  // ============================================================
  return (
    <div style={{ background:T.pageBg, minHeight:'100%', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        .rf-btn:hover { opacity:0.85 }
        .rf-day:hover { border-color:#3b82f6 !important; cursor:pointer }
        .rf-post-card:hover { border-color:#3b82f6 !important }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.5) }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ padding:'20px 24px 0', borderBottom:'1px solid #0f2040', marginBottom:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:16 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.text }}>
              <i className="ti ti-calendar-event" style={{ color:T.accent, marginRight:10 }} />
              Content Calendar
            </div>
            {bizName && <div style={{ color:T.muted, fontSize:13, marginTop:2 }}>{bizName}</div>}
          </div>
          {saveMsg && (
            <div style={{ padding:'8px 16px', background:'#0d1f14', border:'1px solid #10b981',
              borderRadius:8, color:'#10b981', fontSize:13, fontWeight:600 }}>
              <i className="ti ti-check" style={{ marginRight:6 }} />{saveMsg}
            </div>
          )}
        </div>

        {/* Main tabs */}
        <div style={{ display:'flex', gap:0 }}>
          {[
            { id:'create', icon:'ti-sparkles',   label:'Create Posts'   },
            { id:'posts',  icon:'ti-layout-list', label:'All Posts (' + allPosts.length + ')' },
          ].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 22px',
                background:'transparent', border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
                borderBottom:'3px solid ' + (mainTab === t.id ? T.accent : 'transparent'),
                color: mainTab === t.id ? T.accentHi : T.muted, marginBottom:-1 }}>
              <i className={'ti ' + t.icon} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          TAB: CREATE POSTS
          Left = generator form | Right = calendar
      ============================================================ */}
      {mainTab === 'create' && (
        <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:0, minHeight:'calc(100vh - 120px)' }}>

          {/* ── LEFT: Generator form ── */}
          <div style={{ borderRight:'1px solid #0f2040', padding:20, overflowY:'auto' }}>

            {!apiKey && (
              <div style={{ padding:'10px 14px', background:'#1f0d05', border:'1px solid #f97316',
                borderRadius:8, color:'#fb923c', fontSize:12, marginBottom:16 }}>
                <i className="ti ti-alert-circle" style={{ marginRight:6 }} />
                No API key found. Add your Anthropic key in the API Keys tab to generate content.
              </div>
            )}

            {/* Repurpose toggle */}
            <div style={{ display:'flex', gap:0, marginBottom:18, background:'#080f1e',
              border:'1px solid #0f2040', borderRadius:10, padding:4 }}>
              <button onClick={() => setRepurpose(false)}
                style={{ flex:1, padding:'8px 0', borderRadius:7, fontSize:12, fontWeight:700,
                  cursor:'pointer', border:'none',
                  background: !repurpose ? T.accent : 'transparent',
                  color: !repurpose ? '#fff' : T.muted }}>
                <i className="ti ti-sparkles" style={{ marginRight:5 }} />Write New Post
              </button>
              <button onClick={() => setRepurpose(true)}
                style={{ flex:1, padding:'8px 0', borderRadius:7, fontSize:12, fontWeight:700,
                  cursor:'pointer', border:'none',
                  background: repurpose ? T.cyan : 'transparent',
                  color: repurpose ? '#fff' : T.muted }}>
                <i className="ti ti-refresh" style={{ marginRight:5 }} />Repurpose Article
              </button>
            </div>

            {/* Platform */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Platform</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                {[...PLATFORMS, 'all'].map(p => {
                  const c  = PC[p] || { bg:'#1a2535', border:T.accent, color:T.accentHi, icon:'ti-apps' }
                  const on = platform === p
                  return (
                    <button key={p} onClick={() => setPlatform(p)}
                      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                        padding:'8px 6px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
                        border:'1px solid ' + (on ? c.border : T.border),
                        background: on ? c.bg : 'transparent',
                        color: on ? c.color : T.muted }}>
                      <i className={'ti ' + (p === 'all' ? 'ti-apps' : c.icon)} />
                      {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Schedule Date</label>
              <input type="date" value={postDate} onChange={e => setPostDate(e.target.value)} style={field} />
            </div>

            {/* Repurpose: article textarea */}
            {repurpose && (
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Paste Article or Blog Post</label>
                <textarea value={article} onChange={e => setArticle(e.target.value)}
                  rows={6} placeholder="Paste the full article text here. Claude will adapt it for each selected platform..."
                  style={{ ...field, resize:'vertical', lineHeight:1.6 }} />
              </div>
            )}

            {/* Topic (only for new post) */}
            {!repurpose && (
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Topic or Focus</label>
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. new service launch, summer promo, holiday hours..."
                  style={field} />
              </div>
            )}

            {/* Keywords */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Target Keywords <span style={{ color:T.muted, fontWeight:400, textTransform:'none' }}>(optional)</span></label>
              <input value={keywords} onChange={e => setKeywords(e.target.value)}
                placeholder="e.g. plumber Austin, emergency drain repair"
                style={field} />
            </div>

            {/* Tone */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Tone</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    style={{ padding:'7px 10px', borderRadius:8, fontSize:12, fontWeight:600,
                      cursor:'pointer', border:'1px solid ' + (tone === t ? T.accent : T.border),
                      background: tone === t ? '#1d3a6a' : 'transparent',
                      color: tone === t ? T.accentHi : T.muted, textAlign:'left' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Post Length</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {LENGTHS.map(l => (
                  <button key={l} onClick={() => setPostLen(l)}
                    style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                      cursor:'pointer', border:'1px solid ' + (postLen === l ? T.accent : T.border),
                      background: postLen === l ? '#1d3a6a' : 'transparent',
                      color: postLen === l ? T.accentHi : T.muted, textAlign:'left' }}>
                    {postLen === l && <i className="ti ti-check" style={{ marginRight:8, color:T.accent }} />}
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating || !apiKey}
              className="rf-btn"
              style={{ width:'100%', padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:800,
                cursor: generating || !apiKey ? 'not-allowed' : 'pointer', border:'none',
                background: generating || !apiKey ? T.cardBg2 : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color: generating || !apiKey ? T.muted : '#fff',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              {generating
                ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Generating...</>
                : <><i className="ti ti-sparkles" /> Generate Post{platform === 'all' ? 's (All Platforms)' : ''}</>}
            </button>

            {genError && (
              <div style={{ marginTop:12, padding:'10px 14px', background:'#1f0d0d',
                border:'1px solid ' + T.red, borderRadius:8, color:T.red, fontSize:12 }}>
                <i className="ti ti-alert-circle" style={{ marginRight:6 }} />{genError}
              </div>
            )}

            {/* Preview cards */}
            {previews.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>
                  <i className="ti ti-eye" style={{ color:T.accent, marginRight:8 }} />
                  Review Generated Posts
                </div>

                {previews.map((p, i) => {
                  const c = PC[p.platform] || PC.blog
                  return (
                    <div key={i} style={{ marginBottom:12, borderRadius:10, overflow:'hidden',
                      border:'1px solid ' + (p.approved ? c.border : T.border),
                      background: p.approved ? c.bg : T.cardBg2, opacity: p.approved ? 1 : 0.5 }}>
                      {/* Card header */}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'10px 14px', borderBottom:'1px solid ' + (p.approved ? c.border + '44' : T.border) }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <i className={'ti ' + c.icon} style={{ color:c.color, fontSize:14 }} />
                          <span style={{ color:c.color, fontSize:12, fontWeight:700 }}>
                            {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                          </span>
                          <span style={{ color:T.muted, fontSize:11 }}>{p.post_date}</span>
                        </div>
                        {/* Approve toggle */}
                        <button onClick={() => setPreviews(prev => prev.map((x,j) => j===i ? {...x,approved:!x.approved} : x))}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
                            borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
                            border:'1px solid ' + (p.approved ? T.green : T.border),
                            background: p.approved ? '#0d1f14' : 'transparent',
                            color: p.approved ? T.green : T.muted }}>
                          <i className={'ti ' + (p.approved ? 'ti-check' : 'ti-x')} />
                          {p.approved ? 'Approved' : 'Rejected'}
                        </button>
                      </div>
                      {/* Content */}
                      <div style={{ padding:'10px 14px' }}>
                        <textarea
                          value={p.content}
                          onChange={e => setPreviews(prev => prev.map((x,j) => j===i ? {...x,content:e.target.value} : x))}
                          rows={4}
                          style={{ ...field, resize:'vertical', lineHeight:1.65, fontSize:12,
                            border:'1px solid ' + T.border, borderRadius:6 }} />
                      </div>
                    </div>
                  )
                })}

                {/* Save bar */}
                <div style={{ position:'sticky', bottom:0, background:T.pageBg,
                  borderTop:'1px solid ' + T.border, padding:'12px 0', marginTop:8 }}>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => setPreviews([])}
                      style={{ flex:1, padding:'10px 0', background:'transparent',
                        border:'1px solid ' + T.border2, borderRadius:8, color:T.muted,
                        fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      Discard All
                    </button>
                    <button onClick={saveApproved} disabled={saving}
                      className="rf-btn"
                      style={{ flex:2, padding:'10px 0',
                        background:'linear-gradient(135deg,#10b981,#059669)',
                        border:'none', borderRadius:8, color:'#fff',
                        fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      {saving
                        ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Saving...</>
                        : <><i className="ti ti-calendar-plus" /> Save {previews.filter(p=>p.approved).length} Post{previews.filter(p=>p.approved).length!==1?'s':''} to Calendar</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Calendar ── */}
          <div style={{ padding:20, overflowY:'auto' }}>
            <div style={{ background:T.cardBg, border:'1px solid ' + T.border, borderRadius:12 }}>

              {/* Month nav */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'14px 20px', borderBottom:'1px solid ' + T.border }}>
                <button onClick={prevMonth}
                  style={{ background:'transparent', border:'1px solid ' + T.border2,
                    borderRadius:8, color:T.textSub, padding:'6px 14px', cursor:'pointer' }}>
                  <i className="ti ti-chevron-left" />
                </button>
                <span style={{ fontWeight:800, color:T.text, fontSize:16 }}>
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth}
                  style={{ background:'transparent', border:'1px solid ' + T.border2,
                    borderRadius:8, color:T.textSub, padding:'6px 14px', cursor:'pointer' }}>
                  <i className="ti ti-chevron-right" />
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'10px 14px 0' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign:'center', color:T.muted, fontSize:11, fontWeight:700, paddingBottom:8 }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, padding:'0 14px 14px' }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day   = i + 1
                  const ds    = toDS(viewYear, viewMonth, day)
                  const dp    = posts[ds] || []
                  const isToday    = ds === todayStr
                  const isSelected = selectedDay === day
                  return (
                    <div key={day} className="rf-day" onClick={() => clickDay(day)}
                      style={{ minHeight:72, borderRadius:8, padding:'6px 7px',
                        background: isSelected ? '#1a3060' : isToday ? '#0d1f3c' : 'transparent',
                        border:'1px solid ' + (isSelected ? T.accent : isToday ? T.border2 : T.border) }}>
                      <div style={{ fontSize:12, fontWeight: isToday ? 800 : 500,
                        color: isToday ? T.accentHi : T.textSub, marginBottom:4 }}>{day}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                        {dp.slice(0, 6).map((p, pi) => (
                          <div key={pi} title={p.platform + ': ' + (p.topic || p.content.slice(0, 40))}
                            style={{ width:8, height:8, borderRadius:'50%',
                              background: PC[p.platform]?.border || T.muted }} />
                        ))}
                        {dp.length > 6 && <span style={{ fontSize:9, color:T.muted }}>+{dp.length - 6}</span>}
                      </div>
                      {dp.length > 0 && (
                        <div style={{ marginTop:3, fontSize:10, color:T.muted }}>
                          {dp.length} post{dp.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:14, flexWrap:'wrap', padding:'10px 18px',
                borderTop:'1px solid ' + T.border }}>
                {PLATFORMS.map(p => (
                  <div key={p} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:PC[p].border }} />
                    <span style={{ color:T.muted, fontSize:11 }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected day posts */}
            {selectedDay !== null && (
              <div style={{ marginTop:16, background:T.cardBg, border:'1px solid ' + T.border, borderRadius:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'13px 18px', borderBottom:'1px solid ' + T.border }}>
                  <span style={{ fontWeight:700, color:T.text, fontSize:14 }}>
                    <i className="ti ti-calendar-day" style={{ color:T.accent, marginRight:8 }} />
                    {MONTHS[viewMonth]} {selectedDay} posts
                  </span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { setEditPost({ post_date: toDS(viewYear,viewMonth,selectedDay), platform:'google', content:'', topic:'', status:'draft' }); }}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                        background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff',
                        border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      <i className="ti ti-plus" /> Add Manual Post
                    </button>
                    <button onClick={() => { setSelectedDay(null); setCalDayPosts([]) }}
                      style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:18 }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>
                <div style={{ padding:14 }}>
                  {calDayPosts.length === 0 ? (
                    <div style={{ textAlign:'center', color:T.muted, padding:'20px 0', fontSize:13 }}>
                      No posts on this day. Use the generator on the left or click Add Manual Post.
                    </div>
                  ) : calDayPosts.map(p => (
                    <DayPostRow key={p.id} post={p}
                      onEdit={() => setEditPost({ ...p })}
                      onDelete={() => deletePost(p.id)}
                      onStatus={s => setStatus(p.id, s)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB: ALL POSTS - grouped by platform
      ============================================================ */}
      {mainTab === 'posts' && (
        <div style={{ padding:24 }}>

          {/* Platform filter */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ color:T.muted, fontSize:12, fontWeight:700, marginRight:4 }}>FILTER:</span>
            {['all', ...PLATFORMS].map(p => {
              const c  = PC[p] || { border:T.accent, color:T.accentHi, bg:'#1d3a6a' }
              const on = filterPlatform === p
              return (
                <button key={p} onClick={() => setFilterPlatform(p)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
                    borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
                    border:'1px solid ' + (on ? c.border : T.border),
                    background: on ? c.bg : 'transparent',
                    color: on ? c.color : T.muted }}>
                  {p !== 'all' && <i className={'ti ' + PC[p].icon} />}
                  {p === 'all' ? 'All Platforms' : p.charAt(0).toUpperCase() + p.slice(1)}
                  {on && p !== 'all' && <span style={{ background:c.border + '33', borderRadius:10, padding:'1px 7px', fontSize:10 }}>
                    {(byPlatform[p] || []).length}
                  </span>}
                </button>
              )
            })}
            <button onClick={() => { setEditPost({ post_date:todayStr, platform:'google', content:'', topic:'', status:'draft' }) }}
              style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'7px 16px',
                background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', border:'none',
                borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              <i className="ti ti-plus" /> Add Post Manually
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:T.muted }}>
              <i className="ti ti-loader-2" style={{ fontSize:32, display:'block', marginBottom:10, animation:'spin 1s linear infinite' }} />
              Loading posts...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:T.muted }}>
              <i className="ti ti-calendar-off" style={{ fontSize:40, display:'block', marginBottom:12 }} />
              <div style={{ fontSize:15, fontWeight:700, color:T.textSub, marginBottom:6 }}>No posts this month</div>
              <div style={{ fontSize:13, marginBottom:20 }}>Use the Create Posts tab to generate content.</div>
              <button onClick={() => setMainTab('create')}
                style={{ padding:'10px 24px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                <i className="ti ti-sparkles" style={{ marginRight:6 }} />Create Posts
              </button>
            </div>
          ) : (
            /* Grouped by platform */
            Object.entries(byPlatform).map(([plat, platPosts]) => {
              const c = PC[plat] || PC.blog
              return (
                <div key={plat} style={{ marginBottom:28 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ width:3, height:20, background:c.border, borderRadius:2 }} />
                    <i className={'ti ' + c.icon} style={{ color:c.color, fontSize:16 }} />
                    <span style={{ fontWeight:800, color:T.text, fontSize:15 }}>
                      {plat.charAt(0).toUpperCase() + plat.slice(1)}
                    </span>
                    <span style={{ color:T.muted, fontSize:12 }}>{platPosts.length} post{platPosts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
                    {platPosts.sort((a,b) => a.post_date.localeCompare(b.post_date)).map(p => (
                      <PostCard key={p.id} post={p}
                        onEdit={() => setEditPost({ ...p })}
                        onDelete={() => deletePost(p.id)}
                        onStatus={s => setStatus(p.id, s)} />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Edit / Rewrite modal ── */}
      {editPost && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setEditPost(null); setEditTab('edit') } }}>
          <div style={{ background:'#0d1f3c', border:'1px solid #1a3560', borderRadius:14,
            width:580, maxHeight:'90vh', overflowY:'auto' }}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'18px 24px', borderBottom:'1px solid #0f2040' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <i className={'ti ' + (PC[editPost.platform]?.icon || 'ti-file')}
                  style={{ color: PC[editPost.platform]?.color || T.accent, fontSize:18 }} />
                <span style={{ fontWeight:800, color:T.text, fontSize:17 }}>
                  {editPost.id ? 'View / Edit Post' : 'Add Post Manually'}
                </span>
              </div>
              <button onClick={() => { setEditPost(null); setEditTab('edit') }}
                style={{ background:'transparent', border:'none', color:T.muted, cursor:'pointer', fontSize:22 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Sub-tabs for existing posts */}
            {editPost.id && (
              <div style={{ display:'flex', borderBottom:'1px solid #0f2040' }}>
                {[
                  { id:'edit',    label:'Edit Post',       icon:'ti-pencil'   },
                  { id:'rewrite', label:'Rewrite with AI', icon:'ti-sparkles' },
                ].map(t => (
                  <button key={t.id} onClick={() => setEditTab(t.id)}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'11px 22px',
                      background:'transparent', border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
                      borderBottom:'3px solid ' + (editTab === t.id ? T.accent : 'transparent'),
                      color: editTab === t.id ? T.accentHi : T.muted, marginBottom:-1 }}>
                    <i className={'ti ' + t.icon} />{t.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding:24 }}>
              {/* EDIT TAB */}
              {(editTab === 'edit' || !editPost.id) && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div>
                      <label style={lbl}>Date</label>
                      <input type="date" value={editPost.post_date}
                        onChange={e => setEditPost(p => ({ ...p, post_date:e.target.value }))} style={field} />
                    </div>
                    <div>
                      <label style={lbl}>Platform</label>
                      <select value={editPost.platform}
                        onChange={e => setEditPost(p => ({ ...p, platform:e.target.value }))}
                        style={{ ...field, cursor:'pointer' }}>
                        {PLATFORMS.map(pt => <option key={pt} value={pt}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                    <div>
                      <label style={lbl}>Topic</label>
                      <input value={editPost.topic || ''}
                        onChange={e => setEditPost(p => ({ ...p, topic:e.target.value }))}
                        placeholder="Short label..." style={field} />
                    </div>
                    <div>
                      <label style={lbl}>Status</label>
                      <select value={editPost.status || 'draft'}
                        onChange={e => setEditPost(p => ({ ...p, status:e.target.value }))}
                        style={{ ...field, cursor:'pointer' }}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <label style={{ ...lbl, marginBottom:0 }}>Content</label>
                      <button onClick={() => navigator.clipboard.writeText(editPost.content || '')}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
                          background:'transparent', border:'1px solid ' + T.border2,
                          borderRadius:6, color:T.muted, fontSize:11, cursor:'pointer' }}>
                        <i className="ti ti-copy" /> Copy
                      </button>
                    </div>
                    <textarea value={editPost.content || ''}
                      onChange={e => setEditPost(p => ({ ...p, content:e.target.value }))}
                      rows={9} placeholder="Post content..."
                      style={{ ...field, resize:'vertical', lineHeight:1.7 }} />
                    <div style={{ textAlign:'right', fontSize:11, color:T.muted, marginTop:3 }}>
                      {(editPost.content || '').length} chars
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => { setEditPost(null); setEditTab('edit') }}
                      style={{ flex:1, padding:'10px 0', background:'transparent', color:T.muted,
                        border:'1px solid ' + T.border2, borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={saveEdit} disabled={editSaving || !(editPost.content || '').trim()}
                      style={{ flex:2, padding:'10px 0', borderRadius:8, fontSize:13, fontWeight:700, border:'none',
                        cursor: editSaving || !(editPost.content || '').trim() ? 'not-allowed' : 'pointer',
                        background: editSaving || !(editPost.content || '').trim()
                          ? T.cardBg2 : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                        color: editSaving || !(editPost.content || '').trim() ? T.muted : '#fff' }}>
                      {editSaving ? 'Saving...' : editPost.id ? 'Save Changes' : 'Add to Calendar'}
                    </button>
                  </div>
                </>
              )}

              {/* REWRITE TAB */}
              {editTab === 'rewrite' && editPost.id && (
                <>
                  <div style={{ background:T.pageBg, border:'1px solid ' + T.border,
                    borderRadius:9, padding:14, marginBottom:18 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:8,
                      textTransform:'uppercase', letterSpacing:'0.5px' }}>Current Content</div>
                    <div style={{ color:T.textSub, fontSize:13, lineHeight:1.65, whiteSpace:'pre-wrap' }}>
                      {editPost.content}
                    </div>
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <label style={lbl}>New Tone</label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                      {TONES.map(t => (
                        <button key={t} onClick={() => setRewriteTone(t)}
                          style={{ padding:'8px 10px', borderRadius:8, fontSize:12, fontWeight:600,
                            cursor:'pointer', textAlign:'left',
                            border:'1px solid ' + (rewriteTone === t ? T.accent : T.border),
                            background: rewriteTone === t ? '#1d3a6a' : 'transparent',
                            color: rewriteTone === t ? T.accentHi : T.muted }}>
                          {rewriteTone === t && <i className="ti ti-check" style={{ marginRight:6, color:T.accent }} />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:24 }}>
                    <label style={lbl}>New Length</label>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {LENGTHS.map(l => (
                        <button key={l} onClick={() => setRewriteLen(l)}
                          style={{ padding:'9px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                            cursor:'pointer', textAlign:'left',
                            border:'1px solid ' + (rewriteLen === l ? T.accent : T.border),
                            background: rewriteLen === l ? '#1d3a6a' : 'transparent',
                            color: rewriteLen === l ? T.accentHi : T.muted }}>
                          {rewriteLen === l && <i className="ti ti-check" style={{ marginRight:8, color:T.accent }} />}
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={rewritePost} disabled={rewriting || !apiKey}
                    style={{ width:'100%', padding:'12px 0', borderRadius:10, fontSize:14, fontWeight:800,
                      cursor: rewriting || !apiKey ? 'not-allowed' : 'pointer', border:'none',
                      background: rewriting || !apiKey ? T.cardBg2 : 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                      color: rewriting || !apiKey ? T.muted : '#fff',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    {rewriting
                      ? <><i className="ti ti-loader-2" style={{ animation:'spin 1s linear infinite' }} /> Rewriting...</>
                      : <><i className="ti ti-sparkles" /> Rewrite Post</>}
                  </button>
                  <div style={{ marginTop:10, fontSize:12, color:T.muted, textAlign:'center' }}>
                    Rewritten content will appear in the Edit Post tab ready to save.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Day post row (compact, for calendar day panel) ────────────────────────────
function DayPostRow({ post, onEdit, onDelete, onStatus }) {
  const c = PC[post.platform] || PC.blog
  const statusColors = {
    draft:     { color:'#4a6080', next:'scheduled', nextLabel:'Mark Scheduled' },
    scheduled: { color:'#f59e0b', next:'published',  nextLabel:'Mark Published'  },
    published: { color:'#10b981', next:null,          nextLabel:null              },
  }
  const sm = statusColors[post.status] || statusColors.draft
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
      background:c.bg, border:'1px solid ' + c.border + '66', borderRadius:9, marginBottom:8 }}>
      <i className={'ti ' + c.icon} style={{ color:c.color, fontSize:14, marginTop:2 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          <span style={{ color:c.color, fontSize:12, fontWeight:700 }}>
            {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
          </span>
          {post.topic && <span style={{ color:T.muted, fontSize:11 }}>{post.topic}</span>}
          <span style={{ color:sm.color, fontSize:10, fontWeight:700, marginLeft:'auto' }}>
            {post.status.toUpperCase()}
          </span>
        </div>
        <div style={{ color:T.textSub, fontSize:12, lineHeight:1.55,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {post.content}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {sm.next && (
          <button onClick={() => onStatus(sm.next)}
            style={{ padding:'3px 8px', background:'transparent', border:'1px solid ' + sm.color,
              borderRadius:5, color:sm.color, fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            {sm.nextLabel}
          </button>
        )}
        <button onClick={onEdit}
          style={{ padding:'3px 8px', background:'transparent', border:'1px solid ' + T.border2,
            borderRadius:5, color:T.muted, fontSize:10, cursor:'pointer' }}>
          Edit
        </button>
        <button onClick={onDelete}
          style={{ padding:'3px 8px', background:'transparent', border:'1px solid #2a1a1a',
            borderRadius:5, color:T.red, fontSize:10, cursor:'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Post card (All Posts tab) ─────────────────────────────────────────────────
function PostCard({ post, onEdit, onDelete, onStatus }) {
  const c = PC[post.platform] || PC.blog
  const statusMap = {
    draft:     { bg:'#0d1a2a', color:'#4a6080', label:'Draft',     next:'scheduled', nextLabel:'Mark Scheduled', nextColor:'#f59e0b' },
    scheduled: { bg:'#1a1a0d', color:'#f59e0b', label:'Scheduled', next:'published',  nextLabel:'Mark Published',  nextColor:'#10b981' },
    published: { bg:'#0d1f14', color:'#10b981', label:'Published', next:null,          nextLabel:null,              nextColor:null      },
  }
  const sm = statusMap[post.status] || statusMap.draft
  return (
    <div className="rf-post-card" style={{ background:c.bg, border:'1px solid ' + c.border + '88',
      borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 14px', borderBottom:'1px solid ' + c.border + '44' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <i className={'ti ' + c.icon} style={{ color:c.color }} />
          {post.topic && <span style={{ color:T.muted, fontSize:11, fontWeight:600 }}>{post.topic}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ background:sm.bg, color:sm.color, borderRadius:10,
            padding:'2px 8px', fontSize:10, fontWeight:700 }}>{sm.label}</span>
          <span style={{ color:T.muted, fontSize:11 }}>{post.post_date}</span>
        </div>
      </div>
      {/* Content */}
      <div style={{ padding:'10px 14px', flex:1 }}>
        <div style={{ color:T.text, fontSize:13, lineHeight:1.65,
          overflow:'hidden', display:'-webkit-box', WebkitLineClamp:4, WebkitBoxOrient:'vertical' }}>
          {post.content}
        </div>
      </div>
      {/* Actions */}
      <div style={{ display:'flex', gap:0, borderTop:'1px solid ' + c.border + '44' }}>
        {sm.next && (
          <button onClick={() => onStatus(sm.next)}
            style={{ flex:2, padding:'9px 0', background:'transparent', border:'none',
              borderRight:'1px solid ' + c.border + '44',
              color:sm.nextColor, fontSize:11, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <i className="ti ti-check" />{sm.nextLabel}
          </button>
        )}
        <button onClick={onEdit}
          style={{ flex:2, padding:'9px 0', background:'transparent', border:'none',
            borderRight:'1px solid ' + c.border + '44',
            color:T.accentHi, fontSize:11, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <i className="ti ti-pencil" /> View / Edit
        </button>
        <button onClick={onDelete}
          style={{ flex:1, padding:'9px 0', background:'transparent',
            border:'none', color:T.red, fontSize:11, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
          <i className="ti ti-trash" /> Delete
        </button>
      </div>
    </div>
  )
}
