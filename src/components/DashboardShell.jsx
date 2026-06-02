import BillingPage from './BillingPage'
import ProfileModal from './ProfileModal'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useClients } from '../hooks/useClients'
import ClientsPage from './ClientsPage'

const LOGO = 'data:image/png;base64,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'

const NAV_GROUPS = [
  { label:'Overview', items:[
    { id:'dash',         label:'Dashboard',      icon:'' },
    { id:'agents',       label:'AI Agents',       icon:'' },
  ]},
  { label:'Citations & Links', items:[
    { id:'dir',          label:'Directories',     icon:'' },
    { id:'bl',           label:'Backlinks',        icon:'' },
    { id:'web2',         label:'Web 2.0',          icon:'' },
    { id:'locallinks',   label:'Local Links',      icon:'' },
  ]},
  { label:'Local SEO', items:[
    { id:'local',        label:'Local SEO',        icon:'' },
    { id:'mloc',         label:'Multi-Location',   icon:'' },
    { id:'napaudit',     label:'NAP Audit',        icon:'' },
    { id:'reputation',   label:'Reputation',       icon:'' },
  ]},
  { label:'Content', items:[
    { id:'calendar',     label:'Calendar',         icon:'' },
    { id:'pages',        label:'Landing Pages',    icon:'' },
    { id:'voice',        label:'Voice & FAQ',      icon:'' },
    { id:'gbpqa',        label:'AI FAQ & Schema',  icon:'' },
  ]},
  { label:'Intelligence', items:[
    { id:'kwgap',        label:'KW Gap',           icon:'' },
    { id:'rank-tracker', label:'Rank Tracker',     icon:'' },
    { id:'gsc',          label:'Search Console',   icon:'' },
    { id:'schema-mon',   label:'Schema Monitor',   icon:'' },
  ]},
  { label:'Agency', items:[
    { id:'social-pub',   label:'Social Publisher', icon:'' },
    { id:'social-proof', label:'Social Proof',     icon:'' },
    { id:'pdfreport',    label:'Reports',          icon:'' },
    { id:'meta',         label:'Meta Tags',        icon:'' },
  ]},
  { label:'Technical', items:[
    { id:'index',        label:'Indexing & AI',    icon:'' },
    { id:'keys',         label:'API Keys',         icon:'' },
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
  const [showBilling, setShowBilling] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [iframeSrc, setIframeSrc]     = useState('')
  const iframeRef = useRef(null)
  const pendingTabRef = useRef(null)

  const { clients, activeId, setActiveId, createClient, deleteClient, updateClientMeta } = useClients(session.user.id)
  const activeClient = clients.find(c => c.id === activeId)
  const plan = subscription?.plan || 'solopreneur'
  const maxClients = subscription?.max_clients || 1

  // â”€â”€ Load iframe when client selected â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!activeId) return
    setIframeReady(false)
    setIframeSrc('/rankforge3.html?client=' + activeId + '&t=' + Date.now())
  }, [activeId]) // eslint-disable-line

  // â”€â”€ Switch tab by clicking the real button inside iframe â”€â”€
  const switchTab = useCallback((tabId) => {
    setActiveTab(tabId)
    // postMessage only â€” contentDocument is inaccessible (confirmed null)
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'SWITCH_TAB', payload: { tab: tabId } }, '*'
    )
  }, [])

  // â”€â”€ After iframe loads: inject CSS + switch to active tab â”€
  const onIframeLoad = useCallback(() => {
    setIframeReady(true)
    // rankforge3 detects it's in an iframe and hides its own sidebar automatically
    // Tab switching happens via postMessage when RF_APP_READY fires
  }, [])

  // Listen for RF_APP_READY â€” rankforge3 sends this when fully initialised
  useEffect(() => {
    const handler = async (e) => {
      if (e.data?.type === 'RF_BILLING') {
        setShowBilling(true)
        return
      }
      if (e.data?.type === 'RF_APP_READY' || e.data?.type === 'RF_READY') {
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
    // postMessage is the ONLY way â€” contentDocument is null (cross-origin restriction)
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

      {/* â•â• SIDEBAR â•â• */}
      <div style={{
        width: sidebarOpen ? 228 : 0, minWidth: sidebarOpen ? 228 : 0,
        background:'#080f1e', borderRight:'1px solid #0f2040',
        display:'flex', flexDirection:'column',
        overflow:'hidden', transition:'width .2s,min-width .2s', flexShrink:0,
      }}>
        {/* Logo */}
        <div style={{ padding:'14px 14px 12px', borderBottom:'1px solid #0f2040' }}>
          <div style={{ marginBottom:10, textAlign:'center' }}>
            <img src={LOGO} alt="RankForged AI" style={{ width:'100%',maxWidth:180,objectFit:'contain' }}
              onError={e=>e.target.style.display='none'} />
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
            My Businesses
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
            <span style={{ color:'#1a3560',fontSize:9 }}>{userMenuOpen?'â–²':'â–¼'}</span>
          </div>
          {userMenuOpen && (
            <div style={{ position:'absolute',bottom:'100%',left:8,right:8,background:'#0d1f3c',
              border:'1px solid #1a3560',borderRadius:10,padding:6,marginBottom:4,
              boxShadow:'0 -8px 24px rgba(0,0,0,.5)' }}>
              <button onClick={signOut} style={{ width:'100%',padding:'8px 12px',background:'transparent',
                color:'#f87171',border:'none',borderRadius:7,fontSize:13,fontWeight:600,
                cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8 }}>
                ðŸšª Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* â•â• MAIN â•â• */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0,margin:0,padding:0 }}>

        {/* Topbar */}
        <div style={{ height:50,flexShrink:0,background:'#080f1e',borderBottom:'1px solid #0f2040',
          display:'none',alignItems:'center',padding:'0 14px',gap:10 }}>
          <button onClick={()=>setSidebarOpen(o=>!o)}
            style={{ background:'transparent',border:'none',color:'#3a5080',cursor:'pointer',fontSize:20,padding:'4px',borderRadius:6,lineHeight:1,flexShrink:0 }}>
            â˜°
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
                <span style={{ color:'#1a3050',flexShrink:0 }}>â€º</span>
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
                â†»
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
            onUpgrade={()=>setShowBilling(true)}
            onBilling={()=>setShowBilling(true)}
            onSignOut={signOut}
            onResetPassword={async()=>{ await supabase.auth.resetPasswordForEmail(session.user.email); alert('Password reset email sent to ' + session.user.email) }}
            userEmail={session.user.email}
            onDelete={deleteClient}
            onUpdateMeta={updateClientMeta}
            onCreate={createClient}
          />
        )}

        {/* Tool iframe */}
        {activeTab!=='clients' && (
          <div style={{ flex:1,position:'relative',overflow:'hidden',margin:0,padding:0 }}>
            {/* No client */}
            {!activeId && (
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:16,background:'#060d1a',zIndex:5 }}>
                <div style={{ fontSize:48 }}>ðŸ¢</div>
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
      {showBilling && (
  <div style={{ position:'fixed',inset:0,zIndex:9999,background:'#060d1a',overflow:'auto' }}>
    <BillingPage
      userId={session.user.id}
      userEmail={session.user.email}
      onBack={() => setShowBilling(false)}
    />
  </div>
)}
      
      {showProfile && (
        <ProfileModal
          session={session}
          activeId={activeId}
          subscription={subscription}
          onClose={()=>setShowProfile(false)}
          onResetPassword={async()=>{ await supabase.auth.resetPasswordForEmail(session.user.email); alert('Password reset email sent to ' + session.user.email) }}
          onBilling={()=>{ setShowProfile(false); setShowBilling(true) }}
          iframeRef={iframeRef}
        />
      )}
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
  const [cat,setCat]=useState(''); const [desc,setDesc]=useState(''); const [keywords,setKeywords]=useState(''); const [saving,setSaving]=useState(false)
  const inp = { width:'100%',padding:'9px 12px',background:'#07111f',color:'#e2e8f0',
    border:'1.5px solid #1a3560',borderRadius:7,fontSize:13.5,outline:'none',boxSizing:'border-box' }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#0d1f3c',border:'1px solid #1a3560',borderRadius:16,
        padding:'28px 32px',width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontSize:17,fontWeight:800,color:'#e2e8f0' }}>âž• Add New Business</div>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#3a5080',cursor:'pointer',fontSize:20 }}>Ã—</button>
        </div>
        <div style={{ background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:8,
          padding:'8px 12px',marginBottom:18,fontSize:12,color:'#60a5fa' }}>
          {remaining>0?`${remaining} slot${remaining>1?'s':''} remaining on ${plan} plan`:`All slots used â€” upgrade for more`}
        </div>
        {[{l:'Business Name *',v:name,s:setName,p:'e.g. Austin Plumbing Pros',r:true},
          {l:'City / State',v:city,s:setCity,p:'e.g. Austin, TX'},
          {l:'Business Type',v:cat,s:setCat,p:'e.g. Plumber, HVAC, Dentist'},
          {l:'Business Description',v:desc,s:setDesc,p:'Describe the business in 2-3 sentences...'},
          {l:'Keywords (comma separated)',v:keywords,s:setKeywords,p:'plumber, drain cleaning, water heater'}
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
          <button onClick={async()=>{ if(!name.trim()||saving||remaining<=0)return; setSaving(true); await onCreate({name:name.trim(),city:city.trim(),category:cat.trim(),desc:desc.trim(),keywords:keywords.trim()}); setSaving(false) }}
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



