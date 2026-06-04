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
  local:    { icon:'', label:'Local SEO',    desc:'Rank in your city  Google Maps, local citations, reviews' },
  regional: { icon:'',  label:'Regional SEO', desc:'Target multiple cities  service area pages, regional keywords' },
  national: { icon:'', label:'National SEO', desc:'Rank nationwide  topic clusters, authority building, PR' },
}

const API_GUIDES = [
  {
    key:'anthropic', label:'Anthropic (Claude AI)', required:true, color:'#f59e0b', icon:'',
    why:'Powers all 11 AI agents  content writing, weekly reports, keyword briefs, outreach emails. Most important key.',
    steps:[
      'Go to console.anthropic.com and sign up or log in',
      'Click "API Keys" in the left sidebar',
      'Click "+ Create Key" and name it "RankForged AI"',
      'Copy the key  it starts with sk-ant-',
      'Paste it in the field below',
    ],
    link:'https://console.anthropic.com', linkLabel:'Open Anthropic Console ', placeholder:'sk-ant-api03-...',
  },
  {
    key:'openai', label:'OpenAI (ChatGPT)', required:false, color:'#10b981', icon:'',
    why:'Enables ChatGPT-powered content generation as an alternative to Claude. Use either or both.',
    steps:[
      'Go to platform.openai.com and sign up or log in',
      'Click your profile icon  "API Keys"',
      'Click "+ Create new secret key"  name it "RankForged AI"',
      'Copy the key  it starts with sk-',
      'Paste it in the field below',
    ],
    link:'https://platform.openai.com/api-keys', linkLabel:'Open OpenAI Platform ', placeholder:'sk-...',
  },
  {
    key:'google', label:'Google Search Console API', required:false, color:'#4285f4', icon:'',
    why:'Shows real keyword rankings and click data from Google. Unlocks the Keyword Opportunity Spotter agent.',
    steps:[
      'Go to console.cloud.google.com',
      'Create a new project or select existing',
      'Search for "Search Console API" and enable it',
      'Go to Credentials  Create Credentials  API Key',
      'Copy the key and paste below',
    ],
    link:'https://console.cloud.google.com', linkLabel:'Open Google Cloud Console ', placeholder:'AIza...',
  },
  {
    key:'gemini', label:'Google Gemini AI', required:false, color:'#ea4335', icon:'',
    why:'Googles Gemini AI model for content generation. Alternative or supplement to Claude and ChatGPT.',
    steps:[
      'Go to aistudio.google.com',
      'Sign in with your Google account',
      'Click "Get API Key" in the left sidebar',
      'Click "Create API Key"',
      'Copy and paste the key below',
    ],
    link:'https://aistudio.google.com', linkLabel:'Open Google AI Studio ', placeholder:'AIza...',
  },
  {
    key:'yext', label:'Yext Listings', required:false, color:'#fc3d21', icon:'',
    why:'Automates citation submission to 100+ directories simultaneously. Saves hours of manual work.',
    steps:[
      'Go to yext.com and sign up for an account',
      'Go to Account Settings  API Keys',
      'Generate a new API key',
      'Also copy your Account ID from the same page',
      'Paste both below',
    ],
    link:'https://www.yext.com', linkLabel:'Open Yext ', placeholder:'your-yext-api-key',
  },
  {
    key:'moz', label:'Moz (Domain Authority)', required:false, color:'#007bff', icon:'',
    why:'Provides Domain Authority scores for competitor analysis and backlink prospecting.',
    steps:[
      'Go to moz.com/products/api and sign up',
      'Go to your Moz account  API Access',
      'Find your Access ID and Secret Key',
      'Paste both below',
    ],
    link:'https://moz.com/products/api', linkLabel:'Open Moz API ', placeholder:'mozscape-...',
  },
  {
    key:'brightlocal', label:'BrightLocal', required:false, color:'#ff6b35', icon:'',
    why:'Advanced local SEO rank tracking and citation management across multiple locations.',
    steps:[
      'Go to brightlocal.com and sign up',
      'Go to Account  API Keys',
      'Generate a new API key',
      'Also note your Campaign ID if you have one',
      'Paste below',
    ],
    link:'https://www.brightlocal.com', linkLabel:'Open BrightLocal ', placeholder:'your-brightlocal-key',
  },
  {
    key:'indexnow', label:'IndexNow', required:false, color:'#0891b2', icon:'',
    why:'Instantly notifies search engines when you publish new content. Dramatically speeds up indexing.',
    steps:[
      'Go to indexnow.org/en/documentation',
      'Generate a free key using their tool',
      'Add the key file to your website root folder',
      'Verify it at yourdomain.com/your-key.txt',
      'Paste the key below',
    ],
    link:'https://www.indexnow.org/en/documentation', linkLabel:'Open IndexNow Docs ', placeholder:'your-indexnow-key',
  },
  {
    key:'gmail', label:'Gmail (Email Sending)', required:false, color:'#ea4335', icon:'',
    why:'Sends automated weekly reports and review request emails directly from your Gmail account.',
    steps:[
      'Go to Google OAuth Playground: oauth.com/playground',
      'Select "Gmail API v1" scope',
      'Click "Authorize APIs" and sign in with Gmail',
      'Click "Exchange authorization code for tokens"',
      'Copy the Access Token (starts with ya29.)',
      'Note: tokens expire  you will need to refresh periodically',
    ],
    link:'https://developers.google.com/oauthplayground', linkLabel:'Open OAuth Playground ', placeholder:'ya29...',
  },
]


