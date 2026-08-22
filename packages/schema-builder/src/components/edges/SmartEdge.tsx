/**
 * SmartEdge — React Flow custom edge that renders:
 *   - smoothstep path (same look as the default smoothstep edge)
 *   - crow's-foot / one / triangle markers at source + target based on
 *     `data.cardinality` (§3.6 item 2)
 *   - dashed stroke when `data.onDelete === 'SET NULL'` (§3.9 integration)
 *
 * Reference: `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`
 * §3.6 items 2 + 5.
 *
 * Each edge defines its own `<marker>` elements inline with IDs prefixed by
 * the edge `id` so multiple edges on the same canvas cannot collide on SVG
 * `<defs>` IDs.
 */

import type { CSSProperties, ReactElement } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';

import type { Cardinality, ReferentialAction } from '../../schemas.js';

export interface SmartEdgeData {
  cardinality?: Cardinality;
  onDelete?: ReferentialAction | null;
  stroke?: string;
  [key: string]: unknown;
}

type MarkerKind = 'one' | 'crow' | 'triangle';

interface MarkerAssignment {
  start?: MarkerKind;
  end?: MarkerKind;
}

function markersForCardinality(
  c: Cardinality | undefined,
): MarkerAssignment {
  switch (c) {
    case 'one_to_one':
      return { start: 'one', end: 'one' };
    case 'one_to_many':
      return { start: 'one', end: 'crow' };
    case 'many_to_many':
      return { start: 'crow', end: 'crow' };
    case 'inherits_from':
      return { end: 'triangle' };
    default:
      return { end: 'crow' };
  }
}

/**
 * Resolve the marker IDs for a given edge. Exported so tests can assert the
 * cardinality → marker mapping without mounting the full edge.
 */
export function getMarkerIdsForCardinality(
  edgeId: string,
  cardinality: Cardinality | undefined,
): { markerStartId?: string; markerEndId?: string } {
  const { start, end } = markersForCardinality(cardinality);
  return {
    markerStartId: start ? `${edgeId}-${start}-start` : undefined,
    markerEndId: end ? `${edgeId}-${end}-end` : undefined,
  };
}

/**
 * Build the edge style object. Pure so tests can assert the dashed-stroke and
 * accent-color logic without rendering.
 */
export function buildSmartEdgeStyle(
  cardinality: Cardinality | undefined,
  onDelete: ReferentialAction | null | undefined,
  override?: CSSProperties,
): CSSProperties {
  const isInherits = cardinality === 'inherits_from';
  // `--role-secondary` is a FILL token, tuned dark so light text can sit on it.
  // As a 2px stroke on the dark canvas it measured 1.78:1 — below 1.4.11's 3:1
  // for a graphical object. `--role-secondary-text` is the stroke-safe sibling
  // and measures 6.53-7.33:1 dark, 5.63-6.41:1 light.
  const defaultStroke = isInherits
    ? 'var(--role-secondary-text)'
    : 'var(--role-primary)';
  return {
    stroke: override?.stroke ?? defaultStroke,
    strokeWidth: 2,
    strokeDasharray: onDelete === 'SET NULL' ? '5 3' : undefined,
    ...override,
  };
}

function MarkerDef({
  id,
  kind,
  color,
}: {
  id: string;
  kind: MarkerKind;
  color: string;
}): ReactElement {
  const common = {
    id,
    viewBox: '0 0 12 12',
    markerWidth: 12,
    markerHeight: 12,
    refX: 10,
    refY: 6,
    orient: 'auto-start-reverse' as const,
  };

  if (kind === 'one') {
    return (
      <marker {...common}>
        <line
          x1="6"
          y1="1"
          x2="6"
          y2="11"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
      </marker>
    );
  }
  if (kind === 'crow') {
    return (
      <marker {...common}>
        <path
          d="M 10 6 L 1 1 M 10 6 L 1 6 M 10 6 L 1 11"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
      </marker>
    );
  }
  // triangle (inherits_from — UML inheritance open arrowhead)
  return (
    <marker {...common}>
      <path
        d="M 1 1 L 11 6 L 1 11 Z"
        stroke={color}
        strokeWidth="1.5"
        // Was a raw colour keyword: off-token, and in dark mode a light-filled
        // crow's-foot on a near-black canvas is the one bright speck on the
        // edge. The panel token keeps the marker reading as a hole punched in
        // the line, in whichever theme is active.
        fill="var(--role-bg-panel)"
      />
    </marker>
  );
}

/**
 * Subcomponent that renders just the `<defs>` with the appropriate markers
 * for a given cardinality. Exposed separately so tests can mount it inside a
 * plain `<svg>` without needing React Flow's edge context.
 */
export function SmartEdgeMarkers({
  edgeId,
  cardinality,
  color,
}: {
  edgeId: string;
  cardinality: Cardinality | undefined;
  color: string;
}): ReactElement {
  const { start, end } = markersForCardinality(cardinality);
  return (
    <defs>
      {start ? (
        <MarkerDef id={`${edgeId}-${start}-start`} kind={start} color={color} />
      ) : null}
      {end ? (
        <MarkerDef id={`${edgeId}-${end}-end`} kind={end} color={color} />
      ) : null}
    </defs>
  );
}

/**
 * React Flow custom edge. Reads `data.cardinality` / `data.onDelete` to pick
 * markers and stroke style.
 */
export function SmartEdge(
  props: EdgeProps & { data?: SmartEdgeData },
): ReactElement {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    data,
    style,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const resolvedStyle = buildSmartEdgeStyle(
    data?.cardinality,
    data?.onDelete ?? null,
    style,
  );
  const strokeColor =
    (resolvedStyle.stroke as string | undefined) ??
    'var(--role-primary)';
  const { markerStartId, markerEndId } = getMarkerIdsForCardinality(
    id,
    data?.cardinality,
  );

  return (
    <>
      <SmartEdgeMarkers
        edgeId={id}
        cardinality={data?.cardinality}
        color={strokeColor}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={resolvedStyle}
        markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
        markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-auto absolute rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-text-secondary shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
