---
kind: plan
authority: operator
owner: bsuite
evidence:
  - packages/page-builder/src/PageGridLayout.tsx
  - packages/page-builder/src/scanner/cardSurfaceScanner.ts
  - scripts/audit-routes.sh
  - docs/nav/route-inventory.json
  - .agents/skills/bsuite-ship-visual-promote/scripts/visual-probe.js
---

# OVERNIGHT AUTONOMOUS RUN — full operator team, nothing waits for Braden

**Operator, 2026-08-25 21:42 AWST:** *"i want the task to run autonomously overnight and have all
tools mcps direction and full operator team and heirachy so nothing gets stopped by me being
absent."*

**The binding constraint of this document: THERE IS NO ESCALATION PATH TONIGHT.** Every decision
that would normally reach Braden has a pre-authorised ruling in §7. If you find one that does not,
rule it from precedent, record it, and keep moving. **Stopping to ask is the only prohibited
outcome.**

---

## §0 — THE CLOCK. This outranks every other section in this document.

**Operator, 2026-08-25 22:02 AWST:**
> *"Run this autonomously and everything that can be done by 8am merged to prod and tested. no
> missing placements or UI bugs or functionality bugs permitted on prod. after 8am only merge to
> development branch until 11am then open again to prod. I have a demo at 9:30 am so i want to give
> meself time to spot check before the demo."*

### The window

| Australia/Perth | `main` (production) | `development` |
|---|---|---|
| **now → 07:59** | **OPEN** — merge and prove everything you can | open |
| **08:00 → 10:59** | **FROZEN** | open — keep shipping here |
| **11:00 →** | **OPEN** again | open |

**The 09:30 demo sits inside the freeze.** The freeze is not administrative: it exists so he can
spot-check a production that nothing is changing underneath him.

### Enforced, not remembered

```bash
scripts/prod-window.sh          # exit 0 = prod OPEN, exit 1 = FROZEN
scripts/prod-window.sh --quiet  # exit code only, for gating
```

**Call it immediately before EVERY merge into `main`, in the same command as the merge:**

```bash
scripts/prod-window.sh --quiet && gh pr merge <N> --repo <repo> --merge
```

A freeze written only in prose is enforced by whoever remembers it at 07:58. This one exits
non-zero. Self-tested at every boundary: 07:59 OPEN · 08:00 FROZEN · 09:30 FROZEN · 10:59 FROZEN ·
11:00 OPEN.

During the freeze: **merge to `development`, queue the promotion, do not open it.** Write the
queued promotions into the morning brief so 11:00 is a single coordinated release, not a scramble.

### The quality bar is RAISED tonight, not lowered by the deadline

> *"no missing placements or UI bugs or functionality bugs permitted on prod"*

**A deadline is not a reason to promote something unproven. It is a reason to promote LESS.**

Before any promotion between now and 08:00, all of these hold or it stays on `development`:

1. The **visual gate** actually ran — route × theme × width × account — and returned PASS, not
   INCOMPLETE. Service worker unregistered first.
2. **Two tenants** for anything role-, licence-, tenant-branded or RLS-scoped. Braden Pty Ltd and
   FutureBuild Academy both carry `border_radius_preset`, so a single-tenant pass proves the
   default path only (see §6b).
3. **Placements render with data.** A grid can render every row with every cell empty — that is a
   recorded failure in this estate, and "no missing placements" is the operator naming it.
4. **The live SHA equals the pushed SHA** before you inspect anything.
5. Production deploy reaches **READY**, and runtime logs are clean.

**If a change cannot clear that by 07:59, it does not go to prod. It waits for 11:00.** Shipping a
broken card into a 09:30 demo costs more than every item on the priority list combined.

### The order this implies

Front-load what is **provable**: the security fix already in flight, the marker PRs, the gitlink
advances, and Silo B items that are small and independently verifiable. **G1 — the grid inversion —
is the highest-risk change in this document.** It touches 1,729 card instances across six apps.
Ship it before 08:00 **only** if Storybook (§3) exists and the visual gate is genuinely green on
both tenants. Otherwise it lands on `development`, and 11:00 is its window — with him awake.

