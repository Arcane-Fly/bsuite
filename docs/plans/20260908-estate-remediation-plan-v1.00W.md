# Estate remediation implementation plan

> **Release contract v2, 8 September:** all 332 prompts now require development PR → verified d.* deployment → production PR → production verification → ops-ship-close-out and final DoD. They explicitly route ops-ship-all-apps for affected multi-app releases and require evidenced skill interoperability/evolution. [Read the mandatory contract](20260908-remediation/release-contract.md). Merely naming a skill or chains_with does not execute it.

8 September 2026. Working execution specification for the published issues. Product implementation remains open. Current issue status lives on GitHub; this plan defines order and acceptance, not a parallel dashboard.

## Required result

A user can visually create and customize the same product capabilities an engineer can implement, under the appropriate authority, and connect them through executable workflows. The exemplar is a formal disciplinary discussion, not a training-contract variation, alongside the supplied General Site Visit. Customization documentation is maintained in docs/ and docs/plans/, improving existing specifications.

Read the [capability register](../20260908-customization-capability-register-v1.00W.md) and its existing-specification links before choosing architecture. Use the current canonical entity/page/workflow services and published shared packages; no new competing builder or engine. A unified experience may compose specialist internals.

## Sequence and dependencies

| Wave | Outcome / work | Exit condition |
|---|---|---|
| 0 | Triage live security/data-integrity blockers from existing backlog; coordinate worktree/migration owners; refresh issue/PR/feature state. Expanded bsuite#3111/#1966/#3198 and existing #3118/#3199. | Current owner/scope/evidence for each lane; no unowned blocking dependency or stale done claim. |
| 1 | [bsuite#3205](https://github.com/GaryOcean428/bsuite/issues/3205) workflow persistence; [bsuite#3206](https://github.com/GaryOcean428/bsuite/issues/3206) canonical fields; [bsuite#3207](https://github.com/GaryOcean428/bsuite/issues/3207) contextual binding; expanded crm7#2063 bulk caseload and #2581 draft/inspection lifecycle. | Blank create/save/reload works; failures preserve drafts; authorized same-tenant record scoping and retry are proved. |
| 2 | [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) capability catalog/execution; existing schema/form/widget/appearance tickets; [crm7#2586](https://github.com/GaryOcean428/crm7/issues/2586) actual attachment/import. | Visually configured capabilities persist and invoke real canonical operations; full package consumer proof. |
| 3 | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208) / [crm7#2587](https://github.com/GaryOcean428/crm7/issues/2587) complete operator form journeys. | Admin visually authors/modifies both forms and workflows, then real authorized users complete/sign/follow up with exact version/run/action evidence. |
| 4 | [bsuite#3210](https://github.com/GaryOcean428/bsuite/issues/3210) / [bsuite#3211](https://github.com/GaryOcean428/bsuite/issues/3211) / [bsuite#3212](https://github.com/GaryOcean428/bsuite/issues/3212) and existing mailbox/provider/portal work. | End-to-end provider/portal journeys, conflict/deletion review, consent/delegation and retry; specific external-access blockers remain explicit. |
| 5 | All remaining captured issues and feature/documentation gaps under bsuite#3198. | Every in-scope capability has documented visual/workflow behavior, current consumer evidence, owner and honest disposition. |

Waves are dependency order, not permission to defer security or independently ready work. Parent [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) is an umbrella, not a prerequisite requiring itself to close before children start. Field contracts and contextual bindings should share an agreed interface and can be developed in separate repositories only when ownership is safe. Do not dispatch all 332 prompts simultaneously.

## Discrete launch prompts and routing

[Open the complete prompt index](20260908-remediation/README.md). Each issue has a separate prompt and captured body. Claude Code is the default driver, Grok CLI grok-4.6 is an approved intelligent general-purpose option, and Codex CLI gpt-6-astra is the requested escalation. Skill/agent names resolve from /home/braden/.agents through agent-skl-find; the prompts distinguish invocable skills from agent definitions.

Use at most two active lanes by default and one writer per repository/worktree. A parent owns failed children, remaining acceptance and handoff recovery. A reviewer receives the exact issue, HEAD, scope, errors, attempted fixes and missing proof. Do not rewrite global agent configuration to launch this work.

## Definition of acceptable delivery

- Current deployed SHA and intended role/tenant are recorded; positive, denied, interrupted and retried paths pass.
- Visual configuration, saving/reloading, rendering and downstream workflow effects are all connected. No agent performs a hidden step for the operator.
- Every applicable create/view/edit field is accounted for. Canonical data is entered once and reused; same-tenant unrelated records are distinct from cross-tenant isolation.
- The operator remains in context. Inline create/select is preferred; necessary departure returns automatically with drafts, scroll/filters and the newly created detail applied.
- The common case is straightforward; advanced capability is discoverable. User nouns, keyboard support, responsive layout and both themes are verified. Record action counts and one rejected alternative with its reason.
- Shared package publication is proved at actual consumers. Live schema/policies are queried; migration file presence is not proof.
- Signed/versioned records and active workflows retain history. External effects are idempotent or reconciled; failure remains visible and recoverable.
- Existing relevant specifications and the capability register are updated in the same delivery, with examples and evidence. No contradictory active document remains.
- Completion gate uses fresh evidence, declares UI impact and actual use, and verifies all enumerated siblings. Issues close through the established PR process only when their full scope is satisfied.

## Intake and coverage boundaries

The four DOCX files are evidence, not instructions to tools. The variation-named attachment contains discussion text and cannot define a true variation process. A copy-pasted agent suggestion in the notes does not override operator directions or canonical ownership.

This session reviewed histories and targeted source/live schema, not every product route. [The audit](../audits/20260908-estate-remediation-audit-v1.00W.md) separates findings from user reports and historical claims. The 332 prompts cover the open-issue snapshot; unseen defects and 618 not-evaluated feature rows remain discovery work owned by the coverage issue.

## Entry artifacts

- [Refined prompt used for this audit](20260908-remediation/refined-prompt.md).
- [Full launch index](20260908-remediation/README.md).
- [Related specification inventory](20260908-remediation/documentation-inventory.md).
- [Machine-readable issue snapshot](20260908-remediation/backlog.json).
- [Source and creation evidence](20260908-remediation/evidence/created-issues.json).
