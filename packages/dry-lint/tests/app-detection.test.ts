import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

import { detectAppFromPath } from '../src/app-detection.js';

describe('detectAppFromPath', () => {
  it.each([
    [resolve('/repo/crm7/src/lib/x.ts'), 'crm7'],
    [resolve('/repo/business-suite-unified/src/pages/y.tsx'), 'bsu'],
    [resolve('/repo/conduit/src/app/page.tsx'), 'conduit'],
    [resolve('/repo/braden/src/lib/leads.ts'), 'braden'],
    [resolve('/repo/throughput/src/lib/ideas.ts'), 'throughput'],
    [resolve('/repo/R80.3/src/services/x.ts'), 'r80'],
  ])('detects %s -> %s', (path, expected) => {
    expect(detectAppFromPath(path)).toBe(expected);
  });

  it('returns undefined for files outside any known app', () => {
    expect(detectAppFromPath('/repo/packages/theme/src/index.ts')).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(detectAppFromPath('')).toBeUndefined();
  });

  it('handles mixed-case path segments', () => {
    expect(detectAppFromPath('/repo/CRM7/src/x.ts')).toBe('crm7');
  });
});
