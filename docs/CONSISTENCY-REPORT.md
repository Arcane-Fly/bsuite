# BSuite Consistency Report

**Generated:** 2026-05-04
**Scope:** Cross-repo divergences from the canonical stack/patterns. Allowed divergences: Next.js for conduit, corporate palette for braden. Anything else listed below is a gap.

> **Sibling docs:** [crm7](../crm7/docs/CONSISTENCY-REPORT.md) · [conduit](../conduit/docs/CONSISTENCY-REPORT.md) · [business-suite-unified](../business-suite-unified/docs/CONSISTENCY-REPORT.md) · [R80.3](../R80.3/docs/CONSISTENCY-REPORT.md) · [braden](../braden/docs/CONSISTENCY-REPORT.md) · [throughput](../throughput/docs/CONSISTENCY-REPORT.md)
> **Parent index:** [`docs/INDEX.md`](./INDEX.md) · [`docs/UNIFIED-ROADMAP.md`](./UNIFIED-ROADMAP.md) · [`docs/STACK-AUDIT.md`](./STACK-AUDIT.md) · [`docs/FEATURE-SURFACE.md`](./FEATURE-SURFACE.md)

---

## Section A — Stack divergences

### A.1 throughput is the major laggard (multiple gaps in one repo)

| Dimension | Canonical | throughput | Action |
|-----------|-----------|-----------|--------|
| React | 19.2.x | 18.3.1 | Upgrade per [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](./plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) §2.1 (React 19 mandate) |
| Vite | 8.x | 6.2.0 | Upgrade with React 19 bump |
| Zod | 4.3.x | 3.25.76 | Migrate (Zod 4 has breaking schema changes; do alongside React upgrade) |
| TanStack Query | 5.99+ | (none) | Adopt — replace ad-hoc fetch logic |
| shadcn/ui | `components.json` present | absent | `pnpm dlx shadcn@latest init`; port primitives |
| dnd-kit | 6.3.x | (none) | Adopt for drag interactions in idea workflow |
| lucide-react | 1.8+ | 0.344.0 | Bump (icon API changed; migration is mostly mechanical) |
| clsx + cva | 2.1 / 0.7 | (none) | Add when shadcn primitives land |

**Recommendation:** open a single plan `throughput/docs/plans/2026-05-04-throughput-stack-modernization.md` covering React 19 + Vite 8 + Zod 4 + TanStack Query + shadcn in one coordinated PR. Sized like the conduit modernization landed earlier.

### A.2 braden on Zod 3

| Dimension | Canonical | braden | Action |
|-----------|-----------|--------|--------|
| Zod | 4.3.x | 3.24.0 | Migrate; use codemod where helpful |

### A.3 TanStack Query loose version pins

R80.3 and braden specify `"@tanstack/react-query": "^5"` which is too loose — it allows any 5.x including pre-stable. Tighten to `^5.99` (current stable line).

### A.4 shadcn/ui missing in 3 apps

`components.json` is the canonical marker for shadcn-managed primitives. Missing in:

- **conduit** — primitives must be portable across server/client boundaries; verify Next.js compatibility before init.
- **R80.3** — wage calculator surface is small; init may be deferred but pattern parity matters for future page-builder consumers.
- **throughput** — covered by §A.1.

### A.5 R80.3 lacks dnd-kit, RHF, TanStack Table

R80.3's surface is narrow (calculator). It may not need these. **Action:** confirm intent in `R80.3/docs/CONSISTENCY-REPORT.md`. If wage modelling tables grow, adopt TanStack Table; if multi-step wizard forms appear, adopt RHF.

### A.6 crm7 missing framer-motion

CRM7 is the canonical UX leader yet the only D2C app without `framer-motion`. **Action:** verify whether motion primitives are sourced from `@bsuite/ui` or absent; if absent and siblings use it, add for consistency.

---

## Section B — Pattern divergences

These patterns must be the same across all D2C apps (and braden where applicable). Source-of-truth canonical doc cited per row.

