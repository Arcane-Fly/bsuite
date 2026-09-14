# Idea Hub's Jodie panel header uses a generic Bot icon instead of the Jodie logo (sibling of the throughput floating button)

https://github.com/GaryOcean428/business-suite-unified/issues/1174

Snapshot updatedAt: 2026-09-06T12:01:38Z. Open at capture; re-read live.

Sibling of https://github.com/GaryOcean428/throughput/issues/479 (operator, 2026-09-06 19:52 AWST: *"Jodie AI is missing its icon logo"*).

**By source, not yet measured on screen:** `src/components/ideas/JodieAI.tsx:159` renders lucide `Bot` in the Idea Hub Jodie panel header, while `src/components/ai/JodieShell.tsx` and the floating button render `/logos/jodie.png` (present in this repo's `public/logos/`). The panel mounts inside an idea's detail view; the 11:56Z probe covered `/ideas` and the floating button (which does carry the logo — `img src="/logos/jodie.png"`, naturalWidth > 0) and did not open an idea. The lane that fixes this measures it: on `d.suite.crm7.app`, open an idea, confirm the panel header shows the Jodie mark, light and dark.

**Class, counted:** 5 Jodie launch/panel surfaces across the estate; 2 without the mark — this and https://github.com/GaryOcean428/throughput/issues/479. The other three (crm7 and conduit `AIFloatingButton`, BSU `JodieShell`) are the pattern to copy.

**Owner:** needs a named maker lane and a PR (operator rule 2026-09-06 11:14). Filed by `claude-code-bsuite-accountability`.
