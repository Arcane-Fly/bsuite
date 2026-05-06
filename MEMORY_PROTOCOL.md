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
# ⚠️ After any PUT, verify persistence — see §"Known corrupted keys & mandatory recovery" below.

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

### Known corrupted keys & mandatory recovery (added 2026-05-06)

| Original (corrupted) | Canonical replacement | Symptom |
|---|---|---|
| `bsuite_session_latest` | `bsuite_session_latest_v2` | `PUT` returns 200, value doesn't mutate |
| `bsuite_claude_active_work` | `bsuite_claude_active_work_v2` | same |
| `bsuite_claude_dispatched_agents` | `bsuite_claude_dispatched_agents_v2` | same |
| `bsuite_decisions` | `bsuite_decisions_v2` | after a successful PUT, the GET path began returning HTTP 500 `"Unexpected end of JSON input"`; root cause unconfirmed |

**Mandatory rules for coordination writes** (apply from 2026-05-06 forward; recommended for all writes):

1. **Read-after-write**: after every `PUT`, re-`GET` and assert stored `updated == sent_updated`. On mismatch, retry once to `<key>_v2` and write a tombstone on the original with content string `"CORRUPTED <ISO-date> — canonical is <key>_v2"` (category unchanged).
2. **`prev_sha256` field**: every schema payload SHOULD include `prev_sha256`, computed over the stored `.content` string as returned by the API: `prev_sha256 = $(curl -s $URL | jq -r '.content' | sha256sum | cut -d' ' -f1)`. On first write (GET returns 404 or empty), set `prev_sha256: null`. Unenforced by the API, but readers comparing against their last-known hash catch silent overwrites immediately. Forward-compatible with a future Ed25519 upgrade: `agent_id` becomes the public-key fingerprint, payloads gain a `signature` field.
3. **Optimistic stomp-detection, not CAS**: the `.updated` comparison is advisory — the API has no `If-Match`. A fast writer wins races. Use `prev_sha256` for real tamper-evidence.
4. **Recovery naming rule**: first corruption → `<key>_v2`; if `_v2` corrupts → `<key>_YYYYMMDD`; maintain a `<key>_index` pointer to the current canonical.
5. **Debounce**: agents SHOULD NOT write any single coordination key more often than every 5s.

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
# Verify persistence (Rule #1)
URL=https://qig-memory-api.vercel.app/api/memory/bsuite_session_latest_v2
[ "$(curl -s $URL | jq -r .updated)" = "2026-03-17T06:00:00Z" ] || echo "silent write-drop — retry on ${URL}_v2 or escalate"
```

## Inter-Agent Coordination Protocol

**Added 2026-05-06** during multi-agent audit. The BSuite workspace routinely has ≥2 agents operating concurrently (local Claude Code session + remote Perplexity Computer + occasional Claude Code web sessions). Before this section, coordination was convention-only free-text in `bsuite_claude_active_work` + `bsuite_claude_dispatched_agents` — this codifies a structured protocol using only the API primitives we actually have.

### Reality check — what this API does NOT provide

The Memory API is a keyed blob store. It offers **zero** concurrency primitives:

- **No ETag / If-Match** — writes are last-writer-wins, silently
- **No auth** — any caller with the URL can read or overwrite any key
- **No server-side locks** — locking is a client-side convention only
- **No TTL or expiry** — keys persist forever unless explicitly DELETEd
- **No subscribe / change stream** — agents must poll to notice updates
- **No transactions** — multi-key updates aren't atomic
- **No schema validation** — the schemas below are enforced by client convention only
- **Occasional silent write-drop** — some keys accept `PUT 200` but don't mutate; see the "Known corrupted keys" table above for the live registry and `<key>_v2` recovery convention

Every "lease", "lock", or "claim" below is a convention that cooperating agents agree to honor. A misbehaving or crashed agent can violate any of them; the protocol is designed to **detect and recover**, not to prevent violation.

**Threat model:** defends against crashed cooperators, races, and misconfigured agents writing wrong keys. Does NOT defend against a deliberately malicious agent with the API URL — assume any key can be silently overwritten. Tamper-evidence requires the `prev_sha256` convention in the mandatory-recovery subsection below.

### Coordination key names (reserved)

All coordination keys sit in category `coordination`. Silo prefix (`bsuite_` / `qig_` / `_dev_`) is mandatory per `~/.claude/CLAUDE.md`.

**Silo discovery** (how a cold agent derives its silo) — match `git config --get remote.origin.url` against this literal regex table, in order:

| Regex | Silo prefix |
|---|---|
| `github\.com[:/]GaryOcean428/bsuite(\.git)?$` | `bsuite_` |
| `github\.com[:/].+/(qig\|QIG)[-_].+` | `qig_` |
| _(no match)_ | `_dev_` |

Fallback to CWD basename if no git remote. Env var `MEMORY_SILO` overrides. On ambiguity, REFUSE to write coordination keys and surface to operator. Cross-silo READS are allowed (e.g. a qig agent may read bsuite keys for context); cross-silo WRITES are forbidden without an explicit operator override. Mis-prefixed keys should be tombstoned (`"MISPREFIXED — ignore"`) and the incident logged to `<silo>_incident_<date>`.

**Enforcement helper** — every agent wrapper SHOULD implement (pseudocode):

    writeMemory(key, payload):
      silo = detectSilo()                              # git remote → regex table → CWD → $MEMORY_SILO
      assert key.startsWith(silo), "silo mismatch"
      prior = GET(key)                                 # may be 404 on first write
      payload.prev_sha256 = prior.status == 200 ? sha256(prior.content) : null
      PUT /api/memory/{key} payload
      echoed = GET(key)
      if echoed.updated != payload.updated:
        # silent write-drop — fall through to recovery
        PUT /api/memory/{key}_v2 payload
        PUT /api/memory/{key} {content: "CORRUPTED <now> — canonical is {key}_v2"}
        raise "silent write-drop on {key}; wrote {key}_v2"

| Key pattern | Purpose | Writer |
|---|---|---|
| `<silo>_agent_registry` | Roster of currently-active agents | Any agent on join/heartbeat |
| `<silo>_lease_<resource>` | Exclusive-ish claim on a resource (path, phase, submodule) | Claimant only |
| `<silo>_mailbox_<agent-id>` | Append-only message log for one recipient | Any sender |
| `<silo>_<agent-id>_active_work` | Structured scope declaration (replaces free-text) | Owning agent only |
| `<silo>_<agent-id>_heartbeat` | Liveness ping (optional, for crash detection) | Owning agent only |
| `<silo>_<agent-id>_progress_<task>` | Per-task progress log (append-only by convention) | Owning agent only |
| `<silo>_mailbox_<agent-id>_<ulid>` | Recommended append-only variant (ULID-keyed; overwrite-proof without DELETE) | Any sender |
| `<key>_v2` / `<key>_YYYYMMDD` | Recovery suffix when original is known-corrupted. Readers MUST try suffixed variant first, fall back to unsuffixed. | Recovering agent |

### Schemas (JSON — replaces the free-text markdown pattern)

Every schema carries `schema_version` so readers can migrate without breaking.

**Agent registry** — `<silo>_agent_registry`:

```json
{
  "schema_version": 1,
  "updated": "2026-05-06T02:10:00Z",
  "agents": [
    {
      "id": "claude-code-local",
      "kind": "claude-code",
      "silo": "bsuite",
      "session_key": "bsuite_session_20260506a",
      "joined_at": "2026-05-06T01:30:00Z",
      "last_seen": "2026-05-06T02:10:00Z",
      "scope_claimed": ["packages/auth", "docs/MEMORY_PROTOCOL.md"],
      "mailbox": "bsuite_mailbox_claude-code-local"
    }
  ]
}
```

**Lease** — `<silo>_lease_<resource>` (TTL enforced client-side):

```json
{
  "schema_version": 1,
  "resource": "packages/auth",
  "holder": "claude-code-local",
  "claimed_at": "2026-05-06T02:10:00Z",
  "expires_at": "2026-05-06T03:10:00Z",
  "heartbeat_at": "2026-05-06T02:10:00Z",
  "reason": "WS-4 inter-agent protocol edit",
  "allow_readers": true
}
```

**Mailbox** — `<silo>_mailbox_<agent-id>` (append-only by convention):

```json
{
  "schema_version": 1,
  "inbox": "perplexity-remote",
  "messages": [
    {
      "from": "claude-code-local",
      "sent_at": "2026-05-06T02:15:00Z",
      "subject": "claiming packages/auth for MEMORY_PROTOCOL.md edit",
      "body": "Holding lease until 03:10Z. No consumer-app callback changes.",
      "ack_required": false
    }
  ]
}
```

**Active work** — `<silo>_<agent-id>_active_work`:

```json
{
  "schema_version": 1,
  "agent": "claude-code-local",
  "updated": "2026-05-06T02:10:00Z",
  "parent_dev_head": "221d0bc",
  "phases_owned": ["Phase 3 WS-C", "WS-4 inter-agent protocol"],
  "scope_claimed": ["packages/auth", "docs/MEMORY_PROTOCOL.md"],
  "scope_avoided": ["crm7/**", "R80.3/**", "conduit/**"],
  "counterparty": { "id": "perplexity-remote", "scope": ["submodule feat(auth) pushes", "F2 fix"] },
  "progress_key_pattern": "bsuite_claude-code-local_progress_<task>"
}
```

### Operations (concrete curl)

**Claim a lease** (60-min TTL, heartbeat every ≤15 min):

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXP=$(date -u -d '+60 min' +%Y-%m-%dT%H:%M:%SZ)
URL=https://qig-memory-api.vercel.app/api/memory/bsuite_lease_packages_auth
# Refuse if a live lease exists
EXISTING=$(curl -s "$URL" | jq -r '.content // empty')
if [ -n "$EXISTING" ]; then
  EXP_OLD=$(echo "$EXISTING" | jq -r '.expires_at')
  [ "$EXP_OLD" \> "$NOW" ] && { echo "lease held"; exit 1; }
fi
PAYLOAD=$(jq -n --arg now "$NOW" --arg exp "$EXP" '{category:"coordination",content:{schema_version:1,resource:"packages/auth",holder:"claude-code-local",claimed_at:$now,expires_at:$exp,heartbeat_at:$now,reason:"WS-4"},updated:$now}')
curl -X PUT "$URL" -H "Content-Type: application/json" -d "$PAYLOAD"
# MANDATORY read-after-write (Rule #1): verify the PUT actually persisted
if [ "$(curl -s "$URL" | jq -r .updated)" != "$NOW" ]; then
  echo "silent write-drop — retrying on ${URL}_v2"
  curl -X PUT "${URL}_v2" -H 'Content-Type: application/json' -d "$PAYLOAD"
  curl -X PUT "$URL" -H 'Content-Type: application/json' -d "{\"category\":\"coordination\",\"content\":\"CORRUPTED $NOW — canonical is ${URL}_v2\",\"updated\":\"$NOW\"}"
fi
```

