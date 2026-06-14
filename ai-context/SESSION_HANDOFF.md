# RankForged AI - Session Handoff
**Date:** 2026-06-14 (Session 23 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo:** https://github.com/EBLServicesLLC/rankforgedai
**Live:** https://app.rankforgedai.com (NEW) | https://rankforgedai-5ipq.vercel.app (still works)
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
### #9 - rankforge3.html icon boxes are a KNOWN ISSUE - separate task, do not touch CSS
### #10 - 406 errors on client_data were MetaMask extension interference - NOT app bugs
### #11 - npm run build locally before every git push - saves Vercel deploy failures
### #12 - Supabase CLI login: use `supabase login --no-browser` when `supabase login` fails
### #13 - Edge function TypeScript type annotations (k: string) crash Deno - use plain JS
### #14 - Hardcoded anon keys go stale - always use supabase.auth.getSession() token instead
### #15 - useClients was missing .eq('user_id', userId) - was loading ALL users' clients
### #16 - Supabase CLI secrets often fail - add secrets via Dashboard → Edge Functions → Manage secrets instead
### #17 - LinkedIn redirect URI must be /social/callback NOT /auth/linkedin/callback
### #18 - Stripe coupons: NEVER select "Applies to" field - leave blank for all products
### #19 - Stripe promotion codes are separate from coupons - both must exist for checkout to work
### #20 - Owner keys (RFA-OWNER-) never get marked used - safe to reuse across accounts
### #21 - VoiceSearchPage was querying client_data by .eq('id') not .eq('client_id') - always use client_id
### #22 - PowerShell uses ; not && as command separator
### #23 - Facebook page tokens are never-expiring when obtained via long-lived user token exchange - already implemented in social-auth-facebook
### #24 - LinkedIn URN is fetched live from /userinfo on every publish - no need to store it

## COMPLETED SESSION 23

### Voice Search & FAQ Page
- Added bizName state and fetches biz_name from client_data
- Fixed query: was using .eq('id') - changed to .eq('client_id')
- Business name displays as read-only green field in Business Details card
- biz_name passed to all 3 edge functions (generate, answers, snippet)
- voice-search-answers prompt updated to mention business by name in every answer
- voice-search-answers edge function deployed

### BillingPage.jsx
- Agency plan price updated from $997 to $1,997
- Stripe coupons tested and working (leave "Applies to" blank)

### Social Publisher
- LinkedIn publishing tested and confirmed working end to end
- Facebook long-lived token exchange already implemented in social-auth-facebook
- Facebook tokens: just reconnect to refresh (Disconnect → Connect)
- LinkedIn URN fetched live - no storage needed
- Instagram and Twitter deferred (Twitter costs $100/mo API)

### DNS & Domain Setup
- app.rankforgedai.com → pointed to Vercel (CNAME: vercel-dns.com) ✅
- send.rankforgedai.com → MX + TXT + SPF records added ✅
- All DNS records verified in Resend ✅
- app.rankforgedai.com added to Vercel project (moved from old rankforgedai project)
- Propagation in progress - check app.rankforgedai.com in browser

## PENDING - NEXT SESSION START
1. Confirm app.rankforgedai.com loads correctly in browser
2. Check Resend → send.rankforgedai.com → all green?
   - If yes → update FROM_EMAIL secret in Supabase vault to use send.rankforgedai.com
   - This unblocks 17 failing weekly report emails
3. Update any hardcoded URLs in app from rankforgedai-5ipq.vercel.app to app.rankforgedai.com

## PENDING - BACKLOG
- rankforgedai.com marketing website (feature highlights, pricing, CTAs) - big project
- BrightLocal account (~$29-79/mo) - post-launch decision
- Real signup end-to-end test (Stripe + onboarding + rankforge3 business profile pre-fill)
- Instagram publishing (medium difficulty, reuses Facebook app credentials)
- rankforge3.html icon boxes - KNOWN ISSUE, separate task, do not touch CSS

## DOMAIN STRUCTURE
- rankforgedai.com — marketing website (needs to be built)
- app.rankforgedai.com — SaaS app (Vercel, LIVE)
- send.rankforgedai.com — Resend email sending (DNS verified)
- rankforgedai-5ipq.vercel.app — still works as fallback

## STRIPE STATUS
- Coupons: working (leave "Applies to" blank, add promo code on top)
- Agency plan: $1,997 updated in both Stripe and BillingPage.jsx
- Live mode: NOT YET TESTED - test with real signup

## RESEND / EMAIL STATUS
- DKIM: Verified ✅
- MX: Added to send.rankforgedai.com ✅
- SPF TXT: Added to send.rankforgedai.com ✅
- FROM_EMAIL secret: needs updating in Supabase vault once verified green
- 17 weekly report emails blocked until FROM_EMAIL updated

## KNOWN ISSUES
- rankforge3.html icon boxes - SEPARATE TASK, do not touch CSS or icon tags
- Score grades random for directories/backlinks/web2 until BrightLocal connected
- Facebook token: reconnect manually to refresh (long-lived exchange now in place for future)

## DESIGN SYSTEM
pageBg:#060d1a cardBg:#0d1f3c border:#0f2040 border2:#1a3560
text:#e2e8f0 muted:#4a6080 accent:#3b82f6 green:#10b981 red:#f87171

## MODEL STRING
claude-sonnet-4-6

## EDGE FUNCTIONS ACTIVE
stripe-checkout, stripe-webhook, stripe-portal, vault-keys,
social-auth-facebook, social-auth-linkedin, social-publish,
local-links-generate, local-links-email, voice-search-generate,
voice-search-answers, voice-search-snippet, schema-monitor,
landing-page-generate, gsc-data, review-message-generate,
review-response-generate, gbp-qa-generate, meta-tag-generate,
kw-gap-analyse, send-email, weekly-report-send, seo-audit

## SUPABASE TABLES
client_data, local_seo_tasks, reputation_reviews, w2_status,
score_history, bl_status, social_proof, indexing_checks,
agent_states, agent_results, content_calendar
settings (has report_day, pagespeed_key, linkedin_urn columns)

## client_data COLUMNS (confirmed)
id (serial), client_id (uuid), user_id, biz_name, biz_cat, biz_addr,
biz_city, biz_state, biz_zip, biz_phone, biz_website, biz_desc, biz_kw,
dir_status, bl_status, w2_status, checklist, gbp_posts, review_requests,
service_cities, locations, kw_matrix, lp_pages, rep_reviews,
score_history, gmb_insights, publish_queue, sp_data, created_at, updated_at

## JSX TABS
dash, bl, keys, index, social-proof, social-pub, locallinks, voice,
schema-mon, pages, local, rank-tracker, meta, gbpqa, napaudit,
kwgap, reputation, web2, pdfreport, agents, calendar, gsc, dir, mloc

## LINKEDIN OAUTH DETAILS
- App: RankForged AI (linked to RankedForged AI company page)
- Redirect URI: https://rankforgedai-5ipq.vercel.app/social/callback
- Scopes: openid, profile, w_member_social
- Secrets: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET (in Supabase vault)
- Token stored in: settings.linkedin_token
- URN fetched live on every publish from /userinfo - no storage needed

## NEXT SESSION START CHECKLIST
1. Upload current files from disk before patching
2. Check app.rankforgedai.com loads in browser
3. Check Resend DNS all green → update FROM_EMAIL in Supabase vault
4. Update LinkedIn redirect URI to app.rankforgedai.com/social/callback
5. Consider updating any hardcoded Vercel URLs in the codebase
