#!/usr/bin/env node
/**
 * publish-dist-tag — decide which npm dist-tag a publish may write, and from which ref.
 *
 * WHY THIS EXISTS — THE PROMOTION DEADLOCK
 * ────────────────────────────────────────
 * Every `publish-*.yml` triggers on `push: branches: [main]`, and every app installs
 * with `--frozen-lockfile`. So a fix that lives in `packages/**` could not reach ANY
 * preview host until it was already on `main`:
 *
 *     the fix needs a publish
 *       -> publishing needs main
 *         -> main needs the visual gate green
 *           -> the gate measures a preview host
 *             -> which installs from the registry
 *               -> which does not have the fix
 *
 * That is a closed loop, and it was not theoretical. It dammed three workstreams at
 * once (bsuite#2321 R80.4 signed-in contrast/handle defects, the schema-builder
 * package fixes, and every shared-package change behind them). A package-level fix
 * was, by construction, unverifiable before the promotion that verification was
 * supposed to authorise.
 *
 * HOW THE LOOP IS CUT
 * ───────────────────
 * npm dist-tags. `latest` is what an app resolves when it declares `^1.2.0` and what
 * every production install lands on. `next` is resolved by NOBODY unless a lockfile
 * names the exact version. So:
 *
 *   - A RELEASE version (1.2.0) may publish ONLY from main, and takes `latest`.
 *     Ordinary changes are completely unaffected — same gate, same route, same tag.
 *   - A PRERELEASE version (1.2.0-rc.1) may publish from ANY ref, and takes `next`.
 *     An app's `development` branch can then pin that exact version, regenerate its
 *     lockfile, and its `d.*` preview build installs a REAL published artifact
 *     containing the fix — before promotion, without weakening the gate.
 *
 * The gate is not relaxed anywhere. `latest` still moves only through main, which
 * still requires the full gate. What changes is that the gate finally has something
 * truthful to measure.
 *
 * THE FOOTGUN THIS ALSO CLOSES
 * ────────────────────────────
 * `npm publish` applies `latest` unless `--tag` is given — INCLUDING for a version
 * with a semver prerelease component. npm does not infer it. Every publish workflow
 * here ran bare `npm publish --access public`, so bumping a package to `1.2.0-rc.1`
 * and dispatching the workflow would have silently handed every consumer on `^1.2.0`
 * a release candidate as `latest`. Rule 3 below makes that unreachable: a prerelease
 * NEVER takes `latest`, on any ref, including main.
 *
 * REVERSIBILITY
 * ─────────────
 * A `next`-tagged prerelease changes nothing for anyone who has not explicitly
 * pinned it. Backing one out is `npm dist-tag rm` or simply publishing the next rc;
 * no consumer is affected either way. That is why this is the safe cut, rather than
 * relaxing --frozen-lockfile (which makes preview builds irreproducible and lets a
 * preview pass on a tree production will never install) or workspace-linking
 * packages in preview (which makes the preview build SOURCE while production
 * installs a TARBALL — a whole class of "green in preview, broken in prod").
 *
 * USAGE
 *   node scripts/publish-dist-tag.mjs --version 1.2.0-rc.1 --ref refs/heads/development
 *   node scripts/publish-dist-tag.mjs --self-test
 *
 * Writes `tag=` and `allowed=` to $GITHUB_OUTPUT when it is set. Exits non-zero when
 * the publish is refused, so the workflow stops rather than guessing.
 */

import { appendFileSync } from 'node:fs'

export const RELEASE_TAG = 'latest'
export const PRERELEASE_TAG = 'next'
const RELEASE_REF = 'refs/heads/main'

/**
 * A semver prerelease is the part after the FIRST `-` and before any `+` build
 * metadata. `1.2.0-rc.1`, `1.2.0-0` and `1.2.0-canary.abc123` are prereleases;
 * `1.2.0` and `1.2.0+build.5` are not.
 *
 * Deliberately does not use a full semver parser: this must agree with what npm
 * itself considers a prerelease, and npm's rule for the dist-tag decision is
 * exactly "does the version carry a prerelease component".
 */
export function isPrerelease(version) {
  if (typeof version !== 'string' || version.length === 0) return false
  const core = version.split('+')[0]
  return core.includes('-')
}

/**
 * Pure, so --self-test exercises the real decision rather than a paraphrase of it.
 * Returns { allowed, tag, reason }.
 */
export function decide({ version, ref }) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+([-+].*)?$/.test(version)) {
    return {
      allowed: false,
      tag: null,
      reason:
        `version ${JSON.stringify(version)} is not a semver release or prerelease. ` +
        `Refusing to guess which dist-tag it should take.`,
    }
  }

  if (isPrerelease(version)) {
    // Any ref, including main. A prerelease is never `latest` — see the footgun note.
    return {
      allowed: true,
      tag: PRERELEASE_TAG,
      reason:
        `${version} carries a prerelease component, so it publishes under the ` +
        `'${PRERELEASE_TAG}' dist-tag. Nothing resolves it unless a lockfile names ` +
        `this exact version, so it cannot reach a consumer that did not ask for it.`,
    }
  }

  if (ref !== RELEASE_REF) {
    return {
      allowed: false,
      tag: null,
      reason:
        `${version} is a RELEASE version and this run is on '${ref}', not ` +
        `'${RELEASE_REF}'. A release moves the '${RELEASE_TAG}' dist-tag, which every ` +
        `app resolves by default, so it may only be published from main after the ` +
        `promotion gate. To get this build onto a preview host instead, give it a ` +
        `prerelease version (e.g. ${version}-rc.1) and dispatch again — that ` +
        `publishes under '${PRERELEASE_TAG}' and moves nothing.`,
    }
  }

  return {
    allowed: true,
    tag: RELEASE_TAG,
    reason: `${version} is a release version on ${RELEASE_REF}; it takes '${RELEASE_TAG}'.`,
  }
}

