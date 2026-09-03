# Frontend Layout & Z-Index Standards

**Status:** Working · **Relocated:** 2026-07-31

> **Relocated from `AGENTS.md` 2026-07-31** as part of the rulebook slim-down. This is the canonical detail; `AGENTS.md` keeps only the pointer.


> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Applies to **all 6 apps** (BSU, CRM7, Conduit, Braden, R80.4, Throughput). *(Was "5 apps … R80.3" — R80.3 was archived in the 2026-08-06 restructure and R80.4 and Throughput were never added.)* These rules exist because AI agents routinely reach for z-index hacks and magic pixel offsets when the real fix is a structural DOM/flexbox change. The three-prompt system below is the mandatory protocol.

### The 3-Prompt DOM Autopsy System

**Use this system before touching any layout, z-index, positioning, or sticky/fixed element across all 6 apps.** Running Prompt 1 first prevents the "CSS hack trap" — where an agent throws `z-index: 9999` or `position: absolute !important` at a symptom instead of fixing the root cause.

---

#### Prompt 1 — DOM Autopsy (always run first)

```
ROLE: You are a Staff Frontend Engineer and UI Architect. You are allergic to
hacky CSS patches, random z-index escalations, and !important overrides.
You fix root structural issues, not visual symptoms.

CONTEXT:
- Tech Stack: [React/Next.js | Tailwind CSS v4 | TypeScript]
- Current Issue: [describe the layout problem — e.g. "sidebar overlaps main content"]
- Relevant Components: [e.g. DashboardShell.tsx, AppSidebar.tsx, Header.tsx]
- State Management: [useState / Context / Zustand — whichever applies]

TASK — STRUCTURAL & LAYOUT TRACE:
1. Trace the Component Hierarchy starting from the common parent of the
   misbehaving elements. Map the exact DOM tree.
2. At each structural level, answer:
   - Positioning context? (Mixing fixed/absolute with static flow without
     compensating margins/padding?)
   - Where does State live? (Is sidebar-open state local when it should be lifted?)
   - Missing Flexbox or Grid orchestrator? (Siblings sizing themselves without
     a parent flex/grid managing remaining space?)
   - Stacking Context? (Missing backgrounds, z-index conflicts causing bleed-through?)
   - overflow trap? (sticky inside overflow:hidden is suppressed — check all ancestors)
3. Produce a NUMBERED LIST of structural breakpoints. For each:
   - Component / File and line number
   - Root Cause (e.g. "Main wrapper lacks flex-grow" or "overflow:hidden on
     ancestor suppresses sticky positioning")
   - Exact structural fix required (state lifting, flexbox wrapper, removing
     overflow:hidden, CSS transition change)

CONSTRAINTS:
- Do NOT suggest z-index hacks unless a proper stacking context is established
- Do NOT suggest absolute positioning to fix a flow layout problem
- Prioritise Flexbox/Grid structural fixes over manual margin/width math
- sticky requires a scrolling ancestor — verify no overflow:hidden between
  the sticky element and the scroll container
```

---

#### Prompt 2 — Responsive Sweep (feed Prompt 1 output as context)

```
ROLE: You are a Frontend QA Architect who specialises in finding edge-case bugs
that AI code generation leaves behind. You look for responsiveness breakdowns,
state desyncs, and accessibility traps.

CONTEXT: [Paste the breakpoint list from Prompt 1]

TASK — SCAN FOR HIDDEN FRONTEND FAILURES:
For each proposed fix, report CLEAN or list the exact risk found.

CATEGORY 1: RESPONSIVE & VIEWPORT BREAKAGE
- Does the fix break mobile screens? (flex row squishing to 0px on iPhone?)
- Missing media queries to convert sidebar to off-canvas drawer on small screens?
- Overflowing text/tables inside flex container? (missing min-w-0 or overflow-hidden
  on flex children)

CATEGORY 2: STATE DESYNC & PROP DRILLING
- If isExpanded state is lifted to Layout, does it cause unnecessary full-app re-renders?
- Animating composite properties (width/margin) that trigger heavy reflows?
  If so, is it optimised, or should we use a different approach?

CATEGORY 3: ACCESSIBILITY (A11y) & INTERACTION TRAPS
- If sidebar overlaps on mobile, does it trap focus?
- If a backdrop is added, does clicking it dismiss the sidebar?
- Transparent elements with pointer-events that block clicks on underlying content?
- Duplicate ARIA landmarks? (role=main on <main>, role=complementary on <aside>)
- sticky elements that scroll away on mobile — user loses nav access?

CATEGORY 4: TAILWIND / CSS CLASHES
- Conflicting utility classes on same element? (absolute + flex-1 together)
- Dynamic classes constructed unsafely? (string concatenation Tailwind compiler misses)
- overflow:hidden ancestors suppressing sticky positioning?
- min-h-screen vs h-screen — does the root container need to be bounded?

FORMAT: For each category, list findings with File, Risk, and Remediation.
Then provide a COMBINED, safe, production-ready code plan.
```

