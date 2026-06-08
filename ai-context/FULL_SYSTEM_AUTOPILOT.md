# FULL SYSTEM AUTOPILOT (Unified Execution Engine)

## PURPOSE

This file is the highest-level orchestration system for the entire Claude AI context architecture.

It combines:

* diagnosis
* routing
* fix generation
* indexing
* loop prevention
* self-healing

into one controlled workflow.

---

# CORE PRINCIPLE

> “No guessing. No rewriting. Only classified, minimal, validated fixes.”

---

# SYSTEM OVERVIEW

Autopilot runs in 5 phases:

1. Intake & Classification
2. Context Loading (Minimal)
3. Diagnosis
4. Fix Generation
5. Logging & Self-Healing Update

---

# PHASE 1 — INTAKE & MODE SELECTION

Classify request into ONE mode:

## DEBUG MODE

Something is broken

## BUILD MODE

New feature or enhancement

## ANALYSIS MODE

Architecture / design reasoning

## UNKNOWN MODE

Not enough information → no changes allowed

---

# PHASE 2 — DOMAIN ROUTING (DEBUG ONLY)

If DEBUG MODE:

Run:

→ `AUTO_DEBUG_ROUTER.md`

Select ONE domain only:

* AUTH
* DATABASE
* UI
* DEPLOYMENT

Then load ONLY relevant files.

---

# PHASE 3 — CONTEXT LOADING RULE (STRICT)

Always load:

* `ai-rules.md`
* `current-sprint.md`
* `mistakes-to-avoid.md`

Then:

Load MAX 1 domain group (2–3 files only)

Never exceed 4 total files.

---

# PHASE 4 — DIAGNOSIS ENGINE

If DEPLOYMENT issue:
→ Run `DEPLOYMENT_DIAGNOSER.md`

If general debug:
→ Identify:

* What is broken
* Where it breaks
* Why it breaks
* Evidence required

If unclear:
→ STOP and request logs

---

# PHASE 5 — FIX GENERATION ENGINE

Run:

→ `AUTO_FIX_GENERATOR.md`

Rules:

* ONE root cause only
* ONE minimal fix only
* NO architecture changes
* NO rewrites
* NO refactors unless explicitly required

---

# PHASE 6 — SELF-HEALING & INDEX UPDATE

After fix is applied:

MUST update:

## 1. debug-index.md

Add or update issue ID

## 2. mistake-index.md

If new failure pattern discovered

## 3. debug-history.md (optional)

Only if deeper explanation needed

---

# LOOP PREVENTION SYSTEM

If any of the following occur:

* Same issue appears multiple times
* Same fix attempted twice
* Increasing number of files loaded
* Switching domains mid-task
* Fix complexity increasing

→ ACTIVATE SELF-HEALING MODE

Reference:

* `SELF_HEALING_SYSTEM.md`

---

# TOKEN CONTROL RULE

To prevent timeouts:

* Max 2–4 files per task
* Prefer index files over full logs
* Never load full `/ai-context`
* Avoid cross-domain loading

---

# DECISION PRIORITY RULE

Always prefer:

1. Configuration fix
2. Permission / data fix
3. Logic fix
4. UI fix
5. Architecture change (LAST RESORT)

---

# REQUIRED OUTPUT FORMAT

Every Autopilot run MUST output:

## MODE

Selected mode

## DOMAIN

Selected domain (if DEBUG)

## ROOT CAUSE

Confirmed issue

## FIX

Minimal actionable change

## FILES MODIFIED

List only affected files

## VALIDATION

How to confirm fix worked

---

# SAFETY LOCKS

Autopilot MUST NEVER:

* Rebuild working systems
* Replace frameworks
* Rewrite full components
* Load all project context
* Guess across multiple domains
* Apply unverified architectural changes

---

# FAILURE HANDLING RULE

If Autopilot cannot confidently determine root cause:

→ Switch to UNKNOWN MODE
→ Ask for logs or reproduction steps
→ Do NOT modify code

---

# SYSTEM PRIORITY ORDER (OVERRIDES)

If conflicts exist:

1. `CLAUDE_MASTER_OS.md`
2. `CLAUDE_LAUNCHER.md`
3. `FULL_SYSTEM_AUTOPILOT.md`
4. `AUTO_FIX_GENERATOR.md`
5. `DEPLOYMENT_DIAGNOSER.md`
6. All other files

---

# GOLDEN RULE

> “Autopilot does not think more. It filters better.”

---

# END OF AUTOPILOT SYSTEM