function selfTest() {
  const cases = [
    // [name, input, expected]
    ['a release on main takes latest',
      { version: '1.2.0', ref: 'refs/heads/main' }, { allowed: true, tag: 'latest' }],
    ['a release NOT on main is refused, never silently retagged',
      { version: '1.2.0', ref: 'refs/heads/development' }, { allowed: false, tag: null }],
    ['a release on a feature branch is refused',
      { version: '1.2.0', ref: 'refs/heads/feat/whatever' }, { allowed: false, tag: null }],
    ['a prerelease on development publishes under next — this is the deadlock cut',
      { version: '1.2.0-rc.1', ref: 'refs/heads/development' }, { allowed: true, tag: 'next' }],
    ['a prerelease on a feature branch also publishes under next',
      { version: '1.2.0-rc.1', ref: 'refs/heads/feat/x' }, { allowed: true, tag: 'next' }],
    // THE FOOTGUN. npm would tag this `latest` on a bare `npm publish`.
    ['a prerelease ON MAIN still takes next, never latest',
      { version: '2.0.0-rc.3', ref: 'refs/heads/main' }, { allowed: true, tag: 'next' }],
    ['a bare -0 prerelease is still a prerelease',
      { version: '1.2.0-0', ref: 'refs/heads/development' }, { allowed: true, tag: 'next' }],
    ['build metadata alone is NOT a prerelease, so main is still required',
      { version: '1.2.0+build.5', ref: 'refs/heads/development' }, { allowed: false, tag: null }],
    ['build metadata alone on main takes latest',
      { version: '1.2.0+build.5', ref: 'refs/heads/main' }, { allowed: true, tag: 'latest' }],
    ['a garbage version is refused rather than defaulted',
      { version: 'not-a-version', ref: 'refs/heads/main' }, { allowed: false, tag: null }],
    ['an empty version is refused',
      { version: '', ref: 'refs/heads/main' }, { allowed: false, tag: null }],
    ['a missing version is refused',
      { version: undefined, ref: 'refs/heads/main' }, { allowed: false, tag: null }],
  ]

  let bad = 0
  for (const [name, input, want] of cases) {
    const got = decide(input)
    if (got.allowed !== want.allowed || got.tag !== want.tag) {
      console.error(
        `  FAIL ${name}: wanted allowed=${want.allowed} tag=${want.tag}, ` +
          `got allowed=${got.allowed} tag=${got.tag} (${got.reason})`,
      )
      bad++
    }
  }

  // A POSITIVE CONTROL on the decision that actually matters. The whole value of this
  // script is that `latest` cannot be moved from a non-main ref. Assert that no ref
  // other than main can ever produce `latest`, for a release OR a prerelease — rather
  // than trusting that the three cases above happen to cover it.
  const refs = ['refs/heads/development', 'refs/heads/feat/a', 'refs/pull/1/merge', 'refs/tags/v1']
  const versions = ['1.0.0', '1.0.0-rc.1', '0.0.1', '9.9.9-canary.deadbeef']
  for (const ref of refs) {
    for (const version of versions) {
      const r = decide({ version, ref })
      if (r.tag === RELEASE_TAG) {
        console.error(`  FAIL positive control: ${version} on ${ref} produced '${RELEASE_TAG}'`)
        bad++
      }
    }
  }

  console.log(
    `publish-dist-tag --self-test: ${cases.length} cases exercised (release-on-main, ` +
      `release-off-main refusal, prerelease-anywhere, prerelease-ON-MAIN still 'next', ` +
      `build-metadata, and three malformed-version refusals), plus a ${refs.length}x${versions.length} ` +
      `positive control proving no non-main ref can produce '${RELEASE_TAG}'.`,
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)

  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`)
    return i === -1 ? undefined : process.argv[i + 1]
  }

  const version = arg('version') ?? process.env.PKG_VERSION
  const ref = arg('ref') ?? process.env.GITHUB_REF ?? ''
  const pkg = arg('package') ?? process.env.PKG_NAME ?? '(package)'

  const { allowed, tag, reason } = decide({ version, ref })

  // HEAD LINE FIRST — say what was examined before any verdict.
  console.log(`publish-dist-tag: ${pkg}@${version} on ref '${ref}' -> ${allowed ? `tag '${tag}'` : 'REFUSED'}`)
  console.log(`  ${reason}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag ?? ''}\nallowed=${allowed}\n`)
  }

  if (!allowed) {
    console.error(`::error title=Publish refused::${reason}`)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main()
