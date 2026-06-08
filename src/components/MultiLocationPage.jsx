import { useState, useCallback } from 'react';

const T = {
  pageBg: '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border: '#0f2040', border2: '#1a3560',
  text: '#e2e8f0', textSub: '#c8d8f0', muted: '#4a6080',
  accent: '#3b82f6', accentHi: '#60a5fa',
  green: '#10b981', red: '#f87171', yellow: '#f59e0b',
  orange: '#f97316', purple: '#8b5cf6', cyan: '#22d3ee',
};

const DIRS_SAMPLE = [
  {id:1,name:'Google Business Profile',da:100,icon:'G',bg:'#ea4335'},
  {id:2,name:'Apple Maps Connect',da:98,icon:'A',bg:'#555'},
  {id:3,name:'Facebook Business',da:96,icon:'f',bg:'#1877f2'},
  {id:4,name:'Bing Places',da:96,icon:'B',bg:'#008373'},
  {id:5,name:'Yelp',da:93,icon:'Y',bg:'#d32323'},
  {id:6,name:'LinkedIn Company',da:98,icon:'in',bg:'#0077b5'},
  {id:7,name:'Houzz',da:91,icon:'Hz',bg:'#4dbc15'},
  {id:8,name:'Wikidata',da:91,icon:'W',bg:'#339966'},
  {id:9,name:'HERE Maps',da:88,icon:'H',bg:'#00afaa'},
  {id:10,name:'TripAdvisor',da:87,icon:'TA',bg:'#00af87'},
  {id:11,name:'Waze',da:85,icon:'W',bg:'#33ccff'},
  {id:12,name:'Homedepot PRO',da:85,icon:'HD',bg:'#f96302'},
  {id:13,name:'Zillow',da:84,icon:'Z',bg:'#006aff'},
  {id:14,name:'BBB',da:86,icon:'B',bg:'#003e7e'},
  {id:15,name:'YellowPages',da:79,icon:'YP',bg:'#f5a623'},
  {id:16,name:'Nextdoor',da:74,icon:'N',bg:'#8dc63f'},
  {id:17,name:'Foursquare',da:72,icon:'4',bg:'#f94877'},
  {id:18,name:'MapQuest',da:70,icon:'M',bg:'#e3521f'},
  {id:19,name:'Manta',da:68,icon:'M',bg:'#0072c6'},
  {id:20,name:'Crunchbase',da:78,icon:'C',bg:'#0288d1'},
];

const CATEGORIES = ['Home Services','Restaurant','Healthcare','Finance','Legal','Retail','Real Estate','Automotive','Beauty & Wellness','Education','Technology','General'];

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
  const variants = { primary: { background: T.accent, color: '#fff' }, ghost: { background: 'transparent', color: T.textSub, border: `1px solid ${T.border}` }, success: { background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}40` }, danger: { background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}40` } };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
};

