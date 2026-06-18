# RankForged AI - Session Handoff
**Date:** 2026-06-17 (Session 32 — End)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo (app):** https://github.com/EBLServicesLLC/rankforge
**Repo (marketing):** https://github.com/EBLServicesLLC/rankforgedai-marketing
**Live app:** https://app.rankforgedai.com
**Live marketing:** https://rankforgedai.com
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

## CRITICAL LESSONS - READ FIRST
### All previous lessons still apply, plus:
### #57 - A commit with an unrelated message (e.g. "Add Resend email...") can silently overwrite an unrelated file if too many files are staged in one sweep. ALWAYS check `git diff --stat` before committing broad/bulk changes — don't trust the commit message to reflect what's actually staged.
### #58 - `client_data` table's primary/foreign key column is `client_id`, NOT `id`. This exact bug (`.eq('id', clientId)` instead of `.eq('client_id', clientId)`) was found and fixed in 9 separate component files this session — it's a recurring copy-paste mistake. If a new page is added that queries `client_data`, double-check the column name.
### #59 - Supabase's `.single()` throws an HTTP 406 if a query returns 0 OR more than 1 rows. Always use `.maybeSingle()` for any query that might legitimately return zero rows (e.g. a settings/profile row that doesn't exist yet for a new user/client). This was the second half of the bug in #58 — found and fixed in 11 files total this session.
### #60 - NEVER use PowerShell's `>` redirect to extract file content from `git show` on Windows without checking encoding afterward. It can silently write UTF-16 with mojibake (corrupted special characters) instead of clean UTF-8. Always verify with `file <filename>` after any `git show ... > file` extraction. Prefer `git show <commit>:<path> | Out-File -Encoding utf8 <path>` instead, or better, use `git checkout <commit> -- <path>` directly.
### #61 - A component being correctly imported in DashboardShell.jsx does NOT mean it's being rendered. Always grep for both `import X from` AND `<X ... />` — an import with zero JSX usage is a silent dead component.
### #62 - When a feature seems "broken in the UI" but the file is provably correct (builds clean, exports correct, no syntax errors), check for Vite dev-server cache staleness (`node_modules/.vite`) and browser extensions before assuming the code is wrong. In this session, local dev kept showing stale state even after correct fixes; the production build + fresh Vercel deploy resolved it immediately, confirming the issue was environmental, not code.

