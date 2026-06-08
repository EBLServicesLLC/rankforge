# Authentication Mistakes to Avoid

## Common Failed Approaches

### 1. Rebuilding Auth from Scratch

**Mistake:** Rewriting AuthContext or auth flow when bugs appear
**Why it fails:** The issue is usually session/state, not architecture

---

### 2. Ignoring Supabase Session Handling

**Mistake:** Assuming login state is managed automatically
**Correct Approach:**

* Always initialize session on app load
* Use `getSession()` + `onAuthStateChange`

---

### 3. Breaking Protected Routes

**Mistake:** Rewriting routing logic to fix auth bugs
**Correct Approach:**

* Check user state first
* Validate provider wrapping
* Inspect session persistence

---

### 4. Using localStorage as primary auth source

**Mistake:** Treating localStorage as source of truth
**Correct Approach:**

* Supabase session = source of truth
* localStorage = fallback only

---

## Golden Rule

> Never rebuild authentication unless session handling has been fully verified and ruled out.
