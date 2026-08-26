# BSuite Completion Program — orchestration plan + team briefs

**Status:** F (Frozen) · **Owner:** claude-code (orchestrator) · **Created:** 2026-07-16
**Operator directive (2026-07-16):** "all via /subagent-driven-development you orchestrate over the top. first plan, and give each team a clear brief." + "don't stop until everything is complete… if you notice UI or UX bugs, something that isn't compliant with the GTO guidelines documented, or anything else then that gets added to the work list… you DO NOT STOP to prompt me."

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## 1. Goal + success condition (loop contract)

**Goal:** BSuite reaches "world class" — 135 open issues across 7 repos triaged to done, with public-facing docs, clean repo, zero known silent-data-loss or wrong-tenant defects.

**Success condition (binary, per issue — NOT "looks done"):**
1. Acceptance criteria in the issue met, verified against **live/deployed** evidence (§12.3), not local CI alone.
2. Tests green (`pnpm typecheck` + relevant vitest) — command + output recorded.
3. Merged to submodule `main`; DB changes applied via floor-gated `supabase-migrate` dispatch and re-verified in the **live catalog** (§12.1.1).
4. Issue closed with an `evidence_url`.
5. A **separate verifier** (maker ≠ checker) confirms 1–4 before flip-to-done.

**Program-level done:** every issue in clusters A–F either closed with evidence, or explicitly re-scoped/declined with a written reason, or parked in cluster E awaiting operator judgment.

## 2. Decomposition (from the real backlog — not invented)

| Cluster | Scope | Backing issues |
|---|---|---|
| **A** | Card / canvas layout system | crm7 #744, bsuite #1588, page-builder ×6, dnd-kit ×3 |
| **B** | Public docs + user guides (4 audiences) | *greenfield — none exist* |
| **C** | P1 UX / data-integrity | crm7 #1123, #1125, #1126, #1124, #1127 |
| **D** | Repo org / hygiene | bsuite #1263, #1227, #1505, #1542; crm7 #836 |
| **E** | Compliance / operator-gated | crm7 #1129 (P0), #1128, #1130 |
| **F** | Infra / auth | bsuite #1322, #1315 |

## 3. Orchestration shape — two-track (operator-approved)

- **Fix-track** (serial per submodule; worktree-isolated when parallel): **C → A → D → F**.
- **Docs-track** (**B**): runs continuously, **trailing the fix-track by one wave** — a surface is only documented once it is fixed and live-verified. *Exception:* audience-4 (operator runbooks) may start immediately; it documents the operator's own process, which isn't changing.
- **E**: not a team. A **surfacing queue** to the operator. Agents MUST NOT auto-fix. #1129 (cross-tenant FK leakage) is explicitly `DO NOT auto-fix; operator sign-off required`.

