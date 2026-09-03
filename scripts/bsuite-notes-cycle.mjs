#!/usr/bin/env node
/*
 * "bsuite notes" — the intake cycle. THE DOC IS THE SOURCE; EVERYTHING ELSE IS DERIVED.
 *
 * The operator captures defects progressively in a Google Doc and downloads it ad hoc as
 * `bsuite notes.docx`, `bsuite notes (2).docx` … Seven exports exist, 24-37 MB each.
 *
 * WHY THIS SHAPE, and not the seventh tracking document. Six registers have decayed in this
 * estate. Every one was built by agents, for agents, and required someone to maintain it. The
 * ONE artifact that has never decayed is the operator's Doc — because it costs him nothing; he
 * types into something already open. So this asks him to maintain NOTHING NEW. It reads his Doc
 * and derives the rest. A register that cannot be derived from the Doc plus the codebase should
 * not exist.
 *
 * AND ~/Downloads IS VOLATILE — he cleans it out. After phase 1 the notes survive that, because
 * the extracted TEXT is committed. The 24-37 MB binary never is.
 *
 * PHASES, and each reports a count INCLUDING ZERO, because a phase that found nothing and a
 * phase that could not run must never look the same:
 *
 *   1 CAPTURE    newest export -> paragraphs + image manifest -> docs/intake/<sha>/
 *   2 DELTA      set-difference against the last captured export
 *   3 RECONCILE  delta -> operator-notes register -> feature index -> journey gaps -> issues
 *
 * A REMOVED PARAGRAPH IS A FINDING. He appends; he does not usually delete. If a paragraph
 * vanishes, that is either an edit (which breaks set-difference as a delta model and needs
 * saying) or a genuine retraction. Either way it is surfaced, never silently dropped.
 *
 *   node scripts/bsuite-notes-cycle.mjs                 # capture + delta, report only
 *   node scripts/bsuite-notes-cycle.mjs --write         # commit the intake, register the delta
 *   node scripts/bsuite-notes-cycle.mjs --strict        # exit 1 if the LATEST capture has any
 *                                                        # paragraph with no registered_as (see below)
 *   node scripts/bsuite-notes-cycle.mjs --json
 *
 * --strict IS A RUN-START GATE, NOT A CI CHECK — PI ruling 2026-09-03 (audit §7, A5).
 *
 * It reads ~/Downloads, which does not exist on a CI runner, so it CANNOT run in .github/
 * workflows and must not be wired there. It is meant to be run BY THE PI AT THE START OF A
 * SESSION (the commencement-prompt doc already says "run this first" in prose; this makes the
 * check that prose implies mechanically checkable, though invoking it is still the PI's own
 * action, never a hook — see the memory this PR's PR body cites for why a SessionStart hook was
 * considered and rejected here).
 *
 * `registered_as` maps a paragraph's hash to the D-id whose register "Verbatim" quote is a
 * literal substring of that paragraph — i.e., that paragraph's own words are what the register
 * row quotes. This is deliberately a SUBSTRING match, not a semantic one: a register row that
 * SYNTHESISES several paragraphs into one ask, or paraphrases rather than quotes, will not match
 * even though the paragraph genuinely was accounted for. Measured on the two captures already in
 * docs/intake/: only ~9% of paragraphs (34/378 and 36/400) directly quote-match a register row.
 * `--strict` is expected to be LOUDLY RED on today's estate — that red is the true, previously
 * invisible fact that most captured paragraphs have not yet been triaged into a register row, not
 * a bug in the matcher. Closing that gap is intake triage work, out of this PR's scope.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INTAKE = join(ROOT, 'docs/intake')
const DOWNLOADS = join(process.env.HOME || '/home/braden', 'Downloads')

const WRITE = process.argv.includes('--write')
const AS_JSON = process.argv.includes('--json')
const STRICT = process.argv.includes('--strict')

/** A paragraph's stable identity in registered_as maps — same prefix length as the capture's own sha256_prefix. */
export function paragraphHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 12)
}

/** Register rows, verbatim-quote only — a local, minimal parser (not estate-align.mjs's: that
 *  module runs its own main() and process.exit() on import, so importing it here would abort
 *  this script). Same `| D-` line-scan contract as estate-align.mjs's parseRegister. */
