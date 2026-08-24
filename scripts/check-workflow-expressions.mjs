#!/usr/bin/env node
/**
 * check-workflow-expressions — no workflow may contain a malformed Actions expression.
 *
 * WHY
 * ---
 * GitHub evaluates `${{ … }}` everywhere in a workflow file, including inside SHELL
 * COMMENTS in a `run:` block. It never reaches bash; the expression engine gets there
 * first. A malformed one is not a warning and not a step failure — the whole workflow
 * fails to PARSE:
 *
 *     (Line: 71, Col: 14): An expression was expected
 *
 * What that produces is the nastiest failure shape in CI: a run with NO jobs, NO logs
 * and NO retry button, that appears in the PR list as an ordinary red check. Nothing
 * distinguishes it from a normal failure except that clicking it shows nothing.
 *
 * That happened on 2026-08-24 to dist-tag-wiring.yml. A comment written to warn
 * against putting an Actions expression in a sed pattern contained a bare, EMPTY
 * delimiter pair as its illustration. The gate never executed a single time on
 * development, and `yaml.safe_load` parsed the file perfectly — YAML validity says
 * nothing about expression validity.
 *
 * WHAT IT CHECKS
 *   - every `${{` has a matching `}}`
 *   - the contents are non-empty and not whitespace-only
 *   - balanced quotes and parens inside the expression
 *
 * It deliberately does NOT try to be a full expression parser. These three cover the
 * cases that produce a jobless startup failure, and a checker that overreaches here
 * would block legitimate expressions and get switched off.
 *
 *   node scripts/check-workflow-expressions.mjs
 *   node scripts/check-workflow-expressions.mjs --self-test
 */

import { readdirSync, readFileSync } from 'node:fs'

const DIR = '.github/workflows'
const OPEN = '${{'

