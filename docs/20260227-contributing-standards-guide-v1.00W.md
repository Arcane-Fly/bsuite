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

### D2C Neon Electric Theme (webapps)

**Applies to:** business-suite-unified, crm7, conduit, R80.3

All webapp projects must use the Universal D2C Theme System defined in `Theme-best-practice.md`:

- **Tailwind config** extends with neon electric color palette (11 colors)
- **CSS variables** defined in `globals.css` via `@layer base`
- **ThemeProvider** wraps the app for light/dark/system mode
- **Dark mode** uses deep navy backgrounds with neon accents
- **Light mode** uses off-white backgrounds with electric accents
- **Semantic colors** for status (success, warning, error, info)
- **Typography:** Inter (display/body), JetBrains Mono (code)

**Key colors:**

| Color | Hex | Use |
|-------|-----|-----|
| Electric Blue | `#2563eb` | Primary actions |
| Electric Cyan | `#00cec9` | Accents, borders |
| Electric Green | `#22c55e` | Success states |
| Electric Coral | `#ff4757` | Alerts, destructive |
| Electric Yellow | `#fdcb6e` | Warnings, info |

### Corporate Branding (braden.com.au)

**Applies to:** braden project only

Uses company branding colors and does not follow the D2C theme. See braden project docs for brand guidelines.

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