## COMPLETED SESSION 32
- **Restored `LandingPageBuilder.jsx`** — had been silently overwritten with duplicate `ContentCalendarPage` content by an unrelated commit (`e03bbd5`, "Add Resend email...") days earlier. Recovered from commit `a0b499c` (last known-good). ✅
- **Fixed UTF-16/mojibake encoding corruption** in `LandingPageBuilder.jsx` introduced during git recovery (PowerShell `>` redirect issue — see lesson #60). Converted back to clean UTF-8, restored all special characters (✓ ✗ → 👁 ── etc). ✅
- **Wired up the "Landing Pages" sidebar tab correctly** — `DashboardShell.jsx`'s `pages` tab was rendering `ContentCalendarPage` instead of `LandingPageBuilder`; fixed render call + props (`session`, `clientId`). ✅
- **Added missing "Landing Pages" nav entry** to `NAV_GROUPS` (Content group) — it existed as a tab ID but had no sidebar entry, making it unreachable. Also added `'pages'` to both `JSX_TABS` / `JSX_TABS_SW` arrays. ✅ **CONFIRMED LIVE on app.rankforgedai.com.**
- **Fixed the `client_data` wrong-column bug (`id` → `client_id`) across 9 files**, all paired with `.single()` → `.maybeSingle()`: `GbpQaPage.jsx`, `KwGapPage.jsx`, `LandingPageBuilder.jsx`, `LocalSEOPage.jsx` (two instances, including a second bug in a `local_seo_tasks` query that was silently swallowed by an empty `catch{}`), `MetaTagGeneratorPage.jsx`, `NapAuditPage.jsx`, `ReportsPage.jsx` (also had a silent `.catch(){}`), `SchemaMonitorPage.jsx`, `Web2Page.jsx`. ✅
- **Fixed `IndexingPage.jsx`** — was querying the `settings` table for `biz_website`, a column that only exists on `client_data`, causing a 400 error that also broke the `indexnow_key` load. ✅
- **Fixed `RankTrackerPage.jsx`** — same `id`/`client_id` bug plus a `.single()` 406 on the settings query. ✅
- **Fixed `useSettings.js` and `useClientData.js` hooks** — both used `.single()`, converted to `.maybeSingle()`. ✅
- **Confirmed via production build (`npm run build`)** — 93 modules, zero errors, clean output. ✅
- **Cleaned up 3 accidentally-committed scratch files** (`recovered_LandingPageBuilder.jsx`, `recovered_v2_LandingPageBuilder.jsx`, a mistyped/garbled filename artifact) — removed in a follow-up commit. ✅
- **Verified business profile data prefill is now likely fixed** across all 11 touched pages (was on the old "WHAT NEEDS FIXING" list) — not individually re-tested page by page, but the root query bug causing it is fixed everywhere it appeared.

## BLOCKED / KNOWN ISSUE — NOT FIXED THIS SESSION
- **`ApiKeysPage.jsx` shows all keys as blank/"Not set" in the UI**, despite the underlying `settings` table data being confirmed intact via direct SQL query (`anthropic_key`, `google_key`, `gemini_key` all show `'set'`). **This is a display/fetch bug only — no data loss.** The page's load `useEffect` already correctly uses `.maybeSingle()` and doesn't have the `id`/`client_id` bug. Root cause not yet identified — candidates: `session` prop timing/availability when `ApiKeysPage` mounts, or a silently swallowed error (the `.then()` callback doesn't check/log `error` at all). **Needs investigation next session** — start by adding `console.error` logging to the load effect and checking what `session` actually contains when this component mounts.
- Owner explicitly deprioritized this to ship; data is safe, so this is a UI polish/trust issue, not urgent infrastructure risk.

## PENDING FROM PRIOR SESSIONS (carried over, not touched this session)
1. **Delete test users from Supabase** — FK constraints block dashboard deletion; use SQL editor (see Session 31 handoff for exact SQL).
2. **Fresh owner signup** with real email after test users cleared.
3. **Real signup end-to-end test.**
4. **hello@rankforgedai.com** email forwarding — DreamHost (owner task, not code).
5. Google Search Console integration — still deprioritized, too many moving parts (per Session 31).

## CURRENT STATE OF gcs-data FUNCTION
- Unchanged from Session 31: STUB deployed (returns `{ok:true}`). Real function (`gcs-data-final.ts`) still in Downloads, not redeployed. Note: `supabase/functions/gcs-data/index.ts` showed as modified in this session's git status but was not intentionally touched — verify this wasn't an accidental change before next deploy of that function.

## KEY FILE LOCATIONS (updated)
- `src/components/LandingPageBuilder.jsx` — restored, encoding-fixed, query-fixed. UTF-8, CRLF line endings, 603 lines.
- `src/components/DashboardShell.jsx` — Landing Pages nav + render call fixed.
- `src/components/ApiKeysPage.jsx` — **needs investigation** (display bug, see above).
- `src/hooks/useSettings.js`, `src/hooks/useClientData.js` — `.maybeSingle()` fix applied.
- All 9 other touched component files — `client_data` column fix applied, listed above.

## GIT COMMITS THIS SESSION
- `0aa5f13` — fix: restore LandingPageBuilder.jsx (initial attempt, later found to still be corrupted — see lesson #60)
- `40cc008` — fix: restore LandingPageBuilder.jsx to last correct version (a0b499c), corrected from e03bbd5 corruption
- `6110eed` — fix: restore LandingPageBuilder, fix client_data/settings query bugs across 11 files, add Landing Pages nav entry
- `3f286cb` — chore: remove scratch/debug files accidentally committed

## DOMAIN STRUCTURE
- rankforgedai.com — marketing website ✅ LIVE
- app.rankforgedai.com — SaaS app ✅ LIVE (this session's fixes confirmed live here)
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
(Vercel auto-deploys in ~2 minutes)

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
**Does NOT have:** biz_website, biz_name, or any biz_* field. Those belong to client_data only.

## SUPABASE TABLE: client_data columns
client_id (PRIMARY/FOREIGN KEY — NOT "id"), user_id, biz_name, biz_cat, biz_addr, biz_city, biz_state,
biz_zip, biz_phone, biz_website, biz_desc, biz_kw

## SUPABASE TABLE: clients columns (separate from client_data)
id (PRIMARY KEY — this one DOES use "id"), user_id, name, color, updated_at
This is the lightweight client list table used by useClients.js. Do not confuse with client_data.

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

## LAUNCH READINESS SUMMARY (as of end of Session 32)
✅ Landing Pages feature — live, working, confirmed in production
✅ Business profile data flow — root bug fixed across 11 files, should resolve long-standing prefill issues
✅ Production build — clean, zero errors
✅ Data integrity — verified intact via direct SQL query
⚠️ API Keys page UI display — known cosmetic bug, data is safe, owner approved shipping with this open
⏸️ Test user cleanup, fresh signup test, GSC integration — still pending from prior sessions, not blockers for this launch

**Owner decision: proceeding to launch with the ApiKeysPage display bug as a known follow-up item.**
