import { useState, useEffect, useCallback } from 'react'
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
  cyan:     '#22d3ee',
}

const BL_PROSPECTS = [
  { id:101, name:'LinkedIn Articles',      domain:'linkedin.com',          da:98, type:'guest-post',  diff:'Easy',   note:'Direct publish - instant followed link from profile' },
  { id:102, name:'Medium',                 domain:'medium.com',            da:96, type:'guest-post',  diff:'Easy',   note:'Brand publication - clean dofollow link' },
  { id:103, name:'Forbes Councils',        domain:'forbes.com',            da:94, type:'guest-post',  diff:'Hard',   note:'Application required - very high value if accepted' },
  { id:104, name:'HuffPost Contributor',   domain:'huffpost.com',          da:93, type:'guest-post',  diff:'Hard',   note:'Pitch specific section editors' },
  { id:105, name:'Inc.com',               domain:'inc.com',               da:93, type:'guest-post',  diff:'Hard',   note:'Freelance contributor program' },
  { id:106, name:'Entrepreneur.com',       domain:'entrepreneur.com',      da:92, type:'guest-post',  diff:'Hard',   note:'Submit via contributor network' },
  { id:107, name:'Business Insider',       domain:'businessinsider.com',   da:92, type:'roundup',     diff:'Hard',   note:'Pitch data-driven stories to editors' },
  { id:108, name:'Wikipedia Citation',     domain:'wikipedia.org',         da:91, type:'citation',    diff:'Hard',   note:'Add citation on relevant article - must meet notability' },
  { id:109, name:'Houzz Ideabooks',        domain:'houzz.com',             da:91, type:'resource',    diff:'Medium', note:'Contribute to project ideabooks' },
  { id:110, name:'Wikidata Entity',        domain:'wikidata.org',          da:91, type:'citation',    diff:'Medium', note:'Entity page - critical for all AI visibility' },
  { id:111, name:'TripAdvisor Guides',     domain:'tripadvisor.com',       da:87, type:'resource',    diff:'Medium', note:'Local area travel tip articles' },
  { id:112, name:'BBB Accredited Blog',    domain:'bbb.org',               da:86, type:'citation',    diff:'Medium', note:'Accreditation earns a high-trust citation' },
  { id:113, name:'Waze Promoted Pin',      domain:'waze.com',              da:85, type:'citation',    diff:'Easy',   note:'Verified pin with website link' },
  { id:114, name:'DBpedia Listing',        domain:'dbpedia.org',           da:83, type:'citation',    diff:'Medium', note:'Semantic web entity - boosts Google Knowledge Graph' },
  { id:115, name:'SmallBizTrends',         domain:'smallbiztrends.com',    da:80, type:'guest-post',  diff:'Medium', note:'SMB blog - responds well to expert pitches' },
  { id:116, name:'Business2Community',     domain:'business2community.com',da:79, type:'guest-post',  diff:'Easy',   note:'Open contributor - high acceptance rate' },
  { id:117, name:'AllBusiness.com',        domain:'allbusiness.com',       da:79, type:'guest-post',  diff:'Easy',   note:'Business articles - takes quality pitches' },
  { id:118, name:'FindLaw Articles',       domain:'findlaw.com',           da:82, type:'guest-post',  diff:'Medium', note:'Legal topic contributor articles' },
  { id:119, name:'Angi Pro Blog',          domain:'angi.com',              da:82, type:'guest-post',  diff:'Medium', note:'Home services expert content' },
  { id:120, name:'HomeAdvisor Blog',       domain:'homeadvisor.com',       da:78, type:'guest-post',  diff:'Medium', note:'Home improvement how-to articles' },
  { id:121, name:'Healthgrades Blog',      domain:'healthgrades.com',      da:78, type:'resource',    diff:'Medium', note:'Healthcare articles link to local providers' },
  { id:122, name:'Thumbtack Blog',         domain:'thumbtack.com',         da:76, type:'resource',    diff:'Medium', note:'Hiring guide resource pages' },
  { id:123, name:'Avvo Legal Guides',      domain:'avvo.com',              da:74, type:'resource',    diff:'Easy',   note:'Attorney guides earn followed profile links' },
  { id:124, name:'Nextdoor Business',      domain:'nextdoor.com',          da:74, type:'citation',    diff:'Easy',   note:'Neighbour recommendations - local trust signal' },
  { id:125, name:'NerdWallet',             domain:'nerdwallet.com',        da:68, type:'roundup',     diff:'Medium', note:'Best-of finance service roundups' },
  { id:126, name:'Clutch.co Profile',      domain:'clutch.co',             da:65, type:'testimonial', diff:'Easy',   note:'Reviews earn a dofollow profile link' },
  { id:127, name:'G2 Profile',             domain:'g2.com',                da:66, type:'testimonial', diff:'Easy',   note:'Service reviews with company backlink' },
  { id:128, name:'Manta Blog',             domain:'manta.com',             da:68, type:'guest-post',  diff:'Easy',   note:'SMB blog - approachable editors' },
  { id:129, name:'Porch Blog',             domain:'porch.com',             da:66, type:'guest-post',  diff:'Easy',   note:'Home improvement project guides' },
  { id:130, name:'Foursquare Blog',        domain:'foursquare.com',        da:72, type:'citation',    diff:'Easy',   note:'Local business tips with backlink' },
  { id:131, name:'Local Podcast Network',  domain:'localpodcasts.com',     da:52, type:'podcast',     diff:'Easy',   note:'Local business owner interview series' },
  { id:132, name:'Chamber of Commerce',    domain:'uschamber.com',         da:46, type:'citation',    diff:'Easy',   note:'Local chapter listing - high trust signal' },
  { id:133, name:'EZlocal',               domain:'ezlocal.com',           da:45, type:'citation',    diff:'Easy',   note:'Local citation - dofollow profile link' },
  { id:134, name:'Crunchbase',             domain:'crunchbase.com',        da:78, type:'citation',    diff:'Easy',   note:'Business profile - strong B2B entity signal' },
  { id:135, name:'LinkedIn Company',       domain:'linkedin.com',          da:98, type:'citation',    diff:'Easy',   note:'Company page - entity consolidation signal' },
]

