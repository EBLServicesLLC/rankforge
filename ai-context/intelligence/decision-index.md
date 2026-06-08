# Decision Index

## Purpose

This file contains high-level project decisions.

It acts as the authoritative reference for architectural and strategic choices.

Before changing architecture, check this file first.

---

# ARCHITECTURE DECISIONS

## DEC-001

### Decision

Use Supabase as backend platform.

### Reason

Provides authentication, database, storage, and APIs in a unified platform.

### Alternatives Considered

* Firebase
* Custom backend
* Appwrite

### Impact

Affects:

* Authentication
* Database
* User management
* API architecture

### Status

Active

### Date

YYYY-MM-DD

---

## DEC-002

### Decision

Use React for frontend.

### Reason

Component-based architecture and strong ecosystem.

### Alternatives Considered

* Vue
* Angular
* Svelte

### Impact

Affects:

* UI development
* Routing
* State management

### Status

Active

### Date

YYYY-MM-DD

---

# PROCESS DECISIONS

## DEC-003

### Decision

Use FULL_SYSTEM_AUTOPILOT for debugging workflow.

### Reason

Provides structured diagnosis and minimal-fix execution.

### Impact

Affects:

* Bug resolution
* Deployment troubleshooting
* Session management

### Status

Active

### Date

YYYY-MM-DD

---

# AI SYSTEM DECISIONS

## DEC-004

### Decision

Use index-based memory instead of full-history loading.

### Reason

Reduces token consumption and timeout risk.

### Impact

Affects:

* Claude performance
* Context loading
* Debugging efficiency

### Status

Active

### Date

YYYY-MM-DD

---

# DECISION STATUS TYPES

Active

* Current approved decision

Pending

* Under evaluation

Deprecated

* No longer valid

Superseded

* Replaced by newer decision

---

# CHANGE CONTROL

Before changing any Active decision:

1. Document reason
2. Evaluate impact
3. Create new decision record
4. Mark old decision as Superseded

---

# END OF DECISION INDEX
