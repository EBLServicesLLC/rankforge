import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const T = {
  pageBg:   '#060d1a',
  cardBg:   '#0d1f3c',
  cardBg2:  '#080f1e',
  border:   '#0f2040',
  border2:  '#1a3560',
  text:     '#e2e8f0',
  textSub:  '#c8d8f0',
  muted:    '#4a6080',
  accent:   '#3b82f6',
  accentHi: '#60a5fa',
  green:    '#10b981',
  red:      '#f87171',
  yellow:   '#f59e0b',
  orange:   '#f97316',
  purple:   '#8b5cf6',
}

const KEYS = [
  {
    key:'anthropic_key', label:'Anthropic (Claude AI)', required:true, color:'#f59e0b', icon:'ti ti-sparkles',
    why:'Powers all AI features - content writing, outreach emails, FAQ generation, weekly reports. Most important.',
    placeholder:'sk-ant-api03-...',
    link:'https://console.anthropic.com', linkLabel:'Open Anthropic Console',
  },
  {
    key:'openai_key', label:'OpenAI (ChatGPT)', required:false, color:'#10b981', icon:'ti ti-brand-openai',
    why:'Alternative AI engine for content generation. Use either Claude or GPT-4o, or both.',
    placeholder:'sk-...',
    link:'https://platform.openai.com/api-keys', linkLabel:'Open OpenAI Platform',
  },
  {
    key:'gemini_key', label:'Google Gemini AI', required:false, color:'#ea4335', icon:'ti ti-brand-google',
    why:"Google's AI model. Alternative to Claude and ChatGPT for content generation.",
    placeholder:'AIza...',
    link:'https://aistudio.google.com', linkLabel:'Open AI Studio',
  },
  {
    key:'google_key', label:'Google Search Console', required:false, color:'#4285f4', icon:'ti ti-brand-google',
    why:'Shows real keyword rankings from Google Search Console. Unlocks the GSC tab. Click Connect to authorize via Google OAuth.',
    isOAuth: true,
  },
  {
    key:'pagespeed_key', label:'Google PageSpeed API', required:false, color:'#34a853', icon:'ti ti-gauge',
    why:'Powers the SEO Audit on your dashboard. Free — 25,000 requests/day. Enable PageSpeed Insights API in Google Cloud Console.',
    placeholder:'AIza...',
    link:'https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com', linkLabel:'Enable PageSpeed API',
  },
  {
    key:'gmail_token', label:'Gmail (Email Sending)', required:false, color:'#ea4335', icon:'ti ti-mail',
    why:'Sends outreach emails directly from Backlinks tab and weekly reports from your Gmail account.',
    placeholder:'ya29...',
    link:'https://developers.google.com/oauthplayground', linkLabel:'Open OAuth Playground',
    note:'Tokens expire after ~1 hour. Refresh as needed.',
  },
  {
    key:'fb_token', label:'Facebook Page Token', required:false, color:'#1877f2', icon:'ti ti-brand-facebook',
    why:'Fetches your live Facebook review count and rating. Enables posting to your Facebook Page from Social Publisher.',
    placeholder:'EAAxxxxxxxx...',
    link:'https://developers.facebook.com/tools/explorer/', linkLabel:'Open Graph API Explorer',
  },
  {
    key:'fb_page_id', label:'Facebook Page ID', required:false, color:'#1877f2', icon:'ti ti-brand-facebook',
    why:'Required alongside the Page Token. Found in your Facebook Page Settings > About > Page transparency.',
    placeholder:'123456789012345',
    isText: true,
  },
  {
    key:'linkedin_token', label:'LinkedIn Page Token', required:false, color:'#0a66c2', icon:'ti ti-brand-linkedin',
    why:'Enables direct publishing to your LinkedIn Company Page from the Social Publisher.',
    placeholder:'AQxxxxxxxx...',
    link:'https://linkedin.com/developers/apps', linkLabel:'Open LinkedIn Developers',
  },
  {
    key:'yext_key', label:'Yext Listings API', required:false, color:'#fc3d21', icon:'ti ti-database',
    why:'Syncs your business info to 100+ directories simultaneously. Saves hours of manual submission.',
    placeholder:'your-yext-api-key',
    link:'https://www.yext.com', linkLabel:'Open Yext',
  },
  {
    key:'yext_account', label:'Yext Account ID', required:false, color:'#fc3d21', icon:'ti ti-database',
    why:'Required alongside the Yext API key. Found in your Yext dashboard URL.',
    placeholder:'12345678',
    isText: true,
  },
  {
    key:'moz_id', label:'Moz Access ID', required:false, color:'#007bff', icon:'ti ti-chart-bar',
    why:'Provides Domain Authority scores for competitor analysis and backlink prospecting.',
    placeholder:'mozscape-...',
    link:'https://moz.com/products/api', linkLabel:'Open Moz API',
  },
  {
    key:'moz_secret', label:'Moz Secret Key', required:false, color:'#007bff', icon:'ti ti-chart-bar',
    why:'Required alongside the Moz Access ID.',
    placeholder:'your-moz-secret',
  },
  {
    key:'brightlocal_key', label:'BrightLocal API', required:false, color:'#ff6b35', icon:'ti ti-map-pin',
    why:'Advanced local SEO rank tracking and citation management across multiple locations.',
    placeholder:'your-brightlocal-key',
    link:'https://www.brightlocal.com', linkLabel:'Open BrightLocal',
  },
  {
    key:'brightlocal_cid', label:'BrightLocal Campaign ID', required:false, color:'#ff6b35', icon:'ti ti-map-pin',
    why:'Optional. Your BrightLocal campaign ID from the dashboard.',
    placeholder:'campaign-id',
    isText: true,
  },
  {
    key:'indexnow_key', label:'IndexNow Key', required:false, color:'#0891b2', icon:'ti ti-bolt',
    why:'Instantly notifies Bing, Yandex and other search engines when you publish new content.',
    placeholder:'your-indexnow-key',
    isText: true,
    link:'https://www.indexnow.org/en/documentation', linkLabel:'Open IndexNow Docs',
  },
]

