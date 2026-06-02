# STABLE VERSION — RankForged AI
# Created: 2026-06-02

## Commit: 2f37992
## Branch: main
## Repo: https://github.com/EBLServicesLLC/rankforgedai
## Live: https://rankforgedai-5ipq.vercel.app

## To restore to this version:
```
git checkout 2f37992 -- src/components/DashboardShell.jsx
git checkout 2f37992 -- src/components/ProfileModal.jsx
git checkout 2f37992 -- src/components/OnboardingWizard.jsx
git checkout 2f37992 -- src/components/AuthPage.jsx
git checkout 2f37992 -- src/App.jsx
```

## What is working at this commit:

### Auth
- Login / Signup (email confirm OFF)
- Forgot Password — sends reset email
- In-app password reset — user clicks email link, lands at app, sets new password
- Google OAuth ready (configured in Supabase)

### Onboarding
- 6-step wizard with activation key validation
- Business profile saves to client_data (name, addr, city, state, zip, cat, phone, website, desc, kw)
- Category mapped to valid dropdown values via mapCategory()
- Garbled icons removed — step numbers used instead

### Dashboard Shell
- Topbar visible on ALL pages (display:flex)
- My Profile button top right with dropdown:
  - View Profile (opens ProfileModal)
  - Plans and Billing
  - Upgrade Plan
  - Cancel Subscription
  - Reset Password
  - Sign Out
- Sidebar text brighter (#7a9cc0)
- No redundant + Business or reload buttons in topbar

### ProfileModal (View Profile)
- Account section: email (read-only), plan (read-only)
- Reset Password and Plans & Billing buttons
- Agency name and brand color editable
- Full business profile editable (name, category, address, city, state, zip, phone, website, keywords, description)
- Saves to Supabase on Save
- Re-sends LOAD_DATA to rankforge3 iframe on save
- Falls back to first client if no active client selected

### Add Business Modal
- Full fields: name, category (dropdown), address, city, state, zip, phone, website, keywords, description
- Saves all fields directly to client_data on creation
- Clean title (no garbled icons)

### Email (Brevo SMTP)
- Host: smtp-relay.brevo.com, Port 587
- Sender: noreply@rankforgedai.com
- Password reset emails delivering confirmed

### Stripe
- Checkout confirmed working
- Price IDs:
  - Solopreneur: price_1TdJajLQRnOj0qLPQmbNz2kN
  - Deluxe: price_1TdJbkLQRnOj0qLPJPfsQsJI
  - Pro: price_1TdJczLQRnOj0qLPa7nat9Hi
  - Agency: price_1TdJdnLQRnOj0qLPv56ml87r

### rankforge3
- Loads in iframe
- LOAD_DATA handler populates all profile fields
- Category maps correctly — profile shows 100%
- Back button returns to React app

## Key Files
- src/App.jsx — root, auth listener, password recovery handler
- src/components/DashboardShell.jsx — main shell, topbar, My Profile, modals
- src/components/ProfileModal.jsx — View Profile modal
- src/components/AuthPage.jsx — login/signup/forgot password
- src/components/OnboardingWizard.jsx — 6-step onboarding
- src/components/ClientsPage.jsx — My Businesses page
- src/components/BillingPage.jsx — Stripe billing
- public/rankforge3.html — core SEO tool

## Supabase
- URL: https://ybhpbpahhywiokhqpldj.supabase.co
- Site URL set to: https://rankforgedai-5ipq.vercel.app
- Redirect URLs include: https://rankforgedai-5ipq.vercel.app

## CRITICAL RULES (never violate)
1. Never modify rankforge3.html CSS
2. Never replace icon tags in rankforge3.html
3. Always run: npm run build — before pushing to confirm no errors
4. After any DashboardShell download, run PowerShell replace to ensure display:flex
5. Never paste JSX/code into PowerShell — VS Code only
