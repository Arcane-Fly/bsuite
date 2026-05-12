import { describe, expect, it } from 'vitest';
import {
  createSymbolFromResolvedConfig,
  detachSymbolInstance,
  groupSymbolLibraryByScope,
  rebuildInstanceFromDetachUndo,
  resolveSymbolInstance,
  type JsonObject,
  type JsonValue,
} from '../symbols.js';

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomJson(depth = 0): JsonValue {
  if (depth > 2) {
    return randomInt(1000);
  }

  const branch = randomInt(4);
  if (branch === 0) return randomInt(1000);
  if (branch === 1) return `v-${randomInt(1000)}`;
  if (branch === 2) {
    return [randomInt(10), randomInt(10), randomInt(10)];
  }

  const output: JsonObject = {};
  const size = 1 + randomInt(3);
  for (let index = 0; index < size; index += 1) {
    output[`k${index}`] = randomJson(depth + 1);
  }
  return output;
}

describe('resolveSymbolInstance', () => {
  it('is deterministic across repeated invocations for the same inputs', () => {
    for (let index = 0; index < 50; index += 1) {
      const defaults = randomJson() as JsonObject;
      const overrides = randomJson() as JsonObject;

      const first = resolveSymbolInstance(defaults, overrides);
      const second = resolveSymbolInstance(defaults, overrides);
      expect(second).toEqual(first);
    }
  });

  it('preserves array identity and does not merge arrays by index', () => {
    const defaultItems = [{ id: 'one' }, { id: 'two' }];
    const overrideItems = [{ id: 'override' }];

    const resolved = resolveSymbolInstance(
      {
        style: { padding: 24 },
        items: defaultItems,
      },
      {
        style: { margin: 8 },
        items: overrideItems,
      },
    ) as JsonObject;

    expect((resolved.items as JsonValue[])).toBe(overrideItems);

    const resolvedWithoutOverride = resolveSymbolInstance(
      { items: defaultItems, style: { padding: 24 } },
      { style: { margin: 8 } },
    ) as JsonObject;

    expect((resolvedWithoutOverride.items as JsonValue[])).toBe(defaultItems);
  });

  it('returns a merged object without aliasing merged object branches', () => {
    const defaults: JsonObject = { style: { tone: 'blue', spacing: { x: 1 } } };
    const overrides: JsonObject = { style: { spacing: { y: 2 } } };

    const merged = resolveSymbolInstance(defaults, overrides) as JsonObject;

    const mergedStyle = merged.style as JsonObject;
    const defaultStyle = defaults.style as JsonObject;
    const overrideStyle = overrides.style as JsonObject;

    expect(mergedStyle).not.toBe(defaultStyle);
    expect(mergedStyle).not.toBe(overrideStyle);

    (mergedStyle.spacing as JsonObject).x = 999;
    expect(((defaults.style as JsonObject).spacing as JsonObject).x).toBe(1);
    expect(((overrides.style as JsonObject).spacing as JsonObject).y).toBe(2);
  });
});

describe('symbol lifecycle helpers', () => {
  it('round-trips Save as Symbol through resolver', () => {
    const original: JsonObject = {
      type: 'navbar',
      links: [{ label: 'Home', href: '/' }],
      style: { tone: 'brand', spacing: { x: 2, y: 3 } },
    };

    const result = createSymbolFromResolvedConfig({
      definitionId: 'def-1',
      instanceId: 'inst-1',
      pageId: 'page-1',
      tenantId: 'tenant-1',
      name: 'Primary Navbar',
      schemaJson: { componentType: 'Navbar' },
      resolvedConfigJson: original,
    });

    const resolved = resolveSymbolInstance(
      result.definition.defaultConfigJson,
      result.instance.overrideConfigJson,
    );

    expect(resolved).toEqual(original);
    expect(result.instance.definitionId).toBe(result.definition.id);
  });

  it('detach creates an undo entry that can rebuild the instance row', () => {
    const detached = detachSymbolInstance({
      detachedAt: '2026-05-12T00:00:00.000Z',
      definition: {
        id: 'def-2',
        tenantId: null,
        name: 'Global CTA',
        schemaJson: {},
        defaultConfigJson: { text: 'Book now', style: { tone: 'primary' } },
      },
      instance: {
        id: 'inst-2',
        pageId: 'page-2',
        definitionId: 'def-2',
        overrideConfigJson: { text: 'Contact us' },
      },
    });

    expect(detached.detachedConfigJson).toEqual({ text: 'Contact us', style: { tone: 'primary' } });

    const rebuilt = rebuildInstanceFromDetachUndo({ undoEntry: detached.undoEntry });
    expect(rebuilt).toEqual({
      id: 'inst-2',
      pageId: 'page-2',
      definitionId: 'def-2',
      overrideConfigJson: { text: 'Contact us' },
    });
  });

  it('groups symbol library rows into tenant + global sections', () => {
    const grouped = groupSymbolLibraryByScope({
      tenantId: 'tenant-1',
      definitions: [
        {
          id: 'def-global-z',
          tenantId: null,
          name: 'Zeta',
          schemaJson: {},
          defaultConfigJson: {},
        },
        {
          id: 'def-tenant-a',
          tenantId: 'tenant-1',
          name: 'Alpha',
          schemaJson: {},
          defaultConfigJson: {},
        },
        {
          id: 'def-tenant-other',
          tenantId: 'tenant-2',
          name: 'Other',
          schemaJson: {},
          defaultConfigJson: {},
        },
      ],
    });

    expect(grouped.tenant.map((item) => item.id)).toEqual(['def-tenant-a']);
    expect(grouped.global.map((item) => item.id)).toEqual(['def-global-z']);
  });
});
