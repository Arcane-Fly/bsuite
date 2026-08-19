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
    id: 'parent-check-stale-lint-exemptions',
    label: 'Stale path-scoped lint exemptions across all app configs (BU-5/BU-6)',
    repo: '.',
    // Needs each scope's own `pnpm install` first — see the CI job for why
    // (the checker dynamically imports each app's real eslint.config.*).
    // `--require-scopes=6` is the same unscanned-tree control the sibling
    // slug-collision gate uses: every one of these six scopes carries at
    // least one path-scoped exemption today.
    command: ['node', 'scripts/check-stale-lint-exemptions.mjs', '--require-scopes=6'],
    ciWorkflow: '.github/workflows/edge-function-slug-collision-lint.yml',
    mode: 'run',
    evidence:
      '"check-stale-lint-exemptions: checked 204 path-scoped exemption(s) ' +
      'across 6 scope(s) (R80.4, braden, business-suite-unified, conduit, ' +
      'crm7, throughput). 0 missing, 6 orphaned (no importer)." — measured ' +
      '2026-08-19 against each scope\'s pushed feat/stale-lint-exemptions ' +
      'branch (bsuite BU-5/BU-6 closure). The 6 remaining orphans are ' +
      'reported, not failed: build-tool entry points and a test file ' +
      '(tailwind.config.js x2, vite.config.js, next-env.d.ts, ' +
      'scripts/drift-scan.mjs, useBranding.test.ts) that are structurally ' +
      'never imported by design, not dead application code.',
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
      '"Permitted palette: 222 oklch + 27 hex (from the two source-of-truth ' +
      'documents)"',
  },
  {
    // The parsed-lightness half of the pure-endpoint ban. audit-d2c-theme.sh
    // class C1 matches the TEXT of pure white, so oklch(0.994) — visually
    // indistinguishable from it — passed that gate for weeks. This one parses
    // the lightness and compares it as a number.
    //
    // Expect NOT_EVALUATED rather than PASS until the estate reaches zero: the
    // guard exits 1 while real findings remain, which is the honest signal.
    // The denominator it prints ("N oklch colour literals parsed ... across 7
    // roots") is what LANE-WATCHER reads when it eventually does pass.
    id: 'parent-audit-oklch-lightness',
    label: 'Near-pure white/black by parsed OKLCH lightness (all apps + packages)',
    repo: '.',
    command: ['python3', 'scripts/audit-oklch-lightness.py'],
    ciWorkflow: '.github/workflows/theme-conformance.yml',
    mode: 'run',
    evidence:
      '"1422 oklch colour literals parsed in authored source across 7 roots"',
  },
  {
    // The positive control for the guard above. A scanner that silently matches
    // nothing prints the same "0" as a clean tree, and this repository has
    // already shipped one that did — see theme_audit_lib.code_lines. This
    // asserts the gate still FAILS on a crafted near-pure fixture.
    id: 'parent-theme-audit-gate-selftest',
    label: 'Near-pure gate self-test (proves the gate can still fail)',
    repo: '.',
    command: ['bash', 'scripts/test-theme-audit-gates.sh'],
    ciWorkflow: '.github/workflows/theme-conformance.yml',
    mode: 'run',
    evidence:
      '"audit-oklch-lightness: self-test OK (10 cases, 8 of them asserting the gate FAILS)"',
  },
  {
    // REACHABILITY, which is a different question from parity and from
    // armed-ness, and the only one of the three that would have caught the 17
    // pure whites in crm7's customer-facing PDFs (bsuite#1962).
    //
    //   sync-inline-eslint-rules --check     proves the six copies are BYTE-EQUAL
    //                                        to the source. Six identically
    //                                        broken copies pass it.
    //   <submodule> eslint-rule-parity       proves ARMED, using `const c =
    //                                        '#ff8800'` — a bare hex in a
    //                                        VariableDeclarator, the shallowest
    //                                        position the rule has. A copy that
    //                                        has lost the call-argument walk
    //                                        passes it unchanged.
    //   the rule's unit test                 runs the SOURCE only, from
    //                                        packages/. It never loads a copy.
    //
    // This one EXECUTES every copy over the four positions that have each hidden
    // a real pure endpoint in this estate — call argument, nested call argument,
    // assignment, expression-statement call — and positive-controls the harness
    // per copy before grading it. `--self-test` mutates the argument walk out of
    // every inline copy and asserts the guard goes red.
    // REPORTS, DOES NOT GATE — deliberately, and the number says why.
    //
    // First estate-wide run (2026-08-18): 444 markdown files, 93 carrying 229
    // findings. A hard gate on day one is permanently red, which is how the
    // colour rule got disarmed the first time. This runs and PRINTS; lowering
    // the count is a lane's job, and turning it into a ratchet is the change
    // that should follow the first sweep, not precede it.
    //
    // It REFUSES to run without submodules checked out (exit 2). Every
    // cross-submodule link resolves only when the submodule is present, so in a
    // bare worktree all 14 of them report as dangling — and the "fix" would be
    // to rewrite links that were already correct. That nearly happened.
    // Companion to parent-docs-links-and-pins, and REPORT for the same reason.
    // Its four built-in corrections are the point: without them it flags an
    // audit's own findings as defects, calls a basename collision a file move,
    // re-reports documents that already declare themselves historical, and
    // invents ~140 absences when run without submodules.
    id: 'parent-docs-source-paths',
    label: 'Source paths cited in docs still resolve (estate-wide)',
    repo: '.',
    command: ['node', 'scripts/check-docs-source-paths.mjs'],
    ciWorkflow: null,
    mode: 'report',
    evidence:
      '"52 documents skipped as HISTORICAL; 666 source-path references checked; ' +
      'UNRESOLVED 102 — MOVED 10, AMBIGUOUS 4, GONE 88" (2026-08-18). Refuses ' +
      'with exit 2 without submodules: the same run reports 240 unresolved in a ' +
      'bare worktree, so more than half those findings would be false.',
  },
  {
    id: 'parent-docs-links-and-pins',
    label: 'Docs cross-links resolve and @bsuite/* pins are not stale (estate-wide)',
    repo: '.',
    command: ['node', 'scripts/check-docs-links-and-pins.mjs'],
    ciWorkflow: null,
    mode: 'report',
    evidence:
      '"Files scanned: 392 live (52 more skipped as HISTORICAL) — ' +
      'CHECKS-CLEAN 365, CHECKS-FAILED 27; RECORD pins set aside 69" ' +
      '(2026-08-18). Actionable: 50 dangling link, 1 Tailwind (itself an audit ' +
      'REPORTING one), 0 authority pin, 0 template, 0 version. Refuses with ' +
      'exit 2 without submodules. TWO LIMBS WERE RETIRED AS PURE FALSE ' +
      'POSITIVES: the version limb emitted 12 findings and all twelve were ' +
      'false (it read a cross-reference as the file\'s own version, and ' +
      'compared "1.0" to "1.00" as unequal); the pin limb emitted 78 and all ' +
      'but the hub/PARENT-DOCS cases were records, floors (`@x@0.3.3+`) or ' +
      'plan proposals. Both are documented in the script so nobody restores ' +
      'the looser match.',
  },
  {
    id: 'parent-colour-ban-reaches-converters',
    label: 'Pure white/black ban is reachable through a converter (source + 6 inline copies)',
    repo: '.',
    command: ['node', 'scripts/check-colour-ban-reaches-converters.mjs'],
    ciWorkflow: '.github/workflows/theme-conformance.yml',
    mode: 'run',
    evidence:
      '"77 assertions executed — 7 colour-rule files x 11 fixtures (7 must-report ' +
      'positions, 4 must-stay-silent)"; --self-test exits 1 with 36 failures',
  },
  {
    // A RATCHET, not a hard gate: 25 documents in docs/recovered/ still need a
    // verdict against code, and a gate that fails all of them on day one is
    // permanently red — which is how the colour rule was disarmed the first
    // time. The ceiling was measured after bannering the document-lifecycle
    // chain and may only be lowered.
    //
    // Expect PASS at the ceiling. `--self-test` blinds the banner detector and
    // asserts the count changes, so a constant masquerading as a measurement is
    // caught.
    id: 'parent-recovered-doc-verdicts',
    label: 'Every docs/recovered/ document carries a verdict banner on its own face (ratchet)',
    repo: '.',
    command: ['node', 'scripts/check-recovered-doc-verdicts.mjs'],
    ciWorkflow: '.github/workflows/doc-naming.yml',
    mode: 'run',
    evidence:
      '"33 files examined in docs/recovered — 4 carry a verdict banner, 29 do not ' +
      '(ceiling 29)"; --self-test exits 1',
    // The suppression counter. Every other lint ratchet in this estate counts
    // what SURVIVES the linter; this one counts what was switched off before
    // the linter ever spoke. R80.4/eslint-baseline.json is the worked example
    // of why that needs its own instrument — it is a map of ruleId -> message
    // count built from `eslint --format json`, and a directive-suppressed
    // violation contributes no message, so no amount of suppression can move
    // it. See the guard's header.
    //
    // Registered against its REAL invocation, not a self-test: it is a
    // read-only source scan over `git ls-files` with no network, no
    // credentials and no node_modules requirement, so none of the `skip`
    // criteria apply. ~5s over 4,564 files.
    //
    // PRECONDITION: submodules checked out. Without them the guard REFUSES
    // per scope ("REFUSING to report a count — 0 source files among 1 tracked
    // file(s)") and exits 1 rather than reporting a clean zero, which is the
    // behaviour this whole programme wants; verified by hand by emptying
    // conduit/ (2026-08-17).
    id: 'parent-check-hook-suppression-ratchet',
    label: 'React-hook lint SUPPRESSION ratchet (exhaustive-deps + set-state-in-effect)',
    repo: '.',
    command: ['node', 'scripts/check-hook-suppression-ratchet.mjs'],
    ciWorkflow: '.github/workflows/hook-suppression-ratchet.yml',
    mode: 'run',
    evidence:
      '"check-hook-suppression-ratchet: 4,564 source file(s) and 6 eslint ' +
      'config file(s) scanned across 7 of 7 scope(s) for 2 tracked rule(s)." ' +
      '— the HEAD line, derived from the scan. Body reports 97 inline ' +
      'suppression(s), 92 config-scoped file-level suppression(s) and 1 ' +
      'repository-wide `off` declaration across the seven scopes.',
  },
  {
    // Positive control for the guard above, and the reason it can be trusted
    // to have found 97 rather than to have matched nothing. The scanner's
    // failure mode is silent: a tokeniser bug that stops recognising
    // directives reports a smaller number, and a smaller number on THIS
    // ratchet reads as an unbanked improvement, not as a broken instrument.
    // 24 cases, 10 of them asserting the scanner does NOT fire — including
    // the three false positives a line-grep produces on this estate's own
    // source (prose about a directive, a rule id named in prose, and
    // directive text inside a string literal; crm7/eslint.config.js and this
    // registry entry both contain the first two).
    id: 'parent-hook-suppression-scanner-selftest',
    label: 'Hook-suppression scanner self-test (proves the counter can still find and still refuse)',
    repo: '.',
    command: ['node', 'scripts/check-hook-suppression-ratchet.mjs', '--self-test'],
    ciWorkflow: '.github/workflows/hook-suppression-ratchet.yml',
    mode: 'run',
    evidence:
      '"check-hook-suppression-ratchet --self-test: 24 cases exercised (10 ' +
      'of them asserting the scanner does NOT fire, including the three ' +
      "false positives a line-grep produces on this estate's own source).\"",
  },

  {
    // The per-page half of the theme DoD, which named
    // `scripts/audit-routes.sh` as the home of the route inventory while that
    // file existed nowhere in the parent or the six submodules.
    //
    // REGISTERED INVOCATION IS `--inventory`, NOT THE SWEEP, and the reason is
    // the one this registry's header already states: the command recorded here
    // must be safe to run — read-only, no credentials, no network. The full
    // sweep signs in against a live deployment and walks 11 routes through
    // three Playwright auditors in two themes; it runs on the schedule and on
    // workflow_dispatch in theme-conformance.yml, not here.
    //
    // `--inventory` is not a stub of that. It is the assertion that the sweep
    // has something to sweep: the inventory is non-empty, every route is
    // well-formed, none is declared twice, and authenticated coverage has not
    // fallen below its floor. An inventory that silently emptied would make
    // the scheduled sweep visit nothing and report success, which is precisely
    // the vacuous-guard shape LANE-WATCHER exists to catch — so the guard that
    // guards it belongs here.
    //
    // Every count in the head line is DERIVED from the inventory at run time.
    // The only literal is the ratchet floor, which lives in the workflow, and a
    // stale floor can only under-claim.
    id: 'parent-audit-routes-inventory',
    label: 'Per-page route inventory declared, well-formed, and non-empty (theme DoD § 2)',
    repo: '.',
    command: ['bash', 'scripts/audit-routes.sh', '--inventory'],
    ciWorkflow: '.github/workflows/theme-conformance.yml',
    mode: 'run',
    evidence:
      '"audit-routes: 11 route(s) across 1 app(s) — 5 public, 6 authenticated" ' +
      'followed by "✓ inventory valid". Proven able to fail: ' +
      '`--inventory --require-authenticated 99` exits 1 with "only 6 ' +
      'authenticated route(s) declared, floor is 99"; and the sweep itself run ' +
      'as `--no-session` exits 1 with "6 route(s) UNAUDITED" per auditor.',
    // The parser that decides WHICH ISSUES GET CLOSED AUTOMATICALLY when a
    // pull request merges into `development` (register V-10 — GitHub only
    // auto-closes on a merge to the default branch, and all seven repos
    // default to `main`, so every `Closes #N` in this estate has been inert).
    //
    // This is registered for the same reason parent-theme-audit-gate-selftest
    // is: the dangerous failure is silent. A parser that quietly stopped
    // matching would leave issues open — annoying, visible, cheap. A parser
    // that quietly started matching MENTIONS — a number inside a quoted review
    // comment, a checklist item, a pasted log — closes somebody's live work,
    // and nothing in CI would notice. 23 of the 35 cases assert that NO issue
    // is closed, and because a parser returning nothing at all would satisfy
    // every one of those, the suite carries an explicit positive control that
    // fails when the parser closed nothing anywhere in the table.
    id: 'parent-parse-closing-keywords-selftest',
    label: 'Closing-keyword parser self-test (which issues a development merge closes)',
    repo: '.',
    command: ['node', 'scripts/parse-closing-keywords.mjs', '--self-test'],
    ciWorkflow: '.github/workflows/development-merge-issue-closer.yml',
    mode: 'run',
    evidence:
      '"parse-closing-keywords: self-test OK (35 cases executed, 23 of them ' +
      'asserting NO issue is closed, 14 issue references legitimately ' +
      'extracted)." Bare plurals, not the estate\'s usual "35 case(s)": that ' +
      'form was REJECTED by LANE-WATCHER on first run because its stemmer is ' +
      'asymmetric for nouns ending in `e` (list entry `cases?` stems to `cas`, ' +
      'printed `case(s)` stems to `case`). Fixed additively in ' +
      'check-guard-self-reporting.mjs so the next guard using the house style ' +
      'is not wrongly failed; re-classifying all 35 recorded evidence strings ' +
      'under the old and new noun lists flipped nothing but this entry. ' +
      'Proven to fail three ways on 2026-08-17: a crafted case ' +
      'asserting a blockquote closes (exit 1, 1 failing); deleting the ' +
      'blockquote skip (exit 1, 2 failing — including a real directive ' +
      'gaining a quoted neighbour); and making the parser inert (exit 1, 15 ' +
      'failing, positive control named explicitly).',
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
    evidence:
      '"check-schema-lag --self-test: 6 cases exercised across both directions ' +
      '(pending-not-failing, overdue-failing, below-floor-excluded, applied-excluded, ' +
      'empty-ledger-refused, zero-files-refused)."',
  },
  {
    id: 'parent-check-placement-rate-provenance',
    label: 'Placement rate provenance (does a wage know where it came from?)',
    repo: '.',
    command: ['node', 'scripts/check-placement-rate-provenance.mjs', '--self-test'],
    ciWorkflow: '.github/workflows/schema-lag.yml',
    mode: 'run',
    // Same deliberate exception as check-schema-lag directly above, for the same
    // reason: the real run needs a live production credential the watcher does
    // not hold, so registering the real command would record a permanent
    // COULD_NOT_EXECUTE. The self-test is registered because it exercises the
    // identical `evaluate()` the real run calls — the credential changes where
    // the numbers come from, not what is done with them.
    //
    // Worth stating plainly, because this guard exists BECAUSE of it: the
    // tripwire the 2026-07-30 plan proposed for this table would today pass
    // vacuously. It asserted `award_rate_resolution_status` is never
    // 'unresolved' on a placement carrying a charge_rate, and
    // `placements_resolved_rate_required_chk` has since made that pair
    // unrepresentable. Measured 2026-08-17: 0 unresolved, 21 'manual', and 0
    // placements with an `award_rate_id`. The proposed guard would have reported
    // all-clear over a money chain that has never once resolved a wage from an
    // award rate. This one reads the foreign key instead, and its self-test
    // carries a positive control that demonstrates the vacuity rather than
    // asserting it.
    evidence:
      '"check-placement-rate-provenance --self-test: 7 cases exercised across ' +
      'both directions (manual-passes, award-zero-passes, F1 fabricated, F2 ' +
      'orphaned, F3 silent, F4 empty-scan-refused, fully-resolved-passes), plus ' +
      '1 positive control proving the status-string tripwire would pass over a ' +
      'dead chain."',
  },
  {
    id: 'parent-check-placement-award-code',
    label:
      'Placement award basis, REAL tenants only (is a real apprentice billed against an unnamed award?)',
    repo: '.',
    command: ['node', 'scripts/check-placement-award-code.mjs', '--self-test'],
    ciWorkflow: '.github/workflows/schema-lag.yml',
    mode: 'run',
    // Same deliberate exception as the two guards above, for the same reason:
    // the real run needs a live production credential the watcher does not
    // hold. The self-test drives the identical `evaluate()` the real run calls.
    //
    // WHY THIS IS REGISTERED AS A SELF-TEST WHILE THE LIVE RUN IS RED.
    // The live run currently FAILS, deliberately: 8 of 8 FutureBuild placements
    // bill a charge_rate for a real attached person while naming no award by
    // any route. That is the finding, not a broken guard, and it closes on an
    // operator determination ("the user determines eligibility, never an
    // engine"), not on a code change. The watcher records the self-test so a
    // logic regression is still caught; the live red lives in CI where it
    // belongs.
    //
    // WHAT THE FIRST VERSION OF THIS GUARD GOT WRONG — all three reproduced as
    // positive controls in the self-test, so the fix cannot silently regress:
    //   1. It POOLED one real tenant with three demo tenants into a single
    //      ratcheted total and froze GAP_BASELINE at the pooled figure (8 = 7
    //      real + 1 unrelated demo row), so it could only pass on first run.
    //      A number averaged across real and demo data is true of nothing.
    //   2. Its hard-failure limb keyed on `apprentice_id`, a column populated
    //      in exactly one tenant — a DEMO one. The real tenant carries people
    //      on `person_id`/`training_contract_id`, so the limb reported "0
    //      apprentices exposed" over 8 real people it could not see.
    //   3. It filtered `status = 'active'`, dropping a FutureBuild placement
    //      that is still billed (8 billed, 7 active).
    evidence:
      '"check-placement-award-code --self-test: 10 cases exercised in BOTH ' +
      'directions (live-shape-fails, award-present-passes, 7-of-8-still-fails, ' +
      'demo-exposure-ignored, bare-quotes-pass, R2 real, R2 demo, R3 empty, ' +
      'R3 zero-rows, R4 real-tenant-absent), plus 3 positive controls proving ' +
      "the OLD guard's three blind spots were real: apprentice_id sees nobody " +
      'in the real tenant, a pooled ratchet passes over this exact live state, ' +
      "and status='active' drops a billed row.\"",
  },
  {
    id: 'parent-check-docs-table-cells',
    label: 'Docs tables (does any row drop its own text past the declared columns?)',
    repo: '.',
    command: ['node', 'scripts/check-docs-table-cells.mjs'],
    ciWorkflow: '.github/workflows/doc-naming.yml',
    mode: 'run',
    // Pure filesystem read over docs/; no credentials, no network, no state
    // change, so none of the `skip` criteria apply.
    evidence:
      '"check-docs-table-cells: 281 markdown file(s) under docs/ examined, ' +
      '11437 table row(s) read — 0 dropping content, 44 with a harmless empty ' +
      'cell." — run by hand 2026-08-19, ' +
      'immediately after the sweep that repaired 88 such rows (29 in the estate ' +
      'completion ledger, 31 in the rate-calculation reference). Its --self-test ' +
      'passes 13/13 in both directions and caught a real defect in the guard ' +
      'itself first: a naive split on "|" read an ESCAPED pipe as a cell ' +
      'boundary and manufactured 20 findings where markdownlint reported none. ' +
      'Only the content-DESTROYING direction gates; a row with too FEW cells ' +
      'renders an empty cell, loses nothing, and is reported rather than failed.',
  },
  {
    id: 'parent-check-published-peer-ranges',
    label: 'Published peer ranges (are our own npm publishes actually installable?)',
    repo: '.',
    command: ['node', 'scripts/check-published-peer-ranges.mjs'],
    ciWorkflow: '.github/workflows/own-package-freshness.yml',
    mode: 'run',
    // Read-only and hits only the public npm registry, so none of the `skip`
    // criteria apply. It reads the REGISTRY rather than packages/*/package.json
    // on purpose: whether pnpm rewrites `workspace:^` at pack time is a property
    // of how a package was published, which the source cannot tell you.
    evidence:
      '"check-published-peer-ranges: 15 package(s), 62 published dependency ' +
      'edge(s) read from https://registry.npmjs.org — 0 blocking finding(s), 2 ' +
      'awaiting publish." — run by hand 2026-08-18. Those two are real and are ' +
      'what this guard was ' +
      'written for: @bsuite/page-builder@1.0.0 shipped the literal string ' +
      '"workspace:^" as its @bsuite/theme peer, and @bsuite/schema-registry@1.0.2 ' +
      'peers on @bsuite/nav-core ^0.8.0 while nav-core is at 1.0.0. Both are ' +
      'reported as FIX-PENDING-PUBLISH rather than failing, because this ' +
      'checkout already carries the corrected range AND a version bump, so they ' +
      'ship on merge — a guard that blocks its own fix is unmergeable by ' +
      'construction. Its --self-test passes 22/22 in both directions and itself ' +
      'caught a defect in this guard\'s own range parser (`<2` read as ' +
      'unparseable) before it ever reached CI.',
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
    id: 'crm7-lint-postgrest-columns',
    label: 'PostgREST literal column references resolve against the schema (crm7, full-tree)',
    repo: 'crm7',
    command: ['node', 'scripts/lint-postgrest-columns.mjs'],
    ciWorkflow: 'crm7/.github/workflows/postgrest-column-lint.yml',
    mode: 'run',
    notes:
      'Landed 2026-08-17 with crm7#1783. Closes a class TypeScript never ' +
      'covered: `supabase.from(t).eq(\'col\', …)` addresses columns by string ' +
      'literal, and `tsc --noEmit` reports ZERO errors on a column that ' +
      'exists nowhere in the schema — measured by reintroducing the real ' +
      'defect and re-running the full typecheck. PostgREST rejects the ' +
      'request at runtime and the near-universal `data ?? []` idiom swallows ' +
      'it into an empty result, so the surface renders with no data and no ' +
      'error. The founding incident: the field officer landing page filtered ' +
      'a `people.field_officer_id` that does not exist (the real column is ' +
      '`assigned_field_officer_id`) and resolved the signed-in officer ' +
      'against a FK to `contacts.id` instead of the auth link column — it had ' +
      'been rendering its full card grid with every panel empty.\n' +
      '\n' +
      'Full-tree, not diff-scoped, deliberately: a diff-scoped run on a PR ' +
      'touching no query files reports a legitimate zero, and that zero is ' +
      'not evidence of anything.\n' +
      '\n' +
      'The baseline carries the 49 pre-existing pairs, each classified ' +
      'against the LIVE schema rather than the generated types, because the ' +
      'two disagree: 37 name a column absent from the database (real broken ' +
      'queries in billing, payroll, invoices, WHS, compliance and VET, owned ' +
      'by those lanes) and 12 exist live and mean src/types/supabase.ts is ' +
      'stale. Keyed on `table.column`, never on file path — a path-keyed ' +
      'allowlist in this estate has died loudly on rename and silently on ' +
      'delete. The guard fails on a STALE entry as well as a new one, so ' +
      'fixing a violation forces the baseline update into the same commit, ' +
      'and fails on any `allowed` entry carrying no live-schema verdict.\n' +
      '\n' +
      'Demonstrated to FAIL three ways before being trusted to pass: new ' +
      'violation (exit 1, names pair and file), stale baseline entry (exit ' +
      '1), unclassified suppression (exit 1). `--self-test` runs 12 cases in ' +
      'CI ahead of the scan, including the three false positives the first ' +
      'draft raised against CORRECT code — embedded-resource filter paths, ' +
      'embed ordering, and JSON path operators.',
    evidence:
      '"lint-postgrest-columns: 1973 source file(s) scanned, 325 table(s) ' +
      'read from generated types, 937 .from() chain(s) walked, 2250 literal ' +
      'column reference(s) resolved, 49 distinct unresolved table.column ' +
      'pair(s) across 59 reference(s)." then "baseline: 49 known pair(s) (37 ' +
      'absent from the live schema, 12 stale generated types); 0 new, 0 ' +
      'stale."',
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
  {
    id: 'crm7-check-unscoped-select-selftest',
    label: 'Unscoped-SELECT policy class — classifier self-test (crm7, crm7#1730)',
    repo: 'crm7',
    command: ['node', 'scripts/check-unscoped-select-policies.mjs', '--self-test'],
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'run',
    notes:
      'crm7#1730 found the "scoped writes, open SELECT" class by running a sweep BY ' +
      'HAND, once, on 2026-08-14. The query lived in a migration header comment and ' +
      'nowhere else, so nothing re-ran it. This is that sweep wired as a guard. ' +
      'ORDERING: this entry lands with the crm7-side PR that adds the script; until ' +
      "the parent's crm7 submodule pointer advances past it, the watcher reports " +
      'NOT_EVALUATED (node exits 1 on a missing file), which is not a hard failure — ' +
      'it self-heals into PASS on the pointer bump.',
    evidence:
      '"[unscoped-select-sweep] self-test OK (12 cases, 6 of them asserting the gate ' +
      'FAILS), 9 reviewed allowlist entries, 8 scope tokens."',
  },
  {
    id: 'crm7-check-unscoped-select-live',
    label: 'Unscoped-SELECT policy class vs replayed schema (crm7, crm7#1730)',
    repo: 'crm7',
    command: null,
    ciWorkflow: 'crm7/.github/workflows/db-lint.yml',
    mode: 'skip',
    skipReason:
      'Needs DATABASE_URL / SUPABASE_DB_URL. Reconstructing the final policy set from ' +
      '~600 migration files needs a SQL interpreter rather than a parser (the same ' +
      "conclusion prod-rls-policy-drift-audit.yml reached), so it reads pg_policies " +
      "from a real database — in CI, the one db-lint.yml's report-catalog-drift job " +
      'already builds by replaying the baseline plus every post-baseline migration. ' +
      'GOOD CITIZEN while skipped: run with no credentials it REFUSES with exit 2 — ' +
      '"DATABASE_URL (or SUPABASE_DB_URL) is required — this gate reads pg_policies ' +
      'from a real database and will not guess... A check that passes when it could ' +
      'not look is the defect it exists to catch." Verified by hand against a local ' +
      'Postgres 17 fixture on 2026-08-17: exit 0 on a compliant schema, exit 1 with ' +
      '::error:: on each of the three fail modes (new table in the class, allowlist ' +
      'entry that left the class, allowlist entry whose table was dropped).',
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
    // Finds what an exact-path link check structurally cannot: a dangling link
    // whose target was RENAMED. An exact check calls that a deletion, the
    // reader concludes the document was lost, and the content gets re-derived.
    //
    // REPORT, and it must stay report. A wrong rename target is WORSE than a
    // dangling link — the reader follows it and believes they arrived. It
    // suggests; a person decides.
    id: 'parent-docs-renamed-links',
    label: 'Dangling doc links whose target was renamed, not deleted',
    repo: '.',
    command: ['python3', 'scripts/check-docs-renamed-links.py'],
    ciWorkflow: null,
    mode: 'report',
    evidence:
      '"RENAMED-LINK candidates: 1 distinct" (2026-08-18, after the scorer was ' +
      'corrected three times). Found and fixed: v1.02A -> v1.04A across five ' +
      'PARENT-DOCS copies, feature-map v1.0.0 -> v1.00W, boot-compliance ' +
      'v1.00W -> v1.00A, and 21 links in two crm7 roadmaps. THE SCORER WAS ' +
      'WRONG THREE WAYS: first-match resolved dry-one-shot-architecture to ' +
      'ARCHITECTURE.md; a version tie sent readers to an ARCHIVED v1.00A over ' +
      'the live v1.04A; an unconditional date bonus paired every two documents ' +
      'written the same day. All three are documented in the script.',
  },
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
