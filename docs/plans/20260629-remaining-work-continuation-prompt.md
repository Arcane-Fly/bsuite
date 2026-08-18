# Continuation Prompt — BSuite Remaining Work (kick off a new thread)

> Paste the block below into a fresh thread. It is self-contained; it points at the curated roadmap and the live truth sources, and it encodes the operating gates so the new thread runs verifier-gated to completion.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

You are continuing autonomous BSuite work. The recruitment-comms + RAMS cluster is fully shipped + live-verified, all 7 repos are `development == main` aligned, and auth is COMPLIANT. Your job: execute the remaining-work roadmap to a world-class bar, engineered-loop style (Maker → independent ground-truth Verifier → merge), finishing only at 100% with evidence. Do NOT checkpoint early.

## Read first (truth sources — verify, don't trust memory)

- Roadmap: `docs/plans/20260629-bsuite-remaining-work-roadmap-v1.00W.md` (prioritised Now/Next/Later/Backlog + per-task owner/acceptance/validation/skills).
- Live truth: the dashboard `docs/dashboard/` + `gh issue list --repo GaryOcean428/<repo>` for all 7 repos. Use `gh api repos/GaryOcean428/<repo>/branches/<b> --jq .commit.sha` for authoritative SHAs (local refs lag).
- **Parent gitlink verification (CRITICAL — prior session had a silent regression here):** also verify `gh api repos/GaryOcean428/bsuite/contents/<submodule-path> --jq '.sha'` matches each app-repo's HEAD SHA. Branch SHA equality alone does NOT prove the parent gitlink points at the app HEAD — these are two different axes. Check BOTH every cycle.
- Memory: `project_recruitment_cluster_built_20260623`, `feedback_prod_validation_catches_empty-data_bugs`, `feedback_parent_pointer_reconcile_gotchas`, `feedback_cron_vault_secret_seeding`, `feedback_squash_loses_parent_linkage`, `feedback_supabase_migrate_pipeline_model`, `feedback_grep_env_first`, `feedback_subagent_model_tiering`.

## Operating context

- Shared Supabase prod project: `tuybltdrdefjblnplpqo` (use Supabase MCP + `get_advisors`). Migration floor `20260611000000` via `supabase-migrate.yml` (psql applier; parent pointer must point at the app-main carrying the migration — bump via `update-index`+commit-index, no pathspec).
- Signed-in live-verify (§12.3): `braden.lang77@gmail.com` / `I.Am.Dev.1` via BrowserBase on `d.*`/prod (in the OAuth allowlist; random Vercel previews are not). Seed REAL data and exercise the populated path — empty-path 200 is NOT validation.
- `.env.local` (monorepo root) holds RAM M2M creds, `SUPABASE_SERVICE_ROLE_KEY` (new `sb_` format), `POSTGRES_URL_NON_POOLING`. Never echo secrets; pipe from env.
- Parent dev↔main: the hourly dashboard cron pushes to parent `main`, so dev→main PRs go DIRTY on the dashboard files — resolve `--ours` per `tandem-dev-main-reconcile`. App repos have no cron (stay aligned).
- **Parent commit discipline (MANDATORY):** before ANY parent commit, run `git diff --cached --stat` and verify ONLY the intended files are staged. `git commit -m` without a pathspec will silently stage drifted submodule gitlinks — this caused a real regression in the prior session. Always use `git commit -m '...' -- <pathspec>` or verify `--cached --stat` first.

## Start every turn with `master-orchestration` (BSuite family). Then work the roadmap in priority order

**NOW — autonomous (unblocked, no human review needed):**

1. conduit recruitment intake chain: #219 candidate schema → #218 public apply → #231 CRM7 cross-schema read of conduit candidate data (DRY-compliant — no snapshot/mirror; CRM7 reads via Supabase cross-schema view or API).
2. BSU #416 developer-nav rebuild to UX doctrine.

**NOW — requires Braden domain review (do NOT proceed without review):**
3. CRM7 entity-entry wizards: #659 people, #660 host-employers (ABN + multi-site), #661 RTO unify, #662 units of competency — domain rules need Braden sign-off.
4. CRM7 #678 forward-year charge schedule + annual-review gate — compliance-critical billing, Braden review required.

**NEXT:** CRM7 GTO reports #528/#530/#531/#532/#533; R80.3 #320 `@bsuite/stp` → #321 payroll hydration → #233 invoicing; crm7#1090 FO admin-UI + tenant-scope `field_officers` RLS; conduit#223 assessment integration.

**External-blocked (file/ask, don't build speculatively):** conduit#338 lodgement lifecycle (needs RAMS status-check/callback contract); crm7#479 Xero registration; bsuite#1322 Sydney migration; bsuite#607 BSU env vars.

**Auth hygiene (quick):** D1 `pnpm install` in conduit (dry-lint 0.4.0→0.5.0); D2 stale JSDoc sessionStorage→localStorage in R80.3 + conduit callbacks; F1 decide per-app `storageKey` standardisation.

## Gates (non-negotiable)

- Gate A: query installed source / Tavily for library behaviour before editing (Context7 may be offline).
- DB: floor-gated migration + live-catalog verify + `get_advisors` triage + allowlist any new SECURITY DEFINER fn in `docs/security/supabase-advisor-allowlist.json` (else the advisor sweep fails). **Rollback:** if a migration breaks a tenant, `supabase migration repair --status reverted <migration_id>` then re-apply the prior floor; document the rollback in the PR description before applying to prod.
- §9.1 output-equivalence (refactors/migrations) / §9.2 visual-equivalence (UI, 375/768/1440) / §12.3 deployed signed-in evidence (user-facing).
- DRY one-shot: owning app provides CRUD; others read + link (no mirror tables / duplicate entity forms).
- Maker ≠ Verifier; `--merge` not squash for sync PRs; close issues only with linked evidence; update the dashboard + memory in the same cycle.

## Definition of done

Each roadmap item: code merged + CI green, DB applied+recorded, advisors triaged, deployed signed-in evidence captured, issue closed with evidence, dashboard + memory updated, parent pointers reflected, all 7 repos still `development == main`.
