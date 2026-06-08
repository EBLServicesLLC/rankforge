# Session Management System v2

## PURPOSE

This file provides a standardized process for managing Claude sessions while minimizing context overload, performance degradation, and timeout risk.

Goals:

* Consistent project startup
* Controlled context growth
* Reduced timeout risk
* Reliable handoffs
* Easier continuation between sessions
* Better debugging discipline
* Automatic session rotation

---

# SESSION STATES

There are five session states:

1. Session Start
2. Active Work
3. Session Checkpoint
4. Session Break
5. Session End

---

# SESSION HEALTH SCORE

Evaluate periodically.

## HEALTHY

* Under 20 prompts
* Single domain
* No repeated fixes
* Context remains focused

Action:
Continue work

---

## WARNING

* 20–40 prompts
* Multiple domains discussed
* Two failed fixes attempted
* Growing context complexity

Action:
Generate checkpoint summary

---

## CRITICAL

* 40+ prompts
* Three or more failed fixes
* Context confusion detected
* Multiple active issues
* Session exceeds two hours

Action:

1. Create SESSION_HANDOFF.md
2. Update indexes
3. End current session
4. Start new conversation

---

# SESSION START PROCEDURE

## COMMAND

Run CLAUDE_LAUNCHER.md

## REQUIRED ACTIONS

1. Load launcher
2. Determine mode:

   * DEBUG
   * BUILD
   * ANALYSIS
   * UNKNOWN
3. Identify active domain
4. Load minimum required files
5. Begin work

## OUTPUT

Provide:

* Selected Mode
* Selected Domain
* Files Loaded
* Current Objective

---

# ACTIVE WORK RULES

While working:

* Load minimum required context
* Stay within one domain whenever possible
* Avoid reloading historical files
* Prefer indexes over full logs

Priority order:

1. SESSION_HANDOFF.md
2. debug-index.md
3. decision-index.md
4. mistake-index.md

Avoid:

* debug-history.md
* old session summaries
* resolved issue logs

unless specifically needed.

---

# SESSION ROTATION PROTOCOL

A new conversation should be started when ANY of the following occur:

* 40+ prompts exchanged
* More than 2 hours of active work
* 3+ major issues resolved
* 2+ domains discussed
* Context feels repetitive
* Multiple summaries already generated

Required actions:

1. Generate SESSION_HANDOFF.md
2. Update indexes
3. Close current session
4. Start new chat
5. Load:

   * GLOBAL.md
   * CLAUDE_LAUNCHER.md
   * SESSION_HANDOFF.md

---

# CONTEXT COMPRESSION RULE

If ANY occur:

* 20 prompts on one issue
* 3 failed fixes
* 1 hour debugging same problem

STOP.

Generate SESSION_HANDOFF.md.

The summary must include:

## Root Cause

Current understanding.

## Failed Approaches

List all unsuccessful attempts.

## Successful Findings

Verified information only.

## Current Status

Where work stands now.

## Next Action

Single recommended next step.

Maximum size:

1000 words.

---

# SESSION CHECKPOINT

Perform after:

* Major bug fix
* Major feature completion
* Deployment attempt
* Architecture decision

## COMMAND

Run Session Checkpoint

## OUTPUT

### Completed Work

### Open Items

### Files Modified

### Risks

### Validation Required

---

# SHORT BREAK PROCEDURE

Use for:

* Lunch
* Meeting
* Brief interruption

Duration:

Less than 2 hours

## OUTPUT

### Current Status

### Last Completed Task

### Next Task

### Active Files

No handoff required.

---

# LONG BREAK PROCEDURE

Use for:

* End of day
* Multi-hour interruption
* Context nearing limits

Duration:

More than 2 hours

## REQUIRED ACTION

Generate SESSION_HANDOFF.md

Include:

### Current Objective

### Completed Work

### Decisions Made

### Active Issues

### Files In Focus

### Next Task

---

# SESSION RESUME PROCEDURE

## COMMAND

Resume From Last Checkpoint

## REQUIRED ACTIONS

1. Load SESSION_HANDOFF.md
2. Review open items
3. Review active files only
4. Re-enter prior mode
5. Continue work

## DO NOT

* Reload entire project
* Reload all debug files
* Re-analyze completed work
* Reload historical discussions

---

# SESSION END PROCEDURE

## COMMAND

Run End Session Protocol

## REQUIRED OUTPUT

### Work Completed

### Decisions Made

### Fixes Applied

### Open Work

### Recommended Next Starting Point

### Session Health Score

---

# AUTO INDEX UPDATE

Update if necessary:

* debug-index.md
* decision-index.md
* mistake-index.md

Do not duplicate entries.

Only record verified information.

---

# LONG SESSION PROTECTION

If:

* Repeated debugging loops occur
* Same fix attempted twice
* Domains become mixed
* Context quality degrades

Run:

SELF_HEALING_SYSTEM.md

Then generate SESSION_HANDOFF.md

---

# DEPLOYMENT SESSION RULES

Before deployment:

Run:

DEPLOYMENT_QUICK_CHECK.md

If deployment fails:

Run:

DEPLOYMENT_DIAGNOSER.md

Then:

AUTO_FIX_GENERATOR.md

---

# WEEKLY MAINTENANCE

Once per week:

Review:

* debug-index.md
* decision-index.md
* mistake-index.md

Check for:

* Duplicate entries
* Obsolete fixes
* Contradictory decisions
* Excessive growth

Generate cleanup recommendations.

---

# QUICK COMMAND REFERENCE

## New Session

Run CLAUDE_LAUNCHER.md

## Debug Issue

Run FULL_SYSTEM_AUTOPILOT.md

## Deployment Validation

Run DEPLOYMENT_QUICK_CHECK.md

## Production Failure

Run DEPLOYMENT_DIAGNOSER.md

## Generate Fix

Run AUTO_FIX_GENERATOR.md

## Claude Looping

Run SELF_HEALING_SYSTEM.md

## Session Handoff

Generate SESSION_HANDOFF.md

## End Session

Run End Session Protocol

---

# GOLDEN RULE

Do not attempt to preserve unlimited context.

Instead:

* Compress
* Summarize
* Handoff
* Start fresh

A fresh session with a good handoff is more reliable than a very long conversation.

# END OF SESSION MANAGEMENT SYSTEM