**Heartbeat** — re-PUT the lease every ≤15 min while holding it, bumping `heartbeat_at` + `expires_at`. A missed heartbeat window is the signal other agents use to clobber a stale lease.

**Release**:

```bash
curl -X DELETE https://qig-memory-api.vercel.app/api/memory/bsuite_lease_packages_auth
```

**Send a mailbox message** (read-modify-write; not atomic — see Failure modes):

```bash
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXISTING=$(curl -s https://qig-memory-api.vercel.app/api/memory/bsuite_mailbox_perplexity-remote \
  | jq -r '.content // {"schema_version":1,"inbox":"perplexity-remote","messages":[]}')
UPDATED=$(echo "$EXISTING" | jq --arg now "$NOW" \
  '.messages += [{"from":"claude-code-local","sent_at":$now,"subject":"...","body":"...","ack_required":false}]')
curl -X PUT https://qig-memory-api.vercel.app/api/memory/bsuite_mailbox_perplexity-remote \
  -H "Content-Type: application/json" \
  -d "{\"category\":\"coordination\",\"content\":$UPDATED,\"updated\":\"$NOW\"}"
```

**Compare-and-swap (CAS) convention** — before overwriting a key, re-read it and verify `updated` hasn't moved since your last read. This shrinks but does NOT eliminate the race:

