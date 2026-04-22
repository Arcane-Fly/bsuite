# Theme centralisation + white-labelling plan — BSuite — 2026-04-22

**Status:** A (Approved 2026-04-22 — open questions in §12 answered; executing Phase 0)
**Owner:** Braden + agent
**Supersedes sections of:** the theming parts of `/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md` Parts M.1.a / M.1.b / M.1.c which shipped only partial migrations and left the centralisation incomplete.
**Parent initiative:** BSuite 2026 world-class audit.
**Related docs:** `docs/20260228-d2c-theme-specification-v1.00A.md`, `docs/20260407-d2c-wcag-contrast-audit-v1.00A.md`, `docs/20260227-contributing-standards-guide-v1.00A.md`, `conduit/docs/20260303-theme-system-design-v1.00W.md`, `docs/plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md`, `braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md`.

---

## 1 · Problem statement

**User-facing symptom (2026-04-22):** the BSU /login, /settings, /admin, /billing surfaces render washed-out in light mode; text fails WCAG AA; buttons are invisible; landing-page theme choice does not mirror across the suite; no runtime path to override brand colours for an enterprise tenant.

**Root cause — confirmed by audit:** **2,542 hardcoded colour references** across the 6 consumer apps. The D2C spec mandates OKLCH-only + centralised tokens; the spec was partially applied, not completed. Consumers bypassed the shared package with raw `text-slate-*` / `text-white` / hex literals.

**Blast-radius audit (2026-04-22):**

| App | Hex | slate-N | gray-N | zinc-N | neutral-N | text/bg-white/black | rgba() | **Total** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| business-suite-unified | 96 | 367 | 7 | 2 | 7 | 240 | 14 | **733** |
| crm7 | 150 | 15 | 22 | 2 | 10 | 62 | 20 | **281** |
| braden | 75 | 64 | 317 | 2 | 8 | 206 | 9 | **681** |
| throughput | 10 | 0 | 324 | 0 | 0 | 121 | 1 | **456** |
| R80.3 | 18 | 45 | 18 | 2 | 8 | 104 | 6 | **201** |
| conduit | 49 | 0 | 82 | 2 | 8 | 44 | 5 | **190** |
| **Sum** | **398** | **491** | **770** | **10** | **41** | **777** | **55** | **2,542** |

**Per existing contributing standards (§5):** "Color format rule: oklch mandatory. Never add new hex/rgb color tokens." Braden (corporate) is the only intentional exemption. Every other count above is a violation of policy that was never enforced in CI.

---

## 2 · What past plans committed to vs. what shipped

### 2.1 Intent — from existing artefacts

- **D2C Theme Specification v1.00A** (`docs/20260228-d2c-theme-specification-v1.00A.md`, 1,130 lines) — defines the 11-colour electric palette, light/dark surfaces, WCAG AA text tokens, and a 3-layer architecture: shared package → app overrides → runtime branding.
- **D2C WCAG Contrast Audit v1.00A** (`docs/20260407-d2c-wcag-contrast-audit-v1.00A.md`, 158 lines) — enumerates pass/fail ratios for every token pairing. Cyan-on-white (1.76:1) and several Blue-on-navy combinations (3.73:1) FAIL and were supposed to be remediated.
- **Contributing Standards §5 + §10** — oklch-mandatory, semantic tokens only in consumer code, hardcoded classes forbidden.
- **Adaptive-sonnet plan, Part M.1.a/b/c** — M.1.a promised Tailwind v4 `@theme` remap across all 5 D2C apps; M.1.b promised consumer-surface D2C-token migration (top 5 files per app); M.1.c promised legacy-hex → OKLCH conversion in CRM7 + R80.3 theme.css.
- **Conduit Theme System Design** (`conduit/docs/20260303-theme-system-design-v1.00W.md`) — canonical Tailwind v4 pattern for the Next.js app.
- **CRM7 Broad UI Refresh Plan** (`docs/plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md`) — 9 modules of hardcoded-colour migration scoped but unfinished.
- **Braden Corporate Theme Reference** — intentional deviation from D2C (Red `#ab233a` + Gold `#cbb26a`) documented + exempt from oklch rule.

