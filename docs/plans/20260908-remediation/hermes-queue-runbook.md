> **Historical 8 September operating record, superseded for execution on 14 September.** Use [the current kickoff](../20260914-codex-ide-closeout-refined-v1.00W.md) and [current pack index](README.md). Old ownership, quota, model dispatch and scheduling instructions below must not be executed. Existing BSuite schedules remain paused.

# Sequential Hermes remediation execution

The operator authorizes Hermes to coordinate the requisite CLI agents, one issue prompt at a time, after its existing work finishes. Claude Code is the default implementation driver, Grok CLI grok-4.6 a general-purpose worker, and Codex CLI gpt-6-astra the requested escalation. Resolve current flags and skills through agent-skl-find; stale Codex prohibitions do not override this instruction.

## Persistent queue

State: `/home/braden/.codex/visualizations/2026/09/08/01a07f58-73a6-71f2-a57d-5cf3b6b148dc/bsuite-remediation/hermes-queue.json`.
The protected `docs/plans/20260908-remediation/` mirror beside that state contains all prompts and the mandatory release contract. Refresh live issue status and dependencies before dispatch. Closed issues require evidence review, not blind reopening or automatic completion. Record superseded items and dependencies. The initial ordering is provisional; record any evidence-based reorder. The programme issue is last.

## Wait, create, dispatch, verify

1. Discover the existing Hermes Desktop loopback backend without restarting it. Read its supported session.active_list and session.history interfaces. Existing session 20260908_123153_3b4738 (runtime 12ee2a63) must finish its work, including outstanding workers. Idle, a request for input, an interrupted turn, or gateway active_agents=0 alone is not completion. Do not interrupt, submit to, resume, or rebind the operator's existing conversation. Preserve other Hermes jobs.
2. After verified completion, mark external_work_released with evidence. Create one new Hermes session with cwd `/home/braden/Desktop/Dev/bsuite`, source desktop, title `BSuite remediation — sequential release`, close_on_disconnect false, and inherit the configured coordinator model. Persist its returned runtime and stored IDs. This creates a conversation; native window focus is not controlled.
3. Dispatch only one eligible prompt. Read the complete prompt, including release-contract v2. Include a unique dispatch marker and tell Hermes to run requisite CLI agents, implement this issue through all release stages, and return evidence. Persist the pending dispatch marker BEFORE sending. A timeout is ambiguous: inspect owned-session history for the marker before any retry. Never send while the owned session is working or a prior dispatch is unresolved.
4. Keep the supported WebSocket transport attached while work runs, or verify Desktop has claimed the owned session. The installed backend reaps orphaned sessions; close_on_disconnect false alone does not prevent this. Use a managed background connection if required and record ownership/PID. Never abandon an active socket merely to end a tool call. Reconnect/resume ONLY the owned conversation when appropriate.
5. Review actual diffs, issue/PR state, development and production deployment identities, verification artifacts, and final skill DoD/operational closeout. A summary, idle status, merged development PR, or auto-closed issue alone is insufficient. Send a focused correction to the same owned conversation when evidence is missing. Do not advance on an unresolved blocker; record it and surface the required action.
6. Mark verified only with evidence references, then send the next eligible prompt in the same new conversation. Continue until the queue is resolved; stop the heartbeat when complete or explicitly cancelled.

## Supported interface and authentication

Installed source of truth: `/home/braden/.hermes/hermes-agent/tui_gateway/methods_session.py`, `methods_prompt.py`, `ws.py`, `server.py`, and `hermes_cli/web_server_chat.py`. Re-read relevant methods before mutations. The current backend was on 127.0.0.1:40691; discover afresh rather than assume the port persists. HTTP uses X-Hermes-Session-Token; `/api/ws` uses token query authentication. Obtain only the owning local backend's HERMES_DASHBOARD_SESSION_TOKEN in memory; never print or persist it, its URL, credentials, or raw exceptions containing them. Never edit Hermes state databases.

JSON-RPC methods: session.active_list (read only); session.history with runtime session_id; session.create with the above fields; prompt.submit with owned runtime session_id and text. Session creation is lazy until first prompt. Read-only active_list does not attach the existing conversation. prompt.submit has no assumed idempotency guarantee and may interrupt a busy session: enforce the queue checks yourself.

## Completion contract

Every prompt requires PREPARED → DEVELOPMENT_MERGED → DEVELOPMENT_VERIFIED → PRODUCTION_PROMOTED → PRODUCTION_VERIFIED → CLOSED_OUT. Invoke the named skills, preserve review/signing/PR requirements, verify affected apps and actual use, update project docs and issues, and capture skill chaining/evolution receipts. Read release-contract.md in full. Instruction validation is not proof an implementation shipped.