```bash
SEEN_AT="2026-05-06T02:10:00Z"   # from your previous read
CURRENT=$(curl -s https://qig-memory-api.vercel.app/api/memory/<key> | jq -r '.updated // empty')
[ "$CURRENT" != "$SEEN_AT" ] && { echo "stale — refetch + retry"; exit 1; }
# …else PUT the new value
```

### Failure modes

| Failure | Mitigation |
|---|---|
| **Crashed agent leaves stale lease** — holder process dies before releasing; the key persists server-side forever. | Every lease carries `expires_at`. Any agent observing `now > expires_at` is authorised to clobber. Pair with `heartbeat_at` for fine-grained detection (stale heartbeat = lease is dying; stale expiry = lease is dead). |
| **Two agents write simultaneously** — last-writer-wins silently overwrites the other. | CAS convention (above) reduces the window to a single HTTP round-trip; it does NOT eliminate the race. For append-only structures (mailbox, progress logs) this loses messages silently; use per-sender sub-keys (`<silo>_mailbox_<from>_to_<to>`) when collisions matter, so writers never share a key. |
| **API outage / 5xx cascade** — every coordination op fails. | Degrade gracefully: write to `~/.bsuite-memory-cache/<key>.json` locally; on API restore, sync back (last local write wins). Never block primary work on coordination I/O. The existing `bsuite_session_latest` HTTP 500 bug (see §API Bug Notice) is a concrete example — `_v2` exists precisely because of an outage-class failure on a single key. |
| **Silo contamination** — agent writes a `bsuite_*` key during QIG work (or vice versa), silently polluting the other silo. | Per `~/.claude/CLAUDE.md`, the `memory-synapse` sub-agent refuses reads/writes when the active silo is ambiguous. Agents derive silo from CWD + git remote + explicit user mention; if any two disagree, abort the write and surface to user. |
| **Malicious / misbehaving agent** ignores the protocol and overwrites others' keys. | Nothing server-side can prevent this. Mitigation is detective only: every write appends to `<silo>_<agent-id>_progress_*` so tampering is auditable post-hoc. The API publishes `_blob_url` for every key, which can be diffed against blob-storage history. |

