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
    'price_1TiIOkLQRnOj0qLPr4geBfjT': 'solopreneur',
    'price_1TiIO1LQRnOj0qLPK15fSOJl': 'deluxe',
    'price_1TiINALQRnOj0qLPKp2SRdE4': 'pro',
    'price_1TiHmnLQRnOj0qLPBlctvhrt': 'agency',
  }
  return map[priceId] || 'unknown'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { price_id, user_id, user_email, success_url, cancel_url, coupon_code } = await req.json()

    const plan = getPlanFromPriceId(price_id)

    // RANKFORGED50 is Solo plan only
    if (coupon_code && plan !== 'solopreneur') {
      return new Response(JSON.stringify({ error: 'This promotion code is only valid for the Solo plan.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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
      // Apply coupon programmatically (Solo only — validated above)
      ...(coupon_code ? { discounts: [{ promotion_code: 'promo_1TkWDZLQRnOj0qLPJl7KIHhw' }] } : { allow_promotion_codes: false }),
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


