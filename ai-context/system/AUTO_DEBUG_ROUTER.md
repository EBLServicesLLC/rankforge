# Auto Debug Router

## Purpose

This system automatically classifies issues into a domain BEFORE any debugging begins.

It prevents incorrect assumptions, wrong file loading, and repeated debugging loops across unrelated systems.

---

# CORE FUNCTION

Before any analysis or code changes:

> You MUST classify the issue into exactly ONE domain.

---

# STEP 1 — DOMAIN CLASSIFICATION RULES

## AUTH DOMAIN

Use when:

* Login issues
* Session persistence problems
* User not recognized
* Protected routes failing
* Supabase auth behavior issues

---

## DATABASE DOMAIN

Use when:

* Missing or incorrect data
* Query failures
* RLS (Row Level Security) issues
* API returns empty results
* Supabase table or schema issues

---

## UI DOMAIN

Use when:

* Layout issues
* Components not rendering
* Styling problems
* React state/render issues
* Routing or navigation issues

---

## DEPLOYMENT DOMAIN

Use when:

* App works locally but fails in production
* Blank screen after deployment
* Environment variables not working
* Build or hosting errors (Vercel/Netlify/etc.)
* 404 on refresh in production

---

## FEATURE DEVELOPMENT DOMAIN

Use when:

* New functionality is being built
* No bug exists yet
* Enhancements or additions requested

---

## UNKNOWN DOMAIN (DEFAULT SAFE MODE)

Use when:

* Issue cannot be confidently classified
* Conflicting symptoms exist
* Multiple systems may be involved

In this mode:
→ Do NOT modify code
→ Only gather information and logs

---

# STEP 2 — DOMAIN CONFIRMATION RULE

You MUST explicitly state:

* Selected Domain
* Why this domain was chosen
* Why other domains were rejected

If uncertain → you must choose UNKNOWN DOMAIN

---

# STEP 3 — FILE LOADING RULES (STRICT)

After classification, ONLY load files from that domain:

## AUTH

* debug/auth-issues.md
* mistakes/authentication.md

## DATABASE

* debug/database-issues.md
* mistakes/supabase.md
* database-decisions.md

## UI

* debug/ui-issues.md
* mistakes/react.md
* ui-decisions.md

## DEPLOYMENT

* debug/deployment-issues.md
* mistakes/deployment.md

---

# STEP 4 — CROSS-DOMAIN PROHIBITION RULE

You are NOT allowed to:

* Mix UI + Database + Auth debugging in same pass
* Load multiple domain folders simultaneously
* Switch domains mid-debug without stating why
* Assume a second system is broken without evidence

---

# STEP 5 — ROOT CAUSE FIRST RULE

Before proposing any fix:

You must identify:

1. What is failing
2. Where the failure originates
3. What system layer is responsible
4. What evidence confirms this

If unclear → request logs instead of guessing

---

# STEP 6 — LOOP PREVENTION SYSTEM

If a similar fix has been attempted before:

→ STOP
→ Compare against `mistakes-to-avoid.md`
→ Do NOT repeat solution pattern
→ Switch to diagnostic-only mode

---

# STEP 7 — MINIMAL FIX RULE

Preferred order of fixes:

1. Configuration fix (best case)
2. Data/query fix
3. State/logic fix
4. UI fix
5. Architecture change (LAST RESORT)

---

# STEP 8 — INVALID BEHAVIOR (FORBIDDEN)

You must NOT:

* Rebuild working systems
* Change architecture without proof
* Rewrite components “to be safe”
* Guess across multiple domains
* Skip classification step

---

# FINAL PRINCIPLE

> Correct debugging starts with correct classification.

If the domain is wrong, every fix will be wrong.

---

# END OF ROUTER






