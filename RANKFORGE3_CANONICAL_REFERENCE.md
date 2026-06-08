# RankForge3.html — Canonical Reference
**Marked canonical:** 2026-05-31 13:59  
**File:** `rankforge3_CANONICAL_2026-05-31.html`  
**Size:** 1,127,812 bytes  
**JS syntax:** ✅ Verified clean (Node `--check`)  
**All checks:** ✅ 25/25 passed  

---

## What This File Is

`rankforge3.html` is a self-contained, single-file Local SEO platform. It has no build step — it is deployed directly to `public/rankforge3.html` in the React/Vite repo and served as a static asset. The React shell (`DashboardShell.jsx`) navigates to it via `window.location.href`, passing credentials through `sessionStorage`.

---

## Architecture Rules (Never Violate)

1. **Never modify internal minified CSS** — only append overrides via the safe `<style>` block at the top of the file, using `#ef-app` or `.ef-app` selectors with `!important`.
2. **Never replace `<i class="ti ...">` icon tags** — Tabler Icons loaded via CDN.
3. **All new JS functions must be injected BEFORE the registry block** — the registry pattern is `VS_QUESTION_TYPES.forEach(...)` followed immediately by `function(){var e={efTab:efTab,...}}`. Any function defined after this block will be `undefined` when the registry runs.
4. **All new functions must be added to the registry object** — e.g. `cmOpenWizard:cmOpenWizard` in the `var e={...}` object.
5. **Never use `if(false){`** — causes unclosed block that eats subsequent functions → "Unexpected end of input".
6. **Always rebuild from the clean original** (`/mnt/user-data/uploads/rankforge3.html`, 1,103,406 bytes) in a single Python pass. Never layer patches on a previously patched output.
7. **Always run `node --check` on the extracted `<script>` block** before saving any output.

---

## File Structure

```
<head>
  <style>          ← SAFE ZONE: append CSS overrides here only
    @import Tabler Icons
    /* Full-screen, padding, checkbox fixes */
  </style>
</head>
<body>
  <div class="ef-app" id="ef-app">
    <aside class="ef-sidebar">
      ef-sidebar-logo (logo + Back to Dashboard button)
      ef-sidebar-nav  (25 tab buttons in 6 groups)
      ef-sidebar-footer
      #cm-section     (active client chip + Manage Clients button)
    </aside>
    <div class="ef-main">
      <div class="ef-topbar"> ... </div>
      <div class="ef-content-area">
        25 × <div class="ef-panel" id="panel-*"> ... </div>
      </div>
    </div>
  </div>

  <!-- ef-overlay modals (run-modal, gmail, cm-wizard-modal, cm-edit-modal) -->

  <script>          ← SINGLE script block, 742k chars
    [data arrays: DIRS, VS_QUESTION_TYPES, CM, CM_COLORS, ...]
    [CM functions: cmOpenWizard, cmRenderPanel, cmRenderSidebar, ...]  ← BEFORE registry
    [vsActiveTypes init]
    [renderVsQTypes — DOM-based]
    [original app functions]
    [window registry: function(){var e={efTab:efTab,...cmOpenWizard:cmOpenWizard,...}}()]
    [postMessage handler with initMap]
  </script>

  <!-- cm-wizard-modal HTML -->
  <!-- cm-edit-modal HTML -->

  <script>           ← Boot script (rfBoot IIFE)
    Supabase data loader
    DOMContentLoaded → cmInit(), cmRenderPanel(), cmRenderSidebar()
  </script>
</body>
```

---

## Sidebar Nav Groups (in order)

| Group | Tabs |
|---|---|
| Overview | Dashboard, API Keys |
| Citation Building | Directories, Backlinks, Web 2.0 |
| SEO & Local | Indexing & AI, Local SEO, Multi-Location |
| Content | Voice & FAQ, AI FAQ & Schema, Landing Pages |
| Automation | Content Calendar, Meta Tags |
| Intelligence | Reputation, Local Links, NAP Audit, KW Gap |
| Agency | Social Media, PDF Report, Clients |
| Technical | Search Console, Schema Monitor, Social Proof, Rank Tracker, AI Agents |

---

## Client Manager (CM) — Added This Session

