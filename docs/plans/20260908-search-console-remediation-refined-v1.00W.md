---
kind: record
authority: none
owner: bsuite
---

# Search Console intake — refined execution prompt

## Intent
Convert Braden's actual personal-Gmail Google feedback into actionable BSuite work, validated against live Google reports and current source. Get Muscles is excluded.

## Decomposition
Three bounded issues: canonical host/redirect consistency; tracking-host 4xx disposition; public-route discovery/sitemap/rendering. Discovery implementation depends on the canonical decision. Tracking investigation can run separately with its verified provider owner. Each task uses an isolated writer and independent review.

## Best-practice citations
[Google's Page indexing report](https://support.google.com/webmasters/answer/7440203): index intended canonical pages, classify legitimate exclusions, inspect specific URLs, and distinguish validation requests from actual results.

## Blindspots to counter
Do not equate www-only zero indexed with domain zero; email age/crawl date/current HTTP differ; aliases and tracking roots may be excluded correctly; no submitted rows is not proof of no sitemap discovery; initial HTML is not rendered HTML; source presence or a delivered plan label is not production evidence. Preserve auth callbacks and provider links. No private mailbox dump in issues.

## Skills and tools
Use agent-run-master, prompt-enhancer, agent-skl-find and git-github-issues for intake; dedicated implementation/research/browser/testing skills, paired review agents and complete release chain are embedded in each kickoff. Browser extension controls actual Chrome; no Gmail connector is required. Current user-selected Hermes Gemini stays selected; Sonnet workers/Astra escalation are scoped; exhausted Grok/Kimi are not automatic fallbacks.

## Refined prompt
Read the [linked intake report](../20260908-search-console-feedback-v1.00W.md) and three live issues. Refresh each report and owning source, record expected versus defective behavior, then execute each discrete kickoff through all criteria and release/ops/DoD gates. Keep asynchronous Google validation pending with an owner and date. Do not change an intentional exclusion merely to clear a warning. Add evidence to the same issue and improve canonical project documentation.

- [braden#607](https://github.com/GaryOcean428/braden/issues/607) — kickoff prompt kept with the remediation queue, not in this repository.
- [braden#608](https://github.com/GaryOcean428/braden/issues/608) — kickoff prompt kept with the remediation queue, not in this repository.
- [braden#609](https://github.com/GaryOcean428/braden/issues/609) — kickoff prompt kept with the remediation queue, not in this repository.
