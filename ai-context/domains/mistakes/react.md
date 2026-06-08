# React Mistakes to Avoid

## Common Failed Approaches

### 1. Rebuilding Entire Components for Small Bugs

**Mistake:** Deleting and rewriting working components
**Correct Approach:**

* Isolate state or props issue first
* Debug render flow before refactoring

---

### 2. Ignoring State Dependency Issues

**Mistake:** Missing dependency arrays in hooks
**Fix:**

* Always validate `useEffect` dependencies
* Check for infinite re-renders

---

### 3. Overusing Conditional Rendering

**Mistake:** Hiding UI due to null state assumptions
**Correct Approach:**

* Add proper loading states
* Validate API responses instead of hiding components

---

### 4. Replacing Routing Instead of Fixing It

**Mistake:** Switching router setup to fix navigation bugs
**Correct Approach:**

* Verify route nesting
* Check layout wrappers first

---

## Golden Rule

> Fix logic, not structure, unless structure is proven broken.

