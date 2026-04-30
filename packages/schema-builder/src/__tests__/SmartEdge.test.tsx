import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import {
  SmartEdgeMarkers,
  buildSmartEdgeStyle,
  getMarkerIdsForCardinality,
} from '../components/edges/SmartEdge.js';

describe('getMarkerIdsForCardinality', () => {
  it('one_to_many → `one` at start, `crow` at end', () => {
    const ids = getMarkerIdsForCardinality('e1', 'one_to_many');
    expect(ids.markerStartId).toContain('one');
    expect(ids.markerEndId).toContain('crow');
  });

  it('many_to_many → `crow` at both ends', () => {
    const ids = getMarkerIdsForCardinality('e1', 'many_to_many');
    expect(ids.markerStartId).toContain('crow');
    expect(ids.markerEndId).toContain('crow');
  });

  it('one_to_one → `one` at both ends', () => {
    const ids = getMarkerIdsForCardinality('e1', 'one_to_one');
    expect(ids.markerStartId).toContain('one');
    expect(ids.markerEndId).toContain('one');
  });

  it('inherits_from → only `triangle` at end', () => {
    const ids = getMarkerIdsForCardinality('e1', 'inherits_from');
    expect(ids.markerStartId).toBeUndefined();
    expect(ids.markerEndId).toContain('triangle');
  });

  it('prefixes marker IDs with edge ID to prevent cross-edge collisions', () => {
    const a = getMarkerIdsForCardinality('edge-a', 'one_to_many');
    const b = getMarkerIdsForCardinality('edge-b', 'one_to_many');
    expect(a.markerEndId).toContain('edge-a');
    expect(b.markerEndId).toContain('edge-b');
    expect(a.markerEndId).not.toBe(b.markerEndId);
  });
});

describe('buildSmartEdgeStyle', () => {
  it('dashed stroke (5 3) when onDelete === "SET NULL"', () => {
    const style = buildSmartEdgeStyle('one_to_many', 'SET NULL');
    expect(style.strokeDasharray).toBe('5 3');
  });

  it('no dashed stroke for other onDelete values', () => {
    expect(buildSmartEdgeStyle('one_to_many', 'CASCADE').strokeDasharray).toBeUndefined();
    expect(buildSmartEdgeStyle('one_to_many', null).strokeDasharray).toBeUndefined();
    expect(buildSmartEdgeStyle('one_to_many', undefined).strokeDasharray).toBeUndefined();
  });

  it('uses accent-secondary for inherits_from', () => {
    const style = buildSmartEdgeStyle('inherits_from', 'CASCADE');
    expect(String(style.stroke)).toContain('accent-secondary');
  });

  it('uses accent-primary for other cardinalities', () => {
    const style = buildSmartEdgeStyle('one_to_many', 'CASCADE');
    expect(String(style.stroke)).toContain('accent-primary');
  });

  it('respects override.stroke when provided', () => {
    const style = buildSmartEdgeStyle('one_to_many', 'CASCADE', { stroke: 'tomato' });
    expect(style.stroke).toBe('tomato');
  });
});

describe('SmartEdgeMarkers rendering', () => {
  it('renders 2 markers for one_to_many (one at start + crow at end)', () => {
    const { container } = render(
      <svg>
        <SmartEdgeMarkers edgeId="e1" cardinality="one_to_many" color="#3b82f6" />
      </svg>,
    );
    const markers = container.querySelectorAll('marker');
    expect(markers).toHaveLength(2);
    const ids = Array.from(markers).map((m) => m.getAttribute('id') ?? '');
    expect(ids.some((id) => id.includes('one'))).toBe(true);
    expect(ids.some((id) => id.includes('crow'))).toBe(true);
  });

  it('renders 1 marker (triangle) for inherits_from', () => {
    const { container } = render(
      <svg>
        <SmartEdgeMarkers
          edgeId="e1"
          cardinality="inherits_from"
          color="#a855f7"
        />
      </svg>,
    );
    const markers = container.querySelectorAll('marker');
    expect(markers).toHaveLength(1);
    // The triangle marker is a closed path (ends with Z).
    const trianglePath = container.querySelector('marker path');
    expect(trianglePath?.getAttribute('d')).toContain('Z');
  });

  it('renders 0 markers for undefined cardinality when falling back to crow-end', () => {
    // Fallback branch: undefined cardinality → end=crow, start=undefined → 1 marker
    const { container } = render(
      <svg>
        <SmartEdgeMarkers edgeId="e1" cardinality={undefined} color="#000" />
      </svg>,
    );
    const markers = container.querySelectorAll('marker');
    expect(markers).toHaveLength(1);
  });
});
