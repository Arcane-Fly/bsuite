#!/usr/bin/env node
/**
 * audit-doc-completion.mjs — which docs have EARNED a completion marker.
 *
 * THE BAR, set by the operator 2026-08-21: a doc may carry a completion word in
 * its FILENAME only if BOTH (a) it is superseded, or it documented something
 * that was not best practice and best practice has since been implemented; AND
 * (b) the thing it describes is 100% proven production code — theme, UX,
 * one-shot/DRY, cross-cutting, routes, lints, types, barrels, indexes, security.
 *
 * WHY THIS IS BUILT TO UNDER-CLAIM
 *
 * The asymmetry decides everything. A MISSED completion costs a re-review. A
 * FALSE completion costs the truth of the whole corpus, permanently, in a
 * filename every future reader trusts at a glance.
 *
 * CITATION BINDING, NOT KEYWORD BINDING — the correction that matters
 *
 * The first version of this tool matched keywords, so a doc mentioning "policy"
 * or "route" counted as bound. It reported 437 of 463 docs bindable. That is
 * not a finding; it is the word "route" being common. Bindable-by-keyword is
 * not provable, and shipping it as eligibility would have produced exactly the
 * false completion the tool exists to prevent.
 *
 * A doc now binds ONLY if it NAMES the artifact that proves it — a gate script
 * or a workflow file. Naming a thing is a checkable claim; mentioning a topic
 * is not.
 *
 * AND A CITATION ONLY COUNTS IF THE ARTIFACT STILL EXISTS. A doc naming a gate
 * that has since been deleted is citing a ghost, which is worse than citing
 * nothing — it reads as evidence. Those are reported separately.
 *
 * This tool RENAMES NOTHING. A filename is a claim to every future reader; it
 * refuses to make that claim on its own authority.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isPointerFile } from './lib/doc-conventions.mjs';

// A completion word inside a HYPHENATED PHRASE is not a completion marker.
// `20260805-portal-persona-jobs-to-be-done-v1.00W.md` was counted as "already marked
// complete" because "done" sits between two hyphens — but "jobs-to-be-done" is a
// compound noun, not a status. It inflated the very count used to judge whether the
// estate marks docs honestly.
//
// Same shape as a colour literal in prose tripping a colour gate: the token matches,
// the meaning does not.
const COMPLETION_WORDS = /(^|[-_.])(complete|completed|done|final|superseded|closed|obsolete|retired|archived)([-_.]|$)/i;
/** Words that, immediately before a completion word, make it part of a phrase. */
const PHRASE_PREFIX = /(to-be|to_be|not|never|well|half|nearly|almost)-?$/i;

/**
 * THE STATUS CODE IS THE MARKER, AND IT OUTRANKS A WORD IN THE TITLE.
 *
 * `docs/…/20260227-feature-map-complete-v1.00W.md` is "Complete AI Feature Map" —
 * `complete` describes the MAP's coverage, not the work's state. The body says so
 * outright and carries a 2026-08-17 marker correction explaining that `Final` was
 * wrong and `Working` is truthful.
 *
 * The estate's vocabulary is W/D/R/A/F, and the completion marker is **F**
 * (Frozen). A filename that ends in `-vN.NNW` has already declared itself Working;
 * reading a title word as a competing status claim invents a contradiction the
 * document does not contain, and inflates the very count used to judge whether the
 * estate marks docs honestly.
 *
 * So an explicit non-F status code wins. Only `F` — or no status code at all —
 * leaves a title word able to read as a completion claim.
 */
const STATUS_CODE = /-v\d+\.\d+([WDRAF])(?:\.[a-z]+)?$/i;

export function isCompletionMarked(filename) {
  const stem = filename.replace(/\.md$/i, '');
  const status = stem.match(STATUS_CODE);
  // `F` IS THE MARKER. The contributing standards guide defines the vocabulary as
  // W/D/R/A/F with F = "Frozen — finalized, immutable", so a filename ending
  // `-vN.NNF` is a completion claim whether or not it also contains a word from
  // the list below.
  //
  // Without this the tool could not see the estate's own marker. The first
  // document to earn it — the dashboard retirement, frozen 2026-08-24 — reported
  // as UNMARKED, because "retirement" is not "retired" and nothing else matched.
  // A detector that cannot see the convention it exists to police is not policing
  // it.
  if (status && status[1].toUpperCase() === 'F') return true;
  if (status) return false;
  const m = filename.match(COMPLETION_WORDS);
  if (!m) return false;
  const before = filename.slice(0, m.index + (m[1] ? m[1].length : 0));
  return !PHRASE_PREFIX.test(before);
}

// A LINE THAT SAYS A GATE IS GONE IS NOT CITING IT AS EVIDENCE.
//
// The same shape as the prohibition guard in check-no-cookie-sso.mjs, and it bit
// here for the same reason. `crm7/docs/audits/20260811-ci-guards-deferred-items-v1.00D.md`
// exists TO RECORD that `quality.yml` was deleted; the sentence is
// "`.github/workflows/quality.yml` is deleted". The auditor read the filename,
// could not find the file, and reported the doc as citing a ghost — i.e. it
// reported an accurate historical record as a defect.
//
// Seven of the thirteen dead citations were this. Left in, they train a reader to
// skim the list, which is how the three REAL ones (a runbook pointing at a retired
// cron, an ADR naming a mitigation that was never built, a plan claiming a script
// was "delivered") would have stayed unfixed.
//
// Deliberately NARROW. It suppresses only when the same line declares the artifact
// absent, proposed, or historical. A doc that merely SOUNDS negative elsewhere still
// reports — see the control self-test.
const ABSENT_ON_LINE = new RegExp(
  '(~~|\\b(?:' +
  'delet(?:e|ed|ion|ing)|remov(?:e|ed|al)|retir(?:e|ed|ement)|drop(?:ped)?|' +
  'never[ -](?:written|existed|created|shipped|built)|no longer|' +
  'does not exist|did not exist|non-existent|nonexistent|absent|missing|' +
  'candidate|proposed|to be written|not yet written|would be|planned|' +
  'disposition|superseded|replaced by|renamed' +
  ')\\b)', 'i');

