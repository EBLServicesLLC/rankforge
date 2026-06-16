import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const T = {
  pageBg: '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border: '#0f2040', border2: '#1a3560',
  text: '#e2e8f0', textSub: '#c8d8f0', muted: '#4a6080',
  accent: '#3b82f6', accentHi: '#60a5fa',
  green: '#10b981', red: '#f87171', yellow: '#f59e0b',
  orange: '#f97316', purple: '#8b5cf6', cyan: '#22d3ee',
};

const Card = ({ children, style = {} }) => (
  <div style={{
    background: T.cardBg, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: 20, ...style
  }}>{children}</div>
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
  const base = {
    border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
    fontSize: size === 'sm' ? 12 : 13,
    padding: size === 'sm' ? '6px 12px' : '8px 16px',
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: T.accent, color: '#fff' },
    ghost: { background: 'transparent', color: T.textSub, border: `1px solid ${T.border}` },
    success: { background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}40` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const StatCard = ({ icon, label, value, sub, color }) => (
  <Card style={{ padding: '16px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>{label}</div>
        <div style={{ color: color || T.text, fontWeight: 700, fontSize: 24 }}>{value}</div>
        {sub && <div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 38, height: 38, borderRadius: 8, background: `${color || T.accent}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <i className={`ti ${icon}`} style={{ color: color || T.accent, fontSize: 18 }} />
      </div>
    </div>
  </Card>
);

const RANGES = [
  { id: '7d', label: '7 Days' },
  { id: '28d', label: '28 Days' },
  { id: '90d', label: '90 Days' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'ti-chart-bar' },
  { id: 'queries', label: 'Top Queries', icon: 'ti-search' },
  { id: 'pages', label: 'Top Pages', icon: 'ti-file-text' },
  { id: 'devices', label: 'Devices', icon: 'ti-device-laptop' },
];

function fmt(n) {
  if (n === undefined || n === null) return '-';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
}

function fmtPct(n) {
  if (n === undefined || n === null) return '-';
  return (n * 100).toFixed(1) + '%';
}

function fmtPos(n) {
  if (n === undefined || n === null) return '-';
  return n.toFixed(1);
}

function BarCell({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || T.accent, borderRadius: 3 }} />
      </div>
      <span style={{ color: T.text, fontSize: 12, minWidth: 40, textAlign: 'right' }}>{fmt(value)}</span>
    </div>
  );
}

