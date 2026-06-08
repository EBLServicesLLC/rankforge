# Claude Anti-Loop System

## Purpose

This file prevents repetitive debugging loops, unnecessary rewrites, and over-engineered fixes. It enforces a structured reasoning process before any code changes are made.

---

# Core Rule

> Never repeat a previously attempted fix unless a new root cause has been clearly identified.

---

# Mandatory Debugging Flow

Before making ANY changes, follow this sequence:

## 1. Identify the Category First

Classify the issue:

* Authentication
* Database (Supabase)
* React / UI
* Deployment
* Unknown / Mixed

---

## 2. Check Existing Knowledge Files FIRST

You MUST consult:

### Always Read

* `ai-rules.md`
* `current-sprint.md`
* `mistakes-to-avoid.md`

### Then Read Category File

* Authentication → `mistakes/authentication.md` + `debug/auth-issues.md`
* Database → `mistakes/supabase.md` + `debug/database-issues.md`
* UI → `mistakes/react.md` + `debug/ui-issues.md`
* Deployment → `mistakes/deployment.md` + `debug/deployment-issues.md`

---

## 3. Check for Previous Failed Fixes

If the issue has already been attempted:

### STOP

Do NOT:

* Rebuild components
* Rewrite architecture
* Replace frameworks
* Duplicate previous fixes

Instead:

👉 Identify WHY previous fix failed

---

## 4. Root Cause Before Solution Rule

You must explicitly state:

* What is actually broken
* Why previous assumptions were incorrect
* What evidence supports the root cause

If root cause is unclear → do NOT implement changes yet

---

## 5. Minimal Change Rule

Prefer:

* Small fixes
* Targeted edits
* Configuration changes
* Debug verification steps

Avoid:

* Full rewrites
* Component rebuilds
* System redesigns

---

# Anti-Repetition Rules

You are NOT allowed to:

## 1. Retry identical solutions

If a fix exists in:

* `debug-history.md`
* `mistakes-to-avoid.md`

→ Do not repeat it

---

## 2. Assume code is broken first

Default assumption:

> Configuration or environment issue until proven otherwise

---

## 3. Rebuild working systems

If something partially works:

* Do NOT delete it
* Do NOT replace it entirely

---

## 4. Skip investigation steps

Never jump directly to rewriting code

---

# Debug Decision Tree

## If Auth Issue

→ Check Supabase session → then AuthContext → then RLS

## If Database Issue

→ Check RLS → then query → then schema

## If UI Issue

→ Check layout → then state → then routing

## If Deployment Issue

→ Check env vars → then build output → then hosting config

---

# Loop Detection Rule

If you have suggested the same type of fix twice in a conversation:

### STOP and reassess:

* You are likely missing root cause
* Switch to diagnostic mode only
* Ask for logs or evidence instead of rewriting code

---

# Required Output Format

Before making changes, you MUST respond with:

1. Problem Category
2. Suspected Root Cause
3. Evidence Needed (if missing)
4. Minimal Fix Proposal (if safe)

---

# Golden Rule

> If you feel the need to “rebuild” something, you have not diagnosed deeply enough.

---

# End of System



