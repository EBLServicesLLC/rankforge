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

const IDX_CHECKS = [
  { id:'ic1',  text:'Submit sitemap to Google Search Console',          important:true,  url:'https://search.google.com/search-console',   engine:'Google'   },
  { id:'ic2',  text:'Submit sitemap to Bing Webmaster Tools',           important:true,  url:'https://webmaster.bing.com',                 engine:'Bing'     },
  { id:'ic3',  text:'Implement IndexNow for instant Bing indexing',     important:true,  url:'https://www.indexnow.org',                   engine:'Bing'     },
  { id:'ic4',  text:'Add Schema.org LocalBusiness JSON-LD to site',     important:true,  url:'https://schema.org/LocalBusiness',           engine:'All'      },
  { id:'ic5',  text:'Verify Google Business Profile listing',           important:true,  url:'https://business.google.com',               engine:'Google'   },
  { id:'ic6',  text:'Create XML sitemap with all key pages',            important:true,  url:'https://www.xml-sitemaps.com',              engine:'All'      },
  { id:'ic7',  text:'Set up robots.txt correctly (allow key crawlers)', important:true,  url:null,                                        engine:'All'      },
  { id:'ic8',  text:'Submit URL via Google URL Inspection tool',        important:false, url:'https://search.google.com/search-console/inspect', engine:'Google' },
  { id:'ic9',  text:'Validate structured data in Rich Results Test',    important:false, url:'https://search.google.com/test/rich-results', engine:'Google' },
  { id:'ic10', text:'Check Core Web Vitals in PageSpeed Insights',      important:false, url:'https://pagespeed.web.dev',                 engine:'Google'   },
  { id:'ic11', text:'Add Open Graph and Twitter Card meta tags',        important:false, url:null,                                        engine:'Social'   },
  { id:'ic12', text:'Submit to Yandex Webmaster (international SEO)',   important:false, url:'https://webmaster.yandex.com',              engine:'Yandex'   },
]

const AI_CHECKS = [
  { id:'ai1',  text:'Create Wikidata entity for the business',                     engine:'All AI',        url:'https://wikidata.org/wiki/Special:NewItem' },
  { id:'ai2',  text:'Get cited as a reference in Wikipedia',                       engine:'All AI',        url:'https://en.wikipedia.org'                  },
  { id:'ai3',  text:'Optimise Google Knowledge Panel (Schema + GBP)',              engine:'Gemini',        url:'https://business.google.com'               },
  { id:'ai4',  text:'Use IndexNow to push content to Bing immediately',            engine:'ChatGPT',       url:'https://www.indexnow.org'                  },
  { id:'ai5',  text:'Submit to Bing Webmaster Tools and Bing Places',              engine:'ChatGPT',       url:'https://webmaster.bing.com'                },
  { id:'ai6',  text:'Add Organization Schema with sameAs links to all profiles',   engine:'All AI',        url:'https://schema.org/Organization'           },
  { id:'ai7',  text:'Maintain consistent NAP across 50+ directories',              engine:'All AI',        url:null                                        },
  { id:'ai8',  text:'Earn mentions in DA 70+ authoritative publications',          engine:'All AI',        url:null                                        },
  { id:'ai9',  text:'Create DBpedia entry via Wikipedia article',                  engine:'Claude/Gemini', url:'https://dbpedia.org'                       },
  { id:'ai10', text:'Publish Common Crawl-indexed public blog content',            engine:'Claude',        url:null                                        },
  { id:'ai11', text:'Get featured in major online trade publications',             engine:'All AI',        url:null                                        },
  { id:'ai12', text:'Add sameAs schema linking all brand profiles',                engine:'All AI',        url:null                                        },
  { id:'ai13', text:'Maintain active LinkedIn Company Page with content',          engine:'All AI',        url:'https://linkedin.com/company'              },
  { id:'ai14', text:'Get listed on Crunchbase and business databases',             engine:'Claude/ChatGPT',url:'https://crunchbase.com'                    },
]

