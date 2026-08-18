# Frontend Layout & Z-Index Standards

**Status:** Working · **Relocated:** 2026-07-31

> **Relocated from `AGENTS.md` 2026-07-31** as part of the rulebook slim-down. This is the canonical detail; `AGENTS.md` keeps only the pointer.


> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Applies to **all 5 apps** (BSU, CRM7, Conduit, Braden, R80.3). These rules exist because AI agents routinely reach for z-index hacks and magic pixel offsets when the real fix is a structural DOM/flexbox change. The three-prompt system below is the mandatory protocol.

### The 3-Prompt DOM Autopsy System

**Use this system before touching any layout, z-index, positioning, or sticky/fixed element across all 5 apps.** Running Prompt 1 first prevents the "CSS hack trap" — where an agent throws `z-index: 9999` or `position: absolute !important` at a symptom instead of fixing the root cause.

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
- `h-screen overflow-hidden` on the app shell root + `overflow-y-auto` on `<main>` only — this is the correct bounded app shell pattern. **Never** use `min-h-screen`, `min-h-svh`, or any `min-h-*` on the root — these make the shell unbounded and break independent panel scrolling.
- Mobile sidebar backdrop must have higher z-index than the app header so the header is visually dimmed when sidebar is open
- `role="main"` is redundant on `<main>` — never add it. `<main>` is implicitly `role=main`.
- **Never hardcode `calc(100vh-<px>)`** for layout heights — use flex remainder (`flex-1 min-h-0`) so the layout adapts when banners or notice bars are shown/hidden without changing height
- **`overflow-hidden` on widget/card inner divs** suppresses `position: sticky` inside them — document this with a code comment whenever `overflow-hidden` is used for corner clipping; do not add sticky descendants inside such containers
- **Non-standard z-index utilities** (`z-200`, `z-150`, etc.) are not generated by Tailwind v4 unless safelisted — always use explicit arbitrary values (`z-[200]`, `z-[150]`) so the utility class is guaranteed to be emitted
- **Mobile bottom nav z-index** must be lower than any sidebar backdrop/overlay so that when the sidebar opens, the overlay fully covers the bottom nav — bottom nav: `z-[45]`, overlay: `z-[46]` minimum

**Per-app bounded-shell reference (2026-04-16 audit):**

| App | Root class (target) | Inner scroll | Status |
|-----|---------------------|--------------|--------|
| conduit | `h-screen overflow-hidden` on `DashboardShell` root | `<main> overflow-y-auto` | ✅ Correct (after #56 fix) |
| business-suite-unified | `h-screen overflow-hidden` on `MainApp` root | `<main> overflow-y-auto` | ⚠️ Fix pending (#74) |
| crm7 | `h-svh overflow-hidden` on `SidebarProvider` | `flex-1 overflow-auto min-h-0` inner div | ⚠️ Fix pending (#201) |
| R80.3 | `h-screen overflow-hidden flex-col` on App root | `<main> overflow-auto` | ⚠️ Fix pending (#52) |
| braden | `flex flex-col min-h-screen` → `h-screen` target | Scroll on body (SPA) | ⚠️ Fix pending (#96) |

---

