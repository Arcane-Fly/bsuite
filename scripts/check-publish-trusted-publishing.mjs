#!/usr/bin/env node
/**
 * check-publish-trusted-publishing — every workflow that PUBLISHES must publish
 * through Trusted Publishers (OIDC), and must not carry a revoked-token fallback.
 *
 * WHY THIS EXISTS
 * ───────────────
 * npm began revoking classic tokens on 2025-12-09 and finished on 2026-02-03.
 * Trusted Publishing (OIDC) is now the only mechanism that authenticates a CI
 * publish. Measured 2026-09-02: all 13 published @bsuite packages carry
 * `_npmUser.trustedPublisher` on their latest version — none was published by a
 * token — while 14 of 16 publisher workflows still passed
 * `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.
 *
 * That leftover is not merely dead. npm tries OIDC first and falls back to the
 * token, so for a package WITHOUT a trusted publisher the run fails as the token
 * — a bare `404 Not Found - PUT`. That reads as "the token lacks permission",
 * which is the wrong conclusion, and it was drawn and reported for an entire
 * session before anyone checked how the other packages actually published. A
 * fallback that cannot work turns a precise failure into a misleading one.
 *
 * ROLE, NOT FILENAME. `publish-next.yml` matches the glob and publishes nothing —
 * it dispatches the per-package workflows and correctly holds `actions: write`
 * instead of `id-token: write`. Keying this guard on the filename would demand a
 * permission that workflow must not have. A workflow is a PUBLISHER when it runs
 * `npm publish`, which is also the thing that needs the credential.
 *
 * WHAT IT CHECKS, per .github/workflows/publish-*.yml
 *   1. a workflow that runs `npm publish` (not --dry-run alone) declares `id-token: write`
 *   2. no publisher passes NODE_AUTH_TOKEN as an env value
 *
 * A COMMENT mentioning NODE_AUTH_TOKEN is fine and deliberate — the removal is
 * documented in publish-theme.yml. Only an `env:` assignment is a finding.
 *
 * NOT CHECKED, and deliberately: whether a trusted publisher is CONFIGURED on
 * npmjs.com for each package. That lives in npm's registry, not this repo, and a
 * guard that cannot see the thing it asserts would be decoration.
 *
 * THE BOOTSTRAP, because a NEW package cannot be published by CI at all
 * ─────────────────────────────────────────────────────────────────────
 * npm requires the package to EXIST before a trusted publisher can be configured
 * for it — `npm trust` says so outright: "The package you're configuring must
 * already exist on the npm registry." Classic tokens are revoked, so CI has no
 * way to create it. The first publish of any new package is therefore a manual
 * step, once, by a human:
 *
 *   1. npm login                                  (or a granular token, still supported)
 *   2. cd packages/<name> && npm publish --access public
 *   3. npmjs.com -> the package -> Settings -> Trusted Publisher:
 *        GitHub org/repo = GaryOcean428/bsuite
 *        workflow file   = publish-<name>.yml
 *   4. every publish after that is CI, on merge, with no token anywhere
 *
 * Unpublished as at 2026-09-02 and awaiting step 1: @bsuite/workflow-canvas,
 * @bsuite/eslint-config, @bsuite/tsconfig. Their workflows are otherwise correct —
 * they fail as a bare `404 Not Found - PUT`, which looks exactly like a permissions
 * problem and is not one.
 *
 * USAGE
 *   node scripts/check-publish-trusted-publishing.mjs
 *   node scripts/check-publish-trusted-publishing.mjs --self-test
 */

import { readdirSync, readFileSync } from 'node:fs'

const DIR = '.github/workflows'

