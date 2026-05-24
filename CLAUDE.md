# RankForged AI — Claude Reference File
# Place this in the root of your RANKFORGEDAI project folder.
# Claude reads this file at the start of each session for context.

## Project Overview
Full-stack SaaS SEO platform. React + Vite frontend, Supabase backend.
The core SEO tool is a single HTML file (rankforge3.html) embedded in an iframe.

## File Structure
```
RANKFORGEDAI/
├── public/
│   ├── rankforge3.html        ← Core SEO tool (1076KB) — DO NOT touch lightly
│   └── logo.png
├── src/
│   ├── App.jsx                ← Auth gate → OnboardingWizard → DashboardShell
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── AuthPage.jsx       ← Login/signup, split-screen with header image
│   │   ├── DashboardShell.jsx ← Main app shell with sidebar + iframe
│   │   ├── ClientsPage.jsx    ← My Businesses tab (home screen)
│   │   └── OnboardingWizard.jsx ← 6-step setup wizard
│   ├── hooks/
│   │   ├── useClients.js      ← Client CRUD via Supabase
│   │   ├── useClientData.js   ← Campaign data per client
│   │   ├── useSettings.js     ← API keys + agency branding
│   │   └── useSubscription.js ← Plan + onboarding state
│   └── lib/
│       └── supabase.js        ← Supabase client (reads .env.local)
├── .env.local                 ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── schema.sql                 ← Core DB schema (run in Supabase SQL Editor)
├── schema_subscriptions.sql   ← Subscriptions + activation keys schema
└── CLAUDE.md                  ← This file
```

## Environment Variables (.env.local)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
After editing .env.local always restart Vite (Ctrl+C then npm run dev).

## Supabase Tables
- `clients` — one row per business, linked to auth.users
- `client_data` — all campaign state per client (mirrors S object from rankforge3)
- `settings` — API keys + agency branding per user
- `subscriptions` — plan, activation key, onboarding state
- `activation_keys` — pre-seeded keys for plan activation

All tables have Row Level Security (users only see their own rows).

## Pricing Plans
| Plan         | Price   | Businesses | SEO Types                    |
|--------------|---------|------------|------------------------------|
| Solopreneur  | $97/mo  | 1          | Local                        |
| Deluxe       | $197/mo | 3          | Local + Regional             |
| Pro          | $397/mo | 5          | Local + Regional + National  |
| Agency       | $997/mo | 25         | All + White Label            |

Test activation keys (seeded in schema_subscriptions.sql):
- RFA-SOLO-TEST-0001 / RFA-SOLO-TEST-0002 (Solopreneur, 1 biz)
- RFA-DLX-TEST-0001  (Deluxe, 3 biz)
- RFA-PRO-TEST-0001  (Pro, 5 biz)
- RFA-AGN-TEST-0001  (Agency, 25 biz)

---

## rankforge3.html — Architecture

### Key Global Objects
- `S` — main state object (dSt, blSt, w2St, chk, keys, gbpPosts, etc.)
- `DIRS` — array of 75 citation directories
- `BL` — array of 70+ backlink prospects
- `W2_PLATFORMS` — 35 web 2.0 platforms
- `calItems` — content calendar items
- `CS` — citation scheduler config
- `WR` — weekly report scheduler config
- `CM` — client manager config

### CSS Variables (light mode defaults)
```css
--bg: #f5f5f7
--bg-card: #ffffff
--bg-2: #f2f2f7
--text-1: #1d1d1f       (main headings)
--text-2: #6e6e73       (body text)
--text-3: #aeaeb2       (captions/labels)
--green-text: #16a34a   (was #1c7c37 — brightened in session 8)
--blue: #007aff
--border: #d2d2d7
```

### 24 Panels (in order)
dash, keys, dir, bl, web2, index, local, mloc, voice, pages, gbpqa,
calendar, meta, reputation, locallinks, napaudit, kwgap, social-pub,
pdfreport, gsc, schema-mon, social-proof, agents, rank-tracker

### Tab Switching — efTab(tabId, buttonElement)
The `efTab` function requires a real DOM button element as second arg.
It calls an init function for each tab:
```
'dir'         → renderDirs(), initDirAutomator()
'bl'          → renderBL(), blsInit()
'web2'        → renderW2()
'local'       → genSchema(), runAudit(), renderCitationDash(), etc.
'mloc'        → initMloc()
'voice'       → initVoiceSearch(), vsInitHub()
'pages'       → initLandingPages()
'gbpqa'       → initGbpQa()
'calendar'    → initCalendar()
'meta'        → initMeta()
'reputation'  → initReputation()
'locallinks'  → initLocalLinks()
'napaudit'    → initNapAudit()
'kwgap'       → initKwgap()
'social-pub'  → initSocialPub()
'pdfreport'   → initPdfReport()
'gsc'         → initGsc()
'schema-mon'  → initSchemaMonitor()
'social-proof'→ initSocialProof()
'rank-tracker'→ initRankTracker()
'agents'      → csRenderUI(), blsRenderAll()   ← added session 8
'dash'        → renderDashboard()
'index'       → renderIndexChk(), renderAIChk(), renderPingList()
'keys'        → renderKeyStatus()
```