---

#### Prompt 3 — Visual Proof (after the agent provides code)

```
ROLE: You are a UI/UX Release Engineer. You do not trust code until it is
tested across multiple viewports and interaction states.

CONTEXT: [Paste the combined fix list from Prompts 1 and 2]

TASK — BUILD THE UI VERIFICATION PLAN:

1. THE FIX SUMMARY: The exact code change (file, before/after).

2. DESKTOP VERIFICATION (≥1024px):
   - Action: Toggle sidebar / trigger the fixed element.
   - Expected: Main content smoothly reflows. No text bleeds under sidebar.

3. MOBILE VERIFICATION (375px):
   - Action: Open app on 375px viewport.
   - Expected: Sidebar behaviour (off-canvas overlay? backdrop? main stays put?)
   - Expected: Sticky banner and nav remain accessible when scrolling.

4. INTERACTION & EDGE CASES:
   - Action: Put a wide data-table or long unbroken text in main. Toggle sidebar.
   - Expected: Layout does not break. Table scrolls horizontally within container.
   - Action: Dismiss banner/notice. Content reflows smoothly.
   - Action: Open mobile sidebar. Background is dimmed (backdrop covers header).

FINALLY — "WHAT I COULDN'T CHECK":
List CSS/layout assumptions (e.g. "assumed box-sizing: border-box globally",
"assumed #root has height: 100vh", "assumed no overflow:hidden between sticky
element and scroll container").

FORMAT: Checklist. Each item must be testable by a human in a browser.
```

---

### Z-Index Reference Table (Suite-Wide)

Use this as the canonical starting point when adding new layered elements. Do not exceed `z-[100]` without a compelling reason.

| z-index | Element | Apps | Notes |
|---------|---------|------|-------|
| `z-[1000]` | HealBanner | braden | Fixed diagnostic banner — highest priority |
| `z-[100]` | Toast notifications (Sonner) | all | Above everything except HealBanner |
| `z-[60]` | SystemNoticeBanner | all | Sticky — must be in same flex column as header |
| `z-50` | Mobile sidebar panel | conduit, BSU, crm7 | Fixed slide-out |
| `z-50` | AI sheet / panel | conduit, crm7 | Fixed right-side panel |
| `z-50` | Navigation bar | braden | Sticky |
| `z-[45]` | Mobile sidebar backdrop | BSU | Fixed overlay — must be above header |
| `z-40` | Header / App header | BSU, conduit | Sticky |
| `z-40` | PageEditorLauncher | BSU, conduit | Fixed FAB |
| `z-40` | Mobile overlay (conduit) | conduit | Fixed inset-0 dialog |
| `z-30` | Dropdown menus inside header | all | Absolute popover |
| `z-20` | Admin sidebar rail | braden | Absolute |
| `z-20` | Hero text overlay | braden | Relative |
| `z-10` | Sidebar collapse button | BSU | Absolute |
| `z-0` | Main content | all | Default flow |

**Invariants:**

- SystemNoticeBanner (`z-[60]`) **must** be in the same flex column as the header — never a sibling of the router root (it cannot coordinate stacking across different scroll containers)
- Sticky positioning **requires** no `overflow: hidden` or `overflow: clip` on ANY ancestor between the sticky element and the scroll container — always audit the ancestor chain
- **The bounded shell is `AppShell` from `@bsuite/ui`. Do not hand-roll one.** Its root is
  `relative isolate flex h-svh w-full`, the content region owns the only scroll
  (`min-h-0 flex-1 overflow-auto`), and header/footer/banner are `shrink-0`.
- **Never** use `min-h-screen`, `min-h-svh`, or any `min-h-*` on the shell root — these make
  the shell unbounded and break independent panel scrolling. This still holds, and it is the
  rule the April 2026 per-app fixes were about. (Audited 2026-09-03: 5 `<AppShell>` call
  sites across the six apps, **0** pass a `min-h-*` to the root. A `min-h-*` on content
  *inside* the shell — a Suspense fallback, say — is fine and is not what this forbids.)
- **Do NOT put `overflow-hidden` on the shell root.** An earlier version of this document
  required it. That was wrong and `AppShell` deliberately omits it: `overflow-hidden` paired
  with a `position:fixed` sidebar descendant clips the sidebar on engines that don't honour
  the fixed-escapes-overflow spec — crm7 Bug 1, "sidebar footer/nav unreachable on short
  viewports". Bounding the *height* (`h-svh`) is what makes the shell bounded; clipping the
  root is not needed for it and costs you the sidebar.
