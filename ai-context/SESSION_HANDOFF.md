# RankForged AI - Session Handoff
**Date:** 2026-06-08 (Session 19 - Final)
**Stack:** React + Vite | Supabase (auth + Postgres + RLS) | Vercel
**Repo:** https://github.com/EBLServicesLLC/rankforgedai
**Live:** https://rankforgedai-5ipq.vercel.app
**Supabase:** https://ybhpbpahhywiokhqpldj.supabase.co

---

## CRITICAL LESSONS - READ FIRST

### #1 - ALWAYS CHECK IMPORTS BEFORE ANYTHING ELSE
The root cause of every blank page is missing imports. Before patching DashboardShell, always run:
```js
// check_imports.cjs
const fs = require('fs');
const c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
const pages = ['DashboardPage','BacklinksPage','ApiKeysPage','IndexingPage',
  'SocialProofPage','SocialPublisherPage','LocalLinksPage','VoiceSearchPage',
  'SchemaMonitorPage','LandingPageBuilder','LocalSEOPage','RankTrackerPage',
  'MetaTagGeneratorPage','GbpQaPage','NapAuditPage','KwGapPage','ReputationPage',
  'Web2Page','ReportsPage','AgentsPage'];
pages.forEach(p => console.log(c.includes(p) ? 'OK: '+p : 'MISSING: '+p));
```

### #2 - 5-part render pattern (ALL required per JSX page)
1. Import at top of file
2. Tab ID in `JSX_TABS_SW` array (~line 106)
3. Tab ID in `JSX_TABS` useEffect array (~line 200)
4. Render block: `{activeTab === 'tabid' && (<div style={{flex:1,overflowY:'auto',background:'#060d1a'}}><Page .../></div>)}`
5. Tab ID in iframe exclusion line (~line 549)

### #3 - Always upload current file from disk before patching
Never patch from a cached copy.

### #4 - No em-dashes, en-dashes, or arrows in JSX strings - they crash Vite

### #5 - PowerShell is not a code editor
Never paste JSX or JS import statements into PowerShell. Use VS Code or file copy commands only.

---

## COMPLETED THIS SESSION (Session 19)

### Supabase Tables Added
```sql
-- Run if not already done:
create table if not exists agent_states (
  user_id    uuid references auth.users(id),
  client_id  uuid,
  agent_id   text,
  enabled    boolean default false,
  status     text default 'idle',
  last_run   text,
  runs       integer default 0,
  updated_at timestamptz default now(),
  primary key (user_id, client_id, agent_id)
);
alter table agent_states enable row level security;
create policy "Users manage own agent states" on agent_states
  for all using (auth.uid() = user_id);

create table if not exists agent_results (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id),
  client_id  uuid,
  agent_id   text,
  output     text,
  created_at timestamptz default now()
);
alter table agent_results enable row level security;
create policy "Users manage own agent results" on agent_results
  for all using (auth.uid() = user_id);
create index if not exists agent_results_user_client
  on agent_results (user_id, client_id, created_at desc);
```

Also confirmed from Session 18:
```sql
create table if not exists indexing_checks (
  user_id uuid references auth.users(id),
  client_id uuid,
  check_id text,
  checked boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, client_id, check_id)
);
alter table indexing_checks enable row level security;
create policy "Users manage own indexing checks" on indexing_checks
  for all using (auth.uid() = user_id);
```

### AgentsPage.jsx - Fully Built and Wired
**File:** `src/components/AgentsPage.jsx`
**Tab ID:** `agents`
**Props:** `clientId={activeId} userId={session.user.id}`

**20 agents across 6 sections:**

| Section | Agents |
|---|---|
| Local Intelligence | Citation Auditor, Competitor Spy, Local Pack Tracker, GBP Health Monitor |
| Content & Outreach | Content Writer, Blog Publisher, FAQ Generator, Press Release Writer |
| Technical SEO | Schema Builder, Broken Link Hunter, Page Speed Monitor, Duplicate Content Detector |
| Reputation & Social | Review Responder, Review Request Sender, Social Listener, Negative Review Alerter |
| Rankings & Intelligence | Rank Monitor, GBP Optimizer |
| Reporting | Monthly Report Writer, Lead Attribution Tracker |

**Features:**
- Toggle on/off per agent with Supabase persistence (agent_states)
- Run Now fires Claude API with agent-specific prompt + business context
- Results panel slides in from right on run completion
- Eye icon on cards to re-open last result
- History tab - all past results filterable by section/agent, with View and Delete
- Results Saved stat counter
- Section filter pills (All / Local Intelligence / Content / etc.)
- Enable All / Disable All bulk buttons
- Global instruction override applied to all runs
- AI Assistant chat tab with full conversation + client context
- All results persist in Supabase (agent_results table)

### DashboardShell.jsx - Changes Made This Session
Added `agents` to all 5 required locations:
1. `import AgentsPage from './AgentsPage'` (line 26)
2. `JSX_TABS_SW` array (line 106) - includes 'agents'
3. `JSX_TABS` useEffect array (line 200) - includes 'agents'
4. Render block after social-proof block (~line 542)
5. Iframe exclusion line (~line 549) - includes `activeTab!=='agents'`

---

