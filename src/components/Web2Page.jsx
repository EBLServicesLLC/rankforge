/**
 * Web2Page.jsx
 * Web 2.0 & Content Syndication - Improved
 * Key improvements over rankforge3:
 * - Tier-based progress bars showing coverage per DA tier
 * - Per-platform content brief (format, length, style)
 * - Published URL tracking stored in Supabase
 * - Entity signal score (AI training platform coverage)
 * - AI article generator with platform-aware prompts
 * - Two-column layout with content left, platforms right
 */

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

const W2 = [
  { id:201, name:'Medium',           domain:'medium.com',       da:96, cat:'blog',   bg:'#000000', note:'Brand publication - high DA followed links',         brief:'800-1200 word article. Use headers. Include 1 link back to your site. Conversational but authoritative tone.',        aiWords: 900  },
  { id:202, name:'LinkedIn Articles', domain:'linkedin.com',     da:98, cat:'blog',   bg:'#0077b5', note:'Professional long-form - instant indexing',           brief:'700-1000 words. Professional tone. Lead with insight. Include 3-5 hashtags at end. Link to company page.',         aiWords: 800  },
  { id:203, name:'Substack',          domain:'substack.com',     da:82, cat:'blog',   bg:'#ff6719', note:'Newsletter + web article - brand voice builder',      brief:'600-900 words. Personal newsletter style. Include a clear value proposition and CTA.',                            aiWords: 700  },
  { id:204, name:'WordPress.com',     domain:'wordpress.com',    da:95, cat:'blog',   bg:'#21759b', note:'Free hosted blog - dofollow links in content',        brief:'800-1000 words. SEO-optimised. Use H2/H3 headers, include target keyword in title and first paragraph.',           aiWords: 900  },
  { id:205, name:'Blogger',           domain:'blogger.com',      da:90, cat:'blog',   bg:'#f57d00', note:'Google-owned - strong indexing signals',              brief:'600-800 words. Informational blog style. Google-owned so indexes fast. Include keyword naturally.',               aiWords: 700  },
  { id:206, name:'Tumblr',            domain:'tumblr.com',       da:87, cat:'blog',   bg:'#34526f', note:'Microblog + long-form - good discovery',              brief:'400-600 words. Casual and visual-friendly. Use short paragraphs. Add relevant tags.',                             aiWords: 500  },
  { id:207, name:'Ghost.io',          domain:'ghost.io',         da:78, cat:'blog',   bg:'#111111', note:'Publication platform - clean SEO structure',          brief:'700-1000 words. Clean editorial style. Strong headline. Include author bio section at end.',                        aiWords: 800  },
  { id:208, name:'HubPages',          domain:'hubpages.com',     da:76, cat:'blog',   bg:'#cc0000', note:'Article platform - community discovery',              brief:'800-1200 words. How-to or listicle format works best. Include images description. Add summary capsule.',           aiWords: 1000 },
  { id:209, name:'Weebly Blog',       domain:'weebly.com',       da:83, cat:'blog',   bg:'#4d4d4e', note:'Hosted blog - decent domain authority',               brief:'600-800 words. Service-focused content. Include contact info and website link at bottom.',                         aiWords: 700  },
  { id:210, name:'Wix Blog',          domain:'wix.com',          da:90, cat:'blog',   bg:'#faad4f', note:'Good for local niche content indexing',               brief:'600-900 words. Local-focused. Mention city and service area. Include CTA for contact.',                           aiWords: 750  },
  { id:211, name:'Facebook Page',     domain:'facebook.com',     da:96, cat:'social', bg:'#1877f2', note:'Business page - entity signal + local discovery',     brief:'150-250 words. Engaging, conversational. End with a question or CTA. Use 3-5 hashtags.',                          aiWords: 200  },
  { id:212, name:'Twitter/X',         domain:'x.com',            da:94, cat:'social', bg:'#000000', note:'Brand profile - entity consolidation',                brief:'Under 280 chars. Hook in first line. Include 1-2 hashtags. Optional: thread of 3-5 tweets.',                     aiWords: 60   },
  { id:213, name:'Instagram',         domain:'instagram.com',    da:93, cat:'social', bg:'#e1306c', note:'Visual brand presence - citation signal',             brief:'Caption: 100-150 words. Storytelling style. Use 10-15 hashtags. Include location tag.',                           aiWords: 130  },
  { id:214, name:'Pinterest',         domain:'pinterest.com',    da:93, cat:'social', bg:'#e60023', note:'Pins link back to site - strong referral',            brief:'Pin description: 100-300 chars. Keyword-rich. Include website URL. Use relevant board name.',                     aiWords: 100  },
  { id:215, name:'YouTube Channel',   domain:'youtube.com',      da:100, cat:'video', bg:'#ff0000', note:'About + video descriptions link to site',             brief:'Video description: 200-400 words. Include keyword in first 2 lines. Add timestamps. Website link in description.', aiWords: 300  },
  { id:216, name:'Quora Spaces',      domain:'quora.com',        da:92, cat:'qa',     bg:'#b92b27', note:'Answer questions - contextual links',                 brief:'Expert answer: 200-400 words. Direct answer first. Add context, examples. Include subtle brand mention.',         aiWords: 300  },
  { id:217, name:'Reddit',            domain:'reddit.com',       da:96, cat:'qa',     bg:'#ff4500', note:'Relevant subreddit - community trust signal',         brief:'Be genuinely helpful. No overt promotion. 200-500 words. Share expertise, mention business only if relevant.',   aiWords: 350  },
  { id:218, name:'SlideShare',        domain:'slideshare.net',   da:89, cat:'doc',    bg:'#0077b5', note:'Presentation - indexes well in Google',               brief:'15-20 slide presentation outline. Title, problem, solution, benefits, CTA. Include website on each slide.',      aiWords: 400  },
  { id:219, name:'Scribd',            domain:'scribd.com',       da:88, cat:'doc',    bg:'#1a7abf', note:'Upload branded PDF - citation and entity signal',     brief:'PDF article: 600-1000 words. Professional format. Include company logo, website, contact info on last page.',   aiWords: 800  },
  { id:220, name:'Issuu',             domain:'issuu.com',        da:84, cat:'doc',    bg:'#e2271a', note:'Digital brochure - high DA profile link',             brief:'Digital brochure/magazine style. 4-8 pages. Visual-friendly. Include brand info on every page.',                aiWords: 600  },
  { id:221, name:'Academia.edu',      domain:'academia.edu',     da:83, cat:'doc',    bg:'#41454a', note:'Research content - strong trust signal for AI',       brief:'Research-style article: 1000-1500 words. Include references/citations. Abstract at top. Professional format.',  aiWords: 1200 },
  { id:222, name:'DocDroid',          domain:'docdroid.net',     da:62, cat:'doc',    bg:'#555555', note:'Document hosting - easy indexed upload',              brief:'500-700 word document. Any professional format. Include contact info and website URL.',                           aiWords: 600  },
  { id:223, name:'Quora Answers',     domain:'quora.com',        da:92, cat:'qa',     bg:'#b92b27', note:'Expert answers with bio link - authority building',   brief:'150-300 word expert answer. Answer directly, add expertise context, mention service naturally at end.',          aiWords: 250  },
  { id:224, name:'Stack Exchange',    domain:'stackexchange.com',da:92, cat:'qa',     bg:'#f48024', note:'Niche Q&A - high trust links from profile',           brief:'Technical expert answer. 100-300 words. Be precise and helpful. Link to resources where appropriate.',          aiWords: 200  },
  { id:225, name:'Vimeo',             domain:'vimeo.com',        da:97, cat:'video',  bg:'#1ab7ea', note:'Video with site link - entity signal',                brief:'Video description: 150-300 words. Include keyword. Add website link. Tag with relevant categories.',             aiWords: 250  },
  { id:226, name:'Dailymotion',       domain:'dailymotion.com',  da:86, cat:'video',  bg:'#003380', note:'Video hosting - description links indexed',           brief:'Description: 100-200 words. Keyword in title. Add website link. Use channel tags.',                             aiWords: 150  },
  { id:227, name:'Podbean',           domain:'podbean.com',      da:77, cat:'video',  bg:'#f39c12', note:'Podcast profile - audio content authority',           brief:'Episode description: 150-300 words. Include show notes, key topics, website link. Keyword-friendly.',          aiWords: 250  },
  { id:228, name:'Spotify Podcasts',  domain:'spotify.com',      da:95, cat:'video',  bg:'#1ed760', note:'Podcast entity - brand signal for AI systems',        brief:'Podcast description: 200-400 words. What listeners will learn. Include website. Professional bio.',            aiWords: 300  },
  { id:229, name:'About.me',          domain:'about.me',         da:72, cat:'social', bg:'#00adef', note:'Bio page - entity consolidation profile',             brief:'Professional bio: 100-200 words. Name, role, expertise, location, website URL. Personal yet professional.',     aiWords: 150  },
  { id:230, name:'Crunchbase',        domain:'crunchbase.com',   da:78, cat:'social', bg:'#0288d1', note:'Business profile - B2B credibility + AI data source', brief:'Company description: 150-250 words. Founded, mission, services, location, key differentiators.',                aiWords: 200  },
  { id:231, name:'AngelList',         domain:'wellfound.com',    da:74, cat:'social', bg:'#000000', note:'Business profile - investor visibility',              brief:'Startup/business description: 100-200 words. Mission, product/service, team size, location.',                  aiWords: 150  },
  { id:232, name:'Alignable',         domain:'alignable.com',    da:62, cat:'social', bg:'#e93040', note:'Local business network - referral links',             brief:'Business intro: 100-150 words. Local focus. What you do, who you serve, why choose you. City mention.',       aiWords: 130  },
  { id:233, name:'Product Hunt',      domain:'producthunt.com',  da:87, cat:'social', bg:'#da552f', note:'Launch product/service - tech community exposure',    brief:'Product description: 100-200 words. Problem, solution, key features, CTA. Tagline under 60 chars.',           aiWords: 160  },
  { id:234, name:'Yelp Blog',         domain:'biz.yelp.com',     da:93, cat:'blog',   bg:'#d32323', note:'Business owner blog post via Yelp profile',           brief:'500-700 word business story/tip. First-person voice. Local references. Helpful advice for potential customers.', aiWords: 600  },
  { id:235, name:'Wikipedia',         domain:'wikipedia.org',    da:91, cat:'doc',    bg:'#555555', note:'Cited reference - critical for all AI training data',  brief:'Add as reference/citation in relevant Wikipedia article. Or create entity stub if notable. NPOV required.',   aiWords: 300  },
]

