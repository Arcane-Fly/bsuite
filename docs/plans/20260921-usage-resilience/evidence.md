# Evidence and limits — 21 September 2026

Task: usage-resilient continuation and new-task handoff. Application code and production not changed. Source queue not mutated.

## Verified

- Live GitHub remote/API: Arcane-Fly/bsuite; private, default main. All 14 requested publisher files exist on main; independent audit compared their blob SHAs with local HEAD.
- Publisher configs: id-token write, Node 24.14.0, explicit dist-tag selection, no active NPM_TOKEN/NODE_AUTH_TOKEN. Stale owner comments corrected across all 14; workflow-canvas manual command corrected. No publish dispatched.
- Live Actions enabled/allowed_actions=all. Paginated workflow list returned no publish-* entries; direct publish-theme.yml lookup returned HTTP 404. Registration remains unresolved, not a demonstrated npm credential failure.
- Migration task final: BSU f7a99b45, Braden 201d7cc7, Conduit 9bcb0f1 merged to development; verified worktrees cleaned. Parent Arcane-Fly/bsuite#4 remains pending private sibling read credential. It reported SEND_BACK rather than estate completion.
- Hermes live Ollama catalogue queried using existing credential without exposing it. GLM 5.3 Flash no-tool review: exit 0, 15.66 sec, 744 input + 917 output tokens, actual provider ollama-cloud, actual model glm-5.3-flash, completed true. Cost unknown. Receipts: [usage](ollama-review-usage.json), [execution](ollama-review-receipt.json), [response](ollama-review.md).
- Snapshot script live: 384 rows; 350 pending/21 in progress/13 completed; GitHub 359 open/17 closed/8 no URL. Second cached run: zero changed rows, no new remote fetch. Thirteen regression tests cover denied/missing sources, stale cache failure, closure vs acceptance, migration mapping and duplicate IDs.
- Native Codex context-hook invocation receipt at 12:48 AWST: PreToolUse, enrolled true for this audit task. Context refresh at 12:39: three receipts each for audit and accountability, zero failures. This does not enroll a future task.
- External supervisor active since 07:48 AWST; heartbeat fresh. Context-refresh and accountability timers active. Last oneshot executions exit 0. Passive-context tests: 6; attention/session tests: 31; Hermes reviewer tests: 25, all passed.

## Handoff readiness boundaries

- External supervisor is still pinned to ended Claude b6ddc034. New application owner must be accepted and explicitly bound; future session ID is not yet known. This audit is not taking application ownership.
- Codex five hook registrations are named/status-labelled, synchronous, timeout 5, no erroneous Bash matcher. They provide recall. They do not prove native Claude-equivalent write enforcement. New-task kickoff requires verified enrollment/delivery and supported adapter or explicit review fallback before application mutations.
- Claude hooks retain their existing gates. Network/model review remains in background services; short local recall/gate checks stay foreground. No guard/trust records were disabled or fabricated.
- Current SDK/source and official docs were checked. Context7 was quota-exhausted; primary web sources were used.
- The earlier response linked docs/OUTSTANDING.md, which is absent from current origin/development. Use the generated central progress report and canonical queue instead. The retired Pages dashboard was not resurrected.

## Acceptance scope

This change delivers local reporting, publisher instruction corrections and a reviewed continuation packet. No production UX acceptance, package publish, cross-repository credential fix, future-session binding, or full estate completion is claimed. Those remain explicit executable obligations in the kickoff.

Independent review corrections: preserve content-addressed observation history; compare owner/title/URL as well as status; detect removed rows and source-health changes; fail incomplete source coverage; refuse concurrent report writers. Queue ownership/liveness remains outside the report and mandatory in kickoff. No volatile per-tick clock was found in the owner-activity fingerprint, so that shared hook was not changed speculatively.

Independent reviewer approved the bounded reporting/handoff scope after corrections. Its remaining hardening suggestion was also applied: ambiguous multiple issue URLs fail explicitly rather than choosing insertion order.
