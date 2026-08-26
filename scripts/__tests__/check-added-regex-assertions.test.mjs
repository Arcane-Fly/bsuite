import { addsRegexAssertion, scanDiff } from '../check-added-regex-assertions.mjs'

const cases = [
  ['added toMatch', `expect(x).toMatch(/a/)`, true],
  ['added negated toMatch', `expect(x).not.toMatch(/a/)`, true],
  ['added toThrow', `await expect(f()).rejects.toThrow(/a/)`, true],
  ['added stringMatching', `expect.stringMatching(/a/)`, true],
  ['toMatchObject is structural', `expect(x).toMatchObject({a:1})`, false],
  ['toMatch with a string', `expect(x).toMatch('a')`, false],
  ['a line comment quoting it', `// expect(x).toMatch(/a/) — removed`, false],
  ['a JSDoc line quoting it', ` * was expect(x).toMatch(/a/)`, false],
  ['a trailing comment quoting it', `const a = 1 // toMatch(/x/)`, false],
  ['setup regex, not an assertion', `const s = x.replace(/-/g,'+')`, false],
]
let failed = 0
for (const [n, src, want] of cases) {
  const got = addsRegexAssertion(src)
  if (got !== want) { console.error(`FAIL ${n}: want ${want}, got ${got}`); failed++ }
}

// only ADDED lines, and only in test files
const diff = [
  '--- a/src/a.test.ts', '+++ b/src/a.test.ts',
  '+expect(x).toMatch(/added/)',
  '-expect(x).toMatch(/removed/)',
  ' expect(x).toMatch(/context/)',
  '--- a/src/b.ts', '+++ b/src/b.ts',
  '+expect(x).toMatch(/not-a-test-file/)',
].join('\n')
const hits = scanDiff(diff)
if (hits.length !== 1) { console.error(`FAIL diff scan: want 1 hit, got ${hits.length}`); failed++ }
if (hits[0] && !hits[0].line.includes('added')) { console.error('FAIL diff scan: wrong hit'); failed++ }

if (failed) { console.error(`\n${failed} self-test(s) FAILED`); process.exit(1) }
console.log(`check-added-regex-assertions self-test: ${cases.length + 2}/${cases.length + 2} passed (removed lines, context lines and non-test files all correctly ignored)`)
