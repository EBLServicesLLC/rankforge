# SESSION HANDOFF — 2026-06-02 (Session 4)

## COMPLETED THIS SESSION
- Topbar visible on all pages with My Profile dropdown
- My Profile > View Profile modal — full editable business profile, saves to DB, updates rankforge3 live
- Add Business modal — full fields (name, category, address, city, state, zip, phone, website, keywords, description)
- Password reset email delivering (fixed Brevo sender typo: rangedforgedai -> rankforgedai)
- In-app password reset handler in App.jsx (PASSWORD_RECOVERY event)
- Supabase Site URL updated to https://rankforgedai-5ipq.vercel.app
- Plan purchase buttons added to login page and onboarding Step 1
- Stripe checkout function deployed with --no-verify-jwt (public access)
- Stripe webhook function written and deployed
- Garbled icons removed from OnboardingWizard
- Stable version tagged as stable-v1 at commit 2f37992

## ACTIVE ISSUES

### ISSUE-011 — Stripe Secret Key needs updating
Status: URGENT — exposed key must be rotated
Action:
1. Go to Stripe Dashboard → Developers → API Keys → Roll the secret key
2. Copy new sk_live_ key
3. Go to https://supabase.com/dashboard/project/ybhpbpahhywiokhqpldj/settings/functions
4. Update STRIPE_SECRET_KEY secret with new key
5. Redeploy: npx supabase functions deploy stripe-checkout --project-ref ybhpbpahhywiokhqpldj --no-verify-jwt
6. Test purchase with real card, refund immediately after

### ISSUE-012 — Stripe webhook end-to-end not tested
Status: Open
Action: After ISSUE-011 fixed, test full flow:
- Purchase → Stripe checkout → webhook fires → activation_keys updated
- Test via Stripe Dashboard → Webhooks → Send test event → checkout.session.completed
- Check Supabase → Edge Functions → stripe-webhook → Logs

### ISSUE-013 — Garbled icons may reappear
Status: Watch — happens when OnboardingWizard.jsx is downloaded from old uploaded version
Fix: Run this PowerShell after any OnboardingWizard download:
(Get-Content "src/components/OnboardingWizard.jsx" -Raw) -replace '[^\x00-\x7F]', '' | Set-Content "src/components/OnboardingWizard.jsx" -NoNewline

### ISSUE-014 — topbar display:none may reappear
Status: Watch — happens when DashboardShell.jsx is downloaded from old uploaded version
Fix: Run this PowerShell after any DashboardShell download:
(Get-Content "src/components/DashboardShell.jsx") -replace "display:'none',alignItems:'center',padding:'0 14px',gap:10", "display:'flex',alignItems:'center',padding:'0 14px',gap:10" | Set-Content "src/components/DashboardShell.jsx"

## LATEST COMMITS
05bfe69 fix: stripe checkout correct parameter names
6d522e0 fix: remove garbled icons, fix AuthPage JSX structure
7c9eb24 feat: add plan purchase buttons to login page and onboarding wizard
4bbaaea docs: mark stable version 2f37992
2f37992 fix: ProfileModal uses first client as fallback (STABLE-V1)

## KEY REFERENCES
Supabase: https://ybhpbpahhywiokhqpldj.supabase.co
Vercel: https://rankforgedai-5ipq.vercel.app
GitHub: https://github.com/EBLServicesLLC/rankforgedai
Stable tag: stable-v1 (commit 2f37992)

## Stripe Price IDs (LIVE)
- Solopreneur: price_1TdJajLQRnOj0qLPQmbNz2kN
- Deluxe: price_1TdJbkLQRnOj0qLPJPfsQsJI
- Pro: price_1TdJczLQRnOj0qLPa7nat9Hi
- Agency: price_1TdJdnLQRnOj0qLPv56ml87r

## Supabase Edge Functions
- stripe-checkout: ACTIVE v5 (--no-verify-jwt, public access)
- stripe-webhook: ACTIVE v3
- vault-keys: ACTIVE v1

## Brevo SMTP
- Host: smtp-relay.brevo.com, Port: 587
- Sender: noreply@rankforgedai.com
- Username: eblservices.us@gmail.com

## WHAT WENT WRONG THIS SESSION (learn from this)
- Downloaded files from outputs always reset to old uploaded version — use PowerShell replace commands instead
- Never paste code or API keys directly into PowerShell — VS Code only for code edits
- Stripe secret key was exposed in chat — MUST rotate immediately in next session
- supabase login token expires — need to re-login with: npx supabase login

## SESSION HEALTH
Health: Good — core platform functional, purchase flow working
Rotate Session: YES
