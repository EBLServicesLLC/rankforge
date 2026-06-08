# Auto Fix Generator (Safe Patch Engine)

## PURPOSE

This system converts a diagnosed deployment or runtime issue into a **minimal, safe, targeted fix plan**.

It explicitly prevents:

* rewrites
* architecture changes
* unnecessary refactors
* looping debugging attempts

---

# CORE PRINCIPLE

> “Fix only what is proven broken. Nothing more.”

---

# INPUT REQUIREMENT

This system MUST be used ONLY after:

* `DEPLOYMENT_DIAGNOSER.md` OR
* equivalent root-cause classification is completed

If no diagnosis exists → STOP.

---

# STEP 1 — ACCEPTED INPUT FORMAT

Claude must receive:

* Issue Type (Env / Routing / DB / Build / Runtime)
* Root Cause (confirmed or highly likely)
* Evidence (logs, errors, symptoms)

---

# STEP 2 — FIX GENERATION RULE

The system must output ONLY:

### 1. ROOT CAUSE SUMMARY (1–2 lines)

What is broken and why

### 2. EXACT FIX (minimal change only)

No redesigns, no rewrites

### 3. FILES AFFECTED

Only files that must change

### 4. VALIDATION STEP

How to confirm fix worked

---

# STEP 3 — FIX PRIORITY ENGINE

All fixes must follow this order:

## 1. CONFIG FIX (HIGHEST PRIORITY)

* env variables
* hosting settings
* routing config

---

## 2. PERMISSION / DATA FIX

* Supabase RLS
* API access rules
* database policies

---

## 3. SMALL LOGIC FIX

* React state fixes
* conditional rendering
* API handling adjustments

---

## 4. UI FIX (LAST RESORT)

* layout adjustments
* styling corrections

---

## 5. ARCHITECTURE CHANGE (FORBIDDEN unless explicitly approved)

---

# STEP 4 — ANTI-OVERFIX RULE

You MUST NOT:

* rewrite components
* replace frameworks
* restructure folders
* refactor unrelated code
* “clean up while fixing”

---

# STEP 5 — MINIMAL PATCH RULE

Every fix must:

* target ONE root cause
* modify the smallest possible surface area
* avoid cascading changes

---

# STEP 6 — ENVIRONMENT FIX PATTERN

If issue is ENV-related:

Fix MUST include:

* exact variable name
* exact location (hosting dashboard)
* redeploy instruction

Example structure:

* Set `VITE_SUPABASE_URL`
* Add in Vercel → Environment Variables
* Redeploy project

---

# STEP 7 — ROUTING FIX PATTERN

If issue is SPA routing:

Fix MUST include:

```text
/* → /index.html
```

And confirm:

* refresh behavior works
* deep links load correctly

---

# STEP 8 — DATABASE FIX PATTERN

If issue is Supabase / DB:

Fix MUST include:

* RLS policy adjustment OR
* query correction OR
* schema mismatch correction

NEVER assume frontend fix first.

---

# STEP 9 — VALIDATION REQUIREMENT

Every fix must include:

## HOW TO VERIFY

Example:

* refresh page
* check console
* test API response
* confirm network tab success

If no validation exists → fix is incomplete

---

# STEP 10 — LOOP PREVENTION RULE

If a fix has been attempted before:

* check `debug-index.md`
* check `mistakes-to-avoid.md`

If match found:

→ DO NOT repeat same fix pattern
→ escalate to deeper diagnosis instead

---

# STEP 11 — OUTPUT FORMAT (MANDATORY)

Every response MUST follow:

---

## ROOT CAUSE

(1–2 lines only)

## FIX

(step-by-step minimal actions)

## FILES AFFECTED

(list only)

## VALIDATION

(how to confirm success)

---

# GOLDEN RULE

> “A correct fix is the smallest possible change that fully resolves a confirmed root cause.”

---

# END OF AUTO FIX GENERATOR
