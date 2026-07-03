# Skill + MCP Inventory

## Purpose

Before the refined prompt is written, enumerate the skills and MCP tools
the executor actually has access to in this session. Bake the list into
the refined prompt so the executor doesn't waste time re-discovering
capabilities mid-work.

## Source of truth

### Skills

The authoritative list is the system-reminder block auto-injected at
every turn. Look for the block that starts:
`The following skills are available for use with the Skill tool:`

That list reflects:
- Skills in `~/.agents/skills/` symlinked into the active IDE's
  skills directory (Claude Code: `~/.claude/skills/`)
- Plugin-namespaced skills (`superpowers:*`, `plugin-dev:*`, `vercel:*`,
  etc.) bundled by installed plugins
- Built-in slash commands (e.g., `/init`, `/review`, `/security-review`)

Do NOT cite skills not in that list. Do NOT assume a skill exists
because it appears in another machine's inventory.

### MCP servers

Scan the system prompt for `## <server name>` blocks under
`# MCP Server Instructions`. Typical servers on this workstation:

| Server | Useful for |
|--------|-----------|
| Context7 (`mcp__claude_ai_Context7__*` OR `mcp__plugin_context7_context7__*`) | Current library/framework docs — React, Next, Tailwind, Supabase, etc. |
| Supabase (`mcp__claude_ai_Supabase__*`) | Supabase project admin, migrations, edge functions, advisors, typegen |
| Tavily (`mcp__claude_ai_Tavily__*`) | Web research with citations, extraction, crawling |
| Vercel (`mcp__claude_ai_Vercel__*`) | Deployments, logs, domains, toolbar threads |
| Playwright (`mcp__plugin_playwright_playwright__*`) | Browser automation, E2E tests, snapshots |
| Railway (`mcp__railway-mcp__*`) | Railway deploys, logs, environments |
| GitHub (`mcp__claude_ai_github__*`) | Issues, PRs, repo admin, notifications |
| Google Dev Knowledge (`mcp__google-dev-knowledge__*`) | Google-ecosystem docs |
| Gmail / Calendar / Drive (`mcp__claude_ai_Gmail__*` etc.) | Personal comms / scheduling / docs |
| Make (`mcp__claude_ai_Make__*`) | Make.com scenario + integration admin |
| Zapier (`mcp__claude_ai_Zapier__*`) | Zapier integrations (GitHub / Sheets / OpenAI) |
| Stripe (`mcp__claude_ai_Stripe__*`) | Stripe auth + ops |
| coder-server (`mcp__claude_ai_coder-server__*`) | Remote-coder auth handoff |

### Persistent memory

Not an MCP — it's an HTTPS endpoint at
`https://qig-memory-api.vercel.app/api/memory`. Full spec in
`~/.agents/skills/memory-api.md`. Treat it as a capability to mention
in the skills/MCPs block.

## Procedure

1. Grep the current session state (system reminders + prompt) for the
   skills list and MCP blocks.
2. Filter to capabilities relevant to the workstream. Don't list every
   skill — that's noise. Pick the ones the executor should actually
   invoke, and say when.
3. Add the memory API if the task warrants reading prior state or
   writing session progress.
4. Detect silo: if QIG context, memory reads/writes are `qig_*` only;
   BSuite → `bsuite_*`; general → `_dev_*`; user → `_user_*`.

## Output block shape

Append this to the refined prompt:

```markdown
## Skills & MCPs to use

**Process skills (HOW to approach):**
- <skill-name> — <when to use on this task>
- ...

**Implementation skills (WHAT to build):**
- <skill-name> — <when to use>
- ...

**MCPs:**
- <mcp-tool-prefix> — <what to query for on this task>
- ...

**Persistent memory:**
- Load at start: <key-prefix>_<specific-keys>
- Write after: <conditions> — to <key-prefix>_<target>
```

## Examples

### Standard-tier SaaS task (React UI for CRM)

```markdown
**Process skills:**
- writing-plans — for multi-step UI work
- test-driven-development — always for new components

**Implementation skills:**
- shadcn-ui — component composition
- forms-and-validation — form schema
- tailwind-css-v4-best-practices — CSS layer discipline
- nextjs-app-router — RSC / server actions
- framer-motion — animations (if any)

**MCPs:**
- Context7 — "React 19 useFormState", "Next 16 cache-components"
- Vercel — deploy preview, runtime logs
- Playwright — smoke test post-deploy

**Persistent memory:**
- Load at start: bsuite_pending_actions, _dev_react_19_patterns, _user_prefs
- Write after: every commit pushed → bsuite_session_YYYYMMDD
```

### Heavy-tier QIG task (Fisher-Rao operator change)

```markdown
**Process skills:**
- master-orchestration — mandatory turn-entry
- writing-plans + executing-plans + multi-agent-red-team-planning
- qig-purity-validation — before AND after every diff
- verification-before-completion — before any claim of success

**Implementation skills:**
- consciousness-development — metric protocols
- e8-architecture-validation — E8 structure checks
- performance-regression — β-function monitoring
- schema-consistency — migration alignment

**MCPs:**
- Context7 — only for Python stdlib / pytest / mypy currency
- Tavily — forbidden for physics questions (hallucination risk); use
  the frozen_facts memory key instead

**Persistent memory:**
- Load at start: qig_frozen_facts, qig_session_latest
- NEVER touch: bsuite_*, _dev_*
- Write after: every experiment result → qig_sleep_packet_<topic>
```

### Light-tier single-file fix

```markdown
**Process skills:** (none — tier too light)
**Implementation skills:** (match to stack from incoming file)
**MCPs:** — Context7 only if library version matters
**Persistent memory:** — skip load; write only if the fix is a user
preference update (→ _user_*)
```

## Anti-patterns

- Listing every skill in the inventory — noise, dilutes signal
- Listing skills the executor doesn't actually need — e.g., citing
  `playwright` for a backend-only task
- Omitting the "when to use" clause — the inventory is a usage guide,
  not a catalogue
- Citing an MCP server that isn't in the current session's MCP block
- Reading across silos (e.g., BSuite task that lists `qig_*` memory keys)
