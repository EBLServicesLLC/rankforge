import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SCORE_LABELS = [
  { key: 'overall',     label: 'Overall',     icon: 'ti-chart-bar',      color: '#f59e0b' },
  { key: 'directories', label: 'Directories', icon: 'ti-map-pin',         color: '#3b82f6' },
  { key: 'backlinks',   label: 'Backlinks',   icon: 'ti-link',            color: '#8b5cf6' },
  { key: 'web2',        label: 'Web 2.0',     icon: 'ti-world',           color: '#10b981' },
  { key: 'local',       label: 'Local SEO',   icon: 'ti-building-store',  color: '#f97316' },
  { key: 'voice',       label: 'Voice',       icon: 'ti-microphone',      color: '#06b6d4' },
  { key: 'indexing',    label: 'Indexing',    icon: 'ti-search',          color: '#ec4899' },
];

const DEMO_SCORES = {
  overall: 72, directories: 58, backlinks: 61,
  web2: 45, local: 83, voice: 39, indexing: 77,
};

const QUICK_ACTIONS = [
  { tab: 'rank-tracker',   label: 'Rank Tracker',      icon: 'ti-trending-up',       color: '#f59e0b' },
  { tab: 'reputation',     label: 'Reputation',         icon: 'ti-star',              color: '#3b82f6' },
  { tab: 'napaudit',       label: 'NAP Audit',          icon: 'ti-clipboard-check',   color: '#10b981' },
  { tab: 'web2',           label: 'Web 2.0 Signals',   icon: 'ti-world',             color: '#8b5cf6' },
  { tab: 'local',          label: 'Citations',          icon: 'ti-map-pin',           color: '#f97316' },
  { tab: 'kwgap',          label: 'KW Gap',             icon: 'ti-git-diff',          color: '#06b6d4' },
  { tab: 'gbpqa',          label: 'GBP Q&A',            icon: 'ti-help-circle',       color: '#ec4899' },
  { tab: 'pdfreport',      label: 'Reports',            icon: 'ti-file-analytics',    color: '#14b8a6' },
];

function ScoreRing({ value, color, size = 64 }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2d45" strokeWidth="5" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
    </svg>
  );
}

