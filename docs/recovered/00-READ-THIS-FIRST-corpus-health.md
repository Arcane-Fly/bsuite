# READ THIS BEFORE USING ANYTHING IN `docs/recovered/`

**Status:** A (Approved — records verified findings) · **Version:** 1.00 · **Date:** 2026-08-08
**Why it exists:** operator RULING 1.2 makes this directory authoritative
(*"Read `Dev/bsuite/docs/recovery/*` before proposing anything"*), and operator RULING 1.3
makes the wider archive untrusted until each document is verdicted against code. Both are
true at once. This note is the reconciliation.

All 33 files were read **in full** on 2026-08-08. Findings below are from that read.

---

## 1. There is a live trap in here. It will make you build the wrong thing.

`20260304-crm7-document-lifecycle-implementation-plan-v1.00W.md` is **2,342 lines** of
task-by-task instructions for building on **Adobe Acrobat Sign** — `adobeSignService.ts`,
`buildParticipantSets`, `createAgreement`, an `adobe-sign-webhook` edge function, and a
`document_signatories` table.

**Adobe Sign was rejected the same day that plan was written.**

| Doc | Date | Says |
|---|---|---|
| the implementation plan above | 2026-03-04 | build on Adobe Acrobat Sign |
| `20260304-document-esign-best-practice-research-v1.00W.md` §9 | **same day** | *"~~Stay with Adobe Acrobat Sign~~ → SUPERSEDED… the self-hosted approach was selected"* |
| `20260317-document-esigning-architecture-v1.00A.md` | 2026-03-17 | *"Replaces: Adobe Sign, DocuSeal, Adobe PDF Services (all removed — zero vendor dependency)."* **Status: implemented and shipped** |

**The implementation plan was never revised.** It is the longest and most actionable
document in the directory, so it is the one an agent reads first and trusts most.

**Current truth is the 2026-03-17 shape:** `document_records` + `document_audit_logs`,
signer fields embedded on the record, **no** `document_signatories`, 2-state status.

### Why this shape recurs, and the rule that catches it
A reversal is written into a **new** document. Nobody goes back and marks the old one dead.
Time makes it worse: the rejected plan is *older*, so it sorts first, and *more detailed*,
because the detail was written before the reversal made it worthless.

**Rule: before treating any doc here as a spec, find its successor. Trust the doc that
claims SHIPPED over the doc that claims WORKING, regardless of length or detail.**

## 2. Three incompatible generations of the same tables

`document_records` / `document_templates` exist here in three mutually exclusive shapes:
2026-03-04 (Adobe, with `document_signatories`) · **2026-03-17 (shipped — use this one)** ·
2026-07-30 (`§2.4a` of `docs/references/20260730-gto-enquiry-to-billing-process-flow-v1.00D.md`,
adding `kind`, `version`, `document_template_fields`).

RULING 5.4 says *"do not build a second one."* **First decide which of three is live.** The
§2.4a model is the *template* substrate to extend, not a replacement for the shipped signing
tables.

## 3. Eight files in here are not BSuite at all

FastMonkey / Monkey1 project content — Railway env vars, `fastmonkey.au` cookie domains,
Monkey1 browser-extension auth research, third-party AI provider API specs:

`tranquil-weaving-robin.md` · `gleaming-fluttering-coral.md` *(byte-identical duplicate of
the previous)* · `rustling-mapping-lemon.md` · `reactive-growing-waterfall.md` ·
`reactive-growing-waterfall-agent-a8e1b8c.md` · `idempotent-baking-tarjan-agent-ac048d4.md` ·
`cozy-stirring-teacup-agent-a38474b.md`

And `README.md` is a **third-party OpenAI Realtime API demo readme** — it is not this
directory's readme and describes nothing in BSuite. Do not read it as an index.

## 4. RULING 1.2's premise holds for some things and not others

Checked by full read against four operator rulings:

| Ruling | In this corpus? |
|---|---|
| document lifecycle, templates, merge fields, e-signature | **YES** — fully specified |
| tenant-scoped email templates + merge fields | **YES** — `email_templates` is tenant-scoped with admin RLS |
| email **branding** and **signatures** (RULING 12.1) | **NO** — zero hits for "signature" in the entire email plan |
| document categories / sensitivity (RULING 3.x) | **NO** — zero hits |
| operator-authored interpretation surface (RULING 10.2) | **NO** — zero hits |
| parent-over-sub-org (RULING 13.x) | **NO** — zero hits |
| World 1 uploaded-document schema | **NAMED, NEVER DEFINED** — `document_metadata` appears once with no columns anywhere |

**Saying "it's in the recovery docs" is wrong for the bottom five.** Those must be designed
fresh.

## 5. What is verified-good in here

`20260808-standards-do-not-name-providers-finding-v1.00A.md` — re-verified 2026-08-08, and
the commands to re-check it are printed in the file.

---

## The one-line version

**This directory is a genuine and valuable requirements archive that also contains a
rejected vendor's build plan, three contradictory schema generations, and another project's
files.** It is worth reading. It is not worth trusting unread.

Per RULING 1.3, each file still needs a verdict against code —
SUPERSEDED / UNIMPLEMENTED / PARTIALLY IMPLEMENTED / FOREIGN / JUNK — recorded with
file:line evidence. Tracked at **bsuite#1830**.
