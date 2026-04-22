# BSuite Contributing Standards

**Date:** 2026-02-27 | **Version:** 1.00W | **Status:** Working

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

Use the project name as scope: `bsu`, `crm7`, `conduit`, `braden`, `r80`, `shared`, `docs`, `deploy`

**Examples:**

```bash
feat(conduit): add candidate pipeline drag-and-drop
fix(crm7): resolve contact search pagination
docs(r80): update wage calculation reference
chore(bsu): upgrade Supabase client to v2.50
```

---

## 3. Testing

- **Framework:** Vitest (Vite projects) or Jest (Next.js projects)
- **Minimum coverage:** 70% for critical paths (business logic, API handlers, state management)
- **Test file naming:** `*.test.ts` or `*.spec.ts`, co-located with source
- **Required test types:**
  - Unit tests for utilities, hooks, and pure functions
  - Component tests for interactive UI (testing-library)
  - Integration tests for API routes and data flows

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

### Documentation Requirements

- **New features** must be documented in `docs/` before merging
- **Architecture decisions** get an ADR (Architecture Decision Record)
- **Public APIs** documented with JSDoc/TSDoc comments
- **Database changes** follow the Expand → Migrate → Contract pattern with deployment notes in the PR

---

## 5. Theme Compliance

### §5 — Colour tokens (updated 2026-04-22 for @bsuite/theme v0.2.0)

**Rule:** OKLCH mandatory everywhere except `braden/` (corporate brand exemption).

**Single source of truth:** `@bsuite/theme v0.2.0` (`packages/theme/`).

**Import in every D2C app global stylesheet:**
```css
@import '@bsuite/theme/css';
```

**Never add** new `text-slate-*`, `bg-gray-*`, `text-white` (outside semantic use), `bg-white`, or raw hex/rgba in any D2C app source file.

**Semantic token reference:** `packages/theme/docs/TOKEN-MAPPING.md` — use this as the authoritative lookup for any migration or new code.

**Per-app brand tokens:**
| App | `--app-primary` | `--app-accent` |
|---|---|---|
| BSU | `oklch(0.541 0.247 293.0)` | `oklch(0.709 0.159 293.5)` |
| CRM7 | `oklch(0.546 0.215 262.9)` | `oklch(0.769 0.132 191.7)` |
| R80.3 | `oklch(0.666 0.157 58.3)` | `oklch(0.837 0.164 84.4)` |
| conduit | `oklch(0.596 0.127 163.3)` | `oklch(0.773 0.153 163.3)` |
| throughput | `oklch(0.546 0.215 262.9)` | `oklch(0.769 0.132 191.7)` |
| braden | `oklch(0.488 0.170 17.6)` (Red) | `oklch(0.769 0.096 90.9)` (Gold) |

**CI enforcement:** `bsuite/no-hardcoded-colours` ESLint rule (error severity) in all D2C apps. Braden: warn + BRADEN-EXEMPT file comment.

---

## 6. Feature Protection

- **Feature flags** over hard deletions — never remove features, disable them
- **Protected files** must be documented in each project's CONTRIBUTING.md
- **No downgrading** feature status (planned → future, active → deprecated) without human approval
- When unsure about a feature's status, **ask** rather than remove

---

## 7. Pull Request Process

1. Branch from `main` using `feature/description` or `fix/description`
2. Write code following all standards above
3. Ensure tests pass and coverage meets threshold
4. Update documentation if behavior changes
5. Use the PR template with deployment notes for DB changes
6. Request review; address feedback promptly
7. Squash-merge when approved

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
| R80.3 | pnpm |

---

## 8. Roadmap

The unified BSuite roadmap lives at [`docs/00-master-roadmap.md`](./00-master-roadmap.md). All project planning is centralized there. Per-project roadmaps have been archived to `docs/archive/<project>/` and replaced with stubs pointing to the master roadmap.

Plans and design documents are stored in `docs/plans/` with the standard naming convention (`YYYYMMDD-name-type-vMAJOR.MINOR[STATUS].md`).
