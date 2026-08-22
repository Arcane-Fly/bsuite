# The `docs/recovered/` verdict backlog — all 25 dated documents ruled

**Document:** `docs/20260817-recovered-verdict-backlog-v1.00W.md`
**Status:** W (Working) · **Version:** 1.00 · **Date:** 2026-08-17
**Closes:** **G5** in `docs/20260817-estate-completion-ledger-v1.00W.md` §5
**Implements:** operator RULING 1.3 (2026-08-08) for this directory · tracked at `bsuite#1830`

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. The answer

**All 25 dated documents in `docs/recovered/` now carry a verdict, and every one of them has been
bannered in place** — so an agent that opens the directory directly sees the ruling on the file's
own first screen, without having to find this index. Nothing was rewritten or deleted: the banners
are purely additive (557 lines added, **0 deleted**, across 25 files).

**The headline is not the count. It is that the trap already fired.**

The directory's known hazard — a 2,342-line build plan for a vendor rejected the same day it was
written — did not stay on paper. **The rejected vendor's webhook is running in production right
now**, and it got there through a sequence in which every individual step looked correct.

| Verdict | Count | What it means |
|---|---:|---|
| **DELIVERED** | 9 | Built and live, with evidence |
| **SUPERSEDED** | 8 | Replaced by something named |
| **REFERENCE-ONLY** | 4 | Vendor docs, competitor research, standing doctrine — no verdict owed |
| **STILL-WANTED** | 2 | Real outstanding work |
| **NEVER-BUILT-AND-SHOULD-NOT-BE** | 2 | Dead by decision |

**Two issues filed, not twenty-five.** Most of this directory is delivered or superseded, and a
wave of issues that mostly close on contact would bury the one that matters.

> **A word on the vocabulary**, since this is meant to be read rather than decoded.
> **GTO** = Group Training Organisation, the business we build for. **RLS** = row-level security,
> the database rule deciding which rows a given user may see. **Edge function** = a small program
> Supabase runs on demand at a public URL. **Undeploy** = remove a running edge function from the
> server, which is *not* the same as deleting its source code — that distinction is the whole story
> in §2. **e-signature** = signing a document electronically. **WIF** = Workload Identity
> Federation, a way to authenticate to Google without storing a long-lived secret key.

---

## 2. The trap — and why it beat three separate correct decisions

`20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md` is 2,342 lines of task-by-task
instructions for building on **Adobe Acrobat Sign**. Adobe was rejected on **2026-03-04, the same
day the plan was written**. The plan was never revised.

That much was already documented. **What was not known is that the rejection was never actually
carried out in production, and that a later, careful piece of work put the vendor back.**

### The sequence

| When | What happened | Looked correct? |
|---|---|---|
| 2026-03-04 | Plan written. Adobe rejected the same day in `20260304-document-esign-best-practice-research-v1.00W.md` §9. Plan not revised. | The rejection was right |
| 2026-03-17 | `20260317-document-esigning-architecture-v1.00A.md` ships self-hosted signing — *"zero vendor dependency"*. | Right |
| 2026-05-15 | `crm7#687` deletes the `adobe-sign-webhook` **source file**, reason given: *"Adobe Sign vendor was removed … dead source AND a public endpoint"*. Issue **CLOSED**. (crm7 `482214dc`) | Looked right — **and was the fatal step** |
| — | **Nobody undeployed the function.** Deleting source does not stop a running edge function. It only makes it *sourceless*. | — |
| 2026-08-16 | `bsuite#1955` audits for live functions with no source, finds this one ACTIVE, and **rehomes it verbatim** (crm7 `d68f6fe3`), then hardens it — shared CORS, durable rate limiter, JWT posture (`16cfec84`, `69a1517c`, `02ae4657`). | Right, **given what that agent could see** |

**The 2026-05-15 deletion caused the 2026-08-16 resurrection.** Removing the source is precisely
what turned the endpoint into an unexplained live function, which is exactly what the later audit
was hunting. The rejected vendor's webhook is now back in the repository, security-hardened, and
reads as legitimate infrastructure — because the agent who restored it had no way to know the
vendor had been rejected. **The document that would have told them is the trap document itself, and
it says to build Adobe.**

### Measured against the live database, 2026-08-17

Live project `tuybltdrdefjblnplpqo`:

- `adobe-sign-webhook` — **ACTIVE**, version 42, redeployed 2026-08-16.
  Source: `crm7/supabase/functions/adobe-sign-webhook/index.ts`, 320 lines.