---

## §1 — GOAL

**Every card in every app, on every page, renders correctly to the D2C brand — and stays that way
because a gate now catches it.**

### Sub-goals, in dependency order

| # | Sub-goal | Blocks |
|---|---|---|
| **G0** | A **Storybook** over `@bsuite/ui` + `@bsuite/page-builder`, and a **nested-chrome detector** in the card-surface scanner | G1 |
| **G1** | Invert the two shared-package defaults — grid-item chrome, and `w` | G2 |
| **G2** | D2C compliance estate-wide: gradients on card headings, no pure white/black, aligned borders/radii, elevation on the ramp | — |
| **G3** | dnd-kit + columns working on every page of every app | — |
| **G4** | Everything else in the register that is genuinely open (§8) | — |
| **G5** | 553-route surface map — every route to its data path, RLS posture, edge fn, caller | — |

---

## §2 — THE ROOT CAUSE ALREADY FOUND (do not re-derive)

`packages/page-builder/src/PageGridLayout.tsx:308` — every grid item renders **unconditionally**:

```
h-full w-full rounded-3xl transition-all flex flex-col
bg-card border border-border shadow-sm dark:shadow-[var(--glow-card,none)]
```

The grid item **is** a card: 24px radius, 1px border, background, shadow. Apps then render their own
card inside it — BSU `ServiceCard` → `MagicCard` `rounded-[28px] border`; throughput `/ideas/new`
form panel likewise.

**28px inside 24px = misshapen corner. Two 1px borders = the fat bottom edge.**

**Measured, and it settles which side is wrong:**

| | files nesting an inner card | files using CanvasCard | |
|---|---:|---:|---|
| crm7 | 304 | 331 | 92% |
| business-suite-unified | 7 | 8 | 88% |
| conduit | 1 | 1 | 100% |
| braden | 2 | 3 | 67% |
| throughput | 2 | 9 | 22% |
| **estate** | **316** | **352** | **90%** |

**Nesting is the norm. The grid item is the wrong side.**

Second defect, same file: `CanvasCard.w` **defaults to 12** on a 12-column grid.

| | omit `w` | total | |
|---|---:|---:|---|
| crm7 | 973 | 1620 | 60% |
| business-suite-unified | 53 | 53 | **100%** |
| conduit | 1 | 1 | **100%** |
| braden | 11 | 16 | 68% |
| throughput | 30 | 39 | 76% |
| **estate** | **1068** | **1729** | **61%** |

**1,068 cards render full width because of a default.** That is the columns complaint.

---

## §3 — STAGE 0: STORYBOOK FIRST. NON-NEGOTIABLE.

**Operator: *"this is why we need a components library like storybook."* He is right, and it is the
reason G1 is safe to ship at all.**

`@bsuite/page-builder` 1.0.4, 1.0.5 and 1.0.6 each shipped **GREEN AND BROKEN** this week. Every
test drove the hook with **no grid attached**; only a deployed visual check caught them. Types,
lint, unit tests and CI are all green estate-wide **right now** and cannot see a 28px card in a
24px frame.

**Build before touching G1:**

1. **Storybook** (or Ladle if it installs faster — justify the choice in the PR) at
   `packages/ui/.storybook`, covering **both** `@bsuite/ui` and `@bsuite/page-builder`.
2. Stories that make each defect class **visible and diffable**:
   - a `CanvasCard` containing a bare child → **one** border, one radius
   - a `CanvasCard` containing a `Card`/`MagicCard` → **still one** border (the regression story)
   - the same at `w` = 2 / 3 / 4 / 6 / 12
   - a card heading with and without `gradient-text`
   - light + dark, at 1440 / 1024 / 768 / 390
3. **A nested-chrome detector** added to `packages/page-builder/src/scanner/cardSurfaceScanner.ts` —
   it already exists and already catches *glued* cards (V-C4); it does **not** catch nested chrome
   (V-C5). Extend it. **It must fail closed** and self-test, per that file's own doctrine: *"a gate
   that cannot tell 'checked nothing' from 'found nothing' is not a gate."*