| Pattern | Canonical doc | crm7 | conduit | BSU | R80.3 | braden | throughput |
|---------|--------------|------|---------|-----|-------|--------|-----------|
| OKLCH theme tokens | [`docs/20260228-d2c-theme-specification-v1.00A.md`](./20260228-d2c-theme-specification-v1.00A.md) | ✅ | ✅ | ✅ | ✅ | ✅ corporate variant | 🟡 partial |
| Cookie SSO `.crm7.app` | parent CLAUDE.md §Auth | ✅ | ✅ | ✅ | ✅ | n/a (TLD) | ✅ |
| BS OAuth 2.1 PKCE client | parent CLAUDE.md §Auth | ✅ | ✅ | server | ✅ | ✅ | ✅ |
| `startBSTokenRefresh()` wired | parent CLAUDE.md §Auth | ✅ | ✅ | n/a | ✅ | ✅ | ✅ |
| `ThemeProvider` + `ThemeToggle` | [`docs/FEATURE-SURFACE.md`](./FEATURE-SURFACE.md) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `oneship` data-entry policy | [`docs/20260227-dry-one-shot-architecture-v1.02A.md`](./20260227-dry-one-shot-architecture-v1.02A.md) | ✅ | partial | partial | partial | n/a | partial |
| `EntitySelector` family (read-from-source) | [`docs/20260319-entity-crosswalk-v1.00D.md`](./20260319-entity-crosswalk-v1.00D.md) | ✅ (6 selectors) | ❌ | ❌ | ❌ | n/a | ❌ |
| Dashboard widgets via dnd-kit | crm7 reference | ✅ canonical | partial | partial | ❌ | partial | ❌ |
| Cmd+K command palette | [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](./plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) §3.10 | 🟡 partial (5 files) | 🟡 partial (1 file) | ❌ | ❌ | ❌ | ❌ |
| Schema builder canvas (React Flow) | [`docs/20260504-schema-builder-phase-3-plan-v1.00W.md`](./20260504-schema-builder-phase-3-plan-v1.00W.md) | ✅ consumer | partial (1 file) | ✅ consumer (2 files) | n/a | n/a | n/a |
| Page builder direct manipulation | `@bsuite/page-builder` 0.1.0 | ✅ thin adapter | adapter | ✅ adapter | n/a | n/a | n/a |
| ESLint + `@bsuite/eslint-config` | [`docs/20260227-contributing-standards-guide-v1.01W.md`](./20260227-contributing-standards-guide-v1.01W.md) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@bsuite/dry-lint` error-level | parent CLAUDE.md §Shared Packages | ✅ | ✅ | ✅ | ✅ | ✅ | partial |
| Vitest test runner | parent CLAUDE.md §Testing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Section C — Open consistency tasks

Each row should become a row in [`docs/plans/STATUS.md`](./plans/STATUS.md) under "Cross-repo consistency."

| ID | Description | Owner | Pointer |
|----|------------|-------|---------|
| CON-1 | throughput stack modernization (React 19, Vite 8, Zod 4, TanStack Query, shadcn) | throughput | A.1 above |
| CON-2 | braden Zod 4 migration | braden | A.2 above |
| CON-3 | Tighten loose `@tanstack/react-query: ^5` pins (R80.3, braden) | R80.3, braden | A.3 above |
| CON-4 | shadcn init for conduit, R80.3, throughput | three apps | A.4 above |
| CON-5 | R80.3 ThemeToggle | R80.3 | [FEATURE-SURFACE §F-1](./FEATURE-SURFACE.md) |
| CON-6 | EntitySelector + oneship adoption in conduit, BSU, R80.3, throughput | four apps | crosswalk doc |
| CON-7 | Cmd+K palette adoption in BSU, R80.3, braden, throughput | four apps | WYSIWYG plan §3.10 |
| CON-8 | Dashboard dnd-kit pattern adoption | conduit, BSU, R80.3, braden, throughput | crm7 reference |
| CON-9 | crm7 framer-motion verification | crm7 | A.6 above |
| CON-10 | conduit OAuth client (already done — verify cookie-SSO carve-out fully retired) | conduit | parent CLAUDE.md §OAuth |

---

## Section D — Allowed divergences (do not flag)

| Repo | Divergence | Reason |
|------|-----------|--------|
| conduit | Next.js 16 App Router; server components default; `'use client'` only when needed | Authoring constraint per parent CLAUDE.md §conduit |
| conduit | TanStack Query for client + server actions for mutations | Next.js idiom |
| braden | Corporate brand palette (Red `#ab233a` / Gold `#cbb26a`); never D2C tokens | Customer-facing braden.com.au identity |
| braden | TLD differs (`braden.com.au`) → no shared cookie SSO | DNS reality |
| R80.3 | Calculator-shaped surface — may justify lighter set (no TanStack Table, no RHF) | Pending confirmation; see A.5 |

---

## Maintenance

1. After each consistency item closes, move the row from §C to a "Recently shipped" table at the bottom of the relevant section.
2. New divergences discovered in any sweep should append to §A or §B and add a CON-N row to §C.
3. The submodule mirror at `<app>/docs/CONSISTENCY-REPORT.md` is a stub linking back to this doc.
