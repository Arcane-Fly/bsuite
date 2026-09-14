---
kind: record
authority: none
owner: bsuite
---

# [P2][a11y] jsx-a11y label-has-associated-control crashes on ESLint 10 — the form-label rule is the one gap in the new gate

https://github.com/GaryOcean428/crm7/issues/1635

Snapshot updatedAt: 2026-08-11T07:32:48Z. Open at capture; re-read live.

**Blocks the most valuable rule in the new accessibility gate (PR #1633).**

## The problem

`jsx-a11y/label-has-associated-control` **crashes the entire ESLint run**:

```
TypeError: (0 , _minimatch.default) is not a function
Occurred while linting src/components/admin/GrantsConsole.tsx:299
Rule: "jsx-a11y/label-has-associated-control"
    at traverseChildren (.../lib/util/mayContainChildComponent.js:38)
```

An ESM/CJS interop break against the `minimatch` version resolved here.

## Why it cannot be version-fixed today

- `eslint-plugin-jsx-a11y@6.10.2` is **the latest published version — there is no 7.x.**
- It declares `peerDependencies: { "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" }`.
- **crm7 runs ESLint 10.8.0.**

So the plugin does not claim to support ESLint 10 at all. This rule is simply the first place that shows.

## Why it is the expensive one to lose

It is the rule that would cover **form-label association** — the review's Tier 3.3 finding of 32 `<label>` elements against hundreds of forms. Screen-reader users cannot complete an unlabelled onboarding wizard.

Every other recommended rule is now enforced (23 at `error`, 10 at `warn`). **This is the only gap in the gate, and it is the largest surface.**

## Options, roughly in order of preference

1. **`pnpm patch` the interop.** The repo already ships a `patches/` directory, so the mechanism exists. Smallest change: fix the `minimatch` default-import in `mayContainChildComponent.js`. Verify by enabling the rule and confirming it both runs *and* reports on a known-unlabelled form.
2. **Pin `minimatch`** to a version whose export shape the plugin expects, via a pnpm override. Check the blast radius first — `minimatch` is a common transitive dependency.
3. **Upstream it.** Open an issue/PR on `jsx-a11y` for ESLint 10 support. Correct, but not a plan on its own.
4. **A targeted local rule.** This repo already maintains five bespoke ESLint rules in `eslint-rules/`, so a narrow "label must reference a control" rule is within its normal practice. Least leverage, most control.

## Verify properly whichever route is taken

**Positive-control it.** Write a fixture with a genuinely unlabelled input, confirm the rule *fires*, then fix the fixture and confirm it goes quiet. A rule that runs without crashing is not the same as a rule that works — and the crash currently masks whether it would report anything useful on this codebase at all.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: `label-has-associated-control` runs to completion across `src/**` AND is demonstrated firing on an unlabelled-input fixture
- **Cross red-team**: claude-code re-runs the full lint to confirm no other rule from the plugin has the same latent crash
- **Skills to load**: code-quality-enforcement, research-best-practice
- **Self-report on divergence**: yes

**Acceptance criteria:** the rule is enabled and enforced, its real violation count on `src/**` is recorded, and the chosen fix is documented so a dependency bump does not silently undo it.