const PING_LIST = [
  { name:'IndexNow',              url:'https://www.indexnow.org',                     note:'Instantly notifies Bing, Yandex, Seznam, Naver',    engines:'Bing / ChatGPT / Yandex' },
  { name:'Bing URL Submit',       url:'https://webmaster.bing.com',                   note:'Direct URL submission to Bing Webmaster',           engines:'Bing / ChatGPT'          },
  { name:'Google Search Console', url:'https://search.google.com/search-console',     note:'URL inspection + request indexing',                 engines:'Google / Gemini'         },
  { name:'Google Sitemap Ping',   url:'https://www.google.com/ping?sitemap=',         note:'Append your sitemap URL to this ping URL',          engines:'Google'                  },
  { name:'Ping-O-Matic',          url:'https://pingomatic.com',                       note:'Pings 20+ blog/feed directories at once',           engines:'Multiple'                },
  { name:'Yandex Webmaster',      url:'https://webmaster.yandex.com',                 note:'International - covers Russian + CIS search',       engines:'Yandex'                  },
]

const AI_ENGINES = [
  {
    name:'Google & Gemini', color:'#4285f4', icon:'ti ti-brand-google',
    desc:'Crawls via Googlebot. Ranks by E-E-A-T and entity authority. Gemini uses Google\'s Knowledge Graph as primary training data.',
    keys:'Schema.org markup, Google Business Profile, Knowledge Panel, Search Console, Core Web Vitals',
  },
  {
    name:'ChatGPT (OpenAI)', color:'#10a37f', icon:'ti ti-message-chatbot',
    desc:'ChatGPT Search uses Bing\'s index. Training data = Common Crawl, Wikipedia. Getting into Bing fast = IndexNow protocol.',
    keys:'IndexNow, Bing Webmaster, Wikipedia citations, Wikidata entity, Bing Places',
  },
  {
    name:'Claude (Anthropic)', color: '#8b5cf6', icon:'ti ti-sparkles',
    desc:'Trained on Common Crawl, Wikipedia, books. No live search unless connected. Knowledge from training cutoff.',
    keys:'Wikipedia presence, Wikidata entity, Authoritative publications, Consistent NAP, Schema.org Organization',
  },
]

const ENGINE_COLORS = {
  'All AI':        '#8b5cf6',
  'Gemini':        '#4285f4',
  'ChatGPT':       '#10a37f',
  'Claude':        '#f97316',
  'Claude/Gemini': '#22d3ee',
  'Claude/ChatGPT':'#f97316',
  'Google':        '#4285f4',
  'Bing':          '#008373',
  'All':           '#10b981',
  'Social':        '#1877f2',
  'Yandex':        '#cc0000',
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
        <i className={icon} style={{ color: T.accentHi }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function EngineBadge({ engine }) {
  const color = ENGINE_COLORS[engine] || T.muted
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: color + '18', padding: '1px 7px', borderRadius: 10 }}>
      {engine}
    </span>
  )
}

