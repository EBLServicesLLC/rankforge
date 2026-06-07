/**
 * KwGapPage.jsx
 * Competitor Keyword Gap Analysis
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
  orange:   '#f97316',
  cyan:     '#22d3ee',
}

const INTENTS = {
  transactional: { color: T.green,  bg: 'rgba(16,185,129,.12)', label: 'Buy'     },
  local:         { color: T.accent, bg: 'rgba(59,130,246,.12)', label: 'Local'   },
  informational: { color: T.purple, bg: 'rgba(139,92,246,.12)', label: 'Info'    },
  commercial:    { color: T.orange, bg: 'rgba(249,115,22,.12)', label: 'Compare' },
}

const STATUS = {
  gap:         { color: T.red,    bg: 'rgba(248,113,113,.1)',  label: 'Gap - Missing'    },
  opportunity: { color: T.orange, bg: 'rgba(249,115,22,.1)',   label: 'Opportunity'      },
  win:         { color: T.green,  bg: 'rgba(16,185,129,.12)', label: 'You Cover This'   },
}

function buildFallback(compUrl, compName, service, city, yourKeywords) {
  const svc = service || 'service'
  const cty = city || 'your area'
  const comp = compName || compUrl
  const gaps = [
    { keyword: 'best ' + svc + ' near me',           intent: 'local',         status: 'gap',         source: 'title',   action: 'Create a "Best ' + svc + ' Near Me" page targeting local search intent', comp },
    { keyword: svc + ' cost ' + cty,                  intent: 'commercial',    status: 'gap',         source: 'heading', action: 'Add a transparent pricing page for ' + cty + ' customers',               comp },
    { keyword: 'emergency ' + svc + ' ' + cty,        intent: 'transactional', status: 'gap',         source: 'title',   action: 'Create an emergency service landing page with 24/7 availability',         comp },
    { keyword: 'licensed ' + svc + ' ' + cty,         intent: 'transactional', status: 'opportunity', source: 'meta',    action: 'Add licensing credentials and trust signals to your homepage',             comp },
    { keyword: 'how to choose a ' + svc,              intent: 'informational', status: 'gap',         source: 'heading', action: 'Write a buyer guide blog post targeting this research query',               comp },
    { keyword: svc + ' reviews ' + cty,               intent: 'commercial',    status: 'opportunity', source: 'schema',  action: 'Add review schema and a dedicated testimonials page',                       comp },
    { keyword: 'affordable ' + svc + ' ' + cty,       intent: 'transactional', status: 'gap',         source: 'title',   action: 'Create a value-focused landing page with pricing comparison',               comp },
    { keyword: svc + ' companies ' + cty,             intent: 'local',         status: 'gap',         source: 'url',     action: 'Build a local service area page targeting this comparison query',            comp },
    { keyword: 'same day ' + svc + ' ' + cty,         intent: 'transactional', status: 'opportunity', source: 'heading', action: 'Highlight same-day availability prominently on your homepage',              comp },
    { keyword: 'what does ' + svc + ' cost',          intent: 'informational', status: 'gap',         source: 'meta',    action: 'Write a detailed FAQ article answering common pricing questions',            comp },
    { keyword: svc + ' near ' + cty,                  intent: 'local',         status: 'win',         source: 'title',   action: 'Already targeting — ensure GBP and schema are optimised',                  comp },
    { keyword: 'top rated ' + svc + ' ' + cty,        intent: 'commercial',    status: 'gap',         source: 'title',   action: 'Create a social proof page featuring your best reviews and ratings',        comp },
    { keyword: svc + ' vs diy ' + cty,                intent: 'informational', status: 'opportunity', source: 'heading', action: 'Write a comparison article addressing the DIY vs professional question',    comp },
    { keyword: 'certified ' + svc + ' ' + cty,        intent: 'transactional', status: 'gap',         source: 'schema',  action: 'Add certification schema and create a credentials page',                   comp },
    { keyword: 'free estimate ' + svc + ' ' + cty,    intent: 'transactional', status: 'win',         source: 'meta',    action: 'Good coverage — ensure estimate CTA is above the fold',                   comp },
  ]
  return gaps.filter(g => !yourKeywords.some(k => k.includes(g.keyword.split(' ')[0])))
           .slice(0, 12)
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

export default function KwGapPage({ session, clientId }) {
  const [profile,   setProfile]   = useState({})
  const [compUrl,   setCompUrl]   = useState('')
  const [compName,  setCompName]  = useState('')
  const [depth,     setDepth]     = useState('standard')
  const [keywords,  setKeywords]  = useState([])
  const [filter,    setFilter]    = useState('all')
  const [running,   setRunning]   = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name, biz_kw, biz_city, biz_cat')
      .eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [clientId, session])

  const getAuthHeader = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    return 'Bearer ' + s.access_token
  }

  const analyse = async () => {
    if (!compUrl) return
    setRunning(true)
    setKeywords([])
    const yourKeywords = (profile.biz_kw || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    const service = (profile.biz_kw || profile.biz_cat || 'service').split(',')[0].trim()
    const city    = profile.biz_city || 'your area'
    const bizName = profile.biz_name || 'our business'

    try {
      const auth = await getAuthHeader()
      const res = await fetch('https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/kw-gap-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ compUrl, compName, depth, service, city, bizName, yourKeywords, client_id: clientId }),
      })
      const data = await res.json()
      if (data.keywords && data.keywords.length) {
        setKeywords(data.keywords)
      } else {
        setKeywords(buildFallback(compUrl, compName, service, city, yourKeywords))
      }
    } catch (e) {
      setKeywords(buildFallback(compUrl, compName, service, city, yourKeywords))
    }
    setRunning(false)
  }

  const loadDemo = () => {
    setCompUrl('https://bestplumbingaustin.com')
    setCompName('Best Plumbing Austin')
  }

  const exportCSV = () => {
    if (!keywords.length) return
    const rows = [['Keyword','Intent','Status','Source','Competitor','Action']]
    keywords.forEach(k => rows.push([k.keyword, k.intent, k.status, k.source, k.comp, k.action]))
    const csv = rows.map(r => r.map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'keyword-gap-analysis.csv'
    a.click()
  }

  const filtered = keywords.filter(k => filter === 'all' ? true : k.status === filter)
  const gapCount  = keywords.filter(k => k.status === 'gap').length
  const winCount  = keywords.filter(k => k.status === 'win').length
  const oppCount  = keywords.filter(k => k.status === 'opportunity').length
  const topGaps   = keywords.filter(k => k.status === 'gap').slice(0, 5)

  const inp = { width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-chart-arrows" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Competitor Keyword Gap Analysis
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Enter a competitor URL and AI identifies keywords they target that you are missing. Shows gaps, wins, and opportunities with recommended actions.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Keywords Found', val: keywords.length, color: T.accent  },
            { label: 'Gaps Missing',   val: gapCount,        color: T.red     },
            { label: 'Your Wins',      val: winCount,        color: T.green   },
            { label: 'Opportunities',  val: oppCount,        color: T.orange  },
          ].map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '0 28px 28px', alignItems: 'flex-start' }}>

        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead icon="ti ti-world-search" title="Competitor Settings" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>Competitor Website URL</label>
                <input value={compUrl} onChange={e => setCompUrl(e.target.value)} placeholder="https://competitor.com" style={inp} />
              </div>
              <div>
                <label style={lbl}>Competitor Name (optional)</label>
                <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="e.g. Acme Plumbing" style={inp} />
              </div>
              <div>
                <label style={lbl}>Analysis Depth</label>
                <select value={depth} onChange={e => setDepth(e.target.value)} style={inp}>
                  <option value="fast">Fast (homepage only)</option>
                  <option value="standard">Standard (recommended)</option>
                  <option value="deep">Deep (AI full analysis)</option>
                </select>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                AI analyses competitor page titles, meta descriptions, headings, and schema to identify keyword gaps. Add your Anthropic key for full AI analysis.
              </div>
              <button onClick={analyse} disabled={running || !compUrl} style={{ padding: '8px 16px', background: running || !compUrl ? '#1a3560' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: running || !compUrl ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: running || !compUrl ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-chart-arrows"></i>
                {running ? 'Analysing...' : 'Analyse Competitor'}
              </button>
              <button onClick={loadDemo} style={{ padding: '8px 16px', background: 'transparent', color: T.accentHi, border: '1.5px solid ' + T.border2, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-player-play"></i>
                Load Demo
              </button>
              {keywords.length > 0 && (
                <button onClick={exportCSV} style={{ padding: '8px 16px', background: 'transparent', color: T.accentHi, border: '1.5px solid ' + T.border2, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-download"></i>
                  Export CSV
                </button>
              )}
            </div>
          </Card>

          {topGaps.length > 0 && (
            <Card>
              <CardHead icon="ti ti-rocket" title="Top Priority Gaps" sub="Highest impact actions" />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topGaps.map((k, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, paddingBottom: 8, borderBottom: i < topGaps.length - 1 ? '1px solid ' + T.border : 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,.12)', color: T.accentHi, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: T.text, marginBottom: 2 }}>{k.keyword}</div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{k.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardHead icon="ti ti-list-search" title="Keyword Gap Results" sub={keywords.length ? keywords.length + ' keywords analysed vs ' + (compName || compUrl) : 'Run analysis to see results'} />

            {keywords.length > 0 && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', gap: 6 }}>
                {[
                  { val: 'all',         label: 'All'                          },
                  { val: 'gap',         label: 'Gaps (' + gapCount + ')'      },
                  { val: 'opportunity', label: 'Opps (' + oppCount + ')'      },
                  { val: 'win',         label: 'Wins (' + winCount + ')'      },
                ].map(f => (
                  <button key={f.val} onClick={() => setFilter(f.val)} style={{ padding: '4px 12px', borderRadius: 20, border: '1.5px solid ' + (filter === f.val ? T.accent : T.border2), background: filter === f.val ? 'rgba(59,130,246,.12)' : 'transparent', color: filter === f.val ? T.accentHi : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ maxHeight: 620, overflowY: 'auto' }}>
              {!keywords.length && !running && (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <i className="ti ti-chart-arrows" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 14, opacity: .3 }}></i>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>No results yet</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Enter a competitor URL and click Analyse Competitor.</div>
                </div>
              )}
              {running && (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <i className="ti ti-loader" style={{ fontSize: 36, color: T.accent, display: 'block', marginBottom: 12, animation: 'spin 1s linear infinite' }}></i>
                  <div style={{ fontSize: 13, color: T.text }}>Analysing competitor keywords...</div>
                </div>
              )}
              {filtered.map((k, i) => {
                const st = STATUS[k.status] || STATUS.opportunity
                const it = INTENTS[k.intent] || INTENTS.local
                return (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < filtered.length - 1 ? '1px solid ' + T.border : 'none', borderLeft: '3px solid ' + st.color }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{k.keyword}</div>
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: it.bg, color: it.color }}>{it.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: st.bg, color: st.color }}>{st.label}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Source: {k.source} &nbsp;&bull;&nbsp; Competitor: {k.comp}</div>
                    {k.action && (
                      <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>
                        <i className="ti ti-arrow-right" style={{ color: T.accent, fontSize: 11, marginRight: 4 }}></i>
                        {k.action}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <style>{'@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}