// AI training signal platforms — these matter most for LLM visibility
const AI_SIGNAL_IDS = [202, 215, 221, 235, 230, 201, 228, 204, 216]

const CAT_COLORS = { blog: T.purple, social: T.accent, video: '#ff4500', doc: T.cyan, qa: T.orange }
const CAT_LABELS = { blog: 'Blog', social: 'Social', video: 'Video', doc: 'Document', qa: 'Q&A' }

const TIERS = [
  { min: 90, label: 'Tier 1', sublabel: 'DA 90+', color: T.green   },
  { min: 75, label: 'Tier 2', sublabel: 'DA 75-89', color: T.accent },
  { min: 60, label: 'Tier 3', sublabel: 'DA 60-74', color: T.yellow },
  { min: 0,  label: 'Tier 4', sublabel: 'DA <60',   color: T.muted  },
]

const CONTENT_TYPES = [
  { val: 'blog',   label: 'Business Blog Article',     words: 800  },
  { val: 'local',  label: 'Local SEO Area Page',       words: 700  },
  { val: 'tips',   label: 'Expert Tips (listicle)',    words: 700  },
  { val: 'about',  label: 'Branded About / Story',     words: 600  },
  { val: 'faq',    label: 'FAQ Page (10 questions)',   words: 800  },
  { val: 'press',  label: 'Press Release',             words: 500  },
]

