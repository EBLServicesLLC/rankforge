# Claude Control Panel (AI Operating Dashboard)

## PURPOSE

This file acts as a real-time operational dashboard for all Claude activity within the project.

It tracks:

* Current mode
* Active domain
* Loaded files
* System health
* Debug state
* Risk of loops or timeouts

It does NOT execute code—but it forces structured thinking and prevents uncontrolled context expansion.

---

# SYSTEM STATE HEADER (MUST BE FILLED EACH SESSION)

## ACTIVE MODE

* [ ] DEBUG
* [ ] BUILD
* [ ] ANALYSIS
* [ ] UNKNOWN

---

## ACTIVE DOMAIN (DEBUG MODE ONLY)

* [ ] AUTH
* [ ] DATABASE
* [ ] UI
* [ ] DEPLOYMENT
* [ ] NONE

---

## SYSTEM HEALTH STATUS

* [ ] HEALTHY (no loops detected)
* [ ] WARNING (repeated patterns detected)
* [ ] CRITICAL (loop or timeout risk)

---

## CONTEXT LOAD LEVEL

* [ ] LOW (2–4 files)
* [ ] MEDIUM (5–7 files)
* [ ] HIGH (8+ files) ❌ NOT RECOMMENDED

---

# LIVE FILE TRACKER (CURRENT SESSION)

## CORE FILES (Always Loaded)

* ai-rules.md
* current-sprint.md
* mistakes-to-avoid.md

## DYNAMIC FILES (Session-specific)

(To be filled per task)

* File 1:
* File 2:
* File 3:
* File 4:

---

# DEBUG STATE MACHINE

## STEP 1 — CLASSIFICATION

Has the issue been correctly classified into ONE domain?

* [ ] YES
* [ ] NO → STOP and classify

---

## STEP 2 — INDEX CHECK

Has `debug-index.md` been checked?

* [ ] YES
* [ ] NO → MUST CHECK BEFORE CONTINUING

---

## STEP 3 — PRIOR ATTEMPT CHECK

Has this issue been previously attempted?

* [ ] YES → review `mistakes-to-avoid.md`
* [ ] NO

---

## STEP 4 — ROOT CAUSE IDENTIFIED?

* [ ] YES
* [ ] PARTIAL
* [ ] NO → DO NOT FIX YET

---

## STEP 5 — MINIMAL FIX CONFIRMED?

* [ ] YES
* [ ] NO → refine before executing

---

# LOOP DETECTION MONITOR

## WARNING FLAGS

If ANY of the following are true:

* Same fix attempted twice
* More than 6 files loaded
* Switching domains mid-task
* Rewriting working systems
* Increasing complexity without resolution

Then:

⚠️ ACTIVATE SELF-HEALING MODE

Reference:

* `SELF_HEALING_SYSTEM.md`

---

# FILE LOADING RULE (STRICT CONTROL)

Allowed maximum per task:

* 2 core files (always required)
* 1 domain group
* 1 support file (optional)

MAX: 4 FILES TOTAL

---

# DECISION OVERRIDE RULE

Before making structural changes:

Check:

* `decisions/*.md`
* `architecture.md`

If decision exists:

→ DO NOT OVERRIDE
→ MUST justify with evidence

---

# PERFORMANCE CONTROL

## TIMEOUT RISK INDICATORS

* Loading full debug history
* Loading multiple domains
* Re-reading entire project context
* Repeated reasoning loops

If detected:

→ Reduce scope immediately
→ Switch to diagnostic mode

---

# CURRENT TASK SUMMARY (USER REQUEST)

Fill in:

* Task Type:
* Problem Description:
* Suspected Domain:
* Required Files:

---

# EXECUTION FLOW (MANDATORY)

1. Fill control panel state
2. Classify mode
3. Select domain (if DEBUG)
4. Load minimal files (max 4)
5. Identify root cause
6. Apply minimal fix
7. Log to index system
8. Check for loops

---

# SYSTEM PRIORITY ORDER

If conflicts exist:

1. CLAUDE_MASTER_OS.md
2. CLAUDE_LAUNCHER.md
3. CONTROL PANEL (this file)
4. AUTO_DEBUG_ROUTER.md
5. All others

---

# GOLDEN RULE

> “If it is not visible in the control panel, it does not exist in the current execution state.”

---

# END OF CONTROL PANEL
