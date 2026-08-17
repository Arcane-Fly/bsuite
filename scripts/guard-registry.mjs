/**
 * scripts/guard-registry.mjs
 *
 * The declared registry consumed by scripts/check-guard-self-reporting.mjs
 * (bsuite's "watcher of watchers", codename LANE-WATCHER).
 *
 * WHY A DECLARED REGISTRY, NOT A --self-report CONVENTION
 * ---------------------------------------------------------------------------
 * Two designs were on the table: (a) a declared registry naming each guard's
 * real invocation, or (b) a `--self-report` flag every guard implements that
 * emits a structured summary the watcher parses.
 *
 * (b) was rejected. It would require touching every guard in the estate
 * (~45 across 7 repos) to add a new flag before the watcher could see any of
 * them, which is exactly backwards for a tool whose first job is to survey
 * the estate AS IT STANDS TODAY and report what it finds — "some guards WILL
 * fail this check" is the expected, useful first result, not a bug to
 * engineer away before shipping. A convention also invites the textual-
 * inspection trap this programme exists to retire: it would be trivial to
 * bolt on a `--self-report` flag that prints a plausible-looking summary
 * without the underlying scan having examined anything, which is a false
 * sense of coverage in a shinier wrapper.
 *
 * (a) costs nothing per guard and, critically, keeps the classification tied
 * to EXECUTION: this file records what command reproduces each guard's real
 * CI behaviour, and the watcher's verdict comes from actually running that
 * command and reading its output — never from reading the guard's source.
 * Every command below was run by hand against this tree while building this
 * registry (2026-08-13); the `evidence` field is the real stdout/stderr
 * line(s) that justified each guard's classification, kept so a reviewer can
 * sanity-check the automated verdict against what a human actually saw.
 *
 * INVOCATION CHOICE — FULL-UNIVERSE OVER DIFF-SCOPED WHERE POSSIBLE
 * ---------------------------------------------------------------------------
 * Several guards run in two modes: a full-tree scan and a diff-scoped
 * "changed files only" forward gate (the shape CI actually uses on a PR).
 * Where a full-tree/whole-repo mode exists AND is safe (read-only, no
 * credentials), this registry uses it — a diff-scoped run against a branch
 * that happens to touch zero relevant files legitimately reports "0
 * changed", and that zero is not evidence of anything (see `diffScoped`
 * below for how the watcher treats the ones that have no such mode).
 *
 * MODES
 * ---------------------------------------------------------------------------
 *   'canary'  — the watcher's own bootstrap self-test. Exactly one entry.
 *               MUST be classified as a self-reporting failure every run; if
 *               it is not, the watcher has stopped working and refuses to
 *               certify anything else (see check-guard-self-reporting.mjs).
 *   'run'     — execute `command` in `cwd` and classify the output.
 *   'skip'    — do not execute. `skipReason` is mandatory and is printed
 *               verbatim in the report. Used for guards that need live
 *               credentials, hit production infrastructure over the network,
 *               mutate state (deploys, migration applies), or need a
 *               dependency install this environment did not have.
 *
 * `diffScoped: true` tells the watcher this guard's "examined nothing"
 * failure mode legitimately includes "genuinely nothing changed in this
 * diff" — for those, an explicit, referenced zero (e.g. "No changed SQL
 * migration files in diff vs origin/main") counts as a pass, not just a
 * stated positive count. See DIFF_CONTEXT_RE in the watcher.
 *
 * `knownSilent: true` marks a guard this survey found genuinely fails the
 * self-reporting check on its real CI invocation, TODAY, in this tree. These
 * are tracked rather than blocking CI immediately (see check-secret-naming.sh
 * ALLOWLIST/R0 for the estate's established idiom of "introduce a stricter
 * gate without breaking every open PR on day one"). The watcher still prints
 * them every run, and also flags the reverse drift — a `knownSilent` entry
 * that now legitimately passes is stale and must be removed here.
 *
 * SCOPE OF THIS REGISTRY
 * ---------------------------------------------------------------------------
 * This is not literally every script in scripts/ across all 7 repos (there
 * are audit tools that take a live URL argument, one-shot codemods, and
 * setup scripts that are not policy guards at all). It IS every custom,
 * CI-wired PASS/FAIL policy guard this survey found and could identify a
 * safe, real invocation for, across the parent and its 6 submodules. Guards
 * found but deliberately left out of the registry (wrong shape for this
 * tool, e.g. audit-d2c-theme.sh is a report generator with no verdict of its
 * own — the pass/fail threshold logic lives inline in
 * theme-conformance.yml) are named in the PR description, not silently
 * dropped.
 */

