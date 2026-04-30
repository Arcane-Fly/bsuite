/**
 * Shared test helpers for the schema-builder package.
 *
 * Kept separate from `setup.ts` so global test-runner setup (matcher
 * registration, cleanup hooks) stays distinct from reusable assertion
 * utilities. Import only what you need from this module — `setup.ts` is
 * loaded automatically by vitest and should not be imported directly.
 */

import { expect } from 'vitest';

/**
 * Assert that a promise rejects with an `Error` whose `.message` matches `re`.
 *
 * Workaround for vitest 2.x `.rejects.toThrow(/regex/)` returning `''` against
 * plain `Error` instances that wrap PostgREST-style error payloads. The
 * service-layer `assertNoError` helper wraps non-Error `{ error: { message } }`
 * shapes via `new Error(message)` — vitest's regex matcher path reads these
 * as empty strings, even though the thrown Error carries the correct message
 * (verified empirically with `.toBeInstanceOf(Error)` + manual `.message`
 * inspection).
 *
 * This helper uses the reliable `.toBeInstanceOf(Error)` + `.message.toMatch(re)`
 * form, and is more portable across future vitest major versions.
 *
 * @example
 *   await expectRejectsWithMessage(
 *     reorderEntityFields(client, entityId, ['a']),
 *     /insufficient_privilege/,
 *   );
 */
export async function expectRejectsWithMessage(
  p: Promise<unknown>,
  re: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await p;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toMatch(re);
}
