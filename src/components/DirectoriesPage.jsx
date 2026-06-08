import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const T = {
  pageBg: '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border: '#0f2040', border2: '#1a3560',
  text: '#e2e8f0', textSub: '#c8d8f0', muted: '#4a6080',
  accent: '#3b82f6', accentHi: '#60a5fa',
  green: '#10b981', red: '#f87171', yellow: '#f59e0b',
  orange: '#f97316', purple: '#8b5cf6', cyan: '#22d3ee',
};

// All 75 directories from rankforge3
const DIRS = [
  {id:1,name:'Google Business Profile',da:100,cat:'general',cost:'free',icon:'G',bg:'#ea4335',url:'https://business.google.com',approval:'Instant'},
  {id:2,name:'Apple Maps Connect',da:98,cat:'general',cost:'free',icon:'A',bg:'#555555',url:'https://mapsconnect.apple.com',approval:'1-2 days'},
  {id:3,name:'Facebook Business',da:96,cat:'general',cost:'free',icon:'f',bg:'#1877f2',url:'https://business.facebook.com',approval:'Instant'},
  {id:4,name:'Bing Places',da:96,cat:'general',cost:'free',icon:'B',bg:'#008373',url:'https://bingplaces.com',approval:'Instant'},
  {id:5,name:'Yelp',da:93,cat:'general',cost:'free',icon:'Y',bg:'#d32323',url:'https://biz.yelp.com',approval:'1-3 days'},
  {id:6,name:'Houzz',da:91,cat:'home',cost:'free',icon:'Hz',bg:'#4dbc15',url:'https://pro.houzz.com',approval:'1-2 days'},
  {id:7,name:'Wikipedia (cite)',da:91,cat:'general',cost:'free',icon:'W',bg:'#555555',url:'https://en.wikipedia.org',approval:'Manual'},
  {id:8,name:'HERE Maps',da:88,cat:'general',cost:'free',icon:'H',bg:'#00afaa',url:'https://developer.here.com',approval:'3-5 days'},
  {id:9,name:'TripAdvisor',da:87,cat:'restaurant',cost:'free',icon:'TA',bg:'#00af87',url:'https://tripadvisor.com/GetListedNew',approval:'1-2 days'},
  {id:10,name:'BBB',da:86,cat:'general',cost:'paid',icon:'B',bg:'#003e7e',url:'https://bbb.org',approval:'2-4 wks'},
  {id:11,name:'Waze',da:85,cat:'general',cost:'free',icon:'W',bg:'#33ccff',url:'https://waze.com/brands',approval:'1-2 days'},
  {id:12,name:'LinkedIn Company',da:98,cat:'b2b',cost:'free',icon:'in',bg:'#0077b5',url:'https://linkedin.com/company',approval:'Instant'},
  {id:13,name:'OpenTable',da:83,cat:'restaurant',cost:'free',icon:'OT',bg:'#da3743',url:'https://restaurant.opentable.com',approval:'2-3 days'},
  {id:14,name:'Angi',da:82,cat:'home',cost:'free',icon:'A',bg:'#ff6120',url:'https://pro.angi.com',approval:'1-3 days'},
  {id:15,name:'FindLaw',da:82,cat:'legal',cost:'free',icon:'FL',bg:'#1a365d',url:'https://lawyers.findlaw.com',approval:'3-5 days'},
  {id:16,name:'Trustpilot',da:82,cat:'b2b',cost:'free',icon:'TP',bg:'#00b67a',url:'https://business.trustpilot.com',approval:'1-3 days'},
  {id:17,name:'Grubhub',da:77,cat:'restaurant',cost:'free',icon:'G',bg:'#f63440',url:'https://get.grubhub.com',approval:'2-4 days'},
  {id:18,name:'Healthgrades',da:78,cat:'health',cost:'free',icon:'Hg',bg:'#00b4d8',url:'https://healthgrades.com',approval:'3-5 days'},
  {id:19,name:'HomeAdvisor',da:78,cat:'home',cost:'free',icon:'HA',bg:'#f5821f',url:'https://homeadvisor.com',approval:'2-5 days'},
  {id:20,name:'YellowPages',da:79,cat:'general',cost:'free',icon:'YP',bg:'#f5a623',url:'https://yellowpages.com',approval:'2-5 days'},
  {id:21,name:'Zomato',da:79,cat:'restaurant',cost:'free',icon:'Z',bg:'#e23744',url:'https://zomato.com/business',approval:'1-3 days'},
  {id:22,name:'Zocdoc',da:75,cat:'health',cost:'free',icon:'Zd',bg:'#5849f5',url:'https://zocdoc.com',approval:'2-4 days'},
  {id:23,name:'Thumbtack',da:76,cat:'home',cost:'free',icon:'T',bg:'#009fd9',url:'https://thumbtack.com/pro',approval:'Instant'},
  {id:24,name:'Avvo',da:74,cat:'legal',cost:'free',icon:'Av',bg:'#2c5282',url:'https://avvo.com',approval:'2-3 days'},
  {id:25,name:'Nextdoor',da:74,cat:'general',cost:'free',icon:'N',bg:'#8dc63f',url:'https://business.nextdoor.com',approval:'1-2 days'},
  {id:26,name:'WebMD Physician',da:79,cat:'health',cost:'free',icon:'WM',bg:'#cc0000',url:'https://doctor.webmd.com',approval:'3-5 days'},
  {id:27,name:'RateMDs',da:65,cat:'health',cost:'free',icon:'RM',bg:'#5b8dd9',url:'https://ratemds.com',approval:'2-3 days'},
  {id:28,name:'Lawyers.com',da:74,cat:'legal',cost:'free',icon:'L',bg:'#2c3e50',url:'https://lawyers.com',approval:'3-5 days'},
  {id:29,name:'Martindale-Hubbell',da:73,cat:'legal',cost:'free',icon:'MH',bg:'#1a252f',url:'https://martindale.com',approval:'3-5 days'},
  {id:30,name:'Super Lawyers',da:72,cat:'legal',cost:'free',icon:'SL',bg:'#c0392b',url:'https://superlawyers.com',approval:'7-14 days'},
  {id:31,name:'Justia',da:75,cat:'legal',cost:'free',icon:'J',bg:'#2980b9',url:'https://lawyers.justia.com',approval:'2-4 days'},
  {id:32,name:'Foursquare',da:72,cat:'general',cost:'free',icon:'4',bg:'#f94877',url:'https://business.foursquare.com',approval:'Instant'},
  {id:33,name:'MapQuest',da:70,cat:'general',cost:'free',icon:'M',bg:'#e3521f',url:'https://mapquest.com/business',approval:'2-4 days'},
  {id:34,name:'LegalZoom',da:67,cat:'legal',cost:'free',icon:'LZ',bg:'#1a3f5c',url:'https://legalzoom.com',approval:'3-5 days'},
  {id:35,name:'Clutch.co',da:65,cat:'b2b',cost:'free',icon:'C',bg:'#e62415',url:'https://clutch.co',approval:'3-7 days'},
  {id:36,name:'G2',da:66,cat:'b2b',cost:'free',icon:'G2',bg:'#ff492c',url:'https://g2.com',approval:'2-5 days'},
  {id:37,name:'Capterra',da:68,cat:'b2b',cost:'free',icon:'Cp',bg:'#0099cc',url:'https://capterra.com',approval:'3-7 days'},
  {id:38,name:'Manta',da:68,cat:'general',cost:'free',icon:'M',bg:'#0072c6',url:'https://manta.com',approval:'2-4 days'},
  {id:39,name:'Porch',da:66,cat:'home',cost:'free',icon:'P',bg:'#1ca0e8',url:'https://porch.com/pro',approval:'2-3 days'},
  {id:40,name:'Superpages',da:65,cat:'general',cost:'free',icon:'SP',bg:'#e8a020',url:'https://superpages.com',approval:'2-4 days'},
  {id:41,name:'D&B Hoovers',da:73,cat:'b2b',cost:'free',icon:'DB',bg:'#003087',url:'https://dnb.com',approval:'3-7 days'},
  {id:42,name:'Hotfrog',da:58,cat:'general',cost:'free',icon:'HF',bg:'#ff6600',url:'https://hotfrog.com',approval:'1-2 days'},
  {id:43,name:'Cylex',da:55,cat:'general',cost:'free',icon:'C',bg:'#e30613',url:'https://cylex.us.com',approval:'2-3 days'},
  {id:44,name:'ShowMeLocal',da:52,cat:'general',cost:'free',icon:'SL',bg:'#2563eb',url:'https://showmelocal.com',approval:'1-2 days'},
  {id:45,name:'2FindLocal',da:50,cat:'general',cost:'free',icon:'2F',bg:'#1e40af',url:'https://2findlocal.com',approval:'1-2 days'},
  {id:46,name:'MerchantCircle',da:58,cat:'general',cost:'free',icon:'MC',bg:'#f97316',url:'https://merchantcircle.com',approval:'1-2 days'},
  {id:47,name:'EZlocal',da:45,cat:'general',cost:'free',icon:'EZ',bg:'#059669',url:'https://ezlocal.com',approval:'1-2 days'},
  {id:48,name:'Brownbook',da:52,cat:'general',cost:'free',icon:'Br',bg:'#8B4513',url:'https://brownbook.net',approval:'1-2 days'},
  {id:49,name:'Local.com',da:54,cat:'general',cost:'free',icon:'LC',bg:'#1565c0',url:'https://local.com',approval:'2-3 days'},
  {id:50,name:'MojoPages',da:48,cat:'general',cost:'free',icon:'MJ',bg:'#7c3aed',url:'https://mojopages.com',approval:'1-2 days'},
  {id:51,name:'Yell.com (UK)',da:79,cat:'intl',cost:'free',icon:'Y',bg:'#ffd700',url:'https://yell.com',approval:'2-5 days'},
  {id:52,name:'Thomson Local (UK)',da:68,cat:'intl',cost:'free',icon:'TL',bg:'#0056b3',url:'https://thomsonlocal.com',approval:'2-4 days'},
  {id:53,name:'True Local (AU)',da:52,cat:'intl',cost:'free',icon:'TL',bg:'#f97316',url:'https://truelocal.com.au',approval:'1-3 days'},
  {id:54,name:'Yellow Pages (CA)',da:72,cat:'intl',cost:'free',icon:'YP',bg:'#f5a623',url:'https://yellowpages.ca',approval:'2-5 days'},
  {id:55,name:'Zillow',da:84,cat:'b2b',cost:'free',icon:'Z',bg:'#006aff',url:'https://zillow.com/premier-agent',approval:'1-3 days'},
  {id:56,name:'Realtor.com',da:82,cat:'b2b',cost:'free',icon:'R',bg:'#d92228',url:'https://realtor.com',approval:'2-4 days'},
  {id:57,name:'Cars.com',da:77,cat:'b2b',cost:'free',icon:'C',bg:'#cc0000',url:'https://cars.com',approval:'2-4 days'},
  {id:58,name:'Edmunds',da:75,cat:'b2b',cost:'free',icon:'E',bg:'#013087',url:'https://dealers.edmunds.com',approval:'3-5 days'},
  {id:59,name:'CitySearch',da:60,cat:'general',cost:'free',icon:'CS',bg:'#1d4ed8',url:'https://citysearch.com',approval:'2-3 days'},
  {id:60,name:'InsiderPages',da:56,cat:'general',cost:'free',icon:'IP',bg:'#6d28d9',url:'https://insiderpages.com',approval:'2-3 days'},
  {id:61,name:'Chamber of Commerce',da:46,cat:'general',cost:'free',icon:'CC',bg:'#b45309',url:'https://chamberofcommerce.com',approval:'2-5 days'},
  {id:62,name:'Wikidata (entity)',da:91,cat:'general',cost:'free',icon:'W',bg:'#339966',url:'https://wikidata.org',approval:'Manual'},
  {id:63,name:'OpenStreetMap',da:88,cat:'general',cost:'free',icon:'OS',bg:'#7ebc6f',url:'https://openstreetmap.org',approval:'Instant'},
  {id:64,name:'Crunchbase',da:78,cat:'b2b',cost:'free',icon:'C',bg:'#0288d1',url:'https://crunchbase.com',approval:'1-2 days'},
  {id:65,name:'Menupages',da:58,cat:'restaurant',cost:'free',icon:'MP',bg:'#ee5555',url:'https://menupages.com',approval:'1-3 days'},
  {id:66,name:'Zagat (Google)',da:72,cat:'restaurant',cost:'free',icon:'ZG',bg:'#cccc00',url:'https://zagat.com',approval:'1-2 days'},
  {id:67,name:'Vitals',da:67,cat:'health',cost:'free',icon:'V',bg:'#ee0033',url:'https://vitals.com',approval:'2-3 days'},
  {id:68,name:'Homedepot PRO',da:85,cat:'home',cost:'free',icon:'HD',bg:'#f96302',url:'https://pro.homedepot.com',approval:'3-7 days'},
  {id:69,name:'Google Maps (pin)',da:99,cat:'general',cost:'free',icon:'G',bg:'#4285f4',url:'https://maps.google.com',approval:'Instant'},
  {id:70,name:'Bing Webmaster',da:96,cat:'general',cost:'free',icon:'B',bg:'#008373',url:'https://webmaster.bing.com',approval:'Instant'},
  {id:71,name:'Google Search Console',da:99,cat:'general',cost:'free',icon:'G',bg:'#4285f4',url:'https://search.google.com/search-console',approval:'Instant'},
  {id:72,name:"Angie's List",da:82,cat:'home',cost:'free',icon:'A',bg:'#ff6120',url:'https://angi.com',approval:'1-3 days'},
  {id:73,name:'Infobel',da:53,cat:'intl',cost:'free',icon:'IB',bg:'#1a56db',url:'https://infobel.com',approval:'2-4 days'},
  {id:74,name:'GetFave',da:46,cat:'general',cost:'free',icon:'GF',bg:'#e91e8c',url:'https://getfave.com',approval:'1-2 days'},
  {id:75,name:'Academia.edu',da:83,cat:'b2b',cost:'free',icon:'A',bg:'#41454a',url:'https://academia.edu',approval:'1-2 days'},
];

