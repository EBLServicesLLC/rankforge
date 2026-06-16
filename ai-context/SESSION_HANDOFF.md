# RankForged AI - Session Handoff
**Date:** 2026-06-15 (Session 28 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo (app):** https://github.com/EBLServicesLLC/rankforge
**Repo (marketing):** https://github.com/EBLServicesLLC/rankforgedai-marketing
**Live app:** https://app.rankforgedai.com
**Live marketing:** https://rankforgedai.com
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST

### All previous lessons from Sessions 26-27 still apply, plus:
### #39 - All repos are now under EBLServicesLLC GitHub account — do not use EBLServies account for anything
### #40 - Marketing site local folder is C:\Users\Darno\RankForged AI Website (separate from app)
### #41 - Marketing site push command: git push origin HEAD:main (branch is master locally, main on remote)
### #42 - vercel.json routes must be updated for every new HTML page added to marketing site
### #43 - Vercel auto-deploy is connected for BOTH repos — git push triggers deploy automatically

## COMPLETED SESSION 28

### GitHub Consolidation
- Transferred EBLServies/rankforge → EBLServicesLLC/rankforge ✅
- Transferred EBLServies/rankforgedai-marketing → EBLServicesLLC/rankforgedai-marketing ✅
- All repos now under EBLServicesLLC (matches Vercel account mike@eblservicesllc.com)
- Updated local git remotes for both repos

### Vercel Auto-Deploy
- App (rankforgedai project): connected to EBLServicesLLC/rankforge ✅
- Marketing (project-gd2vh): connected to EBLServicesLLC/rankforgedai-marketing ✅
- No more manual vercel --prod needed — git push deploys both

### DNS
- app.rankforgedai.com fully propagated and live ✅
- CNAME pointing to cname.vercel-dns.com via DreamHost

### LinkedIn OAuth
- Added https://app.rankforgedai.com/social/callback to LinkedIn Developer Portal ✅
- Client ID: 78e28y151epvi7

### Marketing Site Updates
- Privacy Policy: rankforgedai.com/privacy-policy ✅
- Terms of Service: rankforgedai.com/terms-of-service ✅
- FAQ section added (15 questions, accordion style) ✅
- All links updated from rankforgedai.vercel.app → app.rankforgedai.com ✅
- Footer links for Privacy Policy and Terms of Service working ✅

## PENDING - NEXT SESSION START
1. hello@rankforgedai.com email forwarding — set up in DreamHost (owner task)
2. Stripe live mode testing
3. Real signup end-to-end test (Stripe + onboarding + rankforge3 business profile pre-fill)

## PENDING - BACKLOG
- Real customer testimonials to replace placeholder names/quotes on marketing site
- Screenshots of app dashboard for "How it works" section on marketing site
- About/Contact page on marketing site
- BrightLocal account (~$29-79/mo) - post-launch decision
- Instagram publishing (medium difficulty, reuses Facebook app credentials)
- rankforge3.html icon boxes - KNOWN ISSUE, separate task, do not touch CSS
- Live Stripe mode testing

## DOMAIN STRUCTURE
- rankforgedai.com — marketing website ✅ LIVE
- www.rankforgedai.com — redirects to rankforgedai.com ✅
- app.rankforgedai.com — SaaS app ✅ LIVE
- send.rankforgedai.com — Resend email sending (DNS verified ✅)
- rankforgedai.vercel.app — OLD fallback (still works but not used)

## GITHUB STRUCTURE
- EBLServicesLLC/rankforge — app code (main branch) → auto-deploys to rankforgedai project on Vercel
- EBLServicesLLC/rankforgedai-marketing — marketing site (main branch) → auto-deploys to project-gd2vh on Vercel
- EBLServicesLLC/rankforgedai — OLD repo, ignore
- NOTE: Local marketing branch is 'master', remote is 'main' — always use: git push origin HEAD:main

## LOCAL FOLDER STRUCTURE
- C:\Users\Darno\RankForgedAI — app code
- C:\Users\Darno\RankForged AI Website — marketing site

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
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"  # from dashboard.supabase.com/account/tokens
supabase secrets set KEY=value --project-ref ybhpbpahhywiokhqpldj
supabase functions deploy function-name --project-ref ybhpbpahhywiokhqpldj
```

## LINKEDIN OAuth DETAILS
- App: RankForged AI
- Client ID: 78e28y151epvi7
- Client Secret: in Supabase vault as LINKEDIN_CLIENT_SECRET
- Authorized Redirect URIs: https://rankforgedai.vercel.app/social/callback, https://app.rankforgedai.com/social/callback
- Scopes: openid, profile, w_member_social
- Token stored in: settings.linkedin_token

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
- hello@rankforgedai.com: PENDING setup in DreamHost (forwarding)

## DESIGN SYSTEM
pageBg:#060d1a cardBg:#0d1f3c border:#0f2040 border2:#1a3560
text:#e2e8f0 muted:#4a6080 accent:#3b82f6 green:#10b981 red:#f87171

## MODEL STRING
claude-sonnet-4-6

## VERCEL PROJECTS
- rankforgedai → app.rankforgedai.com → EBLServicesLLC/rankforge
- project-gd2vh → rankforgedai.com → EBLServicesLLC/rankforgedai-marketing

## MARKETING SITE ROUTES (vercel.json)
- /privacy-policy → privacy-policy.html ✅
- /terms-of-service → terms-of-service.html ✅
- /(.*) → index.html (catch-all)
