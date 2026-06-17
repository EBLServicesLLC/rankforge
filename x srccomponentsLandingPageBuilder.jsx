[33mcommit e03bbd559f5162e44061d861308cad262d8f8c3d[m
Author: EBLServicesLLC <mike@eblservicesllc.com>
Date:   Mon Jun 8 19:33:00 2026 -0400

    Add Resend email - welcome and activation key

 .gitignore                                         |  Bin [31m253[m -> [32m499[m bytes
 RANKFORGE3_CANONICAL_REFERENCE.md                  |  193 [32m+[m
 SESSION_HANDOFF.md                                 |  129 [32m+[m[31m-[m
 Starting a New Claude Session.docx                 |  Bin [31m0[m -> [32m16007[m bytes
 ai-context/CLAUDE_LAUNCHER.md                      |   92 [32m+[m
 ai-context/FULL_SYSTEM_AUTOPILOT.md                |  262 [32m+[m
 ai-context/GLOBAL.md                               |  224 [32m+[m
 ai-context/NEW_SESSION_PROMPT.md                   |   25 [32m+[m
 ai-context/PROJECT_INDEX_DASHBOARD.md              |  237 [32m+[m
 ai-context/QUICK_COMMANDS.md                       |   20 [32m+[m
 ai-context/README.md                               |   31 [32m+[m
 ai-context/SESSION_HANDOFF.md                      |  252 [32m+[m
 ai-context/SESSION_MANAGEMENT.md                   |  448 [32m++[m
 ai-context/deployment/AUTO_FIX_GENERATOR.md        |  236 [32m+[m
 ai-context/deployment/DEPLOYMENT_DIAGNOSER.md      |  208 [32m+[m
 ai-context/deployment/DEPLOYMENT_QUICK_CHECK.md    |  108 [32m+[m
 ai-context/domains/debug/auth-issues.md            |   55 [32m+[m
 ai-context/domains/debug/database-issues.md        |   57 [32m+[m
 ai-context/domains/debug/deployment-issues.md      |  135 [32m+[m
 ai-context/domains/debug/ui-issues.md              |  106 [32m+[m
 .../domains/decisions/architecture-decisions.md    |   84 [32m+[m
 ai-context/domains/decisions/database-decisions.md |   80 [32m+[m
 ai-context/domains/decisions/ui-decisions.md       |   96 [32m+[m
 ai-context/domains/mistakes/authentication.md      |   45 [32m+[m
 ai-context/domains/mistakes/deployment.md          |   51 [32m+[m
 ai-context/domains/mistakes/react.md               |   48 [32m+[m
 ai-context/domains/mistakes/supabase.md            |   48 [32m+[m
 ai-context/intelligence/AUTO_INDEXER.md            |  259 [32m+[m
 ai-context/intelligence/debug-history.md           |   18 [32m+[m
 ai-context/intelligence/debug-index.md             |  132 [32m+[m
 ai-context/intelligence/decision-index.md          |  175 [32m+[m
 ai-context/intelligence/decisions.md               |   13 [32m+[m
 ai-context/intelligence/memory.md                  |   17 [32m+[m
 ai-context/intelligence/mistake-index.md           |  167 [32m+[m
 ai-context/intelligence/mistakes-to-avoid.md       |   53 [32m+[m
 ai-context/project/README_AI.md                    |   12 [32m+[m
 ai-context/project/ai-rules.md                     |   19 [32m+[m
 ai-context/project/architecture.md                 |   14 [32m+[m
 ai-context/project/business-rules.md               |   10 [32m+[m
 ai-context/project/coding-standards.md             |    8 [32m+[m
 ai-context/project/current-sprint.md               |   12 [32m+[m
 ai-context/project/feature-registry.md             |   21 [32m+[m
 ai-context/project/project-overview.md             |   11 [32m+[m
 ai-context/project/system-map.md                   |   31 [32m+[m
 ai-context/system/AUTO_DEBUG_ROUTER.md             |  208 [32m+[m
 ai-context/system/CLAUDE_CONTEXT_BOOTLOADER.md     |  133 [32m+[m
 ai-context/system/CLAUDE_CONTROL_PANEL.md          |  228 [32m+[m
 ai-context/system/CLAUDE_MASTER_OS.md              |  265 [32m+[m
 ai-context/system/CLAUDE_STARTUP_PROMPT.md         |  139 [32m+[m
 ai-context/system/SELF_HEALING_SYSTEM.md           |  216 [32m+[m
 ai-context/system/TOKEN_REDUCTION_MODE.md          |  173 [32m+[m
 ai-context/system/claude-anti-loop.md              |  188 [32m+[m
 ai-context/system/startup-context.md               |   17 [32m+[m
 check.py                                           |    8 [32m+[m
 check_switchtab.cjs                                |    7 [32m+[m
 check_tabs.cjs                                     |    4 [32m+[m
 check_tabs.js                                      |    4 [32m+[m
 decode_rankforge.py                                | 4381 [32m+++++++++++++[m
 files.zip                                          |  Bin [31m0[m -> [32m285581[m bytes
 files/RANKFORGE3_CANONICAL_REFERENCE.md            |  193 [32m+[m
 files/rankforge3_CANONICAL_2026-05-31.html         | 6444 [32m++++++++++++++++++[m
 fix.py                                             |    8 [32m+[m
 fix2.py                                            |   32 [32m+[m
 fix_dashboard.py                                   |  180 [32m+[m
 fix_dashboardshell.py                              |   17 [32m+[m
 fix_keys.py                                        |   11 [32m+[m
 fix_switchtab.cjs                                  |    8 [32m+[m
 fixwiz.py                                          |    5 [32m+[m
 index.ts                                           |  133 [32m+[m
 patch2_rankforge.py                                |   19 [32m+[m
 patch_rankforge.py                                 |  151 [32m+[m
 patch_switchtab.cjs                                |   38 [32m+[m
 public/rankforge3.html                             |   22 [32m+[m
 public/rankforge3.html.backup                      | 6482 [32m++++++++++++++++++[m
 public/rankforge3.html.bak2                        | 6276 [32m++++++++++++++++++[m
 rankforge3.html                                    | 6898 [32m++++++++++++++++++++[m
 rf_extracted.js                                    | 5452 [32m++++++++++++++++[m
 src/components/LandingPageBuilder.jsx              | 1532 [32m+++[m[31m--[m
 stripe.exe                                         |  Bin [31m0[m -> [32m27742720[m bytes
 supabase/.temp/cli-latest                          |    2 [32m+[m[31m-[m
 supabase/.temp/gotrue-version                      |    1 [32m+[m
 supabase/.temp/pooler-url                          |    1 [32m+[m
 supabase/.temp/postgres-version                    |    1 [32m+[m
 supabase/.temp/project-ref                         |    1 [32m+[m
 supabase/.temp/rest-version                        |    1 [32m+[m
 supabase/.temp/storage-migration                   |    1 [32m+[m
 supabase/.temp/storage-version                     |    1 [32m+[m
 supabase/functions/gbp-qa-generate/index.ts        |  118 [32m+[m
 supabase/functions/gcs-auth/index.ts               |  200 [32m+[m
 supabase/functions/gcs-data/index.ts               |  194 [32m+[m
 supabase/functions/gsc-data/index.ts               |  146 [32m+[m
 supabase/functions/kw-gap-analyse/index.ts         |  107 [32m+[m
 supabase/functions/landing-page-generate/index.ts  |  185 [32m+[m
 supabase/functions/local-links-email/index.ts      |  155 [32m+[m
 supabase/functions/local-links-generate/index.ts   |  204 [32m+[m
 supabase/functions/meta-tag-generate/index.ts      |  122 [32m+[m
 supabase/functions/migrations/add_linkedin_urn.sql |   23 [32m+[m
 .../functions/review-message-generate/index.ts     |   51 [32m+[m
 .../functions/review-response-generate/index.ts    |   48 [32m+[m
 supabase/functions/schema-monitor/index.ts         |  258 [32m+[m
 supabase/functions/stripe-checkout/index.ts        |   24 [32m+[m[31m-[m
 .../functions/stripe-portal/stripe-checkout.ts     |   67 [32m+[m
 supabase/functions/stripe-portal/stripe-portal.ts  |   54 [32m+[m
 supabase/functions/stripe-webhook/index.ts         |  155 [32m+[m
 supabase/functions/voice-search-answers/index.ts   |  106 [32m+[m
 supabase/functions/voice-search-generate/index.ts  |  119 [32m+[m
 supabase/functions/voice-search-snippet/index.ts   |   94 [32m+[m
 test.txt                                           |   15 [32m+[m
 write_rankforge.py                                 |   32 [32m+[m
 ~$arting a New Claude Session.docx                 |  Bin [31m0[m -> [32m162[m bytes
 110 files changed, 46013 insertions(+), 587 deletions(-)
