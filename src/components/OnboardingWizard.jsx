// src/components/OnboardingWizard.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const LOGO = 'data:image/png;base64,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'

const PLANS = {
  solopreneur: { label:'Solopreneur', price:'$97/mo',  clients:1,  color:'#60a5fa', types:['local'] },
  deluxe:      { label:'Deluxe',      price:'$197/mo', clients:3,  color:'#8b5cf6', types:['local','regional'] },
  pro:         { label:'Pro',         price:'$397/mo', clients:5,  color:'#06b6d4', types:['local','regional','national'] },
  agency:      { label:'Agency',      price:'$997/mo', clients:25, color:'#10b981', types:['local','regional','national'] },
}

const SEO_TYPES = {
  local:    { icon:'📍', label:'Local SEO',    desc:'Rank in your city — Google Maps, local citations, reviews' },
  regional: { icon:'🗺️',  label:'Regional SEO', desc:'Target multiple cities — service area pages, regional keywords' },
  national: { icon:'🌐', label:'National SEO', desc:'Rank nationwide — topic clusters, authority building, PR' },
}

const API_GUIDES = [
  {
    key:'anthropic', label:'Anthropic (Claude AI)', required:true, color:'#f59e0b', icon:'🤖',
    why:'Powers all 11 AI agents — content writing, weekly reports, keyword briefs, outreach emails. Most important key.',
    steps:[
      'Go to console.anthropic.com and sign up or log in',
      'Click "API Keys" in the left sidebar',
      'Click "+ Create Key" and name it "RankForged AI"',
      'Copy the key — it starts with sk-ant-',
      'Paste it in the field below',
    ],
    link:'https://console.anthropic.com', linkLabel:'Open Anthropic Console →', placeholder:'sk-ant-api03-...',
  },
  {
    key:'openai', label:'OpenAI (ChatGPT)', required:false, color:'#10b981', icon:'💬',
    why:'Enables ChatGPT-powered content generation as an alternative to Claude. Use either or both.',
    steps:[
      'Go to platform.openai.com and sign up or log in',
      'Click your profile icon → "API Keys"',
      'Click "+ Create new secret key" — name it "RankForged AI"',
      'Copy the key — it starts with sk-',
      'Paste it in the field below',
    ],
    link:'https://platform.openai.com/api-keys', linkLabel:'Open OpenAI Platform →', placeholder:'sk-...',
  },
  {
    key:'google', label:'Google Search Console API', required:false, color:'#4285f4', icon:'🔍',
    why:'Shows real keyword rankings and click data from Google. Unlocks the Keyword Opportunity Spotter agent.',
    steps:[
      'Go to console.cloud.google.com',
      'Create a new project or select existing',
      'Search for "Search Console API" and enable it',
      'Go to Credentials → Create Credentials → API Key',
      'Copy the key and paste below',
    ],
    link:'https://console.cloud.google.com', linkLabel:'Open Google Cloud Console →', placeholder:'AIza...',
  },
  {
    key:'gemini', label:'Google Gemini AI', required:false, color:'#ea4335', icon:'✨',
    why:'Googles Gemini AI model for content generation. Alternative or supplement to Claude and ChatGPT.',
    steps:[
      'Go to aistudio.google.com',
      'Sign in with your Google account',
      'Click "Get API Key" in the left sidebar',
      'Click "Create API Key"',
      'Copy and paste the key below',
    ],
    link:'https://aistudio.google.com', linkLabel:'Open Google AI Studio →', placeholder:'AIza...',
  },
  {
    key:'yext', label:'Yext Listings', required:false, color:'#fc3d21', icon:'📋',
    why:'Automates citation submission to 100+ directories simultaneously. Saves hours of manual work.',
    steps:[
      'Go to yext.com and sign up for an account',
      'Go to Account Settings → API Keys',
      'Generate a new API key',
      'Also copy your Account ID from the same page',
      'Paste both below',
    ],
    link:'https://www.yext.com', linkLabel:'Open Yext →', placeholder:'your-yext-api-key',
  },
  {
    key:'moz', label:'Moz (Domain Authority)', required:false, color:'#007bff', icon:'📊',
    why:'Provides Domain Authority scores for competitor analysis and backlink prospecting.',
    steps:[
      'Go to moz.com/products/api and sign up',
      'Go to your Moz account → API Access',
      'Find your Access ID and Secret Key',
      'Paste both below',
    ],
    link:'https://moz.com/products/api', linkLabel:'Open Moz API →', placeholder:'mozscape-...',
  },
  {
    key:'brightlocal', label:'BrightLocal', required:false, color:'#ff6b35', icon:'📍',
    why:'Advanced local SEO rank tracking and citation management across multiple locations.',
    steps:[
      'Go to brightlocal.com and sign up',
      'Go to Account → API Keys',
      'Generate a new API key',
      'Also note your Campaign ID if you have one',
      'Paste below',
    ],
    link:'https://www.brightlocal.com', linkLabel:'Open BrightLocal →', placeholder:'your-brightlocal-key',
  },
  {
    key:'indexnow', label:'IndexNow', required:false, color:'#0891b2', icon:'⚡',
    why:'Instantly notifies search engines when you publish new content. Dramatically speeds up indexing.',
    steps:[
      'Go to indexnow.org/en/documentation',
      'Generate a free key using their tool',
      'Add the key file to your website root folder',
      'Verify it at yourdomain.com/your-key.txt',
      'Paste the key below',
    ],
    link:'https://www.indexnow.org/en/documentation', linkLabel:'Open IndexNow Docs →', placeholder:'your-indexnow-key',
  },
  {
    key:'gmail', label:'Gmail (Email Sending)', required:false, color:'#ea4335', icon:'📧',
    why:'Sends automated weekly reports and review request emails directly from your Gmail account.',
    steps:[
      'Go to Google OAuth Playground: oauth.com/playground',
      'Select "Gmail API v1" scope',
      'Click "Authorize APIs" and sign in with Gmail',
      'Click "Exchange authorization code for tokens"',
      'Copy the Access Token (starts with ya29.)',
      'Note: tokens expire — you will need to refresh periodically',
    ],
    link:'https://developers.google.com/oauthplayground', linkLabel:'Open OAuth Playground →', placeholder:'ya29...',
  },
]