4. Wire the detector into CI for all six apps.

**DoD for G0:** the detector, run against `origin/development` today, **reports the 316 nested
files**. A detector that reports zero on a known-broken estate is broken itself — prove it fails
before trusting it to pass.

---

## §4 — SILOS. These run CONCURRENTLY.

Operator: *"silo the work, so the theme work can be done concurrently but all other fixes get
shipped as they arrive."*

### SILO A — THEME (long-running, gated, one lane, ships once)

Owns `packages/theme`, `packages/ui`, `packages/page-builder`, and every app's card/heading surface.
**Does NOT ship incrementally** — a half-applied grid inversion is worse than none. One coordinated
release: package version bump → all six consumers → one promotion.

Order inside the silo: **G0 → G1 → G2 → G3.**

### SILO B — CONTINUOUS SHIP (many lanes, ship on green)

Everything else. **Each fix ships the moment it is green** — its own PR, its own promotion, its own
gitlink advance. Do not batch. Do not wait for Silo A.

Lanes: security · register items (§8) · route surface map (G5) · docs.

**Rule between silos:** Silo B never edits `packages/theme|ui|page-builder`. If a Silo B fix needs
one, it files the need to Silo A via the inbox and picks up the next item. **No cross-silo edits to
the same file — that is the one-shot rule applied to the night itself.**

---

## §5 — TEAM AND HIERARCHY

| role | count | tier | mandate |
|---|---:|---|---|
| **Operator-Agent** | 1 | frontier | Acts with Braden's authority. Rules from §7 and from the precedent book. Records every ruling the same turn via `agent-mem-precedent-clerk`. **Never implements. Never escalates — there is nobody to escalate to.** |
| **Silo A PI** | 1 | high | Theme. Owns the packages and the coordinated release. |
| **Silo B PI** | 1 | high | Continuous ship. Assigns lanes, enforces one-open-PR-per-lane. |
| **Lane leads** | 1 per repo (7) | standard | crm7 · business-suite-unified · conduit · braden · throughput · R80.4 · parent. Own their branch, PR, gates, merge, cleanup. |
| **Workers** | as needed | standard (mechanical → low) | One scoped task, isolated worktree, never merge, never mark done. |
| **Verifiers** | ≥1 per item | high | **A lane other than the claimant.** The only role that may write `VERIFIED-DONE`. |

Cap ~2 concurrent frontier. Always pass an explicit model on dispatch. Worktrees **only** under
`~/Desktop/Dev/worktrees/`.

**Liveness:** a lane whose transcript stops growing is DEAD — revive it. Sessions die on API 529
overloads, not on decisions. The Operator-Agent polls every lane; a silent lane is re-dispatched
with its last state, not waited on.

---

## §6 — MCPs AND SKILLS

### MCPs — what each is the authority for

| MCP | authority |
|---|---|
| **supabase** | `list_tables`, `execute_sql`, `get_advisors`, `list_migrations`, `list_edge_functions`. **Never infer a column, grant, policy or row count — query it.** Rehearse DDL in a transaction and ROLLBACK before committing the migration. |
| **playwright** / **chrome-devtools** | The visual gate. `browser_evaluate` runs `visual-probe.js`. **Unregister the service worker first** — crm7 is a PWA and will serve you the previous build. Seed session state with `addInitScript` BEFORE navigating, never after. |
| **context7** | Gate A. Exact installed version of any library before the first edit touching it. |
| **vercel** | Deployment state, build logs, runtime errors. Confirm the live SHA equals the pushed SHA before inspecting anything. |
| **github** | PRs, checks, reviews, workflow dispatch. |
| **qig-memory** | Memory + inbox, namespace `bsuite`, prefix `bsuite_`. The precedent book. Coordination between lanes. |

### Skills — bound to purpose, read from `inventory.sh` (221), not the context listing

The context listing is budget-truncated and drops **never-used** skills first. Several below have
**zero recorded uses** and are the most relevant in the hub.

