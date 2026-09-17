---
kind: record
authority: none
owner: bsuite
---

# Evaluate Cloud Talent Solution for candidate↔job matching against conduit's talent pools

https://github.com/GaryOcean428/conduit/issues/405

Snapshot updatedAt: 2026-08-24T03:26:33Z. Open at capture; re-read live.

Operator direction 2026-07-30: use CTS *"for candidate matching with talent pools and available open job postings"* — i.e. **in-product matching**, not distribution.

## That is the correct use of it, and it is a different product from Google for Jobs

Confirmed against Google's own docs (via the google-dev-knowledge corpus, 2026-07-30):

| | Cloud Talent Solution | Google for Jobs (Search) |
|---|---|---|
| What it does | Powers search/matching **within your own site** using Google's ML | Aggregated job results in Google Search |
| How data gets in | You upload jobs to `jobs.googleapis.com` and it indexes them **for your platform only** | Crawls `schema.org/JobPosting` structured data on a public page |
| Does it publish to Google for Jobs? | **No.** "Cloud Talent Solution does not publish or submit jobs to Google Search results." | — |

Sources: `developers.google.com/search/docs/appearance/structured-data/job-posting`, `cloud.google.com/talent-solution/job-search/docs/basics`.

**So conduit already has the distribution half right** — it emits `JobPosting` JSON-LD on the public careers pages, which is the only mechanism that gets a job into Google for Jobs, and it is free and self-serve. Nothing to add there. (The Indexing API is the one optional extra: it prompts a recrawl on post/expire rather than waiting for Googlebot.)

CTS is worth evaluating for something conduit genuinely lacks: **ranked matching between `r7_talent_pools` / `r7_candidates` and open `r7_jobs`.**

## Scope to evaluate (not yet approved to build)

1. **Cost and data-residency first.** CTS is a paid GCP service and would mean sending candidate and job data to Google. Candidate records here carry consent-gated sensitive demographics (Aboriginal/Torres Strait Islander status, disability status) under an explicit privacy-notice regime — `r7_privacy_notice_versions`, `r7_talent_pool_consent_tokens`. **Whether the existing consents even permit that disclosure is a legal question, not a technical one, and it gates everything else.**
2. Auth must be **WIF** — static service-account keys are banned suite-wide (`CLAUDE.md`). GCP project `claritycrm-hpofn`, pool `supabase-edge-functions`.
3. Compare against the cheaper baseline: Postgres full-text + trigram + the qualification/ANZSCO/STA identifiers already modelled in crm7. CTS earns its cost only if it clearly beats that.
4. If adopted, it is a **read-side matcher only** — conduit's own tables stay canonical. No mirroring of candidate data as a source of truth.

## Explicitly out of scope

**Third-party Google Jobs scrapers (SearchApi / Apify / JSearch).** They exist for aggregating *other people's* listings — conduit is a publisher, not an aggregator, and scraping Google's results carries ToS risk. The one arguably legitimate use is market research (what competitors pay for a Cert III Carpentry apprentice in Perth, feeding R8's margin work) — that is a separate product decision and should not be smuggled in under this issue.

## Cross red-team
Legal/privacy first (operator is a lawyer), then security for the WIF path.

## Skills to load
`research-best-practice`, `check-security`, `general-dry-one-shot-architecture`

## Self-report on divergence
Mandatory. Do not begin implementation before item 1 is answered.
