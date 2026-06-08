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
  google:    { bg:'#0a1a0f', border:'#10b981', color:'#10b981', icon:'ti-brand-google'    },
  facebook:  { bg:'#0a0f1a', border:'#3b82f6', color:'#60a5fa', icon:'ti-brand-facebook'  },
  instagram: { bg:'#160a1a', border:'#8b5cf6', color:'#a78bfa', icon:'ti-brand-instagram' },
  linkedin:  { bg:'#0a1520', border:'#22d3ee', color:'#22d3ee', icon:'ti-brand-linkedin'  },
  blog:      { bg:'#1a0f05', border:'#f97316', color:'#fb923c', icon:'ti-file-text'       },
  email:     { bg:'#1a0a0a', border:'#f87171', color:'#fca5a5', icon:'ti-mail'            },
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

const F = {
  background:'#060d1a', border:'1px solid #1a3560', borderRadius:8,
  color:'#e2e8f0', padding:'9px 12px', fontSize:13,
  width:'100%', boxSizing:'border-box', outline:'none',
  WebkitTextFillColor:'#e2e8f0',
}
const LBL = { color:'#94a3b8', fontSize:11, fontWeight:700, marginBottom:5,
  display:'block', textTransform:'uppercase', letterSpacing:'0.5px' }

async function callClaude(apiKey, prompt, maxTokens) {
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
      max_tokens: maxTokens || 2000,
      messages:[{ role:'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error('API error ' + res.status + ': ' + t.slice(0,150))
  }
  const data = await res.json()
  return (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('')
}

// ============================================================
export default function ContentCalendarPage({ clientId, userId, bizName }) {
  const now      = new Date()
  const todayStr = toDS(now.getFullYear(), now.getMonth(), now.getDate())

  const [mainTab,     setMainTab]     = useState('create')
  const [viewYear,    setViewYear]    = useState(now.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const [calDayPosts, setCalDayPosts] = useState([])

  const [posts,    setPosts]   = useState({})
  const [allPosts, setAllPosts] = useState([])
  const [apiKey,   setApiKey]  = useState('')
  const [biz,      setBiz]     = useState({})
  const [loading,  setLoading] = useState(true)

  // Generator
  const [platform,   setPlatform]   = useState('google')
  const [postDate,   setPostDate]   = useState(todayStr)
  const [topic,      setTopic]      = useState('')
  const [keywords,   setKeywords]   = useState('')
  const [tone,       setTone]       = useState('Professional')
  const [postLen,    setPostLen]     = useState('Medium (100-200 words)')
  const [repurpose,  setRepurpose]  = useState(false)
  const [article,    setArticle]    = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState('')
  const [previews,   setPreviews]   = useState([])
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState('')

  // Post modal
  const [modal,       setModal]       = useState(null)   // post object or null
  const [modalTab,    setModalTab]    = useState('view') // 'view'|'edit'|'rewrite'
  const [modalSaving, setModalSaving] = useState(false)
  const [rwTone,      setRwTone]      = useState('Professional')
  const [rwLen,       setRwLen]       = useState('Medium (100-200 words)')
  const [rewriting,   setRewriting]   = useState(false)
  const [editData,    setEditData]    = useState(null)   // mutable copy for editing

  // Posts filter
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStatus,   setFilterStatus]   = useState('all')

  useEffect(() => {
    if (!userId) return
    supabase.from('settings').select('anthropic_key').eq('user_id',userId).single()
      .then(({ data }) => { if (data?.anthropic_key) setApiKey(data.anthropic_key) })
    if (clientId) {
      supabase.from('client_data').select('*').eq('client_id',clientId).single()
        .then(({ data }) => { if (data) setBiz(data) })
    }
  }, [userId, clientId])

  const loadPosts = useCallback(async () => {
    if (!clientId || !userId) return
    setLoading(true)
    const start = toDS(viewYear, viewMonth, 1)
    const end   = toDS(viewYear, viewMonth, getDays(viewYear, viewMonth))
    const { data } = await supabase
      .from('content_calendar').select('*')
      .eq('user_id',userId).eq('client_id',clientId)
      .gte('post_date',start).lte('post_date',end)
      .order('post_date')
    const flat = data || []
    const grouped = {}
    flat.forEach(p => { if (!grouped[p.post_date]) grouped[p.post_date]=[]; grouped[p.post_date].push(p) })
    setPosts(grouped)
    setAllPosts(flat)
    if (selectedDay) setCalDayPosts(grouped[toDS(viewYear,viewMonth,selectedDay)] || [])
    setLoading(false)
  }, [clientId, userId, viewYear, viewMonth, selectedDay])

  useEffect(() => { loadPosts() }, [loadPosts])

  function bizCtx() {
    return [
      (biz.biz_name||bizName) && 'Business: '+(biz.biz_name||bizName),
      biz.biz_cat    && 'Category: '+biz.biz_cat,
      biz.biz_city   && 'Location: '+biz.biz_city+(biz.biz_state?', '+biz.biz_state:''),
      biz.biz_phone  && 'Phone: '+biz.biz_phone,
      biz.biz_website&& 'Website: '+biz.biz_website,
      biz.biz_kw     && 'Keywords: '+biz.biz_kw,
      biz.biz_desc   && 'About: '+biz.biz_desc,
    ].filter(Boolean).join('\n') || ('Business: '+(bizName||'Local Business'))
  }

  function lenLabel(l) {
    return l==='Short (50-100 words)'?'50-100 words':l==='Long (200-400 words)'?'200-400 words':'100-200 words'
  }

  // Generate posts
  const handleGenerate = async () => {
    if (!apiKey) { setGenError('No Anthropic API key. Add it in the API Keys tab.'); return }
    setGenerating(true); setGenError(''); setPreviews([])
    const platforms = platform==='all' ? PLATFORMS : [platform]
    let prompt
    if (repurpose && article.trim()) {
      prompt = `You are a social media content strategist.
${bizCtx()}
ORIGINAL ARTICLE TO REPURPOSE:
${article.slice(0,3000)}
Create one post per platform by adapting the article above.
Platforms: ${platforms.join(', ')}
Tone: ${tone}
Length per post: ${lenLabel(postLen)}
Date: ${postDate}
${keywords?'Keywords to include: '+keywords:''}
Return ONLY a valid JSON array, no markdown, no explanation. Each object:
{"platform":"...","post_date":"${postDate}","content":"...","topic":"Repurposed post"}`
    } else {
      prompt = `You are a local SEO content strategist.
${bizCtx()}
Create ${platforms.length>1?'one post per platform':'a social media post'} with these settings:
Platforms: ${platforms.join(', ')}
${topic?'Topic: '+topic:''}
${keywords?'Keywords to include: '+keywords:''}
Tone: ${tone}
Length: ${lenLabel(postLen)}
Date: ${postDate}
Return ONLY a valid JSON array, no markdown, no explanation. Each object:
{"platform":"...","post_date":"${postDate}","content":"...","topic":"${topic||'Social post'}"}`
    }
    try {
      const raw   = await callClaude(apiKey, prompt, 3000)
      const clean = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim()
      let parsed
      try { parsed = JSON.parse(clean) } catch { throw new Error('Could not parse AI response. Try again.') }
      if (!Array.isArray(parsed)||!parsed.length) throw new Error('AI returned no posts. Try again.')
      setPreviews(parsed.map(p=>({...p, approved:true})))
    } catch(err) { setGenError(err.message) }
    setGenerating(false)
  }

  // Save approved previews
  const saveApproved = async () => {
    const toSave = previews.filter(p=>p.approved)
    if (!toSave.length) return
    setSaving(true)
    const rows = toSave.map(p=>({
      user_id:userId, client_id:clientId,
      post_date:p.post_date, platform:p.platform,
      content:p.content, topic:p.topic||'',
      status:'draft', keywords, tone, length:postLen,
    }))
    await supabase.from('content_calendar').insert(rows)
    setSaving(false)
    setPreviews([])
    setSaveMsg(toSave.length+' post'+(toSave.length>1?'s':'')+' saved. See them in All Posts tab.')
    loadPosts()
    setTimeout(()=>setSaveMsg(''),5000)
  }

  // Open modal
  const openModal = (post) => {
    setModal(post)
    setEditData({...post})
    setModalTab('view')
  }

  // Save edit
  const saveEdit = async () => {
    if (!editData) return
    setModalSaving(true)
    const row = {
      post_date:editData.post_date, platform:editData.platform,
      content:editData.content, topic:editData.topic||'',
      status:editData.status||'draft',
    }
    if (editData.id) {
      await supabase.from('content_calendar').update(row).eq('id',editData.id)
    } else {
      await supabase.from('content_calendar').insert({...row,user_id:userId,client_id:clientId})
    }
    setModalSaving(false)
    setModal(null)
    setEditData(null)
    loadPosts()
  }

  // Rewrite post
  const rewritePost = async () => {
    if (!apiKey||!editData) return
    setRewriting(true)
    const prompt = `Rewrite the following social media post for ${editData.platform}.
New tone: ${rwTone}
New length: ${lenLabel(rwLen)}
${bizCtx()}
ORIGINAL:
${editData.content}
Return only the rewritten post text, no labels or explanation.`
    try {
      const result = await callClaude(apiKey, prompt, 1000)
      setEditData(p=>({...p, content:result.trim()}))
      setModalTab('edit')
    } catch(err) { alert('Rewrite failed: '+err.message) }
    setRewriting(false)
  }

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return
    await supabase.from('content_calendar').delete().eq('id',id)
    if (modal?.id===id) setModal(null)
    loadPosts()
  }

  const setStatus = async (id, status) => {
    await supabase.from('content_calendar').update({status}).eq('id',id)
    loadPosts()
  }

  function prevMonth() {
    if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11)} else setViewMonth(m=>m-1)
    setSelectedDay(null);setCalDayPosts([])
  }
  function nextMonth() {
    if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0)} else setViewMonth(m=>m+1)
    setSelectedDay(null);setCalDayPosts([])
  }

  const daysInMonth = getDays(viewYear, viewMonth)
  const firstDay    = getFirst(viewYear, viewMonth)

  const filteredPosts = allPosts.filter(p =>
    (filterPlatform==='all' || p.platform===filterPlatform) &&
    (filterStatus==='all'   || p.status===filterStatus)
  )
  const byPlatform = {}
  filteredPosts.forEach(p=>{ if(!byPlatform[p.platform]) byPlatform[p.platform]=[]; byPlatform[p.platform].push(p) })

  const statusMap = {
    draft:     { label:'Draft',     color:'#4a6080', bg:'#0d1a2a', next:'scheduled', nextLabel:'Mark Scheduled', nextColor:'#f59e0b' },
    scheduled: { label:'Scheduled', color:'#f59e0b', bg:'#1a1805', next:'published',  nextLabel:'Mark Published',  nextColor:'#10b981' },
    published: { label:'Published', color:'#10b981', bg:'#051a0f', next:null,          nextLabel:null,              nextColor:null      },
  }

  return (
    <div style={{background:T.pageBg,minHeight:'100%',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .rfcal-day:hover{border-color:#3b82f6!important}
        .rfcal-card:hover{border-color:#3b82f6!important;transform:translateY(-1px)}
        .rfcal-card{transition:transform 0.15s,border-color 0.15s}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)}
        input,select,textarea{color:#e2e8f0!important;background:#060d1a!important;-webkit-text-fill-color:#e2e8f0!important}
        input::placeholder,textarea::placeholder{color:#4a6080!important;opacity:1!important}
        input:-webkit-autofill,select:-webkit-autofill,textarea:-webkit-autofill{-webkit-text-fill-color:#e2e8f0!important;-webkit-box-shadow:0 0 0 1000px #060d1a inset!important}
        option{background:#0d1f3c;color:#e2e8f0}
      `}</style>

      {/* PAGE HEADER */}
      <div style={{padding:'18px 24px 0',borderBottom:'1px solid #0f2040'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:14}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:T.text}}>
              <i className="ti ti-calendar-event" style={{color:T.accent,marginRight:10}}/>
              Content Calendar
            </div>
            {bizName && <div style={{color:T.muted,fontSize:13,marginTop:2}}>{bizName} - {MONTHS[viewMonth]} {viewYear}</div>}
          </div>
          {saveMsg && (
            <div style={{padding:'8px 16px',background:'#051a0f',border:'1px solid #10b981',
              borderRadius:8,color:'#10b981',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <i className="ti ti-check"/>
              {saveMsg}
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:0}}>
          {[
            {id:'create',icon:'ti-sparkles',    label:'Create Posts'},
            {id:'posts', icon:'ti-layout-list', label:'All Posts ('+allPosts.length+')'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setMainTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:7,padding:'10px 22px',
                background:'transparent',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
                borderBottom:'3px solid '+(mainTab===t.id?T.accent:'transparent'),
                color:mainTab===t.id?T.accentHi:T.muted,marginBottom:-1}}>
              <i className={'ti '+t.icon}/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===================== TAB: CREATE ===================== */}
      {mainTab==='create' && (
        <div style={{display:'grid',gridTemplateColumns:'380px 1fr',minHeight:'calc(100vh - 112px)'}}>

          {/* LEFT: Generator */}
          <div style={{borderRight:'1px solid #0f2040',padding:20,overflowY:'auto',maxHeight:'calc(100vh - 112px)'}}>

            {!apiKey && (
              <div style={{padding:'10px 14px',background:'#1a0a00',border:'1px solid #f97316',
                borderRadius:8,color:'#fb923c',fontSize:12,marginBottom:16,lineHeight:1.5}}>
                <i className="ti ti-alert-circle" style={{marginRight:6}}/>
                No Anthropic API key. Add it in the <strong>API Keys tab</strong> to generate content.
              </div>
            )}

            {/* Write New / Repurpose toggle */}
            <div style={{display:'flex',gap:0,marginBottom:18,background:'#080f1e',
              border:'1px solid #0f2040',borderRadius:10,padding:4}}>
              <button onClick={()=>setRepurpose(false)}
                style={{flex:1,padding:'8px 0',borderRadius:7,fontSize:12,fontWeight:700,
                  cursor:'pointer',border:'none',
                  background:!repurpose?T.accent:'transparent',
                  color:!repurpose?'#fff':T.muted}}>
                <i className="ti ti-sparkles" style={{marginRight:5}}/>Write New
              </button>
              <button onClick={()=>setRepurpose(true)}
                style={{flex:1,padding:'8px 0',borderRadius:7,fontSize:12,fontWeight:700,
                  cursor:'pointer',border:'none',
                  background:repurpose?T.cyan:'transparent',
                  color:repurpose?'#fff':T.muted}}>
                <i className="ti ti-refresh" style={{marginRight:5}}/>Repurpose Article
              </button>
            </div>

            {/* Platform */}
            <div style={{marginBottom:14}}>
              <label style={LBL}>Platform</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {[...PLATFORMS,'all'].map(p=>{
                  const c=PC[p]||{bg:'#1a2535',border:T.accent,color:T.accentHi,icon:'ti-apps'}
                  const on=platform===p
                  return (
                    <button key={p} onClick={()=>setPlatform(p)}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                        padding:'8px 4px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',
                        border:'1px solid '+(on?c.border:T.border),
                        background:on?c.bg:'transparent',
                        color:on?c.color:T.muted}}>
                      <i className={'ti '+(p==='all'?'ti-apps':c.icon)}/>
                      {p==='all'?'All':p.charAt(0).toUpperCase()+p.slice(1)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date */}
            <div style={{marginBottom:14}}>
              <label style={LBL}>Schedule Date</label>
              <input type="date" value={postDate} onChange={e=>setPostDate(e.target.value)} style={F}/>
            </div>

            {/* Article paste (repurpose) */}
            {repurpose && (
              <div style={{marginBottom:14}}>
                <label style={LBL}>Paste Article or Blog Post</label>
                <textarea value={article} onChange={e=>setArticle(e.target.value)}
                  rows={6} placeholder="Paste the full article here. Claude will adapt it for each platform..."
                  style={{...F,resize:'vertical',lineHeight:1.6}}/>
              </div>
            )}

            {/* Topic */}
            {!repurpose && (
              <div style={{marginBottom:14}}>
                <label style={LBL}>Topic or Focus</label>
                <input value={topic} onChange={e=>setTopic(e.target.value)}
                  placeholder="e.g. new service, summer promo, holiday hours..." style={F}/>
              </div>
            )}

            {/* Keywords */}
            <div style={{marginBottom:14}}>
              <label style={LBL}>Target Keywords <span style={{color:T.muted,fontWeight:400,textTransform:'none',letterSpacing:0}}>(optional)</span></label>
              <input value={keywords} onChange={e=>setKeywords(e.target.value)}
                placeholder="e.g. plumber Austin, emergency drain repair" style={F}/>
            </div>

            {/* Tone */}
            <div style={{marginBottom:14}}>
              <label style={LBL}>Tone</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {TONES.map(t=>(
                  <button key={t} onClick={()=>setTone(t)}
                    style={{padding:'8px 10px',borderRadius:8,fontSize:12,fontWeight:600,
                      cursor:'pointer',textAlign:'left',
                      border:'1px solid '+(tone===t?T.accent:T.border),
                      background:tone===t?'#1d3a6a':'transparent',
                      color:tone===t?T.accentHi:T.muted}}>
                    {tone===t && <i className="ti ti-check" style={{marginRight:6,color:T.accent}}/>}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div style={{marginBottom:20}}>
              <label style={LBL}>Post Length</label>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {LENGTHS.map(l=>(
                  <button key={l} onClick={()=>setPostLen(l)}
                    style={{padding:'9px 14px',borderRadius:8,fontSize:12,fontWeight:600,
                      cursor:'pointer',textAlign:'left',
                      border:'1px solid '+(postLen===l?T.accent:T.border),
                      background:postLen===l?'#1d3a6a':'transparent',
                      color:postLen===l?T.accentHi:T.muted}}>
                    {postLen===l && <i className="ti ti-check" style={{marginRight:8,color:T.accent}}/>}
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating||!apiKey}
              style={{width:'100%',padding:'13px 0',borderRadius:10,fontSize:14,fontWeight:800,
                cursor:generating||!apiKey?'not-allowed':'pointer',border:'none',
                background:generating||!apiKey?T.cardBg2:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color:generating||!apiKey?T.muted:'#fff',
                display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
              {generating
                ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/> Generating...</>
                : <><i className="ti ti-sparkles"/> Generate{platform==='all'?' All Platforms':' for '+platform.charAt(0).toUpperCase()+platform.slice(1)}</>}
            </button>

            {genError && (
              <div style={{marginTop:12,padding:'10px 14px',background:'#1a0505',
                border:'1px solid '+T.red,borderRadius:8,color:T.red,fontSize:12,lineHeight:1.5}}>
                <i className="ti ti-alert-circle" style={{marginRight:6}}/>{genError}
              </div>
            )}

            {/* PREVIEW CARDS */}
            {previews.length>0 && (
              <div style={{marginTop:22}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4}}>
                  <i className="ti ti-eye" style={{color:T.accent,marginRight:8}}/>
                  Review {previews.length} Generated Post{previews.length>1?'s':''}
                </div>
                <div style={{fontSize:11,color:T.muted,marginBottom:12}}>
                  Edit content inline. Toggle Approve/Reject. Then save to calendar.
                </div>

                {previews.map((p,i)=>{
                  const c=PC[p.platform]||PC.blog
                  return (
                    <div key={i} style={{marginBottom:14,borderRadius:10,overflow:'hidden',
                      border:'1px solid '+(p.approved?c.border:T.border),
                      background:p.approved?c.bg:T.cardBg2,
                      opacity:p.approved?1:0.55,transition:'opacity 0.2s'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'9px 13px',borderBottom:'1px solid '+(p.approved?c.border+'44':T.border)}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <i className={'ti '+c.icon} style={{color:c.color,fontSize:14}}/>
                          <span style={{color:c.color,fontSize:12,fontWeight:700}}>
                            {p.platform.charAt(0).toUpperCase()+p.platform.slice(1)}
                          </span>
                          <span style={{color:T.muted,fontSize:11}}>{p.post_date}</span>
                        </div>
                        <button onClick={()=>setPreviews(prev=>prev.map((x,j)=>j===i?{...x,approved:!x.approved}:x))}
                          style={{display:'flex',alignItems:'center',gap:5,padding:'4px 12px',
                            borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
                            border:'1px solid '+(p.approved?T.green:T.border),
                            background:p.approved?'#051a0f':'transparent',
                            color:p.approved?T.green:T.muted}}>
                          <i className={'ti '+(p.approved?'ti-check':'ti-x')}/>
                          {p.approved?'Approved':'Rejected'}
                        </button>
                      </div>
                      <div style={{padding:'10px 13px'}}>
                        <textarea
                          value={p.content}
                          onChange={e=>setPreviews(prev=>prev.map((x,j)=>j===i?{...x,content:e.target.value}:x))}
                          rows={4}
                          style={{...F,resize:'vertical',lineHeight:1.65,fontSize:12,border:'1px solid '+T.border}}/>
                      </div>
                    </div>
                  )
                })}

                <div style={{position:'sticky',bottom:0,background:T.pageBg,
                  borderTop:'1px solid '+T.border,padding:'12px 0',marginTop:4}}>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>setPreviews([])}
                      style={{flex:1,padding:'10px 0',background:'transparent',
                        border:'1px solid '+T.border2,borderRadius:8,color:T.muted,
                        fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      Discard All
                    </button>
                    <button onClick={saveApproved} disabled={saving}
                      style={{flex:2,padding:'10px 0',
                        background:'linear-gradient(135deg,#10b981,#059669)',
                        border:'none',borderRadius:8,color:'#fff',
                        fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      {saving
                        ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/> Saving...</>
                        : <><i className="ti ti-calendar-plus"/> Save {previews.filter(p=>p.approved).length} Approved to Calendar</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Calendar */}
          <div style={{padding:20,overflowY:'auto',maxHeight:'calc(100vh - 112px)'}}>
            <div style={{background:T.cardBg,border:'1px solid '+T.border,borderRadius:12}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'14px 20px',borderBottom:'1px solid '+T.border}}>
                <button onClick={prevMonth}
                  style={{background:'transparent',border:'1px solid '+T.border2,
                    borderRadius:8,color:T.textSub,padding:'6px 14px',cursor:'pointer'}}>
                  <i className="ti ti-chevron-left"/>
                </button>
                <span style={{fontWeight:800,color:T.text,fontSize:16}}>{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth}
                  style={{background:'transparent',border:'1px solid '+T.border2,
                    borderRadius:8,color:T.textSub,padding:'6px 14px',cursor:'pointer'}}>
                  <i className="ti ti-chevron-right"/>
                </button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',padding:'10px 12px 0'}}>
                {DAYS.map(d=><div key={d} style={{textAlign:'center',color:T.muted,fontSize:11,fontWeight:700,paddingBottom:8}}>{d}</div>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,padding:'0 12px 12px'}}>
                {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1, ds=toDS(viewYear,viewMonth,day)
                  const dp=posts[ds]||[]
                  const isToday=ds===todayStr, isSel=selectedDay===day
                  return (
                    <div key={day} className="rfcal-day"
                      onClick={()=>{setSelectedDay(isSel?null:day);setCalDayPosts(isSel?[]:(posts[ds]||[]))}}
                      style={{minHeight:72,borderRadius:8,padding:'6px 7px',cursor:'pointer',
                        background:isSel?'#1a3060':isToday?'#0d1f3c':'transparent',
                        border:'1px solid '+(isSel?T.accent:isToday?T.border2:T.border)}}>
                      <div style={{fontSize:12,fontWeight:isToday?800:500,
                        color:isToday?T.accentHi:T.textSub,marginBottom:4}}>{day}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                        {dp.slice(0,8).map((p,pi)=>(
                          <div key={pi} title={p.platform+': '+(p.topic||p.content.slice(0,40))}
                            style={{width:8,height:8,borderRadius:'50%',background:PC[p.platform]?.border||T.muted}}/>
                        ))}
                        {dp.length>8 && <span style={{fontSize:9,color:T.muted}}>+{dp.length-8}</span>}
                      </div>
                      {dp.length>0 && <div style={{marginTop:3,fontSize:10,color:T.muted}}>{dp.length} post{dp.length!==1?'s':''}</div>}
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',padding:'10px 16px',borderTop:'1px solid '+T.border}}>
                {PLATFORMS.map(p=>(
                  <div key={p} style={{display:'flex',alignItems:'center',gap:5}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:PC[p].border}}/>
                    <span style={{color:T.muted,fontSize:11}}>{p.charAt(0).toUpperCase()+p.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day panel */}
            {selectedDay!==null && (
              <div style={{marginTop:14,background:T.cardBg,border:'1px solid '+T.border,borderRadius:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'12px 16px',borderBottom:'1px solid '+T.border}}>
                  <span style={{fontWeight:700,color:T.text,fontSize:14}}>
                    <i className="ti ti-calendar-day" style={{color:T.accent,marginRight:8}}/>
                    {MONTHS[viewMonth]} {selectedDay}
                  </span>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>openModal({post_date:toDS(viewYear,viewMonth,selectedDay),platform:'google',content:'',topic:'',status:'draft'})}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',
                        background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff',
                        border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      <i className="ti ti-plus"/> Add Post
                    </button>
                    <button onClick={()=>{setSelectedDay(null);setCalDayPosts([])}}
                      style={{background:'transparent',border:'none',color:T.muted,cursor:'pointer',fontSize:18}}>
                      <i className="ti ti-x"/>
                    </button>
                  </div>
                </div>
                <div style={{padding:12}}>
                  {calDayPosts.length===0
                    ? <div style={{textAlign:'center',color:T.muted,padding:'20px 0',fontSize:13}}>No posts on this day yet.</div>
                    : calDayPosts.map(p=><DayRow key={p.id} post={p} sm={statusMap[p.status]||statusMap.draft} onOpen={()=>openModal(p)} onStatus={s=>setStatus(p.id,s)}/>)
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB: ALL POSTS ===================== */}
      {mainTab==='posts' && (
        <div style={{padding:24}}>

          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{color:T.muted,fontSize:11,fontWeight:700,letterSpacing:'0.5px'}}>PLATFORM:</span>
            {['all',...PLATFORMS].map(p=>{
              const c=PC[p]||{border:T.accent,color:T.accentHi,bg:'#1d3a6a'}
              const on=filterPlatform===p
              return (
                <button key={p} onClick={()=>setFilterPlatform(p)}
                  style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',
                    borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
                    border:'1px solid '+(on?c.border:T.border),
                    background:on?c.bg:'transparent',
                    color:on?c.color:T.muted}}>
                  {p!=='all' && <i className={'ti '+PC[p].icon}/>}
                  {p==='all'?'All':p.charAt(0).toUpperCase()+p.slice(1)}
                </button>
              )
            })}
            <span style={{color:T.muted,fontSize:11,fontWeight:700,letterSpacing:'0.5px',marginLeft:8}}>STATUS:</span>
            {['all','draft','scheduled','published'].map(s=>{
              const on=filterStatus===s
              const col=s==='draft'?T.muted:s==='scheduled'?T.yellow:s==='published'?T.green:T.accentHi
              return (
                <button key={s} onClick={()=>setFilterStatus(s)}
                  style={{padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
                    border:'1px solid '+(on?col:T.border),
                    background:on?col+'22':'transparent',
                    color:on?col:T.muted}}>
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              )
            })}
            <button onClick={()=>openModal({post_date:todayStr,platform:'google',content:'',topic:'',status:'draft'})}
              style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'7px 16px',
                background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff',border:'none',
                borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
              <i className="ti ti-plus"/> Add Post Manually
            </button>
          </div>

          {/* Publishing note */}
          <div style={{padding:'10px 16px',background:'#0d1a2a',border:'1px solid #1a3560',
            borderRadius:8,marginBottom:20,fontSize:12,color:T.muted,lineHeight:1.6}}>
            <i className="ti ti-info-circle" style={{color:T.accent,marginRight:8}}/>
            <strong style={{color:T.textSub}}>How publishing works:</strong> RankForged generates and stores your content.
            Copy the post text and paste it directly into Google Business, Facebook, Instagram, LinkedIn, etc.
            Then mark it Published here to track what has gone out. Direct API publishing to social platforms requires
            OAuth setup and is not yet connected.
          </div>

          {loading ? (
            <div style={{textAlign:'center',padding:60,color:T.muted}}>
              <i className="ti ti-loader-2" style={{fontSize:32,display:'block',marginBottom:10,animation:'spin 1s linear infinite'}}/>
              Loading posts...
            </div>
          ) : filteredPosts.length===0 ? (
            <div style={{textAlign:'center',padding:60,color:T.muted}}>
              <i className="ti ti-calendar-off" style={{fontSize:40,display:'block',marginBottom:12}}/>
              <div style={{fontSize:15,fontWeight:700,color:T.textSub,marginBottom:6}}>No posts found</div>
              <div style={{fontSize:13,marginBottom:20}}>
                {allPosts.length===0?'Use Create Posts to generate content.':'Try changing the filters above.'}
              </div>
              {allPosts.length===0 && (
                <button onClick={()=>setMainTab('create')}
                  style={{padding:'10px 24px',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                    color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  <i className="ti ti-sparkles" style={{marginRight:6}}/>Create Posts
                </button>
              )}
            </div>
          ) : (
            Object.entries(byPlatform).map(([plat,platPosts])=>{
              const c=PC[plat]||PC.blog
              return (
                <div key={plat} style={{marginBottom:28}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,
                    paddingBottom:10,borderBottom:'1px solid '+T.border}}>
                    <div style={{width:4,height:22,background:c.border,borderRadius:2}}/>
                    <i className={'ti '+c.icon} style={{color:c.color,fontSize:18}}/>
                    <span style={{fontWeight:800,color:T.text,fontSize:16}}>
                      {plat.charAt(0).toUpperCase()+plat.slice(1)}
                    </span>
                    <span style={{color:T.muted,fontSize:12,fontWeight:600}}>
                      {platPosts.length} post{platPosts.length!==1?'s':''}
                    </span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
                    {platPosts.sort((a,b)=>a.post_date.localeCompare(b.post_date)).map(p=>(
                      <PostCard key={p.id} post={p} sm={statusMap[p.status]||statusMap.draft}
                        onOpen={()=>openModal(p)}
                        onStatus={s=>setStatus(p.id,s)}
                        onDelete={()=>deletePost(p.id)}/>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ===================== POST MODAL ===================== */}
      {modal && editData && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,
          display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={e=>{if(e.target===e.currentTarget){setModal(null);setEditData(null);setModalTab('view')}}}>
          <div style={{background:'#0d1f3c',border:'1px solid '+(PC[editData.platform]?.border||T.border2)+'88',
            borderRadius:14,width:600,maxHeight:'90vh',overflowY:'auto',display:'flex',flexDirection:'column'}}>

            {/* Modal header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'16px 22px',borderBottom:'1px solid #0f2040',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <i className={'ti '+(PC[editData.platform]?.icon||'ti-file')}
                  style={{color:PC[editData.platform]?.color||T.accent,fontSize:20}}/>
                <div>
                  <div style={{fontWeight:800,color:T.text,fontSize:16}}>
                    {editData.platform.charAt(0).toUpperCase()+editData.platform.slice(1)} Post
                  </div>
                  {editData.post_date && <div style={{color:T.muted,fontSize:12,marginTop:1}}>{editData.post_date}</div>}
                </div>
              </div>
              <button onClick={()=>{setModal(null);setEditData(null);setModalTab('view')}}
                style={{background:'transparent',border:'none',color:T.muted,cursor:'pointer',fontSize:22}}>
                <i className="ti ti-x"/>
              </button>
            </div>

            {/* Modal tabs */}
            <div style={{display:'flex',borderBottom:'1px solid #0f2040',flexShrink:0}}>
              {[
                {id:'view',    label:'View',            icon:'ti-eye'      },
                {id:'edit',    label:'Edit',            icon:'ti-pencil'   },
                {id:'rewrite', label:'Rewrite with AI', icon:'ti-sparkles' },
              ].map(t=>(
                <button key={t.id} onClick={()=>setModalTab(t.id)}
                  style={{display:'flex',alignItems:'center',gap:7,padding:'11px 18px',
                    background:'transparent',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,
                    borderBottom:'3px solid '+(modalTab===t.id?T.accent:'transparent'),
                    color:modalTab===t.id?T.accentHi:T.muted,marginBottom:-1}}>
                  <i className={'ti '+t.icon}/>{t.label}
                </button>
              ))}
            </div>

            <div style={{padding:22,overflowY:'auto'}}>

              {/* VIEW TAB */}
              {modalTab==='view' && (
                <>
                  {/* Meta row */}
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                    <MetaChip icon="ti-calendar" value={editData.post_date}/>
                    <span style={{background:statusMap[editData.status]?.bg||'#0d1a2a',
                      color:statusMap[editData.status]?.color||T.muted,
                      borderRadius:8,padding:'4px 12px',fontSize:12,fontWeight:700}}>
                      {(editData.status||'draft').charAt(0).toUpperCase()+(editData.status||'draft').slice(1)}
                    </span>
                    {editData.topic && <MetaChip icon="ti-tag" value={editData.topic}/>}
                    {editData.tone && <MetaChip icon="ti-mood-smile" value={editData.tone}/>}
                    {editData.keywords && <MetaChip icon="ti-key" value={editData.keywords}/>}
                    {editData.length && <MetaChip icon="ti-text-size" value={editData.length}/>}
                  </div>

                  {/* Full content */}
                  <div style={{background:T.pageBg,border:'1px solid '+T.border,borderRadius:10,
                    padding:16,marginBottom:18,minHeight:120}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:10,
                      textTransform:'uppercase',letterSpacing:'0.5px'}}>Post Content</div>
                    <div style={{color:T.text,fontSize:14,lineHeight:1.75,whiteSpace:'pre-wrap'}}>
                      {editData.content||<span style={{color:T.muted,fontStyle:'italic'}}>No content yet. Use the Edit tab to add content.</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <button onClick={()=>navigator.clipboard.writeText(editData.content||'')}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',
                        background:'transparent',border:'1px solid '+T.border2,borderRadius:8,
                        color:T.accentHi,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      <i className="ti ti-copy"/> Copy Text
                    </button>
                    {statusMap[editData.status]?.next && (
                      <button onClick={()=>{setStatus(editData.id,statusMap[editData.status].next);setModal(null);setEditData(null)}}
                        style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',
                          background:'transparent',border:'1px solid '+statusMap[editData.status].nextColor,
                          borderRadius:8,color:statusMap[editData.status].nextColor,
                          fontSize:13,fontWeight:700,cursor:'pointer'}}>
                        <i className="ti ti-check"/> {statusMap[editData.status].nextLabel}
                      </button>
                    )}
                    <button onClick={()=>setModalTab('edit')}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',
                        background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff',
                        border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      <i className="ti ti-pencil"/> Edit Post
                    </button>
                    <button onClick={()=>deletePost(editData.id)}
                      style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',
                        background:'transparent',border:'1px solid #2a1a1a',
                        borderRadius:8,color:T.red,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      <i className="ti ti-trash"/> Delete
                    </button>
                  </div>
                </>
              )}

              {/* EDIT TAB */}
              {modalTab==='edit' && (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                    <div>
                      <label style={LBL}>Date</label>
                      <input type="date" value={editData.post_date}
                        onChange={e=>setEditData(p=>({...p,post_date:e.target.value}))} style={F}/>
                    </div>
                    <div>
                      <label style={LBL}>Platform</label>
                      <select value={editData.platform}
                        onChange={e=>setEditData(p=>({...p,platform:e.target.value}))}
                        style={{...F,cursor:'pointer'}}>
                        {PLATFORMS.map(pt=><option key={pt} value={pt}>{pt.charAt(0).toUpperCase()+pt.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                    <div>
                      <label style={LBL}>Topic</label>
                      <input value={editData.topic||''}
                        onChange={e=>setEditData(p=>({...p,topic:e.target.value}))}
                        placeholder="Short label..." style={F}/>
                    </div>
                    <div>
                      <label style={LBL}>Status</label>
                      <select value={editData.status||'draft'}
                        onChange={e=>setEditData(p=>({...p,status:e.target.value}))}
                        style={{...F,cursor:'pointer'}}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                    <div>
                      <label style={LBL}>Keywords</label>
                      <input value={editData.keywords||''}
                        onChange={e=>setEditData(p=>({...p,keywords:e.target.value}))}
                        placeholder="Target keywords..." style={F}/>
                    </div>
                    <div>
                      <label style={LBL}>Tone</label>
                      <select value={editData.tone||'Professional'}
                        onChange={e=>setEditData(p=>({...p,tone:e.target.value}))}
                        style={{...F,cursor:'pointer'}}>
                        {TONES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={LBL}>Length</label>
                    <select value={editData.length||'Medium (100-200 words)'}
                      onChange={e=>setEditData(p=>({...p,length:e.target.value}))}
                      style={{...F,cursor:'pointer'}}>
                      {LENGTHS.map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
                      <label style={{...LBL,marginBottom:0}}>Content</label>
                      <button onClick={()=>navigator.clipboard.writeText(editData.content||'')}
                        style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',
                          background:'transparent',border:'1px solid '+T.border2,
                          borderRadius:6,color:T.muted,fontSize:11,cursor:'pointer'}}>
                        <i className="ti ti-copy"/> Copy
                      </button>
                    </div>
                    <textarea value={editData.content||''}
                      onChange={e=>setEditData(p=>({...p,content:e.target.value}))}
                      rows={9} placeholder="Post content..."
                      style={{...F,resize:'vertical',lineHeight:1.7}}/>
                    <div style={{textAlign:'right',fontSize:11,color:T.muted,marginTop:3}}>
                      {(editData.content||'').length} chars
                    </div>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>{setModal(null);setEditData(null);setModalTab('view')}}
                      style={{flex:1,padding:'10px 0',background:'transparent',color:T.muted,
                        border:'1px solid '+T.border2,borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                      Cancel
                    </button>
                    <button onClick={saveEdit} disabled={modalSaving||!(editData.content||'').trim()}
                      style={{flex:2,padding:'10px 0',borderRadius:8,fontSize:13,fontWeight:700,border:'none',
                        cursor:modalSaving||!(editData.content||'').trim()?'not-allowed':'pointer',
                        background:modalSaving||!(editData.content||'').trim()
                          ?T.cardBg2:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                        color:modalSaving||!(editData.content||'').trim()?T.muted:'#fff'}}>
                      {modalSaving?'Saving...':editData.id?'Save Changes':'Add to Calendar'}
                    </button>
                  </div>
                </>
              )}

              {/* REWRITE TAB */}
              {modalTab==='rewrite' && (
                <>
                  <div style={{background:T.pageBg,border:'1px solid '+T.border,
                    borderRadius:9,padding:14,marginBottom:18}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,
                      textTransform:'uppercase',letterSpacing:'0.5px'}}>Current Content</div>
                    <div style={{color:T.textSub,fontSize:13,lineHeight:1.65,whiteSpace:'pre-wrap',
                      maxHeight:140,overflowY:'auto'}}>
                      {editData.content||<span style={{fontStyle:'italic',color:T.muted}}>No content yet.</span>}
                    </div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={LBL}>Rewrite in this Tone</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
                      {TONES.map(t=>(
                        <button key={t} onClick={()=>setRwTone(t)}
                          style={{padding:'8px 10px',borderRadius:8,fontSize:12,fontWeight:600,
                            cursor:'pointer',textAlign:'left',
                            border:'1px solid '+(rwTone===t?T.accent:T.border),
                            background:rwTone===t?'#1d3a6a':'transparent',
                            color:rwTone===t?T.accentHi:T.muted}}>
                          {rwTone===t && <i className="ti ti-check" style={{marginRight:6,color:T.accent}}/>}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{marginBottom:24}}>
                    <label style={LBL}>New Length</label>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {LENGTHS.map(l=>(
                        <button key={l} onClick={()=>setRwLen(l)}
                          style={{padding:'9px 14px',borderRadius:8,fontSize:12,fontWeight:600,
                            cursor:'pointer',textAlign:'left',
                            border:'1px solid '+(rwLen===l?T.accent:T.border),
                            background:rwLen===l?'#1d3a6a':'transparent',
                            color:rwLen===l?T.accentHi:T.muted}}>
                          {rwLen===l && <i className="ti ti-check" style={{marginRight:8,color:T.accent}}/>}
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={rewritePost} disabled={rewriting||!apiKey||!editData.content}
                    style={{width:'100%',padding:'12px 0',borderRadius:10,fontSize:14,fontWeight:800,
                      cursor:rewriting||!apiKey||!editData.content?'not-allowed':'pointer',border:'none',
                      background:rewriting||!apiKey||!editData.content?T.cardBg2:'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                      color:rewriting||!apiKey||!editData.content?T.muted:'#fff',
                      display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                    {rewriting
                      ? <><i className="ti ti-loader-2" style={{animation:'spin 1s linear infinite'}}/> Rewriting...</>
                      : <><i className="ti ti-sparkles"/> Rewrite Post</>}
                  </button>
                  <div style={{marginTop:10,fontSize:12,color:T.muted,textAlign:'center'}}>
                    Result will replace content in the Edit tab. Review and save from there.
                  </div>
                  {!apiKey && (
                    <div style={{marginTop:10,fontSize:12,color:T.red,textAlign:'center'}}>
                      No API key found. Add it in the API Keys tab.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Day row (calendar day panel, compact) ─────────────────────────────────────
function DayRow({ post, sm, onOpen, onStatus }) {
  const c = PC[post.platform]||PC.blog
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
      background:c.bg,border:'1px solid '+c.border+'66',borderRadius:9,marginBottom:8,cursor:'pointer'}}
      onClick={onOpen}>
      <i className={'ti '+c.icon} style={{color:c.color,fontSize:14,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:c.color,fontSize:12,fontWeight:700,marginBottom:2}}>
          {post.platform.charAt(0).toUpperCase()+post.platform.slice(1)}
          {post.topic && <span style={{color:T.muted,fontWeight:400,marginLeft:6}}>{post.topic}</span>}
        </div>
        <div style={{color:T.textSub,fontSize:12,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
          {post.content||'(no content)'}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
        <span style={{background:sm.bg,color:sm.color,borderRadius:6,padding:'2px 8px',fontSize:10,fontWeight:700,textAlign:'center'}}>
          {sm.label}
        </span>
        {sm.next && (
          <button onClick={e=>{e.stopPropagation();onStatus(sm.next)}}
            style={{padding:'2px 8px',background:'transparent',border:'1px solid '+sm.nextColor,
              borderRadius:6,color:sm.nextColor,fontSize:9,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            {sm.nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Post card (All Posts tab) ─────────────────────────────────────────────────
function PostCard({ post, sm, onOpen, onStatus, onDelete }) {
  const c = PC[post.platform]||PC.blog
  return (
    <div className="rfcal-card" style={{background:c.bg,border:'1px solid '+c.border+'99',
      borderRadius:10,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'10px 14px',borderBottom:'1px solid '+c.border+'33'}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <i className={'ti '+c.icon} style={{color:c.color,fontSize:15}}/>
          <span style={{color:c.color,fontSize:13,fontWeight:700}}>
            {post.platform.charAt(0).toUpperCase()+post.platform.slice(1)}
          </span>
          {post.topic && (
            <span style={{color:T.muted,fontSize:11,background:T.pageBg,
              borderRadius:6,padding:'1px 8px',border:'1px solid '+T.border}}>
              {post.topic}
            </span>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{background:sm.bg,color:sm.color,borderRadius:6,padding:'2px 9px',fontSize:10,fontWeight:700}}>
            {sm.label}
          </span>
          <span style={{color:T.muted,fontSize:11}}>{post.post_date}</span>
        </div>
      </div>

      {/* Content preview */}
      <div style={{padding:'12px 14px',flex:1,cursor:'pointer'}} onClick={onOpen}>
        <div style={{color:T.text,fontSize:13,lineHeight:1.7,
          overflow:'hidden',display:'-webkit-box',WebkitLineClamp:4,WebkitBoxOrient:'vertical'}}>
          {post.content||<span style={{color:T.muted,fontStyle:'italic'}}>No content</span>}
        </div>
        {post.tone && (
          <div style={{marginTop:8,fontSize:11,color:T.muted}}>
            <i className="ti ti-mood-smile" style={{marginRight:4}}/>{post.tone}
            {post.length && <><span style={{margin:'0 6px',opacity:0.4}}>|</span><i className="ti ti-text-size" style={{marginRight:4}}/>{post.length}</>}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{display:'grid',gridTemplateColumns:sm.next?'2fr 2fr 1fr':'2fr 1fr',
        borderTop:'1px solid '+c.border+'33'}}>
        {sm.next && (
          <button onClick={()=>onStatus(sm.next)}
            style={{padding:'9px 4px',background:'transparent',border:'none',
              borderRight:'1px solid '+c.border+'33',
              color:sm.nextColor,fontSize:11,fontWeight:700,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
            <i className="ti ti-check"/>{sm.nextLabel}
          </button>
        )}
        <button onClick={onOpen}
          style={{padding:'9px 4px',background:'transparent',border:'none',
            borderRight:'1px solid '+c.border+'33',
            color:T.accentHi,fontSize:11,fontWeight:700,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <i className="ti ti-eye"/> View / Edit
        </button>
        <button onClick={onDelete}
          style={{padding:'9px 4px',background:'transparent',border:'none',
            color:T.red,fontSize:11,fontWeight:700,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <i className="ti ti-trash"/> Delete
        </button>
      </div>
    </div>
  )
}

function MetaChip({ icon, value }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',
      background:T.pageBg,border:'1px solid #0f2040',borderRadius:7}}>
      <i className={'ti '+icon} style={{color:T.muted,fontSize:12}}/>
      <span style={{color:T.textSub,fontSize:12}}>{value}</span>
    </div>
  )
}
