import { useState, useEffect, useRef, useCallback } from 'react'
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
  page:     { flex:1, overflowY:'auto', background:T.pageBg, padding:'24px', fontFamily:'system-ui,sans-serif' },
  hdr:      { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' },
  h1:       { fontSize:'22px', fontWeight:700, color:T.text, margin:0 },
  sub:      { fontSize:'13px', color:T.muted, marginTop:'4px' },
  card:     { background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px', marginBottom:'16px' },
  cardHd:   { display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', paddingBottom:'12px', borderBottom:`1px solid ${T.border}` },
  cardTtl:  { fontSize:'15px', fontWeight:600, color:T.text },
  secHd:    { fontSize:'12px', fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.08em', margin:'24px 0 12px', display:'flex', alignItems:'center', gap:'8px' },
  badge:    (c) => ({ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600, background: c==='active'?'rgba(16,185,129,0.15)': c==='idle'?'rgba(74,96,128,0.2)': c==='running'?'rgba(59,130,246,0.15)':'rgba(248,113,113,0.15)', color: c==='active'?T.green: c==='idle'?T.muted: c==='running'?T.accent:T.red }),
  btn:      (v='primary') => ({ display:'inline-flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, background: v==='primary'?T.accent: v==='ghost'?'transparent': v==='danger'?'rgba(248,113,113,0.15)': v==='outline'?'rgba(59,130,246,0.1)':'rgba(59,130,246,0.1)', color: v==='primary'?'#fff': v==='ghost'?T.muted: v==='danger'?T.red:T.accentHi, transition:'all 0.15s' }),
  grid2:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'16px' },
  tag:      { display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', borderRadius:'4px', fontSize:'11px', background:'rgba(59,130,246,0.1)', color:T.accentHi, border:`1px solid rgba(59,130,246,0.2)` },
  input:    { width:'100%', background:'#091628', border:`1px solid ${T.border2}`, borderRadius:'8px', padding:'9px 12px', color:T.text, fontSize:'13px', outline:'none', boxSizing:'border-box' },
  textarea: { width:'100%', background:'#091628', border:`1px solid ${T.border2}`, borderRadius:'8px', padding:'9px 12px', color:T.text, fontSize:'13px', outline:'none', resize:'vertical', minHeight:'80px', boxSizing:'border-box' },
}

const AGENT_SECTIONS = [
  {
    label: 'Local Intelligence', icon: 'ti-map-2', color: T.cyan,
    agents: [
      { id:'citation-auditor',   name:'Citation Auditor',   icon:'ti-map-pin-search',        color:T.cyan,   desc:'Scans top directories for NAP inconsistencies and missing citations. Flags mismatches and queues fixes.',                                                        tags:['NAP','Directories','Citations'],        schedule:'Weekly'    },
      { id:'competitor-spy',     name:'Competitor Spy',     icon:'ti-spy',                   color:T.cyan,   desc:'Monitors competitor GBP profiles, tracks their new reviews, posts, keyword changes, and category shifts weekly.',                                              tags:['Competitors','GBP','Intelligence'],     schedule:'Weekly'    },
      { id:'local-pack-tracker', name:'Local Pack Tracker', icon:'ti-map-pin-star',          color:T.cyan,   desc:'Checks daily whether the business appears in the Google 3-pack for its top keywords. Alerts on drops.',                                                        tags:['3-Pack','Rankings','Maps'],            schedule:'Daily'     },
      { id:'gbp-health-monitor', name:'GBP Health Monitor', icon:'ti-brand-google',          color:T.cyan,   desc:'Detects suggested edits, Q&A spam, fake reviews, and unauthorized changes to the Google Business Profile.',                                                   tags:['GBP','Spam','Alerts'],                 schedule:'Daily'     },
    ],
  },
  {
    label: 'Content & Outreach', icon: 'ti-pencil-star', color: T.purple,
    agents: [
      { id:'content-writer',       name:'Content Writer',       icon:'ti-pencil-star',       color:T.purple, desc:'Generates geo-targeted blog posts, service pages, and FAQ content optimized for local keywords.',                                                              tags:['Content','Keywords','Pages'],          schedule:'Weekly'    },
      { id:'blog-publisher',       name:'Blog Publisher',       icon:'ti-news',              color:T.purple, desc:'Writes and schedules geo-targeted blog posts based on trending local search queries and seasonal topics.',                                                      tags:['Blog','Publishing','Local'],           schedule:'Weekly'    },
      { id:'faq-generator',        name:'FAQ Generator',        icon:'ti-help-circle',       color:T.purple, desc:'Mines People Also Ask results and generates FAQ schema markup for every service page automatically.',                                                          tags:['FAQ','Schema','PAA'],                  schedule:'Weekly'    },
      { id:'press-release-writer', name:'Press Release Writer', icon:'ti-speakerphone',      color:T.purple, desc:'Drafts local press releases for new services, events, milestones, and awards ready for distribution.',                                                        tags:['PR','Content','Links'],                schedule:'Monthly'   },
    ],
  },
  {
    label: 'Technical SEO', icon: 'ti-code-dots', color: T.orange,
    agents: [
      { id:'schema-builder',             name:'Schema Builder',             icon:'ti-code-dots',  color:T.orange, desc:'Audits and generates LocalBusiness, FAQ, and Review schema markup for all pages.',                                                                     tags:['Schema','Structured Data','Technical'],schedule:'Monthly'   },
      { id:'broken-link-hunter',         name:'Broken Link Hunter',         icon:'ti-link-off',   color:T.orange, desc:'Crawls the site weekly for 404 errors, broken internal links, and redirect chains that hurt crawlability.',                                             tags:['Technical','Links','Crawl'],           schedule:'Weekly'    },
      { id:'page-speed-monitor',         name:'Page Speed Monitor',         icon:'ti-gauge',      color:T.orange, desc:'Tracks Core Web Vitals scores across key pages and flags LCP, CLS, or INP regressions immediately.',                                                   tags:['Core Web Vitals','Speed','UX'],        schedule:'Weekly'    },
      { id:'duplicate-content-detector', name:'Duplicate Content Detector', icon:'ti-copy-off',   color:T.orange, desc:'Scans for duplicate titles, meta descriptions, thin content pages, and canonicalization issues site-wide.',                                             tags:['Technical','Duplicates','Meta'],       schedule:'Monthly'   },
    ],
  },
  {
    label: 'Reputation & Social', icon: 'ti-message-star', color: T.green,
    agents: [
      { id:'review-responder',       name:'Review Responder',       icon:'ti-message-star',  color:T.green,  desc:'Monitors Google and Yelp for new reviews and drafts personalized responses for owner approval.',                                                              tags:['Reviews','Reputation','GBP'],          schedule:'Daily'     },
      { id:'review-request-sender',  name:'Review Request Sender',  icon:'ti-send',          color:T.green,  desc:'Sends SMS and email review requests to recent customers to grow 5-star reviews on autopilot.',                                                               tags:['Reviews','SMS','Email'],               schedule:'Daily'     },
      { id:'social-listener',        name:'Social Listener',        icon:'ti-ear',           color:T.green,  desc:'Monitors mentions of the business name across social platforms and flags unaddressed comments.',                                                              tags:['Social','Mentions','Brand'],           schedule:'Daily'     },
      { id:'negative-review-alerter',name:'Negative Review Alerter',icon:'ti-alert-triangle',color:T.green,  desc:'Fires immediately when a 1 or 2-star review appears on Google, Yelp, or Facebook. Drafts a response.',                                                     tags:['Alerts','Reviews','Reputation'],       schedule:'Real-time' },
    ],
  },
  {
    label: 'Rankings & Intelligence', icon: 'ti-chart-arrows-vertical', color: T.accent,
    agents: [
      { id:'rank-monitor',  name:'Rank Monitor',  icon:'ti-chart-arrows-vertical', color:T.accent, desc:'Tracks keyword rankings daily and alerts when positions change significantly.',                                                                                         tags:['Rankings','Keywords','Alerts'],        schedule:'Daily'     },
      { id:'gbp-optimizer', name:'GBP Optimizer', icon:'ti-star',                  color:T.accent, desc:'Analyzes Google Business Profile completeness and posts weekly updates, offers, and photos.',                                                                          tags:['GBP','Google','Posts'],                schedule:'Weekly'    },
    ],
  },
  {
    label: 'Reporting', icon: 'ti-file-analytics', color: T.yellow,
    agents: [
      { id:'monthly-report-writer',   name:'Monthly Report Writer',   icon:'ti-file-analytics', color:T.yellow, desc:'Generates a branded PDF report summarizing all SEO activity, ranking changes, and wins for the month.',                                                  tags:['Reports','PDF','Client'],              schedule:'Monthly'   },
      { id:'lead-attribution-tracker',name:'Lead Attribution Tracker',icon:'ti-track',           color:T.yellow, desc:'Ties phone calls and form submissions back to specific keywords and traffic sources to prove ROI.',                                                      tags:['Attribution','ROI','Leads'],           schedule:'Weekly'    },
    ],
  },
]

const ALL_AGENTS = AGENT_SECTIONS.flatMap(s => s.agents)

const AGENT_PROMPTS = {
  'citation-auditor':          'You are the Citation Auditor. Analyze NAP consistency for this local business. List the top 10 directories they should be on, identify likely inconsistency patterns, and provide 3 specific action steps to fix citations. Be specific.',
  'competitor-spy':            'You are the Competitor Spy. Research what competing local businesses in the same category and city are likely doing for SEO. Identify 3 competitor tactics to watch, 2 keyword gaps they may be exploiting, and recommend how to outmaneuver them.',
  'local-pack-tracker':        'You are the Local Pack Tracker. Analyze the likelihood this business appears in the Google 3-pack for their primary keywords. List the top 5 keywords they should rank for, estimate current visibility, and give 3 specific actions to improve 3-pack presence.',
  'gbp-health-monitor':        'You are the GBP Health Monitor. Audit the Google Business Profile health for this business. List 5 common GBP vulnerabilities (spam edits, Q&A abuse, fake reviews), explain how each affects rankings, and provide specific monitoring recommendations.',
  'content-writer':            'You are the Content Writer. Generate a content brief for this local business. Suggest 3 blog post titles with target keywords, 2 service page ideas, and 1 FAQ cluster. Include geo-modifiers and search intent for each.',
  'blog-publisher':            'You are the Blog Publisher. Create a complete 300-word geo-targeted blog post for this business. Include the primary keyword in the title, first paragraph, and one subheading. End with a local call to action.',
  'faq-generator':             'You are the FAQ Generator. Generate 5 high-value FAQ questions and answers for this business based on People Also Ask patterns. Format each as schema-ready Q&A pairs. Focus on local intent and service-specific queries.',
  'press-release-writer':      'You are the Press Release Writer. Draft a 200-word local press release for this business announcing an achievement, new service, or community involvement. Use AP style. Include a quote from the owner and a local angle.',
  'schema-builder':            'You are the Schema Builder. Generate a LocalBusiness JSON-LD schema snippet for this business with all required fields filled in. Also provide a FAQ schema with 3 entries and explain where to place each on the site.',
  'broken-link-hunter':        'You are the Broken Link Hunter. Explain the most common broken link patterns for this type of business website. List 5 pages most likely to have broken links, how to find them, and the SEO impact of each. Give a crawl action plan.',
  'page-speed-monitor':        'You are the Page Speed Monitor. Analyze Core Web Vitals requirements for a local business site. List the top 5 speed issues that commonly hurt local rankings, their LCP/CLS/INP impact, and specific fixes for each.',
  'duplicate-content-detector':'You are the Duplicate Content Detector. Identify the most common duplicate content issues for this type of business site. List 5 duplicate content patterns, how to find them using free tools, and canonical/noindex fixes for each.',
  'review-responder':          'You are the Review Responder. Write 3 template review responses for this business: one for a 5-star review, one for a 3-star with a complaint, and one for a 1-star angry review. Each should be personalized, professional, and SEO-aware.',
  'review-request-sender':     'You are the Review Request Sender. Write 2 SMS templates and 1 email template for requesting Google reviews from satisfied customers. Keep SMS under 160 characters. Include the business name and a friendly call to action.',
  'social-listener':           'You are the Social Listener. Create a social monitoring strategy for this business. List 5 search strings to monitor across platforms, 3 types of mentions that need immediate response, and a weekly listening routine.',
  'negative-review-alerter':   'You are the Negative Review Alerter. Write an immediate response protocol for a 1-star review. Include: a draft response template, 3 steps to investigate the complaint, how to request removal if fake, and a follow-up escalation plan.',
  'rank-monitor':              'You are the Rank Monitor. Analyze the keyword ranking strategy for this business. Identify the top 10 keywords they should track, group them by intent (local, service, informational), and explain what rank changes to alert on and why.',
  'gbp-optimizer':             'You are the GBP Optimizer. Audit the Google Business Profile optimization for this business. List 5 underused GBP features, write 1 sample GBP post, suggest 3 photo categories, and give a weekly GBP maintenance checklist.',
  'monthly-report-writer':     'You are the Monthly Report Writer. Create a monthly SEO report outline for this business. Include sections for: ranking changes, citation health, review summary, content published, technical issues fixed, and next month priorities. Write a sample executive summary paragraph.',
  'lead-attribution-tracker':  'You are the Lead Attribution Tracker. Create a lead attribution framework for this local business. List 5 key conversion touchpoints to track, how to set up call tracking, form attribution, and how to tie keywords to revenue in a simple monthly report.',
}

// ── Results Panel (slides in from right) ─────────────────────────────────────
function ResultsPanel({ result, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null

  const agent = ALL_AGENTS.find(a => a.id === result.agent_id)
  const handleCopy = () => {
    navigator.clipboard.writeText(result.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:900, display:'flex' }} onClick={onClose}>
      {/* Backdrop */}
      <div style={{ flex:1, background:'rgba(0,0,0,0.5)' }} />
      {/* Panel */}
      <div
        style={{ width:'480px', background:'#0a1628', borderLeft:`1px solid ${T.border2}`, display:'flex', flexDirection:'column', height:'100vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel header */}
        <div style={{ padding:'20px 20px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'flex-start', gap:'12px', background:'#0d1f3c' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:`${agent?.color||T.accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className={`ti ${agent?.icon||'ti-robot'}`} style={{ fontSize:'20px', color:agent?.color||T.accent }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:T.text }}>{agent?.name||result.agent_id}</div>
            <div style={{ fontSize:'12px', color:T.muted, marginTop:'2px' }}>
              <i className="ti ti-clock" style={{ fontSize:'11px' }} /> {new Date(result.created_at).toLocaleString()}
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleCopy} style={{ ...s.btn('outline'), padding:'6px 12px' }}>
              <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize:'13px' }} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={onClose} style={{ ...s.btn('ghost'), padding:'6px 10px' }}>
              <i className="ti ti-x" style={{ fontSize:'14px' }} />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding:'12px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {agent?.tags?.map(t => <span key={t} style={s.tag}>{t}</span>)}
        </div>

        {/* Output */}
        <div style={{ padding:'20px', flex:1 }}>
          <div style={{ fontSize:'13px', color:T.text, lineHeight:1.8, whiteSpace:'pre-wrap' }}>
            {result.output}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${T.border}`, background:'#0d1f3c', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={s.btn('ghost')}>
            <i className="ti ti-x" style={{ fontSize:'13px' }} /> Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ results, onView, onDelete, loading }) {
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterSection, setFilterSection] = useState('all')

  const filtered = results.filter(r => {
    if (filterAgent !== 'all' && r.agent_id !== filterAgent) return false
    if (filterSection !== 'all') {
      const sec = AGENT_SECTIONS.find(s => s.agents.some(a => a.id === r.agent_id))
      if (!sec || sec.label !== filterSection) return false
    }
    return true
  })

  if (loading) return (
    <div style={{ textAlign:'center', padding:'60px', color:T.muted }}>
      <i className="ti ti-loader-2" style={{ fontSize:'28px', display:'block', marginBottom:'8px' }} />
      Loading history...
    </div>
  )

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:'12px', color:T.muted }}>Filter:</span>
        <select
          value={filterSection}
          onChange={e => { setFilterSection(e.target.value); setFilterAgent('all') }}
          style={{ background:'#091628', border:`1px solid ${T.border2}`, borderRadius:'8px', padding:'6px 10px', color:T.text, fontSize:'12px', outline:'none' }}
        >
          <option value="all">All Sections</option>
          {AGENT_SECTIONS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
        </select>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          style={{ background:'#091628', border:`1px solid ${T.border2}`, borderRadius:'8px', padding:'6px 10px', color:T.text, fontSize:'12px', outline:'none' }}
        >
          <option value="all">All Agents</option>
          {(filterSection === 'all' ? ALL_AGENTS : AGENT_SECTIONS.find(s => s.label === filterSection)?.agents || [])
            .map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span style={{ fontSize:'12px', color:T.muted, marginLeft:'auto' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px', color:T.muted }}>
          <i className="ti ti-history" style={{ fontSize:'36px', display:'block', marginBottom:'12px' }} />
          <div style={{ fontSize:'15px', fontWeight:600, color:T.textSub, marginBottom:'6px' }}>No results yet</div>
          <div style={{ fontSize:'13px' }}>Enable agents and hit Run Now to start building history.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {filtered.map(r => {
            const agent = ALL_AGENTS.find(a => a.id === r.agent_id)
            const preview = r.output?.substring(0, 180) + (r.output?.length > 180 ? '...' : '')
            return (
              <div key={r.id} style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'16px', borderLeft:`3px solid ${agent?.color||T.accent}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${agent?.color||T.accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={`ti ${agent?.icon||'ti-robot'}`} style={{ fontSize:'16px', color:agent?.color||T.accent }} />
                    </div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:T.text }}>{agent?.name||r.agent_id}</div>
                      <div style={{ fontSize:'11px', color:T.muted }}>{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => onView(r)} style={{ ...s.btn('outline'), padding:'5px 12px', fontSize:'12px' }}>
                      <i className="ti ti-eye" style={{ fontSize:'12px' }} /> View
                    </button>
                    <button onClick={() => onDelete(r.id)} style={{ ...s.btn('danger'), padding:'5px 10px', fontSize:'12px' }}>
                      <i className="ti ti-trash" style={{ fontSize:'12px' }} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize:'12px', color:T.textSub, lineHeight:1.6, background:T.cardBg2, borderRadius:'6px', padding:'10px 12px', cursor:'pointer' }} onClick={() => onView(r)}>
                  {preview}
                </div>
                <div style={{ display:'flex', gap:'6px', marginTop:'8px', flexWrap:'wrap' }}>
                  {agent?.tags?.map(t => <span key={t} style={s.tag}>{t}</span>)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({ agent, agentState, onToggle, onRun, onViewLastResult, lastResult }) {
  const state = agentState[agent.id] || { enabled:false, status:'idle', lastRun:null, runs:0 }
  const isRunning = state.status === 'running'

  return (
    <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'20px', borderLeft:`3px solid ${state.enabled ? agent.color : T.border}`, transition:'border 0.2s' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`${agent.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className={`ti ${agent.icon}`} style={{ fontSize:'20px', color:agent.color }} />
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:T.text }}>{agent.name}</div>
            <div style={{ fontSize:'11px', color:T.muted, marginTop:'2px' }}>
              <i className="ti ti-clock" style={{ fontSize:'11px' }} /> {agent.schedule}
              {state.runs > 0 && <span style={{ marginLeft:'8px' }}><i className="ti ti-player-play" style={{ fontSize:'11px' }} /> {state.runs} runs</span>}
            </div>
          </div>
        </div>
        <button onClick={() => onToggle(agent.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px' }}>
          <div style={{ width:'40px', height:'22px', borderRadius:'11px', background:state.enabled ? T.green : T.border2, transition:'background 0.2s', position:'relative' }}>
            <div style={{ position:'absolute', top:'3px', left:state.enabled ? '21px' : '3px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
          </div>
        </button>
      </div>

      <p style={{ fontSize:'12px', color:T.textSub, margin:'0 0 12px', lineHeight:1.6 }}>{agent.desc}</p>

      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
        {agent.tags.map(t => <span key={t} style={s.tag}>{t}</span>)}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <span style={s.badge(state.enabled ? (isRunning ? 'running' : 'active') : 'idle')}>
            <i className={`ti ${isRunning ? 'ti-loader-2' : state.enabled ? 'ti-check' : 'ti-minus'}`} style={{ fontSize:'10px' }} />
            {isRunning ? 'Running' : state.enabled ? 'Active' : 'Idle'}
          </span>
          {state.lastRun && <span style={{ fontSize:'11px', color:T.muted }}>Last: {state.lastRun}</span>}
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {lastResult && (
            <button style={{ ...s.btn('outline'), padding:'6px 10px' }} onClick={() => onViewLastResult(lastResult)} title="View last result">
              <i className="ti ti-eye" style={{ fontSize:'13px' }} />
            </button>
          )}
          <button
            style={{ ...s.btn('primary'), opacity:(!state.enabled || isRunning) ? 0.5 : 1 }}
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function AgentsPage({ clientId, userId }) {
  const [activeTab, setActiveTab]       = useState('agents')
  const [agentState, setAgentState]     = useState({})
  const [results, setResults]           = useState([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [panelResult, setPanelResult]   = useState(null)
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [chatHistory, setChatHistory]   = useState([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const [saving, setSaving]             = useState(false)
  const [filter, setFilter]             = useState('all')
  const chatEndRef = useRef(null)

  // Load agent states
  useEffect(() => {
    if (!clientId || !userId) return
    const load = async () => {
      const { data } = await supabase
        .from('agent_states').select('*')
        .eq('user_id', userId).eq('client_id', clientId)
      if (data) {
        const map = {}
        data.forEach(r => { map[r.agent_id] = { enabled:r.enabled, status:r.status||'idle', lastRun:r.last_run, runs:r.runs||0 } })
        setAgentState(map)
      }
    }
    load()
  }, [clientId, userId])

  // Load results history
  const loadResults = useCallback(async () => {
    if (!clientId || !userId) return
    setResultsLoading(true)
    const { data } = await supabase
      .from('agent_results')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .order('created_at', { ascending:false })
      .limit(200)
    if (data) setResults(data)
    setResultsLoading(false)
  }, [clientId, userId])

  useEffect(() => { loadResults() }, [loadResults])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [chatHistory])

  const saveAgentState = async (agentId, patch) => {
    setSaving(true)
    const current = agentState[agentId] || { enabled:false, status:'idle', lastRun:null, runs:0 }
    const next = { ...current, ...patch }
    setAgentState(prev => ({ ...prev, [agentId]: next }))
    await supabase.from('agent_states').upsert({
      user_id:userId, client_id:clientId, agent_id:agentId,
      enabled:next.enabled, status:next.status, last_run:next.lastRun, runs:next.runs
    }, { onConflict:'user_id,client_id,agent_id' })
    setSaving(false)
  }

  const handleToggle = async (agentId) => {
    const current = agentState[agentId] || { enabled:false }
    await saveAgentState(agentId, { enabled:!current.enabled })
  }

  const handleEnableAll = async () => {
    for (const agent of ALL_AGENTS) {
      if (!agentState[agent.id]?.enabled) await saveAgentState(agent.id, { enabled:true })
    }
  }

  const handleDisableAll = async () => {
    for (const agent of ALL_AGENTS) {
      if (agentState[agent.id]?.enabled) await saveAgentState(agent.id, { enabled:false })
    }
  }

  const handleRun = async (agentId) => {
    const agent = ALL_AGENTS.find(a => a.id === agentId)
    if (!agent) return
    await saveAgentState(agentId, { status:'running' })

    try {
      const { data: settings } = await supabase
        .from('settings').select('anthropic_key').eq('user_id', userId).single()

      if (!settings?.anthropic_key) {
        await saveAgentState(agentId, { status:'idle' })
        const errResult = { id: Date.now().toString(), agent_id:agentId, output:'No Anthropic API key found. Set it in the API Keys tab.', created_at:new Date().toISOString(), user_id:userId, client_id:clientId }
        setPanelResult(errResult)
        return
      }

      const { data: biz } = await supabase
        .from('client_data')
        .select('biz_name,biz_cat,biz_city,biz_state,biz_kw,biz_website,biz_phone,biz_addr')
        .eq('id', clientId).single()

      const bizContext = biz
        ? `Business: ${biz.biz_name} | Category: ${biz.biz_cat} | Location: ${biz.biz_city}, ${biz.biz_state} | Address: ${biz.biz_addr} | Phone: ${biz.biz_phone} | Website: ${biz.biz_website} | Keywords: ${biz.biz_kw}`
        : 'No business profile found.'

      const basePrompt = AGENT_PROMPTS[agentId] || `You are the ${agent.name} agent. Run your analysis and provide actionable findings.`
      const fullPrompt = `${basePrompt}\n\n${bizContext}\n\n${globalPrompt ? `Additional instructions: ${globalPrompt}` : ''}\n\nBe specific, practical, and concise. Limit to 300 words.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':settings.anthropic_key, 'anthropic-version':'2023-06-01' },
        body:JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:700, messages:[{ role:'user', content:fullPrompt }] })
      })

      const data = await res.json()
      const output = data.content?.[0]?.text || data.error?.message || 'No response received.'

      // Save result to Supabase
      const { data: saved } = await supabase
        .from('agent_results')
        .insert({ user_id:userId, client_id:clientId, agent_id:agentId, output })
        .select().single()

      const resultObj = saved || { id:Date.now().toString(), agent_id:agentId, output, created_at:new Date().toISOString(), user_id:userId, client_id:clientId }

      // Update state + open panel
      const currentState = agentState[agentId] || {}
      await saveAgentState(agentId, {
        status:'idle',
        lastRun:new Date().toLocaleDateString(),
        runs:(currentState.runs||0)+1
      })
      setResults(prev => [resultObj, ...prev])
      setPanelResult(resultObj)

    } catch (err) {
      await saveAgentState(agentId, { status:'idle' })
      const errResult = { id:Date.now().toString(), agent_id:agentId, output:`Run failed: ${err.message}`, created_at:new Date().toISOString(), user_id:userId, client_id:clientId }
      setPanelResult(errResult)
    }
  }

  const handleDeleteResult = async (resultId) => {
    await supabase.from('agent_results').delete().eq('id', resultId)
    setResults(prev => prev.filter(r => r.id !== resultId))
  }

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatHistory(prev => [...prev, { role:'user', content:userMsg }])
    setChatLoading(true)

    try {
      const { data: settings } = await supabase
        .from('settings').select('anthropic_key').eq('user_id', userId).single()

      if (!settings?.anthropic_key) {
        setChatHistory(prev => [...prev, { role:'assistant', content:'No Anthropic API key found. Set it in the API Keys tab.' }])
        setChatLoading(false)
        return
      }

      const { data: biz } = await supabase
        .from('client_data').select('biz_name,biz_cat,biz_city,biz_state,biz_kw,biz_website')
        .eq('id', clientId).single()

      const systemPrompt = `You are an expert local SEO AI assistant for RankForged AI. You have deep knowledge of Google Business Profile optimization, local pack rankings, citation building, review management, and local content strategy.${biz ? ` Current client: ${biz.biz_name} (${biz.biz_cat}) in ${biz.biz_city}, ${biz.biz_state}. Website: ${biz.biz_website}. Keywords: ${biz.biz_kw}` : ''} Provide concise, actionable advice.`

      const messages = [
        ...chatHistory.map(m => ({ role:m.role, content:m.content })),
        { role:'user', content:userMsg }
      ]

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':settings.anthropic_key, 'anthropic-version':'2023-06-01' },
        body:JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:1000, system:systemPrompt, messages })
      })

      const data = await res.json()
      setChatHistory(prev => [...prev, { role:'assistant', content:data.content?.[0]?.text || 'No response.' }])
    } catch (err) {
      setChatHistory(prev => [...prev, { role:'assistant', content:`Error: ${err.message}` }])
    }
    setChatLoading(false)
  }

  const enabledCount = ALL_AGENTS.filter(a => agentState[a.id]?.enabled).length
  const runningCount = ALL_AGENTS.filter(a => agentState[a.id]?.status === 'running').length
  const totalRuns    = ALL_AGENTS.reduce((sum, a) => sum + (agentState[a.id]?.runs||0), 0)

  // Last result per agent (for eye button on cards)
  const lastResultByAgent = {}
  results.forEach(r => { if (!lastResultByAgent[r.agent_id]) lastResultByAgent[r.agent_id] = r })

  return (
    <div style={s.page}>
      {/* Results panel */}
      <ResultsPanel result={panelResult} onClose={() => setPanelResult(null)} />

      {/* Header */}
      <div style={s.hdr}>
        <div>
          <h1 style={s.h1}><i className="ti ti-robot" style={{ marginRight:'8px', color:T.accent }} />AI Agents</h1>
          <div style={s.sub}>20 autonomous SEO agents that monitor, analyze, and act on your behalf</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
          {saving && <span style={{ fontSize:'12px', color:T.muted }}><i className="ti ti-loader-2" /> Saving...</span>}
          <span style={s.badge(runningCount > 0 ? 'running' : enabledCount > 0 ? 'active' : 'idle')}>
            <i className="ti ti-robot" style={{ fontSize:'10px' }} /> {enabledCount}/{ALL_AGENTS.length} active
          </span>
          <button style={s.btn('outline')} onClick={handleEnableAll}>Enable All</button>
          <button style={s.btn('ghost')} onClick={handleDisableAll}>Disable All</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
        {[
          { label:'Total Agents', val:ALL_AGENTS.length, icon:'ti-robot',                color:T.accent  },
          { label:'Active',       val:enabledCount,       icon:'ti-check',                color:T.green   },
          { label:'Running Now',  val:runningCount,       icon:'ti-player-play',          color:T.cyan    },
          { label:'Results Saved',val:results.length,     icon:'ti-database',             color:T.purple  },
        ].map(st => (
          <div key={st.label} style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:`${st.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className={`ti ${st.icon}`} style={{ fontSize:'18px', color:st.color }} />
            </div>
            <div>
              <div style={{ fontSize:'20px', fontWeight:700, color:T.text }}>{st.val}</div>
              <div style={{ fontSize:'11px', color:T.muted }}>{st.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Page tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:T.cardBg2, borderRadius:'10px', padding:'4px', border:`1px solid ${T.border}`, width:'fit-content' }}>
        {[
          { id:'agents',  label:'Agents',         icon:'ti-robot'       },
          { id:'history', label:`History (${results.length})`, icon:'ti-history' },
          { id:'chat',    label:'AI Assistant',   icon:'ti-messages'    },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding:'8px 18px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, background:activeTab===tab.id ? T.accent : 'transparent', color:activeTab===tab.id ? '#fff' : T.muted, display:'flex', alignItems:'center', gap:'6px', transition:'all 0.15s' }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize:'13px' }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── AGENTS TAB ── */}
      {activeTab === 'agents' && (
        <>
          {/* Global Prompt */}
          <div style={s.card}>
            <div style={s.cardHd}>
              <i className="ti ti-adjustments-horizontal" style={{ color:T.purple }} />
              <span style={s.cardTtl}>Global Agent Instructions</span>
              <span style={{ fontSize:'12px', color:T.muted, marginLeft:'auto' }}>Optional - applied to all agent runs</span>
            </div>
            <textarea style={s.textarea} placeholder="e.g. Focus on Spanish-speaking customers. Prioritize mobile search."
              value={globalPrompt} onChange={e => setGlobalPrompt(e.target.value)} />
          </div>

          {/* Section filter pills */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            {['all', ...AGENT_SECTIONS.map(s => s.label)].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'5px 14px', borderRadius:'20px', border:`1px solid ${filter===f ? T.accent : T.border}`, background:filter===f ? 'rgba(59,130,246,0.15)' : 'transparent', color:filter===f ? T.accentHi : T.muted, fontSize:'12px', fontWeight:600, cursor:'pointer' }}>
                {f === 'all' ? 'All Agents' : f}
              </button>
            ))}
          </div>

          {/* Sections */}
          {AGENT_SECTIONS.filter(sec => filter === 'all' || filter === sec.label).map(section => (
            <div key={section.label}>
              <div style={s.secHd}>
                <i className={`ti ${section.icon}`} style={{ color:section.color, fontSize:'14px' }} />
                {section.label}
                <span style={{ fontSize:'11px', color:T.border2, fontWeight:400, textTransform:'none', letterSpacing:0 }}>
                  {section.agents.filter(a => agentState[a.id]?.enabled).length}/{section.agents.length} active
                </span>
              </div>
              <div style={s.grid2}>
                {section.agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} agentState={agentState}
                    onToggle={handleToggle} onRun={handleRun}
                    lastResult={lastResultByAgent[agent.id]}
                    onViewLastResult={setPanelResult}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <HistoryTab results={results} onView={setPanelResult} onDelete={handleDeleteResult} loading={resultsLoading} />
      )}

      {/* ── CHAT TAB ── */}
      {activeTab === 'chat' && (
        <div style={s.card}>
          <div style={s.cardHd}>
            <i className="ti ti-messages" style={{ color:T.cyan }} />
            <span style={s.cardTtl}>SEO AI Assistant</span>
            <span style={{ fontSize:'12px', color:T.muted, marginLeft:'auto' }}>Ask anything about your local SEO strategy</span>
          </div>
          <div style={{ background:T.cardBg2, borderRadius:'8px', padding:'16px', minHeight:'320px', maxHeight:'480px', overflowY:'auto', marginBottom:'12px', border:`1px solid ${T.border}` }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign:'center', color:T.muted, fontSize:'13px', paddingTop:'80px' }}>
                <i className="ti ti-message-question" style={{ fontSize:'32px', display:'block', marginBottom:'10px' }} />
                Ask about citations, rankings, content strategy, GBP optimization, and more.
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} style={{ marginBottom:'16px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:m.role==='user'?T.accent:`${T.purple}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`ti ${m.role==='user'?'ti-user':'ti-robot'}`} style={{ fontSize:'13px', color:m.role==='user'?'#fff':T.purple }} />
                </div>
                <div style={{ fontSize:'13px', color:m.role==='user'?T.textSub:T.text, lineHeight:1.7, flex:1, whiteSpace:'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:`${T.purple}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-robot" style={{ fontSize:'13px', color:T.purple }} />
                </div>
                <span style={{ fontSize:'13px', color:T.muted }}><i className="ti ti-loader-2" /> Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <input style={s.input} placeholder="Ask your SEO AI assistant..." value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && handleChat()} />
            <button style={{ ...s.btn('primary'), whiteSpace:'nowrap' }} onClick={handleChat} disabled={chatLoading}>
              <i className="ti ti-send" style={{ fontSize:'14px' }} /> Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
