// src/components/VoiceSearchPage.jsx
// Voice Search & FAQ — matches Social Publisher / Local Links layout exactly

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const QUESTION_TYPES = [
  { id: 'how',        label: 'How questions',      example: '"How much does HR consulting cost in Emerald Isle?"', icon: '❓' },
  { id: 'what',       label: 'What questions',      example: '"What is the best HR service near me?"',             icon: '💡' },
  { id: 'who',        label: 'Who questions',       example: '"Who are the top rated HR consultants near me?"',    icon: '👤' },
  { id: 'where',      label: 'Where questions',     example: '"Where can I find HR services in Emerald Isle?"',    icon: '📍' },
  { id: 'cost',       label: 'Cost & price',        example: '"How much does HR consulting cost per hour?"',       icon: '💰' },
  { id: 'nearme',     label: 'Near me queries',     example: '"Best HR consultant near me open now"',              icon: '🗺️' },
  { id: 'best',       label: 'Best & top',          example: '"Best HR consulting service in Emerald Isle NC"',    icon: '⭐' },
  { id: 'comparison', label: 'Comparison',          example: '"In-house HR vs HR consulting — which is better?"', icon: '⚖️' },
]

const card = {
  background: '#0d1f38',
  border: '1px solid #1a3a5c',
  borderRadius: 12,
  marginBottom: 16,
  overflow: 'hidden',
}

const cardHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 20px',
  borderBottom: '1px solid #1a3a5c',
}

const cardIcon = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: '#1a3a5c',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  flexShrink: 0,
}

const cardTitle = { fontSize: 14, fontWeight: 700, color: '#e2e8f0' }
const cardSub   = { fontSize: 12, color: '#64748b', marginTop: 2 }
const cardBody  = { padding: '16px 20px' }

