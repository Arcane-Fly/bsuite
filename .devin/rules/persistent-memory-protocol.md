---
trigger: always_on
---
# Persistent Memory Protocol — Universal

Cross-project memory protocol for all development work by Braden (GaryOcean477).
Shared memory API at `https://qig-memory-api.vercel.app/api/memory`.

---

## 1. Memory API

```text
BASE = https://qig-memory-api.vercel.app/api/memory
```

### Read

```bash
# List all keys
curl $BASE?keys_only=true

# Read a specific key
curl $BASE/{key}
```

### Write

```bash
curl -X PUT $BASE/{key} \
  -H "Content-Type: application/json" \
  -d '{"category":"...","content":"...","updated":"2026-03-19T00:00:00Z"}'
```

---

## 2. Namespace Architecture

Every key is **prefix-namespaced** to its project domain. This prevents
cross-contamination and makes it trivial to list/filter by project.

### Reserved Prefixes

| Prefix | Scope | Examples |
|--------|-------|---------|
| `_user_` | Global user profile, cross-project preferences | `_user_preferences`, `_user_tools` |
| `_dev_` | General development (non-QIG) — the default namespace | `_dev_session_20260319`, `_dev_sleep_react_patterns` |
| `qig_` | QIG physics, geometry, kernels | `qig_frozen_facts`, `qig_session_20260319` |
| `vex_` | Vex agent (infrastructure, LLM, Modal, training) | `vex_session_20260319`, `vex_sleep_modal_config` |
| `pantheon_` | Pantheon projects (SearchSpaceCollapse, pantheon-chat) | `pantheon_session_20260319` |
| `{project}_` | Any other project — use a short, stable slug | `bsuite_session_20260319`, `crm7_sleep_auth_flow` |

### Choosing a Prefix

- If the work touches **QIG math, geometry, or physics** → `qig_`
- If the work touches **vex-agent infrastructure** → `vex_`
- If the work touches **pantheon apps or UI** → `pantheon_`
- If the work is **general development** not tied to a specific project → `_dev_`
- Otherwise → `{project_slug}_` (keep slugs short, lowercase, no hyphens)

---

## 3. Categories

Categories describe the **type** of memory, not the project domain.
The prefix handles domain; the category handles purpose.

| Category | Purpose | Typical Lifespan |
|----------|---------|-----------------|
| `session_summary` | What happened in a session — decisions, commits, blockers | Days to weeks |
| `sleep_packet` | End-of-session state snapshot — where things stand, what to resume | Until next session |
| `dream_packet` | Cross-session synthesis — patterns, insights, recurring themes | Weeks to months |
| `deep_sleep_packet` | Long-term consolidated knowledge — stable truths about the project | Months+ |
| `frozen_facts` | Immutable truths that must not be re-derived | Permanent |
| `pending_actions` | Outstanding tasks that need attention | Until resolved |
| `architecture` | System design decisions, component relationships | Until redesigned |
| `toolchain` | Build tools, deploy configs, env vars, platform notes | Until changed |
| `incident` | Bug post-mortems, outage notes, root causes | Permanent |

### QIG-Only Categories (reserved for `qig_` prefix)

| Category | Purpose |
|----------|---------|
| `training_data` | QLoRA/fine-tuning artifacts and results |

---

## 4. Key Naming Convention

```
{prefix}_{category}_{topic}
{prefix}_{category}_{YYYYMMDD}       ← for dated entries
{prefix}_{category}_{YYYYMMDD}{a-z}  ← letter suffix for multiples per day
```

### Examples

```text
# General development
_dev_session_20260319           Session summary for general dev work
_dev_sleep_nextjs_migration     State snapshot: Next.js migration progress
_dev_dream_testing_patterns     Synthesis: testing patterns across projects
_dev_frozen_facts               Stable truths about dev environment/tooling

# QIG (unchanged from existing convention)
qig_session_20260319            QIG physics session
qig_frozen_facts                κ*≈64, Fisher-Rao, Three Pillars, etc.
qig_sleep_packet_harvest        Harvest pipeline state

# Vex
vex_session_20260319            Vex agent session
vex_sleep_modal_config          Modal deployment state
vex_architecture_llm_stack      LLM client architecture decisions

# Other projects
bsuite_session_20260319         BSuite CRM session
bsuite_pending_actions          Outstanding BSuite tasks
bsuite_incident_auth_leak       Post-mortem: auth token leak
```

---

## 5. Session Protocol

### On Start

1. **List keys:** `GET /api/memory?keys_only=true` — scan for relevant prefixes
2. **Load latest session:** `GET /api/memory/{prefix}_session_latest` or most recent dated session
3. **Load frozen facts:** `GET /api/memory/{prefix}_frozen_facts` (if they exist)
4. **Load pending actions:** `GET /api/memory/{prefix}_pending_actions` (if they exist)
5. **Load user profile:** `GET /api/memory/_user_preferences` (always)

