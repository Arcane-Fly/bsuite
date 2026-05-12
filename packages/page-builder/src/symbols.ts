export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ComponentDefinitionRecord {
  id: string;
  tenantId: string | null;
  name: string;
  schemaJson: JsonObject;
  defaultConfigJson: JsonValue;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComponentInstanceRecord {
  id: string;
  pageId: string;
  definitionId: string;
  overrideConfigJson: JsonValue;
  createdAt?: string;
  updatedAt?: string;
}

export interface DetachSymbolUndoEntry {
  type: 'detach-symbol';
  pageId: string;
  definitionId: string;
  instanceId: string;
  detachedAt: string;
  restoredInstance: Pick<ComponentInstanceRecord, 'definitionId' | 'overrideConfigJson'>;
}

export interface DetachSymbolResult {
  detachedConfigJson: JsonValue;
  undoEntry: DetachSymbolUndoEntry;
}

export interface SaveAsSymbolInput {
  definitionId: string;
  instanceId: string;
  pageId: string;
  tenantId: string | null;
  name: string;
  schemaJson?: JsonObject;
  resolvedConfigJson: JsonValue;
}

export interface SaveAsSymbolResult {
  definition: ComponentDefinitionRecord;
  instance: ComponentInstanceRecord;
}

export interface GroupedSymbolLibrary {
  global: ComponentDefinitionRecord[];
  tenant: ComponentDefinitionRecord[];
}

function isPlainObject(value: unknown): value is JsonObject {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return false;
  return typeof value === 'object';
}

function cloneObjectTreePreservingArrays(value: JsonValue): JsonValue {
  if (!isPlainObject(value)) {
    return value;
  }

  const output: JsonObject = {};
  for (const key of Object.keys(value)) {
    output[key] = cloneObjectTreePreservingArrays(value[key]);
  }
  return output;
}

function deepMergeConfig(definitionDefault: JsonValue, instanceOverride: JsonValue): JsonValue {
  if (!isPlainObject(definitionDefault) || !isPlainObject(instanceOverride)) {
    return cloneObjectTreePreservingArrays(instanceOverride);
  }

  const merged: JsonObject = {};
  const keys = new Set([...Object.keys(definitionDefault), ...Object.keys(instanceOverride)]);

  for (const key of keys) {
    const hasOverride = Object.prototype.hasOwnProperty.call(instanceOverride, key);
    if (hasOverride) {
      const overrideValue = instanceOverride[key];
      const defaultValue = definitionDefault[key];
      if (isPlainObject(defaultValue) && isPlainObject(overrideValue)) {
        merged[key] = deepMergeConfig(defaultValue, overrideValue);
      } else {
        merged[key] = cloneObjectTreePreservingArrays(overrideValue);
      }
      continue;
    }

    merged[key] = cloneObjectTreePreservingArrays(definitionDefault[key]);
  }

  return merged;
}

export function resolveSymbolInstance(
  definitionDefaultConfig: JsonValue,
  instanceOverrideConfig: JsonValue | null | undefined,
): JsonValue {
  if (instanceOverrideConfig === null || instanceOverrideConfig === undefined) {
    return cloneObjectTreePreservingArrays(definitionDefaultConfig);
  }

  return deepMergeConfig(definitionDefaultConfig, instanceOverrideConfig);
}

export function createSymbolFromResolvedConfig(input: SaveAsSymbolInput): SaveAsSymbolResult {
  return {
    definition: {
      id: input.definitionId,
      tenantId: input.tenantId,
      name: input.name,
      schemaJson: (cloneObjectTreePreservingArrays(input.schemaJson ?? {}) as JsonObject),
      defaultConfigJson: cloneObjectTreePreservingArrays(input.resolvedConfigJson),
    },
    instance: {
      id: input.instanceId,
      pageId: input.pageId,
      definitionId: input.definitionId,
      overrideConfigJson: {},
    },
  };
}

export function detachSymbolInstance(input: {
  instance: ComponentInstanceRecord;
  definition: ComponentDefinitionRecord;
  detachedAt?: string;
}): DetachSymbolResult {
  const detachedConfigJson = resolveSymbolInstance(
    input.definition.defaultConfigJson,
    input.instance.overrideConfigJson,
  );

  const detachedAt = input.detachedAt ?? new Date().toISOString();

  return {
    detachedConfigJson,
    undoEntry: {
      type: 'detach-symbol',
      pageId: input.instance.pageId,
      definitionId: input.instance.definitionId,
      instanceId: input.instance.id,
      detachedAt,
      restoredInstance: {
        definitionId: input.instance.definitionId,
        overrideConfigJson: cloneObjectTreePreservingArrays(input.instance.overrideConfigJson),
      },
    },
  };
}

export function rebuildInstanceFromDetachUndo(input: {
  undoEntry: DetachSymbolUndoEntry;
  pageId?: string;
}): ComponentInstanceRecord {
  return {
    id: input.undoEntry.instanceId,
    pageId: input.pageId ?? input.undoEntry.pageId,
    definitionId: input.undoEntry.restoredInstance.definitionId,
    overrideConfigJson: cloneObjectTreePreservingArrays(input.undoEntry.restoredInstance.overrideConfigJson),
  };
}

export function groupSymbolLibraryByScope(input: {
  definitions: ReadonlyArray<ComponentDefinitionRecord>;
  tenantId: string;
}): GroupedSymbolLibrary {
  const global: ComponentDefinitionRecord[] = [];
  const tenant: ComponentDefinitionRecord[] = [];

  for (const definition of input.definitions) {
    if (definition.tenantId === null) {
      global.push(definition);
      continue;
    }

    if (definition.tenantId === input.tenantId) {
      tenant.push(definition);
    }
  }

  global.sort((left, right) => left.name.localeCompare(right.name));
  tenant.sort((left, right) => left.name.localeCompare(right.name));

  return { global, tenant };
}
