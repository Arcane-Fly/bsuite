export type WysiwygPrimitive = 'react-flow' | 'tanstack-query' | 'resizable-cards' | 'dnd-kit';

export type WysiwygSurfaceId =
  | 'schema-builder'
  | 'page-builder'
  | 'form-layout-builder'
  | 'custom-page-renderer';

export interface WysiwygSurfaceContract {
  id: WysiwygSurfaceId;
  ownerPackage: '@bsuite/schema-builder' | '@bsuite/page-builder' | 'crm7';
  requiredPrimitives: readonly WysiwygPrimitive[];
  interactionPrimitive: WysiwygPrimitive | 'read-only';
  persistencePrimitive: WysiwygPrimitive | 'custom-pages-read-only' | 'page-grid-preference-adapter';
}

export const WYSIWYG_REQUIRED_PRIMITIVES = [
  'react-flow',
  'tanstack-query',
  'resizable-cards',
  'dnd-kit',
] as const satisfies readonly WysiwygPrimitive[];

export const WYSIWYG_SURFACE_CONTRACTS = {
  'schema-builder': {
    id: 'schema-builder',
    ownerPackage: '@bsuite/schema-builder',
    requiredPrimitives: ['react-flow', 'tanstack-query'],
    interactionPrimitive: 'react-flow',
    persistencePrimitive: 'tanstack-query',
  },
  'page-builder': {
    id: 'page-builder',
    ownerPackage: '@bsuite/page-builder',
    requiredPrimitives: ['resizable-cards', 'tanstack-query'],
    interactionPrimitive: 'resizable-cards',
    persistencePrimitive: 'page-grid-preference-adapter',
  },
  'form-layout-builder': {
    id: 'form-layout-builder',
    ownerPackage: 'crm7',
    requiredPrimitives: ['dnd-kit', 'tanstack-query'],
    interactionPrimitive: 'dnd-kit',
    persistencePrimitive: 'tanstack-query',
  },
  'custom-page-renderer': {
    id: 'custom-page-renderer',
    ownerPackage: '@bsuite/page-builder',
    requiredPrimitives: ['tanstack-query'],
    interactionPrimitive: 'read-only',
    persistencePrimitive: 'custom-pages-read-only',
  },
} as const satisfies Record<WysiwygSurfaceId, WysiwygSurfaceContract>;

export function getWysiwygSurfaceContract(surfaceId: WysiwygSurfaceId): WysiwygSurfaceContract {
  return WYSIWYG_SURFACE_CONTRACTS[surfaceId];
}

export function assertWysiwygPrimitiveCoverage(
  contracts: Record<WysiwygSurfaceId, WysiwygSurfaceContract> = WYSIWYG_SURFACE_CONTRACTS,
): void {
  const covered = new Set<WysiwygPrimitive>();

  for (const contract of Object.values(contracts)) {
    for (const primitive of contract.requiredPrimitives) {
      covered.add(primitive);
    }
  }

  const missing = WYSIWYG_REQUIRED_PRIMITIVES.filter((primitive) => !covered.has(primitive));

  if (missing.length > 0) {
    throw new Error(`WYSIWYG primitive coverage missing: ${missing.join(', ')}`);
  }
}
