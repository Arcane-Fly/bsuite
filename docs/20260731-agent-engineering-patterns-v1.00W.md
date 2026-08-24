# Agent Engineering Patterns — AI, Refactor Tooling & Code-Level

**Status:** Working · **Relocated:** 2026-07-31

> **Relocated from `AGENTS.md` 2026-07-31** as part of the rulebook slim-down. This is the canonical detail; `AGENTS.md` keeps only the pointer.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Covers the former `AGENTS.md` § AI Implementation Standards, §11 (FF-TOOLING-PATTERNS-20260515) and §12 (FF-CODE-PATTERNS-20260517).

## AI Implementation Standards

**Applies to all projects using Vercel AI SDK (`ai`, `@ai-sdk/react`).**

These rules exist because an agent shipped broken AI code that silently disabled all tool calls. Every rule here prevents a real bug.

### SDK Usage (prevents API hallucination)

1. **Always use `DefaultChatTransport`** — never `TextStreamChatTransport` (strips tool calls, usage info, finish reasons)
2. **Always use `toUIMessageStreamResponse()`** — never `toTextStreamResponse()` or `toDataStreamResponse()` (strips structured data)
3. **Always convert messages** — call `convertToModelMessages(messages)` before passing `UIMessage[]` to `streamText()`
4. **`UIMessage` content is in `parts[]`** — never access `.content` directly. Filter for `part.type === 'text'` and read `.text`
5. **When porting between projects**, verify every import path and type against the target project's installed SDK version — do not assume API surfaces match
6. **When in doubt, check the reference implementation** — CRM7's `useAIChat.ts` and `api/ai/chat.ts` are the canonical working examples

### Production Hardening (ships with the feature)

7. **`export const maxDuration = 30`** on all Vercel edge AI routes — default 10s is too short for streaming
8. **Rate limiting is mandatory** on all AI endpoints — wire `AI_CONFIG.rateLimits` into the route, return 429 with `Retry-After`
9. **Config must be wired** — if you define config (rate limits, quotas, feature flags), it must be consumed. Dead config is a bug.

### Verification Checklist (before marking AI work complete)

10. **TypeScript compiles** — run `pnpm typecheck` on the project
11. **Tool calls work** — verify transport + response method support tools
12. **Rate limiting returns 429** — verify the limiter is imported and called
13. **JSDoc matches code** — if docs say one method, code must use that same method

---

## 11. Multi-File Refactor Tooling Patterns (FF-TOOLING-PATTERNS-20260515)

