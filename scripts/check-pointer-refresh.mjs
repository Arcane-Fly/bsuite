import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO_PART_PATTERN = /^[A-Za-z0-9_.-]+$/
const BRANCH = 'chore/auto-advance-submodule-pointers'
const SHA_PATTERN = /^[0-9a-f]{40}$/

function defaultGithub(args) {
  const out = execFileSync('gh', args, { encoding: 'utf8' })
  return JSON.parse(out)
}

export function pointerRefreshDecision(repo, branch, tree, github = defaultGithub) {
  const parts = typeof repo === 'string' ? repo.split('/') : []
  if (parts.length !== 2 || !parts.every((part) => REPO_PART_PATTERN.test(part))) {
    throw new Error(`invalid repo: ${repo}`)
  }
  if (branch !== BRANCH) throw new Error(`unexpected branch: ${branch}`)
  if (!SHA_PATTERN.test(tree)) throw new Error(`invalid tree sha: ${tree}`)

  const list = github([
    'pr', 'list', '--repo', repo, '--state', 'open', '--head', branch,
    '--base', 'development', '--json',
    'state,baseRefName,headRefName,headRefOid,isCrossRepository',
  ])
  if (!Array.isArray(list)) throw new Error('gh pr list did not return an array')
  for (const pr of list) {
    if (
      !pr ||
      typeof pr !== 'object' ||
      typeof pr.state !== 'string' ||
      typeof pr.baseRefName !== 'string' ||
      typeof pr.headRefName !== 'string' ||
      typeof pr.headRefOid !== 'string' ||
      typeof pr.isCrossRepository !== 'boolean'
    ) {
      throw new Error('gh pr list returned malformed pull request metadata')
    }
  }
  const matches = list.filter(
    (pr) =>
      pr &&
      pr.state === 'OPEN' &&
      pr.baseRefName === 'development' &&
      pr.headRefName === branch &&
      pr.isCrossRepository === false,
  )
  if (matches.length > 1) throw new Error(`multiple open PRs on ${branch}`)
  if (matches.length === 0) return 'refresh'

  const pull = matches[0]
  if (!SHA_PATTERN.test(pull.headRefOid || '')) {
    throw new Error(`malformed headRefOid: ${pull.headRefOid}`)
  }

  const commit = github(['api', `repos/${repo}/commits/${pull.headRefOid}`])
  if (!commit || commit.sha !== pull.headRefOid) {
    throw new Error(`commit sha mismatch for ${pull.headRefOid}`)
  }
  const treeSha = commit.commit && commit.commit.tree && commit.commit.tree.sha
  if (!SHA_PATTERN.test(treeSha || '')) {
    throw new Error(`malformed commit tree sha: ${treeSha}`)
  }
  const verified = commit.commit.verification && commit.commit.verification.verified
  if (typeof verified !== 'boolean') {
    throw new Error(`verification.verified is not boolean: ${verified}`)
  }
  return treeSha === tree && verified ? 'unchanged' : 'refresh'
}

