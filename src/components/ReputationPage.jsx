/**
 * ReputationPage.jsx
 * Reputation Monitoring Dashboard
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
  orange:   '#f97316',
  purple:   '#8b5cf6',
}

const PLATFORMS = {
  google:   { label: 'Google',   color: '#4285f4', icon: 'ti-brand-google'   },
  yelp:     { label: 'Yelp',     color: '#d32323', icon: 'ti-star'            },
  facebook: { label: 'Facebook', color: '#1877f2', icon: 'ti-brand-facebook'  },
  bbb:      { label: 'BBB',      color: '#005ea2', icon: 'ti-shield-check'    },
  other:    { label: 'Other',    color: '#6b7280', icon: 'ti-star'            },
}

const STARS = [5, 4, 3, 2, 1]

const DEMO_REVIEWS = [
  { platform: 'google',   name: 'Sarah M.',   stars: 5, text: 'Absolutely fantastic service! The technician was professional, on time, and fixed everything perfectly.', service: 'drain cleaning',    daysAgo: 2  },
  { platform: 'google',   name: 'James R.',   stars: 4, text: 'Good work overall. A little late but the job was done well. Would use again.',                           service: 'water heater repair', daysAgo: 5  },
  { platform: 'yelp',     name: 'Linda T.',   stars: 3, text: 'Mixed experience. Quote was different from the final bill. Work was ok but communication could improve.', service: 'plumbing',           daysAgo: 8  },
  { platform: 'google',   name: 'Mike D.',    stars: 2, text: 'Waited 4 hours past the appointment window with no call. Very unprofessional.',                          service: 'emergency repair',    daysAgo: 12 },
  { platform: 'facebook', name: 'Karen B.',   stars: 5, text: "Best plumber I've ever used! Fair pricing, clean work, very respectful.",                                service: 'pipe repair',         daysAgo: 15 },
  { platform: 'google',   name: 'Tom H.',     stars: 5, text: 'Called at 7am for an emergency and they were here by 9am. Incredible response time!',                   service: 'emergency repair',    daysAgo: 20 },
  { platform: 'yelp',     name: 'Nancy W.',   stars: 1, text: 'Terrible. Charged me twice and the problem came back the next day. Never again.',                        service: 'drain cleaning',      daysAgo: 25 },
  { platform: 'bbb',      name: 'Robert L.',  stars: 5, text: 'Incredibly professional company. From booking to completion, everything was seamless.',                  service: 'water heater repair', daysAgo: 30 },
  { platform: 'google',   name: 'Amy C.',     stars: 4, text: 'Great job on the installation. Small hiccup with scheduling but resolved quickly.',                      service: 'installation',        daysAgo: 35 },
  { platform: 'facebook', name: 'David P.',   stars: 5, text: 'Third time using them. Always reliable. The team is friendly and the pricing is very fair.',             service: 'plumbing',            daysAgo: 40 },
]

function daysAgoDate(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function starLabel(n) {
  return ['', '1 star', '2 stars', '3 stars', '4 stars', '5 stars'][n] || ''
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

export default function ReputationPage({ session, clientId }) {
  const [reviews,    setReviews]    = useState([])
  const [filter,     setFilter]     = useState('all')
  const [starSel,    setStarSel]    = useState(5)
  const [platform,   setPlatform]   = useState('google')
  const [reviewer,   setReviewer]   = useState('')
  const [reviewText, setReviewText] = useState('')
  const [service,    setService]    = useState('')
  const [dateVal,    setDateVal]    = useState(new Date().toISOString().split('T')[0])

  // Load from Supabase on mount
  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('reputation_reviews')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .then(({ data }) => { if (data && data.length) setReviews(data) })
  }, [clientId, session])

  const persist = async (updated) => {
    setReviews(updated)
    // Persist each review to Supabase (upsert)
    if (!clientId || !session) return
    // Simple approach: delete all and re-insert
    await supabase.from('reputation_reviews').delete().eq('client_id', clientId).eq('user_id', session.user.id)
    if (updated.length) {
      await supabase.from('reputation_reviews').insert(updated.map(r => ({ ...r, client_id: clientId, user_id: session.user.id })))
    }
  }

  const addReview = () => {
    const name = reviewer.trim() || 'Anonymous'
    const newReview = { id: Date.now(), platform, name, stars: starSel, text: reviewText.trim(), service: service.trim(), date: dateVal, answered: false, response: '' }
    const updated = [newReview, ...reviews]
    persist(updated)
    setReviewer(''); setReviewText(''); setService('')
  }

  const loadDemo = () => {
    const demo = DEMO_REVIEWS.map(r => ({ id: Date.now() + Math.random(), answered: false, response: '', ...r, date: daysAgoDate(r.daysAgo) }))
    persist([...demo, ...reviews])
  }

  const markAnswered = (id) => {
    const updated = reviews.map(r => r.id === id ? { ...r, answered: true } : r)
    persist(updated)
  }

  const deleteReview = (id) => {
    persist(reviews.filter(r => r.id !== id))
  }

  const exportCSV = () => {
    if (!reviews.length) return
    const rows = [['Date','Platform','Reviewer','Stars','Review','Service','Answered']]
    reviews.forEach(r => rows.push([r.date, r.platform, r.name, r.stars, r.text||'', r.service||'', r.answered ? 'Yes' : 'No']))
    const csv = rows.map(r => r.map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'reputation-reviews.csv'
    a.click()
  }

  const filtered = reviews.filter(r => {
    if (filter === 'unanswered') return !r.answered
    if (filter === 'negative')   return r.stars <= 2
    if (filter === 'positive')   return r.stars >= 4
    if (['google','yelp','facebook','bbb'].includes(filter)) return r.platform === filter
    return true
  })

  const totalReviews   = reviews.length
  const avgRating      = totalReviews ? (reviews.reduce((s, r) => s + r.stars, 0) / totalReviews).toFixed(1) : '-'
  const answeredCount  = reviews.filter(r => r.answered).length
  const unansweredCount = totalReviews - answeredCount
  const thisMonth      = reviews.filter(r => { const d = new Date(r.date + 'T12:00:00'); return Date.now() - d < 30 * 24 * 3600 * 1000 }).length

  const inp = { width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-star" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Reputation Monitoring Dashboard
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Track reviews across Google, Yelp, Facebook, and BBB. Spot unanswered reviews and monitor your rating velocity.
        </div>

        {/* Platform cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {['google','yelp','facebook','bbb'].map(p => {
            const pr = reviews.filter(r => r.platform === p)
            const avg = pr.length ? (pr.reduce((s,r) => s + r.stars, 0) / pr.length).toFixed(1) : '-'
            const unans = pr.filter(r => !r.answered).length
            const plat = PLATFORMS[p]
            return (
              <div key={p} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '14px 16px', borderTop: '3px solid ' + plat.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <i className={'ti ' + plat.icon} style={{ color: plat.color, fontSize: 18 }}></i>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{plat.label}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: plat.color, letterSpacing: -1 }}>{avg}</div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{pr.length} review{pr.length !== 1 ? 's' : ''}</div>
                {pr.length > 0 && (
                  <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: (parseFloat(avg)||0) / 5 * 100 + '%', height: '100%', background: parseFloat(avg) >= 4 ? T.green : parseFloat(avg) >= 3 ? T.yellow : T.red, borderRadius: 2 }} />
                  </div>
                )}
                {unans > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: T.red, background: 'rgba(248,113,113,.1)', padding: '2px 8px', borderRadius: 12, display: 'inline-block' }}>
                    {unans} unanswered
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Reviews',  val: totalReviews,     color: T.accent  },
            { label: 'Avg Rating',     val: avgRating,        color: T.yellow  },
            { label: 'Responded',      val: answeredCount,    color: T.green   },
            { label: 'Unanswered',     val: unansweredCount,  color: T.red     },
            { label: 'This Month',     val: thisMonth,        color: T.purple  },
          ].map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '0 28px 28px', alignItems: 'flex-start' }}>

        {/* LEFT */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead icon="ti ti-plus" title="Add Review" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={inp}>
                  {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Reviewer Name</label>
                <input value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="e.g. Sarah M." style={inp} />
              </div>
              <div>
                <label style={lbl}>Star Rating</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {STARS.map(s => (
                    <button key={s} onClick={() => setStarSel(s)} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid ' + (starSel === s ? (s >= 4 ? T.green : s === 3 ? T.yellow : T.red) : T.border2), background: starSel === s ? (s >= 4 ? 'rgba(16,185,129,.12)' : s === 3 ? 'rgba(245,158,11,.12)' : 'rgba(248,113,113,.1)') : 'transparent', color: starSel === s ? (s >= 4 ? T.green : s === 3 ? T.yellow : T.red) : T.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Review Text (optional)</label>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={3} placeholder="Paste the review text..." style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div>
                <label style={lbl}>Service Mentioned</label>
                <input value={service} onChange={e => setService(e.target.value)} placeholder="e.g. drain cleaning" style={inp} />
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={addReview} style={{ flex: 1, padding: '8px 12px', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Add Review
                </button>
                <button onClick={loadDemo} style={{ padding: '8px 12px', background: 'transparent', color: T.accentHi, border: '1.5px solid ' + T.border2, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Demo
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead icon="ti ti-filter" title="Filter" />
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { val: 'all',         label: 'All'          },
                { val: 'unanswered',  label: 'Unanswered'   },
                { val: 'negative',    label: 'Negative'     },
                { val: 'positive',    label: 'Positive'     },
                { val: 'google',      label: 'Google'       },
                { val: 'yelp',        label: 'Yelp'         },
                { val: 'facebook',    label: 'Facebook'     },
                { val: 'bbb',         label: 'BBB'          },
              ].map(f => (
                <button key={f.val} onClick={() => setFilter(f.val)} style={{ padding: '4px 11px', borderRadius: 20, border: '1.5px solid ' + (filter === f.val ? T.green : T.border2), background: filter === f.val ? 'rgba(16,185,129,.12)' : 'transparent', color: filter === f.val ? T.green : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ padding: '0 16px 14px', display: 'flex', gap: 7 }}>
              <button onClick={exportCSV} disabled={!reviews.length} style={{ padding: '6px 12px', background: 'transparent', color: reviews.length ? T.accentHi : T.muted, border: '1.5px solid ' + T.border2, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: reviews.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Export CSV
              </button>
              <button onClick={() => persist([])} disabled={!reviews.length} style={{ padding: '6px 12px', background: 'transparent', color: reviews.length ? T.red : T.muted, border: '1.5px solid ' + (reviews.length ? 'rgba(248,113,113,.3)' : T.border), borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: reviews.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Clear All
              </button>
            </div>
          </Card>
        </div>

        {/* RIGHT — Review list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardHead icon="ti ti-messages" title="Reviews" sub={filtered.length + ' of ' + reviews.length + ' reviews'} />
            <div style={{ maxHeight: 680, overflowY: 'auto' }}>
              {!reviews.length ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <i className="ti ti-star" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 14, opacity: .3 }}></i>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>No reviews yet</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Add reviews manually or click Demo to load sample data.</div>
                </div>
              ) : !filtered.length ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: T.muted }}>No reviews match this filter.</div>
              ) : filtered.map((r, i) => {
                const plat = PLATFORMS[r.platform] || PLATFORMS.other
                const borderColor = r.stars >= 4 ? T.green : r.stars === 3 ? T.yellow : T.red
                const daysAgo = Math.round((Date.now() - new Date(r.date + 'T12:00:00')) / 86400000)
                return (
                  <div key={r.id} style={{ padding: '13px 16px', borderBottom: i < filtered.length - 1 ? '1px solid ' + T.border : 'none', borderLeft: '3px solid ' + borderColor }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={'ti ' + plat.icon} style={{ color: plat.color, fontSize: 16, flexShrink: 0 }}></i>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>{daysAgo}d ago &bull; {plat.label}{r.service ? ' \u2022 ' + r.service : ''}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: borderColor }}>{starLabel(r.stars)}</span>
                        {r.answered
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(16,185,129,.12)', color: T.green }}>Responded</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(249,115,22,.1)', color: T.orange }}>Unanswered</span>}
                      </div>
                    </div>
                    {r.text ? (
                      <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>"{r.text}"</div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!r.answered && (
                        <button onClick={() => markAnswered(r.id)} style={{ padding: '4px 10px', background: 'rgba(16,185,129,.1)', color: T.green, border: '1px solid rgba(16,185,129,.2)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Mark Responded
                        </button>
                      )}
                      <button onClick={() => deleteReview(r.id)} style={{ padding: '4px 10px', background: 'rgba(248,113,113,.1)', color: T.red, border: '1px solid rgba(248,113,113,.2)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
