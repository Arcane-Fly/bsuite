/**
 * buildInfo — the two halves of "is this tab running the build that is deployed".
 *
 * The RUNNING half is `__BUILD_COMMIT__`, a value the bundler substitutes into
 * the bundle at build time (see `./vite.ts`, `versionJsonPlugin`). The DEPLOYED
 * half is `/version.json`, an asset the same plugin emits beside the bundle.
 *
 * WHY THE RUNNING HALF IS READ AS A BARE IDENTIFIER
 * ------------------------------------------------
 * Vite's `define` is a TEXT substitution over identifier references. It rewrites
 *
 *     __BUILD_COMMIT__            ->  "9f2c1ab"
 *
 * and it does NOT rewrite
 *
 *     globalThis.__BUILD_COMMIT__ ->  (left alone; undefined at runtime)
 *
 * because a member expression is not the identifier the define names. The
 * defensive-looking `globalThis` read is therefore the one form that is
 * guaranteed to fail. `typeof` on an undeclared identifier is legal JavaScript
 * and never throws, so the bare read below is safe in a tab where no bundler
 * ever substituted anything — a vitest run, a plain `tsx` import, an app that
 * has not adopted the plugin yet.
 *
 * WHY THIS IS NOT `declare global`
 * --------------------------------
 * crm7 already declares `var __BUILD_COMMIT__: string` in src/vite-env.d.ts:18.
 * A second global declaration typed `string | undefined` is TS2403 ("Subsequent
 * variable declarations must have the same type") in every consumer that has
 * one. The ambient `declare const` below is scoped to this module and is
 * invisible to consumers, so nav-core cannot break an app's typecheck by
 * shipping it.
 */

/** Ambient, module-scoped. NOT a global declaration — see the docblock. */
declare const __BUILD_COMMIT__: string | undefined

/** The shape `/version.json` carries, and what `writeVersionJson` writes. */
export interface BuildInfo {
  /** The git commit this build was produced from. Short (7) or full (40). */
  commit: string
  /** ISO-8601 instant the build ran. Informational; the commit is the key. */
  builtAt: string
}

/** Where the update check looks unless an app overrides it. */
export const VERSION_JSON_PATH = '/version.json'

/**
 * Sentinels that MEAN "no commit" and must never be compared as if they were
 * one. Both are live in the estate today — crm7/vite.config.ts:686 and
 * throughput/vite.config.ts:31 each fall back to the literal string `local`.
 * Comparing `'local'` against a real sha would show a permanent, un-actionable
 * "the version changed" banner on every developer's machine, which is how a
 * notice teaches people to ignore it.
 */
const NOT_A_COMMIT = new Set(['', 'local', 'unknown', 'undefined', 'null'])

/**
 * A commit string, or `undefined` when the value is absent or a sentinel.
 * Deliberately does NOT validate hex: a build id from some future CI that is
 * not a sha is still a usable identity, and rejecting it would turn a working
 * check off silently.
 */
export function normaliseCommit(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (NOT_A_COMMIT.has(trimmed.toLowerCase())) return undefined
  return trimmed
}

/**
 * The commit baked into the running bundle, or `undefined` when nothing baked
 * one in. `undefined` is the hook's `updateCheckBroken: 'no-build-commit'`
 * case: there is no baseline, so there is nothing to compare and the hook does
 * nothing rather than guessing.
 */
export function readInjectedBuildCommit(): string | undefined {
  // `typeof` on an undeclared identifier is legal and does not throw. Any other
  // read of a possibly-undeclared binding would.
  if (typeof __BUILD_COMMIT__ === 'undefined') return undefined
  return normaliseCommit(__BUILD_COMMIT__)
}

/**
 * Are these the same build?
 *
 * EXACT equality (PI ruling R2, 2026-09-03: "ANY difference is 'the version
 * changed'"). Both halves come from ONE resolver in `./vite.ts` with one
 * `commitLength`, so they are the same length by construction — a build never
 * needs prefix tolerance to recognise itself. Prefix tolerance was tried and
 * rejected: it made `aaaaaaa` and `aaaaaaa1…` "the same build", which is a
 * guess in the one direction a notice must never guess (a stale tab reading as
 * current).
 *
 * The consequence for adoption: an app must not keep its own hand-rolled
 * `define.__BUILD_COMMIT__` beside the plugin (crm7/vite.config.ts and
 * throughput/vite.config.ts have one today — remove it in the adoption PR), or
 * pass `runningCommit` at a length that differs from the plugin's. Either
 * mismatch is reported on every poll, loudly, by design.
 */
export function isSameCommit(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  return a === b
}