function mapCategory(input) {
  if (!input) return 'General'
  const s = input.toLowerCase()
  if (/plumb|hvac|electric|roof|landscap|paint|clean|handyman|pest|pool|garage|fence|gutter|window|flooring|carpet|appli|mover|storage|junk|tree|lawn|snow/.test(s)) return 'Home Services'
  if (/restaurant|food|pizza|burger|cafe|coffee|bakery|catering|diner|sushi|taco|bar|pub|grill/.test(s)) return 'Restaurant'
  if (/doctor|dentist|medical|health|clinic|therapy|chiro|optom|vet|pharmacy|hospital|mental/.test(s)) return 'Healthcare'
  if (/financ|bank|account|tax|insurance|invest|mortgage|loan|credit/.test(s)) return 'Finance'
  if (/law|legal|attorney|lawyer/.test(s)) return 'Legal'
  if (/retail|shop|store|boutique|gift/.test(s)) return 'Retail'
  if (/real estate|realtor|property|realty/.test(s)) return 'Real Estate'
  if (/auto|car|mechanic|tire|body shop|detailing|towing/.test(s)) return 'Automotive'
  if (/salon|spa|beauty|hair|nail|massage|barber|skin/.test(s)) return 'Beauty & Wellness'
  if (/school|tutor|coach|training|education|daycare|preschool/.test(s)) return 'Education'
  if (/tech|software|it |computer|web|app|digital|seo/.test(s)) return 'Technology'
  return 'General'
}

