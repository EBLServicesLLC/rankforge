import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getPlanFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    // Live price IDs
    'price_1TdJajLQRnOj0qLPQmbNz2kN': 'solopreneur',
    'price_1TdJbkLQRnOj0qLPJPfsQsJI': 'deluxe',
    'price_1TdJczLQRnOj0qLPa7nat9Hi': 'pro',
    'price_1TdJdnLQRnOj0qLPv56ml87r': 'agency',
    // Test price IDs
    'price_1TegQ5LQRnOj0qLPTa30h9aV': 'solopreneur',
    'price_1TegQLLQRnOj0qLPVIkeOkH5': 'deluxe',
    'price_1TegQbLQRnOj0qLPiEPGi74n': 'pro',
    'price_1TegQwLQRnOj0qLPDTeqAOTV': 'agency',
  }
  return map[priceId] || 'unknown'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { price_id, user_id, user_email, success_url, cancel_url } = await req.json()

    const plan = getPlanFromPriceId(price_id)

    let customerId
    if (user_email) {
      try {
        const existing = await stripe.customers.list({ email: user_email, limit: 1 })
        if (existing.data.length > 0) customerId = existing.data[0].id
      } catch(e) {}
    }

    if (!customerId && user_email) {
      const customer = await stripe.customers.create({
        email: user_email,
        metadata: { supabase_user_id: user_id || '' }
      })
      customerId = customer.id
    }

    const sessionParams: any = {
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: (success_url || 'https://app.rankforgedai.com/?activated=1') + '&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancel_url || 'https://app.rankforgedai.com/',
      allow_promotion_codes: true,
      metadata: {
        user_id: user_id || '',
        price_id,
        plan,
      },
    }

    if (customerId) sessionParams.customer = customerId

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('stripe-checkout error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

