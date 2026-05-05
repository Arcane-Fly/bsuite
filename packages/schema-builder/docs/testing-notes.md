# Testing Notes — `@bsuite/schema-builder`

Operational guidance for writing and maintaining tests in this package. Add
new entries here whenever you hit a non-obvious test-infrastructure gotcha
so the next contributor (human or agent) doesn't have to re-derive the fix.

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
