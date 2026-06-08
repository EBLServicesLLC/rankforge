# Project Index Dashboard

## PURPOSE

This file is the single source of navigation for the entire AI context system.

It provides:

* Full map of all AI context files
* Domain separation overview
* Debug routing index
* Decision tracking map
* Quick lookup system for Claude

---

# SYSTEM OVERVIEW

This project is structured into 5 core intelligence layers:

1. Core Rules Layer
2. Execution Control Layer
3. Debug Intelligence Layer
4. Decision Memory Layer
5. Performance Optimization Layer

---

# 1. CORE RULES LAYER (Always Load First)

These define how Claude behaves globally:

* `CLAUDE_MASTER_OS.md`
* `CLAUDE_LAUNCHER.md`
* `CLAUDE_CONTEXT_BOOTLOADER.md`
* `CLAUDE_STARTUP_PROMPT.md`
* `ai-rules.md`

---

# 2. EXECUTION CONTROL LAYER

These control how tasks are executed:

* `AUTO_DEBUG_ROUTER.md`
* `claude-anti-loop.md`
* `TOKEN_REDUCTION_MODE.md`

---

# 3. DOMAIN DEBUG SYSTEM (PRIMARY TROUBLESHOOTING MAP)

## AUTHENTICATION

Handles login, sessions, users

* `debug/auth-issues.md`
* `mistakes/authentication.md`

---

## DATABASE (Supabase)

Handles data, queries, RLS, API

* `debug/database-issues.md`
* `mistakes/supabase.md`
* `database-decisions.md`

---

## UI / FRONTEND (React)

Handles layout, rendering, state, routing

* `debug/ui-issues.md`
* `mistakes/react.md`
* `ui-decisions.md`

---

## DEPLOYMENT

Handles hosting, builds, production issues

* `debug/deployment-issues.md`
* `mistakes/deployment.md`

---

# 4. DECISION MEMORY LAYER

Tracks architecture and past system choices:

* `architecture.md`
* `business-rules.md`
* `coding-standards.md`
* `decisions/architecture-decisions.md`
* `decisions/database-decisions.md`
* `decisions/ui-decisions.md`

---

# 5. FEATURE + STATE LAYER

Tracks current work and system state:

* `current-sprint.md`
* `feature-registry.md` (if exists)
* `system-map.md` (if exists)
* `memory.md`

---

# 6. DEBUG INTELLIGENCE LAYER

Tracks failures and prevents repeated mistakes:

* `mistakes-to-avoid.md`
* `debug-history.md`
* `debug-index.md` (critical for token reduction)

---

# 7. TOKEN OPTIMIZATION LAYER

Used to prevent timeouts and context overload:

* `TOKEN_REDUCTION_MODE.md`
* `debug-index.md`

---

# FILE LOADING RULES (CRITICAL)

Claude MUST follow these rules:

## RULE 1 — NEVER LOAD EVERYTHING

Only load files relevant to the task domain.

---

## RULE 2 — MAX 2–4 FILES PER TASK

Exceeding this increases timeout risk and reduces accuracy.

---

## RULE 3 — USE INDEX BEFORE FULL FILES

Always check:

* `debug-index.md`

Before reading full debug history.

---

## RULE 4 — DOMAIN ISOLATION

Never mix:

* Auth + Database + UI + Deployment in same pass

---

# DEBUG FLOW MAP

When debugging:

1. Identify domain
2. Load only domain files
3. Check `mistakes-to-avoid.md`
4. Check `debug-index.md`
5. Apply minimal fix
6. Log result back into index system

---

# DECISION RULES

Before changing architecture:

You MUST verify:

* Has this been decided already?
* Is this documented in `decisions/`?
* Is this a real requirement or assumption?

If already decided → DO NOT override

---

# PERFORMANCE RULES

To prevent timeouts:

* Avoid full-folder reads
* Avoid historical file scans
* Prefer indexed summaries
* Prefer minimal context
* Prefer diagnostic questions over assumptions

---

# SYSTEM GOLDEN RULE

> “If Claude reads less but correctly, it performs better.”

---

# QUICK ACCESS MAP

## If something is broken:

→ `AUTO_DEBUG_ROUTER.md`

## If Claude is looping:

→ `claude-anti-loop.md`

## If responses are slow:

→ `TOKEN_REDUCTION_MODE.md`

## If unsure where to start:

→ `CLAUDE_MASTER_OS.md`

## If confused about structure:

→ THIS FILE (PROJECT_INDEX_DASHBOARD.md)

---

# END OF DASHBOARD
