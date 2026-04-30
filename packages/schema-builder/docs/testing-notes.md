# Testing Notes — `@bsuite/schema-builder`

Operational guidance for writing and maintaining tests in this package. Add
new entries here whenever you hit a non-obvious test-infrastructure gotcha
so the next contributor (human or agent) doesn't have to re-derive the fix.

---

## Gotcha: `vitest 2.1.9` + `jsdom` strips `Error.message` on async rejection

### Symptom

A test using the ergonomic Promise-rejection matcher:

```ts
await expect(someAsyncFn()).rejects.toThrow('expected message');
```

fails with an inscrutable error:

```
TypeError: Cannot read properties of undefined (reading 'indexOf')
```

Or, when the same test is rewritten with a regex matcher:

```ts
await expect(someAsyncFn()).rejects.toThrow(/expected/);
```

the assertion reports:

```
AssertionError: expected [Function] to throw error matching /expected/ but got ''
```

### Root cause

Under this package's vitest environment (`test.environment: 'jsdom'` in
`vitest.config.ts`, plus the setupFile `src/__tests__/setup.ts` which loads
`@testing-library/jest-dom/vitest`), `Error` objects surfaced via
`Promise.reject(new Error(…))` or thrown from inside an `async` function
have their `.message` stripped to the empty string by the time vitest's
matcher inspects them. The string-form of `.rejects.toThrow(...)` then calls
`.indexOf(expected)` on that missing/empty message and throws the
`TypeError` shown above.

This is reproducible with the simplest possible case:

```ts
// fails in this package's test setup
await expect(Promise.reject(new Error('x'))).rejects.toThrow('x');
```

The underlying pure-Node service code is unaffected — running the same
function outside vitest correctly throws an `Error` with the expected
`.message`. The bug is purely in the test runtime (`jsdom` environment
combined with jest-dom's global `expect` patching).

Upstream issue tracking: this appears to be a known interaction between
`vitest@^2.1`, `jsdom`, and `@testing-library/jest-dom`'s `expect` patch.
It is **likely** resolved by the cross-project `vitest@3.x` upgrade, but
that claim is not verified against the vitest 3 changelog — treat the
workaround below as permanent until re-validated. See `docs/OUTSTANDING.md`
for the tracking entry.

### Approved workaround — explicit `.catch` + property assertion

Rewrite the failing rejection assertion to bypass vitest's broken matcher
path:

```ts
// Instead of:
//   await expect(fn()).rejects.toThrow('boom');
// do:
const caught = await fn().catch((e: unknown) => e);
expect(caught).toBeInstanceOf(Error);
expect((caught as Error).message).toBe('boom');
```

If the promise resolves instead of rejecting, `caught` is the resolved
value and `toBeInstanceOf(Error)` fails loudly — the test does not
silently pass. That is the intended behaviour.

Drop a one-line `// See top-of-file note on .rejects.toThrow workaround.`
comment at the failing assertion so the workaround is self-documenting,
and put the longer explanation once at the top of the file.

**Currently applied to:**

- `src/__tests__/fieldService.test.ts` — `getEntityFields > throws the
  Supabase error if present` and `deleteEntityField > throws if the delete
  returns an error`
- `src/__tests__/exportPng.test.ts` — `exportCanvasToPng > propagates toPng
  failures to the caller`

### What NOT to do

- ❌ Don't add `// @vitest-environment node` to the file expecting the
  matcher to work. The package's setupFile (`src/__tests__/setup.ts`)
  imports `@testing-library/jest-dom/vitest` which patches the global
  `expect` **regardless of per-file environment**, so the bug follows you
  into the node env. See the History section at the bottom of this doc.
- ❌ Don't call `vi.spyOn` on `Error.prototype.message` — masks the real
  problem and interacts badly with React Testing Library.
- ❌ Don't swallow the assertion with a bare `try/catch` that only checks
  the error was thrown — you lose the message assertion and the test
  degrades to "did it throw something?".
- ❌ Don't downgrade `jsdom` to work around this — jsdom version is pinned
  through the Vite + vitest plugin set and must match the monorepo.

---

## jest-dom matcher types for `pnpm typecheck`

`@testing-library/jest-dom`'s matcher types (`toBeInTheDocument`,
`toBeDisabled`, `toHaveTextContent`, `toBeEnabled`, etc.) augment vitest's
`Assertion` interface. vitest's `setupFiles` are runtime-only — `tsc
--noEmit` does not process them — so TypeScript needs the matcher package
surfaced by another mechanism.

The chosen mechanism in this package is the `types` array in
`tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    // ...
    "types": ["@testing-library/jest-dom", "vitest/globals"]
  }
}
```

This is the conventional idiom and keeps the typecheck config discoverable
in one place. It replaces an earlier attempt that used a side-effect
`.d.ts` file (`src/__tests__/vitest-setup-types.d.ts`) which did not
reliably augment the global `Assertion` interface because `.d.ts` files
with `import` statements become modules rather than ambient declarations.
The `.d.ts` file was deleted; do not reintroduce it.

If you add another test-only type dependency (e.g. `jest-extended`), add
it to the same `types` array rather than creating a new `.d.ts`.

---

## When the vitest upgrade happens

Once `@bsuite/schema-builder` is on `vitest@^3` (cross-project upgrade
tracked in `docs/OUTSTANDING.md`), re-run the simplest reproduction:

```ts
await expect(Promise.reject(new Error('x'))).rejects.toThrow('x');
```

If it passes under `vitest@^3` in this package's current setup (including
the `@testing-library/jest-dom/vitest` import in `setup.ts`), both
workarounds in this doc can be removed and the ergonomic `.rejects.toThrow`
pattern can be restored everywhere. Update `docs/OUTSTANDING.md` to tick
the tracking box and delete this section of the testing-notes.

---

## History

Context for future LLM agents tempted to re-try paths that have already
been ruled out.

### 2026-05-04 — first attempt: `// @vitest-environment node` directive (failed)

The first fix proposed for the three failing `.rejects.toThrow('string')`
tests was to add `// @vitest-environment node` as the first line of
`src/__tests__/fieldService.test.ts`, on the theory that the bug was
specific to the `jsdom` realm and the service tests don't actually touch
the DOM.

**It did not work.** vitest's `setupFiles` run regardless of the per-file
environment directive, and this package's `src/__tests__/setup.ts`
imports `@testing-library/jest-dom/vitest`, which monkey-patches the
global `expect` object. That patch is what corrupts the
`.rejects.toThrow(string)` matcher path, and the corruption persists into
the `node` environment because the patched `expect` is the only `expect`
the test can import. The `TypeError: Cannot read properties of undefined
(reading 'indexOf')` reproduced identically under both environments.

The manual-catch pattern described above is the only workaround tried so
far that survives the setupFile. A future alternative — conditionally
skipping the jest-dom import under the node environment — was not
attempted in this pass and would be a larger, riskier change.
