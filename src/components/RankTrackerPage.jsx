/**
 * RankTrackerPage.jsx
 * Local Rank Tracker — Real Search Console data
 * Three column layout matching other pages
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
  accent:   '#3b82f6',
  accentHi: '#60a5fa',
  green:    '#10b981',
  red:      '#f87171',
  yellow:   '#f59e0b',
  purple:   '#8b5cf6',
}

const DATE_RANGES = [
  { value: 'last7days',  label: 'Last 7 days' },
  { value: 'last28days', label: 'Last 28 days' },
  { value: 'last90days', label: 'Last 90 days' },
]

const POSITION_BANDS = [
  { key: 'mapsPackEligible', label: '🗺️ Maps Pack Eligible', range: '1–3',   color: '#10b981', desc: 'Top 3 — Google Maps Pack eligible. ~60% of all clicks.' },
  { key: 'page1',            label: '✅ Page 1',              range: '4–10',  color: '#3b82f6', desc: 'Page 1 — excellent visibility. Strong click potential.' },
  { key: 'opportunities',    label: '⚡ Opportunities',       range: '11–20', color: '#f59e0b', desc: 'Page 2 — one good push gets you to page 1. Top priority.' },
  { key: 'needsWork',        label: '🔧 Needs Work',          range: '21+',   color: '#f87171', desc: 'Low visibility. Needs content, links, and citations.' },
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

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || T.accentHi, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: '.5px' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function RankTrackerPage({ session, clientId }) {
  const [connected, setConnected]     = useState(false)
  const [gscEmail, setGscEmail]       = useState('')
  const [siteUrl, setSiteUrl]         = useState('')
  const [dateRange, setDateRange]     = useState('last28days')
  const [loading, setLoading]         = useState(false)
  const [connecting, setConnecting]   = useState(false)
  const [data, setData]               = useState(null)
  const [error, setError]             = useState(null)
  const [selectedBand, setSelectedBand] = useState('opportunities')
  const [filterText, setFilterText]   = useState('')
  const [activeTab, setActiveTab]     = useState('keywords') // keywords | pages | devices
  const [copied, setCopied]           = useState('')

  // Load connection status and site URL from profile
  useEffect(() => {
    if (!session) return
    supabase.from('settings')
      .select('google_key')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data: s }) => {
        if (s?.google_key) {
          setConnected(true)
          setGscEmail('')
        }
      })
    if (clientId) {
      supabase.from('client_data')
        .select('biz_website')
        .eq('id', clientId)
        .eq('user_id', session.user.id)
        .single()
        .then(({ data: d }) => { if (d?.biz_website) setSiteUrl(d.biz_website) })
    }
  }, [session, clientId])

  // Connect Google Search Console
  const connectGSC = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const redirectUri = window.location.origin + '/social/callback'
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gsc-auth?action=get_url&redirect_uri=${encodeURIComponent(redirectUri)}`, {
        headers: hdrs(session),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to get auth URL')

      const popup = window.open(data.url, 'gsc_auth', 'width=600,height=700,scrollbars=yes')

      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type === 'SOCIAL_AUTH_COMPLETE' && event.data?.platform === 'gsc') {
          window.removeEventListener('message', handleMessage)
          if (event.data.success) {
            setConnected(true)
            setGscEmail(event.data.email || '')
          } else {
            setError(event.data.error || 'Connection failed')
          }
          setConnecting(false)
          if (popup) popup.close()
        }
      }
      window.addEventListener('message', handleMessage)

      const timer = setInterval(() => {
        if (popup?.closed) { clearInterval(timer); setConnecting(false); window.removeEventListener('message', handleMessage) }
      }, 1000)
    } catch (err) {
      setError(err.message)
      setConnecting(false)
    }
  }, [session])

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!siteUrl.trim()) { setError('Enter your website URL first.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gsc-data`, {
        method: 'POST', headers: hdrs(session),
        body: JSON.stringify({ site_url: siteUrl.trim(), date_range: dateRange, row_limit: 200 }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || 'Fetch failed')
      setData(result)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [session, siteUrl, dateRange])

  const positionColor = (pos) => {
    if (pos <= 3)  return T.green
    if (pos <= 10) return T.accentHi
    if (pos <= 20) return T.yellow
    return T.red
  }

  const positionLabel = (pos) => {
    if (pos <= 3)  return '🗺️'
    if (pos <= 10) return '✅'
    if (pos <= 20) return '⚡'
    return '🔧'
  }

  const filteredKeywords = data?.keywords?.filter(k =>
    !filterText || k.keys[0].toLowerCase().includes(filterText.toLowerCase())
  ) || []

  const bandKeywords = selectedBand && data?.bands?.[selectedBand]
    ? data.bands[selectedBand].filter(k => !filterText || k.keys[0].toLowerCase().includes(filterText.toLowerCase()))
    : []

  const exportCSV = () => {
    if (!data?.keywords) return
    const rows = [['Keyword', 'Position', 'Clicks', 'Impressions', 'CTR']]
    data.keywords.forEach(k => rows.push([k.keys[0], k.position.toFixed(1), k.clicks, k.impressions, (k.ctr * 100).toFixed(1) + '%']))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'rank-tracker.csv'; a.click()
  }

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-trending-up" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Local Rank Tracker
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20, maxWidth: 800 }}>
          Real keyword ranking data from Google Search Console. Shows exactly where your site ranks, which keywords are opportunities, and what needs work.
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, paddingBottom: 20, borderBottom: `1px solid ${T.border2}`, alignItems: 'flex-end' }}>
          {data ? (
            <>
              <StatBox label="KEYWORDS"    value={data.summary.totalKeywords}    color={T.accentHi} />
              <StatBox label="TOTAL CLICKS" value={data.summary.totalClicks}     color={T.green} />
              <StatBox label="IMPRESSIONS"  value={data.summary.totalImpressions} color={T.purple} />
              <StatBox label="AVG CTR"      value={`${data.summary.avgCtr}%`}    color={T.yellow} />
              <StatBox label="AVG POSITION" value={data.summary.avgPosition}     color={data.summary.avgPosition <= 10 ? T.green : data.summary.avgPosition <= 20 ? T.yellow : T.red} />
              <StatBox label="OPPORTUNITIES" value={data.bands.opportunities?.length || 0} color={T.yellow} sub="pos 11-20" />
            </>
          ) : (
            <>
              <StatBox label="KEYWORDS"     value="—" />
              <StatBox label="TOTAL CLICKS"  value="—" />
              <StatBox label="IMPRESSIONS"   value="—" />
              <StatBox label="AVG CTR"       value="—" />
              <StatBox label="AVG POSITION"  value="—" />
              <StatBox label="OPPORTUNITIES" value="—" />
            </>
          )}
          {data && (
            <button onClick={exportCSV} style={{ marginLeft: 'auto', padding: '7px 14px', background: T.cardBg, border: `1px solid ${T.border2}`, color: T.muted, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-download"></i> Export CSV
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '20px 28px', alignItems: 'flex-start' }}>

        {/* ── LEFT: Settings ── */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Connection */}
          <Card>
            <CardHead icon="ti ti-brand-google" title="Google Search Console" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {connected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8 }}>
                  <span style={{ color: T.green, fontWeight: 700 }}>✓</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>Connected</div>
                    <div style={{ fontSize: 11, color: T.muted }}>Google OAuth token found</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.yellow, marginBottom: 4 }}>⚠️ Not connected</div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
                    Go to <strong style={{ color: T.accentHi }}>API Keys tab</strong> in rankforge3 and add your Google OAuth token, then return here.
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Settings */}
          <Card>
            <CardHead icon="ti ti-settings" title="Tracker Settings" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Website URL</div>
                <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Date Range</div>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                  style={{ width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', outline: 'none' }}>
                  {DATE_RANGES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <button onClick={loading ? null : fetchData} disabled={loading || !connected}
                style={{ width: '100%', padding: '11px', background: (!connected || loading) ? T.muted : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (!connected || loading) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'}`}></i>
                {loading ? 'Fetching data...' : 'Refresh Rankings'}
              </button>
              {!connected && (
                <div style={{ fontSize: 11, color: T.muted, textAlign: 'center' }}>Connect Google Search Console above first</div>
              )}
              {error && (
                <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.red }}>
                  {error}
                </div>
              )}
            </div>
          </Card>

          {/* Position guide */}
          <Card>
            <CardHead icon="ti ti-info-circle" title="Position Guide" />
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {POSITION_BANDS.map(b => (
                <div key={b.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '8px 10px', borderRadius: 7, background: selectedBand === b.key ? 'rgba(59,130,246,.08)' : 'transparent', border: `1px solid ${selectedBand === b.key ? T.border2 : 'transparent'}`, transition: 'all .15s' }}
                  onClick={() => setSelectedBand(b.key)}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: b.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: b.color }}>
                    {b.range}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* ── MIDDLE: Band view ── */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Band summary cards */}
          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {POSITION_BANDS.map(b => (
                <div key={b.key} onClick={() => setSelectedBand(b.key)}
                  style={{ padding: '14px', background: selectedBand === b.key ? `${b.color}15` : T.cardBg, border: `1.5px solid ${selectedBand === b.key ? b.color : T.border2}`, borderRadius: 10, cursor: 'pointer', transition: 'all .15s', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: b.color }}>{data.bands[b.key]?.length || 0}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{b.label}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>pos {b.range}</div>
                </div>
              ))}
            </div>
          )}

          {/* Selected band keyword list */}
          <Card>
            <CardHead icon="ti ti-list" title={POSITION_BANDS.find(b => b.key === selectedBand)?.label || 'Keywords'}
              sub={data ? `${bandKeywords.length} keywords` : 'Connect GSC to see data'} />
            {!data && !loading && (
              <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 12 }}>
                {connected ? 'Click Refresh Rankings to load data' : 'Connect Google Search Console first'}
              </div>
            )}
            {loading && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <i className="ti ti-loader-2" style={{ fontSize: 28, color: T.accent, display: 'block', marginBottom: 8 }}></i>
                <div style={{ fontSize: 12, color: T.muted }}>Fetching from Google...</div>
              </div>
            )}
            {data && (
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {bandKeywords.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 12 }}>
                    No keywords in this band
                  </div>
                ) : bandKeywords.map((k, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: i < bandKeywords.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{positionLabel(k.position)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.keys[0]}</div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{k.clicks} clicks · {k.impressions} impr</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: positionColor(k.position), flexShrink: 0 }}>
                      #{Math.round(k.position)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Opportunities callout */}
          {data && data.bands.opportunities?.length > 0 && (
            <Card style={{ border: `1px solid rgba(245,158,11,.3)`, background: 'rgba(245,158,11,.04)' }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.yellow, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚡ {data.bands.opportunities.length} Quick Win Opportunities
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                  These keywords rank positions 11–20 (page 2). A focused effort on content, citations, or links for these terms can push them to page 1 quickly.
                </div>
              </div>
            </Card>
          )}

        </div>

        {/* ── RIGHT: Full data table ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!data && !loading && (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <i className="ti ti-trending-up" style={{ fontSize: 40, color: T.muted, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 8 }}>
                {connected ? 'Ready to fetch rankings' : 'Connect Google Search Console'}
              </div>
              <div style={{ fontSize: 12, color: T.muted, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
                {connected
                  ? 'Enter your website URL and click Refresh Rankings to see real keyword ranking data from Google.'
                  : 'Click "Connect Google Search Console" on the left to link your Google account and pull real ranking data.'}
              </div>
            </Card>
          )}

          {data && (
            <Card>
              {/* Tabs */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, background: T.cardBg2, borderRadius: 8, padding: 3 }}>
                  {[
                    { id: 'keywords', label: '🔍 Keywords' },
                    { id: 'pages',    label: '📄 Pages' },
                    { id: 'devices',  label: '📱 Devices' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: activeTab === tab.id ? T.cardBg : 'transparent', color: activeTab === tab.id ? T.text : T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                {activeTab === 'keywords' && (
                  <input value={filterText} onChange={e => setFilterText(e.target.value)}
                    placeholder="Filter keywords..."
                    style={{ background: T.cardBg2, border: `1px solid ${T.border2}`, borderRadius: 7, padding: '6px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', outline: 'none', width: 200 }} />
                )}
                <div style={{ fontSize: 11, color: T.muted }}>
                  {data.dateRange.startDate} → {data.dateRange.endDate}
                </div>
              </div>

              {/* Keywords table */}
              {activeTab === 'keywords' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px 80px', padding: '8px 16px', borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                    {['KEYWORD', 'POS', 'CLICKS', 'CTR', 'IMPR'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '.5px' }}>{h}</div>
                    ))}
                  </div>
                  <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    {filteredKeywords.slice(0, 100).map((k, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px 80px', padding: '10px 16px', borderBottom: i < filteredKeywords.length - 1 ? `1px solid ${T.border}` : 'none', gap: 8, alignItems: 'center', background: 'transparent' }}>
                        <div style={{ fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ marginRight: 6 }}>{positionLabel(k.position)}</span>{k.keys[0]}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: positionColor(k.position) }}>
                          #{Math.round(k.position)}
                        </div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{k.clicks}</div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{(k.ctr * 100).toFixed(1)}%</div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{k.impressions}</div>
                      </div>
                    ))}
                    {filteredKeywords.length === 0 && (
                      <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 12 }}>No keywords match your filter</div>
                    )}
                  </div>
                </>
              )}

              {/* Pages table */}
              {activeTab === 'pages' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px', padding: '8px 16px', borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                    {['PAGE', 'POS', 'CLICKS', 'IMPR'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '.5px' }}>{h}</div>
                    ))}
                  </div>
                  <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                    {(data.pages || []).map((p, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 60px', padding: '10px 16px', borderBottom: i < data.pages.length - 1 ? `1px solid ${T.border}` : 'none', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: T.accentHi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <a href={p.keys[0]} target="_blank" rel="noreferrer" style={{ color: T.accentHi, textDecoration: 'none' }}>
                            {p.keys[0].replace(/^https?:\/\/[^/]+/, '') || '/'}
                          </a>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: positionColor(p.position) }}>#{Math.round(p.position)}</div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{p.clicks}</div>
                        <div style={{ fontSize: 12, color: T.textSub }}>{p.impressions}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Devices table */}
              {activeTab === 'devices' && (
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(data.devices || []).map((d, i) => {
                    const total = data.devices.reduce((a, x) => a + x.clicks, 0) || 1
                    const pct = Math.round((d.clicks / total) * 100)
                    const icons = { MOBILE: '📱', DESKTOP: '💻', TABLET: '📟' }
                    return (
                      <div key={i} style={{ padding: '12px 14px', background: T.cardBg2, borderRadius: 8, border: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                            {icons[d.keys[0]] || '📊'} {d.keys[0]}
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: T.muted }}>
                            <span>{d.clicks} clicks</span>
                            <span>{d.impressions} impr</span>
                            <span style={{ fontWeight: 700, color: T.accentHi }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ background: T.cardBg, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: T.accent, borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })}
                  {!data.devices?.length && (
                    <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 12 }}>No device data available</div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
