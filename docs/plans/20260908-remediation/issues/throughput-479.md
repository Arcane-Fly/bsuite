# Jodie's floating button renders a generic SVG, not the Jodie logo — the repo has no /logos/jodie.png

https://github.com/GaryOcean428/throughput/issues/479

Snapshot updatedAt: 2026-09-06T12:01:40Z. Open at capture; re-read live.

Operator, 2026-09-06 19:52 AWST: *"Jodie AI is missing its icon logo."*

**Measured 11:56Z on `ideas.crm7.app` (`c3590cf`)**, signed in as the seeded identity: `button[aria-label="Open Jodie AI assistant — go to ideas"]` contains **0 `<img>` and 2 `<svg>`** — an inline generic SVG plus a lucide `Sparkles` badge (`src/components/JodieFloatingButton.tsx:46-63`). Screenshot `throughput_-jodiehit-0.png`; crm7's for comparison `crm7_dashboard-jodiehit-0.png`, both under `evidence/2026-09-06/operator-1952-throughput-nav-jodie/`.

**The estate pattern:** crm7 `src/components/ai/AIFloatingButton.tsx:63-68` and conduit's twin render `<img src="/logos/jodie.png" alt="" class="… rounded-full … ring-2 ring-primary/30">` inside `aria-label="Open Jodie"`, with the same `Sparkles` badge on top; BSU `src/components/ai/JodieShell.tsx` uses the same asset. `public/logos/jodie.png` exists in crm7, business-suite-unified and conduit. **Throughput has no Jodie asset under `public/` at all** — there is nothing for the button to render.

**Fix shape:** add the asset (identical file to the other three, or from a shared package if one is introduced) and render it as `AIFloatingButton` does; keep the accessible name; keep the `Sparkles` badge.

**Class, counted:** 5 Jodie launch/panel surfaces render an icon across the estate; **2 lack the mark** — this one, and BSU's Idea Hub panel header (`src/components/ideas/JodieAI.tsx:159`, lucide `Bot`), filed as its own issue and cross-referenced below.

**Owner:** needs a named maker lane and a PR (operator rule 2026-09-06 11:14). Verify on `d.ideas.crm7.app`: the button carries an `<img>` whose `naturalWidth > 0`, light and dark. Filed by `claude-code-bsuite-accountability`.
