import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg:'#060d1a', cardBg:'#0d1f3c', cardBg2:'#080f1e',
  border:'#0f2040', border2:'#1a3560',
  text:'#e2e8f0', textSub:'#c8d8f0', muted:'#4a6080',
  accent:'#3b82f6', accentHi:'#60a5fa',
  green:'#10b981', red:'#f87171', yellow:'#f59e0b',
  orange:'#f97316', purple:'#8b5cf6', cyan:'#22d3ee',
}

const s = {
  page:    { flex:1, overflowY:'auto', background:T.pageBg, padding:'24px', fontFamily:'system-ui,sans-serif' },
  hdr:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' },
  h1:      { fontSize:'22px', fontWeight:700, color:T.text, margin:0 },
  sub:     { fontSize:'13px', color:T.muted, marginTop:'4px' },
  card:    { background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px', marginBottom:'16px' },
  cardHd:  { display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', paddingBottom:'12px', borderBottom:`1px solid ${T.border}` },
  cardTtl: { fontSize:'15px', fontWeight:600, color:T.text },
  badge:   (c) => ({ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background: c==='active'?'rgba(16,185,129,0.15)': c==='idle'?'rgba(74,96,128,0.2)': c==='running'?'rgba(59,130,246,0.15)':'rgba(248,113,113,0.15)', color: c==='active'?T.green: c==='idle'?T.muted: c==='running'?T.accent:T.red }),
  btn:     (v='primary') => ({ display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, background: v==='primary'?T.accent: v==='ghost'?'transparent': v==='danger'?'rgba(248,113,113,0.15)':'rgba(59,130,246,0.1)', color: v==='primary'?'#fff': v==='ghost'?T.muted: v==='danger'?T.red:T.accentHi, transition:'all 0.15s' }),
  row:     { display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' },
  grid2:   { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'16px' },
  tag:     { display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', borderRadius:'4px', fontSize:'11px', background:'rgba(59,130,246,0.1)', color:T.accentHi, border:`1px solid rgba(59,130,246,0.2)` },
  input:   { width:'100%', background:'#091628', border:`1px solid ${T.border2}`, borderRadius:'8px', padding:'9px 12px', color:T.text, fontSize:'13px', outline:'none', boxSizing:'border-box' },
  textarea:{ width:'100%', background:'#091628', border:`1px solid ${T.border2}`, borderRadius:'8px', padding:'9px 12px', color:T.text, fontSize:'13px', outline:'none', resize:'vertical', minHeight:'80px', boxSizing:'border-box' },
  label:   { fontSize:'12px', color:T.muted, marginBottom:'6px', display:'block' },
  logLine: (t) => ({ padding:'4px 0', borderBottom:`1px solid ${T.border}`, fontSize:'12px', color: t==='error'?T.red: t==='success'?T.green: t==='warn'?T.yellow:T.textSub, fontFamily:'monospace' }),
}

// Agent definitions
const AGENT_DEFS = [
  {
    id: 'citation-auditor',
    name: 'Citation Auditor',
    icon: 'ti-map-pin-search',
    color: T.cyan,
    desc: 'Scans top directories for NAP inconsistencies and missing citations. Flags mismatches and queues fixes.',
    tags: ['NAP', 'Directories', 'Citations'],
    schedule: 'Weekly',
    model: 'claude-sonnet-4-5',
  },
  {
    id: 'review-responder',
    name: 'Review Responder',
    icon: 'ti-message-star',
    color: T.green,
    desc: 'Monitors Google and Yelp for new reviews and drafts personalized responses for owner approval.',
    tags: ['Reviews', 'Reputation', 'GBP'],
    schedule: 'Daily',
    model: 'claude-sonnet-4-5',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    icon: 'ti-pencil-star',
    color: T.purple,
    desc: 'Generates geo-targeted blog posts, service pages, and FAQ content optimized for local keywords.',
    tags: ['Content', 'Keywords', 'Pages'],
    schedule: 'Weekly',
    model: 'claude-sonnet-4-5',
  },
  {
    id: 'rank-monitor',
    name: 'Rank Monitor',
    icon: 'ti-chart-arrows-vertical',
    color: T.accent,
    desc: 'Tracks keyword rankings daily and alerts when positions change significantly (+/- 3 positions).',
    tags: ['Rankings', 'Keywords', 'Alerts'],
    schedule: 'Daily',
    model: 'claude-sonnet-4-5',
  },
  {
    id: 'schema-builder',
    name: 'Schema Builder',
    icon: 'ti-code-dots',
    color: T.orange,
    desc: 'Audits and generates LocalBusiness, FAQ, and Review schema markup for all pages.',
    tags: ['Schema', 'Structured Data', 'Technical'],
    schedule: 'Monthly',
    model: 'claude-sonnet-4-5',
  },
  {
    id: 'gbp-optimizer',
    name: 'GBP Optimizer',
    icon: 'ti-brand-google',
    color: T.yellow,
    desc: 'Analyzes Google Business Profile completeness and posts weekly updates, offers, and photos.',
    tags: ['GBP', 'Google', 'Posts'],
    schedule: 'Weekly',
    model: 'claude-sonnet-4-5',
  },
]

function AgentCard({ agent, agentState, onToggle, onRun, onViewLog }) {
  const state = agentState[agent.id] || { enabled: false, status: 'idle', lastRun: null, runs: 0 }
  const isRunning = state.status === 'running'

  return (
    <div style={{ ...s.card, borderLeft:`3px solid ${state.enabled ? agent.color : T.border}`, transition:'border 0.2s' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`${agent.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className={`ti ${agent.icon}`} style={{ fontSize:'20px', color:agent.color }} />
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:T.text }}>{agent.name}</div>
            <div style={{ fontSize:'11px', color:T.muted, marginTop:'2px' }}>
              <i className="ti ti-clock" style={{ fontSize:'11px' }} /> {agent.schedule}
            </div>
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={() => onToggle(agent.id)}
          style={{ background:'none', border:'none', cursor:'pointer', padding:'4px' }}
          title={state.enabled ? 'Disable agent' : 'Enable agent'}
        >
          <div style={{ width:'40px', height:'22px', borderRadius:'11px', background: state.enabled ? T.green : T.border2, transition:'background 0.2s', position:'relative' }}>
            <div style={{ position:'absolute', top:'3px', left: state.enabled ? '21px' : '3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
          </div>
        </button>
      </div>

      <p style={{ fontSize:'12px', color:T.textSub, margin:'0 0 12px', lineHeight:1.6 }}>{agent.desc}</p>

      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
        {agent.tags.map(t => <span key={t} style={s.tag}>{t}</span>)}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:'8px' }}>
          <span style={s.badge(state.enabled ? (isRunning ? 'running' : 'active') : 'idle')}>
            <i className={`ti ${isRunning ? 'ti-loader-2' : state.enabled ? 'ti-check' : 'ti-minus'}`} style={{ fontSize:'10px' }} />
            {isRunning ? 'Running' : state.enabled ? 'Active' : 'Idle'}
          </span>
          {state.lastRun && (
            <span style={{ fontSize:'11px', color:T.muted }}>Last: {state.lastRun}</span>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={s.btn('outline')} onClick={() => onViewLog(agent.id)}>
            <i className="ti ti-list" style={{ fontSize:'13px' }} /> Log
          </button>
          <button
            style={{ ...s.btn('primary'), opacity: (!state.enabled || isRunning) ? 0.5 : 1 }}
            onClick={() => onRun(agent.id)}
            disabled={!state.enabled || isRunning}
          >
            <i className={`ti ${isRunning ? 'ti-loader-2' : 'ti-player-play'}`} style={{ fontSize:'13px' }} />
            {isRunning ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LogModal({ agent, logs, onClose }) {
  if (!agent) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ ...s.card, width:'560px', maxHeight:'70vh', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
        <div style={s.cardHd}>
          <i className="ti ti-list" style={{ color:T.accent }} />
          <span style={s.cardTtl}>{agent.name} — Run Log</span>
          <button style={{ ...s.btn('ghost'), marginLeft:'auto' }} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          {logs.length === 0 ? (
            <div style={{ textAlign:'center', color:T.muted, padding:'32px', fontSize:'13px' }}>No runs yet for this agent.</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} style={s.logLine(l.type)}>
                <span style={{ color:T.muted }}>[{l.time}]</span> {l.msg}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgentsPage({ clientId, userId }) {
  const [agentState, setAgentState] = useState({})
  const [logs, setLogs] = useState({}) // { agentId: [{time, msg, type}] }
  const [logModal, setLogModal] = useState(null) // agent def
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const chatEndRef = useRef(null)

  // Load agent states from Supabase
  useEffect(() => {
    if (!clientId || !userId) return
    const load = async () => {
      const { data } = await supabase
        .from('agent_states')
        .select('*')
        .eq('user_id', userId)
        .eq('client_id', clientId)
      if (data) {
        const map = {}
        data.forEach(r => { map[r.agent_id] = { enabled: r.enabled, status: r.status || 'idle', lastRun: r.last_run, runs: r.runs || 0 } })
        setAgentState(map)
      }
    }
    load()
  }, [clientId, userId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [chatHistory])

  const addLog = (agentId, msg, type='info') => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => ({ ...prev, [agentId]: [...(prev[agentId]||[]), { time, msg, type }] }))
  }

  const saveAgentState = async (agentId, patch) => {
    setSaving(true)
    const current = agentState[agentId] || { enabled:false, status:'idle', lastRun:null, runs:0 }
    const next = { ...current, ...patch }
    setAgentState(prev => ({ ...prev, [agentId]: next }))
    await supabase.from('agent_states').upsert({
      user_id: userId, client_id: clientId, agent_id: agentId,
      enabled: next.enabled, status: next.status, last_run: next.lastRun, runs: next.runs
    }, { onConflict: 'user_id,client_id,agent_id' })
    setSaving(false)
  }

  const handleToggle = async (agentId) => {
    const current = agentState[agentId] || { enabled:false }
    const enabled = !current.enabled
    await saveAgentState(agentId, { enabled })
    addLog(agentId, enabled ? 'Agent enabled' : 'Agent disabled', enabled ? 'success' : 'warn')
  }

  const handleRun = async (agentId) => {
    const agent = AGENT_DEFS.find(a => a.id === agentId)
    if (!agent) return
    await saveAgentState(agentId, { status:'running' })
    addLog(agentId, `Starting ${agent.name}...`, 'info')

    try {
      // Get API key from Supabase settings
      const { data: settings } = await supabase
        .from('settings')
        .select('anthropic_key')
        .eq('user_id', userId)
        .single()

      if (!settings?.anthropic_key) {
        addLog(agentId, 'No Anthropic API key found. Set it in API Keys tab.', 'error')
        await saveAgentState(agentId, { status:'idle' })
        return
      }

      // Get business context
      const { data: biz } = await supabase
        .from('client_data')
        .select('biz_name,biz_cat,biz_city,biz_state,biz_kw')
        .eq('id', clientId)
        .single()

      const bizContext = biz
        ? `Business: ${biz.biz_name}, Category: ${biz.biz_cat}, Location: ${biz.biz_city} ${biz.biz_state}, Keywords: ${biz.biz_kw}`
        : 'No business profile found.'

      const prompt = `You are the ${agent.name} agent for a local SEO platform.
${bizContext}
${globalPrompt ? `Additional instructions: ${globalPrompt}` : ''}
Run your analysis and provide a concise action report with specific findings and recommended next steps. Be specific with data. Limit to 200 words.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropic_key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: agent.model, max_tokens: 500, messages: [{ role:'user', content: prompt }] })
      })

      const data = await res.json()
      if (data.content?.[0]?.text) {
        const result = data.content[0].text
        addLog(agentId, `Completed: ${result.substring(0, 120)}...`, 'success')
        const state = agentState[agentId] || {}
        await saveAgentState(agentId, {
          status: 'idle',
          lastRun: new Date().toLocaleDateString(),
          runs: (state.runs || 0) + 1
        })
      } else {
        addLog(agentId, `API error: ${data.error?.message || 'Unknown error'}`, 'error')
        await saveAgentState(agentId, { status:'idle' })
      }
    } catch (err) {
      addLog(agentId, `Run failed: ${err.message}`, 'error')
      await saveAgentState(agentId, { status:'idle' })
    }
  }

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatHistory(prev => [...prev, { role:'user', content: userMsg }])
    setChatLoading(true)

    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('anthropic_key')
        .eq('user_id', userId)
        .single()

      if (!settings?.anthropic_key) {
        setChatHistory(prev => [...prev, { role:'assistant', content:'No Anthropic API key found. Set it in the API Keys tab.' }])
        setChatLoading(false)
        return
      }

      const { data: biz } = await supabase
        .from('client_data')
        .select('biz_name,biz_cat,biz_city,biz_state,biz_kw,biz_website')
        .eq('id', clientId)
        .single()

      const systemPrompt = `You are an expert local SEO AI assistant for RankForged AI.
${biz ? `Client: ${biz.biz_name} (${biz.biz_cat}) in ${biz.biz_city}, ${biz.biz_state}. Website: ${biz.biz_website}. Keywords: ${biz.biz_kw}` : ''}
Provide concise, actionable local SEO advice. Be specific. Use bullet points when listing steps.`

      const messages = [
        ...chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role:'user', content: userMsg }
      ]

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropic_key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:1000, system: systemPrompt, messages })
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text || data.error?.message || 'No response.'
      setChatHistory(prev => [...prev, { role:'assistant', content: reply }])
    } catch (err) {
      setChatHistory(prev => [...prev, { role:'assistant', content:`Error: ${err.message}` }])
    }
    setChatLoading(false)
  }

  const enabledCount = AGENT_DEFS.filter(a => agentState[a.id]?.enabled).length
  const runningCount = AGENT_DEFS.filter(a => agentState[a.id]?.status === 'running').length

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.hdr}>
        <div>
          <h1 style={s.h1}><i className="ti ti-robot" style={{ marginRight:'8px', color:T.accent }} />AI Agents</h1>
          <div style={s.sub}>Autonomous SEO agents that monitor, analyze, and act on your behalf</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {saving && <span style={{ fontSize:'12px', color:T.muted }}><i className="ti ti-loader-2" /> Saving...</span>}
          <span style={s.badge(runningCount > 0 ? 'running' : enabledCount > 0 ? 'active' : 'idle')}>
            <i className="ti ti-robot" style={{ fontSize:'10px' }} />
            {enabledCount} active / {AGENT_DEFS.length} total
          </span>
        </div>
      </div>

      {/* Global Prompt Override */}
      <div style={s.card}>
        <div style={s.cardHd}>
          <i className="ti ti-adjustments-horizontal" style={{ color:T.purple }} />
          <span style={s.cardTtl}>Global Agent Instructions</span>
          <span style={{ fontSize:'12px', color:T.muted, marginLeft:'auto' }}>Optional — applied to all agent runs</span>
        </div>
        <textarea
          style={s.textarea}
          placeholder="e.g. Focus on Spanish-speaking customers. Prioritize mobile search. Avoid mentioning competitors by name."
          value={globalPrompt}
          onChange={e => setGlobalPrompt(e.target.value)}
        />
      </div>

      {/* Agent Grid */}
      <div style={s.cardHd}>
        <i className="ti ti-cpu" style={{ color:T.accent }} />
        <span style={s.cardTtl}>Available Agents</span>
      </div>
      <div style={s.grid2}>
        {AGENT_DEFS.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            agentState={agentState}
            onToggle={handleToggle}
            onRun={handleRun}
            onViewLog={(id) => setLogModal(AGENT_DEFS.find(a => a.id === id))}
          />
        ))}
      </div>

      {/* AI Chat Assistant */}
      <div style={{ ...s.card, marginTop:'24px' }}>
        <div style={s.cardHd}>
          <i className="ti ti-messages" style={{ color:T.cyan }} />
          <span style={s.cardTtl}>SEO AI Assistant</span>
          <span style={{ fontSize:'12px', color:T.muted, marginLeft:'auto' }}>Ask anything about your local SEO strategy</span>
        </div>

        {/* Chat messages */}
        <div style={{ background:T.cardBg2, borderRadius:'8px', padding:'16px', minHeight:'200px', maxHeight:'320px', overflowY:'auto', marginBottom:'12px', border:`1px solid ${T.border}` }}>
          {chatHistory.length === 0 && (
            <div style={{ textAlign:'center', color:T.muted, fontSize:'13px', paddingTop:'48px' }}>
              <i className="ti ti-message-question" style={{ fontSize:'28px', display:'block', marginBottom:'8px' }} />
              Ask about citations, rankings, content strategy, GBP optimization, and more.
            </div>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} style={{ marginBottom:'14px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: m.role==='user'?T.accent:`${T.purple}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`ti ${m.role==='user'?'ti-user':'ti-robot'}`} style={{ fontSize:'13px', color: m.role==='user'?'#fff':T.purple }} />
              </div>
              <div style={{ fontSize:'13px', color: m.role==='user'?T.textSub:T.text, lineHeight:1.6, flex:1, whiteSpace:'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`${T.purple}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="ti ti-robot" style={{ fontSize:'13px', color:T.purple }} />
              </div>
              <span style={{ fontSize:'13px', color:T.muted }}>
                <i className="ti ti-loader-2" /> Thinking...
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ display:'flex', gap:'10px' }}>
          <input
            style={s.input}
            placeholder="Ask your SEO AI assistant..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
          />
          <button style={{ ...s.btn('primary'), whiteSpace:'nowrap' }} onClick={handleChat} disabled={chatLoading}>
            <i className="ti ti-send" style={{ fontSize:'14px' }} />
            Send
          </button>
        </div>
      </div>

      {/* Log Modal */}
      <LogModal
        agent={logModal}
        logs={logModal ? (logs[logModal.id] || []) : []}
        onClose={() => setLogModal(null)}
      />
    </div>
  )
}
