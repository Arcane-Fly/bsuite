# BSuite Contributing Standards Rollout

**Date:** 2026-02-27
**Version:** 1.00W (Working)
**Status:** Working

## Purpose

Adopt and adapt quality enforcement, documentation, and indexing standards from monkey-coder across all bsuite projects: business-suite-unified, crm7, conduit, braden, and R80.3.

## Architecture

### Shared Template + Per-Project Overrides

- **Shared standards** live at `docs/20260227-contributing-standards-guide-v1.00W.md`
- **Per-project CONTRIBUTING.md** files at each project root reference the shared standards and add project-specific details

### Document Naming Convention

**Pattern:** `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`

| Status | Meaning | Description |
|--------|---------|-------------|
| W | Working | Active development |
| D | Draft | Initial draft, needs review |
| R | Review | Awaiting approval |
| A | Approved | Reviewed, ready for use |
| F | Frozen | Finalized, immutable |

### Quality Rules Adopted (from monkey-coder)

1. **No-Regex-by-Default Policy** — only tiny anchored literals (≤30 chars, no quantifiers)
2. **Strict TypeScript** — `strict: true`, no `any` without justification
3. **Code Style** — ESLint + Prettier enforced
4. **Test Coverage** — Minimum 70% for critical paths (Vitest)
5. **Conventional Commits** — `type(scope): description`
6. **DRY Principles** — barrel exports, centralized handlers, shared schemas
7. **Feature Protection** — feature flags over hard deletions, protected files documented
8. **Documentation Indexing** — every `docs/` folder has a README.md index

### Theme Compliance

- **D2C Neon Electric theme** (`Theme-best-practice.md`) applies to: business-suite-unified, crm7, conduit, R80.3
- **Corporate branding** (exempt from D2C theme): braden (braden.com.au)

### Per-Project Deliverables

| Project | Action | Theme |
|---------|--------|-------|
| business-suite-unified | Upgrade existing CONTRIBUTING.md | D2C Neon Electric |
| crm7 | Create CONTRIBUTING.md | D2C Neon Electric |
| conduit | Create CONTRIBUTING.md + docs/ folder | D2C Neon Electric |
| braden | Create CONTRIBUTING.md | Corporate (exempt) |
| R80.3 | Create CONTRIBUTING.md | D2C Neon Electric |

## Implementation Plan

1. Write shared standards doc at `docs/`
2. Create/upgrade per-project CONTRIBUTING.md files
3. Verify cross-references and consistency
