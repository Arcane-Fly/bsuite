# BSuite Visual QA — d.* apps (2026-07-22)
Login: braden.lang77@gmail.com. All findings from live rendered pages, both themes where noted.
Legend: 🔴 blocker/critical · 🟠 major · 🟡 minor/polish · ✅ verified-fixed

## APP 1 — d.ideas.crm7.app (throughput)

### 🔴 Dark mode broken — content stays light
Toggle switches header/footer to dark but main content (page bg, all 3 column cards, dot layer) stays LIGHT. Root cause: `dark:bg-dark-bg-primary` utility rule MISSING from compiled CSS; the `dark:` variant isn't emitted for the body/content bg. Var `--dark-bg-primary` resolves dark, but no utility rule references it under `.dark`. Same bug class as the Tailwind v4 node_modules detection — the shared theme's dark-surface utilities aren't being generated in the standalone build.

### 🔴 Kanban grid layout regression (autoHeight side-effect)
After today's autoHeight fix, the 3 columns no longer sit side-by-side in their x:0/4/8 cells. They stack vertically, overlap, and cascade diagonally; w:4 ignored (cards render ~full-width), y:0 not respected. Reload does NOT fix. ResizeObserver/convergence collapses grid item width+position. REGRESSION from a53625e — must fix or revert.

### 🟠 Header wordmark overlap
"Throughput" text overlaps/sits on the swirl logo (link text "Throughput Throughput" — alt + wordmark both announce; visually the text is on top of the mark). In dark mode the wordmark goes dark-on-dark (invisible).

### 🟠 Column card contrast (light mode)
The 3 column backing cards are near-white/very-light-gray on the white page — weak separation, washed out. (Was dark cards on dark bg pre-restyle; the crm7 chrome match made them too light.)

### 🟡 Duplicate nav affordance
"Ideas" appears twice in header: an "Ideas" dropdown button AND an "Ideas" link, adjacent. Redundant.

### 🟡 Capture "+ New Idea" button clipped
At ~1920px the Capture column's "+ New Idea" button overflows/clips off the right edge of its card.

### ✅ autoHeight works (heights)
Cards now hug content (Launch column short, no void) — the height fix is good; it's the width/position that broke.

### ✅ Swirl favicon present (favicon.ico resolves)

## APP 2 — d.suite.crm7.app (BSU)

### ✅ Dot pattern fix WORKS (light mode) — dots visible across content
### ✅ Analytics "Soon" pill GONE (fix confirmed)
### ✅ Swirl logo in header
### ✅ Login page works (note: still shows old "BS" purple monogram, not swirl — separate auth-logo asset)

### 🔴 Dot pattern gone in DARK mode
Light mode shows dots, but in dark the hero + stat cards are fully opaque dark and cover the content edge-to-edge — no dots anywhere. The !bg-transparent/!min-h-0 fix let dots through in light; dark cards re-cover.

### 🟠 Hero heading flat + button contrast
"Business Suite" h1 is flat BLACK (light) / flat WHITE (dark) — no brand gradient (doctrine: blue→cyan gradient on wordmark). "CRM7 Dashboard" link top-right of hero is white-on-light (light mode) — nearly invisible; only "Open R8" reads. Contrast fail.

### 🟠 Stat cards low separation
Active Services / Total Users cards are white-on-white (light) with weak borders. "Set up analytics to track this" amber text is low-contrast in BOTH themes (hard to read).

### 🟡 Content blank on first paint
Dashboard content area renders empty (dots only) until a manual reload — initial mount doesn't paint the dashboard (Suspense/route timing).

### 🟡 Sidebar "Branding" appears 3×
Branding link under WORKSPACE, ADMIN, and SETTINGS — expected (different scopes) but worth confirming they route to the right tiers.

## APP 3 — d.crm.crm7.app (crm7)

### ✅ Dot pattern visible ✓ · gradient "Braden Pty Ltd" wordmark ✓ · footer "CRM7" gradient ✓
### ✅ Pipeline Overview HAS values ($1.6M, 5, 3, 5) — correct; Quick Actions HAS 3 links.

### 🟠 Tenant/org name repeated 5× in chrome
"Braden Pty Ltd" sidebar header (announced "Braden Pty Ltd Braden Pty Ltd Braden Pty Ltd" — logo alt + 2 text spans, a11y redundant) + header gradient wordmark + "Braden Group" dropdown + "Braden Group" tenant chip + user chip "braden.lang77 / Braden Group". The org/tenant name dominates the header — consolidate.

### 🟠 Communication Center text clipped mid-word
"No communications scheduled toda[y]" is cut at the card's right edge (word "today" truncated). Card content overflow.

### 🟠 Financial Overview tab clipped
"Charge Rates" tab is cut off at the right edge of the Financial Overview card; a 4th element is hidden behind it.

### 🟡 Quick Actions 3rd button clipped
"Schedule Meeting" (3rd quick action) is partially cut — only Add New Contact + Create Opportunity fully visible at 1512px width.

