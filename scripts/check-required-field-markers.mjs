#!/usr/bin/env node
/**
 * check-required-field-markers.mjs — a form must tell the user which fields are
 * compulsory BEFORE they press the button, not after.
 *
 * WHY THIS EXISTS
 *
 * Measured on production 2026-08-21, CRM7 /clients/create: 15 form controls,
 * ZERO required markers anywhere on the page, while the form's own validation
 * read `name: z.string().min(1, 'Business name is required')`. The only way to
 * discover the field was mandatory was to fill the form, submit, and be
 * rejected. A screen reader was never told at all — no `aria-required`.
 * A sweep found 39 such fields across 17 pages.
 *
 * NOTHING ERRORS when this happens. The form works; typecheck passes; the
 * schema is correct. The defect is entirely in what the page does not say.
 *
 * THE TEST IS CONSISTENCY, NOT THE PRESENCE OF ASTERISKS
 *
 * The estate uses BOTH valid conventions, and each is correct on its own terms:
 *
 *   POSITIVE  mark the required ones      "Business Name *"       (CRM7)
 *   INVERSE   mark the optional ones      "Industry (optional)"   (BSU)
 *
 * BSU's CreateOrganization has 95 labelled fields and not one asterisk, and is
 * RIGHT: name/slug/tenantType are required and bare, industry/abn are
 * `.optional()` and say so. A gate that simply counted asterisks would have
 * called that a defect and sent someone to "fix" a correct form.
 *
 * So this gate infers which convention a form uses from the markers already
 * present, then checks every schema-backed field against it. A form that
 * mixes required and optional fields while using NEITHER convention is the
 * real defect: the user cannot tell them apart by looking.
 *
 * UNKNOWN IS NOT PASS (ruling V-3)
 *
 * A file whose labels have no discoverable schema is reported as UNEXAMINED
 * with a count, never folded into the pass. A scan that examines nothing also
 * reports zero findings, and that has read as "clean" here before.
 */

import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const OPTIONAL_RE = /\(optional\)/i;
const MARKER_RE = /[*✱]|\brequired\b/i;

/**
 * Fields of a zod object literal, with whether the schema treats each as required.
 *
 * Must be depth-aware, not line-based. A field is routinely written across
 * several lines:
 *
 *   code: z
 *     .string()
 *     .min(2, 'A stable provider code is required')
 *
 * A regex that expects `z.` on the same line as the field name cannot see that,
 * and reports the field as absent rather than as unmarked -- a silent false
 * negative. That is how `qcr-code` passed a scan while having neither a
 * screen-reader signal nor a native required attribute.
 */