- `public.document_signatories` — **exists**, 12 columns, including **`adobe_participant_id`**.
- **`document_signatories` = 0 rows. `adobe_participant_id` non-null = 0 rows.**

So it is entirely dead surface: a public endpoint and a vendor column that nothing has ever used.

### Two live documents are wrong about this, and are now corrected in place

Both `docs/recovered/00-READ-THIS-FIRST-corpus-health.md` and `crm7#1476` state that the live shape
has **no** `document_signatories` table. **It does**, with an Adobe column, today. Neither was
edited silently — the correction is recorded in the banners and here.

### The inversion, in one line

**The rejected vendor is live in production; the selected replacement was deleted from CRM7.**
`crm7#1665` removed `conduit/src/lib/esign/documentSigner.ts` and `conduit/src/components/esign/SignDocumentFlow.tsx`
as *"the unreachable signing UI"*. The surviving self-hosted implementation is in **Conduit**
(`conduit/src/lib/esign/documentSigner.ts`), not CRM7 — which also means the `A`-status
2026-03-17 architecture document cites two evidence files that no longer exist.

---

## 3. The verdict table — all 25

Ordered by date. **Marker defect** answers a question this estate keeps getting wrong: when a
document and reality disagree, is the *status marker* lying about the work, or is the *body* wrong
about the code?

