/**
 * SchemaMonitorPage.jsx
 * Structured Data Monitor — three column layout
 * Left: settings + history | Middle: results list | Right: fix panel + schema code
 */

import { useState, useEffect, useCallback } from 'react'
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
}

const SCHEMA_TYPES = [
  { id: 'LocalBusiness',   label: 'LocalBusiness',   icon: 'ti ti-building-store', desc: 'Name, address, phone, hours' },
  { id: 'FAQPage',         label: 'FAQPage',          icon: 'ti ti-help-circle',    desc: 'Voice search FAQ schema' },
  { id: 'Service',         label: 'Service',          icon: 'ti ti-settings',       desc: 'Service descriptions' },
  { id: 'AggregateRating', label: 'AggregateRating',  icon: 'ti ti-star',           desc: 'Review star ratings' },
  { id: 'BreadcrumbList',  label: 'BreadcrumbList',   icon: 'ti ti-layout-navbar',  desc: 'Page navigation structure' },
  { id: 'WebSite',         label: 'WebSite',          icon: 'ti ti-world',          desc: 'Site search sitelinks' },
  { id: 'Organization',    label: 'Organization',     icon: 'ti ti-building',       desc: 'Business identity schema' },
]

// Plain-English fix steps per schema type
const FIX_STEPS = {
  LocalBusiness: {
    steps: [
      "Contact your web developer and say: 'My website is missing LocalBusiness schema — can you add it?'",
      "If you manage your own WordPress site, install the free 'Rank Math SEO' plugin — it adds this automatically.",
      "Fill in your business name, address, and phone number in the plugin settings.",
      "Come back here and click Run Check Now to confirm it's working.",
    ],
    note: "LocalBusiness schema tells Google your exact business name, address, and phone. Without it, Google may show wrong information.",
  },
  FAQPage: {
    steps: [
      "Go to the Voice & FAQ tab in RankForged (left sidebar).",
      "Generate questions and answers for your business.",
      "Click 'Copy Schema' to copy the code block below.",
      "Send that code to your web developer and say: 'Please add this to the head section of my website.'",
      "Come back here and click Run Check Now to confirm.",
    ],
    note: "FAQ schema tells Google to show your Q&A in search results and read your answers aloud for voice searches.",
  },
  Service: {
    steps: [
      "Contact your web developer and say: 'My website is missing Service schema — can you add it for each of my main services?'",
      "If you use WordPress with Rank Math, go to each service page and enable 'Service' schema in the settings.",
      "Make sure each service page has a name and description filled in.",
      "Run the check again after it's added.",
    ],
    note: "Service schema helps Google understand exactly what services you offer, improving how you appear in search.",
  },
  AggregateRating: {
    steps: [
      "Contact your web developer and ask them to add your star rating to your website schema.",
      "Tell them your current Google review score and total number of reviews — they need both numbers.",
      "Alternatively, a plugin like 'WP Review' or 'Schema Pro' can add this automatically.",
      "Run the check again after it's set up.",
    ],
    note: "Star ratings in search results (called rich snippets) significantly increase how many people click on your listing.",
  },
  BreadcrumbList: {
    steps: [
      "Contact your web developer and ask them to add breadcrumb navigation to your website.",
      "If you use WordPress, most SEO plugins (Rank Math, Yoast) add breadcrumb schema automatically — just enable it in settings.",
      "Run the check again after it's set up.",
    ],
    note: "Breadcrumbs help Google understand your site structure and can show your page path directly in search results.",
  },
  WebSite: {
    steps: [
      "Ask your web developer to add WebSite schema to your homepage — it's a quick one-time task.",
      "Run the check again after it's added.",
    ],
    note: "WebSite schema can enable a search box directly in Google search results that searches your website.",
  },
  Organization: {
    steps: [
      "Ask your web developer to add Organization schema to your website.",
      "It should include your business name, logo URL, website, and social media links.",
      "Run the check again after it's added.",
    ],
    note: "Organization schema helps Google show your logo and business info in the knowledge panel on the right side of search results.",
  },
}

