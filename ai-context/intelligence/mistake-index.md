# Mistake Index

## Purpose

This file tracks recurring mistakes, failed approaches, and anti-patterns.

The goal is to prevent Claude from repeating ineffective solutions.

---

# DEVELOPMENT MISTAKES

## MIST-001

### Pattern

Rewriting large sections of working code.

### Why It Failed

Introduced new bugs while attempting to solve a small issue.

### Correct Approach

Apply the smallest possible fix.

### Frequency

Common

---

## MIST-002

### Pattern

Debugging multiple domains simultaneously.

### Why It Failed

Created confusion between UI, database, and authentication issues.

### Correct Approach

Use AUTO_DEBUG_ROUTER and isolate one domain.

### Frequency

Common

---

## MIST-003

### Pattern

Changing architecture before confirming root cause.

### Why It Failed

Increased complexity without solving the issue.

### Correct Approach

Diagnose first. Modify architecture only when evidence supports it.

### Frequency

Occasional

---

# DEPLOYMENT MISTAKES

## MIST-004

### Pattern

Assuming production failures are code issues.

### Why It Failed

Root cause was environment configuration.

### Correct Approach

Run DEPLOYMENT_QUICK_CHECK first.

### Frequency

Very Common

---

## MIST-005

### Pattern

Skipping browser console and network inspection.

### Why It Failed

Actual error messages were ignored.

### Correct Approach

Inspect Console and Network tab before coding changes.

### Frequency

Common

---

# CLAUDE-SPECIFIC MISTAKES

## MIST-006

### Pattern

Loading excessive context.

### Why It Failed

Increased token usage and timeout risk.

### Correct Approach

Use minimal context loading.

### Frequency

Common

---

## MIST-007

### Pattern

Repeating previously failed fixes.

### Why It Failed

No new evidence was gathered.

### Correct Approach

Check debug-index.md and debug history before retrying.

### Frequency

Common

---

# GOLDEN RULE

If a mistake appears more than twice:

1. Create a formal entry
2. Add prevention steps
3. Link to related debug issue IDs

---

# END OF MISTAKE INDEX
