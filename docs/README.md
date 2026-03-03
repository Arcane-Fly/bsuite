# BSuite Documentation

Top-level documentation for the BSuite multi-project workspace. Contains cross-project standards, architecture references, and planning documents shared across all five applications.

## Contents

| File / Directory | Description |
|------------------|-------------|
| `00-master-roadmap.md` | Single source of truth for BSuite project planning across all projects |
| `20260227-bsuite-deep-audit-report-v1.00W.md` | Deep audit report covering CRM7, BSU, Conduit, braden.com.au, and R80.3 |
| `20260227-contributing-standards-guide-v1.00W.md` | Universal quality, documentation, and code standards for all BSuite projects |
| `20260228-d2c-theme-specification-v1.00W.md` | D2C Neon Electric theme specification (palette, Tailwind config, CSS variables) |
| `20260228-gto-standards-reference-v1.00W.md` | National Standards for Group Training Organisations evidence guide |
| `AUTH-MAP.md` | Authentication map for the Business Suite ecosystem (BSU, CRM7, R80.3, Braden) |
| `DRY-ONE-SHOT-ARCHITECTURE.md` | DRY principles and one-shot data entry architecture for all modules |
| `claude-code-prompts.md` | Self-contained prompts for Claude Code to execute remaining roadmap items |
| `pricing-strategy.md` | Pricing and subscription strategy — per-seat pricing with AI add-on tiers |
| [`ai/`](ai/README.md) | CRM7 AI Assistant documentation — architecture, features, pricing, integrations |
| [`archive/`](archive/README.md) | Archived per-project roadmaps superseded by the master roadmap |
| [`crm13-docs/`](crm13-docs/README.md) | Imported CRM13 donor documentation — reference for feature parity |
| [`plans/`](plans/README.md) | Implementation plans for upcoming features and enhancements |
| `20260228-crm7-page-inventory-v1.00W.md` | CRM7 page inventory — 148 pages audited with data source and status |
| `20260228-crm7-rbac-matrix-v1.00W.md` | CRM7 RBAC matrix — permission systems audit, role hierarchy, enforcement gaps |
| `compliance.md` | Compliance documentation |
| `matrix.md` | Requirements/feature matrix |
| `mermaid-ui-builder.md` | Mermaid UI builder guide |
| `navigation-guide.md` | Navigation guide |
| `navigation.md` | Navigation structure |
| `performance-report.md` | Performance report |
| `ui.md` | UI documentation |

---

## CRM7A Repository Research (2025-03-03)

If you're investigating the **Arcane-Fly/CRM7A** repository for potential reuse or integration with current CRM7, start here:

### Documents
1. **CRM7A-QUICK-REFERENCE.md** — 2-min read, decision matrix, red flags
2. **CRM7A-EXECUTIVE-SUMMARY.md** — 5-min read, business/strategic overview  
3. **CRM7A-REPOSITORY-RESEARCH.md** — 15-min read, deep technical analysis

### Key Takeaway
CRM7A is a **3-week-old, experimental monitoring dashboard** with modern UI patterns but **incomplete backend**. Use for **inspiration/reference**, not wholesale adoption. Current CRM7 is more mature and production-grade.

### TL;DR
- **Not production-ready** (0% tests, mock data only, #VERCEL_SKIP markers)
- **Good for**: Next.js 15 patterns, Radix UI setup, sidebar/table UI inspiration
- **Bad for**: Backend architecture, data layer, GTO compliance features
- **Recommendation**: Cherry-pick components, don't fork/merge entire repo

## External Research & Competitive Analysis

- [20260303-crm8u-github-research.md](./20260303-crm8u-github-research.md) — CRM8U (GaryOcean428) GitHub repo analysis: architecture, features, code quality, salvageable assets for BSuite
- [20260303-crm8u-code-snippets.md](./20260303-crm8u-code-snippets.md) — Key code patterns, Fair Work API integration stubs, Supabase SSR auth patterns, recommendations for adoption