const PIPELINE_COLS = [
  { id:'new',      label:'Prospects',  icon:'ti ti-target',       color: T.muted,   colorBg: T.cardBg2  },
  { id:'pitched',  label:'Pitched',    icon:'ti ti-mail-forward',  color: T.accent,  colorBg: T.accent + '18' },
  { id:'followed', label:'Follow Up',  icon:'ti ti-clock',         color: T.orange,  colorBg: T.orange + '18' },
  { id:'replied',  label:'Replied',    icon:'ti ti-mail-opened',   color: T.cyan,    colorBg: T.cyan + '18'   },
  { id:'won',      label:'Won',        icon:'ti ti-trophy',        color: T.purple,  colorBg: T.purple + '18' },
]

const TYPE_COLORS = {
  'guest-post':  { bg: T.accent  + '18', color: T.accentHi },
  'resource':    { bg: T.purple  + '18', color: T.purple   },
  'citation':    { bg: T.green   + '18', color: T.green    },
  'podcast':     { bg: T.cyan    + '18', color: T.cyan     },
  'roundup':     { bg: T.orange  + '18', color: T.orange   },
  'testimonial': { bg: T.muted   + '18', color: T.muted    },
}

const DIFF_COLORS = {
  Easy:   T.green,
  Medium: T.orange,
  Hard:   T.red,
}

const DA_TIERS = [
  { min:85, label:'DA 85+',   color: T.green  },
  { min:70, label:'DA 70-84', color: T.accent },
  { min:50, label:'DA 50-69', color: T.orange },
  { min:0,  label:'DA 30-49', color: T.muted  },
]

function daColor(da) {
  if (da >= 85) return T.green
  if (da >= 70) return T.accent
  if (da >= 50) return T.orange
  return T.muted
}

function Card({ children, style }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, ...style }}>
      {children}
    </div>
  )
}