- Mobile sidebar backdrop must have higher z-index than the app header so the header is visually dimmed when sidebar is open
- `role="main"` is redundant on `<main>` — never add it. `<main>` is implicitly `role=main`.
- **Never hardcode `calc(100vh-<px>)`** for layout heights — use flex remainder (`flex-1 min-h-0`) so the layout adapts when banners or notice bars are shown/hidden without changing height
- **`overflow-hidden` on widget/card inner divs** suppresses `position: sticky` inside them — document this with a code comment whenever `overflow-hidden` is used for corner clipping; do not add sticky descendants inside such containers
- **Non-standard z-index utilities** (`z-200`, `z-150`, etc.) are not generated by Tailwind v4 unless safelisted — always use explicit arbitrary values (`z-[200]`, `z-[150]`) so the utility class is guaranteed to be emitted
- **Mobile bottom nav z-index** must be lower than any sidebar backdrop/overlay so that when the sidebar opens, the overlay fully covers the bottom nav — bottom nav: `z-[45]`, overlay: `z-[46]` minimum

**Per-app shell reference (re-audited 2026-09-03).** The 2026-04-16 table this replaces
described five per-app shell roots (`DashboardShell`, `MainApp`, `SidebarProvider`, …) and
listed four of them as "Fix pending". All four issues closed in April 2026 — conduit#56,
business-suite-unified#74, crm7#201, braden#96 — and the per-app roots they described have
since been replaced by the shared `AppShell`. It also listed R80.3, which is archived, and
omitted R80.4 and throughput, which exist.

| App | Shell | `min-h-*` on root? |
|-----|-------|--------------------|
| crm7 | `AppShell` — `MainLayout.tsx:143`, but **wrapped by `SidebarProvider`** at `:101` | **on the outer wrapper — `min-h-svh`, sidebar.tsx:140** |
| business-suite-unified | `AppShell` — `AppContent.tsx:223` | no |
| conduit | `AppShell` — `DashboardShell.tsx:364` | no |
| throughput | `AppShell` — `MainContent.tsx:30` | no |
| R80.4 | **its own local `AppShell`** — `./components/layout/AppShell` (`main.tsx:8`), not `@bsuite/ui` | **YES — `flex min-h-svh flex-col`, `AppShell.tsx:71` and `:121`** |
| braden | **no `AppShell`** — admin shell root is `SidebarProvider`, `AdminLayout.tsx:101` | **YES — `min-h-svh`, sidebar.tsx:142** |

Consumers pass only background, transition and dot-pattern props to `AppShell` itself — none
passes a `min-h-*` to it. **But `AppShell` is not always the outermost element**, and that is
where this rule is still being broken:

- **crm7** — `SidebarProvider` (`MainLayout.tsx:101`) wraps `AppShell` (`:143`), so the true
  shell root is the shadcn wrapper at `sidebar.tsx:140`, `flex min-h-svh w-full`. In practice
  it does not grow today, because its only children are exactly `h-svh`. It is latent, not
  live — and it is one taller-than-viewport child away from becoming live.
- **braden** — has no `AppShell` anywhere. Its admin shell root IS `SidebarProvider`
  (`AdminLayout.tsx:101`) over `sidebar.tsx:142`, `flex min-h-svh w-full`, with a
  `SidebarInset` at `:324` that is also `min-h-svh`. Nothing bounds that surface's height.

- **R80.4** — imports its **own** `AppShell` from `./components/layout/AppShell`
  (`main.tsx:8`), not `@bsuite/ui`. Its root is `flex min-h-svh flex-col` at
  `AppShell.tsx:71` **and** `:121` (two branches, both unbounded). Cross-reference D-167,
  whose text describes R80.4 as using the shared shell; it does not.

crm7#201 ("SidebarProvider root uses min-h-svh — unbounded") was closed on 2026-04-16 and
the `min-h-svh` it was about is still there. Closing the app-level issue did not close the
class, and the class is **three different shapes in three apps** — a vendored shadcn wrapper
(crm7, braden) and a locally-written shell of the same name (R80.4). A grep for `<AppShell`
finds all three and tells you nothing: **check the import**, then check what wraps it.

**A fix here has to be verified per surface, not per package.**

*How the "no" rows were checked, since a bare `<AppShell` grep is what produced the wrong
answer the first time:* for each app, the **import** was read (all three resolve to
`@bsuite/ui`) and the **ancestors** of the call site walked. BSU's `<PageEditorLauncher>`
wrapper is `className="contents"` and so creates no box; `AppContent.tsx:77` records in its
own comment that it avoids `min-h-svh` deliberately.

The `min-h-svh` / `min-h-screen` occurrences that remain in those three apps are on
marketing pages, auth shells, error boundaries and loading states — surfaces that **should**
grow past the viewport. This rule is about the **authenticated app shell root**, not a ban
on the utility.


---

