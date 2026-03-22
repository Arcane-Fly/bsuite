# D2C Theme, Magic UI, and Capability Remediation — Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Scope:** CRM7 (primary), BSU, Conduit, R80.3 (token convergence); Braden excluded
**Lanes:** Claude Code = data/logic (A1–A3, C1, demo mode); Cascade = visual (B1–B3, bento grid)

---

## 1. Per-App D2C Accent System

All D2C apps share: navy shell (`#0a0e1a`), same spacing scale, same typography. Only accent tokens differ.

| App | Primary | Accent | Label |
|-----|---------|--------|-------|
| CRM7 | Electric Blue `#2563eb` | Cyan `#00cec9` | Blue · Cyan |
| BSU Portal | Purple `#7c3aed` | Lavender `#a78bfa` | Purple · Lavender |
| Conduit | Emerald `#059669` | Green `#34d399` | Green · Growth |
| R80.3 | Amber `#d97706` | Gold `#fbbf24` | Amber · Compliance |
| Braden.com.au | Red `#ab233a` | Gold `#cbb26a` | Corporate — excluded from D2C tokens |

**Correction from review:** App card/section headings must NOT use pure white (`#f2f2f2`). Use accent-200 or `slate-200` (`#e2e8f0`) — subtle tint, not pure white. This applies to all heading text sitting on the dark navy shell.

CSS variables per app:

```css
/* CRM7 */
--app-primary: #2563eb;
--app-accent: #00cec9;
--app-primary-glow: rgba(37, 99, 235, 0.15);
--app-accent-glow: rgba(0, 206, 201, 0.12);
```

Each app's `theme.css` gets its own `--app-primary` / `--app-accent` / `--app-primary-glow` / `--app-accent-glow` set. These feed into the panel glow and bento grid shadow system.

---

## 2. Magic UI Component Placement Map

### Installed (hand-copied, already in `crm7/src/components/magicui/`)

- `border-beam.tsx` — rotating border on stat/metric cards
- `number-ticker.tsx` — animated numeric values (heroSignals, KPIs)
- `blur-fade.tsx` — panel reveal on mount

### To Install (via `npx shadcn@canary add`)

In priority order:

| Component | Placement | Note |
|-----------|-----------|------|
| `dot-pattern` | Hero/page backgrounds | Subtle, per-app accent tint; opacity ~0.06 |
| `animated-gradient-text` | Section headings, Jodie label | Use accent pair colors |
| `shine-border` | **Auth card panels only** | Matches reference login screenshot; rainbow sweep |
| `meteors` | Jodie AI panel — idle state | Subtle background animation when no conversation active |
| `typing-animation` | Jodie AI — streaming responses | Replaces static text render during AI output |

### Dashboard / Page Layout Rule

Panels use a **bento grid** layout (varied panel sizes, visual hierarchy). Not the current equal-column grid.

- Dark mode: panel borders have accent color glow (`box-shadow: 0 0 0 1px var(--app-accent-glow), 0 4px 24px var(--app-primary-glow)`)
- Light mode: panels use accent-hinted shadow (`box-shadow: 0 1px 3px rgba(37,99,235,0.08), 0 4px 16px rgba(37,99,235,0.05)`)
- Dashboard currently wastes vertical space — bento grid must fill the viewport

**Handoff note:** Bento grid layout is Cascade's B1 territory. This spec documents the requirement and the glow/shadow token formula. Cascade implements the layout.

---

## 3. Financial Reports — Dedicated Edit Route

Financial report editing uses **dedicated routes**, not a dialog.

```
/financial/reports              — list view (replace DUMMY_REPORTS with real data)
/financial/reports/:id          — report detail (read view)
/financial/reports/:id/edit     — edit form (persisted)
/financial/reports/new          — create new report
```

Rationale: deep-linkable, browser-back works, avoids dialog state complexity with large forms.

Report form (`report-form-dialog.tsx`) is repurposed into a routed page component. All create/edit actions backed by a real service + Supabase persistence. No simulated generation.

`DUMMY_REPORTS` array in `financial/reports/index.tsx` is removed. Page shows empty state when no real reports exist.

---

## 4. Demo Mode Architecture

### Concept

Replace all hardcoded data and toggles with a **seeded demo user account** in Supabase.

### Demo User Account

- Email: `demo@crm7.app` (or equivalent system account)
- Full seeded data: contacts, opportunities, apprentices, reports, financials, claims, hosts, training plans
- Data is realistic GTO/CRM workflow data — not random placeholder numbers

