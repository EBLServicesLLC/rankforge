# CLAUDE_LAUNCHER.md — RankForged AI
# C:\Users\Darno\RankForgedAI\CLAUDE_LAUNCHER.md

## PROJECT
RankForged AI — SaaS Local SEO Platform
Owner: Darno / EBL Services LLC
GitHub: https://github.com/EBLServicesLLC/rankforgedai
Vercel: https://rankforgedai-5ipq.vercel.app
Local: http://localhost:5173

## STACK
React + Vite | Supabase (auth + Postgres + RLS) | Vercel (auto-deploy from GitHub main)

## ⛔ CRITICAL RULES — NEVER VIOLATE THESE
1. NEVER modify rankforge3.html CSS (no border-radius, overflow, max-width, margin changes)
2. NEVER replace or modify icon tags (<i class="ti">) — they use Tabler Icons CDN
3. NEVER remove the Tabler Icons CDN link
4. NEVER add rf-iframe-mode, contain:layout, or any layout-altering CSS
5. NEVER change ef-app, ef-main, ef-sidebar, ef-panel, ef-content-area CSS
6. ONLY append new code to the END of the file (before </script>)
7. The card layout with max-width:1400px and rounded corners is the INTENDED design

## CURRENT ARCHITECTURE
rankforge3.html loads as a FULL PAGE — NO IFRAME.

Flow:
1. User logs in → React app at /
2. Selects client → DashboardShell sets sessionStorage (rf_client, rf_sb_url, rf_sb_key, rf_user_id)
3. window.location.href = '/rankforge3.html?client=' + id
4. rankforge3 loads full screen with its OWN sidebar (24 tabs)
5. rankforge3 reads sessionStorage → calls Supabase REST API → loads API keys + business profile
6. Back button returns to React app at window.location.origin + '/'

## IMMEDIATE TODO — New chat must do these
1. Start with ORIGINAL rankforge3.html from Downloads:
   - File: "rankforge3 (33).html" (1,117,215 bytes, CDN:True, SVGs:0)
   - Copy to public/rankforge3.html WITHOUT any CSS modifications
2. APPEND ONLY these to the end (before </script>):
   a. Back button: add <a> link inside ef-sidebar-logo div
   b. Supabase data loader: read sessionStorage, fetch settings + client_data, inject into S.keys and form fields
3. Test at Vercel — all 24 tabs must work, no bleed, no blank pages
4. Then fix API keys + business profile data flow from onboarding

## DEPLOYMENT
git add -f public/rankforge3.html
git commit -m "description"
git push
(Vercel auto-deploys in ~2 minutes)

## FILE STRUCTURE
public/rankforge3.html — Core SEO tool (DO NOT MODIFY CSS)
src/components/DashboardShell.jsx — React shell (login + client selection only)
src/components/AuthPage.jsx — Login/signup
src/components/OnboardingWizard.jsx — 6-step setup wizard
src/components/ClientsPage.jsx — My Businesses page
src/hooks/ — useClients, useClientData, useSettings, useSubscription
src/lib/supabase.js — Supabase client
vite.config.js — Vite config with CSP headers

## WHAT WORKS
- Login/signup (email confirm OFF in Supabase)
- Activation keys (RFA-SOLO-TEST-0001 etc seeded in DB)
- Onboarding wizard (6 steps)
- My Businesses page
- Direct navigation to rankforge3
- DashboardShell passes credentials via sessionStorage

## WHAT NEEDS FIXING
1. rankforge3.html needs clean restore (version 33) + back button + Supabase loader
2. API keys from onboarding not appearing in API Keys tab
3. Business profile not pre-filling directories
4. Stripe payments
5. Email delivery (Resend)

## SUPABASE TABLE COLUMNS
settings: anthropic_key, google_key, indexnow_key, yext_key, yext_account,
  openai_key, gemini_key, moz_id, moz_secret, brightlocal_key, brightlocal_cid,
  gmail_token, fb_token, fb_page_id, linkedin_token, brand_color, agency_name
client_data: biz_name, biz_cat, biz_addr, biz_city, biz_state, biz_zip,
  biz_phone, biz_website, biz_desc, biz_kw

## TEST KEYS
RFA-SOLO-TEST-0001, RFA-DLX-TEST-0001, RFA-PRO-TEST-0001, RFA-AGN-TEST-0001

## WHAT WENT WRONG IN PREVIOUS SESSION (learn from this)
- Replaced 810 icon tags with inline SVGs → broke dynamic content rendering
- Removed Tabler Icons CDN → icons stopped working for dynamically generated panels
- Changed ef-app CSS (overflow, max-width, border-radius) repeatedly → broke layout
- Added/removed rf-iframe-mode CSS → caused sidebar hiding issues
- overflow:hidden clipped content to zero height
- overflow:visible caused content to bleed below card
- Solution: NEVER touch the original CSS. The card layout IS the design.
