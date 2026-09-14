# BSuite remediation execution pack

Start with the [14 September Codex IDE kickoff](../20260914-codex-ide-closeout-refined-v1.00W.md), then the [mandatory release contract](release-contract.md). The kickoff requires an independent DoD audit of the preceding reconciliation before any claim that cleanup or convergence is complete.

The current backlog contains **370 issue rows and 370 matching prompts**. The historical source packs recorded 333 then 338; the later canonical queue held 340, and 30 additional rows plus nine related-issue links reconciled the missed live issues. None of these numbers is a completion count. The approximate historical 380 remains unverified. The 40 operator-feedback groups and 661 feature-index rows are separate denominators.

Codex in the IDE coordinates this phase. Claude is unavailable. Do not dispatch external Codex CLI workers. Use deterministic scripts for mechanical tasks, low-tier models for bounded classification, standard-tier models for scoped implementation, and high/frontier only for justified hard planning or independent review. Verify actual Grok/Gemini/Qwen model IDs and access before dispatch; never silently fall back to paid API usage. Cap two active workers by default with one writer per worktree. Read the current [IDE kickoff](../20260914-codex-ide-closeout-refined-v1.00W.md) and the parent remediation-execution rule before acting.

Use [backlog.json](backlog.json) for row-to-prompt mapping; refresh each live issue and its acceptance evidence before dispatch. Shared OAuth 2.1 PKCE, protected production PRs, paused schedules, Monkey Projects, Ollama and Unsloth boundaries remain mandatory. Operator Throughput overflow and Jodie identity findings belong to throughput-486 and throughput-479 and their linked sibling rows.

The original dated evidence remains under [evidence](evidence); it is historical evidence, not current launch authority. [Queue runbook](hermes-queue-runbook.md) provides historical mechanics; apply the current ownership and model rules above. Run `python3 verify_prompt_contract.py` to check prompt integrity and row bijection. This verifier cannot certify product completion.
