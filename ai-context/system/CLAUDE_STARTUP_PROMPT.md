
# Claude Startup Prompt (System Entry Protocol)

## Purpose

This is the ONLY prompt that should be used to initialize Claude for this project.

It enforces strict context loading, prevents over-reading files, and eliminates repetitive debugging loops.

---

# STARTUP INSTRUCTIONS (COPY + USE EVERY SESSION)

You are working inside a structured AI-assisted development system.

Your job is NOT to read the entire project.

Your job is to load ONLY the minimum required context to solve the current task.

---

# STEP 1 — LOAD CORE CONTEXT ONLY

Always begin by reading ONLY:

* `ai-rules.md`
* `current-sprint.md`
* `mistakes-to-avoid.md`

Do NOT read any other files yet.

---

# STEP 2 — IDENTIFY TASK TYPE BEFORE DOING ANYTHING

Classify the request into ONE category:

* AUTH (login, sessions, users)
* DATABASE (Supabase, queries, RLS, missing data)
* UI (React, layout, components, styling)
* DEPLOYMENT (hosting, builds, env variables)
* FEATURE DEVELOPMENT (new functionality)
* DEBUG UNKNOWN (requires classification)

---

# STEP 3 — LOAD ONLY THE MATCHING DOMAIN FILES

## AUTH

* `debug/auth-issues.md`
* `mistakes/authentication.md`

## DATABASE

* `debug/database-issues.md`
* `mistakes/supabase.md`
* `database-decisions.md`

## UI

* `debug/ui-issues.md`
* `mistakes/react.md`
* `ui-decisions.md`

## DEPLOYMENT

* `debug/deployment-issues.md`
* `mistakes/deployment.md`

---

# STEP 4 — OPTIONAL FILES (ONLY IF NECESSARY)

Only load if directly required:

* `architecture.md` → system structure questions
* `business-rules.md` → logic or workflows
* `coding-standards.md` → refactoring or consistency
* `decisions/*.md` → only if questioning past decisions
* `debug-history.md` → ONLY if issue is repeated or unclear

---

# STEP 5 — STRICT ANTI-LOOP RULES

You MUST NOT:

* Rebuild working systems
* Repeat previously failed fixes
* Rewrite architecture without evidence
* Assume code is broken before checking configuration
* Load unrelated domains “just in case”

If a fix has already been attempted:

→ STOP
→ Switch to diagnostic mode
→ Ask for logs or evidence
→ Do NOT propose structural changes

---

# STEP 6 — DEBUGGING REQUIREMENT

Before making ANY code changes, you must state:

1. Task Category
2. Files Loaded
3. Likely Root Cause
4. Evidence Needed (if missing)
5. Minimal Safe Fix

---

# STEP 7 — PERFORMANCE RULE

To prevent timeouts:

* Never load more than ONE domain group at a time
* Never read entire `/ai-context`
* Prefer diagnosis over rewriting
* Prefer configuration fixes over code changes

---

# STEP 8 — GOLDEN PRINCIPLE

> The correct fix is almost always the smallest possible change that resolves the actual root cause.

---

# END OF STARTUP PROTOCOL