### 🟡 Install PWA prompt fired on landing
"Install BSuite CRM" dialog appeared on first load before any interaction — consider gating to after first meaningful engagement.

## APP 4 — d.conduit.crm7.app (conduit)

### ✅ Edit Page FAB GONE ✓ · swirl logo ✓ · clean Candidates list ✓ · dot pattern on landing ✓

### 🔴 Pipeline page CRASHES
/pipeline hits an error boundary: "Something went wrong — An unexpected error occurred. If this keeps happening, please contact support. ref: 1927680394" with a green "Try again" button. Hard error on a main nav route. Reproduced after FAB-removal commit 4f1e98c (unconfirmed if related; needs a stack trace).

### 🟠 Green accents clash with blue/cyan palette
"Add Candidate" button, "All" active filter pill, pricing CTA button, "Try again" button, and the floating "Scout" AI FAB are all GREEN. Conduit's header/hero/icons are blue/cyan (D2C). The green reads off-brand. NOTE: this may be a deliberate per-app accent (throughput=purple, conduit=green, r8=orange) — flag for user decision, don't change unilaterally.

### 🟡 Sidebar link announces "Conduit Conduit"
Logo alt + wordmark both announce (same a11y redundancy as crm7/throughput wordmarks).

### 🟡 Two "Sign in with BSuite" button colors
Top hero button is BLUE; bottom CTA-section button is CYAN/teal. Two different primary-button colors on the landing page.

## APP 5 — d.r8.crm7.app (R80.3)

### ✅ Edit Page FAB GONE ✓ · swirl logo ✓ · header uncrowded ✓ · hero title dedup confirmed ✓ · dot pattern ✓ · orange accent consistent ✓

### ✅ Landing page: clean, orange accent, no dot pattern on marketing page (expected — dots are app-shell only).
### ✅ Calculator: sidebar active state readable, hero card starts with breadcrumbs (no duplicated title), calculator card has its own "R8 Calculator" h1, step progress bar clear, "FY2026/27 Award Rates" green banner appropriate.

### 🟡 Hero card feels slightly empty after title dedup
The hero now opens with breadcrumbs + description but no heading — the visual anchor moved to the calculator card below. Acceptable; monitor.

### 🟡 Footer below fold
Copyright/footer not visible in the calculator viewport (scrolls below the step progress bar).

## Cross-app consistency summary (final)

### Favicon — ✅ all 5 apps serve the swirl
d.suite / d.crm / d.conduit / d.r8 / d.ideas all return the swirl favicon (byte-identical on the 4 we shipped; crm7's own is the same mark in its original .ico encoding).

### Per-app accent colors — intentional divergence, confirm with user
| App | Accent | Status |
|-----|--------|--------|
| crm7 | blue→cyan gradient | canonical D2C |
| BSU | purple | matches |
| throughput | purple | matches |
| conduit | **GREEN** | clashes with its own blue/cyan chrome (Add Candidate, All pill, CTAs, Scout FAB) — flag for user decision |
| R80.3 | **ORANGE** | internally consistent (landing + calculator both orange) — likely deliberate |

### Chrome (header/footer) consistency
- crm7: glassy chrome (var(--bg-shell-chrome) + blur) ✓ canonical
- throughput: now matches crm7 chrome (this session) ✓
- BSU: glassy chrome ✓
- conduit / R80.3: own chrome, not yet matched to crm7's glassy shell (throughput was the pilot)

### Dot pattern
- BSU: light ✓ / dark ✓ (fixed this session)
- throughput: ✓ both (post dark-mode fix)
- crm7: ✓
- conduit / R80.3: ✓

### FAB
- Edit Page FAB: removed from crm7 + conduit + R80.3 ✓ (BSU/throughput never had it)
- AI assistant FABs (Jodie on crm7, Scout on conduit): present bottom-right, GREEN on conduit — separate affordance, keep or unify?

### Wordmark a11y redundancy (all apps)
Logo alt + wordmark both announce ("Conduit Conduit", "Throughput Throughput", "Braden Pty Ltd ×3"). Fix: empty alt on the img OR aria-hidden on the duplicate span.

## TOP REMAINING ACTIONS (for todo)
1. 🔴 conduit /pipeline crashes (error boundary, ref 1927680394) — needs stack trace + fix
2. 🟠 conduit green accents — user decision: keep per-app accent or align to D2C blue/cyan?
3. 🟠 crm7 chrome: consolidate 5× org/tenant name repetition (sidebar + header + 2 chips + user chip)
4. 🟠 crm7 Communication Center text clipped mid-word ("toda"); Financial Overview "Charge Rates" tab clipped
5. 🟡 wordmark a11y redundancy (all apps): empty alt or aria-hidden on duplicate
6. 🟡 crm7 Quick Actions 3rd button clipped at 1512px
7. 🟡 BSU content blank on first paint (Suspense/route timing)
8. 🟡 crm7 PWA install prompt fires on landing before engagement
9. 🟡 conduit two "Sign in with BSuite" button colors (blue vs cyan)

## NEXT APPS TO COVER
All 5 covered. Visual sweep complete pending fixes.
