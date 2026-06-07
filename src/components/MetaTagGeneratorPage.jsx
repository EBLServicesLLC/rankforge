/**
 * MetaTagGeneratorPage.jsx
 * AI Meta Tag Generator — service × city combos with scoring, SERP preview, CSV export
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg:  '#060d1a',
  cardBg:  '#0d1f3c',
  cardBg2: '#080f1e',
  border:  '#0f2040',
  border2: '#1a3560',
  text:    '#e2e8f0',
  textSub: '#c8d8f0',
  muted:   '#4a6080',
  accent:  '#3b82f6',
  accentHi:'#60a5fa',
  green:   '#10b981',
  greenBg: 'rgba(16,185,129,.12)',
  red:     '#f87171',
  redBg:   'rgba(248,113,113,.1)',
  yellow:  '#f59e0b',
  yellowBg:'rgba(245,158,11,.1)',
  purple:  '#8b5cf6',
}

const CTA_OPTIONS = [
  { value: 'call',   label: 'Call to Action',    hint: 'Call Now, Get a Quote, Book Today' },
  { value: 'urgent', label: 'Urgency Signals',   hint: 'Same-Day, Fast Response, 24/7' },
  { value: 'trust',  label: 'Trust Signals',     hint: 'Licensed, Certified, Guaranteed' },
  { value: 'value',  label: 'Value Signals',     hint: 'Free Estimate, No Hidden Fees' },
  { value: 'local',  label: 'Hyperlocal',        hint: 'Serving [City], Local Experts' },
]

const titleCase = s => (s || '').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
const comboKey  = (svc, city) => `${svc}|${city}`.toLowerCase().replace(/\s+/g, '-')

function scoreColor(s) {
  return s >= 75 ? T.green : s >= 50 ? T.accent : s >= 25 ? T.yellow : T.red
}

function calcScore(tag) {
  if (!tag) return 0
  const svc  = (tag.service || '').toLowerCase()
  const city = (tag.city    || '').toLowerCase().split(',')[0]
  const t    = (tag.title   || '').toLowerCase()
  const m    = (tag.meta    || '').toLowerCase()
  const h    = (tag.h1      || '').toLowerCase()
  const tLen = (tag.title   || '').length
  const mLen = (tag.meta    || '').length
  const pts = [
    tLen > 0 && tLen <= 60,
    t.includes(svc.split(' ')[0]),
    t.includes(city),
    mLen > 0 && mLen <= 155,
    m.includes(city),
    m.includes(svc.split(' ')[0]),
    h.includes(svc.split(' ')[0]),
    h.includes(city),
    /call|get|book|request|contact|schedule|free|now|today|same.day|fast/i.test(tag.title + ' ' + tag.meta),
    !!tag.aiGenerated,
  ]
  return pts.filter(Boolean).length * 10
}

function CharPill({ len, max, warn }) {
  const color = len <= max ? T.green : len <= warn ? T.yellow : T.red
  const bg    = len <= max ? T.greenBg : len <= warn ? T.yellowBg : T.redBg
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color, background: bg }}>
      {len} / {max}
    </span>
  )
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

export default function MetaTagGeneratorPage({ session, clientId }) {
  const [profile, setProfile]       = useState({})
  const [services, setServices]     = useState('')
  const [state, setState]           = useState('')
  const [cta, setCta]               = useState('call')
  const [combos, setCombos]         = useState([])
  const [tags, setTags]             = useState({})       // key → { title, meta, h1, aiGenerated }
  const [selected, setSelected]     = useState(null)     // combo key
  const [generating, setGenerating] = useState(null)     // combo key being generated
  const [genAll, setGenAll]         = useState(false)
  const [copied, setCopied]         = useState('')
  const [cities, setCities]         = useState([])

  // Load profile + cities
  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name, biz_kw, biz_state, biz_city, biz_cat')
      .eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        if (data.biz_kw && !services) setServices(data.biz_kw)
        if (data.biz_state && !state) setState(data.biz_state)
        if (data.biz_city) setCities([data.biz_city])
      })
  }, [clientId, session])

  const getServices = () => services.split(',').map(s => s.trim()).filter(Boolean)
  const getCities   = () => cities.filter(Boolean)

  const buildCombos = () => {
    const svcs = getServices()
    const ctys = getCities()
    if (!svcs.length) return alert('Add at least one service')
    if (!ctys.length) return alert('Add at least one city — pull from profile or type one in')
    const built = []
    svcs.forEach(svc => ctys.forEach(city => built.push({ service: svc, city, key: comboKey(svc, city) })))
    setCombos(built)
    if (!selected && built.length) setSelected(built[0].key)
  }

  const callEdge = async (payload) => {
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch(
      `https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/meta-tag-generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
        body: JSON.stringify(payload),
      }
    )
    return res.json()
  }

  const generateOne = useCallback(async (combo) => {
    setGenerating(combo.key)
    try {
      const data = await callEdge({
        service:  combo.service,
        city:     combo.city,
        state,
        bizName:  profile.biz_name || 'Local Business',
        cta,
        client_id: clientId,
      })
      if (data.title) {
        setTags(prev => ({ ...prev, [combo.key]: { ...data, service: combo.service, city: combo.city, aiGenerated: true } }))
        setSelected(combo.key)
      }
    } catch (e) {
      console.error(e)
    }
    setGenerating(null)
  }, [state, profile, cta, clientId])

  const generateAll = async () => {
    if (!combos.length) return buildCombos()
    setGenAll(true)
    for (const combo of combos) {
      if (generating === 'abort') break
      await generateOne(combo)
      await new Promise(r => setTimeout(r, 300))
    }
    setGenAll(false)
  }

  const selectedCombo = combos.find(c => c.key === selected)
  const selectedTag   = tags[selected]
  const score         = calcScore(selectedTag)

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const copyAllTags = () => {
    if (!selectedTag) return
    const text = `TITLE: ${selectedTag.title}\nMETA: ${selectedTag.meta}\nH1: ${selectedTag.h1}`
    copyText(text, 'all')
  }

  const exportCSV = () => {
    const rows = [['Service', 'City', 'Title Tag', 'Meta Description', 'H1', 'Score']]
    combos.forEach(c => {
      const t = tags[c.key]
      if (t) rows.push([c.service, c.city, t.title, t.meta, t.h1, calcScore(t)])
    })
    const csv = rows.map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `meta-tags-${(profile.biz_name || 'export').replace(/\s+/g,'-')}.csv`
    a.click()
  }

  const addCityValue = (input) => {
    const val = input.value.trim()
    if (val) {
      setCities(prev => [...prev, val])
      input.value = ''
    }
  }

  const addCity = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCityValue(e.target)
    }
  }

  const addCityOnBlur = (e) => {
    addCityValue(e.target)
  }

  const inp = { width: '100%', background: T.cardBg2, border: `1.5px solid ${T.border2}`, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }
  const btn = (bg, disabled) => ({ padding: '8px 16px', background: disabled ? '#1a3560' : bg, color: disabled ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.6 : 1 })

  const generatedCount = Object.keys(tags).length
  const totalCount     = combos.length

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-tags" style={{ color: T.accentHi, marginRight: 10 }} />
          AI Meta Tag Generator
        </div>
        <div style={{ fontSize: 13, color: T.muted }}>
          Generate SEO-optimised title tags, meta descriptions, and H1s for every service × city combination. CTA-driven copy with click-through rate optimisation built in.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '0 28px 28px', alignItems: 'flex-start' }}>

        {/* LEFT — Settings + Combo list */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Settings */}
          <Card>
            <CardHead icon="ti ti-adjustments" title="Generator Settings" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div>
                <label style={lbl}>Services <span style={{ color: T.muted, fontWeight: 400 }}>(comma separated)</span></label>
                <textarea
                  value={services}
                  onChange={e => setServices(e.target.value)}
                  placeholder="plumber, drain cleaning, water heater repair"
                  rows={3}
                  style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
                />
                <button
                  onClick={() => profile.biz_kw && setServices(profile.biz_kw)}
                  style={{ marginTop: 5, fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  ↻ Pull from profile
                </button>
              </div>

              <div>
                <label style={lbl}>State / Region</label>
                <input value={state} onChange={e => setState(e.target.value)} placeholder="TX" style={inp} />
              </div>

              <div>
                <label style={lbl}>Cities <span style={{ color: T.muted, fontWeight: 400 }}>(Enter to add)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                  {cities.map((c, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: i === 0 ? T.greenBg : 'rgba(59,130,246,.1)', color: i === 0 ? T.green : T.accentHi, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {i === 0 && '★ '}{c}
                      <button onClick={() => setCities(prev => prev.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
                <input onKeyDown={addCity} onBlur={addCityOnBlur} placeholder="Type a city, press Enter or click away" style={inp} />
                <button
                  onClick={() => { if (profile.biz_city && !cities.includes(profile.biz_city)) setCities(prev => [profile.biz_city, ...prev.filter(c => c !== profile.biz_city)]) }}
                  style={{ marginTop: 5, fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  ↻ Pull primary city from profile
                </button>
              </div>

              <div>
                <label style={lbl}>CTA / Signal Style</label>
                <select value={cta} onChange={e => setCta(e.target.value)} style={inp}>
                  {CTA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
                  {CTA_OPTIONS.find(o => o.value === cta)?.hint}
                </div>
              </div>

              <button onClick={buildCombos} style={btn('linear-gradient(135deg,#1d4ed8,#3b82f6)')}>
                <i className="ti ti-layout-grid" /> Build All Combos
              </button>
            </div>
          </Card>

          {/* Combo list */}
          {combos.length > 0 && (
            <Card>
              <CardHead
                icon="ti ti-list"
                title="Combos"
                sub={`${generatedCount} of ${totalCount} generated`}
                right={
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={exportCSV} disabled={!generatedCount} style={{ ...btn(T.cardBg2, !generatedCount), padding: '5px 10px', fontSize: 11, border: `1px solid ${T.border2}` }}>
                      <i className="ti ti-download" /> CSV
                    </button>
                    <button onClick={generateAll} disabled={genAll} style={{ ...btn('linear-gradient(135deg,#3b82f6,#1d4ed8)', genAll), padding: '5px 10px', fontSize: 11 }}>
                      {genAll ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Running…</> : <><i className="ti ti-sparkles" /> All</>}
                    </button>
                  </div>
                }
              />
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {combos.map((combo, i) => {
                  const t = tags[combo.key]
                  const sc = calcScore(t)
                  const isActive = selected === combo.key
                  const isGen = generating === combo.key
                  return (
                    <div
                      key={combo.key}
                      onClick={() => setSelected(combo.key)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: i < combos.length - 1 ? `1px solid ${T.border}` : 'none',
                        display: 'flex', alignItems: 'center', gap: 10,
                        cursor: 'pointer',
                        background: isActive ? 'rgba(59,130,246,.08)' : 'transparent',
                        borderLeft: isActive ? `2px solid ${T.accent}` : '2px solid transparent',
                        transition: '.12s',
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {titleCase(combo.service)}
                        </div>
                        <div style={{ fontSize: 11, color: T.muted }}>
                          <i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {combo.city}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {isGen ? (
                          <i className="ti ti-loader" style={{ color: T.accent, fontSize: 13, animation: 'spin 1s linear infinite' }} />
                        ) : t ? (
                          <>
                            <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(sc) }}>{sc}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: T.greenBg, color: T.green }}>Done</span>
                          </>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); generateOne(combo) }}
                            style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(59,130,246,.12)', color: T.accentHi, border: `1px solid rgba(59,130,246,.2)`, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                            Generate
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT — Preview */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!selectedCombo ? (
            <Card style={{ padding: 60, textAlign: 'center' }}>
              <i className="ti ti-tags" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 14, opacity: .4 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Build your combos first</div>
              <div style={{ fontSize: 13, color: T.muted }}>Add services and cities in the panel on the left, then click Build All Combos.</div>
            </Card>
          ) : !selectedTag ? (
            <Card style={{ padding: 0 }}>
              <CardHead icon="ti ti-sparkles" title={`${titleCase(selectedCombo.service)} — ${selectedCombo.city}`} sub="Click Generate to write AI-optimised tags" />
              <div style={{ padding: 40, textAlign: 'center' }}>
                <button
                  onClick={() => generateOne(selectedCombo)}
                  disabled={!!generating}
                  style={{ ...btn('linear-gradient(135deg,#3b82f6,#1d4ed8)', !!generating), margin: '0 auto' }}>
                  {generating === selectedCombo.key
                    ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                    : <><i className="ti ti-sparkles" /> Generate Meta Tags</>}
                </button>
              </div>
            </Card>
          ) : (
            <>
              {/* Score + actions */}
              <Card>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Score ring */}
                  <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                    <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="36" cy="36" r="28" fill="none" stroke={T.border2} strokeWidth="6" />
                      <circle cx="36" cy="36" r="28" fill="none"
                        stroke={scoreColor(score)} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={2 * Math.PI * 28 * (1 - score / 100)}
                        style={{ transition: 'stroke-dashoffset .8s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: scoreColor(score), lineHeight: 1 }}>{score}</div>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px' }}>score</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                      {titleCase(selectedCombo.service)} — {selectedCombo.city}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted }}>
                      {selectedTag.aiGenerated ? '✦ AI-generated' : 'Template'} · Grade: {score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : score >= 60 ? 'B' : score >= 50 ? 'C' : 'D'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                    <button onClick={copyAllTags} style={btn('linear-gradient(135deg,#3b82f6,#1d4ed8)')}>
                      <i className="ti ti-copy" /> {copied === 'all' ? '✓ Copied' : 'Copy All'}
                    </button>
                    <button onClick={() => generateOne(selectedCombo)} disabled={!!generating} style={btn(T.cardBg2, !!generating)}>
                      <i className="ti ti-refresh" /> Regenerate
                    </button>
                  </div>
                </div>
              </Card>

              {/* Title Tag */}
              <Card>
                <CardHead icon="ti ti-h-1" title="Title Tag"
                  right={<CharPill len={(selectedTag.title || '').length} max={60} warn={70} />}
                />
                <div style={{ padding: '12px 16px' }}>
                  <div style={{
                    background: T.cardBg2, border: `1.5px solid ${(selectedTag.title || '').length <= 60 ? T.green : T.yellow}`,
                    borderRadius: 8, padding: '10px 12px', fontSize: 15, fontWeight: 700, color: T.accentHi, lineHeight: 1.4,
                  }}>
                    {selectedTag.title}
                  </div>
                  <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${Math.min((selectedTag.title || '').length / 60 * 100, 100)}%`,
                      background: (selectedTag.title || '').length <= 60 ? T.green : T.yellow,
                      transition: 'width .5s ease',
                    }} />
                  </div>
                  <button onClick={() => copyText(selectedTag.title, 'title')} style={{ marginTop: 8, fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {copied === 'title' ? '✓ Copied' : '📋 Copy title'}
                  </button>
                </div>
              </Card>

              {/* Meta Description */}
              <Card>
                <CardHead icon="ti ti-align-left" title="Meta Description"
                  right={<CharPill len={(selectedTag.meta || '').length} max={155} warn={165} />}
                />
                <div style={{ padding: '12px 16px' }}>
                  <div style={{
                    background: T.cardBg2, border: `1.5px solid ${(selectedTag.meta || '').length <= 155 ? T.green : T.yellow}`,
                    borderRadius: 8, padding: '10px 12px', fontSize: 13, color: T.textSub, lineHeight: 1.6,
                  }}>
                    {selectedTag.meta}
                  </div>
                  <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${Math.min((selectedTag.meta || '').length / 155 * 100, 100)}%`,
                      background: (selectedTag.meta || '').length <= 155 ? T.green : T.yellow,
                      transition: 'width .5s ease',
                    }} />
                  </div>
                  <button onClick={() => copyText(selectedTag.meta, 'meta')} style={{ marginTop: 8, fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {copied === 'meta' ? '✓ Copied' : '📋 Copy meta description'}
                  </button>
                </div>
              </Card>

              {/* H1 */}
              <Card>
                <CardHead icon="ti ti-heading" title="H1 Heading"
                  right={<CharPill len={(selectedTag.h1 || '').length} max={65} warn={75} />}
                />
                <div style={{ padding: '12px 16px' }}>
                  <div style={{
                    background: T.cardBg2, border: `1.5px solid ${T.border2}`,
                    borderRadius: 8, padding: '10px 12px', fontSize: 18, fontWeight: 800, color: T.text,
                  }}>
                    {selectedTag.h1}
                  </div>
                  <button onClick={() => copyText(selectedTag.h1, 'h1')} style={{ marginTop: 8, fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {copied === 'h1' ? '✓ Copied' : '📋 Copy H1'}
                  </button>
                </div>
              </Card>

              {/* SERP Preview */}
              <Card>
                <CardHead icon="ti ti-eye" title="Google SERP Preview" sub="How this page appears in search results" />
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', border: `1px solid #e0e0e0` }}>
                    <div style={{ fontSize: 12, color: '#1a0dab', marginBottom: 2 }}>
                      {profile.biz_website || 'yourwebsite.com'} › {selectedCombo.city.toLowerCase().replace(/\s+/g, '-')} › {selectedCombo.service.split(' ')[0].toLowerCase()}
                    </div>
                    <div style={{ fontSize: 18, color: '#1a0dab', fontWeight: 400, marginBottom: 3, fontFamily: 'Arial, sans-serif', lineHeight: 1.3 }}>
                      {selectedTag.title}
                    </div>
                    <div style={{ fontSize: 14, color: '#4d5156', lineHeight: 1.5, fontFamily: 'Arial, sans-serif' }}>
                      {selectedTag.meta}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Score breakdown */}
              <Card>
                <CardHead icon="ti ti-chart-bar" title="Score Breakdown" sub="What's helping and what's missing" />
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Title under 60 chars',   ok: (selectedTag.title || '').length > 0 && (selectedTag.title || '').length <= 60 },
                    { label: 'Title includes service',  ok: (selectedTag.title || '').toLowerCase().includes((selectedCombo.service.split(' ')[0]).toLowerCase()) },
                    { label: 'Title includes city',     ok: (selectedTag.title || '').toLowerCase().includes(selectedCombo.city.split(',')[0].toLowerCase()) },
                    { label: 'Meta under 155 chars',    ok: (selectedTag.meta || '').length > 0 && (selectedTag.meta || '').length <= 155 },
                    { label: 'Meta includes city',      ok: (selectedTag.meta || '').toLowerCase().includes(selectedCombo.city.split(',')[0].toLowerCase()) },
                    { label: 'Meta includes service',   ok: (selectedTag.meta || '').toLowerCase().includes((selectedCombo.service.split(' ')[0]).toLowerCase()) },
                    { label: 'H1 includes service',     ok: (selectedTag.h1 || '').toLowerCase().includes((selectedCombo.service.split(' ')[0]).toLowerCase()) },
                    { label: 'H1 includes city',        ok: (selectedTag.h1 || '').toLowerCase().includes(selectedCombo.city.split(',')[0].toLowerCase()) },
                    { label: 'Contains CTA / action',   ok: /call|get|book|request|contact|schedule|free|now|today|same.day|fast/i.test((selectedTag.title || '') + ' ' + (selectedTag.meta || '')) },
                    { label: 'AI-generated copy',       ok: !!selectedTag.aiGenerated },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <i className={`ti ti-${item.ok ? 'circle-check' : 'circle'}`} style={{ color: item.ok ? T.green : T.muted, fontSize: 14, flexShrink: 0 }} />
                      <span style={{ color: item.ok ? T.textSub : T.muted, textDecoration: item.ok ? 'none' : 'none' }}>{item.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: item.ok ? T.green : T.muted }}>+10</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
