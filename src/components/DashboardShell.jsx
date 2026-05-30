// src/components/DashboardShell.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useClients } from '../hooks/useClients'
import ClientsPage from './ClientsPage'

const LOGO = 'data:image/png;base64,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'

const NAV_GROUPS = [
  { label:'Overview', items:[
    { id:'dash',         label:'Dashboard',      icon:'📊' },
    { id:'agents',       label:'AI Agents',       icon:'🤖' },
  ]},
  { label:'Citations & Links', items:[
    { id:'dir',          label:'Directories',     icon:'📍' },
    { id:'bl',           label:'Backlinks',        icon:'🔗' },
    { id:'web2',         label:'Web 2.0',          icon:'🌐' },
    { id:'locallinks',   label:'Local Links',      icon:'🏘️' },
  ]},
  { label:'Local SEO', items:[
    { id:'local',        label:'Local SEO',        icon:'📌' },
    { id:'mloc',         label:'Multi-Location',   icon:'🏪' },
    { id:'napaudit',     label:'NAP Audit',        icon:'🛡️' },
    { id:'reputation',   label:'Reputation',       icon:'⭐' },
  ]},
  { label:'Content', items:[
    { id:'calendar',     label:'Calendar',         icon:'📅' },
    { id:'pages',        label:'Landing Pages',    icon:'📄' },
    { id:'voice',        label:'Voice & FAQ',      icon:'🎙️' },
    { id:'gbpqa',        label:'AI FAQ & Schema',  icon:'🧠' },
  ]},
  { label:'Intelligence', items:[
    { id:'kwgap',        label:'KW Gap',           icon:'🔍' },
    { id:'rank-tracker', label:'Rank Tracker',     icon:'📈' },
    { id:'gsc',          label:'Search Console',   icon:'🔎' },
    { id:'schema-mon',   label:'Schema Monitor',   icon:'🔧' },
  ]},
  { label:'Agency', items:[
    { id:'social-pub',   label:'Social Publisher', icon:'📲' },
    { id:'social-proof', label:'Social Proof',     icon:'🏆' },
    { id:'pdfreport',    label:'Reports',          icon:'📑' },
    { id:'meta',         label:'Meta Tags',        icon:'🏷️' },
  ]},
  { label:'Technical', items:[
    { id:'index',        label:'Indexing & AI',    icon:'⚡' },
    { id:'keys',         label:'API Keys',         icon:'🔑' },
  ]},
]

const ALL_TABS = NAV_GROUPS.flatMap(g => g.items)

const PLAN_COLORS = {
  solopreneur:'#3b82f6', deluxe:'#8b5cf6',
  pro:'#06b6d4', agency:'#10b981'
}

