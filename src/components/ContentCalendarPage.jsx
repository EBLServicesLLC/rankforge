import { useState, useEffect, useCallback } from 'react';

const T = {
  pageBg: '#060d1a', cardBg: '#0d1f3c', cardBg2: '#080f1e',
  border: '#0f2040', border2: '#1a3560',
  text: '#e2e8f0', textSub: '#c8d8f0', muted: '#4a6080',
  accent: '#3b82f6', accentHi: '#60a5fa',
  green: '#10b981', red: '#f87171', yellow: '#f59e0b',
  orange: '#f97316', purple: '#8b5cf6', cyan: '#22d3ee',
};

const CONTENT_TYPES = [
  { id: 'blog', label: 'Blog Post', icon: 'ti-article', color: T.accent },
  { id: 'social', label: 'Social Post', icon: 'ti-brand-instagram', color: T.purple },
  { id: 'gbp', label: 'GBP Update', icon: 'ti-building-store', color: T.green },
  { id: 'email', label: 'Email', icon: 'ti-mail', color: T.orange },
  { id: 'video', label: 'Video Script', icon: 'ti-video', color: T.cyan },
  { id: 'faq', label: 'FAQ', icon: 'ti-help-circle', color: T.yellow },
];

const STATUS_CONFIG = {
  idea: { label: 'Idea', color: T.muted, icon: 'ti-bulb' },
  draft: { label: 'Draft', color: T.yellow, icon: 'ti-pencil' },
  scheduled: { label: 'Scheduled', color: T.accent, icon: 'ti-clock' },
  published: { label: 'Published', color: T.green, icon: 'ti-circle-check' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const Card = ({ children, style = {} }) => (
  <div style={{
    background: T.cardBg, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: 20, ...style
  }}>
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

const Btn = ({ onClick, children, variant = 'primary', size = 'sm', style = {} }) => {
  const base = {
    border: 'none', borderRadius: 6, cursor: 'pointer',
    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
    fontSize: size === 'sm' ? 12 : 13,
    padding: size === 'sm' ? '6px 12px' : '8px 16px',
  };
  const variants = {
    primary: { background: T.accent, color: '#fff' },
    ghost: { background: 'transparent', color: T.textSub, border: `1px solid ${T.border}` },
    danger: { background: 'rgba(248,113,113,0.15)', color: T.red, border: `1px solid ${T.red}30` },
    success: { background: 'rgba(16,185,129,0.15)', color: T.green, border: `1px solid ${T.green}30` },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

// AI Generate modal
function GenerateModal({ onClose, onAdd, clientId, userId, bizName }) {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('blog');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          system: `You are a local SEO content strategist. Generate content calendar ideas for a local business. 
Return ONLY a JSON array (no markdown, no backticks) of 5 content ideas. Each idea: 
{"title":"...","type":"${type}","description":"...","keywords":["..."],"bestDay":"Monday"}
bestDay should be the best day of week to publish this type of content.`,
          messages: [{
            role: 'user',
            content: `Business: ${bizName || 'Local Business'}. Topic: ${topic}. Content type: ${type}. Generate 5 content ideas.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '[]';
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        setResults(Array.isArray(parsed) ? parsed : []);
      } catch { setResults([]); }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleSelect = (i) => {
    setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]);
  };

  const addSelected = () => {
    const now = new Date();
    const items = results.filter((_, i) => selected.includes(i)).map((r, idx) => {
      const d = new Date(now);
      d.setDate(d.getDate() + (idx + 1) * 3);
      return {
        id: Date.now() + idx,
        title: r.title,
        type: r.type || type,
        description: r.description,
        keywords: r.keywords || [],
        status: 'idea',
        date: d.toISOString().split('T')[0],
        clientId, userId,
      };
    });
    onAdd(items);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 12,
        width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', padding: 28
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-sparkles" style={{ color: T.accent, fontSize: 20 }} />
            <span style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>AI Content Ideas</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="Topic or keyword (e.g. roof repair tips)"
            style={{
              flex: 1, background: T.cardBg2, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '8px 12px', color: T.text, fontSize: 13
            }}
          />
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{
              background: T.cardBg2, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '8px 10px', color: T.text, fontSize: 13
            }}
          >
            {CONTENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <Btn onClick={generate} size="sm">
            <i className="ti ti-sparkles" />Generate
          </Btn>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            Generating ideas...
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ marginBottom: 12, color: T.muted, fontSize: 12 }}>
              Click to select ideas to add to your calendar
            </div>
            {results.map((r, i) => {
              const ct = CONTENT_TYPES.find(c => c.id === r.type) || CONTENT_TYPES[0];
              const isSel = selected.includes(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  style={{
                    background: isSel ? `${T.accent}15` : T.cardBg2,
                    border: `1px solid ${isSel ? T.accent : T.border}`,
                    borderRadius: 8, padding: 14, marginBottom: 8, cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: `${ct.color}20`, flexShrink: 0
                    }}>
                      <i className={`ti ${ct.icon}`} style={{ color: ct.color, fontSize: 14 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ color: T.textSub, fontSize: 12, marginBottom: 6 }}>{r.description}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(r.keywords || []).slice(0, 4).map((kw, ki) => (
                          <span key={ki} style={{
                            background: `${T.accent}20`, color: T.accentHi,
                            borderRadius: 4, padding: '2px 7px', fontSize: 11
                          }}>{kw}</span>
                        ))}
                        {r.bestDay && (
                          <span style={{
                            background: `${T.green}15`, color: T.green,
                            borderRadius: 4, padding: '2px 7px', fontSize: 11
                          }}>Best: {r.bestDay}</span>
                        )}
                      </div>
                    </div>
                    {isSel && <i className="ti ti-circle-check-filled" style={{ color: T.accent, fontSize: 18 }} />}
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Btn onClick={onClose} variant="ghost">Cancel</Btn>
              <Btn onClick={addSelected} disabled={!selected.length}>
                <i className="ti ti-calendar-plus" />
                Add {selected.length > 0 ? selected.length : ''} to Calendar
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Add/Edit item modal
function ItemModal({ item, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    type: item?.type || 'blog',
    description: item?.description || '',
    status: item?.status || 'idea',
    date: item?.date || new Date().toISOString().split('T')[0],
    keywords: item?.keywords?.join(', ') || '',
    notes: item?.notes || '',
    platform: item?.platform || 'facebook',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({
      ...item,
      ...form,
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      id: item?.id || Date.now(),
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: T.cardBg, border: `1px solid ${T.border2}`, borderRadius: 12,
        width: '100%', maxWidth: 520, padding: 28
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>
            {item?.id ? 'Edit Content' : 'New Content'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {[
          { label: 'Title', key: 'title', type: 'text', placeholder: 'Content title...' },
          { label: 'Date', key: 'date', type: 'date' },
          { label: 'Keywords (comma separated)', key: 'keywords', type: 'text', placeholder: 'seo, local business, ...' },
          { label: 'Description', key: 'description', type: 'textarea', placeholder: 'Brief description...' },
          { label: 'Notes', key: 'notes', type: 'textarea', placeholder: 'Internal notes...' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                style={{
                  width: '100%', background: T.cardBg2, border: `1px solid ${T.border}`,
                  borderRadius: 6, padding: '8px 12px', color: T.text, fontSize: 13,
                  resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            ) : (
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: '100%', background: T.cardBg2, border: `1px solid ${T.border}`,
                  borderRadius: 6, padding: '8px 12px', color: T.text, fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              style={{ width: '100%', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.text, fontSize: 13 }}>
              {CONTENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              style={{ width: '100%', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '8px 10px', color: T.text, fontSize: 13 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {form.type === 'social' && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: T.textSub, fontSize: 12, display: 'block', marginBottom: 5 }}>Publish To</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'facebook', label: 'Facebook', icon: 'ti-brand-facebook' },
                { id: 'linkedin', label: 'LinkedIn', icon: 'ti-brand-linkedin' },
              ].map(p => (
                <button key={p.id} onClick={() => set('platform', p.id)} style={{
                  flex: 1, background: form.platform === p.id ? `${T.accent}20` : T.cardBg2,
                  border: `1px solid ${form.platform === p.id ? T.accent : T.border}`,
                  borderRadius: 6, padding: '7px 0', color: form.platform === p.id ? T.accentHi : T.muted,
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <i className={`ti ${p.icon}`} />{p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <div>
            {item?.id && (
              <Btn onClick={() => { onDelete(item.id); onClose(); }} variant="danger">
                <i className="ti ti-trash" />Delete
              </Btn>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onClose} variant="ghost">Cancel</Btn>
            <Btn onClick={handleSave}>
              <i className="ti ti-check" />Save
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentCalendarPage({ clientId, userId, bizName }) {
  const [view, setView] = useState('calendar'); // calendar | list
  const [items, setItems] = useState([]);
  const [today] = useState(new Date());
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [showGenerate, setShowGenerate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [clickedDate, setClickedDate] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [publishMsg, setPublishMsg] = useState(null);

  const publishToSocial = async (item) => {
    setPublishingId(item.id);
    setPublishMsg(null);
    try {
      const sbUrl = sessionStorage.getItem('rf_sb_url');
      const sbKey = sessionStorage.getItem('rf_sb_key');
      const platform = item.platform || 'facebook';
      const res = await fetch(`${sbUrl}/functions/v1/social-publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sbKey}`,
        },
        body: JSON.stringify({
          platform,
          message: item.description || item.title,
          client_id: clientId,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        saveItem({ ...item, status: 'published', publishedAt: new Date().toISOString() });
        setPublishMsg({ type: 'success', text: `Posted to ${platform} successfully` });
      } else {
        setPublishMsg({ type: 'error', text: data.error || 'Publish failed' });
      }
    } catch (e) {
      setPublishMsg({ type: 'error', text: e.message });
    }
    setPublishingId(null);
    setTimeout(() => setPublishMsg(null), 4000);
  };

  // Load from localStorage (no new table needed per session handoff)
  const storageKey = `content_calendar_${userId}_${clientId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const saveItems = useCallback((newItems) => {
    setItems(newItems);
    try { localStorage.setItem(storageKey, JSON.stringify(newItems)); } catch {}
  }, [storageKey]);

  const addItems = (newItems) => saveItems([...items, ...newItems]);

  const saveItem = (item) => {
    const exists = items.find(i => i.id === item.id);
    if (exists) {
      saveItems(items.map(i => i.id === item.id ? item : i));
    } else {
      saveItems([...items, item]);
    }
  };

  const deleteItem = (id) => saveItems(items.filter(i => i.id !== id));

  const prevMonth = () => {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(curYear, curMonth);
  const firstDay = getFirstDayOfMonth(curYear, curMonth);

  const getItemsForDate = (day) => {
    const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter(i => i.date === dateStr);
  };

  const filteredItems = items.filter(i => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Stats
  const stats = {
    total: items.length,
    published: items.filter(i => i.status === 'published').length,
    scheduled: items.filter(i => i.status === 'scheduled').length,
    draft: items.filter(i => i.status === 'draft').length,
    idea: items.filter(i => i.status === 'idea').length,
  };

  const todayStr = today.toISOString().split('T')[0];

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.pageBg, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
            <i className="ti ti-calendar-event" style={{ color: T.accent, marginRight: 10 }} />
            Content Calendar
          </h1>
          {bizName && <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{bizName}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
            {[['calendar','ti-calendar-month','Calendar'],['list','ti-list','List']].map(([v, icon, label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? T.accent : 'transparent',
                border: 'none', color: view === v ? '#fff' : T.muted,
                padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5
              }}>
                <i className={`ti ${icon}`} />{label}
              </button>
            ))}
          </div>
          <Btn onClick={() => setShowGenerate(true)}>
            <i className="ti ti-sparkles" />AI Ideas
          </Btn>
          <Btn onClick={() => { setClickedDate(todayStr); setShowAddModal(true); }}>
            <i className="ti ti-plus" />Add Content
          </Btn>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total', val: stats.total, color: T.accent, icon: 'ti-files' },
          { label: 'Ideas', val: stats.idea, color: T.muted, icon: 'ti-bulb' },
          { label: 'Drafts', val: stats.draft, color: T.yellow, icon: 'ti-pencil' },
          { label: 'Scheduled', val: stats.scheduled, color: T.accent, icon: 'ti-clock' },
          { label: 'Published', val: stats.published, color: T.green, icon: 'ti-circle-check' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '14px 16px', textAlign: 'center' }}>
            <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 20, display: 'block', marginBottom: 4 }} />
            <div style={{ color: T.text, fontWeight: 700, fontSize: 20 }}>{s.val}</div>
            <div style={{ color: T.muted, fontSize: 11 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <Card>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, cursor: 'pointer', padding: '5px 10px' }}>
              <i className="ti ti-chevron-left" />
            </button>
            <span style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>
              {MONTHS[curMonth]} {curYear}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, cursor: 'pointer', padding: '5px 10px' }}>
              <i className="ti ti-chevron-right" />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', color: T.muted, fontSize: 11, fontWeight: 600, padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 80, background: `${T.cardBg2}50`, borderRadius: 6 }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = getItemsForDate(day);
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={day}
                  onClick={() => { setClickedDate(dateStr); setShowAddModal(true); }}
                  style={{
                    minHeight: 80, background: isToday ? `${T.accent}10` : T.cardBg2,
                    border: `1px solid ${isToday ? T.accent : T.border}`,
                    borderRadius: 6, padding: 6, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.border2}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isToday ? T.accent : T.border}
                >
                  <div style={{
                    color: isToday ? T.accent : T.textSub,
                    fontSize: 12, fontWeight: isToday ? 700 : 500,
                    marginBottom: 4
                  }}>{day}</div>
                  {dayItems.slice(0, 3).map(item => {
                    const ct = CONTENT_TYPES.find(c => c.id === item.type) || CONTENT_TYPES[0];
                    const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.idea;
                    return (
                      <div
                        key={item.id}
                        onClick={e => { e.stopPropagation(); setEditItem(item); }}
                        style={{
                          background: `${ct.color}20`, border: `1px solid ${ct.color}40`,
                          borderLeft: `3px solid ${ct.color}`,
                          borderRadius: 4, padding: '2px 5px', marginBottom: 2,
                          fontSize: 10, color: T.text,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                        title={item.title}
                      >
                        <i className={`ti ${ct.icon}`} style={{ marginRight: 3, fontSize: 9 }} />
                        {item.title}
                      </div>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div style={{ color: T.muted, fontSize: 9, paddingLeft: 2 }}>+{dayItems.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardHead icon="ti-list" title="All Content">
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', color: T.text, fontSize: 12 }}>
                <option value="all">All Types</option>
                {CONTENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 8px', color: T.text, fontSize: 12 }}>
                <option value="all">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </CardHead>

          {publishMsg && (
            <div style={{
              background: publishMsg.type === 'success' ? `${T.green}20` : `${T.red}20`,
              border: `1px solid ${publishMsg.type === 'success' ? T.green : T.red}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 14,
              color: publishMsg.type === 'success' ? T.green : T.red,
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
            }}>
              <i className={`ti ${publishMsg.type === 'success' ? 'ti-circle-check' : 'ti-alert-circle'}`} />
              {publishMsg.text}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: T.muted }}>
              <i className="ti ti-calendar-off" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
              No content items yet. Click "AI Ideas" or "Add Content" to get started.
            </div>
          ) : (
            <div>
              {filteredItems.map(item => {
                const ct = CONTENT_TYPES.find(c => c.id === item.type) || CONTENT_TYPES[0];
                const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.idea;
                const isPast = item.date < todayStr;
                return (
                  <div
                    key={item.id}
                    onClick={() => setEditItem(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: T.cardBg2, border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: '12px 16px', marginBottom: 8,
                      cursor: 'pointer', transition: 'border-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = T.border2}
                    onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: `${ct.color}20`, flexShrink: 0
                    }}>
                      <i className={`ti ${ct.icon}`} style={{ color: ct.color, fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{item.title}</div>
                      {item.description && (
                        <div style={{ color: T.muted, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      {item.type === 'social' && item.status !== 'published' && (
                        <button
                          onClick={e => { e.stopPropagation(); publishToSocial(item); }}
                          disabled={publishingId === item.id}
                          style={{
                            background: `${T.green}15`, color: T.green,
                            border: `1px solid ${T.green}40`, borderRadius: 5,
                            padding: '4px 10px', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <i className={`ti ${publishingId === item.id ? 'ti-loader-2' : 'ti-send'}`} />
                          {publishingId === item.id ? 'Posting...' : 'Publish'}
                        </button>
                      )}
                      <span style={{
                        background: `${st.color}20`, color: st.color,
                        border: `1px solid ${st.color}40`,
                        borderRadius: 5, padding: '3px 9px', fontSize: 11, fontWeight: 600
                      }}>
                        <i className={`ti ${st.icon}`} style={{ marginRight: 4 }} />{st.label}
                      </span>
                      <span style={{
                        color: isPast && item.status !== 'published' ? T.red : T.muted,
                        fontSize: 12, minWidth: 80, textAlign: 'right'
                      }}>
                        {item.date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onAdd={addItems}
          clientId={clientId}
          userId={userId}
          bizName={bizName}
        />
      )}

      {(showAddModal || editItem) && (
        <ItemModal
          item={editItem || (clickedDate ? { date: clickedDate } : null)}
          onClose={() => { setShowAddModal(false); setEditItem(null); setClickedDate(null); }}
          onSave={saveItem}
          onDelete={deleteItem}
        />
      )}
    </div>
  );
}
