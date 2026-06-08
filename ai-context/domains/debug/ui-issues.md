# UI Issues Log

## Common Symptoms

* Components not rendering
* Layout breaking on mobile
* Sidebar or navbar disappearing
* Blank screen after navigation

---

## Known Root Causes

### 1. CSS overflow issues

**Cause:** Parent container clipping children
**Fix:**

* Remove `overflow: hidden` where unnecessary

---

### 2. React routing misconfiguration

**Cause:** Routes not matching layout structure
**Fix:**

* Verify route nesting
* Ensure layout wrapper is consistent

---

### 3. State rendering issues

**Cause:** Conditional rendering blocking UI
**Fix:**

* Validate loading states
* Check null/undefined guards

---

## Do NOT Repeat These Fixes

* Rebuilding entire page for layout bugs
* Removing routing system
* Replacing working components unnecessarily

---

# Deployment Issues Log

## Common Symptoms

* App works locally but not in production
* Blank page after deployment
* API calls failing only on hosted site
* Environment variables not working

---

## Known Root Causes

### 1. Missing environment variables

**Cause:** `.env` not configured in hosting provider
**Fix:**

* Add variables in Vercel/hosting dashboard

---

### 2. Build configuration mismatch

**Cause:** Wrong build output directory
**Fix:**

* Ensure correct build command (`npm run build`)
* Verify `dist` folder deployment

---

### 3. SPA routing issues

**Cause:** Refresh returns 404
**Fix:**

* Configure rewrite rules to `index.html`

---

## Do NOT Repeat These Fixes

* Rebuilding frontend to fix hosting issues
* Changing framework during deployment bugs
* Deleting routing system

---

## Correct Debug Approach

1. Check hosting logs first
2. Verify environment variables
3. Confirm build output and routing rules


