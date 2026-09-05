/**
 * ratchet.mjs — the ONE definition of "checked nothing" vs "found nothing".
 *
 * WHY THIS FILE EXISTS. Every doc gate here used to bank a bare number —
 * `echo 9 > docs/.some-baseline` — and a bare number cannot tell a scan that
 * found nothing from a scan that measured nothing. An empty submodule tree
 * reports 0 findings just as convincingly as a genuinely clean one. Every
 * baseline this module reads or writes therefore carries a DENOMINATOR:
 * `{ findings, scanned, banked }` at minimum. A scan whose `scanned` falls
 * below the bank fails as "scanned less than banked" before `findings` is
 * even compared — that is the whole point.
 *
 * TWO RATCHET SHAPES, because one honest gate needs both:
 *
 *   'equality'  fails on a RISE (regression) and on an unbanked FALL (a
 *               silent improvement nobody re-banked — bsuite D-87: slack
 *               between the committed number and the measured one lets a
 *               backlog grow back unnoticed).
 *   'ceiling'   fails only on a RISE; a fall prints a re-bank note but does
 *               not fail the build. For counts DERIVED FROM SUBMODULE
 *               CONTENT, where a routine gitlink bump in an unrelated PR must
 *               not demand the promotion author re-bank a number they had no
 *               reason to look at.
 *
 * THE PRINTED REMEDY IS ALWAYS `node <script> --update-baseline`, never
 * `echo N > file` — hand-editing a baseline is how a ratchet stops ratcheting
 * (nobody re-derives `scanned` by hand, so it silently drifts stale).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Read a JSON baseline file. Returns `null` if it does not exist yet (an
 * un-armed ratchet, not a failure — the caller decides what that means).
 * Returns `{ error }` if the file exists but is not a usable baseline, so a
 * malformed file fails loudly instead of comparing `NaN > NaN` and passing.
 */
export function readBaseline(file) {
  if (!existsSync(file)) return null;
  let json;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { error: `${file} is not valid JSON` };
  }
  if (!Number.isFinite(json.findings) || !Number.isFinite(json.scanned)) {
    return { error: `${file} is missing a numeric findings/scanned pair` };
  }
  return json;
}

/** Write a baseline file. `data` must include `findings` and `scanned`. */
export function writeBaseline(file, data) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Compare a live measurement against a committed baseline.
 *
 * @param {object} opts
 * @param {string} opts.file        baseline path, e.g. 'docs/.supersession-baseline.json'
 * @param {number} opts.findings    current findings count
 * @param {number} opts.scanned     current scanned/denominator count
 * @param {'equality'|'ceiling'} opts.mode
 * @param {string} opts.label       name used in messages, e.g. 'supersession'
 * @param {string} opts.scriptPath  e.g. 'scripts/audit-doc-supersession.mjs' —
 *                                  used only in the printed remedy
 * @returns {{ok: boolean, message: string}}
 */
export function compareRatchet({ file, findings, scanned, mode, label, scriptPath }) {
  if (mode !== 'equality' && mode !== 'ceiling') {
    return { ok: false, message: `  ${label}: unknown ratchet mode '${mode}' (must be 'equality' or 'ceiling')` };
  }
  const base = readBaseline(file);
  if (base && base.error) {
    return { ok: false, message: `  ${base.error}` };
  }
  if (!base) {
    return {
      ok: false,
      message:
        `  no ${label} baseline yet — run \`node ${scriptPath} --update-baseline\` to bank\n` +
        `  ${findings} findings / ${scanned} scanned into ${file}.`,
    };
  }
  if (scanned < base.scanned) {
    return {
      ok: false,
      message:
        `  ${label} RATCHET BROKEN: scanned ${scanned} < banked ${base.scanned} — scanned less than banked.\n` +
        '  A shrunken scan is not an improvement; something stopped being counted (an empty\n' +
        '  submodule, a moved directory). Fix the scan\'s coverage, then re-bank with\n' +
        `  \`node ${scriptPath} --update-baseline\` only if the smaller scope is deliberate.`,
    };
  }
  if (findings > base.findings) {
    return {
      ok: false,
      message:
        `  ${label} RATCHET BROKEN: baseline ${base.findings}, now ${findings} (scanned ${scanned}).\n` +
        `  Fix the new finding(s), then re-bank with \`node ${scriptPath} --update-baseline\` —\n` +
        `  never by hand-editing ${file}.`,
    };
  }
  if (findings < base.findings) {
    if (mode === 'ceiling') {
      return {
        ok: true,
        message:
          `  ${label} fell ${base.findings} -> ${findings} (scanned ${scanned}). Ceiling holds.\n` +
          `  Optional: tighten it with \`node ${scriptPath} --update-baseline\`.`,
      };
    }
    return {
      ok: false,
      message:
        `  ${label} fell ${base.findings} -> ${findings} (scanned ${scanned}). Bank it:\n` +
        `      node ${scriptPath} --update-baseline\n` +
        '  Equality, not a ceiling — slack between the committed number and the measured one\n' +
        '  lets the count drift back unnoticed (bsuite D-87).',
    };
  }
  return { ok: true, message: `  ${label} ratchet ok: baseline ${base.findings}, scanned ${scanned}.` };
}

