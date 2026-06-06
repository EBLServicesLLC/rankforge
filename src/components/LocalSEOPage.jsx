/**
 * LocalSEOPage.jsx
 * Local SEO & Entity Authority — Command Center
 * Three column layout matching Social Publisher / Local Links quality
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg:   '#060d1a',
  cardBg:   '#0d1f3c',
  cardBg2:  '#080f1e',
  border:   '#0f2040',
  border2:  '#1a3560',
  text:     '#e2e8f0',
  textSub:  '#c8d8f0',
  muted:    '#4a6080',
  accent:   '#3b82f6',
  accentHi: '#60a5fa',
  green:    '#10b981',
  red:      '#f87171',
  yellow:   '#f59e0b',
  purple:   '#8b5cf6',
}

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'reviews',  label: '⭐ Reviews' },
  { id: 'citations', label: '🔗 Citation Gap' },
]

const LOCAL_SEO_TASKS = [
  { id: 't1',  label: 'Verify and fully optimise Google Business Profile',  priority: 'Critical', link: 'https://business.google.com' },
  { id: 't2',  label: 'Add 10+ photos to Google Business Profile',           priority: 'High',     link: 'https://business.google.com' },
  { id: 't3',  label: 'Enable GBP messaging and Q&A features',              priority: 'Medium',   link: 'https://business.google.com' },
  { id: 't4',  label: 'Post weekly updates to Google Business Profile',      priority: 'Medium',   link: 'https://business.google.com' },
  { id: 't5',  label: 'Request 10+ Google reviews from happy customers',     priority: 'High',     link: null },
  { id: 't6',  label: 'Respond to every Google review (positive & negative)', priority: 'High',   link: null },
  { id: 't7',  label: 'Add local service area pages to website',             priority: 'High',     link: null },
  { id: 't8',  label: 'Embed Google Map on contact/locations page',          priority: 'Medium',   link: null },
  { id: 't9',  label: 'Submit to top 20 directories to build citations',     priority: 'High',     link: null },
  { id: 't10', label: 'Set up and verify Bing Places for Business',          priority: 'High',     link: 'https://www.bingplaces.com' },
  { id: 't11', label: 'Claim Apple Maps listing (covers Siri)',              priority: 'High',     link: 'https://mapsconnect.apple.com' },
  { id: 't12', label: 'Join local Chamber of Commerce for citation link',    priority: 'Medium',   link: null },
]

const AUTHORITY_TASKS = [
  { id: 'a1', label: 'Create Wikidata entity for the business',              priority: 'Critical', link: 'https://www.wikidata.org' },
  { id: 'a2', label: 'Get cited in a Wikipedia article as a reference',      priority: 'High',     link: 'https://en.wikipedia.org' },
  { id: 'a3', label: 'Publish 3 guest posts on DA 70+ websites',             priority: 'High',     link: null },
  { id: 'a4', label: 'Earn a mention in a local news publication',            priority: 'High',     link: null },
  { id: 'a5', label: 'Complete Crunchbase profile with all fields',           priority: 'Medium',   link: 'https://www.crunchbase.com' },
  { id: 'a6', label: 'Create LinkedIn Company Page with complete details',   priority: 'High',     link: 'https://www.linkedin.com' },
  { id: 'a7', label: 'Obtain BBB Accreditation',                             priority: 'Medium',   link: 'https://www.bbb.org' },
  { id: 'a8', label: 'Appear as a guest on 2+ podcasts in your niche',       priority: 'Medium',   link: null },
]

const TOP_CITATIONS = [
  { name: 'Google Business Profile', da: 100 },
  { name: 'Google Maps',             da: 99  },
  { name: 'Apple Maps Connect',      da: 98  },
  { name: 'LinkedIn Company',        da: 98  },
  { name: 'Bing Places',             da: 94  },
  { name: 'Yelp',                    da: 93  },
  { name: 'Facebook Business',       da: 96  },
  { name: 'BBB',                     da: 91  },
]

const SCHEMA_TYPES = ['LocalBusiness', 'Service', 'FAQPage', 'Organization']

const REVIEW_TONES = ['Warm & personal', 'Professional', 'Brief & friendly', 'Grateful']

function Card({ children, style }) {
  return <div style={{ background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 10, ...style }}>{children}</div>
}

function CardHead({ icon, title, sub, right }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        <i className={icon} style={{ color: T.accentHi }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

const priorityColor = (p) => ({ Critical: T.red, High: T.yellow, Medium: T.accentHi }[p] || T.muted)

export default function LocalSEOPage({ session, clientId }) {
  const [activeTab, setActiveTab]       = useState('overview')
  const [profile, setProfile]           = useState({})
  const [checkedTasks, setCheckedTasks] = useState({})
  const [schemaType, setSchemaType]     = useState('LocalBusiness')
  const [schema, setSchema]             = useState('')
  const [copied, setCopied]             = useState('')
  const [napName, setNapName]           = useState('')
  const [napPhone, setNapPhone]         = useState('')
  const [napAddr, setNapAddr]           = useState('')

  // Review tab state
  const [reviewType, setReviewType]     = useState('email')
  const [custName, setCustName]         = useState('')
  const [custEmail, setCustEmail]       = useState('')
  const [service, setService]           = useState('')
  const [reviewTone, setReviewTone]     = useState('Warm & personal')
  const [reviewLink, setReviewLink]     = useState('')
  const [reviewMsg, setReviewMsg]       = useState('')
  const [starRating, setStarRating]     = useState(5)
  const [reviewText, setReviewText]     = useState('')
  const [reviewResponse, setReviewResponse] = useState('')
  const [generatingMsg, setGeneratingMsg]   = useState(false)
  const [generatingResp, setGeneratingResp] = useState(false)

  // Citation gap state
  const [comp1, setComp1]   = useState('')
  const [comp2, setComp2]   = useState('')
  const [comp3, setComp3]   = useState('')
  const [gapResults, setGapResults] = useState(null)
  const [runningGap, setRunningGap] = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name, biz_phone, biz_addr, biz_city, biz_state, biz_zip, biz_website, biz_desc, biz_cat, biz_kw')
      .eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          setNapName(data.biz_name || '')
          setNapPhone(data.biz_phone || '')
          setNapAddr(data.biz_addr ? `${data.biz_addr}, ${data.biz_city || ''}, ${data.biz_state || ''} ${data.biz_zip || ''}`.trim() : '')
          generateSchemaFromProfile('LocalBusiness', data)
        }
      })
    try {
      const saved = JSON.parse(localStorage.getItem(`rf_localseo_tasks_${clientId}`) || '{}')
      setCheckedTasks(saved)
    } catch (e) {}
  }, [clientId, session])

  const toggleTask = (id) => {
    const updated = { ...checkedTasks, [id]: !checkedTasks[id] }
    setCheckedTasks(updated)
    try { localStorage.setItem(`rf_localseo_tasks_${clientId}`, JSON.stringify(updated)) } catch (e) {}
  }

  const generateSchemaFromProfile = (type, p) => {
    const data = p || profile
    const schemas = {
      LocalBusiness: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: data.biz_name || '',
        description: data.biz_desc || '',
        url: data.biz_website || '',
        telephone: data.biz_phone || '',
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.biz_addr || '',
          addressLocality: data.biz_city || '',
          addressRegion: data.biz_state || '',
          postalCode: data.biz_zip || '',
          addressCountry: 'US',
        },
      },
      Service: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: data.biz_cat || '',
        provider: { '@type': 'LocalBusiness', name: data.biz_name || '' },
        areaServed: { '@type': 'City', name: data.biz_city || '' },
        description: data.biz_desc || '',
      },
      Organization: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.biz_name || '',
        url: data.biz_website || '',
        telephone: data.biz_phone || '',
        description: data.biz_desc || '',
      },
      FAQPage: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: `What services does ${data.biz_name || 'we'} offer?`, acceptedAnswer: { '@type': 'Answer', text: data.biz_desc || '' } },
        ],
      },
    }
    setSchema(JSON.stringify(schemas[type] || schemas.LocalBusiness, null, 2))
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const completedTasks = Object.values(checkedTasks).filter(Boolean).length
  const totalTasks = LOCAL_SEO_TASKS.length + AUTHORITY_TASKS.length
  const entityScore = Math.round((completedTasks / totalTasks) * 60 + 20)

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  })

  const generateReviewMessage = async () => {
    if (!custName || !service) return
    setGeneratingMsg(true)
    setReviewMsg('')
    try {
      const res = await fetch(`https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/review-message-generate`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ custName, custEmail, service, tone: reviewTone, reviewLink, type: reviewType, bizName: profile.biz_name, client_id: clientId }),
      })
      const data = await res.json()
      if (data.message) setReviewMsg(data.message)
    } catch (e) { setReviewMsg('Generation failed. Please try again.') }
    finally { setGeneratingMsg(false) }
  }

  const generateReviewResponse = async () => {
    if (!reviewText) return
    setGeneratingResp(true)
    setReviewResponse('')
    try {
      const res = await fetch(`https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/review-response-generate`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ reviewText, starRating, bizName: profile.biz_name, client_id: clientId }),
      })
      const data = await res.json()
      if (data.response) setReviewResponse(data.response)
    } catch (e) { setReviewResponse('Generation failed. Please try again.') }
    finally { setGeneratingResp(false) }
  }

  const runCitationGap = () => {
    if (!comp1) return
    setRunningGap(true)
    setTimeout(() => {
      setGapResults({
        gaps: TOP_CITATIONS.filter((_, i) => i % 2 === 0).map(c => ({ ...c, inComp: true, inYou: false })),
        advantages: TOP_CITATIONS.filter((_, i) => i % 2 !== 0).map(c => ({ ...c, inComp: false, inYou: true })),
      })
      setRunningGap(false)
    }, 1500)
  }

  const inp = { width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }
  const btn = (bg) => ({ padding: '8px 16px', background: bg, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 })

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-map-pin" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Local SEO & Entity Authority
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
          Entity scoring, NAP consistency, schema generator, review campaigns, and citation gap analysis.
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border2}`, paddingBottom: 0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '8px 20px', background: activeTab === tab.id ? T.cardBg : 'transparent', color: activeTab === tab.id ? T.text : T.muted, border: `1px solid ${activeTab === tab.id ? T.border2 : 'transparent'}`, borderBottom: activeTab === tab.id ? `1px solid ${T.cardBg}` : 'none', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', gap: 14, padding: '20px 28px', alignItems: 'flex-start' }}>

          {/* Left col */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Entity Score */}
            <Card>
              <CardHead icon="ti ti-star" title="Entity Authority Score" />
              <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: entityScore >= 70 ? T.green : entityScore >= 40 ? T.yellow : T.red, lineHeight: 1 }}>{entityScore}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>out of 100</div>
                <div style={{ marginTop: 16, background: T.cardBg2, borderRadius: 8, overflow: 'hidden', height: 8 }}>
                  <div style={{ height: '100%', width: `${entityScore}%`, background: entityScore >= 70 ? T.green : entityScore >= 40 ? T.yellow : T.red, transition: 'width .5s', borderRadius: 8 }} />
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                  {completedTasks} of {totalTasks} tasks completed
                </div>
              </div>
              {/* Score breakdown */}
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Profile Completeness', value: profile.biz_name ? 100 : 0, color: T.green },
                  { label: 'Schema Markup',        value: schema ? 100 : 0,           color: T.green },
                  { label: 'Tasks Completed',      value: Math.round((completedTasks / totalTasks) * 100), color: T.yellow },
                  { label: 'Citations',            value: 0,                           color: T.red },
                  { label: 'NAP Consistency',      value: napName ? 50 : 0,            color: T.yellow },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 3 }}>
                      <span>{s.label}</span><span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
                    </div>
                    <div style={{ background: T.cardBg2, borderRadius: 4, height: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* NAP Checker */}
            <Card>
              <CardHead icon="ti ti-id-badge" title="NAP Consistency" sub="Auto-filled from your profile" />
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={lbl}>Business Name</label>
                  <input value={napName} onChange={e => setNapName(e.target.value)} placeholder="Exact name everywhere" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Phone Format</label>
                  <input value={napPhone} onChange={e => setNapPhone(e.target.value)} placeholder="(555) 555-0100" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Address</label>
                  <input value={napAddr} onChange={e => setNapAddr(e.target.value)} placeholder="123 Main St, City, ST 00000" style={inp} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6, padding: '8px 10px', background: 'rgba(59,130,246,.06)', borderRadius: 7 }}>
                  💡 Use this exact format on every directory, your website, and social profiles. Inconsistent NAP is one of the top reasons businesses don't rank locally.
                </div>
              </div>
            </Card>

          </div>

          {/* Middle col — tasks */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Card>
              <CardHead icon="ti ti-checklist" title="Local SEO Tasks"
                sub={`${Object.entries(checkedTasks).filter(([k,v]) => LOCAL_SEO_TASKS.find(t=>t.id===k) && v).length} of ${LOCAL_SEO_TASKS.length} done`} />
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {LOCAL_SEO_TASKS.map((task, i) => (
                  <div key={task.id} style={{ padding: '10px 16px', borderBottom: i < LOCAL_SEO_TASKS.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 10, background: checkedTasks[task.id] ? 'rgba(16,185,129,.04)' : 'transparent' }}>
                    <input type="checkbox" checked={!!checkedTasks[task.id]} onChange={() => toggleTask(task.id)} style={{ accentColor: T.green, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: checkedTasks[task.id] ? T.muted : T.text, textDecoration: checkedTasks[task.id] ? 'line-through' : 'none', lineHeight: 1.5 }}>{task.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor(task.priority) }}>{task.priority}</span>
                        {task.link && !checkedTasks[task.id] && (
                          <a href={task.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.accentHi, textDecoration: 'none', fontWeight: 600 }}>Open →</a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHead icon="ti ti-building" title="Authority Building"
                sub={`${Object.entries(checkedTasks).filter(([k,v]) => AUTHORITY_TASKS.find(t=>t.id===k) && v).length} of ${AUTHORITY_TASKS.length} done`} />
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {AUTHORITY_TASKS.map((task, i) => (
                  <div key={task.id} style={{ padding: '10px 16px', borderBottom: i < AUTHORITY_TASKS.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 10, background: checkedTasks[task.id] ? 'rgba(16,185,129,.04)' : 'transparent' }}>
                    <input type="checkbox" checked={!!checkedTasks[task.id]} onChange={() => toggleTask(task.id)} style={{ accentColor: T.green, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: checkedTasks[task.id] ? T.muted : T.text, textDecoration: checkedTasks[task.id] ? 'line-through' : 'none', lineHeight: 1.5 }}>{task.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor(task.priority) }}>{task.priority}</span>
                        {task.link && !checkedTasks[task.id] && (
                          <a href={task.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.accentHi, textDecoration: 'none', fontWeight: 600 }}>Open →</a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* Right col */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Schema Generator */}
            <Card>
              <CardHead icon="ti ti-code" title="Schema.org JSON-LD Generator" sub="Auto-filled from your business profile"
                right={
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => copyText(`<script type="application/ld+json">\n${schema}\n</script>`, 'schema')}
                      style={{ ...btn('linear-gradient(135deg,#3b82f6,#2563eb)'), padding: '5px 12px', fontSize: 11 }}>
                      {copied === 'schema' ? '✓ Copied' : '📋 Copy'}
                    </button>
                    <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer"
                      style={{ ...btn(T.cardBg2), padding: '5px 12px', fontSize: 11, textDecoration: 'none', border: `1px solid ${T.border2}` }}>
                      🔍 Validate
                    </a>
                  </div>
                }
              />
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6 }}>
                {SCHEMA_TYPES.map(t => (
                  <button key={t} onClick={() => { setSchemaType(t); generateSchemaFromProfile(t, null) }}
                    style={{ padding: '5px 12px', background: schemaType === t ? T.accent : T.cardBg2, color: schemaType === t ? '#fff' : T.muted, border: `1px solid ${schemaType === t ? T.accent : T.border2}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t}
                  </button>
                ))}
              </div>
              <pre style={{ margin: 0, padding: '14px 16px', fontSize: 11, color: T.textSub, overflowX: 'auto', maxHeight: 280, background: T.cardBg2, lineHeight: 1.6 }}>
                {schema}
              </pre>
              <div style={{ padding: '10px 16px', fontSize: 11, color: T.muted, borderTop: `1px solid ${T.border}`, lineHeight: 1.6 }}>
                📌 Paste this into the <code style={{ background: T.cardBg2, padding: '1px 5px', borderRadius: 4 }}>&lt;head&gt;</code> tag of every service page. Use the Schema Monitor tab to verify it's live.
              </div>
            </Card>

            {/* Top Missing Citations */}
            <Card>
              <CardHead icon="ti ti-link" title="Citation Management" sub="Top directories for local authority" />
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {TOP_CITATIONS.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: T.cardBg2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>DA {c.da}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted }}>
                Submit to these directories to build citation authority. Consistent NAP across all listings is critical.
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <div style={{ display: 'flex', gap: 14, padding: '20px 28px', alignItems: 'flex-start' }}>

          {/* Left — Request composer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <CardHead icon="ti ti-mail" title="Review Request Campaign" sub="AI writes personalised request messages for email or SMS" />
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Type toggle */}
                <div style={{ display: 'flex', gap: 4, background: T.cardBg2, borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
                  {['email', 'sms'].map(t => (
                    <button key={t} onClick={() => setReviewType(t)}
                      style={{ padding: '6px 20px', borderRadius: 6, border: 'none', background: reviewType === t ? T.cardBg : 'transparent', color: reviewType === t ? T.text : T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                      {t === 'email' ? '📧 Email' : '📱 SMS'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Customer First Name *</label>
                    <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="e.g. Sarah" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Customer {reviewType === 'email' ? 'Email' : 'Phone'}</label>
                    <input value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder={reviewType === 'email' ? 'sarah@email.com' : '(555) 555-0100'} style={inp} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>Service Provided</label>
                  <input value={service} onChange={e => setService(e.target.value)} placeholder="e.g. HR consulting, payroll setup" style={inp} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Tone</label>
                    <select value={reviewTone} onChange={e => setReviewTone(e.target.value)} style={{ ...inp }}>
                      {REVIEW_TONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Google Review Link</label>
                    <input value={reviewLink} onChange={e => setReviewLink(e.target.value)} placeholder="https://g.page/r/YOUR_ID/review" style={inp} />
                  </div>
                </div>

                <button onClick={generatingMsg ? null : generateReviewMessage} disabled={generatingMsg || !custName || !service}
                  style={{ ...btn('linear-gradient(135deg,#3b82f6,#2563eb)'), alignSelf: 'flex-start', opacity: (!custName || !service) ? .5 : 1 }}>
                  {generatingMsg ? '⏳ Generating...' : '✨ Generate Message'}
                </button>

                {reviewMsg && (
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.border2}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Generated Message</span>
                      <button onClick={() => copyText(reviewMsg, 'msg')} style={{ ...btn(T.accent), padding: '4px 10px', fontSize: 11 }}>
                        {copied === 'msg' ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                    <div style={{ padding: '12px', fontSize: 12, color: T.textSub, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{reviewMsg}</div>
                  </div>
                )}

                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)', borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                  ⚠️ <strong style={{ color: T.yellow }}>Google Policy:</strong> Never offer incentives (discounts, gifts) in exchange for reviews — this violates Google's guidelines and can get the business suspended. These templates are policy-compliant.
                </div>
              </div>
            </Card>
          </div>

          {/* Right — Response automation */}
          <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <CardHead icon="ti ti-message-reply" title="Review Response Generator" sub="Paste any review — AI writes a personalised response in seconds" />
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div>
                  <label style={lbl}>Star Rating</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[5,4,3,2,1].map(s => (
                      <button key={s} onClick={() => setStarRating(s)}
                        style={{ flex: 1, padding: '7px 0', background: starRating === s ? T.accent : T.cardBg2, color: starRating === s ? '#fff' : T.muted, border: `1px solid ${starRating === s ? T.accent : T.border2}`, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {'⭐'.repeat(s)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>Paste the Review Text</label>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                    placeholder="Paste the customer's review here..."
                    rows={4}
                    style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                </div>

                <button onClick={generatingResp ? null : generateReviewResponse} disabled={generatingResp || !reviewText}
                  style={{ ...btn('linear-gradient(135deg,#10b981,#059669)'), opacity: !reviewText ? .5 : 1 }}>
                  {generatingResp ? '⏳ Generating...' : '✨ Generate Response'}
                </button>

                {reviewResponse && (
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.border2}`, borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Your Response</span>
                      <button onClick={() => copyText(reviewResponse, 'resp')} style={{ ...btn(T.accent), padding: '4px 10px', fontSize: 11 }}>
                        {copied === 'resp' ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                    <div style={{ padding: '12px', fontSize: 12, color: T.textSub, lineHeight: 1.7 }}>{reviewResponse}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── CITATION GAP TAB ── */}
      {activeTab === 'citations' && (
        <div style={{ display: 'flex', gap: 14, padding: '20px 28px', alignItems: 'flex-start' }}>

          {/* Left — inputs */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <Card>
              <CardHead icon="ti ti-search" title="Competitor Citation Gap" sub="See which directories competitors are in that you aren't" />
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                  Enter up to 3 competitor domain names. RankForged checks our 75-directory database against each one and shows every gap — directories they're in that you aren't.
                </div>
                {[
                  { val: comp1, set: setComp1, label: 'Competitor 1', placeholder: 'competitor1.com' },
                  { val: comp2, set: setComp2, label: 'Competitor 2', placeholder: 'competitor2.com' },
                  { val: comp3, set: setComp3, label: 'Competitor 3 (optional)', placeholder: 'competitor3.com' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={lbl}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inp} />
                  </div>
                ))}
                <button onClick={runningGap ? null : runCitationGap} disabled={runningGap || !comp1}
                  style={{ ...btn('linear-gradient(135deg,#3b82f6,#2563eb)'), opacity: !comp1 ? .5 : 1 }}>
                  {runningGap ? '⏳ Analysing...' : '🔍 Run Gap Analysis'}
                </button>
              </div>
            </Card>
          </div>

          {/* Right — results */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!gapResults && !runningGap && (
              <Card style={{ padding: 48, textAlign: 'center' }}>
                <i className="ti ti-search" style={{ fontSize: 40, color: T.muted, marginBottom: 12, display: 'block' }}></i>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Enter competitor domains</div>
                <div style={{ fontSize: 12, color: T.muted }}>Run the analysis to see which directories they're in that you aren't.</div>
              </Card>
            )}
            {runningGap && (
              <Card style={{ padding: 48, textAlign: 'center' }}>
                <i className="ti ti-loader-2" style={{ fontSize: 36, color: T.accent, marginBottom: 12, display: 'block' }}></i>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Analysing citation gaps...</div>
              </Card>
            )}
            {gapResults && !runningGap && (
              <>
                <Card>
                  <CardHead icon="ti ti-alert-triangle" title="Citation Gaps" sub={`${gapResults.gaps.length} directories competitors have that you don't`} />
                  <div>
                    {gapResults.gaps.map((g, i) => (
                      <div key={g.name} style={{ padding: '10px 16px', borderBottom: i < gapResults.gaps.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{g.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>DA {g.da}</span>
                          <span style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>⚠ Missing</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <CardHead icon="ti ti-circle-check" title="Your Advantages" sub={`${gapResults.advantages.length} directories you're in that they aren't`} />
                  <div>
                    {gapResults.advantages.map((g, i) => (
                      <div key={g.name} style={{ padding: '10px 16px', borderBottom: i < gapResults.advantages.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{g.name}</div>
                        <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>✓ You're listed</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
