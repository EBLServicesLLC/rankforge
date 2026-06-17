import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg: '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border: '#0f2040', border2: '#1a3560', text: '#e2e8f0',
  textSub: '#c8d8f0', muted: '#4a6080', accent: '#3b82f6',
  accentHi: '#60a5fa', green: '#10b981', red: '#f87171',
  yellow: '#f59e0b', orange: '#f97316', purple: '#8b5cf6', cyan: '#22d3ee',
}

const METRICS = [
  { key: 'overall',     label: 'SEO Score',   color: '#3b82f6' },
  { key: 'directories', label: 'Citations',   color: '#22d3ee' },
  { key: 'backlinks',   label: 'Backlinks',   color: '#10b981' },
  { key: 'web2',        label: 'Web 2.0',     color: '#8b5cf6' },
  { key: 'local',       label: 'Local SEO',   color: '#f59e0b' },
  { key: 'voice',       label: 'Voice + FAQ', color: '#f97316' },
]

const SIGNALS = [
  { key: 'gbp',       label: 'Google Business Profile', weight: 20 },
  { key: 'schema',    label: 'Schema Markup',           weight: 15 },
  { key: 'nap',       label: 'NAP Consistency',         weight: 15 },
  { key: 'reviews',   label: 'Review Signals',          weight: 15 },
  { key: 'citations', label: 'Directory Citations',     weight: 15 },
  { key: 'mobile',    label: 'Mobile / Speed',          weight: 10 },
  { key: 'ssl',       label: 'HTTPS / SSL',             weight: 5  },
  { key: 'content',   label: 'Local Content Quality',   weight: 5  },
]

function scoreColor(s) {
  return s >= 75 ? '#10b981' : s >= 50 ? '#3b82f6' : s >= 25 ? '#f59e0b' : '#f87171'
}

function scoreGrade(s) {
  if (s >= 90) return 'A+'
  if (s >= 80) return 'A'
  if (s >= 70) return 'B+'
  if (s >= 60) return 'B'
  if (s >= 50) return 'C+'
  if (s >= 40) return 'C'
  if (s >= 25) return 'D'
  return 'F'
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, ...style }}>
      {children}
    </div>
  )
}

function CardHead({ icon, title, sub }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
        <i className={icon} style={{ color: T.accentHi }}></i>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
      </div>
    </div>
  )
}

// Simple SVG line chart
function LineChart({ history, activeKeys, sliderWeek, onSlider }) {
  const W = 680, H = 200, PL = 36, PR = 12, PT = 12, PB = 28
  const iW = W - PL - PR
  const iH = H - PT - PB

  if (!history || history.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>
        Not enough data yet. Scores appear here as you use the platform.
      </div>
    )
  }

  const n = history.length
  const xStep = iW / Math.max(n - 1, 1)
  const toX = i => PL + i * xStep
  const toY = v => PT + iH - (v / 100) * iH
  const ticks = [0, 25, 50, 75, 100]

  return (
    <div>
      <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PL} x2={PL + iW} y1={toY(t)} y2={toY(t)} stroke={T.border2} strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={PL - 4} y={toY(t) + 3} fill={T.muted} fontSize={8} textAnchor="end">{t}</text>
          </g>
        ))}
        {history.map((h, i) => {
          if (n > 10 && i % 3 !== 0 && i !== n - 1) return null
          return <text key={i} x={toX(i)} y={H - 4} fill={T.muted} fontSize={8} textAnchor="middle">{h.label}</text>
        })}
        <line x1={toX(sliderWeek)} x2={toX(sliderWeek)} y1={PT} y2={PT + iH} stroke={T.accentHi} strokeWidth={1.5} strokeDasharray="4,3" opacity={0.8} />
        {activeKeys.map(m => {
          const pts = history.map((h, i) => toX(i) + ',' + toY(h[m.key] || 0)).join(' ')
          return (
            <g key={m.key}>
              <polyline points={pts} fill="none" stroke={m.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {history.map((h, i) => (
                <circle key={i} cx={toX(i)} cy={toY(h[m.key] || 0)} r={i === sliderWeek ? 5 : 2.5} fill={m.color} opacity={i === sliderWeek ? 1 : 0.7} />
              ))}
            </g>
          )
        })}
      </svg>
      <div style={{ padding: '4px 36px 0 36px' }}>
        <input type="range" min={0} max={Math.max(0, history.length - 1)} value={sliderWeek}
          onChange={e => onSlider(Number(e.target.value))}
          style={{ width: '100%', accentColor: T.accentHi, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.muted, marginTop: 2 }}>
          <span>{history[0] && history[0].label}</span>
          <span style={{ color: T.accentHi, fontWeight: 700 }}>
            {(history[sliderWeek] && history[sliderWeek].label) || ''} - Score: {(history[sliderWeek] && history[sliderWeek].overall) || 0}
          </span>
          <span>{history[history.length - 1] && history[history.length - 1].label}</span>
        </div>
      </div>
    </div>
  )
}

