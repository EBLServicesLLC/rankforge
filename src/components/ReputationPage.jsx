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
  google:   { label: 'Google',   color: '#4285f4', icon: 'ti-brand-google'  },
  yelp:     { label: 'Yelp',     color: '#d32323', icon: 'ti-star'           },
  facebook: { label: 'Facebook', color: '#1877f2', icon: 'ti-brand-facebook' },
  bbb:      { label: 'BBB',      color: '#005ea2', icon: 'ti-shield-check'   },
  other:    { label: 'Other',    color: '#6b7280', icon: 'ti-star'           },
}

const DEMO = [
  { platform: 'google',   name: 'Sarah M.',  stars: 5, text: 'Absolutely fantastic service! Professional, on time, and fixed everything perfectly.', service: 'drain cleaning',    daysAgo: 2  },
  { platform: 'google',   name: 'James R.',  stars: 4, text: 'Good work overall. A little late but the job was done well. Would use again.',         service: 'water heater',      daysAgo: 5  },
  { platform: 'yelp',     name: 'Linda T.',  stars: 3, text: 'Mixed experience. Quote was different from the final bill.',                           service: 'plumbing',          daysAgo: 8  },
  { platform: 'google',   name: 'Mike D.',   stars: 2, text: 'Waited 4 hours past the appointment window with no call. Very unprofessional.',        service: 'emergency repair',  daysAgo: 12 },
  { platform: 'facebook', name: 'Karen B.',  stars: 5, text: 'Best service ever! Fair pricing, clean work, very respectful.',                        service: 'pipe repair',       daysAgo: 15 },
  { platform: 'google',   name: 'Tom H.',    stars: 5, text: 'Called at 7am for an emergency and they were here by 9am. Incredible!',               service: 'emergency repair',  daysAgo: 20 },
  { platform: 'yelp',     name: 'Nancy W.',  stars: 1, text: 'Terrible. Charged me twice and the problem came back the next day.',                   service: 'drain cleaning',    daysAgo: 25 },
  { platform: 'bbb',      name: 'Robert L.', stars: 5, text: 'Incredibly professional company. From booking to completion, seamless.',               service: 'water heater',      daysAgo: 30 },
  { platform: 'google',   name: 'Amy C.',    stars: 4, text: 'Great job on the installation. Small hiccup with scheduling but resolved quickly.',    service: 'installation',      daysAgo: 35 },
  { platform: 'facebook', name: 'David P.',  stars: 5, text: 'Third time using them. Always reliable. Friendly team and fair pricing.',              service: 'plumbing',          daysAgo: 40 },
]

