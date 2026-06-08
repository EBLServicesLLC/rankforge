# Claude Context Bootloader

## Purpose

This file controls how Claude loads project context. It enforces strict file prioritization to reduce token usage, prevent timeouts, and stop unnecessary reasoning over irrelevant documentation.

---

# SYSTEM BEHAVIOR RULE

You MUST NOT load or read all files.

You MUST selectively load only the minimum required context for the task.

---

# STEP 1 — ALWAYS READ FIRST (Mandatory Core)

These files are ALWAYS required for every task:

* `ai-rules.md`
* `current-sprint.md`
* `mistakes-to-avoid.md`

If any of these are missing → STOP and request them.

---

# STEP 2 — SELECT ONE DOMAIN CONTEXT (Only One Allowed)

You may ONLY load ONE of the following groups depending on the task:

---

## AUTH DOMAIN (only if auth-related issue)

* `debug/auth-issues.md`
* `mistakes/authentication.md`

---

## DATABASE DOMAIN (only if data-related issue)

* `debug/database-issues.md`
* `mistakes/supabase.md`
* `database-decisions.md`

---

## UI DOMAIN (only if frontend/layout issue)

* `debug/ui-issues.md`
* `mistakes/react.md`
* `ui-decisions.md`

---

## DEPLOYMENT DOMAIN (only if hosting issue)

* `debug/deployment-issues.md`
* `mistakes/deployment.md`

---

# STEP 3 — OPTIONAL SUPPORT FILES (Only if explicitly needed)

Load ONLY if directly relevant:

* `architecture.md` → system structure questions
* `business-rules.md` → logic/business behavior
* `coding-standards.md` → refactors or code quality
* `decisions/*.md` → only if questioning past design choices
* `debug-history.md` → only if issue is repeated or unclear

---

# STEP 4 — FORBIDDEN BEHAVIOR

You are NOT allowed to:

* Load all files at once
* Re-read entire project context
* Rebuild working systems without proof of failure
* Use previous solutions without checking `mistakes-to-avoid.md`
* Switch domains mid-task without confirmation

---

# STEP 5 — LOOP PREVENTION RULE

If the same type of fix has already been attempted:

→ STOP
→ Switch to diagnostic mode only
→ Ask for logs or evidence
→ Do NOT propose new architecture

---

# STEP 6 — RESPONSE FORMAT REQUIRED

Before making changes, you must output:

1. Selected Domain
2. Files Loaded
3. Suspected Root Cause
4. Minimal Safe Fix (if applicable)

---

# STEP 7 — PERFORMANCE OPTIMIZATION RULE

To avoid timeouts:

* Prefer reading 2–4 files max per task
* Never exceed one domain group unless explicitly required
* Do not summarize entire project unless asked

---

# FINAL SYSTEM DIRECTIVE

> “Less context = better accuracy. Load only what is required to solve the problem.”

---

# END OF BOOTLOADER






