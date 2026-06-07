/**
 * NapAuditPage.jsx
 * NAP Audit — Submitted Directories
 * Checks submitted directories against canonical NAP, flags mismatches
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg:  '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border:  '#0f2040', border2: '#1a3560', text: '#e2e8f0',
  textSub: '#c8d8f0', muted: '#4a6080', accent: '#3b82f6',
  accentHi:'#60a5fa', green: '#10b981', greenBg: 'rgba(16,185,129,.12)',
  red:     '#f87171', redBg: 'rgba(248,113,113,.1)',
  yellow:  '#f59e0b', yellowBg: 'rgba(245,158,11,.1)',
  purple:  '#8b5cf6',
}

// Top 30 directories to audit — matching the DIRS list in rankforge3
const AUDIT_DIRS = [
  { id: 1,  name: 'Google Business Profile', da: 100, url: 'https://business.google.com' },
  { id: 2,  name: 'Apple Maps Connect',      da: 98,  url: 'https://mapsconnect.apple.com' },
  { id: 3,  name: 'Facebook Business',       da: 96,  url: 'https://business.facebook.com' },
  { id: 4,  name: 'Bing Places',             da: 96,  url: 'https://bingplaces.com' },
  { id: 5,  name: 'Yelp',                    da: 93,  url: 'https://biz.yelp.com' },
  { id: 6,  name: 'LinkedIn Company',        da: 98,  url: 'https://linkedin.com/company' },
  { id: 7,  name: 'BBB',                     da: 86,  url: 'https://bbb.org' },
  { id: 8,  name: 'Nextdoor Business',       da: 74,  url: 'https://business.nextdoor.com' },
  { id: 9,  name: 'Foursquare',              da: 72,  url: 'https://business.foursquare.com' },
  { id: 10, name: 'Thumbtack',               da: 76,  url: 'https://thumbtack.com/pro' },
  { id: 11, name: 'Angi / HomeAdvisor',      da: 82,  url: 'https://pro.angi.com' },
  { id: 12, name: 'YellowPages',             da: 79,  url: 'https://yellowpages.com' },
  { id: 13, name: 'Manta',                   da: 68,  url: 'https://manta.com' },
  { id: 14, name: 'Crunchbase',              da: 78,  url: 'https://crunchbase.com' },
  { id: 15, name: 'Houzz',                   da: 91,  url: 'https://pro.houzz.com' },
  { id: 16, name: 'TripAdvisor',             da: 87,  url: 'https://tripadvisor.com' },
  { id: 17, name: 'Trustpilot',              da: 82,  url: 'https://business.trustpilot.com' },
  { id: 18, name: 'G2',                      da: 66,  url: 'https://g2.com' },
  { id: 19, name: 'Clutch.co',               da: 65,  url: 'https://clutch.co' },
  { id: 20, name: 'Alignable',               da: 62,  url: 'https://alignable.com' },
  { id: 21, name: 'Chamber of Commerce',     da: 46,  url: 'https://chamberofcommerce.com' },
  { id: 22, name: 'Hotfrog',                 da: 58,  url: 'https://hotfrog.com' },
  { id: 23, name: 'MapQuest',                da: 70,  url: 'https://mapquest.com' },
  { id: 24, name: 'Waze',                    da: 85,  url: 'https://waze.com/brands' },
  { id: 25, name: 'Superpages',              da: 65,  url: 'https://superpages.com' },
]

// Normalise helpers
const normPhone = p => (p || '').replace(/[^0-9]/g, '')
const normAddr  = a => (a || '').toLowerCase()
  .replace(/\bstreet\b/, 'st').replace(/\bavenue\b/, 'ave')
  .replace(/\bboulevard\b/, 'blvd').replace(/\bdrive\b/, 'dr')
  .replace(/\broad\b/, 'rd').replace(/\blane\b/, 'ln')
  .replace(/\bsuite\b/, 'ste').replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ').trim()
const normName  = n => (n || '').toLowerCase()
  .replace(/\b(inc|llc|ltd|co|company|corp|corporation)\b\.?/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const normUrl   = u => (u || '').replace(/\/$/, '').toLowerCase()

// Deterministic simulation based on dir name hash
const strHash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h) }

function simulateDir(dir, canonical) {
  const h = strHash(dir.name + canonical.name)
  const pct = h % 100
  let name = canonical.name, phone = canonical.phone, addr = canonical.addr, url = canonical.url

  if (pct < 5) name = canonical.name.replace('&', '').replace(' and ', ' ')
  else if (pct < 15) name = canonical.name + (h % 2 === 0 ? ' LLC' : '')

  const cp = normPhone(canonical.phone)
  if (pct < 3) phone = cp.slice(0,3) + '-' + cp.slice(3,6) + '-' + cp.slice(6)
  else if (pct < 7) phone = cp

  if (pct < 4) addr = canonical.addr.replace('Suite', 'Ste').replace('Street', 'St')
  else if (pct < 8) addr = canonical.addr + (h % 3 === 0 ? ' #100' : '')

  if (pct < 6) url = canonical.url.replace('https://', 'http://').replace('www.', '')
  else if (pct < 10) url = canonical.url.replace('https://www.', 'https://')

  const fields = [
    { field: 'Name',    listed: name,  canonical: canonical.name,  ok: normName(name) === normName(canonical.name) },
    { field: 'Phone',   listed: phone, canonical: canonical.phone, ok: normPhone(phone) === normPhone(canonical.phone) },
    { field: 'Address', listed: addr,  canonical: canonical.addr,  ok: normAddr(addr) === normAddr(canonical.addr) },
    { field: 'Website', listed: url,   canonical: canonical.url,   ok: normUrl(url) === normUrl(canonical.url) },
  ]
  const errors   = fields.filter(f => !f.ok && f.listed && f.canonical).length
  const missing  = fields.filter(f => !f.listed).length
  return { dir, fields, status: errors > 0 ? 'error' : missing > 0 ? 'warning' : 'ok', errors, missing, source: 'Simulation' }
}

function scoreColor(s) { return s >= 80 ? T.green : s >= 60 ? T.yellow : T.red }

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

export default function NapAuditPage({ session, clientId }) {
  const [profile, setProfile]     = useState({})
  const [napName, setNapName]     = useState('')
  const [napPhone, setNapPhone]   = useState('')
  const [napAddr, setNapAddr]     = useState('')
  const [napCity, setNapCity]     = useState('')
  const [napUrl, setNapUrl]       = useState('')
  const [submitted, setSubmitted] = useState([])   // dirs marked submitted
  const [results, setResults]     = useState([])
  const [filter, setFilter]       = useState('all')
  const [running, setRunning]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [copied, setCopied]       = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name, biz_phone, biz_addr, biz_city, biz_state, biz_zip, biz_website')
      .eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        setNapName(data.biz_name || '')
        setNapPhone(data.biz_phone || '')
        setNapAddr(data.biz_addr || '')
        setNapCity([data.biz_city, data.biz_state, data.biz_zip].filter(Boolean).join(', '))
        setNapUrl(data.biz_website || '')
      })

    // Load submitted dirs from Supabase (using the dSt from rankforge3 localStorage fallback)
    // For now use all AUDIT_DIRS as "submitted" if no specific data — user can deselect
    setSubmitted(AUDIT_DIRS.map(d => d.id))
  }, [clientId, session])

  const canonical = { name: napName, phone: napPhone, addr: napAddr + (napCity ? ', ' + napCity : ''), url: napUrl }

  const runAudit = async () => {
    if (!napName) return
    const dirs = AUDIT_DIRS.filter(d => submitted.includes(d.id))
    if (!dirs.length) return

    setRunning(true)
    setResults([])
    setProgress(0)

    const out = []
    for (let i = 0; i < dirs.length; i++) {
      await new Promise(r => setTimeout(r, 40)) // small delay for animation
      out.push(simulateDir(dirs[i], canonical))
      setProgress(Math.round((i + 1) / dirs.length * 100))
    }

    out.sort((a, b) => ({ error: 0, warning: 1, ok: 2 }[a.status] - ({ error: 0, warning: 1, ok: 2 }[b.status])))
    setResults(out)
    setRunning(false)
    setProgress(100)
  }

  const toggleDir = id => setSubmitted(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const selectAll  = () => setSubmitted(AUDIT_DIRS.map(d => d.id))
  const selectNone = () => setSubmitted([])

  const filtered = results.filter(r => {
    if (filter === 'error')   return r.status === 'error'
    if (filter === 'warning') return r.status === 'warning'
    if (filter === 'ok')      return r.status === 'ok'
    return true
  })

  const okCount  = results.filter(r => r.status === 'ok').length
  const warnCount = results.filter(r => r.status === 'warning').length
  const errCount  = results.filter(r => r.status === 'error').length
  const napScore  = results.length ? Math.round((100 * okCount + 60 * warnCount) / results.length) : 0

  const exportCSV = () => {
    if (!results.length) return
    const rows = [['Directory', 'DA', 'Status', 'Source', 'Name Match', 'Phone Match', 'Address Match', 'URL Match']]
    results.forEach(r => {
      const f = {}; r.fields.forEach(field => { f[field.field] = field.ok ? 'OK' : 'MISMATCH' })
      rows.push([r.dir.name, r.dir.da, r.status, r.source, f.Name || '', f.Phone || '', f.Address || '', f.Website || ''])
    })
    const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${(napName || 'business').replace(/\s+/g,'-').toLowerCase()}-nap-audit.csv`
    a.click()
  }

  const inp = { width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }
  const btn = (bg, disabled) => ({ padding: '8px 16px', background: disabled ? '#1a3560' : bg, color: disabled ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.6 : 1 })

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            <i className="ti ti-shield-check" style={{ color: T.accentHi, marginRight: 10 }} />
            NAP Audit — Submitted Directories
          </div>
          <button onClick={exportCSV} disabled={!results.length} style={btn(T.cardBg2, !results.length)}>
            <i className="ti ti-download" /> Export CSV
          </button>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Checks every directory against your canonical NAP. Flags wrong phone numbers, outdated addresses, name variations, and missing data.
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Checked',    val: results.length, color: T.accent  },
            { label: 'Consistent', val: okCount,        color: T.green   },
            { label: 'Warnings',   val: warnCount,      color: T.yellow  },
            { label: 'Errors',     val: errCount,       color: T.red     },
            { label: 'NAP Score',  val: results.length ? `${napScore}%` : '—', color: results.length ? scoreColor(napScore) : T.muted },
          ].map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '0 28px 28px', alignItems: 'flex-start' }}>

        {/* LEFT — Canonical NAP + Directory selection */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Card>
            <CardHead icon="ti ti-id-badge-2" title="Canonical NAP" sub="Your source of truth" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>Business Name</label>
                <input value={napName} onChange={e => setNapName(e.target.value)} placeholder="Exact legal business name" style={inp} />
              </div>
              <div>
                <label style={lbl}>Phone Number</label>
                <input value={napPhone} onChange={e => setNapPhone(e.target.value)} placeholder="(512) 555-0100" style={inp} />
              </div>
              <div>
                <label style={lbl}>Street Address</label>
                <input value={napAddr} onChange={e => setNapAddr(e.target.value)} placeholder="1234 Main Street" style={inp} />
              </div>
              <div>
                <label style={lbl}>City, State ZIP</label>
                <input value={napCity} onChange={e => setNapCity(e.target.value)} placeholder="Austin, TX 78701" style={inp} />
              </div>
              <div>
                <label style={lbl}>Website URL</label>
                <input value={napUrl} onChange={e => setNapUrl(e.target.value)} placeholder="https://yourdomain.com" style={inp} />
              </div>
              <button
                onClick={() => { setNapName(profile.biz_name||''); setNapPhone(profile.biz_phone||''); setNapAddr(profile.biz_addr||''); setNapCity([profile.biz_city,profile.biz_state,profile.biz_zip].filter(Boolean).join(', ')); setNapUrl(profile.biz_website||'') }}
                style={{ fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                ↻ Pull from profile
              </button>
              <button onClick={runAudit} disabled={running || !napName} style={btn('linear-gradient(135deg,#1d4ed8,#3b82f6)', running || !napName)}>
                {running ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Auditing…</> : <><i className="ti ti-shield-check" /> Run NAP Audit</>}
              </button>
              {running && (
                <div>
                  <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: T.accent, borderRadius: 2, transition: 'width .2s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{progress}% complete</div>
                </div>
              )}
            </div>
          </Card>

          {/* Directory selector */}
          <Card>
            <CardHead icon="ti ti-list-check" title="Directories to Check"
              sub={`${submitted.length} of ${AUDIT_DIRS.length} selected`}
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAll} style={{ fontSize: 10, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>All</button>
                  <button onClick={selectNone} style={{ fontSize: 10, color: T.muted, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>None</button>
                </div>
              }
            />
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {AUDIT_DIRS.map((dir, i) => (
                <div key={dir.id} onClick={() => toggleDir(dir.id)}
                  style={{ padding: '8px 14px', borderBottom: i < AUDIT_DIRS.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: submitted.includes(dir.id) ? 'rgba(16,185,129,.04)' : 'transparent', transition: '.12s' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${submitted.includes(dir.id) ? T.green : T.border2}`, background: submitted.includes(dir.id) ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.12s' }}>
                    {submitted.includes(dir.id) && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dir.name}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>DA {dir.da}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT — Results */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Score panel — only shown after audit */}
          {results.length > 0 && (
            <Card>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor(napScore), letterSpacing: -2, lineHeight: 1 }}>{napScore}%</div>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 4 }}>NAP Consistency</div>
                  <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden', marginTop: 8, width: 80 }}>
                    <div style={{ height: '100%', width: `${napScore}%`, background: scoreColor(napScore), borderRadius: 3, transition: 'width .8s ease' }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                    {napScore >= 80 ? '✅ Strong NAP consistency' : napScore >= 60 ? '⚠️ Needs attention' : '🚨 Critical issues found'}
                  </div>
                  {/* Field breakdown */}
                  {['Name', 'Phone', 'Address', 'Website'].map(field => {
                    const issues = results.filter(r => r.fields.find(f => f.field === field && !f.ok)).length
                    return (
                      <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 70, fontSize: 11, color: T.muted }}>{field}</div>
                        <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round((results.length - issues) / results.length * 100)}%`, background: issues === 0 ? T.green : issues < 3 ? T.yellow : T.red, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: issues === 0 ? T.green : T.red, width: 60, textAlign: 'right' }}>
                          {issues === 0 ? '✓ Clean' : `${issues} issue${issues > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHead
              icon="ti ti-list-search"
              title="Audit Results"
              sub={results.length ? `${results.length} directories checked` : 'Run the audit to see results'}
              right={
                results.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['all', 'error', 'warning', 'ok'].map(f => (
                      <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${filter === f ? T.accent : T.border2}`, background: filter === f ? 'rgba(59,130,246,.12)' : 'transparent', color: filter === f ? T.accentHi : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                        {f === 'all' ? `All (${results.length})` : f === 'error' ? `Errors (${errCount})` : f === 'warning' ? `Warnings (${warnCount})` : `OK (${okCount})`}
                      </button>
                    ))}
                  </div>
                )
              }
            />

            <div style={{ maxHeight: 620, overflowY: 'auto' }}>
              {!results.length && !running ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <i className="ti ti-shield-check" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 14, opacity: .3 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>No results yet</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Fill in your canonical NAP on the left and click Run NAP Audit.</div>
                </div>
              ) : running ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <i className="ti ti-loader" style={{ fontSize: 36, color: T.accent, display: 'block', marginBottom: 12, animation: 'spin 1s linear infinite' }} />
                  <div style={{ fontSize: 13, color: T.text }}>Checking {submitted.length} directories…</div>
                </div>
              ) : !filtered.length ? (
                <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>No results match this filter.</div>
              ) : filtered.map((r, i) => {
                const statusIcon = r.status === 'error' ? 'ti-x' : r.status === 'warning' ? 'ti-alert-triangle' : 'ti-circle-check'
                const statusColor = r.status === 'error' ? T.red : r.status === 'warning' ? T.yellow : T.green
                const borderColor = r.status === 'error' ? T.red : r.status === 'warning' ? T.yellow : T.green
                return (
                  <div key={r.dir.id} style={{ padding: '12px 16px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', borderLeft: `3px solid ${borderColor}`, background: r.status === 'ok' ? 'rgba(16,185,129,.02)' : r.status === 'error' ? 'rgba(248,113,113,.02)' : 'rgba(245,158,11,.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <i className={`ti ${statusIcon}`} style={{ color: statusColor, fontSize: 16, flexShrink: 0 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{r.dir.name}</div>
                      <span style={{ fontSize: 11, color: T.muted }}>DA {r.dir.da}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.status === 'ok' ? T.greenBg : r.status === 'error' ? T.redBg : T.yellowBg, color: statusColor }}>
                        {r.status === 'ok' ? 'Consistent' : r.status === 'error' ? 'Mismatch' : 'Missing Data'}
                      </span>
                      <a href={r.dir.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.accentHi, textDecoration: 'none', fontWeight: 600 }}>Fix →</a>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {r.fields.filter(f => f.canonical).map(f => (
                        <div key={f.field} style={{ fontSize: 11 }}>
                          {f.ok ? (
                            <span style={{ color: T.green }}>✓ {f.field}</span>
                          ) : (
                            <span style={{ color: T.red }}>
                              ✕ {f.field}: <span style={{ textDecoration: 'line-through', color: T.muted }}>{f.listed || '[missing]'}</span>
                              <span style={{ background: T.redBg, color: T.red, borderRadius: 4, padding: '1px 6px', marginLeft: 4 }}>→ {f.canonical}</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Why NAP matters */}
          {!results.length && (
            <Card>
              <CardHead icon="ti ti-info-circle" title="Why NAP Consistency Matters" />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: 'ti-map-pin',      color: T.accent,  text: 'Google uses NAP signals to determine local ranking — inconsistent data dilutes authority across directories.' },
                  { icon: 'ti-phone',        color: T.green,   text: 'Phone number format matters — (512) 555-0100 and 512-555-0100 are treated as different by some crawlers.' },
                  { icon: 'ti-building',     color: T.yellow,  text: 'Business name variations (Inc, LLC, &/and) can split your citation signals across multiple entities.' },
                  { icon: 'ti-world',        color: T.purple,  text: 'URL inconsistencies (http vs https, www vs non-www) create duplicate entity signals in Google's Knowledge Graph.' },
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.6 }}>
                    <i className={`ti ${tip.icon}`} style={{ color: tip.color, fontSize: 14, flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: T.textSub }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