### Session-start checklist (every agent, every turn)

1. `GET <silo>_agent_registry` — read active agent list; register self (or update `last_seen`).
2. `GET <silo>_<self>_active_work` — restore declared scope from previous turn.
3. For each resource you intend to touch: `GET <silo>_lease_<resource>`; claim if free or expired, skip if held by a live holder.
4. `GET <silo>_mailbox_<self>` — read any messages from counterparties.
5. Proceed with work. Heartbeat held leases every ≤15 min.
6. On turn end: update `active_work`, release short-lived leases, write session summary.

### Migration from the legacy free-text format

The existing `bsuite_claude_active_work` and `bsuite_claude_dispatched_agents` keys carry free-text markdown today (the `active_work` key was 13 days stale at the 2026-05-06 audit — observational evidence that the free-text convention breaks under urgent fixes). Migration plan:

1. **Now → next 3 session cycles:** readers MUST accept either shape. Detect via `schema_version`: if present, parse as JSON; if absent, treat `.content` as legacy markdown string and continue.
2. **New writes use the JSON schema.** The first agent to touch a legacy key upgrades it to v1 in the same write — no bulk migration needed.
3. **After 3 cycles with no legacy reads observed,** drop the legacy-shape handling. Track the cutover in `bsuite_decisions` as a new frozen-fact row.
4. **`bsuite_claude_dispatched_agents` is a special case** — the old "negative lock" pattern (*PERPLEXITY: do NOT touch X, Y, Z*) maps cleanly to `scope_avoided` in the new `active_work` schema; retire the dedicated key once all readers support the new shape.

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
