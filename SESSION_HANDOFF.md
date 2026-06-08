# RankForged AI - Session Handoff
**Date:** 2026-06-08 (Session 20 - Final)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo:** https://github.com/EBLServicesLLC/rankforgedai
**Live:** https://rankforgedai-5ipq.vercel.app
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST

### #1 - ALWAYS CHECK IMPORTS BEFORE ANYTHING ELSE
### #2 - 5-part render pattern required per JSX page
### #3 - Always upload current file from disk before patching
### #4 - No em-dashes in JSX strings - they crash Vite
### #5 - PowerShell is not a code editor - use here-strings
### #6 - Downloads from Claude do not save reliably - write directly with PowerShell
### #7 - Supabase edge functions must use Deno.serve() format NOT import { serve }
### #8 - Content calendar insert only uses base columns (user_id, client_id, post_date, platform, content, topic, status)

## COMPLETED SESSION 20

- ContentCalendarPage.jsx - fully working (equal columns, AI generate, repurpose, rewrite, modal with View/Edit/Rewrite tabs)
- Stripe payments - fully working (live mode, webhook registered, BillingPage wired)
- Resend email - deployed (welcome on signup, activation key after purchase)
- send-email edge function deployed using Deno.serve() format
- useWelcomeEmail hook at src/hooks/useWelcomeEmail.js
- AuthPage.jsx patched to call sendWelcomeEmail on signup
- stripe-webhook updated to send activation key email after purchase

## PENDING

- LinkedIn Developer App (user needs to create at linkedin.com/developers)
- BrightLocal API (user needs account ~$29/mo)
- Email custom domain in Resend (currently using onboarding@resend.dev)
- Weekly report emails (not built yet)

## RESEND SECRETS NEEDED IN SUPABASE VAULT
- RESEND_API_KEY = Resend API key
- FROM_EMAIL = RankForged AI <onboarding@resend.dev>

## DESIGN SYSTEM
pageBg:#060d1a cardBg:#0d1f3c border:#0f2040 border2:#1a3560
text:#e2e8f0 muted:#4a6080 accent:#3b82f6 green:#10b981 red:#f87171

## MODEL STRING
claude-sonnet-4-5

## EDGE FUNCTIONS ACTIVE
stripe-checkout, stripe-webhook, stripe-portal, vault-keys,
social-auth-facebook, social-auth-linkedin, social-publish,
local-links-generate, local-links-email, voice-search-generate,
voice-search-answers, voice-search-snippet, schema-monitor,
landing-page-generate, gsc-data, review-message-generate,
review-response-generate, gbp-qa-generate, meta-tag-generate,
kw-gap-analyse, send-email

## SUPABASE TABLES
client_data, local_seo_tasks, reputation_reviews, w2_status,
score_history, bl_status, social_proof, indexing_checks,
agent_states, agent_results, content_calendar

## JSX TABS
dash, bl, keys, index, social-proof, social-pub, locallinks, voice,
schema-mon, pages, local, rank-tracker, meta, gbpqa, napaudit,
kwgap, reputation, web2, pdfreport, agents, calendar, gsc, dir, mloc

## NEXT SESSION START
1. Upload current DashboardShell.jsx from disk
2. Run check_imports.cjs to verify all pages wired
3. Decide: LinkedIn OAuth callback, weekly report emails, or new features
