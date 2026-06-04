// ⚠️ CRITICAL — DO NOT CHANGE THE NAVIGATION APPROACH ⚠️
// rankforge3.html is a FULL-PAGE app with its own sidebar (24 tabs).
// It MUST be loaded via window.location.href redirect, NOT inside an iframe.
// Using an iframe causes DOUBLE SIDEBAR — the React sidebar + rankforge3's sidebar both show.
// The correct flow:
//   1. User selects a client → setActiveId()
//   2. sessionStorage is populated with rf_client, rf_sb_url, rf_sb_key, rf_user_id
//   3. window.location.href = '/rankforge3.html?client=' + id  (full redirect)
//   4. rankforge3 loads full-screen, reads sessionStorage, shows only its own sidebar
//   5. Back button in rankforge3 returns to window.location.origin + '/'
// DO NOT revert to iframe. This has been fixed multiple times. — Session 7

import BillingPage from './BillingPage'
import ProfileModal from './ProfileModal'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useClients } from '../hooks/useClients'
import ClientsPage from './ClientsPage'

const LOGO = 'data:image/png;base64,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ox+VaWFStwERFICIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAJhEQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEWWNkmhtM6i0hPdbzDcJahta6Bggq2xNDQwHiCx2TkqXM2W6Dxl1FeT/wDJN/5S6mH4Pi8TTVWnG6fajj4rj2CwtV0qknmXYzXlFsI7ZZoQnzaK8D/5Fv8Ayli3a5p61ac1FTUdnjqY6eWjbM4TzCR29vvaeIa3hho6KuK4TisJT6SrGy70WwfG8JjKvRUm2+5mUthku7s5p25/Xc/ztU6Ew8VjXYvPuaDhZ4VU35FNxUcOa93waNsDS7j51xpXx9Z9rLp3w8VhHtGu3tR2g/8At2P99Kstio9Kw5t/fv6gtZ/9B/xZFp/Ekf8Aon3o3fhdNcRj3P6GNkRF8+PpwWRNnezF+qKJlyqL3SU9GTxjgPezA+DhwDD68+pY7KzXsJ0XX0j26ouM09JFIwilpWuLTMD928fF8B1PHlz3+G4dYjERhKLkux28Tl8YxUsNhZVITUXyur37ETfTuzrSFiLJKW2+VVDePf1h7x2fED4I9gUoqJWR0zpJpN2KFhcSeTGjifUEyegUK203k2rQdZGx+5NWkUrPHDvhf1QR7V7506GAoSnTilZXPmKqYniWIhTqScnJpdxrzqO4yXe+11zlzvVM75cHoCeA9gwFQKYaa2Za71JZ47xY9OVdbQyOc1kzMbriDg4yfFSewbANf3Coa2401JZoc+fJVzjIHoY3Lj7Avmc55pNvc+wQgoRUVsjHelbFcdS6go7HaoTNV1cgYwDk3xcfAAcSVvlpi1UmmtO26w0bsw0NO2EO+MQOLvaclRDZfs40/s+pX+QPfWXKZu7UV8rQ1zh8VjeO432knqegl082CTvZVNyx3Tz+LlbqmbieK41E2QVQzS5BViDHnaNurKPZtU0+9iStnjgYOp47x/A0rVlZW7SOo23LU8FjgfvRWxh70g85n4JHsaGj1lyxShIREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQGcthExboeoj5AXFzv6jVPTMMc1jHYnMWaVqm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mdW17aG+oMmnbBUEMB3aqojPwj8RpHTxKg9xvGodVyWjTtcZJ6mGUU8AcCHve8hrQ708gszdnTZACKfWmrKbGMS26hlbz6iV4PTq0H1+CzbddP6brr7TX6ss1HLdaV2/DV7mJAcYBJGN7GeG9nHReIxfEa+KnKUno9LcrH0HBcKw2DpwhGN3HW/O7Vmyq0xaqXTOlrdYqEgw0NO2EO+MQOLvaclRDZfs40/s+pX+QPfWXKZu7UV8rQ1zh8VjeO432knqegl082CTvZVNyx3Tz+LlbqmbieK41E2QVQzS5BViDHnaNurKPZtU0+9iStnjgYOp47x/A0rVlZW7SOo23LU8FjgfvRWxh70g85n4JHsaGj1lyxShIREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQGcthExboeoj5AXFzv6jVPTMMc1jHYnMWaVqm9PLSf6gU7FQvpnBFbAU/H6s+V8ci5cQqvt9EXMTY6rCm3t+/qyiPhb2/jZVloVHpWHtt7w/VFGR/oLfxki1fiX/ZeKNr4Yi1xBdzJNskl3NHRjP65k/IpiKjhzWP9mMpbpZozw7+T8ilYn4c1ucJlbBUu4xcVpXxlV9rLr5R6VinbbIZL3bT4UWP97Ishd9nqsa7Xnl13t+elH/xHrT+IpXwL70bnw7Sy46L7H9CEoF20lPPV1MdNSwvmnlcGxxsblziegCznsy2aw2J0V3v8cdTcxh0VOcOjpj4u6Of+Aek8vE4LA1sZUyU148ke04hxKhgKWeq+5c2WnZNs0YRDftUQHHB9LQvHwvB8g8PBvXrwWYSXcxx9S+Of3ji5x4niSSsQbWdorohNYdPVGScsqqph5Dqxh+c/Ivbwp4XguGcnq/m3+eR88nPGcfxSitvlFfnmdW17aG+oMmnbBUEMB3aqojPwj8RpHTxKg9xvGodVyWjTtcZJ6mGUU8AcCHve8hrQ708gszdnTZACKfWmrKbGMS26hlbz6iV4PTq0H1+CzbddP6brr7TX6ss1HLdaV2/DV7mJAcYBJGN7GeG9nHReIxfEa+KnKUno9LcrH0HBcKw2DpwhGN3HW/O7Vmyq0xaqXTOlrdYqEgw0NO2EO+MQOLvaclRDZfs40/s+pX+QPfWXKZu7UV8rQ1zh8VjeO432knqegl082CTvZVNyx3Tz+LlbqmbieK41E2QVQzS5BViDHnaNurKPZtU0+9iStnjgYOp47x/A0rVlZW7SOo23LU8FjgfvRWxh70g85n4JHsaGj1lyxShIREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQA=='

