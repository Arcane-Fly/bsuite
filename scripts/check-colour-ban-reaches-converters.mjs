#!/usr/bin/env node
/**
 * scripts/check-colour-ban-reaches-converters.mjs
 *
 * BEHAVIOURAL reachability probe for the pure-white/pure-black ban, run against
 * the source rule AND every inline copy in the estate.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — the shape of the defect it is built to catch
 * ---------------------------------------------------------------------------
 * On 2026-08-13, seventeen pure whites were found sitting in crm7's
 * customer-facing PDF renderers, `ChargeRatePdfDocument.tsx` among them — the
 * document the quote signing page renders for a client to sign. The colour rule
 * had been running in that app the whole time, green, on every commit.
 *
 * It could not see them, because the app's CORRECT convention for keeping PDF
 * colours token-shaped puts every colour inside a call argument:
 *
 *     { backgroundColor: 'oklch(1 0 0)' }             // reported
 *     { backgroundColor: pdfOklch('oklch(1 0 0)') }   // NOT reported
 *
 * Same value, same property, same file. The wrapper was the entire difference.
 * bsuite#1962 fixed the rule (65e1ffd7) — arguments are now walked, verdict
 * narrowed to the absolute ban. This file is the thing that stops it happening
 * a SECOND time, and it is a different job from every check already present:
 *
 *   sync-inline-eslint-rules.mjs --check   proves the six copies are BYTE-EQUAL
 *                                          to the source. Six identically
 *                                          broken copies pass it.
 *   <submodule>/check-eslint-rule-parity   proves the copy is ARMED, using the
 *                                          probe `const c = '#ff8800'` — a bare
 *                                          hex in a VariableDeclarator, the
 *                                          shallowest position the rule has. A
 *                                          copy that has lost the call-argument
 *                                          walk, the assignment visitor or the
 *                                          expression-statement visitor passes
 *                                          that probe unchanged.
 *   the rule's own unit test               runs the SOURCE only, from
 *                                          packages/. It never loads a copy.
 *
 * So: byte parity is proven, armed-ness is proven, and REACHABILITY IS NOT.
 * That gap is the exact shape the 17 whites came through — a gate that existed,
 * was green, and could not see the position the values were written in.
 *
 * This guard closes it by EXECUTING each rule file over a corpus of the four
 * positions that have each, at least once, hidden a real pure endpoint in this
 * estate, and asserting every copy reports every one.
 *
 * ---------------------------------------------------------------------------
 * WHY THE FIXTURES ARE THE ONES THEY ARE
 * ---------------------------------------------------------------------------
 * Every MUST-REPORT case below is a shape that produced ZERO errors in a real
 * copy of this rule, in this repository, with a real pure endpoint in it:
 *
 *   call argument         crm7 PDF renderers, 17 values across 7 files
 *   nested call argument  `outer(inner('#ffffff'))` — the depth the walk must
 *                         reach, or a single extra wrapper re-hides everything
 *   assignment            `ctx.fillStyle = '#ffffff'` — guardian-consents'
 *                         signature canvas; the rule's header CLAIMED to check
 *                         assignments for months while having no such visitor
 *   expression statement   `setFill('#fff')` — a call for effect. The argument
 *                         walk alone does not reach it, because nothing ever
 *                         reached the call
 *   0..1 normalised        `rgb(1,1,1)` IS pure white in pdf-lib/react-pdf
 *                         notation, and was suppressed as a mere format
 *                         violation by BOTH document-format carve-outs
 *
 * The MUST-NOT-REPORT cases pin the narrowing that makes the widening safe: a
 * string argument that is not a colour must stay silent, or this gate becomes
 * the second wave of noise that gets a rule switched off.
 *
 * ---------------------------------------------------------------------------
 * FAIL-CLOSED
 * ---------------------------------------------------------------------------
 * An empty glob, a renamed directory or an uninitialised submodule must never
 * read as a pass. MIN_RULE_FILES is asserted before any fixture runs, and the
 * head line states the number of assertions actually executed. A run that
 * examined nothing exits non-zero and says so.
 *
 * Usage: node scripts/check-colour-ban-reaches-converters.mjs
 *        node scripts/check-colour-ban-reaches-converters.mjs --self-test
 *          (mutates a copy in memory to prove this guard can FAIL)
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Where the rule lives. The source first, then one inline copy per submodule.
 *
 * SUBMODULES is a declared list, not a directory scan: a submodule that has
 * been removed from this list is a deliberate edit someone has to make, while a
 * directory scan that silently finds fewer copies after a rename is the exact
 * "checked nothing, reported green" failure this estate keeps re-finding
 * (bsuite#1966). A submodule present in the list but absent on disk is reported
 * as UNINITIALISED and does not silently reduce the denominator.
 */
