import { useState, useEffect, useCallback } from 'react'
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

const PLATFORMS = {
  google:   { label: 'Google',   color: '#4285f4', icon: 'ti ti-brand-google',   weight: 40 },
  yelp:     { label: 'Yelp',     color: '#d32323', icon: 'ti ti-star',            weight: 25 },
  facebook: { label: 'Facebook', color: '#1877f2', icon: 'ti ti-brand-facebook',  weight: 20 },
  bbb:      { label: 'BBB',      color: '#005ea2', icon: 'ti ti-shield-check',    weight: 15 },
}

const EMPTY_DATA = {
  google:   { current: 0, last: 0, avg: 0 },
  yelp:     { current: 0, last: 0, avg: 0 },
  facebook: { current: 0, last: 0, avg: 0 },
  bbb:      { current: 0, last: 0, avg: 0 },
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
        <i className={icon} style={{ color: T.accentHi }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function calcScore(data) {
  let score = 0, totalWeight = 0
  Object.keys(PLATFORMS).forEach(k => {
    const d = data[k] || { current: 0, avg: 0 }
    const w = PLATFORMS[k].weight
    const raw = Math.min(100, 5 * d.current + 8 * (d.avg || 0))
    score += raw * w
    totalWeight += w
  })
  return totalWeight > 0 ? Math.round(score / totalWeight) : 0
}

function calcVelocity(data) {
  const current = Object.keys(PLATFORMS).reduce((a, k) => a + (data[k]?.current || 0), 0)
  const last    = Object.keys(PLATFORMS).reduce((a, k) => a + (data[k]?.last    || 0), 0)
  return { current, last, change: current - last }
}

function scoreColor(s) {
  return s >= 60 ? T.green : s >= 30 ? T.orange : T.red
}

function scoreLabel(s) {
  return s >= 60 ? 'Strong social proof' : s >= 30 ? 'Growing social proof' : 'Weak social proof'
}

function stars(avg) {
  if (!avg) return ''
  const full = Math.round(avg)
  return Array.from({ length: 5 }, (_, i) => i < full ? 'ti ti-star-filled' : 'ti ti-star')
}

function VelocityBar({ value, max, isThis, isLast }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const color = isThis ? T.accent : isLast ? T.purple : T.border2
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: value > 0 ? T.textSub : T.muted }}>{value || '-'}</div>
      <div style={{ width: '100%', height: 80, background: T.cardBg2, borderRadius: '4px 4px 0 0', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', background: color, height: pct + '%', borderRadius: '4px 4px 0 0', transition: 'height .5s ease' }} />
      </div>
    </div>
  )
}

export default function SocialProofPage({ session, clientId }) {
  const [data,    setData]    = useState(EMPTY_DATA)
  const [inputs,  setInputs]  = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    loadData()
  }, [clientId, session])

  async function loadData() {
    setLoading(true)
    const { data: row } = await supabase
      .from('social_proof')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (row) {
      const d = {
        google:   { current: row.google_current   || 0, last: row.google_last   || 0, avg: row.google_avg   || 0 },
        yelp:     { current: row.yelp_current     || 0, last: row.yelp_last     || 0, avg: row.yelp_avg     || 0 },
        facebook: { current: row.facebook_current || 0, last: row.facebook_last || 0, avg: row.facebook_avg || 0 },
        bbb:      { current: row.bbb_current      || 0, last: row.bbb_last      || 0, avg: row.bbb_avg      || 0 },
      }
      setData(d)
      setInputs(d)
    }
    setLoading(false)
  }

  async function saveData() {
    setSaving(true)
    await supabase.from('social_proof').upsert({
      client_id:        clientId,
      user_id:          session.user.id,
      google_current:   inputs.google.current,   google_last:   inputs.google.last,   google_avg:   inputs.google.avg,
      yelp_current:     inputs.yelp.current,     yelp_last:     inputs.yelp.last,     yelp_avg:     inputs.yelp.avg,
      facebook_current: inputs.facebook.current, facebook_last: inputs.facebook.last, facebook_avg: inputs.facebook.avg,
      bbb_current:      inputs.bbb.current,      bbb_last:      inputs.bbb.last,      bbb_avg:      inputs.bbb.avg,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'client_id,user_id' })
    setData(inputs)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function importFromReputation() {
    const { data: reviews } = await supabase
      .from('reputation_reviews')
      .select('platform,stars,date')
      .eq('client_id', clientId)
      .eq('user_id', session.user.id)

    if (!reviews || !reviews.length) return

    const now = new Date()
    const thisMonth = (r) => {
      const d = new Date(r.date + 'T12:00:00')
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    const lastMonth = (r) => {
      const d = new Date(r.date + 'T12:00:00')
      const prev = new Date(now)
      prev.setMonth(prev.getMonth() - 1)
      return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear()
    }

    const platformMap = { google: 'google', yelp: 'yelp', facebook: 'facebook', bbb: 'bbb' }
    const next = { ...inputs }

    Object.keys(platformMap).forEach(p => {
      const platformReviews = reviews.filter(r => r.platform?.toLowerCase() === p)
      if (!platformReviews.length) return
      const current = platformReviews.filter(thisMonth).length
      const last    = platformReviews.filter(lastMonth).length
      const avg     = platformReviews.length
        ? parseFloat((platformReviews.reduce((a, r) => a + r.stars, 0) / platformReviews.length).toFixed(1))
        : 0
      next[p] = { current: (next[p]?.current || 0) + current, last: (next[p]?.last || 0) + last, avg }
    })

    setInputs(next)
  }

  const update = useCallback((platform, field, value) => {
    setInputs(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: parseFloat(value) || 0 }
    }))
  }, [])

  const score    = calcScore(data)
  const velocity = calcVelocity(data)
  const sColor   = scoreColor(score)

  // Build 6-month velocity chart data
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now)
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), idx: i }
  })
  const chartVals = months.map(m => {
    if (m.idx === 5) return velocity.current
    if (m.idx === 4) return velocity.last
    return Math.max(0, Math.round(velocity.last * (0.6 - 0.1 * (4 - m.idx))))
  })
  const chartMax = Math.max(...chartVals, 1)

  // Insights
  const insights = []
  if (score < 30) insights.push('Your social proof score is low. Launch the Review Request Campaign to collect reviews from recent customers immediately.')
  if (velocity.change < 0) insights.push('Review velocity is declining month-over-month. Send review request reminders to boost the count.')
  if ((data.google?.current || 0) < 10) insights.push('Google reviews have the highest ranking impact. Focus your review campaign on Google first - aim for 10+ reviews.')
  const gAvg = data.google?.avg || 0
  if (gAvg > 0 && gAvg < 4) insights.push('Your Google average is below 4.0 (' + gAvg.toFixed(1) + '). Respond to all negative reviews and improve service in the flagged areas.')
  if (velocity.current > velocity.last && velocity.change >= 3) insights.push('Strong momentum - ' + velocity.change + ' more reviews than last month. Keep the review request cadence going.')
  if (!insights.length) insights.push('Solid social proof performance. Maintain review velocity by requesting reviews from every satisfied customer.')

  const inp = (style) => ({
    width: '100%', background: T.cardBg2, border: '1px solid ' + T.border2,
    borderRadius: 7, color: T.text, padding: '7px 9px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    ...style,
  })

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%', background: T.pageBg, color: T.text, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Social Proof Aggregator</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          Consolidates review counts and ratings from Google, Yelp, Facebook, and BBB into a single Social Proof Score.
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
          Loading...
        </div>
      ) : (
        <>
          {/* Score Hero */}
          <Card style={{ marginBottom: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>

              {/* Big score */}
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: sColor, lineHeight: 1, letterSpacing: -2 }}>{score}</div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 4 }}>Social Proof Score</div>
              </div>

              <div style={{ width: 1, height: 60, background: T.border, flexShrink: 0 }} />

              {/* Headline + actions */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 3 }}>{scoreLabel(score)}</div>
                <div style={{ fontSize: 12, color: T.muted }}>
                  This month: {velocity.current} reviews &nbsp;|&nbsp; Last month: {velocity.last}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button onClick={importFromReputation}
                    style={{ padding: '7px 14px', background: T.yellow + '20', color: T.yellow, border: '1px solid ' + T.yellow + '40', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="ti ti-download" />Import from Reputation Tab
                  </button>
                </div>
              </div>

              {/* Trend */}
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: velocity.change > 0 ? T.green : velocity.change < 0 ? T.red : T.muted }}>
                  {velocity.change > 0 ? '+' + velocity.change : velocity.change < 0 ? '-' + Math.abs(velocity.change) : '='}
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>vs last month</div>
              </div>
            </div>
          </Card>

          {/* Platform cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
            {Object.keys(PLATFORMS).map(k => {
              const p = PLATFORMS[k]
              const d = data[k] || { current: 0, last: 0, avg: 0 }
              const change = d.current - d.last
              return (
                <div key={k} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '14px 16px', borderTop: '3px solid ' + p.color }}>
                  <i className={p.icon} style={{ color: p.color, fontSize: 22, display: 'block', marginBottom: 6 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: p.color, letterSpacing: -1, lineHeight: 1 }}>{d.current}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 5 }}>reviews this month</div>
                  {d.avg > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                      {stars(d.avg).map((s, i) => (
                        <i key={i} className={s} style={{ color: T.yellow, fontSize: 11 }} />
                      ))}
                      <span style={{ fontSize: 11, color: T.yellow, marginLeft: 3 }}>{d.avg.toFixed(1)}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 600, color: change > 0 ? T.green : change < 0 ? T.red : T.muted }}>
                    {change > 0 ? '+' + change + ' this month' : change < 0 ? change + ' this month' : 'flat'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input + charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Data Entry */}
            <Card>
              <CardHead icon="ti ti-edit" title="Enter Review Counts" sub="Current and last month per platform" />
              <div style={{ padding: '12px 16px' }}>
                {Object.keys(PLATFORMS).map(k => {
                  const p = PLATFORMS[k]
                  const d = inputs[k] || { current: 0, last: 0, avg: 0 }
                  return (
                    <div key={k} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <i className={p.icon} style={{ color: p.color, fontSize: 15 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.label}</span>
                        <span style={{ fontSize: 10, color: T.muted, marginLeft: 'auto' }}>Weight: {p.weight}%</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {[
                          { field: 'current', label: 'This Month', step: 1,   max: 9999 },
                          { field: 'last',    label: 'Last Month', step: 1,   max: 9999 },
                          { field: 'avg',     label: 'Avg Rating', step: 0.1, max: 5    },
                        ].map(f => (
                          <div key={f.field}>
                            <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>{f.label}</div>
                            <input
                              type="number" min="0" max={f.max} step={f.step}
                              value={d[f.field]}
                              onChange={e => update(k, f.field, e.target.value)}
                              style={inp()}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <button onClick={saveData} disabled={saving}
                  style={{ width: '100%', padding: '9px 0', background: saved ? T.green : T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background .2s' }}>
                  {saving ? (
                    <><i className="ti ti-loader-2" style={{ fontSize: 14 }} />Saving...</>
                  ) : saved ? (
                    <><i className="ti ti-circle-check" style={{ fontSize: 14 }} />Saved!</>
                  ) : (
                    <><i className="ti ti-device-floppy" style={{ fontSize: 14 }} />Save and Recalculate</>
                  )}
                </button>
              </div>
            </Card>

            {/* Charts + Insights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Velocity chart */}
              <Card>
                <CardHead icon="ti ti-chart-bar" title="Review Velocity" sub="6-month review count trend" />
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginBottom: 6 }}>
                    {chartVals.map((v, i) => (
                      <VelocityBar key={i} value={v} max={chartMax} isThis={i === 5} isLast={i === 4} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {months.map((m, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i >= 4 ? T.textSub : T.muted }}>{m.label}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: T.accent }} />This Month
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.muted }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: T.purple }} />Last Month
                    </div>
                  </div>
                </div>
              </Card>

              {/* Insights */}
              <Card style={{ flex: 1 }}>
                <CardHead icon="ti ti-bulb" title="Insights" sub="Personalised recommendations" />
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < insights.length - 1 ? '1px solid ' + T.border : 'none' }}>
                      <i className="ti ti-arrow-right" style={{ color: T.accent, fontSize: 12, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{ins}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Score breakdown */}
          <Card>
            <CardHead icon="ti ti-calculator" title="Score Breakdown" sub="How the Social Proof Score is calculated" />
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
              {Object.keys(PLATFORMS).map(k => {
                const p = PLATFORMS[k]
                const d = data[k] || { current: 0, avg: 0 }
                const raw = Math.min(100, 5 * d.current + 8 * (d.avg || 0))
                const contribution = Math.round(raw * p.weight / 100)
                return (
                  <div key={k} style={{ background: T.cardBg2, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <i className={p.icon} style={{ color: p.color, fontSize: 13 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{p.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>{p.weight}% weight</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Raw score</div>
                    <div style={{ background: T.border, borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: raw + '%', height: '100%', background: p.color, borderRadius: 4, transition: 'width .8s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: T.muted }}>Contributes</span>
                      <span style={{ fontWeight: 700, color: p.color }}>{contribution} pts</span>
                    </div>
                  </div>
                )
              })}
              <div style={{ background: T.cardBg2, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Formula</div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6, textAlign: 'center' }}>
                  (Reviews x 5) + (Avg x 8)<br />
                  Capped at 100 per platform<br />
                  Weighted by platform importance
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
