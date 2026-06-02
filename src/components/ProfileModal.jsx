// src/components/ProfileModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  'Home Services','Restaurant','Healthcare','Finance','Legal',
  'Retail','Real Estate','Automotive','Beauty & Wellness',
  'Education','Technology','General'
]

export default function ProfileModal({ session, activeId, subscription, onClose, onResetPassword, onBilling, iframeRef }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({
    bizName:'', bizCat:'', bizAddr:'', bizCity:'', bizState:'',
    bizZip:'', bizPhone:'', bizWebsite:'', bizDesc:'', bizKw:''
  })
  const [settings, setSettings] = useState({
    agencyName:'', brandColor:'#3b82f6'
  })

  const plan = subscription?.plan || 'solopreneur'

  useEffect(() => {
    if (!session?.user?.id) return
    const load = async () => {
      const [sRes, cRes] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', session.user.id).single(),
        activeId ? supabase.from('client_data').select('*').eq('client_id', activeId).single() : Promise.resolve({ data: null })
      ])
      if (sRes.data) {
        setSettings({
          agencyName: sRes.data.agency_name || '',
          brandColor:  sRes.data.brand_color  || '#3b82f6'
        })
      }
      if (cRes.data) {
        setProfile({
          bizName:    cRes.data.biz_name    || '',
          bizCat:     cRes.data.biz_cat     || '',
          bizAddr:    cRes.data.biz_addr    || '',
          bizCity:    cRes.data.biz_city    || '',
          bizState:   cRes.data.biz_state   || '',
          bizZip:     cRes.data.biz_zip     || '',
          bizPhone:   cRes.data.biz_phone   || '',
          bizWebsite: cRes.data.biz_website || '',
          bizDesc:    cRes.data.biz_desc    || '',
          bizKw:      cRes.data.biz_kw      || ''
        })
      }
    }
    load()
  }, [session, activeId])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await supabase.from('settings').upsert({
        user_id:      session.user.id,
        agency_name:  settings.agencyName,
        brand_color:  settings.brandColor
      }, { onConflict:'user_id' })

      if (activeId) {
        await supabase.from('client_data').upsert({
          client_id:   activeId,
          user_id:     session.user.id,
          biz_name:    profile.bizName,
          biz_cat:     profile.bizCat,
          biz_addr:    profile.bizAddr,
          biz_city:    profile.bizCity,
          biz_state:   profile.bizState,
          biz_zip:     profile.bizZip,
          biz_phone:   profile.bizPhone,
          biz_website: profile.bizWebsite,
          biz_desc:    profile.bizDesc,
          biz_kw:      profile.bizKw
        }, { onConflict:'client_id' })

        // Re-send LOAD_DATA to rankforge3 iframe so it updates live
        const sRes = await supabase.from('settings').select('*').eq('user_id', session.user.id).single()
        const s = sRes.data || {}
        iframeRef?.current?.contentWindow?.postMessage({
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
              bizName:    profile.bizName,
              bizCat:     profile.bizCat,
              bizAddr:    profile.bizAddr,
              bizCity:    profile.bizCity,
              bizState:   profile.bizState,
              bizZip:     profile.bizZip,
              bizPhone:   profile.bizPhone,
              bizWebsite: profile.bizWebsite,
              bizDesc:    profile.bizDesc,
              bizKw:      profile.bizKw,
              agencyName: settings.agencyName,
              brandColor: settings.brandColor,
            }
          }
        }, '*')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const inp = {
    width:'100%', padding:'9px 12px', background:'#07111f', color:'#e2e8f0',
    border:'1.5px solid #1a3560', borderRadius:7, fontSize:13.5, outline:'none',
    boxSizing:'border-box', transition:'.15s'
  }
  const label = { fontSize:12, fontWeight:600, color:'#60a5fa', marginBottom:4, display:'block' }
  const field = { marginBottom:14 }
  const section = { fontSize:11, fontWeight:700, color:'#1a3560', textTransform:'uppercase',
    letterSpacing:'.07em', marginBottom:12, marginTop:20, paddingBottom:6,
    borderBottom:'1px solid #0f2040' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#0d1f3c', border:'1px solid #1a3560', borderRadius:16,
        width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'hidden',
        display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.7)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'20px 24px', borderBottom:'1px solid #0f2040', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'#e2e8f0' }}>My Profile</div>
            <div style={{ fontSize:12, color:'#3a5070', marginTop:2 }}>{session.user.email}</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none',
            color:'#3a5070', cursor:'pointer', fontSize:22, lineHeight:1 }}>x</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:'auto', padding:'0 24px 24px', flex:1 }}>

          {/* Account section */}
          <div style={section}>Account</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <div style={{ background:'rgba(59,130,246,.06)', border:'1px solid #1a3560',
              borderRadius:9, padding:'10px 14px' }}>
              <div style={{ fontSize:11, color:'#3a5070', marginBottom:2 }}>Email</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#7ab4ff' }}>{session.user.email}</div>
            </div>
            <div style={{ background:'rgba(59,130,246,.06)', border:'1px solid #1a3560',
              borderRadius:9, padding:'10px 14px' }}>
              <div style={{ fontSize:11, color:'#3a5070', marginBottom:2 }}>Plan</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#7ab4ff', textTransform:'capitalize' }}>{plan}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:6 }}>
            <button onClick={onResetPassword} style={{ flex:1, padding:'8px 0',
              background:'transparent', border:'1px solid #1a3560', borderRadius:7,
              color:'#60a5fa', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
              Reset Password
            </button>
            <button onClick={onBilling} style={{ flex:1, padding:'8px 0',
              background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none',
              borderRadius:7, color:'#fff', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
              Plans and Billing
            </button>
          </div>

          {/* Agency section */}
          <div style={section}>Agency</div>
          <div style={field}>
            <label style={label}>Agency Name</label>
            <input value={settings.agencyName} onChange={e=>setSettings(s=>({...s,agencyName:e.target.value}))}
              placeholder="Your agency or business name" style={inp}
              onFocus={e=>e.target.style.borderColor='#3b82f6'}
              onBlur={e=>e.target.style.borderColor='#1a3560'} />
          </div>
          <div style={field}>
            <label style={label}>Brand Color</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={settings.brandColor}
                onChange={e=>setSettings(s=>({...s,brandColor:e.target.value}))}
                style={{ width:40, height:36, border:'1.5px solid #1a3560', borderRadius:7,
                  background:'transparent', cursor:'pointer', padding:2 }} />
              <input value={settings.brandColor} onChange={e=>setSettings(s=>({...s,brandColor:e.target.value}))}
                placeholder="#3b82f6" style={{...inp, width:'auto', flex:1}}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='#1a3560'} />
            </div>
          </div>

          {/* Business Profile section */}
          {activeId ? <>
            <div style={section}>Business Profile</div>
            <div style={field}>
              <label style={label}>Business Name</label>
              <input value={profile.bizName} onChange={e=>setProfile(p=>({...p,bizName:e.target.value}))}
                placeholder="e.g. Austin Plumbing Pros" style={inp}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='#1a3560'} />
            </div>
            <div style={field}>
              <label style={label}>Category</label>
              <select value={profile.bizCat} onChange={e=>setProfile(p=>({...p,bizCat:e.target.value}))}
                style={{...inp, cursor:'pointer'}}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={label}>Street Address</label>
              <input value={profile.bizAddr} onChange={e=>setProfile(p=>({...p,bizAddr:e.target.value}))}
                placeholder="123 Main St" style={inp}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='#1a3560'} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, marginBottom:14 }}>
              {[
                { label:'City', key:'bizCity', placeholder:'Austin' },
                { label:'State', key:'bizState', placeholder:'TX' },
                { label:'ZIP', key:'bizZip', placeholder:'78701' }
              ].map(f => (
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input value={profile[f.key]} onChange={e=>setProfile(p=>({...p,[f.key]:e.target.value}))}
                    placeholder={f.placeholder} style={inp}
                    onFocus={e=>e.target.style.borderColor='#3b82f6'}
                    onBlur={e=>e.target.style.borderColor='#1a3560'} />
                </div>
              ))}
            </div>
            <div style={field}>
              <label style={label}>Phone</label>
              <input value={profile.bizPhone} onChange={e=>setProfile(p=>({...p,bizPhone:e.target.value}))}
                placeholder="(512) 555-0100" style={inp}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='#1a3560'} />
            </div>
            <div style={field}>
              <label style={label}>Website</label>
              <input value={profile.bizWebsite} onChange={e=>setProfile(p=>({...p,bizWebsite:e.target.value}))}
                placeholder="https://yourbusiness.com" style={inp}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='#1a3560'} />
            </div>
            <div style={field}>
              <label style={label}>Keywords</label>
              <input value={profile.bizKw} onChange={e=>setProfile(p=>({...p,bizKw:e.target.value}))}
                placeholder="plumber, drain cleaning, water heater" style={inp}
                onFocus={e=>e.target.style.borderColor='#3b82f6'}
                onBlur={e=>e.target.style.borderColor='#1a3560'} />
            </div>
            <div style={field}>
              <label style={label}>Business Description</label>
              <textarea value={profile.bizDesc} onChange={e=>setProfile(p=>({...p,bizDesc:e.target.value}))}
                placeholder="Describe your business in 2-3 sentences..."
                rows={3} style={{...inp, resize:'vertical', lineHeight:1.5}} />
            </div>
          </> : (
            <div style={{ padding:'16px', background:'rgba(59,130,246,.06)', borderRadius:9,
              border:'1px solid #1a3560', fontSize:13, color:'#3a5070', marginTop:16 }}>
              Select a business from My Businesses to edit the business profile.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #0f2040', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          {error && <div style={{ fontSize:12, color:'#f87171', flex:1 }}>{error}</div>}
          {saved && <div style={{ fontSize:12, color:'#4ade80', flex:1 }}>Saved successfully</div>}
          {!error && !saved && <div style={{ flex:1 }} />}
          <button onClick={onClose} style={{ padding:'9px 20px', background:'transparent',
            border:'1px solid #1a3560', borderRadius:8, color:'#4a6080',
            fontSize:13.5, fontWeight:600, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding:'9px 24px',
            background:saving?'#1a2840':'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            border:'none', borderRadius:8, color:'#fff',
            fontSize:13.5, fontWeight:700, cursor:saving?'not-allowed':'pointer',
            boxShadow:saving?'none':'0 4px 16px rgba(59,130,246,.4)' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