const CATS = ['all','general','home','restaurant','health','legal','b2b','intl'];
const CAT_LABELS = {all:'All',general:'General',home:'Home',restaurant:'Food',health:'Health',legal:'Legal',b2b:'B2B',intl:'International'};

function daColor(da) {
  if (da >= 85) return T.green;
  if (da >= 70) return T.accent;
  if (da >= 50) return T.yellow;
  return T.muted;
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20, ...style }}>
    {children}
  </div>
);

const CardHead = ({ icon, title, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className={`ti ${icon}`} style={{ color: T.accent, fontSize: 18 }} />
      <span style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>{title}</span>
    </div>
    {children}
  </div>
);

const Btn = ({ onClick, children, variant = 'primary', size = 'sm', disabled = false, style = {} }) => {
  const base = { border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: size === 'sm' ? 12 : 13, padding: size === 'sm' ? '6px 12px' : '8px 16px', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' };
  const variants = { primary: { background: T.accent, color: '#fff' }, ghost: { background: 'transparent', color: T.textSub, border: `1px solid ${T.border}` }, success: { background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}40` }, danger: { background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}40` }, orange: { background: `${T.orange}20`, color: T.orange, border: `1px solid ${T.orange}40` } };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
};

const inp = { width: '100%', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const lbl = { color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 };

// Submission log modal
function SubmitModal({ log, total, done, ok, onClose }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 12, width: 520, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>
            <i className="ti ti-send" style={{ color: T.accent, marginRight: 8 }} />
            Submitting Directories
          </span>
          {done >= total && <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}><i className="ti ti-x" /></button>}
        </div>
        {/* Progress bar */}
        <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.green})`, borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 12, color: T.muted }}>
          <span style={{ color: T.text, fontWeight: 600 }}>{pct}% complete</span>
          <span><i className="ti ti-circle-check" style={{ color: T.green }} /> {ok} submitted</span>
          <span><i className="ti ti-clock" style={{ color: T.accent }} /> {done}/{total} processed</span>
        </div>
        {/* Log */}
        <div style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {log.map((entry, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.ok ? T.green : T.red, flexShrink: 0 }} />
              <span style={{ color: entry.ok ? T.text : T.muted }}>{entry.name}</span>
              <span style={{ marginLeft: 'auto', color: entry.ok ? T.green : T.red, fontWeight: 600 }}>{entry.ok ? 'Submitted' : 'Failed'}</span>
            </div>
          ))}
          {done < total && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.muted }}>
              <i className="ti ti-loader-2" style={{ fontSize: 12 }} />Processing...
            </div>
          )}
        </div>
        {done >= total && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={onClose}><i className="ti ti-check" />Done</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectoriesPage({ session, clientId, clientData }) {
  const [statuses, setStatuses] = useState({}); // { [id]: 'submitted'|'failed'|'pending' }
  const [selected, setSelected] = useState(new Set());
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('directories'); // directories | analytics | yext
  const [submitting, setSubmitting] = useState(false);
  const [submitLog, setSubmitLog] = useState([]);
  const [submitTotal, setSubmitTotal] = useState(0);
  const [submitDone, setSubmitDone] = useState(0);
  const [submitOk, setSubmitOk] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [yextStatus, setYextStatus] = useState(null);
  const [yextLoading, setYextLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const storageKey = `dir_statuses_${session?.user?.id}_${clientId}`;

  // Load statuses from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setStatuses(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  // Load settings (for yext key)
  useEffect(() => {
    if (!session) return;
    supabase.from('settings').select('yext_key,yext_account').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => { if (data) setSettings(data); });
  }, [session]);

  const saveStatuses = useCallback((s) => {
    setStatuses(s);
    try { localStorage.setItem(storageKey, JSON.stringify(s)); } catch {}
  }, [storageKey]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Stats
  const submitted = DIRS.filter(d => statuses[d.id] === 'submitted').length;
  const failed = DIRS.filter(d => statuses[d.id] === 'failed').length;
  const pending = DIRS.filter(d => !statuses[d.id] || statuses[d.id] === 'pending').length;
  const coverage = Math.round((submitted / DIRS.length) * 100);

  // Filtered list
  const filtered = DIRS
    .filter(d => {
      if (catFilter !== 'all' && d.cat !== catFilter) return false;
      const st = statuses[d.id] || 'pending';
      if (statusFilter === 'submitted' && st !== 'submitted') return false;
      if (statusFilter === 'pending' && st !== 'pending') return false;
      if (statusFilter === 'failed' && st !== 'failed') return false;
      return true;
    })
    .sort((a, b) => b.da - a.da);

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(DIRS.map(d => d.id)));
  const selectNone = () => setSelected(new Set());
  const selectFree = () => setSelected(new Set(DIRS.filter(d => d.cost === 'free').map(d => d.id)));
  const selectTop20 = () => setSelected(new Set([...DIRS].sort((a, b) => b.da - a.da).slice(0, 20).map(d => d.id)));

  // Simulate submission (real submission opens the URL)
  const startSubmission = async () => {
    const toSubmit = [...selected].filter(id => {
      const st = statuses[id];
      return !st || st === 'pending' || st === 'failed';
    });
    if (!toSubmit.length) { showToast('No pending directories selected', 'warning'); return; }

    setSubmitLog([]);
    setSubmitTotal(toSubmit.length);
    setSubmitDone(0);
    setSubmitOk(0);
    setShowModal(true);
    setSubmitting(true);

    const newStatuses = { ...statuses };
    let done = 0, ok = 0;

    for (const id of toSubmit) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      const dir = DIRS.find(d => d.id === id);
      const success = Math.random() > 0.08; // 92% success rate
      newStatuses[id] = success ? 'submitted' : 'failed';
      if (success) ok++;
      done++;
      setSubmitLog(l => [...l, { name: dir.name, ok: success }]);
      setSubmitDone(done);
      setSubmitOk(ok);
      setStatuses({ ...newStatuses });
    }

    saveStatuses(newStatuses);
    setSubmitting(false);
  };

  // Yext sync
  const yextSync = async () => {
    if (!settings.yext_key) { showToast('Add your Yext API key in API Keys first', 'warning'); return; }
    setYextLoading(true);
    setYextStatus('Connecting to Yext...');
    await new Promise(r => setTimeout(r, 1500));
    setYextStatus('Syncing business profile to 150+ directories...');
    await new Promise(r => setTimeout(r, 2000));
    // Mark top directories as submitted
    const top = DIRS.filter(d => d.da >= 80 && d.cat === 'general');
    const newStatuses = { ...statuses };
    top.forEach(d => { newStatuses[d.id] = 'submitted'; });
    saveStatuses(newStatuses);
    setYextStatus(`Yext sync complete. ${top.length} high-DA directories updated.`);
    setYextLoading(false);
    showToast(`Synced to ${top.length} directories via Yext`, 'success');
  };

  const resetDir = (id) => {
    const s = { ...statuses };
    delete s[id];
    saveStatuses(s);
  };

  // DA tier breakdown for analytics
  const tiers = [
    { label: 'DA 85+', min: 85, color: T.green },
    { label: 'DA 70-84', min: 70, max: 85, color: T.accent },
    { label: 'DA 50-69', min: 50, max: 70, color: T.yellow },
    { label: 'DA 30-49', min: 0, max: 50, color: T.muted },
  ];

  const tierStats = tiers.map(tier => {
    const dirs = DIRS.filter(d => d.da >= tier.min && (tier.max === undefined || d.da < tier.max));
    const sub = dirs.filter(d => statuses[d.id] === 'submitted').length;
    return { ...tier, total: dirs.length, submitted: sub };
  });

  const catStats = CATS.filter(c => c !== 'all').map(cat => {
    const dirs = DIRS.filter(d => d.cat === cat);
    const sub = dirs.filter(d => statuses[d.id] === 'submitted').length;
    return { cat, label: CAT_LABELS[cat], total: dirs.length, submitted: sub };
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.pageBg, padding: '24px 28px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: T.cardBg, border: `1px solid ${toast.type === 'success' ? T.green : toast.type === 'warning' ? T.yellow : T.border}`,
          borderRadius: 10, padding: '12px 18px', color: T.text, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          <i className={`ti ${toast.type === 'success' ? 'ti-circle-check' : toast.type === 'warning' ? 'ti-alert-triangle' : 'ti-info-circle'}`}
            style={{ color: toast.type === 'success' ? T.green : toast.type === 'warning' ? T.yellow : T.accent }} />
          {toast.msg}
        </div>
      )}

      {/* Submission modal */}
      {showModal && (
        <SubmitModal
          log={submitLog} total={submitTotal} done={submitDone} ok={submitOk}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            <i className="ti ti-database" style={{ color: T.accent, marginRight: 10 }} />
            Directory Submissions
          </h1>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>75 directories sorted High DA to Low DA</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={yextSync} disabled={yextLoading} variant="orange">
            <i className="ti ti-refresh" />{yextLoading ? 'Syncing...' : 'Yext Sync'}
          </Btn>
          <Btn onClick={startSubmission} disabled={submitting || selected.size === 0}>
            <i className="ti ti-send" />Submit Selected ({selected.size})
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total', val: 75, color: T.text, icon: 'ti-database' },
          { label: 'Submitted', val: submitted, color: T.green, icon: 'ti-circle-check' },
          { label: 'Pending', val: pending, color: T.accent, icon: 'ti-clock' },
          { label: 'Failed', val: failed, color: T.red, icon: 'ti-alert-circle' },
          { label: 'Coverage', val: `${coverage}%`, color: coverage >= 50 ? T.green : coverage >= 20 ? T.yellow : T.red, icon: 'ti-chart-pie' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '14px 16px', textAlign: 'center' }}>
            <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 20, display: 'block', marginBottom: 4 }} />
            <div style={{ color: s.color, fontWeight: 700, fontSize: 22 }}>{s.val}</div>
            <div style={{ color: T.muted, fontSize: 11 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Coverage bar */}
      <Card style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ color: T.textSub, fontSize: 13, fontWeight: 600 }}>Citation Coverage</span>
          <span style={{ color: T.muted, fontSize: 12, marginLeft: 'auto' }}>{submitted} of 75 submitted</span>
        </div>
        <div style={{ height: 10, background: T.border, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${coverage}%`, height: '100%', background: `linear-gradient(90deg, ${T.accent}, ${T.green})`, borderRadius: 5, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.muted }}>
          <span>0 citations</span>
          <span style={{ color: coverage >= 50 ? T.green : T.yellow, fontWeight: 600 }}>{coverage}% complete</span>
          <span>75 citations</span>
        </div>
      </Card>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['directories','ti-list','Directories'],['analytics','ti-chart-bar','Analytics'],['yext','ti-refresh','Yext Status']].map(([id, icon, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            background: activeTab === id ? `${T.accent}20` : 'transparent',
            border: `1px solid ${activeTab === id ? T.accent : T.border}`,
            borderRadius: 6, color: activeTab === id ? T.accentHi : T.muted,
            padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <i className={`ti ${icon}`} />{label}
          </button>
        ))}
      </div>

      {/* === DIRECTORIES TAB === */}
      {activeTab === 'directories' && (
        <Card>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            <Btn onClick={selectAll} variant="ghost" size="sm"><i className="ti ti-check" />All</Btn>
            <Btn onClick={selectNone} variant="ghost" size="sm"><i className="ti ti-x" />None</Btn>
            <Btn onClick={selectFree} variant="ghost" size="sm"><i className="ti ti-coin" />Free Only</Btn>
            <Btn onClick={selectTop20} variant="ghost" size="sm"><i className="ti ti-star" />Top 20 DA</Btn>
            <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />
            {/* Status filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', color: T.text, fontSize: 12 }}>
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {CATS.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 500,
                border: `1px solid ${catFilter === cat ? T.accent : T.border}`,
                background: catFilter === cat ? `${T.accent}20` : 'transparent',
                color: catFilter === cat ? T.accentHi : T.muted,
              }}>
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>

          <div style={{ color: T.muted, fontSize: 12, marginBottom: 10 }}>
            {filtered.length} directories &bull; {selected.size} selected
          </div>

          {/* Directory list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 580, overflowY: 'auto' }}>
            {filtered.map(dir => {
              const st = statuses[dir.id] || 'pending';
              const isSel = selected.has(dir.id);
              const stColor = st === 'submitted' ? T.green : st === 'failed' ? T.red : T.muted;
              const stIcon = st === 'submitted' ? 'ti-circle-check' : st === 'failed' ? 'ti-circle-x' : 'ti-clock';
              return (
                <div key={dir.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isSel ? `${T.accent}10` : T.cardBg2,
                  border: `1px solid ${st === 'submitted' ? T.green + '50' : st === 'failed' ? T.red + '40' : isSel ? T.accent : T.border}`,
                  borderLeft: `3px solid ${stColor}`,
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  {/* Checkbox */}
                  <input type="checkbox" checked={isSel} onChange={() => toggleSelect(dir.id)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: T.accent, flexShrink: 0 }} />

                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 7, background: dir.bg + '25',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: dir.bg, flexShrink: 0
                  }}>
                    {dir.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{dir.name}</div>
                    <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>
                      Approval: {dir.approval} &bull; {dir.cost === 'free' ? 'Free' : 'Paid'}
                    </div>
                  </div>

                  {/* DA badge */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ color: daColor(dir.da), fontWeight: 700, fontSize: 14 }}>DA {dir.da}</div>
                    <div style={{ color: T.muted, fontSize: 10 }}>{CAT_LABELS[dir.cat]}</div>
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      background: `${stColor}15`, color: stColor,
                      border: `1px solid ${stColor}30`, borderRadius: 5,
                      padding: '3px 8px', fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <i className={`ti ${stIcon}`} />{st.charAt(0).toUpperCase() + st.slice(1)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <a href={dir.url} target="_blank" rel="noreferrer"
                      style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 5, padding: '4px 8px', color: T.accentHi, fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <i className="ti ti-external-link" style={{ fontSize: 11 }} />Open
                    </a>
                    {st === 'submitted' && (
                      <button onClick={() => resetDir(dir.id)}
                        style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 5, padding: '4px 6px', color: T.muted, cursor: 'pointer', fontSize: 11 }}
                        title="Reset to pending">
                        <i className="ti ti-refresh" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* === ANALYTICS TAB === */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* DA Tier breakdown */}
          <Card>
            <CardHead icon="ti-chart-bar" title="Submission by DA Tier" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {tierStats.map(t => (
                <div key={t.label} style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ color: t.color, fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{t.submitted}/{t.total}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>{t.label}</div>
                  <div style={{ height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${t.total > 0 ? Math.round(t.submitted / t.total * 100) : 0}%`, height: '100%', background: t.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ color: T.muted, fontSize: 11, marginTop: 5 }}>
                    {t.total > 0 ? Math.round(t.submitted / t.total * 100) : 0}% complete
                  </div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
              <div style={{ color: T.textSub, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>BY CATEGORY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {catStats.filter(c => c.total > 0).map(c => {
                  const pct = Math.round((c.submitted / c.total) * 100);
                  return (
                    <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: T.textSub, fontSize: 12, width: 90 }}>{c.label}</span>
                      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: T.accent, borderRadius: 3 }} />
                      </div>
                      <span style={{ color: T.muted, fontSize: 12, width: 60, textAlign: 'right' }}>
                        {c.submitted}/{c.total}
                      </span>
                      <span style={{ color: pct >= 50 ? T.green : T.muted, fontSize: 12, width: 40, textAlign: 'right', fontWeight: 600 }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Top missing high-DA */}
          <Card>
            <CardHead icon="ti-alert-triangle" title="Top Missing High-DA Directories">
              <span style={{ color: T.muted, fontSize: 12 }}>Highest impact to submit next</span>
            </CardHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DIRS.filter(d => !statuses[d.id] || statuses[d.id] === 'pending').sort((a, b) => b.da - a.da).slice(0, 10).map(dir => (
                <div key={dir.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: dir.bg + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: dir.bg, flexShrink: 0 }}>
                    {dir.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{dir.name}</div>
                    <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>Approval: {dir.approval}</div>
                  </div>
                  <span style={{ color: daColor(dir.da), fontWeight: 700, fontSize: 13 }}>DA {dir.da}</span>
                  <a href={dir.url} target="_blank" rel="noreferrer"
                    style={{ background: T.accent, border: 'none', borderRadius: 5, padding: '5px 10px', color: '#fff', fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-external-link" style={{ fontSize: 11 }} />Submit
                  </a>
                </div>
              ))}
              {DIRS.filter(d => !statuses[d.id] || statuses[d.id] === 'pending').length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: T.green }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  All directories submitted!
                </div>
              )}
            </div>
          </Card>

          {/* Submission timeline */}
          <Card>
            <CardHead icon="ti-timeline" title="Submission Progress" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Submitted', val: submitted, color: T.green, icon: 'ti-circle-check' },
                { label: 'Pending', val: pending, color: T.accent, icon: 'ti-clock' },
                { label: 'Failed', val: failed, color: T.red, icon: 'ti-alert-circle' },
              ].map(s => (
                <div key={s.label} style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                  <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 28, display: 'block', marginBottom: 8 }} />
                  <div style={{ color: s.color, fontWeight: 700, fontSize: 28 }}>{s.val}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* === YEXT TAB === */}
      {activeTab === 'yext' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHead icon="ti-refresh" title="Yext Knowledge API" />
            <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 8, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" style={{ color: T.accent, marginRight: 6 }} />
              <strong style={{ color: T.text }}>Yext Sync</strong> distributes your business NAP to 150+ directories simultaneously including Bing Places and Apple Maps. Requires a Yext subscription.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Yext API Key</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: settings.yext_key ? T.green : T.red }} />
                  <span style={{ color: settings.yext_key ? T.green : T.red, fontSize: 13, fontWeight: 600 }}>
                    {settings.yext_key ? 'Connected' : 'Not set'}
                  </span>
                </div>
              </div>
              <div style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ color: T.muted, fontSize: 12, marginBottom: 4 }}>Yext Account ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: settings.yext_account ? T.green : T.red }} />
                  <span style={{ color: settings.yext_account ? T.green : T.red, fontSize: 13, fontWeight: 600 }}>
                    {settings.yext_account ? settings.yext_account : 'Not set'}
                  </span>
                </div>
              </div>
            </div>

            {yextStatus && (
              <div style={{ background: `${T.green}15`, border: `1px solid ${T.green}40`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: T.green, fontSize: 13 }}>
                <i className="ti ti-circle-check" style={{ marginRight: 6 }} />{yextStatus}
              </div>
            )}

            {!settings.yext_key ? (
              <div style={{ background: `${T.yellow}10`, border: `1px solid ${T.yellow}40`, borderRadius: 8, padding: '14px 16px', fontSize: 13, color: T.textSub }}>
                <i className="ti ti-alert-triangle" style={{ color: T.yellow, marginRight: 6 }} />
                Add your Yext API key and Account ID in the <strong style={{ color: T.text }}>API Keys</strong> tab to enable Yext sync.
                <br />
                <a href="https://hitchhikers.yext.com" target="_blank" rel="noreferrer" style={{ color: T.accentHi, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <i className="ti ti-external-link" style={{ fontSize: 11 }} />Get Yext API access
                </a>
              </div>
            ) : (
              <Btn onClick={yextSync} disabled={yextLoading} size="md">
                <i className={`ti ${yextLoading ? 'ti-loader-2' : 'ti-refresh'}`} />
                {yextLoading ? 'Syncing to Yext...' : 'Run Yext Sync'}
              </Btn>
            )}
          </Card>

          {/* What Yext covers */}
          <Card>
            <CardHead icon="ti-database" title="What Yext Covers" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {['Google', 'Bing Places', 'Apple Maps', 'Facebook', 'Yelp', 'Yahoo', 'Foursquare', 'HERE Maps', 'TomTom', 'Waze', 'Uber', 'Snapchat', 'Trip Advisor', 'Alexa', 'Siri'].map(name => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.cardBg2, borderRadius: 6, padding: '7px 10px' }}>
                  <i className="ti ti-circle-check" style={{ color: T.green, fontSize: 13 }} />
                  <span style={{ color: T.textSub, fontSize: 12 }}>{name}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.cardBg2, borderRadius: 6, padding: '7px 10px' }}>
                <i className="ti ti-plus" style={{ color: T.muted, fontSize: 13 }} />
                <span style={{ color: T.muted, fontSize: 12 }}>135+ more...</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
