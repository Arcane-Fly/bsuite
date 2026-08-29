# BSuite Contributing Standards

**Date:** 2026-04-28 | **Version:** 1.01W | **Status:** Working

**Supersedes:** `docs/20260227-contributing-standards-guide-v1.00A.md` (kept for historical reference per docs-hygiene frozen-A mandate).

> **R80.3 → R80.4 corrected 2026-08-17.** Four live rows below (Testing, Theme Compliance "Applies
> to", the D2C implementation-rule bullet, and the Package Managers table) named `R80.3` as a
> current submodule. R80.3 left the submodule set on 2026-08-06 (`5e000c35`, operator directive);
> R80.4 took its place and is what serves `r8.crm7.app` today. Per `AGENTS.md`'s standing rule,
> this document is a living standards guide an agent is expected to act on, not a dated audit, so
> the correction is applied in place rather than banner-only.

**What changed in v1.01W:**

- §3 Testing — Framework line corrected: **all BSuite projects (including Next.js conduit) use Vitest.** Jest has never been installed in any project; the previous "Vitest (Vite projects) or Jest (Next.js projects)" line was stale from a Next.js 13-era assumption that never materialised. Verified across all 6 apps + 3 shared packages on 2026-04-28 — zero Jest installations monorepo-wide.

Universal quality, documentation, and code standards for all BSuite projects. Each project's `CONTRIBUTING.md` references this document and adds project-specific details.

---

## 1. Code Style & Quality

### TypeScript

- **Strict mode required** — `strict: true` in `tsconfig.json`
- **No untyped `any`** without a justifying comment
- **ESLint** — follow the project's `.eslintrc` config; fix all warnings before committing
- **Prettier** — auto-format on save; config lives at project root
- **Naming conventions:**
  - `camelCase` for variables, functions, hooks
  - `PascalCase` for components, types, interfaces, classes
  - `SCREAMING_SNAKE_CASE` for constants
  - `kebab-case` for file names (components may use PascalCase filenames)

### No-Regex-by-Default Policy

Regex is permitted **only** for tiny, fully-anchored literals:

- Maximum 30 characters
- No quantifiers (`*`, `+`, `{n,m}`)
- Must be anchored (`^...$`)

**Allowed examples:**

```typescript
const STATUS = /^(OK|FAIL)$/;
const HEX_COLOR = /^#[A-Fa-f0-9]{6}$/;
```

**For everything else, use typed parsers:**

- URLs → `new URL()`, `URLSearchParams`
- JSON → `JSON.parse()` with Zod validation
- HTML → `cheerio` or DOM APIs
- CSV → `papaparse` or similar
- Dates → `date-fns` or `Intl.DateTimeFormat`

### DRY Principles

- **Barrel exports** — every directory with 3+ exports gets an `index.ts`
- **Centralized API handlers** — shared error handling and response parsing
- **Shared validation schemas** — Zod schemas co-located with types
- **Component composition** — extract repeated patterns (modals, drawers, card layouts) into shared components
- **Style utilities** — consolidate repeated Tailwind class combinations with `cn()` or `clsx()`

---

## 2. Commit Conventions

All commits follow **Conventional Commits**:

```
type(scope): short description

[optional body]
[optional footer]
```

### Types

| Type | Use |
|------|-----|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructuring, no behavior change |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependency updates |
| `perf` | Performance improvement |

### Scopes

Use the project name as scope: `bsu`, `crm7`, `conduit`, `braden`, `r80`, `throughput`, `shared`, `docs`, `deploy`

**Examples:**

```bash
feat(conduit): add candidate pipeline drag-and-drop
fix(crm7): resolve contact search pagination
docs(r80): update wage calculation reference
chore(bsu): upgrade Supabase client to v2.50
```

---

## 3. Testing

- **Framework:** **Vitest for all projects, including Next.js conduit** (verified 2026-04-28 — zero Jest installations monorepo-wide).
  - Vitest 4.x for conduit (Next.js 16 supports Vitest natively; the project runs `vitest run` via `pnpm test`, with `vitest.config.ts` + `vitest.setup.ts`).
  - Vitest 2.x / 3.x for the Vite-based apps (business-suite-unified, crm7, braden, R80.4, throughput) and the shared `@bsuite/*` packages.
- **Minimum coverage:** 70% for critical paths (business logic, API handlers, state management)
- **Test file naming:** `*.test.ts` or `*.spec.ts`, co-located with source
- **Required test types:**
  - Unit tests for utilities, hooks, and pure functions
  - Component tests for interactive UI (testing-library)
  - Integration tests for API routes and data flows
- **Why Vitest monorepo-wide (not Jest):**
  - Native ESM support (Jest's ESM support is still experimental in v30 as of 2026-04)
  - Reuses each project's `vite.config.ts` transform pipeline (zero-config for TS/JSX/aliases)
  - Jest-compatible API surface (`expect`, `describe`, `it`, `beforeEach`) — migration from Jest is mostly `s/jest/vi/g`
  - First-class browser-mode for component tests (via Playwright/WebDriver) without a second test runner
  - Next.js 16 testing docs now show Vitest as the primary recommendation

---

## 4. Documentation & Indexing

### Document Naming Convention

**Pattern:** `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`

| Status | Meaning | Description |
|--------|---------|-------------|
| **W** | Working | Active development, may change |
| **D** | Draft | Initial draft, needs review |
| **R** | Review | Awaiting approval |
| **A** | Approved | Reviewed, ready for use |
| **F** | Frozen | Finalized, immutable |

**Document types:** `architecture`, `guide`, `plan`, `decision`, `changelog`, `roadmap`, `reference`, `migration`

**Examples:**

```
20260227-auth-flow-architecture-v1.00F.md
20260215-deployment-guide-v2.01W.md
20260301-api-redesign-plan-v0.01D.md
```

### Indexing Requirement

Every project's `docs/` folder **must** have a `README.md` index listing all documents with:

- Filename
- Status code
- One-line description

Update this index whenever a document is added or its status changes.

### Naming Exemptions

The date-prefixed pattern above does not apply to canonical navigation and status docs, including:

- `ADR-NNNN-*.md` architecture decision records
- `README.md`
- `INDEX.md`
- `STATUS.md`
- `CONSISTENCY-REPORT.md`
- `STACK-AUDIT.md`
- other root-level mirror/index docs whose purpose is navigation or status mirroring

### Documentation Requirements

- **New features** must be documented in `docs/` before merging
- **Architecture decisions** get an ADR (Architecture Decision Record)
- **Public APIs** documented with JSDoc/TSDoc comments
- **Database changes** follow the Expand → Migrate → Contract pattern with deployment notes in the PR

---

## 5. Theme Compliance

### D2C Neon Electric Theme (webapps)

**Applies to:** business-suite-unified, crm7, conduit, R80.4, throughput

All webapp projects must use `@bsuite/theme` as the token source (floor `^0.11.0`; published `0.11.2` at 2026-08-17 — check npm rather than trusting this number). Tailwind CSS must be v4 or later everywhere; Tailwind v3 is not permitted in package manifests, resolved lockfile entries, docs, or new implementation paths. Tailwind v4 apps import `@bsuite/theme/preset-v4.css` and `@bsuite/theme/css`.

- **OKLCH source tokens** are mandatory. Hex/RGB/HSL are legacy references or browser fallbacks only.
- **Role aliases** are the consumer contract: use `bg-primary`, `text-foreground`, `text-muted-foreground`, `bg-destructive`, and inverse `text-on-*` tokens rather than raw palette names.
- **Error/destructive roles** are **Electric Red** by platform policy (contract 0.7.0, 2026-08-02). Purple and indigo must not be semantic error/destructive — they collide with primary under protanopia. CI enforces red.
- **Dark mode text** uses the five-tier anti-glare scale capped at `oklch(0.94 ... )`; pure white is not a dark-surface text token.
- **Enterprise white-labelling** is via `BrandingProvider` role-alias overrides. Error/destructive roles are not tenant-overridable.
- **Typography:** Inter (display/body), JetBrains Mono (code)
- **Surface language:** Balanced Hybrid shells, elevated cards, restrained glow, and semantic shell tokens rather than hardcoded styling

**Implementation rule:**

- CRM7 is the reference implementation for the shared D2C shell and high-visibility workflow surfaces.
- `business-suite-unified`, `conduit`, `R80.4`, and `throughput` should follow the same semantic shell model even when their local token plumbing differs.

**Key roles:**

| Role / token | OKLCH source | Use |
|--------------|--------------|-----|
| `--role-primary` / Electric Blue | `oklch(0.546 0.215 262.9)` | Primary actions, links, focus affordances |
| `--role-accent` / Electric Cyan | `oklch(0.769 0.132 191.7)` | Accents, highlights, visible focus in dark mode |
| `--role-success` | `oklch(0.600 0.130 195)` | Success states (Electric Teal); pair with icon/text |
| `--role-warning` | `oklch(0.800 0.150 75)` | Warning states (Electric Amber); pair with icon/text |
| `--role-error` / `--role-destructive` | `oklch(0.580 0.230 25)` | **RED** (Electric Red). Purple and indigo are quarantined from semantics entirely. Tenant override is BLOCKED on these two tokens. |

> **Corrected 2026-08-17.** The three semantic rows above previously named the pre-0.7.0 values —
> error/destructive as purple `oklch(0.568 0.202 283.1)`, success as green `oklch(0.723 0.192 149.6)`,
> warning as orange `oklch(0.728 0.168 22.5)` — and stated that "red/coral is banned for this role".
> That is inverted: contract **0.7.0** (2026-08-02) made error/destructive **red**, and CI enforces red.
> Agents reading the old table wrote purple and burned a CI round.
>
> The invariant is **SEPARATION, not a fixed hue**, measured by Vienot-Brettel dichromat simulation.
> D2C's primary is blue, so error must be red: purple scored ΔE 0.006 against primary under
> protanopia — the destructive colour and the primary action colour were the same swatch. Warm
> states separate by **lightness** (under deuteranopia red and amber both read yellow — error is the
> dark one, warning the light one). Worst-case ΔE across every semantic pair is now ≥ 0.156.
>
> `--role-primary` and `--role-accent` were re-measured and are unchanged. Source of truth is
> `packages/theme/src/css/vars.css`; never bind a component to a `--neon-electric-*` value directly.

### Corporate Branding (braden.com.au)

**Applies to:** braden project only

Braden is a separate corporate brand, but it follows the same token architecture as D2C: OKLCH source tokens, role aliases, shadcn bridge variables, softened text scale, and the same **red** semantic error/destructive roles (`--role-error` / `--role-destructive` → `--error-red`, `packages/theme/src/css/braden.css`). It imports `@bsuite/theme/braden-css`, not `@bsuite/theme/css`.

| Corporate token | OKLCH source | Legacy reference | Use |
|-----------------|--------------|------------------|-----|
| `--braden-red` | `oklch(0.51 0.17 19)` | `#ab233a` | Corporate primary / identity |
| `--braden-gold` | `oklch(0.77 0.10 82)` | `#cbb26a` | Corporate accent; use navy text on gold for AA contrast |
| `--braden-navy` | `oklch(0.34 0.04 250)` | `#2c3e50` | Corporate deep surface / text anchor |

Red is allowed as Braden identity. Red as semantic error/destructive is banned across both brands.

---

## 6. Feature Protection

- **Feature flags** over hard deletions — never remove features, disable them
- **Protected files** must be documented in each project's CONTRIBUTING.md
- **No downgrading** feature status (planned → future, active → deprecated) without human approval
- When unsure about a feature's status, **ask** rather than remove

---

## 7. Pull Request Process

1. Branch from `development` using `feature/description` or `fix/description`. **Never branch from
   or target `main`** — `main` is production and lands only by promotion PR. (This step read
   "branch from `main`" until 2026-08-17; that contradicted AGENTS.md tripwire 1 and was wrong.)
2. Write code following all standards above
3. Ensure tests pass and coverage meets threshold
4. Update documentation if behavior changes
5. Fill in [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md), which loads
   automatically, adding deployment notes for DB changes
6. Request review; address feedback promptly
7. Squash-merge when approved

### Closing issues from a pull request

Write `Closes #123` in the PR body and leave it. **Do not close the issue by hand.**

Until 2026-08-17 that keyword did nothing here: GitHub auto-closes only on a merge to a
repository's **default** branch, every repository in this estate defaults to `main`, and every pull
request targets `development`. Fifteen issues sat fixed-and-open as a result.

[`.github/workflows/development-merge-issue-closer.yml`](../.github/workflows/development-merge-issue-closer.yml)
now honours the keyword on a `development` merge — it comments on the issue naming the merge SHA,
then closes it — and sweeps all seven repositories hourly so submodule pull requests are covered
from one place.

| Written in the PR body | Result |
|---|---|
| `Closes #123`, `Fixes #123`, `Resolves #123` (also `closed`/`fixed`/`resolved`, `Closes: #123`, `GH-123`, a full issue URL) | closed, with an audit comment naming the merge SHA |
| `Fixes #3, #4 and #5` | all three closed |
| `Closes the loop on #123` | ignored — the reference must immediately follow the keyword, same as GitHub |
| `> Closes #123` (blockquote) · `- [ ] Closes #123` (checklist) | ignored, so quoting a review cannot close live work |
| inside a code fence, an `inline span`, or an HTML comment | ignored |
| `this does not close #123` | ignored |
| `GaryOcean428/crm7#123` (cross-repo) | **reported, never closed** — close it by hand |

The parser is `scripts/parse-closing-keywords.mjs`; `--self-test` is its contract and a registered
guard in `scripts/guard-registry.mjs`. Change the rules there, not by closing issues manually.

### PR Template for Database Changes

```markdown
## Database Migration

**Version**: VNNNN__description
**Risk Level**: Low | Medium | High
**Requires Downtime**: No | Yes (explain)

**Rollback Plan**: [describe]

**Testing**:
- [ ] Tested locally
- [ ] Verified on staging
- [ ] Performance impact assessed
```

---

## 8. Development Environment

### Common Prerequisites

- **Node.js** ≥24.0.0
- **TypeScript** strict mode
- **Supabase CLI** for backend development
- **Git** latest version

### Package Managers (per project)

| Project | Package Manager |
|---------|----------------|
| business-suite-unified | pnpm |
| crm7 | pnpm |
| conduit | pnpm |
| braden | pnpm |
| R80.4 | pnpm |
| throughput | pnpm |

---

## 9. Roadmap

The unified BSuite roadmap lives at [`docs/00-roadmap/`](./00-roadmap/README.md). All project planning is centralized there. Per-project roadmaps have been archived to `docs/archive/<project>/` and replaced with stubs pointing to the master roadmap.

Plans and design documents are stored in `docs/plans/` with the standard naming convention (`YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md`).
