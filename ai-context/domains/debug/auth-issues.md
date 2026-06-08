# Auth Issues Log

## Common Symptoms

* Users randomly logged out after refresh
* Session not persisting across page reload
* Protected routes redirecting incorrectly
* "No user found" despite active login

---

## Known Root Causes

### 1. Supabase session not initialized correctly

**Cause:** App does not call `getSession()` on load
**Fix:**

* Ensure auth state is initialized in root layout
* Use `onAuthStateChange` listener

---

### 2. Missing Auth Context wrapper

**Cause:** Components outside provider cannot access user state
**Fix:**

* Wrap entire app in `AuthProvider`

---

### 3. Token refresh not handled

**Cause:** Session expires silently
**Fix:**

* Enable Supabase auto-refresh session
* Listen for token refresh events

---

## Do NOT Repeat These Fixes

* Rebuilding AuthContext from scratch
* Rewriting ProtectedRoute logic
* Switching auth providers unnecessarily

---

## Correct Debug Approach

1. Check Supabase session first
2. Validate AuthProvider wrapping
3. Inspect token persistence in local storage
