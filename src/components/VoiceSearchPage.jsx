// src/components/VoiceSearchPage.jsx
// Voice Search & FAQ Optimization — clean redesign
// Matches Social Publisher / Local Links quality

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const QUESTION_TYPES = [
  { id: 'how',        label: 'How questions',      example: '"How much does HR consulting cost in Emerald Isle?"',       icon: '❓' },
  { id: 'what',       label: 'What questions',      example: '"What is the best HR service near me?"',                    icon: '💡' },
  { id: 'who',        label: 'Who questions',       example: '"Who are the top rated HR consultants near me?"',           icon: '👤' },
  { id: 'where',      label: 'Where questions',     example: '"Where can I find HR services in Emerald Isle?"',           icon: '📍' },
  { id: 'cost',       label: 'Cost & price',        example: '"How much does HR consulting cost per hour?"',              icon: '💰' },
  { id: 'nearme',     label: 'Near me queries',     example: '"Best HR consultant near me open now"',                     icon: '🗺️' },
  { id: 'best',       label: 'Best & top',          example: '"Best HR consulting service in Emerald Isle NC"',           icon: '⭐' },
  { id: 'comparison', label: 'Comparison',          example: '"In-house HR vs HR consulting — which is better?"',         icon: '⚖️' },
]

const PLATFORMS = [
  { id: 'google',  label: 'Google Assistant', icon: '🔍', coverage: '90%', action: 'Add FAQ schema to website <head> tag', status: 'schema' },
  { id: 'siri',    label: 'Apple Siri',       icon: '🍎', coverage: '5%',  action: 'Claim Apple Maps + Yelp listing',       status: 'action' },
  { id: 'alexa',   label: 'Amazon Alexa',     icon: '📦', coverage: '3%',  action: 'Submit to Bing Places + sync Yext',     status: 'covered' },
  { id: 'bing',    label: 'Bing / Cortana',   icon: '🌐', coverage: '1%',  action: 'Ping IndexNow after schema deploy',     status: 'ready' },
]

