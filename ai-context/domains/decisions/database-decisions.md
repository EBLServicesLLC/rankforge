# Database Decisions Log

## Purpose

Prevent unnecessary schema redesigns or query rewrites when issues are actually permission or configuration related.

---

## Decision: PostgreSQL via Supabase

**Status:** Approved

### Choice

Use Supabase PostgreSQL database

### Reason

* Relational structure
* Scalable
* Strong querying support
* Integrated with auth system

---

## Decision: Row Level Security (RLS) Enabled

**Status:** Required

### Choice

All tables use RLS policies

### Reason

* Security enforcement at database level
* Prevent unauthorized access
* Industry best practice

---

## Common Table Design Pattern

* `users`
* `leads`
* `clients`
* `campaigns`
* `activities`

---

## Critical Rule: RLS First Debugging

If data is missing:

1. Check RLS policies FIRST
2. Then check query
3. Then check frontend logic

---

## DO NOT CHANGE WITHOUT APPROVAL

* Database provider (Supabase)
* Switching to NoSQL
* Removing RLS

---

## Common Anti-Pattern

❌ Rewriting queries repeatedly
✔ Check permissions first

❌ Assuming frontend bug
✔ Verify database response first