function zodFields(src) {
  const out = new Map();
  let from = 0;
  for (;;) {
    const start = src.indexOf('z.object(', from);
    if (start === -1) break;
    const open = src.indexOf('{', start);
    if (open === -1) break;
    // walk to the matching close brace, tracking nesting and strings
    let depth = 0, i = open, end = -1, str = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
      if (c === '"' || c === "'" || c === '`') { str = c; continue; }
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) break;
    const body = src.slice(open + 1, end);
    // split the body on commas at depth 0
    const parts = [];
    let d = 0, cur = '', q = null;
    for (let j = 0; j < body.length; j++) {
      const c = body[j];
      if (q) { cur += c; if (c === '\\') { cur += body[++j] ?? ''; } else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
      if (c === '{' || c === '(' || c === '[') d++;
      if (c === '}' || c === ')' || c === ']') d--;
      if (c === ',' && d === 0) { parts.push(cur); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) parts.push(cur);
    for (const part of parts) {
      const m = part.match(/^\s*(\w+)\s*:\s*([\s\S]+)$/);
      if (!m) continue;
      const [, name, expr] = m;
      if (!/\bz\s*\.\s*(string|email|number|uuid|coerce|enum|date|boolean|array|object|literal|union|any|instanceof)/.test(expr)) continue;
      const optional = /\.\s*(optional|default|nullish|nullable)\s*\(/.test(expr);
      if (!out.has(name)) out.set(name, { required: !optional });
    }
    from = end + 1;
  }
  return out;
}

/** Every <Label htmlFor="..."> in a file, with its text and marker state. */
function labels(src) {
  const out = [];
  const re = /<Label[^>]*htmlFor=["']([^"']+)["'][^>]*>([\s\S]{0,240}?)<\/Label>/g;
  let m;
  while ((m = re.exec(src))) {
    const text = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({
      id: m[1],
      text,
      line: src.slice(0, m.index).split('\n').length,
      marksRequired: MARKER_RE.test(m[2]),
      marksOptional: OPTIONAL_RE.test(m[2]),
    });
  }
  return out;
}

/** Match a label id to a schema field: exact, or a kebab/snake prefix strip. */
function fieldFor(id, fields) {
  if (fields.has(id)) return id;
  const bare = id.replace(/^[a-z]+[-_]/, '');
  if (fields.has(bare)) return bare;
  const camel = bare.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
  if (fields.has(camel)) return camel;
  const snake = bare.replace(/[-]/g, '_');
  if (fields.has(snake)) return snake;
  return null;
}

function scanFile(file) {
  const src = readFileSync(file, 'utf8');
  const fields = zodFields(src);
  const labs = labels(src);
  if (!labs.length) return null;
  if (!fields.size) return { file, unexamined: labs.length };

  const bound = labs.map((l) => ({ ...l, field: fieldFor(l.id, fields) })).filter((l) => l.field);
  if (!bound.length) return { file, unexamined: labs.length };

  const req = bound.filter((l) => fields.get(l.field).required);
  const opt = bound.filter((l) => !fields.get(l.field).required);

  // Which convention does this form use? Infer from the markers actually present.
  const usesPositive = bound.some((l) => l.marksRequired);
  const usesInverse = bound.some((l) => l.marksOptional);

  const findings = [];
  if (usesPositive) {
    for (const l of req) if (!l.marksRequired) findings.push({ ...l, why: 'required, form marks required elsewhere, this one is bare' });
  } else if (usesInverse) {
    for (const l of opt) if (!l.marksOptional) findings.push({ ...l, why: 'optional, form marks optional elsewhere, this one is bare' });
  } else if (req.length && opt.length) {
    // Neither convention, and the form genuinely mixes the two kinds.
    for (const l of req) findings.push({ ...l, why: 'required, but the form marks nothing — indistinguishable from the optional fields beside it' });
  }

  // A sighted marker is not a screen-reader signal. Either `aria-required` OR the
  // native `required` attribute satisfies this — the native one maps straight to
  // required in the accessibility tree, so demanding the ARIA spelling as well
  // would send someone to "fix" a control that is already correct.
  const ariaMissing = req.filter((l) => {
    // Scan from the id to the START OF THE NEXT ELEMENT, not to the next '>'.
    // An onChange handler contains an arrow '=>', so a '>' terminator truncates
    // the window mid-tag and reports an attribute that is plainly there as
    // missing. Opening tags contain no '<', so '<' is the safe boundary.
    const idx = src.search(new RegExp(`id=["']${l.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`));
    if (idx === -1) return true;
    const nextEl = src.indexOf('<', idx);
    const win = src.slice(idx, nextEl === -1 ? idx + 500 : Math.min(nextEl, idx + 500));
    return !/\baria-required\b/.test(win) && !/(^|\s)required(\s|\n|$)/.test(win);
  });

  return { file, findings, ariaMissing, examined: bound.length, unexamined: labs.length - bound.length };
}

const SELF_TESTS = [
  {
    name: 'positive convention, one field left bare -> FINDING',
    src: `const s = z.object({\n  name: z.string().min(1, 'req'),\n  email: z.string().min(1),\n})\n<Label htmlFor="name">Name <span>*</span></Label>\n<Input id="name" aria-required="true" />\n<Label htmlFor="email">Email</Label>\n<Input id="email" />`,
    expect: (r) => r.findings.length === 1 && r.findings[0].field === 'email',
  },
  {
    name: 'inverse convention applied correctly -> CLEAN (BSU CreateOrganization shape)',
    src: `const s = z.object({\n  name: z.string().min(2),\n  industry: z.string().optional(),\n})\n<Label htmlFor="org-name">Organization name</Label>\n<Input id="org-name" aria-required="true" />\n<Label htmlFor="org-industry">Industry (optional)</Label>`,
    expect: (r) => r.findings.length === 0,
  },
  {
    name: 'inverse convention, an optional field left bare -> FINDING',
    src: `const s = z.object({\n  name: z.string().min(2),\n  industry: z.string().optional(),\n  abn: z.string().optional(),\n})\n<Label htmlFor="name">Name</Label>\n<Input id="name" aria-required="true" />\n<Label htmlFor="industry">Industry (optional)</Label>\n<Label htmlFor="abn">ABN</Label>`,
    expect: (r) => r.findings.length === 1 && r.findings[0].field === 'abn',
  },
  {
    name: 'no convention at all, mixed required and optional -> FINDING',
    src: `const s = z.object({\n  name: z.string().min(1),\n  notes: z.string().optional(),\n})\n<Label htmlFor="name">Name</Label>\n<Input id="name" aria-required="true" />\n<Label htmlFor="notes">Notes</Label>`,
    expect: (r) => r.findings.length === 1 && r.findings[0].field === 'name',
  },
  {
    name: 'every field required, no markers -> CLEAN (a login form marks nothing, correctly)',
    src: `const s = z.object({\n  email: z.string().min(1),\n  password: z.string().min(1),\n})\n<Label htmlFor="email">Email</Label>\n<Input id="email" aria-required="true" />\n<Label htmlFor="password">Password</Label>\n<Input id="password" aria-required="true" />`,
    expect: (r) => r.findings.length === 0,
  },
  {
    name: 'visible marker present but aria-required absent -> ARIA FINDING',
    src: `const s = z.object({\n  name: z.string().min(1),\n  other: z.string().optional(),\n})\n<Label htmlFor="name">Name <span>*</span></Label>\n<Input id="name" />\n<Label htmlFor="other">Other (optional)</Label>`,
    expect: (r) => r.findings.length === 0 && r.ariaMissing.length === 1,
  },
  {
    name: 'native `required` instead of aria-required -> CLEAN (it maps to required in the a11y tree)',
    src: `const s = z.object({\n  name: z.string().min(1),\n  other: z.string().optional(),\n})\n<Label htmlFor="name">Name <span aria-hidden="true">*</span></Label>\n<Input\n  id="name"\n  value={v}\n  required\n/>\n<Label htmlFor="other">Other (optional)</Label>`,
    expect: (r) => r.findings.length === 0 && r.ariaMissing.length === 0,
  },
  {
    name: 'neither aria-required nor native required -> ARIA FINDING (the real QuickCreate shape)',
    src: `const s = z.object({\n  name: z.string().min(1),\n  other: z.string().optional(),\n})\n<Label htmlFor="qcr-name">Display name *</Label>\n<Input\n  id="qcr-name"\n  value={v}\n  placeholder="e.g. thing"\n/>\n<Label htmlFor="other">Other (optional)</Label>`,
    expect: (r) => r.ariaMissing.length === 1,
  },
  {
    name: 'MULTI-LINE zod field -> still seen (the qcr-code false negative)',
    src: `const s = z.object({\n  name: z.string().min(2),\n  code: z\n    .string()\n    .trim()\n    .min(2, 'A stable provider code is required'),\n  legal_name: z.string().trim().optional(),\n})\n<Label htmlFor="qcr-name">Display name *</Label>\n<Input id="qcr-name" aria-required="true" />\n<Label htmlFor="qcr-code">Provider code *</Label>\n<Input\n  id="qcr-code"\n  onChange={(e) => setField('code', e.target.value)}\n/>\n<Label htmlFor="qcr-legal-name">Legal name</Label>`,
    expect: (r) => r.ariaMissing.length === 1 && r.ariaMissing[0].field === 'code',
  },
  {
    name: 'multi-line .optional() field -> treated as optional, not required',
    src: `const s = z.object({\n  name: z.string().min(2),\n  abn: z\n    .string()\n    .trim()\n    .regex(/^[0-9 ]+$/, 'digits')\n    .optional()\n    .or(z.literal('')),\n})\n<Label htmlFor="name">Name</Label>\n<Input id="name" required />\n<Label htmlFor="abn">ABN (optional)</Label>`,
    expect: (r) => r.findings.length === 0 && r.ariaMissing.length === 0,
  },
  {
    name: 'label with no schema behind it -> UNEXAMINED, never a silent pass',
    src: `<Label htmlFor="mystery">Mystery</Label>`,
    expect: (r) => r.unexamined === 1 && !r.findings,
  },
];

function selfTest() {
  let failed = 0;
  const dir = mkdtempSync(join(tmpdir(), 'rfm-'));
  for (const t of SELF_TESTS) {
    const f = join(dir, 'case.tsx');
    writeFileSync(f, t.src);
    const r = scanFile(f) || {};
    const ok = t.expect(r);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got: ${JSON.stringify(r).slice(0, 300)}`); }
  }
  console.log(`\n  ${SELF_TESTS.length - failed}/${SELF_TESTS.length} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

// ---- main ----
const args = process.argv.slice(2);
if (args.includes('--self-test')) selfTest();

const roots = args.filter((a) => !a.startsWith('--'));
if (!roots.length) {
  console.error('usage: check-required-field-markers.mjs <dir...> [--self-test]');
  process.exit(2);
}

let totalFindings = 0, totalAria = 0, totalExamined = 0, totalUnexamined = 0, filesScanned = 0;
for (const root of roots) {
  if (!existsSync(root)) { console.log(`  ${root}: MISSING — not scanned`); continue; }
  const files = execSync(`grep -rl "<Label" ${root} --include=*.tsx 2>/dev/null || true`, { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  for (const f of files) {
    const r = scanFile(f);
    if (!r) continue;
    filesScanned++;
    totalUnexamined += r.unexamined || 0;
    if (r.findings?.length) {
      totalFindings += r.findings.length;
      for (const x of r.findings) console.log(`  ${f}:${x.line}  ${x.field} — ${x.why}`);
    }
    if (r.ariaMissing?.length) {
      totalAria += r.ariaMissing.length;
      for (const x of r.ariaMissing) console.log(`  ${f}:${x.line}  ${x.field} — required, but no aria-required: a screen reader is not told`);
    }
    totalExamined += r.examined || 0;
  }
}

console.log(`\n  scanned ${filesScanned} file(s) with labels; ${totalExamined} field(s) matched to a schema, ${totalUnexamined} label(s) UNEXAMINED (no schema found — not a pass, just unmeasured)`);
console.log(`  ${totalFindings} marker inconsistenc(ies), ${totalAria} missing aria-required`);

// Positive control. A scan that examines nothing also reports zero findings, and
// that has read as "clean" in this estate before — an unpopulated submodule
// checkout is an empty directory, and an empty directory produces a confident
// pass. Fail loudly when the field count collapses rather than reporting success.
const floorArg = args.find((a) => a.startsWith('--require-fields='));
if (floorArg) {
  const floor = Number(floorArg.split('=')[1]);
  if (!Number.isFinite(floor)) {
    console.error(`  --require-fields needs a number, got "${floorArg.split('=')[1]}"`);
    process.exit(2);
  }
  if (totalExamined < floor) {
    console.error(
      `\n  POSITIVE CONTROL FAILED: matched ${totalExamined} field(s) to a schema, expected at least ${floor}.`,
    );
    console.error('  The tree under scan is smaller than it should be — most likely a submodule');
    console.error('  checkout that did not populate. A clean result here would be meaningless,');
    console.error('  not clean. Fix the checkout before reading the findings above.');
    process.exit(3);
  }
  console.log(`  positive control: ${totalExamined} >= ${floor} field(s) — the tree is really being scanned`);
}

process.exit(totalFindings + totalAria > 0 ? 1 : 0);