function CardHead({ icon, title, sub, right }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
        <i className={icon} style={{ color: T.accentHi }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function Badge({ children, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: bg || color + '18', color, textTransform: 'uppercase', letterSpacing: '.3px' }}>
      {children}
    </span>
  )
}

export default function BacklinksPage({ session, clientId }) {
  const [statuses,     setStatuses]     = useState({})
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [daFilter,     setDaFilter]     = useState('all')
  const [emailModal,   setEmailModal]   = useState(null)
  const [emailContent, setEmailContent] = useState('')
  const [generating,   setGenerating]   = useState(false)
  const [tone,         setTone]         = useState('Professional')
  const [profile,      setProfile]      = useState({})
  const [saving,       setSaving]       = useState(false)
  const [toEmail,      setToEmail]      = useState('')
  const [sending,      setSending]      = useState(false)
  const [sendResult,   setSendResult]   = useState(null)
  const [sendError,    setSendError]    = useState('')
  const [gmailToken,   setGmailToken]   = useState('')

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name,biz_website,biz_city,biz_state,biz_kw')
      .eq('client_id', clientId).eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data) })

    supabase.from('bl_status')
      .select('prospect_id,status,updated_at')
      .eq('client_id', clientId).eq('user_id', session.user.id)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(r => { map[r.prospect_id] = r.status })
        setStatuses(map)
      })

    supabase.from('settings')
      .select('gmail_token,anthropic_key')
      .eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.gmail_token) setGmailToken(data.gmail_token)
      })
  }, [clientId, session])

  const saveStatus = useCallback(async (id, status) => {
    const next = { ...statuses, [id]: status }
    setStatuses(next)
    if (!clientId || !session) return
    setSaving(true)
    await supabase.from('bl_status').upsert({
      prospect_id: id,
      client_id: clientId,
      user_id: session.user.id,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'prospect_id,client_id,user_id' })
    setSaving(false)
  }, [statuses, clientId, session])

  const getStatus = (id) => statuses[id] || 'new'

  const filtered = BL_PROSPECTS.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false
    if (daFilter === 't1' && p.da < 85) return false
    if (daFilter === 't2' && (p.da < 70 || p.da >= 85)) return false
    if (daFilter === 't3' && (p.da < 50 || p.da >= 70)) return false
    if (daFilter === 't4' && (p.da < 30 || p.da >= 50)) return false
    return true
  })

  const grouped = { new: [], pitched: [], followed: [], replied: [], won: [], declined: [] }
  filtered.forEach(p => {
    const st = getStatus(p.id)
    ;(grouped[st] || grouped.new).push(p)
  })

  const stats = {
    total:   filtered.length,
    won:     Object.values(statuses).filter(s => s === 'won').length,
    pitched: Object.values(statuses).filter(s => ['pitched','followed','replied','won'].includes(s)).length,
    avgDa:   filtered.length ? Math.round(filtered.reduce((a,p) => a + p.da, 0) / filtered.length) : 0,
  }

  async function generateEmail(prospect) {
    setEmailModal(prospect)
    setEmailContent('')
    setGenerating(true)
    const biz  = profile.biz_name    || 'our business'
    const site = profile.biz_website || 'our website'
    const kw   = profile.biz_kw?.split(',')[0]?.trim() || 'local services'

    const prompts = {
      'guest-post':  `Write a cold outreach email to ${prospect.name} (${prospect.domain}) pitching a guest post. Business: ${biz} (${kw}). Tone: ${tone}. Mention their audience, propose a specific article topic about ${kw}, include website: ${site}. Under 200 words. Subject line included.`,
      'resource':    `Write a resource page link request email to ${prospect.domain}. Business: ${biz} (${kw}). Tone: ${tone}. Explain why ${biz} belongs on their resource page. Website: ${site}. Under 150 words. Subject line included.`,
      'citation':    `Write a citation/profile claim email for ${prospect.name} (${prospect.domain}). Business: ${biz}. Tone: ${tone}. Brief, direct request. Website: ${site}. Under 120 words.`,
      'podcast':     `Write a podcast guest pitch email to ${prospect.domain}. Business: ${biz} (expert in ${kw}). Tone: ${tone}. Pitch why you'd be a great guest. Website: ${site}. Under 180 words. Subject line included.`,
      'roundup':     `Write an expert roundup contribution pitch to ${prospect.domain}. Business: ${biz} (${kw} expert). Tone: ${tone}. Offer a unique quote or insight. Website: ${site}. Under 150 words. Subject line included.`,
      'testimonial': `Write a testimonial/review submission email for ${prospect.domain}. Business: ${biz}. Tone: ${tone}. Offer to write a testimonial in exchange for a company profile link. Website: ${site}. Under 120 words.`,
    }

    const prompt = prompts[prospect.type] || prompts['guest-post']

    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('anthropic_key')
        .eq('user_id', session.user.id)
        .maybeSingle()

      const key = settings?.anthropic_key
      if (!key) {
        setEmailContent('No Anthropic API key found. Add your key in the API Keys tab.')
        setGenerating(false)
        return
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      setEmailContent(data.content[0].text)
    } catch (err) {
      setEmailContent('Error generating email: ' + err.message)
    }
    setGenerating(false)
  }

  // Extract subject line from generated email text
  function extractSubject(text) {
    const match = text.match(/^Subject:\s*(.+)/mi)
    return match ? match[1].trim() : 'Backlink Outreach'
  }

  // Extract body (everything after Subject: line, or full text if no subject)
  function extractBody(text) {
    const match = text.match(/^Subject:.*\n([\s\S]*)/mi)
    return match ? match[1].trim() : text.trim()
  }

  async function sendEmail(prospect) {
    if (!toEmail.trim()) { setSendError('Enter a recipient email address.'); return }
    if (!gmailToken)     { setSendError('No Gmail token found. Add it in API Keys.'); return }
    if (!emailContent)   { setSendError('Generate an email first.'); return }

    setSending(true)
    setSendResult(null)
    setSendError('')

    const subject = extractSubject(emailContent)
    const body    = extractBody(emailContent)
    const from    = session.user.email

    // Build RFC 2822 message
    const messageParts = [
      'From: ' + from,
      'To: ' + toEmail.trim(),
      'Subject: ' + subject,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ]
    const raw = messageParts.join('\r\n')
    const encoded = btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + gmailToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      })

      if (res.status === 401) {
        setSendError('Gmail token expired. Refresh it in API Keys tab.')
        setSending(false)
        return
      }

      const data = await res.json()
      if (data.error) {
        setSendError(data.error.message || 'Gmail send failed.')
        setSending(false)
        return
      }

      // Success - mark as pitched and close after short delay
      setSendResult('sent')
      await saveStatus(prospect.id, 'pitched')
      setTimeout(() => {
        setEmailModal(null)
        setSendResult(null)
        setSendError('')
        setToEmail('')
      }, 1800)
    } catch (err) {
      setSendError('Send failed: ' + err.message)
    }
    setSending(false)
  }

  const FILTERS_TYPE = [
    { val:'all',        label:'All Types'   },
    { val:'guest-post', label:'Guest Post'  },
    { val:'resource',   label:'Resource'    },
    { val:'citation',   label:'Citation'    },
    { val:'podcast',    label:'Podcast'     },
    { val:'roundup',    label:'Roundup'     },
    { val:'testimonial',label:'Testimonial' },
  ]

  const FILTERS_DA = [
    { val:'all', label:'All DA'    },
    { val:'t1',  label:'DA 85+'   },
    { val:'t2',  label:'DA 70-84' },
    { val:'t3',  label:'DA 50-69' },
    { val:'t4',  label:'DA 30-49' },
  ]

  const fbtn = (active) => ({
    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', border: '1px solid ' + (active ? T.accent : T.border2),
    background: active ? T.accent + '20' : 'transparent',
    color: active ? T.accentHi : T.muted, fontFamily: 'inherit',
  })

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%', background: T.pageBg, color: T.text, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Backlink Outreach Pipeline</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          {BL_PROSPECTS.length}+ prospects sorted by DA. Move cards through the pipeline as you pitch, follow up, and win links.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { icon: 'ti ti-target',      label: 'Prospects',    value: stats.total,   color: T.accent  },
          { icon: 'ti ti-trophy',      label: 'Links Won',    value: stats.won,     color: T.purple  },
          { icon: 'ti ti-mail-forward',label: 'Pitched',      value: stats.pitched, color: T.orange  },
          { icon: 'ti ti-chart-bar',   label: 'Avg DA',       value: stats.avgDa,   color: T.green   },
        ].map(s => (
          <div key={s.label} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={s.icon} style={{ color: s.color, fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Type</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS_TYPE.map(f => (
                <button key={f.val} style={fbtn(typeFilter === f.val)} onClick={() => setTypeFilter(f.val)}>{f.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>DA Tier</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {FILTERS_DA.map(f => (
                <button key={f.val} style={fbtn(daFilter === f.val)} onClick={() => setDaFilter(f.val)}>{f.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Email Tone</div>
            <select value={tone} onChange={e => setTone(e.target.value)}
              style={{ background: T.cardBg2, border: '1px solid ' + T.border2, borderRadius: 7, color: T.text, padding: '5px 10px', fontSize: 12, fontFamily: 'inherit' }}>
              <option>Professional</option>
              <option>Friendly and conversational</option>
              <option>Expert authority</option>
              <option>Short and punchy</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Kanban Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, alignItems: 'start', marginBottom: 20 }}>
        {PIPELINE_COLS.map(col => (
          <div key={col.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 8, background: col.colorBg, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={col.icon} style={{ color: col.color, fontSize: 13 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '1px 7px' }}>
                {grouped[col.id]?.length || 0}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grouped[col.id]?.length === 0 ? (
                <div style={{ fontSize: 11, color: T.border2, textAlign: 'center', padding: '16px 8px', border: '1px dashed ' + T.border, borderRadius: 8 }}>
                  None here yet
                </div>
              ) : grouped[col.id].map(p => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  status={col.id}
                  onEmail={() => generateEmail(p)}
                  onMove={saveStatus}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* DA Tier Guide */}
      <Card>
        <CardHead icon="ti ti-chart-bar" title="DA Tier Guide" sub="Domain Authority reference" />
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {DA_TIERS.map(t => (
            <div key={t.label}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {t.min >= 85 ? 'Forbes, LinkedIn. Highest impact.' :
                 t.min >= 70 ? 'Industry publications. Best ROI.' :
                 t.min >= 50 ? 'Local news. Easier wins.' :
                               'Community sites. Quick volume.'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Email Modal */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailModal(null) }}>
          <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{emailModal.name}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  {emailModal.domain} &middot; DA {emailModal.da} &middot; {emailModal.type}
                </div>
              </div>
              <button onClick={() => setEmailModal(null)}
                style={{ background: T.cardBg2, border: '1px solid ' + T.border, borderRadius: 6, color: T.muted, cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            {generating ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted }}>
                <i className="ti ti-loader-2" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                Generating outreach email...
              </div>
            ) : emailContent ? (
              <>
                <div style={{ background: T.cardBg2, border: '1px solid ' + T.border, borderRadius: 8, padding: 14, fontSize: 13, color: T.textSub, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12, minHeight: 160 }}>
                  {emailContent}
                </div>

                {/* Send success banner */}
                {sendResult === 'sent' && (
                  <div style={{ background: T.green + '18', border: '1px solid ' + T.green + '40', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="ti ti-circle-check" style={{ color: T.green, fontSize: 18 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.green }}>Email sent via Gmail!</div>
                      <div style={{ fontSize: 11, color: T.muted }}>Marked as Pitched. Closing...</div>
                    </div>
                  </div>
                )}

                {/* To field + send row */}
                {sendResult !== 'sent' && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
                      Recipient email
                      {!gmailToken && (
                        <span style={{ marginLeft: 8, color: T.orange, fontWeight: 600 }}>
                          (Gmail not connected - copy only)
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      value={toEmail}
                      onChange={e => { setToEmail(e.target.value); setSendError('') }}
                      placeholder="editor@domain.com"
                      style={{
                        width: '100%', background: T.cardBg2, border: '1px solid ' + T.border2,
                        borderRadius: 7, color: T.text, padding: '8px 12px',
                        fontSize: 13, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    {sendError && (
                      <div style={{ fontSize: 11, color: T.red, marginTop: 5 }}>
                        <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />{sendError}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(emailContent)}
                    style={{ padding: '9px 14px', background: 'transparent', color: T.muted, border: '1px solid ' + T.border2, borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="ti ti-copy" />Copy
                  </button>
                  <button
                    onClick={() => { setSendResult(null); setSendError(''); generateEmail(emailModal) }}
                    style={{ padding: '9px 14px', background: 'transparent', color: T.muted, border: '1px solid ' + T.border2, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    <i className="ti ti-refresh" />
                  </button>
                  {gmailToken ? (
                    <button
                      onClick={() => sendEmail(emailModal)}
                      disabled={sending || sendResult === 'sent'}
                      style={{ flex: 1, padding: '9px 0', background: sending ? T.accent + '50' : T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {sending ? (
                        <><i className="ti ti-loader-2" style={{ fontSize: 14 }} />Sending...</>
                      ) : (
                        <><i className="ti ti-send" style={{ fontSize: 14 }} />Send via Gmail</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => { saveStatus(emailModal.id, 'pitched'); setEmailModal(null) }}
                      style={{ flex: 1, padding: '9px 0', background: T.green + '20', color: T.green, border: '1px solid ' + T.green + '40', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <i className="ti ti-mail-forward" style={{ fontSize: 14 }} />Mark Pitched
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: T.muted }}>
                <div style={{ fontSize: 13 }}>No email generated yet.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProspectCard({ prospect: p, status, onEmail, onMove }) {
  const [hovered, setHovered] = useState(false)
  const tc = TYPE_COLORS[p.type] || { bg: T.muted + '18', color: T.muted }

  const nextActions = {
    new:      [{ label: 'Pitch', icon: 'ti ti-mail-forward', next: 'pitched', color: T.accent }],
    pitched:  [
      { label: 'Follow', icon: 'ti ti-clock',       next: 'followed', color: T.orange },
      { label: 'Replied', icon: 'ti ti-mail-opened', next: 'replied',  color: T.cyan  },
    ],
    followed: [
      { label: 'Replied', icon: 'ti ti-mail-opened', next: 'replied',  color: T.cyan },
      { label: 'Decline', icon: 'ti ti-x',           next: 'declined', color: T.red  },
    ],
    replied:  [{ label: 'Won!', icon: 'ti ti-trophy', next: 'won', color: T.purple }],
    won:      [],
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.cardBg : T.cardBg2,
        border: '1px solid ' + (hovered ? T.border2 : T.border),
        borderRadius: 8, padding: '10px 11px',
        cursor: 'pointer', transition: 'all .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{p.domain}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: daColor(p.da), flexShrink: 0 }}>{p.da}</span>
      </div>

      {p.note && (
        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4, marginBottom: 6 }}>
          {p.note.length > 55 ? p.note.substring(0, 55) + '...' : p.note}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: tc.bg, color: tc.color }}>{p.type}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10, color: DIFF_COLORS[p.diff], background: DIFF_COLORS[p.diff] + '18' }}>{p.diff}</span>
      </div>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={e => { e.stopPropagation(); onEmail() }}
          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid ' + T.border2, background: T.cardBg, color: T.muted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Generate email">
          <i className="ti ti-mail" />
        </button>
        {(nextActions[status] || []).map(a => (
          <button key={a.next} onClick={e => { e.stopPropagation(); onMove(p.id, a.next) }}
            style={{ height: 26, padding: '0 8px', borderRadius: 6, border: '1px solid ' + a.color + '40', background: a.color + '15', color: a.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
            title={a.label}>
            <i className={a.icon} style={{ fontSize: 11 }} />{a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
