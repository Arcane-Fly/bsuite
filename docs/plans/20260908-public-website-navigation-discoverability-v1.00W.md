---
kind: record
authority: none
owner: bsuite
---

# One public BSuite website — navigation and discoverability

## Intent and scope
Braden and all five sibling app landing sites should feel like one website: consistent public navigation, reciprocal links, clear current product context and coherent SEO/AEO/GEO. This is separate from merely having a signed-in app switcher. Get Muscles is excluded.

Six apps: braden, business-suite-unified, crm7, conduit, R80.4 and throughput. Canonical registry packages/nav-core/src/apps.ts currently maps www.braden.com.au, suite.crm7.app, crm.crm7.app, conduit.crm7.app, r8.crm7.app and ideas.crm7.app. Execution must verify live domains and public-route mappings.

## Historical task reconciliation

The exact Claude Code task reportedly assigned on 7 September has not been recovered. Bounded read-only search covered visible user/assistant text in the BSuite Claude project sessions, nearby home/.claude project sessions (6–8 September), ~/.claude/history.jsonl and the BSuite VSCode workspace chat store. This is a provenance gap, not absence of the requirement. The operator restated it on 8 September. A separate 6 September platform-vision handoff explicitly mentions interlinked landings in docs/audits/20260905-accountability-evidence-record-v1.00W.md (ack58018e0d; tracker A34–A36). It is corroboration, not the identity or completion of yesterday's Claude task. Preserve any implementation discovered during execution.

## Existing implementation and limits
There is shared nav-core app metadata, Braden Navigation/AppSwitcher, Braden appList, and sibling links in BSU MarketingHome. Header/footer code remains separate in sampled apps. Braden Footer uses buttons for several app routes, including a legacy route alias requiring inspection. BSU footer test's domain predicate covers only crm/r8/conduit. These source facts motivate the full consumer matrix; this intake does not claim a deployed six-app UX test or that every link is broken.

## Work and dependencies
- [[P1][public website] One consistent interlinked navigation across all six BSuite landing sites](https://github.com/GaryOcean428/bsuite/issues/3224) — discrete kickoff prompt kept with the remediation queue, not in this repository.
- [[P1][SEO/AEO/GEO] Complete measurable search and answer-engine discoverability across BSuite public landings](https://github.com/GaryOcean428/bsuite/issues/3225) — discrete kickoff prompt kept with the remediation queue, not in this repository.

Existing Braden Search Console tasks [#607](https://github.com/GaryOcean428/braden/issues/607), [#608](https://github.com/GaryOcean428/braden/issues/608), [#609](https://github.com/GaryOcean428/braden/issues/609) retain their ownership. The shared public navigation issue provides the six-by-six directed link matrix (30 sibling destinations). Discovery reuses that matrix, extends content and per-app crawl/metadata/answer coverage, and coordinates canonical decisions without duplicate writers. Missing app landing pages stay explicit required work.

## Acceptance and delivery
Consistent shared public header/footer, meaningful reciprocal anchor links, stable public routes independent of signed-in dashboard selection, accessible responsive navigation, correct branded context, deliberate public-browse versus authenticated-launch actions. Every item and SEO/content control is visually editable with permissions, version/preview/publication/rollback, executable workflow logs, error recovery and consumer propagation.

The retained prompts contain full contract v2: signed feature→development PR→exact deployed development UX→production PR→exact production UX across affected standalone apps/packages→ops-ship-all-apps→ops-ship-close-out→independent DoD. All 30 directions and six-app discovery outcomes need evidence. Google/Bing results are asynchronous and never inferred from deployment/submission. The current SMS task is preserved.

## Prompt-enhancer: blindspots and research
Do not conflate private app navigation with crawlable public site links, brand consistency with identical product content, a reciprocal footer subset with all apps, initial HTML with rendered output, historic completion claims with live deployment, or AI-search eligibility with a guaranteed citation. Reuse the existing registry and builders. Do not prescribe an unsupported llms.txt shortcut or fabricate marketing claims.

Primary references read 8 September 2026: [Google AI-search optimization](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [Bing Webmaster guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a), [Google Page indexing](https://support.google.com/webmasters/answer/7440203). Bing direct extraction was limited; the executor must read the full current page before relying on its detailed controls.

## Skills, tools and paired review
Use agent-run-master → agent-skl-find and the exact canonical named skills/paired agents in each kickoff. Applicable lenses include bsuite-fix-the-class-not-the-page, bsuite-shared-ui-rollouts, bsuite-brand-system, check-dry-one-shot, check-docs-vs-code, research-best-practice, browser-live-chrome, test-verify-before-completion. Existing docs/plans/20260814-nav-route-remediation-v1.00D.md and docs/recovered/20260226-prerender-seo-marketing-plan-v1.0.0-v1.00F.md are baselines to improve, not proof of completion.

## Refined execution prompt
Recover prior work, refresh live issues/source and then execute the linked discrete prompts against all six apps. Preserve the current coordinator model and other lane ownership; use bounded Sonnet workers and Astra escalation where justified. Record criterion evidence and improve canonical docs in the same release. Intake is complete when tasks and prompts are linked and checked; the website and discovery fixes remain outstanding until independently verified.