### 2.2 Actually delivered

- `@bsuite/theme@0.1.2` exists (`packages/theme/`), npm-published, covers the 11 electric colours + some light/dark surfaces + Tailwind v3 preset + v4 `@theme` block + `<ThemeProvider>` + FOUC script.
- M.1.a `@theme` remap shipped per-app (5 commits).
- M.1.b top-5-slate migrations shipped per app (5 commits).
- M.1.c CRM7 + R80.3 `theme.css` hex → OKLCH (2 commits).
- `@bsuite/theme` consumed by all 5 D2C apps + braden consumes it defensively.

### 2.3 Gap — why 2,542 violations remain

1. **The shared package doesn't export the full semantic-token set.** It exports palette + surfaces + shadcn HSL triples (partial) but no `--text-primary / -secondary / -muted / -on-primary`, no `--bg-shell / -elevated / -accent`, no `--border-shell / -subtle`. Each consumer app re-defines those tokens in its own `index.css` — the app-specific duplicates are where drift creeps in.
2. **No runtime white-labelling mechanism.** `tenants` row has no `branding_tokens jsonb` column; no `<BrandingProvider>` reads tenant branding and sets CSS vars on `:root`. Enterprise tenants cannot override primary/accent without a code deploy.
3. **No CI guardrail.** Nothing in the build/test pipeline fails a PR that adds a new `text-slate-*` or hex literal.
4. **Partial migration.** M.1.b only touched the top-5 slate-heavy files per app. The long tail (723 slate-N refs in BSU alone) still exists, plus 398 hex literals, plus 777 `text-white` / `bg-white` refs that break in one of the two themes.
5. **BSU primary colour drift** — the app currently uses Purple `#7c3aed` for `--app-primary` (`src/index.css:26`) instead of the D2C Electric Blue. This predates the spec and was never corrected.

### 2.4 Contradictions found

- `@bsuite/theme/README.md:19` claims "WCAG AA compliant" but the WCAG audit doc shows failing pairs with no remediation guidance in the package.
- Contributing standards §5 mandates oklch; BSU `:root` block has `--app-primary: #7c3aed` (hex) as the active app accent.
- Conduit doc describes Tailwind v4 OKLCH `@theme`; BSU applies the same pattern but with per-app hex overrides that defeat the centralisation.
- CRM7 UI refresh plan (2026-03-16) lists 9 modules; no module-level migration has landed since.

---

## 3 · Objective

**Centralise every theme-relevant token in `@bsuite/theme`. Ship a runtime white-labelling path. Migrate every consumer to semantic tokens so no hex/rgb/slate literal survives outside `@bsuite/theme` + braden's corporate deviation. Enforce in CI. WCAG AA in both themes on every D2C surface.**

Explicit non-goals:
- **NOT** redesigning the palette. The 11-electric OKLCH is the agreed palette; only surface + text + border + shadow semantic aliases expand.
- **NOT** changing braden's corporate brand (red + gold remain intentional).
- **NOT** touching Tailwind v3→v4 migration for the 1 remaining v3 app (throughput — tracked separately under O.10 broader refresh).

---

## 4 · Architecture (3 layers)

### Layer 1 — `@bsuite/theme@0.2.0` as the single source of truth

Package grows from "palette + FOUC" to "palette + all semantic aliases + runtime branding adapter."

Add to `packages/theme/src/css/`:

- `tokens-light.css` — full light-theme token set (text, bg-shell, border, shadow, status, semantic shadcn `--foreground`/`--primary`/`--accent`/`--muted`/`--ring` as HSL triples so `hsl(var(--primary))` resolves).
- `tokens-dark.css` — same token names, dark values.
- `tokens-high-contrast.css` — AAA fallback for users with system contrast preference.
- `tokens-brand-corporate-braden.css` — the Braden red/gold deviation as a preset consumers can opt into.
- `runtime-branding.css` — empty placeholders for `<BrandingProvider>` to fill at runtime.

Entry point `index.css` re-exports the stack in dependency order (palette → light → dark → branding hook → utilities).

