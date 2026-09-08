# BSuite past-week failure audit and remediation

8 September 2026. This delivers an evidence-based remediation backlog and launch pack, not product fixes or certification that every feature has been tested. The operator's latest clarification is controlling: formal disciplinary discussion is distinct from training-contract variation; all product customization must be visually achievable and linked through workflows; all customization documentation belongs in docs/ and docs/plans/, improving existing specifications.

## Findings that explain the repeated shortfall

1. **The delivered unit is smaller than the promised outcome.** A form component, schema migration, graph editor or adapter lands, while its visual configuration, caller, consumer, permission path or downstream action remains unfinished. Copilot's September 4–5 “Document evaluation and validation” conversation repeatedly challenges writing without wiring and basic delivery below the agreed standard. The September 4 customization audit records a real CRM7 layout writer while other consumer adoption remained unproven. Fix: close on a complete user journey plus consumer denominator, not on a PR or exported component.
2. **Customization has several representations without one complete user experience.** Page/widget canvas, form layout, entity/schema configuration, data workspace, branding and workflow graph cannot be substituted for one another. A form writer does not prove widget authoring. The July 3 approved plan already specifies add-or-create-or-warn and in-context binding; the September 8 report still cannot make a useful person-scoped placements card. Fix: complete the canonical shared configuration and record-binding contracts with a consistent visual entry, inspector and executable workflow connections.
3. **Validation measures a proxy for the real risk.** Current workflow code sends explicit null while the live column rejects null; comments claim definition/version creation together while separate writes can fail between them. Historical sessions also record passing shallow tests, wrong search predicates and green checks tied to an older commit. Fix: real contract tests, deliberate failing conditions, correct caller/consumer tests, and deployed role-based save/reload/run evidence.
4. **Partial fixes are mistaken for class closure.** Single assignment is not bulk caseload transfer; a generic tenant table is not current-person history; an individual fixed page does not cover shared consumers. Fix: enumerate routes, dialogs, factories and consumers independently, assign one class owner, and verify all siblings before closure.
5. **Context and ownership are lost between models and sessions.** Hermes cron loops repeatedly report failed gates without resolving the owning task; Copilot's integration conversation loses the original integration programme and offers to continue after explicit direction. Requests are restated and fresh plans replace unfinished delivery. Fix: one canonical issue per requirement, parent-owned recovery, discrete self-contained prompts and a handoff carrying current SHA, attempted fixes and remaining acceptance.
6. **Documents have competing status claims and stale operational implications.** An approved July plan can be treated as new design; a September 3 zero-writer statement can erase September 4 progress; a migration ledger can be mistaken for live schema. Fix: use dated records as evidence, keep current issue/runtime status separate, add currency links and update applicable specifications in the same change.
7. **Concurrent work makes cleanup and validation unsafe.** Shared checkout work can move under a review, stale green results survive a changed HEAD, and untracked deliverables can disappear. An early audit draft vanished during this session while other lanes changed the checkout; this does not establish who removed it. Fix: isolated worktrees, one writer per repo, ownership-aware cleanup and commit-bound evidence. Existing bsuite#3118/#3199 retain that work.

These are cross-tool patterns, not a ranking of model intelligence. A stronger model helps difficult reasoning, but it cannot replace correct scope, real evidence and accountable completion.

## Evidence scope and limits

Window: 1 September 2026 00:00 Australia/Perth through the 8 September scan cutoff (05:11:53 UTC for the broad history census). Some historical threads cited in notes predate the window and are context only.

