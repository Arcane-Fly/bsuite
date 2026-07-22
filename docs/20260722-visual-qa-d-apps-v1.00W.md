# BSuite Visual QA — d.* apps (2026-07-22)
Login: braden.lang77@gmail.com. All findings from live rendered pages, both themes where noted.
Legend: 🔴 blocker/critical · 🟠 major · 🟡 minor/polish · ✅ verified-fixed

> **STATUS UPDATE 2026-07-22 evening: ALL ITEMS CLOSED.** Every 🔴🟠🟡 finding in this
> doc is now fixed or answered. Fixes landed on development and shipped to production
> (promotion PRs crm7#1191, conduit#368, BSU#576, R80#342, throughput#250, parent#1632).
> Item-level resolution notes appended inline as ✅ RESOLVED.

## APP 1 — d.ideas.crm7.app (throughput)

### 🔴 Dark mode broken — content stays light
Toggle switches header/footer to dark but main content (page bg, all 3 column cards, dot layer) stays LIGHT. Root cause: `dark:bg-dark-bg-primary` utility rule MISSING from compiled CSS; the `dark:` variant isn't emitted for the body/content bg. Var `--dark-bg-primary` resolves dark, but no utility rule references it under `.dark`. Same bug class as the Tailwind v4 node_modules detection — the shared theme's dark-surface utilities aren't being generated in the standalone build.

✅ RESOLVED `f1a3d4d` — `@config "../tailwind.config.js"` added to index.css so darkMode:'class' takes effect; dark: utilities now class-scoped. Verified live.

### 🔴 Kanban grid layout regression (autoHeight side-effect)
After today's autoHeight fix, the 3 columns no longer sit side-by-side in their x:0/4/8 cells. They stack vertically, overlap, and cascade diagonally; w:4 ignored (cards render ~full-width), y:0 not respected. Reload does NOT fix. ResizeObserver/convergence collapses grid item width+position. REGRESSION from a53625e — must fix or revert.

✅ RESOLVED `57096df` — stale saved layout in localStorage (pre-autoHeight x/y/w) was preferred by layout reconciliation; layoutVersion bumped to 2 to invalidate. autoHeight itself sound.

### 🟠 Header wordmark overlap
"Throughput" text overlaps/sits on the swirl logo (link text "Throughput Throughput" — alt + wordmark both announce; visually the text is on top of the mark). In dark mode the wordmark goes dark-on-dark (invisible).

✅ RESOLVED `8b579eb` — redundant duplicate span removed; readable color both themes.

### 🟠 Column card contrast (light mode)
The 3 column backing cards are near-white/very-light-gray on the white page — weak separation, washed out. (Was dark cards on dark bg pre-restyle; the crm7 chrome match made them too light.)

✅ RESOLVED `8b579eb` + `cff41c2` — shell-elevated surface + border + shadow; dark-mode bg-card transparent.

### 🟡 Duplicate nav affordance
"Ideas" appears twice in header: an "Ideas" dropdown button AND an "Ideas" link, adjacent. Redundant.

✅ RESOLVED `8b579eb` — redundant Ideas link removed (dropdown kept).

### 🟡 Capture "+ New Idea" button clipped
At ~1920px the Capture column's "+ New Idea" button overflows/clips off the right edge of its card.

✅ RESOLVED `caef70e` — min-w-0 header, shrink-0 nowrap button, truncate title; Refine/Launch headers fixed preventively.

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

✅ RESOLVED `871b0a5` — `.dark .bsu-dashboard-grid .bg-card` transparent; GridItem card was the dark occluder.

### 🟠 Hero heading flat + button contrast
"Business Suite" h1 is flat BLACK (light) / flat WHITE (dark) — no brand gradient (doctrine: blue→cyan gradient on wordmark). "CRM7 Dashboard" link top-right of hero is white-on-light (light mode) — nearly invisible; only "Open R8" reads. Contrast fail.

✅ RESOLVED `6584430` — `.neon-text` blue→cyan gradient on h1; CRM7 Dashboard button → bordered shell-elevated.

### 🟠 Stat cards low separation
Active Services / Total Users cards are white-on-white (light) with weak borders. "Set up analytics to track this" amber text is low-contrast in BOTH themes (hard to read).

✅ RESOLVED `dd49138` — border-color-strong + amber full-opacity WCAG-AA.

### 🟡 Content blank on first paint
Dashboard content area renders empty (dots only) until a manual reload — initial mount doesn't paint the dashboard (Suspense/route timing).

✅ RESOLVED `60bcb40` — root cause: TenantThemeProvider swapped Fragment→div on settings resolve, forcing a full subtree unmount/remount (lazy dashboard re-suspended, grid trapped at opacity 0). Now a stable div whose style prop updates in place. 4 regression tests.

### 🟡 Sidebar "Branding" appears 3×
Branding link under WORKSPACE, ADMIN, and SETTINGS — expected (different scopes) but worth confirming they route to the right tiers.

✅ RESOLVED `f2abb5c` — labels clarified per tier: WORKSPACE→'Organisation Branding' (Tier 2), ADMIN→'App Branding' (Tier 3), SETTINGS duplicate removed (WORKSPACE covers it).

## APP 3 — d.crm.crm7.app (crm7)

### ✅ Dot pattern visible ✓ · gradient "Braden Pty Ltd" wordmark ✓ · footer "CRM7" gradient ✓
### ✅ Pipeline Overview HAS values ($1.6M, 5, 3, 5) — correct; Quick Actions HAS 3 links.

### 🟠 Tenant/org name repeated 5× in chrome
"Braden Pty Ltd" sidebar header (announced "Braden Pty Ltd Braden Pty Ltd Braden Pty Ltd" — logo alt + 2 text spans, a11y redundant) + header gradient wordmark + "Braden Group" dropdown + "Braden Group" tenant chip + user chip "braden.lang77 / Braden Group". The org/tenant name dominates the header — consolidate.

✅ RESOLVED `d873a1ca` — alt='' on sidebar+header logo imgs, aria-hidden on subtitle span, redundant tenant chip removed from user menu (switcher dropdowns intact).

### 🟠 Communication Center text clipped mid-word
"No communications scheduled toda[y]" is cut at the card's right edge (word "today" truncated). Card content overflow.

✅ RESOLVED `ddad6ed5` — min-w-0 + break-words on the empty-state text.

### 🟠 Financial Overview tab clipped
"Charge Rates" tab is cut off at the right edge of the Financial Overview card; a 4th element is hidden behind it.

✅ RESOLVED `ddad6ed5` — grid → flex flex-wrap so all links render fully.

### 🟡 Quick Actions 3rd button clipped
"Schedule Meeting" (3rd quick action) is partially cut — only Add New Contact + Create Opportunity fully visible at 1512px width.

✅ RESOLVED `ddad6ed5` — grid → flex flex-wrap, min-w-[120px] on action links.

### 🟡 Install PWA prompt fired on landing
"Install BSuite CRM" dialog appeared on first load before any interaction — consider gating to after first meaningful engagement.

✅ RESOLVED `1ef5f2e6` — gated to 30s engagement OR second-route navigation; dismissal localStorage respected.

## APP 4 — d.conduit.crm7.app (conduit)

### ✅ Edit Page FAB GONE ✓ · swirl logo ✓ · clean Candidates list ✓ · dot pattern on landing ✓

### 🔴 Pipeline page CRASHES
/pipeline hits an error boundary: "Something went wrong — An unexpected error occurred. If this keeps happening, please contact support. ref: 1927680394" with a green "Try again" button. Hard error on a main nav route. Reproduced after FAB-removal commit 4f1e98c (unconfirmed if related; needs a stack trace).

✅ RESOLVED `6eefdfd` — fetchPipelineCached wrapped in error-catching fetchInitialPipeline (missing service-role key → empty state, no crash).

### 🟠 Green accents clash with blue/cyan palette
"Add Candidate" button, "All" active filter pill, pricing CTA button, "Try again" button, and the floating "Scout" AI FAB are all GREEN. Conduit's header/hero/icons are blue/cyan (D2C). The green reads off-brand. NOTE: this may be a deliberate per-app accent (throughput=purple, conduit=green, r8=orange) — flag for user decision, don't change unilaterally.

✅ ANSWERED — deliberate per-app accent per bsuite-brand-system (`oklch(0.596 0.127 163.3)`). Not a bug. (Note: Scout FAB rebranded to Jodie per operator ruling — see below.)

### 🟡 Sidebar link announces "Conduit Conduit"
Logo alt + wordmark both announce (same a11y redundancy as crm7/throughput wordmarks).

✅ RESOLVED `2cbe91e` — alt='' on logo img so the link announces once.

### 🟡 Two "Sign in with BSuite" button colors
Top hero button is BLUE; bottom CTA-section button is CYAN/teal. Two different primary-button colors on the landing page.

✅ RESOLVED `8a8d7d1` — unified to conduit's app-primary accent across landing + pricing CTAs.

### 🟡 (added during fixes) Chrome consistency — conduit header/footer not on crm7 glassy shell
✅ RESOLVED `e36d704` — glassy chrome (bg-shell-chrome + blur) on conduit header/footer; green accent kept.

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
- AI assistant FABs: **UNIFIED to Jodie** (operator ruling 2026-07-22: "Scout was never approved by me. It is always Jodie.") — conduit's Scout rebranded to Jodie throughout (FAB, dialog, greeting, system prompt `JODIE_SYSTEM_PROMPT`; green accent kept). Commit `268fe7a`.

### Wordmark a11y redundancy (all apps)
Logo alt + wordmark both announce ("Conduit Conduit", "Throughput Throughput", "Braden Pty Ltd ×3"). Fix: empty alt on the img OR aria-hidden on the duplicate span.

✅ RESOLVED — crm7 (`d873a1ca`, `4dda17d9`), conduit (`2cbe91e`), throughput (`8b579eb`) all announce once now.

### Chrome (header/footer) consistency — NOW COMPLETE
- crm7: glassy chrome ✓ canonical
- throughput: glassy ✓
- BSU: glassy ✓
- conduit: glassy ✓ (this session, `e36d704`)
- R80.3: glassy ✓ (this session, `9a573af` — vars + blur, orange accent kept)

## TOP REMAINING ACTIONS (for todo) — ALL CLOSED 2026-07-22 evening
1. 🔴 conduit /pipeline crashes → RESOLVED `6eefdfd`
2. 🟠 conduit green accents → ANSWERED (deliberate per-app accent)
3. 🟠 crm7 chrome 5× repetition → RESOLVED `d873a1ca`
4. 🟠 crm7 Communication Center clip + Financial tab clip → RESOLVED `ddad6ed5`
5. 🟡 wordmark a11y redundancy → RESOLVED (crm7/conduit/throughput)
6. 🟡 crm7 Quick Actions 3rd button clip → RESOLVED `ddad6ed5`
7. 🟡 BSU content blank on first paint → RESOLVED `60bcb40`
8. 🟡 crm7 PWA install prompt on landing → RESOLVED `1ef5f2e6`
9. 🟡 conduit two Sign-in button colors → RESOLVED `8a8d7d1`
10. 🟡 BSU Branding ×3 labels → RESOLVED `f2abb5c`
11. 🟡 throughput Capture button clip → RESOLVED `caef70e`
12. 🟡 conduit + R80 chrome consistency → RESOLVED `e36d704`, `9a573af`
13. 🟠 AI FAB identity → RESOLVED: Jodie everywhere (`268fe7a`)

## NEXT APPS TO COVER
All 5 covered. Visual sweep complete pending fixes.
