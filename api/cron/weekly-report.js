// src/api/cron/weekly-report.js
// Vercel cron job — runs daily at 08:00 UTC
// Calls the weekly-report-send Supabase edge function

export default async function handler(req, res) {
  // Vercel calls this with GET; block anything else
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  try {
    const r = await fetch(
      `${supabaseUrl}/functions/v1/weekly-report-send`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({}),
      }
    )

    const data = await r.json()
    return res.status(r.ok ? 200 : 500).json(data)
  } catch (err) {
    console.error('weekly-report cron error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
