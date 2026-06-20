# RankForged AI - Session Handoff
**Date:** 2026-06-20 (Session 33 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo (app):** https://github.com/EBLServicesLLC/rankforge
**Repo (marketing):** https://github.com/EBLServicesLLC/rankforgedai-marketing
**Live app:** https://app.rankforgedai.com
**Live marketing:** https://rankforgedai.com
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST
### All previous lessons still apply, plus:
### #63 - stripe-webhook MUST be deployed with --no-verify-jwt flag. Stripe does not send a JWT auth header. Without this flag the function returns 401 and no subscriptions or activation keys are created. Command: `supabase functions deploy stripe-webhook --project-ref ybhpbpahhywiokhqpldj --no-verify-jwt`
### #64 - After deleting test users from auth.users, Stripe may retry old webhook events for those deleted users. The webhook will return 200 OK but subscription inserts will fail silently due to FK constraint on user_id. This is harmless — only affects deleted test users, not new real users.
### #65 - Resend blocks emails to non-verified addresses unless FROM_EMAIL is set to a verified domain. Set secret: `supabase secrets set FROM_EMAIL="RankForged AI <noreply@send.rankforgedai.com>" --project-ref ybhpbpahhywiokhqpldj`
### #66 - App.jsx must poll for subscription after Stripe redirect. Webhook fires async — if app checks subscription immediately on /?billing=success it finds null and shows BillingPage again. Fix: poll every 2 seconds until subscription appears, show green spinner meanwhile.
### #67 - Stripe coupon codes cannot be reused once expired/deleted. Always create new coupon with a different code name.
### #68 - stripe-checkout edge function still uses old `serve()` pattern from std@0.168.0. Should be updated to `Deno.serve()` to match stripe-webhook. Not yet done — do this next session.

## COMPLETED SESSION 33
- **Fixed ApiKeysPage** — added error logging, confirmed keys now display correctly after maybeSingle fix. ✅
- **Fixed DashboardShell** — two .single() calls → .maybeSingle() (settings + client_data queries in iframe loader). ✅
- **Fixed BillingPage** — added `plan: plan.id` to Stripe checkout body so metadata is complete. ✅
- **Fixed stripe-checkout edge function** — updated price ID map to match BillingPage price IDs (old map had completely different IDs, causing plan to always return 'unknown'). ✅
- **Fixed stripe-webhook** — removed old `serve()` import, now uses `Deno.serve()`. Redeployed with `--no-verify-jwt`. 401 errors resolved. ✅
- **Fixed App.jsx** — added polling logic after /?billing=success. Shows green spinner, polls every 2s until subscription exists, then routes to OnboardingWizard. ✅
- **Fixed OnboardingWizard** — removed Testing hint block, restored "Don't have a key? Sign out & purchase a plan" link pointing to rankforgedai.com/#pricing. ✅
- **Fixed FROM_EMAIL** — set Supabase secret to noreply@send.rankforgedai.com (verified domain). ✅
- **Cleared all test users** — full FK-safe delete across all dependent tables. Owner account (mike@eblservicesllc.com / 4521e942-dd3f-4cde-94fa-fe103fe0f498) preserved. ✅
- **Confirmed webhook working** — activation keys created correctly with proper plan names for all recent purchases. ✅

## CURRENT STATE
- Webhook: WORKING ✅ (200 OK, correct metadata, keys created)
- Subscription insert: WORKING ✅ (confirmed for new users)
- Activation key creation: WORKING ✅
- Email delivery: NOT YET CONFIRMED ⚠️ (FROM_EMAIL fixed but no successful delivery test completed)
- Fresh end-to-end test: NOT COMPLETED ⚠️ (ran out of test emails this session)
- Stripe coupon: NEEDS RECREATION ⚠️ (old coupon expired 5/5 redemptions, cannot reuse name)

## IMMEDIATE NEXT SESSION TASKS (in order)
1. **Create new Stripe coupon** — Stripe Dashboard → Products → Coupons → Create new with different code name
2. **Fresh end-to-end test** — new email, sign up, pay, confirm spinner → OnboardingWizard → activation email arrives
3. **If email still not arriving** — check Supabase → Edge Functions → send-email → Logs for errors
4. **Fix stripe-checkout** — update from `serve()` to `Deno.serve()` pattern (low priority, working despite old pattern)
5. **Go live** — owner confirmed flow is ready pending email confirmation

## OWNER ACCOUNT
- Email: mike@eblservicesllc.com
- user_id: 4521e942-dd3f-4cde-94fa-fe103fe0f498
- Plan: agency, max_clients: 999, onboarding_completed: true

## KEY FILE CHANGES THIS SESSION
- `src/App.jsx` — polling logic added for billing=success
- `src/components/ApiKeysPage.jsx` — error logging added
- `src/components/DashboardShell.jsx` — .single() → .maybeSingle() in iframe loader
- `src/components/BillingPage.jsx` — plan added to checkout body
- `src/components/OnboardingWizard.jsx` — testing hint removed, purchase link restored
- `supabase/functions/stripe-webhook/index.ts` — serve() → Deno.serve(), deployed --no-verify-jwt
- `supabase/functions/stripe-checkout/index.ts` — price ID map updated

## GIT COMMITS THIS SESSION
- `9fa0ed6` — fix: ApiKeysPage error logging + single() to maybeSingle() in DashboardShell
- App.jsx, BillingPage.jsx, OnboardingWizard.jsx pushed (check git log for exact hashes)

## DOMAIN STRUCTURE
- rankforgedai.com — marketing website ✅ LIVE
- app.rankforgedai.com — SaaS app ✅ LIVE
- send.rankforgedai.com — Resend email sending ✅ VERIFIED

## SUPABASE TABLE: subscriptions columns
id, user_id (NOT NULL), plan (NOT NULL, default 'solopreneur'), max_clients (NOT NULL, default 1),
seo_types, status (NOT NULL, default 'active'), activation_key, stripe_customer_id,
stripe_subscription_id, onboarding_completed (default false), onboarding_step (default 0),
created_at, updated_at, stripe_price_id, subscription_status

## SUPABASE TABLE: activation_keys columns
id, key, plan, max_clients, used, used_by, used_at, created_at, created_for,
stripe_session_id, stripe_customer_id, stripe_subscription_id

## FK DEPENDENCY ORDER FOR USER DELETION
auth.identities, auth.sessions, auth.mfa_factors, auth.one_time_tokens,
auth.flow_state, auth.oauth_authorizations, auth.oauth_consents,
auth.webauthn_credentials, auth.webauthn_challenges,
auth.refresh_tokens (user_id is varchar — cast: user_id::text != 'uuid'),
local_seo_tasks, reputation_reviews, w2_status, score_history, bl_status,
social_proof, indexing_checks, agent_states, agent_results, content_calendar,
subscriptions, activation_keys (used_by), client_data, clients, settings,
auth.users (LAST)

## DEPLOY PROCESS (APP)
```
cd C:\Users\Darno\RankForgedAI
git add .
git commit -m "description"
git push
```

## DEPLOY PROCESS (MARKETING)
```
cd "C:\Users\Darno\RankForged AI Website"
git add .
git commit -m "description"
git push origin HEAD:main
```

## SUPABASE CLI AUTH
```
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
supabase secrets set KEY=value --project-ref ybhpbpahhywiokhqpldj
supabase functions deploy function-name --project-ref ybhpbpahhywiokhqpldj
supabase functions deploy stripe-webhook --project-ref ybhpbpahhywiokhqpldj --no-verify-jwt
```

## STRIPE PRICE IDs (LIVE)
- solopreneur: price_1TiIOkLQRnOj0qLPr4geBfjT ($97/mo, 1 client)
- deluxe: price_1TiIO1LQRnOj0qLPK15fSOJl ($197/mo, 3 clients)
- pro: price_1TiINALQRnOj0qLPKp2SRdE4 ($397/mo, 5 clients)
- agency: price_1TiHmnLQRnOj0qLPBlctvhrt ($1,997/mo, 25 clients)

## DESIGN SYSTEM
pageBg:#060d1a cardBg:#0d1f3c border:#0f2040 border2:#1a3560
text:#e2e8f0 muted:#4a6080 accent:#3b82f6 green:#10b981 red:#f87171

## MODEL STRING
claude-sonnet-4-6

## TEST KEYS (still valid in DB)
RFA-OWNER-MASTER-0001 (agency, 999 clients, unused)
