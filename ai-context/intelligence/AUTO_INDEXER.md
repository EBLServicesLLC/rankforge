# Auto Indexer System

## PURPOSE

This system automatically maintains a compressed, queryable index of all debugging activity, decisions, and recurring issues.

It prevents:

* Re-reading full debug logs
* Duplicate fixes
* Memory fragmentation
* Repeated Claude mistakes
* Context overload and timeouts

---

# CORE PRINCIPLE

> Full logs are storage. Indexes are intelligence.

Claude must ALWAYS write to the index after resolving or identifying an issue.

---

# SYSTEM COMPONENTS

This system manages three core index files:

## 1. debug-index.md (PRIMARY)

Fast lookup table of all known issues

## 2. decision-index.md

Compressed architecture and product decisions

## 3. mistake-index.md

Recurring failure patterns and anti-patterns

---

# STEP 1 — ISSUE DETECTION RULE

When any of the following occurs:

* Bug reported
* Feature failure
* Unexpected behavior
* Deployment issue
* Auth/database/UI error

You MUST create or update an index entry.

---

# STEP 2 — INDEX ENTRY FORMAT

All entries MUST follow this structure:

```
ID: AUTH-001 / DB-003 / UI-005 / DEP-002

Title: Short descriptive name

System: Auth | Database | UI | Deployment

Symptom:
One-line description of issue

Root Cause:
Actual confirmed cause (NOT assumption)

Fix:
Minimal working fix

Status:
Resolved | Partial | Unresolved

Date:
YYYY-MM-DD
```

---

# STEP 3 — AUTO CLASSIFICATION RULE

Every issue MUST be categorized:

## AUTH

Login, session, user identity

## DATABASE

Supabase, queries, RLS, missing data

## UI

React, layout, rendering, state, routing

## DEPLOYMENT

Hosting, build, env vars, production issues

## UNKNOWN

Only if classification cannot be determined

---

# STEP 4 — WRITE-BACK RULE (MANDATORY)

After resolving any issue, Claude MUST:

1. Add entry to `debug-index.md`
2. Reference full log only if needed
3. Update `mistakes-to-avoid.md` if it is a new failure pattern
4. Do NOT duplicate full explanations in multiple files

---

# STEP 5 — COMPRESSION RULE

Never store full explanations in indexes.

Indexes must be:

* Short
* Searchable
* Structured
* Minimal

Full explanations go ONLY in domain files.

---

# STEP 6 — DUPLICATE DETECTION RULE

Before creating a new index entry:

Claude MUST:

* Search existing `debug-index.md`
* Check for similar symptom or root cause
* If match exists:
  → UPDATE existing entry instead of creating new one

---

# STEP 7 — LOOP PREVENTION IN INDEXING

If the same issue appears 2+ times:

You MUST:

* Flag as “RECURRING ISSUE”
* Link all related IDs
* Add warning to `mistakes-to-avoid.md`

Example:

```
WARNING: AUTH-001 recurring 3 times
Root cause likely misunderstood session handling
```

---

# STEP 8 — DECISION INDEX RULE

For all architecture or system-level choices:

Create entry in `decision-index.md`:

Format:

```
ID: DEC-001

Decision: Supabase for backend

Reason:
Short explanation

Alternatives:
List rejected options

Impact:
What this affects

Date:
YYYY-MM-DD
```

---

# STEP 9 — MISTAKE INDEX RULE

For repeated failures or wrong approaches:

Add to `mistake-index.md`:

```
ID: MIST-001

Pattern:
Rebuilding components instead of fixing state/config

Why it's wrong:
Causes unnecessary system rewrites

Correct behavior:
Fix root cause before structural changes
```

---

# STEP 10 — AUTOMATIC UPDATE TRIGGER

The index MUST be updated when:

* Bug is fixed
* Root cause is identified
* A failed attempt is detected
* A recurring pattern is observed
* A decision is made

---

# STEP 11 — PERFORMANCE RULE

To prevent timeouts:

* Never read full debug history for indexing
* Only append or update entries
* Use IDs instead of full descriptions
* Keep index files lightweight (<500 lines preferred)

---

# STEP 12 — GOLDEN RULE

> “If it is not indexed, it does not exist for Claude.”

---

# SYSTEM OUTPUT REQUIREMENT

After every debugging session, Claude MUST output:

1. New/Updated Index Entries
2. Files Modified
3. Issue ID(s)
4. Root Cause Summary (1–2 lines)

---

# END OF AUTO INDEXER