Token naming uses the already-established `--text-primary`, `--bg-shell`, `--border-shell`, `--neon-electric-*` — NO new names, just ensuring every token referenced in any consumer lives HERE and not in app-local index.css.

Published as `@bsuite/theme@0.2.0` (minor bump, additive — existing consumers keep working).

### Layer 2 — Consumer migration

Per-app migration codemod `packages/theme-codemod/` (one-off script, not a runtime dep):

1. Replace every `text-slate-N`, `text-gray-N`, `text-zinc-N`, `text-neutral-N` with the nearest semantic token per a published mapping table (text-slate-400 → `text-muted-foreground`; text-slate-300 → `text-secondary`; text-slate-900 → `text-foreground`; etc.).
2. Replace every `bg-*-N` with the nearest surface token.
3. Replace every `border-slate-N` with `border-border` or `border-border-strong`.
4. Replace `text-white` / `text-black` with `text-(--text-on-primary)` / `text-foreground` based on context (needs human review — codemod flags instead of auto-rewrites).
5. Replace hex literals in inline `style={{...}}` with `var(--token)` when the hex matches a known token.
6. Raise a PR per app with the diff + a visual-regression Playwright snapshot.

Each app's local `index.css` / `theme.css` **deletes** the duplicated token definitions and imports `@bsuite/theme/css/tokens-light.css` + `tokens-dark.css` instead. App-specific overrides (e.g. BSU's wrong `--app-primary: #7c3aed` → correct `--app-primary: var(--neon-electric-blue)`) move to a single `app-overrides.css` per app, documented.

### Layer 3 — Runtime enterprise white-labelling

**Migration:** add `tenants.branding jsonb` column + helper `SELECT branding_json_for_tenant(auth.uid())` RPC.

Schema:

```json
{
  "primary": "oklch(0.55 0.22 265)",
  "accent": "oklch(0.77 0.13 195)",
  "logo_url": "https://storage.supabase.co/…",
  "mark_url": "…",
  "font_stack": null
}
```

**Runtime:** `<BrandingProvider>` lives in `@bsuite/theme/react`. On mount it:

1. Calls `supabase.rpc('branding_json_for_tenant')` via the user's authed session.
2. Sets `document.documentElement.style.setProperty('--primary', row.primary)` etc. — one CSS var per key.
3. Caches the result in localStorage for the next paint's FOUC prevention script.
4. Subscribes to `tenants` row-updates via Supabase Realtime so a branding change propagates without page reload.

The existing `ThemeProvider` wraps `BrandingProvider` so branding overrides the D2C default when set, falls back to D2C when unset. Platform-tier tenants get their own `platform_branding` row so BSuite admins can preview what their white-label looks like.

---

## 5 · Phases + deliverables

### Phase 0 — Prep (0.5d)

- Freeze the token naming vocabulary in this plan. No new token names during the migration.
- Write `packages/theme/docs/TOKEN-MAPPING.md` — the definitive hardcoded→semantic mapping table the codemod consumes.
- Commit this plan.

### Phase 1 — `@bsuite/theme@0.2.0` (2d)

- Build tokens-light/dark/high-contrast/corporate-braden CSS files.
- Add semantic shadcn HSL triples missing today (`--primary`, `--accent`, `--secondary`, `--ring`) in BOTH light + dark blocks. Fixes the 8 broken `hsl(var(--primary))` call-sites flagged 2026-04-22.
- Export `<BrandingProvider>` + runtime setter. No consumer migration yet; package is additive.
- `npm publish @bsuite/theme@0.2.0 --access public`.
- Smoke test: consume v0.2.0 in a scratch app, verify all existing palette/surface tokens still render.

### Phase 2 — BSU pilot migration (3d)

BSU has the highest violation count (733) and is the user's primary visible surface. Pilot here so the codemod + mapping table get hardened before the other 5 apps.

- Consume `@bsuite/theme@0.2.0`.
- Delete duplicated token definitions in `src/index.css` (~250 lines removed).
- Run codemod + human-review the output.
- Fix BSU's `--app-primary` hex drift (Purple → D2C Electric Blue).
- Wire `<BrandingProvider>` into `AppContent.tsx`.
- Add Playwright WCAG spec run to CI (axe-core per route) as the regression gate.
- Post-merge axe-core confirms 0 serious/critical violations on `/login`, `/settings`, `/admin`, `/billing`, `/branding`.

