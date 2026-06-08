# Token Reduction Mode

## Purpose

This system reduces context size by preventing Claude from rereading full history files.

Instead of loading long logs, Claude must use indexed summaries and only expand details when explicitly needed.

This directly reduces:

* Timeouts
* Context overload
* Repeated debugging cycles
* Re-reading large markdown files unnecessarily

---

# CORE RULE

> Never reread full history files unless absolutely required.

Use summaries first. Expand only on demand.

---

# STEP 1 — LARGE FILE HANDLING RULE

The following files are considered “HIGH TOKEN RISK”:

* `debug-history.md`
* `decisions.md`
* `mistakes-to-avoid.md` (if large)
* Any file > 300 lines

These files MUST NOT be fully loaded by default.

---

# STEP 2 — INDEXED MEMORY SYSTEM

Instead of reading full files, Claude must rely on indexed summaries.

Create or maintain summary blocks like:

---

## debug-index.md (required companion file)

Example format:

### AUTH ISSUES

* AUTH-001: Session not persisting (Supabase session misconfig)
* AUTH-002: Protected routes redirect loop (AuthContext init order)

---

### DATABASE ISSUES

* DB-001: RLS blocking reads (policy misconfiguration)
* DB-002: Empty query results (wrong table name)

---

### UI ISSUES

* UI-001: Sidebar disappearing (overflow hidden issue)
* UI-002: Blank screen (route mismatch)

---

### DEPLOYMENT ISSUES

* DEP-001: Blank production build (missing env vars)
* DEP-002: 404 on refresh (SPA routing not configured)

---

# STEP 3 — LOOKUP RULE (MANDATORY)

Before reading any full debug file:

1. Check `debug-index.md`
2. Identify matching issue ID
3. Only THEN open the full file section (if needed)

If no match exists → ask for clarification or logs

---

# STEP 4 — SUMMARIZATION RULE

When new issues are resolved:

You MUST:

* Add a short entry to index file
* Avoid adding full explanation to main history
* Store full details ONLY if necessary

---

# STEP 5 — FILE SPLITTING RULE

If any file exceeds 300–500 lines:

You MUST split it into:

Example:

```
debug-history.md → debug/
debug/auth-issues.md
debug/database-issues.md
debug/ui-issues.md
debug/deployment-issues.md
```

Then update index accordingly.

---

# STEP 6 — MEMORY COMPRESSION RULE

Instead of repeating full explanations:

Use format:

* Issue ID
* One-line cause
* One-line fix

NOT full narrative unless requested.

---

# STEP 7 — ANTI-TIMEOUT RULE

To prevent system overload:

You MUST NEVER:

* Load full debug history
* Load all decision files at once
* Re-read entire /ai-context folder
* Combine multiple large files in a single pass

Preferred load size:
→ 2–4 small files maximum per task

---

# STEP 8 — RECURRING ISSUE HANDLING

If an issue appears repeatedly:

You must:

1. Identify existing Issue ID
2. Reference it instead of re-debugging
3. Only investigate if behavior has changed

Do NOT re-solve identical problems repeatedly.

---

# STEP 9 — GOLDEN RULE

> “Summaries are the source of truth. Full files are secondary reference only.”

---

# END OF TOKEN REDUCTION SYSTEM
