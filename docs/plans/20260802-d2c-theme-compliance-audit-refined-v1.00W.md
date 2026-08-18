# D2C Theme Compliance Audit — refined prompt

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Status: W (working) · Date: 2026-08-02 · Tier: Standard (3 passes)

## Intent

Braden wants to know how far the BSuite codebase has drifted from the D2C Neon Electric
theme doctrine: no pure white/black, colours in OKLCH only, and every consumer-facing colour
bound to a semantic token from `@bsuite/theme` rather than written literally. The deliverable
is an **audit** — a per-submodule, per-violation-class inventory with real counts and named
files — not a remediation sweep. Remediation scope is Braden's call once the size is known.

## Decomposition

| # | Workstream | Depends on |
|---|---|---|
| W1 | Establish the canon: which rules actually apply, and where they are written | — |
| W2 | Verify the *enforcement path* — does any gate actually run these rules? | W1 |
| W3 | Scan for pure white/black (Tailwind utilities, CSS literals, inline styles) | W1 |
| W4 | Scan for non-OKLCH colour formats (hex, rgb, hsl, named colours) | W1 |
| W5 | Scan for hardcoded palette classes + arbitrary-value colours (bypasses tokens) | W1 |
| W6 | Reconcile doc contradictions across AGENTS.md / skill refs / theme package | W1 |

## Canon established (W1)

Authoritative, in precedence order:

1. **`AGENTS.md` tripwire #10** — semantic error/destructive is Electric Purple
   `oklch(0.568 0.202 283.1)`, never red/coral, on both brands, not tenant-overridable.
   "No `text-white`, `text-black`, raw hex, RGB or HSL in consumer UI."
2. **`packages/theme/README.md`** — cited by AGENTS.md as canonical for theme tokens.
   Line 127: bind to `text-foreground` / `text-muted-foreground` / `text-text-on-primary`
   rather than raw `text-white`/`text-black`; dark-surface text capped at L=0.94.
3. **`packages/theme/src/css/vars.css`** — the token source of truth.
4. **`bsuite-brand-system` skill + `references/d2c-neon-electric-theme.md`** — palette reference.

### Operator ruling 2026-08-02 — pure white is banned FULL STOP

Braden's ruling this session **overrides** the narrower rule written into the theme package.
`vars.css:20` and `:244` scope the ban to *text* tokens ("Pure white (L=1.0) is BANNED as a
text token"), which leaves `--light-bg-accent: oklch(1 0 0.5)` (vars.css:52) standing as the
light-mode panel background. That is now a violation too: **no pure white anywhere — text,
surface, border, or shadow.** Same for pure black.

Consequences the audit must carry:

- `packages/theme/src/css/vars.css` is itself **in scope as a violation site**, not just as
  the reference. The token source ships the value it forbids downstream.
- The theme package cannot be blanket-excluded from the pure-white/black class. It remains
  excluded only from the *format* classes (it legitimately defines raw `oklch()` primitives).
- The in-code comments at `vars.css:20`/`:244` are now stale doctrine and need correcting —
  a stale rule in a canonical file reads as live permission.

### The one real exemption

**`braden/` is the Corporate brand and is out of D2C scope entirely.** It uses HSL by
design and is explicitly exempted by the lint rule's `isBradenSubmoduleFile` check.
Auditing it against D2C would manufacture violations.

## Blindspots to counter (pass 3)

| Blindspot | Counter baked into the work |
|---|---|
| Grepping `text-white` misses `dark:text-white`, `hover:text-white`, `text-white/80`, and the `fill-`/`stroke-`/`ring-`/`from-` prefixes | Match the full utility-prefix set with optional variant and opacity suffixes |
| Counting `node_modules` / `dist` / `.next` / generated files inflates every number | Hard-exclude build outputs; report the exclusion list alongside the counts |
| Counting `packages/theme`'s own primitives as violations | The theme package DEFINES the primitives; exclude its CSS from the literal-colour classes |
| Asserting one headline total | Report **grouped by submodule and by violation class** — a single total hides which app is the problem |
| Assuming the lint rule enforces the doctrine because it exists and is set to `'error'` | Verify consumption, not existence (W2) |
| Treating every hex as a defect | Email templates, SVG brand assets, `<meta name="theme-color">`, manifest.json, and chart/PDF export need literal colours — classify as legitimate exceptions, separately |

## Skills & MCPs to use

- `agent-master-orchestration` — turn entry, family detection, gate discipline (done)
- `bsuite-brand-system` — the two-brand rule and palette reference (done)
- `plan-prompt-enhancer` — this document
- `Explore` subagents — per-submodule sweeps, `sonnet` tier (ROUTINE class)
- `test-verify-before-completion` — no count asserted without a command that produced it
- No MCP needed: this is a static-source audit. No Context7 (no external library
  behaviour in question), no Supabase, no Playwright (nothing runtime is being claimed).

## The refined prompt

> Audit the five D2C BSuite submodules (`crm7`, `conduit`, `business-suite-unified`,
> `R80.3`, `throughput`) plus `packages/` for drift from the D2C Neon Electric theme
> doctrine. Exclude `braden/` (Corporate brand, HSL by design) and all build output.
>
> Report, **grouped by submodule and by violation class**, with real counts from a
> re-runnable command and named example files:
>
> 1. Pure white/black **in any role — text, surface, border, ring or shadow** (operator
>    ruling 2026-08-02: banned full stop, overriding the text-only scoping in `vars.css`).
>    Tailwind utilities across all colour prefixes including variant and opacity forms,
>    plus CSS/inline literals (`#fff`, `#000`, `rgb(255 255 255)`, `white`, `black`,
>    `oklch(1 0 0)`, `oklch(0 0 0)`). `packages/theme` is IN scope for this class.
> 2. Non-OKLCH colour formats in authored source: hex, `rgb()`, `hsl()`, named CSS colours.
> 3. Token bypasses: hardcoded Tailwind palette classes and arbitrary-value colour classes.
> 4. Destructive/error colours using red or coral instead of Electric Purple
>    `oklch(0.568 0.202 283.1)`.
>
> Separate **legitimate exceptions** (email templates, SVG brand assets, `theme-color`
> meta, manifest, chart/PDF/canvas export) from real violations, and say why each is exempt.
>
> Then answer the enforcement question directly: is there a gate that would catch a new
> violation before merge, and does that gate run on the path that actually executes?
> Copy the gate's predicate verbatim and state precisely what it does and does not match.
>
> Deliver an inventory and a prioritised remediation recommendation. Do not perform the
> remediation.