**Source:** Pattern banking across 7 verified rotations (bsuite#981 / #983 / #990 / #993 / #1002 / #1006 / #1009). Adopted 2026-05-15 as Frozen Fact `FF-TOOLING-PATTERNS-20260515`. Complements §9 (Self-Validation), §1 (Anti-Laziness), and the "pnpm Lockfile Generation" rules above.

### Why this rule exists

Multi-file refactors fall into two operational classes that need different tooling — picking the wrong one wastes a CI round or, worse, produces a PR that fails for predictable reasons. This section banks two patterns proven across recent rotations so the next agent doesn't re-derive them. Both patterns operate **outside the bsuite parent tree** to avoid the workspace-lockfile path-poisoning trap documented under "pnpm Lockfile Generation" above.

### Pattern A — GitHub Contents API multi-file source-only refactor

**When to use:**

- Pure source edits where ESLint/tsc don't see broader context per file, e.g. attribute additions (`aria-hidden="true"` decorative-icon sweeps), import-name swaps (`heroicons` → `lucide-react`), `eslint-disable-next-line` annotations, single-line code mods, doc string updates.
- The build surface is unchanged: no `package.json` edits, no new deps, no test additions, no type signatures touched.
- CI + Vercel preview are an acceptable verification surface for what you cannot run locally.

**Tooling:**

- Read existing file SHAs + content via `mcp__github__get_file_contents` (or `gh api repos/GaryOcean428/<repo>/contents/<path>?ref=<branch>` if you have shell access).
- Write atomically via `mcp__github__create_or_update_file` (single file) or `mcp__github__push_files` (multi-file single commit) — see [REST API endpoints for repository contents](https://docs.github.com/en/rest/repos/contents).
- For new branches, `mcp__github__create_branch` accepts a base SHA from the target branch HEAD.
- Verification is post-push: Vercel preview Ready + each CI job green is the §9.2 visual-equivalence (UI changes) or §9.1 output-equivalence (build/test diff is empty) target — name them explicitly in the PR's `## Evidence` block.

**Precedents:** bsuite#981 (heroicons → lucide swap across 4 files), bsuite#983 (sibling sweep), bsuite#990 (crm7 anon-view port — 1 migration + 1 consumer edit), bsuite#1003 (braden A11Y aria-hidden — 11 sites / 2 files), bsuite#1010 (conduit TESTS — 3 new files via push_files atomic commit).

**Limits:**

- Cannot run `pnpm typecheck` / `pnpm lint` / `pnpm test` before push — CI is the truth surface.
- Each `create_or_update_file` call is a separate commit unless wrapped in `push_files`. Prefer `push_files` for atomicity when changing 2+ files.
- GitHub Contents API enforces a 1MB-per-file size limit; for larger files (rare in source) fall back to Pattern B.

### Pattern B — Local-clone-in-`/tmp` + pnpm install + verify-then-push

**When to use:**

- Changes touch type-system surface (new function signatures, generic parameters, return-type narrowing).
- Dependency bumps (`package.json` changes need lockfile regen).
- ESLint sees cross-file context (new exports, removed identifiers, dead-code detection).
- Tests are added, modified, or need to run to prove behaviour (`pnpm test`).
- Vercel preview alone is insufficient — local proof the build is green required before the PR opens.

**Tooling:**

```bash
gh repo clone GaryOcean428/<repo> /tmp/<workdir>
cd /tmp/<workdir>
git fetch origin development && git checkout -B <topic>/<slug> origin/development
pnpm install --frozen-lockfile --ignore-scripts
# edit files
pnpm typecheck && pnpm lint && pnpm test    # must all pass before commit
git add <files>
git commit -m "type(scope): description"
git push -u origin <topic>/<slug>
```

- `--frozen-lockfile` enforces the existing lockfile contract; mismatches surface immediately. See pnpm CLI reference: <https://pnpm.io/cli/install>.
- `--ignore-scripts` skips lifecycle scripts (speeds install; avoids accidental local builds during install).
- pnpm's content-addressable store means a second sibling clone reuses cached entries — installs are typically <10s after the first.

**CRITICAL — never run `pnpm install` inside the bsuite parent tree.** The parent's `pnpm-workspace.yaml` would embed `..` paths into the consumer lockfile, breaking Vercel with `ERR_PNPM_OUTDATED_LOCKFILE` (per "pnpm Lockfile Generation" above). `/tmp` is outside the bsuite tree.

**Precedents:** bsuite#993 (R80.3 dormant-lint + audit-scan across 5 app repos in `/tmp`), bsuite#1006 (crm7 edge-fn fix with vitest verification), bsuite#1009 (conduit 76-test expansion verified via `pnpm test` / `pnpm typecheck` / `pnpm eslint` before push).

**Limits:**

- Disk + network cost for the clone (typically 1-3s shallow clone + 6-10s pnpm install). Negligible for any non-trivial refactor.
- Working tree under `/tmp` is reclaimed between sessions by the harness — anything not committed + pushed before session end is lost.

### How to choose

| Question | If yes → use |
|---|---|
| Changing imports, types, function signatures, or test files? | Pattern B |
| Need to run `pnpm test` / `pnpm typecheck` / `pnpm lint` to prove the change works? | Pattern B |
| Single-attribute add (e.g. `aria-hidden`), single-line `eslint-disable`, or import-name rename? | Pattern A |
| Only failure mode is a UI/runtime regression Vercel preview will surface? | Pattern A |
| Touching `package.json` / `pnpm-lock.yaml` / `vercel.json`? | Pattern B (always — these need install/build verification) |

### Anti-patterns (banned)

- ❌ Pattern A for type-system changes — typescript errors won't surface until CI, wasting a feedback round.
- ❌ Pattern B from inside the bsuite parent tree (lockfile path-poisoning — see "pnpm Lockfile Generation" rules above).
- ❌ Hand-crafting `git diff` payloads for the Contents API — use `mcp__github__push_files`, it handles SHAs correctly.
- ❌ Skipping the §9 validation evidence in the PR body just because the pattern was Pattern A — Vercel preview Ready + CI green IS the evidence, name it explicitly in the PR's `## Evidence` block.

### Cross-references

- §1 Anti-Laziness: pick the pattern that yields a green-on-arrival PR; "I'll let CI tell me" when local verify was possible is a deferral.
- §9 Self-Validation: Pattern B is the natural fit for §9.1 output-equivalence; Pattern A relies on Vercel preview + CI as the §9.2 verification surface (must be named explicitly).
- §10 Dashboard Update Protocol: dashboard data updates use Pattern A (the `refresh-data.py` + `inline-data.sh` contract is the verification, not `pnpm test`).
- "pnpm Lockfile Generation" (above): the isolated-tmp rule both patterns reuse — Pattern A by avoiding install entirely, Pattern B by cloning outside the bsuite tree.

---

*Frozen Fact: `FF-TOOLING-PATTERNS-20260515`. Adopted 2026-05-15 by claude-loop DOCS rotation (tracker bsuite#1012) after 4 rotations of cross-rotation §9.3 carry-forward (bsuite#993 / #1002 / #1006 / #1009). Primary-source citations: pnpm CLI docs (<https://pnpm.io/cli/install>), GitHub REST API Contents reference (<https://docs.github.com/en/rest/repos/contents>), GitHub MCP server (<https://github.com/github/github-mcp-server>).*

---

## 12. Reusable Code-Level Patterns (FF-CODE-PATTERNS-20260517)

**Source:** Pattern banking for **code-level** gotchas surfaced by rotations — distinct from §11 which covers sandbox/tooling workflow. Adopted 2026-05-17 as Frozen Fact `FF-CODE-PATTERNS-20260517` after the §11.1 carry-forward chain (bsuite#1052 §9.3 #3 → bsuite#1057 §9.3 #2 → bsuite#1061 / bsuite#1062 DOCS rotation).

### Why this rule exists

§11 covers **how to push a change** (Contents API vs `/tmp` clone). This section covers **what to write inside the change** when a specific code-level construct has a known footgun that costs >15 min to figure out. Bank one entry per surfaced gotcha so the next agent can copy-paste-fix instead of re-discovering empirically.

### Pattern 1 — Vitest mock-factory `new`-forwarding

**Surfaced by:** [R80.3#258](https://github.com/GaryOcean428/R80.3/pull/258) test authoring for `pdfExportService` ([bsuite#1057](https://github.com/GaryOcean428/bsuite/issues/1057) TESTS rotation key finding #1).

**Symptom:** First run of a new vitest spec throws `TypeError: () => {...} is not a constructor` against the line that does `new SomeCtor()` inside the SUT — even though the mock factory looks correct at a glance.

**Why it happens:** When a service uses `new ImportedCtor()` and you mock the module with `vi.mock('imported-pkg', () => ({ default: vi.fn(() => instance) }))`, `vi.fn` forwards the `new` call to the inner implementation. **Arrow functions are not constructible** ([MDN — Arrow function expressions § Cannot be used as constructors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#cannot_be_used_as_constructors)), so the arrow you passed to `vi.fn` blows up the moment the SUT invokes `new`. Bites any service that uses a `new`-style constructor on a dynamically-imported package: `jspdf`, `xlsx`, `pdfkit`, `mailgun.js`, `pino`, `mongodb.MongoClient`, `Bull`, etc.

**Wrong:**

```ts
import { vi } from 'vitest';

vi.mock('jspdf', () => {
  const doc = { addPage: vi.fn(), text: vi.fn(), save: vi.fn() };
  return {
    default: vi.fn(() => doc), // ❌ arrow — `new jsPDF()` throws TypeError
  };
});
```

**Right (function declaration — constructible via `new`):**

```ts
import { vi } from 'vitest';

vi.mock('jspdf', () => {
  const doc = {
    addPage: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    internal: { pageSize: { getHeight: () => 297, getWidth: () => 210 } },
  };
  function JsPDFCtor(this: unknown) {
    return doc;
  }
  return {
    default: JsPDFCtor, // ✅ real function — `new`-invocable
  };
});
```

If you also need to spy on construction call-counts, wrap the function declaration in `vi.fn(JsPDFCtor)` — that preserves `[[Construct]]` on the underlying function and the spy on the surface (`expect(jsPDFModule.default).toHaveBeenCalledTimes(1)`).

**Determinism gotcha (filename / date-derived fixtures):** services that build a filename from `new Date().toISOString().split('T')[0]` drift across CI timezones unless the test pins time:

```ts
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-05-17T09:30:00.000Z');
});
afterEach(() => {
  vi.useRealTimers();
});
```

Apply to any service that uses `new Date()`, `Date.now()`, or `performance.now()` for filename / cache-key / TTL derivation. Bank the time-pin alongside the constructor mock — the two failure modes compound otherwise.

**Cross-app candidates that import this pattern verbatim:** `crm7/src/services/importExportService.ts` + `business-suite-unified/src/lib/analyticsService.ts` (PDF surfaces named by [bsuite#1020](https://github.com/GaryOcean428/bsuite/issues/1020) §9.3 #3).

### Pattern 2 — Constant-time string comparison footguns

**Surfaced by:** [crm7#810](https://github.com/GaryOcean428/crm7/pull/810) — `consolidate timing-safe compare + fix 2 inverted call sites` (merged; [bsuite#1125](https://github.com/GaryOcean428/bsuite/issues/1125) EDGE rotation key findings). The audit found a hand-rolled `timingSafeEqual` whose loop bound leaked the secret length, plus two call sites passing the arguments in the wrong order.

**Symptom:** A helper named `timingSafeEqual` (or any secret/HMAC/token comparator) that looks constant-time at a glance but isn't — either its loop bound depends on the *candidate* length, or callers pass `(candidate, secret)` instead of `(secret, candidate)`. No test fails; the leak is a runtime side-channel only an attacker measures.

**Why it happens:**

1. **`Math.min(a.length, b.length)` as a loop bound leaks length.** The loop runs `min(secretLen, candidateLen)` iterations, so total runtime is a function of the *shorter* operand. An attacker who varies the candidate length and measures response latency sees runtime stop growing once the candidate exceeds the secret — that inflection point *is* the secret length ([CWE-208 Observable Timing Discrepancy](https://cwe.mitre.org/data/definitions/208.html): "two separate operations ... require different amounts of time to complete, in a way that is observable to an actor and reveals security-relevant information"). XOR-ing the length difference into the result fixes *correctness* for mismatched lengths but does **not** fix the timing leak — the loop count still varies.
2. **Argument order is invisible at the call site.** A `timingSafeEqual(a: string, b: string)` signature gives no hint which operand is the trusted secret. Helpers get copy-pasted; call sites drift. crm7#810 found `mapd-sync` and `report-delivery` passing the attacker-controlled token *first*, so the loop iterated over an attacker-controlled length.

**Wrong** (loops over `min` length; opaque parameter names):

```ts
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const len = Math.min(aBytes.length, bBytes.length); // ❌ runtime leaks min length
  let result = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
```

**Right** (loop count fixed by the secret; ordering contract encoded in parameter names):

```ts
/**
 * Ordering contract (REQUIRED): timingSafeEqual(SECRET, CANDIDATE)
 * - First arg MUST be the trusted secret (cron secret, service-role key, signing secret).
 * - Second arg MUST be the attacker-controlled candidate (Bearer token, header value).
 * The loop always iterates `secret.length` times so candidate length cannot be inferred.
 */
export function timingSafeEqual(secret: string, candidate: string): boolean {
  const secretBytes = new TextEncoder().encode(secret);
  const candidateBytes = new TextEncoder().encode(candidate);
  let result = secretBytes.length ^ candidateBytes.length;
  for (let i = 0; i < secretBytes.length; i++) {
    result |= secretBytes[i] ^ (candidateBytes[i] ?? 0); // ✅ fixed iteration count
  }
  return result === 0;
}
```

The `?? 0` guards the out-of-bounds read when the candidate is shorter than the secret — `candidateBytes[i]` would otherwise be `undefined`, coerce to `NaN` under `^`, and break the comparison. The runtime stays bound to `secret.length` regardless of candidate length. (Where the runtime is Node rather than Deno, prefer the platform `crypto.timingSafeEqual` — note its [own docs](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) caveat that it does not make the *surrounding* code timing-safe.)

**Two non-negotiables when banking a timing-safe comparator:**

- **Encode the ordering contract in parameter names** (`secret`, `candidate`) and the JSDoc — not in a comment 50 lines away. The contract has to be visible at every import site, because that is the only place the inversion bug is catchable by review.
- **Add an iteration-count invariant test**, not just correctness tests. Correctness tests (equal → true, unequal → false) pass for *both* the wrong and right versions. The regression-catching test asserts that iteration count does **not** scale with candidate length for a fixed secret — that is the test that fails the moment someone reintroduces a `for (i < candidate.length)` loop.

**Cross-app candidates that need the same audit:** `business-suite-unified/supabase/functions/_shared/cors.ts` ships its own inline `timingSafeEqual`; `crm7/supabase/functions/_shared/xero-webhook-sig.ts` does an HMAC compare. Both are sibling-consolidation candidates named in bsuite#1125's scoped-out follow-ups — verify each uses the fixed-loop shape and `(SECRET, CANDIDATE)` order.

### Pattern 3 — Supabase `setSession()` → `getSession()` Propagation Race

**Surfaced by:** Production incident 2026-05-20T02:42:26Z — BSU OAuth Server audit log confirmed a successful `oauth_provider_authorization_code` exchange for CRM7 client `30f76744-...`, but all downstream PostgREST/RPC/Realtime queries fired 401/403 on the immediately following page. Root cause: supabase-js's in-memory session state had not propagated by the time the navigation target mounted. Hotfix: [crm7#821](https://github.com/GaryOcean428/crm7/pull/821). Applied uniformly to all 5 BS OAuth client apps ([R80.3#270](https://github.com/GaryOcean428/R80.3/pull/270), [conduit#277](https://github.com/GaryOcean428/conduit/pull/277), [braden#293](https://github.com/GaryOcean428/braden/pull/293), [throughput#181](https://github.com/GaryOcean428/throughput/pull/181)). Bsuite submodule bump: [bsuite commit 7b1b531](https://github.com/GaryOcean428/bsuite/commit/7b1b5312c7c7269e2b3181c5422cacfe3769d7a9).

**Symptom:** An OAuth callback page calls `supabase.auth.setSession({ access_token, refresh_token })`, awaits the resolved promise, then navigates away. The destination page appears logged out: `supabase.auth.getSession()` returns `null`, auth-protected queries get `401/406` from PostgREST, and the user is bounced back to the login screen — even though the OAuth exchange succeeded and the tokens are valid.

**Why it happens:**

1. **`setSession()` resolves before in-memory state is observable by `getSession()`.** `setSession` validates the tokens, writes them to the configured storage adapter (localStorage in browser contexts), and enqueues an internal state-change notification. The promise resolves at write time, but supabase-js's subscriber notification happens asynchronously — in the next microtask batch. A `getSession()` call that races in *before* that batch completes sees the prior (null) in-memory state, not the freshly written one.

2. **`noopLock` prevents React Strict Mode deadlock at the cost of serialisation.** When supabase-js detects an environment where its internal lock would deadlock React Strict Mode's double-invocation of effects, it falls back to a `noopLock` — a lock that immediately grants every request without waiting. This removes the mutual-exclusion guarantee between concurrent auth operations, widening the race window to the full async gap between storage write and subscriber notification.

3. **Immediate navigation is the trigger.** The race only manifests when the callback page navigates synchronously after `await setSession()`. If the page stays mounted for even one event loop tick, the subscriber notification arrives and `getSession()` returns the new session. But `navigate('/dashboard')` unloads the component before that tick completes, so the receiving page starts with a stale in-memory state.

**Wrong** (navigates immediately after `setSession` resolves — races in-memory propagation):

```ts
// ❌ In src/app/auth/callback/page.tsx (or any OAuth callback)
const { error } = await supabase.auth.setSession({ access_token, refresh_token });
if (error) throw error;
router.push('/dashboard'); // ❌ getSession() on /dashboard may still return null
```

**Right** (polls until in-memory state is observably consistent, then navigates):

```ts
// ✅ In src/app/auth/callback/page.tsx (or any OAuth callback)
const { error } = await supabase.auth.setSession({ access_token, refresh_token });
if (error) throw error;

// Poll until the in-memory state matches the newly written token.
// Ceiling: 2 000 ms / interval: 50 ms — tolerable UX; exhaustion is a
// diagnostic signal (network freeze or auth regression), not normal flow.
const deadline = Date.now() + 2_000;
while (Date.now() < deadline) {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token === access_token) break;
  await new Promise(resolve => setTimeout(resolve, 50));
}

const { data: finalCheck } = await supabase.auth.getSession();
if (!finalCheck.session) {
  // Throw so the catch block can route to a recoverable "session expired" UI.
  throw new Error('setSession propagation timeout — session not observable after 2 s');
}

router.push('/dashboard'); // ✅ session is observably mounted; downstream getSession() returns it
```

**Three non-negotiables when writing or reviewing an OAuth callback:**

- **Always poll after `setSession()` before navigating.** Treat the resolved `setSession()` promise as "storage write complete", not "in-memory state ready". The polling loop is the bridge.
- **Bound the poll tightly and fail loudly on exhaustion.** A 2 s ceiling with 50 ms intervals is validated by the 2026-05-20 hotfix. Throwing on timeout (instead of silently continuing) routes the user to a recoverable error screen and surfaces the failure in monitoring — a silent continue produces the original logged-out symptom.
- **Co-locate the poll with every `setSession()` call, not in a shared hook.** If the poll lives in a `useEffect` or a shared service that may not execute on the callback page, the race reopens. The poll must run in the same execution unit as `setSession()`.

**Cross-app files carrying this pattern** (all fixed as of 2026-05-20 hotfix):

| App | Callback file |
|---|---|
| CRM7 | `src/pages/auth/callback.tsx` (dual-purpose: BS OAuth + Supabase native PKCE) |
| R80.3 | `src/pages/AuthCallback.tsx` |
| Conduit | `src/app/auth/callback/page.tsx` (dual-purpose) |
| Braden | `src/pages/auth/AuthCallback.tsx` |
| Throughput | `src/pages/auth/AuthCallback.tsx` |

Any new app added as a BS OAuth client must apply the same polling pattern in its callback before shipping.

### Pattern 4 — Reserved (next pattern)

When the next rotation surfaces a banking-worthy code-level pattern, replace this stub with `### Pattern 4 — <name>` and add `### Pattern 5 — Reserved (next pattern)` below it. Keep the chain alive so future agents always know where to land their entry. Distinct from §11 Pattern A/B — those are sandbox-workflow patterns; this section is code-construct patterns.

### Cross-references

- §9 Self-Validation: code-level patterns banked here are the §9.1 output-equivalence baseline-derivation tools — having the right mock means the baseline is real, not vacuous-PASS.
- §11 Multi-File Refactor Tooling Patterns: how to ship the change; §12 is what to write inside the change. The two are orthogonal — every PR uses both.

---

*Frozen Fact: `FF-CODE-PATTERNS-20260517`. Adopted 2026-05-17 by claude-loop DOCS rotation (tracker bsuite#1061, PR bsuite#1062). Pattern 2 added 2026-05-20 by claude-loop DOCS rotation (tracker bsuite#1156). Pattern 3 added 2026-05-22 by claude-code-scheduled cron fire28 — surfaced by production incident 2026-05-20T02:42:26Z; hotfix crm7#821; bsuite submodule bump commit `7b1b531`. Primary-source citations: MDN Arrow function expressions reference (<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#cannot_be_used_as_constructors>), Vitest `vi.fn` API reference (<https://vitest.dev/api/vi.html#vi-fn>), Vitest `vi.useFakeTimers` API reference (<https://vitest.dev/api/vi.html#vi-usefaketimers>), R80.3#258 commit `57e6273f` ~~`src/services/__tests__/pdfExportService.test.ts`~~ (no file of this name exists; PDF work lives under `crm7/src/lib/pdf/`); CWE-208 Observable Timing Discrepancy (<https://cwe.mitre.org/data/definitions/208.html>), Node.js `crypto.timingSafeEqual` reference (<https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b>), in-repo precedent crm7#810 commit `7b67d35` `supabase/functions/_shared/timing-safe.ts`; Supabase JS Auth `setSession` reference (<https://supabase.com/docs/reference/javascript/auth-setsession>), production incident bsuite commit `7b1b531` + crm7#821.*

---

---

