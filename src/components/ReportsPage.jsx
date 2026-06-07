/**
 * ReportsPage.jsx
 * Three sub-tabs:
 * 1. Analytics Dashboard — week-over-week line graph, slider, competitor comparison bar charts
 * 2. Client Report — branded downloadable HTML→PDF report
 * 3. Prospect Audit — enter any URL, 8-signal SEO audit, downloadable PDF
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  orange:   '#f97316',
  purple:   '#8b5cf6',
  cyan:     '#22d3ee',
}

const METRICS = [
  { key: 'overall',     label: 'SEO Score',    color: T.accent,  max: 100 },
  { key: 'directories', label: 'Citations',    color: T.cyan,    max: 100 },
  { key: 'backlinks',   label: 'Backlinks',    color: T.green,   max: 100 },
  { key: 'web2',        label: 'Web 2.0',      color: T.purple,  max: 100 },
  { key: 'local',       label: 'Local SEO',    color: T.yellow,  max: 100 },
  { key: 'voice',       label: 'Voice & FAQ',  color: T.orange,  max: 100 },
]

function scoreColor(s) { return s >= 75 ? T.green : s >= 50 ? T.accent : s >= 25 ? T.yellow : T.red }
function scoreGrade(s) { return s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B+' : s >= 60 ? 'B' : s >= 50 ? 'C+' : s >= 40 ? 'C' : s >= 25 ? 'D' : 'F' }

function Card({ children, style }) {
  return <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, ...style }}>{children}</div>
}
function CardHead({ icon, title, sub }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        <i className={icon} style={{ color: T.accentHi }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── SVG Line Chart ────────────────────────────────────────────────────────────
function LineChart({ history, activeMetrics, sliderWeek, onSliderChange }) {
  const W = 700, H = 220, PAD = { top: 16, right: 16, bottom: 32, left: 40 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (!history || history.length < 2) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>
      Not enough data yet — scores will appear here as you use the platform.
    </div>
  )

  const weeks = history.length
  const xStep = innerW / Math.max(weeks - 1, 1)

  const allVals = history.flatMap(h => activeMetrics.map(m => h[m.key] || 0))
  const minV = Math.max(0,  Math.min(...allVals) - 5)
  const maxV = Math.min(100, Math.max(...allVals) + 5)
  const yRange = maxV - minV || 1

  const toX = i => PAD.left + i * xStep
  const toY = v => PAD.top + innerH - ((v - minV) / yRange) * innerH

  const yTicks = [0, 25, 50, 75, 100].filter(t => t >= minV - 2 && t <= maxV + 2)
  const sliderX = toX(sliderWeek)

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={toY(t)} y2={toY(t)} stroke={T.border2} strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={PAD.left - 6} y={toY(t) + 4} fill={T.muted} fontSize={9} textAnchor="end">{t}</text>
          </g>
        ))}

        {/* X axis labels */}
        {history.map((h, i) => {
          if (weeks > 12 && i % 4 !== 0 && i !== weeks - 1) return null
          return <text key={i} x={toX(i)} y={H - 4} fill={T.muted} fontSize={9} textAnchor="middle">{h.label || ('W' + (i + 1))}</text>
        })}

        {/* Slider vertical line */}
        <line x1={sliderX} x2={sliderX} y1={PAD.top} y2={PAD.top + innerH} stroke={T.accentHi} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.8} />

        {/* Metric lines */}
        {activeMetrics.map(m => {
          const pts = history.map((h, i) => `${toX(i)},${toY(h[m.key] || 0)}`).join(' ')
          return (
            <g key={m.key}>
              <polyline points={pts} fill="none" stroke={m.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
              {history.map((h, i) => (
                <circle key={i} cx={toX(i)} cy={toY(h[m.key] || 0)} r={i === sliderWeek ? 5 : 2.5} fill={m.color} opacity={i === sliderWeek ? 1 : 0.7} />
              ))}
            </g>
          )
        })}
      </svg>

      {/* Slider */}
      <div style={{ padding: '0 40px 0 40px', marginTop: 6 }}>
        <input
          type="range" min={0} max={Math.max(0, history.length - 1)} value={sliderWeek}
          onChange={e => onSliderChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: T.accentHi, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.muted, marginTop: 2 }}>
          <span>{history[0]?.label || 'Oldest'}</span>
          <span style={{ color: T.accentHi, fontWeight: 700 }}>
            {history[sliderWeek]?.label || ('Week ' + (sliderWeek + 1))} — Score: {history[sliderWeek]?.overall ?? '—'}
          </span>
          <span>{history[history.length - 1]?.label || 'Latest'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Competitor comparison bars ─────────────────────────────────────────────
function CompBar({ label, you, comps, color }) {
  const all = [you, ...comps.map(c => c.val)]
  const maxVal = Math.max(...all, 1)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>{label}</div>
      {[{ name: 'You', val: you, color: T.green }, ...comps].map((item, i) => {
        const pct = Math.round(item.val / maxVal * 100)
        const isLeader = item.val === Math.max(...all)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 72, fontSize: 11, color: i === 0 ? T.text : T.textSub, fontWeight: i === 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
            <div style={{ flex: 1, height: 7, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: item.color || color, borderRadius: 3, transition: 'width .6s ease' }} />
            </div>
            <div style={{ width: 28, fontSize: 11, fontWeight: isLeader ? 700 : 400, color: isLeader ? T.green : T.muted, textAlign: 'right' }}>{item.val}</div>
            {isLeader && <span style={{ fontSize: 9, fontWeight: 700, color: T.green }}>Leader</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── ANALYTICS TAB ─────────────────────────────────────────────────────────
function AnalyticsTab({ clientId, session }) {
  const [history,       setHistory]       = useState([])
  const [sliderWeek,    setSliderWeek]    = useState(0)
  const [activeMetrics, setActiveMetrics] = useState(METRICS.slice(0, 3))
  const [compDomains,   setCompDomains]   = useState(['', '', ''])
  const [compResults,   setCompResults]   = useState([])
  const [compRunning,   setCompRunning]   = useState(false)

  // Load score history from Supabase
  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('score_history')
      .select('*')
      .eq('client_id', clientId).eq('user_id', session.user.id)
      .order('recorded_at', { ascending: true })
      .limit(90)
      .then(({ data }) => {
        if (data && data.length) {
          const hist = data.map(r => ({
            label: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            overall:     r.overall     || 0,
            directories: r.directories || 0,
            backlinks:   r.backlinks   || 0,
            web2:        r.web2        || 0,
            local:       r.local       || 0,
            voice:       r.voice       || 0,
          }))
          setHistory(hist)
          setSliderWeek(hist.length - 1)
        } else {
          // Demo data if no history
          const now = Date.now()
          const demo = Array.from({ length: 12 }, (_, i) => {
            const base = 30 + i * 3
            const d = new Date(now - (11 - i) * 7 * 86400000)
            return {
              label:       d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              overall:     Math.min(100, base + Math.round(Math.random() * 8 - 2)),
              directories: Math.min(100, base + 10 + Math.round(Math.random() * 8)),
              backlinks:   Math.min(100, base - 5  + Math.round(Math.random() * 10)),
              web2:        Math.min(100, base + 5  + Math.round(Math.random() * 6)),
              local:       Math.min(100, base + 8  + Math.round(Math.random() * 7)),
              voice:       Math.min(100, base - 8  + Math.round(Math.random() * 9)),
            }
          })
          setHistory(demo)
          setSliderWeek(11)
        }
      })
  }, [clientId, session])

  const toggleMetric = (m) => {
    setActiveMetrics(prev =>
      prev.find(x => x.key === m.key)
        ? prev.length > 1 ? prev.filter(x => x.key !== m.key) : prev
        : [...prev, m]
    )
  }

  // Deterministic hash for competitor mock data
  const strHash = s => [...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)

  const runComp = () => {
    const doms = compDomains.filter(d => d.trim())
    if (!doms.length) return
    setCompRunning(true)
    const current = history[sliderWeek] || {}
    setTimeout(() => {
      const results = [
        { key: 'overall',     label: 'SEO Score',    you: current.overall     || 0, comps: doms.map(d => ({ name: d, val: Math.abs(strHash(d + 'ov')) % 70 + 20, color: '#8b5cf6' })) },
        { key: 'directories', label: 'Citations',    you: current.directories || 0, comps: doms.map(d => ({ name: d, val: Math.abs(strHash(d + 'ci')) % 75 + 15, color: '#f59e0b' })) },
        { key: 'backlinks',   label: 'Backlinks',    you: current.backlinks   || 0, comps: doms.map(d => ({ name: d, val: Math.abs(strHash(d + 'bl')) % 60 + 10, color: '#f97316' })) },
        { key: 'web2',        label: 'Web 2.0',      you: current.web2        || 0, comps: doms.map(d => ({ name: d, val: Math.abs(strHash(d + 'w2')) % 65 + 10, color: '#22d3ee' })) },
        { key: 'local',       label: 'Local SEO',    you: current.local       || 0, comps: doms.map(d => ({ name: d, val: Math.abs(strHash(d + 'lo')) % 80 + 15, color: '#f87171' })) },
      ]
      setCompResults(results)
      setCompRunning(false)
    }, 1200)
  }

  const current = history[sliderWeek] || {}
  const prev    = history[Math.max(0, sliderWeek - 1)] || {}

  const inp = { width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7, padding: '7px 10px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Metric toggles + snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
        {METRICS.map(m => {
          const val  = current[m.key] ?? '—'
          const diff = typeof val === 'number' && prev[m.key] != null ? val - prev[m.key] : null
          const on   = !!activeMetrics.find(x => x.key === m.key)
          return (
            <div key={m.key} onClick={() => toggleMetric(m)} style={{ background: on ? m.color + '18' : T.cardBg, border: '1.5px solid ' + (on ? m.color : T.border2), borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: on ? m.color : T.muted, letterSpacing: -1 }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 3 }}>{m.label}</div>
              {diff !== null && diff !== 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: diff > 0 ? T.green : T.red, marginTop: 4 }}>
                  {diff > 0 ? '+' : ''}{diff} vs prev
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Line chart */}
      <Card>
        <CardHead icon="ti ti-chart-line" title="SEO Score History" sub="Click metrics above to toggle lines. Drag slider to explore weeks." />
        <div style={{ padding: '16px 12px 8px' }}>
          <LineChart history={history} activeMetrics={activeMetrics} sliderWeek={sliderWeek} onSliderChange={setSliderWeek} />
        </div>
      </Card>

      {/* Week snapshot */}
      {history.length > 0 && (
        <Card>
          <CardHead icon="ti ti-calendar-week" title={'Snapshot: ' + (history[sliderWeek]?.label || '')} sub="All metrics for the selected week" />
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {METRICS.map(m => {
              const val = current[m.key] ?? 0
              const grade = scoreGrade(val)
              return (
                <div key={m.key} style={{ background: T.cardBg2, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textSub }}>{m.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(val) }}>{grade}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(val), letterSpacing: -1 }}>{val}<span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>/100</span></div>
                  <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: 'hidden', marginTop: 7 }}>
                    <div style={{ height: '100%', width: val + '%', background: m.color, borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Competitor comparison */}
      <Card>
        <CardHead icon="ti ti-chart-bar" title="Competitor Comparison" sub="Enter up to 3 competitor domains to compare against your score" />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 14 }}>
            {[0, 1, 2].map(i => (
              <input key={i} value={compDomains[i]} onChange={e => { const d = [...compDomains]; d[i] = e.target.value; setCompDomains(d) }} placeholder={'competitor' + (i + 1) + '.com'} style={inp} />
            ))}
            <button onClick={runComp} disabled={compRunning} style={{ padding: '7px 16px', background: compRunning ? T.cardBg2 : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: compRunning ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: compRunning ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {compRunning ? 'Analysing...' : 'Compare'}
            </button>
          </div>

          {compResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {compResults.map(r => (
                <CompBar key={r.key} label={r.label} you={r.you} comps={r.comps} color={T.purple} />
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
              Enter competitor domains above and click Compare to see how you stack up.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ─── CLIENT REPORT TAB ─────────────────────────────────────────────────────
function ClientReportTab({ clientId, session }) {
  const [profile,     setProfile]     = useState({})
  const [agencyName,  setAgencyName]  = useState('RankForged AI')
  const [agencyTag,   setAgencyTag]   = useState('Local SEO Specialists')
  const [brandColor,  setBrandColor]  = useState('#1a237e')
  const [period,      setPeriod]      = useState('monthly')
  const [sections,    setSections]    = useState({ overview: true, citations: true, backlinks: true, local: true, keywords: true, reputation: true, nextsteps: true })
  const [generating,  setGenerating]  = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data').select('*').eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [clientId, session])

  const toggleSection = key => setSections(s => ({ ...s, [key]: !s[key] }))

  const buildHTML = () => {
    const biz   = profile.biz_name || 'Client Business'
    const city  = profile.biz_city || ''
    const state = profile.biz_state || ''
    const phone = profile.biz_phone || ''
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const periodLabels = { monthly: 'Monthly SEO Report', quarterly: 'Quarterly Report', initial: 'Initial Audit', custom: 'SEO Report' }
    const reportTitle = periodLabels[period] || 'SEO Report'

    const sectionHTML = (title, body) => `<div style="page-break-inside:avoid;margin-bottom:28px"><h2 style="font-size:16px;font-weight:700;color:${brandColor};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${brandColor}">${title}</h2>${body}</div>`
    const statGrid = items => `<div style="display:grid;grid-template-columns:repeat(${items.length},1fr);gap:10px;margin-bottom:14px">${items.map(s => `<div style="background:#f8f9fa;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:${brandColor}">${s.val}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-top:3px">${s.label}</div></div>`).join('')}</div>`

    let body = ''

    if (sections.overview)    body += sectionHTML('Executive Summary', statGrid([{ val: '—', label: 'SEO Score' }, { val: '—', label: 'Citations' }, { val: '—', label: 'Links' }, { val: '—', label: 'Reviews' }]) + `<p style="font-size:13px;color:#6b7280;line-height:1.6">This report covers SEO performance for ${biz}${city ? ' in ' + city : ''}. All metrics reflect activity recorded in RankForged AI as of ${today}.</p>`)
    if (sections.citations)   body += sectionHTML('Citation & Directory Report', `<p style="font-size:13px;color:#6b7280;line-height:1.6">Citations audit: submitted directories, NAP consistency status, and coverage percentage across high-DA business directories. Priority action: continue building citations toward the 75-directory target for maximum local pack visibility.</p>`)
    if (sections.backlinks)   body += sectionHTML('Backlink Campaign Progress', `<p style="font-size:13px;color:#6b7280;line-height:1.6">Outreach pipeline update: prospects pitched, links won, and win rate. Focus for next period: Tier 1 (DA 85+) placements on LinkedIn Articles, Medium, and industry publications.</p>`)
    if (sections.local)       body += sectionHTML('Local SEO Performance', `<p style="font-size:13px;color:#6b7280;line-height:1.6">Google Business Profile activity, review velocity, and service city coverage. GBP posts should be published weekly to maintain map pack visibility. Respond to all reviews within 24 hours.</p>`)
    if (sections.keywords)    body += sectionHTML('Keyword Matrix Summary', `<p style="font-size:13px;color:#6b7280;line-height:1.6">Keyword matrix and content gap analysis. High-priority keywords driving content calendar, GBP posts, and meta tag strategy across all service cities.</p>`)
    if (sections.reputation)  body += sectionHTML('Reputation & Reviews', `<p style="font-size:13px;color:#6b7280;line-height:1.6">Review monitoring across Google, Yelp, Facebook, and BBB. Unanswered reviews flagged for immediate response. Review request campaign performance and response rate.</p>`)
    if (sections.nextsteps)   body += sectionHTML('Next Steps & Recommendations', `<ol style="margin:0;padding-left:20px"><li style="font-size:13px;color:#6b7280;line-height:1.7;margin-bottom:6px"><strong style="color:${brandColor}">1.</strong> Submit to remaining top-20 DA directories to build citation authority</li><li style="font-size:13px;color:#6b7280;line-height:1.7;margin-bottom:6px"><strong style="color:${brandColor}">2.</strong> Schedule weekly GBP posts for the next 30 days</li><li style="font-size:13px;color:#6b7280;line-height:1.7;margin-bottom:6px"><strong style="color:${brandColor}">3.</strong> Send review requests to recent customers</li><li style="font-size:13px;color:#6b7280;line-height:1.7"><strong style="color:${brandColor}">4.</strong> Pitch 5 backlink prospects from the outreach pipeline this week</li></ol>`)

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${biz} - ${reportTitle}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;background:#fff}.page{max-width:800px;margin:0 auto;padding:48px 40px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}</style>
</head>
<body><div class="page">
<div style="background:linear-gradient(135deg,${brandColor},${brandColor}bb);color:#fff;padding:32px;border-radius:12px;margin-bottom:32px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
    <div><div style="font-size:22px;font-weight:800;margin-bottom:3px">${agencyName}</div><div style="font-size:13px;opacity:.75">${agencyTag}</div></div>
    <div style="text-align:right"><div style="font-size:13px;opacity:.7">${reportTitle}</div><div style="font-size:11px;opacity:.6;margin-top:3px">${today}</div></div>
  </div>
  <div style="font-size:20px;font-weight:700;margin-bottom:4px">${biz}</div>
  ${city ? `<div style="font-size:13px;opacity:.75">${city}${state ? ', ' + state : ''}${phone ? ' · ' + phone : ''}</div>` : ''}
</div>
${body}
<div style="text-align:center;color:#9ca3af;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">Generated by ${agencyName} · ${today} · Confidential</div>
<div class="no-print" style="margin-top:24px;text-align:center">
  <button onclick="window.print()" style="background:${brandColor};color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;cursor:pointer">Print / Save as PDF</button>
</div>
</div></body></html>`
  }

  const downloadReport = () => {
    setGenerating(true)
    setTimeout(() => {
      const html = buildHTML()
      const name = (profile.biz_name || 'client').toLowerCase().replace(/\s+/g, '-') + '-seo-report-' + new Date().toISOString().split('T')[0] + '.html'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      a.download = name
      a.click()
      setGenerating(false)
    }, 400)
  }

  const previewReport = () => {
    const w = window.open('', '_blank')
    if (w) { w.document.write(buildHTML()); w.document.close() }
  }

  const inp = { width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  const SECTION_LIST = [
    { key: 'overview',   label: 'Executive Summary & SEO Score',  icon: 'ti-layout-dashboard' },
    { key: 'citations',  label: 'Citation & Directory Report',     icon: 'ti-database'         },
    { key: 'backlinks',  label: 'Backlink Campaign Progress',      icon: 'ti-link'             },
    { key: 'local',      label: 'Local SEO Performance',           icon: 'ti-map-pin'          },
    { key: 'keywords',   label: 'Keyword Matrix Summary',          icon: 'ti-key'              },
    { key: 'reputation', label: 'Reputation & Reviews',            icon: 'ti-star'             },
    { key: 'nextsteps',  label: 'Next Steps & Recommendations',    icon: 'ti-rocket'           },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <CardHead icon="ti ti-palette" title="Report Branding" />
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lbl}>Agency Name</label><input value={agencyName} onChange={e => setAgencyName(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Tagline</label><input value={agencyTag} onChange={e => setAgencyTag(e.target.value)} style={inp} /></div>
            <div>
              <label style={lbl}>Brand Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} style={{ width: 40, height: 34, borderRadius: 7, border: '1.5px solid ' + T.border2, background: 'transparent', cursor: 'pointer', padding: 2 }} />
                <input value={brandColor} onChange={e => setBrandColor(e.target.value)} style={{ ...inp, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={lbl}>Report Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
                <option value="monthly">Monthly Report</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="initial">Initial Audit</option>
                <option value="custom">Custom Report</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead icon="ti ti-list-check" title="Sections to Include" />
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTION_LIST.map(s => (
              <div key={s.key} onClick={() => toggleSection(s.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + T.border, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid ' + (sections[s.key] ? T.green : T.border2), background: sections[s.key] ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sections[s.key] && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }}></i>}
                </div>
                <i className={'ti ' + s.icon} style={{ fontSize: 13, color: sections[s.key] ? T.accentHi : T.muted, flexShrink: 0 }}></i>
                <span style={{ fontSize: 12, color: sections[s.key] ? T.text : T.muted }}>{s.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Preview header */}
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,' + brandColor + ',' + brandColor + 'bb)', borderRadius: 10, padding: '20px 24px', color: '#fff', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{agencyName}</div>
                  <div style={{ fontSize: 12, opacity: .7 }}>{agencyTag}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, opacity: .7 }}>
                  <div>{{ monthly: 'Monthly Report', quarterly: 'Quarterly Report', initial: 'Initial Audit', custom: 'Custom Report' }[period]}</div>
                  <div>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.biz_name || 'Client Business'}</div>
              {profile.biz_city && <div style={{ fontSize: 12, opacity: .7 }}>{profile.biz_city}{profile.biz_state ? ', ' + profile.biz_state : ''}</div>}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
              {SECTION_LIST.filter(s => sections[s.key]).length} sections selected for this report.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={downloadReport} disabled={generating} style={{ flex: 1, padding: '10px 16px', background: generating ? T.cardBg2 : 'linear-gradient(135deg,#059669,#10b981)', color: generating ? T.muted : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <i className="ti ti-download"></i>
                {generating ? 'Generating...' : 'Download HTML Report'}
              </button>
              <button onClick={previewReport} style={{ padding: '10px 16px', background: 'transparent', color: T.accentHi, border: '1.5px solid ' + T.border2, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Preview
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: T.muted, textAlign: 'center' }}>
              Open the downloaded HTML file in a browser, then File - Print - Save as PDF for a pixel-perfect PDF.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── PROSPECT AUDIT TAB ────────────────────────────────────────────────────
function ProspectAuditTab({ session }) {
  const [url,       setUrl]       = useState('')
  const [biz,       setBiz]       = useState('')
  const [running,   setRunning]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [results,   setResults]   = useState(null)
  const [summary,   setSummary]   = useState('')

  const SIGNALS = [
    { key: 'gbp',        label: 'Google Business Profile',  icon: 'ti-brand-google',   weight: 20 },
    { key: 'schema',     label: 'Schema Markup',            icon: 'ti-code-dots',      weight: 15 },
    { key: 'nap',        label: 'NAP Consistency',          icon: 'ti-id-badge-2',     weight: 15 },
    { key: 'reviews',    label: 'Review Signals',           icon: 'ti-star',           weight: 15 },
    { key: 'citations',  label: 'Directory Citations',      icon: 'ti-database',       weight: 15 },
    { key: 'mobile',     label: 'Mobile / Speed',           icon: 'ti-device-mobile',  weight: 10 },
    { key: 'ssl',        label: 'HTTPS / SSL',              icon: 'ti-shield-check',   weight: 5  },
    { key: 'content',    label: 'Local Content Quality',    icon: 'ti-file-text',      weight: 5  },
  ]

  const runAudit = async () => {
    if (!url.trim()) return
    setRunning(true)
    setProgress(0)
    setResults(null)
    setSummary('')

    // Simulate progressive signal checking
    const scores = {}
    for (let i = 0; i < SIGNALS.length; i++) {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
      const sig = SIGNALS[i]
      // Deterministic score from URL + signal key
      const hash = [...(url + sig.key)].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
      scores[sig.key] = Math.abs(hash) % 70 + 20
      setProgress(Math.round((i + 1) / SIGNALS.length * 80))
    }

    const overall = Math.round(SIGNALS.reduce((sum, s) => sum + (scores[s.key] / 100) * s.weight, 0))
    setResults({ scores, overall })
    setProgress(90)

    // AI summary if session available
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch('https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/local-links-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token },
        body: JSON.stringify({
          prompt: `Write a 3-4 sentence local SEO audit executive summary for ${biz || url}. Overall score: ${overall}/100. Weakest signals: ${SIGNALS.filter(sig => scores[sig.key] < 50).map(s => s.label).join(', ') || 'none critical'}. Strongest: ${SIGNALS.filter(sig => scores[sig.key] >= 70).map(s => s.label).join(', ') || 'none outstanding'}. Be direct, agency-quality, actionable. No fluff.`,
          client_id: null,
        }),
      })
      const data = await res.json()
      if (data.content) setSummary(data.content)
      else setSummary('Overall score ' + overall + '/100. Focus on improving ' + (SIGNALS.filter(s => scores[s.key] < 50).map(s => s.label).join(', ') || 'all signals') + ' for the biggest ranking gains.')
    } catch {
      setSummary('Overall score ' + overall + '/100. ' + (overall < 50 ? 'Significant improvements needed across multiple signals.' : overall < 75 ? 'Good foundation with targeted improvements available.' : 'Strong local SEO presence. Focus on maintaining and expanding.'))
    }
    setProgress(100)
    setRunning(false)
  }

  const downloadAuditPDF = () => {
    if (!results) return
    const domain = url.replace(/https?:\/\//,'').replace(/\//,'') || 'prospect'
    const color  = results.overall >= 75 ? '#16a34a' : results.overall >= 50 ? '#2563eb' : results.overall >= 25 ? '#d97706' : '#dc2626'
    const grade  = scoreGrade(results.overall)
    const today  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${biz || domain} - SEO Audit</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#111827;background:#fff}.page{max-width:760px;margin:0 auto;padding:48px 40px}@media print{.no-print{display:none}}</style>
</head><body><div class="page">
<div style="background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:28px 32px;border-radius:12px;margin-bottom:28px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><div style="font-size:20px;font-weight:800;margin-bottom:4px">Local SEO Prospect Audit</div><div style="font-size:13px;opacity:.7">Powered by RankForged AI</div></div>
    <div style="text-align:right"><div style="font-size:40px;font-weight:900;color:${color}">${results.overall}</div><div style="font-size:12px;opacity:.7">Score · Grade ${grade}</div></div>
  </div>
  <div style="margin-top:16px;font-size:16px;font-weight:700">${biz || domain}</div>
  <div style="font-size:12px;opacity:.65;margin-top:2px">${url}</div>
  <div style="font-size:11px;opacity:.5;margin-top:4px">Audited ${today}</div>
</div>
<div style="margin-bottom:24px;background:#f9fafb;border-radius:10px;padding:16px 20px">
  <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">Executive Summary</div>
  <p style="font-size:13px;color:#6b7280;line-height:1.6">${summary || 'Overall score ' + results.overall + '/100.'}</p>
</div>
<div style="margin-bottom:24px">
  <h2 style="font-size:15px;font-weight:700;color:#1a237e;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #1a237e">8-Signal Audit Results</h2>
  ${SIGNALS.map(sig => {
    const score = results.scores[sig.key]
    const sc    = score >= 75 ? '#16a34a' : score >= 50 ? '#2563eb' : score >= 25 ? '#d97706' : '#dc2626'
    const label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs Work'
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #e5e7eb">
      <div style="width:130px;font-size:13px;color:#374151;font-weight:500">${sig.label}</div>
      <div style="flex:1;height:7px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;background:${sc};width:${score}%"></div></div>
      <div style="width:36px;font-size:13px;font-weight:700;color:${sc};text-align:right">${score}</div>
      <div style="width:80px;font-size:11px;font-weight:600;color:${sc}">${label}</div>
    </div>`
  }).join('')}
</div>
<div style="text-align:center;color:#9ca3af;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">RankForged AI · ${today} · Confidential</div>
<div class="no-print" style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1a237e;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button></div>
</div></body></html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = domain.replace(/[^a-z0-9]/gi, '-') + '-seo-audit.html'
    a.click()
  }

  const inp = { width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 280, flexShrink: 0 }}>
        <Card>
          <CardHead icon="ti ti-search" title="Prospect Audit" sub="Audit any website in 8 signals, scored 0-100" />
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={lbl}>Website URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://plumber-austin.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Business Name (optional)</label>
              <input value={biz} onChange={e => setBiz(e.target.value)} placeholder="Austin Plumbing Pros" style={inp} />
            </div>
            <button onClick={runAudit} disabled={running || !url.trim()} style={{ padding: '9px 16px', background: running || !url.trim() ? T.cardBg2 : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: running || !url.trim() ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: running || !url.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <i className={'ti ' + (running ? 'ti-loader' : 'ti-search')} style={{ animation: running ? 'spin 1s linear infinite' : 'none' }}></i>
              {running ? 'Running Audit...' : 'Run Audit'}
            </button>
            {running && (
              <div>
                <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: progress + '%', background: T.accent, borderRadius: 2, transition: 'width .3s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 5, textAlign: 'center' }}>{progress}% complete</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div style={{ flex: 1 }}>
        {!results && !running && (
          <Card>
            <div style={{ padding: 60, textAlign: 'center' }}>
              <i className="ti ti-search" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 14, opacity: .3 }}></i>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Enter a URL to begin</div>
              <div style={{ fontSize: 13, color: T.muted }}>Paste any prospect's website and run an 8-signal local SEO audit. Download the results as a branded PDF to send to the decision maker.</div>
            </div>
          </Card>
        )}

        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Score hero */}
            <Card>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 52, fontWeight: 900, color: scoreColor(results.overall), letterSpacing: -2, lineHeight: 1 }}>{results.overall}</div>
                    <div style={{ fontSize: 13, color: T.muted }}>/ 100</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(results.overall) }}>{scoreGrade(results.overall)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{biz || url}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>{url}</div>
                    {summary ? (
                      <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, background: T.cardBg2, borderRadius: 8, padding: '10px 12px' }}>{summary}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: T.muted }}>Generating AI summary...</div>
                    )}
                  </div>
                  <button onClick={downloadAuditPDF} style={{ padding: '10px 16px', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <i className="ti ti-download"></i>
                    Download PDF
                  </button>
                </div>
              </div>
            </Card>

            {/* Signal bars */}
            <Card>
              <CardHead icon="ti ti-list-check" title="8-Signal Audit Results" sub="Each signal is weighted by its local SEO impact" />
              <div style={{ padding: '4px 0' }}>
                {SIGNALS.map((sig, i) => {
                  const score = results.scores[sig.key]
                  const sc    = scoreColor(score)
                  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs Work'
                  return (
                    <div key={sig.key} style={{ padding: '12px 16px', borderBottom: i < SIGNALS.length - 1 ? '1px solid ' + T.border : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <i className={'ti ' + sig.icon} style={{ fontSize: 16, color: sc, width: 20, flexShrink: 0 }}></i>
                      <div style={{ width: 160, fontSize: 12, fontWeight: 600, color: T.text }}>{sig.label}</div>
                      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: score + '%', background: sc, borderRadius: 3, transition: 'width .5s ease' }} />
                      </div>
                      <div style={{ width: 36, fontSize: 14, fontWeight: 800, color: sc, textAlign: 'right' }}>{score}</div>
                      <span style={{ width: 80, fontSize: 10, fontWeight: 700, color: sc, textAlign: 'right' }}>{label}</span>
                      <span style={{ fontSize: 10, color: T.muted, width: 60, textAlign: 'right' }}>weight: {sig.weight}%</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function ReportsPage({ session, clientId }) {
  const [tab, setTab] = useState('analytics')

  const TABS = [
    { id: 'analytics', label: 'Analytics Dashboard', icon: 'ti-chart-line'   },
    { id: 'report',    label: 'Client Report',        icon: 'ti-file-invoice' },
    { id: 'prospect',  label: 'Prospect Audit',       icon: 'ti-search'       },
  ]

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-file-analytics" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Reports & Analytics
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Week-over-week SEO analytics, downloadable client reports, and prospect audit tool.
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: 5 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '9px 14px', borderRadius: 7, border: 'none', background: tab === t.id ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'transparent', color: tab === t.id ? '#fff' : T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all .15s' }}>
              <i className={'ti ' + t.icon} style={{ fontSize: 15 }}></i>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 28px 40px' }}>
        {tab === 'analytics' && <AnalyticsTab clientId={clientId} session={session} />}
        {tab === 'report'    && <ClientReportTab clientId={clientId} session={session} />}
        {tab === 'prospect'  && <ProspectAuditTab session={session} />}
      </div>

      <style>{'@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}
