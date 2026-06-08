# GLOBAL

## PURPOSE

This file serves as the permanent operating constitution for this project.

It defines:

* Project identity
* Core technology stack
* Non-negotiable development standards
* AI operating rules
* Architectural principles

This file should remain stable and change infrequently.

---

# PROJECT IDENTITY

Project Name:
RankForgedAI

Project Type:
AI-Powered Local SEO Platform

Purpose:
Provide automated local SEO auditing, ranking analysis, Google Search Console integration, content generation, and business growth insights for small businesses and agencies.

Primary Users:
Solopreneurs, Business Owners, Agencies

---

# TECHNOLOGY STACK

## Frontend

* React
* TypeScript

## Backend

* Supabase

## Database

* PostgreSQL (Supabase)

## Authentication

* Supabase Auth

## Deployment

* Vercel

---

# CORE DEVELOPMENT PRINCIPLES

1. Prefer minimal fixes over rewrites.

2. Fix one confirmed root cause at a time.

3. Avoid architectural changes unless clearly justified.

4. Maintain consistency with existing patterns.

5. Prioritize maintainability over cleverness.

6. Do not refactor unrelated code while fixing issues.

7. Keep solutions simple whenever possible.

---

# DEBUGGING PRINCIPLES

1. Diagnose before fixing.

2. Gather evidence before changing code.

3. Verify root cause before implementing solutions.

4. Use deployment diagnostics for production issues.

5. Avoid debugging multiple domains simultaneously.

6. Document recurring issues in indexes.

7. Do not repeat previously failed approaches.

---

# AI OPERATING RULES

At session start:

1. Load CLAUDE_LAUNCHER.md
2. Load SESSION_HANDOFF.md if available
3. Load only required context

Use:

* FULL_SYSTEM_AUTOPILOT.md for debugging
* SESSION_MANAGEMENT.md for checkpoints and handoffs
* AUTO_FIX_GENERATOR.md for verified fixes

Avoid:

* Loading entire project context
* Reloading historical discussions
* Re-analyzing completed work

---

# CONTEXT MANAGEMENT RULES

Minimize context usage whenever possible.

Priority order:

1. SESSION_HANDOFF.md
2. debug-index.md
3. decision-index.md
4. mistake-index.md

Avoid:

* Large historical logs
* Old chat transcripts
* Resolved debugging sessions

unless specifically required.

---

# ARCHITECTURAL PRINCIPLES

## Separation of Concerns

UI, business logic, data access, and deployment concerns should remain separated.

---

## Single Source of Truth

Indexes are authoritative.

Avoid duplicate documentation.

---

## Incremental Change

Make small, verifiable changes.

Avoid broad system rewrites.

---

# SECURITY PRINCIPLES

1. Never expose secrets or credentials.

2. Use environment variables for sensitive values.

3. Follow least-privilege access.

4. Validate user input.

5. Protect production data.

---

# DOCUMENTATION PRINCIPLES

Project knowledge belongs in:

/project

Operational rules belong in:

/system

Historical learning belongs in:

/intelligence

Deployment procedures belong in:

/deployment

---

# SESSION ROTATION RULE

Do not attempt to preserve unlimited context.

When sessions become large:

1. Generate SESSION_HANDOFF.md
2. Update indexes
3. Start a new conversation
4. Continue from the handoff

A fresh session with a good handoff is preferred over a long-running conversation.

---

# GOLDEN RULE

Use the minimum amount of context necessary to make the correct decision.

Prefer:

Diagnose → Verify → Fix → Validate

over:

Guess → Rewrite → Retry

# END OF GLOBAL
