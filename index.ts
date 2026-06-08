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

const PLAN_MAP: Record<string, { plan: string; max_clients: number }> = {
  'price_1TdJajLQRnOj0qLPQmbNz2kN': { plan: 'solopreneur', max_clients: 1 },
  'price_1TdJbkLQRnOj0qLPJPfsQsJI': { plan: 'deluxe',      max_clients: 3 },
  'price_1TdJczLQRnOj0qLPa7nat9Hi': { plan: 'pro',         max_clients: 5 },
  'price_1TdJdnLQRnOj0qLPv56ml87r': { plan: 'agency',      max_clients: 25 },
}

function generateActivationKey(plan: string): string {
  const prefix = {
    solopreneur: 'RFA-SOLO',
    deluxe:      'RFA-DLX',
    pro:         'RFA-PRO',
    agency:      'RFA-AGN',
  }[plan] ?? 'RFA-PLAN'
  const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${rand()}-${rand()}`
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  try {
    // ── New checkout completed (website purchase) ──────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const priceId = session.metadata?.price_id ?? ''
      const email   = session.customer_details?.email ?? session.metadata?.email ?? ''
      const planInfo = PLAN_MAP[priceId]

      if (!planInfo) {
        console.error('Unknown price ID:', priceId)
        return new Response('Unknown price', { status: 400 })
      }

      const key = generateActivationKey(planInfo.plan)

      // Save key to activation_keys table
      await supabase.from('activation_keys').insert({
        key,
        plan:        planInfo.plan,
        max_clients: planInfo.max_clients,
        used:        false,
        created_for: email,
        stripe_session_id:      session.id,
        stripe_customer_id:     session.customer as string,
        stripe_subscription_id: session.subscription as string,
      })

      // If user already exists in auth, update their subscription too
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === email)
      if (existingUser) {
        await supabase.from('subscriptions').upsert({
          user_id:                existingUser.id,
          plan:                   planInfo.plan,
          max_clients:            planInfo.max_clients,
          stripe_customer_id:     session.customer as string,
          stripe_subscription_id: session.subscription as string,
          stripe_price_id:        priceId,
          subscription_status:    'active',
        }, { onConflict: 'user_id' })
      }

      // Send activation key email via Supabase (or log for now)
      console.log(`Activation key for ${email}: ${key}`)
      // TODO: wire up Brevo email here once SMTP is configured
    }

    // ── In-app upgrade / downgrade ─────────────────────────────────────
    if (event.type === 'customer.subscription.updated') {
      const sub     = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id ?? ''
      const planInfo = PLAN_MAP[priceId]
      if (!planInfo) return new Response('OK', { status: 200 })

      await supabase.from('subscriptions')
        .update({
          plan:                planInfo.plan,
          max_clients:         planInfo.max_clients,
          stripe_price_id:     priceId,
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
        })
        .eq('stripe_customer_id', sub.customer as string)
    }

    // ── Cancellation ───────────────────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions')
        .update({ subscription_status: 'cancelled' })
        .eq('stripe_customer_id', sub.customer as string)
    }

    // ── Payment failed ─────────────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      await supabase.from('subscriptions')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', invoice.customer as string)
    }

  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
