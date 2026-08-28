# BSuite Excellence Program Master Ledger — 2026-07-25

> Status **W** · Prompt-enhanced heavy program · loop + subagent excavation

## Method

1. Prompt-enhancer (heavy) → refined brief  
2. Brainstorm personas design  
3. Best-practice research (GTO / Fair Work / incentives) with citations  
4. Parallel deep-bug + Jodie parity lanes  
5. **Platform-wide fix pattern mining** from recent commits (ISO date, empty params, one-shot selectors, FK indexes, publishable key, custom CSS sanitize)  
6. Ship P0/P1 + UX discoverability

## Critical fixes shipped this session

| ID | Issue | Fix | Evidence |
|----|-------|-----|----------|
| C1 | `trainingFeesAnnual` silently dropped from charge-calc | Sum into `totCost`; test non-zero | `packages/charge-calc` + R80 `fromCalcResult` |
| C2 | custom_css injection without CSS risk strip | `sanitizeCustomCss` @ apply | BSU + crm7 branding-sanitize + useBranding |
| U1 | STA queue hard to find | Settings tab rename | conduit settings |
| U2 | Federal 2027 incentive drift | KAP/PHI schemes in registry | R80 fundingSchemes |
| J1 | funding tools not exportable | `src/lib/ai/index.ts` barrel | R80 |

## Prior outstanding (status)

| Item | Status |
|------|--------|
| STA 6-state parsers | BLOCKED — need live emails |
| DUPLICATE_CONSOLIDATE packages | Ledger (LocalisedDateInput, AI suite) |
| WHS edge execution | Tables live; edge still deferred |
| Sydney #1322 | Scheduled Wed runbook |
| Billing.tsx multi-app tiers | HIGH — next fix lane (excavation BUG-02) |
| Primary token drift BSU | HIGH — next fix lane |
| crm7 deep excavation | May still finalize; check audits/ |

## Persona + compliance (see linked docs)

- Design: `docs/plans/20260725-gto-persona-excellence-design-v1.00D.md`  
- Research: `docs/research/20260725-gto-compliance-ux-research-v1.00W.md`  
- Jodie parity: `docs/audits/20260725-jodie-parity-matrix-v1.00F.md`  
- Bugs: `docs/audits/20260725-*-deep-bug-excavation-v1.00W.md`

## Jodie parity headline

**FULL/PARTIAL:** CRUD, search, reports, timesheets, email, email-link, vacancy, screening, scheduling, UI builder, docs_flag_gap, funding_offset (R80 factory).  
**MISSING / weak:** full WHS workflow execution, complete Xero admin ops, every portal action, end-to-end funding claim filing, multi-step STA confirm for all states.

## Next P0/P1 queue (recommended)

1. BSU Billing.tsx filter tiers to current app only  
2. Align `--color-primary` / `--primary` tokens  
3. Wire `createFundingTools` into crm7 Jodie registry when R80 embedded  
4. Host capacity assessment gate before place (GTO Std 1.3)  
5. Funding scheme effective-date field for 2027 KAP amount change  
6. Continue crm7 deep-bug list when audit file lands  

## Platform-wide patterns learned

| Fix class | Sweep |
|-----------|-------|
| LocalisedDateInput ISO blur | All 6 apps done |
| Empty report params | Form + edge done |
| Free-text entity IDs | EntitySelectors |
| FK indexes | CI gate |
| ANON → PUBLISHABLE | Edge fns |
| custom_css sanitize | BSU+crm7 (mirror remaining apps if they inject CSS) |
| trainingFees in engine | charge-calc done |

## Verifier

- charge-calc tests green (49+)  
- branding-sanitize 32 tests green  
- fundingSchemes 16 tests green  
- Development commits pushed

## Go-loop 2026-07-25 evening
- Billing prices + Stripe key map
- Primary token align
- Invoice $0/orphan, funding budget on paid
- Payroll FY dynamic
- STA confirm atomic RPC


## Excellence close-out (2026-07-25 evening)

Plan: `docs/00-roadmap/20260725-excellence-closeout-implementation-plan-v1.00F.md`

- Host capacity + leave/FO Jodie: SHIPPED (crm7#1207)
- Enterprise admin Jodie tools: this close-out
- KAP amount windows: this close-out
- @bsuite/ui sanitizeCustomCss publish 1.0.1: this close-out
- STA proven / Sydney cutover: still blocked/operator