export default function OnboardingWizard({ userId, userEmail, onComplete }) {
  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const [activationKey, setActivationKey] = useState('')
  const [keyValid, setKeyValid]           = useState(false)
  const [keyData, setKeyData]             = useState(null)
  const [validating, setValidating]       = useState(false)

  const [profile, setProfile] = useState({
    bizName:'', addr:'', city:'', state:'', zip:'', category:'', phone:'', website:'', desc:'', keywords:''
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
    { id:'activate', label:'Activate', icon:'' },
    { id:'profile',  label:'Business', icon:'' },
    { id:'seo-type', label:'SEO Type', icon:'' },
    { id:'api-keys', label:'API Keys', icon:'' },
    { id:'branding', label:'Branding', icon:'' },
    { id:'launch',   label:'Launch',   icon:'' },
  ]

  const validateKey = async () => {
    if (!activationKey.trim()) { setError('Enter your activation key'); return }
    setValidating(true); setError('')
    const { data, error } = await supabase
      .from('activation_keys').select('*')
      .eq('key', activationKey.trim().toUpperCase()).single()
    if (error || !data) { setError('Invalid activation key  check your email and try again'); setValidating(false); return }
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
        // Ensure settings row exists so keys can be saved later
        await supabase.from('settings').upsert({ user_id:userId }, { onConflict:'user_id' })
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
          openai_key:apiKeys.openai,        gemini_key:apiKeys.gemini,
          indexnow_key:apiKeys.indexnow,   yext_key:apiKeys.yext,
          yext_account:apiKeys.yextAccount, moz_id:apiKeys.moz,
          moz_secret:apiKeys.mozSecret,    brightlocal_key:apiKeys.brightlocal,
          brightlocal_cid:apiKeys.brightlocalCid, gmail_token:apiKeys.gmail,
          fb_token:apiKeys.fb,              linkedin_token:apiKeys.linkedin,
        }, { onConflict:'user_id' })
        await supabase.from('subscriptions').update({ onboarding_step:4 }).eq('user_id', userId)
      }
      if (step === 4) {
        await supabase.from('settings').upsert({ user_id:userId, agency_name:branding.agencyName||profile.bizName, brand_color:branding.brandColor, agency_tagline:branding.tagline||'' }, { onConflict:'user_id' })
        await supabase.from('subscriptions').update({ onboarding_step:5 }).eq('user_id', userId)
      }
      if (step === 5) {
        if (profile.bizName) {
          const { data: client } = await supabase.from('clients').insert({ user_id:userId, name:profile.bizName, city:profile.city }).select().single()
          if (client) {
            await supabase.from('client_data').insert({
              client_id:client.id, user_id:userId,
  biz_name:profile.bizName, biz_addr:profile.addr, biz_city:profile.city,
biz_state:profile.state, biz_zip:profile.zip,
biz_cat:mapCategory(profile.category), biz_phone:profile.phone, biz_website:profile.website,
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

  //  Shared styles 
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
          <img src={LOGO} alt="RankForged AI" style={{ maxWidth:200, width:'100%', objectFit:'contain' }}
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
                  {i < step ? '' : s.icon}
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

          {/* STEP 0  ACTIVATION KEY */}
          {step === 0 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}> Activate Your Account</div>
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
                  {validating ? 'Checking...' : keyValid ? ' Valid' : 'Validate'}
                </button>
              </div>

              {keyValid && keyData && (
                <div style={{ background:'rgba(16,185,129,.1)', border:'1.5px solid rgba(16,185,129,.4)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'#4ade80', marginBottom:12 }}> Key activated successfully!</div>
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
                  <br/>Don't have a key? <a href="#" onClick={e=>{e.preventDefault();supabase.auth.signOut()}} style={{ color:'#60a5fa', fontWeight:600 }}>Sign out &amp; purchase a plan</a>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1  BUSINESS PROFILE */}
          {step === 1 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}> Your Business Profile</div>
              <p style={hint}>This data powers every agent, report, and piece of content. Fill it in as completely as possible  you can always update it later.</p>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Business Name *</label>
                  <input value={profile.bizName} onChange={e=>setProfile(p=>({...p,bizName:e.target.value}))} placeholder="e.g. Austin Plumbing Pros" style={inp} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Street Address</label>
                  <input value={profile.addr} onChange={e=>setProfile(p=>({...p,addr:e.target.value}))} placeholder="e.g. 123 Main St" style={inp} />
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
                  <label style={lbl}>ZIP Code</label>
                  <input value={profile.zip} onChange={e=>setProfile(p=>({...p,zip:e.target.value}))} placeholder="e.g. 78701" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Business Category</label>
                  <select value={profile.category} onChange={e=>setProfile(p=>({...p,category:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                    <option value="">Select category...</option>
                    {['Home Services','Restaurant','Healthcare','Finance','Legal','Retail','Real Estate','Automotive','Beauty & Wellness','Education','Technology','General'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
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
                   <strong>Tip:</strong> Add your top 5-8 services as keywords. The AI agents use these to write city-specific content and find keyword opportunities.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2  SEO TYPE */}
          {step === 2 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}> What Type of SEO Do You Need?</div>
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
                      }}>{selected?'':''}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ background:'rgba(16,185,129,.08)', borderRadius:10, padding:'12px 16px', border:'1px solid rgba(16,185,129,.25)' }}>
                <div style={{ fontSize:12.5, color:'#4ade80', lineHeight:1.6 }}>
                   <strong>Not sure?</strong> Start with Local SEO  it shows the fastest results. You can enable Regional and National later as your business grows.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3  API KEYS */}
          {step === 3 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}> Connect Your API Keys</div>
              <p style={hint}>
                API keys connect RankForged AI to external services. The <strong style={{ color:'#e2e8f0' }}>Anthropic key is required</strong> to enable AI agents.
                All others are optional  add them now or later from the API Keys tab.
              </p>

              <div style={{ background:'rgba(59,130,246,.08)', borderRadius:10, padding:'11px 16px', marginBottom:20, border:'1px solid rgba(59,130,246,.2)', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}></span>
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
                          {hasValue && <span style={{ fontSize:10.5, background:'#f0fdf4', color:'#16a34a', padding:'2px 8px', borderRadius:20, fontWeight:700 }}> ADDED</span>}
                        </div>
                        <div style={{ fontSize:12, color:'#4a6080', marginTop:2 }}>{guide.why}</div>
                      </div>
                      <span style={{ color:'#1a3560', fontSize:12, flexShrink:0 }}>{isOpen?'':''}</span>
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
                             {guide.linkLabel}
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

          {/* STEP 4  BRANDING */}
          {step === 4 && (
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}> Your Branding</div>
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

          {/* STEP 5  LAUNCH */}
          {step === 5 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:52, marginBottom:12 }}></div>
              <div style={{ fontSize:26, fontWeight:800, color:'#e2e8f0', marginBottom:8 }}>You're all set!</div>
              <p style={{ ...hint, maxWidth:440, margin:'0 auto 28px' }}>
                Your account is configured and your first business is ready. Click Launch to open the RankForged AI dashboard.
              </p>

              {/* Summary */}
              <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid #1a3560', borderRadius:12, padding:'20px 24px', marginBottom:24, textAlign:'left' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#2a4a6a', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Setup Summary</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    ['Business',  profile.bizName||''],
                    ['Location',  [profile.city,profile.state].filter(Boolean).join(', ')||''],
                    ['Plan',      PLANS[keyData?.plan]?.label||''],
                    ['SEO Types', seoTypes.join(', ')],
                    ['AI Agents', apiKeys.anthropic?' Enabled':' Add Anthropic key'],
                    ['Branding',  branding.agencyName||profile.bizName||''],
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
                <div style={{ fontSize:13, fontWeight:700, color:'#60a5fa', marginBottom:10 }}> Recommended first steps:</div>
                {[
                  'Run the GBP Health Monitor to score your Google Business Profile',
                  'Submit to the top 20 citation directories with one click',
                  'Run the Keyword Opportunity Spotter to find quick ranking wins',
                  'Set up your Weekly Report scheduler for automated client reports',
                ].map((tip,i)=>(
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'#60a5fa' }}>
                    <span style={{ flexShrink:0 }}></span>{tip}
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
               Back
            </button>
            <div style={{ fontSize:12, color:'#1a3560' }}>Step {step+1} of {STEPS.length}</div>
            <button onClick={nextStep} disabled={saving||(step===0&&!keyValid)} style={{
              padding:'11px 28px', borderRadius:8, border:'none', fontSize:14, fontWeight:700,
              cursor:(saving||(step===0&&!keyValid))?'not-allowed':'pointer',
              background:(saving||(step===0&&!keyValid))?'#e2e8f0':'#3b82f6',
              color:(saving||(step===0&&!keyValid))?'#94a3b8':'#fff',
              boxShadow:(saving||(step===0&&!keyValid))?'none':'0 4px 12px rgba(59,130,246,.35)',
            }}>
              {saving?'Saving...':step===5?' Launch RankForged AI':'Continue '}
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

