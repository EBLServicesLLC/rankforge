# Weekly Report Emails — Deploy (Supabase Free Plan)

## Files
- supabase/functions/weekly-report-send/index.ts   ← edge function (unchanged)
- src/api/cron/weekly-report.js                    ← Vercel cron route
- vercel.json                                      ← schedules the cron
- SQL: one-liner to add report_day column

---

## Step 1 — Run SQL (Supabase dashboard > SQL Editor)

```sql
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS report_day TEXT NOT NULL DEFAULT 'monday'
    CHECK (report_day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday'));
```

---

## Step 2 — Add SUPABASE_SERVICE_KEY to Vercel env vars

Vercel dashboard > Your project > Settings > Environment Variables

  Name:   SUPABASE_SERVICE_KEY
  Value:  <your service role key>
  Env:    Production (+ Preview if you want)

Get the key from: Supabase > Project Settings > API > service_role (secret)

Your existing VITE_SUPABASE_URL is already set — that's the other var the route needs.

---

## Step 3 — Add the API route

Copy weekly-report.js to:
  src/api/cron/weekly-report.js

Vite doesn't serve /api routes — Vercel handles them directly.
No changes to vite.config.js needed.

---

## Step 4 — Update vercel.json

If you don't have a vercel.json yet, create it at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 8 * * *"
    }
  ]
}
```

If you already have a vercel.json, just add the "crons" array to it.

---

## Step 5 — Deploy edge function

```
mkdir supabase\functions\weekly-report-send
# copy index.ts into that folder, then:
npx supabase functions deploy weekly-report-send --no-verify-jwt
```

---

## Step 6 — Deploy to Vercel

```
git add supabase/functions/weekly-report-send/index.ts
git add src/api/cron/weekly-report.js
git add vercel.json
git commit -m "feat: weekly report emails via Vercel cron"
git push
```

Vercel auto-deploys. Cron job appears in Vercel dashboard > Cron Jobs tab.

---

## Step 7 — Test manually

Once deployed, hit the route directly in your browser or with curl:

  https://rankforgedai-5ipq.vercel.app/api/cron/weekly-report

You should get: { "ok": true, "sent": N, "errors": 0 }

Check your inbox. The function sends to any user whose settings.report_day
matches today's weekday name. To force a test on any day, temporarily
comment out the day-check in the edge function (the `if (reportDay !== todayName)` line).

---

## How the schedule works

Vercel calls /api/cron/weekly-report every day at 08:00 UTC.
The edge function checks each user's report_day setting.
Only users whose day matches today get an email.
So you only need one cron entry regardless of how many send-day options you add later.

## Vercel cron limits (free Hobby plan)
Vercel Hobby allows up to 2 cron jobs, running no more than once per day.
"0 8 * * *" (daily) is within those limits.
