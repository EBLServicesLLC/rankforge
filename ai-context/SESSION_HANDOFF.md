# RankForged AI - Session Handoff
**Date:** 2026-06-15 (Session 27 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo (app):** https://github.com/EBLServies/rankforge
**Repo (marketing):** https://github.com/EBLServies/rankforgedai-marketing
**Live app:** https://rankforgedai.vercel.app
**Live app (new):** https://app.rankforgedai.com (DNS propagating — use vercel URL for now)
**Live marketing:** https://rankforgedai.com
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST

### All previous lessons from Session 26 still apply, plus:
### #33 - sessionStorage must be set in DashboardShell BEFORE setIframeSrc — rankforge3 reads credentials from sessionStorage on load
### #34 - LinkedIn OAuth redirect URI is dynamic (window.location.origin) — must be on the correct domain when connecting
### #35 - Supabase Vault UI updates do NOT take effect until edge function is redeployed via CLI
### #36 - supabase secrets set via CLI requires a valid sbp_ access token from dashboard.supabase.com/account/tokens — not the CLI login token
### #37 - app.rankforgedai.com DNS: CNAME set in DreamHost pointing to cname.vercel-dns.com — still propagating as of session end
### #38 - Old LinkedIn app was deleted — new app created with client ID 78e28y151epvi7

## COMPLETED SESSION 27

### app.rankforgedai.com DNS
- Removed app.rankforgedai.com from DreamHost VPS hosting
- Set to DNS Only in DreamHost
- Added CNAME: app → cname.vercel-dns.com in DreamHost custom records
- Added app.rankforgedai.com to Vercel rankforgedai project
- DNS still propagating as of session end — use rankforgedai.vercel.app until resolved

### Marketing Site Links
- All 6 links updated from rankforgedai-5ipq.vercel.app → rankforgedai.vercel.app
- Pushed to GitHub, auto-deployed to rankforgedai.com ✅

### rankforge3 Supabase Loader — FIXED
- Root cause: DashboardShell was loading rankforge3 in iframe but never setting sessionStorage
- Fix: Added sessionStorage.setItem calls in DashboardShell.jsx before setIframeSrc()
- Business profile now loads correctly into Dashboard and Directories tab ✅
- View Profile edits sync correctly to rankforge3 ✅

### LinkedIn OAuth — FIXED
- Old LinkedIn app was missing/deleted
- Created new LinkedIn app: RankForged AI
- New Client ID: 78e28y151epvi7
- Updated LINKEDIN_CLIENT_ID in Supabase vault via CLI (sbp_ token required)
- Redeployed social-auth-linkedin edge function
- Added https://rankforgedai.vercel.app/social/callback to LinkedIn authorized redirect URIs
- LinkedIn OAuth working on rankforgedai.vercel.app ✅

## PENDING - NEXT SESSION START
1. Check app.rankforgedai.com DNS propagation (nslookup or python check)
2. Once DNS resolves — add https://app.rankforgedai.com/social/callback to LinkedIn Developer Portal
3. Connect GitHub repo to Vercel for auto-deploy (eliminate manual vercel --prod)
4. Delete old rankforgedai-5ipq Vercel project
5. Update marketing site links from rankforgedai.vercel.app → app.rankforgedai.com

## PENDING - BACKLOG
- Real customer testimonials to replace placeholder names/quotes on marketing site
- Screenshots of app dashboard for "How it works" section on marketing site
- Privacy Policy page (required for Stripe payments)
- Terms of Service page
- About/Contact page on marketing site
- FAQ section on marketing site
- BrightLocal account (~$29-79/mo) - post-launch decision
- Instagram publishing (medium difficulty, reuses Facebook app credentials)
- rankforge3.html icon boxes - KNOWN ISSUE, separate task, do not touch CSS
- Real signup end-to-end test (Stripe + onboarding + rankforge3 business profile pre-fill)
- Live Stripe mode testing

## DOMAIN STRUCTURE
- rankforgedai.com — marketing website ✅ LIVE
- www.rankforgedai.com — redirects to rankforgedai.com ✅
- app.rankforgedai.com — SaaS app (DNS propagating — CNAME set in DreamHost)
- send.rankforgedai.com — Resend email sending (DNS verified ✅)
- rankforgedai.vercel.app — app PRIMARY (use this until app.rankforgedai.com resolves)
- rankforgedai-5ipq.vercel.app — OLD fallback, can be deleted
- project-gd2vh.vercel.app — marketing site fallback

## GITHUB STRUCTURE
- EBLServies/rankforge — app code (main branch)
- EBLServies/rankforgedai-marketing — marketing site (main branch)
- NOTE: GitHub pushes do NOT auto-deploy app — must use `vercel --prod` manually
- Marketing site: GitHub push DOES auto-deploy via Vercel connection

## DEPLOY PROCESS (APP)
```
vercel --prod
```
From C:\Users\Darno\RankForgedAI — select Mike's projects, link to rankforgedai/rankforgedai, NO to overwrite .env.local

## SUPABASE CLI AUTH
```
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"  # from dashboard.supabase.com/account/tokens
supabase secrets set KEY=value --project-ref ybhpbpahhywiokhqpldj
supabase functions deploy function-name --project-ref ybhpbpahhywiokhqpldj
```

## LINKEDIN OAuth DETAILS
- App: RankForged AI (new app created Session 27)
- Client ID: 78e28y151epvi7
- Client Secret: in Supabase vault as LINKEDIN_CLIENT_SECRET
- Authorized Redirect URIs: https://rankforgedai.vercel.app/social/callback
- TODO: Add https://app.rankforgedai.com/social/callback once DNS resolves
- Scopes: openid, profile, w_member_social
- Token stored in: settings.linkedin_token
- URN fetched live on every publish from /userinfo

## STRIPE STATUS
- Products: ACTIVE ✅
- Price IDs: updated in AuthPage.jsx and BillingPage.jsx ✅
- Checkout: confirmed working for all 4 plans ✅
- Live mode: NOT YET TESTED (still in test mode)

## RESEND / EMAIL STATUS
- DKIM: Verified ✅
- MX + SPF: Verified ✅ on send.rankforgedai.com
- FROM_EMAIL: noreply@send.rankforgedai.com
- Email delivery: confirmed working ✅

## DESIGN SYSTEM
pageBg:#060d1a cardBg:#0d1f3c border:#0f2040 border2:#1a3560
text:#e2e8f0 muted:#4a6080 accent:#3b82f6 green:#10b981 red:#f87171

## MODEL STRING
claude-sonnet-4-6

## KEY FIX FROM SESSION 27 - DashboardShell.jsx
Lines added before setIframeSrc() in useEffect([activeId]):
```js
sessionStorage.setItem('rf_sb_url', import.meta.env.VITE_SUPABASE_URL)
sessionStorage.setItem('rf_sb_key', import.meta.env.VITE_SUPABASE_ANON_KEY)
sessionStorage.setItem('rf_user_id', session.user.id)
sessionStorage.setItem('rf_client', activeId)
```
