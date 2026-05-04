# BSuite Stack Audit

**Generated:** 2026-05-04 from each app's `package.json` on its default branch.
**Authority:** This audit is observational. Remediation rows reference the canonical CLAUDE.md "Dependency Version Policy" (§Shared Packages) which mandates latest mutually-compatible versions of React + ecosystem.

> **Sibling docs:** [crm7](../crm7/docs/STACK-AUDIT.md) · [conduit](../conduit/docs/STACK-AUDIT.md) · [business-suite-unified](../business-suite-unified/docs/STACK-AUDIT.md) · [R80.3](../R80.3/docs/STACK-AUDIT.md) · [braden](../braden/docs/STACK-AUDIT.md) · [throughput](../throughput/docs/STACK-AUDIT.md)
> **Parent index:** [`docs/INDEX.md`](./INDEX.md) · [`docs/UNIFIED-ROADMAP.md`](./UNIFIED-ROADMAP.md) · [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md)

Allowed divergences: **Next.js for conduit only** (others use Vite); **corporate palette for braden only** (others use D2C Neon Electric OKLCH tokens). Any other divergence below is a gap.

---

## Stack matrix

| Stack item | Canonical | crm7 | conduit | BSU | R80.3 | braden | throughput | Status |
|------------|-----------|------|---------|-----|-------|--------|------------|--------|
| `react` | 19.2.x | `^19.2.4` | `^19.2.5` | `^19.2.4` | `^19.2.4` | `^19.2.4` | **`^18.3.1`** | 🟡 throughput laggard |
| `react-dom` | 19.2.x | `^19.2.4` | `^19.2.5` | `^19.2.4` | `^19.2.4` | `^19.2.4` | **`^18.3.1`** | 🟡 throughput laggard |
| `next` | 16.x (conduit only) | n/a | `^16.2.3` | n/a | n/a | n/a | n/a | ✅ allowed divergence |
| `vite` | 8.x (non-conduit) | `^8.0.8` | n/a | `^8.0.8` | `^8.0.8` | `^8.0.8` | **`^6.2.0`** | 🟡 throughput laggard |
| `zustand` | 5.0.x | `^5.0.12` | `^5.0.11` | `^5.0.12` | `^5.0.11` | n/a (none) | `^5.0.8` | 🟡 braden missing zustand; throughput minor lag |
| `@tanstack/react-query` | 5.99+ | `^5.91.2` | `^5.99.0` | `^5.99.2` | `^5` | `^5` | **none** | 🟡 R80.3/braden have caret-`^5` (loose pin); **throughput has none** |
| `@tanstack/react-table` | 8.21.x | `^8.21.3` | n/a | n/a | n/a | n/a | n/a | 🟡 only crm7 — adopt where data tables exist |
| `@dnd-kit/core` | 6.3.x | `^6.3.1` | `^6.3.1` | `^6.3.1` | n/a | `^6.3.1` | n/a | 🟡 R80.3, throughput missing |
| `framer-motion` | 12.3x.x | **n/a** | `^12.35.2` | `^12.38.0` | `^12.35.2` | `^12.35.2` | n/a | 🟡 crm7 + throughput missing |
| `react-hook-form` | 7.71+ | `^7.71.2` | `^7.71.2` | `^7.72.1` | n/a | `^7.71.2` | n/a | 🟡 R80.3, throughput missing (R80.3 may not need; throughput should adopt) |
| `zod` | 4.3.x | `^4.3.6` | `^4.3.6` | `^4.3.6` | `^4.3.6` | **`^3.24.0`** | **`^3.25.76`** | 🟡 braden + throughput on Zod v3 |
| `tailwindcss` | 4.2.x | `^4.2.2` | `^4.2.2` | `^4.2.2` | `^4.2.2` | `^4.2.2` | `^4.0.0` | 🟡 throughput minor lag |
| `@supabase/supabase-js` | 2.10x | `^2.104.0` | `^2.103.0` | `^2.103.0` | `^2.103.0` | `^2.103.0` | `^2.103.0` | ✅ aligned within minor |
| `@xyflow/react` (React Flow) | 12.10.x | `^12.10.1` | `^12.10.1` | `^12.10.2` | `^12.10.1` | n/a | n/a | ✅ aligned where used |
| `lucide-react` | 1.8+ | `^1.8.0` | `^1.8.0` | `^1.8.0` | `^1.8.0` | `^1.8.0` | **`^0.344.0`** | 🟡 throughput on legacy `0.x` line |
| `clsx` | 2.1.x | `^2.1.1` | `^2.1.1` | `^2.1.1` | `^2.1.1` | `^2.1.1` | n/a | 🟡 throughput missing |
| `class-variance-authority` | 0.7.x | `^0.7.1` | `^0.7.1` | `^0.7.1` | `^0.7.1` | `^0.7.1` | n/a | 🟡 throughput missing |
| `components.json` (shadcn marker) | present | ✅ | **❌** | ✅ | **❌** | ✅ | **❌** | 🟡 conduit, R80.3, throughput need shadcn init |

Legend: ✅ aligned, 🟡 divergent, 🟠 operator-blocked, ⬜ not started, **bold** = action required

---

## Remediation pointers

These items are open in [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md). The remediation rows here cite that report's section IDs.

| Gap | Owner | Plan / pointer |
|-----|-------|---------------|
| **throughput on React 18 / Vite 6 / Zod 3 / no TanStack Query / no shadcn / lucide 0.x** — single coordinated upgrade | throughput | [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) §A.1; new plan to be authored at `throughput/docs/plans/` (drop in this PR) |
| **braden on Zod 3** | braden | CONSISTENCY-REPORT §A.2 |
| **R80.3 lacking dnd-kit, RHF, TanStack Table** | R80.3 | CONSISTENCY-REPORT §A.5 — assess whether the R80.3 surface needs them |
| **R80.3 ThemeToggle missing** | R80.3 | [`docs/FEATURE-SURFACE.md`](./FEATURE-SURFACE.md) §F-1 |
| **crm7 missing framer-motion** while siblings have it | crm7 | CONSISTENCY-REPORT §A.6 — confirm intentional; if not, add. |
| **TanStack Query loose pins (`^5`) in R80.3 + braden** | R80.3, braden | CONSISTENCY-REPORT §A.3 — tighten to `^5.99` |
| **shadcn missing (no `components.json`) in conduit, R80.3, throughput** | each | CONSISTENCY-REPORT §A.4 — `pnpm dlx shadcn@latest init` then port primitives |

---

## Verification command

To regenerate this matrix after dependency changes:

```bash
for repo in crm7 conduit business-suite-unified R80.3 braden throughput; do
  node -e "const p=require('./$repo/package.json');const a={...(p.dependencies||{}),...(p.devDependencies||{})};const k=['react','react-dom','next','vite','zustand','@tanstack/react-query','@tanstack/react-table','@dnd-kit/core','framer-motion','react-hook-form','zod','tailwindcss','@supabase/supabase-js','@xyflow/react','lucide-react','clsx','class-variance-authority'];const o={name:p.name};for(const x of k)if(a[x])o[x]=a[x];o.shadcn=require('fs').existsSync('./$repo/components.json');console.log(JSON.stringify(o));"
done
```

Run from the parent repo root after `git submodule update --init --recursive`.
