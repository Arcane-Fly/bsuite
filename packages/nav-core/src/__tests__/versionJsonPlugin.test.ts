/**
 * versionJsonPlugin — the BUILD half.
 *
 * The control that matters most is the REFUSAL: a build with no resolvable
 * commit must fail loudly rather than bake a placeholder. crm7 and throughput
 * both ship `'local'` today, which produces a version check that can never fire
 * and a green build that proves nothing.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  gitHeadCommit,
  resolveBuildCommit,
  resolveBuildInfo,
  versionJsonPlugin,
  writeVersionJson,
} from '../vite.js'

/** A directory that is NOT inside any git repository, so `git rev-parse` fails. */
let noRepo: string
/** A real git repo with one commit, to exercise the third fallback. */
let repo: string

beforeAll(() => {
  noRepo = mkdtempSync(path.join(tmpdir(), 'navcore-norepo-'))
  repo = mkdtempSync(path.join(tmpdir(), 'navcore-repo-'))
  const run = (args: string[]) =>
    execFileSync('git', args, { cwd: repo, stdio: ['ignore', 'ignore', 'ignore'] })
  run(['init', '-q'])
  run(['config', 'user.email', 'test@example.com'])
  run(['config', 'user.name', 'Test'])
  run(['commit', '-q', '--allow-empty', '-m', 'root'])
})

afterAll(() => {
  rmSync(noRepo, { recursive: true, force: true })
  rmSync(repo, { recursive: true, force: true })
})

type ConfigHook = () => { define?: Record<string, string> }
type EmittedAsset = { type: string; fileName: string; source: string }

function callConfig(plugin: ReturnType<typeof versionJsonPlugin>): { define?: Record<string, string> } {
  return (plugin.config as unknown as ConfigHook)()
}

function callGenerateBundle(plugin: ReturnType<typeof versionJsonPlugin>): EmittedAsset[] {
  const emitted: EmittedAsset[] = []
  const ctx = { emitFile: (file: EmittedAsset) => { emitted.push(file) } }
  ;(plugin.generateBundle as unknown as (this: typeof ctx) => void).call(ctx)
  return emitted
}

describe('resolveBuildCommit — the precedence', () => {
  it('POSITIVE — VERCEL_GIT_COMMIT_SHA wins', () => {
    expect(
      resolveBuildCommit({}, { VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890', GIT_COMMIT: 'zzzzzzz' }),
    ).toBe('abcdef1')
  })

  it('POSITIVE — GIT_COMMIT is the second choice', () => {
    expect(resolveBuildCommit({ cwd: noRepo }, { GIT_COMMIT: '1234567890abcdef' })).toBe('1234567')
  })

  it('POSITIVE — git rev-parse HEAD is the third', () => {
    const fromGit = resolveBuildCommit({ cwd: repo }, {})
    expect(fromGit).toMatch(/^[0-9a-f]{7}$/)
    expect(fromGit).toBe(gitHeadCommit(repo)?.slice(0, 7))
  })

  it('NEGATIVE — nothing to read returns undefined, not a placeholder', () => {
    expect(resolveBuildCommit({ cwd: noRepo }, {})).toBeUndefined()
    expect(resolveBuildInfo({ cwd: noRepo }, {})).toBeUndefined()
  })

  it('commitLength: full keeps all 40', () => {
    expect(
      resolveBuildCommit(
        { commitLength: 'full' },
        { VERCEL_GIT_COMMIT_SHA: '0123456789abcdef0123456789abcdef01234567' },
      ),
    ).toBe('0123456789abcdef0123456789abcdef01234567')
  })
})

describe('the plugin', () => {
  it('POSITIVE — config() defines __BUILD_COMMIT__', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'feedbee1234567890')
    const plugin = versionJsonPlugin()
    expect(plugin.name).toBe('bsuite:version-json')
    expect(callConfig(plugin).define?.__BUILD_COMMIT__).toBe(JSON.stringify('feedbee'))
    vi.unstubAllEnvs()
  })

  it('POSITIVE — generateBundle emits version.json carrying that commit', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'feedbee1234567890')
    const plugin = versionJsonPlugin()
    const emitted = callGenerateBundle(plugin)
    expect(emitted).toHaveLength(1)
    expect(emitted[0].type).toBe('asset')
    expect(emitted[0].fileName).toBe('version.json')
    const parsed = JSON.parse(emitted[0].source) as { commit: string; builtAt: string }
    expect(parsed.commit).toBe('feedbee')
    expect(() => new Date(parsed.builtAt).toISOString()).not.toThrow()
    vi.unstubAllEnvs()
  })

  it('the DEFINE and the EMITTED ASSET are the same commit — they cannot drift', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'feedbee1234567890')
    const plugin = versionJsonPlugin()
    const defined = JSON.parse(callConfig(plugin).define!.__BUILD_COMMIT__) as string
    const emitted = JSON.parse(callGenerateBundle(plugin)[0].source) as { commit: string }
    expect(emitted.commit).toBe(defined)
    vi.unstubAllEnvs()
  })

  it('POSITIVE (the refusal) — no commit and not allowed: config() THROWS', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '')
    vi.stubEnv('GIT_COMMIT', '')
    const plugin = versionJsonPlugin({ cwd: noRepo })
    expect(() => callConfig(plugin)).toThrow(/cannot resolve the build commit/)
    expect(() => callGenerateBundle(plugin)).toThrow(/cannot resolve the build commit/)
    vi.unstubAllEnvs()
  })

  it('NEGATIVE — allowUnknownCommit: no throw, no define, no asset', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '')
    vi.stubEnv('GIT_COMMIT', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plugin = versionJsonPlugin({ cwd: noRepo, allowUnknownCommit: true })
    expect(callConfig(plugin).define).toBeUndefined()
    expect(callGenerateBundle(plugin)).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
    vi.unstubAllEnvs()
  })

  it('fileName is configurable and reaches the emitted asset', () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'feedbee1234567890')
    const emitted = callGenerateBundle(versionJsonPlugin({ fileName: 'build-version.json' }))
    expect(emitted[0].fileName).toBe('build-version.json')
    vi.unstubAllEnvs()
  })
})

describe('writeVersionJson — the conduit path', () => {
  it('POSITIVE — writes the same shape the plugin emits', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'navcore-write-'))
    try {
      const info = writeVersionJson(dir, {}, { VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890' })
      expect(info).toEqual({ commit: 'abcdef1', builtAt: expect.any(String) })
      const file = path.join(dir, 'version.json')
      expect(existsSync(file)).toBe(true)
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(info)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('POSITIVE (the refusal) — throws when no commit resolves', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'navcore-write-'))
    try {
      expect(() => writeVersionJson(dir, { cwd: noRepo }, {})).toThrow(/cannot resolve the build commit/)
      expect(existsSync(path.join(dir, 'version.json'))).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('NEGATIVE — allowUnknownCommit returns null and writes nothing', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'navcore-write-'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(writeVersionJson(dir, { cwd: noRepo, allowUnknownCommit: true }, {})).toBeNull()
      expect(existsSync(path.join(dir, 'version.json'))).toBe(false)
    } finally {
      warn.mockRestore()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
