# CRM13 Donor Documentation Index

> **[IMPORTED FROM CRM13]** — Reference material from the CRM13 predecessor project.
> These documents capture architecture, requirements, and implementation progress from CRM13.
> They are NOT canonical for CRM7 — use as reference for feature parity and donor harvesting.

**Import date:** 2026-02-28
**Total files:** 93 markdown documents + 1 data file

---

## Architecture (1 file)

| File | Description |
|------|-------------|
| [architecture/mcp-system.md](architecture/mcp-system.md) | MCP server system architecture |

## Guides (4 files)

| File | Description |
|------|-------------|
| [guides/auth-redirect-configuration-guide.md](guides/auth-redirect-configuration-guide.md) | Auth redirect configuration guide |
| [guides/auth-redirect-configuration.md](guides/auth-redirect-configuration.md) | Auth redirect configuration (duplicate of above?) |
| [guides/module-exports.md](guides/module-exports.md) | Module export patterns |
| [guides/vercel-environment-variables.md](guides/vercel-environment-variables.md) | Vercel env var setup |

## Models (6 files)

| File | Description |
|------|-------------|
| [models/award-management.md](models/award-management.md) | Award management data model |
| [models/client-profiles.md](models/client-profiles.md) | Client/employer profile model |
| [models/communication-management.md](models/communication-management.md) | Communication tracking model |
| [models/compliance-management.md](models/compliance-management.md) | Compliance management model |
| [models/document-management.md](models/document-management.md) | Document management model |
| [models/employee-profiles.md](models/employee-profiles.md) | Employee/apprentice profile model |

## Requirements (8 files + README)

| File | Description |
|------|-------------|
| [requirements/compliance.md](requirements/compliance.md) | Compliance requirements |
| [requirements/functional.md](requirements/functional.md) | Functional requirements |
| [requirements/integration.md](requirements/integration.md) | Integration requirements |
| [requirements/matrix.md](requirements/matrix.md) | Requirements traceability matrix |
| [requirements/performance.md](requirements/performance.md) | Performance requirements |
| [requirements/security.md](requirements/security.md) | Security requirements |
| [requirements/technical.md](requirements/technical.md) | Technical requirements |
| [requirements/ui.md](requirements/ui.md) | UI/UX requirements |

## Specifications (1 file)

| File | Description |
|------|-------------|
| [specifications/workforce-one.md](specifications/workforce-one.md) | Workforce One integration spec |

## Supabase (7 files)

| File | Description |
|------|-------------|
| [supabase/authentication.md](supabase/authentication.md) | Supabase auth setup |
| [supabase/database.md](supabase/database.md) | Database schema documentation |
| [supabase/getting-started.md](supabase/getting-started.md) | Supabase getting started guide |
| [supabase/prisma-integration.md](supabase/prisma-integration.md) | Prisma ORM integration (CRM13-era, not used in CRM7) |
| [supabase/redirect-urls.md](supabase/redirect-urls.md) | Auth redirect URL configuration |
| [supabase/row-level-security.md](supabase/row-level-security.md) | RLS policies documentation |
| [supabase/typescript.md](supabase/typescript.md) | TypeScript types generation |

## Troubleshooting (2 files)

| File | Description |
|------|-------------|
| [troubleshooting/supabase-migration-order-fix.md](troubleshooting/supabase-migration-order-fix.md) | Migration ordering fix |
| [troubleshooting/typescript-errors.md](troubleshooting/typescript-errors.md) | Common TS error solutions |

## Vercel (11 files)

| File | Description |
|------|-------------|
| [vercel/auth-deployment-fix.md](vercel/auth-deployment-fix.md) | Auth deployment fix |
| [vercel/build-fix-summary.md](vercel/build-fix-summary.md) | Build fix summary |
| [vercel/build-optimizations.md](vercel/build-optimizations.md) | Build optimization techniques |
| [vercel/ci-cd.md](vercel/ci-cd.md) | CI/CD pipeline configuration |
| [vercel/edge-functions.md](vercel/edge-functions.md) | Edge function deployment |
| [vercel/environment-setup.md](vercel/environment-setup.md) | Environment setup guide |
| [vercel/environment-variables.md](vercel/environment-variables.md) | Environment variable reference |
| [vercel/getting-started.md](vercel/getting-started.md) | Vercel getting started |
| [vercel/monitoring.md](vercel/monitoring.md) | Monitoring and observability |
| [vercel/performance.md](vercel/performance.md) | Performance optimization |
| [vercel/security.md](vercel/security.md) | Security configuration |

## Progress Reports (38 files)

Development progress tracking from CRM13 implementation.