| Source | Coverage captured | Interpretation |
|---|---|---|
| Hermes | 139 BSuite-matching sessions, 6,477 message rows: 45 CLI / 2 desktop / 92 cron | Census plus targeted failure/correction reading. Not 139 independently audited incidents. |
| Claude Code | 25 matching top-level sessions across 11 project directories, 1,842 user-text envelopes; zero malformed lines in that scan | Includes machine-wrapped user envelopes; not a count of human complaints. Nested subagent transcripts were not exhaustively reread. |
| Copilot | VS Code BSuite workspace: two substantive conversations, 59 request envelopes (19 + 40) | CLI-only search missed these; terminal notifications are included in the envelope count. |
| Supplied notes | 423 extracted text paragraphs, 104 embedded images; September 6 comparison adds 21 paragraphs and replaces one wording | Text and the recorded notes-cycle comparison were audited. This was not a fresh visual reproduction of every screenshot or every UI route. |
| Three supplied forms | Discussion 33 paragraphs; variation-named file 33 identical extracted text paragraphs; general visit 52 | Different binary files; identical discussion text is an intake mismatch, not proof discussion means contract variation. |
| GitHub | Seven private repositories; open issue bodies captured and refreshed; new/updated issues reread for the pack | Current snapshot, not immutable backlog size. Recent closed fixes were checked selectively where relevant. |
| Product | Targeted source/caller/consumer traces and a read-only live workflow-column catalog query | No fresh end-to-end product journey was executed in this audit. User reports are labeled as such; no product completion is claimed. |

Copilot source conversations:
- VS Code session 4dbd49e4-957d-4993-aac7-708a8a51b7cf, **Document evaluation and validation**, includes explicit writing-without-wiring, lost scope and UI language corrections.
- VS Code session 936c315f-fd75-4f36-8a21-5644ebd0612f, **Claude code sessions email integration**, includes the September 3 calendar/booking/maps/consent requirements and later complaints about unconsumed components.
- Hermes examples 20260903_121604_19cd60 and 20260903_122728_fd3fe4 concern green-check reliability/current-HEAD evidence. The broad census is reproducible from the retained source-path metadata.
- An initial delegated history pass missed VS Code Copilot and had narrower Claude coverage. Its preliminary conclusions were not accepted unchanged: the parent widened the search and reconstructed the Copilot event logs. Grok 4.6 review did not complete after CLI prompt offload/MCP startup/max-turn failure. This is a parent-reviewed audit, not an independent-model approval.

Private raw conversations and document screenshots are not copied into GitHub. Evidence manifests retain source identities/counts/hashes; original documents remain in Downloads.

## Current technical findings with bounded claims