| # | Document | Verdict | Evidence | Marker defect |
|---|---|---|---|---|
| 1 | `20260225-cascade-claude-upgrade-coordination-plan-v1.00F.md` | **SUPERSEDED** | Cascade/Windsurf tandem no longer exists; coordination is `AGENTS.md` + worktrees + issues | **Marker** — `A` reads as standing instruction on a dead board |
| 2 | `20260226-prerender-seo-marketing-plan-v1.0.0-v1.00F.md` | **DELIVERED** | `crm7/scripts/prerender.mjs`, `braden/scripts/prerender.mjs`; `prerender` in 3 `package.json` | **Marker** — `v1.0.0`, no status letter at all |
| 3 | `20260226-recruit7-candidate-sourcing-plan-v1.00F.md` | **NEVER-BUILT-AND-SHOULD-NOT-BE** | No `recruit7` in `.gitmodules` (6 submodules). Conduit owns recruitment: `conduit/src/lib/ai/tools/candidate-tools.ts` + `r7_*` tables | **Marker** — `D` implies pending; it is dead |
| 4 | `20260226-report-comprehensive-qa-v1.00A.md` | **REFERENCE-ONLY** | Body dated **October 14, 2025**; overtaken by the 2026-08-17 ledger | **Marker** — `A` on a stale severity list reads as an approved queue |
| 5 | `20260226-report-implementation-summary-v1.00F.md` | **DELIVERED** | Retrospective of fixes shipped 2025-10-09 | **Marker** — `A` on a retrospective |
| 6 | `20260227-ai-assistant-plugin-system-plan-v1.00F.md` | **DELIVERED** | `crm7/src/lib/ai/plugins/plugin-registry.ts`; `xero/xero-plugin.ts`; `crm7/src/components/ai/AIAssistant.tsx` | **Marker** — `W` on shipped work |
| 7 | `20260227-e2e-flows-google-azure-setup-v1.00F.md` | **DELIVERED** | Live: `oauth-google-email` v93, `oauth-microsoft-email` v94, `email-token-refresh` v62 | **Marker** — `W` on shipped work |
| 8 | `20260227-email-capabilities-plan-v1.00W.md` | **STILL-WANTED** (partly) | Transport live (5 functions, 5 tables). **Signatures + branding absent estate-wide**; `email_templates` 0 rows | **Body** — presents as the complete email plan with zero signature/branding requirement |
| 9 | `20260228-conduit-ai-tools-plan-v1.00F.md` | **DELIVERED** | `conduit/src/lib/ai/tools/` — 7 tool modules + tests | **Marker** — `W` on shipped work |
| 10 | `20260301-phase1-coordination-plan-v1.00F.md` | **SUPERSEDED** | Two-agent split; work delivered (#11), protocol obsolete | **Marker** — no version or status marker at all |
| 11 | `20260301-reconciliation-phase1-implementation-v1.00F.md` | **DELIVERED** | Live tables `apprentices`, `placements`, `training_providers`, `user_tenants`, `org_members`; `crm7/supabase/migrations/20260228000001_gto_foundation_tables.sql` | **Marker** — none in filename |
| 12 | `20260302-vercel-deployment-fix-cc2-plan-v1.00F.md` | **DELIVERED** | All six apps deploy from CI; remedies target a 2026-03 toolchain — do not re-apply | **Marker** — `W` on shipped work |
| 13 | `20260303-bsuite-launch-ready-design-v1.00F.md` | **SUPERSEDED** | By the 2026-08-17 ledger (scope) and `bsuite#635` design-language rollout (visual). Names R80.3, now retired for R80.4 | **Marker** — `D` on superseded work |
| 14 | `20260304-crm7-comprehensive-audit-report-v1.00F.md` | **SUPERSEDED** | By the 2026-08-17 ledger + ~137 open `crm7` issues | **Marker** — `W` on a historical audit |
| 15 | `20260304-crm7-comprehensive-gap-analysis-v1.00F.md` | **SUPERSEDED** | Same, plus WF1 parity doc (#21) for competitor scope | **Marker** — `W` on historical analysis |
| 16 | `20260304-crm7-document-lifecycle-design-v1.00F.md` | **SUPERSEDED** | Adobe-era shape; replaced by the 2026-03-17 architecture + §2.4a template substrate | **Body** — solution names a rejected vendor |
| 17 | **`20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md`** | **NEVER-BUILT-AND-SHOULD-NOT-BE** | **THE TRAP** — see §2. Adobe rejected same day; residue live in production | **Body** — 2,342 lines of instructions for a rejected vendor |
| 18 | `20260304-document-esign-best-practice-research-v1.00W.md` | **REFERENCE-ONLY** | This is the decision record that *rejected* Adobe (§9). It got it right | **Marker** — `W` on a settled ruling invites reopening it |
| 19 | `20260304-gto-document-templates-guide-v1.00W.md` | **STILL-WANTED** (small) | `document_templates` = **1 row** vs ~20 GTO types. Its `source` column ships in a migration **below the `20260611000000` floor**, so it can never apply | **Body** — depends on a column that will never exist |
| 20 | `20260305-wif-migration-plan-v1.00F.md` | **DELIVERED** | WIF live in `crm7/supabase/functions/crm7-generate-document/index.ts` | **Neither** — marker, body and code agree. The only one |
| 21 | `20260306-workforce-one-parity-analysis-v1.00W.md` | **REFERENCE-ONLY** | Competitor research (Workforce One / Code House) | **Marker** — `W` on reference material implies pending work |
| 22 | `20260317-document-esigning-architecture-v1.00A.md` | **SUPERSEDED** (evidence, not decision) | Decision still right. But 2 of its 3 cited files deleted by `crm7#1665`; its *"webhook retirement crm7#687 CLOSED"* claim is **false** — it is live | **Body** — an `A` marker over a falsified evidence block |
| 23 | `20260425-universal-canvas-master-execution-plan-v1.00F.md` | **SUPERSEDED** | Already self-bannered 2026-05-01 — the only one that was. Confirmed accurate; related open work is ledger **G7** | **Marker** — filename says `W`, body says SUPERSEDED |
| 24 | `20260630-cross-app-auth-validation-dev-deploy-test-plan-v1.00F.md` | **DELIVERED** | `crm7/src/pages/auth/callback.tsx:209` `setSession`; `crm7/src/__tests__/oauth-contract.test.ts`. Procedure still useful as a runbook | **Marker** — `W` on shipped work |
| 25 | `20260808-standards-do-not-name-providers-finding-v1.00A.md` | **REFERENCE-ONLY** | Operator RULING 4.3; ships its own re-check commands | **Neither** — verified good |

> **APPLIED 2026-08-22 — all 18 marker-wrong documents are now `F`.**
>
> This section identified the defect on 2026-08-17 and prescribed the fix. Nothing acted
> on it for five days, which is the same shape as every other finding this week: the
> analysis was right, the correction never landed, and the wrong marker went on being
> read as truth the whole time.
>
> The correct marker was already in the convention. `docs/20260227-contributing-standards-guide-v1.01W.md`
> §4 defines **`F` — Frozen: finalized, immutable**, and of 306 status-suffixed documents
> across the estate, **zero** used it. There was never a need to invent a `-COMPLETE`
> suffix; the slot existed and stood empty.
>
> Four verdicts mean finished and were promoted: **DELIVERED** (9), **SUPERSEDED** (6),
> **DEAD** (2), **NEVER** (1). The other seven were left alone — REFERENCE and CURRENT
> TRUTH are still consulted, LIVE is current, and STILL means the work is open. The count
> of 18 was derived independently by the freeze tool and matches this section's own
> figure exactly.
>
> Limb (b) of the operator's bar was re-checked rather than taken on trust: every
> artifact this table cites for a DELIVERED verdict still resolves, including
> `crm7/src/pages/auth/callback.tsx:209` still carrying `setSession`.
>
> `docs/recovered/` now reads **18 F · 3 A · 4 W**, and the four remaining `W` are the two
> STILL-WANTED items, the one LIVE research note, and one reference analysis — every one
> of them genuinely unfinished or genuinely current.

**Marker defects total: 18 marker-wrong, 5 body-wrong, 2 clean** (18 + 5 + 2 = 25). The five
body-wrong are documents 8, 16, 17, 19 and 22; **17 and 22 are the dangerous ones**, because a
wrong body under a confident marker is what an agent acts on.

The pattern is blunt: **`W` (Working) is this directory's default lie.** Thirteen of the 25 carry
`W`, and nearly all of them describe work that shipped months ago or was abandoned. A `W` marker is
read as "in flight, pick this up" — which is exactly how a stale plan comes to look like a live
instruction.

---

## 4. The two STILL-WANTED items, and what already covers them

Filing is not finishing, so each was checked against every open issue in the parent repo (71) and
in `crm7` (137) before anything was filed.

### Already covered — do not re-file

| Work | Covered by |
|---|---|
| The archive spec naming a rejected vendor; `.docx` bridge; making authored docs signable | **`crm7#1476`** (open) — already names this exact trap |
| Document generation non-functional; `document_templates` / `document_records` phantom-column drift | **`crm7#1595`** (open) — this is why doc 19's `source` column never applied |
| Client connects their own SMTP/Google/Azure mail account | **`crm7#1705`** (open) |
| Email read pane for Sent/SMS/Internal | **`crm7#1610`** (open) |
| Email/calendar settings + inbox UI | **`crm7#480`** (open) |
| Universal editor backlog | ledger **G7** |

### Genuinely additional — two issues filed

**A. The live Adobe residue → `crm7#1779`** (filed 2026-08-17). Not covered anywhere. `crm7#1476`
covers the *specification* naming a rejected vendor; it does not cover a **deployed, active,
publicly-addressable endpoint** plus a vendor column in a live table. And `crm7#687`, the issue that
would appear to cover it, is **CLOSED while the function runs**. Size: **S** — undeploy the
function *first*, then delete source, drop `adobe_participant_id`, and annotate `crm7#687` with the
SHA that actually did it.

**B. Email signatures and per-tenant email branding → `bsuite#2059`** (filed 2026-08-17), operator
RULING 12.1. Measured zero across `crm7/src`, `business-suite-unified/src` and `conduit/src`,
positive-controlled (the same probe returns 50 files for `email_integrations`, so the zero is real).
**Not covered by any of the completion ledger's 87 items**, and — importantly — **not specified by
the 3,010-line email plan either**. This must be designed fresh; "it's in the recovery docs" is
wrong here. Size: **M**.

---

## 5. The lesson worth keeping

**Deleting a file is not decommissioning a system.** The 2026-05-15 source deletion was well
reasoned, correctly attributed and cleanly closed — and it made things worse, because the running
endpoint outlived its source and became an anomaly that a later audit dutifully restored.

Three checks would have caught it, and none is expensive:

1. **When retiring a vendor, undeploy before deleting source.** A sourceless live function is more
   dangerous than a documented dead one.
2. **When a document is reversed, banner the document.** The reversal was written into a *new*
   file three times over. Nobody marked the old one, so the old one kept winning on length and
   detail.
3. **When an audit finds unexplained infrastructure, ask why it is unexplained before restoring
   it.** "No source in any repo" can mean *deployed carelessly* — or it can mean *deliberately
   killed and not finished off*.

---

## 6. Scope note

This backlog covers the **25 dated documents** only. Ten further files in `docs/recovered/` are out
of scope and already classified by `00-READ-THIS-FIRST-corpus-health.md`: seven are foreign
FastMonkey/Monkey1 project content (two byte-identical), `README.md` is a third-party OpenAI
Realtime API demo readme and **not this directory's index**, and `wf1-ots-parity-implementation-229a69.md`
is an undated extraction. They belong to other silos or carry no BSuite requirement. Routing them is
not a BSuite-session action.