| File | Description |
|------|-------------|
| [progress/accessibility-next-steps.md](progress/accessibility-next-steps.md) | Accessibility improvements |
| [progress/api-service-implementation.md](progress/api-service-implementation.md) | API service progress |
| [progress/apprentice-employee-schema.md](progress/apprentice-employee-schema.md) | Apprentice/employee schema design |
| [progress/auth-and-notes-fixes.md](progress/auth-and-notes-fixes.md) | Auth and notes bug fixes |
| [progress/auth-fixes.md](progress/auth-fixes.md) | Authentication fixes |
| [progress/auth-testing-implementation.md](progress/auth-testing-implementation.md) | Auth testing implementation |
| [progress/auth-testing-improvements.md](progress/auth-testing-improvements.md) | Auth testing improvements |
| [progress/auth-testing-next-steps.md](progress/auth-testing-next-steps.md) | Auth testing next steps |
| [progress/auth-testing-plan.md](progress/auth-testing-plan.md) | Auth testing plan |
| [progress/auth-type-fixes.md](progress/auth-type-fixes.md) | Auth type fixes |
| [progress/backend-visualization.md](progress/backend-visualization.md) | Backend visualization progress |
| [progress/build-error-fixes.md](progress/build-error-fixes.md) | Build error resolution |
| [progress/data-schema-improvements.md](progress/data-schema-improvements.md) | Schema improvement progress |
| [progress/devcontainer-security-improvements.md](progress/devcontainer-security-improvements.md) | Devcontainer security |
| [progress/fixed-issues-summary.md](progress/fixed-issues-summary.md) | Fixed issues summary |
| [progress/gto-implementation-status.md](progress/gto-implementation-status.md) | GTO feature implementation status |
| [progress/gto-schema-updates.md](progress/gto-schema-updates.md) | GTO schema update progress |
| [progress/improvement-opportunities.md](progress/improvement-opportunities.md) | Identified improvements |
| [progress/mcp-servers-fix.md](progress/mcp-servers-fix.md) | MCP server fixes |
| [progress/mermaid-ui-builder.md](progress/mermaid-ui-builder.md) | Mermaid UI builder progress |
| [progress/navigation-actionpanel-updates.md](progress/navigation-actionpanel-updates.md) | Navigation action panel |
| [progress/navigation-audit.md](progress/navigation-audit.md) | Navigation audit results |
| [progress/navigation-build-fixes.md](progress/navigation-build-fixes.md) | Navigation build fixes |
| [progress/navigation-implementation-status.md](progress/navigation-implementation-status.md) | Navigation implementation |
| [progress/navigation-improvements-implementation.md](progress/navigation-improvements-implementation.md) | Navigation improvements |
| [progress/navigation-improvements.md](progress/navigation-improvements.md) | Navigation improvements plan |
| [progress/navigation-routing-audit.md](progress/navigation-routing-audit.md) | Routing audit |
| [progress/navigation-sidebar.md](progress/navigation-sidebar.md) | Sidebar navigation |
| [progress/navigation-supabase-integration.md](progress/navigation-supabase-integration.md) | Nav + Supabase integration |
| [progress/prisma-schema-integration.md](progress/prisma-schema-integration.md) | Prisma schema integration |
| [progress/puck-editor-removal-plan.md](progress/puck-editor-removal-plan.md) | Puck editor removal plan |
| [progress/puck-editor.md](progress/puck-editor.md) | Puck editor implementation |
| [progress/route-fixes.md](progress/route-fixes.md) | Route fix progress |
| [progress/schema-application-manual-steps.md](progress/schema-application-manual-steps.md) | Schema application steps |
| [progress/schema-relation-validation.md](progress/schema-relation-validation.md) | Schema relation validation |
| [progress/section-layouts.md](progress/section-layouts.md) | Section layout progress |
| [progress/system-direction.md](progress/system-direction.md) | System direction document |
| [progress/training-section-implementation.md](progress/training-section-implementation.md) | Training section implementation |

## Root-Level Files (13 files)

| File | Description |
|------|-------------|
| [auth-configuration-guide.md](auth-configuration-guide.md) | Auth configuration guide |
| [backend-visualization.md](backend-visualization.md) | Backend visualization |
| [cleanup-plan.md](cleanup-plan.md) | Cleanup plan |
| [cleanup-summary.md](cleanup-summary.md) | Cleanup summary |
| [crm7-features.md](crm7-features.md) | CRM7 feature list (key reference) |
| [development-environment.md](development-environment.md) | Dev environment setup |
| [mermaid-ui-builder.md](mermaid-ui-builder.md) | Mermaid UI builder guide |
| [navigation-guide.md](navigation-guide.md) | Navigation guide |
| [navigation.md](navigation.md) | Navigation structure |
| [performance-report.md](performance-report.md) | Performance report |
| [supabase-performance-issues.md](supabase-performance-issues.md) | Supabase performance issues |
| [system-README.md](system-README.md) | System overview |
| [ui-builder-guide.md](ui-builder-guide.md) | UI builder guide |

## Data Files

| File | Description |
|------|-------------|
| [data/2021 - 2021.csv](data/2021%20-%202021.csv) | Historical data export |

## QA

| File | Description |
|------|-------------|
| [qa/README.md](qa/README.md) | QA process documentation |