const PLAN_COLORS = {
  solopreneur: '#3b82f6', deluxe: '#8b5cf6',
  pro: '#06b6d4', agency: '#10b981'
}

export default function DashboardShell({ session, subscription }) {
  const [activeTab, setActiveTab]     = useState('clients')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showBilling, setShowBilling] = useState(false)
  const [darkMode, setDarkMode]       = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const { clients, activeId, setActiveId, createClient, deleteClient, updateClientMeta } = useClients(session.user.id)
  const activeClient = clients.find(c => c.id === activeId)
  const plan        = subscription?.plan || 'solopreneur'
  const maxClients  = subscription?.max_clients || 1

  // ─── Navigate to rankforge3 (full-page redirect) ──────────────────────────
  // This is the ONLY correct way. Do NOT change to iframe.
  const openRankForge = async (clientId) => {
    const sbUrl  = process.env.REACT_APP_SUPABASE_URL  || import.meta.env.VITE_SUPABASE_URL  || ''
    const sbKey  = process.env.REACT_APP_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''

    // Get session token for user_id
    const { data: { session: sess } } = await supabase.auth.getSession()
    const userId = sess?.user?.id || session.user.id

    // Populate sessionStorage so rankforge3 can read credentials on load
    sessionStorage.setItem('rf_client',     clientId)
    sessionStorage.setItem('rf_sb_url',     sbUrl)
    sessionStorage.setItem('rf_sb_key',     sbKey)
    sessionStorage.setItem('rf_user_id',    userId)
    sessionStorage.setItem('rf_user_email', session.user.email)
    sessionStorage.setItem('rf_plan',       plan)

    // Full-page redirect — rankforge3 loads with its own sidebar only
    window.location.href = '/rankforge3.html?client=' + clientId
  }

  const handleSelectClient = (id) => {
    setActiveId(id)
    openRankForge(id)
  }

  const signOut = () => supabase.auth.signOut()

  const bg   = darkMode ? '#060d1a' : '#f0f4f8'
  const bg2  = darkMode ? '#080f1e' : '#ffffff'
  const text1 = darkMode ? '#e2e8f0' : '#1a2a3a'
  const border = darkMode ? '#0f2040' : '#d0dce8'

  return (
    <div style={{ display: 'flex', height: '100vh', background: bg,
      fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 228, minWidth: 228, background: '#080f1e',
        borderRight: '1px solid #0f2040', display: 'flex',
        flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid #0f2040' }}>
          <div style={{ marginBottom: 10, textAlign: 'center' }}>
            <img src={LOGO} alt="RankForged AI"
              style={{ width: '100%', maxWidth: 180, objectFit: 'contain' }}
              onError={e => e.target.style.display = 'none'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,.04)', borderRadius: 7, padding: '5px 9px',
            border: '1px solid #1a3560' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%',
                background: PLAN_COLORS[plan] || '#3b82f6' }} />
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600,
                textTransform: 'capitalize' }}>{plan}</span>
            </div>
            <span style={{ fontSize: 10, color: '#1a3560' }}>
              {clients.length}/{maxClients}
            </span>
          </div>
        </div>

        {/* Nav — only My Businesses on this shell */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <button onClick={() => setActiveTab('clients')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            marginBottom: 8, textAlign: 'left',
            background: 'linear-gradient(135deg,rgba(59,130,246,.22),rgba(59,130,246,.08))',
            color: '#93c5fd', fontWeight: 700, fontSize: 13,
            borderLeft: '2px solid #3b82f6',
          }}>
            My Businesses
          </button>
          <div style={{ height: 1, background: '#0f2040', marginBottom: 8 }} />
          <div style={{ padding: '12px 10px', color: '#2a4060', fontSize: 12, lineHeight: 1.6 }}>
            Select a business to open the full SEO tool with all 24 tabs.
          </div>
        </nav>

        {/* User */}
        <div style={{ padding: '8px', borderTop: '1px solid #0f2040', position: 'relative' }}>
          <div onClick={() => setUserMenuOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
              borderRadius: 8, cursor: 'pointer',
              background: userMenuOpen ? 'rgba(59,130,246,.1)' : 'transparent' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {session.user.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#3a5070', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.email}
              </div>
            </div>
          </div>
          {userMenuOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 8, right: 8,
              background: '#0d1f3c', border: '1px solid #1a3560', borderRadius: 10,
              padding: 6, marginBottom: 4, boxShadow: '0 -8px 24px rgba(0,0,0,.5)' }}>
              <button onClick={() => { setShowProfile(true); setUserMenuOpen(false) }}
                style={{ width: '100%', padding: '8px 12px', background: 'transparent',
                  color: '#c8d8f0', border: 'none', borderRadius: 7, fontSize: 13,
                  fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                View Profile
              </button>
              <button onClick={() => { setShowBilling(true); setUserMenuOpen(false) }}
                style={{ width: '100%', padding: '8px 12px', background: 'transparent',
                  color: '#c8d8f0', border: 'none', borderRadius: 7, fontSize: 13,
                  fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                Plans & Billing
              </button>
              <button onClick={signOut}
                style={{ width: '100%', padding: '8px 12px', background: 'transparent',
                  color: '#f87171', border: 'none', borderRadius: 7, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ height: 50, flexShrink: 0, background: '#080f1e',
          borderBottom: '1px solid #0f2040', display: 'flex',
          alignItems: 'center', padding: '0 14px', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 13, color: '#4a6080', fontWeight: 500 }}>
            My Businesses
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <button onClick={() => setDarkMode(d => !d)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #1a3560',
                background: 'transparent', color: '#93c5fd', cursor: 'pointer',
                fontSize: 13, fontWeight: 600 }}>
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setUserMenuOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 12px', background: 'rgba(59,130,246,.08)',
                  border: '1px solid #1a3560', borderRadius: 8, cursor: 'pointer',
                  color: '#93c5fd', fontSize: 12.5, fontWeight: 600 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800, color: '#fff' }}>
                  {session.user.email.charAt(0).toUpperCase()}
                </div>
                My Profile
              </button>
              {userMenuOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#0d1f3c', border: '1px solid #1a3560', borderRadius: 10,
                  padding: 6, minWidth: 210, zIndex: 999,
                  boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
                  <div style={{ padding: '6px 12px 8px', borderBottom: '1px solid #1a3560',
                    marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#7ab4ff' }}>
                      {session.user.email}
                    </div>
                  </div>
                  {[
                    { label: 'View Profile',        action: () => { setShowProfile(true); setUserMenuOpen(false) } },
                    { label: 'Plans and Billing',   action: () => { setShowBilling(true); setUserMenuOpen(false) } },
                    { label: 'Reset Password',      action: async () => { await supabase.auth.resetPasswordForEmail(session.user.email); setUserMenuOpen(false); alert('Password reset email sent') } },
                    { label: 'Sign Out',            action: () => { signOut(); setUserMenuOpen(false) }, red: true },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      style={{ width: '100%', padding: '8px 12px', background: 'transparent',
                        color: item.red ? '#f87171' : '#c8d8f0', border: 'none',
                        borderRadius: 7, fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', textAlign: 'left' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Businesses page — always shown here */}
        <ClientsPage
          clients={clients}
          activeId={activeId}
          maxClients={maxClients}
          plan={plan}
          onSelect={handleSelectClient}
          onAdd={() => setShowAddModal(true)}
          onUpgrade={() => setShowBilling(true)}
          onBilling={() => setShowBilling(true)}
          onSignOut={signOut}
          onResetPassword={async () => {
            await supabase.auth.resetPasswordForEmail(session.user.email)
            alert('Password reset email sent to ' + session.user.email)
          }}
          userEmail={session.user.email}
          onDelete={deleteClient}
          onUpdateMeta={updateClientMeta}
          onCreate={createClient}
        />
      </div>

      {/* Billing overlay */}
      {showBilling && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
          background: '#060d1a', overflow: 'auto' }}>
          <BillingPage
            userId={session.user.id}
            userEmail={session.user.email}
            onBack={() => setShowBilling(false)}
          />
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal
          session={session}
          activeId={activeId || (clients.length > 0 ? clients[0].id : null)}
          subscription={subscription}
          onClose={() => setShowProfile(false)}
          onResetPassword={async () => {
            await supabase.auth.resetPasswordForEmail(session.user.email)
            alert('Password reset email sent to ' + session.user.email)
          }}
          onBilling={() => { setShowProfile(false); setShowBilling(true) }}
          iframeRef={null}
        />
      )}

      {/* Add Business modal */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onCreate={async (data) => {
            const client = await createClient(data.name)
            if (client) {
              if (data.city || data.category) {
                await updateClientMeta(client.id, { city: data.city, category: data.category })
              }
              setShowAddModal(false)
              handleSelectClient(client.id)
            } else {
              setShowAddModal(false)
            }
          }}
          remaining={maxClients - clients.length}
          plan={plan}
        />
      )}
    </div>
  )
}

function AddModal({ onClose, onCreate, remaining, plan }) {
  const [name, setName]         = useState('')
  const [addr, setAddr]         = useState('')
  const [city, setCity]         = useState('')
  const [state, setState]       = useState('')
  const [zip, setZip]           = useState('')
  const [phone, setPhone]       = useState('')
  const [website, setWebsite]   = useState('')
  const [cat, setCat]           = useState('')
  const [desc, setDesc]         = useState('')
  const [keywords, setKeywords] = useState('')
  const [saving, setSaving]     = useState(false)

  const CATS = ['Home Services','Restaurant','Healthcare','Finance','Legal','Retail',
    'Real Estate','Automotive','Beauty & Wellness','Education','Technology','General']
  const inp = { width: '100%', padding: '9px 12px', background: '#07111f',
    color: '#e2e8f0', border: '1.5px solid #1a3560', borderRadius: 7,
    fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: '#60a5fa',
    marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      zIndex: 1000, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0d1f3c', border: '1px solid #1a3560',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#e2e8f0' }}>
            Add New Business
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none',
            color: '#3a5080', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <div style={{ background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 18, fontSize: 12, color: '#60a5fa' }}>
          {remaining > 0
            ? `${remaining} slot${remaining > 1 ? 's' : ''} remaining on ${plan} plan`
            : 'All slots used — upgrade for more'}
        </div>
        {[
          { label: 'Business Name *', value: name, set: setName, placeholder: 'e.g. Austin Plumbing Pros', required: true },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={lbl}>{f.label}</label>
            <input value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder} style={inp}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#1a3560'} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Category</label>
          <select value={cat} onChange={e => setCat(e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}>
            <option value="">Select category...</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Street Address</label>
          <input value={addr} onChange={e => setAddr(e.target.value)}
            placeholder="123 Main St" style={inp}
            onFocus={e => e.target.style.borderColor = '#3b82f6'}
            onBlur={e => e.target.style.borderColor = '#1a3560'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
          gap: 8, marginBottom: 12 }}>
          {[
            { label: 'City',  value: city,  set: setCity,  ph: 'Austin' },
            { label: 'State', value: state, set: setState, ph: 'TX' },
            { label: 'ZIP',   value: zip,   set: setZip,   ph: '78701' },
          ].map(f => (
            <div key={f.label}>
              <label style={lbl}>{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)}
                placeholder={f.ph} style={inp}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#1a3560'} />
            </div>
          ))}
        </div>
        {[
          { label: 'Phone',    value: phone,    set: setPhone,    ph: '(512) 555-0100' },
          { label: 'Website',  value: website,  set: setWebsite,  ph: 'https://yourbusiness.com' },
          { label: 'Keywords (comma separated)', value: keywords, set: setKeywords, ph: 'plumber, drain cleaning' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={lbl}>{f.label}</label>
            <input value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.ph} style={inp}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#1a3560'} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Business Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Describe the business in 2-3 sentences..." rows={3}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px 0', background: 'transparent',
              color: '#4a6080', border: '1px solid #1a3560', borderRadius: 8,
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!name.trim() || saving || remaining <= 0) return
              setSaving(true)
              await onCreate({
                name: name.trim(), addr: addr.trim(), city: city.trim(),
                state: state.trim(), zip: zip.trim(), phone: phone.trim(),
                website: website.trim(), category: cat,
                desc: desc.trim(), keywords: keywords.trim()
              })
              setSaving(false)
            }}
            disabled={!name.trim() || saving || remaining <= 0}
            style={{
              flex: 2, padding: '10px 0', border: 'none', borderRadius: 8,
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              background: !name.trim() || saving || remaining <= 0
                ? '#0d1f3c' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color: !name.trim() || saving || remaining <= 0 ? '#2a4060' : '#fff',
            }}>
            {saving ? 'Creating...' : 'Create Business'}
          </button>
        </div>
      </div>
    </div>
  )
}