function runSelfTest() {
  const repo = 'GaryOcean428/bsuite'
  const branch = BRANCH
  const tree = 'a'.repeat(40)
  const head = 'b'.repeat(40)

  const openPull = (overrides = {}) => ({
    state: 'OPEN',
    baseRefName: 'development',
    headRefName: branch,
    headRefOid: head,
    isCrossRepository: false,
    ...overrides,
  })
  const commitResponse = ({ sha = head, ...commitOverrides } = {}) => ({
    sha,
    commit: {
      tree: { sha: tree },
      verification: { verified: true },
      ...commitOverrides,
    },
  })

  const fakeGithub = (responses) => {
    const calls = []
    const fn = (args) => {
      calls.push(args)
      const next = responses[calls.length - 1]
      if (next instanceof Error) throw next
      return next
    }
    fn.calls = calls
    return fn
  }
  const LIST_ARGS = [
    'pr', 'list', '--repo', repo, '--state', 'open', '--head', branch,
    '--base', 'development', '--json',
    'state,baseRefName,headRefName,headRefOid,isCrossRepository',
  ]
  const COMMIT_ARGS = ['api', `repos/${repo}/commits/${head}`]
  const assertReadOnly = (calls) => {
    for (const args of calls) {
      assert.ok(
        args[0] === 'pr' || (args[0] === 'api' && !args.includes('-X')),
        `unexpected gh invocation: ${args.join(' ')}`,
      )
    }
  }

  let passed = 0
  const check = (name, fn) => {
    try {
      fn()
    } catch (error) {
      error.message = `[${name}] ${error.message}`
      throw error
    }
    passed += 1
  }

  check('identical signed open PR -> unchanged, 2 calls', () => {
    const gh = fakeGithub([[openPull()], commitResponse()])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'unchanged')
    assert.equal(gh.calls.length, 2)
    assert.deepEqual(gh.calls[0], LIST_ARGS)
    assert.deepEqual(gh.calls[1], COMMIT_ARGS)
    assertReadOnly(gh.calls)
  })

  check('changed tree -> refresh, 2 calls', () => {
    const gh = fakeGithub([[openPull()], commitResponse({ tree: { sha: 'c'.repeat(40) } })])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'refresh')
    assert.equal(gh.calls.length, 2)
    assertReadOnly(gh.calls)
  })

  check('unsigned same tree -> refresh, 2 calls', () => {
    const gh = fakeGithub([
      [openPull()],
      commitResponse({ verification: { verified: false } }),
    ])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'refresh')
    assert.equal(gh.calls.length, 2)
    assertReadOnly(gh.calls)
  })

  check('no PR -> refresh, 1 call', () => {
    const gh = fakeGithub([[]])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'refresh')
    assert.equal(gh.calls.length, 1)
  })

  check('wrong base -> refresh, 1 call', () => {
    const gh = fakeGithub([[openPull({ baseRefName: 'main' })]])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'refresh')
    assert.equal(gh.calls.length, 1)
  })

  check('closed PR -> refresh, 1 call', () => {
    const gh = fakeGithub([[openPull({ state: 'CLOSED' })]])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'refresh')
    assert.equal(gh.calls.length, 1)
  })

  check('cross-repo PR -> refresh, 1 call', () => {
    const gh = fakeGithub([[openPull({ isCrossRepository: true })]])
    assert.equal(pointerRefreshDecision(repo, branch, tree, gh), 'refresh')
    assert.equal(gh.calls.length, 1)
  })

  check('malformed list -> throws', () => {
    const gh = fakeGithub([{ not: 'an array' }])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh))
  })

  check('null list entry -> throws', () => {
    const gh = fakeGithub([[null]])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh), /malformed pull request metadata/)
  })

  check('missing isCrossRepository -> throws', () => {
    const { isCrossRepository, ...partial } = openPull()
    const gh = fakeGithub([[partial]])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh), /malformed pull request metadata/)
  })

  check('multiple matching PRs -> throws', () => {
    const gh = fakeGithub([[openPull(), openPull({ headRefOid: 'd'.repeat(40) })]])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh))
  })

  check('malformed head sha -> throws', () => {
    const gh = fakeGithub([[openPull({ headRefOid: 'notasha' })]])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh))
  })

  check('commit sha mismatch -> throws', () => {
    const gh = fakeGithub([[openPull()], commitResponse({ sha: 'e'.repeat(40) })])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh))
  })

  check('malformed commit tree -> throws', () => {
    const gh = fakeGithub([[openPull()], commitResponse({ tree: { sha: 'zzz' } })])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh))
  })

  check('non-boolean verification -> throws', () => {
    const gh = fakeGithub([[openPull()], commitResponse({ verification: { verified: 'true' } })])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh))
  })

  check('gh pr list throws -> throws', () => {
    const gh = fakeGithub([new Error('gh down')])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh), /gh down/)
  })

  check('gh commit fetch throws -> throws', () => {
    const gh = fakeGithub([[openPull()], new Error('api down')])
    assert.throws(() => pointerRefreshDecision(repo, branch, tree, gh), /api down/)
  })

  check('invalid input sha -> throws with 0 calls', () => {
    const gh = fakeGithub([])
    assert.throws(() => pointerRefreshDecision(repo, branch, 'nope', gh))
    assert.throws(() => pointerRefreshDecision('bad repo!', branch, tree, gh))
    assert.throws(() => pointerRefreshDecision('a/b/c', branch, tree, gh))
    assert.throws(() => pointerRefreshDecision(repo, 'other-branch', tree, gh))
    assert.equal(gh.calls.length, 0)
  })

  const workflowPath = fileURLToPath(
    new URL('../.github/workflows/advance-submodule-pointers.yml', import.meta.url),
  )
  const workflow = readFileSync(workflowPath, 'utf8')
  const guardIndex = workflow.indexOf('refresh_decision=$(node scripts/check-pointer-refresh.mjs')
  const commitIndex = workflow.indexOf('git/commits" --input /tmp/pointer-commit-body.json')
  const patchIndex = workflow.indexOf('git/refs/heads/$BR" -f sha=')
  check('workflow guard runs before git/commits POST and ref PATCH', () => {
    assert.ok(guardIndex > -1, 'guard not present in workflow')
    assert.ok(commitIndex > -1, 'git/commits call not found')
    assert.ok(patchIndex > -1, 'ref PATCH call not found')
    assert.ok(guardIndex < commitIndex, 'guard must precede git/commits POST')
    assert.ok(guardIndex < patchIndex, 'guard must precede ref PATCH')
  })
  check('workflow self-test step wired', () => {
    assert.ok(
      workflow.includes('node scripts/check-pointer-refresh.mjs --self-test'),
      'self-test step missing',
    )
  })

  const guardLines = workflow
    .split('\n')
    .slice(
      workflow.split('\n').findIndex((l) => l.includes('refresh_decision=$(node')),
    )
  const guardSnippet = []
  for (const line of guardLines) {
    guardSnippet.push(line.trim())
    if (line.trim() === 'fi') break
  }
  const dir = mkdtempSync(join(tmpdir(), 'pointer-refresh-selftest-'))
  try {
    const fakeNodeDir = join(dir, 'bin')
    mkdirSync(fakeNodeDir)
    for (const [name, decision, exitCode] of [
      ['unchanged', 'unchanged', 0],
      ['refresh', 'refresh', 0],
      ['failure', 'unchanged', 1],
    ]) {
      const script = join(dir, `case-${name}.sh`)
      writeFileSync(join(fakeNodeDir, 'node'), `#!/bin/sh\necho ${decision}\nexit ${exitCode}\n`)
      chmodSync(join(fakeNodeDir, 'node'), 0o755)
      writeFileSync(
        script,
        `set -e\nREPO=x/y\nBR=b\ntree_sha=t\n${guardSnippet.join('\n')}\necho reached-marker\n`,
      )
      const result = (() => {
        try {
          const out = execFileSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', script], {
            encoding: 'utf8',
            env: { PATH: `${fakeNodeDir}:/usr/bin:/bin` },
          })
          return { code: 0, out }
        } catch (error) {
          return { code: error.status, out: (error.stdout || '') + (error.stderr || '') }
        }
      })()
      if (name === 'unchanged') {
        assert.equal(result.code, 0, `unchanged guard should exit 0, got ${result.code}: ${result.out}`)
        assert.ok(!result.out.includes('reached-marker'), 'unchanged must not reach mutation path')
      } else if (name === 'refresh') {
        assert.equal(result.code, 0, `refresh should proceed, got ${result.code}: ${result.out}`)
        assert.ok(result.out.includes('reached-marker'), 'refresh must reach mutation path')
      } else {
        assert.notEqual(result.code, 0, 'node failure must fail the step')
        assert.ok(!result.out.includes('reached-marker'))
      }
      passed += 1
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }

  console.log(`check-pointer-refresh --self-test: OK (${passed} cases)`)
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (invokedDirectly) {
  try {
    if (process.argv[2] === '--self-test') {
      runSelfTest()
    } else {
      const [repo, branch, tree] = process.argv.slice(2)
      if (process.argv.length !== 5) {
        throw new Error('usage: check-pointer-refresh.mjs <repo> <branch> <tree>')
      }
      console.log(pointerRefreshDecision(repo, branch, tree))
    }
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