/**
 * Artifacts a doc explicitly names. Naming is checkable; mentioning is not.
 *
 * Line-aware, because the SENTENCE decides whether a name is a citation or a
 * historical mention, and whole-text matching throws that away.
 */
export function citedArtifacts(text) {
  const out = { gates: [], workflows: [], migrations: [], prs: [], historical: [], candidates: [] };
  // `\b` IS NOT A LEFT EDGE HERE — a hyphen is a non-word character, so `\baudit-all.sh`
  // matches the TAIL of `pnpm-audit-all.sh` and invents a citation to a script nobody
  // ever named. Third time this exact shape has bitten in a week (the last was a path
  // regex matching the tail of a corrected path). Require a real left edge.
  const GATE_RE = /(?<![A-Za-z0-9_-])((?:check|audit|codemod|verify|lint)-[a-z0-9-]+\.(?:mjs|sh|py))\b/g;
  const WF_RE = /(?<![A-Za-z0-9_-])([a-z0-9][a-z0-9-]*\.ya?ml)\b/g;
  // A GATE THAT DOES NOT FOLLOW THE NAMING CONVENTION IS STILL A GATE.
  //
  // GATE_RE only sees check-/audit-/codemod-/verify-/lint- prefixes, which is the
  // parent's convention and not a rule any submodule agreed to. R80.4's award
  // Definition-of-Done runner is `scripts/dod.mjs`. QUEUE-COMPLETE.md cites it by
  // name, runs it over 21 awards against an EMPTY baseline, and is one of the few
  // completion records in the estate with real evidence behind it — and this tool
  // reported it as "the claim rests on nothing", because the name did not match a
  // prefix list. A detector only sees the mechanisms its author knew.
  //
  // These are CANDIDATES, not citations: a candidate counts as evidence only if the
  // evidence layer actually contains that file. A missing candidate is IGNORED, never
  // reported as a ghost — otherwise every `.mjs` mentioned in prose becomes a dead
  // citation, and the ghost count (currently a true zero) stops meaning anything.
  const CANDIDATE_RE = /(?<![A-Za-z0-9_-])([a-z0-9][a-z0-9-]*\.(?:mjs|sh|py))\b/g;
  // Workflow citations only. A bare `.ya?ml` pattern also matches
  // pnpm-lock.yaml and pnpm-workspace.yaml, which are real files that simply do
  // not live in .github/workflows -- so they reported as DEAD gates, i.e. as
  // ghosts, i.e. as a finding. They are neither. Exclude the known non-workflow
  // YAML by name rather than by guessing at shape.
  const NOT_A_WORKFLOW = /^(pnpm-lock|pnpm-workspace|package-lock|docker-compose|vercel|supabase|tsconfig|\.?eslintrc|renovate)\b/i;
  //
  // A QUOTED CITATION BELONGS TO THE DOCUMENT IT NAMES, NOT TO THIS ONE.
  //
  // A doc that AUDITS other docs tabulates their citations. Read naively, every
  // gate in that table becomes a citation by the auditing doc — so the audit
  // inherits its subjects' dead citations and is reported as resting on a ghost.
  //
  // Measured 2026-08-26: docs/20260826-doc-completion-verdict-v1.00A.md was the
  // estate's ONLY dead citation, for `quality.yml`, which it names in a table row
  // recording that ANOTHER document cites it. The verdict cites nothing of its own
  // there. The ghost count is meant to be a true zero, and one false entry makes it
  // stop meaning anything.
  //
  // The tell is structural, not linguistic: a markdown table row whose FIRST cell
  // names a `.md` file is attributing the rest of the row to that file. That is
  // narrow on purpose — it does not reach prose, headings, lists, or a table whose
  // first cell is anything else, so a doc cannot launder its own citation by
  // putting it in a table.
  const QUOTES_ANOTHER_DOC = /^\s*\|[^|]*\.md[^|]*\|/;
  for (const line of text.split('\n')) {
    if (QUOTES_ANOTHER_DOC.test(line)) continue;
    // THE PROSE DECIDES, NOT THE NAME. Testing the raw line let an artifact called
    // `check-deleted-thing.mjs` supply its own absence marker — the guard read the
    // filename as the sentence's verdict and suppressed a real dead citation. The
    // existing self-test caught it on the first run, which is the only reason this
    // is a comment and not a defect. Blank the names out first.
    const prose = line.replace(GATE_RE, ' ').replace(WF_RE, ' ');
    const historical = ABSENT_ON_LINE.test(prose);
    for (const m of line.matchAll(GATE_RE)) (historical ? out.historical : out.gates).push(m[1]);
    for (const m of line.matchAll(WF_RE)) {
      if (NOT_A_WORKFLOW.test(m[1])) continue;
      (historical ? out.historical : out.workflows).push(m[1]);
    }
    if (!historical) {
      for (const m of line.matchAll(CANDIDATE_RE)) {
        if (!GATE_RE.test(m[1])) out.candidates.push(m[1]);
        GATE_RE.lastIndex = 0;
      }
    }
  }
  for (const m of text.matchAll(/\b(\d{14})\b/g)) out.migrations.push(m[1]);
  for (const m of text.matchAll(/\b((?:bsuite|crm7|conduit|braden|throughput)#\d+)/g)) out.prs.push(m[1]);
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
  return out;
}

// A DOC'S LOCATION CAN MAKE IT A RECORD RATHER THAN A CLAIM.
//
// `docs/archive/**` and `docs/plans/inputs/**` exist to preserve what was said at the
// time. The archived plan-completion-dashboard README describes the cron that shipped
// it — the dashboard was retired 2026-08-10, so of course the workflow is gone. Asking
// an archive to cite live gates asks it to stop being an archive.
//
// This is NOT a general exemption: an archived doc also stops counting as BINDABLE, so
// nothing can earn a completion marker by being filed away.
const HISTORICAL_BY_PATH = /(^|\/)(archive|archived|inputs|superseded)(\/|$)/i;

// A DOCUMENT THAT DECLARES ITSELF A RECORD IS ONE — the frontmatter outranks the
// directory name.
//
// `docs/recovered/**` holds 18 documents carrying `kind: record` / `authority:
// none` and an adjudicated `verdict:`. The classification standard's own rule is
// that `kind: record` MUST have `authority: none` because "a dated record is
// history, not a live document". They are the same category as docs/archive/**,
// and only the directory name differs.
//
// Without this they read as eighteen unevidenced completion claims, because each
// is frozen at `-v1.00F` — which is CORRECT usage for an immutable record and
// wrong to score as a claim about live production code. Path lists cannot keep up
// with directory names; the declared classification can.
// ...AND A DECISION RECORD IS THE SAME CATEGORY, BY THE SAME REASONING.
//
// Three of the flagged documents declare `kind: decision` — two with
// `authority: operator`, one `authority: engineering`. They record WHAT WAS DECIDED,
// on a date, by someone with the authority to decide it. Asking such a document to
// cite a runnable gate is a category error: the operator's ruling IS the evidence, and
// no CI job can re-earn it. docs/00-roadmap/20260810-dashboard-scope-ruling is the
// clearest case — it quotes Braden's ruling verbatim and is frozen because a record of
// what was said must not drift.
//
// This also follows the operator ruling of 2026-08-26 that F MEANS FROZEN — it governs
// the document's MUTABILITY and is "not a claim that the work it describes is the
// current truth". Scoring an immutable decision record as an unevidenced completion
// claim applies the reading that ruling superseded.
//
// `authority` is deliberately NOT constrained here. `record` requires `authority: none`
// because the classification standard says so; a decision by definition has an author
// with authority, so requiring `none` would exempt exactly the decisions nobody made.
function declaresItselfARecord(text) {
  const fm = text.slice(0, 600);
  if (/^kind:\s*decision\s*$/m.test(fm)) return true;
  return /^kind:\s*record\s*$/m.test(fm) && /^authority:\s*none\s*$/m.test(fm);
}

// A DOC CAN DECLARE ITSELF A SNAPSHOT, AND THEN IT IS ONE.
//
// The two crm7 CI-guard audits enumerate every workflow that existed on 2026-08-11 —
// `quality.yml` among them — in tables. It was deleted the next day. Every row naming it
// reported as a dead citation, but an audit dated 2026-08-11 that listed the state on
// 2026-08-11 is not wrong; it is doing its job. Editing the tables to remove a workflow
// that WAS there would falsify the record to satisfy a checker.
//
// Line-level suppression cannot reach this: the absence marker belongs to the whole
// document, not to any row. So a banner near the top declaring the doc dated, superseded,
// or a snapshot makes the document historical.
//
// Scoped to the opening lines on purpose. A supersession note buried in section 9
// describes one item, not the document.
const BANNER_LINES = 30;
// FIRST CUT WAS FAR TOO WIDE. It accepted `Status: Draft`, which in this estate's
// naming convention (`-1.00D`) marks a LIVE working document, and `predates`, which
// appears in ordinary prose. 136 of 471 docs were reclassified as records and the
// bindable count fell 47 -> 28 — the guard was quietly deleting the corpus it exists to
// measure. Suppressing a real finding and suppressing a false one look identical from
// the summary line, which is why the bindable count is the number to watch.
//
// Narrowed to declarations that can only mean "this document describes a past state".
const HISTORICAL_BANNER =
  /(\bstatus:\s*(superseded|historical|archived)\b|\bsuperseded (by|on)\b|\bpoint-in-time\b|\bhistorical record\b|\bsnapshot of the (state|estate)\b)/i;

export function hasHistoricalBanner(text) {
  return HISTORICAL_BANNER.test(text.split('\n').slice(0, BANNER_LINES).join('\n'));
}

export function classify(text, filename, artifactsPresent, relPath = filename) {
  const cited = citedArtifacts(text);
  const liveGates = [
    ...cited.gates.filter((g) => artifactsPresent.has(g)),
    // Conventionless names count ONLY when the evidence layer really has them.
    ...cited.candidates.filter((c) => artifactsPresent.has(c)),
  ];
  const liveWorkflows = cited.workflows.filter((w) => artifactsPresent.has(w));
  const dead = [
    ...cited.gates.filter((g) => !artifactsPresent.has(g)),
    ...cited.workflows.filter((w) => !artifactsPresent.has(w)),
  ];
  const archival =
    HISTORICAL_BY_PATH.test(relPath) || hasHistoricalBanner(text) || declaresItselfARecord(text);
  return {
    archival,
    alreadyMarked: isCompletionMarked(filename),
    cited,
    liveGates,
    liveWorkflows,
    deadCitations: archival ? [] : dead,
    bindable: !archival && (liveGates.length > 0 || liveWorkflows.length > 0),
  };
}

const SELF_TESTS = [
  // A DECISION RECORD IS HISTORY, NOT AN UNEVIDENCED CLAIM. Both directions.
  { name: 'a doc declaring `kind: decision` is historical, marker or not',
    t: '---\nkind: decision\nauthority: operator\n---\n# A ruling\n',
    f: '20260810-some-ruling-v1.00F.md', g: [],
    expect: (r) => r.archival === true },
  { name: 'CONTROL — the same doc WITHOUT the kind line is not historical',
    t: '---\nauthority: operator\n---\n# A ruling\n',
    f: '20260810-some-ruling-v1.00F.md', g: [],
    expect: (r) => r.archival !== true },
  { name: 'a filename already claiming completion is detected',
    f: 'x-COMPLETE.md', t: '', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'the word "final" mid-word does not count (finalise)',
    f: 'finalise-plan.md', t: '', g: [],
    expect: (r) => r.alreadyMarked === false },
  { name: 'MENTIONING a topic does NOT bind — this is the whole correction',
    f: 'x.md', t: 'we fixed the routes and the RLS policies and the theme tokens', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === false },
  { name: 'NAMING a gate that exists DOES bind',
    f: 'x.md', t: 'verified by check-phantom-migrations.mjs', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === true && r.liveGates.length === 1 },
  { name: 'naming a gate that does NOT exist is a DEAD citation, never a binding',
    f: 'x.md', t: 'verified by check-deleted-thing.mjs', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === false && r.deadCitations.includes('check-deleted-thing.mjs') },
  { name: 'a workflow citation binds when the workflow exists',
    f: 'x.md', t: 'enforced by phantom-migrations.yml', g: ['phantom-migrations.yml'],
    expect: (r) => r.bindable === true },
  { name: 'a table row naming ANOTHER .md attributes its citations to THAT doc, not this one',
    f: 'verdict.md',
    t: '| `some/other-doc-v1.00W.md` | `quality.yml`, `ci.yml` | could not be shown to run |',
    g: ['ci.yml'],
    expect: (r) => r.cited.workflows.length === 0 && r.deadCitations.length === 0 },
  { name: 'NEGATIVE CONTROL — a table row NOT naming a .md still cites normally',
    f: 'x.md', t: '| the routes gate | `check-phantom-migrations.mjs` | passes |',
    g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === true && r.liveGates.length === 1 },
  { name: 'NEGATIVE CONTROL — a doc cannot launder its OWN dead citation into a table',
    f: 'x.md', t: '| the gate | `check-deleted-thing.mjs` | gone |',
    g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.deadCitations.includes('check-deleted-thing.mjs') },
  { name: 'pnpm-lock.yaml is NOT a workflow citation — it is a real file elsewhere',
    f: 'x.md', t: 'we refreshed pnpm-lock.yaml and pnpm-workspace.yaml', g: [],
    expect: (r) => r.deadCitations.length === 0 && r.cited.workflows.length === 0 },
  { name: 'VACUITY: a doc citing NOTHING is never eligible — an empty citation list has no failing gate',
    f: 'x.md', t: 'a doc with no citations at all', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === false && r.liveGates.length === 0 && r.liveWorkflows.length === 0 },
  { name: 'a completion word inside a hyphenated PHRASE is not a marker',
    t: 'x', f: '20260805-portal-persona-jobs-to-be-done-v1.00W.md', g: [],
    expect: (r) => r.alreadyMarked === false },
  // WAS: this asserted `…-feature-map-complete-v1.00W.md` IS marked complete, which
  // is the behaviour the status-code rule corrects. The file is "Complete AI Feature
  // Map" — `complete` describes the map's coverage — and `W` says Working, in the
  // document's own name. A test asserting the old constant locks in the defect it
  // was named to protect, so it is repaired rather than deleted: a real completion
  // suffix with NO competing status code still counts.
  { name: 'but a real completion suffix still counts',
    t: 'x', f: '20260817-portal-rollout-complete.md', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'a W/D/R/A status code OUTRANKS a completion word in the title',
    t: 'x', f: '20260227-feature-map-complete-v1.00W.md', g: [],
    expect: (r) => r.alreadyMarked === false },
  { name: 'and F — the estate\'s actual completion marker — does NOT suppress it',
    t: 'x', f: '20260227-feature-map-complete-v1.00F.md', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'and an ALL-CAPS marker still counts',
    t: 'x', f: 'QUEUE-COMPLETE.md', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'a gate living in a SUBMODULE counts as live — the evidence layer is the estate',
    t: 'Verified by `db-lint.yml`.', f: 'x.md', g: ['db-lint.yml'],
    expect: (r) => r.bindable === true && r.deadCitations.length === 0 },
  { name: 'a gate in NO root is still dead — the widening must not swallow real misses',
    t: 'Verified by `quality.yml`.', f: 'x.md', g: ['db-lint.yml'],
    expect: (r) => r.bindable === false && r.deadCitations.includes('quality.yml') },
  { name: 'HISTORICAL: a line RECORDING that a gate was deleted is not citing it',
    f: 'x.md', t: '`.github/workflows/quality.yml` is deleted and ci.yml absorbed it', g: ['ci.yml'],
    expect: (r) => r.deadCitations.length === 0 && r.cited.historical.includes('quality.yml') },
  { name: 'CONTROL: a plain assertion naming a gate that is gone STILL reports dead',
    f: 'x.md', t: 'Parent CI guard: verify-silent-auth-wired.yml runs on every push.', g: ['ci.yml'],
    expect: (r) => r.deadCitations.includes('verify-silent-auth-wired.yml') },
  { name: 'the guard reads the PROSE, never the artifact name itself',
    f: 'x.md', t: 'Mitigation: check-deleted-thing.mjs guards the drift.', g: [],
    expect: (r) => r.deadCitations.includes('check-deleted-thing.mjs') },
  { name: 'a CANDIDATE gate is a proposal, not a claim',
    f: 'x.md', t: 'Candidate: scripts/check-lockfiles.mjs or a lint rule.', g: [],
    expect: (r) => r.deadCitations.length === 0 },
  { name: 'a LIVE gate on a historical line is still not counted as binding evidence',
    f: 'x.md', t: 'ci.yml was renamed from the old runner.', g: ['ci.yml'],
    expect: (r) => r.bindable === false && r.cited.historical.includes('ci.yml') },
  { name: 'a gate name is never extracted from the TAIL of a longer name',
    f: 'x.md', t: 'the never-written pnpm-audit-all.sh', g: [],
    expect: (r) => r.deadCitations.length === 0 && r.cited.gates.length === 0 },
  { name: 'ARCHIVED docs are records, not claims — and cannot bind either',
    f: 'README.md', p: 'docs/archive/old-thing/README.md',
    t: 'The deploy job (deploy-dashboard.yml) ships the artifact.', g: [],
    expect: (r) => r.archival === true && r.deadCitations.length === 0 && r.bindable === false },
  { name: 'a LIVE gate in an archived doc still does not earn a marker',
    f: 'README.md', p: 'docs/archive/x/README.md', t: 'guarded by ci.yml', g: ['ci.yml'],
    expect: (r) => r.bindable === false },
  { name: 'CONTROL: the archive rule must not match a normal path containing the letters',
    f: 'x.md', p: 'docs/plans/20260501-archival-strategy.md',
    t: 'Parent CI guard: verify-silent-auth-wired.yml runs on every push.', g: [],
    expect: (r) => r.archival === false && r.deadCitations.includes('verify-silent-auth-wired.yml') },
  { name: 'CONTROL: a live doc with no banner still reports its dead citations',
    f: 'x.md', t: '# Report\n\nParent CI guard: quality.yml runs on every push.', g: [],
    expect: (r) => r.archival === false && r.deadCitations.includes('quality.yml') },
  { name: 'CONTROL: a banner buried past the opening lines does not make a doc historical',
    f: 'x.md', t: 'line\n'.repeat(40) + 'Superseded by the newer register.\nquality.yml runs on push.', g: [],
    expect: (r) => r.archival === false && r.deadCitations.includes('quality.yml') },
  { name: 'CONTROL: `Status: Draft` is a LIVE working doc here, never a record',
    f: 'x.md', t: '# Audit\n\nStatus: Draft (D). Date: 2026-08-11.\n\nquality.yml runs on push.', g: [],
    expect: (r) => r.archival === false && r.deadCitations.includes('quality.yml') },
  { name: 'an explicit supersession banner DOES make a doc a record',
    f: 'x.md', t: '# Audit\n\n> Superseded by the 2026-08-22 register.\n\nquality.yml runs on push.', g: [],
    expect: (r) => r.archival === true && r.deadCitations.length === 0 },
  { name: 'migration versions and PRs are captured as corroboration',
    f: 'x.md', t: 'applied 20260831000000 via crm7#1894', g: [],
    expect: (r) => r.cited.migrations.includes('20260831000000') && r.cited.prs.includes('crm7#1894') },

    // R80.4's `dod.mjs` follows no parent naming convention and is a real gate.
    { name: 'a gate outside the check-/audit- convention still binds when it EXISTS',
      f: 'x.md', t: 'Twenty-one awards, each passing `node scripts/dod.mjs <AWARD>`.', g: ['dod.mjs'],
      expect: (r) => r.bindable === true && r.liveGates.includes('dod.mjs') },

    // The dangerous half: this must not turn every .mjs in prose into a ghost.
    { name: 'a conventionless name that does NOT exist is ignored, never a ghost',
      f: 'x.md', t: 'We considered writing thing.mjs but did not.', g: [],
      expect: (r) => r.bindable === false && r.deadCitations.length === 0 },

    // A convention-named gate that is gone MUST still report as a ghost.
    { name: 'the ghost rule is unchanged for convention-named gates',
      f: 'x.md', t: 'Enforced by check-gone-thing.mjs.', g: [],
      expect: (r) => r.deadCitations.includes('check-gone-thing.mjs') },

    // An absence sentence must suppress a candidate the same way it suppresses a gate.
    { name: 'a candidate named on an ABSENCE line is not evidence',
      f: 'x.md', t: 'dod.mjs was deleted and no longer exists.', g: ['dod.mjs'],
      expect: (r) => r.bindable === false },
];

if (process.argv.includes('--self-test')) {
  let failed = 0;
  for (const t of SELF_TESTS) {
    const r = classify(t.t, t.f, new Set(t.g), t.p || t.f);
    const ok = t.expect(r);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got: ${JSON.stringify(r)}`); }
  }
  console.log(`\n  ${SELF_TESTS.length - failed}/${SELF_TESTS.length} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

const roots = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!roots.length) { console.error('usage: audit-doc-completion.mjs <repo-root...> [--self-test]'); process.exit(2); }

// THE EVIDENCE LAYER IS THE WHOLE ESTATE, NOT THE PARENT.
//
// This used to read only the parent's `scripts/` and `.github/workflows/`, while the
// `roots` argument above was used to find DOCS in every submodule. So a doc citing
// `db-lint.yml` or `ci.yml` or `e2e.yml` was reported as CITING A DELETED GATE —
// every one of those lives in business-suite-unified/.github/workflows/ and always
// has. 23 docs were listed as pointing at ghosts; most of them point at real gates in
// a sibling repo.
//
// It also put this tool in direct disagreement with
// scripts/check-doc-citations-resolve.mjs, which resolves into submodules and passes
// clean on the same corpus. Two tools answering one question differently is worse than
// either answer, because whichever you read last wins.
const artifactsPresent = new Set();
for (const root of roots) {
  for (const d of ['scripts', '.github/workflows']) {
    const dir = root === '.' ? d : join(root, d);
    if (existsSync(dir)) for (const f of readdirSync(dir)) artifactsPresent.add(f);
  }
}
if (artifactsPresent.size < 20) {
  console.error(`  POSITIVE CONTROL FAILED: only ${artifactsPresent.size} artifact(s) found.`);
  console.error('  Without the evidence layer every doc reports UNBINDABLE, which reads as a');
  console.error('  careful answer and is a broken one. Run from the parent repo root.');
  process.exit(3);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const rows_ = [];
for (const root of roots) {
  for (const p of walk(join(root, 'docs'))) {
    const text = readFileSync(p, 'utf8');
    /* A POINTER IS NOT A DOCUMENT. It has no claim to bind and no content to go
       stale — its only failure mode is a dangling link, which
       check-docs-links-and-pins owns. Counting one as UNBOUND files a signpost in
       the backlog of documents that can never be shown complete, which is the wrong
       backlog. Same predicate check-doc-naming and check-doc-classification use,
       imported from the same module so the three cannot disagree. */
    if (isPointerFile(text)) continue;
    rows_.push({ path: p, ...classify(text, p.split('/').pop(), artifactsPresent, p) });
  }
}

const rows = rows_;
const marked = rows.filter((r) => r.alreadyMarked);
const bindable = rows.filter((r) => r.bindable);
const dead = rows.filter((r) => r.deadCitations.length > 0);
// A RECORD MARKED `F` IS NOT A CLAIM RESTING ON NOTHING — it is an immutable
// historical artefact, and `F` is the correct marker for one. Only a LIVE
// document marked complete with no runnable evidence is the defect this line
// exists to count.
//
// Counting archival docs here made the number report 18 unevidenced completions
// when the real answer is the one live document that carries the marker, and it
// earns it.
const markedUnbindable = marked.filter((r) => !r.bindable && !r.archival);

console.log(`\n  ${rows.length} doc(s); ${artifactsPresent.size} gate/workflow file(s) form the evidence layer\n`);
console.log(`  already marked complete in the filename        ${marked.length}`);
console.log(`    ...of those, citing NO live gate             ${markedUnbindable.length}   <-- the claim rests on nothing`);
console.log(`  CITE a gate or workflow that EXISTS            ${bindable.length}   <-- the only docs that can ever be marked`);
console.log(`  cite a gate that NO LONGER EXISTS              ${dead.length}   <-- citing a ghost; reads as evidence`);
// COUNTED FROM THE SET, NOT BY SUBTRACTION — for the same reason the ratchet is.
// `bindable` and `dead` OVERLAP: a doc citing one gate that exists and another that
// does not is in both, so `rows - bindable - dead` subtracts it twice. It reads
// correct today only because `dead` happens to be empty; it is wrong the moment a
// gate is deleted, and wrong quietly, which is the worst way for a number to be
// wrong. Fixing the ratchet and leaving this line is fixing the instance, not the
// class.
const citeNothing = rows.filter((r) => !r.bindable && r.deadCitations.length === 0);
console.log(`  cite nothing checkable                         ${citeNothing.length}`);
console.log(`  historical records (by path or banner)         ${rows.filter((r) => r.archival).length}`);

// NAME THE UNEVIDENCED COMPLETIONS.
//
// "55 of 100 marked complete cite no live gate" is the single most actionable
// number this tool produces and it was printed without a single filename. A
// completion marker is a claim that the work is done and provable; one that cites
// nothing is a claim resting on nothing, and it is indistinguishable from a real
// completion to anyone reading the file list. Left unnamed it cannot be triaged —
// each is either a doc that should cite its gate, or a marker that was not earned.
if (markedUnbindable.length > 0) {
  console.log(`\n  MARKED COMPLETE, CITING NOTHING RUNNABLE — ${markedUnbindable.length} live doc(s).`);
  console.log('  Each is either missing its citation or wearing a marker it did not earn:');
  for (const r of [...markedUnbindable].sort((a, b) => a.path.localeCompare(b.path))) {
    console.log(`    ${r.path}`);
  }
}

// A SILENT CAP IS THE DEFECT, NOT THE CAP.
//
// This printed 25 of 70 BINDABLE rows and said nothing about the other 45, so
// anything reading the output — a person or a script — saw a complete list. The
// same shape cost four passes chasing a MOVED-reference fixer that reported
// "0 applied" because its report truncated at 4 refs per doc.
//
// `--all` prints every row; without it the omission is STATED.
const SHOW_ALL = process.argv.includes('--all');
const capped = (rows, n) => (SHOW_ALL ? rows : rows.slice(0, n));
const omitted = (rows, n) => (SHOW_ALL ? 0 : Math.max(0, rows.length - n));

if (dead.length) {
  console.log('\n  DEAD CITATIONS — a doc pointing at a gate that was deleted:');
  for (const r of capped(dead, 15)) console.log(`    ${r.path}\n        ${r.deadCitations.slice(0, 4).join(', ')}`);
  if (omitted(dead, 15)) console.log(`    … ${omitted(dead, 15)} more NOT SHOWN — re-run with --all`);
}
if (bindable.length) {
  console.log('\n  BINDABLE — these name a gate that exists, so their claim is checkable:');
  for (const r of capped(bindable, 25)) {
    console.log(`    ${r.path}`);
    console.log(`        ${[...r.liveGates, ...r.liveWorkflows].slice(0, 5).join(', ')}`);
  }
  if (omitted(bindable, 25)) console.log(`    … ${omitted(bindable, 25)} more NOT SHOWN — re-run with --all`);
}
// FULL INVENTORY MODE — the summary counts, per document.
//
// The console output above truncates to the first 15/25 rows because a 471-row dump is
// unreadable in a terminal. That truncation is fine for a gate and useless for the
// question the operator actually asks: "which docs, and what would move each one?"
// `--inventory` emits every row as markdown, so the corpus can be READ rather than
// summarised, and regenerated instead of going stale as a hand-written snapshot.
if (process.argv.includes('--inventory')) {
  const state = (r) =>
    r.deadCitations.length ? 'DEAD-CITATION'
    : r.archival ? 'RECORD'
    : r.bindable ? 'BINDABLE'
    : 'UNBOUND';
  const order = { 'DEAD-CITATION': 0, BINDABLE: 1, UNBOUND: 2, RECORD: 3 };
  const rows = [...rows_].sort((a, b) => (order[state(a)] - order[state(b)]) || a.path.localeCompare(b.path));
  const out = [];
  out.push('| doc | state | marked | cites |');
  out.push('|---|---|---|---|');
  for (const r of rows) {
    const cites = [...r.liveGates, ...r.liveWorkflows].slice(0, 3).join(', ')
      || (r.deadCitations.slice(0, 2).join(', ') || '—');
    out.push(`| \`${r.path}\` | ${state(r)} | ${r.alreadyMarked ? 'yes' : ''} | ${cites} |`);
  }
  console.log('\n<!-- INVENTORY -->');
  console.log(out.join('\n'));
}

// ── THE UNBOUND RATCHET ─────────────────────────────────────────────────────
//
// 425 docs cite nothing checkable. That number cannot be driven to zero by this tool or
// by any tool: binding a doc means NAMING the artifact that proves it, and choosing that
// artifact is a judgement about the document's CONTENT.
//
// THE OBVIOUS SHORTCUT IS A RECORDED FAILURE OF THIS EXACT FILE. The first version matched
// keywords and reported 437 of 463 bindable — the word "route" being common, dressed up as
// a finding. Auto-binding the 425 now would manufacture 425 false completions, which is
// precisely what the operator's bar exists to prevent.
//
// So the system gets finished even though the judgements cannot be:
//
//   1. THE COUNT MAY ONLY FALL. A committed baseline, equality-checked like every other
//      ratchet in this estate — a ceiling with slack is a ceiling written down wrong.
//   2. THE PILE CANNOT GROW. A doc ADDED to the corpus must cite something or declare
//      itself a record. It is cheap at creation and impossible to reconstruct later, which
//      is exactly the argument the classification gate already makes for frontmatter.
//
// An open-ended backlog becomes a monotonically shrinking one. That is the finishable
// shape, and it is the only honest one.
const UNBOUND_BASELINE_FILE = 'docs/.unbound-baseline';

/* THE SECOND HALF OF THE OPERATOR'S BAR, RATCHETED THE SAME WAY.
 *
 * The unbound ratchet stops the backlog GROWING. It says nothing about the docs that
 * already wear `-v1.00F` while citing nothing runnable — 60 of them on 2026-08-27, out
 * of 108 marked complete. More than half of every completion marker in the estate rests
 * on nothing checkable.
 *
 * Those 60 cannot be cleared tonight: each is a JUDGEMENT about document content —
 * limb (a) of the bar, whether the doc is superseded or described a non-best-practice
 * since corrected — and no script may make it. But an unmeasured pile of unearned
 * markers is free to grow, and a marker that was not earned is indistinguishable from
 * a real completion to anyone reading the file list.
 *
 * So: the count MAY ONLY FALL. Equality-checked, like every other ratchet here. An
 * open-ended backlog becomes a monotonically shrinking one, which is the finishable
 * shape and the only honest one. */
const UNEARNED_BASELINE_FILE = 'docs/.unearned-marker-baseline';
// UNBOUND means a LIVE document whose claim nothing can check. An ARCHIVAL
// record is neither — it preserves what was said at the time and is not making a
// claim about production, which is why `bindable` already excludes it.
//
// Leaving records in this total double-counts them as a debt they cannot pay: a
// doc reclassified from live to record would RAISE the number, and the honest
// reading of that reclassification is that the backlog shrank by one.
const archivalCount = rows.filter((r) => r.archival).length;

// NAME THEM. The ratchet used to report only a number, and a number is not
// actionable: "baseline 336, now 337" tells you a doc crossed the line and not
// WHICH, across a 578-document corpus spanning six submodules. Finding the one
// that moved took an hour of bisecting by date, by submodule, and by gitlink
// range — and still did not isolate it, because every candidate turned out to be
// bindable or archival.
//
// A gate whose diagnostic cannot be acted on gets banked around rather than
// fixed, which is precisely how a ratchet stops ratcheting. The same fault exists
// in check-doc-classification, which reports "255 of 314" and no path.
const bindableSet = new Set(bindable.map((r) => r.path));
const deadSet = new Set(dead.map((r) => r.path));
const unboundRows = rows.filter(
  (r) => !bindableSet.has(r.path) && !deadSet.has(r.path) && !r.archival,
);

// COUNTED FROM THE SET, NOT BY SUBTRACTION.
//
// This was `rows.length - bindable.length - dead.length - archivalCount`, and
// those three categories OVERLAP: a doc citing one gate that exists and another
// that does not is in `bindable` AND `dead`, so it was subtracted twice.
// Measured on the parent corpus: 4 such docs, arithmetic 194 vs the true 198.
//
// The consequence is worse than a wrong total. The overlap moves whenever a gate
// script is added or deleted, so the ratchet number changed with NO document
// having changed — which is exactly the phantom "+1 over baseline" that cost an
// hour of bisecting by date, by submodule and by gitlink range before the
// listing above made the discrepancy visible.
//
// A ratchet must move only when the thing it measures moves.
const unboundNow = unboundRows.length;

let ratchetFailed = false;
if (existsSync(UNBOUND_BASELINE_FILE)) {
  const base = Number(readFileSync(UNBOUND_BASELINE_FILE, 'utf8').trim());
  if (!Number.isFinite(base)) {
    console.error(`\n  ${UNBOUND_BASELINE_FILE} is not a number.`);
    ratchetFailed = true;
  } else if (unboundNow > base) {
    console.error(`\n  UNBOUND RATCHET BROKEN: baseline ${base}, now ${unboundNow}.`);
    console.error('  A new doc that cites nothing checkable can never be shown complete, and');
    console.error('  the backlog it joins is the one nobody can finish. Name the gate, workflow');
    console.error('  or migration that would prove it — or, if it records what happened rather');
    console.error('  than claiming anything, file it under docs/archive/ or give it a');
    console.error('  point-in-time banner and it counts as a RECORD instead.');
    // Show the most recently DATED first: a ratchet breaks because of something
    // recent, and the full list is hundreds of lines nobody reads.
    //
    // Sorted on the `YYYYMMDD-` filename prefix, not on the path — sorting by path
    // is reverse-ALPHABETICAL and puts whichever submodule sorts last at the top,
    // which reads as "newest" and is not. Undated docs sort last rather than
    // being dropped: a doc with no date prefix is still unbound.
    const dateKey = (r) => (String(r.path).match(/(\d{8})-/)?.[1] ?? '00000000');
    const newest = [...unboundRows]
      .sort((a, b) => dateKey(b).localeCompare(dateKey(a)) || String(a.path).localeCompare(String(b.path)))
      .slice(0, 15);
    console.error(`\n  The ${unboundRows.length} unbound doc(s), most recently dated first (showing ${newest.length}):`);
    for (const r of newest) console.error(`      ${r.path}`);
    if (unboundRows.length > newest.length) {
      console.error(`      … ${unboundRows.length - newest.length} more — re-run with --all for the full list.`);
    }
    ratchetFailed = true;
  } else if (unboundNow < base) {
    console.error(`\n  UNBOUND fell ${base} -> ${unboundNow}. Bank it:`);
    console.error(`      echo ${unboundNow} > ${UNBOUND_BASELINE_FILE}`);
    console.error('  Equality, not a ceiling — slack between the committed number and the');
    console.error('  measured one lets the backlog grow back unnoticed (bsuite D-87).');
    ratchetFailed = true;
  } else {
    console.log(`\n  unbound ratchet ok: baseline ${base}, now ${unboundNow}`);
  }
} else {
  console.log(`\n  no unbound baseline yet — write ${unboundNow} to ${UNBOUND_BASELINE_FILE} to arm the ratchet`);
}

const unearnedNow = markedUnbindable.length;
if (existsSync(UNEARNED_BASELINE_FILE)) {
  const base = Number(readFileSync(UNEARNED_BASELINE_FILE, 'utf8').trim());
  if (!Number.isFinite(base)) {
    console.error(`\n  ${UNEARNED_BASELINE_FILE} is not a number.`);
    ratchetFailed = true;
  } else if (unearnedNow > base) {
    console.error(`\n  UNEARNED-MARKER RATCHET BROKEN: baseline ${base}, now ${unearnedNow}.`);
    console.error('  A document gained a completion marker while citing nothing runnable.');
    console.error('  The marker is a claim that the work is done AND provable. Either cite the');
    console.error('  gate that proves it, or do not wear the marker. Every offender is named in');
    console.error('  the MARKED COMPLETE section above — this ratchet adds no new list, it only');
    console.error('  stops that list growing.');
    ratchetFailed = true;
  } else if (unearnedNow < base) {
    console.error(`\n  UNEARNED MARKERS fell ${base} -> ${unearnedNow}. Bank it:`);
    console.error(`      echo ${unearnedNow} > ${UNEARNED_BASELINE_FILE}`);
    console.error('  Equality, not a ceiling. Slack lets the pile grow back unnoticed (bsuite D-87).');
    ratchetFailed = true;
  } else {
    console.log(`\n  unearned-marker ratchet ok: baseline ${base}, now ${unearnedNow}`);
  }
} else {
  console.log(`\n  no unearned-marker baseline yet — write ${unearnedNow} to ${UNEARNED_BASELINE_FILE} to arm the ratchet`);
}

console.log('\n  NOTHING WAS RENAMED. Eligibility is not a verdict — the cited gates must be RUN.');
console.log('  AND: eligibility is only LIMB (b) of the operator bar. Limb (a) — that a doc is');
console.log('  SUPERSEDED, or described a non-best-practice since corrected — is a judgement about');
console.log('  the document CONTENT. Nothing here reads that, and no marker may be applied without it.');
console.log('  VACUITY: a doc citing zero gates has zero FAILING gates. That is not a pass. Scoring');
console.log('  code downstream of this tool MUST require at least one PASSING citation, not merely');
console.log('  the absence of a failing one.');

if (ratchetFailed) process.exit(1);
