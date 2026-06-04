// src/App.jsx
import { useState, useEffect } from 'react'
import { supabase }                        from './lib/supabase'
import { migrateLocalStorageKeysToVault }  from './lib/vaultKeys'
import AuthPage                            from './components/AuthPage'
import DashboardShell                      from './components/DashboardShell'
import BillingPage                         from './components/BillingPage'
import OnboardingWizard                    from './components/OnboardingWizard'

function ResetPasswordForm({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState('')
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6)        { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm)        { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Password updated! Redirecting...')
    setTimeout(() => { window.location.replace('/') }, 2000)
  }

  const inp = {
    width:'100%', padding:'12px 14px', background:'#0f1826', color:'#e8f0ff',
    border:'1.5px solid #1a2840', borderRadius:10, fontSize:14, outline:'none',
    marginBottom:12, boxSizing:'border-box',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#080e1a', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:400, background:'#0d1f3c', border:'1px solid #1a3560',
        borderRadius:16, padding:'36px 32px', boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize:22, fontWeight:800, color:'#fff', marginBottom:6 }}>Set New Password</div>
        <div style={{ fontSize:13, color:'#4a5c7a', marginBottom:28 }}>Enter your new password below.</div>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="New password (min 6 characters)"
            value={password} onChange={e=>setPassword(e.target.value)}
            required minLength={6} style={inp}
            onFocus={e=>e.target.style.borderColor='#1a5fd4'}
            onBlur={e=>e.target.style.borderColor='#1a2840'} />
          <input type="password" placeholder="Confirm new password"
            value={confirm} onChange={e=>setConfirm(e.target.value)}
            required minLength={6} style={inp}
            onFocus={e=>e.target.style.borderColor='#1a5fd4'}
            onBlur={e=>e.target.style.borderColor='#1a2840'} />
          {error   && <div style={{ color:'#ff5a5a', fontSize:13, marginBottom:12,
            padding:'8px 12px', background:'rgba(255,90,90,.08)', borderRadius:8 }}>{error}</div>}
          {message && <div style={{ color:'#34c759', fontSize:13, marginBottom:12,
            padding:'8px 12px', background:'rgba(52,199,89,.08)', borderRadius:8 }}>{message}</div>}
          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px 0',
            background:loading?'#1a2840':'linear-gradient(135deg,#1a5fd4,#0e3fa8)',
            color:'#fff', border:'none', borderRadius:10,
            fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer',
            boxShadow:loading?'none':'0 4px 16px rgba(26,95,212,.4)',
          }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession]           = useState(undefined)
  const [subscription, setSubscription] = useState(undefined)
  const [isRecovery, setIsRecovery]     = useState(false)

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
    return () => authSub.unsubscribe()
  }, [])

  // Migrate any localStorage API keys into Vault
  useEffect(() => {
    if (session?.user) {
      migrateLocalStorageKeysToVault().catch(console.warn)
    }
  }, [session])

  // Load subscription when session exists
  useEffect(() => {
    if (!session?.user?.id) { setSubscription(null); return }
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => setSubscription(data || null))
  }, [session])

  // Show reset password form if recovery event fired
  if (isRecovery) {
    return <ResetPasswordForm onDone={() => setIsRecovery(false)} />
  }

  // Loading
  if (session === undefined || (session && subscription === undefined)) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', background:'#060d1a', color:'#fff',
        fontFamily:"'Segoe UI', system-ui, sans-serif",
        flexDirection:'column', gap:14,
      }}>
        <div style={{
          width:36, height:36, border:'3px solid #0f2040',
          borderTopColor:'#1a5fd4', borderRadius:'50%',
          animation:'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
        <div style={{ fontSize:13, color:'#1a3050' }}>Loading RankForged AI...</div>
      </div>
    )
  }

  // Not logged in
  if (!session) return <AuthPage />

  // No subscription — send to billing first
  if (!subscription) {
    return (
      <BillingPage
        userId={session.user.id}
        userEmail={session.user.email}
        onBack={() => {}}
      />
    )
  }

  // Subscription exists but onboarding incomplete
  if (!subscription.onboarding_completed) {
    return (
      <OnboardingWizard
        userId={session.user.id}
        userEmail={session.user.email}
        onComplete={() => {
          supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data }) => setSubscription(data))
        }}
      />
    )
  }

  // Billing action
  if (new URLSearchParams(window.location.search).get('action') === 'billing') {
    return <BillingPage userId={session.user.id} userEmail={session.user.email}
      onBack={() => { window.history.replaceState({}, '', '/'); window.location.reload() }} />
  }

  // Fully onboarded - show main dashboard
  return <DashboardShell session={session} subscription={subscription} />
}
