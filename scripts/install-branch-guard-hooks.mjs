#!/usr/bin/env node
/**
 * install-branch-guard-hooks.mjs
 *
 * Installs the shared-clone branch guard into every repo in the estate.
 *
 * WHY THIS EXISTS
 *
 * Several lanes operate concurrently in ONE clone per submodule. Any lane
 * switching branches changes it for everyone, mid-task, with no signal — and
 * `development` is frequently unavailable to check out because an agent
 * worktree under .claude/worktrees holds it, so lanes create ad-hoc branches
 * instead. Two incidents on 2026-08-06, both recovered without loss but only
 * because they were noticed:
 *
 *   1. Left on `main` after a promotion merge -> committed -> ran
 *      `git push origin development` -> "Everything up-to-date". That pushes
 *      the local ref NAMED development, not HEAD. The commit sat on main, one
 *      push from landing in production out of process.
 *   2. Another lane left its branch checked out -> committed onto it ->
 *      non-fast-forward.
 *
 * TWO HOOKS, BECAUSE ONE CANNOT COVER BOTH. git does NOT invoke pre-push when
 * there is nothing to push, so no push-side hook can ever see incident 1. That
 * one has to be caught at commit time.
 *
 * WHY A SCRIPT RATHER THAN SIX COPY-PASTES
 *
 * Every repo here has a DIFFERENT hook arrangement — crm7 `.husky`, BSU /
 * conduit / braden the husky-9 `_` shim, throughput `.husky` with hooksPath
 * that was never set, R80.4 `.githooks`. A blanket copy is inert in several of
 * them. This resolves each repo's real user-hook directory, preserves whatever
 * that repo already ran, and is idempotent.
 *
 *   node scripts/install-branch-guard-hooks.mjs [--check]
 *
 * --check reports without writing (for CI).
 */

import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const CHECK = process.argv.includes('--check')

/** Repos and the directory their USER hooks live in (not husky's `_` shim). */
const REPOS = [
  { name: 'crm7', hookDir: '.husky' },
  { name: 'business-suite-unified', hookDir: '.husky' },
  { name: 'conduit', hookDir: '.husky' },
  { name: 'braden', hookDir: '.husky' },
  { name: 'throughput', hookDir: '.husky' },
  { name: 'R80.4', hookDir: '.githooks' },
]

const MARKER = 'shared-clone branch guard'

const GUARD = `
# --- ${MARKER} (installed by scripts/install-branch-guard-hooks.mjs) ---
# Refuses commits on a production branch. MUST be at commit time: git does not
# invoke pre-push when there is nothing to push, so no push-side hook can see
# "I was on main, I pushed development, it said Everything up-to-date".
if [ "\$ALLOW_PROD_COMMIT" != "1" ]; then
  __guard_branch="\$(git symbolic-ref --short -q HEAD || echo '')"
  case "\$__guard_branch" in
    main|master)
      echo "" >&2
      echo "  x pre-commit: refusing to commit directly to '\$__guard_branch'." >&2
      echo "    Production is that branch; work belongs on development and promotes by PR." >&2
      echo "    Another lane may have left it checked out in this shared clone." >&2
      echo "" >&2
      echo "      git branch --show-current      # confirm where you are" >&2
      echo "      git switch development         # or a feature branch" >&2
      echo "      ALLOW_PROD_COMMIT=1 git commit # only if the operator directed it" >&2
      echo "" >&2
      exit 1 ;;
  esac
fi
# --- end ${MARKER} ---
`