// ── self-test ────────────────────────────────────────────────────────────
// Proves the four ratchet outcomes this module exists to produce, over a real
// temp file — not a mock — so a bug in readBaseline/writeBaseline round-trip
// cannot hide behind a stub.
//
// GUARDED BY ENTRY-POINT IDENTITY, not just `--self-test` in argv. Every
// script that imports this module ALSO supports `--self-test` on its own
// argv, and `process.argv` is shared across the whole process — an argv-only
// guard here would hijack every importer's self-test into this one instead
// of the importer's, and the importer's own fixture-based proof would never
// run. Only run when THIS file is the one Node was invoked on.
const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntryPoint && process.argv.includes('--self-test')) {
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = await import('node:fs');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ratchet-selftest-'));
  const file = path.join(dir, 'baseline.json');
  const common = { file, scriptPath: 'scripts/fixture.mjs', label: 'fixture' };

  const checks = [];
  const check = (name, ok) => checks.push([name, ok]);

  // 1. No baseline yet -> fails, names the exact --update-baseline remedy.
  let r = compareRatchet({ ...common, findings: 3, scanned: 10, mode: 'equality' });
  check('unarmed ratchet fails', !r.ok);
  check('unarmed message names --update-baseline', r.message.includes('--update-baseline'));

  // 2. writeBaseline + readBaseline round-trip.
  writeBaseline(file, { findings: 3, scanned: 10, banked: '2026-09-03' });
  const read = readBaseline(file);
  check('round-trip findings', read.findings === 3);
  check('round-trip scanned', read.scanned === 10);

  // 3. Equality mode: exact match passes.
  r = compareRatchet({ ...common, findings: 3, scanned: 10, mode: 'equality' });
  check('equality: exact match passes', r.ok);

  // 4. Equality mode: a RISE fails.
  r = compareRatchet({ ...common, findings: 4, scanned: 10, mode: 'equality' });
  check('equality: rise fails', !r.ok);

  // 5. Equality mode: an unbanked FALL fails too (D-87).
  r = compareRatchet({ ...common, findings: 2, scanned: 10, mode: 'equality' });
  check('equality: unbanked fall fails', !r.ok);

  // 6. Ceiling mode: a RISE fails.
  r = compareRatchet({ ...common, findings: 4, scanned: 10, mode: 'ceiling' });
  check('ceiling: rise fails', !r.ok);

  // 7. Ceiling mode: a FALL passes (prints a re-bank note, does not fail).
  r = compareRatchet({ ...common, findings: 2, scanned: 10, mode: 'ceiling' });
  check('ceiling: fall passes', r.ok);
  check('ceiling: fall message offers re-bank', r.message.includes('--update-baseline'));

  // 8. Both modes: scanned below the bank fails as "scanned less than banked" —
  //    checked BEFORE findings, so a coverage loss cannot hide behind a findings
  //    drop (an empty submodule reports 0 findings too).
  r = compareRatchet({ ...common, findings: 3, scanned: 5, mode: 'equality' });
  check('equality: scanned < banked fails', !r.ok);
  check('equality: scanned < banked message says so', r.message.includes('scanned less than banked'));
  r = compareRatchet({ ...common, findings: 0, scanned: 5, mode: 'ceiling' });
  check('ceiling: scanned < banked fails even with fewer findings', !r.ok);

  // 9. A malformed baseline file fails loudly rather than comparing NaN.
  fs.writeFileSync(file, '{"findings": "nope"}');
  r = compareRatchet({ ...common, findings: 1, scanned: 1, mode: 'equality' });
  check('malformed baseline fails, does not silently pass', !r.ok);
  fs.writeFileSync(file, 'not json at all');
  r = compareRatchet({ ...common, findings: 1, scanned: 1, mode: 'equality' });
  check('invalid JSON baseline fails, does not silently pass', !r.ok);

  fs.rmSync(dir, { recursive: true, force: true });

  let bad = 0;
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
    if (!ok) bad++;
  }
  console.log(`\n  ${checks.length - bad}/${checks.length} self-tests pass`);
  process.exit(bad ? 1 : 0);
}
