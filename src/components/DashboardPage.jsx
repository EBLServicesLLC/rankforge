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
  orange:   '#f97316',
  purple:   '#8b5cf6',
  cyan:     '#22d3ee',
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, ...style }}>
      {children}
    </div>
  )
}

function CardHead({ icon, title, sub, right }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        <i className={icon} style={{ color: T.accentHi }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

const SCORE_CATS = [
  { key: 'directories', label: 'Directories',  icon: 'ti ti-map-pin',          color: T.accent  },
  { key: 'backlinks',   label: 'Backlinks',     icon: 'ti ti-link',             color: T.purple  },
  { key: 'web2',        label: 'Web 2.0',       icon: 'ti ti-world',            color: T.green   },
  { key: 'local',       label: 'Local SEO',     icon: 'ti ti-building-store',   color: T.orange  },
  { key: 'voice',       label: 'Voice',         icon: 'ti ti-microphone',       color: T.cyan    },
  { key: 'indexing',    label: 'Indexing',      icon: 'ti ti-search',           color: T.yellow  },
]

const QUICK_ACTIONS = [
  { tab: 'rank-tracker', label: 'Rank Tracker',     icon: 'ti ti-trending-up'      },
  { tab: 'reputation',   label: 'Reputation',        icon: 'ti ti-star'             },
  { tab: 'napaudit',     label: 'NAP Audit',         icon: 'ti ti-clipboard-check'  },
  { tab: 'web2',         label: 'Web 2.0',           icon: 'ti ti-world'            },
  { tab: 'local',        label: 'Citations',         icon: 'ti ti-map-pin'          },
  { tab: 'kwgap',        label: 'KW Gap',            icon: 'ti ti-git-diff'         },
  { tab: 'gbpqa',        label: 'GBP Q&A',           icon: 'ti ti-help-circle'      },
  { tab: 'pdfreport',    label: 'Reports',           icon: 'ti ti-file-analytics'   },
]

const DEMO_SCORES = { overall: 72, directories: 58, backlinks: 61, web2: 45, local: 83, voice: 39, indexing: 77 }

const ACTIVITY = [
  { icon: 'ti ti-check',          color: T.green,  text: 'NAP audit completed',                  time: 'Today'      },
  { icon: 'ti ti-star',           color: T.yellow, text: '3 new reviews detected',               time: 'Yesterday'  },
  { icon: 'ti ti-world',          color: T.purple, text: 'Web 2.0 signal submitted to Medium',   time: '2 days ago' },
  { icon: 'ti ti-map-pin',        color: T.accent, text: 'Citation added to Yelp',               time: '3 days ago' },
  { icon: 'ti ti-file-analytics', color: T.cyan,   text: 'Monthly report generated',             time: '1 week ago' },
]

function gradeFromScore(s) {
  return s >= 80 ? 'A' : s >= 65 ? 'B' : s >= 50 ? 'C' : 'D'
}
function gradeColor(s) {
  return s >= 80 ? T.green : s >= 65 ? T.yellow : s >= 50 ? T.orange : T.red
}
function gradeLabel(s) {
  return s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 50 ? 'Fair' : 'Needs Work'
}

function ScoreBar({ value, color }) {
  return (
    <div style={{ background: T.border, borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: value + '%', height: '100%', background: color, borderRadius: 4, transition: 'width 1s ease' }} />
    </div>
  )
}

export default function DashboardPage({ clientId, userId, session }) {
  const uid = userId || session?.user?.id
  const [biz,      setBiz]      = useState(null)
  const [scores,   setScores]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [usingDemo,setUsingDemo]= useState(false)
  const [auditing, setAuditing] = useState(false)
  const [auditMsg, setAuditMsg] = useState('')

  useEffect(() => {
    if (!clientId || !uid) return
    setLoading(true)
    Promise.all([
      supabase.from('client_data')
        .select('biz_name,biz_cat,biz_addr,biz_city,biz_state,biz_zip,biz_phone,biz_website,biz_kw')
        .eq('client_id', clientId).eq('user_id', uid).maybeSingle(),
      supabase.from('score_history')
        .select('overall,directories,backlinks,web2,local,voice,indexing,recorded_at')
        .eq('client_id', clientId).eq('user_id', uid)
        .order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([{ data: cd }, { data: sh }]) => {
      if (cd) setBiz(cd)
      if (sh) { setScores(sh); setUsingDemo(false) }
      else    { setScores(DEMO_SCORES); setUsingDemo(true) }
      setLoading(false)
    }).catch(() => {
      setScores(DEMO_SCORES); setUsingDemo(true); setLoading(false)
    })
  }, [clientId, uid])

  function navigateTo(tab) {
    window.dispatchEvent(new CustomEvent('rf-switch-tab', { detail: { tab } }))
  }

  async function runAudit() {
    if (!biz?.biz_website) { setAuditMsg('Add a website URL in the Business Profile first.'); return }
    setAuditing(true)
    setAuditMsg('')
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      const token = sess?.access_token
      const res = await fetch('https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          client_id: clientId,
          user_id: uid,
          website:  biz.biz_website,
          biz_name: biz.biz_name,
          biz_cat:  biz.biz_cat,
          biz_addr: biz.biz_addr,
          biz_phone: biz.biz_phone,
          biz_kw:   biz.biz_kw,
        })
      })
      const data = await res.json()
      if (data.error) { setAuditMsg('Audit failed: ' + data.error); return }
      setScores(data)
      setUsingDemo(false)
      setAuditMsg('Audit complete!')
      setTimeout(() => setAuditMsg(''), 3000)
    } catch(e) {
      setAuditMsg('Audit failed: ' + e.message)
    }
    setAuditing(false)
  }

  const bizName  = biz?.biz_name || 'Your Business'
  const bizLoc   = biz?.biz_city && biz?.biz_state ? biz.biz_city + ', ' + biz.biz_state : 'Location not set'
  const bizCat   = biz?.biz_cat || 'Category not set'
  const overall  = scores?.overall ?? 0
  const oColor   = gradeColor(overall)

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%', background: T.pageBg, color: T.text, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{bizName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-map-pin" style={{ fontSize: 12 }} />{bizLoc}
            </span>
            <span style={{ fontSize: 12, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-tag" style={{ fontSize: 12 }} />{bizCat}
            </span>
            {usingDemo && (
              <span style={{ fontSize: 10, color: T.yellow, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>
                Demo Data
              </span>
            )}
          </div>
        </div>
        {/* Overall score badge + audit button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={runAudit} disabled={auditing} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: auditing ? T.border : T.accent,
            color: '#fff', fontSize: 12, fontWeight: 700, cursor: auditing ? 'not-allowed' : 'pointer',
            opacity: auditing ? 0.7 : 1,
          }}>
            <i className={auditing ? 'ti ti-loader-2' : 'ti ti-radar'} style={{ fontSize: 14 }} />
            {auditing ? 'Running Audit...' : 'Run SEO Audit'}
          </button>
          {auditMsg && <span style={{ fontSize: 11, color: auditMsg.includes('failed') ? T.red : T.green }}>{auditMsg}</span>}
        <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: oColor, lineHeight: 1 }}>{gradeFromScore(overall)}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>SEO Grade</div>
          </div>
          <div style={{ width: 1, height: 36, background: T.border }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{overall}<span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>/100</span></div>
            <div style={{ fontSize: 11, color: oColor, marginTop: 2 }}>{gradeLabel(overall)}</div>
          </div>
        </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
          Loading dashboard...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Row 1: stat pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
            {[
              { icon: 'ti ti-chart-bar',   label: 'Overall Score',      value: overall,                    color: oColor   },
              { icon: 'ti ti-star',         label: 'Avg Review Rating',  value: '4.2',                     color: T.yellow },
              { icon: 'ti ti-link',         label: 'Backlink Signals',   value: scores?.backlinks ?? '--', color: T.purple },
              { icon: 'ti ti-world',        label: 'Web 2.0 Live',       value: '12',                      color: T.green  },
              { icon: 'ti ti-map-pin',      label: 'Directory Score',    value: scores?.directories ?? '--', color: T.accent },
            ].map(pill => (
              <div key={pill.label} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: pill.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={pill.icon} style={{ color: pill.color, fontSize: 16 }} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1 }}>{pill.value}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{pill.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: category scores + quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Category Scores */}
            <Card>
              <CardHead icon="ti ti-chart-bar" title="Category Scores" sub="SEO health by area" />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SCORE_CATS.map(cat => {
                  const val = scores?.[cat.key] ?? 0
                  return (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <i className={cat.icon} style={{ color: cat.color, fontSize: 13 }} />
                          <span style={{ fontSize: 12, color: T.textSub }}>{cat.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{val}</span>
                          <span style={{ fontSize: 10, color: gradeColor(val), background: gradeColor(val) + '18', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>{gradeFromScore(val)}</span>
                        </div>
                      </div>
                      <ScoreBar value={val} color={cat.color} />
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHead icon="ti ti-bolt" title="Quick Actions" sub="Jump to any tool" />
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {QUICK_ACTIONS.map(a => (
                  <button key={a.tab} onClick={() => navigateTo(a.tab)} style={{
                    background: T.cardBg2, border: '1px solid ' + T.border, borderRadius: 8,
                    padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.border2}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                  >
                    <i className={a.icon} style={{ color: T.accentHi, fontSize: 14, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 3: business profile + recent activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

            {/* Business Profile */}
            <Card>
              <CardHead icon="ti ti-building-store" title="Business Profile" sub="From onboarding" />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { icon: 'ti ti-tag',          label: 'Category', val: bizCat                                     },
                  { icon: 'ti ti-map-pin',       label: 'Location', val: bizLoc                                    },
                  { icon: 'ti ti-phone',         label: 'Phone',    val: biz?.biz_phone   || 'Not set'             },
                  { icon: 'ti ti-world-www',     label: 'Website',  val: biz?.biz_website || 'Not set'             },
                  { icon: 'ti ti-key',           label: 'Keywords', val: biz?.biz_kw      || 'Not set'             },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid ' + T.border : 'none' }}>
                    <i className={row.icon} style={{ color: T.muted, fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em' }}>{row.label}</div>
                      <div style={{ fontSize: 12, color: row.val === 'Not set' ? T.border2 : T.textSub, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHead icon="ti ti-activity" title="Recent Activity" sub="Latest tool actions" />
              <div style={{ padding: '4px 16px' }}>
                {ACTIVITY.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid ' + T.border : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={item.icon} style={{ color: item.color, fontSize: 14 }} />
                    </div>
                    <div style={{ flex: 1, fontSize: 12, color: T.textSub }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{item.time}</div>
                  </div>
                ))}
                <div style={{ padding: '10px 0', fontSize: 11, color: T.border2, textAlign: 'center' }}>
                  Live activity tracking coming soon
                </div>
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  )
}
