# Deployment Quick Check

## PURPOSE

Use this checklist BEFORE debugging any production issue.

Most deployment problems are configuration issues, NOT code issues.

---

# 1. ENVIRONMENT VARIABLES

* [ ] Are all required env vars set in hosting platform?
* [ ] Do keys match exactly (case-sensitive)?
* [ ] Did I restart/redeploy after adding them?

Common:

* VITE_SUPABASE_URL
* VITE_SUPABASE_ANON_KEY
* API keys

---

# 2. BUILD VERIFICATION

* [ ] Did `npm run build` succeed locally?
* [ ] Does `npm run preview` work correctly?
* [ ] Any build warnings ignored?

---

# 3. ROUTING CHECK (CRITICAL FOR SPAs)

* [ ] Is SPA fallback enabled?
* [ ] Are refresh 404s caused by missing rewrite?

Fix pattern:

```
/* → /index.html
```

---

# 4. BASE PATH / VITE CONFIG

* [ ] Is base path correct?
* [ ] Is app deployed under subfolder?

Check:

```js
base: "/"
```

---

# 5. SUPABASE / API ACCESS

* [ ] Is production domain added to allowed origins?
* [ ] Are RLS policies blocking production requests?
* [ ] Does API work outside frontend (Postman/test)?

---

# 6. BROWSER DEBUG CHECK

* [ ] Console errors?
* [ ] Network tab failing requests?
* [ ] CORS errors?

---

# 7. MOST COMMON REAL CAUSES

If something breaks in production, assume:

1. Missing env variables (most common)
2. SPA routing fallback missing
3. Supabase RLS blocking data
4. Wrong build output folder

NOT:

* React bug
* UI bug
* state management bug

---

# GOLDEN RULE

> “If it works locally but not in production, it is almost never code.”

---

# WHEN TO USE THIS

Use before:

* asking Claude to debug deployment
* rewriting code for production bugs
* changing architecture due to hosting issues

---

# END CHECKLIST
