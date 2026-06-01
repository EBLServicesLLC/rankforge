// src/App.jsx
import { useState, useEffect } from 'react'
import { supabase }                        from './lib/supabase'
import { migrateLocalStorageKeysToVault }  from './lib/vaultKeys'
import AuthPage                            from './components/AuthPage'
import DashboardShell                      from './components/DashboardShell'
import BillingPage                         from './components/BillingPage'
import OnboardingWizard                    from './components/OnboardingWizard'

export default function App() {
  const [session, setSession]           = useState(undefined)
  const [subscription, setSubscription] = useState(undefined)

  // â”€â”€ Auth listener â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => authSub.unsubscribe()
  }, [])

  // â”€â”€ Migrate any localStorage API keys into Vault â”€â”€â”€
  useEffect(() => {
    if (session?.user) {
      migrateLocalStorageKeysToVault().catch(console.warn)
    }
  }, [session])

  // â”€â”€ Load subscription when session exists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!session?.user?.id) { setSubscription(null); return }
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => setSubscription(data || null))
  }, [session])

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Not logged in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!session) return <AuthPage />

  // â”€â”€ Logged in but no subscription or onboarding incomplete â”€â”€
  if (!subscription || !subscription.onboarding_completed) {
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

  // â”€â”€ Fully onboarded â€” show main dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (new URLSearchParams(window.location.search).get('action') === 'billing') {
    return <BillingPage userId={session.user.id} userEmail={session.user.email} onBack={() => { window.history.replaceState({}, '', '/'); window.location.reload() }} />
  }
  return <DashboardShell session={session} subscription={subscription} />
}

