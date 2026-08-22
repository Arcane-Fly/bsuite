/**
 * generate-doc-inventory.mjs — writes docs/20260822-estate-doc-inventory-v1.00W.md.
 *
 * A hand-written inventory is correct on the day it is typed. This one is produced by
 * the auditor that gates the corpus, so the document and the gate cannot disagree.
 *
 * Run: node scripts/generate-doc-inventory.mjs
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ARGS = ['.', 'crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4'];
const out = execFileSync('node', ['scripts/audit-doc-completion.mjs', ...ARGS, '--inventory'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
// CUT AT THE MARKER, not at the closing prose. The inventory block prints BEFORE that
// prose, so slicing there swallowed the entire table into the "summary" and the document
// ended up carrying it twice — 950 rows for 475 docs.
const summary = out.slice(0, out.indexOf('<!-- INVENTORY -->')).split('\n').slice(1)
  .filter((l) => l.trim() && !l.includes('NOTHING WAS RENAMED') && !/^\s{2}(AND|SUPERSEDED|the document|VACUITY|code downstream|the absence)/.test(l))
  .join('\n');
const table = out.slice(out.indexOf('<!-- INVENTORY -->')).split('\n').slice(1).join('\n').trimEnd();
const F = '```';
const doc = [
  '---', 'kind: record', 'authority: none', 'owner: bsuite-lane', '---', '',
  '# Every doc in the estate, and what state it is in', '',
  '**Date:** 2026-08-22 · **Status:** W · **Scope:** all 7 roots — parent + six submodules', '',
  '**Regenerate, never hand-edit:**', '', F,
  'node scripts/audit-doc-completion.mjs . crm7 business-suite-unified conduit braden throughput R80.4 --inventory',
  F, '',
  'A hand-written inventory is correct on the day it is typed and wrong the first time',
  'anyone adds a document. This table is produced by the auditor that gates the corpus, so',
  'it cannot disagree with the gate — and if it goes stale, regenerating is one command.', '',
  'Two self-inflicted defects while producing it, both worth the space:', '',
  '- The first generation **omitted this file**, because the table was produced before the',
  '  file existed. An inventory missing one document is the same defect it exists to close.',
  '- The second took the summary and the table from **two separate runs** and they landed one',
  '  row apart — a document disagreeing with its own evidence. Both halves now come from a',
  '  single invocation.', '',
  '## The counts', '', F, summary, F, '',
  '## What the four states mean, and what moves a doc out of each', '',
  '| State | Meaning | What moves it |', '|---|---|---|',
  '| **DEAD-CITATION** | names a gate that does not exist | correct the citation, or record the gate as retired. **Currently zero.** A doc naming a deleted gate reads as *evidence*, which is worse than citing nothing. |',
  '| **BINDABLE** | names a gate or workflow that exists | run the cited gate. Passing is limb (b) of the operator’s bar — necessary, never sufficient. |',
  '| **UNBOUND** | cites nothing checkable | name the artifact that would prove it. Until then no completion claim about it can ever be tested. |',
  '| **RECORD** | archival by path, or self-declared a point-in-time snapshot | nothing. A record is finished by being a record, and deliberately cannot earn a completion marker — otherwise filing a doc away would promote it. |',
  '', '## The honest position on "mark the docs complete"', '',
  '**Only the BINDABLE docs can ever be marked**, because only those name something',
  'checkable. The rest are not failures — most are working documents doing their job — but a',
  'completion claim about them would rest on nothing, and the marker is a filename every',
  'future reader trusts at a glance.', '',
  'The marker itself is `F`, defined by the estate’s own convention as *"Frozen: finalized,',
  'immutable"*. See',
  '`precedent__bsuite__20260822__the_completion_marker_is_F_and_the_convention_already_had_it`.',
  '18 docs carry it as of today; before today, **zero of 306 status-suffixed docs did**.', '',
  '**Eligibility is not a verdict.** This table reports which docs *could* be assessed. Limb',
  '(a) of the operator’s bar — that a doc is superseded, or described a non-best-practice',
  'since corrected — is a judgement about document CONTENT, and nothing here reads content.', '',
  '## The inventory', '', table, '',
].join('\n');
writeFileSync('docs/20260822-estate-doc-inventory-v1.00W.md', doc);
const rows = (doc.match(/^\| `/gm) || []).length;
const stated = (summary.match(/(\d+) doc\(s\)/) || [])[1];
console.log(`  summary says ${stated} docs | table has ${rows} rows | ${Number(stated) === rows ? 'AGREE' : '** DISAGREE **'}`);
