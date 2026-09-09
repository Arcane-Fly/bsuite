# Every surface must let a user customise typography — font, size, italic, bold, heading level — not only colours (extends D-149 / bsuite#3104)

https://github.com/GaryOcean428/bsuite/issues/3110

Snapshot updatedAt: 2026-09-06T09:13:06Z. Open at capture; re-read live.

**Operator's words** (`~/Downloads/bsuite notes (8).docx`, 06/09/2026):

> Must be able to fluidly customize all services and anything theme related. E.g. fonts, and size of font, italics, bold, heading level, or normal text. Every single surfact.

**What this adds to bsuite#3104 (D-149).** #3104 is colours, borders, cards and buttons in the theme editor and in-page customisation. This is the typography half — font family, size, weight, italic, heading level versus body — and the scope word is *every* surface, across all six apps, through the same customisation path (theme editor for the platform/tenant, in-page for the page). Related: the site editor ruling (forms-over-tables, 2026-08-30), Storybook + visual edit path (Wayne ce261594 A), packages/theme role tokens.

**Done means:** a typography token set in `@bsuite/theme` that every app consumes (count the surfaces that bypass it, state the method); the theme editor and the in-page editor expose family/size/weight/italic/heading-level with live preview and persistence; measured on `d.*` hosts in both themes with screenshots before/after on the PR; a positive control (change the body size and see it change on a page that did not opt in). Copy and defaults are revertible — the PI decides and records; nothing waits on the operator. Filed by the accountability lane; PI names the owner.
