# Agent Skills

Version-controlled agent skills for the BSuite monorepo. Each subdirectory is a
self-contained skill with a `SKILL.md` (YAML frontmatter `name` + `description`)
and optional `rules/`, `references/`, `scripts/`, and `templates/`.

These were previously referenced only from the operator's local
`~/.agents/skills/` (see `.windsurfrules`); porting them in-repo makes them
available to every agent and CI run regardless of host.

## Index

### Orchestration & prompting
- `master-orchestration` — top-level skill invoked first each turn; detects project family, inventories skills/MCPs, forms subagent teams, enforces cross-module consistency.
- `prompt-enhancer` — refines exploratory/ambiguous/multi-topic prompts before large work (complexity-adaptive 1/3/5 passes).

### Mandatory workflow
- `brainstorming` — before any new feature or creative work.
- `best-practice-research` — research official docs before implementing.
- `test-driven-development` — write tests before code.
- `code-quality-enforcement` — DRY, naming, architecture.
- `security-audit` — secrets, injection, XSS.
- `qa-and-verification` — prove changes work.
- `verification-before-completion` — never claim done without evidence.
- `multi-agent-red-team-implementation` — red-team all implementations.

### Brand
- `bsuite-brand-system` — D2C Neon Electric vs Corporate branding (never mix).

### Vercel / framework (all React+Vite projects)
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `vercel-web-design-guidelines`

### conduit (Next.js 16 App Router)
- `vercel-next-best-practices`
- `vercel-next-cache-components`
- `vercel-next-upgrade`

### conduit + crm7 (AI SDK)
- `vercel-ai-sdk`

### mobile (React Native / Expo)
- `vercel-react-native-skills`

## Source

Ported from `Arcane-Fly/.github-private` `skills/`. To update a skill, edit it
here; do not re-introduce host-local absolute paths.