**Theme / D2C (Silo A):** `bsuite-brand-system` · `bsuite-page-grid-layout` ·
`*bsuite-branding-inheritance` · `bsuite-shared-ui-rollouts` · `bsuite-ship-visual-promote` ·
`*bsuite-fix-the-class-not-the-page` *(zero uses — the single most apt skill in the hub for this
operator)*

**Routes / surface (G5):** `web-frontend-backend-mapping` *(caveat: its description is written for
"every Python route has a corresponding TypeScript API client" — this estate is TS/Vite/Supabase;
the method transfers, the framing does not)* · `bsuite-gto-portals` · `bsuite-developer-portal` ·
`*bsuite-user-manuals-nav` · `*check-api-design` · `*test-exploratory-qa` · `test-playwright` ·
`*ops-deployment-readiness`

**Supabase — all of them:** `auth-supabase` *(this is D-2/D-109's skill — the Gmail consent
returning to the wrong app is a redirect_uri / authorised-origin problem)* ·
`bsuite-rls-authz-red-team` *(mandatory for any RLS / SECURITY DEFINER diff)* ·
`bsuite-reliability-red-team` · `*bsuite-supabase-migrations` · `*bsuite-edge-functions` ·
`db-supabase-migration` · `supabase:supabase` *(vendor, supersedes `db-supabase`)* ·
`supabase:supabase-postgres-best-practices` *(vendor)* · `auth-e2e-sso-testing` ·
`auth-oauth-local-testing` · `*bsuite-conduit-deploy-testing`

**Cross-cutting / one-shot:** `general-dry-one-shot-architecture` · `check-docs-vs-code` ·
`*bsuite-false-complete-gates` · `bsuite-react-testing`

**Orchestration:** `agent-run-master` *(first, always)* · `agent-skl-find` · `agent-run-subagents` ·
`agent-cli-cc-subagents` · `agent-run-parallel` · `agent-run-loop` · `agent-red-plan` ·
`agent-red-implement` · `agent-mem-comms` · `agent-mem-precedent-rule` ·
`agent-mem-precedent-clerk` · `agent-definition-of-done` · `ops-ship-all-apps`

**Domain — never guess an award or GTO fact:** `biz-au-award-boot` · `biz-au-award-modelling` ·
`biz-au-fair-work` · `biz-au-apprenticeship` · `biz-xero-integration`

**External CLI workers** for bulk mechanical passes: `grok-worker` · `qwen-worker` · `agy-worker` ·
`hermes-worker` (`-z` one-shot only). **Output is untrusted — review every diff.**

---

## §6b — BRANDING IS NOT YOURS TO HARDCODE. This constrains ALL of Silo A.

**Operator, 2026-08-25:** *"the developer platform branding and organisation level app branding need
to be considered so they dont get wrecked and still allow enterprises to white label."*

He is right, and the risk is live — **not theoretical**.

### The three tiers, as built

```
Tier 1  platform_branding    developer/owner defaults, SINGLETON
Tier 2  tenant_branding      per-tenant override  <-- THIS IS WHITE-LABEL
Tier 3  sub-organisation     inherits
        platform_branding.force_override_tenant_ids  -> Tier 1 beats 2 and 3 for listed tenants
        platform_branding_public                     -> the anonymous view marketing pages read
```

`useBranding.ts` resolves them with `firstNonNull` and writes CSS custom properties via
`setOrClear`. **`heading_gradient`, `card_gradient` and `border_radius_preset` are columns in BOTH
tiers.**

### Measured on production, 2026-08-25

| tier | heading_gradient | card_gradient | border_radius_preset |
|---|---|---|---|
| platform (BSuite) | null | null | null |
| tenant × 4 (incl. Braden Pty Ltd, FutureBuild Academy) | null | null | **`md`** |

**Read this carefully, because the two rows say opposite things about risk.**

- **No gradient is set anywhere.** So G2's gradient work cannot wreck a tenant's gradient today —
  there is none to wreck. It CAN wreck the *ability* to set one, and that is the thing to protect.
