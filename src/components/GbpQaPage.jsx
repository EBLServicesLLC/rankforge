/**
 * GbpQaPage.jsx
 * AI FAQ & Schema — Google Business Profile Q&A Manager
 * Generates FAQ Q&A pairs, AI-writes answers, exports FAQ schema JSON-LD
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg:  '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border:  '#0f2040', border2: '#1a3560', text: '#e2e8f0',
  textSub: '#c8d8f0', muted: '#4a6080', accent: '#3b82f6',
  accentHi:'#60a5fa', green: '#10b981', greenBg: 'rgba(16,185,129,.12)',
  red:     '#f87171', redBg: 'rgba(248,113,113,.1)', yellow: '#f59e0b',
  yellowBg:'rgba(245,158,11,.1)', purple: '#8b5cf6',
  orange:  '#f97316', orangeBg: 'rgba(249,115,22,.1)',
  cyan:    '#22d3ee',
}

const TOPICS = [
  { key: 'hours',     label: 'Business Hours',   on: true  },
  { key: 'cost',      label: 'Pricing & Costs',  on: true  },
  { key: 'service',   label: 'Services Offered', on: true  },
  { key: 'location',  label: 'Location',         on: true  },
  { key: 'booking',   label: 'Booking',          on: true  },
  { key: 'emergency', label: 'Emergency',        on: true  },
  { key: 'license',   label: 'Licensing',        on: false },
  { key: 'warranty',  label: 'Warranty',         on: false },
  { key: 'payment',   label: 'Payment Methods',  on: false },
  { key: 'areas',     label: 'Service Area',     on: false },
]

const TEMPLATES = {
  hours:     ['What are your hours of operation?', 'Are you open on weekends?', 'What are your holiday hours?'],
  cost:      ['How much does {service} cost?', 'Do you offer free estimates?', 'What is your pricing for {service}?'],
  service:   ['What {service} services do you offer?', 'Do you handle residential and commercial {service}?', 'What brands do you work with for {service}?'],
  location:  ['Where are you located?', 'Is there parking available?', 'Do you serve {city}?'],
  booking:   ['How do I schedule a {service} appointment?', 'Do you offer same-day {service} service?', 'How far in advance should I book?'],
  emergency: ['Do you offer emergency {service} service?', 'Are you available 24/7 for {service} emergencies?'],
  license:   ['Are your {service} technicians licensed and insured?', 'What certifications do your {service} professionals hold?'],
  warranty:  ['Do you offer a warranty on {service} work?', 'What is your satisfaction guarantee?'],
  payment:   ['What payment methods do you accept?', 'Do you offer financing for {service}?'],
  areas:     ['What areas do you serve?', 'Do you serve outside of {city}?'],
}

const FALLBACKS = {
  hours:     '{bizName} is open Monday–Friday 8am–6pm, Saturday 9am–3pm. Emergency service is available outside business hours — call {phone} anytime.',
  cost:      '{bizName} offers competitive, transparent {service} pricing in {city}. We provide free estimates with no hidden fees. Contact us for a personalised quote.',
  service:   '{bizName} provides professional {service} services in {city} including installation, repair, maintenance, and emergency response. Our licensed team handles both residential and commercial projects.',
  location:  '{bizName} is based in {city}. We also offer mobile service throughout the area — our team comes to you. Call {phone} to schedule.',
  booking:   'Booking {service} with {bizName} is easy — call {phone} or message us. We typically schedule within 24–48 hours. Same-day service is available for urgent jobs.',
  emergency: 'Yes — {bizName} offers emergency {service} service in {city} 24/7. Call {phone} for immediate dispatch. Our typical response time is under 2 hours.',
  license:   'All {bizName} {service} technicians are fully licensed, bonded, and insured. We carry comprehensive liability insurance on every job.',
  warranty:  '{bizName} stands behind every {service} job with a 1-year workmanship guarantee. If any issue arises from our work, we return at no additional charge.',
  payment:   'We accept all major credit/debit cards, cash, and electronic bank transfer. Financing options are available for larger {service} projects.',
  areas:     '{bizName} serves {city} and surrounding communities within a 30-mile radius. Call {phone} to confirm coverage in your area.',
}

const TOPIC_COLORS = {
  hours: T.accent, cost: T.red, service: T.green, location: T.orange,
  booking: T.cyan, emergency: T.red, license: T.purple, warranty: T.green,
  payment: T.accent, areas: T.orange,
}

const STYLES = [
  { value: 'concise',  label: 'Concise (40–60 words)',  hint: 'Best for voice search & GBP' },
  { value: 'detailed', label: 'Detailed (80–120 words)', hint: 'Best for Knowledge Panel' },
  { value: 'local',    label: 'Hyperlocal',             hint: 'Mentions local streets & landmarks' },
]

const fill = (tpl, svc, city, biz, phone) =>
  (tpl || '')
    .replace(/{service}/g, svc || 'our service')
    .replace(/{city}/g,    city || 'your area')
    .replace(/{bizName}/g, biz  || 'our company')
    .replace(/{phone}/g,   phone || 'our office')

function Card({ children, style }) {
  return <div style={{ background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 10, ...style }}>{children}</div>
}
function CardHead({ icon, title, sub, right }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        <i className={icon} style={{ color: T.accentHi }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

export default function GbpQaPage({ session, clientId }) {
  const [profile, setProfile]       = useState({})
  const [service, setService]       = useState('')
  const [city, setCity]             = useState('')
  const [style, setStyle]           = useState('concise')
  const [topics, setTopics]         = useState(() => Object.fromEntries(TOPICS.map(t => [t.key, t.on])))
  const [items, setItems]           = useState([])
  const [selected, setSelected]     = useState(null)
  const [editText, setEditText]     = useState('')
  const [filter, setFilter]         = useState('all')
  const [generating, setGenerating] = useState(false)
  const [genOne, setGenOne]         = useState(null)
  const [copied, setCopied]         = useState('')
  const [schemaView, setSchemaView] = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name, biz_kw, biz_city, biz_state, biz_phone, biz_website')
      .eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        if (data.biz_kw && !service) setService(data.biz_kw.split(',')[0].trim())
        if (data.biz_city && !city) setCity(data.biz_city + (data.biz_state ? `, ${data.biz_state}` : ''))
      })
  }, [clientId, session])

  const getAuthHeader = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    return `Bearer ${s.access_token}`
  }

  const generateQuestions = () => {
    const svc = service || profile.biz_kw?.split(',')[0]?.trim() || 'our service'
    const cty = city || profile.biz_city || 'your area'
    const biz = profile.biz_name || 'our company'
    const ph  = profile.biz_phone || 'our office'
    const activeTopics = TOPICS.filter(t => topics[t.key]).map(t => t.key)
    if (!activeTopics.length) return

    const order = ['hours','cost','service','emergency','booking','location','license','warranty','payment','areas']
    const built = []
    activeTopics.forEach(topic => {
      ;(TEMPLATES[topic] || []).forEach(tpl => {
        const q = fill(tpl, svc, cty, biz, ph)
        const a = fill(FALLBACKS[topic] || '', svc, cty, biz, ph)
        built.push({ id: Date.now() + Math.random(), question: q, answer: a, topic, status: 'answered', aiGenerated: false })
      })
    })
    built.sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic))
    setItems(built.slice(0, 15))
    setSelected(null)
    setEditText('')
  }

  const aiAnswerAll = useCallback(async () => {
    if (!items.length) return
    setGenerating(true)
    try {
      const auth = await getAuthHeader()
      const styleHint = { concise: '40-60 words, voice-search optimised', detailed: '80-120 words, comprehensive', local: `50-70 words, mention local landmarks in ${city}` }[style] || '40-60 words'
      const qs = items.map((it, i) => `Q${i + 1}: ${it.question}`).join('\n')
      const res = await fetch('https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/gbp-qa-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ questions: qs, service, city, bizName: profile.biz_name, phone: profile.biz_phone, style: styleHint, client_id: clientId }),
      })
      const data = await res.json()
      if (data.answers) {
        setItems(prev => prev.map((it, i) => data.answers[i] ? { ...it, answer: data.answers[i], aiGenerated: true, status: 'answered' } : it))
      }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }, [items, service, city, profile, style, clientId])

  const aiAnswerOne = useCallback(async (idx) => {
    setGenOne(idx)
    try {
      const auth = await getAuthHeader()
      const styleHint = { concise: '40-60 words, voice-search optimised', detailed: '80-120 words, comprehensive', local: `50-70 words, mention local landmarks in ${city}` }[style]
      const res = await fetch('https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/gbp-qa-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ question: items[idx].question, service, city, bizName: profile.biz_name, phone: profile.biz_phone, style: styleHint, client_id: clientId }),
      })
      const data = await res.json()
      if (data.answer) {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, answer: data.answer, aiGenerated: true, status: 'answered' } : it))
        setEditText(data.answer)
      }
    } catch (e) { console.error(e) }
    setGenOne(null)
  }, [items, service, city, profile, style, clientId])

  const selectItem = (idx) => {
    setSelected(idx)
    setEditText(items[idx]?.answer || '')
  }

  const saveEdit = () => {
    if (selected === null) return
    setItems(prev => prev.map((it, i) => i === selected ? { ...it, answer: editText, status: 'answered' } : it))
  }

  const markPosted = (idx) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'posted' } : it))
  const deleteItem = (idx) => { setItems(prev => prev.filter((_, i) => i !== idx)); if (selected === idx) setSelected(null) }

  const copyText = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000) }
  const copyOne = (idx) => { const it = items[idx]; copyText(`Q: ${it.question}\n\nA: ${it.answer}`, `item-${idx}`) }
  const copyAll = () => { if (!items.length) return; copyText(items.map((it, i) => `--- Q&A ${i+1} ---\nQ: ${it.question}\nA: ${it.answer || '[No answer]'}`).join('\n\n'), 'all') }

  const buildSchema = () => {
    const answered = items.filter(it => it.answer && it.answer.length > 10).slice(0, 20)
    if (!answered.length) return ''
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: answered.map(it => ({
        '@type': 'Question',
        name: it.question,
        acceptedAnswer: { '@type': 'Answer', text: it.answer },
      })),
    }, null, 2)
  }

  const exportCSV = () => {
    if (!items.length) return
    const rows = [['Question','Answer','Topic','Status','Answer Length']]
    items.forEach(it => rows.push([it.question, it.answer || '', it.topic, it.status, (it.answer||'').length]))
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${(profile.biz_name || 'business').replace(/\s+/g,'-').toLowerCase()}-faq.csv`
    a.click()
  }

  const schema = buildSchema()
  const answeredCount = items.filter(it => it.answer).length
  const postedCount   = items.filter(it => it.status === 'posted').length
  const completion    = items.length ? Math.round(answeredCount / items.length * 100) : 0

  const filtered = items.filter(it => {
    if (filter === 'unanswered') return !it.answer
    if (filter === 'answered')   return !!it.answer && it.status !== 'posted'
    if (filter === 'posted')     return it.status === 'posted'
    return true
  })

  const inp = { width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }
  const btn = (bg, disabled) => ({ padding: '8px 16px', background: disabled ? '#1a3560' : bg, color: disabled ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.6 : 1 })

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-brain" style={{ color: T.accentHi, marginRight: 10 }} />
          AI FAQ & Schema — GBP Q&A Manager
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
          Generate FAQ Q&A pairs, write AI-optimised answers, and export FAQ schema JSON-LD for voice search and Google AI Overviews.
        </div>

        {/* Deprecation notice */}
        <div style={{ background: T.orangeBg, border: `1px solid rgba(249,115,22,.25)`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <i className="ti ti-alert-triangle" style={{ color: T.orange, fontSize: 16, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>
            <strong style={{ color: T.orange }}>GBP Q&A was deprecated in 2024.</strong> Google removed public Q&A posting from Business Profiles. The most impactful action now is <strong>FAQ schema (JSON-LD)</strong> on your website — this directly feeds Google's Gemini AI and People Also Ask boxes. Generate your Q&As below, then export the schema.
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Q&As Ready',  val: items.length,   color: T.accent },
            { label: 'Answered',    val: answeredCount,  color: T.green  },
            { label: 'Posted',      val: postedCount,    color: T.orange },
            { label: 'Completion',  val: `${completion}%`, color: T.purple },
          ].map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '0 28px 28px', alignItems: 'flex-start' }}>

        {/* LEFT — Settings */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead icon="ti ti-adjustments" title="Generator Settings" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Primary Service</label>
                <input value={service} onChange={e => setService(e.target.value)} placeholder="e.g. plumber, family dentist" style={inp} />
              </div>
              <div>
                <label style={lbl}>City & Area</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Austin, TX" style={inp} />
                <button onClick={() => { if (profile.biz_city) setService(profile.biz_kw?.split(',')[0]?.trim() || ''); setCity(profile.biz_city + (profile.biz_state ? `, ${profile.biz_state}` : '')) }}
                  style={{ marginTop: 5, fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  ↻ Pull from profile
                </button>
              </div>

              <div>
                <label style={lbl}>Topics to Cover</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TOPICS.map(t => (
                    <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: topics[t.key] ? T.greenBg : T.cardBg2, border: `1.5px solid ${topics[t.key] ? T.green : T.border2}`, borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: topics[t.key] ? T.green : T.muted, transition: '.12s' }}>
                      <input type="checkbox" checked={!!topics[t.key]} onChange={() => setTopics(prev => ({ ...prev, [t.key]: !prev[t.key] }))} style={{ display: 'none' }} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Answer Style</label>
                <select value={style} onChange={e => setStyle(e.target.value)} style={inp}>
                  {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{STYLES.find(s => s.value === style)?.hint}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={generateQuestions} style={btn('linear-gradient(135deg,#1d4ed8,#3b82f6)')}>
                  <i className="ti ti-list" /> Generate Q&As
                </button>
                <button onClick={aiAnswerAll} disabled={!items.length || generating} style={btn('linear-gradient(135deg,#6d28d9,#8b5cf6)', !items.length || generating)}>
                  {generating ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Writing…</> : <><i className="ti ti-sparkles" /> AI Answer All</>}
                </button>
              </div>
            </div>
          </Card>

          {/* Schema export */}
          <Card>
            <CardHead icon="ti ti-code" title="FAQ Schema JSON-LD"
              sub={`${items.filter(it => it.answer).length} pairs ready`}
              right={
                <button onClick={() => setSchemaView(v => !v)} style={{ fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {schemaView ? 'Hide' : 'Show'}
                </button>
              }
            />
            {schemaView && (
              <div style={{ padding: '12px 16px' }}>
                <pre style={{ background: T.cardBg2, borderRadius: 8, padding: '12px', fontSize: 10, color: T.accentHi, overflowX: 'auto', maxHeight: 260, overflowY: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {schema || 'Generate Q&As and answers to build schema.'}
                </pre>
                {schema && (
                  <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                    <button onClick={() => copyText(`<script type="application/ld+json">\n${schema}\n</script>`, 'schema')} style={btn('linear-gradient(135deg,#3b82f6,#1d4ed8)')}>
                      <i className="ti ti-copy" /> {copied === 'schema' ? '✓ Copied' : 'Copy with tags'}
                    </button>
                    <button onClick={exportCSV} style={{ ...btn(T.cardBg2), border: `1px solid ${T.border2}` }}>
                      <i className="ti ti-download" /> CSV
                    </button>
                  </div>
                )}
              </div>
            )}
            {!schemaView && (
              <div style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                  📌 Paste the JSON-LD into the <code style={{ background: T.cardBg2, padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>&lt;head&gt;</code> of every service page. Google Gemini reads this for AI answers.
                </div>
                {schema && (
                  <button onClick={() => copyText(`<script type="application/ld+json">\n${schema}\n</script>`, 'schema')} style={{ ...btn('linear-gradient(135deg,#3b82f6,#1d4ed8)'), marginTop: 10 }}>
                    <i className="ti ti-copy" /> {copied === 'schema' ? '✓ Copied' : 'Copy Schema'}
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* MIDDLE — Q&A list */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead
              icon="ti ti-message-question"
              title="Q&A Pairs"
              sub={`${items.length} questions · ${answeredCount} answered`}
              right={
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={copyAll} disabled={!items.length} style={{ ...btn(T.cardBg2, !items.length), padding: '5px 10px', fontSize: 11, border: `1px solid ${T.border2}` }}>
                    <i className="ti ti-copy" /> {copied === 'all' ? '✓' : 'Copy All'}
                  </button>
                  <button onClick={exportCSV} disabled={!items.length} style={{ ...btn(T.cardBg2, !items.length), padding: '5px 10px', fontSize: 11, border: `1px solid ${T.border2}` }}>
                    <i className="ti ti-download" /> CSV
                  </button>
                  <button onClick={() => { setItems([]); setSelected(null) }} disabled={!items.length} style={{ ...btn(T.redBg, !items.length), padding: '5px 10px', fontSize: 11, color: T.red, border: `1px solid rgba(248,113,113,.2)` }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              }
            />

            {/* Filter bar */}
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6 }}>
              {['all', 'unanswered', 'answered', 'posted'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${filter === f ? T.green : T.border2}`, background: filter === f ? T.greenBg : 'transparent', color: filter === f ? T.green : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* List */}
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {!items.length ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <i className="ti ti-message-question" style={{ fontSize: 40, color: T.muted, display: 'block', marginBottom: 12, opacity: .4 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Set your service and city</div>
                  <div style={{ fontSize: 12, color: T.muted }}>Then click Generate Q&As to build your FAQ list.</div>
                </div>
              ) : !filtered.length ? (
                <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>No items match this filter.</div>
              ) : filtered.map((it, fi) => {
                const realIdx = items.indexOf(it)
                const tc = TOPIC_COLORS[it.topic] || T.accent
                const isSelected = selected === realIdx
                return (
                  <div key={it.id} onClick={() => selectItem(realIdx)}
                    style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', background: isSelected ? 'rgba(59,130,246,.06)' : 'transparent', borderLeft: isSelected ? `2px solid ${T.accent}` : '2px solid transparent', transition: '.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: `${tc}18`, color: tc, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                        {it.topic}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {it.aiGenerated && <span style={{ fontSize: 10, color: T.purple }}><i className="ti ti-sparkles" style={{ fontSize: 10 }} /> AI</span>}
                        {it.status === 'posted'
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: T.greenBg, color: T.green }}>✓ Posted</span>
                          : it.answer
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'rgba(59,130,246,.12)', color: T.accentHi }}>Answered</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: T.cardBg2, color: T.muted }}>Pending</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 5, lineHeight: 1.4 }}>{it.question}</div>
                    {it.answer && (
                      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                        {it.answer.length > 120 ? it.answer.slice(0, 120) + '…' : it.answer}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { selectItem(realIdx) }} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(59,130,246,.1)', color: T.accentHi, border: `1px solid rgba(59,130,246,.2)`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Edit</button>
                      <button onClick={() => copyOne(realIdx)} style={{ fontSize: 10, padding: '3px 8px', background: T.cardBg2, color: T.muted, border: `1px solid ${T.border2}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                        {copied === `item-${realIdx}` ? '✓' : 'Copy'}
                      </button>
                      {it.status !== 'posted' && (
                        <button onClick={() => markPosted(realIdx)} style={{ fontSize: 10, padding: '3px 8px', background: T.greenBg, color: T.green, border: `1px solid rgba(16,185,129,.2)`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Mark Posted</button>
                      )}
                      <button onClick={() => deleteItem(realIdx)} style={{ fontSize: 10, padding: '3px 8px', background: T.redBg, color: T.red, border: `1px solid rgba(248,113,113,.2)`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT — Editor */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead icon="ti ti-edit" title="Answer Editor" sub={selected !== null ? `Q${selected + 1} of ${items.length}` : 'Select a Q&A to edit'} />
            <div style={{ padding: '14px 16px' }}>
              {selected === null ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: T.muted, fontSize: 12 }}>
                  Click any Q&A card to edit its answer here.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12, lineHeight: 1.4, padding: '10px 12px', background: T.cardBg2, borderRadius: 8 }}>
                    Q: {items[selected]?.question}
                  </div>
                  <label style={lbl}>Answer</label>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={6}
                    placeholder="Type or generate an answer..."
                    style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginTop: 4, marginBottom: 12 }}>
                    <span>{editText.split(/\s+/).filter(Boolean).length} words</span>
                    <span style={{ color: editText.length <= 300 ? T.green : editText.length <= 400 ? T.yellow : T.red }}>{editText.length} chars</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={saveEdit} style={btn('linear-gradient(135deg,#3b82f6,#1d4ed8)')}>
                      <i className="ti ti-device-floppy" /> Save
                    </button>
                    <button onClick={() => aiAnswerOne(selected)} disabled={genOne === selected} style={btn('linear-gradient(135deg,#6d28d9,#8b5cf6)', genOne === selected)}>
                      {genOne === selected
                        ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Writing…</>
                        : <><i className="ti ti-sparkles" /> AI Rewrite</>}
                    </button>
                    <button onClick={() => copyText(`Q: ${items[selected]?.question}\n\nA: ${editText}`, 'editor')} style={{ ...btn(T.cardBg2), border: `1px solid ${T.border2}` }}>
                      <i className="ti ti-copy" /> {copied === 'editor' ? '✓' : 'Copy'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Tips */}
          <Card>
            <CardHead icon="ti ti-bulb" title="FAQ Schema Tips" />
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { ok: true,  text: '40–60 words per answer is the sweet spot for voice search' },
                { ok: true,  text: 'Start with the direct answer — lead with value, not preamble' },
                { ok: true,  text: 'Include the business name and city naturally in the answer' },
                { ok: true,  text: 'Add the JSON-LD to every service page <head>' },
                { ok: false, text: 'Don\'t stuff keywords — write for humans, not bots' },
                { ok: false, text: 'Never duplicate answers across Q&As — each must be unique' },
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, fontSize: 12 }}>
                  <i className={`ti ti-${tip.ok ? 'circle-check' : 'circle-x'}`} style={{ color: tip.ok ? T.green : T.red, fontSize: 13, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: T.textSub, lineHeight: 1.5 }}>{tip.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
