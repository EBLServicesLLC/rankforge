// src/components/BillingPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PLANS = [
  { id:'solopreneur', label:'Solopreneur', price:'$97',  clients:1,  color:'#60a5fa', priceId:'price_1TegQ5LQRnOj0qLPTa30h9aV', features:['1 Business','All 24 SEO Tools','AI Agents','Weekly Reports'] },
  { id:'deluxe',      label:'Deluxe',      price:'$197', clients:3,  color:'#8b5cf6', priceId:'price_1TegQLLQRnOj0qLPVIkeOkH5', features:['3 Businesses','All 24 SEO Tools','AI Agents','Weekly Reports','Regional SEO'] },
  { id:'pro',         label:'Pro',         price:'$397', clients:5,  color:'#06b6d4', priceId:'price_1TegQbLQRnOj0qLPiEPGi74n', features:['5 Businesses','All 24 SEO Tools','AI Agents','Weekly Reports','Regional + National SEO'] },
  { id:'agency',      label:'Agency',      price:'$997', clients:25, color:'#10b981', priceId:'price_1TegQwLQRnOj0qLPDTeqAOTV', features:['25 Businesses','All 24 SEO Tools','AI Agents','Weekly Reports','Full SEO Suite','Priority Support'] },
]

export default function BillingPage({ userId, userEmail, onBack }) {
  const [subscription, setSubscription]       = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [portalLoading, setPortalLoading]     = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [error, setError]                     = useState('')

  useEffect(() => { loadSubscription() }, [userId])

  const loadSubscription = async () => {
    setLoading(true)
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single()
    setSubscription(data)
    setLoading(false)
  }

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack()
    } else {
      window.location.href = '/'
    }
  }

  const openPortal = async () => {
    setPortalLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: userId }),
      })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else setError('Could not open billing portal. ' + (json.error || ''))
    } catch(e) { setError('Something went wrong: ' + e.message) }
    setPortalLoading(false)
  }

  const startCheckout = async (plan) => {
    setCheckoutLoading(plan.id); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          price_id:    plan.priceId,
          user_id:     userId,
          user_email:  userEmail,
          success_url: `${window.location.origin}/?billing=success`,
          cancel_url:  `${window.location.origin}/?billing=cancelled`,
        }),
      })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else setError('Could not start checkout. ' + (json.error || ''))
    } catch(e) { setError('Something went wrong: ' + e.message) }
    setCheckoutLoading(null)
  }

  const currentPlan = PLANS.find(p => p.id === subscription?.plan)
  const isActive    = subscription?.status === 'active'
  const isPastDue   = subscription?.status === 'past_due'
  const isCancelled = subscription?.status === 'cancelled'

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#060d1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#60a5fa', fontSize:14 }}>Loading billing info...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#060d1a', fontFamily:"'Segoe UI',system-ui,sans-serif", padding:'32px 16px' }}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>

        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
          <button onClick={handleBack} style={{ background:'rgba(255,255,255,.06)', border:'1.5px solid #1e3a5f', color:'#93c5fd', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            &larr; Back
          </button>
          <div>
            <div style={{ fontSize:24, fontWeight:800, color:'#e2e8f0' }}>Billing &amp; Plan</div>
            <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>Manage your subscription, upgrade, or cancel anytime</div>
          </div>
        </div>

        {subscription && (
          <div style={{ background:'#0d1f3c', border:'1px solid #1a3560', borderRadius:14, padding:'24px 28px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#2a4a6a', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Current Plan</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800, color: currentPlan?.color || '#e2e8f0', marginBottom:4 }}>
                  {currentPlan?.label || subscription.plan} &mdash; {currentPlan?.price}/mo
                </div>
                <div style={{ fontSize:13, color:'#64748b' }}>{subscription.max_clients} {subscription.max_clients === 1 ? 'business' : 'businesses'} &middot; {userEmail}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                {isActive    && <span style={{ background:'#10b98118', color:'#10b981', border:'1px solid #10b98144', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>Active</span>}
                {isPastDue   && <span style={{ background:'#f59e0b18', color:'#f59e0b', border:'1px solid #f59e0b44', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>Payment Due</span>}
                {isCancelled && <span style={{ background:'#ef444418', color:'#ef4444', border:'1px solid #ef444444', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>Cancelled</span>}
                {subscription.stripe_customer_id && (
                  <button onClick={openPortal} disabled={portalLoading} style={{ padding:'8px 18px', borderRadius:8, border:'1.5px solid #1a3560', background:'rgba(255,255,255,.05)', color:'#93c5fd', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                    {portalLoading ? 'Opening...' : 'Manage / Cancel'}
                  </button>
                )}
              </div>
            </div>
            {isPastDue  && <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, fontSize:13, color:'#fbbf24' }}>Your last payment failed. Click Manage / Cancel to update your payment method.</div>}
            {isCancelled && <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, fontSize:13, color:'#f87171' }}>Your subscription has been cancelled. Reactivate below by selecting a plan.</div>}
          </div>
        )}

        <div style={{ background:'#0d1f3c', border:'1px solid #1a3560', borderRadius:14, padding:'24px 28px', marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#2a4a6a', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:16 }}>{subscription ? 'Change Plan' : 'Choose a Plan'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))', gap:14 }}>
            {PLANS.map(plan => {
              const isCurrent = subscription?.plan === plan.id && isActive
              const isLoading = checkoutLoading === plan.id
              return (
                <div key={plan.id} onClick={() => !isCurrent && startCheckout(plan)} style={{ background: isCurrent ? `${plan.color}12` : 'rgba(255,255,255,.03)', border:`2px solid ${isCurrent ? plan.color : '#1a3560'}`, borderRadius:12, padding:'20px 18px', cursor: isCurrent ? 'default' : 'pointer', transition:'.15s', position:'relative' }}>
                  {isCurrent && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#fff', fontSize:10, fontWeight:800, padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap' }}>CURRENT PLAN</div>}
                  <div style={{ fontSize:16, fontWeight:800, color:plan.color, marginBottom:4 }}>{plan.label}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#e2e8f0', marginBottom:2 }}>{plan.price}<span style={{ fontSize:12, fontWeight:400, color:'#64748b' }}>/mo</span></div>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:12 }}>{plan.clients} {plan.clients===1?'business':'businesses'}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:4 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ fontSize:11.5, color:'#4a6080', display:'flex', gap:6 }}>
                        <span style={{ color:plan.color }}>&#10003;</span>{f}
                      </div>
                    ))}
                  </div>
                  <button onClick={e => { e.stopPropagation(); !isCurrent && startCheckout(plan) }} disabled={isCurrent||isLoading} style={{ width:'100%', marginTop:14, padding:'10px', borderRadius:8, border:'none', background: isCurrent||isLoading ? '#1a3560' : plan.color, color: isCurrent||isLoading ? '#2a4a6a' : '#fff', fontWeight:700, fontSize:13, cursor: isCurrent ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Redirecting...' : isCurrent ? 'Current Plan' : subscription ? 'Switch Plan' : 'Get Started'}
                  </button>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:16, fontSize:12, color:'#2a4a6a', textAlign:'center' }}>30-day money-back guarantee &middot; Cancel anytime &middot; Secure payment via Stripe</div>
        </div>

        {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#f87171' }}>{error}</div>}
      </div>
    </div>
  )
}