export default function DashboardShell({ session, subscription }) {
  const [activeTab, setActiveTab]     = useState('clients')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [iframeSrc, setIframeSrc]     = useState('')
  const iframeRef = useRef(null)
  const pendingTabRef = useRef(null)

  const { clients, activeId, setActiveId, createClient, deleteClient, updateClientMeta } = useClients(session.user.id)
  const activeClient = clients.find(c => c.id === activeId)
  const plan = subscription?.plan || 'solopreneur'
  const maxClients = subscription?.max_clients || 1

  // ── Load iframe when client selected ─────────────────
  useEffect(() => {
    if (!activeId) return
    setIframeReady(false)
    setIframeSrc('/rankforge3.html?client=' + activeId + '&t=' + Date.now())
  }, [activeId]) // eslint-disable-line

  // ── Switch tab by clicking the real button inside iframe ──
  const switchTab = useCallback((tabId) => {
    setActiveTab(tabId)
    // postMessage only — contentDocument is inaccessible (confirmed null)
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'SWITCH_TAB', payload: { tab: tabId } }, '*'
    )
  }, [])

  // ── After iframe loads: inject CSS + switch to active tab ─
  const onIframeLoad = useCallback(() => {
    setIframeReady(true)
    // rankforge3 detects it's in an iframe and hides its own sidebar automatically
    // Tab switching happens via postMessage when RF_APP_READY fires
  }, [])

  // Listen for RF_APP_READY — rankforge3 sends this when fully initialised
  useEffect(() => {
    const handler = async (e) => {
      if (e.data?.type === 'RF_APP_READY') {
        const iWin = iframeRef.current?.contentWindow
        if (!iWin) return

        // 1. Load settings + client data from Supabase and inject into rankforge3
        try {
          const [settingsRes, clientRes] = await Promise.all([
            supabase.from('settings').select('*').eq('user_id', session.user.id).single(),
            activeId ? supabase.from('client_data').select('*').eq('client_id', activeId).single() : Promise.resolve({ data: null })
          ])

          const s = settingsRes.data || {}
          const c = clientRes.data || {}

          iWin.postMessage({
            type: 'LOAD_DATA',
            payload: {
              keys: {
                anthropic:      s.anthropic_key    || '',
                google:         s.google_key        || '',
                indexnow:       s.indexnow_key      || '',
                yext:           s.yext_key          || '',
                yextAccount:    s.yext_account      || '',
                openai:         s.openai_key        || '',
                gemini:         s.gemini_key        || '',
                mozId:          s.moz_id            || '',
                mozSecret:      s.moz_secret        || '',
                brightlocalKey: s.brightlocal_key   || '',
                brightlocalCid: s.brightlocal_cid   || '',
                gmailToken:     s.gmail_token       || '',
                fbToken:        s.fb_token          || '',
                fbPageId:       s.fb_page_id        || '',
                linkedinToken:  s.linkedin_token    || '',
              },
              profile: {
                bizName:    c.biz_name    || '',
                bizCat:     c.biz_cat     || '',
                bizAddr:    c.biz_addr    || '',
                bizCity:    c.biz_city    || '',
                bizState:   c.biz_state   || '',
                bizZip:     c.biz_zip     || '',
                bizPhone:   c.biz_phone   || '',
                bizWebsite: c.biz_website || '',
                bizDesc:    c.biz_desc    || '',
                bizKw:      c.biz_kw      || '',
                agencyName: s.agency_name  || '',
                brandColor: s.brand_color  || '',
              }
            }
          }, '*')
        } catch (err) {
          console.error('LOAD_DATA error:', err)
        }

        // 2. Switch to pending tab if any
        const tab = pendingTabRef.current
        if (tab && tab !== 'clients' && tab !== 'dash') {
          pendingTabRef.current = null
          iWin.postMessage({ type: 'SWITCH_TAB', payload: { tab } }, '*')
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [activeId, session.user.id]) // eslint-disable-line

  // When tab changes, send postMessage to rankforge3
  useEffect(() => {
    if (!activeId || activeTab === 'clients' || activeTab === 'dash') return
    pendingTabRef.current = activeTab
    // postMessage is the ONLY way — contentDocument is null (cross-origin restriction)
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'SWITCH_TAB', payload: { tab: activeTab } }, '*'
    )
  }, [activeTab]) // eslint-disable-line

  const handleNavClick = (tabId) => {
    if (tabId === 'clients') { setActiveTab('clients'); return }
    if (!activeId) { setActiveTab('clients'); return }
    switchTab(tabId)
  }

  const signOut = () => supabase.auth.signOut()
  const isToolTab = activeTab !== 'clients'
  const currentTab = ALL_TABS.find(t => t.id === activeTab)

  return (
    <div style={{ display:'flex', height:'100vh', background:'#060d1a',
      fontFamily:"'Segoe UI',system-ui,sans-serif", overflow:'hidden' }}>

      {/* ══ SIDEBAR ══ */}
      <div style={{
        width: sidebarOpen ? 228 : 0, minWidth: sidebarOpen ? 228 : 0,
        background:'#080f1e', borderRight:'1px solid #0f2040',
        display:'flex', flexDirection:'column',
        overflow:'hidden', transition:'width .2s,min-width .2s', flexShrink:0,
      }}>
        {/* Logo */}
        <div style={{ padding:'14px 14px 12px', borderBottom:'1px solid #0f2040' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <img src={LOGO} alt="" style={{ width:32,height:32,objectFit:'contain',flexShrink:0 }}
              onError={e=>e.target.style.display='none'} />
            <div>
              <div style={{ fontSize:13,fontWeight:800,color:'#e2e8f0' }}>RankForged AI</div>
              <div style={{ fontSize:10,color:'#3b82f6',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em' }}>Local SEO Platform</div>
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
            background:'rgba(255,255,255,.04)',borderRadius:7,padding:'5px 9px',border:'1px solid #1a3560' }}>
            <div style={{ display:'flex',alignItems:'center',gap:5 }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:PLAN_COLORS[plan]||'#3b82f6' }} />
              <span style={{ fontSize:11,color:'#64748b',fontWeight:600,textTransform:'capitalize' }}>{plan}</span>
            </div>
            <span style={{ fontSize:10,color:'#1a3560' }}>{clients.length}/{maxClients}</span>
          </div>
        </div>

        {/* Active client chip */}
        {activeClient && (
          <div style={{ padding:'8px 12px',background:'rgba(59,130,246,.06)',borderBottom:'1px solid #0f2040',
            display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:24,height:24,borderRadius:6,background:activeClient.color||'#3b82f6',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',flexShrink:0 }}>
              {activeClient.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12,fontWeight:700,color:'#7ab4ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {activeClient.name}
              </div>
            </div>
            <button onClick={()=>setActiveTab('clients')}
              style={{ background:'transparent',border:'none',color:'#2a4060',cursor:'pointer',fontSize:10,padding:'2px 5px' }}>
              switch
            </button>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1,overflowY:'auto',padding:'8px' }}>
          {/* My Businesses */}
          <button onClick={()=>setActiveTab('clients')} style={{
            width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',
            borderRadius:8,border:'none',cursor:'pointer',marginBottom:8,textAlign:'left',
            background:activeTab==='clients'?'linear-gradient(135deg,rgba(59,130,246,.22),rgba(59,130,246,.08))':'transparent',
            color:activeTab==='clients'?'#93c5fd':'#4a6080',fontWeight:activeTab==='clients'?700:500,
            fontSize:13,borderLeft:activeTab==='clients'?'2px solid #3b82f6':'2px solid transparent',
          }}>
            <span>🏢</span> My Businesses
          </button>
          <div style={{ height:1,background:'#0f2040',marginBottom:8 }} />

          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom:4 }}>
              <div style={{ fontSize:9.5,fontWeight:700,color:'#1a3560',textTransform:'uppercase',
                letterSpacing:'.07em',padding:'3px 10px 4px',marginBottom:1 }}>
                {group.label}
              </div>
              {group.items.map(tab => (
                <button key={tab.id} onClick={()=>handleNavClick(tab.id)} style={{
                  width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                  borderRadius:7,border:'none',cursor:'pointer',marginBottom:1,textAlign:'left',
                  background:activeTab===tab.id?'linear-gradient(135deg,rgba(59,130,246,.18),rgba(59,130,246,.06))':'transparent',
                  color:activeTab===tab.id?'#93c5fd':!activeId?'#243550':'#4a6080',
                  fontWeight:activeTab===tab.id?700:400,fontSize:12.5,transition:'.1s',
                  borderLeft:activeTab===tab.id?'2px solid #3b82f6':'2px solid transparent',
                  opacity:!activeId?0.4:1,
                }}>
                  <span style={{ fontSize:13,flexShrink:0 }}>{tab.icon}</span>
                  <span style={{ overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{tab.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding:'8px',borderTop:'1px solid #0f2040',position:'relative' }}>
          <div onClick={()=>setUserMenuOpen(o=>!o)}
            style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:8,cursor:'pointer',
              background:userMenuOpen?'rgba(59,130,246,.1)':'transparent' }}>
            <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0 }}>
              {session.user.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:11,color:'#3a5070',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {session.user.email}
              </div>
            </div>
            <span style={{ color:'#1a3560',fontSize:9 }}>{userMenuOpen?'▲':'▼'}</span>
          </div>
          {userMenuOpen && (
            <div style={{ position:'absolute',bottom:'100%',left:8,right:8,background:'#0d1f3c',
              border:'1px solid #1a3560',borderRadius:10,padding:6,marginBottom:4,
              boxShadow:'0 -8px 24px rgba(0,0,0,.5)' }}>
              <button onClick={signOut} style={{ width:'100%',padding:'8px 12px',background:'transparent',
                color:'#f87171',border:'none',borderRadius:7,fontSize:13,fontWeight:600,
                cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8 }}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ MAIN ══ */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0 }}>

        {/* Topbar */}
        <div style={{ height:50,flexShrink:0,background:'#080f1e',borderBottom:'1px solid #0f2040',
          display:'flex',alignItems:'center',padding:'0 14px',gap:10 }}>
          <button onClick={()=>setSidebarOpen(o=>!o)}
            style={{ background:'transparent',border:'none',color:'#3a5080',cursor:'pointer',fontSize:20,padding:'4px',borderRadius:6,lineHeight:1,flexShrink:0 }}>
            ☰
          </button>
          <div style={{ flex:1,display:'flex',alignItems:'center',gap:8,minWidth:0,overflow:'hidden' }}>
            {activeClient && isToolTab && (
              <>
                <div style={{ width:20,height:20,borderRadius:4,background:activeClient.color||'#3b82f6',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#fff',flexShrink:0 }}>
                  {activeClient.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize:12.5,fontWeight:700,color:'#e2e8f0',whiteSpace:'nowrap',
                  overflow:'hidden',textOverflow:'ellipsis',maxWidth:140 }}>
                  {activeClient.name}
                </span>
                <span style={{ color:'#1a3050',flexShrink:0 }}>›</span>
              </>
            )}
            <span style={{ fontSize:12.5,color:'#4a6080',fontWeight:500,whiteSpace:'nowrap' }}>
              {isToolTab ? (currentTab?.label || activeTab) : 'My Businesses'}
            </span>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:7,flexShrink:0 }}>
            {isToolTab && clients.length > 0 && (
              <select value={activeId||''} onChange={e=>{ setActiveId(e.target.value); setActiveTab('dash') }}
                style={{ background:'#0d1f3c',color:'#93c5fd',border:'1px solid #1a3560',borderRadius:7,
                  padding:'5px 8px',fontSize:12,fontWeight:600,cursor:'pointer',outline:'none',maxWidth:140 }}>
                <option value="" disabled>Select business</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button onClick={()=>setShowAddModal(true)} disabled={clients.length>=maxClients}
              style={{ padding:'5px 12px',borderRadius:7,border:'none',
                background:clients.length>=maxClients?'#0d1f3c':'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                color:clients.length>=maxClients?'#2a4060':'#fff',fontSize:12.5,fontWeight:700,
                cursor:clients.length>=maxClients?'not-allowed':'pointer',
                display:'flex',alignItems:'center',gap:5 }}>
              + Business
            </button>
            {isToolTab && activeId && (
              <button
                onClick={()=>{ setIframeReady(false); setIframeSrc('/rankforge3.html?client='+activeId+'&t='+Date.now()) }}
                title="Reload tool"
                style={{ background:'rgba(59,130,246,.08)',border:'1px solid #1a3560',color:'#4a7adb',
                  borderRadius:7,padding:'5px 9px',cursor:'pointer',fontSize:14 }}>
                ↻
              </button>
            )}
          </div>
        </div>

        {/* My Businesses */}
        {activeTab==='clients' && (
          <ClientsPage
            clients={clients} activeId={activeId} maxClients={maxClients} plan={plan}
            onSelect={(id)=>{ setActiveId(id); setActiveTab('dash') }}
            onAdd={()=>setShowAddModal(true)}
            onDelete={deleteClient}
            onUpdateMeta={updateClientMeta}
            onCreate={createClient}
          />
        )}

        {/* Tool iframe */}
        {activeTab!=='clients' && (
          <div style={{ flex:1,position:'relative',overflow:'hidden' }}>
            {/* No client */}
            {!activeId && (
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:16,background:'#060d1a',zIndex:5 }}>
                <div style={{ fontSize:48 }}>🏢</div>
                <div style={{ fontSize:16,fontWeight:700,color:'#e2e8f0' }}>No business selected</div>
                <button onClick={()=>setActiveTab('clients')}
                  style={{ padding:'10px 24px',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                    color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer' }}>
                  Go to My Businesses
                </button>
              </div>
            )}
            {/* Loading spinner */}
            {activeId && !iframeReady && (
              <div style={{ position:'absolute',inset:0,zIndex:10,background:'#060d1a',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14 }}>
                <div style={{ width:36,height:36,border:'3px solid #0f2040',borderTopColor:'#3b82f6',
                  borderRadius:'50%',animation:'spin 1s linear infinite' }} />
                <div style={{ fontSize:13,color:'#3a5080' }}>Loading {activeClient?.name||'tool'}...</div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
            {/* iframe */}
            {activeId && iframeSrc && (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                onLoad={onIframeLoad}
                onError={()=>setIframeReady(true)}
                title="RankForged AI"
                style={{ width:'100%',height:'100%',border:'none',display:'block',
                  opacity:iframeReady?1:0,transition:'opacity .3s' }}
                allow="clipboard-read; clipboard-write"
              />
            )}
          </div>
        )}
      </div>

      {/* Add Business Modal */}
      {showAddModal && (
        <AddModal
          onClose={()=>setShowAddModal(false)}
          onCreate={async(data)=>{
            const client = await createClient(data.name)
            if (client) {
              if (data.city||data.category) await updateClientMeta(client.id,{city:data.city,category:data.category})
              setActiveId(client.id)
              setActiveTab('dash')
            }
            setShowAddModal(false)
          }}
          remaining={maxClients-clients.length}
          plan={plan}
        />
      )}
    </div>
  )
}

function AddModal({ onClose, onCreate, remaining, plan }) {
  const [name,setName]=useState(''); const [city,setCity]=useState('');
  const [cat,setCat]=useState(''); const [saving,setSaving]=useState(false)
  const inp = { width:'100%',padding:'9px 12px',background:'#07111f',color:'#e2e8f0',
    border:'1.5px solid #1a3560',borderRadius:7,fontSize:13.5,outline:'none',boxSizing:'border-box' }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#0d1f3c',border:'1px solid #1a3560',borderRadius:16,
        padding:'28px 32px',width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontSize:17,fontWeight:800,color:'#e2e8f0' }}>➕ Add New Business</div>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#3a5080',cursor:'pointer',fontSize:20 }}>×</button>
        </div>
        <div style={{ background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:8,
          padding:'8px 12px',marginBottom:18,fontSize:12,color:'#60a5fa' }}>
          {remaining>0?`${remaining} slot${remaining>1?'s':''} remaining on ${plan} plan`:`All slots used — upgrade for more`}
        </div>
        {[{l:'Business Name *',v:name,s:setName,p:'e.g. Austin Plumbing Pros',r:true},
          {l:'City / State',v:city,s:setCity,p:'e.g. Austin, TX'},
          {l:'Business Type',v:cat,s:setCat,p:'e.g. Plumber, HVAC, Dentist'}
        ].map(f=>(
          <div key={f.l} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12,fontWeight:600,color:'#60a5fa',marginBottom:4,display:'block' }}>{f.l}</label>
            <input value={f.v} onChange={e=>f.s(e.target.value)} placeholder={f.p} required={f.r}
              style={inp}
              onFocus={e=>e.target.style.borderColor='#3b82f6'}
              onBlur={e=>e.target.style.borderColor='#1a3560'} />
          </div>
        ))}
        <div style={{ display:'flex',gap:10,marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px 0',background:'transparent',color:'#4a6080',
            border:'1px solid #1a3560',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer' }}>Cancel</button>
          <button onClick={async()=>{ if(!name.trim()||saving||remaining<=0)return; setSaving(true); await onCreate({name:name.trim(),city:city.trim(),category:cat.trim()}); setSaving(false) }}
            disabled={!name.trim()||saving||remaining<=0}
            style={{ flex:2,padding:'10px 0',
              background:!name.trim()||saving||remaining<=0?'#0d1f3c':'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color:!name.trim()||saving||remaining<=0?'#2a4060':'#fff',border:'none',borderRadius:8,
              fontSize:13.5,fontWeight:700,cursor:'pointer' }}>
            {saving?'Creating...':'Create Business'}
          </button>
        </div>
      </div>
    </div>
  )
}