### Access Path

Remove the current dashboard toggle. Instead:

- Developer footer section (already exists in sidebar) gets an **"Impersonate Demo" entry** alongside other developer tools
- Functions like user impersonation — switches auth context to the demo user
- Visually identical to the real product

### Session Behavior

- Demo user's writes are session-scoped: Supabase RLS policy for the demo account blocks INSERT/UPDATE/DELETE from persisting
- Writes appear to succeed in-session (optimistic UI) but are not committed to the DB
- A persistent toast/banner: "Demo mode — changes won't be saved" with a "Return to your account" link

### Persist Demo Data Toggle

In the developer section (alongside "Impersonate Demo"), a **"Persist demo data"** toggle:

- When ON: writes persist normally (for Braden doing UI redesign work, testing new features with real-looking data)
- When OFF (default): session-only behavior above
- State stored in `tenant_settings` for the demo tenant

### White-Label Preview in Demo Mode

Demo mode should allow applying platform customizations (logo, brand colors) to preview white-labeling. This is a future-phase feature — the architecture should not block it, but implementation is deferred.

### Code Changes (A1 target)

- Remove `DEMO_METRICS` constant from `Dashboard.tsx`
- Remove `DUMMY_REPORTS` from `financial/reports/index.tsx`
- Dashboard metrics trace only to live query results or explicit demo-user context
- No hardcoded revenue numbers in production routes

---

## 5. Add Person — Apprentice/Trainee Completeness (A3)

`people/new.tsx` expanded to capture all fields required for GTO workflow completion at record creation:

**Required fields (must be present at create):**

- Employment: employer ABN, employment start date, employment type (full/part-time/school-based)
- Training: training contract number, qualification code (from RTO), RTO name + TOID
- Supervision: supervisor name + contact, host employer (if placement)
- Compliance: USI, funding body (from state registry), STA notification status

Validation reflects real required data. Empty state on new form shows all sections up front (not progressive reveal that hides required fields).

Schema: `people.ts` / `person.ts` types expanded to match.

---

## 6. Builder / Customization (C1)

Deferred to Phase 3. Architecture constraint: reuse existing `DashboardPageEditorDrawer` and settings surfaces — no parallel system. Persistence must be tenant-scoped (with future user-override layer).

Document only for now; no implementation until A1–A3 and B1–B3 are stable.

---

## 7. Cross-App Token Convergence

CRM7 is the reference implementation. After B1–B3 stable:

1. BSU, Conduit, R80.3 each get their `--app-primary` / `--app-accent` token set in their own `theme.css`
2. `@bsuite/theme` package (Phase 6 in remediation plan) bundles shared tokens + Tailwind preset after per-app implementations confirm the shape

Braden: **excluded from D2C token sharing**. Corporate palette stays. Magic UI components may be added separately at low priority.

---

## 8. Sequencing

| Phase | Work | Owner |
|-------|------|-------|
| 1a | A1 — Remove hardcoded data, add demo user account | Claude Code |
| 1b | A2 — Financial report route + persistence | Claude Code |
| 1c | A3 — Add Person field completeness | Claude Code |
| 2a | B1 — Shell/dashboard bento grid + glow system | Cascade |
| 2b | B2 — Jodie premium shell (meteors + typing animation) | Cascade |
| 2c | B3 — Auth ShineBorder reference pattern | Cascade |
| 3 | C1 — Builder audit + persisted customization | Claude Code |
| 4 | Magic UI installs (dot-pattern, animated-gradient-text) | Claude Code |
| 5 | Cross-app token convergence (BSU, Conduit, R80.3) | Claude Code |
| 6 | `@bsuite/theme` package | Claude Code |

---

## 9. Verification Checklist

- [ ] `pnpm typecheck` clean in all touched apps
- [ ] No `DUMMY_REPORTS` or `DEMO_METRICS` in production routes
- [ ] `/financial/reports/:id/edit` renders and persists
- [ ] Demo impersonation accessible from developer footer
- [ ] Demo mode toast visible when impersonating demo user
- [ ] Persist demo data toggle works (ON = persist, OFF = session only)
- [ ] `--app-primary` / `--app-accent` tokens set in CRM7 `theme.css`
- [ ] Heading text on dark shell uses `slate-200` or accent-tinted, not pure white
- [ ] ShineBorder on auth card only — not on dashboard panels
- [ ] DotPattern subtle (≤ opacity 0.06) in hero/page backgrounds
