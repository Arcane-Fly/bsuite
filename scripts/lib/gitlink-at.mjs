/**
 * The gitlink a ref records for one submodule, shared by every gitlink gate.
 *
 * WHY `:staged` EXISTS. All three gitlink gates read a committed ref (HEAD by
 * default, and check-gitlink-migration-lag.mjs had no ref argument at all), so
 * none of them could see the INDEX. On 2026-09-17 the parent checkout held six
 * gitlinks staged to feature-branch and interior development SHAs while
 * `check-gitlink-in-app-main.mjs` printed "6 on their app's main" and exited 0.
 * It was reporting on HEAD, not on what the next commit would contain. Passing
 * `:staged` reads `git ls-files -s`, so the same gate can run before a commit.
 *
 * Returns the 40-hex gitlink, or null when the path is absent at that ref.
 * Output that is present but not a stage-0 gitlink (a conflicted submodule, a
 * path that is a plain file) THROWS: reading it as "absent" would pass a tree
 * the gate never classified.
 */
import { execFileSync } from 'node:child_process'

export const STAGED = ':staged'

export function parseTreeLine(out) {
  if (!out) return null
  const m = out.match(/^160000 commit ([0-9a-f]{40})\t/)
  if (!m) throw new Error(`not a gitlink tree entry: ${out.split('\n')[0]}`)
  return m[1]
}

export function parseIndexLine(out) {
  if (!out) return null
  const lines = out.split('\n')
  const m = lines.length === 1 ? lines[0].match(/^160000 ([0-9a-f]{40}) 0\t/) : null
  if (!m) throw new Error(`not a stage-0 gitlink index entry: ${lines.join(' | ')}`)
  return m[1]
}

export function gitlinkAt(ref, path, cwd) {
  const staged = ref === STAGED
  const args = staged ? ['ls-files', '-s', '--', path] : ['ls-tree', ref, '--', path]
  let out
  try {
    out = execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
  return staged ? parseIndexLine(out) : parseTreeLine(out)
}

/** Pure parser cases, run by each gate's own --self-test. */
export function gitlinkParserCases() {
  const sha = 'a'.repeat(40)
  const cases = []
  const t = (n, fn, want) => {
    let got
    try {
      got = fn()
    } catch {
      got = 'THROWS'
    }
    cases.push({ n, ok: got === want, got, want })
  }
  t('tree: a gitlink entry yields its sha', () => parseTreeLine(`160000 commit ${sha}\tcrm7`), sha)
  t('tree: nothing at the path is absent', () => parseTreeLine(''), null)
  t('tree: a plain file is refused, not absent', () => parseTreeLine(`100644 blob ${sha}\tcrm7`), 'THROWS')
  t('index: a stage-0 gitlink yields its sha', () => parseIndexLine(`160000 ${sha} 0\tcrm7`), sha)
  t('index: nothing staged at the path is absent', () => parseIndexLine(''), null)
  t(
    'index: a conflicted gitlink (stages 1-3) is refused, not absent',
    () => parseIndexLine(`160000 ${sha} 1\tcrm7\n160000 ${sha} 2\tcrm7\n160000 ${sha} 3\tcrm7`),
    'THROWS',
  )
  t('index: a plain file is refused, not absent', () => parseIndexLine(`100644 ${sha} 0\tcrm7`), 'THROWS')
  return cases
}
