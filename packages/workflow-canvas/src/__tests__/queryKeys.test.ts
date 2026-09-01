/**
 * EVERY QUERY KEY COMES FROM `hooks/queries.ts`. NONE IS WRITTEN OUT BY HAND.
 *
 * WHY THIS TEST EXISTS, IN THE PAST TENSE. The first draft of `duplicateToTenant`
 * invalidated `['workflow', 'definitions']`. The list is keyed
 * `['workflow-definitions', tenantId]`. Those two arrays match nothing in
 * common, so the invalidation was a no-op: the copy was created correctly, the
 * mutation reported success, and the workflow simply did not appear in the list
 * until the user reloaded the page.
 *
 * That is the worst shape of bug this surface can have — everything says it
 * worked, and the screen disagrees — and NOTHING can catch it at runtime.
 * `invalidateQueries` does not fail on a key that matches no query; matching
 * nothing is a legitimate outcome. A unit test on the mutation would have
 * asserted `invalidateQueries` was called, which it was, with the wrong
 * argument.
 *
 * So the rule is checked at the SOURCE, which is where it is expressible:
 * `queries.ts` already states "query keys live here and nowhere else", and this
 * makes that sentence enforceable. A hand-written key array is refused whether
 * or not it happens to be correct today, because the next edit to the factory is
 * what breaks it and a literal is invisible to that edit.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  workflowDefinitionOptions,
  workflowDefinitionsOptions,
  workflowDraftOptions,
  workflowVersionOptions,
  workflowVersionsOptions,
} from '../hooks/queries.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS = resolve(HERE, '../hooks');

/** Files that consume query keys. `queries.ts` is where they are DEFINED. */
const CONSUMERS = ['useWorkflowController.ts', 'useRealtimeSubscription.ts'];

/** Strip comments so the prose in a header cannot be read as code. */
function codeOnly(source: string): string {
  return source
    .split('\n')
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('//');
    })
    .join('\n');
}

/**
 * Lines that build a query key inline, as a plain list.
 *
 * `queryKey:` followed by `[` is the hand-written form. Every legitimate use in
 * these files passes a value derived from a factory, so it reads
 * `queryKey: someKey`. Scanned by character rather than by pattern so the
 * assertion can be on the RESULT.
 */
export function handWrittenKeyLines(source: string): string[] {
  return codeOnly(source)
    .split('\n')
    .filter((line) => {
      const at = line.indexOf('queryKey:');
      if (at === -1) return false;
      const rest = line.slice(at + 'queryKey:'.length).trimStart();
      return rest.startsWith('[');
    })
    .map((line) => line.trim());
}

describe('query keys', () => {
  it('the five factories produce five distinct first segments', () => {
    // The control. If two factories shared a first segment, prefix invalidation
    // would silently reach further than the caller intends, and the assertions
    // below would be checking a set smaller than they look.
    const segments = [
      workflowDefinitionsOptions(null, null).queryKey[0],
      workflowDefinitionOptions(null, null).queryKey[0],
      workflowVersionsOptions(null, null).queryKey[0],
      workflowVersionOptions(null, null).queryKey[0],
      workflowDraftOptions(null, null).queryKey[0],
    ];
    expect(new Set(segments).size).toBe(5);
    expect(segments).toContain('workflow-definitions');
    expect(segments).toContain('workflow-definition');
  });

  it.each(CONSUMERS)('%s writes no query key by hand', (file) => {
    // A NAMED OUTCOME — the offending lines — rather than a pattern match.
    // Operator ruling 2026-08-26. An empty list is unambiguous, and a non-empty
    // one names exactly what to fix instead of reporting "did not match".
    expect(handWrittenKeyLines(readFileSync(resolve(HOOKS, file), 'utf8'))).toEqual([]);
  });

  it.each(CONSUMERS)('%s never mentions a key segment as a bare literal', (file) => {
    const code = codeOnly(readFileSync(resolve(HOOKS, file), 'utf8'));
    for (const segment of [
      'workflow-definitions',
      'workflow-definition',
      'workflow-versions',
      'workflow-version',
      'workflow-draft',
    ]) {
      expect(code, `${file} hardcodes the '${segment}' key segment`).not.toContain(
        `'${segment}'`,
      );
    }
  });
});
