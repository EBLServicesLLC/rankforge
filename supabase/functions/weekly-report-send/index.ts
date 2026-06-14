// supabase/functions/weekly-report-send/index.ts
// Triggered by pg_cron every Monday at 8am UTC.
// For each user: fetches all their clients + last-7-day data, builds an HTML
// email per client, then calls the existing send-email edge function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SEND_EMAIL_URL   = `${SUPABASE_URL}/functions/v1/send-email`
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── helpers ────────────────────────────────────────────────────────────────

function ago7(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

const today = new Date()
const weekOf = fmtDate(new Date(today.getTime() - 7 * 86400000).toISOString())
  + ' - ' + fmtDate(today.toISOString())

// ─── per-client data fetchers ────────────────────────────────────────────────

async function getRankChanges(clientId: string) {
  const { data } = await sb
    .from('score_history')
    .select('keyword, score, created_at')
    .eq('client_id', clientId)
    .gte('created_at', ago7())
    .order('created_at', { ascending: false })
  if (!data?.length) return null
  // group by keyword, get first (latest) and last (oldest in window)
  const map: Record<string, { latest: number; oldest: number }> = {}
  for (const row of data) {
    if (!map[row.keyword]) map[row.keyword] = { latest: row.score, oldest: row.score }
    map[row.keyword].oldest = row.score
  }
  const rows = Object.entries(map).map(([kw, v]) => ({
    keyword: kw,
    latest: v.latest,
    change: v.oldest - v.latest // positive = improved (lower rank is better)
  })).sort((a, b) => b.change - a.change).slice(0, 10)
  return rows
}

async function getCitations(clientId: string) {
  const { data, count } = await sb
    .from('indexing_checks')
    .select('url, status, created_at', { count: 'exact' })
    .eq('client_id', clientId)
    .gte('created_at', ago7())
  return { count: count ?? 0, samples: (data ?? []).slice(0, 3) }
}

async function getReputation(clientId: string) {
  const { data } = await sb
    .from('reputation_reviews')
    .select('platform, rating, author, snippet, created_at')
    .eq('client_id', clientId)
    .gte('created_at', ago7())
    .order('rating', { ascending: false })
  if (!data?.length) return null
  const avg = (data.reduce((s, r) => s + (r.rating ?? 0), 0) / data.length).toFixed(1)
  return { count: data.length, avg, samples: data.slice(0, 3) }
}

async function getTasks(clientId: string) {
  const { data, count } = await sb
    .from('local_seo_tasks')
    .select('task, status, updated_at', { count: 'exact' })
    .eq('client_id', clientId)
    .eq('status', 'done')
    .gte('updated_at', ago7())
  return { count: count ?? 0, samples: (data ?? []).slice(0, 4) }
}

async function getContent(clientId: string) {
  const { data, count } = await sb
    .from('content_calendar')
    .select('platform, topic, post_date', { count: 'exact' })
    .eq('client_id', clientId)
    .eq('status', 'published')
    .gte('post_date', ago7().split('T')[0])
  return { count: count ?? 0, samples: (data ?? []).slice(0, 4) }
}

// ─── HTML email builder ───────────────────────────────────────────────────────

function pill(text: string, color: string) {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${color};color:#fff">${text}</span>`
}

function sectionHeader(icon: string, title: string) {
  return `
    <tr><td style="padding:20px 32px 4px">
      <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280">${icon} ${title}</p>
    </td></tr>`
}

function divider() {
  return `<tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"></td></tr>`
}

function buildEmail(biz: string, sections: Record<string, unknown>): string {
  const ranks   = sections.ranks   as Awaited<ReturnType<typeof getRankChanges>>
  const cites   = sections.cites   as Awaited<ReturnType<typeof getCitations>>
  const rep     = sections.rep     as Awaited<ReturnType<typeof getReputation>>
  const tasks   = sections.tasks   as Awaited<ReturnType<typeof getTasks>>
  const content = sections.content as Awaited<ReturnType<typeof getContent>>

  let body = ''

  // ── rank changes ──
  body += sectionHeader('📈', 'Rank changes')
  body += divider()
  if (ranks?.length) {
    body += `<tr><td style="padding:8px 32px 0"><table width="100%" cellspacing="0" cellpadding="0">
      <tr style="font-size:11px;color:#9ca3af;font-weight:600">
        <td>KEYWORD</td><td align="right">POSITION</td><td align="right">CHANGE</td>
      </tr>`
    for (const r of ranks) {
      const arrow = r.change > 0 ? '▲' : r.change < 0 ? '▼' : '–'
      const color = r.change > 0 ? '#10b981' : r.change < 0 ? '#f87171' : '#9ca3af'
      body += `<tr style="font-size:13px;color:#1f2937;border-top:1px solid #f3f4f6">
        <td style="padding:6px 0">${r.keyword}</td>
        <td align="right" style="padding:6px 0">#${r.latest}</td>
        <td align="right" style="padding:6px 0;color:${color};font-weight:700">${arrow} ${Math.abs(r.change)}</td>
      </tr>`
    }
    body += `</table></td></tr>`
  } else {
    body += `<tr><td style="padding:8px 32px;color:#9ca3af;font-size:13px">No rank data recorded this week.</td></tr>`
  }

  // ── citations ──
  body += sectionHeader('🔗', 'New citations & indexing')
  body += divider()
  body += `<tr><td style="padding:8px 32px 0">
    <p style="margin:0;font-size:28px;font-weight:700;color:#3b82f6;line-height:1">${cites?.count ?? 0}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">URLs indexed / submitted this week</p>
  </td></tr>`
  if (cites?.samples?.length) {
    body += `<tr><td style="padding:4px 32px 0">`
    for (const s of cites.samples) {
      body += `<p style="margin:4px 0;font-size:12px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.url}</p>`
    }
    body += `</td></tr>`
  }

  // ── reputation ──
  body += sectionHeader('⭐', 'Reputation')
  body += divider()
  if (rep) {
    body += `<tr><td style="padding:8px 32px 0;display:flex;gap:24px">
      <span style="font-size:28px;font-weight:700;color:#f59e0b">${rep.avg} ★</span>&nbsp;
      <span style="font-size:13px;color:#6b7280;margin-left:12px;line-height:2">${rep.count} new review${rep.count !== 1 ? 's' : ''} this week</span>
    </td></tr>`
    for (const r of rep.samples) {
      body += `<tr><td style="padding:4px 32px">
        <p style="margin:0;font-size:12px;color:#1f2937"><strong>${r.author}</strong> on ${r.platform} &middot; ${'★'.repeat(r.rating ?? 0)}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280;font-style:italic">&ldquo;${(r.snippet ?? '').substring(0, 120)}&rdquo;</p>
      </td></tr>`
    }
  } else {
    body += `<tr><td style="padding:8px 32px;color:#9ca3af;font-size:13px">No new reviews this week.</td></tr>`
  }

  // ── tasks ──
  body += sectionHeader('✅', 'Tasks completed')
  body += divider()
  body += `<tr><td style="padding:8px 32px 0">
    <p style="margin:0;font-size:28px;font-weight:700;color:#10b981;line-height:1">${tasks?.count ?? 0}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">SEO tasks marked done</p>
  </td></tr>`
  if (tasks?.samples?.length) {
    body += `<tr><td style="padding:4px 32px 0">`
    for (const t of tasks.samples) {
      body += `<p style="margin:3px 0;font-size:12px;color:#6b7280">&#10003; ${t.task}</p>`
    }
    body += `</td></tr>`
  }

  // ── content published ──
  body += sectionHeader('📅', 'Content published')
  body += divider()
  body += `<tr><td style="padding:8px 32px 0">
    <p style="margin:0;font-size:28px;font-weight:700;color:#8b5cf6;line-height:1">${content?.count ?? 0}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Posts published this week</p>
  </td></tr>`
  if (content?.samples?.length) {
    body += `<tr><td style="padding:4px 32px 0">`
    for (const p of content.samples) {
      body += `<p style="margin:3px 0;font-size:12px;color:#6b7280">${p.platform} &middot; ${p.topic} &middot; ${p.post_date}</p>`
    }
    body += `</td></tr>`
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Weekly SEO Report – ${biz}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">

        <!-- header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#3b82f6);padding:28px 32px">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.7)">RankForged AI</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#fff">${biz}</p>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.8)">Weekly SEO Report &middot; ${weekOf}</p>
        </td></tr>

        ${body}

        <!-- footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;background:#f9fafb">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
            Powered by <strong>RankForged AI</strong> &middot; 
            <a href="https://app.rankforgedai.com" style="color:#3b82f6;text-decoration:none">Open dashboard</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

// ─── main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Allow both cron (GET) and manual trigger (POST)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // 1. Fetch all users + their settings (email + report preferences)
    const { data: users, error: uErr } = await sb.auth.admin.listUsers()
    if (uErr) throw uErr

    let sent = 0
    let errors = 0

    for (const user of users.users) {
      const email = user.email
      if (!email) continue

      // 2. Get user settings (check report_day)
      const { data: settings } = await sb
        .from('settings')
        .select('report_day, agency_name')
        .eq('user_id', user.id)
        .single()

      const reportDay = settings?.report_day ?? 'monday'
      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      if (reportDay !== todayName) continue // not their send day

      // 3. Get all clients for this user
      const { data: clients } = await sb
        .from('client_data')
        .select('client_id, biz_name, biz_website')
        .eq('user_id', user.id)

      if (!clients?.length) continue

      // 4. Build + send one email per client
      for (const client of clients) {
        try {
          const [ranks, cites, rep, tasks, content] = await Promise.all([
            getRankChanges(client.client_id),
            getCitations(client.client_id),
            getReputation(client.client_id),
            getTasks(client.client_id),
            getContent(client.client_id),
          ])

          const html = buildEmail(client.biz_name ?? 'Your Business', {
            ranks, cites, rep, tasks, content
          })

          const agencyName = settings?.agency_name || 'RankForged AI'
          const subject = `${client.biz_name} – Weekly SEO Report (${weekOf})`

          // Call existing send-email edge function
          const res = await fetch(SEND_EMAIL_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'weekly_report',
              to: email,
              subject,
              html,
              from_name: agencyName,
            }),
          })

          if (res.ok) {
            sent++
          } else {
            const err = await res.text()
            console.error(`send-email failed for ${client.biz_name}:`, err)
            errors++
          }
        } catch (clientErr) {
          console.error(`Error processing client ${client.client_id}:`, clientErr)
          errors++
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, errors, ts: new Date().toISOString() }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('weekly-report-send fatal:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

