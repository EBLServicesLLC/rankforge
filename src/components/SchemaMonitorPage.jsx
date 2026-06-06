/**
 * SchemaMonitorPage.jsx
 * Structured Data Monitor — checks live website for schema markup
 * Matches Social Publisher / Local Links layout exactly
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
  { id: 'LocalBusiness', label: 'LocalBusiness',     icon: 'ti ti-building-store', desc: 'Name, address, phone, hours' },
  { id: 'FAQPage',       label: 'FAQPage',            icon: 'ti ti-help-circle',    desc: 'Voice search FAQ schema' },
  { id: 'Service',       label: 'Service',            icon: 'ti ti-settings',       desc: 'Service descriptions' },
  { id: 'AggregateRating', label: 'AggregateRating', icon: 'ti ti-star',           desc: 'Review star ratings' },
  { id: 'BreadcrumbList', label: 'BreadcrumbList',   icon: 'ti ti-layout-navbar',  desc: 'Page navigation structure' },
  { id: 'WebSite',       label: 'WebSite',            icon: 'ti ti-world',          desc: 'Site search sitelinks' },
  { id: 'Organization',  label: 'Organization',       icon: 'ti ti-building',       desc: 'Business identity schema' },
]

function hdrs(session) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 10, ...style }}>
      {children}
    </div>
  )
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

function StatusBadge({ status }) {
  const cfg = {
    pass:    { bg: 'rgba(16,185,129,.12)',  color: '#34d399', icon: 'ti-circle-check-filled', label: 'Pass' },
    fail:    { bg: 'rgba(248,113,113,.12)', color: '#f87171', icon: 'ti-circle-x',            label: 'Fail' },
    missing: { bg: 'rgba(245,158,11,.12)',  color: '#fbbf24', icon: 'ti-alert-triangle',       label: 'Missing' },
    pending: { bg: 'rgba(74,96,128,.12)',   color: T.muted,   icon: 'ti-clock',               label: 'Not checked' },
  }
  const c = cfg[status] || cfg.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: c.bg, fontSize: 11, fontWeight: 700, color: c.color }}>
      <i className={`ti ${c.icon}`}></i> {c.label}
    </span>
  )
}

export default function SchemaMonitorPage({ session, clientId }) {
  const [url, setUrl]                     = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['LocalBusiness', 'FAQPage', 'Service'])
  const [checking, setChecking]           = useState(false)
  const [results, setResults]             = useState(null)
  const [history, setHistory]             = useState([])
  const [error, setError]                 = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [stats, setStats]                 = useState({ runs: 0, passing: 0, failing: 0, lastCheck: 'Never' })

  // Load website URL from profile
  useEffect(() => {
    if (!clientId || !session) return
    supabase
      .from('client_data')
      .select('biz_website, biz_name')
      .eq('id', clientId)
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.biz_website) { setUrl(data.biz_website); setProfileLoaded(true) }
      })
    // Load history from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem(`rf_schema_history_${clientId}`) || '[]')
      setHistory(saved)
      if (saved.length) {
        const last = saved[0]
        setStats({
          runs:      saved.length,
          passing:   last.passing,
          failing:   last.failing,
          lastCheck: new Date(last.timestamp).toLocaleDateString(),
        })
      }
    } catch (e) {}
  }, [clientId, session])

  const toggleType = (id) =>
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const runCheck = useCallback(async () => {
    if (!url.trim()) { setError('Enter a website URL first.'); return }
    if (!selectedTypes.length) { setError('Select at least one schema type to check.'); return }
    setError(null); setChecking(true); setResults(null)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/schema-monitor`, {
        method: 'POST',
        headers: hdrs(session),
        body: JSON.stringify({ url: url.trim(), types: selectedTypes, client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Check failed')

      setResults(data)

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

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          <i className="ti ti-code" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Structured Data Monitor
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, maxWidth: 800 }}>
          Checks whether your schema markup is live on your website. Theme updates, plugin conflicts, and CMS changes
          can silently remove JSON-LD — costing you rich results and voice search rankings overnight.
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, paddingBottom: 20, borderBottom: `1px solid ${T.border2}` }}>
          {[
            { label: 'CHECKS RUN',  value: stats.runs,      color: T.accentHi },
            { label: 'PASSING',     value: stats.passing,    color: T.green },
            { label: 'FAILING',     value: stats.failing,    color: T.red },
            { label: 'LAST CHECK',  value: stats.lastCheck,  color: T.yellow, isText: true },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: s.isText ? 16 : 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: '.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two column layout ── */}
      <div style={{ display: 'flex', gap: 16, padding: '20px 28px', alignItems: 'flex-start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Monitor Settings */}
          <Card>
            <CardHead icon="ti ti-settings" title="Monitor Settings" sub={profileLoaded ? '✓ URL loaded from profile' : 'Enter your website URL'} />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>Website URL</Label>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 13, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                />
                <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>
                  Enter the page URL where your schema is deployed (usually your homepage or a service page)
                </div>
              </div>
              <div>
                <Label>Schema Types to Verify</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {SCHEMA_TYPES.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 9px', borderRadius: 7, background: selectedTypes.includes(t.id) ? 'rgba(59,130,246,.1)' : 'transparent', border: `1.5px solid ${selectedTypes.includes(t.id) ? T.accent : 'transparent'}`, transition: 'all .15s' }}>
                      <input type="checkbox" checked={selectedTypes.includes(t.id)} onChange={() => toggleType(t.id)} style={{ accentColor: T.accent, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                          <i className={t.icon} style={{ color: T.accentHi, marginRight: 5 }}></i>{t.label}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted }}>{t.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={checking ? null : runCheck}
                disabled={checking}
                style={{ width: '100%', padding: '11px', background: checking ? T.muted2 : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className={`ti ${checking ? 'ti-loader-2' : 'ti-radar'}`}></i>
                {checking ? 'Checking your website...' : 'Run Check Now'}
              </button>

              <a href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"
                style={{ width: '100%', padding: '9px', background: 'transparent', color: T.muted, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
                <i className="ti ti-brand-google"></i> Google Rich Results Test
              </a>

              {error && (
                <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.red }}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }}></i>{error}
                </div>
              )}
            </div>
          </Card>

          {/* Why This Matters */}
          <Card>
            <CardHead icon="ti ti-info-circle" title="Why Monitor Schema?" sub="Common causes of silent schema loss" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: 'ti-layout-2',     title: 'Theme Updates',      desc: 'A WordPress theme update can overwrite your <head> tag and remove all JSON-LD blocks.' },
                { icon: 'ti-plug',         title: 'Plugin Conflicts',    desc: 'Caching or SEO plugin updates sometimes strip or duplicate schema, breaking validation.' },
                { icon: 'ti-refresh',      title: 'CMS Migrations',      desc: 'Moving from one platform to another often drops schema that was manually injected.' },
                { icon: 'ti-eye-off',      title: 'Silent Failures',     desc: 'Google stops showing rich results with no warning — you only notice from rank drops.' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(59,130,246,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${item.icon}`} style={{ color: T.accentHi, fontSize: 12 }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Check History */}
          <Card>
            <CardHead icon="ti ti-history" title="Check History" sub="Last 10 checks" />
            <div style={{ padding: '10px 16px' }}>
              {!history.length ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: T.muted, fontSize: 12 }}>
                  No checks run yet
                </div>
              ) : history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < history.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.textSub, fontWeight: 600 }}>{new Date(h.timestamp).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{new Date(h.timestamp).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: T.green }}><i className="ti ti-check"></i> {h.passing}</span>
                    <span style={{ color: T.red }}><i className="ti ti-x"></i> {h.failing}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Empty state */}
          {!results && !checking && (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <i className="ti ti-radar" style={{ fontSize: 48, color: T.muted, marginBottom: 16, display: 'block' }}></i>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>Ready to check your schema</div>
              <div style={{ fontSize: 13, color: T.muted, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                Enter your website URL, select the schema types to verify, and click Run Check Now.
                Results show exactly what Google can and cannot see on your page.
              </div>
            </Card>
          )}

          {/* Loading */}
          {checking && (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 40, color: T.accent, marginBottom: 16, display: 'block' }}></i>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>Fetching and analysing your page...</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>Scanning HTML for JSON-LD schema blocks</div>
            </Card>
          )}

          {/* Results */}
          {results && !checking && (
            <>
              {/* Summary banner */}
              <Card>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: results.allPass ? 'rgba(16,185,129,.15)' : 'rgba(248,113,113,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {results.allPass ? '✅' : '⚠️'}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: results.allPass ? T.green : T.yellow }}>
                        {results.allPass ? 'All schema checks passed' : 'Some schema issues found'}
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                        Checked {results.results.length} schema types on {url}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: T.green }}>{results.results.filter(r => r.status === 'pass').length}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>PASSING</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: T.red }}>{results.results.filter(r => r.status === 'fail').length}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>FAILING</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: T.yellow }}>{results.results.filter(r => r.status === 'missing').length}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>MISSING</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Per-schema results */}
              <Card>
                <CardHead icon="ti ti-list-check" title="Schema Check Results" sub="Click any row to see details and fix instructions" />
                <div>
                  {results.results.map((r, i) => (
                    <SchemaResultRow key={r.type} result={r} index={i} total={results.results.length} />
                  ))}
                </div>
              </Card>

              {/* Raw schema found */}
              {results.schemasFound?.length > 0 && (
                <Card>
                  <CardHead icon="ti ti-code" title={`Raw Schema Found on Page (${results.schemasFound.length} blocks)`} sub="This is what Google actually sees" />
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {results.schemasFound.map((s, i) => (
                      <div key={i} style={{ background: T.cardBg2, borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.accentHi }}>{s['@type'] || 'Unknown type'}</span>
                          <span style={{ fontSize: 11, color: T.muted }}>{s['@context']}</span>
                        </div>
                        <pre style={{ margin: 0, padding: '10px 12px', fontSize: 11, color: T.textSub, overflowX: 'auto', maxHeight: 160, lineHeight: 1.6 }}>
                          {JSON.stringify(s, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Fix instructions for failures */}
              {results.results.some(r => r.status !== 'pass') && (
                <Card>
                  <CardHead icon="ti ti-tool" title="How to Fix Schema Issues" sub="Follow these steps to restore your schema" />
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { title: '1. Check your website <head> tag', desc: 'Open your page source (Ctrl+U in browser) and search for "application/ld+json". If it\'s missing, your schema was removed.' },
                      { title: '2. Re-add schema from Voice & FAQ page', desc: 'Go to the Voice & FAQ page in RankForged, regenerate your FAQ schema, and paste it back into your website <head> tag.' },
                      { title: '3. Check your WordPress/CMS plugins', desc: 'If you use a caching plugin (WP Rocket, W3 Total Cache), clear all caches. Some SEO plugins also override schema — check their settings.' },
                      { title: '4. Validate with Google', desc: 'After fixing, run the Google Rich Results Test (button on the left) to confirm Google can now read your schema correctly.' },
                      { title: '5. Run this check again', desc: 'Click Run Check Now to confirm all issues are resolved. All checks should show green before closing this tab.' },
                    ].map(item => (
                      <div key={item.title} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: T.cardBg2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                        <i className="ti ti-arrow-right" style={{ color: T.accent, marginTop: 2, flexShrink: 0 }}></i>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.5 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* What gets checked — always visible */}
          <Card>
            <CardHead icon="ti ti-checklist" title="What Gets Checked" sub="Every check runs all of these validations" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                { icon: 'ti-code',          title: 'JSON-LD Tags Present',      desc: 'Confirms <script type="application/ld+json"> tags exist in your page HTML source code.' },
                { icon: 'ti-filter',        title: 'Schema Type Match',          desc: 'Verifies the @type field matches the expected schema type (e.g. "LocalBusiness", "FAQPage").' },
                { icon: 'ti-building',      title: 'Business NAP Fields',        desc: 'Checks that name, address, and phone are populated in your LocalBusiness schema.' },
                { icon: 'ti-brackets',      title: 'Valid JSON Syntax',          desc: 'Parses the JSON-LD to confirm it has no syntax errors that would prevent Google from reading it.' },
                { icon: 'ti-phone',         title: 'NAP Consistency',            desc: 'Compares name, address, phone in schema against your RankForged business profile for consistency.' },
                { icon: 'ti-brand-google',  title: 'Rich Results Eligibility',   desc: 'Flags schema types that qualify for Google rich results (stars, FAQ dropdowns, breadcrumbs).' },
              ].map((item, i) => (
                <div key={item.title} style={{ padding: '14px 18px', borderRight: i % 2 === 0 ? `1px solid ${T.border}` : 'none', borderBottom: i < 4 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <i className={`ti ${item.icon}`} style={{ color: T.accentHi, fontSize: 16 }}></i>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{item.title}</div>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}

// ── Expandable result row ─────────────────────────────────────────────────────
function SchemaResultRow({ result, index, total }) {
  const [open, setOpen] = useState(result.status !== 'pass')

  const statusColor = result.status === 'pass' ? '#34d399' : result.status === 'fail' ? '#f87171' : '#fbbf24'
  const statusBg    = result.status === 'pass' ? 'rgba(16,185,129,.06)' : result.status === 'fail' ? 'rgba(248,113,113,.06)' : 'rgba(245,158,11,.06)'

  return (
    <div style={{ borderBottom: index < total - 1 ? `1px solid ${T.border}` : 'none', background: open ? statusBg : 'transparent', transition: 'background .15s' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <i className={`ti ${result.status === 'pass' ? 'ti-circle-check-filled' : result.status === 'fail' ? 'ti-circle-x' : 'ti-alert-triangle'}`} style={{ color: statusColor, fontSize: 18, flexShrink: 0 }}></i>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{result.type}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{result.summary}</div>
        </div>
        <StatusBadge status={result.status} />
        <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ color: T.muted, fontSize: 14 }}></i>
      </div>
      {open && (
        <div style={{ padding: '0 20px 14px 50px' }}>
          {result.details?.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: d.pass ? '#34d399' : '#f87171', flexShrink: 0, fontWeight: 700 }}>{d.pass ? '✓' : '✗'}</span>
              <span style={{ color: d.pass ? T.textSub : '#f87171' }}>{d.label}</span>
            </div>
          ))}
          {result.fix && (
            <div style={{ marginTop: 12, borderRadius: 8, border: '1px solid rgba(245,158,11,.2)', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(245,158,11,.1)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>👋</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>What to do about this</span>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(59,130,246,.05)', fontSize: 12, color: T.textSub, lineHeight: 1.7 }}>
                {result.fix.steps?.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: 'rgba(59,130,246,.15)', color: T.accentHi, borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
                {result.fix.note && (
                  <div style={{ marginTop: 6, paddingTop: 8, borderTop: `1px solid ${T.border}`, color: T.muted, fontSize: 11 }}>
                    💬 {result.fix.note}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