- **Every tenant HAS a radius preset (`md`).** Radius is **live, tenant-controlled configuration**
  flowing to `--radius-preset`. **Hardcoding 24px or 28px to "align the corners" would break
  white-label radius on all four tenants immediately.** That is the wreck the operator is warning
  about, and it is one careless commit away.

### THE RULES — binding on G1, G2 and G3

1. **Never hardcode a gradient, colour, radius, shadow or logo.** Resolve through the CSS var the
   branding resolver sets. `.gradient-text` already models this correctly:
   `var(--heading-gradient, var(--gradient-heading, <estate default>))` — tenant first, estate
   second, hardcoded last.
2. **The corner-alignment fix must go through `--radius-preset`,** not a literal. Both surfaces
   (grid item and inner card) read the SAME var; that is what makes them align, and it is also what
   keeps them tenant-configurable.
3. **Do not remove a var read to "simplify".** A var with no reader is white-label silently
   disabled — and it will read as working, because the default looks right.
4. **Test with a tenant that has branding set.** Braden Pty Ltd and FutureBuild Academy both carry
   `border_radius_preset`. A visual gate run only against a tenant with null branding proves the
   DEFAULT path, not the white-label path. **Two tenants minimum, per the ship skill, and this is
   exactly why.**
5. **Respect `force_override_tenant_ids`.** A tenant in that array must show PLATFORM branding, not
   its own. If the theme work bypasses the resolver, that override stops working and a platform
   lockdown silently fails open.
6. **`platform_branding_public` is the anonymous path.** Marketing/public routes read it. Anything
   that assumes an authenticated branding fetch breaks logged-out pages.

### A related defect already confirmed, do not "fix" it blind

`platform_branding` has `platform_name` and **no `company_name`**; `tenant_branding` has **both**.
So `mergeBranding` resolves `company_name` to null at Tier 1, and two live `tenant_branding` rows
have it null as well. `CRM7Header` documents this. **It is a schema asymmetry, not a rendering bug
— changing the resolver to paper over it would break tenant branding estate-wide.** Fix the schema
or the resolver deliberately, with the visual gate on two tenants, or leave it and record it.

---

## §6c — THE DEFAULT GRADIENT ALREADY EXISTS. crm7 IS THE REFERENCE.

**Operator, 2026-08-25:** *"default gradients are already applied in the D2C theme skills and docs.
crm7 has it right on dashboard. so use that for default everywhere."*

Correct, and measured. **Do not invent a gradient. Do not author a new utility.**

### The reference

`@bsuite/theme` → `packages/theme/src/css/utilities.css:122` → **`.text-gradient-accent`**

crm7 `src/pages/Dashboard.tsx:486`:

```jsx
<h1 className="text-gradient-accent text-3xl font-bold text-(--role-text-heading)">
```

The solid `text-(--role-text-heading)` sits UNDER the gradient class as the fallback layer. Copy
that pairing, not just the gradient class.

### Adoption — this is the whole D2C gap in one table

| app | files using `text-gradient-accent` |
|---|---:|
| **crm7** | **175** (184 occurrences) |
| conduit | 33 |
| throughput | 3 |
| **business-suite-unified** | **1** |
| braden | **1** |
| R80.4 | **0** |

That is why the operator's BSU dashboard screenshot has flat headings and crm7's does not. **G2 is
a propagation job, not a design job.**

### TWO TRAPS, both documented in the utility itself — read it before propagating

1. **`width: fit-content` is load-bearing.** Its own comment: *"background-clip: text paints the
   gradient across the ELEMENT BOX, not the glyphs. A block-level h1 spans its container, so a
   short word samples only the first ~15% of the gradient and the far stop never reaches the
   screen — it renders as a flat colour, **which is indistinguishable from the bug this
   replaces**."* Anything that overrides width silently kills the gradient **while looking
   applied**. A visual probe that only checks "is the class present" will pass a dead gradient.
2. **It uses `--gradient-heading`, NOT `--gradient-accent`,** deliberately: the raw accent gradient
   ends in cyan at **1.76:1** on the light background — half the word unreadable. `--gradient-heading`
   is built from the AA-verified `*-text` variants and is correct in both modes. **Do not "simplify"
   it to the accent gradient.**

