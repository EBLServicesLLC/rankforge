// src/components/DashboardShell.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useClients } from '../hooks/useClients'
import ClientsPage from './ClientsPage'

const LOGO = '/logo.png'

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
    const handler = (e) => {
      if (e.data?.type === 'RF_APP_READY') {
        const tab = pendingTabRef.current
        if (tab && tab !== 'clients' && tab !== 'dash') {
          pendingTabRef.current = null
          // Send postMessage — rankforge3 handles it internally (no contentDocument needed)
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'SWITCH_TAB', payload: { tab } }, '*'
          )
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

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
        width: (sidebarOpen && !isToolTab) ? 228 : 0, minWidth: (sidebarOpen && !isToolTab) ? 228 : 0,
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
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0,minHeight:0 }}>

        {/* Topbar */}
        <div style={{ height:50,flexShrink:0,background:'#080f1e',borderBottom:'1px solid #0f2040',
          display:'flex',alignItems:'center',padding:'0 14px',gap:10 }}>
          <button onClick={()=>setSidebarOpen(o=>!o)}
            style={{ background:'transparent',border:'none',color:'#3a5080',cursor:'pointer',fontSize:20,padding:'4px',borderRadius:6,lineHeight:1,flexShrink:0,display:isToolTab?'none':'block' }}>
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
                style={{ position:'absolute',inset:0,width:'100%',height:'100%',
                  border:'none',display:'block',
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