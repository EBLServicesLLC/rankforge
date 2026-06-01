import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { price_id, user_id, user_email, success_url, cancel_url } = await req.json()
    const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user_id).single()
    let customerId = sub?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user_email, metadata: { supabase_user_id: user_id } })
      customerId = customer.id
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: success_url + '&session_id={CHECKOUT_SESSION_ID}',
      cancel_url,
      metadata: { user_id, price_id },
      subscription_data: { metadata: { user_id, price_id } },
      allow_promotion_codes: true,
    })
    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
