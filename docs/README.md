# BSuite Documentation

Top-level documentation for the BSuite multi-project workspace. Contains cross-project standards, architecture references, and planning documents shared across all five applications.

## Documentation Authority

- `20260227-bsuite-master-roadmap-v5.00W.md` is the canonical planning and delivery source of truth
- `20260227-auth-map-reference-v1.00A.md` is the canonical authentication and session-topology reference
- Project `docs/README.md` files are navigation hubs only
- `docs/plans/` contains feeder plans that must reconcile back into the master roadmap
- `archive/` and imported donor documentation are reference-only and may preserve older naming or topology

## Contents

| File / Directory | Description |
|------------------|-------------|
| `20260225-cascade-claude-upgrade-coordination-plan-v1.00A.md` | Cascade ↔ Claude Code unified upgrade coordination plan (approved) |
| `20260226-ux-oneshot-deep-dive-plan-v1.00W.md` | UX & one-shot deep dive — eliminate double-entry across CRM7 |
| `20260227-bsuite-master-roadmap-v5.00W.md` | Single source of truth for BSuite project planning across all projects |
| `20260227-auth-map-reference-v1.00A.md` | Authentication map for the Business Suite ecosystem (BSU, CRM7, R80.3, Braden) |
| `20260227-bsuite-deep-audit-report-v1.00A.md` | Deep audit report covering CRM7, BSU, Conduit, braden.com.au, and R80.3 |
| `20260227-contributing-standards-guide-v1.00A.md` | Universal quality, documentation, and code standards for all BSuite projects |
| `20260227-dry-one-shot-architecture-v1.01A.md` | DRY principles and one-shot data entry architecture for all modules (v1.01A: adds §11 Phase 1–6 gap closure) |
| `20260423-cross-app-write-audit-v1.00W.md` | Phase 4 V3+V4 cross-app write audit: zero active violations for `users` / `apprentices` |
| `20260301-crm7-page-inventory-v1.00A.md` | CRM7 page inventory — 148 pages audited with data source and status |
| `20260301-crm7-rbac-matrix-v1.00A.md` | CRM7 RBAC matrix — permission systems audit, role hierarchy, enforcement gaps |
| `20260228-d2c-theme-specification-v1.00A.md` | D2C Neon Electric theme specification (palette, Tailwind config, CSS variables) |
| `20260407-d2c-wcag-contrast-audit-v1.00A.md` | WCAG AA/AAA contrast audit for D2C Neon Electric theme — failing pairs, semantic token recommendations |
| `20260228-gto-standards-reference-v1.00A.md` | National Standards for Group Training Organisations evidence guide |
| `20260303-bsuite-competitive-landscape-v1.00A.md` | BSuite competitive landscape & launch strategy — competitor map, BOOT moat, stub audit summary |
| `20260303-crm8u-code-snippets-v1.00A.md` | Key code patterns, Fair Work API integration stubs, Supabase SSR auth patterns, recommendations for adoption |
| `20260303-crm8u-github-research-v1.00A.md` | CRM8U (GaryOcean428) GitHub repo analysis: architecture, features, code quality, salvageable assets for BSuite |
| `20260310-fairwork-reference-v1.00A.md` | Fair Work compliance reference |
| `20260316-claude-code-prompts-reference-v1.00A.md` | Self-contained prompts for Claude Code to execute remaining roadmap items |
| `20260316-compliance-reference-v1.00A.md` | Compliance documentation |
| `20260316-matrix-reference-v1.00A.md` | Requirements/feature matrix |
| `20260316-mermaid-ui-builder-reference-v1.00A.md` | Mermaid UI builder guide |
| `20260316-navigation-guide-v1.00A.md` | Navigation guide |
| `20260316-navigation-reference-v1.00A.md` | Navigation structure |
| `20260316-performance-report-v1.00A.md` | Performance report |
| `20260316-pricing-strategy-v1.00A.md` | Pricing and subscription strategy — per-seat pricing with AI add-on tiers |
| `20260316-ui-reference-v1.00A.md` | Current BSuite UI architecture summary and canonical UI source chain |
| `20260304-ram-credential-government-access-map-v1.00A.md` | RAM credential and government API access map (USI, ADMS, DTWD) |
| `20260309-bsuite-completeness-matrix-v1.00A.md` | BSuite feature completeness matrix across all five projects |
| `20260316-bsuite-gap-report-v1.00A.md` | BSuite gap report v1 — superseded by v2 (approved/archived) |
| `20260316-docs-compliance-audit-v1.00A.md` | Documentation compliance audit — naming, indexing, and coverage review |
| [`ai/`](ai/README.md) | CRM7 AI Assistant documentation — architecture, features, pricing, integrations |
| [`archive/`](archive/README.md) | Archived per-project roadmaps superseded by the master roadmap |
| [`crm13-docs/`](crm13-docs/README.md) | Imported CRM13 donor documentation — reference for feature parity, not active status truth |
| [`email-templates/`](email-templates/README.md) | Supabase email template HTML files (signup, invite, magic link, etc.) |
| [`plans/`](plans/README.md) | Implementation plans for upcoming features and enhancements |
| `superpowers/` | D2C theme remediation design specs (no README yet) |

---

## CRM7A Repository Research (2025-03-03) — ARCHIVED

The following three documents are archived historical references (status: WA):

1. **20260303-crm7a-quick-reference-v1.00WA.md** — 2-min read, decision matrix, red flags
2. **20260303-crm7a-executive-summary-v1.00WA.md** — 5-min read, business/strategic overview
3. **20260303-crm7a-repository-research-v1.00WA.md** — 15-min read, deep technical analysis

### Key Takeaway

CRM7A is a **3-week-old, experimental monitoring dashboard** with modern UI patterns but **incomplete backend**. Use for **inspiration/reference**, not wholesale adoption. Current CRM7 is more mature and production-grade.

### TL;DR

- **Not production-ready** (0% tests, mock data only, #VERCEL_SKIP markers)
- **Good for**: Next.js 15 patterns, Radix UI setup, sidebar/table UI inspiration
- **Bad for**: Backend architecture, data layer, GTO compliance features
- **Recommendation**: Cherry-pick components, don't fork/merge entire repo