### THE ONE-LINE CHANGE THAT RECONCILES §6b AND §6c — do this FIRST in Silo A

The two instructions — *"use crm7's default everywhere"* and *"don't wreck white-label"* — meet at
exactly one line, and today they conflict:

| var | set by | read by |
|---|---|---|
| `--heading-gradient` | `useBranding.ts:300`, from tenant/platform `heading_gradient` | BSU's local `.gradient-text` only |
| `--gradient-heading` | theme default, `vars.css:445` | **`text-gradient-accent`** |

`text-gradient-accent` reads **only the theme default**, so a tenant's `heading_gradient` never
reaches it. Propagating it as-is delivers consistent defaults **and silently disables white-label
headings**.

```css
/* packages/theme/src/css/utilities.css — .text-gradient-accent */
background-image: var(--heading-gradient, var(--gradient-heading));
```

**Tenant first, theme default second.** Both instructions satisfied in one line.

**And it is PROVABLY a no-op today** — measured on production 2026-08-25: **zero** rows in either
`platform_branding` or `tenant_branding` have `heading_gradient` set, so the var is unset and the
fallback resolves to exactly today's value. **Zero visual change now; white-label works the moment
anyone sets one.** That measurement is what makes this safe to ship first rather than last.

BSU's local `.gradient-text` already has the correct chain and can then be retired in favour of the
shared utility — one implementation, not two.

---

## §6d — WHY HE KEEPS ASKING: the gradient is a PAGE-TITLE convention, and he means CARD headings

**Operator, 2026-08-25, on crm7's own dashboard:** *"Quick Actions, Communication Centre and like
card Headings also require a gradient similar to the underline under bradengroup. and look how much
unused space there is on screen. a persistent request is also allowing the cards to utilise all
available space."*

### Measured — and this is the cleanest statement of the D2C gap in the estate

| app | h1 page titles with gradient | **card headings (h2/h3) with gradient** |
|---|---:|---:|
| crm7 | **183 / 235 (78%)** | **0 / 310** |
| conduit | 36 / 43 (84%) | **0 / 85** |
| business-suite-unified | 25 / 53 (47%) | 12 / 150 (8%) |
| braden | 1 / 32 (3%) | **0 / 124** |
| throughput | 0 / 17 (0%) | 3 / 82 |
| **estate** | | **15 / 753** |

**The gradient was implemented as a PAGE-TITLE convention. Card headings were never in scope.**

That is why the request is "persistent". On the very page he screenshotted, `Dashboard` (h1) HAS
the gradient and `Quick Actions`, `Communication Center` and `Pipeline Overview` (h2/h3) do not.
The work was done, declared complete, and covered a **different element** than the one he is
looking at. This is `zero_consumer_is_not_done` and `fix_the_class_not_the_page` in one artefact:
78% adoption on one element, **0% on the element the operator actually means**.

**G2 scope is therefore h2/h3 CARD headings — 738 of them — not the h1s that are already done.**
braden (1/32 h1) and throughput (0/17 h1) additionally have almost no gradient at all and need both.

### The other half — "cards utilise all available space" — is TWO different causes

Do not treat these as one job; they are in different files and only one is shared.

1. **crm7 only — the page container is capped.** `src/layouts/MainLayout.tsx:202` and `:229`:
   ```
   mx-auto w-full max-w-[1680px] px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8
   ```
   On a 2388px screen, minus the sidebar, ~500px is dead — split into the two empty margins in his
   screenshot. **No other app constrains its page container.** Two class occurrences.

   **CLASSNAME ONLY. NEVER CHANGE THE TREE SHAPE.** The comment directly above it records why:
   `useChromeless` once toggled a flag that changed the subtree, which UNMOUNTED the page, whose
   cleanup reset the flag, which reverted the structure, which remounted it — *"`/settings/schema-builder`
   never reached a load state and four e2e specs timed out on exactly that route."* The two divs
   must stay in the same positions; only `className` and `style` may differ.