/** Pure, so the self-test exercises the real rule. */
export function inspect(name, src) {
  const problems = []
  const lines = src.split('\n')

  // TWO THINGS THIS HAS TO GET RIGHT, AND EARLIER DRAFTS GOT WRONG IN BOTH DIRECTIONS.
  //
  // 1. A `#` at YAML level is a COMMENT, stripped before Actions sees it. A `#` inside
  //    a block scalar (`run: |`) is just a character in a string, and Actions evaluates
  //    expressions there. That distinction IS the bug being guarded: five workflows here
  //    carry an empty expression in a YAML comment and run perfectly, while
  //    dist-tag-wiring.yml carried one inside a `run:` block and could not start at all.
  //    A checker that cannot tell them apart buries the real finding under four false ones.
  //
  // 2. An expression may SPAN LINES — `GITHUB_TOKEN: >-` followed by a folded
  //    `${{ a && b || c }}` across three lines is idiomatic and correct. A line-by-line
  //    scan reports every one of those as "never closed", which is a false alarm on
  //    working code.
  //
  // So: mask YAML comments out, keep block-scalar text verbatim, then scan the MASKED
  // WHOLE for delimiter pairs. Offsets map back to line numbers for reporting.
  let inScalar = false
  let scalarIndent = 0
  const masked = lines.map((raw) => {
    const indent = raw.length - raw.trimStart().length

    if (inScalar && raw.trim() !== '' && indent <= scalarIndent) inScalar = false

    const opensScalar = /^\s*[\w.'"-]+\s*:\s*[|>][+-]?\d*\s*$/.test(raw)
    if (!inScalar && opensScalar) {
      inScalar = true
      scalarIndent = indent
      return raw
    }
    if (inScalar) return raw

    const hash = raw.indexOf('#')
    if (hash === -1) return raw
    const before = raw.slice(0, hash)
    const sq = (before.match(/'/g) || []).length
    const dq = (before.match(/"/g) || []).length
    // An odd count means the `#` is inside a quoted string, not starting a comment.
    if (sq % 2 !== 0 || dq % 2 !== 0) return raw
    return before + ' '.repeat(raw.length - before.length)
  }).join('\n')

  const lineOf = (offset) => masked.slice(0, offset).split('\n').length

  let i = 0
  while ((i = masked.indexOf(OPEN, i)) !== -1) {
    const close = masked.indexOf('}}', i + OPEN.length)
    const where = `line ${lineOf(i)}`
    if (close === -1) {
      problems.push(`${where}: \`${OPEN}\` is never closed with \`}}\``)
      break
    }
    const body = masked.slice(i + OPEN.length, close)
    if (body.trim() === '') {
      problems.push(
        `${where}: EMPTY expression. GitHub reports "An expression was expected" and the ` +
          `WHOLE workflow fails to parse — a run with no jobs, no logs and no retry button, ` +
          `which reads in the PR list as an ordinary red check. If you are writing ABOUT an ` +
          `expression, do not write the literal token anywhere Actions will evaluate it.`,
      )
    } else {
      const quotes = (body.match(/'/g) || []).length
      if (quotes % 2 !== 0) problems.push(`${where}: unbalanced quote in \`${body.trim()}\``)
      const o = (body.match(/\(/g) || []).length
      const c = (body.match(/\)/g) || []).length
      if (o !== c) problems.push(`${where}: unbalanced parentheses in \`${body.trim()}\``)
    }
    i = close + 2
  }

  return { name, problems }
}

function selfTest() {
  const cases = [
    ['a normal expression passes', 'run: echo ${{ github.sha }}', 0],
    ['an EMPTY expression is caught — the real defect', 'run: echo ${{ }}', 1],
    ['a whitespace-only expression is caught', 'run: echo ${{    }}', 1],
    // THE DISTINCTION THAT MATTERS. Same characters, opposite verdicts.
    ['an empty expression inside a run: BLOCK SCALAR is caught — this is the real defect',
      '    run: |\n      # never write ${{ }} here\n      echo hi', 1],
    ['an empty expression in a YAML COMMENT is NOT flagged — it never reaches Actions',
      '# never write ${{ }} in a run block\njobs:\n  a:\n    runs-on: ubuntu-latest', 0],
    ['an indented YAML comment is also not flagged',
      'jobs:\n  a:\n    # see ${{ }} note above\n    runs-on: ubuntu-latest', 0],
    // A folded scalar carrying a MULTI-LINE expression is idiomatic and correct. An
    // earlier draft called every one of these "never closed" — a false alarm on
    // working code, which is how a guard earns its way into being ignored.
    ['a multi-line expression in a folded scalar is NOT flagged',
      "        GITHUB_TOKEN: >-\n          ${{ github.event_name == 'pull_request'\n              && secrets.A\n              || secrets.B }}", 0],
    ['an unclosed expression is caught', 'run: echo ${{ github.sha', 1],
    ['an unbalanced quote is caught', "run: echo ${{ format('a) }}", 1],
    ['an unbalanced paren is caught', 'run: echo ${{ format(a }}', 1],
    ['multiple valid expressions pass',
      'run: echo ${{ github.sha }} ${{ secrets.FOO }} ${{ steps.x.outputs.y }}', 0],
    ['a nested function call passes', "run: echo ${{ fromJSON(toJSON(github.event)).number }}", 0],
  ]
  let bad = 0
  for (const [label, src, want] of cases) {
    const got = inspect('fixture', src).problems.length
    if (got !== want) { console.error(`  FAIL ${label}: wanted ${want}, got ${got}`); bad++ }
  }
  console.log(
    `check-workflow-expressions --self-test: ${cases.length} cases exercised (valid ` +
      `expressions, an EMPTY one, a whitespace-only one, an empty one hidden in a shell ` +
      `comment, an unclosed one, an unbalanced quote, and a nested function call).`,
  )
  return bad
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  if (selfTest() !== 0) {
    console.error('::error::the checker failed its own self-test; its verdict below would be meaningless.')
    process.exit(1)
  }

  const files = readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort()
  if (files.length === 0) {
    console.error(`::error::0 workflow files under ${DIR}. That is "could not check", not "nothing to check".`)
    process.exit(1)
  }

  const results = files.map((f) => inspect(f, readFileSync(`${DIR}/${f}`, 'utf8')))
  const failing = results.filter((r) => r.problems.length > 0)
  // HEAD LINE FIRST — the denominator before the verdict.
  console.log(
    `[workflow-expressions] ${files.length} workflow file(s) examined; ${failing.length} contain a malformed Actions expression.`,
  )
  for (const r of failing) {
    for (const p of r.problems) console.error(`::error file=${DIR}/${r.name}::${r.name}: ${p}`)
  }
  if (failing.length > 0) {
    console.error(
      `::error::${failing.length} workflow(s) would fail to parse at startup. A startup failure ` +
        `has no jobs and no logs, so it reads as an ordinary red check while the workflow has ` +
        `never executed.`,
    )
    process.exit(1)
  }
  console.log(`✓ every Actions expression across ${files.length} workflow file(s) is well formed.`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
