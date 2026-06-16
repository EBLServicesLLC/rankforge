# RankForged AI - Session Handoff
**Date:** 2026-06-16 (Session 29 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo (app):** https://github.com/EBLServicesLLC/rankforge
**Repo (marketing):** https://github.com/EBLServicesLLC/rankforgedai-marketing
**Live app:** https://app.rankforgedai.com
**Live marketing:** https://rankforgedai.com
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST

### All previous lessons still apply, plus:
### #39 - All repos are now under EBLServicesLLC GitHub account — do not use EBLServies account for anything
### #40 - Marketing site local folder is C:\Users\Darno\RankForged AI Website (separate from app)
### #41 - Marketing site push command: git push origin HEAD:main (branch is master locally, main on remote)
### #42 - vercel.json routes must be updated for every new HTML page added to marketing site
### #43 - Vercel auto-deploy is connected for BOTH repos — git push triggers deploy automatically
### #44 - NEVER generate large HTML files (rankforge3.html) via Claude file tools — always make surgical edits in VS Code or via targeted Python str_replace on the original file. Previous attempts corrupted JS strings and broke rendering.
### #45 - When making changes to rankforge3.html, always verify the file in a real browser before deploying — the Claude artifact preview cannot handle files this large and will show broken rendering even when the file is fine.
### #46 - LandingPageBuilder.jsx was overwritten with ContentCalendarPage code at some point — the real landing page builder no longer exists and must be rebuilt from scratch next session.
### #47 - Do not ask the user to find/replace text in minified JS — it never works. Always make file changes programmatically and deliver the complete fixed file.

## COMPLETED SESSION 29

### Calendar / Landing Pages Fix
- Landing Pages nav was showing Content Calendar (wrong component in LandingPageBuilder.jsx)
- Removed "Landing Pages" from nav entirely in DashboardShell.jsx ✅
- Calendar tab now works correctly ✅
- LandingPageBuilder.jsx confirmed to contain ContentCalendarPage code — original LP builder is gone

### SearchConsolePage Fix
- Was sending anon key as Bearer token — edge function needs user session JWT
- Fixed SearchConsolePage.jsx to use session.access_token ✅
- Fixed to fetch site_url from client_data.biz_website via supabase client ✅
- Fixed date range mapping (7d/28d/90d → last7days/last28days/last90days) ✅
- Fixed useCallback deps ✅

### Search Console Root Cause Identified
- gsc-data edge function is deployed and active (version 10, last deployed 2026-06-07)
- Edge function looks for settings.google_key for the authenticated user
- google_key column exists in settings table
- Only 7 of 17 users have google_key populated
- Test users do not have google_key set — this is why it shows "Unauthorized"
- Root fix needed: build proper Google OAuth flow so users can connect GSC from within the app

### Supabase Functions Structure
- supabase/functions/gsc-data/ — GSC data fetcher ✅ ACTIVE
- supabase/functions/vault-keys/ — API key vault ✅ ACTIVE
- Two gsc-data folders existed locally — second (duplicate) deleted

## PENDING - NEXT SESSION (PRIORITY ORDER)
1. **Build Google OAuth flow** for Search Console connection
   - Users need to connect their Google account from within the app
   - Should save access_token + refresh_token to settings.google_key + settings.gsc_refresh_token
   - gsc-data edge function already handles token refresh if gsc_refresh_token exists
   - Temporary workaround: manually paste ya29. token into settings.google_key in Supabase dashboard
2. **Rebuild Landing Page Builder** (LandingPageBuilder.jsx was overwritten)
   - Generate local landing pages per service+city combination
   - Was working before — got overwritten in a previous session
3. **Stripe live mode testing**
4. **Real signup end-to-end test** (Stripe + onboarding + business profile pre-fill)
5. hello@rankforgedai.com email forwarding — set up in DreamHost (owner task)

## PENDING - BACKLOG
- Real customer testimonials to replace placeholder names/quotes on marketing site
- Screenshots of app dashboard for "How it works" section on marketing site
- About/Contact page on marketing site
- BrightLocal account (~$29-79/mo) - post-launch decision
- Instagram publishing (medium difficulty, reuses Facebook app credentials)
- rankforge3.html icon boxes - KNOWN ISSUE, separate task, do not touch CSS
- Clean up accidentally committed marketing files from app repo:
  ```
  git rm --cached rankforgedai-marketing
  git rm --cached "RankForged AI Website/index.html"
  git rm --cached "RankForged AI Website/privacy-policy.html"
  git rm --cached "RankForged AI Website/terms-of-servicel.html"
  git rm --cached "RankForged AI Website/vercel.json"
  git commit -m "cleanup: remove accidentally committed marketing files"
  git push
  ```

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

## SUPABASE FUNCTIONS (ACTIVE)
- gsc-data — Google Search Console data fetcher
- vault-keys — API key storage via Supabase Vault
- stripe-webhook, stripe-checkout, stripe-portal — Stripe billing
- social-auth-facebook, social-auth-linkedin, social-publish — Social media
- local-links-generate, local-links-email — Local links
- voice-search-generate, voice-search-answers, voice-search-snippet — Voice search
- schema-monitor — Schema monitoring
- landing-page-generate — Landing page AI generation
- review-message-generate, review-response-generate — Reviews
- meta-tag-generate — Meta tags
- gbp-qa-generate — GBP Q&A
- kw-gap-analyse — Keyword gap
- send-email — Email delivery
- weekly-report-send — Weekly reports
- seo-audit — SEO audit

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
