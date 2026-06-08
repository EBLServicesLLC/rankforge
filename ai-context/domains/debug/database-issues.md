# Database Issues Log

## Common Symptoms

* Data not loading in UI
* Empty tables despite inserted records
* Insert/update silently failing
* "permission denied" errors

---

## Known Root Causes

### 1. Row Level Security (RLS)

**Cause:** Policies blocking read/write access
**Fix:**

* Review Supabase RLS policies
* Ensure correct SELECT/INSERT permissions

---

### 2. Incorrect table references

**Cause:** Querying wrong schema or table name
**Fix:**

* Confirm table name in Supabase dashboard
* Check for pluralization mismatches

---

### 3. Missing environment variables

**Cause:** Supabase URL or key not loaded
**Fix:**

* Verify `.env` file
* Restart dev server after changes

---

## Do NOT Repeat These Fixes

* Rewriting API layer before checking RLS
* Rebuilding frontend state management
* Assuming UI bug before verifying database response

---

## Correct Debug Approach

1. Check Supabase response in network tab
2. Validate RLS policies
3. Confirm table structure and naming

