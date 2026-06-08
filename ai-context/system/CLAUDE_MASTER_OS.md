# Claude Master OS (Unified Project Control System)

## Purpose

This is the single entry point for all Claude interactions in this project.

It governs:

* Context loading
* Debugging behavior
* File prioritization
* Memory management
* Anti-loop enforcement
* Token reduction strategy

---

# SYSTEM PRINCIPLE

> Claude must NOT read the entire project.
> Claude must operate like a modular system, loading only what is required.

---

# MODE SELECTION (MANDATORY FIRST STEP)

Before doing anything, classify the user request into ONE mode:

---

## 1. DEBUG MODE

Use when fixing errors, bugs, or unexpected behavior.

Triggers:

* Something is broken
* UI not working
* API issues
* Auth problems
* Deployment failures

---

## 2. BUILD MODE

Use when creating new features or components.

Triggers:

* New functionality requested
* No existing system failure
* Enhancements or additions

---

## 3. ANALYSIS MODE

Use when reviewing architecture, decisions, or strategy.

Triggers:

* System design questions
* Tradeoffs
* Optimization discussions

---

## 4. UNKNOWN MODE (SAFE MODE)

Use when unclear or mixed signals exist.

Rules:

* Do NOT modify code
* Only ask questions or gather logs

---

# STEP 1 — CORE FILES (ALWAYS LOAD FIRST)

Regardless of mode:

* `ai-rules.md`
* `current-sprint.md`
* `mistakes-to-avoid.md`

These define constraints and current state.

---

# STEP 2 — LOAD MODE MODULES

## DEBUG MODE

Run Auto Debug Router:

* `AUTO_DEBUG_ROUTER.md`
* Then load ONLY the selected domain:

### AUTH

* `debug/auth-issues.md`
* `mistakes/authentication.md`

### DATABASE

* `debug/database-issues.md`
* `mistakes/supabase.md`
* `database-decisions.md`

### UI

* `debug/ui-issues.md`
* `mistakes/react.md`
* `ui-decisions.md`

### DEPLOYMENT

* `debug/deployment-issues.md`
* `mistakes/deployment.md`

Then apply:

* `claude-anti-loop.md`
* `TOKEN_REDUCTION_MODE.md`

---

## BUILD MODE

Load:

* `architecture.md`
* `business-rules.md`
* `coding-standards.md`
* `feature-registry.md` (if exists)
* `system-map.md` (if exists)

Then:

* Respect all constraints in `ai-rules.md`
* Check `decisions/` before creating new structures

---

## ANALYSIS MODE

Load ONLY:

* `architecture.md`
* `decisions/*.md`
* `business-rules.md`

DO NOT modify code in this mode.

---

## UNKNOWN MODE

Load ONLY:

* `ai-rules.md`
* `current-sprint.md`

Then ask clarifying questions.

---

# STEP 3 — TOKEN REDUCTION ENFORCEMENT

You MUST:

* Avoid loading full history files
* Use index-based lookup when available
* Prefer summaries over full logs
* Limit context to 2–4 files per task

---

# STEP 4 — LOOP PREVENTION SYSTEM

Before applying any fix:

You MUST check:

* `mistakes-to-avoid.md`
* relevant `debug/*.md`

If match exists:

→ DO NOT repeat solution
→ Identify why previous fix failed
→ Adjust strategy, not structure

---

# STEP 5 — ANTI-REWRITE RULE

You are NOT allowed to:

* Rebuild working systems
* Replace frameworks
* Rewrite entire components
* Change architecture without proof
* Fix configuration issues with code rewrites

---

# STEP 6 — DECISION PRIORITY ORDER

When multiple solutions exist:

1. Configuration fix (best)
2. Data/query fix
3. Logic/state fix
4. UI fix
5. Architecture change (last resort)

---

# STEP 7 — PERFORMANCE RULES

To prevent timeouts:

* Never load entire `/ai-context`
* Never load multiple domain folders
* Never load full debug history
* Prefer minimal file sets
* Prefer diagnosis over execution

---

# STEP 8 — REQUIRED OUTPUT FORMAT

Before making changes, you must output:

1. Mode Selected
2. Files Loaded
3. Root Cause Hypothesis
4. Evidence Required
5. Minimal Safe Fix

---

# STEP 9 — SYSTEM OVERRIDE RULE

If instructions conflict:

Priority order:

1. `ai-rules.md`
2. `CLAUDE_MASTER_OS.md`
3. Domain-specific files
4. All other context

---

# FINAL PRINCIPLE

> “Claude is not a reader of everything. Claude is a router of relevance.”

---

# END OF MASTER OS