export const REPO_ROOT_MARKER = '.bsuite-guard-registry-root'

export const GUARDS = [
  // ---------------------------------------------------------------------
  // Bootstrap canary — MUST stay first, MUST stay exactly one entry.
  // ---------------------------------------------------------------------
  {
    id: 'lane-watcher-canary',
    label: 'LANE-WATCHER bootstrap canary (deliberately silent fixture)',
    repo: '.',
    command: ['bash', 'scripts/__fixtures__/silent-canary-guard.sh'],
    ciWorkflow: '.github/workflows/guard-self-reporting.yml',
    mode: 'canary',
    notes:
      'Exits 0, prints nothing, on purpose. The watcher must classify this ' +
      'as a self-reporting failure every run; failing to do so is a ' +
      'BOOTSTRAP FAILURE of the watcher itself, not a normal finding.',
  },

  // ---------------------------------------------------------------------
  // Parent monorepo
  // ---------------------------------------------------------------------
  {
    id: 'parent-semgrep-sast',
    label: 'Semgrep SAST ratchet (ERROR-severity findings, per app)',
    repo: '.',
    // Scoped to the parent's own scripts/ + .github/ rather than the full
    // 7-app matrix: the watcher runs every registered guard on every
    // invocation, and a 7-app semgrep sweep is ~15 minutes. One app proves
    // the guard self-reports; CI runs the full matrix.
    command: ['node', 'scripts/semgrep-sast.mjs', '--app', 'bsuite'],
    ciWorkflow: '.github/workflows/semgrep-sast.yml',
    mode: 'skip',
    skipReason:
      'Needs the semgrep binary (pip install semgrep), which this environment ' +
      'does not have by default. CI installs it explicitly. Verified by hand ' +
      'against semgrep 1.173.0 on 2026-08-16 — a clean pass prints ' +
      '"bsuite scanned=  118  ERROR=  0 (baseline 0) ... held" plus a trailing ' +
      '"semgrep-sast: 1 app(s), 118 file(s) scanned", so it self-reports a ' +
      'non-zero examined count. Scanning 0 files is a hard failure in the ' +
      'guard, not a pass.',
  },

  {
    id: 'parent-check-tailwind-v4',
    label: 'Tailwind v4+ policy (package manifests + lockfiles)',
    repo: '.',
    command: ['node', 'scripts/check-tailwind-v4.mjs'],
    ciWorkflow: '.github/workflows/build-and-test.yml',
    mode: 'run',
    evidence:
      '(after 2026-08-13 fix) "Tailwind v4+ policy OK: 27 package ' +
      'manifest(s) and 16 lockfile(s) scanned, none resolve Tailwind below ' +
      'v4." — was "Tailwind v4+ policy OK: no package manifests or ' +
      'lockfiles resolve Tailwind below v4." (no count at all) before this ' +
      "survey's fix.",
  },
  {
    id: 'parent-check-ai-gateway-compliance',
    label: 'AI Gateway compliance (model roster usage)',
    repo: '.',
    command: ['node', 'scripts/check-ai-gateway-compliance.mjs'],
    ciWorkflow: '.github/workflows/build-and-test.yml',
    mode: 'run',
    evidence: '"AI Gateway compliance check passed for 413 files."',
  },
  {
    id: 'parent-check-supabase-client-init',
    label: 'Supabase client init hardening (per-app audit)',
    repo: '.',
    command: ['node', 'scripts/check-supabase-client-init.mjs'],
    ciWorkflow: '.github/workflows/build-and-test.yml',
    mode: 'run',
    evidence: '"Result: 5/5 apps passed"',
  },
  {
    id: 'parent-check-doc-naming',
    label: 'Dated-doc naming convention',
    repo: '.',
    command: ['node', 'scripts/check-doc-naming.mjs', '--warn-only'],
    ciWorkflow: '.github/workflows/doc-naming.yml',
    mode: 'run',
    evidence: '"check-doc-naming: scanned 299 dated markdown files"',
  },
  {
    id: 'parent-sync-inline-eslint-rules',
    label: 'Inlined ESLint rule parity (submodule copies vs monorepo source)',
    repo: '.',
    command: ['node', 'scripts/sync-inline-eslint-rules.mjs', '--check'],
    ciWorkflow: '.github/workflows/inline-eslint-rule-parity.yml',
    mode: 'run',
    evidence:
      '"10 manifest entries verified against the live source, 2 ' +
      'submodule(s) not yet carrying a manifest."',
  },
  {
    id: 'parent-check-secret-naming',
    label: 'Secret-naming drift (R1-R6 env var naming)',
    repo: '.',
    command: ['bash', 'scripts/check-secret-naming.sh'],
    ciWorkflow: '.github/workflows/secret-naming-drift.yml',
    mode: 'run',
    evidence:
      '"secret-naming drift check: PASS — 47 allowlist entries verified ' +
      'live, all submodules scanned" — the reference implementation this ' +
      'whole programme generalises from.',
  },
  {
    id: 'parent-check-edge-function-slug-collisions',
    label: 'Edge function slug collisions across all deploy scopes',
    repo: '.',
    command: ['node', 'scripts/check-edge-function-slug-collisions.mjs', '--require-scopes=6'],
    ciWorkflow: '.github/workflows/edge-function-slug-collision-lint.yml',
    mode: 'run',
    evidence:
      '"check-edge-function-slug-collisions: OK — 64 function slug(s) ' +
      'across 6 scope(s) ..., no collisions." — the other reference ' +
      'implementation.',
  },
  {
    id: 'parent-check-migration-version-collisions',
    label: 'Migration version collisions across all scopes',
    repo: '.',
    command: ['node', 'scripts/check-migration-version-collisions.mjs', '--require-all-scopes'],
    ciWorkflow: '.github/workflows/migration-version-collision-lint.yml',
    mode: 'run',
    evidence:
      '"check-migration-version-collisions: OK (809 file(s) scanned ' +
      'across 8 of 8 declared scope(s): ...; 25 known collision(s), all 25 ' +
      'allowlisted)"',
  },
  {
    id: 'parent-check-migration-collisions-at-branch-tips',
    label: 'Migration collisions against sibling branch TIPS (merge-time)',
    repo: '.',
    command: ['node', 'scripts/check-migration-collisions-at-branch-tips.mjs'],
    ciWorkflow: '.github/workflows/migration-collision-branch-tips.yml',
    mode: 'run',
    // Complements parent-check-migration-version-collisions rather than
    // duplicating it: that one reads submodules at the PINNED GITLINK, this one
    // at each submodule's `development` TIP. The gitlink is a snapshot of what
    // the parent already promoted, so it is structurally blind to a migration
    // authored on a sibling's development an hour ago — the exact gap that lost
    // crm7#1715's platform-scope lockdown and bsuite#1913's anon REVOKE.
    //
    // Needs `refs/remotes/origin/development` inside each submodule; the
    // workflow's fetch step provides it. Without it this guard exits 1 naming
    // the scope it could not read, which is correct self-reporting — it refuses
    // to call an estate clean when it failed to look at part of it.
    evidence:
      '"812 versioned migration file(s); MIGRATION_FLOOR=20260611000000 ... ' +
      '4 duplicated version(s) with IDENTICAL content ... 23 divergent ' +
      'duplicate(s) BELOW the floor ... 2 ... allowlisted ... 0 UNRESOLVED ' +
      'collision(s)" — every scope named with its tip SHA and file count.',
  },
  {
    id: 'parent-drift-scan',
    label: 'BSuite 9-signal PR drift scan (parent)',
    repo: '.',
    command: ['node', 'scripts/drift-scan.mjs'],
    ciWorkflow: '.github/workflows/pr-drift-scan.yml',
    mode: 'run',
    evidence: '"0 drift hits across 9 signals (framework: `unknown`, repo: `bsuite`)."',
  },
  {
    id: 'parent-audit-palette-whitelist',
    label: 'Palette whitelist audit (packages/)',
    repo: '.',
    command: ['python3', 'scripts/audit-palette-whitelist.py'],
    ciWorkflow: '.github/workflows/theme-conformance.yml',
    mode: 'run',
    evidence:
      '"Permitted palette: 223 oklch + 27 hex (from the two source-of-truth ' +
      'documents)"',
  },
  {
    id: 'parent-verify-esm-imports',
    label: 'Published package entry points import cleanly under Node ESM',
    repo: '.',
    command: ['bash', 'scripts/verify-esm-imports.sh'],
    ciWorkflow: '.github/workflows/theme-conformance.yml',
    mode: 'run',
    knownSilent: true,
    knownSilentReason:
      'Without its CI precondition (`pnpm -r --filter "./packages/**" ' +
      'build` run first), this prints "PASS: all 0 built packages import ' +
      'cleanly under Node ESM." — a stated ZERO denominator on a real PASS ' +
      'line. In real CI the packages ARE built first (see ' +
      'theme-conformance.yml "Install and build packages" step), so this ' +
      'is not confirmed to fire in production — but the guard itself has ' +
      'no floor check requiring a non-zero built-package count, unlike ' +
      "check-secret-naming.sh's UNSCANNED refusal. If the build step were " +
      'ever skipped, mistyped, or partially failed, this gate would ' +
      'silently rubber-stamp it. Filed, not fixed in this pass.',
    evidence:
      '"PASS: all 0 built packages import cleanly under Node ESM." ' +
      '(observed running the script directly, without the preceding ' +
      "`pnpm -r build` CI does; see knownSilentReason).",
  },
  {
    id: 'parent-check-script-parity',
    label: 'Guard-script copy parity (this monorepo vs its own registry)',
    repo: '.',
    command: ['bash', 'scripts/check-script-parity.sh'],
    ciWorkflow: '.github/workflows/script-parity.yml',
    mode: 'run',
    evidence: '"All 4 gated scripts in parity."',
  },
  {
    id: 'parent-check-migration-floor',
    label: 'Migration floor (no migration stranded below the applier floor)',
    repo: '.',
    command: ['python3', 'scripts/check-migration-floor.py'],
    ciWorkflow: '.github/workflows/migration-floor-lint.yml',
    mode: 'run',
    diffScoped: false,
    evidence: '"Checking 809 migration(s) in the tree." (whole-tree report mode)',
  },
  {
    id: 'parent-dry-free-text-where-fk-lint',
    label: 'DRY: free-text column where an FK belongs (parent)',
    repo: '.',
    command: ['bash', 'scripts/dry-free-text-where-fk-lint.sh', 'origin/main'],
    ciWorkflow: '.github/workflows/dry-lint.yml',
    mode: 'run',
    diffScoped: true,
    evidence: '"[dry-lint] No changed SQL migration files in diff vs origin/main — clean."',
  },
  {
    id: 'parent-explicit-grant-lint',
    label: 'Explicit PostgREST/Data-API grant lint (parent)',
    repo: '.',
    command: ['bash', 'scripts/explicit-grant-lint.sh', 'origin/main'],
    ciWorkflow: '.github/workflows/explicit-grant-lint.yml',
    mode: 'run',
    diffScoped: true,
    evidence: '"[grant-lint] No changed SQL migration files in diff vs origin/main — clean."',
  },
  {
    id: 'parent-verify-submodule-scopes',
    label: 'Submodule checkout completeness (cross-scope precondition)',
    repo: '.',
    command: ['bash', 'scripts/verify-submodule-scopes.sh'],
    ciWorkflow: '.github/workflows/supabase-functions-deploy.yml',
    mode: 'run',
    evidence:
      '(after 2026-08-13 fix) "verify-submodule-scopes: 6 scope(s) ' +
      'verified checked out at the recorded gitlink commit: R80.4 braden ' +
      'business-suite-unified conduit crm7 throughput" — was ' +
      '"verify-submodule-scopes: R80.4 braden business-suite-unified ' +
      "conduit crm7 throughput\" (a bare name list, no count) before this survey's fix.",
  },
  {
    id: 'parent-check-migration-fk-indexes',
    label: 'FK-on-REFERENCES-needs-index lint (parent, real diff-scoped CI shape)',
    repo: '.',
    command: ['node', 'scripts/check-migration-fk-indexes.mjs', '--changed-files='],
    ciWorkflow: '.github/workflows/migration-fk-index-lint.yml',
    mode: 'run',
    diffScoped: true,
    knownSilent: true,
    knownSilentReason:
      'Real CI shape (`--changed-files=` with the diff\'s file list, empty ' +
      'on a PR touching no migrations) prints the bare line ' +
      '"check-migration-fk-indexes: no files — OK" — no base ref named, no ' +
      'count, nothing that would look different if the upstream diff ' +
      'computation silently broke and always returned empty. The crm7 copy ' +
      '(scripts/check-migration-fk-indexes.mjs) has the identical defect — ' +
      'same lineage, filed together. Filed, not fixed in this pass.',
    evidence: '"check-migration-fk-indexes: no files — OK"',
  },
  {
    id: 'parent-check-supabase-advisors',
    label: 'Supabase advisor sweep (security/performance advisors)',
    repo: '.',
    command: null,
    ciWorkflow: '.github/workflows/supabase-advisor-sweep.yml',
    mode: 'skip',
    skipReason:
      'Needs a live Supabase project + management API credentials ' +
      '(SUPABASE_ACCESS_TOKEN / project ref) to call the hosted advisors ' +
      'API. Not available to, and not safe to grant to, an unattended ' +
      'meta-check.',
  },
  {
    id: 'parent-audit-prod-migration-history',
    label: 'Production migration history audit (self-test only — real mode needs prod DB creds)',
    repo: '.',
    command: ['node', 'scripts/audit-prod-migration-history.mjs', '--self-test'],
    ciWorkflow: '.github/workflows/prod-migration-history-audit.yml',
    mode: 'run',
    notes:
      "Real mode queries the live production database and can't run here; " +
      'registered against its `--self-test` instead, which is itself a ' +
      "reasonable proxy for \"this guard's reporting logic works\" per this " +
      "registry's stated preference for execution over inspection.",
    evidence: '"audit-prod-migration-history: self-test OK (10 cases)"',
  },
  {
    id: 'parent-check-schema-lag',
    label: 'Schema lag (what is merged on this ref but NOT yet in the database?)',
    repo: '.',
    command: ['node', 'scripts/check-schema-lag.mjs', '--self-test'],
    ciWorkflow: '.github/workflows/schema-lag.yml',
    mode: 'run',
    // Registered against `--self-test`, NOT its real invocation, and that is a
    // deliberate exception to this registry's full-universe preference.
    //
    // The real run needs SUPABASE_DB_URL to read
    // supabase_migrations.schema_migrations — a live production credential. The
    // watcher holds none, so a `mode: 'run'` registration against the real
    // command would fail closed on every sweep and record a permanent
    // COULD_NOT_EXECUTE. Registering the self-test means the watcher verifies
    // the thing it CAN verify: that the guard's six fixtures still discriminate.
    //
    // The real invocation runs in CI (schema-lag.yml), daily and on every PR
    // touching a migration, where the secret exists.
    evidence: '"self-test: 6/6 passed"',
  },
  {
    id: 'parent-check-own-package-freshness',
    label: 'Own-package freshness (do the six apps run our latest @bsuite/* publishes?)',
    repo: '.',
    command: ['node', 'scripts/check-own-package-freshness.mjs'],
    ciWorkflow: '.github/workflows/own-package-freshness.yml',
    mode: 'run',
    // Registered against its REAL invocation, not its --self-test, per this
    // registry's full-universe preference. It is read-only and hits only the
    // public npm registry — none of the `skip` criteria (live credentials,
    // production infrastructure, state mutation) apply. When the estate IS
    // stale the guard exits 1, which the watcher records as NOT_EVALUATED;
    // that is correct — a non-zero exit is a finding, not a false pass.
    //
    // PRECONDITION: `yaml` and `semver` must be resolvable (the guard refuses
    // to grep pnpm-lock.yaml as a fallback and exits 2 naming what is
    // missing). guard-self-reporting.yml installs both into a scratch prefix
    // and exports BSUITE_GUARD_NODE_MODULES; spawnSync inherits it.
    evidence:
      '"check-own-package-freshness: 6 app(s), 52 @bsuite/* dependency ' +
      'edge(s) examined across 12 distinct published package(s) via ' +
      'https://registry.npmjs.org — 52 current, 0 stale-but-in-range, 0 ' +
      'exact-pinned-behind, 0 range-behind, 0 ahead, 0 embargoed, 0 linked, ' +
      '0 not-published." — run by hand against this tree 2026-08-17. The ' +
      'same run against the COMMITTED origin/development gitlinks (the state ' +
      'CI checks out) exits 1 with "FRESHNESS FAILURE — 21 of 52 edge(s) do ' +
      'not run our latest", which is the positive control proving the guard ' +
      'fires: 15 STALE-BUT-IN-RANGE + 6 EXACT-PINNED-BEHIND across all six ' +
      'apps (@bsuite/theme 0.11.2, nav-core 0.9.1, ui 1.0.3, dry-lint 1.0.1).',
  },
  {
    id: 'parent-check-oauth-redirect-uris',
    label: 'OAuth redirect URI live probe',
    repo: '.',
    command: null,
    ciWorkflow: '.github/workflows/oauth-provider-check.yml',
    mode: 'skip',
    skipReason:
      'Makes live network calls (curl, 25s timeout per URI) against the ' +
      'production Supabase OAuth authorize endpoint. Excluded to avoid an ' +
      'automated meta-check repeatedly hitting live prod auth ' +
      'infrastructure on every run.',
  },

  // ---------------------------------------------------------------------
  // crm7
  // ---------------------------------------------------------------------
  {
    id: 'crm7-lint-sql-migrations',
    label: 'SQL migration lint — duplicate versions (crm7, THE founding incident)',
    repo: 'crm7',
    command: ['node', 'scripts/lint-sql-migrations.mjs', '--duplicates-only', 'supabase/migrations'],
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'run',
    notes:
      'This is founding incident #4 from the LANE-WATCHER brief: this exact ' +
      'invocation — the one db-lint.yml runs on every PR — printed ZERO ' +
      'bytes and exited 0 on a clean scan, discovered live by this survey ' +
      'on 2026-08-13 (the crm7#1606 fix only covered the bare/no-args ' +
      'form, a different code path). Fixed in this PR; see ' +
      'crm7/scripts/lint-sql-migrations.mjs header and its two new ' +
      '`--self-test` regression cases.',
    evidence:
      '(after fix) "no-duplicate-migration-version: OK -- 589 SQL file(s) ' +
      'checked in .../crm7/supabase/migrations (580 distinct version(s), ' +
      '0 collision(s))." — was completely empty stdout+stderr, exit 0, ' +
      "before this survey's fix.",
  },
  {
    id: 'crm7-lint-migrations-revoke-anon',
    label: 'REVOKE FROM anon pairing for SECURITY DEFINER functions (crm7, full-tree)',
    repo: 'crm7',
    command: ['node', 'scripts/lint-migrations-revoke-anon.mjs', 'supabase/migrations'],
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'run',
    evidence:
      '"[lint-migrations-revoke-anon] OK (full-tree mode): 181 in-scope ' +
      'SECURITY DEFINER public function(s) scanned, 251 named REVOKE ' +
      'pair(s) tree-wide + wildcard REVOKE on schema public, 0 explicit ' +
      'allow-marker(s)."',
  },
  {
    id: 'crm7-lint-migrations-secdef-search-path',
    label: 'search_path pinning for SECURITY DEFINER functions (crm7, full-tree)',
    repo: 'crm7',
    command: ['node', 'scripts/lint-migrations-secdef-search-path.mjs', 'supabase/migrations'],
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'run',
    evidence:
      '"[lint-migrations-secdef-search-path] OK (full-tree mode): 159 ' +
      'in-scope SECURITY DEFINER public function(s) scanned, 152 inline ' +
      'search_path declaration(s), 37 ALTER FUNCTION search_path fix(es) ' +
      'tree-wide."',
  },
  {
    id: 'crm7-check-migration-fk-indexes',
    label: 'FK-on-REFERENCES-needs-index lint (crm7, real diff-scoped CI shape)',
    repo: 'crm7',
    command: ['node', 'scripts/check-migration-fk-indexes.mjs', '--changed-files='],
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'run',
    diffScoped: true,
    knownSilent: true,
    knownSilentReason: 'Identical defect to parent-check-migration-fk-indexes — same script lineage.',
    evidence: '"check-migration-fk-indexes: no files — OK"',
  },
  {
    id: 'crm7-lint-rls-jwt-claims',
    label: 'Banned JWT claim patterns in RLS policies (crm7)',
    repo: 'crm7',
    command: ['bash', 'scripts/lint-rls-jwt-claims.sh'],
    ciWorkflow: 'crm7/.github/workflows/rls-jwt-lint.yml',
    mode: 'run',
    knownSilent: true,
    knownSilentReason:
      'Prints "✅ No banned JWT claim patterns found in ' +
      'supabase/migrations/" on a clean run — no count of files or ' +
      'policies scanned. Filed, not fixed in this pass.',
    evidence: '"✅ No banned JWT claim patterns found in supabase/migrations/"',
  },
  {
    id: 'crm7-check-report-catalog-drift',
    label: 'report_catalog_* drift vs live schema (crm7)',
    repo: 'crm7',
    command: null,
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'skip',
    skipReason:
      'Needs DATABASE_URL / SUPABASE_DB_URL to validate against the live ' +
      'schema. Worth noting as a GOOD CITIZEN while skipping it: run ' +
      'without credentials it refuses outright — "DATABASE_URL (or ' +
      'SUPABASE_DB_URL) is required — this gate validates report_catalog_* ' +
      'against the live schema and will not guess. A drift check that ' +
      'skips when it cannot connect is worse than none." — exactly the ' +
      'refuse-rather-than-guess shape this whole programme wants.',
  },
  {
    id: 'crm7-verify-bs-oauth-session-sync',
    label: 'BS OAuth session-bridge AST check (crm7)',
    repo: 'crm7',
    command: null,
    ciWorkflow: 'crm7/.github/workflows/verify-bs-oauth-session-sync.yml',
    mode: 'skip',
    skipReason:
      "Imports the `typescript` package for its AST walk; this worktree's " +
      'crm7 checkout has no node_modules installed (no `pnpm install` was ' +
      'run — out of scope for a read-mostly survey). Same reason applies ' +
      'to every submodule copy of this script (braden, throughput, R80.4).',
  },

  // ---------------------------------------------------------------------
  // business-suite-unified (BSU)
  // ---------------------------------------------------------------------
  {
    id: 'bsu-dry-free-text-where-fk-lint',
    label: 'DRY: free-text column where an FK belongs (BSU)',
    repo: 'business-suite-unified',
    command: ['bash', 'scripts/dry-free-text-where-fk-lint.sh', 'origin/main'],
    ciWorkflow: 'business-suite-unified/.github/workflows/dry-lint.yml',
    mode: 'run',
    diffScoped: true,
    evidence: '"[dry-lint] No changed SQL migration files in diff vs origin/main — clean."',
  },
  {
    id: 'bsu-drift-scan',
    label: 'BSuite 9-signal PR drift scan (BSU)',
    repo: 'business-suite-unified',
    command: null,
    ciWorkflow: 'business-suite-unified/.github/workflows/pr-drift-scan.yml',
    mode: 'skip',
    skipReason:
      'business-suite-unified/scripts/drift-scan.mjs does not exist in ' +
      "this checkout — a real gap, but NOT a silent one: the workflow's " +
      'own "Verify scanner presence" step checks for the file, prints ' +
      '`::warning::scripts/drift-scan.mjs not present on this branch — ' +
      'skipping.`, and sets SCAN_SKIPPED so every dependent step is ' +
      "gated off. That is the pattern this whole programme wants — it's " +
      'filed here as a script-sync gap between repos, not executed because ' +
      'there is nothing to execute.',
  },
  {
    id: 'bsu-check-eslint-rule-parity',
    label: 'Inlined ESLint rule parity (BSU copy vs monorepo source)',
    repo: 'business-suite-unified',
    command: null,
    ciWorkflow: 'business-suite-unified/.github/workflows/eslint-rule-parity.yml',
    mode: 'skip',
    skipReason:
      "Needs the `eslint` package for its \"armed-ness\" probe; this worktree's " +
      'BSU checkout has no node_modules installed. Partial run (5 of 6 ' +
      'checks) showed real per-rule comparisons with explicit checkmarks ' +
      'before failing on the missing dependency — worth a follow-up run ' +
      'with node_modules installed.',
  },

  // ---------------------------------------------------------------------
  // conduit
  // ---------------------------------------------------------------------
  {
    id: 'conduit-dry-free-text-where-fk-lint',
    label: 'DRY: free-text column where an FK belongs (conduit)',
    repo: 'conduit',
    command: ['bash', 'scripts/dry-free-text-where-fk-lint.sh', 'origin/main'],
    ciWorkflow: 'conduit/.github/workflows/dry-lint.yml',
    mode: 'run',
    diffScoped: true,
    evidence:
      '"[dry-lint] Scanning changed migrations vs origin/main: ' +
      'supabase/migrations/20260815010000_....sql" then "Clean — no ' +
      'free-text-where-FK violations in changed migrations." — a real, ' +
      'non-empty diff exercised end to end (better evidence than an empty ' +
      'diff would have been).',
  },

  // ---------------------------------------------------------------------
  // braden
  // ---------------------------------------------------------------------
  {
    id: 'braden-dry-free-text-where-fk-lint',
    label: 'DRY: free-text column where an FK belongs (braden)',
    repo: 'braden',
    command: ['bash', 'scripts/dry-free-text-where-fk-lint.sh', 'origin/main'],
    ciWorkflow: 'braden/.github/workflows/dry-lint.yml',
    mode: 'run',
    diffScoped: true,
    evidence: '"[dry-lint] No changed SQL migration files in diff vs origin/main — clean."',
  },

  // ---------------------------------------------------------------------
  // throughput
  // ---------------------------------------------------------------------
  {
    id: 'throughput-dry-free-text-where-fk-lint',
    label: 'DRY: free-text column where an FK belongs (throughput)',
    repo: 'throughput',
    command: ['bash', 'scripts/dry-free-text-where-fk-lint.sh', 'origin/main'],
    ciWorkflow: 'throughput/.github/workflows/dry-lint.yml',
    mode: 'run',
    diffScoped: true,
    evidence: '"[dry-lint] No changed SQL migration files in diff vs origin/main — clean."',
  },

  // ---------------------------------------------------------------------
  // R80.4
  // ---------------------------------------------------------------------
  {
    id: 'r804-env-inline-guard',
    label: 'import.meta.env static-key discipline (R80.4)',
    repo: 'R80.4',
    command: ['node', 'scripts/env-inline-guard.mjs'],
    ciWorkflow: 'R80.4/.github/workflows/verify.yml',
    mode: 'run',
    evidence:
      '"import.meta.env reads — 11 across 376 scanned file(s): 11 static, ' +
      '0 whole-object" then "PASS: every import.meta.env read names its ' +
      'key statically."',
  },
  {
    id: 'r804-verify-schedule-fixtures',
    label: 'Award schedule reconciliation fixtures (R80.4)',
    repo: 'R80.4',
    command: ['node', 'scripts/verify-schedule-fixtures.mjs'],
    ciWorkflow: 'R80.4/.github/workflows/verify.yml',
    mode: 'run',
    evidence:
      'Per-schedule "DONE — all N row(s) of Schedule X (MA0000NN) ' +
      'reconcile to the cent through the shipped path" for every schedule ' +
      '(12, 8, 32, 18, 130, 71, 84 rows observed across schedules B/C/D/F).',
  },
  {
    id: 'r804-lint-ratchet',
    label: 'ESLint warning-count ratchet (R80.4)',
    repo: 'R80.4',
    command: null,
    ciWorkflow: 'R80.4/.github/workflows/verify.yml',
    mode: 'skip',
    skipReason:
      "Needs the `eslint` package (via `pnpm run lint`); this worktree's " +
      'R80.4 checkout has no node_modules installed. Worth noting: run ' +
      'without it, this guard fails LOUD ("FAIL: eslint did not emit ' +
      'parseable JSON") rather than silently passing — another good ' +
      'citizen, filed rather than executed.',
  },
]

export function findGuard(id) {
  return GUARDS.find((g) => g.id === id)
}
