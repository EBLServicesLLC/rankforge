# Supabase Mistakes to Avoid

## Common Failed Approaches

### 1. Ignoring Row Level Security (RLS)

**Mistake:** Assuming queries are broken when data is missing
**Correct Approach:**

* Check RLS policies first
* Verify SELECT/INSERT permissions

---

### 2. Rewriting Queries Instead of Fixing Permissions

**Mistake:** Changing frontend logic repeatedly
**Correct Approach:**

* Inspect Supabase dashboard
* Test query directly in Supabase SQL editor

---

### 3. Misunderstanding Auth vs Database Access

**Mistake:** Confusing login success with data access
**Correct Approach:**

* Auth ≠ database permission
* Always validate both separately

---

### 4. Forgetting Environment Variables

**Mistake:** App works locally but fails in production
**Correct Approach:**

* Verify `VITE_SUPABASE_URL`
* Verify `VITE_SUPABASE_ANON_KEY`

---

## Golden Rule

> If data is missing, assume permissions before assuming code is broken.

