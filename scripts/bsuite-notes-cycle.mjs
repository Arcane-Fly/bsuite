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
 *   4 STRICT     every paragraph in the latest capture is either registered or dispositioned,
 *                and the count that is NEITHER is banked as a two-way ratchet (below)
 *
 * A REMOVED PARAGRAPH IS A FINDING. He appends; he does not usually delete. If a paragraph
 * vanishes, that is either an edit (which breaks set-difference as a delta model and needs
 * saying) or a genuine retraction. Either way it is surfaced, never silently dropped.
 *
 *   node scripts/bsuite-notes-cycle.mjs                    # capture + delta, report only
 *   node scripts/bsuite-notes-cycle.mjs --write            # commit the intake, register the delta
 *   node scripts/bsuite-notes-cycle.mjs --strict           # exit 1 if the untriaged count ROSE
 *                                                          # above the bank, or FELL without a
 *                                                          # re-bank, or a manifest entry is
 *                                                          # malformed (see STRICT below)
 *   node scripts/bsuite-notes-cycle.mjs --update-baseline  # bank the current untriaged count
 *   node scripts/bsuite-notes-cycle.mjs --self-test
 *   node scripts/bsuite-notes-cycle.mjs --json
 *
 * --strict IS A RUN-START GATE, NOT A CI CHECK — PI ruling 2026-09-03 (audit §7, A5).
 *
 * It reads ~/Downloads, which does not exist on a CI runner, so it CANNOT run in .github/
 * workflows and must not be wired there. It is meant to be run BY THE PI AT THE START OF A
 * SESSION (the commencement-prompt doc already says "run this first" in prose; this makes the
 * check that prose implies mechanically checkable, though invoking it is still the PI's own
 * action, never a hook — a SessionStart hook was considered and rejected, see bsuite#2970).
 *
 * `--strict` REFUSES to run in the same invocation as `--write`: a fresh capture must not be
 * able to certify itself green on the run that created it.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * STRICT — per-paragraph disposition and the untriaged ratchet (PI ruling 2026-09-03, adopting
 * the bsuite#2970 review's proposal)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * As first shipped, --strict failed on every paragraph with no `registered_as`. On the only real
 * data it will ever see that was 364 of 400 — red on day one, red by design, and a gate that
 * cannot go green without work declared out of scope is the never-satisfiable class this estate
 * forbids. It would have been run once, seen red, and never run again.
 *
 * So, per paragraph hash (sha256, 12 hex — the same prefix length as the capture's own
 * `sha256_prefix`) in the capture's MANIFEST.json, EXACTLY ONE of:
 *
 *   registered_as[hash] = "D-n"     derived: the register row whose "Verbatim" quote is a
 *                                   substring of the paragraph after NORMALISING both sides
 *                                   (collapse whitespace, smart quotes -> ASCII, case-fold).
 *                                   Still a substring match, not a semantic one: a row that
 *                                   SYNTHESISES several paragraphs or paraphrases will not match.
 *                                   Recomputed live against the current register on every
 *                                   --strict run, unioned with the manifest's frozen map, so a
 *                                   row registered AFTER the capture still counts.
 *
 *   disposition[hash] = one of      human-entered, by the triage lane (never by this script):
 *     "not-an-ask"                    prose that asks for nothing (a heading, a musing)
 *     "pasted-agent-output"           an agent's reply pasted back into the Doc
 *     "date"                          a bare date / session marker
 *     "screenshot-caption"            text that only labels an image
 *     "duplicate-of:<hash>"           the same ask as another paragraph, by its 12-hex hash
 *
 * A paragraph with NEITHER is UNTRIAGED. A paragraph with BOTH, or with a disposition outside
 * the vocabulary, or a duplicate-of pointing at a hash not in the capture, is a MANIFEST DEFECT
 * and fails --strict by itself.
 *
 * THE UNTRIAGED COUNT IS BANKED in scripts/notes-cycle-untriaged-baseline.json as
 * {untriaged, paragraphs, banked} — a TWO-WAY ratchet, the same primitive every other C2/A5
 * gate uses: a RISE fails ("triage the new paragraphs, do not re-bank"); an UNBANKED FALL fails
 * with the --update-baseline remedy (so an improvement is looked at, not assumed); a live
 * `paragraphs` denominator BELOW the bank fails as "scanned less than banked" (the capture
 * shrank or the walk went blind). Green today at whatever the normalised count is; it can only
 * shrink. The triage debt is visible in the baseline rather than swallowed.
 *
 * Measured 2026-09-03 on capture 20260903-a7ae581fe24b: 400 paragraphs, 36 map by raw
 * substring, 40 after normalising (+4: D-13, D-15, D-147, D-148 — curly apostrophes and a fused
 * heading), 0 dispositioned, 360 untriaged and banked.
 *
 * Environment (for --self-test fixtures only; never set in normal use):
 *   NOTES_CYCLE_ROOT        estate root holding docs/intake, docs/*operator-notes-register*.md,
 *                           docs/00-roadmap/bsuite-feature-index.json and
 *                           scripts/notes-cycle-untriaged-baseline.json (default: this repo)
 *   NOTES_CYCLE_DOWNLOADS   directory holding `bsuite notes*.docx` (default: ~/Downloads)
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.NOTES_CYCLE_ROOT ? resolve(process.env.NOTES_CYCLE_ROOT) : REPO_ROOT
const INTAKE = join(ROOT, 'docs/intake')
const DOWNLOADS = process.env.NOTES_CYCLE_DOWNLOADS
  ? resolve(process.env.NOTES_CYCLE_DOWNLOADS)
  : join(process.env.HOME || '/home/braden', 'Downloads')
const UNTRIAGED_BASELINE = join(ROOT, 'scripts/notes-cycle-untriaged-baseline.json')
const UNTRIAGED_BASELINE_REL = 'scripts/notes-cycle-untriaged-baseline.json'
const REMEDY = 'node scripts/bsuite-notes-cycle.mjs --update-baseline'

const WRITE = process.argv.includes('--write')
const AS_JSON = process.argv.includes('--json')
const STRICT = process.argv.includes('--strict')
const UPDATE_BASELINE = process.argv.includes('--update-baseline')
const SELF_TEST = process.argv.includes('--self-test')

/** The disposition vocabulary. `duplicate-of:<hash>` is validated separately. */
export const DISPOSITIONS = ['not-an-ask', 'pasted-agent-output', 'date', 'screenshot-caption']

/** A paragraph's stable identity in registered_as / disposition maps — same prefix length as the capture's own sha256_prefix. */
export function paragraphHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 12)
}