/** Strip comments so a documented mention is never read as configuration. */
function withoutComments(src) {
  return src
    .split('\n')
    .map((l) => {
      const t = l.trimStart()
      if (t.startsWith('#')) return ''
      // A TRAILING comment must go too. The real permission line reads
      // `id-token: write   # OIDC for npm Trusted Publishers`, and an
      // end-of-line-anchored match against the raw text misses every one of
      // them — this guard's first run reported 16 findings and all 16 were
      // false. Only strip a `#` that follows whitespace, so a `#` inside a
      // quoted value survives.
      return l.replace(/\s+#.*$/, '')
    })
    .join('\n')
}

/** Pure, so the self-test exercises the real rule rather than a paraphrase. */
export function inspect(name, src) {
  const problems = []
  const code = withoutComments(src)

  // A publisher is a workflow that actually publishes. `--dry-run` alone does not
  // need a credential and does not make a workflow a publisher.
  const publishes = /\bnpm publish\b(?![^\n]*--dry-run)/.test(code)
  if (!publishes) return problems

  if (!/^\s*id-token:\s*write\s*$/m.test(code)) {
    problems.push(
      `${name} runs \`npm publish\` but never declares \`id-token: write\`. Trusted ` +
        `Publishing is the only mechanism npm still accepts — without the OIDC permission ` +
        `this workflow cannot authenticate at all.`,
    )
  }

  const tokenEnv = /^\s*NODE_AUTH_TOKEN:\s*\S/m.exec(code)
  if (tokenEnv) {
    problems.push(
      `${name} passes NODE_AUTH_TOKEN. npm finished revoking classic tokens on ` +
        `2026-02-03, so this cannot authenticate; worse, npm falls back to it when a ` +
        `package has no trusted publisher and the run fails as a bare 404 on PUT, which ` +
        `reads as a permissions problem rather than a missing publisher.`,
    )
  }
  return problems
}

function selfTest() {
  const cases = []
  const PUB = 'jobs:\n  x:\n    steps:\n      - run: npm publish --access public --tag latest\n'
  const OIDC = 'permissions:\n  contents: read\n  id-token: write\n'

  cases.push(['a publisher with id-token and no token is clean',
    () => inspect('a.yml', OIDC + PUB).length === 0])

  cases.push(['a publisher with no id-token is a finding',
    () => inspect('b.yml', 'permissions:\n  contents: read\n' + PUB)
      .some((p) => p.includes('id-token'))])

  cases.push(['a publisher passing NODE_AUTH_TOKEN is a finding',
    () => inspect('c.yml', OIDC + PUB + '        env:\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\n')
      .some((p) => p.includes('NODE_AUTH_TOKEN'))])

  // Role, not filename — the mistake this guard was written after making.
  cases.push(['an ORCHESTRATOR that publishes nothing needs no id-token',
    () => inspect('publish-next.yml',
      'permissions:\n  contents: read\n  actions: write\njobs:\n  d:\n    steps:\n      - run: gh workflow run publish-theme.yml\n').length === 0])

  // Regression: this guard's FIRST run reported 16 findings and every one was
  // false, because the real line carries a trailing comment
  // (`id-token: write   # OIDC ...`) and the match was anchored to end-of-line.
  // The same false-positive shape the stale-lint-exemption gate had, made in the
  // same session, one hour apart.
  cases.push(['id-token followed by a trailing comment still counts',
    () => inspect('f.yml', 'permissions:\n  contents: read\n  id-token: write   # OIDC for npm Trusted Publishers\n' + PUB).length === 0])

  // A documented mention must not read as configuration.
  cases.push(['a COMMENT naming NODE_AUTH_TOKEN is not a finding',
    () => inspect('d.yml', OIDC + '        # the NODE_AUTH_TOKEN fallback was removed 2026-09-02\n' + PUB).length === 0])

  // Control: a dry-run-only workflow is not a publisher and is not policed.
  cases.push(['a dry-run-only workflow is not treated as a publisher',
    () => inspect('e.yml', 'permissions:\n  contents: read\njobs:\n  x:\n    steps:\n      - run: npm publish --dry-run\n').length === 0])

  let failed = 0
  for (const [nm, fn] of cases) {
    let ok = false
    try { ok = fn() } catch { ok = false }
    if (!ok) { console.error(`self-test (${nm}) FAILED`); failed++ }
  }
  if (failed) {
    console.error(`check-publish-trusted-publishing: ${failed}/${cases.length} self-test failure(s)`)
    process.exit(1)
  }
  console.log(`check-publish-trusted-publishing: self-test OK (${cases.length} cases)`)
  process.exit(0)
}

if (process.argv.includes('--self-test')) selfTest()

const files = readdirSync(DIR).filter((f) => /^publish-.*\.ya?ml$/.test(f)).sort()
const all = []
let publishers = 0
for (const f of files) {
  const src = readFileSync(`${DIR}/${f}`, 'utf8')
  if (/\bnpm publish\b(?![^\n]*--dry-run)/.test(withoutComments(src))) publishers++
  all.push(...inspect(f, src))
}
console.log(
  `check-publish-trusted-publishing: ${files.length} publish-*.yml scanned, ` +
    `${publishers} publish and were checked, ${files.length - publishers} orchestrate only.`,
)
if (all.length) {
  console.error(`\nFAILED — ${all.length} finding(s):\n` + all.map((p) => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log('all publishers authenticate through Trusted Publishers (OIDC) only')
process.exit(0)
