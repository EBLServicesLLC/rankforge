// src/components/ClientsPage.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const PLAN_COLORS = {
  solopreneur: '#3b82f6',
  deluxe:      '#8b5cf6',
  pro:         '#06b6d4',
  agency:      '#10b981',
}

const BIZ_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#06b6d4','#ec4899','#84cc16',
]

const SEO_TIPS = [
  'Run the GBP Health Monitor to score your Google Business Profile',
  'Submit to the top 20 citation directories with one click',
  'Run the Keyword Opportunity Spotter to find quick wins',
  'Set up the Weekly Report scheduler for automated reports',
  'Use the Review Velocity Agent to get more 5-star reviews',
  'Run the Competitor Gap Agent to find what competitors have that you don\'t',
]

export default function ClientsPage({
  clients, activeId, maxClients, plan,
  onSelect, onAdd, onDelete, onUpdateMeta, onCreate
}) {
  const [editId, setEditId]           = useState(null)
  const [editData, setEditData]       = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [search, setSearch]           = useState('')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city||'').toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = (client) => {
    setEditId(client.id)
    setEditData({ name: client.name, city: client.city||'', category: client.category||'', color: client.color || BIZ_COLORS[0] })
  }

  const saveEdit = async () => {
    if (!editData.name?.trim()) return
    setSaving(true)
    await onUpdateMeta(editId, { name:editData.name.trim(), city:editData.city, category:editData.category, color:editData.color })
    setEditId(null)
    setSaving(false)
  }

  const confirmDelete = async () => {
    await onDelete(deleteConfirm)
    setDeleteConfirm(null)
  }

  const tip = SEO_TIPS[Math.floor(Date.now() / 86400000) % SEO_TIPS.length]

  return (
    <div style={{
      flex:1, overflowY:'auto', background:'#060d1a',
      padding:'28px 32px',
    }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e2e8f0', marginBottom:4 }}>My Businesses</h1>
          <p style={{ fontSize:13.5, color:'#4a6080', margin:0 }}>
            Manage your SEO campaigns. Select a business to open the full tool.
          </p>
        </div>
        <button onClick={onAdd} disabled={clients.length >= maxClients}
          title={clients.length >= maxClients ? `Upgrade to add more businesses` : ''}
          style={{
            padding:'10px 20px', borderRadius:10, border:'none',
            background: clients.length >= maxClients ? '#0d1f3c' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            color: clients.length >= maxClients ? '#2a4060' : '#fff',
            fontSize:14, fontWeight:700, cursor: clients.length >= maxClients ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', gap:7,
            boxShadow: clients.length >= maxClients ? 'none' : '0 4px 14px rgba(59,130,246,.35)',
          }}>
          ➕ Add Business
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:12, marginBottom:28 }}>
        {[
          { label:'Total Businesses', value:clients.length, sub:`of ${maxClients} on ${plan} plan`, icon:'🏢', color:'#3b82f6' },
          { label:'Plan Slots Used',  value:`${clients.length}/${maxClients}`, sub: clients.length >= maxClients ? '⚠ At limit' : `${maxClients-clients.length} available`, icon:'📊', color: clients.length >= maxClients ? '#ef4444' : '#10b981' },
          { label:'Active Business',  value: activeId ? clients.find(c=>c.id===activeId)?.name?.split(' ')[0] || '—' : 'None', sub: activeId ? 'Currently working on' : 'Select one below', icon:'⚡', color:'#f59e0b' },
          { label:'Plan',             value: plan.charAt(0).toUpperCase()+plan.slice(1), sub:'Your current plan', icon:'💎', color: PLAN_COLORS[plan]||'#3b82f6' },
        ].map(stat => (
          <div key={stat.label} style={{ background:'#0a1628', border:'1px solid #1a3560', borderRadius:12, padding:'14px 16px', borderTop:`2px solid ${stat.color}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:18 }}>{stat.icon}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#2a4060', textTransform:'uppercase', letterSpacing:'.05em' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginBottom:2 }}>{stat.value}</div>
            <div style={{ fontSize:11.5, color:'#2a4060' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      {clients.length > 3 && (
        <div style={{ marginBottom:20 }}>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Search businesses..."
            style={{ width:'100%', maxWidth:360, padding:'9px 14px', background:'#0a1628', color:'#e2e8f0', border:'1.5px solid #1a3560', borderRadius:8, fontSize:13.5, outline:'none', boxSizing:'border-box' }}
            onFocus={e=>e.target.style.borderColor='#3b82f6'}
            onBlur={e=>e.target.style.borderColor='#1a3560'}
          />
        </div>
      )}

      {/* ── Business grid ── */}
      {filtered.length === 0 && clients.length === 0 ? (
        // Empty state
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:16, background:'#0a1628', borderRadius:16, border:'2px dashed #1a3560' }}>
          <div style={{ fontSize:52 }}>🏢</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#e2e8f0' }}>No businesses yet</div>
          <div style={{ fontSize:13.5, color:'#3a5080', maxWidth:340, textAlign:'center', lineHeight:1.6 }}>
            Add your first business to start building your local SEO campaign. Each business gets its own dashboard, citations, backlinks, and reports.
          </div>
          <button onClick={onAdd} style={{ padding:'11px 28px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,.35)' }}>
            ➕ Add Your First Business
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map(client => {
            const isActive  = client.id === activeId
            const isEditing = editId === client.id
            const initials  = client.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
            const color     = client.color || BIZ_COLORS[clients.indexOf(client) % BIZ_COLORS.length]

            return (
              <div key={client.id} style={{
                background:'#0a1628',
                border: isActive ? '1.5px solid #3b82f6' : '1.5px solid #1a3560',
                borderRadius:14, overflow:'hidden',
                boxShadow: isActive ? '0 0 0 3px rgba(59,130,246,.15)' : 'none',
                transition:'.2s',
              }}>
                {/* Card header */}
                <div style={{ height:6, background:color }} />

                <div style={{ padding:'18px 18px 14px' }}>
                  {isEditing ? (
                    // Edit mode
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#60a5fa', marginBottom:12 }}>✏️ Edit Business</div>
                      {[
                        { label:'Business Name', key:'name', placeholder:'Business name' },
                        { label:'City',          key:'city', placeholder:'City, State' },
                        { label:'Category',      key:'category', placeholder:'e.g. Plumber, Dentist' },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom:10 }}>
                          <label style={{ fontSize:11.5, color:'#4a6080', marginBottom:4, display:'block' }}>{f.label}</label>
                          <input value={editData[f.key]||''} onChange={e=>setEditData(d=>({...d,[f.key]:e.target.value}))}
                            placeholder={f.placeholder}
                            style={{ width:'100%', padding:'8px 12px', background:'#07111f', color:'#e2e8f0', border:'1px solid #1a3560', borderRadius:7, fontSize:13, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                      ))}
                      {/* Color picker */}
                      <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:11.5, color:'#4a6080', marginBottom:6, display:'block' }}>Color</label>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {BIZ_COLORS.map(c => (
                            <div key={c} onClick={()=>setEditData(d=>({...d,color:c}))} style={{ width:24, height:24, borderRadius:6, background:c, cursor:'pointer', border: editData.color===c?'3px solid #fff':'3px solid transparent', boxSizing:'border-box' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>setEditId(null)} style={{ flex:1, padding:'7px 0', background:'transparent', color:'#4a6080', border:'1px solid #1a3560', borderRadius:7, fontSize:12.5, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                        <button onClick={saveEdit} disabled={saving} style={{ flex:2, padding:'7px 0', background:'#3b82f6', color:'#fff', border:'none', borderRadius:7, fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                          {saving?'Saving...':'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                        <div style={{ width:44, height:44, borderRadius:10, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff', flexShrink:0 }}>
                          {initials}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:'#e2e8f0', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {client.name}
                          </div>
                          <div style={{ fontSize:12, color:'#3a5570' }}>
                            {[client.city, client.category].filter(Boolean).join(' · ') || 'No details added yet'}
                          </div>
                        </div>
                        {isActive && (
                          <span style={{ fontSize:10, background:'rgba(59,130,246,.15)', color:'#60a5fa', padding:'3px 8px', borderRadius:20, fontWeight:700, flexShrink:0 }}>Active</span>
                        )}
                      </div>

                      {/* SEO Score bar */}
                      <div style={{ marginBottom:14 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:11.5, color:'#2a4060', fontWeight:600 }}>SEO Score</span>
                          <span style={{ fontSize:11.5, fontWeight:700, color: (client.seo_score||0)>=70?'#4ade80':(client.seo_score||0)>=40?'#fbbf24':'#f87171' }}>
                            {client.seo_score||'—'}{client.seo_score?'/100':''}
                          </span>
                        </div>
                        <div style={{ height:5, background:'#0d1f3c', borderRadius:3 }}>
                          <div style={{ height:'100%', borderRadius:3, background: (client.seo_score||0)>=70?'#4ade80':(client.seo_score||0)>=40?'#fbbf24':'#3b82f6', width:`${client.seo_score||0}%`, transition:'.5s' }} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display:'flex', gap:7 }}>
                        <button onClick={()=>onSelect(client.id)}
                          style={{ flex:1, padding:'8px 0', background: isActive?'rgba(59,130,246,.15)':'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: isActive?'#60a5fa':'#fff', border: isActive?'1px solid rgba(59,130,246,.3)':'none', borderRadius:8, fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
                          {isActive?'▶ Open Tool':'Select & Open'}
                        </button>
                        <button onClick={()=>startEdit(client)}
                          style={{ padding:'8px 10px', background:'rgba(255,255,255,.04)', color:'#4a6080', border:'1px solid #1a3560', borderRadius:8, fontSize:13, cursor:'pointer' }}
                          title="Edit">✏️</button>
                        <button onClick={()=>setDeleteConfirm(client.id)}
                          style={{ padding:'8px 10px', background:'rgba(239,68,68,.06)', color:'#ef4444', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, fontSize:13, cursor:'pointer' }}
                          title="Delete">🗑</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add slot card (when under limit) */}
          {clients.length < maxClients && (
            <div onClick={onAdd}
              style={{ background:'rgba(59,130,246,.04)', border:'2px dashed rgba(59,130,246,.2)', borderRadius:14, padding:'32px 20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer', transition:'.15s', minHeight:180 }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(59,130,246,.5)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(59,130,246,.2)'}
            >
              <div style={{ width:44, height:44, borderRadius:10, background:'rgba(59,130,246,.1)', border:'2px dashed rgba(59,130,246,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#3b82f6' }}>+</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#3b82f6' }}>Add Business</div>
              <div style={{ fontSize:12, color:'#2a4060', textAlign:'center' }}>{maxClients-clients.length} slot{maxClients-clients.length!==1?'s':''} remaining</div>
            </div>
          )}
        </div>
      )}

      {/* ── Daily SEO tip ── */}
      {clients.length > 0 && (
        <div style={{ marginTop:28, background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.15)', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20, flexShrink:0 }}>💡</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', marginBottom:3, textTransform:'uppercase', letterSpacing:'.04em' }}>Today\'s SEO Tip</div>
            <div style={{ fontSize:13, color:'#4a7aaa', lineHeight:1.5 }}>{tip}</div>
          </div>
        </div>
      )}

      {/* ── Upgrade banner (when at limit) ── */}
      {clients.length >= maxClients && maxClients < 25 && (
        <div style={{ marginTop:16, background:'linear-gradient(135deg,rgba(139,92,246,.1),rgba(59,130,246,.1))', border:'1px solid rgba(139,92,246,.25)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#c4b5fd', marginBottom:3 }}>🚀 Ready to scale?</div>
            <div style={{ fontSize:12.5, color:'#7c6aa8' }}>You\'ve used all {maxClients} business slot{maxClients!==1?'s':''} on your {plan} plan. Upgrade to manage more businesses.</div>
          </div>
          <button style={{ padding:'9px 20px', background:'linear-gradient(135deg,#8b5cf6,#6d28d9)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            Upgrade Plan →
          </button>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e=>e.target===e.currentTarget&&setDeleteConfirm(null)}>
          <div style={{ background:'#0d1f3c', border:'1px solid #1a3560', borderRadius:16, padding:'28px 32px', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#f87171', marginBottom:10 }}>🗑 Delete Business?</div>
            <div style={{ fontSize:13.5, color:'#64748b', lineHeight:1.6, marginBottom:24 }}>
              This will permanently delete <strong style={{ color:'#e2e8f0' }}>{clients.find(c=>c.id===deleteConfirm)?.name}</strong> and all its SEO data. This cannot be undone.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:'10px 0', background:'transparent', color:'#4a6080', border:'1px solid #1a3560', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ flex:1, padding:'10px 0', background:'#ef4444', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}