# Architecture Decisions Log

## Purpose

Document key system design decisions so they are not re-evaluated or overwritten during debugging or feature work.

---

## Decision: React Frontend

**Date:** 2026-XX-XX
**Status:** Approved

### Choice

Use React (Vite-based SPA)

### Reason

* Fast development cycle
* Strong ecosystem
* Compatible with Supabase and modern APIs
* Easier AI-assisted development

### Alternatives Considered

* Next.js (rejected for complexity)
* Angular (too heavy for project scope)

---

## Decision: Supabase Backend

**Date:** 2026-XX-XX
**Status:** Approved

### Choice

Use Supabase for:

* Authentication
* Database
* API layer

### Reason

* Built-in Postgres
* Fast setup
* Real-time capabilities
* Reduces backend overhead

### Alternatives Considered

* Firebase (rejected due to NoSQL limitations)

---

## Decision: SPA (Single Page Application)

**Status:** Approved

### Reason

* Simpler routing model
* Better performance for dashboard-style apps
* Works well with Vite + React

---

## DO NOT CHANGE WITHOUT CLEAR JUSTIFICATION

* Frontend framework
* Backend provider
* App architecture style

Rewrites require:

* Proven scalability issue
* Performance bottleneck evidence
* Security requirement change




