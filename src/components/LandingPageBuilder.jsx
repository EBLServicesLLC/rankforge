/**
 * LandingPageBuilder.jsx
 * Local Landing Page Builder — three column layout
 * Left: settings | Middle: combo list | Right: preview + HTML
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://ybhpbpahhywiokhqpldj.supabase.co'

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
  purple:   '#8b5cf6',
}

const TONES = [
  { value: 'professional', label: 'Professional & trustworthy' },
  { value: 'friendly',     label: 'Friendly & approachable' },
  { value: 'urgent',       label: 'Urgent & action-focused' },
  { value: 'premium',      label: 'Premium & expert' },
]

const PAGE_FOCUS = [
  { value: 'seo',       label: 'SEO optimised (keyword-rich, long-form)' },
  { value: 'conversion', label: 'Conversion focused (CTA-heavy)' },
  { value: 'local',     label: 'Hyper-local (neighbourhood-specific)' },
  { value: 'balanced',  label: 'Balanced (SEO + conversion)' },
]

const SECTIONS = [
  { id: 'meta',     label: 'Title tag & meta description' },
  { id: 'hero',     label: 'H1 & intro paragraph' },
  { id: 'services', label: 'Services bullet list' },
  { id: 'faq',      label: 'FAQ section (3 questions)' },
  { id: 'cta',      label: 'Local CTA section' },
  { id: 'schema',   label: 'JSON-LD schema markup' },
]

function hdrs(session) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
}

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

export default function LandingPageBuilder({ session, clientId }) {
  const [services, setServices]       = useState('')
  const [cities, setCities]           = useState([])
  const [cityInput, setCityInput]     = useState('')
  const [tone, setTone]               = useState('professional')
  const [focus, setFocus]             = useState('seo')
  const [sections, setSections]       = useState(['meta','hero','services','faq','cta','schema'])
  const [combos, setCombos]           = useState([]) // { service, city, status, html, score, words }
  const [selected, setSelected]       = useState(null) // index
  const [generating, setGenerating]   = useState(false)
  const [previewTab, setPreviewTab]   = useState('preview') // preview | html
  const [copied, setCopied]           = useState('')
  const [profile, setProfile]         = useState({})
  const [error, setError]             = useState(null)
  const iframeRef                     = useRef(null)

  // Stats
  const totalCombos   = combos.length
  const totalGenerated = combos.filter(c => c.status === 'done').length
  const avgScore      = totalGenerated ? Math.round(combos.filter(c => c.status === 'done').reduce((a, c) => a + (c.score || 0), 0) / totalGenerated) : 0
  const totalWords    = combos.filter(c => c.status === 'done').reduce((a, c) => a + (c.words || 0), 0)

  // Load profile
  useEffect(() => {
    if (!clientId || !session) return
    supabase
      .from('client_data')
      .select('biz_name, biz_cat, biz_city, biz_state, biz_phone, biz_website, biz_addr, biz_zip, biz_desc, biz_kw')
      .eq('id', clientId)
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          if (data.biz_cat) setServices(data.biz_cat)
          if (data.biz_city) {
            const city = data.biz_city + (data.biz_state ? ', ' + data.biz_state : '')
            setCities([city])
          }
        }
      })
  }, [clientId, session])

  // Build combos when services/cities change
  useEffect(() => {
    if (!services.trim() || !cities.length) { setCombos([]); return }
    const serviceList = services.split(',').map(s => s.trim()).filter(Boolean)
    const newCombos = []
    for (const svc of serviceList) {
      for (const city of cities) {
        const existing = combos.find(c => c.service === svc && c.city === city)
        newCombos.push(existing || { service: svc, city, status: 'pending', html: '', score: 0, words: 0 })
      }
    }
    setCombos(newCombos)
    if (selected !== null && selected >= newCombos.length) setSelected(null)
  }, [services, cities])

  // Update iframe when selected combo html changes
  useEffect(() => {
    const combo = selected !== null ? combos[selected] : null
    if (iframeRef.current && combo?.html) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document
      doc.open(); doc.write(combo.html); doc.close()
    }
  }, [selected, combos])

  const addCity = () => {
    const c = cityInput.trim()
    if (c && !cities.includes(c)) setCities(prev => [...prev, c])
    setCityInput('')
  }

  const removeCity = (city) => setCities(prev => prev.filter(c => c !== city))

  const toggleSection = (id) =>
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const generateCombo = useCallback(async (index) => {
    const combo = combos[index]
    if (!combo || combo.status === 'generating') return
    setError(null)
    setCombos(prev => prev.map((c, i) => i === index ? { ...c, status: 'generating' } : c))
    setSelected(index)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/landing-page-generate`, {
        method: 'POST',
        headers: hdrs(session),
        body: JSON.stringify({
          service: combo.service,
          city: combo.city,
          tone, focus, sections,
          client_id: clientId,
          profile: {
            biz_name:    profile.biz_name    || '',
            biz_phone:   profile.biz_phone   || '',
            biz_website: profile.biz_website || '',
            biz_addr:    profile.biz_addr    || '',
            biz_city:    profile.biz_city    || '',
            biz_state:   profile.biz_state   || '',
            biz_zip:     profile.biz_zip     || '',
            biz_desc:    profile.biz_desc    || '',
            biz_kw:      profile.biz_kw      || '',
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')

      const words = (data.html.match(/\b\w+\b/g) || []).length
      const score = data.score || calculateScore(data.html, combo.service, combo.city)

      setCombos(prev => prev.map((c, i) => i === index
        ? { ...c, status: 'done', html: data.html, score, words }
        : c
      ))
    } catch (err) {
      setError(err.message)
      setCombos(prev => prev.map((c, i) => i === index ? { ...c, status: 'error' } : c))
    }
  }, [combos, tone, focus, sections, session, clientId, profile])

  const generateAll = async () => {
    setGenerating(true)
    for (let i = 0; i < combos.length; i++) {
      if (combos[i].status !== 'done') await generateCombo(i)
    }
    setGenerating(false)
  }

  const calculateScore = (html, service, city) => {
    let score = 0
    const lower = html.toLowerCase()
    const svcLower = service.toLowerCase()
    const cityLower = city.toLowerCase()
    if (lower.includes('<title>')) score += 15
    if (lower.includes('meta name="description"')) score += 15
    if (lower.includes('<h1')) score += 10
    if (lower.includes(svcLower)) score += 10
    if (lower.includes(cityLower)) score += 10
    if (lower.includes('application/ld+json')) score += 15
    if (lower.includes('faqpage')) score += 10
    if (lower.includes('<ul') || lower.includes('<li')) score += 5
    if ((lower.match(new RegExp(cityLower, 'g')) || []).length >= 3) score += 10
    return Math.min(score, 100)
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const downloadHTML = (html, service, city) => {
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${city.toLowerCase().replace(/[\s,]+/g, '-')}-${service.toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
  }

  const downloadAllZip = async () => {
    const done = combos.filter(c => c.status === 'done')
    if (!done.length) return
    // Simple approach: download each file individually
    done.forEach((c, i) => {
      setTimeout(() => downloadHTML(c.html, c.service, c.city), i * 300)
    })
  }

  const selectedCombo = selected !== null ? combos[selected] : null

  const statusColor = (status) => ({
    pending:    T.muted,
    generating: T.yellow,
    done:       T.green,
    error:      T.red,
  }[status] || T.muted)

  const statusLabel = (status) => ({
    pending:    'Pending',
    generating: 'Generating...',
    done:       'Generated',
    error:      'Error',
  }[status] || 'Pending')

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          <i className="ti ti-file-text" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Local Landing Page Builder
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, maxWidth: 800 }}>
          Generate complete, publish-ready landing pages for every service × city combination.
          Each page includes an SEO title, meta description, H1, services list, FAQ, schema markup, and a local CTA.
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, paddingBottom: 20, borderBottom: `1px solid ${T.border2}`, alignItems: 'flex-end' }}>
          {[
            { label: 'TOTAL PAGES',  value: totalCombos,   color: T.accentHi },
            { label: 'GENERATED',    value: totalGenerated, color: T.green },
            { label: 'AVG SEO SCORE', value: avgScore ? `${avgScore}` : '—', color: T.yellow },
            { label: 'TOTAL WORDS',  value: totalWords || '—', color: T.purple },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: '.5px' }}>{s.label}</div>
            </div>
          ))}
          {/* Bulk actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {totalGenerated > 0 && (
              <>
                <button onClick={downloadAllZip}
                  style={{ padding: '7px 14px', background: T.cardBg, border: `1px solid ${T.border2}`, color: T.muted, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-download"></i> Download All
                </button>
                <button onClick={() => {
                  const allSchema = combos.filter(c => c.status === 'done').map(c => {
                    const m = c.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
                    return m ? m.join('\n') : ''
                  }).join('\n\n')
                  copyText(allSchema, 'allschema')
                }}
                  style={{ padding: '7px 14px', background: T.cardBg, border: `1px solid ${T.border2}`, color: T.muted, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-copy"></i> {copied === 'allschema' ? '✓ Copied' : 'Copy All Schema'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Three column layout ── */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 28px', alignItems: 'flex-start' }}>

        {/* ── COL 1: Settings ── */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Card>
            <CardHead icon="ti ti-settings" title="Page Settings" sub="Pulled from your business profile" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Services */}
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Services (comma separated)</div>
                <input value={services} onChange={e => setServices(e.target.value)}
                  placeholder="e.g. HR Consulting, Payroll, Recruiting"
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              {/* Cities */}
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Target Cities</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {cities.map(city => (
                    <span key={city} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(59,130,246,.15)', color: T.accentHi, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                      {city}
                      <span onClick={() => removeCity(city)} style={{ cursor: 'pointer', color: T.muted, fontWeight: 700, fontSize: 13 }}>×</span>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={cityInput} onChange={e => setCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCity()}
                    placeholder="Add a city..."
                    style={{ flex: 1, background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: T.text, fontFamily: 'inherit', outline: 'none' }} />
                  <button onClick={addCity}
                    style={{ padding: '7px 12px', background: T.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Add
                  </button>
                </div>
              </div>

              {/* Tone */}
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Tone</div>
                <select value={tone} onChange={e => setTone(e.target.value)}
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', outline: 'none' }}>
                  {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Page focus */}
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Page Focus</div>
                <select value={focus} onChange={e => setFocus(e.target.value)}
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', outline: 'none' }}>
                  {PAGE_FOCUS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {/* Sections */}
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Include Sections</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {SECTIONS.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: T.textSub }}>
                      <input type="checkbox" checked={sections.includes(s.id)} onChange={() => toggleSection(s.id)}
                        style={{ accentColor: T.accent }} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </Card>

          {/* How to publish */}
          <Card>
            <CardHead icon="ti ti-brand-wordpress" title="How to Publish" sub="Add generated pages to your website" />
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { step: '1', text: 'Generate your page using the form above' },
                { step: '2', text: 'Click Download HTML to save the file' },
                { step: '3', text: 'In WordPress: Pages → Add New → switch to Code Editor' },
                { step: '4', text: 'Paste the HTML and publish' },
                { step: '5', text: 'Set URL slug to: city-service (e.g. emerald-isle-hr)' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ background: 'rgba(59,130,246,.15)', color: T.accentHi, borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{item.step}</span>
                  <span style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* ── COL 2: Combo list ── */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Card>
            <CardHead icon="ti ti-list" title="Page Combos"
              sub={`${totalCombos} pages · ${totalGenerated} generated`}
              right={
                combos.length > 0 && (
                  <button onClick={generating ? null : generateAll} disabled={generating}
                    style={{ padding: '5px 12px', background: generating ? T.muted2 : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {generating ? 'Generating...' : 'Generate All'}
                  </button>
                )
              }
            />
            {!combos.length ? (
              <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 12 }}>
                Enter services and cities to see your page combos
              </div>
            ) : (
              <div>
                {combos.map((combo, i) => (
                  <div key={`${combo.service}-${combo.city}`}
                    onClick={() => setSelected(i)}
                    style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: i < combos.length - 1 ? `1px solid ${T.border}` : 'none', background: selected === i ? 'rgba(59,130,246,.08)' : 'transparent', borderLeft: selected === i ? `3px solid ${T.accent}` : '3px solid transparent', transition: 'all .15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{combo.service}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(combo.status) }}>
                        {combo.status === 'generating' ? '⏳' : combo.status === 'done' ? '✓' : combo.status === 'error' ? '✗' : '○'} {statusLabel(combo.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted }}>{combo.city}</div>
                    {combo.status === 'done' && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, color: T.muted }}>
                        <span style={{ color: T.green }}>SEO {combo.score}</span>
                        <span>{combo.words} words</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {error && (
            <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: T.red }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }}></i>{error}
            </div>
          )}

        </div>

        {/* ── COL 3: Preview + HTML ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!selectedCombo && (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <i className="ti ti-file-text" style={{ fontSize: 40, color: T.muted, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Select a page combo</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
                Click any combo in the list, then click Generate to create your landing page.
              </div>
            </Card>
          )}

          {selectedCombo && (
            <Card>
              {/* Header row */}
              <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                    {selectedCombo.service} — {selectedCombo.city}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {selectedCombo.status === 'done'
                      ? `SEO Score: ${selectedCombo.score} · ${selectedCombo.words} words`
                      : selectedCombo.status === 'generating'
                      ? 'Generating your page...'
                      : 'Not yet generated'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Preview / HTML tabs */}
                  <div style={{ display: 'flex', gap: 3, background: T.cardBg2, borderRadius: 7, padding: 3 }}>
                    {['preview', 'html'].map(tab => (
                      <button key={tab} onClick={() => setPreviewTab(tab)}
                        style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: previewTab === tab ? T.cardBg : 'transparent', color: previewTab === tab ? T.text : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                        {tab === 'preview' ? '👁 Preview' : '‹/› HTML'}
                      </button>
                    ))}
                  </div>
                  {/* Generate button */}
                  <button
                    onClick={() => generateCombo(selected)}
                    disabled={selectedCombo.status === 'generating'}
                    style={{ padding: '7px 16px', background: selectedCombo.status === 'generating' ? T.muted2 : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: selectedCombo.status === 'generating' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`ti ${selectedCombo.status === 'generating' ? 'ti-loader-2' : selectedCombo.status === 'done' ? 'ti-refresh' : 'ti-sparkles'}`}></i>
                    {selectedCombo.status === 'generating' ? 'Generating...' : selectedCombo.status === 'done' ? 'Regenerate' : 'Generate Page'}
                  </button>
                  {selectedCombo.status === 'done' && (
                    <>
                      <button onClick={() => copyText(selectedCombo.html, 'html')}
                        style={{ padding: '7px 14px', background: T.cardBg2, color: T.muted, border: `1px solid ${T.border2}`, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-copy"></i> {copied === 'html' ? '✓ Copied' : 'Copy HTML'}
                      </button>
                      <button onClick={() => downloadHTML(selectedCombo.html, selectedCombo.service, selectedCombo.city)}
                        style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-download"></i> Download HTML
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Preview / HTML content */}
              {selectedCombo.status === 'pending' && (
                <div style={{ padding: 48, textAlign: 'center', color: T.muted }}>
                  <i className="ti ti-sparkles" style={{ fontSize: 36, marginBottom: 12, display: 'block', color: T.accentHi }}></i>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Ready to generate</div>
                  <div style={{ fontSize: 12, color: T.muted }}>Click Generate Page to create this landing page with AI</div>
                </div>
              )}

              {selectedCombo.status === 'generating' && (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 36, color: T.accent, marginBottom: 12, display: 'block' }}></i>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Generating your landing page...</div>
                  <div style={{ fontSize: 12, color: T.muted }}>Claude is writing SEO-optimised content for {selectedCombo.service} in {selectedCombo.city}</div>
                </div>
              )}

              {selectedCombo.status === 'done' && previewTab === 'preview' && (
                <div style={{ position: 'relative' }}>
                  <iframe
                    ref={iframeRef}
                    style={{ width: '100%', height: 600, border: 'none', display: 'block', borderRadius: '0 0 10px 10px' }}
                    title="Landing page preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}

              {selectedCombo.status === 'done' && previewTab === 'html' && (
                <pre style={{ margin: 0, padding: '16px 18px', fontSize: 11, color: T.textSub, overflowX: 'auto', overflowY: 'auto', maxHeight: 600, background: T.cardBg2, lineHeight: 1.6, borderRadius: '0 0 10px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {selectedCombo.html}
                </pre>
              )}

              {selectedCombo.status === 'error' && (
                <div style={{ padding: 32, textAlign: 'center', color: T.red }}>
                  <i className="ti ti-circle-x" style={{ fontSize: 36, marginBottom: 12, display: 'block' }}></i>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Generation failed</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{error}</div>
                  <button onClick={() => generateCombo(selected)} style={{ marginTop: 14, padding: '8px 16px', background: T.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Try Again
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* SEO Score breakdown */}
          {selectedCombo?.status === 'done' && (
            <Card>
              <CardHead icon="ti ti-chart-bar" title="SEO Score Breakdown" sub="What this page is optimised for" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                {[
                  { label: 'Title Tag',         check: selectedCombo.html.includes('<title>'),                         points: 15 },
                  { label: 'Meta Description',  check: selectedCombo.html.includes('meta name="description"'),          points: 15 },
                  { label: 'H1 Heading',        check: selectedCombo.html.includes('<h1'),                              points: 10 },
                  { label: 'Service Keywords',  check: selectedCombo.html.toLowerCase().includes(selectedCombo.service.toLowerCase()), points: 10 },
                  { label: 'City Keywords',     check: selectedCombo.html.toLowerCase().includes(selectedCombo.city.toLowerCase()),    points: 10 },
                  { label: 'FAQ Schema',        check: selectedCombo.html.includes('FAQPage'),                          points: 10 },
                  { label: 'Local Schema',      check: selectedCombo.html.includes('application/ld+json'),              points: 15 },
                  { label: 'Service List',      check: selectedCombo.html.includes('<ul') || selectedCombo.html.includes('<li'), points: 5 },
                  { label: 'City Repetition',   check: (selectedCombo.html.toLowerCase().match(new RegExp(selectedCombo.city.toLowerCase(), 'g')) || []).length >= 3, points: 10 },
                ].map((item, i) => (
                  <div key={item.label} style={{ padding: '12px 16px', borderRight: i % 3 < 2 ? `1px solid ${T.border}` : 'none', borderBottom: i < 6 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: item.check ? T.green : T.muted, fontWeight: 700, fontSize: 14 }}>{item.check ? '✓' : '○'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: item.check ? T.text : T.muted }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: item.check ? T.green : T.muted }}>{item.check ? `+${item.points} pts` : 'missing'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