function Card({ children, style }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, ...style }}>
      {children}
    </div>
  )
}

function StatusDot({ value }) {
  const set = value && value.trim().length > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: set ? T.green : T.muted }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: set ? T.green : T.border2, flexShrink: 0 }} />
      {set ? 'Saved' : 'Not set'}
    </div>
  )
}

export default function ApiKeysPage({ session }) {
  const [values,  setValues]  = useState({})
  const [show,    setShow]    = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState({})
  const [saved,   setSaved]   = useState({})
  const [reportDay,    setReportDay]    = useState('monday')
  const [savingReport, setSavingReport] = useState(false)
  const [savedReport,  setSavedReport]  = useState(false)
  const [gscConnecting, setGscConnecting] = useState(false)

  function connectGSC() {
    setGscConnecting(true)
    const state = 'gsc_' + Math.random().toString(36).slice(2)
    sessionStorage.setItem('gsc_oauth_state', state)
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = encodeURIComponent(window.location.origin + '/social/callback')
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/webmasters.readonly ' +
      'https://www.googleapis.com/auth/userinfo.email'
    )
    const url = `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`
    const popup = window.open(url, 'gsc_oauth', 'width=520,height=620')
    const handler = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'SOCIAL_AUTH_COMPLETE' || e.data?.platform !== 'gsc') return
      window.removeEventListener('message', handler)
      clearInterval(poll)
      setGscConnecting(false)
      if (e.data.success) {
        // token saved by edge function; store a marker so StatusDot shows green
        setValues(v => ({ ...v, google_key: e.data.token || 'connected' }))
        setSaved(s => ({ ...s, google_key: true }))
        setTimeout(() => setSaved(s => ({ ...s, google_key: false })), 3000)
      }
    }
    window.addEventListener('message', handler)
    const poll = setInterval(() => {
      if (popup?.closed) {
        clearInterval(poll)
        window.removeEventListener('message', handler)
        setGscConnecting(false)
      }
    }, 500)
  }

  useEffect(() => {
    if (!session) return
    supabase.from('settings').select('*').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[ApiKeysPage] settings load error:', error)
        if (data) {
          setValues(data)
          if (data.report_day) setReportDay(data.report_day)
        }
        setLoading(false)
      })
  }, [session])

  async function saveKey(key) {
    setSaving(s => ({ ...s, [key]: true }))
    await supabase.from('settings').upsert({
      user_id: session.user.id,
      [key]: values[key] || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(s => ({ ...s, [key]: false }))
    setSaved(s => ({ ...s, [key]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000)
  }

  async function saveReportDay() {
    setSavingReport(true)
    await supabase.from('settings').upsert({
      user_id: session.user.id,
      report_day: reportDay,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSavingReport(false)
    setSavedReport(true)
    setTimeout(() => setSavedReport(false), 2000)
  }

  const inp = {
    width: '100%', background: T.cardBg2, border: '1px solid ' + T.border2,
    borderRadius: 7, color: T.text, padding: '9px 12px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }

  const lbl = { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5, display: 'block' }

  // Group keys
  const AI_KEYS  = ['anthropic_key','openai_key','gemini_key']
  const SOC_KEYS = ['gmail_token','fb_token','fb_page_id','linkedin_token','google_key','pagespeed_key']
  const SEO_KEYS = ['yext_key','yext_account','moz_id','moz_secret','brightlocal_key','brightlocal_cid','indexnow_key']

  const groups = [
    { label: 'AI Models', icon: 'ti ti-sparkles', color: T.yellow, keys: AI_KEYS,  desc: 'Power AI content generation, outreach emails, and reports.' },
    { label: 'Social & Email', icon: 'ti ti-share', color: '#1877f2', keys: SOC_KEYS, desc: 'Connect Gmail, Facebook, LinkedIn, and Google for live data and publishing.' },
    { label: 'SEO Tools', icon: 'ti ti-chart-bar', color: T.orange, keys: SEO_KEYS, desc: 'Yext, Moz, BrightLocal, and IndexNow for advanced SEO automation.' },
  ]

  const setCount = KEYS.filter(k => values[k.key]?.trim()).length

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%', background: T.pageBg, color: T.text, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>API Keys & Connections</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          Keys are stored securely in your account. Update any time.
        </div>
        {!loading && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 6, flex: 1, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: T.green, width: Math.round(setCount / KEYS.length * 100) + '%', borderRadius: 3, transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{setCount}/{KEYS.length} keys set</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
          Loading...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <i className={group.icon} style={{ color: group.color, fontSize: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{group.label}</span>
                <span style={{ fontSize: 11, color: T.muted }}>{group.desc}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 12 }}>
                {group.keys.map(k => {
                  const def = KEYS.find(x => x.key === k)
                  if (!def) return null
                  const val = values[def.key] || ''
                  const isSet = val.trim().length > 0
                  const isSaving = saving[def.key]
                  const isSaved  = saved[def.key]
                  const isText   = def.isText
                  const isShown  = show[def.key]

                  return (
                    <Card key={def.key} style={{ borderLeft: isSet ? '3px solid ' + T.green : '3px solid ' + T.border }}>
                      <div style={{ padding: '14px 16px' }}>
                        {/* Key header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: def.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={def.icon} style={{ color: def.color, fontSize: 14 }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{def.label}</span>
                              {def.required && (
                                <span style={{ fontSize: 10, background: T.yellow + '20', color: T.yellow, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>Required</span>
                              )}
                            </div>
                          </div>
                          <StatusDot value={val} />
                        </div>

                        {/* Why */}
                        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>{def.why}</div>

                        {/* Note */}
                        {def.note && (
                          <div style={{ fontSize: 11, color: T.orange, background: T.orange + '10', border: '1px solid ' + T.orange + '30', borderRadius: 6, padding: '5px 9px', marginBottom: 10 }}>
                            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />{def.note}
                          </div>
                        )}

                        {/* Link */}
                        {def.link && (
                          <a href={def.link} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.accentHi, marginBottom: 10, textDecoration: 'none' }}>
                            <i className="ti ti-external-link" style={{ fontSize: 11 }} />{def.linkLabel}
                          </a>
                        )}

                        {/* Input row */}
                        {def.isOAuth ? (
                          <button
                            onClick={def.key === 'google_key' ? connectGSC : undefined}
                            disabled={gscConnecting}
                            style={{
                              width: '100%', padding: '9px 0',
                              background: isSet ? T.green + '22' : T.accent,
                              border: isSet ? '1px solid ' + T.green : 'none',
                              borderRadius: 7,
                              color: isSet ? T.green : '#fff',
                              fontSize: 13, fontWeight: 600,
                              cursor: gscConnecting ? 'not-allowed' : 'pointer',
                              transition: 'background .2s',
                            }}>
                            <i className={isSet ? 'ti ti-circle-check' : 'ti ti-brand-google'}
                              style={{ marginRight: 6, fontSize: 13 }} />
                            {gscConnecting ? 'Connecting…' : isSet ? 'Connected — Reconnect' : 'Connect Google Search Console'}
                          </button>
                        ) : (
                        <div style={{ display: 'flex', gap: 7 }}>
                          <input
                            type={isText || isShown ? 'text' : 'password'}
                            value={val}
                            onChange={e => setValues(v => ({ ...v, [def.key]: e.target.value }))}
                            placeholder={def.placeholder}
                            style={{ ...inp, flex: 1 }}
                          />
                          {!isText && (
                            <button onClick={() => setShow(s => ({ ...s, [def.key]: !s[def.key] }))}
                              style={{ padding: '0 10px', background: T.cardBg2, border: '1px solid ' + T.border2, borderRadius: 7, color: T.muted, cursor: 'pointer', fontSize: 13 }}>
                              <i className={isShown ? 'ti ti-eye-off' : 'ti ti-eye'} />
                            </button>
                          )}
                          <button onClick={() => saveKey(def.key)} disabled={isSaving}
                            style={{ padding: '0 14px', background: isSaved ? T.green : T.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background .2s', whiteSpace: 'nowrap' }}>
                            {isSaving ? '...' : isSaved ? 'Saved!' : 'Save'}
                          </button>
                        </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        {/* Report Settings */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <i className="ti ti-mail-forward" style={{ color: T.accent, fontSize: 16 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Report Settings</span>
              <span style={{ fontSize: 11, color: T.muted }}>Configure your automated weekly SEO report email.</span>
            </div>
            <Card style={{ maxWidth: 420 }}>
              <div style={{ padding: '14px 16px' }}>
                <label style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8, display: 'block' }}>
                  Weekly report send day
                </label>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 12 }}>
                  Your weekly SEO summary email will be sent every week on this day at 8:00 AM UTC.
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <select
                    value={reportDay}
                    onChange={e => setReportDay(e.target.value)}
                    style={{ flex: 1, background: T.cardBg2, border: '1px solid ' + T.border2, borderRadius: 7, color: T.text, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                  >
                    {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => (
                      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={saveReportDay} disabled={savingReport}
                    style={{ padding: '0 14px', background: savedReport ? T.green : T.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: savingReport ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background .2s', whiteSpace: 'nowrap' }}>
                    {savingReport ? '...' : savedReport ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
