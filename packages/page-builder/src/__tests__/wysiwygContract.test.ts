import { describe, expect, it } from 'vitest';
import {
  WYSIWYG_REQUIRED_PRIMITIVES,
  WYSIWYG_SURFACE_CONTRACTS,
  assertWysiwygPrimitiveCoverage,
  getWysiwygSurfaceContract,
} from '../wysiwygContract.js';

describe('WYSIWYG surface contracts', () => {
  it('covers React Flow, TanStack Query, resizable cards, and dnd-kit across the WYSIWYG system', () => {
    expect(() => assertWysiwygPrimitiveCoverage()).not.toThrow();

    const covered = new Set(
      Object.values(WYSIWYG_SURFACE_CONTRACTS).flatMap((contract) => contract.requiredPrimitives),
    );

    for (const primitive of WYSIWYG_REQUIRED_PRIMITIVES) {
      expect(covered.has(primitive)).toBe(true);
    }
  });

  it('keeps schema relationship canvases on React Flow with TanStack Query persistence', () => {
    expect(getWysiwygSurfaceContract('schema-builder')).toMatchObject({
      ownerPackage: '@bsuite/schema-builder',
      interactionPrimitive: 'react-flow',
      persistencePrimitive: 'tanstack-query',
    });
  });

  it('keeps page canvases on resizable cards rather than dnd-kit or React Flow', () => {
    expect(getWysiwygSurfaceContract('page-builder')).toMatchObject({
      ownerPackage: '@bsuite/page-builder',
      interactionPrimitive: 'resizable-cards',
      persistencePrimitive: 'page-grid-preference-adapter',
    });
  });

  it('keeps form layout editing on dnd-kit with TanStack Query persistence', () => {
    expect(getWysiwygSurfaceContract('form-layout-builder')).toMatchObject({
      ownerPackage: 'crm7',
      interactionPrimitive: 'dnd-kit',
      persistencePrimitive: 'tanstack-query',
    });
  });
});