function ScoreCard({ label, icon, color, value }) {
  const grade = value >= 80 ? 'A' : value >= 65 ? 'B' : value >= 50 ? 'C' : 'D';
  const gradeColor = value >= 80 ? '#10b981' : value >= 65 ? '#f59e0b' : value >= 50 ? '#f97316' : '#ef4444';
  return (
    <div style={{
      background: '#0d1b2e',
      border: '1px solid #1e2d45',
      borderRadius: 10,
      padding: '16px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: color, borderRadius: '10px 10px 0 0',
      }} />
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <ScoreRing value={value} color={color} size={64} />
        <span style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#e2e8f0',
        }}>{value}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 13 }} />
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color: gradeColor,
        background: gradeColor + '20', borderRadius: 4,
        padding: '1px 7px', letterSpacing: 1,
      }}>{grade}</span>
    </div>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <div style={{
      background: '#0d1b2e',
      border: '1px solid #1e2d45',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flex: '1 1 140px',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 18 }} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function QuickAction({ tab, label, icon, color, onNav }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onNav(tab)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? color + '15' : '#0d1b2e',
        border: `1px solid ${hovered ? color + '60' : '#1e2d45'}`,
        borderRadius: 10,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flex: '1 1 100px',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.15s ease',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
        <i className={`ti ${icon}`} style={{ color, fontSize: 20 }} />
      </div>
      <span style={{ fontSize: 11, color: hovered ? '#e2e8f0' : '#94a3b8', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </button>
  );
}

export default function DashboardPage({ clientId, userId }) {
  const [biz, setBiz] = useState(null);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    if (!clientId || !userId) return;
    loadData();
  }, [clientId, userId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load business profile
      const { data: cd } = await supabase
        .from('client_data')
        .select('biz_name,biz_city,biz_state,biz_cat,biz_phone,biz_website')
        .eq('client_id', clientId)
        .eq('user_id', userId)
        .maybeSingle();
      if (cd) setBiz(cd);

      // Load latest score snapshot
      const { data: sh } = await supabase
        .from('score_history')
        .select('overall,directories,backlinks,web2,local,voice,indexing,recorded_at')
        .eq('client_id', clientId)
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sh) {
        setScores(sh);
        setUsingDemo(false);
      } else {
        setScores(DEMO_SCORES);
        setUsingDemo(true);
      }
    } catch (e) {
      setScores(DEMO_SCORES);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  function navigateTo(tab) {
    // Mirror the switchTab pattern used throughout DashboardShell
    window.dispatchEvent(new CustomEvent('rf-switch-tab', { detail: { tab } }));
  }

  const bizName = biz?.biz_name || 'Your Business';
  const bizLoc = biz?.biz_city && biz?.biz_state
    ? `${biz.biz_city}, ${biz.biz_state}`
    : 'Location not set';
  const bizCat = biz?.biz_cat || 'Category not set';
  const overallScore = scores?.overall ?? 0;
  const overallGrade = overallScore >= 80 ? 'A' : overallScore >= 65 ? 'B' : overallScore >= 50 ? 'C' : 'D';
  const overallColor = overallScore >= 80 ? '#10b981' : overallScore >= 65 ? '#f59e0b' : overallScore >= 50 ? '#f97316' : '#ef4444';

  return (
    <div style={{
      padding: '24px 28px',
      minHeight: '100%',
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
              {bizName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748b' }}>
                <i className="ti ti-map-pin" style={{ fontSize: 13 }} />
                {bizLoc}
              </span>
              <span style={{ color: '#334155', fontSize: 13 }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748b' }}>
                <i className="ti ti-tag" style={{ fontSize: 13 }} />
                {bizCat}
              </span>
              {usingDemo && (
                <span style={{
                  fontSize: 11, color: '#f59e0b', background: '#f59e0b15',
                  border: '1px solid #f59e0b40', borderRadius: 4,
                  padding: '1px 7px', fontWeight: 500,
                }}>Demo Data</span>
              )}
            </div>
          </div>
          <div style={{
            background: '#0d1b2e',
            border: `2px solid ${overallColor}40`,
            borderRadius: 12,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{ position: 'relative', width: 72, height: 72 }}>
              <ScoreRing value={overallScore} color={overallColor} size={72} />
              <span style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: '#f1f5f9',
              }}>{overallScore}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>SEO Score</div>
              <div style={{
                fontSize: 28, fontWeight: 800, color: overallColor, lineHeight: 1,
              }}>{overallGrade}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {overallScore >= 80 ? 'Excellent' : overallScore >= 65 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Needs Work'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* Stat Pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatPill icon="ti-star" label="Avg Review Rating" value="4.2" color="#f59e0b" />
            <StatPill icon="ti-link" label="Backlink Signals" value={scores?.backlinks ?? '--'} color="#8b5cf6" />
            <StatPill icon="ti-world" label="Web 2.0 Live" value="12" color="#10b981" />
            <StatPill icon="ti-map-pin" label="Directories" value={scores?.directories ?? '--'} color="#3b82f6" />
          </div>

          {/* Score Cards */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Category Scores
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
            }}>
              {SCORE_LABELS.filter(s => s.key !== 'overall').map(s => (
                <ScoreCard
                  key={s.key}
                  label={s.label}
                  icon={s.icon}
                  color={s.color}
                  value={scores?.[s.key] ?? 0}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Quick Actions
            </div>
            <div style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}>
              {QUICK_ACTIONS.map(a => (
                <QuickAction key={a.tab} {...a} onNav={navigateTo} />
              ))}
            </div>
          </div>

          {/* Info Row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Business Info */}
            <div style={{
              flex: '1 1 260px',
              background: '#0d1b2e',
              border: '1px solid #1e2d45',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Business Profile
              </div>
              {[
                { icon: 'ti-building-store', label: 'Category', val: bizCat },
                { icon: 'ti-map-pin', label: 'Location', val: bizLoc },
                { icon: 'ti-phone', label: 'Phone', val: biz?.biz_phone || 'Not set' },
                { icon: 'ti-world-www', label: 'Website', val: biz?.biz_website || 'Not set' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  paddingBottom: 10, marginBottom: 10,
                  borderBottom: '1px solid #1e2d45',
                }}>
                  <i className={`ti ${row.icon}`} style={{ color: '#475569', fontSize: 14, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: row.val === 'Not set' ? '#334155' : '#cbd5e1', marginTop: 1 }}>{row.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div style={{
              flex: '2 1 340px',
              background: '#0d1b2e',
              border: '1px solid #1e2d45',
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Recent Activity
              </div>
              {[
                { icon: 'ti-check', color: '#10b981', text: 'NAP audit completed', time: 'Today' },
                { icon: 'ti-star', color: '#f59e0b', text: '3 new reviews detected', time: 'Yesterday' },
                { icon: 'ti-world', color: '#8b5cf6', text: 'Web 2.0 signal submitted to Medium', time: '2 days ago' },
                { icon: 'ti-map-pin', color: '#3b82f6', text: 'Citation added to Yelp', time: '3 days ago' },
                { icon: 'ti-file-analytics', color: '#14b8a6', text: 'Monthly report generated', time: '1 week ago' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 0',
                  borderBottom: i < 4 ? '1px solid #1e2d45' : 'none',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: item.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className={`ti ${item.icon}`} style={{ color: item.color, fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#cbd5e1' }}>{item.text}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>{item.time}</div>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 11, color: '#334155', textAlign: 'center' }}>
                Activity feed is illustrative - live tracking coming soon
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
