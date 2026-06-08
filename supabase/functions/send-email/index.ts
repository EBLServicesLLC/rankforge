import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return errRes("Method not allowed", 405);

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM = Deno.env.get("FROM_EMAIL") || "RankForged AI <onboarding@resend.dev>";
    if (!RESEND_KEY) return errRes("RESEND_API_KEY not set", 503);

    const body = await req.json();
    const { action } = body;

    if (action === "welcome") {
      const { to, name } = body;
      if (!to) return errRes("to is required", 400);
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0d1f3c;padding:32px;border-radius:12px;color:#e2e8f0"><h1 style="color:#3b82f6">Welcome to RankForged AI</h1><p>Hi ${name || "there"},</p><p>Your account is ready. Log in to access all 24 local SEO tools, AI Agents, and your Content Calendar.</p><a href="https://rankforgedai-5ipq.vercel.app" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Open RankForged AI</a></div>`;
      await sendEmail(RESEND_KEY, FROM, to, "Welcome to RankForged AI", html);
      return okRes({ sent: true });
    }

    if (action === "activation_key") {
      const { to, name, plan, activation_key, max_clients } = body;
      if (!to || !activation_key) return errRes("to and activation_key are required", 400);
      const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Pro";
      const html = `<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0d1f3c;padding:32px;border-radius:12px;color:#e2e8f0"><h1 style="color:#10b981">Your ${planLabel} Plan is Active!</h1><p>Hi ${name || "there"},</p><p>Your subscription is confirmed. Here is your activation key:</p><div style="background:#080f1e;border:2px solid #10b981;border-radius:10px;padding:20px;text-align:center;margin:20px 0"><div style="font-size:11px;color:#4a6080;margin-bottom:8px;text-transform:uppercase">Activation Key</div><div style="font-size:24px;font-weight:900;color:#10b981;letter-spacing:3px;font-family:monospace">${activation_key}</div><div style="font-size:11px;color:#4a6080;margin-top:8px">Enter this in the onboarding wizard</div></div><p>Plan: ${planLabel} - ${max_clients} business${max_clients !== 1 ? "es" : ""}</p><a href="https://rankforgedai-5ipq.vercel.app" style="display:inline-block;margin-top:8px;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Go to Dashboard</a></div>`;
      await sendEmail(RESEND_KEY, FROM, to, `Your RankForged AI ${planLabel} Plan is Active`, html);
      return okRes({ sent: true });
    }

    return errRes("Invalid action", 400);
  } catch (e) {
    console.error("[send-email]", e);
    return errRes(e.message || "Internal server error", 500);
  }
});

async function sendEmail(apiKey, from, to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error("Resend: " + (d.message || JSON.stringify(d))); }
  return res.json();
}

function okRes(data) {
  return new Response(JSON.stringify(data), { headers: { ...CORS, "Content-Type": "application/json" } });
}

function errRes(error, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
