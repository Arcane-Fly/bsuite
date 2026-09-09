# [P1][visual-authoring] Build disciplinary discussions and general site visits visually, then run signatures, follow-ups and HR escalation

https://github.com/GaryOcean428/bsuite/issues/3208

Snapshot updatedAt: 2026-09-08T05:23:38Z. Open at capture; re-read live.

## Why this issue exists
The operator could not create the supplied forms visually. Success is a general, reusable form-and-workflow capability demonstrated by these documents, not two hardcoded screens. The Record of Discussion is a **formal disciplinary record**. Training-contract variation is a separate process and must not share its identity by assumption.

## Supplied acceptance inputs
- `GTO_FRM_000 - Apprentice and Trainee Record of Discussion Form.docx`: 33 text paragraphs. Person, year, trade, visit date, field officer, host, meeting type (formal/informal/performance/welfare/other), attendees, site address; reason/details/summary/apprentice response; agreed actions and follow-up date; apprentice, host and GTO representative signatures, printed names and dates.
- `GTO_FRM_010 - Apprentice and Trainee Site Visit Form - General.docx`: 52 paragraphs. Same identifying context, visit type/address; 14 apprentice questions (engagement/tasks/progression/supervision/welfare/training plan/off-job/WHS/PPE/emergency/incidents/host duties/hours/completion); yes/no and explanations; 6 host questions; concerns, PPE/support/intervention/follow-up; the three signature groups.
- The variation-named attachment has the same discussion text as the Record of Discussion. Flag it in intake; no variation-specific fields can be derived from it.
- Current CRM7 site-visit action form is in `src/pages/field-officers/actions/create.tsx`; it exposes a fixed schema and review controls. Existing form layouts and workflow canvas must be reused and completed, not replaced with a separate template engine.

## Required vertical slice
Visually choose existing record context → create or reuse form → arrange headings/fields/repeating actions → bind canonical values → define conditional questions and validation → select access and signature participants → connect workflow → preview/publish → complete and sign → create assigned dated work → optionally escalate to HR → review outcome and audit history from the originating record.

An operator must be able to modify the form and the process after initial delivery, with no code/JSON/SQL/agent assistance. A visual draft can be saved before every relationship is fully configured; publishing must explain unresolved mandatory bindings.

## Workflow requirements
- [ ] Form submission and approval/signature events trigger the configured process with linked person, host, placement and source document IDs.
- [ ] Discussion: explicit confidential classification and role-restricted HR escalation selected by an authorized person or configured rule; record apprentice response and agreed actions. Do not let an AI summary decide disciplinary consequences or confidentiality implicitly.
- [ ] Site visit: answers can open a WHS/support action, schedule follow-up or escalate; concerns are not erased by selecting a green overall status.
- [ ] Each action has responsible user/role, due date, recurrence where chosen, notice, completion evidence and a link back to the source. Reuse the recurrence work in GaryOcean428/crm7#2577; verify deployment and generated tasks, not just saved recurrence JSON.
- [ ] Signature blocks derive authorized parties, preserve the exact signed version and dates, allow pending/refused/cancelled states, and do not expose disciplinary content to an unrelated host or general staff.
- [ ] Human tasks, delays, branches, retry, cancellation and escalation persist as real workflow state. A failed notification does not lose the form or silently mark an action delivered.
- [ ] Print/PDF export and the on-screen form contain the same version, answers, signatures and context; later template edits do not rewrite completed records.

## Validation
- [ ] A nontechnical tenant administrator recreates BOTH forms from blank or reusable primitives, then changes one field, a conditional branch, a recipient and a follow-up rule; published result matches the change.
- [ ] Run each process through the deployed UI. Record linked document/form/version/run/action IDs and reload each step; negative-role tests cover direct API access and signatory substitution.
- [ ] Retry a submission/webhook and resume a interrupted signature: exactly one intended case/action/notice sequence; preserve drafts on validation/network failures.
- [ ] Four viewport widths, both themes and keyboard tests; signature and long-answer sections remain usable. Count intent-to-result actions and remove avoidable page departures.
- [ ] No special-case hardcoded form bypass remains necessary for either scenario. All configuration is inspectable and editable through the same authoring experience.

Owner role: GTO/HR workflow product lead with forms/persistence maintainers. Part of https://github.com/GaryOcean428/bsuite/issues/3204. Depends on https://github.com/GaryOcean428/bsuite/issues/3205, https://github.com/GaryOcean428/bsuite/issues/3207, https://github.com/GaryOcean428/bsuite/issues/3209. Reuse crm7#2435 (signer identity), GaryOcean428/crm7#2577 (recurrence), GaryOcean428/crm7#2581 (inspection workflow), GaryOcean428/crm7#2495 (AI confidentiality), R80.4#231 (shared document/signature lifecycle). No external messages or real disciplinary decisions are authorised by this planning issue.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.