### Storage
- `localStorage['rf_clients']` — JSON array of client objects
- `localStorage['rf_active_client']` — active client `id` string

### Client Object Schema
```js
{
  id,          // 'c_' + Date.now()
  name,        // Business name (required)
  city,
  state,
  cat,         // Business category
  phone,
  website,
  addr,        // Street address
  zip,
  keywords,    // Comma-separated services/keywords
  desc,        // Business description
  notes,       // Internal notes (not shown to client)
  score,       // SEO score 0–100
  updatedAt,   // ISO timestamp
  color        // Hex from CM_COLORS
}
```

### CM_COLORS
`['#1A6FBF','#1C7A37','#6B3FA0','#D97706','#C0392B','#0E7090','#2D6A8F','#5C4033']`

### Key Functions
| Function | Purpose |
|---|---|
| `cmOpenWizard()` | Open 2-step Add Client wizard modal |
| `cmCloseWizard()` | Close wizard |
| `cmWzNext()` | Advance wizard step / save on step 2 |
| `cmWzBack()` | Go back to step 1 |
| `cmRenderPanel()` | Render client card grid in panel-clients |
| `cmRenderSidebar()` | Update active-client chip in sidebar |
| `cmLoadAndSwitch(id)` | Switch active client, push profile to biz-* fields |
| `cmPushProfileToForm(client)` | Populate all biz-* form fields from client object |
| `cmOpenEdit(id)` | Open Edit modal pre-filled |
| `cmSaveEdit()` | Save edits from Edit modal |
| `cmConfirmDelete(id)` | Delete with confirm dialog |
| `cmRenderSwatches(containerId, selectedColor)` | Render color swatches with `data-selected` |
| `cmSelectSwatch(containerId, color)` | Select a swatch (sets `data-selected="1"`) |
| `cmGetSelectedSwatch(containerId)` | Returns hex of selected swatch via `[data-selected="1"]` |
| `cmSyncClientToSupabase(client)` | Upsert client to `client_data` table if credentials present |

### Trigger Chain
```
User clicks Clients tab
  → efTab('clients', btn)
  → "clients"===e && (cmRenderPanel(), cmRenderSidebar())
  → panel-clients becomes display:block
  → grid or empty-state is visible
```

---

## sessionStorage Keys
Set by `DashboardShell.jsx` before navigating to rankforge3:

| Key | Value |
|---|---|
| `rf_client` | Active client UUID |
| `rf_sb_url` | Supabase project URL |
| `rf_sb_key` | Supabase anon key |
| `rf_user_id` | Authenticated user UUID |
| `rf_origin` | `window.location.origin` (for Back button) |

---

## Supabase Tables

### `client_data`
`client_id (unique), user_id, biz_name, biz_cat, biz_addr, biz_city, biz_state, biz_zip, biz_phone, biz_website, biz_desc, biz_kw`

### `clients`
`id, user_id, name, city, category, color, seo_score`

### `settings`
`user_id, anthropic_key, google_key, openai_key, gemini_key, yext_key, yext_account, moz_id, moz_secret, brightlocal_key, brightlocal_cid, indexnow_key, gmail_token, fb_token, fb_page_id, linkedin_token, brand_color, agency_name`

---

## Known Issues / Next Session Priorities

1. **Browser confirmation needed** — Clients tab empty state and wizard have not been confirmed working in a live browser. Verify: click Clients tab → empty state visible → Add Client opens wizard → both steps work → client appears in grid → Load pushes to biz-* fields.
2. **DashboardShell.jsx sync untested** — `useEffect` syncs Supabase clients → `rf_clients` localStorage. Not end-to-end tested.
3. **`cmSyncClientToSupabase` upsert** — requires `client_id` unique constraint on `client_data` table. Verify in Supabase dashboard or inserts will duplicate.
4. **"RankForge" in body copy** — product name in descriptive text throughout the tool still reads "RankForge" (no d). Left intentional; if brand rename is universal, search-replace all instances.

---

## Deploy Command
```bash
git add public/rankforge3.html src/components/DashboardShell.jsx
git commit -m "feat: client manager, full-screen, RankForgedAI branding, checkbox fix"
git push
# Vercel auto-deploys in ~2 minutes
```
