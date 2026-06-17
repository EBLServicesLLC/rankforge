# RankForged AI - Session Handoff
**Date:** 2026-06-16 (Session 31 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo (app):** https://github.com/EBLServicesLLC/rankforge
**Repo (marketing):** https://github.com/EBLServicesLLC/rankforgedai-marketing
**Live app:** https://app.rankforgedai.com
**Live marketing:** https://rankforgedai.com
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST
### All previous lessons still apply, plus:
### #52 - gcs-data 401 was caused by supabase.auth.getUser() failing in edge function — fix is to decode JWT manually with atob() and use service role key for DB queries
### #53 - Supabase edge function "shutdown" logs = idle timeout NOT crash. Real crashes show ERROR. Don't redeploy looking for crash fixes when you see only "shutdown"
### #54 - esm.sh imports in edge functions must use versioned .mjs path: https://esm.sh/v135/@supabase/supabase-js@2.39.3/es2022/supabase-js.mjs — unversioned @2 and ?target=deno both pull Node shims that crash
### #55 - Cannot delete Supabase auth users from dashboard UI ("Database error deleting user") — must use SQL editor or service role API
### #56 - GSC Search Console integration abandoned this session — too many moving parts, deprioritized

## COMPLETED SESSION 31
- Fixed gcs-data edge function import crash (Node shim issue) ✅
- Fixed gcs-data 401 by replacing supabase.auth.getUser() with manual JWT decode ✅
- gcs-data now returns 500 only due to GSC permissions mismatch (code is correct) ✅
- Confirmed stub function works end-to-end ✅
- SearchConsolePage.jsx updated to use getSession() for fresh token ✅

## BLOCKED / ABANDONED THIS SESSION
- Google Search Console page — deprioritized, too complex
- Test user deletion — blocked by FK constraints, needs SQL fix

## PENDING - NEXT SESSION (PRIORITY ORDER)
1. **Delete test users from Supabase** — FK constraints block dashboard deletion
   - Run in SQL editor IN THIS ORDER:
   ```sql
   SELECT id, email FROM auth.users ORDER BY created_at;
   -- Then delete dependents first:
   DELETE FROM settings WHERE user_id IN (SELECT id FROM auth.users WHERE email != 'YOUR_REAL_EMAIL');
   DELETE FROM client_data WHERE user_id IN (SELECT id FROM auth.users WHERE email != 'YOUR_REAL_EMAIL');
   DELETE FROM activation_keys WHERE used_by IN (SELECT id FROM auth.users WHERE email != 'YOUR_REAL_EMAIL');
   DELETE FROM auth.users WHERE email != 'YOUR_REAL_EMAIL';
   ```
2. **Fresh owner signup** with real email after test users cleared
3. **Rebuild LandingPageBuilder.jsx** (was overwritten with ContentCalendarPage code)
4. **Real signup end-to-end test**
5. **hello@rankforgedai.com** email forwarding — set up in DreamHost (owner task)

## CURRENT STATE OF gcs-data FUNCTION
- File: supabase/functions/gcs-data/index.ts
- Status: STUB deployed (returns {ok:true})
- Real function: gcs-data-final.ts in Downloads — uses manual JWT decode + service role key
- To restore real function: copy gcs-data-final.ts → supabase/functions/gcs-data/index.ts and deploy

## KEY FILE LOCATIONS
- src/components/SearchConsolePage.jsx — updated to use getSession()
- src/components/ApiKeysPage.jsx — google_key is OAuth button
- src/components/SocialCallbackPage.jsx — fixed gcs-auth endpoint
- supabase/functions/gcs-auth/index.ts — saves to google_key column
- supabase/functions/gcs-data/index.ts — STUB currently deployed

## DOMAIN STRUCTURE
- rankforgedai.com — marketing website ✅ LIVE
- app.rankforgedai.com — SaaS app ✅ LIVE
- send.rankforgedai.com — Resend email sending ✅

## GITHUB STRUCTURE
- EBLServicesLLC/rankforge — app (main) → auto-deploys to rankforgedai project
- EBLServicesLLC/rankforgedai-marketing — marketing (main) → auto-deploys to project-gd2vh
- NOTE: Local marketing branch is 'master', remote is 'main' — always: git push origin HEAD:main

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
$env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
supabase secrets set KEY=value --project-ref ybhpbpahhywiokhqpldj
supabase functions deploy function-name --project-ref ybhpbpahhywiokhqpldj
```

## SUPABASE TABLE: settings columns
anthropic_key, google_key (GSC OAuth access token), gsc_refresh_token, gsc_email,
gsc_connected, indexnow_key, yext_key, yext_account, openai_key, gemini_key,
pagespeed_key, moz_id, moz_secret, brightlocal_key, brightlocal_cid,
gmail_token, fb_token, fb_page_id, linkedin_token, brand_color, agency_name,
report_day, updated_at

## SUPABASE TABLE: client_data columns
client_id, user_id, biz_name, biz_cat, biz_addr, biz_city, biz_state,
biz_zip, biz_phone, biz_website, biz_desc, biz_kw

## DESIGN SYSTEM
pageBg:#060d1a cardBg:#0d1f3c border:#0f2040 border2:#1a3560
text:#e2e8f0 muted:#4a6080 accent:#3b82f6 green:#10b981 red:#f87171

## MODEL STRING
claude-sonnet-4-6

## VERCEL PROJECTS
- rankforgedai → app.rankforgedai.com → EBLServicesLLC/rankforge
- project-gd2vh → rankforgedai.com → EBLServicesLLC/rankforgedai-marketing

## VERCEL ENV VARS (app)
- VITE_SUPABASE_URL=https://ybhpbpahhywiokhqpldj.supabase.co
- VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- VITE_GOOGLE_CLIENT_ID=179014220794-0bkt30vkd30lc2g4pcttb41ktckbc4va.apps.googleusercontent.com

## SUPABASE SECRETS (active)
ANTHROPIC_API_KEY, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET,
LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, RESEND_API_KEY,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

## STRIPE STATUS
- Products: ACTIVE ✅
- Checkout: confirmed working for all 4 plans ✅
- Live mode: NOT YET TESTED

## RESEND / EMAIL STATUS
- DKIM/MX/SPF: Verified ✅ on send.rankforgedai.com
- FROM_EMAIL: noreply@send.rankforgedai.com ✅
- hello@rankforgedai.com: PENDING setup in DreamHost

## MARKETING SITE ROUTES (vercel.json)
- /privacy-policy → privacy-policy.html ✅
- /terms-of-service → terms-of-service.html ✅
- /(.*) → index.html (catch-all)

## TEST KEYS
RFA-SOLO-TEST-0001, RFA-DLX-TEST-0001, RFA-PRO-TEST-0001, RFA-AGN-TEST-0001