**Why docs trail:** documenting a product that silently discards compliance fields (#1125) or writes to the wrong tenant (#1123) yields *confidently wrong docs* — worse than none.

**Why C first:** #1123 and #1125 are the only issues in the backlog that **destroy or misdirect user data**. Severity outranks polish.

## 4. Hard constraints the orchestration must respect

1. **Concurrency ≤ ~2 subagents** — operator runs heavy QIG compute (`feedback_resource_budget_subagents`).
2. **Worktree isolation** — 2+ agents in one submodule need dedicated worktrees (`feedback_parallel_agents_need_worktrees`).
3. **Migration path** — merge → parent pointer bump → `gh workflow run supabase-migrate.yml --ref main -f submodule=<x>` → **verify live catalog**. A migrate run reporting *success* proves nothing if the pointer is stale (burned us 2026-07-16).
4. **Unique migration timestamps across ALL submodules** (`feedback_shared_schema_migrations_version_collision`).
5. **Theme**: `@bsuite/theme` oklch tokens only; braden is corporate-brand exempt (`bsuite-brand-system`).
6. **Never relabel red CI as informational** (`feedback_dont_relabel_failures_as_informational`).

## 5. Model tiering

| Role | Tier |
|---|---|
| Implementer (routine fix) | `sonnet` |
| Implementer (compliance-critical: wage/BOOT/tenant-isolation/data-integrity) | `opus` |
| Verifier / judge (must ≠ implementer) | `haiku`→`sonnet` by risk |
| Docs author | `sonnet` |

## 6. Team briefs

### Team C — P1 UX / data-integrity (WAVE 1, `opus` for #1123/#1125)
- **#1123** multi-tenant arbitrary-tenant landing. Ship a **confirm-your-organisation interstitial** for multi-tenant users on first load per session, AND/OR server-side last-used-tenant persistence. MUST NOT add friction for single-tenant users (the common case). Note F15 (stale `app_metadata.tenant_id` from `home_tenant_id`) is already fixed in main (`e6dcae36`) — this is the upstream UX gap.
- **#1125** hosts/create silently discards Safety Rating + Compliance Status — **no backing columns exist** on `employers`. Decide + self-report: real columns (migration, filterable/reportable — preferred for compliance data under GTO Standards element 2) vs `custom_fields`. Verify by SQL SELECT post-fix.
- **#1126** `LocalisedDateInput` silently blanks ISO input on blur. Either secondary ISO parse or inline error preserving raw text — **never silently clear**. ⚠️ Blocks-adjacent: R80.3's new DOB/commencement inputs use this component.
- **#1124** person-detail ~7s cold load — parallelize the serial `profiles`→`tenants`→`branding_json_for_tenant` chain before entity fetch; add progressive skeleton.
- **#1127** onboarding-pilot UX polish batch (F5/F10/F11/F12/F17/F21).

### Team A — Card/canvas (WAVE 2, `sonnet`) — operator ruling 2026-07-16
Order is mandatory: **(1)** fix #744 (outer card snaps shut on resize; col-width lock; restore 2/3-col intermediate) → **(2)** fix #1588 (drag/resize never persists — persist per-user per-page) → **(3)** default = **expanded on load** → **(4)** user collapse/resize **persists** → **(5)** keep BSU `ColorEditorSheet` progressive-disclosure for dense editors → **(6)** guard perf against #1124 (lazy/virtualize). Do NOT blanket-expand over the broken system.

### Team B — Docs (trailing, `sonnet`) — 4 audiences (operator: "all of the above")
1. GTO staff/admins (CRM7 daily: people, placements, timesheets, award-rates, BOOT, reports)
2. Apprentices + host employers (portals, timesheet approval, leave, training, documents)
3. Public docs site (prospects/MBAWA board; BOOT + compliance explainers)
4. Operator/platform runbooks (migrate dispatch, pointer bumps, vault rotation, tenant switch, branding tiers, #1130) — **may start now**

### Team D — Hygiene (WAVE 3, `haiku`/`sonnet`)
Branch sweeps (#1263/#1227), deps 1–2 majors behind (#836 — never downgrade), deferred hardening (#1505), advisor findings (#1542).

### Team E — Operator-gated (surfacing only, NO auto-fix)
#1129 P0 cross-tenant FK leakage (FutureBuild = **real client**, exemplar-quality, do not break), #1128 54 doc categories (compliance judgment = Braden), #1130 ops checklist.

### Team F — Infra (WAVE 4)
#1322 Supabase → ap-southeast-2 (⚠️ its "before MBAWA board pitch — mid-June 2026" deadline has **already passed**; re-confirm scope), #1315 all apps → BS OAuth PKCE.

## 7. Continuous intake (operator directive)

Any UI/UX bug, GTO-guideline non-compliance, or other defect discovered mid-flight is **filed as a GitHub issue + appended to `bsuite_pending_actions`** via the memory REST API. Never silently dropped, never used as a reason to stop.

> **Transport note:** the `qig-memory` **MCP** is 401 (cannot be authorized non-interactively). The memory **REST API** (`https://qig-memory-api.vercel.app/api/memory`) is reachable via `curl` and is the canonical path per CLAUDE.md — use it. - memory fixed. use the qig-memory mcp it is now authed. existing domain and 



## 8. Verification (maker ≠ checker)

Every task: implementer subagent → **separate** verifier subagent grades against live evidence → only then flip-to-done. An agent never grades its own work. Verifier checks: live-catalog state for DB changes, deployed-domain evidence for UX, command+output for tests, and that the issue's own "Mandatory before merge" block is satisfied.


# CC Directive — Consolidated Workstreams (Theme A1 · VET Reference Architecture · Jodie)

**Date:** 2026-07-17 · **Status:** A (operator-approved) · **Silo:** BSuite only
**Version:** 1.01A — adds W9 (enterprise licensing/seats, FutureBuild unblock), W10 (AI metering/caps/overage), W6 proposal entity + cost capture
**Authority:** Operator direction in-session overrides any conflicting memory entries (per standing rule).
**Memory anchors:** `bsuite_decision_vet_reference_model`, `bsuite_todo_au_data_residency` (deferred — do NOT action Sydney/AU residency in this cycle).

---

## 0. Priority order & dependency graph

```
P0-a  W1    Jodie panel overflow fix (crm7)             — small, independent, ship first
P0-b  W2    Braden red-destructive fix (braden)         — colourblind P0, standalone hotfix
P0-c  W9.0  FutureBuild licence unblock (BSU)           — SIGNED customer cannot onboard
P1    W3    @bsuite/theme 0.6.0 "A1"                    — independent
P1    W4    VET L1/L2 reference schema + TGA ingest     — prerequisite for W5, W6
P1    W9.1  Licensing console + re-invoice reminders    — BSU, after W9.0
P1    W10   AI metering → caps → card overage           — stage strictly in that order
P2    W5    Unit picker cascade + /vet/units/create     — depends W4
P2    W6    Jodie TGA tool + proposal entity            — depends W4 (UI on W1)
P3    W7    Six-app landing audit                       — discovery-only, parallel any time
P3    W8    #1129 Boyle reframe                         — lands as the W4 reconciliation step
```

W1 and W2 are same-day hotfixes; W9 Phase 0 completes this week — a signed, paying enterprise blocked from onboarding outranks all feature work. W3 and W4 run in parallel (different repos/surfaces). Do not start W5/W6 before the W4 schema PR is merged. W10 stages: ledger first, caps second, overage third — never enable a cap before metering is proven accurate. Sydney/AU data residency is explicitly **out of scope** — it is a flagged backlog TODO with an escalation trigger, nothing more.

---

## W1 — Jodie chat panel: overflow + token binding (crm7) — P0-a

**Observed (prod screenshot, 2026-07-17):** user-bubble text with a long WA TPS URL overflows horizontally outside the visible panel; assistant bubble renders as a dark navy slab in light mode (dark-surface token or hardcoded chat colour leaking into light mode); overall bubble styling does not follow the role-token contract.

> ### ✅ DOM AUTOPSY COMPLETE — root causes verified against installed source, 2026-07-17 (supersedes the "expected root causes" in step 1)
>
> **RC1 — the dark navy slab.** `src/components/ai/AIMessage.tsx:71` renders the assistant bubble with an **inline** `background: linear-gradient(…, var(--glow-shell-navy-74) …)`. That token (`src/styles/theme.css:173`) is defined **only** in a bare `:root {}` block and is **never overridden in `.dark {}`** — so it resolves to the same near-black in *both* themes. The brief's hypothesis (surviving `chat.user`/`chat.agent` hexes from the legacy universal-theme doc) was **wrong** — it is a glow-shell token leak, not a chat hex.
>
> **This is a KNOWN, PREVIOUSLY-FIXED bug class in this exact codebase.** Comments in `AIInputArea.tsx` and `AIQuickActions.tsx` name it the **"E3 bug class"** and carry the established fix pattern: swap to `bg-(--bg-input)`/`bg-muted` + `border-border`, with a regression test asserting `container.innerHTML` no longer contains `'glow-shell'`. **Reuse that pattern verbatim — do not invent a new one.**
>
> **Two MORE unfixed instances of the same class** sit in the same component tree and must be fixed together (in scope — same panel):
> - `src/components/ai/AITypingIndicator.tsx:21`
> - `src/components/ai/AIStreamingSkeleton.tsx:51-59`
>
> *Note for the verify-the-verifiers work: this bug class was diagnosed, fixed, and documented in-code with a named ID **and** a regression-test recipe — and three more instances still shipped. The fix was applied per-site; nothing enforced the class. A lint for `glow-shell` in a light-mode-reachable inline style would have caught all three.*
>
> **RC2 — the horizontal overflow.** Two distinct defects:
> - `AIMessage.tsx:58` — the message column flex item lacks **`min-w-0`**, so it cannot shrink below its content's min-content width.
> - `AIMessage.tsx:78` — uses `wrap-break-word` (→ `overflow-wrap: break-word`). **Verified by reading the compiled rule in `node_modules/tailwindcss/dist/lib.js`** (Gate A — installed source, not memory): only **`wrap-anywhere`** (→ `overflow-wrap: anywhere`) affects **intrinsic min-content sizing**, which is what lets the flex item shrink below an unbroken URL's length. `break-word` alone does not. This is precisely why the long TPS URL escapes the panel.
>
> **Dead code found:** `MarkdownContent.tsx` references a `.prose-chat` class that **is never defined anywhere in the repo** — a silent no-op. **Define it** (it is the correct hook for hardening markdown-rendered content); do not delete the reference.
>
> **Flagged, out of scope (file, do not fix here):** `MarkdownContent.tsx` link/blockquote components use raw inline **oklch literals in arbitrary-value classes** — a real token violation, unrelated to this bug.
>
> **⚠️ Validation constraint (self-reported, not glossed):** crm7 has **no dev-auth bypass** and no E2E credentials exist in the sandbox `.env.local`, so the mandated 6-breakpoint screenshots cannot be taken through a real signed-in session here. Mitigation: a **temporary throwaway Vite harness** rendering the real components against the real compiled CSS (no auth needed), deleted before the final commit. This is weaker than a §12.3 deployed check — **a signed-in verify on `d.crm.crm7.app` remains OWED** and must not be claimed as done.

**Required:**

1. ~~Run **Prompt 1 (DOM Autopsy)** … Expected root causes: …~~ → **DONE 2026-07-17; see the verified block above.** The guesses (chat hexes, missing `max-w-[…]`) were not the cause.
2. Fix structurally: bubbles bind to role/shadcn tokens only (`bg-primary`/`text-primary-foreground` for user, `bg-card`/`text-card-foreground` + `border-border` for assistant in light mode; dark mode inherits via the var chain). No raw hex, no `text-white`.
3. Long-content hardening: `break-words` + `overflow-wrap:anywhere` on message body, `min-w-0` on every flex ancestor inside the panel, vertical scroll contained to the message list (no horizontal scrollbar ever).

**Validation loop:** §9.2 visual-equivalence. Reproduce with the *exact* prod message (the `tps.dtwd.wa.gov.au/...QualificationStructure.aspx?...` URL) at 375 / 768 / 1440, light + dark. Evidence: before/after screenshot pairs, all six.
**Cross red-team:** perplexity-computer verifies screenshots against live preview.
**Skills to load:** `shadcn-ui`, `tailwind`, `bsuite-brand-system`.

---

## W2 — Braden red-destructive P0 hotfix (braden repo) — P0-b

**Finding (verified 2026-07-17):** the live braden app does **not** import the package's `braden.css`. It runs a local theme where destructive is RED. Braden's corporate **primary is already red** (`#ab233a`), so primary and destructive are indistinguishable to red-green colourblind users. This violates the platform-wide policy (error/destructive = purple on **both** brands; red is permitted as Braden identity only, never as the error semantic).

> ### ⚠️ CORRECTIONS — research complete, independently re-verified 2026-07-17 (supersede the original bullets)
>
> **(a) The dark value above was read off the DEAD file.** The **live** file's real values are:
>
> | Site | Value | Note |
> |---|---|---|
> | `src/index.css:71` (`:root`, light) | `--destructive: 0 100% 50%` | pure red — as stated |
> | `src/index.css:138` (`.dark`) | `--destructive: 0 63% 31%` | **dark** red — NOT `0 84.2% 60.2%` |
>
> `0 84.2% 60.2%` exists only in `styles/globals.css`, which never loads. **A `:root`-only fix leaves the P0 live in dark mode** — this is the single most important correction.
>
> **(b) `styles/globals.css` is DEAD CODE, not a competing live duplicate.** Live stylesheet is `src/index.css` (`src/main.tsx:5` `import "./index.css"`; `components.json` → `"css": "src/index.css"`). Deadness proven by precise grep of `globals\.css` across **every** file type: zero imports, no `@import`, no `<link>` in `index.html` (favicons/manifest/fonts only), no Tailwind v4 `@source`; `vercel.json` build is a plain `vite build` (bundles only what's reachable from `main.tsx`). It also still uses Tailwind **v3** `@tailwind` directives, incompatible with the configured v4 Vite plugin — it *cannot* load.
> *(Grep trap for future readers: the bare word `globals` false-positives on the **`globals` npm package** used by ESLint/vitest. Match `globals\.css`.)*
>
> **(c) A third file carries the same bug:** `src/styles/brand-tokens.css` → `--color-error: oklch(0.488 0.170 17.6); /* Braden Red as error */`. Also dead (only reference is a comment inside the dead `globals.css`).
>
> **(d) Therefore step 2 changes from "fix both regardless" → DELETE.** That instruction assumed two competing *live* duplicates; the premise is disproven. Setting a token in a file that cannot load is theatre — it changes nothing at runtime and leaves the landmine for copy-paste. `git rm styles/globals.css src/styles/brand-tokens.css` in the same commit (standing rule: dead code is REMOVED, not noted). This makes the "duplicate cleanup" issue moot — do not file it. Also correct the two now-false comments at `src/index.css:92-93` that claim globals.css "overrides" those values.
>
> **(e) Design question — flag in the PR, do not silently decide.** The live design uses a *lighter* destructive in light mode (`50%` L) and a *darker* one in dark (`31%` L). This directive specifies ONE value (`63%` L) for both, so dark mode moves from a dark-red surface to a **lighter** mid-purple. Foreground `210 40% 98%` on `#6c5ce7` computes to ≈**4.8:1** (passes AA 4.5:1), but it is a deliberate dark-mode design shift, not a like-for-like swap. Follow the directive, prove it with axe, and report the change rather than burying it.

**Required (hotfix, do not wait for W3):**

1. Set `--destructive: 247 74% 63%` (HSL of `#6c5ce7` ≈ `oklch(0.568 0.202 283.1)`) at **both** `src/index.css:71` and `src/index.css:138`, with `--destructive-foreground` staying near-white. **Keep the HSL triplet format** — line 34 `--color-destructive: hsl(var(--destructive))` makes an oklch value here a breakage.
2. ~~fix both regardless + file a cleanup issue~~ → **`git rm` the two dead files** (see correction (b)–(d)). Verify the build still succeeds after deletion — that is the real risk of this step.
3. File (do not fix in the hotfix) a follow-up issue: migrate braden to `@bsuite/theme/braden-css` as its baseline (the package file already has the correct purple + oklch scales) OR align the local tokens to the package's canonical values — note the local `--color-braden-red` oklch (`0.465 0.155 14.3`) drifts from the canonical `0.488 0.170 17.6` (true `#ab233a`), and non-brand hexes (`--color-sky: #2563eb` = D2C electric blue, `#27ae60`, `#9b59b6`) leak into the corporate namespace.
4. **File (do not fix here) — new, found during W2 research:** `src/components/ui/button.tsx` `featureToggle` variant uses literal `bg-green-500`/`bg-red-500`. State is encoded **solely** in a red-green pair with no icon/text/shape cue → deuteranopes cannot read the control's state at all. Arguably **more severe** than the token bug this hotfix closes, and a direct breach of the standing "no red/green semantic pairs anywhere" policy.

**Validation loop:** §9.2. Evidence: screenshot of a destructive button next to a primary button, light + dark — the two must be visibly distinct in a deuteranopia simulation (Chrome DevTools → Rendering → Emulate vision deficiencies). axe-core clean on the touched surfaces.
**Cross red-team:** claude (chat instance) re-verifies via GitHub file read that no `--destructive` red value remains.
**Skills to load:** `bsuite-brand-system`, `tailwind`.

---

## W3 — @bsuite/theme 0.6.0 "A1" (bsuite/packages/theme) — P1

Contract-before-component: 0.6.0 ships tokens + contract + primitives + lint. `<AppShell>` is **deferred to 0.7.0** and becomes a thin consumer of this release.

### 3.1 Text-role contract

- Headings → `--role-text-heading` + `--font-heading`; body → `--role-text-body`; labels → `--role-text-secondary`; metadata → `--role-text-muted`; placeholders → `--role-text-subtle`; disabled → `--role-text-disabled` (+ icon cue).
- Exactly **one** accent gradient exists suite-wide: `linear-gradient(135deg, var(--role-primary), var(--role-accent))` (blue→cyan). Marketing heroes only. Never on functional app text.
- Document in `TOKEN-MAPPING.md`; codemod stragglers per app (`text-white`→`text-foreground` etc. per existing mapping).

### 3.2 Tenant-switcher gradient (crm7) — ruling

- The two org labels render **plain, full-contrast** (`--role-text-heading`). Keep only the decorative underline, sourced from the canonical blue→cyan gradient above.
- `.crm7-gradient` (terminates on `#39ff13`, 1.36:1 on white) is **quarantined** from any text or thin-line context — add a comment ban at its definition and a lint check for its use on text.

### 3.3 Grid/dot doctrine + primitives

```
GRID  — public/pre-auth landing + marketing ONLY. Localised to the hero band
        (absolute, inset:0 within hero wrapper), behind hero text/image.
        Never full-viewport, never behind authed content.
        Canonical: 1px linear-gradient lines @ 32px 32px,
        oklch(0 0 0 / 0.03) light / oklch(1 0 0 / 0.03) dark
        (lift verbatim from braden .platform-hero-grid → new <HeroGrid/> in @bsuite/ui).

DOT   — authenticated app pages. Very back layer (z-0), behind ALL cards,
        full page, rendered once by the shell.
        Canonical: packages/ui/src/dot-pattern.tsx (existing — single source).

Mutual exclusivity: marketing = grid; logged-in = dot. Never both in one context.
```

Lint (in `@bsuite/eslint-config` or dry-lint): flag (a) grid inside an authed shell, (b) dots on a public hero, (c) hand-rolled grid/dot CSS instead of the shared primitive.

### 3.4 sRGB fallback correction (`vars.css`)

The `@supports not (color: oklch(0 0 0))` block currently uses Tailwind palette hexes (`#3b82f6`, `#a855f7`, `#f97316`, …) — ΔE 0.08–0.10 off the real tokens. Replace with the true source hexes so the fallback path matches the brand:

```
blue #2563eb · cyan #00cec9 · indigo #4f46e5 · purple #6c5ce7 · magenta #fd79a8
pink #ec4899 · coral #ff4757 · orange #ff7675 · yellow #fdcb6e · green #22c55e
lavender #a29bfe · role-error/role-destructive #6c5ce7
```

### 3.5 Retire `packages/design-tokens`

Second token package = second source of truth. **Verify zero consumers first** (search all 7 repos + npm downloads for `@bsuite/design-tokens`), then delete, or if consumers exist, migrate them to `@bsuite/theme` in the same PR and deprecate on npm.

### 3.6 Drift scanner: NEW-HEX-IN-D2C soft → hard

Promote in `scripts/drift-scan.mjs` signal matrix (bsuite#902). It already scans *new* lines only, so no legacy amnesty needed. Keep `packages/theme/**`, braden corporate files, and manifest files exempt per existing allowlist.

**Validation loop:** §9.1 for token changes (build + published CSS diff limited to intended lines) + §9.2 screenshot pairs on BSU /login and crm7 dashboard before/after (must be pixel-identical except the tenant-switcher labels/underline). Contrast table re-verified for any touched pair.
**Cross red-team:** copilot on the PR; chat-Claude verifies fallback hexes round-trip (ΔE < 0.02) against the oklch tokens.
**Skills to load:** `bsuite-brand-system`, `tailwind`, `code-quality-enforcement`.

---

## W4 — VET reference architecture: L1/L2 schema + TGA ingest — P1

Canonical model: memory key `bsuite_decision_vet_reference_model`. Read it before writing a line. Summary of what to build:

### 4.1 Schema (shared reference — platform tables, NOT tenant-partitioned)

- **L1:** `training_packages`, `qualifications`, `units_of_competency` (keyed national code + release), `qualification_packaging_rules` (core/elective groups + selection rules — this is the picker's constraint engine, model it as data not code), `providers` (RTO **and** TAFE as one entity; `regulator: 'asqa' | 'tac_wa'`; `owned_by_tenant_id` nullable — an attached RTO is just a provider row), `qualification_units` (composition).
- **L2:** `state_unit_nominal_hours` (unit × state), `state_trade_qualification_map`, `skill_sets` + `skill_set_units` (national units by **reference** — dedup rule: never copy a national unit into a skill set; non-accredited components are skill-set-local rows with the state register URL as `source`).
- **L3 employment plane:** worker class on the person; **DB CHECK constraint**: `worker_class IN ('apprentice','trainee') → employment_type IN ('school_based','part_time','full_time')` — casual is structurally impossible, mirrored in Zod. Labour-hire workers get the full casual→permanent range. Placement links to host employer (existing entities — extend, don't duplicate).
- **L3 training plane:** `training_plans` (apprentice × qualification; provider assignments reference `providers` — any provider, incl. TAFE), `training_plan_units`, fee fields (training fees / equipment / textbooks) with an explicit `award_reimbursement_required` flag + Fair Work citation column, exposed as **inputs to @bsuite/charge-calc** (reimbursement = on-cost component; training time → billable hours only per tenant charge-rate model — the calc itself stays in charge-calc, DRY). `short_courses` hang off the **employment** plane (workers too), default ad-hoc billing outside the cycle, `roll_into_regular_billing` boolean.
- Reconcile crm7's existing canonical `unitOfCompetency` + its "custom version" into this split: custom = tenant-local **non-accredited** items only; everything national migrates to L1 references. The `Imported from TGA` boolean pattern is retired.

### 4.2 TGA ingest (Supabase edge function, crm7 owns it, writes to shared schema)

- Source: training.gov.au web services. **Sandbox first:** `https://ws.sandbox.training.gov.au/webservices.html` — SOAP/WCF (`TrainingComponentService` for packages/quals/units/structure, `OrganisationService` for the provider register), WS-Security username/password. The sandbox credentials are publicly documented on that page — **read the page and use what it states; do not assume from training data.** Production access requires registration — file that as an operator-action blocker.
- Implementation: Deno raw `fetch` with hand-built XML envelopes (no SOAP client lib). Parse with a proper XML parser, not regex (No-Regex-by-Default).
- Idempotent upsert keyed national code + release; supersession handled as versioning, never overwrite-in-place. Golden tests against recorded sandbox fixtures (record once, commit fixtures — CI must not hit the live sandbox).
- **Migrations land via PR only** — never `supabase db push` from local against `tuybltdrdefjblnplpqo` (standing rule).
- L2 WA feed: nominal hours + skill sets from WA DTWD/TPS. Phase 1 = manual/CSV import path with source URL required per row; automated scrape is a follow-up issue, not this PR.

**Validation loop:** §9.1 — fixture-driven: ingest sandbox fixture → assert row counts, packaging-rule shape for one known qualification (use the Cert III Carpentry structure the operator referenced), supersession behaviour. Second run = zero diff (idempotency proof).
**Cross red-team:** council/perplexity review of the schema DDL before the migration PR merges (compliance-critical reference data).
**Skills to load:** `supabase`, `dry-one-shot-architecture`, `api-design-validation`, `forms-and-validation`.

---

## W5 — Unit picker cascade + `/vet/units/create` TGA import (crm7) — P2

**File the gap first:** `crm.crm7.app/vet/units/create` has no TGA import (operator-verified live). Issue body uses the FF-SELF-VALIDATION template.

**Picker cascade (both on qualification setup and unit attach):**

1. **Default:** the qualification's own packaging rules — core units auto-included, electives selectable within group rules (reference UX: the WA TPS qualification-structure page).
2. **Widen:** same training package.
3. **Tickbox "allow all units":** cross-package import unlocked only here.
4. **Search filter mandatory at every level** — the register is too large to browse.
5. **Skill sets:** API-pull or custom entry. National units inside a skill set → flag overlap, import the L1 reference (never duplicate). Non-accredited → skill-set-local with user-entered state register URL as source.

`/vet/units/create` gains "Import from TGA" (search L1 by code/title → select → reference created; manual creation remains for genuinely custom/non-accredited only, clearly labelled as such).

**Validation loop:** §9.2 (picker at 3 cascade levels, screenshots) + §9.1 (packaging-rule enforcement test: attempt to attach an out-of-rules elective without the tickbox → blocked).
**Cross red-team:** copilot PR review + one manual pass by operator on the Cert III Carpentry flow.
**Skills to load:** `shadcn-ui`, `forms-and-validation`, `dnd-kit` (if reorder), `ag-grid` (unit tables).

---

## W6 — Jodie: TGA tool + gated write flow (packages/jodie + crm7) — P2

**Prod failure (2026-07-17):** asked to add units from a WA TPS qualification URL and link them to Cert III Carpentry, Jodie asked the **user** to open the link and copy/paste unit codes. That inverts the product promise. Root cause: no TGA/URL tool in Jodie's toolset.

**Required:**

1. New tools in the routing matrix: `tga_lookup` (search qualification/unit; fetch qualification structure incl. packaging rules — backed by the W4 L1 tables/service, falling back to live sandbox lookup for anything not yet ingested) and `state_register_fetch` (fetch + parse a user-supplied state register URL, e.g. TPS pages, extracting unit codes; parser-based, no regex).
2. **Gated writes per agent guardrails:** Jodie *proposes* the unit set + links (diff-style: exists / will create / will link), human approves, then writes execute. Fix the copy — "I'll action it straight away" over-promises; it must read "…prepare it for your approval."
3. Training-plan path per the memory decision: uploaded plan → extract qualification/units/providers/attendance → propose → approve → write. No plan → surface the W5 structure picker.
4. Never ask the user to transcribe data an available tool can fetch — encode this as a routing-matrix rule with a test.

### Execution-state entity (the "graph" — operator-ruled shape)

No LangGraph, no second agent framework, no graph store. Durable execution state = one row; **the row is the checkpoint and the compliance ledger**. Agent-generic (not Jodie-branded) so the same gate serves the existing guardrail list (RLS, migrations, Fair Work, TGA) and future agents.

```sql
agent_action_proposals (
  id uuid pk, tenant_id uuid not null,             -- RLS tenant scope
  agent text not null,                             -- 'jodie' (generic for future agents)
  created_by uuid not null, intent text,
  action_type text not null,                       -- discriminator, e.g. 'vet.import_units'
  payload jsonb not null,                          -- Zod-validated per action_type
  diff_summary jsonb not null,                     -- exists / will_create / will_link
  citations jsonb not null default '[]',           -- TGA / state register / Fair Work URLs
  status text not null check (status in
    ('draft','pending_approval','approved','rejected','executed','verified','failed')),
  approved_by uuid, approved_at timestamptz, rejected_reason text,
  idempotency_key text unique not null,
  model text, tokens_in int, tokens_out int,       -- cost capture (per operator)
  cost_usd numeric(12,6), duration_ms int, tool_call_count int,
  cost_budget_usd numeric(12,6),                   -- per-task budget (W10 §4)
  executed_at timestamptz, verified_at timestamptz, failure_reason text,
  created_at timestamptz default now(), updated_at timestamptz default now()
)
```

- Lifecycle: `draft → pending_approval → approved | rejected`; `approved → executed → verified | failed`.
- Approval is **decoupled from the live chat**: approve from the diff card in-panel or later from a proposals list; classifier gains a `resume_proposal` intent.
- RLS tenant-scoped; only admin-role members approve; executor performs an atomic status compare-and-swap so double-execution is impossible (idempotency_key + status CAS).
- Cost fields roll up into the W10 `ai_usage_events` ledger via `proposal_id`; exceeding `cost_budget_usd` pauses the task → status `failed` with a cost report → re-approval required to continue.
- Knowledge-graph note: **do not** add a graph store — traversal questions ("which units, delivered by whom, placed with which host") are SQL views over the W4 schema; foreign keys are the edges.

**Validation loop:** §9.1 — replay the exact prod task (the operator's TPS carpentry URL) end-to-end in a test tenant: proposal must list correct codes from the structure page, approval gate must block writes until confirmed, second run must no-op (idempotent). Evidence: transcript + before/after unit counts.
**Cross red-team:** chat-Claude replays the same prompt against preview and verifies the proposal content.
**Skills to load:** `supabase`, `api-design-validation`; review `packages/jodie/src/routing-matrix.ts` + `classifier.ts` first.

---

## W7 — Six-app landing audit — P3, discovery-only

Read-only sweep of all six public entry points (BSU, crm7, conduit, R80.3, throughput, braden — noting conduit is Next.js with different entry semantics and braden hosts corporate + platform-marketing surfaces). Produce a register: app · entry route · `/`-redirect behaviour · stale-cache-flash present? (y/n + evidence) · grid/dot doctrine compliance · fix required?. **No fixes in this pass.** Fix PRs are scoped per-app from the register only where the pattern is confirmed. crm7's landing restore executes as the first consumer of that register, not before it.

**Skills to load:** `nextjs-app-router` (conduit), `best-practice-research`.

---

## W8 — #1129 Boyle reframe — P3 (folds into W4)

Do **not** run the gated repair per-tenant as currently shaped. It becomes the **one-time platform-level reconciliation** of the shared reference tier against TGA at the end of the W4 migration: idempotent, human-gated, source-cited, benefiting all tenants at once. Update #1129 with this reframe and link the memory decision key. If the existing PR writes tenant rows, close-with-comment and supersede rather than rebase.

---

## W9 — Enterprise licensing, contracts & seats (BSU) — P0-c (Phase 0) + P1 (Phase 1)

**Live blocker:** FutureBuild Academy has **signed** a 3-year contract — 5 licences of the full Enterprise Suite (all apps + AI included) — but the tenant is still on a *testing* licence. There is no mechanism to assign licences, and Caris (org admin) cannot invite her 5 users.

**Placement rule (DRY doctrine):** contracts, licences, seats, invoicing reminders, and every admin surface live in **BSU** — the hub owns tenant lifecycle + billing. Client apps never own entitlement; they read it via a shared `tenant_entitlements` view/RPC (which apps + AI are enabled, seats remaining).

### Phase 0 — FutureBuild unblock (this week)

1. Minimal schema: `enterprise_contracts` (tenant_id, term_start, term_end, billing_cadence, payment_terms, seats_licensed, modules jsonb, pricing_snapshot jsonb, next_reinvoice_date, status, signed_doc_ref, custom_arrangements text). Seat usage = count of active `user_tenants` memberships, gated at invite time — no separate seats table yet.
2. Record the FutureBuild contract from the **signed instrument only** — canonical figures come from the signed doc, not the pitch materials. Check whether the known Conduit/R80.3 annual-pricing arithmetic conflict ($456 vs $468) was resolved in the signed version; if it survives into the signed doc, **stop and flag to operator** before recording. Then flip the tenant testing → enterprise, entitle all apps + AI, `seats_licensed = 5`.
3. Invite flow: the `user_tenants` admin-invite INSERT RLS policy already exists (per the standing RLS audit) — verify BSU exposes a working org-admin invite UI on top of it; if the UI is missing or platform-gated, ship it (email invite → accept → membership), enforcing the seat limit at accept. **Acceptance: Caris invites all 5 users end-to-end in prod.**

### Phase 1 — platform-admin console + reminders

4. Developer-user console in BSU: create/edit contracts, assign licences to enterprises, add additional licences mid-term, custom arrangement lines, set/advance re-invoice date.
5. Re-invoicing reminders: scheduled edge function (pg_cron) notifies the developer user N days before `next_reinvoice_date` (default 30, configurable) via the existing `email-dispatcher`; a "mark invoiced" action advances the date one cadence. Enterprise annual invoicing stays **manual** (30-day EOM terms) — Stripe is used only for card overage (W10), never for enterprise invoices.
6. Org-admin seat management: seats used/remaining, invite/revoke, pending invites.

**Validation loop:** §9.1 — 6th invite blocked at 5 seats; `tenant_entitlements` returns the correct app+AI set; reminder fires against a synthetic date. §9.2 — invite flow screenshots (org-admin send + invitee accept), 375/1440, light+dark.
**Cross red-team:** operator performs the FutureBuild assignment personally as UAT **before** Caris is told it's live.
**Skills to load:** `supabase`, `supabase-auth-comprehensive`, `forms-and-validation`, `stripe-integration` (awareness only in Phase 0).

---

## W10 — AI usage metering, caps & card overage (platform-wide, BSU-owned) — P1

Long-running agent tasks make AI spend open-ended. Ship strictly in order: **meter → cap → monetise overage** — never enforce a cap before metering is proven accurate.

1. **Ledger:** `ai_usage_events` (tenant_id, user_id, app, feature/agent, model, tokens_in, tokens_out, cost_usd, proposal_id nullable → W6, created_at). Every AI route writes one event on completion. Usage data survives only because `DefaultChatTransport` + `toUIMessageStreamResponse()` are mandatory — this workstream is another reason that rule is load-bearing; any route on `TextStreamChatTransport` silently breaks metering and must be treated as a defect.
2. **Allowances:** `tenant_ai_allowances` — included monthly allowance per licence tier (AI Features module), soft threshold (warn ~80%), hard-cap behaviour. Enforcement = shared `check_ai_allowance(tenant)` helper called in every AI route beside the existing mandatory rate limiter. Over hard cap with no overage configured → blocked with a clear UI message, never a silent failure.
3. **Overage (card, marked up):** tenant adds a card via the existing BSU Stripe integration and sets **their own** monthly overage cap; overage bills at provider cost × (1 + markup). Markup is platform config `ai_overage_markup_pct`, **operator-set** — do not hardcode a number. Monthly Stripe usage invoice covers overage only. GST treatment and inc/ex-GST display are an **operator decision — flag before the first overage invoice is generated.**
4. **Per-task budget:** W6 proposals carry `cost_budget_usd`; exceeding it pauses execution, marks the proposal `failed` with a cost report, and requires re-approval to continue. This is the runaway-agent brake.
5. **Surfaces (BSU):** org-admin usage dashboard (allowance, spend, overage settings, card management); developer-user platform view (per-tenant spend, markup config).

**Validation loop:** §9.1 — synthetic events aggregate correctly; soft-warn triggers at threshold; hard cap blocks a live AI call; overage path bills cost×(1+markup) to the cent in Stripe test mode; per-task budget aborts a runaway-loop fixture.
**Cross red-team:** copilot on PRs + one manual Stripe-test-mode walkthrough by operator before overage goes live.
**Skills to load:** `stripe-integration`, `supabase`, `api-design-validation`.

---

## Standing constraints (apply to every workstream)

- Evidence block (§9 template) in every PR; no "looks done" without artefacts.
- Conventional commits; migrations via PR only; pnpm 10.30.3 / Node 24 frozen; Tailwind v4 only.
- Colourblind policy: purple error/destructive, both brands, non-negotiable; no red/green semantic pairs anywhere, including in docs and diagrams produced under this directive.
- OKLCH only for new colour tokens; no hex in D2C consumer code (W3.6 makes this hard-fail).
- Memory protocol: write `bsuite_session_latest` after each merged PR; freeze points to `bsuite_decisions`.
- Compliance-critical data (Fair Work, TGA, state registers) always carries a source citation and a human gate before agent writes.