const SOURCE_RULE = 'packages/eslint-config/rules/no-hardcoded-colours.js'
const SUBMODULES = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

/**
 * The source plus at least four copies must be probed for this run to mean
 * anything. Four rather than six because two submodules can legitimately be
 * uninitialised in a shallow checkout, and a permanently-red gate gets switched
 * off. It may only be RAISED.
 */
const MIN_RULE_FILES = 5

const MUST_REPORT = [
  {
    id: 'call-argument-oklch',
    code: `const s = { color: pdfOklch('oklch(1 0 0)') }`,
    why: 'crm7 PDF renderers — the position the 17 customer-facing pure whites were written in',
  },
  {
    id: 'call-argument-hex',
    code: `const s = { color: toPdfColor('#ffffff') }`,
    why: 'the same position in hex notation',
  },
  {
    id: 'call-argument-normalised-rgb',
    code: `const s = { color: pdfColor('rgb(1,1,1)') }`,
    why: 'pdf-lib/react-pdf write channels 0..1, so rgb(1,1,1) IS pure white',
  },
  {
    id: 'nested-call-argument',
    code: `const s = { color: outer(inner('#000000')) }`,
    why: 'one extra wrapper must not re-hide the value',
  },
  {
    id: 'assignment-canvas-fillstyle',
    code: `function draw(ctx) { ctx.fillStyle = '#ffffff' }`,
    why: 'guardian-consents signature canvas — the rule CLAIMED to check assignments while having no visitor',
  },
  {
    id: 'expression-statement-call',
    code: `setFillColour('oklch(0 0 0)')`,
    why: 'a call for effect: the argument walk alone never reaches it',
  },
  {
    id: 'call-argument-alpha-suffixed',
    code: `const s = { color: pdfOklch('#ffffff00') }`,
    why: 'alpha does not stop a value being pure — the hole the pre-tokeniser regex had',
  },
]

const MUST_NOT_REPORT = [
  {
    id: 'translation-key',
    code: `const label = t('checkout.total')`,
    why: 'a string argument that is not a colour must stay silent',
  },
  {
    id: 'numeric-parse',
    code: `const n = parseInt('255')`,
    why: 'the number 255 is not the colour white',
  },
  {
    id: 'token-through-converter',
    code: `const s = { color: pdfOklch('var(--role-primary)') }`,
    why: 'a TOKEN handed to an adapter is the correct convention and must not be flagged',
  },
  {
    id: 'format-rule-stays-out-of-arguments',
    code: `const s = { color: pdfOklch('oklch(0.546 0.215 262.9)') }`,
    why: 'inside an argument only the ABSOLUTE ban fires; the format rule firing here is the noise wave that switches a gate off',
  },
]

async function loadRule(absPath) {
  const mod = await import(pathToFileURL(absPath).href)
  const rule = mod.noHardcodedColours ?? mod.default
  if (!rule || typeof rule.create !== 'function') {
    throw new Error(`no usable rule export (looked for noHardcodedColours / default)`)
  }
  return rule
}

/**
 * Load a rule file whose body has been TEXT-MUTATED, for --self-test. Written
 * to a temp file next to a copy of its `_shared.js` sibling so its relative
 * import still resolves.
 */
async function loadMutatedRule(absPath, mutate) {
  const src = readFileSync(absPath, 'utf8')
  const mutated = mutate(src)
  if (mutated === src) throw new Error('mutation anchor not found — self-test cannot prove anything')
  const dir = mkdtempSync(join(tmpdir(), 'colour-probe-'))
  const sharedSrc = join(dirname(absPath), '_shared.js')
  if (existsSync(sharedSrc)) writeFileSync(join(dir, '_shared.js'), readFileSync(sharedSrc))
  const target = join(dir, 'rule.mjs')
  writeFileSync(target, mutated)
  try {
    return await loadRule(target)
  } finally {
    // The module is already in the loader cache; the directory is not needed.
    rmSync(dir, { recursive: true, force: true })
  }
}

