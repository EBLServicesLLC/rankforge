// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const PLAN_CLIENTS: Record<string, number> = {
  solopreneur: 1,
  deluxe:      3,
  pro:         5,
  agency:      25,
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature header', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session  = event.data.object as Stripe.Checkout.Session
        const userId   = session.metadata?.user_id
        const plan     = session.metadata?.plan

        if (!userId || !plan) {
          console.error('Missing metadata in session:', session.id)
          break
        }

        const maxClients = PLAN_CLIENTS[plan] || 1

        // 1. Update or create subscription
        const { error: subError } = await adminClient
          .from('subscriptions')
          .upsert({
            user_id:                userId,
            plan,
            status:                 'active',
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: session.subscription as string,
            onboarding_completed:   false,
            max_clients:            maxClients,
          }, { onConflict: 'user_id' })
        if (subError) console.error('Subscription upsert error:', subError)

        // 2. Create activation key
        const newKey = `RFA-${plan.toUpperCase().slice(0,4)}-${Date.now().toString(36).toUpperCase()}`
        const { error: keyError } = await adminClient
          .from('activation_keys')
          .insert({
            key:         newKey,
            plan,
            max_clients: maxClients,
            created_for: userId,
          })
        if (keyError) console.error('Key creation error:', keyError)
        else console.log(`Activation key created: ${newKey} for user ${userId}`)

        // 3. Get user email for sending emails
        const { data: userData } = await adminClient.auth.admin.getUserById(userId)
        const userEmail = userData?.user?.email
        const userName  = userData?.user?.user_metadata?.name || userEmail?.split('@')[0] || 'there'

        if (userEmail) {
          // 4. Send activation key email
          try {
            const emailRes = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
              {
                method: 'POST',
                headers: {
                  'Content-Type':  'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  action:         'activation_key',
                  to:             userEmail,
                  name:           userName,
                  plan,
                  activation_key: newKey,
                  max_clients:    maxClients,
                }),
              }
            )
            const emailData = await emailRes.json()
            if (emailData.sent) console.log(`Activation key email sent to ${userEmail}`)
            else console.error('Email send failed:', emailData)
          } catch (emailErr) {
            console.error('Failed to send activation key email:', emailErr.message)
          }
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId   = subscription.customer as string
        const { error } = await adminClient
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_customer_id', customerId)
        if (error) console.error('Subscription cancel error:', error)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId   = subscription.customer as string
        const { error } = await adminClient
          .from('subscriptions')
          .update({ status: subscription.status })
          .eq('stripe_customer_id', customerId)
        if (error) console.error('Subscription update error:', error)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })

  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