/*
 * NORMALISE BEFORE MATCHING — bsuite#2970 review. The Doc is typed in Google Docs, which
 * substitutes curly quotes and apostrophes; the register is typed in markdown by an agent
 * reading that Doc, which often does not. `Why can't I import units?` did not substring-match
 * `Why can’t I import units?`, and a heading fused onto its first sentence ("Training HoursAgain,
 * should be…") did not match a quote that began at "Again". Collapse whitespace, map the
 * typographic quote family to ASCII, case-fold. Nothing semantic.
 */
export function normaliseText(s) {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
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

/** { [paragraphHash]: D-id } for every paragraph whose NORMALISED text contains a register row's
 *  NORMALISED verbatim quote. A substring match, not a semantic one — see the header on why that
 *  undercounts. Pass `normalise: false` to get the raw-substring map (reported alongside, so the
 *  gain from normalising is visible). */
export function matchRegisteredAs(paragraphs, registerRows, { normalise = true } = {}) {
  const map = {}
  const rows = registerRows.map((r) => ({ id: r.id, q: normalise ? normaliseText(r.quote) : r.quote }))
  for (const p of paragraphs) {
    const hay = normalise ? normaliseText(p) : p
    const hit = rows.find((r) => p.includes(r.q) || hay.includes(r.q))
    if (hit) map[paragraphHash(p)] = hit.id
  }
  return map
}

/*
 * THE STRICT VERDICT, as a pure function so the self-test can drive it with literals AND the
 * entry-point cases can drive it through the CLI. Returns { untriaged, registered, dispositioned,
 * defects[], violations[] } — `violations` is what fails the gate.
 */
export function strictVerdict({ paragraphs, registeredAs, disposition, baseline }) {
  const hashes = paragraphs.map(paragraphHash)
  const inCapture = new Set(hashes)
  const defects = []
  let registered = 0
  let dispositioned = 0
  let untriaged = 0
  for (const h of hashes) {
    const reg = Object.prototype.hasOwnProperty.call(registeredAs, h)
    const dis = Object.prototype.hasOwnProperty.call(disposition, h)
    if (reg && dis) defects.push(`${h}: has BOTH registered_as (${registeredAs[h]}) and disposition (${disposition[h]}) — exactly one is allowed`)
    if (dis) {
      const d = String(disposition[h])
      if (d.startsWith('duplicate-of:')) {
        const target = d.slice('duplicate-of:'.length)
        if (!inCapture.has(target)) defects.push(`${h}: duplicate-of:${target} names a hash that is not in this capture`)
        else if (target === h) defects.push(`${h}: duplicate-of itself`)
      } else if (!DISPOSITIONS.includes(d)) {
        defects.push(`${h}: disposition "${d}" is not one of ${DISPOSITIONS.join(' | ')} | duplicate-of:<hash>`)
      }
    }
    if (reg) registered++
    else if (dis) dispositioned++
    else untriaged++
  }
  for (const h of Object.keys(disposition)) {
    if (!inCapture.has(h)) defects.push(`disposition[${h}] names a paragraph hash that is not in this capture`)
  }

  const violations = []
  for (const d of defects) violations.push(`MANIFEST DEFECT: ${d}`)
  if (!baseline) {
    violations.push(`no baseline at ${UNTRIAGED_BASELINE_REL} — run \`${REMEDY}\` to bank ${untriaged} untriaged of ${paragraphs.length} paragraphs`)
  } else {
    if (untriaged > baseline.untriaged) {
      violations.push(`untriaged ROSE ${baseline.untriaged} -> ${untriaged}. New paragraphs need a register row or a disposition, not a re-bank.`)
    } else if (untriaged < baseline.untriaged) {
      violations.push(`untriaged FELL ${baseline.untriaged} -> ${untriaged} without being banked. Run \`${REMEDY}\`.`)
    }
    if (paragraphs.length < baseline.paragraphs) {
      violations.push(`SCANNED LESS THAN BANKED: ${paragraphs.length} paragraph(s) in the latest capture, baseline banked ${baseline.paragraphs}. The capture shrank or the read went blind — investigate before trusting ${untriaged}.`)
    }
  }
  return { untriaged, registered, dispositioned, paragraphs: paragraphs.length, defects, violations }
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

/* ------------------------------- self-test ------------------------------- */
if (SELF_TEST) {
  const cases = []
  const t = (n, a, e) => cases.push({ n, ok: JSON.stringify(a) === JSON.stringify(e), a, e })
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

  // ---- normalisation (bsuite#2970 review) ----
  t('normaliseText: curly apostrophe -> ASCII', normaliseText('can\u2019t'), "can't")
  t('normaliseText: curly double quotes -> ASCII', normaliseText('\u201Cx\u201D'), '"x"')
  t('normaliseText: whitespace collapses and case folds', normaliseText('  Why   Can\u2019t\nI  '), "why can't i")
  t('matchRegisteredAs: a curly-apostrophe paragraph matches a straight-apostrophe quote (the D-15 case)',
    Object.values(matchRegisteredAs(['Why can\u2019t I import units? Should be pulled from the TGA API'], [{ id: 'D-15', quote: "Why can't I import units?" }])), ['D-15'])
  t('matchRegisteredAs: normalise:false is the raw substring matcher and does NOT match it',
    Object.keys(matchRegisteredAs(['Why can\u2019t I import units?'], [{ id: 'D-15', quote: "Why can't I import units?" }], { normalise: false })).length, 0)
  t('matchRegisteredAs: the hash is of the ORIGINAL paragraph, never the normalised text',
    Object.keys(matchRegisteredAs(['Why can\u2019t I import units?'], [{ id: 'D-15', quote: "why can't i import units?" }])), [paragraphHash('Why can\u2019t I import units?')])

  // ---- strictVerdict: exactly one of registered_as | disposition; two-way ratchet ----
  const P = ['alpha ask', 'beta ask', 'gamma ask']
  const [ha, hb, hc] = P.map(paragraphHash)
  const bank = (untriaged, paragraphs = 3) => ({ untriaged, paragraphs, banked: '2026-09-03' })
  t('strict: registered + dispositioned + untriaged partition the capture',
    (() => { const v = strictVerdict({ paragraphs: P, registeredAs: { [ha]: 'D-1' }, disposition: { [hb]: 'not-an-ask' }, baseline: bank(1) }); return [v.registered, v.dispositioned, v.untriaged, v.violations.length] })(), [1, 1, 1, 0])
  t('strict: untriaged at the bank is clean',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: {}, baseline: bank(3) }).violations, [])
  t('strict: untriaged RISING above the bank fails, naming triage not re-bank',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: {}, baseline: bank(2) }).violations.some((v) => /ROSE 2 -> 3/.test(v) && /not a re-bank/.test(v)), true)
  t('strict: untriaged FALLING without a re-bank fails with the --update-baseline remedy',
    strictVerdict({ paragraphs: P, registeredAs: { [ha]: 'D-1' }, disposition: {}, baseline: bank(3) }).violations.some((v) => /FELL 3 -> 2/.test(v) && v.includes(REMEDY)), true)
  t('strict: paragraphs BELOW the banked denominator fails as scanned-less-than-banked',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: {}, baseline: bank(3, 4) }).violations.some((v) => /SCANNED LESS THAN BANKED/.test(v)), true)
  t('strict: no baseline is a violation naming the remedy, not a silent pass',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: {}, baseline: null }).violations.some((v) => /no baseline/.test(v) && v.includes(REMEDY)), true)
  t('strict: every vocabulary word is accepted',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: { [ha]: 'not-an-ask', [hb]: 'pasted-agent-output', [hc]: 'date' }, baseline: bank(0) }).violations, [])
  t('strict: screenshot-caption and a valid duplicate-of are accepted',
    strictVerdict({ paragraphs: P, registeredAs: { [ha]: 'D-1' }, disposition: { [hb]: 'screenshot-caption', [hc]: `duplicate-of:${ha}` }, baseline: bank(0) }).violations, [])
  t('strict: a disposition outside the vocabulary is a MANIFEST DEFECT',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: { [ha]: 'meh' }, baseline: bank(2) }).violations.some((v) => /MANIFEST DEFECT/.test(v) && /not one of/.test(v)), true)
  t('strict: BOTH registered_as and disposition on one hash is a MANIFEST DEFECT',
    strictVerdict({ paragraphs: P, registeredAs: { [ha]: 'D-1' }, disposition: { [ha]: 'date' }, baseline: bank(2) }).violations.some((v) => /has BOTH/.test(v)), true)
  t('strict: duplicate-of a hash outside the capture is a MANIFEST DEFECT',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: { [ha]: 'duplicate-of:000000000000' }, baseline: bank(2) }).violations.some((v) => /not in this capture/.test(v)), true)
  t('strict: duplicate-of itself is a MANIFEST DEFECT',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: { [ha]: `duplicate-of:${ha}` }, baseline: bank(2) }).violations.some((v) => /itself/.test(v)), true)
  t('strict: a disposition keyed by a hash not in the capture is a MANIFEST DEFECT',
    strictVerdict({ paragraphs: P, registeredAs: {}, disposition: { ffffffffffff: 'date' }, baseline: bank(3) }).violations.some((v) => /not in this capture/.test(v)), true)

  /*
   * ENTRY-POINT cases (bsuite#2970 review, rule 6): spawn this script against a fixture estate
   * (NOTES_CYCLE_ROOT) with a tiny real .docx in NOTES_CYCLE_DOWNLOADS and assert exit codes.
   * The committed intake, register and baseline are never read or written; the fixture is
   * removed afterwards.
   */
  const fixture = mkdtempSync(join(tmpdir(), 'c2-notes-'))
  try {
    const dl = join(fixture, 'downloads')
    mkdirSync(dl, { recursive: true })
    mkdirSync(join(fixture, 'docs/00-roadmap'), { recursive: true })
    mkdirSync(join(fixture, 'scripts'), { recursive: true })
    const paras = ['emails, cant be opened and read.', 'Why can\u2019t I import units? Should be pulled from the TGA API', 'Tuesday', 'a fourth ask nobody registered']
    const docxPy = `
import sys, zipfile, json
paras = json.loads(sys.argv[2])
body = "".join('<w:p><w:r><w:t>%s</w:t></w:r></w:p>' % p.replace("&","&amp;").replace("<","&lt;") for p in paras)
xml = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>%s</w:body></w:document>' % body
with zipfile.ZipFile(sys.argv[1], "w") as z:
    z.writestr("word/document.xml", xml)
`
    execFileSync('python3', ['-c', docxPy, join(dl, 'bsuite notes.docx'), JSON.stringify(paras)])
    writeFileSync(join(fixture, 'docs/20260825-operator-notes-register-fixture-v1.00W.md'),
      '| D-1 | "emails, cant be opened and read." | open | /c | CRM7 | ux |\n| D-15 | "Why can\'t I import units?" | tga | /t | CRM7 | ux |\n')
    writeFileSync(join(fixture, 'docs/00-roadmap/bsuite-feature-index.json'), '[]\n')
    const run = (...args) => {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
        encoding: 'utf8', env: { ...process.env, NOTES_CYCLE_ROOT: fixture, NOTES_CYCLE_DOWNLOADS: dl },
      })
      return { code: r.status, out: `${r.stdout}${r.stderr}` }
    }
    const entry = (n, r, code, re) => cases.push({ n, ok: r.code === code && re.test(r.out), a: `exit ${r.code}\n${r.out}`, e: `exit ${code} matching ${re}` })
    const baselinePath = join(fixture, 'scripts/notes-cycle-untriaged-baseline.json')
    const manifestPath = () => { const d = readdirSync(join(fixture, 'docs/intake')).sort(); return join(fixture, 'docs/intake', d[d.length - 1], 'MANIFEST.json') }

    entry('ENTRY: --strict together with --write is refused, exit 1', run('--strict', '--write'), 1, /refuses to run with --write/)
    entry('ENTRY: --strict with no capture on disk → exit 1', run('--strict'), 1, /no capture on disk/)
    entry('ENTRY: --write captures the fixture docx → exit 0, 4 paragraphs, 2 registered_as by the NORMALISED matcher', run('--write'), 0, /4 paragraphs[\s\S]*registered_as-mapped: 2 \(raw substring 1, \+1 after normalising\)/)
    entry('ENTRY: --strict with no baseline → exit 1 naming the --update-baseline remedy', run('--strict'), 1, /no baseline at scripts\/notes-cycle-untriaged-baseline\.json[\s\S]*--update-baseline/)
    entry('ENTRY: --update-baseline banks untriaged 2 of 4 → exit 0', run('--update-baseline'), 0, /BANKED: untriaged=2 paragraphs=4/)
    entry('ENTRY: banked baseline is the {untriaged, paragraphs, banked} shape',
      { code: (() => { const b = JSON.parse(readFileSync(baselinePath, 'utf8')); return b.untriaged === 2 && b.paragraphs === 4 && /^\d{4}-\d{2}-\d{2}$/.test(b.banked) ? 0 : 1 })(), out: 'shape' }, 0, /shape/)
    entry('ENTRY: --strict at the bank → exit 0 STRICT OK', run('--strict'), 0, /STRICT OK/)
    // Disposition the bare date: untriaged falls 2 -> 1 without a re-bank.
    const m = JSON.parse(readFileSync(manifestPath(), 'utf8'))
    m.disposition = { [paragraphHash('Tuesday')]: 'date' }
    writeFileSync(manifestPath(), `${JSON.stringify(m, null, 1)}\n`)
    entry('ENTRY: a disposition added, untriaged FELL 2 -> 1 unbanked → exit 1 with the remedy', run('--strict'), 1, /untriaged FELL 2 -> 1[\s\S]*--update-baseline/)
    entry('ENTRY: re-bank → exit 0', run('--update-baseline'), 0, /BANKED: untriaged=1 paragraphs=4/)
    entry('ENTRY: --strict green again after the re-bank', run('--strict'), 0, /STRICT OK/)
    // A disposition outside the vocabulary is a manifest defect.
    m.disposition = { [paragraphHash('Tuesday')]: 'date', [paragraphHash('a fourth ask nobody registered')]: 'shrug' }
    writeFileSync(manifestPath(), `${JSON.stringify(m, null, 1)}\n`)
    entry('ENTRY: an out-of-vocabulary disposition → MANIFEST DEFECT, exit 1', run('--strict'), 1, /MANIFEST DEFECT[\s\S]*"shrug" is not one of/)
    // Bank says 0 but 1 is untriaged: a RISE.
    m.disposition = { [paragraphHash('Tuesday')]: 'date' }
    writeFileSync(manifestPath(), `${JSON.stringify(m, null, 1)}\n`)
    writeFileSync(baselinePath, `${JSON.stringify({ untriaged: 0, paragraphs: 4, banked: '2026-09-03' }, null, 2)}\n`)
    entry('ENTRY: untriaged ROSE above the bank → exit 1, "not a re-bank"', run('--strict'), 1, /untriaged ROSE 0 -> 1[\s\S]*not a re-bank/)
    // Bank claims a bigger capture than exists.
    writeFileSync(baselinePath, `${JSON.stringify({ untriaged: 1, paragraphs: 9, banked: '2026-09-03' }, null, 2)}\n`)
    entry('ENTRY: paragraphs below the banked denominator → SCANNED LESS THAN BANKED, exit 1', run('--strict'), 1, /SCANNED LESS THAN BANKED: 4 paragraph\(s\)[\s\S]*banked 9/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }

  const bad = cases.filter((c) => !c.ok)
  for (const b of bad) console.error(`FAIL ${b.n}\n  expected ${JSON.stringify(b.e)}\n  got      ${JSON.stringify(b.a)}`)
  if (bad.length) process.exit(1)
  console.log(`bsuite-notes-cycle --self-test: OK (${cases.length} cases, 13 through the CLI entry point against a temp estate + temp docx; fixture removed)`)
  process.exit(0)
}