2. **Everywhere — cards default to full width, so they stack.** `CanvasCard.w` defaults to **12**
   on a 12-column grid; **1,068 of 1,729 usages omit `w`** (BSU and conduit 100%). That is the BSU
   screenshot: one service card per row, vertical space wasted. Same root as §2.

**Both must ship, or he will see the complaint half-fixed and ask again** — which is the pattern
this whole document exists to end.

---

## §7 — PRE-AUTHORISED RULINGS. Braden is asleep. These ARE his answers.

Every one is **reversible on his word**. Record each application via the precedent clerk.

| # | Decision | **RULING**
|---|---|---|
| 1 | **Permissions defaults** (D-40/99/103) — 4 of 7 tenants have zero `role_capabilities` rows; the three that have rows disagree on up to 54 of 54 capabilities, so defaults **cannot be derived**. | **SHIP THE SAFE PATH.** When `loadRoleCapabilities` returns zero rows, pre-apply the **`read_only`** preset **UNSAVED**, with a banner: *"No permissions are configured for this organisation yet. This is a suggested starting point — nothing is granted until you press Save."* Non-destructive, least-privilege. **Do NOT seed `role_capabilities` on any real tenant.** |
| 2 | **`src/features/` — 601 dead lines** paralleling live code (`features/financial` 334 lines / 0 importers vs live `useFinancialStore`; `features/clients` 265 / 0). | **DELETE `features/{clients,financial,reports,settings}`. KEEP `features/contacts`** (3 genuine importers). Git history is the recovery path; record the SHA in the PR. Leaving two architectures is the only invalid answer. |
| 3 | **D-90 / D-62** — `r8-charge-rate-push` deployed, secret-authed, R8 never calls it because **R8 has no backend**. | **DO NOT BUILD TONIGHT.** Write an ADR in `docs/` naming the three options (give R8 a serverless route · invert to crm7-pulls · keep the manual paste) with a recommendation. Architecture with money implications is not an overnight call. |
| 4 | **D-58** — what "trade" means for MA000036 (Joinery). | **PARK.** Domain knowledge only Braden holds. Record the question precisely; do not guess an award fact. |
| 5 | **Grid inversion breaking change** (G1). | **AUTHORISED, gated on G0.** Storybook + the nested-chrome detector must exist and must demonstrably FAIL on today's estate first. |
| 6 | **`qa-signed-off` label.** | **The agent applies it** (Ruling V-1, 2026-08-19) — it records the AGENT's inspection. Apply only when the inspection actually happened, and write the evidence AND its limits into the PR. |
| 7 | **Promotion to `main`.** | **AUTHORISED on a genuinely passing gate.** Do not wait. `--merge` never `--squash` when head is `development`. |
| 8 | **Migration dispatch.** | **The agent runs it** — `gh workflow run supabase-migrate.yml --ref main -f submodule=all`. `--ref main` is load-bearing: the applier reads MAIN's gitlinks. Verify in the ledger afterwards, never trust the green run. |
| 9 | Anything else not covered. | **Rule from the precedent book, record it, proceed.** Prefer the narrowest safe interpretation. **Do not stop.** |

---

## §8 — PRIORITY ORDER

Ordered by how many times Braden has asked, not by technical convenience.

**P0 — the thing he is sick of asking for**
1. G0 Storybook + nested-chrome detector
2. G1 grid inversion (chrome, `w`)
3. G2 gradients on card headings · no pure white/black · aligned borders & radii · elevation on the `shadow-elev-*` ramp — **every app, every page**
4. G3 dnd-kit + columns proven working

**P1 — repeat requests**
5. **D-2 / D-109 email** — *"in excess of 20 times."* Google consent returns to the wrong app with the popup open → redirect_uri / authorised-origin mismatch. `email_integrations` still dual-writes plaintext `access_token`/`refresh_token`; **`smtp_password`/`imap_password` are ALREADY vault-only — do not "fix" those.**
6. **D-40/99/103 permissions** — ruling 1.
7. **D-70 draggable cards** — currently **61%, 370/603 pages**. Gap is BSU and braden.
8. **D-30/74/101/106 reporting** — **unblocked by PI RULING 25.1**: a report is a read-only saved question over the semantic layer; the explorer is an editable grid; deep-link, never embed.