function CheckItem({ item, checked, onToggle }) {
  return (
    <div onClick={onToggle}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid ' + T.border, cursor: 'pointer' }}>
      <div style={{
        width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1,
        border: '1.5px solid ' + (checked ? T.green : T.border2),
        background: checked ? T.green : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .13s',
      }}>
        {checked && <i className="ti ti-check" style={{ fontSize: 10, color: '#fff' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: checked ? T.muted : T.text, textDecoration: checked ? 'line-through' : 'none', lineHeight: 1.4 }}>
          {item.text}
          {item.important && !checked && (
            <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.yellow, background: T.yellow + '18', padding: '1px 5px', borderRadius: 8 }}>Key</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <EngineBadge engine={item.engine} />
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: T.accentHi, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              <i className="ti ti-external-link" style={{ fontSize: 10 }} />Open
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IndexingPage({ session, clientId }) {
  const [checks,     setChecks]     = useState({})
  const [pageUrl,    setPageUrl]    = useState('')
  const [sitemapUrl, setSitemapUrl] = useState('')
  const [indexKey,   setIndexKey]   = useState('')
  const [pinging,    setPinging]    = useState(false)
  const [pingResult, setPingResult] = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!session) return
    Promise.all([
      supabase.from('indexing_checks')
        .select('check_id,checked')
        .eq('user_id', session.user.id)
        .eq('client_id', clientId || '00000000-0000-0000-0000-000000000000'),
      supabase.from('settings')
        .select('indexnow_key,biz_website')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      clientId ? supabase.from('client_data')
        .select('biz_website')
        .eq('client_id', clientId)
        .eq('user_id', session.user.id)
        .maybeSingle() : Promise.resolve({ data: null }),
    ]).then(([{ data: chkData }, { data: settings }, { data: client }]) => {
      if (chkData) {
        const map = {}
        chkData.forEach(r => { map[r.check_id] = r.checked })
        setChecks(map)
      }
      if (settings?.indexnow_key) setIndexKey(settings.indexnow_key)
      const site = client?.biz_website || settings?.biz_website || ''
      if (site) {
        setPageUrl(site)
        setSitemapUrl(site.replace(/\/$/, '') + '/sitemap.xml')
      }
      setLoading(false)
    })
  }, [session, clientId])

  const toggleCheck = useCallback(async (id) => {
    const next = { ...checks, [id]: !checks[id] }
    setChecks(next)
    if (!session) return
    await supabase.from('indexing_checks').upsert({
      user_id:   session.user.id,
      client_id: clientId || '00000000-0000-0000-0000-000000000000',
      check_id:  id,
      checked:   next[id],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,client_id,check_id' })
  }, [checks, session, clientId])

  async function sendIndexNow() {
    if (!pageUrl) { setPingResult({ ok: false, msg: 'Enter a page URL first.' }); return }
    const key = indexKey || 'YOUR_INDEXNOW_KEY'
    const pingUrl = 'https://www.bing.com/indexnow?url=' + encodeURIComponent(pageUrl) + '&key=' + key
    window.open(pingUrl, '_blank')
    setPingResult({ ok: true, msg: 'IndexNow ping opened in new tab. Bing and Yandex will crawl this URL shortly.' + (!indexKey ? ' Add your IndexNow key in API Keys for authenticated pings.' : '') })
  }

  async function pingSitemap() {
    if (!sitemapUrl) { setPingResult({ ok: false, msg: 'Enter a sitemap URL first.' }); return }
    window.open('https://www.google.com/ping?sitemap=' + encodeURIComponent(sitemapUrl), '_blank')
    window.open('https://www.bing.com/ping?sitemap=' + encodeURIComponent(sitemapUrl), '_blank')
    setPingResult({ ok: true, msg: 'Sitemap pinged to Google and Bing. Both tabs opened.' })
  }

  const idxDone  = IDX_CHECKS.filter(c => checks['idx_' + c.id]).length
  const aiDone   = AI_CHECKS.filter(c => checks['ai_' + c.id]).length
  const totalDone = idxDone + aiDone
  const totalAll  = IDX_CHECKS.length + AI_CHECKS.length

  const inp = {
    width: '100%', background: T.cardBg2, border: '1px solid ' + T.border2,
    borderRadius: 7, color: T.text, padding: '8px 12px',
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
  }

  const btn = (color) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    background: color + '18', color, border: '1px solid ' + color + '40',
    borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ padding: '20px 24px', minHeight: '100%', background: T.pageBg, color: T.text, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Indexing & AI Visibility</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          Get content found by Google, Bing, and the AI systems (ChatGPT, Claude, Gemini). Each works differently and needs a different strategy.
        </div>
        {!loading && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 5, flex: 1, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: T.green, width: Math.round(totalDone / totalAll * 100) + '%', borderRadius: 3, transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{totalDone}/{totalAll} tasks complete</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
          Loading...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* AI Engine explainers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {AI_ENGINES.map(e => (
              <div key={e.name} style={{ background: T.cardBg, border: '1px solid ' + T.border2, borderRadius: 10, borderTop: '3px solid ' + e.color, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <i className={e.icon} style={{ color: e.color, fontSize: 16 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{e.name}</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 8 }}>{e.desc}</div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>
                  <span style={{ color: T.muted }}>Keys: </span>{e.keys}
                </div>
              </div>
            ))}
          </div>

          {/* URL Submission Hub + Ping list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <Card>
              <CardHead icon="ti ti-radar" title="URL Submission Hub" sub="Submit pages and sitemaps for crawling" />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Page URL to index</div>
                  <input type="url" value={pageUrl} onChange={e => setPageUrl(e.target.value)} placeholder="https://yourdomain.com/page" style={inp} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Sitemap URL</div>
                  <input type="url" value={sitemapUrl} onChange={e => setSitemapUrl(e.target.value)} placeholder="https://yourdomain.com/sitemap.xml" style={inp} />
                </div>
                {!indexKey && (
                  <div style={{ fontSize: 11, color: T.orange, background: T.orange + '10', border: '1px solid ' + T.orange + '30', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
                    <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
                    Add your IndexNow key in API Keys for authenticated pings
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <a href="https://search.google.com/search-console/inspect" target="_blank" rel="noreferrer" style={{ ...btn('#4285f4'), textDecoration: 'none' }}>
                    <i className="ti ti-brand-google" />Open Google Search Console
                  </a>
                  <a href="https://www.bing.com/webmasters/url-submission" target="_blank" rel="noreferrer" style={{ ...btn(T.accent), textDecoration: 'none' }}>
                    <i className="ti ti-brand-windows" />Open Bing URL Submit
                  </a>
                  <button onClick={sendIndexNow} style={btn(T.cyan)}>
                    <i className="ti ti-bolt" />Send IndexNow Ping (Bing + Yandex)
                  </button>
                  <button onClick={pingSitemap} style={btn(T.green)}>
                    <i className="ti ti-rss" />Ping Sitemap to Search Engines
                  </button>
                  <a href="https://validator.schema.org/" target="_blank" rel="noreferrer" style={{ ...btn(T.purple), textDecoration: 'none' }}>
                    <i className="ti ti-code" />Validate Schema Markup
                  </a>
                </div>

                {pingResult && (
                  <div style={{ marginTop: 10, fontSize: 11, color: pingResult.ok ? T.green : T.red, background: (pingResult.ok ? T.green : T.red) + '10', border: '1px solid ' + (pingResult.ok ? T.green : T.red) + '30', borderRadius: 6, padding: '6px 10px', lineHeight: 1.5 }}>
                    <i className={pingResult.ok ? 'ti ti-circle-check' : 'ti ti-alert-triangle'} style={{ marginRight: 4 }} />
                    {pingResult.msg}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHead icon="ti ti-wifi" title="Indexing Services & Protocols" sub="Submit to multiple engines" />
              <div style={{ padding: '4px 16px' }}>
                {PING_LIST.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < PING_LIST.length - 1 ? '1px solid ' + T.border : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{p.note}</div>
                      <div style={{ fontSize: 10, color: T.border2, marginTop: 1 }}>{p.engines}</div>
                    </div>
                    <a href={p.url} target="_blank" rel="noreferrer"
                      style={{ padding: '5px 10px', background: T.cardBg2, border: '1px solid ' + T.border2, borderRadius: 6, color: T.muted, fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <i className="ti ti-external-link" style={{ fontSize: 11 }} />Open
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Checklists */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <Card>
              <CardHead
                icon="ti ti-checklist"
                title="Technical Indexing Checklist"
                sub={idxDone + '/' + IDX_CHECKS.length + ' complete'}
                right={
                  <div style={{ fontSize: 11, fontWeight: 700, color: idxDone === IDX_CHECKS.length ? T.green : T.muted }}>
                    {Math.round(idxDone / IDX_CHECKS.length * 100)}%
                  </div>
                }
              />
              <div style={{ padding: '4px 16px' }}>
                {IDX_CHECKS.map(item => (
                  <CheckItem
                    key={item.id}
                    item={item}
                    checked={!!checks['idx_' + item.id]}
                    onToggle={() => toggleCheck('idx_' + item.id)}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <CardHead
                icon="ti ti-brain"
                title="AI Search Visibility Checklist"
                sub={aiDone + '/' + AI_CHECKS.length + ' complete'}
                right={
                  <div style={{ fontSize: 11, fontWeight: 700, color: aiDone === AI_CHECKS.length ? T.green : T.muted }}>
                    {Math.round(aiDone / AI_CHECKS.length * 100)}%
                  </div>
                }
              />
              <div style={{ padding: '4px 16px' }}>
                {AI_CHECKS.map(item => (
                  <CheckItem
                    key={item.id}
                    item={item}
                    checked={!!checks['ai_' + item.id]}
                    onToggle={() => toggleCheck('ai_' + item.id)}
                  />
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  )
}