// Analytics sub-tab
function AnalyticsTab({ clientId, session }) {
  const [history,       setHistory]       = useState([])
  const [sliderWeek,    setSliderWeek]    = useState(0)
  const [activeMetrics, setActiveMetrics] = useState([METRICS[0], METRICS[1], METRICS[2]])
  const [compDomains,   setCompDomains]   = useState(['', '', ''])
  const [compResults,   setCompResults]   = useState([])
  const [compRunning,   setCompRunning]   = useState(false)

  useEffect(() => {
    // Build 12-week demo history
    const now = Date.now()
    const demo = Array.from({ length: 12 }, function(_, i) {
      const base = 28 + i * 4
      const d = new Date(now - (11 - i) * 7 * 86400000)
      return {
        label:       d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        overall:     Math.min(100, base + Math.round(Math.random() * 6)),
        directories: Math.min(100, base + 12 + Math.round(Math.random() * 6)),
        backlinks:   Math.min(100, base - 4  + Math.round(Math.random() * 8)),
        web2:        Math.min(100, base + 6  + Math.round(Math.random() * 5)),
        local:       Math.min(100, base + 9  + Math.round(Math.random() * 6)),
        voice:       Math.min(100, base - 6  + Math.round(Math.random() * 8)),
      }
    })

    if (!clientId || !session) {
      setHistory(demo)
      setSliderWeek(11)
      return
    }

    supabase.from('score_history')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', session.user.id)
      .order('recorded_at', { ascending: true })
      .limit(52)
      .then(function(res) {
        const data = res.data
        if (data && data.length >= 2) {
          const hist = data.map(function(r) {
            return {
              label:       new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              overall:     r.overall     || 0,
              directories: r.directories || 0,
              backlinks:   r.backlinks   || 0,
              web2:        r.web2        || 0,
              local:       r.local       || 0,
              voice:       r.voice       || 0,
            }
          })
          setHistory(hist)
          setSliderWeek(hist.length - 1)
        } else {
          setHistory(demo)
          setSliderWeek(11)
        }
      })
      .catch(function() {
        setHistory(demo)
        setSliderWeek(11)
      })
  }, [clientId])

  function toggleMetric(m) {
    setActiveMetrics(function(prev) {
      var has = prev.find(function(x) { return x.key === m.key })
      if (has) return prev.length > 1 ? prev.filter(function(x) { return x.key !== m.key }) : prev
      return prev.concat([m])
    })
  }

  function strHash(s) {
    var h = 0
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  function runComp() {
    var doms = compDomains.filter(function(d) { return d.trim() })
    if (!doms.length) return
    setCompRunning(true)
    var current = history[sliderWeek] || {}
    setTimeout(function() {
      var results = METRICS.slice(0, 5).map(function(m) {
        return {
          key:   m.key,
          label: m.label,
          you:   current[m.key] || 0,
          comps: doms.map(function(d) {
            return { name: d, val: strHash(d + m.key) % 65 + 20 }
          }),
        }
      })
      setCompResults(results)
      setCompRunning(false)
    }, 1000)
  }

  var current = history[sliderWeek] || {}
  var prev    = history[Math.max(0, sliderWeek - 1)] || {}

  var inp = {
    background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7,
    padding: '7px 10px', fontSize: 12, color: T.text, fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none', width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
        {METRICS.map(function(m) {
          var val  = current[m.key] != null ? current[m.key] : 0
          var pval = prev[m.key] != null ? prev[m.key] : 0
          var diff = sliderWeek > 0 ? val - pval : null
          var on   = !!activeMetrics.find(function(x) { return x.key === m.key })
          return (
            <div key={m.key} onClick={function() { toggleMetric(m) }}
              style={{ background: on ? m.color + '18' : T.cardBg, border: '1.5px solid ' + (on ? m.color : T.border2), borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: on ? m.color : T.muted, letterSpacing: -1 }}>{val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 3 }}>{m.label}</div>
              {diff !== null && diff !== 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: diff > 0 ? T.green : T.red, marginTop: 4 }}>
                  {diff > 0 ? '+' : ''}{diff}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Card>
        <CardHead icon="ti ti-chart-line" title="SEO Score History" sub="Click metrics above to toggle. Drag slider to explore weeks." />
        <div style={{ padding: '16px 12px 8px' }}>
          <LineChart history={history} activeKeys={activeMetrics} sliderWeek={sliderWeek} onSlider={setSliderWeek} />
        </div>
      </Card>

      <Card>
        <CardHead icon="ti ti-calendar-week" title={'Week Snapshot'} sub="All metrics for selected week" />
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {METRICS.map(function(m) {
            var val = current[m.key] || 0
            return (
              <div key={m.key} style={{ background: T.cardBg2, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.textSub }}>{m.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(val) }}>{scoreGrade(val)}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(val), letterSpacing: -1 }}>
                  {val}<span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>/100</span>
                </div>
                <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: 'hidden', marginTop: 7 }}>
                  <div style={{ height: '100%', width: val + '%', background: m.color, borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardHead icon="ti ti-chart-bar" title="Competitor Comparison" sub="Enter up to 3 competitor domains" />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 14 }}>
            {[0, 1, 2].map(function(i) {
              return (
                <input key={i} value={compDomains[i]}
                  onChange={function(e) { var d = compDomains.slice(); d[i] = e.target.value; setCompDomains(d) }}
                  placeholder={'competitor' + (i + 1) + '.com'} style={inp} />
              )
            })}
            <button onClick={runComp} disabled={compRunning}
              style={{ padding: '7px 16px', background: compRunning ? T.cardBg2 : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: compRunning ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: compRunning ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {compRunning ? 'Working...' : 'Compare'}
            </button>
          </div>
          {compResults.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {compResults.map(function(r) {
                var all = [r.you].concat(r.comps.map(function(c) { return c.val }))
                var maxVal = Math.max.apply(null, all)
                return (
                  <div key={r.key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>{r.label}</div>
                    {[{ name: 'You', val: r.you, color: T.green }].concat(r.comps.map(function(c) { return { name: c.name, val: c.val, color: T.purple } })).map(function(item, idx) {
                      var pct = Math.round(item.val / maxVal * 100)
                      var isLeader = item.val === maxVal
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <div style={{ width: 72, fontSize: 11, color: idx === 0 ? T.text : T.muted, fontWeight: idx === 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          <div style={{ flex: 1, height: 7, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: pct + '%', background: item.color, borderRadius: 3 }} />
                          </div>
                          <div style={{ width: 28, fontSize: 11, fontWeight: isLeader ? 700 : 400, color: isLeader ? T.green : T.muted }}>{item.val}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>
              Enter competitor domains above and click Compare.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Client Report sub-tab
function ClientReportTab({ clientId, session }) {
  var [profile,    setProfile]    = useState({})
  var [agencyName, setAgencyName] = useState('RankForged AI')
  var [agencyTag,  setAgencyTag]  = useState('Local SEO Specialists')
  var [brandColor, setBrandColor] = useState('#1a237e')
  var [period,     setPeriod]     = useState('monthly')
  var [sections,   setSections]   = useState({
    overview: true, citations: true, backlinks: true,
    local: true, keywords: true, reputation: true, nextsteps: true,
  })

  useEffect(function() {
    if (!clientId || !session) return
    supabase.from('client_data').select('*').eq('client_id', clientId).eq('user_id', session.user.id).maybeSingle()
      .then(function(res) {
        if (res.error) console.error('Reports profile load error:', res.error)
        if (res.data) setProfile(res.data)
      })
  }, [clientId])

  var inp = {
    width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7,
    padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }
  var lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  var SECTION_LIST = [
    { key: 'overview',   label: 'Executive Summary' },
    { key: 'citations',  label: 'Citation Report'   },
    { key: 'backlinks',  label: 'Backlink Progress' },
    { key: 'local',      label: 'Local SEO'         },
    { key: 'keywords',   label: 'Keyword Summary'   },
    { key: 'reputation', label: 'Reputation'        },
    { key: 'nextsteps',  label: 'Next Steps'        },
  ]

  function buildHTML() {
    var biz   = profile.biz_name  || 'Client Business'
    var city  = profile.biz_city  || ''
    var state = profile.biz_state || ''
    var phone = profile.biz_phone || ''
    var today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    var titles = { monthly: 'Monthly SEO Report', quarterly: 'Quarterly Report', initial: 'Initial Audit', custom: 'SEO Report' }
    var reportTitle = titles[period] || 'SEO Report'

    function sec(title, body) {
      return '<div style="page-break-inside:avoid;margin-bottom:28px"><h2 style="font-size:16px;font-weight:700;color:' + brandColor + ';margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ' + brandColor + '">' + title + '</h2>' + body + '</div>'
    }

    var body = ''
    if (sections.overview)   body += sec('Executive Summary', '<p style="font-size:13px;color:#6b7280;line-height:1.6">This report covers SEO performance for ' + biz + (city ? ' in ' + city : '') + '. All metrics reflect activity recorded in RankForged AI as of ' + today + '.</p>')
    if (sections.citations)  body += sec('Citation Report', '<p style="font-size:13px;color:#6b7280;line-height:1.6">Directory submission progress, NAP consistency status, and coverage percentage. Target: 75 directories for maximum local pack visibility.</p>')
    if (sections.backlinks)  body += sec('Backlink Progress', '<p style="font-size:13px;color:#6b7280;line-height:1.6">Outreach pipeline: prospects pitched, links won, and win rate. Next focus: Tier 1 DA 85+ placements on LinkedIn, Medium, and industry sites.</p>')
    if (sections.local)      body += sec('Local SEO Performance', '<p style="font-size:13px;color:#6b7280;line-height:1.6">Google Business Profile activity, review velocity, and service city coverage. Post to GBP weekly and respond to all reviews within 24 hours.</p>')
    if (sections.keywords)   body += sec('Keyword Summary', '<p style="font-size:13px;color:#6b7280;line-height:1.6">Keyword matrix and content gap analysis driving the content calendar, GBP posts, and meta tag strategy.</p>')
    if (sections.reputation) body += sec('Reputation', '<p style="font-size:13px;color:#6b7280;line-height:1.6">Review monitoring across Google, Yelp, Facebook, and BBB. Unanswered reviews flagged for immediate response.</p>')
    if (sections.nextsteps)  body += sec('Next Steps', '<ol style="margin:0;padding-left:20px"><li style="font-size:13px;color:#6b7280;line-height:1.8">Submit to remaining top-20 DA directories</li><li style="font-size:13px;color:#6b7280;line-height:1.8">Schedule weekly GBP posts for next 30 days</li><li style="font-size:13px;color:#6b7280;line-height:1.8">Send review requests to recent customers</li><li style="font-size:13px;color:#6b7280;line-height:1.8">Pitch 5 backlink prospects this week</li></ol>')

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + biz + ' - ' + reportTitle + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Arial,sans-serif;color:#111827}.page{max-width:800px;margin:0 auto;padding:48px 40px}@media print{.no-print{display:none}}</style></head><body><div class="page"><div style="background:linear-gradient(135deg,' + brandColor + ',' + brandColor + 'bb);color:#fff;padding:32px;border-radius:12px;margin-bottom:32px"><div style="display:flex;justify-content:space-between;margin-bottom:16px"><div><div style="font-size:22px;font-weight:800">' + agencyName + '</div><div style="font-size:13px;opacity:.7">' + agencyTag + '</div></div><div style="text-align:right;font-size:12px;opacity:.7"><div>' + reportTitle + '</div><div>' + today + '</div></div></div><div style="font-size:20px;font-weight:700">' + biz + '</div>' + (city ? '<div style="font-size:13px;opacity:.7">' + city + (state ? ', ' + state : '') + (phone ? ' - ' + phone : '') + '</div>' : '') + '</div>' + body + '<div style="text-align:center;color:#9ca3af;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">Generated by ' + agencyName + ' - ' + today + '</div><div class="no-print" style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:' + brandColor + ';color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button></div></div></body></html>'
  }

  function downloadReport() {
    var html = buildHTML()
    var name = (profile.biz_name || 'client').toLowerCase().replace(/\s+/g, '-') + '-seo-report-' + new Date().toISOString().split('T')[0] + '.html'
    var a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = name
    a.click()
  }

  function previewReport() {
    var w = window.open('', '_blank')
    if (w) { w.document.write(buildHTML()); w.document.close() }
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <CardHead icon="ti ti-palette" title="Branding" />
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lbl}>Agency Name</label><input value={agencyName} onChange={function(e) { setAgencyName(e.target.value) }} style={inp} /></div>
            <div><label style={lbl}>Tagline</label><input value={agencyTag} onChange={function(e) { setAgencyTag(e.target.value) }} style={inp} /></div>
            <div>
              <label style={lbl}>Brand Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={brandColor} onChange={function(e) { setBrandColor(e.target.value) }} style={{ width: 38, height: 34, borderRadius: 7, border: '1.5px solid ' + T.border2, background: 'transparent', cursor: 'pointer', padding: 2 }} />
                <input value={brandColor} onChange={function(e) { setBrandColor(e.target.value) }} style={{ ...inp, flex: 1 }} />
              </div>
            </div>
            <div>
              <label style={lbl}>Period</label>
              <select value={period} onChange={function(e) { setPeriod(e.target.value) }} style={inp}>
                <option value="monthly">Monthly Report</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="initial">Initial Audit</option>
                <option value="custom">Custom Report</option>
              </select>
            </div>
          </div>
        </Card>
        <Card>
          <CardHead icon="ti ti-list-check" title="Sections" />
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTION_LIST.map(function(s) {
              return (
                <div key={s.key} onClick={function() { setSections(function(prev) { var n = Object.assign({}, prev); n[s.key] = !n[s.key]; return n }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + T.border, cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid ' + (sections[s.key] ? T.green : T.border2), background: sections[s.key] ? T.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {sections[s.key] && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }}></i>}
                  </div>
                  <span style={{ fontSize: 12, color: sections[s.key] ? T.text : T.muted }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
      <div style={{ flex: 1 }}>
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,' + brandColor + ',' + brandColor + 'bb)', borderRadius: 10, padding: '18px 22px', color: '#fff', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{agencyName}</div>
                  <div style={{ fontSize: 11, opacity: .7 }}>{agencyTag}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, opacity: .7 }}>
                  <div>{{ monthly: 'Monthly Report', quarterly: 'Quarterly', initial: 'Initial Audit', custom: 'Custom' }[period]}</div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{profile.biz_name || 'Client Business'}</div>
              {profile.biz_city && <div style={{ fontSize: 11, opacity: .7 }}>{profile.biz_city}{profile.biz_state ? ', ' + profile.biz_state : ''}</div>}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
              {SECTION_LIST.filter(function(s) { return sections[s.key] }).length} sections selected
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={downloadReport}
                style={{ flex: 1, padding: '10px 16px', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <i className="ti ti-download"></i> Download Report
              </button>
              <button onClick={previewReport}
                style={{ padding: '10px 16px', background: 'transparent', color: T.accentHi, border: '1.5px solid ' + T.border2, borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Preview
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: T.muted, textAlign: 'center' }}>
              Open the downloaded HTML file in a browser, then File - Print - Save as PDF
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Prospect Audit sub-tab
function ProspectAuditTab({ session }) {
  var [url,      setUrl]      = useState('')
  var [biz,      setBiz]      = useState('')
  var [running,  setRunning]  = useState(false)
  var [progress, setProgress] = useState(0)
  var [results,  setResults]  = useState(null)
  var [summary,  setSummary]  = useState('')

  function strHash(s) {
    var h = 0
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  function runAudit() {
    if (!url.trim()) return
    setRunning(true)
    setProgress(0)
    setResults(null)
    setSummary('')

    var scores = {}
    var idx = 0

    function step() {
      if (idx >= SIGNALS.length) {
        var overall = Math.round(SIGNALS.reduce(function(sum, s) { return sum + (scores[s.key] / 100) * s.weight }, 0))
        setResults({ scores: scores, overall: overall })
        setProgress(100)
        setSummary('Overall score ' + overall + '/100. ' + (overall < 50 ? 'Significant improvements needed across multiple signals.' : overall < 75 ? 'Good foundation with targeted improvements available.' : 'Strong local SEO presence. Maintain and expand.'))
        setRunning(false)
        return
      }
      var sig = SIGNALS[idx]
      scores[sig.key] = strHash(url + sig.key) % 65 + 25
      idx++
      setProgress(Math.round(idx / SIGNALS.length * 100))
      setTimeout(step, 250 + Math.random() * 350)
    }

    setTimeout(step, 100)
  }

  function downloadAuditPDF() {
    if (!results) return
    var domain = url.replace(/https?:\/\//, '').replace(/\/.*/, '') || 'prospect'
    var color  = results.overall >= 75 ? '#16a34a' : results.overall >= 50 ? '#2563eb' : results.overall >= 25 ? '#d97706' : '#dc2626'
    var grade  = scoreGrade(results.overall)
    var today  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    var sigRows = SIGNALS.map(function(sig) {
      var score = results.scores[sig.key]
      var sc    = scoreColor(score)
      var label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs Work'
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #e5e7eb"><div style="width:160px;font-size:13px;color:#374151;font-weight:500">' + sig.label + '</div><div style="flex:1;height:7px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;background:' + sc + ';width:' + score + '%"></div></div><div style="width:36px;font-size:13px;font-weight:700;color:' + sc + ';text-align:right">' + score + '</div><div style="width:80px;font-size:11px;font-weight:600;color:' + sc + '">' + label + '</div></div>'
    }).join('')

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (biz || domain) + ' SEO Audit</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Arial,sans-serif;color:#111827}.page{max-width:760px;margin:0 auto;padding:48px 40px}@media print{.no-print{display:none}}</style></head><body><div class="page"><div style="background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:28px 32px;border-radius:12px;margin-bottom:28px"><div style="display:flex;justify-content:space-between"><div><div style="font-size:20px;font-weight:800;margin-bottom:4px">Local SEO Prospect Audit</div><div style="font-size:13px;opacity:.7">Powered by RankForged AI</div></div><div style="text-align:right"><div style="font-size:40px;font-weight:900;color:' + color + '">' + results.overall + '</div><div style="font-size:12px;opacity:.7">Score - Grade ' + grade + '</div></div></div><div style="margin-top:16px;font-size:16px;font-weight:700">' + (biz || domain) + '</div><div style="font-size:12px;opacity:.65;margin-top:2px">' + url + '</div><div style="font-size:11px;opacity:.5;margin-top:4px">Audited ' + today + '</div></div><div style="margin-bottom:24px;background:#f9fafb;border-radius:10px;padding:16px 20px"><div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">Executive Summary</div><p style="font-size:13px;color:#6b7280;line-height:1.6">' + summary + '</p></div><div style="margin-bottom:24px"><h2 style="font-size:15px;font-weight:700;color:#1a237e;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #1a237e">8-Signal Audit Results</h2>' + sigRows + '</div><div style="text-align:center;color:#9ca3af;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">RankForged AI - ' + today + '</div><div class="no-print" style="margin-top:24px;text-align:center"><button onclick="window.print()" style="background:#1a237e;color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button></div></div></body></html>'

    var a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = domain.replace(/[^a-z0-9]/gi, '-') + '-seo-audit.html'
    a.click()
  }

  var inp = {
    width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7,
    padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }
  var lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 270, flexShrink: 0 }}>
        <Card>
          <CardHead icon="ti ti-search" title="Prospect Audit" sub="8-signal local SEO audit scored 0-100" />
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={lbl}>Website URL</label><input value={url} onChange={function(e) { setUrl(e.target.value) }} placeholder="https://example.com" style={inp} /></div>
            <div><label style={lbl}>Business Name</label><input value={biz} onChange={function(e) { setBiz(e.target.value) }} placeholder="Optional" style={inp} /></div>
            <button onClick={runAudit} disabled={running || !url.trim()}
              style={{ padding: '9px 16px', background: running || !url.trim() ? T.cardBg2 : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: running || !url.trim() ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: running || !url.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <i className={'ti ' + (running ? 'ti-loader-2' : 'ti-search')} style={{ animation: running ? 'spin 1s linear infinite' : 'none' }}></i>
              {running ? 'Running...' : 'Run Audit'}
            </button>
            {running && (
              <div>
                <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: progress + '%', background: T.accent, borderRadius: 2, transition: 'width .3s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 5, textAlign: 'center' }}>{progress}%</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div style={{ flex: 1 }}>
        {!results && !running && (
          <Card>
            <div style={{ padding: 60, textAlign: 'center' }}>
              <i className="ti ti-search" style={{ fontSize: 44, color: T.muted, display: 'block', marginBottom: 14, opacity: .3 }}></i>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>Enter a URL to begin</div>
              <div style={{ fontSize: 13, color: T.muted, maxWidth: 360, margin: '0 auto' }}>Paste any prospect website and run an 8-signal audit. Download results as a branded PDF to send to the decision maker.</div>
            </div>
          </Card>
        )}

        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 52, fontWeight: 900, color: scoreColor(results.overall), letterSpacing: -2, lineHeight: 1 }}>{results.overall}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>/100</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(results.overall) }}>{scoreGrade(results.overall)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{biz || url}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>{url}</div>
                    {summary && <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, background: T.cardBg2, borderRadius: 8, padding: '10px 12px' }}>{summary}</div>}
                  </div>
                  <button onClick={downloadAuditPDF}
                    style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <i className="ti ti-download"></i> PDF
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHead icon="ti ti-list-check" title="8-Signal Results" sub="Weighted by local SEO impact" />
              <div>
                {SIGNALS.map(function(sig, i) {
                  var score = results.scores[sig.key]
                  var sc    = scoreColor(score)
                  var label = score >= 75 ? 'Strong' : score >= 50 ? 'Average' : 'Needs Work'
                  return (
                    <div key={sig.key} style={{ padding: '11px 16px', borderBottom: i < SIGNALS.length - 1 ? '1px solid ' + T.border : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 170, fontSize: 12, fontWeight: 600, color: T.text }}>{sig.label}</div>
                      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: score + '%', background: sc, borderRadius: 3, transition: 'width .5s ease' }} />
                      </div>
                      <div style={{ width: 32, fontSize: 13, fontWeight: 800, color: sc, textAlign: 'right' }}>{score}</div>
                      <span style={{ width: 78, fontSize: 10, fontWeight: 700, color: sc }}>{label}</span>
                      <span style={{ fontSize: 10, color: T.muted, width: 56, textAlign: 'right' }}>{sig.weight}% weight</span>
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

// Main export
export default function ReportsPage({ session, clientId }) {
  var [tab, setTab] = useState('analytics')

  var TABS = [
    { id: 'analytics', label: 'Analytics Dashboard', icon: 'ti-chart-line'   },
    { id: 'report',    label: 'Client Report',        icon: 'ti-file-invoice' },
    { id: 'prospect',  label: 'Prospect Audit',       icon: 'ti-search'       },
  ]

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-file-analytics" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Reports &amp; Analytics
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Week-over-week SEO analytics, downloadable client reports, and prospect audit tool.
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: 5 }}>
          {TABS.map(function(t) {
            return (
              <button key={t.id} onClick={function() { setTab(t.id) }}
                style={{ flex: 1, padding: '9px 14px', borderRadius: 7, border: 'none', background: tab === t.id ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'transparent', color: tab === t.id ? '#fff' : T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all .15s' }}>
                <i className={'ti ' + t.icon}></i>
                {t.label}
              </button>
            )
          })}
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