### Phase 3 — Codemod scale-out (4d)

One PR per app, in the order decided in §12: throughput (456) → CRM7 (281) → R80.3 (201) → conduit (190) → braden (681, last, after D2C apps prove the codemod).

Per app:
- Consume `@bsuite/theme@0.2.0`.
- Delete local token duplicates.
- Run codemod.
- Human-review flagged ambiguous substitutions (`text-white` etc.).
- Add WCAG Playwright suite if missing.
- Merge.

Braden retains its corporate brand override — the codemod treats the Braden corporate tokens as semantic names and migrates classes against those.

### Phase 4 — Runtime white-labelling (2d)

- Supabase migration: `ALTER TABLE tenants ADD COLUMN branding jsonb DEFAULT '{}'`.
- `branding_json_for_tenant` RPC (`SECURITY DEFINER`, `search_path = public, pg_temp`).
- Extend `<BrandingProvider>` to consume the RPC + subscribe to realtime updates.
- Add an admin UI to BSU `/developer/tenant-settings` (already stubbed) that lets platform admins edit a tenant's branding JSON and preview the result live.
- Four-persona RLS matrix on the RPC (anon / tenant user / tenant owner / platform admin).

### Phase 5 — CI guardrails (1d)

- Lint rule: forbid `text-slate-*`, `bg-slate-*`, `text-white`, `bg-white`, raw hex in source files outside `packages/theme`, `braden/src/**` (corporate exemption), and any `node_modules`. Wire into each app's pre-commit + CI.
- Bundle grep step: post-build `dist/` must contain zero hex literals in CSS source modules beyond the `@bsuite/theme` fallback table.
- Add visual-regression snapshot test per theme (light + dark) for 3 canonical routes per app.

### Phase 6 — Documentation + comms (0.5d)

- Update contributing standards §5 with the new token list.
- Update every CLAUDE.md in the submodules with the codemod + theme-package expectation.
- Write `@bsuite/theme@0.2.0` migration guide.
- Close D2C WCAG Contrast Audit v1.00A as A (approved) with a "remediated 2026-04-MM" entry.

---

## 6 · Success criteria

- [ ] `grep -rEh '#[0-9a-fA-F]{3,8}|text-slate-|bg-slate-|text-white|bg-white' <app>/src` returns zero matches for each of BSU, CRM7, R80.3, conduit, throughput (braden retains exempt corporate usage).
- [ ] axe-core on every WCAG Playwright spec reports 0 serious/critical violations in both light + dark themes.
- [ ] A platform admin can edit a tenant's `branding.primary` OKLCH value and the tenant's users see the new primary colour within 1 second (realtime) and on next page load (persisted).
- [ ] `@bsuite/theme@0.2.0` is the only place token definitions live.
- [ ] CI fails any PR that reintroduces a hardcoded colour in a D2C app.
- [ ] WCAG audit doc moves to status A (approved).

---

## 7 · Skills + MCPs to invoke per phase

Per the adaptive-sonnet plan Part K conventions:

| Phase | Skills | MCPs |
|---|---|---|
| 0 | `master-orchestration`, `writing-plans`, `documentation-compliance` | — |
| 1 | `tailwind-css-v4-best-practices`, `shadcn-ui`, `bsuite-brand-system`, `ui-styling`, `subagent-driven-development` | `Context7 @bsuite/theme`, Context7 `culori` (for any new OKLCH derivation) |
| 2 | +`playwright`, `qa-and-verification`, `security-audit` (branding JSON injection) | Playwright MCP for axe-core, Vercel MCP for deploy verification |
| 3 | Same as 2, multiplied per app | — |
| 4 | `supabase-postgres-best-practices`, `supabase-auth-comprehensive`, `tanstack-query` | Supabase MCP `apply_migration`, `execute_sql` (RLS four-persona matrix), `get_advisors` |
| 5 | `code-quality-enforcement`, `git-workflow` | — |
| 6 | `documentation-compliance`, `cross-platform-sync` | — |

