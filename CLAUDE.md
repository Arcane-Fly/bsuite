<!-- bsuite-remediation-rules:start -->
## Remediation execution rules (2026-09-09)

@.agents/rules/remediation-execution.md
This current contract governs remediation execution where older workflow defaults conflict.
<!-- bsuite-remediation-rules:end -->

# BSuite

**[`AGENTS.md`](./AGENTS.md) is the rulebook — read it before your first edit.** It carries the
working doctrine, the ten tripwires, and the index of where every detail lives. Nothing is duplicated
here, so don't work from this file alone.

Claude-specific:

- Prefer the `bsuite-*` skills over re-deriving context (`bsuite-context`, `bsuite-brand-system`,
  `bsuite-page-grid-layout`, `bsuite-rls-authz-red-team`, `bsuite-ship-visual-promote`, …).
- Cross-session state is in the qig-memory MCP under the `bsuite_` prefix — start with
  `memory_list({ keysOnly: true, prefix: "bsuite_" })`.