/* ------------------------------- run ------------------------------- */
if (STRICT && WRITE) {
  console.error('FAIL: --strict refuses to run with --write. A capture must not certify itself on the run that created it — run --write, then --strict.')
  process.exit(1)
}

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
let writeMatchNote = null
if (WRITE && !existsSync(join(dest, 'paragraphs.txt'))) {
  mkdirSync(dest, { recursive: true })
  writeFileSync(join(dest, 'paragraphs.txt'), paragraphs.join('\n---\n'))
  const registerAtWriteTime = registeredIds()
  const registerRows = registerAtWriteTime.path ? parseRegisterVerbatims(readFileSync(registerAtWriteTime.path, 'utf8')) : []
  const registeredAs = matchRegisteredAs(paragraphs, registerRows)
  const rawCount = Object.keys(matchRegisteredAs(paragraphs, registerRows, { normalise: false })).length
  writeMatchNote = `registered_as-mapped: ${Object.keys(registeredAs).length} (raw substring ${rawCount}, +${Object.keys(registeredAs).length - rawCount} after normalising)`
  writeFileSync(join(dest, 'MANIFEST.json'), JSON.stringify({
    source: src.f, capturedAt: new Date(src.m).toISOString(), paragraphs: paragraphs.length,
    images, sha256_prefix: sha,
    note: 'Extracted TEXT only. The 24-37 MB .docx binary is deliberately not committed; ~/Downloads is volatile and this is what survives it.',
    registered_as: registeredAs,
    registered_as_note: 'paragraph hash (sha256, 12 hex) -> D-id, where that D-id\'s register Verbatim quote is a substring of the paragraph after normalising both (whitespace, smart quotes, case). Frozen at write time; --strict recomputes live and unions. Not semantic — see this script\'s header comment.',
    disposition: {},
    disposition_note: 'paragraph hash -> one of not-an-ask | pasted-agent-output | date | screenshot-caption | duplicate-of:<hash>, entered by the triage lane for paragraphs that are NOT asks. Exactly one of registered_as / disposition per hash. See the script header.',
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
  if (writeMatchNote) console.log(`            ${writeMatchNote}`)
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

// PHASE 4 — STRICT / --update-baseline (PI ruling 2026-09-03, audit §7, A5; disposition +
// ratchet shape per the bsuite#2970 review). A run-start gate the PI invokes manually — see the
// header for why it cannot be a CI or SessionStart hook.
if (STRICT || UPDATE_BASELINE) {
  const latest = latestCaptureDir()
  if (!latest) {
    console.error('STRICT FAIL: no capture on disk to check — run --write at least once first.')
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(join(INTAKE, latest, 'MANIFEST.json'), 'utf8'))
  const latestParas = readFileSync(join(INTAKE, latest, 'paragraphs.txt'), 'utf8').split('\n---\n').filter(Boolean)
  // registered_as is DERIVED: the frozen map from write time, unioned with a live normalised
  // match against the register as it stands now, so a row registered after the capture counts.
  const registerRows = reg.path ? parseRegisterVerbatims(readFileSync(reg.path, 'utf8')) : []
  const live = matchRegisteredAs(latestParas, registerRows)
  const liveRaw = matchRegisteredAs(latestParas, registerRows, { normalise: false })
  const registeredAs = { ...(manifest.registered_as || {}), ...live }
  const disposition = manifest.disposition || {}
  const baseline = existsSync(UNTRIAGED_BASELINE) ? JSON.parse(readFileSync(UNTRIAGED_BASELINE, 'utf8')) : null
  const v = strictVerdict({ paragraphs: latestParas, registeredAs, disposition, baseline })

  console.log(`\n4 STRICT    capture ${latest}: ${v.paragraphs} paragraph(s); ${v.registered} registered_as ` +
    `(${Object.keys(liveRaw).length} by raw substring, +${Object.keys(live).length - Object.keys(liveRaw).length} after normalising, ` +
    `${Object.keys(manifest.registered_as || {}).length} frozen in the manifest), ${v.dispositioned} dispositioned, ${v.untriaged} untriaged` +
    (baseline ? ` (banked ${baseline.untriaged} of ${baseline.paragraphs})` : ' (no bank)'))

  if (UPDATE_BASELINE) {
    if (v.defects.length) {
      for (const d of v.defects) console.error(`  MANIFEST DEFECT: ${d}`)
      console.error('FAIL: refusing to bank over a defective manifest — fix the entries above first.')
      process.exit(1)
    }
    const banked = { untriaged: v.untriaged, paragraphs: v.paragraphs, banked: new Date().toISOString().slice(0, 10) }
    writeFileSync(UNTRIAGED_BASELINE, `${JSON.stringify(banked, null, 2)}\n`)
    console.log(`BANKED: untriaged=${banked.untriaged} paragraphs=${banked.paragraphs} -> ${UNTRIAGED_BASELINE_REL}`)
    process.exit(0)
  }
  if (v.violations.length) {
    console.error(`\nSTRICT FAIL (${v.violations.length}):`)
    for (const x of v.violations) console.error(`  - ${x}`)
    console.error('\nA paragraph is triaged when its hash carries EXACTLY ONE of registered_as (a register row quotes it) or')
    console.error('disposition (not-an-ask | pasted-agent-output | date | screenshot-caption | duplicate-of:<hash>) in the')
    console.error(`capture's MANIFEST.json. The untriaged count may only shrink; bank a genuine fall with \`${REMEDY}\`.`)
    process.exit(1)
  }
  console.log(`STRICT OK: untriaged holds at the bank (${v.untriaged}); every other paragraph is registered or dispositioned.`)
}
process.exit(0)
