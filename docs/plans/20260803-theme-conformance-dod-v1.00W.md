# Theme conformance — Definition of Done

**Status:** W (working) · **Owner:** claude-code-bsuite-theme · **Acting PI escalation:** fable
**Operator directive 2026-08-03:** *"continue until everything I mean everything is correct. go page
by page. everything that is coloured or text and validate. do not stop until you can prove to me all
is done."*

---

## 0. What "prove" means here

A claim is only as good as the instrument behind it. Every gate below is a **command that exits
non-zero on failure**, not a judgement. If a gate cannot be automated, it is listed under §4 as
requiring the operator's eye, and it is named explicitly rather than quietly assumed.

Three failures this session are the reason for that rule:

| Claim | Reality | Why the instrument mattered |
|---|---|---|
| "packages/ is clean" | 62 off-palette colours | A ban enumerates the forbidden and never finishes; a whitelist converges |
| "the heading ramp is in" | tokens existed, **nothing applied them** | A token nobody binds is six unused variables |
| "throughput is fine" | **did not build** against the published theme | Its `node_modules` was stale, so nobody could see it |

Each was invisible to the eye and obvious to a script.

---

## 1. Gates (all must exit 0)

| # | Gate | Command | Threshold |
|---|---|---|---|
| **G1** | No pure white/black in any role | `scripts/audit-d2c-theme.sh` (C1 col) | ≤ committed baseline, prose-only residual |
| **G2** | Only contract colours in `packages/` | `scripts/audit-palette-whitelist.py` | **0** |
| **G3** | No palette bypasses in app source | `scripts/audit-d2c-theme.sh` (C3 col) | **0** real per app |
| **G4** | No app redeclares a package-owned token | `scripts/audit-token-ownership.sh` | **0** |
| **G5** | Heading ramp reaches the DOM | `scripts/audit-applied-tokens.sh` | h1–h6 all resolve to distinct `--role-h*` |
| **G6** | One font family, from the contract | `scripts/audit-applied-tokens.sh` | Geist (D2C) / Open Sans (Corporate), no Inter |
| **G7** | Every app builds | `pnpm build` × 6 | exit 0 |
| **G8** | Every suite passes | `pnpm test` × 6 + packages | exit 0 |
| **G9** | Shared packages import under Node ESM | `scripts/verify-esm-imports.sh` | PASS |
| **G10** | No invalid utilities (double opacity, unknown class) | `scripts/audit-invalid-utilities.sh` | **0** |

**G4, G5, G6 and G10 are new** — added because the operator found defects that G1–G3 could not
see. That is the pattern: every escaped defect earns a gate, or it escapes again.

---

## 2. Per-page validation

A gate proves a property across the tree. It does not prove a *page* is right. For that, each
route is walked and checked against the checklist below.

Route inventory lives in `scripts/audit-routes.sh`. For every route, in **both light and dark**:

| # | Check | Automatable |
|---|---|---|
| P1 | No element computes to `rgb(255,255,255)` or `rgb(0,0,0)` in a colour role | ✅ Playwright |
| P2 | Every text node ≥ 4.5:1 against its own background (3:1 for ≥24px) | ✅ Playwright |
| P3 | `h1`–`h6` resolve to distinct ramp colours | ✅ Playwright |
| P4 | `font-family` resolves to the contract family | ✅ Playwright |
| P5 | No off-palette computed colour | ✅ Playwright + whitelist |
| P6 | Focus ring visible on every interactive element | ✅ Playwright |
| P7 | Nothing invisible: no element whose colour == its background | ✅ Playwright |
| P8 | Layout intact at 375 / 768 / 1440 | ⚠️ screenshot, human review |
| P9 | Categorical colour distinguishable under deuteranopia/protanopia | ⚠️ simulated, human confirm |

P1–P7 are **hard gates**. P8–P9 produce artefacts for the operator; they are not self-certified.

---

## 3. Team + escalation

| Role | Agent | Scope | Model tier |
|---|---|---|---|
| **Lead** | this session | writes, commits, releases, owns the gate | driver |
| **Auditor ×N** | `Explore` (read-only) | one app each — enumerate routes, colour + text usage | low |
| **Design sheriff** | `bsuite-design-sheriff` | token discipline, contract conformance | standard |
| **User advocate** | `bsuite-user-advocate` | UX, a11y, mobile, error/empty states | standard |
| **Red team** | `general-purpose` | attack the gates: what passes but is still wrong? | standard |
| **Acting PI** | **fable** | contested calls, a defect surviving two fixes, irreversible choices | frontier |

**Auditors are read-only.** Two agents writing to one submodule need separate worktrees; making the
audit read-only removes that hazard entirely rather than managing it. The lead performs all writes,
serially.

### Escalate to fable when

1. A defect survives **two** fix attempts.
2. A gate and the operator's eye disagree (the instrument may be measuring the wrong thing).
3. A fix requires changing a contract value — the document is authoritative and altering it is not
   a lane-level call.
4. Any irreversible or cross-app-visual decision.

---

## 4. Explicitly NOT self-certifiable

These require the operator and are never claimed as done by an agent:

- **Categorical separation** — whether two role badges are distinguishable *to Braden specifically*.
  The blue↔purple confusion is a fact about the reader, not the pixels.
- **"Looks basic"** — visual density, hierarchy, polish.
- **Whether a ramp reads as progression** at a glance.

Named here so they are not silently folded into a green gate.

---

## 5. Out of scope for this lane

Reported by the operator, real, and **not theme work**. Tracked so they are not lost, not fixed here:

| Item | App | Class |
|---|---|---|
| KPI cards excluded from the drag canvas | crm7 | contradicts a standing operator ruling |
| Columns slider ignored, cards full-width | crm7 | page-builder behaviour |
| No dnd-kit editor | conduit | feature gap |
| Nav absent on some pages | conduit | routing |
| Field Officer Portal opens a candidate, no exit | conduit | routing bug |
| No filters on Field Officer Portal | conduit | feature gap |
| Only a default team can be created | BSU | feature gap |
| No edit page; nowhere to add roles | BSU | feature gap — **blocks validating role-badge colour** |
| Permissions blank instead of preset defaults | BSU | feature gap |
| Jodie AI icon missing; logo not the uploaded platform logo | BSU | asset/branding wiring |
