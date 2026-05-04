# BSuite Memory Protocol

Cross-session state continuity via QIG Memory API.

## Endpoint

`https://qig-memory-api.vercel.app/api/memory`

No auth required. All values are JSON with `{category, content, updated}`.

## Operations

```bash
# Read
curl -s https://qig-memory-api.vercel.app/api/memory/{key} | jq -r '.content'

# Write
curl -X PUT https://qig-memory-api.vercel.app/api/memory/{key} \
  -H "Content-Type: application/json" \
  -d '{"category":"{category}","content":"{content}","updated":"{ISO timestamp}"}'

# Delete
curl -X DELETE https://qig-memory-api.vercel.app/api/memory/{key}
```

## Key Naming Convention

All bsuite keys prefixed `bsuite_` to avoid collision with other agent keys.

| Key | Category | Purpose |
|---|---|---|
| `bsuite_session_latest_v2` | `session_summary` | **Active pointer** to most recent session — always overwritten. Use this, not `_latest`. |
| `bsuite_session_latest` | `session_summary` | **⚠️ DEPRECATED** — server-side HTTP 500 on PUT (diagnosed 2026-05-04). Read-only fallback. See §API Bug Notice. |
| `bsuite_session_YYYYMMDD[a-z]` | `session_summary` | Individual session summaries (canonical content lives here) |
| `bsuite_decisions` | `frozen_facts` | Architecture decisions that must NOT be reversed |
| `bsuite_pending_actions` | `pending_actions` | Work items carried across sessions |
| `bsuite_project_crm7` | `project_state` | CRM7 submodule state |
| `bsuite_project_bsu` | `project_state` | BSU submodule state |
| `bsuite_errors` | `known_issues` | Recurring errors and their fixes |

## Session Start Protocol

Run these three reads before ANY work:

```bash
# Primary pointer (use this)
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest_v2 | jq -r '.content'
# Fallback if _v2 is empty (reads stale content from the broken _latest key)
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest | jq -r '.content'
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_pending_actions | jq -r '.content'
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_decisions | jq -r '.content'
# For crm7 work:
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_project_crm7 | jq -r '.content'
```

## Continuous Memory Writes

Write immediately after every:

- Commits pushed
- Architecture decisions made
- Build/deploy results
- Bug fixes (error + root cause + fix)
- Dependency changes
- Blocked items discovered

**Do NOT wait until session end.** Memory written mid-session prevents work loss if the session is cut short.

## Session Write Template

```markdown
## Session YYYY-MM-DDx

### Context
Working on: [project]  Branch: [branch]  Task: [what]

### Completed
- [item + commit SHA]

### Pending
- [item — why not done]

### Decisions Made
- [decision — reasoning]

### Errors Encountered
- [error] → [fix]

### Blockers
- [blocker]
```

Write to both the dated key (`bsuite_session_20260317a`) AND update `bsuite_session_latest_v2` to point to it:

```bash
# Write dated session (canonical content)
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260317a \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"## Session content...","updated":"2026-03-17T06:00:00Z"}'

# Update latest pointer (use _v2 — NOT _latest, which is broken)
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest_v2 \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"Latest: bsuite_session_20260317a\nStatus: complete","updated":"2026-03-17T06:00:00Z"}'
```

## Quick Reference

```bash
# Session start — read state (use _v2; fall back to _latest if _v2 is empty)
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest_v2 | jq -r '.content'

# After commit — write state (use _v2 only; _latest PUT returns HTTP 500)
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest_v2 \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"Branch: fix/foo\nDone: X (abc1234)\nNext: Y","updated":"2026-03-17T06:00:00Z"}'
```

## API Bug Notice

**Diagnosed 2026-05-04 during TP-04 planning session (see `bsuite_session_20260504a`).**

The `bsuite_session_latest` key is **server-side corrupted** on the QIG Memory API:

- `PUT /api/memory/bsuite_session_latest` returns **HTTP 500** with body `Unexpected end of JSON input`, regardless of payload shape or size.
- `GET /api/memory/bsuite_session_latest` still returns the last successfully-written content (stale, pre-bug).
- The bug is **specific to this key name**. Probed during diagnosis: `bsuite_session_20260504a` and `bsuite_session_latest_v2` accept the same payload and return HTTP 200.

### Workaround

All session pointer writes now go to **`bsuite_session_latest_v2`**. Reads should try `_v2` first and fall back to `_latest` only if `_v2` returns null (transition period):

```bash
LATEST=$(curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest_v2 | jq -r '.content // empty')
if [ -z "$LATEST" ]; then
  LATEST=$(curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest | jq -r '.content')
fi
echo "$LATEST"
```

### Resolution Path

1. File an issue against the QIG Memory API repo to unstick the `bsuite_session_latest` key (likely a corrupted stored value that crashes the JSON parser on the write path).
2. Once unstuck, either (a) canonicalize `_v2` permanently and deprecate `_latest`, or (b) migrate `_v2` content back to `_latest` and remove `_v2`. Update this document accordingly.
3. Until resolved, **always use `_v2` for writes**. Never attempt to write `_latest` — it will HTTP 500 and waste a round-trip.

### Do NOT attempt

- DELETE + re-PUT on `_latest` does not work (tested — PUT still 500s after DELETE returns 200).
- Alternate content-types, payload minification, and `--data-binary` vs `-d` all produce the same 500.
- The bug is on the server's write handler for this specific key, not a client-side issue.
