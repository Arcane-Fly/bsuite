import { strict as assert } from 'node:assert'
import { countRegexAssertions, stripComments } from '../scan-regex-assertions.mjs'

// A gate needs a planted defect it is watched to catch, AND a negative control it
// is watched not to flag. Without both it cannot tell "found nothing" from
// "checked nothing".
const cases = [
  // --- POSITIVE: must be caught -------------------------------------------
  ['toMatch with a literal', `expect(t.title).toMatch(/sent/i)`, 1],
  ['negated toMatch', `expect(t.title).not.toMatch(/sent/i)`, 1],
  ['toThrow with a literal', `await expect(f()).rejects.toThrow(/no tenant/)`, 1],
  ['stringMatching', `expect(x).toEqual(expect.stringMatching(/abc/))`, 1],
  ['several in one file', `toMatch(/a/); toThrow(/b/); toMatch(/c/)`, 3],
  ['whitespace before the literal', `toMatch(\n  /a/\n)`, 1],

  // --- NEGATIVE: must NOT be flagged ---------------------------------------
  ['toMatchObject is structural, not regex', `expect(x).toMatchObject({ a: 1 })`, 0],
  ['toMatch with a STRING is not regex', `expect(x).toMatch('sent')`, 0],
  ['a line comment quoting the matcher', `// expect(x).toMatch(/sent/i) — removed`, 0],
  ['a block comment quoting the matcher', `/* expect(x).toMatch(/sent/i) */`, 0],
  ['a JSDoc quoting the matcher', `/**\n * was: expect(x).not.toMatch(/sent/i)\n */`, 0],
  ['regex used as SETUP, not an assertion', `const s = x.replace(/-/g, '+')`, 0],
  ['a division that looks like a slash', `expect(a).toBe(b / c)`, 0],
]

let failed = 0
for (const [name, src, want] of cases) {
  const got = countRegexAssertions(src)
  if (got !== want) { console.error(`FAIL  ${name}: want ${want}, got ${got}`); failed += 1 }
}

assert.equal(stripComments('const a = 1 // note').trim(), 'const a = 1')
assert.ok(stripComments('/* gone */ const b = 2').includes('const b = 2'))

if (failed) { console.error(`\n${failed}/${cases.length} self-tests FAILED`); process.exit(1) }
console.log(`scan-regex-assertions self-test: ${cases.length}/${cases.length} passed (6 positive, 7 negative controls)`)
