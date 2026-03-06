# Unified Roadmap, Plan Import & Conduit Phase 3

Consolidate per-project roadmaps into a single BSuite master roadmap, import two `.claude/plans/` into versioned docs (secrets redacted), update AI plan for Conduit, update all CONTRIBUTING.md files, then build Conduit Phase 3 communications infrastructure.

---

## Part A — Plan Import & Documentation

### A1. Import Email Capabilities Plan

- **Source:** `~/.claude/plans/lexical-giggling-bengio.md` (2,971 lines)
- **Target:** `bsuite/docs/plans/20260227-email-capabilities-plan-v1.00W.md`
- **Scope:** Resend (platform), Gmail API, MS Graph, SMTP, Zustand store, compose UI
- **Redactions:**
  - Google OAuth client ID + secret → `<REDACTED — stored in Supabase secrets>`
  - Microsoft client ID + secret + tenant ID → `<REDACTED — stored in Supabase secrets>`
  - Resend API key reference → note that it's in Supabase secrets
- **Additions:** Note that this plan also applies to Conduit (`conduit_communications` table). Conduit uses the same shared Edge Functions but its own `conduit_` prefixed tables.

### A2. Import AI Assistant + Plugin Plan

- **Source:** `~/.claude/plans/velvety-giggling-curry.md` (2,076 lines)
- **Target:** `bsuite/docs/plans/20260227-ai-assistant-plugin-system-plan-v1.00W.md`
- **Scope:** Vercel AI SDK, tool registry, workflow automation, plugin system, Activepieces
- **Redactions:** None needed (no raw credentials)
- **New section — "Conduit Integration":**
  - Conduit-specific AI tools (candidate search, pipeline management, compliance alerts)
  - Conduit communication tools (send email/SMS via shared Edge Functions)
  - Cross-app tool registry pattern (CRM7 + Conduit tools in shared registry)

---

## Part B — Unified Master Roadmap & Archive

### B1. Create `bsuite/docs/00-master-roadmap.md`

Single source of truth. Structure:

```
# BSuite Master Roadmap
## Active Sprint (Feb 27, 2026)
## By Project
  ### business-suite-unified — Portal + Stripe billing
  ### crm7 — AI chat, document storage, funding claims
  ### conduit — Phase 3: comms, documents, analytics
  ### braden — Visual editor, site preview
  ### R80.3 — Commercialisation, PWA, testing
## Shared / Cross-Cutting
  ### Email & SMS Infrastructure (from email plan)
  ### AI Assistant & Plugin System (from AI plan)
  ### Supabase Schema & Auth
## Archive Index (links to docs/archive/)
```

Content sourced from:

- `crm7/docs/00-roadmap/20260226-master-roadmap.md`
- `braden/docs/ROADMAP.md`
- `R80.3/docs/roadmap.md`
- Conduit competitive analysis (Phase 3 priorities)
- The two imported plans

### B2. Archive old roadmaps → `bsuite/docs/archive/<project>/`

| Source | Archive Target |
|--------|---------------|
| `crm7/docs/00-roadmap/20260226-master-roadmap.md` | `docs/archive/crm7/20260226-master-roadmap.md` |
| `braden/docs/ROADMAP.md` | `docs/archive/braden/20260227-roadmap-v1.md` |
| `R80.3/docs/roadmap.md` | `docs/archive/r80/20260227-roadmap-v1.md` |

Replace originals with a redirect stub → `bsuite/docs/00-master-roadmap.md`.

### B2b. Centralize CRM7 `00-roadmap/` docs

The CRM7 `00-roadmap/` folder contains 4 files. The roadmap itself gets archived (above). The remaining 3:

| File | Action |
|------|--------|
| `20260226-document-storage-issues.md` (issues) | **Keep in CRM7** — link from master roadmap |
| `20260226-document-storage-qa-report.md` (QA) | Move to `docs/archive/crm7/` — reference doc |
| `20260226-au-funding-claims-enhancement-implementation-plan-1.00W.md` | Move to `docs/plans/` — cross-project plan |

### B3. Update all CONTRIBUTING.md files

Append a "Roadmap" section to each:

```markdown
## Roadmap

The BSuite master roadmap lives at [`../docs/00-master-roadmap.md`](../docs/00-master-roadmap.md).
Per-project roadmaps have been archived to `docs/archive/<project>/` at the bsuite root.
New roadmap items go in the master roadmap under the relevant project section.
```

Files to update:

- `conduit/CONTRIBUTING.md`
- `crm7/CONTRIBUTING.md`
- `braden/CONTRIBUTING.md`
- `R80.3/CONTRIBUTING.md`
- `business-suite-unified/CONTRIBUTING.md`
- `docs/20260227-contributing-standards-guide-v1.00W.md` (add roadmap governance section)

---

## Part C — Conduit Phase 3: Communications Infrastructure

After Parts A+B, build the communications system. Uses shared Supabase Edge Functions from the email plan, Conduit-specific store/UI, and D2C Neon Electric theme.

### C1. Zustand Store — `conduit/src/stores/communicationStore.ts`

- Fetch/create/update communications from `conduit_communications`
- Track email + SMS channel types
- Support template selection and variable substitution
- Tenant-scoped queries via `useTenantId`

### C2. Communication Service — `conduit/src/lib/communicationService.ts`

- Send email via shared Edge Function (`email-dispatcher`)
- Send SMS via shared Edge Function (future)
- Fetch communication timeline per candidate/job
- Template management (CRUD)

### C3. UI Components — `conduit/src/components/communications/`

- **CommunicationTimeline** — Activity feed per candidate (emails, SMS, notes)
- **ComposeDialog** — Email compose with template selector, rich text
- **TemplateManager** — Create/edit email templates with variable placeholders

### C4. Page Integration

- Add Communications tab to candidate detail page (`candidates/[id]/page.tsx`)
- Add Communications tab to job detail page (`jobs/[id]/page.tsx`)
- Add top-level `/communications` inbox page (optional, lower priority)

### Style Notes

- D2C Neon Electric theme (Electric Blue primary, deep navy dark mode)
- Reuse patterns from existing Conduit components (`StatusBadge`, `EmptyState`)
- Shared component patterns: if `DataTable` from CRM7 proves useful, consider extracting to shared; otherwise Conduit builds its own
- Lucide icons, Radix UI primitives, Tailwind utility classes
- Sonner for toast notifications

---

## Execution Order

1. **A1** — Import & redact email plan
2. **A2** — Import & extend AI plan with Conduit section
3. **B1** — Create unified master roadmap
4. **B2** — Archive old roadmaps + create stubs
5. **B2b** — Centralize CRM7 docs (move/link)
6. **B3** — Update all CONTRIBUTING.md files
7. **C1** — Build communicationStore.ts
8. **C2** — Build communicationService.ts
9. **C3** — Build UI components
10. **C4** — Integrate into candidate/job pages