const PRE_PUSH = `#!/usr/bin/env sh
# ${MARKER} — refuse pushing a branch you are not standing on.
#
# \`git push origin development\` pushes the local ref NAMED development, not your
# HEAD. Stand on another branch and it pushes someone else's ref, or nothing at
# all while reporting success.
#
# This CANNOT catch the no-op case (git skips pre-push when there is nothing to
# push) — the pre-commit half guards that one.
#
# \`HEAD:<branch>\` is allowed, because that form cannot be wrong.
#
#   ALLOW_OFFBRANCH_PUSH=1 git push origin <branch>   # deliberate off-branch push

[ "\$ALLOW_OFFBRANCH_PUSH" = "1" ] && exit 0

current="\$(git symbolic-ref --short -q HEAD || echo '')"
[ -z "\$current" ] && exit 0   # detached HEAD: nothing to compare against

status=0
while read -r local_ref _local_sha _remote_ref _remote_sha; do
  case "\$local_ref" in
    ''|HEAD) continue ;;
    refs/heads/*) ;;
    *) continue ;;
  esac
  branch="\${local_ref#refs/heads/}"
  if [ "\$branch" != "\$current" ]; then
    echo "" >&2
    echo "  x pre-push: you are on '\$current' but are pushing '\$branch'." >&2
    echo "    In this shared clone that usually means another lane switched the" >&2
    echo "    branch under you, or you meant HEAD. Two safe forms:" >&2
    echo "" >&2
    echo "      git push origin HEAD:\$branch" >&2
    echo "      ALLOW_OFFBRANCH_PUSH=1 git push origin \$branch" >&2
    echo "" >&2
    status=1
  fi
done
exit \$status
`

let changed = 0
let already = 0
const problems = []

for (const { name, hookDir } of REPOS) {
  const repo = join(ROOT, name)
  if (!existsSync(repo)) {
    problems.push(`${name}: repo not present, skipped`)
    continue
  }
  const dir = join(repo, hookDir)
  const preCommit = join(dir, 'pre-commit')
  const prePush = join(dir, 'pre-push')

  // A hook file is not a hook until git is POINTED at it. throughput shipped a
  // .husky/pre-commit with core.hooksPath unset and no .git/hooks/pre-commit —
  // git looked in the wrong place and ran nothing, for as long as it existed.
  let hooksPath = ''
  try {
    hooksPath = execFileSync('git', ['-C', repo, 'config', 'core.hooksPath'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    hooksPath = ''
  }
  const armed = hooksPath !== ''
  if (!armed) problems.push(`${name}: core.hooksPath UNSET — hooks are inert until it is set`)

  if (!existsSync(dir)) {
    if (CHECK) {
      problems.push(`${name}: ${hookDir}/ missing`)
      continue
    }
    mkdirSync(dir, { recursive: true })
  }

  // pre-commit: prepend the guard, preserving whatever the repo already ran.
  let pc = existsSync(preCommit) ? readFileSync(preCommit, 'utf8') : '#!/usr/bin/env sh\n'
  if (pc.includes(MARKER)) {
    already += 1
  } else if (CHECK) {
    problems.push(`${name}: ${hookDir}/pre-commit has no guard`)
  } else {
    const lines = pc.split('\n')
    const shebang = lines[0].startsWith('#!') ? lines.shift() : '#!/usr/bin/env sh'
    pc = `${shebang}\n${GUARD}\n${lines.join('\n')}`
    writeFileSync(preCommit, pc)
    chmodSync(preCommit, 0o755)
    changed += 1
  }

  // pre-push: whole file is ours.
  const existingPush = existsSync(prePush) ? readFileSync(prePush, 'utf8') : ''
  if (existingPush.includes(MARKER)) {
    already += 1
  } else if (CHECK) {
    problems.push(`${name}: ${hookDir}/pre-push missing`)
  } else if (existingPush.trim() !== '') {
    // Never clobber a pre-push another lane wrote.
    problems.push(`${name}: ${hookDir}/pre-push already exists and is NOT ours — left alone`)
  } else {
    writeFileSync(prePush, PRE_PUSH)
    chmodSync(prePush, 0o755)
    changed += 1
  }
}

console.log(`[branch-guard] ${CHECK ? 'checked' : 'installed'}: ${changed} written, ${already} already present`)
for (const p of problems) console.log(`[branch-guard] ! ${p}`)
if (CHECK && problems.length > 0) process.exit(1)
