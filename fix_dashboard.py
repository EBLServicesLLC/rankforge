import re

with open('src/components/DashboardShell.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Remove all non-ASCII
content = re.sub(r'[^\x00-\x7F]', '', content)

# Step 2: Fix topbar display
content = content.replace(
    "display:'none',alignItems:'center',padding:'0 14px',gap:10 }}>",
    "display:'flex',alignItems:'center',padding:'0 14px',gap:10 }}>"
)

# Step 3: Add darkMode + showProfile states
if 'showProfile' not in content:
    content = content.replace(
        "const [showBilling, setShowBilling] = useState(false)",
        "const [showBilling, setShowBilling] = useState(false)\n  const [showProfile, setShowProfile] = useState(false)\n  const [darkMode, setDarkMode] = useState(true)"
    )

# Step 4: Add ProfileModal import
if 'ProfileModal' not in content:
    content = content.replace(
        "import BillingPage from './BillingPage'",
        "import BillingPage from './BillingPage'\nimport ProfileModal from './ProfileModal'"
    )

# Step 5: Replace right side of topbar
old_right = """{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
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
                
              </button>
            )}
          </div>
        </div>"""

new_right = """{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button onClick={()=>setDarkMode(d=>!d)} style={{ padding:'6px 10px',borderRadius:8,border:'1px solid #1a3560',background:'transparent',color:'#93c5fd',cursor:'pointer',fontSize:13,fontWeight:600 }}>{darkMode ? 'Light' : 'Dark'}</button>
            <div style={{ position:'relative' }}>
              <button onClick={()=>setUserMenuOpen(o=>!o)} style={{ display:'flex',alignItems:'center',gap:7,padding:'6px 12px',background:'rgba(59,130,246,.08)',border:'1px solid #1a3560',borderRadius:8,cursor:'pointer',color:'#93c5fd',fontSize:12.5,fontWeight:600 }}>
                <div style={{ width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff' }}>{session.user.email.charAt(0).toUpperCase()}</div>
                My Profile
              </button>
              {userMenuOpen && (
                <div style={{ position:'absolute',top:'calc(100% + 6px)',right:0,background:'#0d1f3c',border:'1px solid #1a3560',borderRadius:10,padding:6,minWidth:210,zIndex:999,boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
                  <div style={{ padding:'6px 12px 8px',borderBottom:'1px solid #1a3560',marginBottom:4 }}><div style={{ fontSize:12,fontWeight:600,color:'#7ab4ff' }}>{session.user.email}</div></div>
                  {[{label:'View Profile',action:()=>{ setShowProfile(true); setUserMenuOpen(false) }},{label:'Plans and Billing',action:()=>{ setShowBilling(true); setUserMenuOpen(false) }},{label:'Upgrade Plan',action:()=>{ setShowBilling(true); setUserMenuOpen(false) }},{label:'Cancel Subscription',action:()=>{ setShowBilling(true); setUserMenuOpen(false) }},{label:'Reset Password',action:()=>{ supabase.auth.resetPasswordForEmail(session.user.email); setUserMenuOpen(false); alert('Password reset email sent') }},{label:'Sign Out',action:()=>{ signOut(); setUserMenuOpen(false) },red:true}].map(item=>(<button key={item.label} onClick={item.action} style={{ width:'100%',padding:'8px 12px',background:'transparent',color:item.red?'#f87171':'#c8d8f0',border:'none',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer',textAlign:'left' }}>{item.label}</button>))}
                </div>
              )}
            </div>
          </div>
        </div>"""

if old_right in content:
    content = content.replace(old_right, new_right)
    print("Step 5 OK: My Profile + Dark/Light added")
else:
    print("Step 5 SKIP: already applied")

# Step 6: Replace AddModal with full version
old_modal_start = 'function AddModal({ onClose, onCreate, remaining, plan }) {'
idx = content.find(old_modal_start)
end = content.find('\n}\n', idx) + 3

new_modal = '''function AddModal({ onClose, onCreate, remaining, plan }) {
  const [name,setName]=useState('')
  const [addr,setAddr]=useState('')
  const [city,setCity]=useState('')
  const [state,setState]=useState('')
  const [zip,setZip]=useState('')
  const [phone,setPhone]=useState('')
  const [website,setWebsite]=useState('')
  const [cat,setCat]=useState('')
  const [desc,setDesc]=useState('')
  const [keywords,setKeywords]=useState('')
  const [saving,setSaving]=useState(false)
  const CATS = ['Home Services','Restaurant','Healthcare','Finance','Legal','Retail','Real Estate','Automotive','Beauty & Wellness','Education','Technology','General']
  const inp = { width:'100%',padding:'9px 12px',background:'#07111f',color:'#e2e8f0',border:'1.5px solid #1a3560',borderRadius:7,fontSize:13.5,outline:'none',boxSizing:'border-box' }
  const lbl = { fontSize:12,fontWeight:600,color:'#60a5fa',marginBottom:4,display:'block' }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#0d1f3c',border:'1px solid #1a3560',borderRadius:16,padding:'28px 32px',width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontSize:17,fontWeight:800,color:'#e2e8f0' }}>Add New Business</div>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#3a5080',cursor:'pointer',fontSize:20 }}>x</button>
        </div>
        <div style={{ background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:8,padding:'8px 12px',marginBottom:18,fontSize:12,color:'#60a5fa' }}>
          {remaining>0?`${remaining} slot${remaining>1?'s':''} remaining on ${plan} plan`:`All slots used - upgrade for more`}
        </div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Business Name *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Austin Plumbing Pros" required style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Category</label>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={{...inp,cursor:'pointer'}}>
            <option value="">Select category...</option>
            {CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </select></div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Street Address</label>
          <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder="123 Main St" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
        <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8,marginBottom:12 }}>
          <div><label style={lbl}>City</label><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Austin" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
          <div><label style={lbl}>State</label><input value={state} onChange={e=>setState(e.target.value)} placeholder="TX" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
          <div><label style={lbl}>ZIP</label><input value={zip} onChange={e=>setZip(e.target.value)} placeholder="78701" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
        </div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Phone</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(512) 555-0100" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Website</label>
          <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourbusiness.com" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Keywords (comma separated)</label>
          <input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="plumber, drain cleaning, water heater" style={inp} onFocus={e=>e.target.style.borderColor='#3b82f6'} onBlur={e=>e.target.style.borderColor='#1a3560'} /></div>
        <div style={{ marginBottom:12 }}><label style={lbl}>Business Description</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe the business in 2-3 sentences..." rows={3} style={{...inp,resize:'vertical',lineHeight:1.5}} /></div>
        <div style={{ display:'flex',gap:10,marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px 0',background:'transparent',color:'#4a6080',border:'1px solid #1a3560',borderRadius:8,fontSize:13.5,fontWeight:600,cursor:'pointer' }}>Cancel</button>
          <button onClick={async()=>{ if(!name.trim()||saving||remaining<=0)return; setSaving(true); await onCreate({name:name.trim(),addr:addr.trim(),city:city.trim(),state:state.trim(),zip:zip.trim(),phone:phone.trim(),website:website.trim(),category:cat,desc:desc.trim(),keywords:keywords.trim()}); setSaving(false) }}
            disabled={!name.trim()||saving||remaining<=0}
            style={{ flex:2,padding:'10px 0',background:!name.trim()||saving||remaining<=0?'#0d1f3c':'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:!name.trim()||saving||remaining<=0?'#2a4060':'#fff',border:'none',borderRadius:8,fontSize:13.5,fontWeight:700,cursor:'pointer' }}>
            {saving?'Creating...':'Create Business'}
          </button>
        </div>
      </div>
    </div>
  )
}
'''

if 'setAddr' not in content[idx:end]:
    content = content[:idx] + new_modal + content[end:]
    print("Step 6 OK: AddModal replaced with full fields")
else:
    print("Step 6 SKIP: already has full fields")

# Step 7: Add ProfileModal render
if 'showProfile &&' not in content:
    content = content.replace(
        "{showAddModal && (",
        """{showProfile && (
        <ProfileModal
          session={session}
          activeId={activeId || (clients.length > 0 ? clients[0].id : null)}
          subscription={subscription}
          onClose={()=>setShowProfile(false)}
          onResetPassword={async()=>{ await supabase.auth.resetPasswordForEmail(session.user.email); alert('Password reset email sent to ' + session.user.email) }}
          onBilling={()=>{ setShowProfile(false); setShowBilling(true) }}
          iframeRef={iframeRef}
        />
      )}
      {showAddModal && ("""
    )
    print("Step 7 OK: ProfileModal render added")
else:
    print("Step 7 SKIP: already present")

print("\nFinal checks:")
print("My Profile:", "My Profile" in content)
print("darkMode:", "darkMode" in content)
print("setAddr:", "setAddr" in content)
print("showProfile:", "showProfile" in content)

with open('src/components/DashboardShell.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("DONE - file saved.")
