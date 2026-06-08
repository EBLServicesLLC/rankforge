/**
 * schema-monitor/index.ts
 * Fetches a website URL and validates JSON-LD schema markup
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Unauthorized", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { url, types, client_id } = await req.json();
    if (!url?.trim()) return jsonError("url is required", 400);
    if (!types?.length) return jsonError("types array is required", 400);

    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    // ── Fetch the page ────────────────────────────────────────────────────────
    let html = "";
    try {
      const pageRes = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RankForgedBot/1.0)", "Accept": "text/html" },
        signal: AbortSignal.timeout(10000),
      });
      if (!pageRes.ok) return jsonError(`Could not load your website (error ${pageRes.status}). Please check the URL is correct and the site is live.`, 400);
      html = await pageRes.text();
    } catch (e) {
      return jsonError(`Could not reach ${targetUrl}. Please check the URL is correct and your website is live.`, 400);
    }

    // ── Extract JSON-LD blocks ────────────────────────────────────────────────
    const schemasFound: Record<string, unknown>[] = [];
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          // Unwrap @graph arrays (used by Rank Math, Yoast, and most WordPress SEO plugins)
          if (item["@graph"] && Array.isArray(item["@graph"])) {
            schemasFound.push(...item["@graph"]);
          } else {
            schemasFound.push(item);
          }
        }
      } catch (e) {
        schemasFound.push({ "@type": "INVALID_JSON", raw: match[1].substring(0, 200) });
      }
    }

    console.log(`[schema-monitor] URL: ${targetUrl}`);
    console.log(`[schema-monitor] HTML length: ${html.length}`);
    console.log(`[schema-monitor] Schemas found: ${schemasFound.length}`);
    console.log(`[schema-monitor] Types found: ${schemasFound.map(s => s["@type"]).join(", ")}`);
    console.log(`[schema-monitor] Checking types: ${types.join(", ")}`);

    // ── Load client profile ───────────────────────────────────────────────────
    let bizProfile: Record<string, string> = {};
    if (client_id) {
      const { data } = await supabase.from("client_data").select("biz_name,biz_phone,biz_addr,biz_city,biz_state,biz_zip").eq("id", client_id).eq("user_id", user.id).single();
      if (data) bizProfile = data;
    }

    // ── Validate each type ────────────────────────────────────────────────────
    const results = types.map((type: string) => {
      const matching = schemasFound.filter(s => {
        const t = s["@type"];
        return Array.isArray(t) ? t.includes(type) : t === type;
      });

      if (!matching.length) {
        return {
          type,
          status: "missing",
          summary: `No ${type} schema found on this page`,
          details: [
            { label: "Schema code found on page", pass: false },
            { label: `Correct schema type (${type}) present`, pass: false },
          ],
          fix: getFix(type, "missing", bizProfile),
        };
      }

      const schema = matching[0];
      const details: { label: string; pass: boolean }[] = [];

      details.push({ label: "Schema code found on page", pass: true });
      details.push({ label: `Correct schema type (${type}) present`, pass: true });

      if (schema["@type"] === "INVALID_JSON") {
        details.push({ label: "Schema code is valid (no errors)", pass: false });
      } else {
        details.push({ label: "Schema code is valid (no errors)", pass: true });
      }

      if (type === "LocalBusiness" || type === "Organization") {
        const hasName    = !!schema.name;
        const hasPhone   = !!(schema.telephone || schema.phone);
        const hasAddress = !!(schema.address || schema.streetAddress);
        details.push({ label: "Business name is filled in", pass: hasName });
        details.push({ label: "Phone number is filled in", pass: hasPhone });
        details.push({ label: "Address is filled in", pass: hasAddress });
        if (bizProfile.biz_name && schema.name) {
          const napMatch = schema.name.toLowerCase().includes(bizProfile.biz_name.toLowerCase()) || bizProfile.biz_name.toLowerCase().includes((schema.name as string).toLowerCase());
          details.push({ label: `Business name matches your profile`, pass: napMatch });
        }
      }

      if (type === "FAQPage") {
        const hasQA = Array.isArray(schema.mainEntity) && schema.mainEntity.length > 0;
        const count = Array.isArray(schema.mainEntity) ? schema.mainEntity.length : 0;
        details.push({ label: "Questions and answers are present", pass: hasQA });
        details.push({ label: `${count} Q&A pairs found`, pass: count > 0 });
      }

      if (type === "AggregateRating") {
        const hasRating = !!(schema.ratingValue || schema.aggregateRating);
        const hasCount  = !!(schema.reviewCount || schema.ratingCount);
        details.push({ label: "Star rating value is present", pass: hasRating });
        details.push({ label: "Number of reviews is present", pass: hasCount });
      }

      if (type === "BreadcrumbList") {
        const hasItems = Array.isArray(schema.itemListElement) && schema.itemListElement.length > 0;
        details.push({ label: "Page navigation items are present", pass: hasItems });
      }

      if (type === "Service") {
        const hasName = !!schema.name;
        const hasDesc = !!(schema.description || schema.serviceType);
        details.push({ label: "Service name is filled in", pass: hasName });
        details.push({ label: "Service description is filled in", pass: hasDesc });
      }

      const failCount = details.filter(d => !d.pass).length;
      const allPass = failCount === 0;

      return {
        type,
        status: allPass ? "pass" : "fail",
        summary: allPass
          ? `${type} schema is present and working correctly`
          : `${failCount} problem${failCount > 1 ? "s" : ""} found with your ${type} schema`,
        details,
        fix: allPass ? null : getFix(type, "fail", bizProfile),
      };
    });

    const allPass = results.every((r: { status: string }) => r.status === "pass");
    return jsonResponse({ success: true, allPass, results, schemasFound });

  } catch (err) {
    console.error("[schema-monitor] error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});

function getFix(type: string, reason: string, biz: Record<string, string>) {
  const fixes: Record<string, { steps: string[]; note: string }> = {
    LocalBusiness: {
      steps: [
        "Contact your web developer or agency and tell them: 'My website is missing LocalBusiness schema — can you add it?'",
        "If you manage your own website, install a free plugin called 'Rank Math SEO' (WordPress) — it adds this automatically.",
        "Fill in your business name, address, and phone number in the plugin settings.",
        "Come back here and run the check again to confirm it's working.",
      ],
      note: "LocalBusiness schema tells Google your exact business name, address, and phone number. Without it, Google may show wrong information in search results.",
    },
    FAQPage: {
      steps: [
        "Go to the Voice & FAQ tab in RankForged (in the left sidebar).",
        "Generate questions and answers for your business.",
        "Click 'Copy Schema' to copy the code.",
        "Send that code to your web developer and say: 'Please add this to the <head> section of my website.'",
        "Come back here and run the check again to confirm it's working.",
      ],
      note: "FAQ schema tells Google to show your Q&A content in search results and read your answers aloud for voice searches.",
    },
    Service: {
      steps: [
        "Contact your web developer and tell them: 'My website is missing Service schema — can you add it for my main services?'",
        "If you use WordPress with Rank Math, go to the page for each service and enable 'Service' schema in the schema settings.",
        "Make sure each service page has a name and description filled in.",
        "Come back here and run the check again.",
      ],
      note: "Service schema helps Google understand exactly what services you offer, which improves how your business appears in search results.",
    },
    AggregateRating: {
      steps: [
        "This schema shows your star rating in Google search results.",
        "Contact your web developer and ask them to add AggregateRating schema with your current review score and total number of reviews.",
        "Alternatively, a review plugin like 'WP Review' or 'Schema Pro' can add this automatically.",
        "Run the check again after it's added.",
      ],
      note: "Star ratings in search results (called 'rich snippets') increase click-through rates significantly. This is worth fixing.",
    },
    BreadcrumbList: {
      steps: [
        "Contact your web developer and ask them to add breadcrumb navigation to your website.",
        "If you use WordPress, most SEO plugins (Rank Math, Yoast) add breadcrumb schema automatically — just enable it in settings.",
        "Run the check again after it's set up.",
      ],
      note: "Breadcrumbs help Google understand your site structure and can show your page hierarchy directly in search results.",
    },
    WebSite: {
      steps: [
        "Ask your web developer to add WebSite schema to your homepage.",
        "This is usually a one-time 5-minute task for a developer.",
        "Run the check again after it's added.",
      ],
      note: "WebSite schema can enable a search box directly in Google search results that searches your website.",
    },
    Organization: {
      steps: [
        "Ask your web developer to add Organization schema to your website.",
        "This includes your business name, logo, website, and social media profiles.",
        "Run the check again after it's added.",
      ],
      note: "Organization schema helps Google show your logo and business information in the knowledge panel on the right side of search results.",
    },
  };

  return fixes[type] || {
    steps: [
      `Your ${type} schema was not found or has errors.`,
      "Contact your web developer and share this report — they will know how to fix it.",
      "Run the check again after the fix is applied.",
    ],
    note: "If you're unsure who to contact, your website hosting company or the person who built your website can help.",
  };
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function jsonError(error: string, status = 400) {
  return new Response(JSON.stringify({ error }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
