# Deployment Diagnoser (Auto Root-Cause Finder)

## PURPOSE

This tool helps identify the *real cause* of deployment issues BEFORE any debugging begins.

Most deployment failures come from configuration, not code.

This system forces correct classification first.

---

# STEP 1 — SYMPTOM CLASSIFICATION (MANDATORY)

Select the primary symptom:

## A. BLANK PAGE / WHITE SCREEN

→ Likely: build failure, JS error, or env issue

## B. 404 ON REFRESH

→ Likely: SPA routing issue

## C. API / DATA NOT LOADING

→ Likely: env vars or RLS issue

## D. WORKS LOCALLY BUT NOT DEPLOYED

→ Likely: environment or build config mismatch

## E. PARTIAL UI BROKEN

→ Likely: asset path or hydration mismatch

---

# STEP 2 — DIAGNOSTIC QUESTION SET (ANSWER IN ORDER)

Claude must evaluate these before proposing ANY fix:

---

## 1. BUILD STATUS

* Did `npm run build` succeed locally?
* Any warnings or errors ignored?

---

## 2. ENVIRONMENT VARIABLES

* Are all required env vars set in hosting platform?
* Do variable names EXACTLY match local `.env`?
* Were changes followed by redeploy?

---

## 3. ROUTING CHECK (CRITICAL FOR SPAs)

* Is SPA fallback configured?
* Does refresh cause 404?

Expected fix:

```id="r1f92r"
/* → /index.html
```

---

## 4. API CONNECTIVITY

* Can API be accessed directly (outside frontend)?
* Does Supabase respond in production?
* Are RLS policies blocking data?

---

## 5. CONSOLE CHECK

* Any runtime errors?
* Any CORS issues?
* Any missing module errors?

---

## 6. HOSTING CONFIGURATION

* Correct build folder (`dist`)?
* Correct framework preset (Vite/React)?
* Correct domain routing?

---

# STEP 3 — ROOT CAUSE CLASSIFICATION ENGINE

After answering questions, classify into ONE:

## 1. ENVIRONMENT FAILURE (MOST COMMON)

* Missing or incorrect env vars
* Wrong API keys
* Missing production config

---

## 2. ROUTING FAILURE

* SPA fallback missing
* 404 on refresh
* Incorrect base path

---

## 3. DATABASE / SUPABASE FAILURE

* RLS blocking access
* Wrong table permissions
* Auth mismatch between dev/prod

---

## 4. BUILD FAILURE

* Broken production build
* Incorrect output directory
* Vite/Webpack misconfig

---

## 5. FRONTEND RUNTIME FAILURE (RARE)

* React errors
* hydration mismatch
* broken component logic

---

# STEP 4 — DECISION RULE (VERY IMPORTANT)

Claude MUST follow this priority:

1. Environment issues FIRST
2. Routing issues SECOND
3. Database issues THIRD
4. Code issues LAST

---

# STEP 5 — MINIMAL FIX GENERATION RULE

Once root cause is identified:

You MUST provide:

* One-line diagnosis
* Exact fix
* Why this is the cause

NO architecture changes allowed unless explicitly required.

---

# STEP 6 — RED FLAG DETECTION

If ANY of these appear:

* “It might be multiple issues”
* “We should rebuild the frontend”
* “Let’s refactor everything”

→ STOP

Switch to diagnostic-only mode.

---

# STEP 7 — QUICK DECISION TREE

```
Is it production-only issue?
    ↓
YES → Check env vars
    ↓
Still broken?
    ↓
Check routing (SPA)
    ↓
Still broken?
    ↓
Check RLS / API
    ↓
Still broken?
    ↓
Check build output
```

---

# GOLDEN RULE

> “Deployment issues are 90% configuration, 10% code.”

---

# END OF DIAGNOSER
