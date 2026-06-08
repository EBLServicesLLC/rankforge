# SESSION HANDOFF — 2026-06-04 (Session 8)

## STABLE STATE AT END OF SESSION
- Tag: stable-v3 (commit 8da048a)
- All working: login, billing, onboarding, profile, My Businesses, full-page redirect to rankforge3, all 24 tabs

## EMERGENCY RESTORE COMMAND
If anything breaks, run this to get back to stable-v3:
`powershell
git checkout stable-v3 -- public/rankforge3.html src/components/DashboardShell.jsx
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = Get-Content src/components/DashboardShell.jsx -Raw
[System.IO.File]::WriteAllText((Resolve-Path "src/components/DashboardShell.jsx"), $content, $utf8NoBom)
git add -f public/rankforge3.html src/components/DashboardShell.jsx
git commit -m "restore: stable-v3 emergency"
git push
`

## WHAT HAPPENED THIS SESSION
- Attempted to balance API Keys tab 2-column layout (cosmetic issue)
- Multiple string replacement approaches failed silently
- Python rewrite of rankforge3.html corrupted DashboardShell.jsx encoding (UTF-16 BOM)
- Vercel builds failed for ~1 hour with UNLOADABLE_DEPENDENCY error
- Emergency restored to stable-v3 — app fully working again
- GSC + Rank Tracker (decode_rankforge.py) was NOT successfully deployed this session

## CRITICAL RULES LEARNED THIS SESSION
1. NEVER use PowerShell Set-Content or Out-File to write JSX files — corrupts encoding
2. NEVER use Python to rewrite rankforge3.html directly — use decode_rankforge.py only
3. NEVER attempt string replacement on rankforge3.html via PowerShell
4. Always verify Vercel deployment is green before considering any change successful
5. API Keys layout is cosmetic — do NOT attempt to fix it

## PENDING FOR NEXT SESSION (in order)

### 1. Deploy GSC + Rank Tracker
Run decode_rankforge.py which contains the correct version:
`powershell
python decode_rankforge.py
`
Verify all 4 OKs:
- OK: gscDashRefresh
- OK: rt-gsc-banner
- OK: saveGscToken
- OK: rtFetchGSC

Then commit:
`powershell
git add -f public/rankforge3.html
git commit -m "feat: GSC analytics + Rank Tracker rebuild"
git push
`

### 2. Supabase — add gsc_token column
`sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gsc_token text;
`

### 3. Stripe live switchover
In BillingPage.jsx replace test price IDs with live ones:
- Solopreneur: price_1TdJajLQRnOj0qLPQmbNz2kN
- Deluxe: price_1TdJbkLQRnOj0qLPJPfsQsJI
- Pro: price_1TdJczLQRnOj0qLPa7nat9Hi
- Agency: price_1TdJdnLQRnOj0qLPv56ml87r

### 4. Dark/light mode button
Wire up properly or remove until built.

## KEY REFERENCES
- Supabase: https://ybhpbpahhywiokhqpldj.supabase.co
- Vercel: https://rankforgedai-5ipq.vercel.app
- GitHub: https://github.com/EBLServicesLLC/rankforgedai
- Stable tag: stable-v3 (commit 8da048a)

## SUPABASE EDGE FUNCTIONS
- stripe-checkout: ACTIVE
- stripe-webhook: ACTIVE
- vault-keys: ACTIVE v1

## SESSION HEALTH
Health: Recovered — app back to stable-v3, all core features working
Rotate Session: YES — start fresh next session
Next priority: python decode_rankforge.py → verify 4 OKs → commit