export default function OnboardingWizard({ userId, userEmail, onComplete }) {
  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const [activationKey, setActivationKey] = useState('')
  const [keyValid, setKeyValid]           = useState(false)
  const [keyData, setKeyData]             = useState(null)
  const [validating, setValidating]       = useState(false)

  const [profile, setProfile] = useState({
    bizName:'', city:'', state:'', category:'', phone:'', website:'', desc:'', keywords:''
  })

  const [seoTypes, setSeoTypes] = useState(['local'])

  const [apiKeys, setApiKeys] = useState({
    anthropic:'', openai:'', google:'', gemini:'',
    yext:'', yextAccount:'', moz:'', mozSecret:'',
    brightlocal:'', brightlocalCid:'', indexnow:'', gmail:''
  })
  const [showKey, setShowKey]     = useState({})
  const [expanded, setExpanded]   = useState({ anthropic:true })

  const [branding, setBranding] = useState({ agencyName:'', brandColor:'#3b82f6', tagline:'' })

  const STEPS = [
    { id:'activate', label:'Activate', icon:'🔑' },
    { id:'profile',  label:'Business', icon:'🏢' },
    { id:'seo-type', label:'SEO Type', icon:'🎯' },
    { id:'api-keys', label:'API Keys', icon:'⚙️' },
    { id:'branding', label:'Branding', icon:'🎨' },
    { id:'launch',   label:'Launch',   icon:'🚀' },
  ]

  const validateKey = async () => {
    if (!activationKey.trim()) { setError('Enter your activation key'); return }
    setValidating(true); setError('')
    const { data, error } = await supabase
      .from('activation_keys').select('*')
      .eq('key', activationKey.trim().toUpperCase()).single()
    if (error || !data) { setError('Invalid activation key — check your email and try again'); setValidating(false); return }
    if (data.used)       { setError('This key has already been used. Contact support if this is an error.'); setValidating(false); return }
    setKeyData(data); setKeyValid(true)
    setSeoTypes(PLANS[data.plan]?.types || ['local'])
    setValidating(false)
  }

  const nextStep = async () => {
    setError(''); setSaving(true)
    try {
      if (step === 0) {
        await supabase.from('activation_keys').update({ used:true, used_by:userId, used_at:new Date().toISOString() }).eq('key', keyData.key)
        await supabase.from('subscriptions').upsert({ user_id:userId, plan:keyData.plan, max_clients:keyData.max_clients, seo_types:PLANS[keyData.plan]?.types||['local'], activation_key:keyData.key, onboarding_step:1, status:'active' }, { onConflict:'user_id' })
      }
      if (step === 1) {
        await supabase.from('settings').upsert({ user_id:userId, agency_name:branding.agencyName||profile.bizName }, { onConflict:'user_id' })
        await supabase.from('subscriptions').update({ onboarding_step:2 }).eq('user_id', userId)
      }
      if (step === 2) {
        await supabase.from('subscriptions').update({ seo_types:seoTypes, onboarding_step:3 }).eq('user_id', userId)
      }
      if (step === 3) {
        await supabase.from('settings').upsert({
          user_id:userId,
          anthropic_key:apiKeys.anthropic, google_key:apiKeys.google,
          indexnow_key:apiKeys.indexnow,   yext_key:apiKeys.yext,
          yext_account:apiKeys.yextAccount, moz_id:apiKeys.moz,
          moz_secret:apiKeys.mozSecret,    brightlocal_key:apiKeys.brightlocal,
          brightlocal_cid:apiKeys.brightlocalCid, gmail_token:apiKeys.gmail,
        }, { onConflict:'user_id' })
        await supabase.from('subscriptions').update({ onboarding_step:4 }).eq('user_id', userId)
      }
      if (step === 4) {
        await supabase.from('settings').upsert({ user_id:userId, agency_name:branding.agencyName, brand_color:branding.brandColor, agency_tagline:branding.tagline }, { onConflict:'user_id' })
        await supabase.from('subscriptions').update({ onboarding_step:5 }).eq('user_id', userId)
      }
      if (step === 5) {
        if (profile.bizName) {
          const { data: client } = await supabase.from('clients').insert({ user_id:userId, name:profile.bizName, city:profile.city }).select().single()
          if (client) {
            await supabase.from('client_data').insert({
              client_id:client.id, user_id:userId,
              biz_name:profile.bizName, biz_city:profile.city, biz_state:profile.state,
              biz_cat:profile.category, biz_phone:profile.phone, biz_website:profile.website,
              biz_desc:profile.desc, biz_kw:profile.keywords,
            })
          }
        }
        await supabase.from('subscriptions').update({ onboarding_completed:true, onboarding_step:99 }).eq('user_id', userId)
        onComplete(); return
      }
      setStep(s => s + 1)
    } catch(e) { setError('Something went wrong: ' + e.message) }
    setSaving(false)
  }

  const prevStep = () => { setStep(s => Math.max(0, s-1)); setError('') }

  // ── Shared styles ─────────────────────────────────
  const inp = {
    width:'100%', padding:'11px 14px',
    background:'#07111f', color:'#e2e8f0',
    border:'1.5px solid #1e3a5f', borderRadius:8,
    fontSize:14, outline:'none', boxSizing:'border-box',
    marginBottom:12, transition:'border-color .15s',
  }
  const lbl = { fontSize:13, fontWeight:600, color:'#93c5fd', marginBottom:4, display:'block' }
  const hint = { fontSize:13, color:'#64748b', marginBottom:16, lineHeight:1.7 }

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'linear-gradient(160deg, #060d1a 0%, #0a1628 50%, #070e1c 100%)',
      fontFamily:"'Segoe UI', system-ui, sans-serif",
      overflowY:'scroll',
      overflowX:'hidden',
    }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 16px 64px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginBottom:32 }}>
          <img src={LOGO} alt="" style={{ width:44, height:44, objectFit:'contain' }}
            onError={e => e.target.style.display='none'} />
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0' }}>RankForged AI</div>
            <div style={{ fontSize:11, color:'#60a5fa', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase' }}>Setup Wizard</div>
          </div>
        </div>

        {/* Progress steps */}
        <div style={{ background:'#0d1f3c', borderRadius:14, padding:'16px 20px', marginBottom:24, border:'1px solid #1a3560' }}>
          <div style={{ display:'flex', justifyContent:'space-between', position:'relative' }}>
            {/* connecting line */}
            <div style={{ position:'absolute', top:17, left:'6%', right:'6%', height:2, background:'#1a3560', zIndex:0 }} />
            <div style={{ position:'absolute', top:17, left:'6%', height:2, background:'#3b82f6', zIndex:1, width:`${(step/(STEPS.length-1))*88}%`, transition:'width .3s' }} />
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, zIndex:2, flex:1 }}>
                <div style={{
                  width:34, height:34, borderRadius:'50%', fontSize: i < step ? 14 : 16,
                  background: i < step ? '#3b82f6' : i === step ? '#3b82f6' : '#0a1628',
                  border:'2px solid ' + (i <= step ? '#3b82f6' : '#1a3560'),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: i <= step ? '#fff' : '#3a5580',
                  boxShadow: i === step ? '0 0 0 4px rgba(59,130,246,.15)' : 'none',
                  transition:'.2s',
                }}>
                  {i < step ? '✓' : s.icon}
                </div>
                <div style={{ fontSize:10.5, fontWeight: i === step ? 700 : 500, color: i === step ? '#60a5fa' : i < step ? '#3b82f6' : '#2a4060', whiteSpace:'nowrap' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div style={{ background:'#0d1f3c', borderRadius:16, padding:'32px 36px', border:'1px solid #1a3560', marginBottom:16 }}>

          {/* STEP 0 — ACTIVATION KEY */}
          {step === 0 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>🔑 Activate Your Account</div>
              <p style={hint}>
                Enter the activation key from your purchase confirmation email.
                It looks like <code style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:6, color:'#60a5fa', fontSize:12.5 }}>RFA-XXXX-XXXX-XXXX</code>
              </p>

              <label style={lbl}>Activation Key</label>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <input
                  value={activationKey}
                  onChange={e => { setActivationKey(e.target.value.toUpperCase()); setKeyValid(false) }}
                  placeholder="RFA-SOLO-XXXX-XXXX"
                  onKeyDown={e => e.key==='Enter' && validateKey()}
                  style={{ ...inp, marginBottom:0, flex:1, letterSpacing:'.08em', fontFamily:'monospace', fontSize:15, fontWeight:600 }}
                />
                <button onClick={validateKey} disabled={validating||keyValid} style={{
                  padding:'11px 22px', borderRadius:8, border:'none', flexShrink:0,
                  background: keyValid ? '#10b981' : '#3b82f6',
                  color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
                }}>
                  {validating ? 'Checking...' : keyValid ? '✓ Valid' : 'Validate'}
                </button>
              </div>

              {keyValid && keyData && (
                <div style={{ background:'rgba(16,185,129,.1)', border:'1.5px solid rgba(16,185,129,.4)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#4ade80', marginBottom:12 }}>✅ Key activated successfully!</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[['Plan',PLANS[keyData.plan]?.label],['Price',PLANS[keyData.plan]?.price],['Businesses',keyData.max_clients],['SEO Types',PLANS[keyData.plan]?.types.join(', ')]].map(([k,v])=>(
                      <div key={k} style={{ background:'rgba(0,0,0,.2)', borderRadius:8, padding:'8px 12px', border:'1px solid rgba(16,185,129,.2)' }}>
                        <div style={{ fontSize:10.5, color:'rgba(16,185,129,.6)', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                        <div style={{ fontSize:13.5, color:'#e2e8f0', fontWeight:600, textTransform:'capitalize' }}>{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'14px 16px', border:'1px solid #1a3560' }}>
                <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
                  <strong style={{ color:'#94a3b8' }}>Testing?</strong> Use key <code style={{ background:'#e2e8f0', padding:'1px 6px', borderRadius:4, fontSize:12 }}>RFA-SOLO-TEST-0001</code> to try the wizard.
                  <br/>Don't have a key? <a href="#" style={{ color:'#60a5fa', fontWeight:600 }}>Purchase a plan →</a>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — BUSINESS PROFILE */}
          {step === 1 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>🏢 Your Business Profile</div>
              <p style={hint}>This data powers every agent, report, and piece of content. Fill it in as completely as possible — you can always update it later.</p>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Business Name *</label>
                  <input value={profile.bizName} onChange={e=>setProfile(p=>({...p,bizName:e.target.value}))} placeholder="e.g. Austin Plumbing Pros" style={inp} />
                </div>
                <div>
                  <label style={lbl}>City *</label>
                  <input value={profile.city} onChange={e=>setProfile(p=>({...p,city:e.target.value}))} placeholder="e.g. Austin" style={inp} />
                </div>
                <div>
                  <label style={lbl}>State</label>
                  <input value={profile.state} onChange={e=>setProfile(p=>({...p,state:e.target.value}))} placeholder="e.g. TX" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Business Category</label>
                  <input value={profile.category} onChange={e=>setProfile(p=>({...p,category:e.target.value}))} placeholder="e.g. Plumber, HVAC, Dentist" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Phone Number</label>
                  <input value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} placeholder="(555) 123-4567" style={inp} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Website URL</label>
                  <input value={profile.website} onChange={e=>setProfile(p=>({...p,website:e.target.value}))} placeholder="https://yourbusiness.com" style={inp} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Services / Keywords <span style={{ fontWeight:400, color:'#2a4a6a' }}>(comma separated)</span></label>
                  <input value={profile.keywords} onChange={e=>setProfile(p=>({...p,keywords:e.target.value}))} placeholder="plumber, drain cleaning, water heater repair, pipe replacement" style={inp} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Business Description</label>
                  <textarea value={profile.desc} onChange={e=>setProfile(p=>({...p,desc:e.target.value}))}
                    placeholder="Describe what your business does, who you serve, and what makes you different..."
                    rows={3} style={{ ...inp, resize:'vertical', fontFamily:'inherit' }} />
                </div>
              </div>

              <div style={{ background:'rgba(59,130,246,.08)', borderRadius:10, padding:'12px 16px', border:'1px solid rgba(59,130,246,.25)' }}>
                <div style={{ fontSize:12.5, color:'#93c5fd', lineHeight:1.6 }}>
                  💡 <strong>Tip:</strong> Add your top 5-8 services as keywords. The AI agents use these to write city-specific content and find keyword opportunities.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — SEO TYPE */}
          {step === 2 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>🎯 What Type of SEO Do You Need?</div>
              <p style={hint}>
                Your <strong style={{ color:'#e2e8f0' }}>{PLANS[keyData?.plan]?.label}</strong> plan includes:{' '}
                <strong style={{ color:'#60a5fa' }}>{PLANS[keyData?.plan]?.types.join(', ')} SEO</strong>.
                Select what applies to your business.
              </p>

              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
                {Object.entries(SEO_TYPES).map(([type, info]) => {
                  const available = PLANS[keyData?.plan]?.types.includes(type)
                  const selected  = seoTypes.includes(type)
                  return (
                    <div key={type} onClick={()=>{ if(!available) return; setSeoTypes(p=>selected?p.filter(t=>t!==type):[...p,type]) }}
                      style={{
                        padding:'18px 20px', borderRadius:12,
                        cursor: available ? 'pointer' : 'not-allowed',
                        background: selected ? 'rgba(59,130,246,.12)' : 'rgba(255,255,255,.03)',
                        border: selected ? '2px solid #3b82f6' : '2px solid #1a3560',
                        opacity: available ? 1 : .5, transition:'.15s',
                        display:'flex', alignItems:'center', gap:16,
                      }}>
                      <div style={{ fontSize:30, flexShrink:0 }}>{info.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700, color: selected ? '#60a5fa' : '#94a3b8', marginBottom:3 }}>
                          {info.label}
                          {!available && <span style={{ fontSize:11, marginLeft:8, color:'#94a3b8', fontWeight:400 }}>(upgrade required)</span>}
                        </div>
                        <div style={{ fontSize:12.5, color:'#3a5570', lineHeight:1.5 }}>{info.desc}</div>
                      </div>
                      <div style={{
                        width:24, height:24, borderRadius:6, flexShrink:0,
                        background: selected ? '#3b82f6' : '#07111f',
                        border: '2px solid ' + (selected ? '#3b82f6' : '#1a3560'),
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, color:'#fff',
                      }}>{selected?'✓':''}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ background:'rgba(16,185,129,.08)', borderRadius:10, padding:'12px 16px', border:'1px solid rgba(16,185,129,.25)' }}>
                <div style={{ fontSize:12.5, color:'#4ade80', lineHeight:1.6 }}>
                  💡 <strong>Not sure?</strong> Start with Local SEO — it shows the fastest results. You can enable Regional and National later as your business grows.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — API KEYS */}
          {step === 3 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>⚙️ Connect Your API Keys</div>
              <p style={hint}>
                API keys connect RankForged AI to external services. The <strong style={{ color:'#e2e8f0' }}>Anthropic key is required</strong> to enable AI agents.
                All others are optional — add them now or later from the API Keys tab.
              </p>

              <div style={{ background:'rgba(59,130,246,.08)', borderRadius:10, padding:'11px 16px', marginBottom:20, border:'1px solid rgba(59,130,246,.2)', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>🔒</span>
                <div style={{ fontSize:12.5, color:'#93c5fd' }}>Keys are stored securely in your account and never shared. You can update or remove them anytime.</div>
              </div>

              {/* Required first */}
              {[...API_GUIDES.filter(g=>g.required), ...API_GUIDES.filter(g=>!g.required)].map(guide => {
                const isOpen = expanded[guide.key]
                const hasValue = apiKeys[guide.key]
                return (
                  <div key={guide.key} style={{
                    border: hasValue ? '1.5px solid rgba(16,185,129,.5)' : '1.5px solid #1a3560',
                    borderRadius:12, marginBottom:10, overflow:'hidden',
                    background: hasValue ? 'rgba(16,185,129,.06)' : '#07111f',
                  }}>
                    {/* Header row */}
                    <div onClick={()=>setExpanded(e=>({...e,[guide.key]:!e[guide.key]}))}
                      style={{ padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, background:'transparent' }}>
                      <span style={{ fontSize:22, flexShrink:0 }}>{guide.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{guide.label}</span>
                          {guide.required && <span style={{ fontSize:10.5, background:'#fef3c7', color:'#d97706', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>REQUIRED</span>}
                          {!guide.required && <span style={{ fontSize:10.5, background:'#eff6ff', color:'#3b82f6', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>OPTIONAL</span>}
                          {hasValue && <span style={{ fontSize:10.5, background:'#f0fdf4', color:'#16a34a', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>✓ ADDED</span>}
                        </div>
                        <div style={{ fontSize:12, color:'#4a6080', marginTop:2 }}>{guide.why}</div>
                      </div>
                      <span style={{ color:'#1a3560', fontSize:12, flexShrink:0 }}>{isOpen?'▲':'▼'}</span>
                    </div>

                    {/* Expanded content */}
                    {isOpen && (
                      <div style={{ padding:'0 18px 18px', borderTop:'1px solid #1a3560' }}>
                        {/* Steps */}
                        <div style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'14px 16px', margin:'12px 0', border:'1px solid #1a3560' }}>
                          <div style={{ fontSize:11.5, fontWeight:700, color:'#2a4a6a', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>How to get this key:</div>
                          {guide.steps.map((s,i) => (
                            <div key={i} style={{ display:'flex', gap:10, marginBottom:7, fontSize:13, color:'#7a9ab8', lineHeight:1.5 }}>
                              <span style={{ width:20, height:20, borderRadius:'50%', background:'rgba(59,130,246,.2)', color:'#93c5fd', fontSize:11, fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
                              {s}
                            </div>
                          ))}
                          <a href={guide.link} target="_blank" rel="noopener noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:6, fontSize:12.5, color:'#93c5fd', fontWeight:600, textDecoration:'none' }}>
                            🔗 {guide.linkLabel}
                          </a>
                        </div>

                        {/* Input */}
                        <label style={lbl}>{guide.label} Key</label>
                        <div style={{ position:'relative' }}>
                          <input
                            type={showKey[guide.key] ? 'text' : 'password'}
                            value={apiKeys[guide.key]}
                            onChange={e=>setApiKeys(k=>({...k,[guide.key]:e.target.value}))}
                            placeholder={guide.placeholder}
                            style={{ ...inp, marginBottom:0, paddingRight:70, fontFamily:'monospace', fontSize:13 }}
                          />
                          <button onClick={()=>setShowKey(s=>({...s,[guide.key]:!s[guide.key]}))}
                            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:12, padding:'4px 8px' }}>
                            {showKey[guide.key]?'Hide':'Show'}
                          </button>
                        </div>

                        {/* Extra field for Yext account */}
                        {guide.key==='yext' && (
                          <>
                            <label style={{ ...lbl, marginTop:8 }}>Yext Account ID</label>
                            <input value={apiKeys.yextAccount} onChange={e=>setApiKeys(k=>({...k,yextAccount:e.target.value}))} placeholder="your-account-id" style={inp} />
                          </>
                        )}
                        {guide.key==='moz' && (
                          <>
                            <label style={{ ...lbl, marginTop:8 }}>Moz Secret Key</label>
                            <input type={showKey.mozSecret?'text':'password'} value={apiKeys.mozSecret} onChange={e=>setApiKeys(k=>({...k,mozSecret:e.target.value}))} placeholder="moz-secret-..." style={inp} />
                          </>
                        )}
                        {guide.key==='brightlocal' && (
                          <>
                            <label style={{ ...lbl, marginTop:8 }}>BrightLocal Campaign ID <span style={{ fontWeight:400, color:'#2a4a6a' }}>(optional)</span></label>
                            <input value={apiKeys.brightlocalCid} onChange={e=>setApiKeys(k=>({...k,brightlocalCid:e.target.value}))} placeholder="campaign-id" style={inp} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* STEP 4 — BRANDING */}
          {step === 4 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>🎨 Your Branding</div>
              <p style={hint}>Personalise your reports and client content. This appears on weekly reports, PDF exports, and email headers.</p>

              <label style={lbl}>Agency / Business Name</label>
              <input value={branding.agencyName} onChange={e=>setBranding(b=>({...b,agencyName:e.target.value}))} placeholder={profile.bizName||"Your Agency Name"} style={inp} />

              <label style={lbl}>Tagline <span style={{ fontWeight:400, color:'#2a4a6a' }}>(optional)</span></label>
              <input value={branding.tagline} onChange={e=>setBranding(b=>({...b,tagline:e.target.value}))} placeholder="Local SEO That Gets Results" style={inp} />

              <label style={lbl}>Brand Color</label>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16 }}>
                <input type="color" value={branding.brandColor} onChange={e=>setBranding(b=>({...b,brandColor:e.target.value}))}
                  style={{ width:46, height:46, border:'2px solid #e2e8f0', borderRadius:8, cursor:'pointer', padding:2 }} />
                <input value={branding.brandColor} onChange={e=>setBranding(b=>({...b,brandColor:e.target.value}))}
                  placeholder="#3b82f6" style={{ ...inp, marginBottom:0, flex:1, fontFamily:'monospace' }} />
                <div style={{ display:'flex', gap:6 }}>
                  {['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'].map(c=>(
                    <div key={c} onClick={()=>setBranding(b=>({...b,brandColor:c}))} style={{ width:26, height:26, borderRadius:6, background:c, cursor:'pointer', border: branding.brandColor===c?'3px solid #0f172a':'3px solid transparent' }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{ background:'rgba(255,255,255,.03)', borderRadius:12, padding:'16px 20px', border:'1px solid #1a3560' }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:'#2a4a6a', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Report Header Preview</div>
                <div style={{ background:branding.brandColor, borderRadius:8, padding:'14px 18px' }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>{branding.agencyName||profile.bizName||'Your Agency'}</div>
                  {branding.tagline && <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginTop:3 }}>{branding.tagline}</div>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — LAUNCH */}
          {step === 5 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:12 }}>🚀</div>
              <div style={{ fontSize:26, fontWeight:800, color:'#e2e8f0', marginBottom:8 }}>You're all set!</div>
              <p style={{ ...hint, maxWidth:440, margin:'0 auto 28px' }}>
                Your account is configured and your first business is ready. Click Launch to open the RankForged AI dashboard.
              </p>

              {/* Summary */}
              <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid #1a3560', borderRadius:12, padding:'20px 24px', marginBottom:24, textAlign:'left' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2a4a6a', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Setup Summary</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    ['Business',  profile.bizName||'—'],
                    ['Location',  [profile.city,profile.state].filter(Boolean).join(', ')||'—'],
                    ['Plan',      PLANS[keyData?.plan]?.label||'—'],
                    ['SEO Types', seoTypes.join(', ')],
                    ['AI Agents', apiKeys.anthropic?'✅ Enabled':'⚠️ Add Anthropic key'],
                    ['Branding',  branding.agencyName||profile.bizName||'—'],
                  ].map(([k,v])=>(
                    <div key={k} style={{ background:'rgba(255,255,255,.04)', borderRadius:8, padding:'10px 14px', border:'1px solid #1a3560' }}>
                      <div style={{ fontSize:10.5, color:'#2a4a6a', fontWeight:700, textTransform:'uppercase', marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:13.5, color:'#e2e8f0', fontWeight:600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* First steps */}
              <div style={{ background:'rgba(59,130,246,.08)', borderRadius:12, padding:'16px 20px', border:'1px solid rgba(59,130,246,.25)', textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#60a5fa', marginBottom:10 }}>🎯 Recommended first steps:</div>
                {[
                  'Run the GBP Health Monitor to score your Google Business Profile',
                  'Submit to the top 20 citation directories with one click',
                  'Run the Keyword Opportunity Spotter to find quick ranking wins',
                  'Set up your Weekly Report scheduler for automated client reports',
                ].map((tip,i)=>(
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'#60a5fa' }}>
                    <span style={{ flexShrink:0 }}>→</span>{tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, fontSize:13, color:'#f87171' }}>
              {error}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'1px solid #1a3560' }}>
            <button onClick={prevStep} disabled={step===0} style={{
              padding:'11px 24px', borderRadius:8, fontSize:14, fontWeight:600, cursor: step===0?'not-allowed':'pointer',
              background:'rgba(255,255,255,.05)', color: step===0?'#1a3560':'#7a9ab8', border:'1.5px solid #1a3560',
            }}>
              ← Back
            </button>
            <div style={{ fontSize:12, color:'#1a3560' }}>Step {step+1} of {STEPS.length}</div>
            <button onClick={nextStep} disabled={saving||(step===0&&!keyValid)} style={{
              padding:'11px 28px', borderRadius:8, border:'none', fontSize:14, fontWeight:700,
              cursor:(saving||(step===0&&!keyValid))?'not-allowed':'pointer',
              background:(saving||(step===0&&!keyValid))?'#e2e8f0':'#3b82f6',
              color:(saving||(step===0&&!keyValid))?'#94a3b8':'#fff',
              boxShadow:(saving||(step===0&&!keyValid))?'none':'0 4px 12px rgba(59,130,246,.35)',
            }}>
              {saving?'Saving...':step===5?'🚀 Launch RankForged AI':'Continue →'}
            </button>
          </div>
        </div>

        <div style={{ textAlign:'center', fontSize:12, color:'#1a3560' }}>
          Need help? Email <a href="mailto:support@rankforgedai.com" style={{ color:'#3b82f6' }}>support@rankforgedai.com</a>
        </div>
      </div>
    </div>
  )
}