function daColor(da) { return da >= 90 ? T.green : da >= 75 ? T.accent : da >= 60 ? T.yellow : T.muted }

function Card({ children, style }) {
  return <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, ...style }}>{children}</div>
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

export default function Web2Page({ session, clientId }) {
  const [profile,    setProfile]    = useState({})
  const [statuses,   setStatuses]   = useState({})   // { [id]: { status, url, date } }
  const [filter,     setFilter]     = useState('all')
  const [selected,   setSelected]   = useState(new Set())
  const [content,    setContent]    = useState('')
  const [keyword,    setKeyword]    = useState('')
  const [contentType,setContentType]= useState('blog')
  const [tone,       setTone]       = useState('Professional')
  const [generating, setGenerating] = useState(false)
  const [wordCount,  setWordCount]  = useState(0)
  const [urlInputId, setUrlInputId] = useState(null)
  const [urlInput,   setUrlInput]   = useState('')

  useEffect(() => {
    if (!clientId || !session) return
    supabase.from('client_data')
      .select('biz_name, biz_kw, biz_city, biz_website')
      .eq('id', clientId).eq('user_id', session.user.id).single()
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        if (data.biz_kw && !keyword) setKeyword(data.biz_kw.split(',')[0].trim())
      })

    supabase.from('w2_status')
      .select('platform_id, status, url, published_at')
      .eq('client_id', clientId).eq('user_id', session.user.id)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(r => { map[r.platform_id] = { status: r.status, url: r.url, date: r.published_at } })
        setStatuses(map)
      })
  }, [clientId, session])

  const getAuthHeader = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    return 'Bearer ' + s.access_token
  }

  const saveStatus = async (id, status, url) => {
    const now = new Date().toISOString()
    const newStatuses = { ...statuses, [id]: { status, url: url || '', date: status === 'published' ? now : null } }
    setStatuses(newStatuses)
    if (!clientId || !session) return
    await supabase.from('w2_status').upsert({
      platform_id: id,
      client_id: clientId,
      user_id: session.user.id,
      status,
      url: url || '',
      published_at: status === 'published' ? now : null,
      updated_at: now,
    }, { onConflict: 'platform_id,client_id,user_id' })
  }

  const markPublished = (id) => {
    setUrlInputId(id)
    setUrlInput('')
  }

  const confirmPublished = async () => {
    if (!urlInputId) return
    await saveStatus(urlInputId, 'published', urlInput)
    setUrlInputId(null)
    setUrlInput('')
  }

  const markDraft = (id) => saveStatus(id, 'draft', '')
  const markFailed = (id) => saveStatus(id, 'failed', '')
  const clearStatus = (id) => saveStatus(id, 'pending', '')

  const generateContent = useCallback(async () => {
    if (!keyword && !profile.biz_kw) return
    setGenerating(true)
    const kw    = keyword || profile.biz_kw?.split(',')[0]?.trim() || 'our service'
    const city  = profile.biz_city || 'our area'
    const biz   = profile.biz_name || 'our business'
    const site  = profile.biz_website || ''
    const ct    = CONTENT_TYPES.find(c => c.val === contentType)
    const words = ct?.words || 800

    const prompts = {
      blog:  `Write a ${words}-word business blog article for ${biz}, a ${kw} company in ${city}. Title should include "${kw} ${city}". Use H2 headers. Include a link to ${site || 'our website'}. Tone: ${tone}. End with a CTA.`,
      local: `Write a ${words}-word local SEO page for ${biz} serving ${city}. Focus on "${kw} in ${city}". Include: service area details, why choose us, local trust signals, schema-friendly structure. Link to ${site || 'our website'}.`,
      tips:  `Write a ${words}-word expert tips listicle titled "Top Tips for [related to ${kw}] in ${city}". 5-7 numbered tips. Practical and helpful. Mention ${biz} naturally as the expert source. Tone: ${tone}.`,
      about: `Write a ${words}-word branded About / Company Story for ${biz}, a ${kw} company in ${city}. Include: origin story, mission, services, why choose us, team values. Tone: authentic and trustworthy.`,
      faq:   `Write 10 FAQ questions and detailed answers for ${biz}, a ${kw} company in ${city}. Format: Q: [question]\nA: [answer]. Cover: pricing, process, availability, qualifications, service area. Include ${site || 'our website'} in one answer.`,
      press: `Write a ${words}-word press release announcing ${biz}'s services in ${city}. Standard press release format: headline, dateline, lead paragraph, quotes, boilerplate. Include contact info placeholder.`,
    }

    const prompt = prompts[contentType] || prompts.blog

    try {
      const auth = await getAuthHeader()
      const res = await fetch('https://ybhpbpahhywiokhqpldj.supabase.co/functions/v1/local-links-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify({ prompt, client_id: clientId }),
      })
      const data = await res.json()
      if (data.content) {
        setContent(data.content)
        setWordCount(data.content.split(/\s+/).filter(Boolean).length)
      } else {
        // Fallback
        const fallback = `${biz} - ${kw} Services in ${city}\n\n${biz} is a trusted ${kw} provider serving ${city} and surrounding areas.\n\nOur team of experienced professionals is dedicated to delivering high-quality ${kw} services at competitive prices.\n\nWhy Choose ${biz}?\n- Licensed and insured\n- 5-star rated service\n- Same-day availability\n- Transparent pricing\n- Local experts who know ${city}\n\nContact us today to schedule your service or get a free estimate. We proudly serve ${city} and all surrounding communities.\n\nVisit us at ${site || 'our website'} or call for immediate assistance.`
        setContent(fallback)
        setWordCount(fallback.split(/\s+/).filter(Boolean).length)
      }
    } catch {
      const fallback = `${biz} provides professional ${kw} services in ${city}. Contact us today for a free estimate.`
      setContent(fallback)
      setWordCount(fallback.split(/\s+/).filter(Boolean).length)
    }
    setGenerating(false)
  }, [keyword, profile, contentType, tone, clientId])

  const copyContent = () => { if (content) navigator.clipboard.writeText(content) }

  const toggleSelect = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const selectAll  = () => setSelected(new Set(filtered.map(p => p.id)))
  const selectNone = () => setSelected(new Set())
  const selectTop10 = () => {
    const top = [...W2].sort((a,b) => b.da - a.da).slice(0, 10).map(p => p.id)
    setSelected(new Set(top))
  }

  const filtered = W2.filter(p => {
    if (filter === 'published') return statuses[p.id]?.status === 'published'
    if (filter === 'pending')   return !statuses[p.id] || statuses[p.id]?.status === 'pending'
    if (['blog','social','video','doc','qa'].includes(filter)) return p.cat === filter
    return true
  }).sort((a,b) => b.da - a.da)

  const published = W2.filter(p => statuses[p.id]?.status === 'published').length
  const draft     = W2.filter(p => statuses[p.id]?.status === 'draft').length
  const avgDa     = published > 0 ? Math.round(W2.filter(p => statuses[p.id]?.status === 'published').reduce((s,p) => s + p.da, 0) / published) : 0
  const aiSignals = AI_SIGNAL_IDS.filter(id => statuses[id]?.status === 'published').length

  const inp = { width: '100%', background: T.cardBg2, border: '1.5px solid ' + T.border2, borderRadius: 7, padding: '8px 11px', fontSize: 12, color: T.text, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5, display: 'block' }

  return (
    <div style={{ background: T.pageBg, minHeight: '100vh', color: T.text, fontFamily: 'inherit' }}>

      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          <i className="ti ti-world" style={{ color: T.accentHi, marginRight: 10 }}></i>
          Web 2.0 & Content Syndication
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Publish branded content across {W2.length} platforms to build entity authority, contextual backlinks, and signals for Google, ChatGPT, and Gemini.
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Platforms',   val: W2.length,   color: T.muted  },
            { label: 'Published',   val: published,    color: T.green  },
            { label: 'Draft',       val: draft,        color: T.yellow },
            { label: 'Avg DA',      val: avgDa || '-', color: T.accent },
            { label: 'AI Signals',  val: aiSignals + '/' + AI_SIGNAL_IDS.length, color: T.purple },
          ].map(s => (
            <div key={s.label} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tier progress */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {TIERS.map(tier => {
            const tierPlatforms = W2.filter(p => tier.min === 0 ? p.da < 60 : p.da >= tier.min && (tier.min === 90 ? true : p.da < TIERS[TIERS.indexOf(tier)-1]?.min))
            const tierPub = tierPlatforms.filter(p => statuses[p.id]?.status === 'published').length
            const pct = tierPlatforms.length ? Math.round(tierPub / tierPlatforms.length * 100) : 0
            return (
              <div key={tier.label} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tier.color }}>{tier.label}</span>
                  <span style={{ fontSize: 11, color: T.muted }}>{tier.sublabel}</span>
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>{tierPub}/{tierPlatforms.length} published</div>
                <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: tier.color, borderRadius: 2, transition: 'width .5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* URL input modal */}
      {urlInputId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 12, padding: 24, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>Mark as Published</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>{W2.find(p => p.id === urlInputId)?.name}</div>
            <label style={lbl}>Published URL (optional)</label>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://medium.com/@you/article-slug" style={{ ...inp, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmPublished} style={{ flex: 1, padding: '8px 16px', background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Confirm Published
              </button>
              <button onClick={() => setUrlInputId(null)} style={{ padding: '8px 16px', background: 'transparent', color: T.muted, border: '1.5px solid ' + T.border2, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, padding: '0 28px 28px', alignItems: 'flex-start' }}>

        {/* LEFT — Content generator */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHead icon="ti ti-sparkles" title="AI Content Generator" sub="Platform-aware article writing" />
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>Content Type</label>
                <select value={contentType} onChange={e => setContentType(e.target.value)} style={inp}>
                  {CONTENT_TYPES.map(ct => <option key={ct.val} value={ct.val}>{ct.label} (~{ct.words} words)</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Target Keyword</label>
                <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="plumber austin tx" style={inp} />
              </div>
              <div>
                <label style={lbl}>Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} style={inp}>
                  {['Professional','Friendly & helpful','Expert authority','Local & community'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={generateContent} disabled={generating} style={{ padding: '8px 16px', background: generating ? '#1a3560' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: generating ? T.muted : '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={'ti ' + (generating ? 'ti-loader' : 'ti-sparkles')} style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }}></i>
                {generating ? 'Generating...' : 'Generate Article'}
              </button>

              {content && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted }}>
                    <span>{wordCount} words</span>
                    <button onClick={copyContent} style={{ fontSize: 11, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Copy</button>
                  </div>
                  <textarea
                    value={content}
                    onChange={e => { setContent(e.target.value); setWordCount(e.target.value.split(/\s+/).filter(Boolean).length) }}
                    rows={14}
                    style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontSize: 11 }}
                  />
                </>
              )}
            </div>
          </Card>

          {/* AI signal tracker */}
          <Card>
            <CardHead icon="ti ti-brain" title="AI Training Signals" sub="Platforms that feed LLM training data" />
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {AI_SIGNAL_IDS.map(id => {
                const p = W2.find(x => x.id === id)
                if (!p) return null
                const pub = statuses[id]?.status === 'published'
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <i className={'ti ' + (pub ? 'ti-circle-check' : 'ti-circle')} style={{ color: pub ? T.green : T.muted, fontSize: 13, flexShrink: 0 }}></i>
                    <span style={{ flex: 1, color: pub ? T.text : T.muted }}>{p.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: daColor(p.da) }}>DA {p.da}</span>
                  </div>
                )
              })}
              <div style={{ marginTop: 8, height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (aiSignals / AI_SIGNAL_IDS.length * 100) + '%', background: T.purple, borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>{aiSignals} of {AI_SIGNAL_IDS.length} AI signal platforms live</div>
            </div>
          </Card>
        </div>

        {/* RIGHT — Platform list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card>
            <CardHead
              icon="ti ti-world"
              title="Web 2.0 Platforms"
              sub={filtered.length + ' platforms'}
              right={
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAll} style={{ fontSize: 10, color: T.accentHi, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>All</button>
                  <button onClick={selectNone} style={{ fontSize: 10, color: T.muted, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>None</button>
                  <button onClick={selectTop10} style={{ fontSize: 10, color: T.yellow, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Top 10</button>
                </div>
              }
            />

            {/* Filter bar */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['all','blog','social','video','doc','qa','published','pending'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 10px', borderRadius: 20, border: '1.5px solid ' + (filter === f ? T.green : T.border2), background: filter === f ? 'rgba(16,185,129,.12)' : 'transparent', color: filter === f ? T.green : T.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Platform rows */}
            <div style={{ maxHeight: 680, overflowY: 'auto' }}>
              {filtered.map((p, i) => {
                const st  = statuses[p.id] || {}
                const sel = selected.has(p.id)
                const pub = st.status === 'published'
                const dft = st.status === 'draft'
                const fld = st.status === 'failed'
                const catColor = CAT_COLORS[p.cat] || T.muted
                const borderColor = pub ? T.green : dft ? T.yellow : fld ? T.red : T.border
                const isAI = AI_SIGNAL_IDS.includes(p.id)
                return (
                  <div key={p.id} style={{ padding: '11px 16px', borderBottom: i < filtered.length - 1 ? '1px solid ' + T.border : 'none', borderLeft: '3px solid ' + borderColor, background: sel ? 'rgba(59,130,246,.04)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Checkbox */}
                      <div onClick={() => toggleSelect(p.id)} style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid ' + (sel ? T.accent : T.border2), background: sel ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', marginTop: 2 }}>
                        {sel && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }}></i>}
                      </div>

                      {/* Platform icon */}
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: p.bg + '22', border: '1px solid ' + p.bg + '44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: p.bg, flexShrink: 0 }}>
                        {p.name.slice(0,2)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.name}</span>
                          {isAI && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 20, background: 'rgba(139,92,246,.15)', color: T.purple }}>AI</span>}
                          <span style={{ fontSize: 10, fontWeight: 700, color: daColor(p.da) }}>DA {p.da}</span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 12, background: catColor + '18', color: catColor, fontWeight: 600 }}>{CAT_LABELS[p.cat]}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{p.note}</div>
                        {/* Per-platform content brief */}
                        <div style={{ fontSize: 10, color: T.textSub, background: T.cardBg2, borderRadius: 6, padding: '5px 8px', lineHeight: 1.5, marginBottom: 6 }}>
                          {p.brief}
                        </div>
                        {pub && st.url && (
                          <a href={st.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: T.accentHi, textDecoration: 'none' }}>View live post</a>
                        )}
                      </div>

                      {/* Status + actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: pub ? 'rgba(16,185,129,.12)' : dft ? 'rgba(245,158,11,.1)' : fld ? 'rgba(248,113,113,.1)' : T.cardBg2, color: pub ? T.green : dft ? T.yellow : fld ? T.red : T.muted }}>
                          {pub ? 'Published' : dft ? 'Draft' : fld ? 'Failed' : 'Pending'}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!pub && <button onClick={() => markPublished(p.id)} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(16,185,129,.1)', color: T.green, border: '1px solid rgba(16,185,129,.2)', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Publish</button>}
                          {!pub && !dft && <button onClick={() => markDraft(p.id)} style={{ fontSize: 10, padding: '3px 8px', background: T.cardBg2, color: T.muted, border: '1px solid ' + T.border2, borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Draft</button>}
                          {pub && <button onClick={() => clearStatus(p.id)} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(248,113,113,.1)', color: T.red, border: '1px solid rgba(248,113,113,.2)', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Reset</button>}
                          <a href={'https://' + p.domain} target="_blank" rel="noreferrer" style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(59,130,246,.1)', color: T.accentHi, border: '1px solid rgba(59,130,246,.2)', borderRadius: 5, textDecoration: 'none', fontWeight: 600, fontFamily: 'inherit' }}>Open</a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <style>{'@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}
