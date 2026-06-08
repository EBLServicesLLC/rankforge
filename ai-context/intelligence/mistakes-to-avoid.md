# Mistakes To Avoid

## Authentication

Problem:
Users were being redirected to login after refresh.

Incorrect Fixes:
- Rebuilding AuthContext
- Rewriting Protected Routes
- Adding localStorage persistence

Root Cause:
Supabase session refresh was not configured correctly.

Correct Fix:
Use supabase.auth.getSession() during application initialization.

---

## Sidebar Rendering

Problem:
Sidebar disappeared on mobile.

Incorrect Fixes:
- Replacing Sidebar component
- Rewriting CSS Grid
- Changing React Router layout

Root Cause:
Container overflow hidden was clipping the sidebar.

Correct Fix:
Remove overflow:hidden from MainLayout.

---

## Database Access

Problem:
Records not loading.

Incorrect Fixes:
- Modifying React state
- Rewriting fetch functions
- Rebuilding API layer

Root Cause:
RLS policy blocked access.

Correct Fix:
Review and update Supabase RLS policies.