### DOMContentLoaded Chain
```js
efAppInit(); gmailInit(); cmInit(); wrLoad(); csLoad();
```

### Function Aliases
- `renderDirTable()` → alias for `renderDirs()` (added session 8)

---

## DashboardShell — iframe Tab Switching

### The Problem (solved in session 9)
Calling `iWin.efTab()` directly from React can silently fail due to
Vite dev server origin mismatches. Results in blank pages.

### Three-Strategy Solution (current implementation)
1. **postMessage** (immediate, always works)
   ```js
   iWin.postMessage({ type: 'SWITCH_TAB', payload: { tab: tabId } }, '*')
   ```
2. **Direct efTab call** (after 200ms, same-origin only)
   ```js
   const btn = iDoc.querySelector('[data-tab="' + tabId + '"]')
   iWin.efTab(tabId, btn)
   ```
3. **URL reload fallback** (guaranteed to work)
   ```js
   setIframeSrc('/rankforge3.html?client=X&tab=tabId&t=Date.now()')
   ```

### rankforge3 postMessage Listener
Added near end of script — handles `SWITCH_TAB` and `RF_SAAS_PING` types.
Also reads `?tab=` URL param on startup in `efAppInit`.

### IFRAME_CSS (injected on load to hide rankforge3 sidebar)
```css
.ef-sidebar { display: none !important; }
.ef-app { border-radius: 0 !important; max-width: 100% !important; height: 100dvh !important; }
.ef-main { border-radius: 0 !important; }
.ef-topbar { display: none !important; }
.ef-content-area { padding-top: 8px !important; }
body { overflow: hidden !important; }
```

---

## All Bug Fixes & Features (by session)

### Session 1-5: Initial SaaS Setup
- Vite + React project connected to Supabase
- Auth (email + Google OAuth) via Supabase
- DB schema: clients, client_data, settings, subscriptions, activation_keys
- Login page with split-screen header image (RankForgedAi_Header.png)
- DashboardShell with sidebar client switcher + iframe
- ClientsPage (My Businesses home screen)
- OnboardingWizard (6 steps: Activate → Business → SEO Type → API Keys → Branding → Launch)

### Session 6: rankforge3 Bug Fixes
- Web 2.0: target keyword auto-populates from biz-kw on tab open
- Backlinks: stats moved to top (Prospects Found / Links Won / Pitched / Avg DA)
- Voice Search: fVS() filter buttons now correctly highlight active button
- Schema Monitor: smPullFromProfile() added — fills website URL + checks types
- Schema Monitor: smRunRealValidation made async (had await inside non-async)
- Social Proof: spImportFromReputation() fixed to pull per-platform data correctly
- Multi-Location: mlocAutoFillFromProfile() added
- NAP Audit: napAiFix() added — AI Fix All Issues button
- Calendar: default view switched to list (rows not columns)
- Calendar: column headers added (Date / Type / Title / Platform / Action)
- GBPQA: topic checkboxes populated with 10 chips + auto-populate service/city
- renderDirTable: alias added → renderDirs()

### Session 6: AI Agent Buttons Added to Panels
- Reputation → Run Review Velocity Agent
- Local Links → Run Local Links Agent
- NAP Audit → AI Fix All Issues
- Local SEO → Run GBP Health Monitor
- Competitor Gap → Run Competitor Gap Agent
- Indexing → Run Ping Agent

### Session 6: New Features in rankforge3
- Ping Submission Agent (agentPings) — submits to Google, Bing, IndexNow, Yandex
- Ping Agent card in Agents panel
- Ping Agent button in Indexing panel
- Citation Submission Scheduler (CS object, csLoad, csRenderUI, csRunScheduledSubmission)
- Citation Scheduler card in Agents panel with frequency/day/time/batch controls
- Submit Website section in Backlinks tab (35 platforms across 4 tabs)
- Content Calendar Executor agent (agentCalExecutor)

### Session 6: Guidance Text Added
- Rank Tracker: explains positions, click rates, which keywords to track
- Google Search Console: plain English explanation + how to connect
- Indexing: step-by-step guide for Google/Bing/IndexNow/AI
- Social Publisher: direct links to create business pages on each platform
- Landing Pages: WordPress guide with Yoast/Schema Pro/WP Rocket
- Social Proof: score formula (reviews 40%, rating 35%, velocity 25%)
- AI Agents: how-to banner explaining chain + Anthropic key requirement