| Finding | Evidence boundary | Remediation |
|---|---|---|
| Workflow draft creation sends ai_context null | CRM7 local service and shared package; live information_schema reports NOT NULL with empty-object default. Explicit null bypasses that default. No production mutation made. | [bsuite#3205](https://github.com/GaryOcean428/bsuite/issues/3205) |
| Different create/view/edit field contracts | Separate placement schemas and reported host owner/rating failure. Host edit DOES contain safety_rating; the rate-card edit fix was recently merged. Reproduce exact failing route before adding duplicate controls. | [bsuite#3206](https://github.com/GaryOcean428/bsuite/issues/3206) |
| Generic widget lacks current-record filter | EntityTableWidget's generic table path lacks record relationship; related FK cards already exist. User's mixed-contract report is not yet proof of cross-tenant disclosure. | [bsuite#3207](https://github.com/GaryOcean428/bsuite/issues/3207) |
| Jodie input reports attachment but forwards filename | Mounted AIInputArea handler has filename text/toast and no byte upload in that path. Its equivalence to every reported training-plan failure needs deployed reproduction. | [crm7#2586](https://github.com/GaryOcean428/crm7/issues/2586) |
| Forms and workflow connections incomplete for operator outcome | User cannot visually build required forms; existing renderer/engine foundations must be completed. | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208) / [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) |
| Site visit recurrence recently changed | crm7#2577 closed through #2579; follow-up controls now exist in source. Full visit/form/signature/action journey is a separate verification/remediation scope. | [crm7#2587](https://github.com/GaryOcean428/crm7/issues/2587) |
| Calendar/booking/maps programme remains a requirement | Recovered explicit Copilot requirements; calendar service and interview ICS exist. The separate named implementation checkout/plan was unavailable. New tickets require reconciliation, not assumed absence. | [bsuite#3210](https://github.com/GaryOcean428/bsuite/issues/3210) / [bsuite#3211](https://github.com/GaryOcean428/bsuite/issues/3211) / [bsuite#3212](https://github.com/GaryOcean428/bsuite/issues/3212) |

The feature index recorded 661 rows (618 not-evaluated, 40 in-progress, 3 approved). Entity-CRUD rows counted 146 (CRM7 123, BSU 14, conduit 9), which can omit embedded dialogs/wizards; bsuite#3198 must reconcile independent enumeration. The operator verdict register's historical labels are not fresh live proof.

## September 8 notes traceability

| New report/requirement | Canonical remediation |
|---|---|
| Widget centre only entities / unusable person placements widget / confusing selector / mixed training-contract context | crm7#2488/#2489 and [bsuite#3207](https://github.com/GaryOcean428/bsuite/issues/3207) |
| All records create/view/edit differ; host owner/safety rating | [bsuite#3206](https://github.com/GaryOcean428/bsuite/issues/3206); credit crm7#2565, reproduce rather than duplicate existing safety field |
| Schema builder unintuitive | crm7#2460/#2459 and [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) |
| Capacity assessment prevents saving placement; schedule safety work instead | Expanded crm7#2581: draft vs activation, canonical assessment workflow, no fake safety pass |
| Broken site-visit form / schedule layout / follow-up dates and recurrence | [crm7#2587](https://github.com/GaryOcean428/crm7/issues/2587) / [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208); credit crm7#2577 |
| Training-plan Jodie upload failure | [crm7#2586](https://github.com/GaryOcean428/crm7/issues/2586) |
| Bulk caseload missing | Expanded crm7#2063: canonical assignment model, shared supervision, bulk add/remove/transfer |
| ai_context failure / cannot create workflow | [bsuite#3205](https://github.com/GaryOcean428/bsuite/issues/3205) |
| Barren canvas / all linked through workflows | [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) |
| Cannot visually recreate disciplinary discussion and general visit forms | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208), distinct from contract variation |
| Documentation belongs in docs/ and docs/plans/ | Capability register, linked existing plans and expanded bsuite#3198 |
| Date/Page markers in DOCX | Document structure; no artificial implementation ticket |

## Existing and outstanding work

Created **11 detailed issues** and expanded **five canonical issues** (crm7#2063/#2581; bsuite#3111/#3198/#1966), preserving existing bodies. No existing issue was closed by this audit. The refreshed pack contains **332 discrete prompts**: bsuite 103, crm7 158, business-suite-unified 35, conduit 8, braden 6, R80.4 13, throughput 9.

Every open issue is retained, including auth/RLS, migration/runtime correctness, styling, mail/integrations, R8 financial/domain work, portals, payroll, imports/exports, deployment checks and cleanup. This is completeness of the captured open-issue inventory, not proof that all possible defects have been discovered. The unverified feature/documentation rows are explicitly owned by #3198 and the parent programme; they must not disappear behind the prompt count.

See [implementation sequence](../plans/20260908-estate-remediation-plan-v1.00W.md), [customization register](../20260908-customization-capability-register-v1.00W.md), and [each issue's launch prompt](../plans/20260908-remediation/README.md).

## Verification approach for implementers

Prefer assertions against what users see and the actual side effect, with isolated role/tenant contexts; Playwright's [official best practices](https://playwright.dev/docs/best-practices) support that approach. Graph editing/connection logic is distinct from the application execution surrounding it; see [React Flow computing flows](https://reactflow.dev/learn/advanced-use/computing-flows). Neither library demonstrates BSuite's runtime or permissions automatically.

This audit changed documentation and issue records only. No application source, runtime configuration, deployment, production data or external communications were changed.
