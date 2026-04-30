import { describe, it, expect } from 'vitest';
import { toJson, toJsonBlob } from './index.js';

describe('toJson', () => {
  it('pretty-prints by default with 2-space indent', () => {
    const out = toJson({ a: 1, b: 2 });
    expect(out).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it('produces compact output when pretty=false', () => {
    expect(toJson({ a: 1, b: 2 }, { pretty: false })).toBe('{"a":1,"b":2}');
  });

  it('handles BigInt by coercing to string', () => {
    const out = toJson({ big: 9007199254740993n }, { pretty: false });
    expect(out).toBe('{"big":"9007199254740993"}');
  });

  it('serialises arrays', () => {
    expect(toJson([1, 2, 3], { pretty: false })).toBe('[1,2,3]');
  });

  it('serialises null', () => {
    expect(toJson(null, { pretty: false })).toBe('null');
  });
});

describe('toJsonBlob', () => {
  it('returns a Blob with json MIME type', () => {
    const blob = toJsonBlob({ hello: 'world' });
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);
  });
});