// Build a pre-filled schema template from business profile
function buildTemplate(type, profile) {
  const name    = profile?.biz_name    || 'Your Business Name'
  const phone   = profile?.biz_phone   || '+1-000-000-0000'
  const addr    = profile?.biz_addr    || '123 Main St'
  const city    = profile?.biz_city    || 'Your City'
  const state   = profile?.biz_state   || 'NC'
  const zip     = profile?.biz_zip     || '00000'
  const website = profile?.biz_website || 'https://yourwebsite.com'
  const cat     = profile?.biz_cat     || 'Local Business'
  const desc    = profile?.biz_desc    || 'Description of your business'

  const templates = {
    LocalBusiness: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name, telephone: phone, url: website,
      description: desc,
      address: { '@type': 'PostalAddress', streetAddress: addr, addressLocality: city, addressRegion: state, postalCode: zip, addressCountry: 'US' },
      priceRange: '$$',
    },
    FAQPage: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: `What services does ${name} offer?`, acceptedAnswer: { '@type': 'Answer', text: `${name} offers ${cat} services in ${city}, ${state}. ${desc}` } },
        { '@type': 'Question', name: `Where is ${name} located?`, acceptedAnswer: { '@type': 'Answer', text: `${name} is located at ${addr}, ${city}, ${state} ${zip}.` } },
        { '@type': 'Question', name: `How can I contact ${name}?`, acceptedAnswer: { '@type': 'Answer', text: `You can reach ${name} by phone at ${phone} or visit our website at ${website}.` } },
      ],
    },
    Service: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: cat, provider: { '@type': 'LocalBusiness', name },
      areaServed: { '@type': 'City', name: city },
      description: desc, url: website,
    },
    AggregateRating: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name, url: website,
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', reviewCount: '10', bestRating: '5', worstRating: '1' },
    },
    BreadcrumbList: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: website },
        { '@type': 'ListItem', position: 2, name: cat,    item: `${website}/${cat.toLowerCase().replace(/\s+/g, '-')}` },
      ],
    },
    WebSite: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name, url: website,
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${website}/?s={search_term_string}` }, 'query-input': 'required name=search_term_string' },
    },
    Organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name, url: website,
      logo: `${website}/logo.png`,
      contactPoint: { '@type': 'ContactPoint', telephone: phone, contactType: 'customer service' },
    },
  }
  return templates[type] || null
}

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

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{children}</div>
}

export default function SchemaMonitorPage({ session, clientId }) {
  const [url, setUrl]                     = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['LocalBusiness', 'FAQPage', 'Service'])
  const [checking, setChecking]           = useState(false)
  const [results, setResults]             = useState(null)
  const [history, setHistory]             = useState([])
  const [error, setError]                 = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profile, setProfile]             = useState({})
  const [selected, setSelected]           = useState(null) // selected result row
  const [copied, setCopied]               = useState('')
  const [stats, setStats]                 = useState({ runs: 0, passing: 0, failing: 0, lastCheck: 'Never' })

  useEffect(() => {
    if (!clientId || !session) return
    supabase
      .from('client_data')
      .select('biz_website, biz_name, biz_phone, biz_addr, biz_city, biz_state, biz_zip, biz_cat, biz_desc')
      .eq('id', clientId)
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          if (data.biz_website) { setUrl(data.biz_website); setProfileLoaded(true) }
        }
      })
    try {
      const saved = JSON.parse(localStorage.getItem(`rf_schema_history_${clientId}`) || '[]')
      setHistory(saved)
      if (saved.length) {
        const last = saved[0]
        setStats({ runs: saved.length, passing: last.passing, failing: last.failing, lastCheck: new Date(last.timestamp).toLocaleDateString() })
      }
    } catch (e) {}
  }, [clientId, session])

  const toggleType = (id) =>
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const runCheck = useCallback(async () => {
    if (!url.trim()) { setError('Enter a website URL first.'); return }
    if (!selectedTypes.length) { setError('Select at least one schema type.'); return }
    setError(null); setChecking(true); setResults(null); setSelected(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/schema-monitor`, {
        method: 'POST', headers: hdrs(session),
        body: JSON.stringify({ url: url.trim(), types: selectedTypes, client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Check failed')
      setResults(data)
      // Auto-select first failing result
      const firstFail = data.results.find(r => r.status !== 'pass')
      if (firstFail) setSelected(firstFail.type)
      else setSelected(data.results[0]?.type)
      const passing = data.results.filter(r => r.status === 'pass').length
      const failing = data.results.filter(r => r.status !== 'pass').length
      const entry = { timestamp: new Date().toISOString(), url, passing, failing, results: data.results }
      const newHistory = [entry, ...history].slice(0, 10)
      setHistory(newHistory)
      try { localStorage.setItem(`rf_schema_history_${clientId}`, JSON.stringify(newHistory)) } catch (e) {}
      setStats({ runs: newHistory.length, passing, failing, lastCheck: 'Today' })
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }, [url, selectedTypes, session, clientId, history])

  const copySchema = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const downloadSchema = (json, type) => {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${type}-schema.json`
    a.click()
  }

  // Get the selected result object
  const selectedResult = results?.results?.find(r => r.type === selected)
  const selectedFound  = results?.schemasFound?.find(s => {
    const t = s['@type']
    return Array.isArray(t) ? t.includes(selected) : t === selected
  })
  const template = selected ? buildTemplate(selected, profile) : null
  const schemaToShow = selectedFound || template
  const schemaJson = schemaToShow ? `<script type="application/ld+json">\n${JSON.stringify(schemaToShow, null, 2)}\n</script>` : ''
  const isTemplate = !selectedFound && !!template

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          <i className="ti ti-code" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Structured Data Monitor
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, maxWidth: 900 }}>
          Checks whether your schema markup is live on your website. Theme updates, plugin conflicts, and CMS changes
          can silently remove JSON-LD — costing you rich results and voice search rankings overnight.
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, paddingBottom: 20, borderBottom: `1px solid ${T.border2}` }}>
          {[
            { label: 'CHECKS RUN', value: stats.runs,      color: T.accentHi },
            { label: 'PASSING',    value: stats.passing,   color: T.green },
            { label: 'FAILING',    value: stats.failing,   color: T.red },
            { label: 'LAST CHECK', value: stats.lastCheck, color: T.yellow, isText: true },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: s.isText ? 16 : 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: '.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Three column layout ── */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 28px', alignItems: 'flex-start' }}>

        {/* ── COL 1: Settings + History ── */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Card>
            <CardHead icon="ti ti-settings" title="Monitor Settings" sub={profileLoaded ? '✓ Loaded from profile' : 'Enter your website URL'} />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>Website URL</Label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourwebsite.com"
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <Label>Schema Types to Check</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {SCHEMA_TYPES.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '5px 8px', borderRadius: 6, background: selectedTypes.includes(t.id) ? 'rgba(59,130,246,.1)' : 'transparent', border: `1px solid ${selectedTypes.includes(t.id) ? T.accent : 'transparent'}`, transition: 'all .15s' }}>
                      <input type="checkbox" checked={selectedTypes.includes(t.id)} onChange={() => toggleType(t.id)} style={{ accentColor: T.accent, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={checking ? null : runCheck} disabled={checking}
                style={{ width: '100%', padding: '10px', background: checking ? T.muted2 : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <i className={`ti ${checking ? 'ti-loader-2' : 'ti-radar'}`}></i>
                {checking ? 'Checking...' : 'Run Check Now'}
              </button>
              <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"
                style={{ width: '100%', padding: '8px', background: 'transparent', color: T.muted, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none' }}>
                <i className="ti ti-brand-google"></i> Validate with Google
              </a>
              {error && (
                <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.red }}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }}></i>{error}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHead icon="ti ti-history" title="Check History" sub="Last 10 checks" />
            <div style={{ padding: '10px 14px' }}>
              {!history.length ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: T.muted, fontSize: 12 }}>No checks run yet</div>
              ) : history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < history.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>{new Date(h.timestamp).toLocaleDateString()}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>{new Date(h.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: T.green }}>✓ {h.passing}</span>
                    <span style={{ color: T.red }}>✗ {h.failing}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* ── COL 2: Results list ── */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Empty state */}
          {!results && !checking && (
            <Card style={{ padding: 32, textAlign: 'center' }}>
              <i className="ti ti-radar" style={{ fontSize: 40, color: T.muted, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Ready to check</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Enter your URL and click Run Check Now to see your schema results.</div>
            </Card>
          )}

          {checking && (
            <Card style={{ padding: 32, textAlign: 'center' }}>
              <i className="ti ti-loader-2" style={{ fontSize: 36, color: T.accent, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Scanning your website...</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Reading schema blocks from your page</div>
            </Card>
          )}

          {results && !checking && (
            <>
              {/* Summary */}
              <Card>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{results.allPass ? '✅' : '⚠️'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: results.allPass ? T.green : T.yellow }}>
                      {results.allPass ? 'All checks passed' : 'Issues found'}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted }}>
                      {results.results.filter(r => r.status === 'pass').length} passing · {results.results.filter(r => r.status !== 'pass').length} failing
                    </div>
                  </div>
                </div>
              </Card>

              {/* Results rows */}
              <Card>
                <CardHead icon="ti ti-list-check" title="Schema Results" sub="Click a row to see details" />
                <div>
                  {results.results.map((r, i) => {
                    const isSelected = selected === r.type
                    const statusColor = r.status === 'pass' ? T.green : r.status === 'fail' ? T.red : T.yellow
                    const statusIcon  = r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '!'
                    return (
                      <div key={r.type} onClick={() => setSelected(r.type)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: i < results.results.length - 1 ? `1px solid ${T.border}` : 'none', background: isSelected ? 'rgba(59,130,246,.08)' : 'transparent', borderLeft: isSelected ? `3px solid ${T.accent}` : '3px solid transparent', transition: 'all .15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.type}</div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: statusColor, background: `${statusColor}18`, padding: '2px 8px', borderRadius: 20 }}>
                            {statusIcon} {r.status === 'pass' ? 'Pass' : r.status === 'missing' ? 'Missing' : 'Fail'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{r.summary}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* What gets checked */}
              <Card>
                <CardHead icon="ti ti-checklist" title="What Gets Checked" />
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Schema code present on page' },
                    { label: 'Correct schema type found' },
                    { label: 'Valid JSON (no errors)' },
                    { label: 'Required fields populated' },
                    { label: 'Business name matches profile' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: T.textSub }}>
                      <i className="ti ti-check" style={{ color: T.accentHi, fontSize: 12 }}></i>
                      {item.label}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>

        {/* ── COL 3: Fix panel + Schema code ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!selected && (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <i className="ti ti-hand-click" style={{ fontSize: 40, color: T.muted, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Select a schema type</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Click any row in the results list to see fix instructions and the schema code for that type.</div>
            </Card>
          )}

          {selected && selectedResult && (
            <>
              {/* Status header */}
              <Card>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>
                    {selectedResult.status === 'pass' ? '✅' : selectedResult.status === 'missing' ? '🔍' : '⚠️'}
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: selectedResult.status === 'pass' ? T.green : selectedResult.status === 'missing' ? T.yellow : T.red }}>
                      {selectedResult.type} — {selectedResult.status === 'pass' ? 'Working correctly' : selectedResult.status === 'missing' ? 'Not found on your website' : 'Found but has issues'}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{selectedResult.summary}</div>
                  </div>
                </div>
              </Card>

              {/* Check details */}
              {selectedResult.details?.length > 0 && (
                <Card>
                  <CardHead icon="ti ti-list-details" title="Check Details" sub="Individual validation results" />
                  <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedResult.details.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ color: d.pass ? T.green : T.red, fontWeight: 700, flexShrink: 0 }}>{d.pass ? '✓' : '✗'}</span>
                        <span style={{ color: d.pass ? T.textSub : T.red }}>{d.label}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* What to do — only show if not passing */}
              {selectedResult.status !== 'pass' && FIX_STEPS[selected] && (
                <Card>
                  <div style={{ padding: '12px 18px', background: 'rgba(245,158,11,.06)', borderBottom: `1px solid rgba(245,158,11,.15)`, display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px 10px 0 0' }}>
                    <span style={{ fontSize: 18 }}>👋</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>What to do about this</div>
                  </div>
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {FIX_STEPS[selected].steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ background: 'rgba(59,130,246,.15)', color: T.accentHi, borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>{step}</span>
                      </div>
                    ))}
                    {FIX_STEPS[selected].note && (
                      <div style={{ marginTop: 6, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                        💬 {FIX_STEPS[selected].note}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Schema code panel */}
              {schemaJson && (
                <Card>
                  <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {isTemplate ? `📋 ${selected} Schema Template` : `📋 ${selected} Schema (Live on your site)`}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        {isTemplate
                          ? `Pre-filled with your business profile — copy and send to your web developer`
                          : `This is the exact code Google currently reads on your website`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => copySchema(schemaJson, 'schema')}
                        style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-copy"></i> {copied === 'schema' ? '✓ Copied!' : 'Copy'}
                      </button>
                      <button onClick={() => downloadSchema(schemaJson, selected)}
                        style={{ padding: '7px 14px', background: T.cardBg2, color: T.muted, border: `1px solid ${T.border2}`, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-download"></i> Download
                      </button>
                    </div>
                  </div>
                  {isTemplate && (
                    <div style={{ padding: '10px 18px', background: 'rgba(59,130,246,.06)', borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.accentHi, lineHeight: 1.6 }}>
                      <strong>📌 How to use this:</strong> Click Copy above, then send this code to your web developer with this message: <em>"Please add this code to the &lt;head&gt; section of my website homepage."</em> That's it — they'll know exactly what to do.
                    </div>
                  )}
                  <pre style={{ margin: 0, padding: '14px 18px', fontSize: 11, color: T.textSub, overflowX: 'auto', maxHeight: 320, background: T.cardBg2, lineHeight: 1.6, borderRadius: '0 0 10px 10px' }}>
                    {schemaJson}
                  </pre>
                </Card>
              )}

              {/* Pass confirmation */}
              {selectedResult.status === 'pass' && (
                <Card>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🎉</span>
                    <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>
                      Your <strong style={{ color: T.green }}>{selected}</strong> schema is working correctly. Google can read it and may use it to enhance your search results. No action needed — just run this check weekly to make sure it stays live.
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