function daysAgoDate(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
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

export default function ReputationPage({ session, clientId }) {
  const [reviews,    setReviews]    = useState([])
  const [filter,     setFilter]     = useState('all')
  const [starSel,    setStarSel]    = useState(5)
  const [platform,   setPlatform]   = useState('google')
  const [reviewer,   setReviewer]   = useState('')
  const [reviewText, setReviewText] = useState('')
  const [service,    setService]    = useState('')
  const [dateVal,    setDateVal]    = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('reputation_reviews')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', session.user.id)
      .order('date', { ascending: false })
      .then(({ data }) => { if (data && data.length) setReviews(data) })
  }, [clientId, session])

  const save = async (updated) => {
    setReviews(updated)
    if (!clientId || !session) return
    await supabase.from('reputation_reviews').delete().eq('client_id', clientId).eq('user_id', session.user.id)
    if (updated.length) {
      const rows = updated.map(r => ({ id: r.id, platform: r.platform, name: r.name, stars: r.stars, text: r.text || '', service: r.service || '', date: r.date, answered: r.answered, response: r.response || '', client_id: clientId, user_id: session.user.id }))
      await supabase.from('reputation_reviews').insert(rows)
    }
  }

  const addReview = () => {
    const r = { id: Date.now(), platform, name: reviewer.trim() || 'Anonymous', stars: starSel, text: reviewText.trim(), service: service.trim(), date: dateVal, answered: false, response: '' }
    save([r, ...reviews])
    setReviewer(''); setReviewText(''); setService('')
  }

  const loadDemo = () => {
    const demo = DEMO.map(r => ({ id: Date.now() + Math.random(), answered: false, response: '', platform: r.platform, name: r.name, stars: r.stars, text: r.text, service: r.service, date: daysAgoDate(r.daysAgo) }))
    save([...demo, ...reviews])
  }

  const markAnswered = (id) => save(reviews.map(r => r.id === id ? { ...r, answered: true } : r))
  const deleteReview  = (id) => save(reviews.filter(r => r.id !== id))

  const exportCSV = () => {
    if (!reviews.length) return
    const rows = [['Date','Platform','Reviewer','Stars','Review','Service','Answered']]
    reviews.forEach(r => rows.push([r.date, r.platform, r.name, r.stars, r.text || '', r.service || '', r.answered ? 'Yes' : 'No']))
    const csv = rows.map(r => r.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n')
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

  const total     = reviews.length
  const avg       = total ? (reviews.reduce((s, r) => s + r.stars, 0) / total).toFixed(1) : '-'
  const answered  = reviews.filter(r => r.answered).length
  const unans     = total - answered
  const thisMonth = reviews.filter(r => Date.now() - new Date(r.date + 'T12:00:00') < 30 * 86400000).length

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {['google','yelp','facebook','bbb'].map(p => {
            const pr   = reviews.filter(r => r.platform === p)
            const pavg = pr.length ? (pr.reduce((s,r) => s + r.stars, 0) / pr.length).toFixed(1) : '-'
            const pu   = pr.filter(r => !r.answered).length
            const pl   = PLATFORMS[p]
            return (
              <div key={p} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '14px 16px', borderTop: '3px solid ' + pl.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <i className={'ti ' + pl.icon} style={{ color: pl.color, fontSize: 18 }}></i>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{pl.label}</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: pl.color, letterSpacing: -1 }}>{pavg}</div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{pr.length} review{pr.length !== 1 ? 's' : ''}</div>
                {pr.length > 0 && (
                  <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: (parseFloat(pavg) || 0) / 5 * 100 + '%', height: '100%', background: parseFloat(pavg) >= 4 ? T.green : parseFloat(pavg) >= 3 ? T.yellow : T.red, borderRadius: 2 }} />
                  </div>
                )}
                {pu > 0 && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: T.red, background: 'rgba(248,113,113,.1)', padding: '2px 8px', borderRadius: 12, display: 'inline-block' }}>{pu} unanswered</div>}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Reviews', val: total,    color: T.accent  },
            { label: 'Avg Rating',    val: avg,      color: T.yellow  },
            { label: 'Responded',     val: answered, color: T.green   },
            { label: 'Unanswered',    val: unans,    color: T.red     },
            { label: 'This Month',    val: thisMonth, color: T.purple },
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
            <CardHead icon="ti ti-plus" title="Add Review" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} style={inp}>
                  {Object.entries(PLATFORMS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Reviewer Name</label>
                <input value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="e.g. Sarah M." style={inp} />
              </div>
              <div>
                <label style={lbl}>Star Rating</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[5,4,3,2,1].map(s => (
                    <button key={s} onClick={() => setStarSel(s)} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid ' + (starSel === s ? (s >= 4 ? T.green : s === 3 ? T.yellow : T.red) : T.border2), background: starSel === s ? (s >= 4 ? 'rgba(16,185,129,.12)' : s === 3 ? 'rgba(245,158,11,.12)' : 'rgba(248,113,113,.1)') : 'transparent', color: starSel === s ? (s >= 4 ? T.green : s === 3 ? T.yellow : T.red) : T.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Review Text</label>
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
              {['all','unanswered','negative','positive','google','yelp','facebook','bbb'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 11px', borderRadius: 20, border: '1.5px solid ' + (filter === f ? T.green : T.border2), background: filter === f ? 'rgba(16,185,129,.12)' : 'transparent', color: filter === f ? T.green : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ padding: '0 16px 14px', display: 'flex', gap: 7 }}>
              <button onClick={exportCSV} disabled={!reviews.length} style={{ padding: '6px 12px', background: 'transparent', color: reviews.length ? T.accentHi : T.muted, border: '1.5px solid ' + T.border2, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: reviews.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Export CSV
              </button>
              <button onClick={() => save([])} disabled={!reviews.length} style={{ padding: '6px 12px', background: 'transparent', color: reviews.length ? T.red : T.muted, border: '1.5px solid ' + (reviews.length ? 'rgba(248,113,113,.3)' : T.border), borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: reviews.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                Clear All
              </button>
            </div>
          </Card>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardHead icon="ti ti-messages" title="Reviews" sub={filtered.length + ' of ' + total + ' reviews'} />
            <div style={{ maxHeight: 680, overflowY: 'auto' }}>
              {!total ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <i className="ti ti-star" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 14, opacity: .3 }}></i>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>No reviews yet</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Add reviews manually or click Demo to load sample data.</div>
                </div>
              ) : !filtered.length ? (
                <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: T.muted }}>No reviews match this filter.</div>
              ) : filtered.map((r, i) => {
                const pl = PLATFORMS[r.platform] || PLATFORMS.other
                const bc = r.stars >= 4 ? T.green : r.stars === 3 ? T.yellow : T.red
                const dago = Math.round((Date.now() - new Date(r.date + 'T12:00:00')) / 86400000)
                return (
                  <div key={r.id} style={{ padding: '13px 16px', borderBottom: i < filtered.length - 1 ? '1px solid ' + T.border : 'none', borderLeft: '3px solid ' + bc }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className={'ti ' + pl.icon} style={{ color: pl.color, fontSize: 16, flexShrink: 0 }}></i>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: T.muted }}>{dago}d ago &bull; {pl.label}{r.service ? ' - ' + r.service : ''}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: bc }}>{r.stars} stars</span>
                        {r.answered
                          ? <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(16,185,129,.12)', color: T.green }}>Responded</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(249,115,22,.1)', color: T.orange }}>Unanswered</span>}
                      </div>
                    </div>
                    {r.text ? <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 8 }}>"{r.text}"</div> : null}
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