## CURRENT DashboardShell STATE

**Imports (lines 1-26):**
```
BillingPage, ProfileModal, ClientsPage, SocialPublisherPage,
LocalLinksPage, VoiceSearchPage, SchemaMonitorPage, LandingPageBuilder,
LocalSEOPage, RankTrackerPage, MetaTagGeneratorPage, GbpQaPage,
NapAuditPage, KwGapPage, ReputationPage, Web2Page, ReportsPage,
DashboardPage, BacklinksPage, SocialProofPage, ApiKeysPage, IndexingPage,
AgentsPage
```

**JSX_TABS_SW (~line 106):**
```
['dash','bl','keys','index','social-proof','social-pub','locallinks','voice',
 'schema-mon','pages','local','rank-tracker','meta','gbpqa','napaudit',
 'kwgap','reputation','web2','pdfreport','agents']
```

**JSX_TABS useEffect (~line 200):** same array as above

**Render block order:**
DashboardPage > BacklinksPage > SocialPublisherPage > LocalLinksPage >
VoiceSearchPage > SchemaMonitorPage > LandingPageBuilder > LocalSEOPage >
RankTrackerPage > MetaTagGeneratorPage > GbpQaPage > NapAuditPage >
KwGapPage > Web2Page > ReputationPage > ReportsPage >
ApiKeysPage > IndexingPage > SocialProofPage > AgentsPage > iframe

---

## SUPABASE - CONFIRMED EXISTING TABLES
client_data, local_seo_tasks, reputation_reviews, w2_status,
score_history, bl_status, social_proof,
indexing_checks, agent_states, agent_results

---

## PENDING JSX PAGES

| Page | Tab ID | Priority | Notes |
|------|--------|----------|-------|
| Content Calendar | `calendar` | High | Next to build - no new tables needed |
| AI Agents (done) | `agents` | Done | Session 19 |
| Directories | `dir` | Low | rankforge3 works |
| Multi-Location | `mloc` | Low | rankforge3 works |
| Search Console | `gsc` | Low | rankforge3 works |

---

## INFRASTRUCTURE PENDING

| Item | Status | Notes |
|------|--------|-------|
| LinkedIn secrets | Pending | Set LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET in Supabase edge function secrets |
| BrightLocal real API | Pending | Replace mock setTimeout in LocalSEOPage.jsx |
| AI prospect discovery | Pending | BacklinksPage improvement |
| Stripe payments | Pending | stripe-checkout edge function exists, needs frontend wiring |
| Email delivery (Resend) | Pending | Not started |

---

## DESIGN SYSTEM (all JSX pages must match)

```javascript
const T = {
  pageBg:'#060d1a', cardBg:'#0d1f3c', cardBg2:'#080f1e',
  border:'#0f2040', border2:'#1a3560',
  text:'#e2e8f0', textSub:'#c8d8f0', muted:'#4a6080',
  accent:'#3b82f6', accentHi:'#60a5fa',
  green:'#10b981', red:'#f87171', yellow:'#f59e0b',
  orange:'#f97316', purple:'#8b5cf6', cyan:'#22d3ee',
}
```

Card/CardHead pattern. Tabler icons `<i className="ti ti-...">`.
No em-dashes, en-dashes, or arrows in JSX strings.

---

## VERIFICATION SCRIPTS (run from project root with node)

```js
// check_imports.cjs
const fs = require('fs');
const c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
const pages = ['DashboardPage','BacklinksPage','ApiKeysPage','IndexingPage',
  'SocialProofPage','SocialPublisherPage','LocalLinksPage','VoiceSearchPage',
  'SchemaMonitorPage','LandingPageBuilder','LocalSEOPage','RankTrackerPage',
  'MetaTagGeneratorPage','GbpQaPage','NapAuditPage','KwGapPage','ReputationPage',
  'Web2Page','ReportsPage','AgentsPage'];
pages.forEach(p => console.log(c.includes(p) ? 'OK: '+p : 'MISSING: '+p));
```

```js
// check_tabs.cjs
const fs = require('fs');
const c = fs.readFileSync('src/components/DashboardShell.jsx', 'utf8');
c.split('\n').forEach((l,i) => { if (l.includes('JSX_TABS')) console.log(i+1, l.trim()); });
```

---

## EDGE FUNCTIONS ACTIVE
stripe-checkout, stripe-webhook, stripe-portal, vault-keys,
social-auth-facebook, social-auth-linkedin, social-publish,
local-links-generate, local-links-email, voice-search-generate,
voice-search-answers, voice-search-snippet, schema-monitor,
landing-page-generate, gsc-data, review-message-generate,
review-response-generate, gbp-qa-generate, meta-tag-generate,
kw-gap-analyse

## MODEL STRING
`claude-sonnet-4-5` (all edge functions and API calls)

## TEST KEYS
RFA-SOLO-TEST-0001, RFA-DLX-TEST-0001, RFA-PRO-TEST-0001, RFA-AGN-TEST-0001

## RECOMMENDED NEXT SESSION START
1. Upload current DashboardShell.jsx from disk
2. Run check_imports.cjs to verify AgentsPage is wired
3. Build Content Calendar page (calendar tab) - highest priority pending JSX page