### Session 7: Text Color Fixes
- #374151 → #6b7280 (paragraph text in info boxes — was too dark)
- --green-text: #1c7c37 → #16a34a (brighter green labels)
- Guidance box text #94a3b8 → #4b5563 (readable in light mode)

### Session 7: Double Sidebar Fix
- DashboardShell injects IFRAME_CSS on iframe load to hide .ef-sidebar
- efTab patched to use t.isConnected check before calling t.classList.add

### Session 8: All Tabs Blank Fix (attempt 1)
- agents tab added to efTab init chain (was the only missing one)
- postMessage listener added to rankforge3
- RF_READY signal sent from rankforge3 on startup
- DashboardShell switchTab updated to use real [data-tab] button

### Session 9: All Tabs Blank Fix (final)
- ROOT CAUSE: Vite cross-origin security silently blocks iWin.efTab() calls
- SOLUTION: Three-strategy tab switching (postMessage → direct call → URL reload)
- rankforge3 reads ?tab= URL param in efAppInit for guaranteed tab switching
- switchTab now sends postMessage first, then tries direct call, then reloads URL

---

## Common Debugging Commands (run in VS Code terminal)

```bash
# Start dev server
npm run dev

# Check if Supabase tables exist
# → Go to Supabase Dashboard → Table Editor

# If login page doesn't show:
# 1. Check .env.local exists in project root
# 2. Ctrl+C then npm run dev (must restart after .env changes)
# 3. Check browser console (F12) for red errors

# If tabs show blank pages:
# 1. Open browser console → check for JS errors in iframe
# 2. Open rankforge3.html directly (not in iframe) to test standalone
# 3. Check Network tab for 404 on rankforge3.html

# If styles look wrong:
# 1. Hard refresh: Ctrl+Shift+R
# 2. Check that rankforge3.html is in public/ not src/
```

## Known Issues & Workarounds

### Issue: Activation key already used
**Fix**: Go to Supabase → Table Editor → activation_keys → set used=false,
clear used_by and used_at fields. Or run:
```sql
UPDATE activation_keys SET used=false, used_by=null, used_at=null
WHERE key='RFA-SOLO-TEST-0001';
```

### Issue: Onboarding wizard shows instead of dashboard after fixing a bug
**Fix**: Go to Supabase → Table Editor → subscriptions → set
onboarding_completed=true for your user row.

### Issue: Clients not loading (404 on /rest/v1/clients)
**Fix**: Run schema.sql in Supabase SQL Editor — the clients table doesn't exist yet.

### Issue: rankforge3 tabs blank when opened in iframe
**Fix**: Use the URL param strategy — ensure switchTab sets iframeSrc with
?tab=tabId. Check that rankforge3.html is in public/ folder.

### Issue: "Failed to resolve import @supabase/supabase-js"
**Fix**: Run `npm install @supabase/supabase-js` in the project root.

### Issue: JS syntax error in rankforge3 after editing
**Fix**: Run node --check on the extracted JS. Common causes:
- async function that got split during injection
- Orphaned closing brace from a replaced function
- Template literal backtick escaped as \`

---

## rankforge3 Edit Safety Rules

1. **Always extract and syntax-check JS before saving**
   ```python
   r = subprocess.run(['node','--check','/tmp/check.js'], capture_output=True)
   ```

2. **Always verify 24 panels after edits**
   ```python
   panels = len(re.findall(r'id="panel-[\w-]+"', html))
   assert panels == 24
   ```

3. **Always verify div balance**
   ```python
   divs_open  = html.count('<div')
   divs_close = html.count('</div>')
   # 1 diff is pre-existing, more than 1 means a new error was introduced
   ```

4. **Never use backticks inside Python string literals when injecting JS**
   Use single quotes or escape properly.

5. **DCL chain must always include all 5 calls**
   `efAppInit(); gmailInit(); cmInit(); wrLoad(); csLoad();`

6. **When injecting a new function, check it doesn't split an existing one**
   The csRenderUI bug in session 8 was caused by injecting ping agent JS
   in the middle of csRenderUI's closing block.

---

## Next Steps (Planned)
- [ ] Stripe billing integration (Payment Links → webhook → activation key email)
- [ ] Resend email for welcome + activation key delivery
- [ ] Supabase Vault for API key encryption (currently plain text)
- [ ] Rate limiting on agent runs per plan tier
- [ ] Service Area Page Generator (unlocks Regional SEO tier)
- [ ] Multi-City Rank Tracker
- [ ] Deploy to Vercel + custom domain
- [ ] Privacy policy + Terms + Delete Account
- [ ] 2FA option in account settings
- [ ] Agency client-facing report portal