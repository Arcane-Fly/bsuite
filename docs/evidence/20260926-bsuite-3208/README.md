---
kind: record
authority: none
owner: bsuite
---

# bsuite#3208 — production evidence pack (26 September 2026)

This is a dated record, not a live document. It is the durable copy of the evidence the #3208 lane
(Claude session `ef2aae85`) gathered while verifying criteria C1–C9 on production (`crm.crm7.app`). It was
kept here so the evidence does not live only in a session scratchpad. The capability register's
[26 September section](../../20260908-customization-capability-register-v1.00W.md#26-september--3208-c1c9-deployed-tested-on-production)
is the live summary.

**Tenancy (D9).** All production walks ran in **Demo Organisation** (`aaaaaaaa-0000-0000-0000-000000000001`).
bsuite Platform was also used, as the receiving organisation for the C9 share. No walk touched a client tenant.

- **Reason:** the flows create disciplinary Records of Discussion, confidential HR escalations, signatures
  and site-visit findings. Fabricating those in a paying client's tenant is not acceptable (FutureBuild
  data-preservation ruling).
- **How it was recorded:** as a D9 waiver in the round-4 gate, and in `d9-declaration.txt`.

**Database tests** were rolled-back transactions. Nothing they did was committed.

**Where the screenshots are.** This repository ignores `*.png`, so the 29 screenshots named below are not
committed. They are attached to [BRA-47](https://linear.app/braden-pty-ltd/issue/BRA-47) as
`bsuite-3208-screenshots-20260926.tar.gz`: attachment `85e49c0b-42ac-4a20-b64c-2a2b6ab9ad39`, sha256
`bca5253bd25ec68726ab82178aa7ca0ab56d6e2b93b78620fbf78aa3c18dd4fe`. The file names in the tables match the archive.
Everything else here (walk logs, criterion evidence and review verdicts) is committed as text.

## Independent reviews

| Round | Verdict | File |
|---|---|---|
| 1 | SEND_BACK | `review-round1-sendback.json` |
| 2 | APPROVE_PENDING_FINAL_WALK | `review-round2-pending.json` |
| 3 | SEND_BACK: C1–C9 verified; C10 regression open | `review-round3-sendback.json` |
| 4 | **APPROVE**: C1–C9 verified; all round-3 items closed | `review-round4-approve.json` |

All four rounds used claude-fable-5-1 as a read-only completion-enforcer. Round 4 finished at
2026-09-26T13:08:06Z.

## Criteria → evidence

| Criterion | Evidence | Screenshots |
|---|---|---|
| C1: nontechnical admin authors FRM_000 and FRM_010 in the deployed UI | `prod-final-walk.txt`, `prod-walk-d2d60eaa.txt` | `c1-rod-builder.png`, `c1-2459-builder.png`, `c1-2459-palette.png`, `prod-final-form-detail.png` |
| C2: conditional visibility and validation evaluated at render | `c2-prod.txt` | `c2-no-shows-followup.png`, `c2-yes-hides-followup.png`, `c2-required-refused.png` |
| C3: signature slot: pending, declined, cancelled | `c3-corrected.txt` (supersedes the screenshots in `c3.txt`) | `c3-a-pending.png`, `c3-c-declined.png`, `c3-e-cancelled.png`, `c3-slot-in-context.png`, `prod-final-sigslot.png` |
| C4: completed records immutable against template edits | `c4-immutable.txt` | — |
| C5: confidential escalation explicit and role-restricted | `c5.txt` | — |
| C6: workflow runs and actions persist through reload, retry and cancel | `c6-prod-end-to-end.txt`, `c6-retry-ui.txt`, `c6.txt`, `c6-retry.txt` | `prod-final-trigger-card.png`, `c6-prod-task.png`, `prod-runs-form-started-visible.png`, `c6-retry-before.png`, `c6-retry-after.png`, `c6-cancel.png` |
| C7: negative-role and signatory-substitution attempts refused | `c7-substitution.txt` | — |
| C8: confidential case notes readable only by author, caseload FO and HR-confidential holders | `c8.txt`, `c8-review-response.txt` | — |
| C9: share a form or page with one organisation as a copy | `c9.txt` (form), `c9-page-copy.txt` (page) | `c9-page-share.png`, `prod-final-canvas-copy.png` |

## Promotions, migrations and the C10 regression

- **Migrations** 430000–470000 are live, verified by version, name and objects: `migrations-live.txt`,
  `migrations-live-460000.txt`.
- **First promotion:** crm7 main d2d60eaa (`prod-promotion-d2d60eaa.txt`) with parent gitlinks
  (`parent-promotion.txt`).
- **Second promotion:** crm7 main b3f55e2f (`prod-final-walk.txt`).
- **C10 regression.** Theme 1.5.3 dropped `--color-border-strong` and `--color-bg-sunken`. The fix ran:
  - bsuite#3374 → @bsuite/theme 1.5.4 → crm7#2828 → resync crm7#2829 → promotion crm7#2831 → main 55ff6d60.
    55ff6d60 is a GitHub merge commit with two parents.
  - Evidence:
    - `c10-canary-preview-2828.txt`
    - `dcrm-theme-1.5.4-go.txt` and `dcrm-8a7d13d5-go.txt`: peer d.crm walks
    - `resync-2829.txt`
    - `prod-final4-walk-55ff6d6.txt`: production after the fix
    - `before-1.5.4/s147-before.txt`: production control on b3f55e2
    - `c10-gitlink-55ff6d60.txt`: C10 `crm7: 7 == baseline 7`
  - Production screenshots of the fix: `prod-final4-editor-table-{light,dark}.png`,
    `prod-final4-template-controls-{light,dark}.png`.
- **Round-3 evidence hygiene:** `prod-final4-inspector-greyed.png`, `prod-final4-refused-toast.png`,
  `prod-final4-failed-run-tryagain.png`.

## Cleanup (D10)

`cleanup.txt` lists every temporary artefact and the command that removed it. The walk records kept in
Demo are named "Walk check: … (bsuite#3208 …)". They stay because they are immutable completed
submissions (C4/C8), or because the product has no delete control for them.
`d10-workflows-off.png` shows the walk workflows switched off.

## Not in this pack

- **Screenshots.** They are in the BRA-47 attachment described above.
- **Walk scripts and the session scratchpad.** They were disposed of after this copy was made.
- **Credentials.** None appear here: every text file was scanned for tokens, keys and passwords before
  being committed.
