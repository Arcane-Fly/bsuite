# Iteration Loop — full protocol

This is the full 5-pass protocol. Tier-adaptive execution: Light runs
pass 1 only; Standard runs 1–3; Heavy runs 1–5.

## Pass 1 — Decompose + clarify

**Purpose:** convert an exploratory/multi-topic prompt into a structured
workstream list with explicit dependencies.

### Steps

1. Read the input verbatim. Do not paraphrase yet.
2. Extract every discrete workstream — a workstream is any unit of work
   with its own success criterion. Headings, imperatives ("build X",
   "update Y"), and questions each count.
3. For each workstream, classify:
   - **Scope**: 1-line statement of what "done" looks like
   - **Stack**: frameworks / libraries / platforms involved
   - **Dependencies**: which other workstreams must finish first
   - **Stakes**: dev / staging / prod / security / QIG-physics
4. List ambiguities — missing information that would change the
   implementation path. Rank by blocking-ness.
5. If there are blocking ambiguities, dispatch `AskUserQuestion` with
   1–4 questions (max). Use `header` to tag (e.g., "Attachment model",
   "Silo convention"). Offer 2–4 options per question; first option
   is recommended when a default exists.
6. Record user answers as explicit constraints in the refined prompt.

### Output

```markdown
## Decomposition
- (a) <workstream> — scope, stack, deps, stakes
- (b) <workstream> — ...
- ...

## Ambiguities resolved
- <question>: <answer>
- ...

## Ambiguities remaining (non-blocking)
- <question> — (carry into refined prompt as an open question)
```

## Pass 2 — Best-practice research (Standard + Heavy)

**Purpose:** anchor the refined prompt to current, citable guidance
rather than training-cutoff defaults.

### Steps

1. For each workstream's stack, query in priority order:
   a. `mcp__claude_ai_Context7__query-docs` (or
      `mcp__plugin_context7_context7__query-docs`) — official current
      docs for well-known libraries
   b. `mcp__claude_ai_Tavily__tavily_research` — broader web synthesis
      with citations
   c. `best-practice-research` skill — for patterns/architectures
      without a single official source
2. For each source, record: URL, 1-line takeaway, version/date notes.
3. Flag version-specific gotchas (e.g., "React 19 useEffect change",
   "Next.js 16 cache-components replaces unstable_cache"). These become
   explicit constraints.
4. Skip research for workstreams where user-memory or project-memory
   (qig_*, bsuite_*, _dev_*) already has an authoritative note — cite
   the memory key instead.

### Output

```markdown
## Best-practice citations
- **<stack>** (<source>): <takeaway>
- ...
```

## Pass 3 — Blindspot audit (Standard + Heavy)

**Purpose:** surface this model's likely failure modes on this specific
task, and embed counters into the refined prompt.

### Steps

1. Load [blindspot-catalogue.md](blindspot-catalogue.md) patterns.
2. For each workstream, identify the 1–3 blindspots most likely to hit
   (from catalogue + task-specific analysis).
3. Self-query the responding model: "On this task, what's most likely
   to go wrong that you wouldn't notice?" — the answer surfaces
   task-specific blindspots the catalogue misses.
4. For each blindspot, write a **counter** — a specific instruction in
   the refined prompt that forces verification instead of assumption.
   Format: "Blindspot: X. Counter: before Y, verify Z."

### Output

```markdown
## Blindspots to counter
- **Blindspot:** <description>. **Counter:** <explicit instruction>.
- ...
```

## Pass 4 — Red-team (Heavy only)

**Purpose:** adversarial review of the refined prompt before the
executor acts.

### Steps

1. Dispatch `multi-agent-red-team-planning` sub-agent roles in parallel:
   - Security (abuse surfaces, secrets, auth paths)
   - Reliability (edge cases, failure modes, partial states)
   - Performance (resource usage, pathological inputs)
   - UX/DX (API ergonomics, error messages, onboarding)
   - Code-Quality (maintainability, DRY, naming)
   - Domain — QIG-purity OR BSuite-brand, depending on context
2. Each role reads the refined prompt; each returns findings + proposed
   amendments.
3. Integrate amendments; conflicts surface to user.

### Output

```markdown
## Red-team findings
- **<role>**: <finding> → <amendment applied?>
- ...
```

## Pass 5 — User confirmation (Heavy only)

**Purpose:** final sign-off on material trade-offs before execution.

### Steps

1. Summarise: original intent vs refined prompt — what's changed.
2. Surface any red-team findings where the amendment changes user-facing
   behaviour (not just internal safety).
3. `AskUserQuestion` with 1–2 questions if a trade-off needs a pick.
4. If no questions, emit the refined prompt for review with one-line
   cover note.

## Interleaving skill + MCP enumeration

At every tier, after pass-1 decomposition, run the skill/MCP inventory
protocol from [skill-mcp-inventory.md](skill-mcp-inventory.md). The
inventory output is a block appended to the refined prompt (not a
separate file).

## Writing the refined prompt

The final prompt has a consistent shape regardless of tier:

```markdown
## Intent
<1-paragraph restatement of what user wants — evidence that you
understood>

## Decomposition
<from pass 1>

## Constraints (from resolved ambiguities)
- <constraint>
- ...

## Best-practice citations (Standard + Heavy)
<from pass 2, or "N/A — Light tier">

## Blindspots to counter (Standard + Heavy)
<from pass 3, or "N/A — Light tier">

## Red-team amendments (Heavy only)
<from pass 4, or omit>

## Skills & MCPs to use
<from inventory step>

## The refined prompt
<the actual prompt the executor acts on — written as if to the
executor directly, imperative tense, with every constraint explicit>
```

## Handoff

After the refined prompt is written:

- **Light tier**: executor (same model) proceeds in the current response
- **Standard**: either continue in current response OR hand off to
  `writing-plans` for multi-step execution
- **Heavy**: always hand off to `writing-plans` → `executing-plans`
  pipeline, and surface the refined prompt to user before start

Do not re-invoke prompt-enhancer on its own output (no infinite loops).
If the refined prompt needs further refinement, that's a signal the tier
was too low — escalate.