export function parseRegisterVerbatims(text) {
  const out = []
  const seen = new Set()
  for (const line of text.split('\n')) {
    if (!line.startsWith('| D-')) continue
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    if (cells.length < 6) continue
    const id = cells[0]
    if (seen.has(id)) continue
    seen.add(id)
    let q = cells[1].trim()
    if (q.startsWith('*') && q.endsWith('*')) q = q.slice(1, -1).trim()
    if (q.startsWith('"') && q.endsWith('"')) q = q.slice(1, -1)
    if (q.length >= 8) out.push({ id, quote: q })
  }
  return out
}

/** { [paragraphHash]: D-id } for every paragraph whose text CONTAINS a register row's verbatim
 *  quote. A substring match, not a semantic one — see the header comment on why that undercounts. */
export function matchRegisteredAs(paragraphs, registerRows) {
  const map = {}
  for (const p of paragraphs) {
    const hit = registerRows.find((r) => p.includes(r.quote))
    if (hit) map[paragraphHash(p)] = hit.id
  }
  return map
}

function sh(cmd, a, cwd) {
  try { return execFileSync(cmd, a, { cwd: cwd || ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return '' }
}

/*
 * Newest `bsuite notes*.docx` BY MTIME. The numbered suffix is not a content ordering — it is
 * whatever the browser appended to avoid a filename collision.
 *
 * THE FIRST VERSION OF THIS USED `require('node:fs').statSync` INSIDE AN ESM MODULE. `require`
 * does not exist there, the try/catch swallowed the ReferenceError, and every mtime came back 0.
 * The sort was then meaningless: it selected `bsuite notes (1).docx` (43 paragraphs) instead of
 * `(6)` (378), and stamped the capture 19700101 — the epoch, from the zero it had just invented.
 *
 * The output looked entirely plausible. It was only caught because the correct paragraph count
 * was already known from an earlier measurement. A silent zero that flows into a sort and a
 * timestamp is the shape of bug that ships.
 */
export function newestExport(dir) {
  if (!existsSync(dir)) return null
  const hits = readdirSync(dir)
    .filter((f) => f.toLowerCase().startsWith('bsuite notes') && f.toLowerCase().endsWith('.docx'))
    .map((f) => ({ f, p: join(dir, f), m: statSync(join(dir, f)).mtimeMs }))
  if (!hits.length) return null
  // A zero mtime means stat lied; refuse rather than silently pick the wrong export.
  if (hits.some((h) => !h.m)) throw new Error('an export reported mtime 0 — refusing to choose a source from a broken stat')
  hits.sort((x, y) => y.m - x.m)
  return hits[0]
}

/*
 * Extract paragraphs from the docx. A .docx is a zip; word/document.xml holds the body.
 * Deliberately NOT a regex over the whole document: split on </w:p> first so a paragraph is a
 * paragraph, then take the <w:t> runs inside it. Paragraph identity is the delta's unit, and a
 * whole-document regex would fuse or split them unpredictably.
 */
export function extractParagraphs(docxPath) {
  const py = `
import sys, zipfile, re, html, json
z = zipfile.ZipFile(sys.argv[1])
xml = z.read("word/document.xml").decode("utf-8", "replace")
out = []
for p in xml.split("</w:p>"):
    runs = re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "", "".join(runs))).strip()
    if t: out.append(t)
imgs = [n for n in z.namelist() if n.startswith("word/media/")]
print(json.dumps({"paragraphs": out, "images": len(imgs)}))
`
  const raw = execFileSync('python3', ['-c', py, docxPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return JSON.parse(raw)
}

/** The previously captured export, or null on a first run. */
function previousCapture() {
  if (!existsSync(INTAKE)) return null
  const dirs = readdirSync(INTAKE).filter((d) => existsSync(join(INTAKE, d, 'paragraphs.txt')))
  if (!dirs.length) return null
  dirs.sort()
  const last = dirs[dirs.length - 1]
  return { id: last, paragraphs: readFileSync(join(INTAKE, last, 'paragraphs.txt'), 'utf8').split('\n---\n').filter(Boolean) }
}

/** The most recently captured directory on disk (by id, which sorts by date-then-hash). */
function latestCaptureDir() {
  if (!existsSync(INTAKE)) return null
  const dirs = readdirSync(INTAKE).filter((d) => existsSync(join(INTAKE, d, 'MANIFEST.json')))
  if (!dirs.length) return null
  dirs.sort()
  return dirs[dirs.length - 1]
}

function registeredIds() {
  const docs = join(ROOT, 'docs')
  if (!existsSync(docs)) return { path: null, max: 0 }
  const regs = readdirSync(docs).filter((f) => f.includes('operator-notes-register') && f.endsWith('.md')).sort()
  if (!regs.length) return { path: null, max: 0 }
  const p = join(docs, regs[regs.length - 1])
  let max = 0
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    if (!line.startsWith('| D-')) continue
    const n = Number(line.slice(3, line.indexOf(' ', 3)).replace(/[^0-9]/g, ''))
    if (Number.isFinite(n) && n > max) max = n
  }
  return { path: p, max }
}

/* ------------------------------- run ------------------------------- */
const report = { phases: {} }

// PHASE 1 — CAPTURE
const src = newestExport(DOWNLOADS)
if (!src) {
  console.error(`HARNESS-FAIL: no "bsuite notes*.docx" in ${DOWNLOADS}. That is the source; its absence is the finding, not a pass.`)
  process.exit(1)
}
const { paragraphs, images } = extractParagraphs(src.p)
const sha = createHash('sha256').update(paragraphs.join('\n')).digest('hex').slice(0, 12)
const stamp = new Date(src.m).toISOString().slice(0, 10).replace(/-/g, '')
const captureId = `${stamp}-${sha}`
report.phases.capture = { source: src.f, sourceBytes: statSync(src.p).size, paragraphs: paragraphs.length, images, captureId }

const dest = join(INTAKE, captureId)
if (WRITE && !existsSync(join(dest, 'paragraphs.txt'))) {
  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, 'paragraphs.txt'), paragraphs.join('\n---\n'))
  const registerAtWriteTime = registeredIds()
  const registerRows = registerAtWriteTime.path ? parseRegisterVerbatims(readFileSync(registerAtWriteTime.path, 'utf8')) : []
  writeFileSync(join(dest, 'MANIFEST.json'), JSON.stringify({
    source: src.f, capturedAt: new Date(src.m).toISOString(), paragraphs: paragraphs.length,
    images, sha256_prefix: sha,
    note: 'Extracted TEXT only. The 24-37 MB .docx binary is deliberately not committed; ~/Downloads is volatile and this is what survives it.',
    registered_as: matchRegisteredAs(paragraphs, registerRows),
    registered_as_note: 'paragraph hash (sha256, 12 hex) -> D-id, where that D-id\'s register Verbatim quote is a literal substring of the paragraph. A substring match, not semantic — see this script\'s header comment.',
  }, null, 1) + '\n')
}

// PHASE 2 — DELTA
const prev = previousCapture()
const prevSet = new Set(prev ? prev.paragraphs : [])
const added = prev ? paragraphs.filter((p) => !prevSet.has(p)) : paragraphs
const curSet = new Set(paragraphs)
const removed = prev ? prev.paragraphs.filter((p) => !curSet.has(p)) : []
report.phases.delta = {
  comparedAgainst: prev ? prev.id : '(first capture — every paragraph is new)',
  added: added.length,
  removed: removed.length,
  removedIsAFinding: removed.length > 0,
}

// PHASE 3 — RECONCILE
const reg = registeredIds()
const idx = join(ROOT, 'docs/00-roadmap/bsuite-feature-index.json')
const features = existsSync(idx) ? JSON.parse(readFileSync(idx, 'utf8')) : []
report.phases.reconcile = {
  register: reg.path ? reg.path.replace(ROOT + '/', '') : '(none found)',
  highestRegisteredId: reg.max ? `D-${reg.max}` : '(none)',
  nextIdWouldBe: `D-${reg.max + 1}`,
  featureIndexRows: features.length,
  featuresWithVerdict: features.filter((f) => {
    const s = typeof f.dod_status === 'string' ? f.dod_status : (f.dod_status || {}).state
    return s && s !== 'not-evaluated'
  }).length,
  newParagraphsAwaitingRegistration: added.length,
}

if (AS_JSON) { console.log(JSON.stringify({ report, added, removed }, null, 2)) }
else {
  console.log(`bsuite-notes-cycle · ${WRITE ? 'WRITE' : 'DRY RUN (pass --write to capture)'}`)
  console.log(`\n1 CAPTURE   ${src.f}`)
  console.log(`            ${paragraphs.length} paragraphs, ${images} images -> docs/intake/${captureId}/`)
  console.log(`\n2 DELTA     vs ${report.phases.delta.comparedAgainst}`)
  console.log(`            +${added.length} new, -${removed.length} removed`)
  if (removed.length) {
    console.log(`            *** ${removed.length} PARAGRAPH(S) DISAPPEARED — this is a FINDING. ***`)
    console.log(`            He appends; he does not usually delete. Either the Doc was EDITED (which`)
    console.log(`            breaks set-difference as the delta model and must be said out loud), or`)
    console.log(`            an ask was retracted. Do not proceed as though nothing happened:`)
    for (const r of removed.slice(0, 5)) console.log(`              - ${r.slice(0, 92)}`)
  }
  console.log(`\n3 RECONCILE register ${report.phases.reconcile.register}`)
  console.log(`            highest registered ${report.phases.reconcile.highestRegisteredId}, next would be ${report.phases.reconcile.nextIdWouldBe}`)
  console.log(`            feature index ${features.length} rows, ${report.phases.reconcile.featuresWithVerdict} carrying a DoD verdict`)
  console.log(`            ${added.length} new paragraph(s) awaiting registration`)
  if (added.length) {
    console.log(`\n  NEW SINCE ${report.phases.delta.comparedAgainst}:`)
    for (const a of added.slice(0, 12)) console.log(`    ${a.slice(0, 108)}`)
    if (added.length > 12) console.log(`    … and ${added.length - 12} more`)
  }
  console.log(`\n  Next: register the delta as D-${reg.max + 1}…, map each to a feature row or a journey gap,`)
  console.log(`  then \`node scripts/estate-align.mjs --strict\`.`)
}

// PHASE 4 — STRICT (PI ruling 2026-09-03, audit §7, A5). A run-start gate the PI invokes
// manually — see the header comment for why it cannot be a CI or SessionStart hook.
if (STRICT) {
  const latest = latestCaptureDir()
  if (!latest) {
    console.error('STRICT FAIL: no capture on disk to check — run --write at least once first.')
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(join(INTAKE, latest, 'MANIFEST.json'), 'utf8'))
  const latestParas = readFileSync(join(INTAKE, latest, 'paragraphs.txt'), 'utf8').split('\n---\n').filter(Boolean)
  const registeredAs = manifest.registered_as || {}
  const missing = latestParas.filter((p) => !(paragraphHash(p) in registeredAs))
  console.log(`\n4 STRICT    capture ${latest}: ${latestParas.length} paragraph(s), ` +
    `${latestParas.length - missing.length} registered_as-mapped, ${missing.length} not yet triaged into a register row`)
  if (missing.length) {
    console.error(`\nSTRICT FAIL: ${missing.length} of ${latestParas.length} paragraph(s) in ${latest} have no registered_as.`)
    console.error('These are captured but not yet accounted for in any register row (see the header comment —')
    console.error('a paraphrased or synthesised row will not substring-match, so this undercounts true coverage,')
    console.error('never overcounts it).')
    process.exit(1)
  }
  console.log('STRICT OK: every paragraph in the latest capture maps to a register row.')
}

if (process.argv.includes('--self-test')) {
  const cases = []
  const t = (n, a, e) => cases.push({ n, ok: JSON.stringify(a) === JSON.stringify(e) })
  t('newestExport returns null on a missing dir', newestExport('/nonexistent/xyz'), null)

  // ---- registered_as: the substring matcher, PI ruling 2026-09-03 (audit §7, A5) ----
  t('parseRegisterVerbatims: reads the quote out of a real row',
    parseRegisterVerbatims('| D-1 | "emails, cant be opened and read." | x | y | z | w |'),
    [{ id: 'D-1', quote: 'emails, cant be opened and read.' }])
  t('parseRegisterVerbatims: skips a malformed row (fewer than 6 cells)',
    parseRegisterVerbatims('| D-2 — label | *"a quote"* |').length, 0)
  t('matchRegisteredAs: a paragraph that CONTAINS the verbatim quote maps to that id',
    matchRegisteredAs(['he said: "emails, cant be opened" today'], [{ id: 'D-1', quote: 'emails, cant be opened' }]),
    { [paragraphHash('he said: "emails, cant be opened" today')]: 'D-1' })
  t('matchRegisteredAs: a paragraph with NO matching quote gets no entry',
    Object.keys(matchRegisteredAs(['totally unrelated text'], [{ id: 'D-1', quote: 'emails, cant be opened' }])).length, 0)
  t('paragraphHash: stable and 12 hex chars', /^[0-9a-f]{12}$/.test(paragraphHash('x')), true)

  const bad = cases.filter((c) => !c.ok)
  for (const b of bad) console.error(`FAIL ${b.n}`)
  if (bad.length) process.exit(1)
  console.log(`bsuite-notes-cycle --self-test: OK (${cases.length} cases)`)
}
process.exit(0)
