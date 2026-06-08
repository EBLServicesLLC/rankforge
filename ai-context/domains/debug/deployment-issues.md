# Deployment Issues Log

## Common Symptoms

* App works locally but fails in production
* Blank white screen after deployment
* API requests failing only on hosted environment
* Environment variables not being recognized
* 404 errors on page refresh
* Build succeeds but site does not load correctly

---

## Known Root Causes

### 1. Missing Environment Variables

**Cause:** Variables exist locally but are not configured in hosting provider (Vercel, Netlify, etc.)

**Fix:**

* Add all required variables in deployment dashboard
* Ensure variable names match exactly (case-sensitive)
* Redeploy after changes

**Common Missing Variables:**

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* API keys for external services

---

### 2. Incorrect Build Output Configuration

**Cause:** Hosting platform is pointing to wrong build directory

**Fix:**

* Ensure build command is correct:

  ```bash
  npm run build
  ```
* Set output directory to:

  ```text
  dist
  ```

---

### 3. SPA Routing Issues (404 on Refresh)

**Cause:** Server does not support client-side routing

**Fix:**

* Configure rewrite rule:

  ```
  /* → /index.html
  ```
* Enable SPA fallback in hosting settings

---

### 4. Base Path Misconfiguration (Vite/React)

**Cause:** App deployed under wrong base URL

**Fix:**

* Verify `vite.config.js`:

  ```js
  base: "/"
  ```
* Adjust if deployed under subpath

---

### 5. CORS or API Access Blocked

**Cause:** Production domain not whitelisted in backend/API

**Fix:**

* Add production URL to allowed origins
* Check Supabase/Auth/API CORS settings

---

### 6. Incorrect Environment Mode

**Cause:** App using development settings in production

**Fix:**

* Confirm `NODE_ENV=production`
* Ensure production build is used (not dev server)

---

## Do NOT Repeat These Fixes

* Rebuilding the entire frontend for deployment issues
* Changing frameworks during deployment errors
* Assuming UI code is broken before checking hosting configuration
* Rewriting API layer without checking environment variables first

---

## Correct Debug Approach (Deployment)

1. Check hosting logs first (Vercel/Netlify/Render)
2. Verify environment variables are present
3. Confirm build output directory (`dist`)
4. Test API endpoints directly in production
5. Check browser console for runtime errors
6. Validate routing fallback configuration

---

## Deployment Checklist (Before Every Release)

* [ ] Environment variables set in hosting platform
* [ ] `npm run build` succeeds locally
* [ ] No console errors in production build
* [ ] API endpoints reachable from production domain
* [ ] Routing fallback configured
* [ ] Correct base path set in config