export default function VoiceSearchPage({ session, clientId }) {
  const [step, setStep]                 = useState(1)
  const [services, setServices]         = useState('')
  const [city, setCity]                 = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['how', 'what', 'cost', 'nearme'])
  const [questions, setQuestions]       = useState([])
  const [answers, setAnswers]           = useState({})
  const [generating, setGenerating]     = useState(false)
  const [writingAnswers, setWritingAnswers] = useState(false)
  const [snippetQ, setSnippetQ]         = useState('')
  const [snippetKw, setSnippetKw]       = useState('')
  const [snippet, setSnippet]           = useState('')
  const [writingSnippet, setWritingSnippet] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [schema, setSchema]             = useState('')
  const [copied, setCopied]             = useState('')
  const [error, setError]               = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Load business profile
  useEffect(() => {
    if (!clientId || !session) return
    supabase
      .from('client_data')
      .select('biz_cat, biz_city, biz_state')
      .eq('id', clientId)
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.biz_cat)  setServices(data.biz_cat)
          if (data.biz_city) setCity(data.biz_city + (data.biz_state ? ', ' + data.biz_state : ''))
          setProfileLoaded(true)
        }
      })
  }, [clientId, session])

  const toggleType = (id) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  })

  const generateQuestions = async () => {
    if (!services.trim() || !city.trim()) { setError('Please enter services and city first.'); return }
    if (!selectedTypes.length) { setError('Select at least one question type.'); return }
    setError('')
    setGenerating(true)
    setQuestions([])
    setAnswers({})
    setSchema('')

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-search-generate`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ services, city, types: selectedTypes, client_id: clientId }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setQuestions(data.questions || [])
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const writeAnswers = async () => {
    if (!questions.length) return
    setWritingAnswers(true)
    setError('')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-search-answers`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ questions, services, city, client_id: clientId }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Answer generation failed')
      setAnswers(data.answers || {})
      buildSchema(questions, data.answers || {})
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setWritingAnswers(false)
    }
  }

  const buildSchema = (qs, ans) => {
    const pairs = qs.filter(q => ans[q]).map(q => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: ans[q] }
    }))
    const json = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pairs
    }
    setSchema(JSON.stringify(json, null, 2))
  }

  const writeSnippet = async () => {
    if (!snippetQ.trim() || !snippetKw.trim()) return
    setWritingSnippet(true)
    setSnippet('')
    setError('')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-search-snippet`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ question: snippetQ, keyword: snippetKw, services, city, client_id: clientId }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Snippet generation failed')
      setSnippet(data.snippet || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setWritingSnippet(false)
    }
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const filteredQuestions = activeFilter === 'all'
    ? questions
    : questions.filter(q => {
        const lower = q.toLowerCase()
        if (activeFilter === 'answered') return !!answers[q]
        if (activeFilter === 'unanswered') return !answers[q]
        return lower.startsWith(activeFilter)
      })

  const answeredCount  = questions.filter(q => answers[q]).length
  const snippetCount   = snippet ? 1 : 0
  const schemaReady    = answeredCount > 0 ? 1 : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)', color: 'var(--text-1)', fontFamily: 'inherit' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎙️</span> Voice Search & FAQ
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
              Generate questions, write answers, build FAQ schema — get found by Google, Siri, Alexa & AI assistants
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Questions',   value: questions.length,  color: '#3b82f6' },
              { label: 'Answered',    value: answeredCount,      color: '#10b981' },
              { label: 'Snippets',    value: snippetCount,       color: '#8b5cf6' },
              { label: 'Schema',      value: schemaReady,        color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>

        {/* ── LEFT: Setup Panel ── */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step 1 — Business Details */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>1</span>
                Business Details
              </div>
              {profileLoaded && (
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>✓ Profile loaded</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>SERVICES (comma separated)</label>
                <input
                  value={services}
                  onChange={e => setServices(e.target.value)}
                  placeholder="e.g. HR consulting, payroll, recruiting"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>PRIMARY CITY</label>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Emerald Isle, NC"
                  style={{ width: '100%', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Step 2 — Question Types */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>2</span>
              Question Types
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUESTION_TYPES.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: selectedTypes.includes(t.id) ? 'rgba(59,130,246,0.1)' : 'transparent', border: `1.5px solid ${selectedTypes.includes(t.id) ? '#3b82f6' : 'transparent'}`, transition: 'all .15s' }}>
                  <input type="checkbox" checked={selectedTypes.includes(t.id)} onChange={() => toggleType(t.id)} style={{ marginTop: 2, accentColor: '#3b82f6', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{t.icon} {t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>{t.example}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generating ? null : generateQuestions}
            disabled={generating}
            style={{ width: '100%', padding: '13px', background: generating ? 'var(--bg-3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {generating ? '⏳ Generating Questions...' : '✨ Generate Questions'}
          </button>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>
              {error}
            </div>
          )}
        </div>

        {/* ── RIGHT: Main Content ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Empty state */}
          {!questions.length && !generating && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Ready to generate voice questions</div>
              <div style={{ fontSize: 14, color: 'var(--text-3)', maxWidth: 400, margin: '0 auto' }}>
                Fill in your business details, select question types, and click Generate to build your voice SEO content.
              </div>
            </div>
          )}

          {/* Loading state */}
          {generating && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>Generating voice search questions...</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>Claude is building your question list</div>
            </div>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {/* Toolbar */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {questions.length} Questions Generated
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Filter tabs */}
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg-1)', borderRadius: 8, padding: 3 }}>
                    {['all', 'answered', 'unanswered'].map(f => (
                      <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: activeFilter === f ? 'var(--bg-2)' : 'transparent', color: activeFilter === f ? 'var(--text-1)' : 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={writingAnswers ? null : writeAnswers}
                    disabled={writingAnswers}
                    style={{ padding: '7px 16px', background: writingAnswers ? 'var(--bg-3)' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: writingAnswers ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {writingAnswers ? '⏳ Writing...' : '✍️ Write All Answers'}
                  </button>
                </div>
              </div>

              {/* Question rows */}
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {filteredQuestions.map((q, i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>
                        <span style={{ color: '#3b82f6', marginRight: 8, fontSize: 12 }}>Q{i + 1}</span>{q}
                      </div>
                      {answers[q] && (
                        <button onClick={() => copyText(answers[q], `ans-${i}`)} style={{ flexShrink: 0, padding: '3px 8px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {copied === `ans-${i}` ? '✓ Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                    {answers[q] && (
                      <div style={{ fontSize: 13, color: 'var(--text-2)', background: 'var(--bg-1)', borderRadius: 8, padding: '10px 14px', lineHeight: 1.6, borderLeft: '3px solid #10b981' }}>
                        {answers[q]}
                      </div>
                    )}
                    {!answers[q] && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>No answer yet — click Write All Answers above</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Schema */}
          {schema && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>📋 FAQ Schema JSON-LD</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copyText(schema, 'schema')} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copied === 'schema' ? '✓ Copied!' : '📋 Copy Schema'}
                  </button>
                  <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer" style={{ padding: '6px 14px', background: 'var(--bg-1)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    🔍 Validate
                  </a>
                </div>
              </div>
              <pre style={{ margin: 0, padding: '16px 20px', fontSize: 12, color: 'var(--text-2)', overflowX: 'auto', maxHeight: 280, background: 'var(--bg-1)', lineHeight: 1.6 }}>
                {`<script type="application/ld+json">\n${schema}\n</script>`}
              </pre>
              <div style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.05)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
                💡 Paste this into the <code style={{ background: 'var(--bg-1)', padding: '1px 5px', borderRadius: 4 }}>&lt;head&gt;</code> tag of every service page — not just the homepage.
              </div>
            </div>
          )}

          {/* Platform Deployment */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 }}>
              🌐 Deploy to Voice Assistants
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}>
              {PLATFORMS.map((p, i) => (
                <div key={p.id} style={{ padding: '16px 20px', borderRight: i < PLATFORMS.length - 1 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.coverage} of voice searches</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>{p.action}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.id === 'google' && schema && (
                      <button onClick={() => copyText(schema, 'schema-google')} style={{ padding: '4px 10px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'inherit' }}>
                        {copied === 'schema-google' ? '✓ Copied' : '📋 Copy Schema'}
                      </button>
                    )}
                    {p.id === 'siri' && (
                      <>
                        <a href="https://mapsconnect.apple.com" target="_blank" rel="noreferrer" style={{ padding: '4px 10px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', textDecoration: 'none' }}>Apple Maps →</a>
                        <a href="https://biz.yelp.com" target="_blank" rel="noreferrer" style={{ padding: '4px 10px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', textDecoration: 'none' }}>Yelp →</a>
                      </>
                    )}
                    {p.id === 'alexa' && (
                      <a href="https://www.bingplaces.com" target="_blank" rel="noreferrer" style={{ padding: '4px 10px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', textDecoration: 'none' }}>Bing Places →</a>
                    )}
                    {p.id === 'bing' && (
                      <a href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer" style={{ padding: '4px 10px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', textDecoration: 'none' }}>Bing Webmaster →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Snippet Composer */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>⚡ Featured Snippet Composer</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Write a 40–60 word answer that wins Position Zero and gets read aloud by voice assistants</div>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TARGET QUESTION</label>
                  <input
                    value={snippetQ}
                    onChange={e => setSnippetQ(e.target.value)}
                    placeholder="How much does HR consulting cost?"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TARGET KEYWORD</label>
                  <input
                    value={snippetKw}
                    onChange={e => setSnippetKw(e.target.value)}
                    placeholder="HR consulting cost Emerald Isle"
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-1)', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>
              <button
                onClick={writingSnippet ? null : writeSnippet}
                disabled={writingSnippet || !snippetQ.trim() || !snippetKw.trim()}
                style={{ alignSelf: 'flex-start', padding: '9px 20px', background: writingSnippet ? 'var(--bg-3)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: writingSnippet ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {writingSnippet ? '⏳ Writing...' : '✨ Write Snippet'}
              </button>
              {snippet && (
                <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      Your Snippet — {snippet.split(' ').length} words
                    </div>
                    <button onClick={() => copyText(snippet, 'snippet')} style={{ padding: '4px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'inherit' }}>
                      {copied === 'snippet' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.7, borderLeft: '3px solid #8b5cf6', paddingLeft: 14 }}>
                    {snippet}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Checklist */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>✅ Deployment Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { done: schema.length > 0,    text: 'Generate + validate FAQ schema' },
                { done: false,                 text: 'Add schema to every service page <head> tag' },
                { done: false,                 text: 'Post FAQ content to GBP (top 5 Q&As)' },
                { done: false,                 text: 'Claim Apple Maps listing for Siri coverage' },
                { done: false,                 text: 'Submit to Bing Places + ping IndexNow' },
                { done: false,                 text: 'Claim/update Yelp listing (covers Siri, Bixby, Alexa)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: item.done ? 'rgba(16,185,129,0.08)' : 'var(--bg-1)', borderRadius: 8, border: `1px solid ${item.done ? 'rgba(16,185,129,0.2)' : 'var(--border)'}` }}>
                  <span style={{ fontSize: 16 }}>{item.done ? '✅' : '⬜'}</span>
                  <span style={{ fontSize: 13, color: item.done ? '#10b981' : 'var(--text-2)', fontWeight: item.done ? 600 : 400, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>Step {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
