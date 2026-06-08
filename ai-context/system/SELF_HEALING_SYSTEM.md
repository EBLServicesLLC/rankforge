# Self-Healing System

## PURPOSE

This system continuously detects, isolates, and corrects recurring failures, contradictions, outdated patterns, and ineffective debugging loops within the Claude project environment.

It does NOT rely on memory persistence alone—it enforces structured correction behavior.

---

# CORE PRINCIPLE

> If the system repeats an error, the system must evolve—not retry.

---

# SYSTEM LAYERS

The self-healing system operates across 5 layers:

1. Failure Detection Layer
2. Pattern Recognition Layer
3. Correction Layer
4. Memory Cleanup Layer
5. Prevention Layer

---

# STEP 1 — FAILURE DETECTION RULE

A “failure” is any of the following:

* Same bug appears 2+ times
* Same fix applied repeatedly without resolution
* Contradictory rules across files
* Rewrites of working systems
* Increasing debug complexity instead of simplification
* Timeouts caused by over-reading context

---

# STEP 2 — PATTERN RECOGNITION RULE

When a failure is detected, Claude must classify it as:

## PATTERN TYPES

### 1. LOOPING FIX PATTERN

Repeated attempts at same solution

### 2. MISCLASSIFICATION PATTERN

Wrong domain selected (UI vs DB vs Auth)

### 3. OVER-ENGINEERING PATTERN

Unnecessary rewrites or architecture changes

### 4. CONTEXT OVERLOAD PATTERN

Too many files loaded at once

### 5. SYMPTOM CONFUSION PATTERN

Fixing symptoms instead of root cause

---

# STEP 3 — CORRECTION PROTOCOL

When a pattern is detected:

## REQUIRED ACTIONS

1. STOP current solution attempt
2. Identify root cause of repetition
3. Compare against:

   * `mistakes-to-avoid.md`
   * `debug-index.md`
   * `AUTO_INDEXER.md`
4. Select minimal corrective action
5. Log new pattern if not already present

---

# STEP 4 — SELF-HEALING RESPONSE FORMAT

Before making changes, Claude MUST output:

1. Detected Pattern Type
2. Why system is repeating failure
3. What previous attempts failed
4. Minimal correction strategy
5. Files impacted

---

# STEP 5 — MEMORY CLEANUP RULE

When contradictions are found:

Example:

* Architecture says Supabase is backend
* Another file suggests Firebase

You MUST:

* Flag contradiction
* Identify authoritative source:

  * `CLAUDE_MASTER_OS.md` overrides all
* Mark outdated file as:

  ```
  DEPRECATED (DO NOT USE)
  ```

---

# STEP 6 — INDEX REPAIR RULE

If `debug-index.md` or `decision-index.md` contains:

* duplicate entries
* conflicting root causes
* outdated fixes

Then:

* Merge duplicates
* Keep most recent validated entry
* Mark others as “superseded”

---

# STEP 7 — PREVENTION LOOP RULE

After every fix, Claude MUST ask:

> “Could this failure occur again under a slightly different condition?”

If YES:
→ Add prevention note to `mistakes-to-avoid.md`

---

# STEP 8 — CONTEXT MINIMIZATION RULE

To prevent system degradation:

* Never load full history files by default
* Prefer index files over raw logs
* Prefer summaries over full explanations
* Only expand data when explicitly required

---

# STEP 9 — SYSTEM CONFLICT RESOLUTION RULE

If multiple files conflict:

Priority order:

1. `CLAUDE_MASTER_OS.md`
2. `CLAUDE_LAUNCHER.md`
3. `ai-rules.md`
4. `PROJECT_INDEX_DASHBOARD.md`
5. All others

---

# STEP 10 — AUTO-IMPROVEMENT RULE

If Claude detects:

* repeated debugging patterns across sessions
* growing index inefficiency
* frequent timeouts
* duplicated issue categories

Then it must propose:

* file consolidation
* index restructuring
* folder reorganization
* rule simplification

BUT NOT EXECUTE WITHOUT CONFIRMATION

---

# STEP 11 — SYSTEM HEALTH CHECK (RUN PERIODICALLY)

Claude should evaluate:

## HEALTH METRICS

* Are we repeating the same issues?
* Are indexes growing too large (>500 lines)?
* Are multiple files describing same problem?
* Is Claude loading too many files per task?

If YES → trigger self-healing protocol

---

# STEP 12 — GOLDEN SELF-HEALING RULE

> “A healthy system reduces complexity over time, not increases it.”

---

# END OF SELF-HEALING SYSTEM
