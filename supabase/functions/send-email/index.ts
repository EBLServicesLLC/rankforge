/**
 * supabase/functions/send-email/index.ts
 * Resend-powered email sender for RankForged AI
 *
 * Actions:
 *   welcome          — Sent on new user signup
 *   activation_key   — Sent after successful Stripe purchase
 *
 * Secrets required:
 *   RESEND_API_KEY   — From https://resend.com/api-keys
 *   FROM_EMAIL       — Verified sender e.g. noreply@yourdomain.com
 *                      (use onboarding@resend.dev for testing)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  try {
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM      = Deno.env.get('FROM_EMAIL') || 'RankForged AI <onboarding@resend.dev>'

    if (!RESEND_KEY) return err('RESEND_API_KEY secret not set. Add it in Supabase dashboard.', 503)

    const body = await req.json()
    const { action } = body

    // ── WELCOME EMAIL ────────────────────────────────────────────────────────
    if (action === 'welcome') {
      const { to, name } = body
      if (!to) return err('to is required', 400)

      const displayName = name || 'there'

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d1a;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d1f3c,#1a3560);border-radius:14px 14px 0 0;padding:32px 36px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#e2e8f0;letter-spacing:-0.5px;">
        Rank<span style="color:#3b82f6;">Forged</span> AI
      </div>
      <div style="font-size:13px;color:#4a6080;margin-top:6px;">Local SEO Platform</div>
    </div>

    <!-- Body -->
    <div style="background:#0d1f3c;padding:36px;border-left:1px solid #1a3560;border-right:1px solid #1a3560;">
      <h1 style="font-size:22px;font-weight:800;color:#e2e8f0;margin:0 0 16px;">
        Welcome, ${displayName}!
      </h1>
      <p style="font-size:15px;color:#94a3b8;line-height:1.7;margin:0 0 20px;">
        Your RankForged AI account is ready. You now have access to the full local SEO platform
        — from citation audits and rank tracking to AI-powered content and reputation management.
      </p>

      <div style="background:#080f1e;border:1px solid #0f2040;border-radius:10px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#4a6080;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;">
          Getting Started
        </div>
        ${[
          ['1', '#3b82f6', 'Add your first business in My Businesses'],
          ['2', '#10b981', 'Complete the onboarding wizard to set up your profile'],
          ['3', '#8b5cf6', 'Explore the 24 SEO tools in your dashboard'],
          ['4', '#f97316', 'Run the AI Agents to get your first insights'],
        ].map(([num, color, text]) => `
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;">
          <div style="width:22px;height:22px;border-radius:50%;background:${color}22;border:1px solid ${color}44;
            display:flex;align-items:center;justify-content:center;flex-shrink:0;
            font-size:11px;font-weight:800;color:${color};">${num}</div>
          <div style="font-size:13px;color:#c8d8f0;line-height:1.5;padding-top:3px;">${text}</div>
        </div>`).join('')}
      </div>

      <div style="text-align:center;">
        <a href="https://rankforgedai-5ipq.vercel.app"
          style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;
            font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;text-decoration:none;">
          Open RankForged AI
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#080f1e;border-radius:0 0 14px 14px;border:1px solid #0f2040;border-top:none;
      padding:20px 36px;text-align:center;">
      <div style="font-size:12px;color:#2a4a6a;line-height:1.6;">
        You received this because you signed up for RankForged AI.<br>
        <a href="https://rankforgedai-5ipq.vercel.app" style="color:#3b82f6;text-decoration:none;">rankforgedai.com</a>
      </div>
    </div>

  </div>
</body>
</html>`

      await sendEmail(RESEND_KEY, FROM, to, 'Welcome to RankForged AI', html)
      return ok({ sent: true, action: 'welcome', to })
    }

    // ── ACTIVATION KEY EMAIL ─────────────────────────────────────────────────
    if (action === 'activation_key') {
      const { to, name, plan, activation_key, max_clients } = body
      if (!to)             return err('to is required', 400)
      if (!activation_key) return err('activation_key is required', 400)
      if (!plan)           return err('plan is required', 400)

      const displayName  = name || 'there'
      const planLabel    = plan.charAt(0).toUpperCase() + plan.slice(1)
      const clientsLabel = max_clients === 1 ? '1 business' : `${max_clients} businesses`

      const planColors: Record<string, string> = {
        solopreneur: '#60a5fa',
        deluxe:      '#8b5cf6',
        pro:         '#22d3ee',
        agency:      '#10b981',
      }
      const planColor = planColors[plan] || '#3b82f6'

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060d1a;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d1f3c,#1a3560);border-radius:14px 14px 0 0;padding:32px 36px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#e2e8f0;letter-spacing:-0.5px;">
        Rank<span style="color:#3b82f6;">Forged</span> AI
      </div>
      <div style="font-size:13px;color:#4a6080;margin-top:6px;">Local SEO Platform</div>
    </div>

    <!-- Body -->
    <div style="background:#0d1f3c;padding:36px;border-left:1px solid #1a3560;border-right:1px solid #1a3560;">
      <h1 style="font-size:22px;font-weight:800;color:#e2e8f0;margin:0 0 8px;">
        Your ${planLabel} Plan is Active!
      </h1>
      <p style="font-size:15px;color:#94a3b8;line-height:1.7;margin:0 0 24px;">
        Hi ${displayName}, your subscription is confirmed. Here is your activation key
        and everything you need to get started.
      </p>

      <!-- Plan badge -->
      <div style="background:${planColor}11;border:1px solid ${planColor}44;border-radius:10px;
        padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:14px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:${planColor};text-transform:uppercase;letter-spacing:0.5px;">
            Active Plan
          </div>
          <div style="font-size:18px;font-weight:800;color:#e2e8f0;margin-top:2px;">
            ${planLabel} &mdash; ${clientsLabel}
          </div>
        </div>
      </div>

      <!-- Activation key box -->
      <div style="background:#080f1e;border:2px solid ${planColor}66;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:#4a6080;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
          Your Activation Key
        </div>
        <div style="font-size:22px;font-weight:900;color:${planColor};letter-spacing:2px;font-family:monospace;">
          ${activation_key}
        </div>
        <div style="font-size:11px;color:#4a6080;margin-top:8px;">
          Enter this key in the onboarding wizard to activate your account
        </div>
      </div>

      <div style="text-align:center;">
        <a href="https://rankforgedai-5ipq.vercel.app"
          style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;
            font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;text-decoration:none;">
          Go to Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#080f1e;border-radius:0 0 14px 14px;border:1px solid #0f2040;border-top:none;
      padding:20px 36px;text-align:center;">
      <div style="font-size:12px;color:#2a4a6a;line-height:1.6;">
        Questions? Reply to this email or visit our support docs.<br>
        <a href="https://rankforgedai-5ipq.vercel.app" style="color:#3b82f6;text-decoration:none;">rankforgedai.com</a>
      </div>
    </div>

  </div>
</body>
</html>`

      await sendEmail(RESEND_KEY, FROM, to, `Your RankForged AI ${planLabel} Plan is Active`, html)
      return ok({ sent: true, action: 'activation_key', to })
    }

    return err('Invalid action. Use welcome or activation_key.', 400)

  } catch (e) {
    console.error('[send-email] error:', e)
    return err(e.message || 'Internal server error', 500)
  }
})

async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error('Resend error: ' + (data.message || JSON.stringify(data)))
  }
  return res.json()
}

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function err(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