---

## 8 · Rollback

- Any phase is reversible via `git revert`.
- `@bsuite/theme@0.2.0` is additive — consumers on 0.1.x keep working. If 0.2.0 ships a bug we cut 0.2.1.
- Runtime branding has a feature flag `VITE_ENABLE_BRANDING_OVERRIDE` — default true, flip off instantly if the RPC misbehaves.
- DB migration `tenants.branding jsonb DEFAULT '{}'` is additive and reversible.

---

## 9 · Out of scope (explicitly tracked elsewhere)

- BSU login wizard redesign — separate plan, track under Part O.
- Throughput Tailwind v3 → v4 — track under Part O.7 R80 technical remediation + throughput parity.
- CRM7 wizard → BSU (user request 2026-04-22) — separate plan, track under Part O.12.
- Braden corporate brand expansion — defer to Braden product roadmap.

---

## 10 · Status progression

- **W** (Working) — this doc, awaiting Braden's approval.
- **R** (Review) — once Phase 0 prep (mapping table) is drafted.
- **A** (Approved) — when Braden signs off on the architecture + skill cadence.
- **F** (Frozen) — when success criteria in §6 all tick + merged to main.

---

## 11 · References

- `docs/20260228-d2c-theme-specification-v1.00A.md` — the palette, WCAG AA thresholds, the 3-layer intent (pre-dates this plan, authoritative on design).
- `docs/20260407-d2c-wcag-contrast-audit-v1.00A.md` — the failing pairs this plan remediates.
- `docs/20260227-contributing-standards-guide-v1.00A.md` §5 — the oklch-mandatory rule.
- `conduit/docs/20260303-theme-system-design-v1.00W.md` — Tailwind v4 Next.js pattern.
- `docs/plans/20260316-crm7-broad-ui-refresh-plan-v1.00W.md` — the CRM7 9-module refresh, subsumed into Phase 3 here.
- `braden/docs/20260316-braden-corporate-theme-reference-v1.00W.md` — the Braden corporate exemption, preserved.
- `packages/theme/README.md` — the current package surface; Phase 1 expands it.
- `/home/braden/.claude/plans/bsuite-world-class-audit-adaptive-sonnet.md` Parts M.1.a/b/c — what was partially shipped; this plan completes them.

---

## 12 · Decisions (answered 2026-04-22)

1. **Corporate-brand template handling** — Braden corporate red + gold is **developer-only**, reserved for Braden's own website. Not exposed to tenants as a white-label preset. Future "website-as-an-option" is not planned this cycle.
2. **Font override** — `tenants.branding.font_stack` ships in **Phase 4** (initial branding schema, not deferred).
3. **Logo upload path** — use the existing Supabase Storage buckets (no new bucket creation in this plan):
   - **Platform-level** (BSuite master branding): `platform-logos/` — public, 50 MB, `image/png|jpeg|webp|svg+xml`.
   - **Tenant-level** (enterprise white-label): `tenant-logos/{tenant_id}/logo.{png|jpg|webp|svg}` — public, **2 MB** client-enforced limit, 3 existing RLS policies (audit in Phase 4 to confirm fit).
4. **Braden migration window** — **deferred**. Braden migrates LAST in Phase 3 after the 5 D2C apps prove the codemod. Braden's corporate brand renders correctly today; no urgency.

### Knock-on changes from these decisions

- §5 Phase 3 app order: **throughput → CRM7 → R80.3 → conduit → braden (last)**. BSU is Phase 2 pilot.
- §4 Layer 3 schema: drop any `corporate_preset` field. Free-form `branding jsonb` per tenant only.
- §4 Layer 3 storage: no new bucket creation. Reuse `tenant-logos/` for tenants and `platform-logos/` for the platform master row.
- Phase 4 audits `tenant-logos` existing 3 RLS policies — if they don't cover the branding write-path for tenant owners/admins, Phase 4 lands an additive policy (no destructive change to existing policies).
- Client upload code enforces the 2 MB ceiling pre-PUT so the UX never bounces on a rejected upload.