const inp = { width: '100%', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

function genSchema(loc) {
  const typeMap = { 'Home Services': 'HomeAndConstructionBusiness', Restaurant: 'Restaurant', Healthcare: 'MedicalBusiness', Legal: 'LegalService', Automotive: 'AutomotiveBusiness' };
  const schema = {
    '@context': 'https://schema.org',
    '@type': typeMap[loc.category] || 'LocalBusiness',
    name: loc.name || 'Business',
    url: loc.website || '',
    telephone: loc.phone || '',
    openingHours: loc.hours || 'Mo-Fr 08:00-17:00',
  };
  if (loc.isSAB) {
    if (loc.city || loc.state) {
      schema.address = { '@type': 'PostalAddress', addressLocality: loc.city || '', addressRegion: loc.state || '', addressCountry: 'US' };
    }
    const areas = (loc.serviceAreas || []).filter(a => a.trim());
    if (areas.length) { schema.areaServed = areas.map(a => ({ '@type': 'City', name: a })); }
  } else {
    schema.address = { '@type': 'PostalAddress', streetAddress: loc.addr || '', addressLocality: loc.city || '', addressRegion: loc.state || '', postalCode: loc.zip || '', addressCountry: 'US' };
  }
  return JSON.stringify(schema, null, 2);
}

function newLoc(overrides = {}) {
  return {
    id: Date.now() + Math.random(),
    name: '', addr: '', city: '', state: '', zip: '',
    phone: '', website: '', hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    category: '', notes: '', isPrimary: false, dSt: {},
    isSAB: false, serviceAreas: [], sabRadius: '', sabChecklist: {},
    ...overrides,
  };
}

export default function MultiLocationPage({ session, clientId }) {
  const storageKey = `mloc_${session?.user?.id}_${clientId}`;
  const load = () => { try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : []; } catch { return []; } };

  const [locations, setLocations] = useState(load);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState('locations'); // locations | compare | schema
  const [dirFilter, setDirFilter] = useState('all');
  const [compareFilter, setCompareFilter] = useState('all');
  const [submittingId, setSubmittingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  const save = useCallback((locs) => {
    setLocations(locs);
    try { localStorage.setItem(storageKey, JSON.stringify(locs)); } catch {}
  }, [storageKey]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeLoc = locations.find(l => l.id === activeId) || null;

  const addLocation = () => {
    if (locations.length >= 10) { showToast('Maximum 10 locations', 'warning'); return; }
    const loc = newLoc({ isPrimary: locations.length === 0 });
    const next = [...locations, loc];
    save(next);
    setActiveId(loc.id);
    showToast('New location added', 'info');
  };

  const deleteLocation = (id) => {
    const next = locations.filter(l => l.id !== id);
    save(next);
    if (activeId === id) setActiveId(next.length ? next[0].id : null);
    showToast('Location deleted', 'info');
  };

  const updateField = (id, field, val) => {
    save(locations.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const setPrimary = (id) => {
    save(locations.map(l => ({ ...l, isPrimary: l.id === id })));
    showToast('Primary location updated', 'success');
  };

  // Submit top 20 dirs for a location (simulated)
  const submitLocDirs = async (id) => {
    setSubmittingId(id);
    const top20 = DIRS_SAMPLE.slice(0, 20);
    for (let i = 0; i < top20.length; i++) {
      await new Promise(r => setTimeout(r, 80));
      const success = Math.random() > 0.08;
      save(locations.map(l => l.id === id ? {
        ...l, dSt: { ...l.dSt, [top20[i].id]: { status: success ? 'submitted' : 'failed', submittedAt: success ? new Date().toISOString() : null } }
      } : l));
    }
    setSubmittingId(null);
    showToast('Top 20 directories submitted', 'success');
  };

  const bulkSubmitAll = async () => {
    for (const loc of locations) {
      await submitLocDirs(loc.id);
    }
    showToast(`All ${locations.length} locations submitted`, 'success');
  };

  const copySchema = (loc) => {
    navigator.clipboard.writeText(genSchema(loc)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Schema copied', 'success');
    });
  };

  const exportCSV = () => {
    const rows = locations.map(l => {
      const sub = Object.values(l.dSt || {}).filter(s => s.status === 'submitted').length;
      return [l.name, l.addr, l.city, l.state, l.zip, l.phone, l.website, l.hours, sub]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
    });
    const csv = 'Name,Address,City,State,ZIP,Phone,Website,Hours,Citations\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'locations-nap-export.csv';
    a.click();
    showToast('CSV exported', 'success');
  };

  // Filtered dirs for active location
  const filteredDirs = DIRS_SAMPLE.filter(d => {
    const st = (activeLoc?.dSt?.[d.id]?.status) || 'pending';
    if (dirFilter === 'submitted') return st === 'submitted';
    if (dirFilter === 'pending') return st !== 'submitted';
    return true;
  });

  // Cross-location compare
  const compareRows = DIRS_SAMPLE.filter(d => {
    if (compareFilter === 'gaps') return locations.some(l => !(l.dSt?.[d.id]?.status === 'submitted'));
    if (compareFilter === 'complete') return locations.every(l => l.dSt?.[d.id]?.status === 'submitted');
    return true;
  });

  const totalSubmitted = locations.reduce((acc, l) => acc + Object.values(l.dSt || {}).filter(s => s.status === 'submitted').length, 0);

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
          <i className={`ti ${toast.type === 'success' ? 'ti-circle-check' : 'ti-info-circle'}`}
            style={{ color: toast.type === 'success' ? T.green : toast.type === 'warning' ? T.yellow : T.accent }} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            <i className="ti ti-building-store" style={{ color: T.accent, marginRight: 10 }} />
            Multi-Location Manager
          </h1>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
            {locations.length} location{locations.length !== 1 ? 's' : ''} &bull; {totalSubmitted} total citations
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={exportCSV} variant="ghost" disabled={!locations.length}>
            <i className="ti ti-download" />Export CSV
          </Btn>
          <Btn onClick={bulkSubmitAll} variant="ghost" disabled={!locations.length || !!submittingId}>
            <i className="ti ti-send" />Submit All
          </Btn>
          <Btn onClick={addLocation} disabled={locations.length >= 10}>
            <i className="ti ti-plus" />Add Location
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Locations', val: locations.length, max: 10, color: T.accent, icon: 'ti-building-store' },
          { label: 'Total Citations', val: totalSubmitted, color: T.green, icon: 'ti-database' },
          { label: 'Avg Coverage', val: locations.length ? Math.round(locations.reduce((a, l) => a + Object.values(l.dSt || {}).filter(s => s.status === 'submitted').length, 0) / locations.length) + '%' : '0%', color: T.purple, icon: 'ti-chart-pie' },
          { label: 'Primary Location', val: locations.find(l => l.isPrimary)?.name?.split(' ')[0] || 'None', color: T.yellow, icon: 'ti-star' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: T.muted, fontSize: 11, marginBottom: 5 }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.val}</div>
              </div>
              <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 20, opacity: 0.7 }} />
            </div>
          </Card>
        ))}
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['locations','ti-building-store','Locations'],['compare','ti-table','Directory Comparison'],['schema','ti-code','Bulk Schema']].map(([id, icon, label]) => (
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

      {/* Empty state */}
      {locations.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="ti ti-building-store" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 12 }} />
          <div style={{ color: T.text, fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No locations yet</div>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 20 }}>Add up to 10 business locations. Each gets its own NAP, directory tracking, and schema.</div>
          <Btn onClick={addLocation}><i className="ti ti-plus" />Add First Location</Btn>
        </Card>
      )}

      {/* === LOCATIONS TAB === */}
      {activeTab === 'locations' && locations.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Left: location list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Coverage comparison */}
            <Card>
              <CardHead icon="ti-chart-bar" title="Coverage" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {locations.map(loc => {
                  const sub = Object.values(loc.dSt || {}).filter(s => s.status === 'submitted').length;
                  const pct = Math.round((sub / DIRS_SAMPLE.length) * 100);
                  const col = pct >= 60 ? T.green : pct >= 30 ? T.yellow : T.red;
                  return (
                    <div key={loc.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: T.textSub, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {loc.isPrimary && <i className="ti ti-star-filled" style={{ color: T.yellow, fontSize: 10 }} />}
                          {loc.isSAB && <i className="ti ti-map-pins" style={{ color: T.purple, fontSize: 10 }} />}
                          {loc.name || 'Unnamed'}
                        </span>
                        <span style={{ color: col, fontSize: 12, fontWeight: 700 }}>{sub}/{DIRS_SAMPLE.length}</span>
                      </div>
                      <div style={{ height: 5, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Location list */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-building-store" style={{ color: T.accent, fontSize: 16 }} />
                  <span style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>Locations ({locations.length}/10)</span>
                </div>
                <Btn onClick={addLocation} disabled={locations.length >= 10} size="sm">
                  <i className="ti ti-plus" />Add
                </Btn>
              </div>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {locations.map(loc => {
                  const sub = Object.values(loc.dSt || {}).filter(s => s.status === 'submitted').length;
                  const pct = Math.round((sub / DIRS_SAMPLE.length) * 100);
                  const isActive = activeId === loc.id;
                  return (
                    <div
                      key={loc.id}
                      onClick={() => setActiveId(loc.id)}
                      style={{
                        background: isActive ? `${T.accent}15` : T.cardBg2,
                        border: `1px solid ${isActive ? T.accent : loc.isPrimary ? T.green + '50' : T.border}`,
                        borderLeft: `3px solid ${loc.isPrimary ? T.green : isActive ? T.accent : T.border}`,
                        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ color: T.text, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {loc.isPrimary && <i className="ti ti-star-filled" style={{ color: T.yellow, fontSize: 11 }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name || 'Unnamed Location'}</span>
                          </div>
                          <div style={{ color: T.muted, fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {loc.isSAB && <span style={{ background: `${T.purple}20`, color: T.purple, borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>SAB</span>}
                            {loc.isSAB
                              ? `${(loc.serviceAreas || []).length} service area${(loc.serviceAreas || []).length !== 1 ? 's' : ''}`
                              : [loc.city, loc.state].filter(Boolean).join(', ') || 'No address set'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <span style={{ color: pct >= 50 ? T.green : pct > 0 ? T.yellow : T.muted, fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                          <button
                            onClick={e => { e.stopPropagation(); deleteLocation(loc.id); }}
                            style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: '2px 4px', fontSize: 12 }}
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right: editor + directory coverage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!activeLoc ? (
              <Card style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
                <i className="ti ti-arrow-left" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                Select a location to edit
              </Card>
            ) : (
              <>
                {/* Editor */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="ti ti-pencil" style={{ color: T.accent, fontSize: 16 }} />
                      <span style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{activeLoc.name || 'Edit Location'}</span>
                      {activeLoc.isPrimary && (
                        <span style={{ background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}40`, borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                          Primary
                        </span>
                      )}
                    </div>
                    {!activeLoc.isPrimary && (
                      <Btn onClick={() => setPrimary(activeLoc.id)} variant="ghost" size="sm">
                        <i className="ti ti-star" />Set Primary
                      </Btn>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { label: 'Location Name *', field: 'name', type: 'text', placeholder: 'e.g. Austin Main Branch', full: true },
                      { label: 'Street Address', field: 'addr', type: 'text', placeholder: '123 Main St', full: true },
                      { label: 'City *', field: 'city', type: 'text', placeholder: 'Austin' },
                      { label: 'State', field: 'state', type: 'text', placeholder: 'TX' },
                      { label: 'ZIP Code', field: 'zip', type: 'text', placeholder: '78701' },
                      { label: 'Phone *', field: 'phone', type: 'tel', placeholder: '(512) 555-0100' },
                      { label: 'Website', field: 'website', type: 'url', placeholder: 'https://acme.com/austin', full: true },
                      { label: 'Business Hours', field: 'hours', type: 'text', placeholder: 'Mon-Fri 8am-5pm', full: true },
                      { label: 'Notes / Manager', field: 'notes', type: 'text', placeholder: 'Branch manager: John Smith', full: true },
                    ].map(f => (
                      <div key={f.field} style={{ gridColumn: f.full ? '1 / -1' : undefined }}>
                        <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>{f.label}</label>
                        <input
                          type={f.type}
                          value={activeLoc[f.field] || ''}
                          onChange={e => updateField(activeLoc.id, f.field, e.target.value)}
                          placeholder={f.placeholder}
                          style={inp}
                        />
                      </div>
                    ))}
                    <div>
                      <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>Category</label>
                      <select value={activeLoc.category || ''} onChange={e => updateField(activeLoc.id, 'category', e.target.value)}
                        style={{ ...inp, cursor: 'pointer' }}>
                        <option value="">Select...</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* SAB Toggle */}
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 4, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>
                          <i className="ti ti-map-pins" style={{ color: activeLoc.isSAB ? T.purple : T.muted, marginRight: 7 }} />
                          Service Area Business (SAB) Mode
                        </div>
                        <div style={{ color: T.muted, fontSize: 11, marginTop: 3 }}>
                          {activeLoc.isSAB
                            ? 'Address hidden from public listings. Service cities shown instead.'
                            : 'Physical storefront — full address shown on GMB and Bing.'}
                        </div>
                      </div>
                      <button
                        onClick={() => updateField(activeLoc.id, 'isSAB', !activeLoc.isSAB)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                          background: activeLoc.isSAB ? T.purple : T.border,
                          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 3,
                          left: activeLoc.isSAB ? 23 : 3,
                          transition: 'left 0.2s',
                        }} />
                      </button>
                    </div>

                    {activeLoc.isSAB && (
                      <div>
                        {/* Service radius */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>
                            Service Radius (optional)
                          </label>
                          <input
                            type="text"
                            value={activeLoc.sabRadius || ''}
                            onChange={e => updateField(activeLoc.id, 'sabRadius', e.target.value)}
                            placeholder="e.g. 30 miles, 50km"
                            style={inp}
                          />
                        </div>

                        {/* Service areas */}
                        <div>
                          <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>
                            Service Cities / Zip Codes
                            <span style={{ color: T.muted, fontSize: 11, marginLeft: 6 }}>
                              (press Enter to add)
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder="Type a city or ZIP and press Enter..."
                            style={inp}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                const val = e.target.value.trim();
                                const current = activeLoc.serviceAreas || [];
                                if (!current.includes(val)) {
                                  updateField(activeLoc.id, 'serviceAreas', [...current, val]);
                                }
                                e.target.value = '';
                              }
                            }}
                          />
                          {(activeLoc.serviceAreas || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {(activeLoc.serviceAreas || []).map((area, i) => (
                                <div key={i} style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  background: `${T.purple}20`, border: `1px solid ${T.purple}40`,
                                  borderRadius: 20, padding: '4px 10px', fontSize: 12, color: T.textSub,
                                }}>
                                  <i className="ti ti-map-pin" style={{ color: T.purple, fontSize: 11 }} />
                                  {area}
                                  <button
                                    onClick={() => updateField(activeLoc.id, 'serviceAreas', (activeLoc.serviceAreas || []).filter((_, j) => j !== i))}
                                    style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1 }}
                                  >
                                    <i className="ti ti-x" style={{ fontSize: 10 }} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {(activeLoc.serviceAreas || []).length === 0 && (
                            <div style={{ color: T.muted, fontSize: 11, marginTop: 6 }}>
                              No service areas added yet. These appear in your schema and GMB service area settings.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Btn onClick={() => submitLocDirs(activeLoc.id)} disabled={submittingId === activeLoc.id}>
                      <i className={`ti ${submittingId === activeLoc.id ? 'ti-loader-2' : 'ti-send'}`} />
                      {submittingId === activeLoc.id ? 'Submitting...' : 'Submit Top 20 Directories'}
                    </Btn>
                    <Btn onClick={() => copySchema(activeLoc)} variant="ghost">
                      <i className={`ti ${copied ? 'ti-check' : 'ti-code'}`} />{copied ? 'Copied!' : 'Copy Schema'}
                    </Btn>
                  </div>
                </Card>

                {/* SAB Checklist — only shown when SAB mode on */}
                {activeLoc.isSAB && (
                  <Card>
                    <CardHead icon="ti-list-check" title="GMB + Bing Service Area Setup Checklist" />
                    <div style={{ background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>
                      <i className="ti ti-info-circle" style={{ color: T.accent, marginRight: 6 }} />
                      <strong style={{ color: T.text }}>API limitation:</strong> Google and Bing do not allow programmatic service area updates without OAuth. Use this checklist to manually configure each platform.
                    </div>
                    {[
                      {
                        platform: 'Google Business Profile',
                        icon: 'ti-brand-google', color: '#ea4335',
                        url: 'https://business.google.com',
                        steps: [
                          'Sign in and select your business profile',
                          'Click "Edit profile" then go to "Location"',
                          'Under "Do you serve customers at your business address?", select No (SAB) or Yes (storefront)',
                          'If SAB: toggle off "Show business address"',
                          'Click "Service area" and add each city or ZIP from your list',
                          'Set a service area radius if applicable',
                          'Save changes — Google re-indexes within 3-7 days',
                        ],
                      },
                      {
                        platform: 'Bing Places for Business',
                        icon: 'ti-brand-windows', color: '#008373',
                        url: 'https://bingplaces.com',
                        steps: [
                          'Sign in at bingplaces.com',
                          'Select your business listing',
                          'Click "Edit Business Information"',
                          'Under Address, check "I deliver goods and services to my customers"',
                          'Check "I do not serve customers at my business address" if SAB',
                          'Add service area cities or ZIP codes',
                          'Save — Bing updates within 1-3 business days',
                        ],
                      },
                      {
                        platform: 'Apple Maps Connect',
                        icon: 'ti-brand-apple', color: '#555',
                        url: 'https://mapsconnect.apple.com',
                        steps: [
                          'Sign in at mapsconnect.apple.com',
                          'Select your place',
                          'Edit the "Service Area" field',
                          'Add cities or regions you serve',
                          'Submit for review — Apple reviews within 5-7 days',
                        ],
                      },
                    ].map((p, pi) => {
                      const checkKey = `${activeLoc.id}_${p.platform}`;
                      const checks = activeLoc.sabChecklist || {};
                      const done = p.steps.filter((_, si) => checks[`${checkKey}_${si}`]).length;
                      return (
                        <div key={pi} style={{ marginBottom: pi < 2 ? 16 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: p.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className={`ti ${p.icon}`} style={{ color: p.color, fontSize: 15 }} />
                            </div>
                            <span style={{ color: T.text, fontWeight: 600, fontSize: 13, flex: 1 }}>{p.platform}</span>
                            <span style={{ color: done === p.steps.length ? T.green : T.muted, fontSize: 12, fontWeight: 600 }}>
                              {done}/{p.steps.length}
                            </span>
                            <a href={p.url} target="_blank" rel="noreferrer"
                              style={{ color: T.accentHi, fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <i className="ti ti-external-link" style={{ fontSize: 11 }} />Open
                            </a>
                          </div>
                          {p.steps.map((step, si) => {
                            const key = `${checkKey}_${si}`;
                            const isChecked = !!checks[key];
                            return (
                              <div
                                key={si}
                                onClick={() => updateField(activeLoc.id, 'sabChecklist', { ...checks, [key]: !isChecked })}
                                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: si < p.steps.length - 1 ? `1px solid ${T.border}` : 'none', cursor: 'pointer' }}
                              >
                                <div style={{
                                  width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1,
                                  border: `1.5px solid ${isChecked ? T.green : T.border}`,
                                  background: isChecked ? T.green : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {isChecked && <i className="ti ti-check" style={{ fontSize: 10, color: '#fff' }} />}
                                </div>
                                <span style={{ color: isChecked ? T.muted : T.textSub, fontSize: 12, lineHeight: 1.5, textDecoration: isChecked ? 'line-through' : 'none' }}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                          {pi < 2 && <div style={{ height: 1, background: T.border, marginTop: 12 }} />}
                        </div>
                      );
                    })}
                  </Card>
                )}

                {/* Directory coverage for this location */}
                <Card>
                  <CardHead icon="ti-database" title={`Directory Coverage — ${activeLoc.name || 'Location'}`}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['all', 'submitted', 'pending'].map(f => (
                        <button key={f} onClick={() => setDirFilter(f)} style={{
                          background: dirFilter === f ? `${T.accent}20` : 'transparent',
                          border: `1px solid ${dirFilter === f ? T.accent : T.border}`,
                          borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                          color: dirFilter === f ? T.accentHi : T.muted, fontWeight: 600,
                        }}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </CardHead>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 360, overflowY: 'auto' }}>
                    {filteredDirs.map(dir => {
                      const st = activeLoc.dSt?.[dir.id]?.status || 'pending';
                      const submittedAt = activeLoc.dSt?.[dir.id]?.submittedAt;
                      return (
                        <div key={dir.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', background: T.cardBg2,
                          border: `1px solid ${st === 'submitted' ? T.green + '40' : T.border}`,
                          borderLeft: `3px solid ${st === 'submitted' ? T.green : T.border}`,
                          borderRadius: 7,
                        }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: dir.bg + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: dir.bg, flexShrink: 0 }}>
                            {dir.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{dir.name}</div>
                            {submittedAt && <div style={{ color: T.muted, fontSize: 10, marginTop: 1 }}>{new Date(submittedAt).toLocaleDateString()}</div>}
                          </div>
                          <span style={{ color: daColor(dir.da), fontSize: 11, fontWeight: 700 }}>DA {dir.da}</span>
                          {st === 'submitted' ? (
                            <span style={{ background: `${T.green}15`, color: T.green, border: `1px solid ${T.green}40`, borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>
                              <i className="ti ti-circle-check" style={{ fontSize: 10 }} /> Done
                            </span>
                          ) : (
                            <span style={{ background: `${T.muted}15`, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 5, padding: '2px 7px', fontSize: 10 }}>
                              Pending
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* === COMPARE TAB === */}
      {activeTab === 'compare' && locations.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-table" style={{ color: T.accent, fontSize: 18 }} />
              <span style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>Cross-Location Directory Comparison</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={compareFilter} onChange={e => setCompareFilter(e.target.value)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', color: T.text, fontSize: 12 }}>
                <option value="all">All Directories</option>
                <option value="gaps">Has Gaps</option>
                <option value="complete">All Locations Present</option>
              </select>
              <Btn onClick={exportCSV} variant="ghost" size="sm"><i className="ti ti-download" />CSV</Btn>
            </div>
          </div>

          {locations.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
              <i className="ti ti-building-store" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              Add at least 2 locations to see the comparison table.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.cardBg2 }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}` }}>Directory</th>
                    <th style={{ padding: '8px 12px', color: T.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}` }}>DA</th>
                    {locations.map(loc => (
                      <th key={loc.id} style={{ padding: '8px 10px', color: loc.isPrimary ? T.yellow : T.accent, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {loc.isPrimary && <i className="ti ti-star-filled" style={{ fontSize: 9, marginRight: 3 }} />}
                        {(loc.name || 'Loc').substring(0, 10)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((dir, i) => {
                    const statuses = locations.map(l => l.dSt?.[dir.id]?.status === 'submitted');
                    const allDone = statuses.every(Boolean);
                    const hasMissing = statuses.some(s => !s);
                    return (
                      <tr key={dir.id} style={{ background: allDone ? `${T.green}05` : hasMissing ? 'transparent' : 'transparent' }}>
                        <td style={{ padding: '9px 12px', color: T.text, fontWeight: 500, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 5, background: dir.bg + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: dir.bg, flexShrink: 0 }}>
                            {dir.icon}
                          </div>
                          {dir.name}
                        </td>
                        <td style={{ padding: '9px 10px', color: daColor(dir.da), fontWeight: 700, borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>{dir.da}</td>
                        {statuses.map((done, li) => (
                          <td key={li} style={{ padding: '9px 10px', textAlign: 'center', borderBottom: `1px solid ${T.border}` }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, background: done ? `${T.green}20` : T.cardBg2, color: done ? T.green : T.muted }}>
                              {done ? <i className="ti ti-check" /> : <i className="ti ti-minus" />}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* === SCHEMA TAB === */}
      {activeTab === 'schema' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {locations.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
              Add locations to generate their schemas.
            </Card>
          ) : (
            <>
              {/* Bulk copy all */}
              <Card style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>All Locations Schema Array</div>
                    <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>Single JSON-LD array with all {locations.length} locations for your website</div>
                  </div>
                  <Btn onClick={() => {
                    const arr = locations.map(l => JSON.parse(genSchema(l)));
                    navigator.clipboard.writeText(JSON.stringify(arr, null, 2));
                    showToast('All schemas copied', 'success');
                  }}>
                    <i className="ti ti-copy" />Copy All Schemas
                  </Btn>
                  <a href="https://validator.schema.org/" target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.accentHi, fontSize: 12, textDecoration: 'none' }}>
                    <i className="ti ti-external-link" style={{ fontSize: 11 }} />Validate
                  </a>
                </div>
              </Card>

              {/* Individual schemas */}
              {locations.map(loc => (
                <Card key={loc.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="ti ti-code" style={{ color: T.accent, fontSize: 16 }} />
                      <span style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{loc.name || 'Unnamed'}</span>
                      {loc.isPrimary && <span style={{ background: `${T.yellow}20`, color: T.yellow, borderRadius: 10, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>Primary</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn onClick={() => copySchema(loc)} variant="ghost" size="sm">
                        <i className="ti ti-copy" />Copy
                      </Btn>
                      <a href="https://validator.schema.org/" target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.accentHi, fontSize: 12, textDecoration: 'none', padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 6 }}>
                        <i className="ti ti-external-link" style={{ fontSize: 11 }} />Validate
                      </a>
                    </div>
                  </div>
                  <pre style={{
                    background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8,
                    padding: '12px 14px', fontSize: 11, color: T.accentHi,
                    lineHeight: 1.6, overflowX: 'auto', maxHeight: 220, overflowY: 'auto',
                    margin: 0, fontFamily: "'SF Mono', 'Fira Mono', monospace",
                  }}>
                    {genSchema(loc)}
                  </pre>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