**P2 — scoped and open**
9. D-76 dates — **an adoption gap**: `@bsuite/dates` is complete; **137 call sites bypass it**; R80.4 imports it zero times.
10. D-18 screenshots — the manual renderer has **no image block type**; the block must exist first.
11. D-46 R8 Jodie UI · D-105 margin (`ChargeRateCard.tsx:89–213` takes it as a typed input, not profit) · D-26 provider costs · D-108 duplicate contacts.

**P3 — coverage**
12. G5 the 553-route surface map. Currently **47 swept — 8%**.

---

## §9 — DEFINITION OF DONE

### Per item — six limbs, all of them

1. **The CLASS, not the instance** — a count of surfaces changed vs surfaces that exist, and they match or the residue is named.
2. **Proven in the running product**, by you, signed in, on the deployed SHA.
3. **The probe could see it** — state what it structurally cannot catch.
4. **A control that could have failed.**
5. **Verified by a lane other than the claimant.**
6. **Merged to `development`, promoted to `main`, production READY.**

### Per silo

- **Silo A:** the nested-chrome detector reports **0** across all six apps, having demonstrably reported **316** before the fix. `visual-probe.js` PASS on route × theme × width × account for every changed app. No `INCOMPLETE`.
- **Silo B:** every item either shipped to `main`, or `BLOCKED` with a named unblock. No item sits in `CLAIMED-DONE`.

### Per night

`agent-definition-of-done` D1–D7 with **APPROVE** or a recorded waiver. 7/7 repos on `development`,
in sync, `main` tree == `development` tree. Zero open PRs, or each open PR named with why.

---

## §10 — STANDING CONSTRAINTS

Production is `main` — **never direct-push**. Every commit **GPG-signed**, verified in the same
command as the push. **Never `git add -A`.** `.env.local` may be read, never committed, **never
printed**. Worktrees only under `~/Desktop/Dev/worktrees/`. **Never force-push.** Never commit in a
`MERGE_HEAD` worktree. One open PR per lane; cleanup in the same turn as the merge. Migration
versions checked globally across all seven scopes — one shared `schema_migrations` keyed on the
version string alone. **Guard every DDL against a rebuild-from-baseline** — `REVOKE`/`GRANT`/
`COMMENT ON` raise on a missing object, and a migration that cannot replay stops protecting anything
the day the DB is rebuilt. No real PII in any report — shapes and counts only.

---

## §11 — THE MEASUREMENT DISCIPLINE

**Fourteen measurement artefacts were caught in one session; NINE would have shipped as findings.**

Before reporting any absence, state **the second probe that could have found it and did not.**

- A **name**-shaped probe cannot find a **prop**-shaped mechanism (D-10 read as absent; it is built, wired through `@bsuite/ui` two repos away behind a 46-line DI shim).
- A guard **one call away** is invisible to a keyword scan (nearly reported a live cross-tenant IDOR that was correctly fixed).
- `to_regclass` cannot see a **function**.
- A parser blind to a nesting level reports **0 findings** on 175KB of data.
- `grep -A2` misses an attribute on line 3; a regex closes early on the `>` in `onClick={() => …}`.
- **Probe `origin/development`, never the working tree.**

**A green gate is a claim about the gate.** Where it samples, the sample is the claim.

---

## §12 — THE MORNING BRIEF

Written for Braden, not an engineer. Gloss every acronym. One ledger, and every item is exactly one
of: **`VERIFIED-DONE`** (checked by another lane) · `CLAIMED-DONE` · `IN-PROGRESS` · `BLOCKED` with
a named unblock.

Structure: what is closed and proven, with evidence · what is in production · what moved but is not
closed and **precisely where it stops** (file, line, branch, next step) · what pre-authorised
rulings were applied and what they changed · **what I got wrong**.

**A short honest list beats a long false one. Nothing at `CLAIMED-DONE` may be written as done.**
