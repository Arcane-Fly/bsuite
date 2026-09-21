Risks and corrections, based only on the stated proposal:

1. Deterministic counters drift from reality. GitHub counts fetched by script can be stale or rate-limited mid-run; a worker acting on a stale queue reads the wrong state. Correction: every count recorded in the checkpoint with fetch timestamp and HEAD commit SHA; stale or 429 responses count as a scripted failure with logged next action, never a silent retry.

2. Bounded Ollama extraction can fail mid-output. Partial extraction results written before quota exhaustion could be mistaken for complete. Correction: extraction output is all-or-nothing — verify output hash before it enters any checkpoint; on failure, discard partials and record quota as the blocking condition.

3. "Frontier supervisor for escalations" can become a shadow architect. Without a fixed boundary, unresolved work gravitates to the strongest model. Correction: pre-write the escalation prompt template; supervisor output is advisory, the single owner ratifies or rejects, and each checkpoint logs which model produced what.

4. Publish concurrency across 14 workflows. Two workers (or a retried workflow) can race npm dist-tags under Arcane-Fly/bsuite. Correction: serialize publishes behind one owner-approved dispatch gate; verify publisher identity and record provenance in the checkpoint before and after each run.

5. UX acceptance has no defined artifact. Separating issue-closed from deployed acceptance only holds if acceptance is a durable object. Correction: acceptance = hashed evidence bundle (UX checklist version, logs, deployment identifier) referenced by the checkpoint; closing an issue without that hash is invalid.

No files inspected; this reviews the proposal text only.