const inputStyle = {
  width: '100%',
  background: '#0a1628',
  border: '1.5px solid #1a3a5c',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  color: '#e2e8f0',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle = {
  fontSize: 11,
  color: '#64748b',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.5px',
  display: 'block',
  marginBottom: 6,
}

const btnPrimary = {
  width: '100%',
  padding: '12px',
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const btnGreen = {
  ...btnPrimary,
  background: 'linear-gradient(135deg, #10b981, #059669)',
}

const btnPurple = {
  ...btnPrimary,
  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  width: 'auto',
  padding: '9px 20px',
}

export default function VoiceSearchPage({ session, clientId }) {
  const [bizName, setBizName]             = useState('')
  const [services, setServices]           = useState('')
  const [city, setCity]                   = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['how', 'what', 'cost', 'nearme'])
  const [questions, setQuestions]         = useState([])
  const [answers, setAnswers]             = useState({})
  const [generating, setGenerating]       = useState(false)
  const [writingAnswers, setWritingAnswers] = useState(false)
  const [snippetQ, setSnippetQ]           = useState('')
  const [snippetKw, setSnippetKw]         = useState('')
  const [snippet, setSnippet]             = useState('')
  const [writingSnippet, setWritingSnippet] = useState(false)
  const [activeFilter, setActiveFilter]   = useState('all')
  const [schema, setSchema]               = useState('')
  const [copied, setCopied]               = useState('')
  const [error, setError]                 = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!clientId || !session) return
    supabase
      .from('client_data')
      .select('biz_name, biz_cat, biz_city, biz_state')
      .eq('client_id', clientId)
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.biz_name) setBizName(data.biz_name)
          if (data.biz_cat)  setServices(data.biz_cat)
          if (data.biz_city) setCity(data.biz_city + (data.biz_state ? ', ' + data.biz_state : ''))
          setProfileLoaded(true)
        }
      })
  }, [clientId, session])

  const toggleType = (id) =>
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  })

  const generateQuestions = async () => {
    if (!services.trim() || !city.trim()) { setError('Please enter services and city first.'); return }
    if (!selectedTypes.length) { setError('Select at least one question type.'); return }
    setError(''); setGenerating(true); setQuestions([]); setAnswers({}); setSchema('')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-search-generate`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ biz_name: bizName, services, city, types: selectedTypes, client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setQuestions(data.questions || [])
    } catch (err) { setError(err.message) }
    finally { setGenerating(false) }
  }

  const writeAnswers = async () => {
    if (!questions.length) return
    setWritingAnswers(true); setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-search-answers`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ biz_name: bizName, questions, services, city, client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Answer generation failed')
      setAnswers(data.answers || {})
      buildSchema(questions, data.answers || {})
    } catch (err) { setError(err.message) }
    finally { setWritingAnswers(false) }
  }

  const buildSchema = (qs, ans) => {
    const pairs = qs.filter(q => ans[q]).map(q => ({
      '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: ans[q] }
    }))
    setSchema(JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: pairs }, null, 2))
  }

  const writeSnippet = async () => {
    if (!snippetQ.trim() || !snippetKw.trim()) return
    setWritingSnippet(true); setSnippet(''); setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-search-snippet`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ biz_name: bizName, question: snippetQ, keyword: snippetKw, services, city, client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Snippet generation failed')
      setSnippet(data.snippet || '')
    } catch (err) { setError(err.message) }
    finally { setWritingSnippet(false) }
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const filteredQuestions = activeFilter === 'all' ? questions
    : activeFilter === 'answered' ? questions.filter(q => !!answers[q])
    : questions.filter(q => !answers[q])

  const answeredCount = questions.filter(q => answers[q]).length

  return (
    <div style={{ background: '#060d1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'inherit' }}>

      {/* ── Page Header ── */}
      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          🎙️ Voice Search & FAQ Optimisation
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, maxWidth: 800 }}>
          Generate voice-optimised questions and answers, build FAQ schema, and deploy to Google, Siri, Alexa, and Bing.
          Voice queries are 3–5× longer than typed searches — this tool gets your answers read aloud.
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 40, paddingBottom: 20, borderBottom: '1px solid #1a3a5c' }}>
          {[
            { label: 'QUESTIONS',  value: questions.length,  color: '#3b82f6' },
            { label: 'ANSWERED',   value: answeredCount,      color: '#10b981' },
            { label: 'SNIPPETS',   value: snippet ? 1 : 0,   color: '#8b5cf6' },
            { label: 'SCHEMA READY', value: answeredCount > 0 ? 1 : 0, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, letterSpacing: '.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two Column Layout ── */}
      <div style={{ display: 'flex', gap: 16, padding: '20px 28px', alignItems: 'flex-start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ width: 340, flexShrink: 0 }}>

          {/* Business Details */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIcon}>⚙️</div>
              <div>
                <div style={cardTitle}>Business Details</div>
                <div style={cardSub}>{profileLoaded ? '✓ Loaded from profile' : 'Enter your details below'}</div>
              </div>
            </div>
            <div style={cardBody}>
              {bizName && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Business Name</label>
                  <div style={{ ...inputStyle, color: '#10b981', fontWeight: 600, cursor: 'default' }}>{bizName}</div>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Services (comma separated)</label>
                <input value={services} onChange={e => setServices(e.target.value)}
                  placeholder="e.g. HR consulting, payroll, recruiting" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Primary City</label>
                <input value={city} onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Emerald Isle, NC" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Question Types */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIcon}>❓</div>
              <div>
                <div style={cardTitle}>Question Types to Generate</div>
                <div style={cardSub}>Select the types of voice queries to target</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUESTION_TYPES.map(t => (
                <label key={t.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                  padding: '8px 10px', borderRadius: 8,
                  background: selectedTypes.includes(t.id) ? 'rgba(59,130,246,0.12)' : 'transparent',
                  border: `1.5px solid ${selectedTypes.includes(t.id) ? '#3b82f6' : 'transparent'}`,
                  transition: 'all .15s',
                }}>
                  <input type="checkbox" checked={selectedTypes.includes(t.id)}
                    onChange={() => toggleType(t.id)}
                    style={{ marginTop: 3, accentColor: '#3b82f6', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{t.icon} {t.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{t.example}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <button onClick={generating ? null : generateQuestions} disabled={generating}
                style={{ ...btnPrimary, opacity: generating ? .6 : 1 }}>
                {generating ? '⏳ Generating Questions...' : '✨ Generate Questions'}
              </button>
              {error && (
                <div style={{ marginTop: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444' }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIcon}>📖</div>
              <div>
                <div style={cardTitle}>How Voice SEO Works</div>
                <div style={cardSub}>What to do with the results</div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { step: '1', title: 'Generate Questions', desc: 'AI builds a list of real voice queries people ask about your business in your city.' },
                { step: '2', title: 'Write AI Answers', desc: '40–60 word answers optimised for voice — the exact length Google reads aloud.' },
                { step: '3', title: 'Copy FAQ Schema', desc: 'Paste the JSON-LD code into the <head> tag of every service page on your website.' },
                { step: '4', title: 'Validate Schema', desc: 'Run through Google\'s Rich Results Test to confirm Google can read your FAQ schema.' },
                { step: '5', title: 'Submit to Directories', desc: 'Claim Apple Maps (Siri) and Bing Places (Alexa/Cortana) for full voice coverage.' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ background: '#1a3a5c', color: '#3b82f6', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Empty state */}
          {!questions.length && !generating && (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Ready to generate voice questions</div>
              <div style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
                Fill in your business details, select question types, and click Generate Questions to get started.
              </div>
            </div>
          )}

          {/* Loading */}
          {generating && (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>Generating voice search questions...</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Claude is building your question list</div>
            </div>
          )}

          {/* Questions + Answers */}
          {questions.length > 0 && (
            <div style={card}>
              <div style={{ ...cardHeader, justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={cardIcon}>💬</div>
                  <div>
                    <div style={cardTitle}>Question & Answer Pairs</div>
                    <div style={cardSub}>{questions.length} questions — {answeredCount} answered</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Filter */}
                  <div style={{ display: 'flex', gap: 3, background: '#0a1628', borderRadius: 8, padding: 3 }}>
                    {['all', 'answered', 'unanswered'].map(f => (
                      <button key={f} onClick={() => setActiveFilter(f)} style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none',
                        background: activeFilter === f ? '#1a3a5c' : 'transparent',
                        color: activeFilter === f ? '#e2e8f0' : '#64748b',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                      }}>{f}</button>
                    ))}
                  </div>
                  <button onClick={writingAnswers ? null : writeAnswers} disabled={writingAnswers}
                    style={{ ...btnGreen, width: 'auto', padding: '7px 16px', opacity: writingAnswers ? .6 : 1 }}>
                    {writingAnswers ? '⏳ Writing...' : '✍️ Write All Answers'}
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {filteredQuestions.map((q, i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid #1a3a5c' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: answers[q] ? 10 : 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>
                        <span style={{ color: '#3b82f6', marginRight: 8, fontSize: 11 }}>Q{i + 1}</span>{q}
                      </div>
                      {answers[q] && (
                        <button onClick={() => copyText(answers[q], `ans-${i}`)} style={{ flexShrink: 0, padding: '3px 8px', background: '#0a1628', border: '1px solid #1a3a5c', borderRadius: 6, fontSize: 11, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {copied === `ans-${i}` ? '✓ Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                    {answers[q] ? (
                      <div style={{ fontSize: 13, color: '#94a3b8', background: '#0a1628', borderRadius: 8, padding: '10px 14px', lineHeight: 1.6, borderLeft: '3px solid #10b981' }}>
                        {answers[q]}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>No answer yet — click Write All Answers</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Schema */}
          {schema && (
            <div style={card}>
              <div style={{ ...cardHeader, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={cardIcon}>📋</div>
                  <div>
                    <div style={cardTitle}>FAQ Schema JSON-LD</div>
                    <div style={cardSub}>Paste into your website &lt;head&gt; tag — tells Google to use your answers for voice</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copyText(`<script type="application/ld+json">\n${schema}\n</script>`, 'schema')}
                    style={{ ...btnPrimary, width: 'auto', padding: '6px 14px', fontSize: 12 }}>
                    {copied === 'schema' ? '✓ Copied!' : '📋 Copy Schema'}
                  </button>
                  <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer"
                    style={{ padding: '6px 14px', background: '#0a1628', color: '#94a3b8', border: '1px solid #1a3a5c', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    🔍 Validate
                  </a>
                </div>
              </div>
              <pre style={{ margin: 0, padding: '16px 20px', fontSize: 11, color: '#94a3b8', overflowX: 'auto', maxHeight: 240, background: '#0a1628', lineHeight: 1.6 }}>
                {`<script type="application/ld+json">\n${schema}\n</script>`}
              </pre>
              <div style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.05)', borderTop: '1px solid #1a3a5c', fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                <strong style={{ color: '#3b82f6' }}>📌 Where to paste this:</strong> Open your website CMS (WordPress, Wix, Squarespace, etc.) → edit each service page → find the HTML/head section → paste before the closing &lt;/head&gt; tag. Do this on every service page, not just the homepage.
              </div>
            </div>
          )}

          {/* Deploy to Voice Assistants */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIcon}>🌐</div>
              <div>
                <div style={cardTitle}>Deploy to Voice Assistants</div>
                <div style={cardSub}>Voice assistants pull answers from your website — you cannot submit directly. Do these steps after adding your schema.</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                {
                  icon: '🔍', label: 'Google Assistant', coverage: '90% of voice searches',
                  status: '🔴 Needs schema', statusColor: '#ef4444',
                  steps: ['Copy FAQ Schema above', 'Paste into every service page <head>', 'Run Google Rich Results Test'],
                  links: [
                    { label: 'Rich Results Test', url: 'https://search.google.com/test/rich-results' },
                    { label: 'Search Console', url: 'https://search.google.com/search-console' },
                  ],
                  note: 'Schema in your site head is the ONLY way to get Google to read your FAQ answers aloud.',
                },
                {
                  icon: '🍎', label: 'Apple Siri', coverage: '5% of voice searches',
                  status: '🟡 Action needed', statusColor: '#f59e0b',
                  steps: ['Claim your Apple Maps listing', 'Claim or update your Yelp listing', 'Mark complete once done'],
                  links: [
                    { label: 'Apple Maps Connect', url: 'https://mapsconnect.apple.com' },
                    { label: 'Yelp for Business', url: 'https://biz.yelp.com' },
                  ],
                  note: 'Siri uses Apple Maps + Yelp for local business data. No API — manual claim required.',
                },
                {
                  icon: '📦', label: 'Amazon Alexa', coverage: '3% of voice searches',
                  status: '🟡 Action needed', statusColor: '#f59e0b',
                  steps: ['Submit to Bing Places', 'Sync via Yext if available', 'Add FAQ schema to website'],
                  links: [
                    { label: 'Bing Places', url: 'https://www.bingplaces.com' },
                  ],
                  note: 'Alexa uses Bing for local search. Submitting to Bing Places gives Alexa your business data.',
                },
                {
                  icon: '🌐', label: 'Bing / Cortana', coverage: '1% of voice searches',
                  status: '🟢 Schema covers this', statusColor: '#10b981',
                  steps: ['Add FAQ schema to website (same as Google)', 'Ping Bing via IndexNow after deploy', 'Submit to Bing Places'],
                  links: [
                    { label: 'Bing Webmaster', url: 'https://www.bing.com/webmasters' },
                    { label: 'Bing Places', url: 'https://www.bingplaces.com' },
                  ],
                  note: 'Bing reads the same FAQ schema as Google. One schema deployment covers both.',
                },
              ].map((p, i) => (
                <div key={p.label} style={{ padding: '16px 20px', borderRight: i % 2 === 0 ? '1px solid #1a3a5c' : 'none', borderBottom: i < 2 ? '1px solid #1a3a5c' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{p.coverage}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: p.statusColor, fontWeight: 600 }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid #1a3a5c', paddingLeft: 10 }}>
                    {p.note}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                    {p.steps.map((s, j) => (
                      <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>{j + 1}.</span> {s}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.links.map(l => (
                      <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
                        style={{ padding: '4px 10px', background: '#0a1628', border: '1px solid #1a3a5c', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8', textDecoration: 'none' }}>
                        {l.label} →
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Snippet Composer */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIcon}>⚡</div>
              <div>
                <div style={cardTitle}>Featured Snippet Composer</div>
                <div style={cardSub}>Write a 40–60 word answer that wins Position Zero — Google reads this aloud for voice queries</div>
              </div>
            </div>
            <div style={cardBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Target Question</label>
                  <input value={snippetQ} onChange={e => setSnippetQ(e.target.value)}
                    placeholder="How much does HR consulting cost?" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Target Keyword</label>
                  <input value={snippetKw} onChange={e => setSnippetKw(e.target.value)}
                    placeholder="HR consulting cost Emerald Isle" style={inputStyle} />
                </div>
              </div>
              <button onClick={writingSnippet ? null : writeSnippet}
                disabled={writingSnippet || !snippetQ.trim() || !snippetKw.trim()}
                style={{ ...btnPurple, opacity: (writingSnippet || !snippetQ.trim() || !snippetKw.trim()) ? .6 : 1 }}>
                {writingSnippet ? '⏳ Writing...' : '✨ Write Snippet'}
              </button>
              {snippet && (
                <div style={{ marginTop: 14, background: '#0a1628', border: '1px solid #1a3a5c', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      Your Snippet — {snippet.split(' ').length} words
                    </div>
                    <button onClick={() => copyText(snippet, 'snippet')}
                      style={{ padding: '4px 10px', background: '#0d1f38', border: '1px solid #1a3a5c', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#94a3b8', fontFamily: 'inherit' }}>
                      {copied === 'snippet' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, borderLeft: '3px solid #8b5cf6', paddingLeft: 14 }}>
                    {snippet}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    <strong style={{ color: '#8b5cf6' }}>📌 Where to use this:</strong> Add this as a paragraph on your service page, directly below the H1 heading. Also add it as an Answer in your FAQ schema above. The exact wording matters — Google reads snippets verbatim.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Checklist */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={cardIcon}>✅</div>
              <div>
                <div style={cardTitle}>Deployment Checklist</div>
                <div style={cardSub}>Complete these in order for full voice search coverage</div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { done: questions.length > 0, text: 'Generate voice search questions',           detail: 'Done above ↑' },
                { done: answeredCount > 0,     text: 'Write AI answers for all questions',        detail: 'Done above ↑' },
                { done: schema.length > 0,     text: 'FAQ schema generated',                     detail: 'Done above ↑' },
                { done: false,                 text: 'Copy schema and paste into website <head>', detail: 'Every service page — not just homepage' },
                { done: false,                 text: 'Validate schema in Google Rich Results',    detail: 'search.google.com/test/rich-results' },
                { done: false,                 text: 'Post top 5 Q&As to Google Business Profile', detail: 'Google reads GBP posts for voice answers' },
                { done: false,                 text: 'Claim Apple Maps listing',                  detail: 'mapsconnect.apple.com — covers Siri' },
                { done: false,                 text: 'Submit to Bing Places',                     detail: 'bingplaces.com — covers Alexa + Cortana' },
                { done: false,                 text: 'Claim/update Yelp listing',                 detail: 'Covers Siri, Bixby, and Alexa local results' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: item.done ? 'rgba(16,185,129,0.06)' : '#0a1628', borderRadius: 8, border: `1px solid ${item.done ? 'rgba(16,185,129,0.2)' : '#1a3a5c'}` }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.done ? '✅' : '⬜'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: item.done ? '#10b981' : '#e2e8f0', fontWeight: item.done ? 600 : 400, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.detail}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>Step {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