### During Work

**Write immediately** after significant actions. Don't batch until session end —
there is no reliable session-end signal.

Triggers for immediate write:

- Commits pushed
- Architecture decisions made
- Environment/infrastructure changes
- Verified results or test outcomes
- Blocking discoveries

### On End / Before Context Compaction

Write a session summary and sleep packet:

```bash
# Session summary — what happened
curl -X PUT $BASE/{prefix}_session_YYYYMMDD \
  -H "Content-Type: application/json" \
  -d '{"category":"session_summary","content":"## Session Summary\n...","updated":"..."}'

# Sleep packet — where things stand for next pickup
curl -X PUT $BASE/{prefix}_sleep_packet_{topic} \
  -H "Content-Type: application/json" \
  -d '{"category":"sleep_packet","content":"## State\n...","updated":"..."}'
```

---

## 6. Sleep & Dream Packets — General Development

### Sleep Packets (Session State Snapshots)

A sleep packet captures **where things stand** so the next session can resume
without re-deriving context. Write one at end of session or before context risk.

**Template:**

```markdown
## Sleep Packet: {topic}

### Current State
- What's working, what's deployed, what's broken

### In Progress
- What was being actively worked on when session ended

### Next Steps
- Concrete next actions (not aspirational roadmap)

### Blockers
- Anything preventing forward progress

### Key Files
- Files that were being edited or are central to the work
```

### Dream Packets (Cross-Session Synthesis)

A dream packet is written when you notice **patterns across multiple sessions** —
recurring problems, emerging architecture insights, or validated approaches.
These are higher-signal than session summaries.

**Template:**

```markdown
## Dream Packet: {topic}

### Pattern Observed
- What recurring theme or insight emerged

### Evidence
- Which sessions/commits/incidents support this

### Implication
- How this should change future approach

### Confidence
- HIGH / MEDIUM / LOW — based on how many sessions confirm it
```

### Deep Sleep Packets (Consolidated Knowledge)

Written rarely. These distill multiple dream packets into stable project truths.
Candidates for promotion to frozen facts if they prove durable.

**Template:**

```markdown
## Deep Sleep Packet: {topic}

### Consolidated Truth
- The stable insight, stated plainly

### Derived From
- List of dream packets that led here

### Exceptions / Edge Cases
- Known situations where this doesn't hold
```

---

## 7. Delineation: QIG vs General Development

### QIG Domain (prefixes: `qig_`, `vex_`, `pantheon_`)

- **Geometric purity rules apply** — no Euclidean ops, Fisher-Rao only
- **Frozen facts are physics** — κ*, E8, Three Pillars, basin geometry
- **Source of truth chain:** qig-verification → qigkernels → qig-core → qig-consciousness → pantheon-chat
- **Training data category** is QIG-only
- **Terminology:** coordize (not tokenize), basins (not embeddings), resonance (not tokens)

### General Development (prefix: `_dev_`, or project-specific `{slug}_`)

- **Standard software engineering** — no geometric purity constraints
- **Frozen facts are stable architecture decisions** — e.g., "auth uses Supabase PKCE flow"
- **No source of truth chain** — each project is independent unless explicitly linked
- **Standard terminology** — use whatever the framework/community uses

### Shared Layer (prefix: `_user_`)

- User preferences, tool configs, working style
- Cross-project knowledge (e.g., "Braden prefers Railway for backend, Vercel for frontend")
- Applies to ALL work regardless of domain

---

## 8. Maintenance

### Hygiene Rules

1. **Delete stale sleep packets** — if a topic's sleep packet is >2 weeks old and superseded, remove it
2. **Promote recurring patterns** — if 3+ sleep packets share a theme, write a dream packet
3. **Promote stable dreams** — if a dream packet holds for a month+, consider a deep sleep or frozen fact
4. **Never overwrite frozen facts** — append corrections with dates if physics/truths evolve
5. **Session summaries expire** — keep the last 5-10 per prefix; archive or delete older ones

### Conflict Resolution

If memory conflicts with current code or git state:

- **Trust the code** — memory is a point-in-time snapshot
- **Update or delete the stale memory**
- **Never act on memory without verifying** against current state

---

## 9. Quick Reference

```text
Read all keys:     GET  /api/memory?keys_only=true
Read one key:      GET  /api/memory/{key}
Write/upsert:      PUT  /api/memory/{key}  body: {category, content, updated}

Prefixes:  _user_  _dev_  qig_  vex_  pantheon_  {project}_
Categories: session_summary  sleep_packet  dream_packet  deep_sleep_packet
            frozen_facts  pending_actions  architecture  toolchain  incident
```
