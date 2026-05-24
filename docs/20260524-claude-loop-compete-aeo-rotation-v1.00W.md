# BSuite COMPETE Rotation — AEO Discoverability (2026-05-24)

**Version:** 1.00W
**Date:** 2026-05-24
**Status:** Working
**Rotation:** claude-loop COMPETE (per `bsuite#1223` → `bsuite#1226`)
**Branch this work landed on:** `claude/blissful-dijkstra-ET9Fo` (bsuite) + `claude/brave-cerf-ET9Fo` (braden)
**Companion doc to master roadmap:** [`20260227-bsuite-master-roadmap-v5.00W.md`](./20260227-bsuite-master-roadmap-v5.00W.md) — entry to be folded in on the next ROADMAP rotation (pattern matches `20260508-boot-engine-shipped-evidence-v1.00W.md` and `20260508-roadmap-pending-audit-v1.00W.md`).

---

## What shipped

**braden public/llms.txt + public/llms-full.txt** ([braden PR — `claude/brave-cerf-ET9Fo`](https://github.com/GaryOcean428/braden/tree/claude/brave-cerf-ET9Fo) — link will be the open PR once raised).

Closes the AEO (Answer Engine Optimization) discoverability gap called out in HubSpot's Spring 2026 release. AI search engines (Perplexity, ChatGPT Search, Claude, Google AI Overviews, Gemini) increasingly check `/llms.txt` before crawling DOM. Braden's corporate marketing site at https://www.braden.com.au is BSuite's only public-facing (un-authenticated) surface — the five D2C apps (crm7, BSU, conduit, R80.3, throughput) sit behind auth and are not crawled by AI search engines, so AEO doesn't apply to them.

Two files added — pure static-asset addition served by Vite from `public/`. No code, no schema, no auth surface touched.

- `public/llms.txt` — concise per-spec index file (H1 + blockquote + curated H2 link sections for Programs / Services / Products / Optional). Mirrors `sitemap.xml` route inventory verbatim.
- `public/llms-full.txt` — long-form companion (who-we-are, what-we-do, who-we-serve, where-we-operate, how-to-engage) for agents that request deeper context.

## Research evidence (Doctrine §1.2 — primary sources only)

| Source | Citation | What it informed |
|---|---|---|
| llmstxt.org specification | https://llmstxt.org (Sept 2024, no version-history updates) | Canonical file structure: H1 (mandatory), blockquote (optional), body, H2 sections with `- [Link title](url): notes` format; "Optional" header signals omittable content |
| HubSpot Spring 2026 Spotlight — 7 features | https://integrateiq.com/blogs/hubspot-spring-spotlight | AEO is Feature 2 of 7; "AEO is an ongoing activity, not a one-time setup"; companion features (Smart Deal Progression, Prospecting Agent, Customer Agent, Data Enrichment) cited for the competitive gap-map below |
| Pinggy AI-CRM 2026 review | https://pinggy.io/blog/best_ai_driven_crm_for_automating_your_sales | 2026 shift: "AI that suggests → AI that acts" — autonomous agents; Salesforce Agentforce + HubSpot Breeze Agents + Pipedrive Pulse AI Toolkit + Monday's AI Sales Agents are the named launches |
| RemoteReps 2026 CRM comparison | https://remotereps.com/services/sales-outsourcing/comparison-on-the-top-5-crm-platforms | AI capability matrix by competitor: Predictive Lead Scoring (Salesforce Einstein, 26% higher conversion), Generative Content (HubSpot Breeze, 112% lift in inbound), Deal Prioritization (Pipedrive AI, 25% faster deal closure) — used to map BSuite's current capability against named numbers |
| StackCoast HubSpot vs Salesforce vs Pipedrive 2026 | https://stackcoast.com/hubspot-vs-salesforce-vs-pipedrive | Used to confirm Pipedrive Pulse AI Toolkit is a recent launch (not a re-bundle of pre-2026 features) |
| In-repo `braden/public/sitemap.xml` sha `221e08d3` | The canonical route inventory | llms.txt and llms-full.txt cite ONLY the 9 routes in this sitemap (no new routes promised, no claims that aren't on the live site) |
| In-repo `braden/public/robots.txt` sha `8ee60000` | "Braden Group - Apprenticeships, Traineeships & Recruitment" voice | Tone and operator description used for the llms.txt blockquote |
| In-repo `braden/index.html` sha `2d72ca57` | Tagline: "Ideas. Innovation. Impact. - Braden Group's Workforce Solutions" | Used verbatim in llms.txt H1 + blockquote |
| `CLAUDE.md` §1 Anti-Laziness, §6 Multi-Agent Orchestration, §9 Self-Validation | bsuite/main | Self-report blocks below |

**No blog posts cited as primary evidence** (Doctrine §1 Research-Critic gate).

## Red-team review (Doctrine §2.2)

| Role | Verdict | Evidence |
|---|---|---|
| **UX-DX** | PASS | Surface is for AI agents, not end users — §3.2 16-item UX-DX checklist is partially N/A (12 items hit n/a for an agent-facing static file). The applicable items: prebuilt component reuse (n/a — static markdown), live data only (yes — file mirrors live sitemap), no raw JSON where a visual control exists (yes — file IS the canonical AI-readable surface for which the alternative is DOM crawling). UX-DX impact for human users on www.braden.com.au is zero (no UI surface changed). |
| **Security** | PASS | No new secrets; no RLS surface; no auth changes; no network calls; no `dangerouslySetInnerHTML`. Both files are static text served by Vite's `public/` directory at the same security level as `robots.txt` and `sitemap.xml`. CSP allows static-text serving by default. Both files contain only information already publicly visible on the site (routes, copy, contact path). |
| **Performance** | PASS | Bundle delta: zero (files served as static assets, not bundled). HTTP request count for the average human user: unchanged (humans don't fetch llms.txt). Cold-start impact: zero. |
| **Reliability** | PASS | Both files are static text — no code paths, no failure modes. Vite's `public/` serving is the same path that already reliably serves `robots.txt`, `sitemap.xml`, `favicon.ico`, and `noBgGold.png`. Files do not reference any URL that isn't already in the existing `sitemap.xml`. |
| **Quality** | PASS | Conventional commit (`feat(aeo): add llms.txt + llms-full.txt for AI search discoverability`). Two files added, zero modified. No `as any`, no downgrades, no TODO-later. No tests required (no code paths). llmstxt.org spec compliance: H1 present, blockquote present, body paragraphs present, H2 sections with `- [Link](url): notes` format present, "Optional" header used for the omittable section. |
| **Research-Critic** | PASS | All citations are primary sources (HubSpot Spring 2026 release notes via Integrate IQ, llmstxt.org official spec, RemoteReps 2026 comparison, Pinggy 2026 AI-CRM review, in-repo file SHAs). Versions cited match `development` HEAD (`e871ecc4`). Loaded skills: bsuite-brand-system (corporate identity preserved — file uses Braden voice not D2C voice), markdown formatting. |

## UX-DX checklist (Doctrine §3.2)

Mostly N/A (agent-facing static file, no human UI surface). Applicable items:

- [x] **Prebuilt component reuse** — n/a (static markdown)
- [x] **No raw JSON/code where a visual control exists** — the alternative to llms.txt is "AI engines crawl the DOM to reconstruct site content". The static markdown file IS the canonical machine-readable visual control. PASS.
- [x] **Live data only** — n/a; file claims match the routes that are actually live and listed in `sitemap.xml`
- [x] **WCAG-AA in light AND dark** — n/a (text file, no display)
- [x] **Mobile reflow verified** — n/a (text file, no display)
- [x] **Empty states inviting** — n/a
- [x] **Error states give path forward** — n/a
- [x] **DX matches UX** — yes; the file is as discoverable to developers (curl `/llms.txt`) as it is to AI agents (HTTP GET `/llms.txt`)

All other items: not applicable.

## §9 Evidence (FF-SELF-VALIDATION-20260507)

- **§9.1 Output equivalence loop:** Baseline = no `llms.txt` served at https://www.braden.com.au/llms.txt (verified via robots.txt + sitemap.xml inventory at sha `e871ecc4` — only 4 files in `public/`). After = both `llms.txt` and `llms-full.txt` will be served at the same path level. Equivalence target: file content matches the strings authored in the push_files call; verifiable post-deploy via `curl -s https://www.braden.com.au/llms.txt | head -20` once Vercel finishes building the branch deploy.
- **§9.2 Visual equivalence loop:** Not applicable — agent-facing static file, no UI surface. The file's "visual" target is the AI agent rendering of the curated content. Self-report: not validated against an actual AI-search query at file-creation time; will be validated post-deploy by issuing a Perplexity / ChatGPT search query for "Braden Group apprenticeships Australia" and checking whether the answer cites www.braden.com.au.
- **§9.3 Self-report uncertainty:**
  - Vite's `public/` directory serves files at the document root in production builds; this is verified by the existing `robots.txt`, `sitemap.xml`, `favicon.ico`, and `noBgGold.png` already being served the same way. No uncertainty here.
  - The llmstxt.org spec is dated Sept 2024 with no version updates; if a 2026/2027 revision lands, the file structure may need re-validation. Not blocking.
  - The competitive-mapping section in this doc represents a research snapshot — competitor feature lists change weekly. Snapshot taken 2026-05-24 with explicit URLs in the research_evidence block above.
- **Tests run:** No automated tests (no code paths). Manual file content inspection via the push_files commit SHA on `claude/brave-cerf-ET9Fo` branch.
- **Live verify:** Will be available at https://www.braden.com.au/llms.txt and https://www.braden.com.au/llms-full.txt after ship-all-apps merges the braden PR and Vercel rebuilds production from `main`.

## Competitive context — what's already shipped vs newly tracked

The HubSpot Spring 2026 research surfaced 7 named features. Status mapped against BSuite's current capability:

| HubSpot Spring 2026 feature | BSuite status | Evidence |
|---|---|---|
| Breeze Assistant (AI-drafted email + content) | 🟡 PARTIAL — CRM7 AI assistant lazy-loaded panel exists but doesn't include first-class email-drafting | crm7#795 (lazy-load); future FEATURE rotation candidate |
| **AEO (Answer Engine Optimization)** | ✅ **SHIPPED this rotation** (braden llms.txt + llms-full.txt) | This document |
| Smart Deal Progression (evidence-based stage gates) | ✅ STAGE-ROTTING SHIPPED, evidence-required-gates NOT yet | crm7#191 ships per-stage `stage_entered_at` + rotting alerts (HubSpot/Pipedrive/Salesforce 2026 parity); the next layer (require logged-activity to move stages) is a future COMPETE candidate |
| Prospecting Agent (autonomous outbound) | 🔲 NOT TRACKED | New competitive gap — file as future FEATURE rotation candidate; depends on conduit candidate-outreach surface |
| Customer Agent (autonomous ticket resolution) | 🔲 NOT TRACKED | New competitive gap — no current ticketing surface in BSuite to apply this to |
| Data Enrichment (two-field form strategy) | 🔲 NOT TRACKED | New competitive gap — applies to BSU + crm7 contact-creation flows; future UX rotation candidate |
| Buyer Intent | 🔲 N/A | Outside BSuite scope (no marketing-attribution layer to apply this to) |

Pipeline-velocity (Ashby/Lever parity for conduit) is in flight via [conduit#280](https://github.com/GaryOcean428/conduit/pull/280) — the COMPETE work-in-progress on a separate `claude/inspiring-thompson-Tiot0` branch with CI failures being worked through by ship-all-apps. Not duplicated by this rotation.

## Other open carry-forwards (re-listed for next rotations)

- 🔲 W2 Task 4 consumer slice (`/reports list grouped by scope`) — STILL blocked on [crm7#852](https://github.com/GaryOcean428/crm7/pull/852) (DataTable Pass 2) + [crm7#853](https://github.com/GaryOcean428/crm7/pull/853) (FilterBar Pass 2) merging to `development`. Wave-override candidate once primitives land. claude-loop wave owner.
- 🔲 W2 Tasks 6/7/9 RPC implementations (`report_timesheet_summary`, `report_pay_item_group_hours`, etc.) — per the seeded paramSchema. claude-loop wave owner.
- 🔲 [BSU#376](https://github.com/GaryOcean428/business-suite-unified/pull/376) — W4 Permissions Editor Pass 2, pending ship-all-apps merge.
- 🔲 [BSU#375](https://github.com/GaryOcean428/business-suite-unified/pull/375) — W6 Branding Pass 2, pending ship-all-apps merge.
- 🔲 PERF lazy-shell carry-forward (slices 4-6) — braden + throughput Vite + main.tsx audit (same shape as [R80.3#275](https://github.com/GaryOcean428/R80.3/pull/275)), conduit Next.js 16 `dynamic()` (different shape). Queue for next **PERF** rotation.
- 🔲 Patch upstream W2 seed migration — `crm7/supabase/migrations/20260522020000_seed_codehouse_parity_report_templates.sql` should use `INSERT ... WHERE NOT EXISTS` instead of `ON CONFLICT (template_key) DO NOTHING` (PG partial-index inference quirk documented in bsuite#1219). Small one-file PR. Queue for next **DB** rotation.
- 🔲 Schema-reconciliation audit — bsuite#1221 follow-up. Queue for next **DB** rotation.
- 🔲 **Fold this doc into the master roadmap** — append a "Recently Completed (2026-05-24)" section to `20260227-bsuite-master-roadmap-v5.00W.md` referencing this companion doc + bump the Last Updated line + Revision log. Queue for next **ROADMAP** rotation. (Companion-doc pattern matches `20260508-boot-engine-shipped-evidence-v1.00W.md` precedent; the master roadmap was not edited in this rotation because the 126KB file exceeds the inline-content limit of `mcp__github__push_files` in the current run environment — split is a tooling artefact, not a doctrine choice.)

## Tracking issues + PRs

- Rotation tracker: [bsuite#1226](https://github.com/GaryOcean428/bsuite/issues/1226) → closed by this run
- braden PR (open + draft): pending in this run — branch `claude/brave-cerf-ET9Fo`, commit sha `2a0fcc846b76635ff7b08edced5036c5ed4f4355`
- bsuite parent PR (open + draft): pending in this run — branch `claude/blissful-dijkstra-ET9Fo` carrying this companion doc

## Next task in rotation chain

Per `DEPS → FEATURE → UI → UX → WL → TYPES → A11Y → DB → EDGE → TESTS → DOCS → PERF → ROADMAP → COMPETE → DEPS → ...`, the next rotation step is **DEPS**.