export default function SearchConsolePage({ session, clientId }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [range, setRange] = useState('28d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [sortCol, setSortCol] = useState('clicks');
  const [sortDir, setSortDir] = useState('desc');

  const sbUrl = import.meta.env.VITE_SUPABASE_URL;
  const sbAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token || sbAnon;
      const { data: cd } = await supabase
        .from('client_data')
        .select('biz_website')
        .eq('client_id', clientId)
        .single();
      const siteUrl = cd?.biz_website || '';
      if (!siteUrl) throw new Error('No website URL set. Add it in the business profile.');
      const dateRangeMap = { '7d': 'last7days', '28d': 'last28days', '90d': 'last90days' };
      const res = await fetch(`${sbUrl}/functions/v1/gcs-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': sbAnon,
        },
        body: JSON.stringify({ site_url: siteUrl, date_range: dateRangeMap[range] || 'last28days' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch GSC data');
      // Map gcs-data response shape to component expected shape
      setData({
        overview: {
          clicks:      json.summary?.totalClicks      ?? 0,
          impressions: json.summary?.totalImpressions ?? 0,
          ctr:         json.summary?.avgCtr != null ? parseFloat(json.summary.avgCtr) / 100 : 0,
          position:    json.summary?.avgPosition != null ? parseFloat(json.summary.avgPosition) : 0,
        },
        queries: json.keywords || [],
        pages:   json.pages    || [],
        devices: json.devices  || [],
        trend:   [],
        summary: json.summary,
      });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [clientId, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortRows = (rows, col) => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      const av = a[col] ?? 0;
      const bv = b[col] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <i className={`ti ${sortCol === col ? (sortDir === 'desc' ? 'ti-chevron-down' : 'ti-chevron-up') : 'ti-selector'}`}
      style={{ fontSize: 12, color: sortCol === col ? T.accent : T.muted, marginLeft: 4 }} />
  );

  const thStyle = (col) => ({
    color: T.muted, fontSize: 11, fontWeight: 600, padding: '8px 12px',
    textAlign: col === 'keys' || col === 'page' ? 'left' : 'right',
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  });

  const tdStyle = (align = 'right') => ({
    padding: '10px 12px', color: T.textSub, fontSize: 13, textAlign: align,
    borderTop: `1px solid ${T.border}`,
  });

  const overview = data?.overview;
  const queries = sortRows(data?.queries, sortCol);
  const pages = sortRows(data?.pages, sortCol);
  const devices = data?.devices || [];

  const maxClicks = Math.max(...(queries.map(r => r.clicks || 0)), 1);
  const maxImpressions = Math.max(...(queries.map(r => r.impressions || 0)), 1);
  const maxPageClicks = Math.max(...(pages.map(r => r.clicks || 0)), 1);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.pageBg, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            <i className="ti ti-search" style={{ color: T.accent, marginRight: 10 }} />
            Search Console
          </h1>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Google Search Performance</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Range picker */}
          <div style={{ display: 'flex', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)} style={{
                background: range === r.id ? T.accent : 'transparent',
                border: 'none', color: range === r.id ? '#fff' : T.muted,
                padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
                {r.label}
              </button>
            ))}
          </div>
          <Btn onClick={fetchData} disabled={loading}>
            <i className={`ti ${loading ? 'ti-loader-2' : 'ti-refresh'}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Btn>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card style={{ marginBottom: 20, borderColor: T.red }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.red }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 20 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Failed to load Search Console data</div>
              <div style={{ fontSize: 12, marginTop: 3, color: T.muted }}>{error}</div>
            </div>
            <Btn onClick={fetchData} variant="ghost" style={{ marginLeft: 'auto' }}>Retry</Btn>
          </div>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[1,2,3,4].map(i => (
            <Card key={i} style={{ padding: '16px 20px', height: 90 }}>
              <div style={{ background: T.border, borderRadius: 4, height: 12, width: '60%', marginBottom: 12 }} />
              <div style={{ background: T.border2, borderRadius: 4, height: 24, width: '40%' }} />
            </Card>
          ))}
        </div>
      )}

      {/* No data / not connected */}
      {!loading && !error && !data && (
        <Card style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="ti ti-brand-google" style={{ fontSize: 48, color: T.muted, display: 'block', marginBottom: 12 }} />
          <div style={{ color: T.text, fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            Search Console Not Connected
          </div>
          <div style={{ color: T.muted, fontSize: 13, maxWidth: 400, margin: '0 auto' }}>
            Add your Google API key in the API Keys tab to pull Search Console data for this client.
          </div>
        </Card>
      )}

      {/* Data loaded */}
      {data && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard icon="ti-mouse" label="Total Clicks" value={fmt(overview?.clicks)} sub={`vs prev period`} color={T.accent} />
            <StatCard icon="ti-eye" label="Impressions" value={fmt(overview?.impressions)} color={T.purple} />
            <StatCard icon="ti-percentage" label="Avg CTR" value={fmtPct(overview?.ctr)} color={T.green} />
            <StatCard icon="ti-trending-up" label="Avg Position" value={fmtPos(overview?.position)} color={T.orange} />
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: activeTab === t.id ? `${T.accent}20` : 'transparent',
                border: `1px solid ${activeTab === t.id ? T.accent : T.border}`,
                borderRadius: 6, color: activeTab === t.id ? T.accentHi : T.muted,
                padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className={`ti ${t.icon}`} />{t.label}
              </button>
            ))}
          </div>

          {/* Overview tab — click trend chart (simple bar chart) */}
          {activeTab === 'overview' && (
            <Card>
              <CardHead icon="ti-chart-bar" title={`Click Trend — Last ${range}`} />
              {data.trend && data.trend.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, marginBottom: 8 }}>
                    {data.trend.map((d, i) => {
                      const maxVal = Math.max(...data.trend.map(x => x.clicks || 0), 1);
                      const h = Math.max(((d.clicks || 0) / maxVal) * 100, 2);
                      return (
                        <div key={i} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}
                          title={`${d.date}: ${fmt(d.clicks)} clicks`}>
                          <div style={{
                            width: '100%', height: `${h}%`,
                            background: `linear-gradient(180deg, ${T.accent}, ${T.accent}80)`,
                            borderRadius: '2px 2px 0 0', transition: 'height 0.3s',
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: T.muted, fontSize: 10 }}>
                    <span>{data.trend[0]?.date}</span>
                    <span>{data.trend[Math.floor(data.trend.length / 2)]?.date}</span>
                    <span>{data.trend[data.trend.length - 1]?.date}</span>
                  </div>
                  {/* Summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 20 }}>
                    {[
                      { label: 'Peak Day Clicks', val: fmt(Math.max(...data.trend.map(d => d.clicks || 0))), color: T.accent },
                      { label: 'Avg Daily Clicks', val: fmt(overview?.clicks / data.trend.length), color: T.accentHi },
                      { label: 'Peak Impressions', val: fmt(Math.max(...data.trend.map(d => d.impressions || 0))), color: T.purple },
                      { label: 'Days in Range', val: data.trend.length, color: T.muted },
                    ].map(s => (
                      <div key={s.label} style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ color: T.muted, fontSize: 11, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ color: s.color, fontWeight: 700, fontSize: 18 }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
                  <i className="ti ti-chart-bar" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  No trend data available for this period
                </div>
              )}
            </Card>
          )}

          {/* Queries tab */}
          {activeTab === 'queries' && (
            <Card>
              <CardHead icon="ti-search" title="Top Queries">
                <span style={{ color: T.muted, fontSize: 12 }}>{queries.length} queries</span>
              </CardHead>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.cardBg2 }}>
                      <th style={{ ...thStyle('keys'), textAlign: 'left' }}>Query</th>
                      {[
                        { col: 'clicks', label: 'Clicks' },
                        { col: 'impressions', label: 'Impressions' },
                        { col: 'ctr', label: 'CTR' },
                        { col: 'position', label: 'Position' },
                      ].map(h => (
                        <th key={h.col} style={thStyle(h.col)} onClick={() => handleSort(h.col)}>
                          {h.label}<SortIcon col={h.col} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queries.slice(0, 25).map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${T.cardBg2}50` }}>
                        <td style={{ ...tdStyle('left'), color: T.text, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.keys?.[0] || row.query || '-'}
                        </td>
                        <td style={tdStyle()}>
                          <BarCell value={row.clicks} max={maxClicks} color={T.accent} />
                        </td>
                        <td style={tdStyle()}>
                          <BarCell value={row.impressions} max={maxImpressions} color={T.purple} />
                        </td>
                        <td style={{ ...tdStyle(), color: row.ctr > 0.05 ? T.green : T.muted }}>
                          {fmtPct(row.ctr)}
                        </td>
                        <td style={{ ...tdStyle(), color: row.position <= 3 ? T.green : row.position <= 10 ? T.yellow : T.muted }}>
                          {fmtPos(row.position)}
                        </td>
                      </tr>
                    ))}
                    {queries.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No query data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pages tab */}
          {activeTab === 'pages' && (
            <Card>
              <CardHead icon="ti-file-text" title="Top Pages">
                <span style={{ color: T.muted, fontSize: 12 }}>{pages.length} pages</span>
              </CardHead>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: T.cardBg2 }}>
                      <th style={{ ...thStyle('page'), textAlign: 'left' }}>Page</th>
                      {[
                        { col: 'clicks', label: 'Clicks' },
                        { col: 'impressions', label: 'Impressions' },
                        { col: 'ctr', label: 'CTR' },
                        { col: 'position', label: 'Position' },
                      ].map(h => (
                        <th key={h.col} style={thStyle(h.col)} onClick={() => handleSort(h.col)}>
                          {h.label}<SortIcon col={h.col} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pages.slice(0, 25).map((row, i) => {
                      const url = row.keys?.[0] || row.page || '-';
                      const display = url.replace(/^https?:\/\/[^/]+/, '') || '/';
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : `${T.cardBg2}50` }}>
                          <td style={{ ...tdStyle('left'), maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <a href={url} target="_blank" rel="noreferrer"
                              style={{ color: T.accentHi, textDecoration: 'none', fontSize: 13 }}
                              title={url}>
                              {display}
                            </a>
                          </td>
                          <td style={tdStyle()}>
                            <BarCell value={row.clicks} max={maxPageClicks} color={T.accent} />
                          </td>
                          <td style={tdStyle()}>
                            <BarCell value={row.impressions} max={Math.max(...pages.map(r => r.impressions || 0), 1)} color={T.purple} />
                          </td>
                          <td style={{ ...tdStyle(), color: row.ctr > 0.05 ? T.green : T.muted }}>
                            {fmtPct(row.ctr)}
                          </td>
                          <td style={{ ...tdStyle(), color: row.position <= 3 ? T.green : row.position <= 10 ? T.yellow : T.muted }}>
                            {fmtPos(row.position)}
                          </td>
                        </tr>
                      );
                    })}
                    {pages.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: T.muted }}>No page data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Devices tab */}
          {activeTab === 'devices' && (
            <Card>
              <CardHead icon="ti-device-laptop" title="Device Breakdown" />
              {devices.length > 0 ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                    {devices.map((d, i) => {
                      const icons = { DESKTOP: 'ti-device-desktop', MOBILE: 'ti-device-mobile', TABLET: 'ti-device-tablet' };
                      const colors = { DESKTOP: T.accent, MOBILE: T.green, TABLET: T.purple };
                      const device = (d.keys?.[0] || d.device || '').toUpperCase();
                      return (
                        <div key={i} style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <i className={`ti ${icons[device] || 'ti-device-laptop'}`}
                              style={{ color: colors[device] || T.accent, fontSize: 22 }} />
                            <span style={{ color: T.text, fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                              {device.toLowerCase()}
                            </span>
                          </div>
                          {[
                            { label: 'Clicks', val: fmt(d.clicks), color: T.accent },
                            { label: 'Impressions', val: fmt(d.impressions), color: T.purple },
                            { label: 'CTR', val: fmtPct(d.ctr), color: T.green },
                            { label: 'Avg Position', val: fmtPos(d.position), color: T.orange },
                          ].map(s => (
                            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ color: T.muted, fontSize: 12 }}>{s.label}</span>
                              <span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.val}</span>
                            </div>
                          ))}
                          {/* CTR bar */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min((d.clicks / (overview?.clicks || 1)) * 100, 100)}%`,
                                height: '100%', background: colors[device] || T.accent, borderRadius: 2
                              }} />
                            </div>
                            <div style={{ color: T.muted, fontSize: 10, marginTop: 4 }}>
                              {((d.clicks / (overview?.clicks || 1)) * 100).toFixed(0)}% of total clicks
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>
                  <i className="ti ti-device-laptop" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  No device data available
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
