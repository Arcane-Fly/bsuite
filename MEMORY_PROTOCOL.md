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
| `bsuite_session_latest` | `session_summary` | Pointer to most recent session — always overwritten |
| `bsuite_session_YYYYMMDD[a-z]` | `session_summary` | Individual session summaries |
| `bsuite_decisions` | `frozen_facts` | Architecture decisions that must NOT be reversed |
| `bsuite_pending_actions` | `pending_actions` | Work items carried across sessions |
| `bsuite_project_crm7` | `project_state` | CRM7 submodule state |
| `bsuite_project_bsu` | `project_state` | BSU submodule state |
| `bsuite_errors` | `known_issues` | Recurring errors and their fixes |

## Session Start Protocol

Run these three reads before ANY work:

```bash
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

Write to both the dated key (`bsuite_session_20260317a`) AND update `bsuite_session_latest` to point to it:

```bash
# Write dated session
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260317a \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"## Session content...","updated":"2026-03-17T06:00:00Z"}'

# Update latest pointer
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"Latest: bsuite_session_20260317a\nStatus: complete","updated":"2026-03-17T06:00:00Z"}'
```

## Quick Reference

```bash
# Session start — read state
curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest | jq -r '.content'

# After commit — write state
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"Branch: fix/foo\nDone: X (abc1234)\nNext: Y","updated":"2026-03-17T06:00:00Z"}'
```