async function main() {
  const selfTest = process.argv.includes('--self-test')

  const { Linter } = await import('eslint')
  const tseslint = await import('typescript-eslint')

  // ---- Enumerate the rule files -------------------------------------------
  const ruleFiles = []
  const uninitialised = []

  const sourceAbs = join(REPO_ROOT, SOURCE_RULE)
  if (!existsSync(sourceAbs)) {
    console.error(`FAIL: the source rule is missing at ${SOURCE_RULE}. Nothing was probed.`)
    process.exit(1)
  }
  ruleFiles.push({ label: 'packages/eslint-config (SOURCE)', path: sourceAbs })

  for (const sub of SUBMODULES) {
    const p = join(REPO_ROOT, sub, 'eslint-rules', 'no-hardcoded-colours.js')
    if (existsSync(p)) ruleFiles.push({ label: sub, path: p })
    else uninitialised.push(sub)
  }

  const fixtureCount = MUST_REPORT.length + MUST_NOT_REPORT.length
  const assertions = ruleFiles.length * fixtureCount

  // ---- HEAD LINE: a non-zero count of what was examined, first --------------
  console.log(
    `${assertions} assertions executed — ${ruleFiles.length} colour-rule files ` +
      `x ${fixtureCount} fixtures (${MUST_REPORT.length} must-report positions, ` +
      `${MUST_NOT_REPORT.length} must-stay-silent).`,
  )
  console.log(
    `Positions probed: call argument, nested call argument, assignment, expression-statement call.`,
  )
  if (uninitialised.length > 0) {
    console.log(`Not on disk (submodule not initialised): ${uninitialised.join(', ')}`)
  }
  console.log('')

  if (ruleFiles.length < MIN_RULE_FILES) {
    console.error(
      `FAIL: only ${ruleFiles.length} rule file(s) found; ${MIN_RULE_FILES} are required for ` +
        `this probe to mean anything. Initialise the submodules or fix the paths — a run ` +
        `that examined almost nothing must not report green.`,
    )
    process.exit(1)
  }

  // `files` is not optional here. Without it, flat config matches nothing and
  // `linter.verify` returns a single severity-1 "No matching configuration
  // found" message with `ruleId: null` — which a naive harness reads as "the
  // rule reported something", or, if it only counted `forbiddenPure`, as "the
  // rule is silent". The first draft of this guard hit exactly that and
  // reported 0/77, i.e. it accused every copy in the estate of a defect that
  // was in the probe. Left recorded because a probe that cannot distinguish
  // "the rule did not fire" from "the rule never ran" is the same fault class
  // it exists to catch.
  const parser = tseslint.parser ?? tseslint.default?.parser
  if (!parser) {
    console.error('FAIL: typescript-eslint did not expose a parser. Nothing was probed.')
    process.exit(1)
  }
  const config = {
    files: ['**/*.tsx', '**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
    },
  }

  const failures = []
  let passed = 0

  for (const file of ruleFiles) {
    let rule
    try {
      rule =
        selfTest && file.label !== 'packages/eslint-config (SOURCE)'
          ? await loadMutatedRule(file.path, (s) =>
              s.replace(
                'for (const arg of expr.arguments ?? []) {',
                'for (const arg of []) { // SELF-TEST MUTANT: argument walk removed',
              ),
            )
          : await loadRule(file.path)
    } catch (e) {
      failures.push(`${file.label}: could not load the rule — ${e.message}`)
      continue
    }

    const linter = new Linter()
    const cfg = [
      {
        ...config,
        plugins: { probe: { rules: { 'no-hardcoded-colours': rule } } },
        rules: { 'probe/no-hardcoded-colours': 'error' },
      },
    ]

    // POSITIVE CONTROL, per rule file, before any fixture verdict is trusted.
    // A configuration that matches nothing produces the same "no findings" as a
    // clean fixture. This asserts the harness is wired to THIS rule file by
    // making it fire on the shape nobody disputes — a bare pure white in an
    // object property — and refuses to grade the file if it does not.
    const controlMsgs = linter.verify(
      `const s = { color: '#ffffff' }`, // theme-audit-ok: this guard's own positive control
      cfg,
      'colour-probe.tsx',
    )
    if (!controlMsgs.some((m) => m.messageId === 'forbiddenPure')) {
      failures.push(
        `${file.label}: POSITIVE CONTROL FAILED — the rule did not report a bare ` +
          `pure white in an object property. The harness is not wired to this rule ` +
          `file, so none of its fixture verdicts mean anything. ` +
          `Linter said: ${controlMsgs.map((m) => m.message).join(' | ') || 'nothing at all'}`,
      )
      continue
    }

    for (const f of MUST_REPORT) {
      let msgs
      try {
        msgs = linter.verify(f.code, cfg, 'colour-probe.tsx')
      } catch (e) {
        failures.push(`${file.label} / ${f.id}: the rule threw — ${e.message}`)
        continue
      }
      const parseErrors = msgs.filter((m) => m.fatal)
      if (parseErrors.length > 0) {
        failures.push(`${file.label} / ${f.id}: fixture did not parse — ${parseErrors[0].message}`)
        continue
      }
      const pure = msgs.filter((m) => m.messageId === 'forbiddenPure')
      if (pure.length === 0) {
        failures.push(
          `${file.label} / ${f.id}: the pure white/black ban did NOT fire.\n` +
            `      fixture: ${f.code}\n` +
            `      why it matters: ${f.why}\n` +
            `      reported instead: ${msgs.length === 0 ? 'nothing at all' : msgs.map((m) => m.messageId).join(', ')}`,
        )
      } else {
        passed++
      }
    }

    for (const f of MUST_NOT_REPORT) {
      let msgs
      try {
        msgs = linter.verify(f.code, cfg, 'colour-probe.tsx')
      } catch (e) {
        failures.push(`${file.label} / ${f.id}: the rule threw — ${e.message}`)
        continue
      }
      const real = msgs.filter((m) => !m.fatal)
      if (real.length > 0) {
        failures.push(
          `${file.label} / ${f.id}: FALSE POSITIVE — reported ${real.map((m) => m.messageId).join(', ')}.\n` +
            `      fixture: ${f.code}\n` +
            `      why it matters: ${f.why}`,
        )
      } else {
        passed++
      }
    }
  }

  console.log(`${passed} of ${assertions} assertions passed.`)

  if (failures.length > 0) {
    console.error('')
    console.error(`FAIL: ${failures.length} assertion(s) failed.`)
    for (const f of failures) console.error(`  - ${f}`)
    console.error('')
    console.error(
      'A colour-rule copy that cannot see one of these positions is the exact defect that put',
    )
    console.error(
      '17 pure whites into customer-facing PDFs (bsuite#1962). Byte parity and the armed-ness',
    )
    console.error('probe both pass on a copy in this state — only this check does not.')
    process.exit(1)
  }

  if (selfTest) {
    console.error('')
    console.error(
      'FAIL: --self-test mutated the argument walk out of every inline copy and this guard still passed.',
    )
    console.error('The probe is not measuring what it claims to measure.')
    process.exit(1)
  }

  console.log('')
  console.log(
    `PASS: the pure white/black ban is reachable through a converter in all ${ruleFiles.length} rule files.`,
  )
}

main().catch((e) => {
  // EXIT 2, NOT 1, AND THE DISTINCTION IS THE WHOLE POINT.
  //
  // Exit 1 means "the guard ran and reached a verdict". Exit 2 means "the guard
  // could not run at all". Collapsing them into one code is what let this probe's
  // own positive control certify a probe that had never executed: the workflow
  // asserted only that `--self-test` exited non-zero, and a crashing self-test
  // exits non-zero just as convincingly as one that correctly detected the
  // disarmed rule.
  //
  // Measured 2026-08-17: the parent root declares NO eslint, so `import 'eslint'`
  // threw ERR_MODULE_NOT_FOUND, the self-test "failed as required", and the gate
  // went green over a probe that had loaded nothing. Same shape as
  // check-own-package-freshness, which uses exit 2 for CANNOT RUN for this reason.
  console.error(`CANNOT RUN: the probe could not execute — ${e.stack ?? e.message}`)
  console.error(
    'This is exit 2, not a verdict. Do NOT read it as either a pass or a fail:\n' +
      '  - a caller checking only "did it exit non-zero" would mistake this for a\n' +
      '    correctly-detected failure, which is how a dead guard reports healthy.',
  )
  process.exit(2)
})
