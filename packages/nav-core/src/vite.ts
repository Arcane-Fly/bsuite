/**
 * @bsuite/nav-core/vite — the BUILD half of the update notice.
 *
 * A SEPARATE ENTRY POINT ON PURPOSE. This module imports `node:child_process`
 * and `node:fs`. Nothing under `./index.ts` may reference it, or six browser
 * bundles acquire a Node dependency they cannot resolve.
 *
 * WHAT IT DOES
 * ------------
 *   1. `config()`  -> `define.__BUILD_COMMIT__`, the commit baked INTO the bundle.
 *   2. `generateBundle()` -> emits `version.json` BESIDE the bundle, carrying the
 *      same commit.
 *
 * The running tab reads (1); the poll reads (2). Both come from one resolver, so
 * they cannot disagree about what "this build" means.
 *
 * WHY A PLUGIN AND NOT A `prebuild` SCRIPT
 * ----------------------------------------
 * Three of the six apps (business-suite-unified, crm7, braden) build with
 * `build:noprerender`, not `build`. npm's `prebuild` hook fires for `build` and
 * for nothing else, so a `prebuild` mechanism would silently do nothing on
 * exactly those three — and "silently does nothing" is the failure mode this
 * whole feature exists to remove.
 *
 * WHY THERE IS NO 'local' FALLBACK
 * --------------------------------
 * crm7/vite.config.ts:686 and throughput/vite.config.ts:31 both fall back to the
 * literal string `local` when no commit is in the environment. A production
 * build that quietly ships `__BUILD_COMMIT__ = "local"` produces a version check
 * that can never fire and a green build that proves nothing. This plugin THROWS
 * instead, unless the caller has explicitly said it is a local build:
 *
 *     versionJsonPlugin({ allowUnknownCommit: mode !== 'production' })
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { Plugin } from 'vite'

import type { BuildInfo } from './buildInfo.js'

export type { BuildInfo } from './buildInfo.js'

export interface VersionJsonPluginOptions {
  /**
   * Permit a build with no resolvable commit. The plugin then defines NOTHING
   * and emits NOTHING, so the running app reports `updateCheckBroken:
   * 'no-build-commit'` and does nothing — which is the honest state, unlike a
   * placeholder that reads like a commit and can never match one.
   *
   * Apps pass `mode !== 'production'`.
   */
  allowUnknownCommit?: boolean
  /** Emitted asset name. Defaults to `version.json`. */
  fileName?: string
  /**
   * `short` (7 chars, the estate's existing `__BUILD_COMMIT__` convention in
   * crm7 and throughput) or `full` (40). Both halves always use the same one.
   */
  commitLength?: 'short' | 'full'
  /** Where `git rev-parse` runs. Defaults to `process.cwd()`. */
  cwd?: string
}

/** `git rev-parse HEAD`, or `undefined` when there is no git, no repo, or no HEAD. */
export function gitHeadCommit(cwd: string = process.cwd()): string | undefined {
  try {
    const out = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const trimmed = out.trim()
    return trimmed.length > 0 ? trimmed : undefined
  } catch {
    // No git binary, not a repo, or an unborn HEAD. All three mean "cannot tell".
    return undefined
  }
}

/**
 * The commit for this build: `VERCEL_GIT_COMMIT_SHA`, then `GIT_COMMIT`, then
 * `git rev-parse HEAD`. `undefined` when none of the three answer.
 *
 * `env` is a parameter so the resolver can be tested without mutating the
 * process environment out from under a parallel test file.
 */
export function resolveBuildCommit(
  options: Pick<VersionJsonPluginOptions, 'commitLength' | 'cwd'> = {},
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw =
    env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    env.GIT_COMMIT?.trim() ||
    gitHeadCommit(options.cwd)
  if (!raw) return undefined
  return options.commitLength === 'full' ? raw : raw.slice(0, 7)
}

/** The `{ commit, builtAt }` payload for this build, or `undefined`. */
export function resolveBuildInfo(
  options: Pick<VersionJsonPluginOptions, 'commitLength' | 'cwd'> = {},
  env: Record<string, string | undefined> = process.env,
): BuildInfo | undefined {
  const commit = resolveBuildCommit(options, env)
  if (!commit) return undefined
  return { commit, builtAt: new Date().toISOString() }
}

/**
 * Write `version.json` into `dir` and return what was written.
 *
 * For a framework whose build does not run a Vite `generateBundle` — conduit is
 * a Next.js App Router app and serves the same shape from
 * `src/app/version.json/route.ts`. Sharing this helper is what stops the two
 * shapes drifting apart, which is the only way the comparison can silently stop
 * working.
 *
 * Throws when no commit resolves, for the same reason the plugin does.
 */
export function writeVersionJson(
  dir: string,
  options: VersionJsonPluginOptions = {},
  env: Record<string, string | undefined> = process.env,
): BuildInfo | null {
  const info = resolveBuildInfo(options, env)
  if (!info) {
    if (options.allowUnknownCommit) {
      console.warn(`${LOG_PREFIX} no commit resolved — ${options.fileName ?? 'version.json'} NOT written (allowUnknownCommit)`)
      return null
    }
    throw new Error(unknownCommitMessage())
  }
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, options.fileName ?? 'version.json'), JSON.stringify(info) + '\n', 'utf8')
  return info
}

const LOG_PREFIX = '[@bsuite/nav-core/vite]'

function unknownCommitMessage(): string {
  return (
    `${LOG_PREFIX} cannot resolve the build commit.\n` +
    '  Tried, in order: VERCEL_GIT_COMMIT_SHA, GIT_COMMIT, git rev-parse HEAD.\n' +
    '  A build with no commit cannot tell a client that their tab is out of date,\n' +
    '  and a placeholder such as "local" makes the check permanently silent while\n' +
    '  every gate stays green. Refusing to build instead.\n' +
    '  For a local build, pass allowUnknownCommit: versionJsonPlugin({ allowUnknownCommit: mode !== \'production\' }).'
  )
}

/**
 * The plugin.
 *
 * @example
 * // vite.config.ts
 * import { versionJsonPlugin } from '@bsuite/nav-core/vite'
 * export default defineConfig(({ mode }) => ({
 *   plugins: [react(), versionJsonPlugin({ allowUnknownCommit: mode !== 'production' })],
 * }))
 */
export function versionJsonPlugin(options: VersionJsonPluginOptions = {}): Plugin {
  const fileName = options.fileName ?? 'version.json'
  // Resolved ONCE per config load, so `builtAt` is one instant and the define and
  // the emitted asset are the same string by construction rather than by luck.
  let info: BuildInfo | null = null

  const resolve = (): BuildInfo | null => {
    if (info) return info
    const resolved = resolveBuildInfo(options)
    if (!resolved) {
      if (!options.allowUnknownCommit) throw new Error(unknownCommitMessage())
      console.warn(
        `${LOG_PREFIX} no commit resolved — __BUILD_COMMIT__ is undefined and ${fileName} will not be emitted. ` +
          'The update notice is inert in this build, by request (allowUnknownCommit).',
      )
      return null
    }
    info = resolved
    return info
  }

  return {
    name: 'bsuite:version-json',

    config() {
      const resolved = resolve()
      if (!resolved) return {}
      return { define: { __BUILD_COMMIT__: JSON.stringify(resolved.commit) } }
    },

    generateBundle() {
      const resolved = resolve()
      if (!resolved) return
      this.emitFile({
        type: 'asset',
        fileName,
        source: JSON.stringify(resolved) + '\n',
      })
    },
  }
}
