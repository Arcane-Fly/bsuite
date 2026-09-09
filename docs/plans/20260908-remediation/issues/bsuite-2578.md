# 60 of the unearned completion markers triaged: 22 are records, 38 were not earned, and ZERO cite a gate that would fail

https://github.com/GaryOcean428/bsuite/issues/2578

Snapshot updatedAt: 2026-08-27T08:00:10Z. Open at capture; re-read live.

Four independent triage passes read **60** of the documents that wear a `-v1.00F` completion marker while citing nothing runnable. Each pass read every document in full and cross-checked candidate citations against the evidence layer.

## The headline: zero of sixty earned it

| bucket | meaning | count |
|---|---|---|
| **A** | genuinely a **record** — a dated capture, evidence log or superseded doc making no live claim | **22** |
| **B** | has a real gate, just not cited in a form the matcher sees | **0** |
| **C** | **marker not earned** — live doc with open work wearing an `F` | **38** |
| **D** | cannot tell | 0 |

**Not one document in sixty cites a gate that would fail if its claim were false.** Every near-miss was rejected as the adjacent-guard trap:

- `20260504-shadcn-init` names `reachability.mjs` and `prerender.mjs` — real gates — but its own acceptance criterion is *Playwright smoke*, and the doc itself admits no workflow runs it. Static reachability is not runtime regression.
- `20260629-bsuite-remaining-work-roadmap` names `verify-bs-oauth-session-sync.yml` verbatim — **to document that this gate passed on a false claim**, a `grep -rq` satisfied by a stray comment after the real call sites were deleted. Citing a gate while proving it doesn't work is the opposite of a holding.
- `20260728-billing-model-label-truthfulness` looked strongest: `R80.4/scripts/run-tests.mjs` runs a test asserting `!ui.includes("Standard (")`. But that assertion exists for a *later, superseding* ruling, and would fail equally on this doc's own recommended label `"Standard (Leave-Adjusted)"`. Overlapping strings, different holding.

## The cause, found twice by different methods

> these were swept into `F` by a batch rename operation that never touched the document body

Independently corroborated by the naming gate. `check-doc-naming`'s status-agreement check was **blind to two of three status formats** — it required the *label* bolded (`**Status:**`) and could not see `Status **W**` or frontmatter `status: W`. It was banked at a baseline of **0** and reported clean.

Widened (#2577), it finds **17** documents whose body contradicts their filename — fifteen wearing `F` while saying W, A or D. It agrees with this triage on specific filenames. **Two methods, one answer.**

## A structural finding worth its own line

Every `*-refined-v1.00F.md` **prompt** document fails by construction. The bar is *"the thing it describes is 100% proven production code"*. A prompt describes an intended future action — it can never satisfy that limb on its own terms, no matter how good the prompt is. Several also carry an internal `Status **D**` contradicting their own filename.

**These should never have been `F`.** That is a naming-convention gap, not a per-document failure.

## Remedies, and why they are cheap

**The 22 in bucket A** need frontmatter, nothing more:

```yaml
kind: record
authority: none
```

Several already carry a `⚠ SUPERSEDED` banner in prose — genuinely archival, just invisible to the tool's regex. One (`20260510-universal-canvas-capability`) has its banner at **line 31**, one line past the 30-line window the archival check reads. Moving it up would be enough.

`declaresItselfARecord()` then excludes them, and the unearned count falls by up to 22 with **no judgement required** — the documents already say what they are.

**The 38 in bucket C** revert to `W` (or `D`/`A` to match their own declared status). Evidenced by the document's own body in most cases.

## What this does not settle

Reverting a marker is limb **(b)**. Limb **(a)** — *is this superseded, or did it describe a non-best-practice since corrected?* — is a judgement about content that no script may make, and this triage did not make it. Where a bucket-C document is genuinely finished and simply never cited its proof, the right remedy is to **add the citation**, not to demote it.

## Meanwhile

The count is ratcheted at **67** (#2567) and may only fall, so the pile cannot grow while the judgement work happens.

*Full per-document tables with file:line evidence are in this issue's thread.*

