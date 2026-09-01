/**
 * Small helpers every built-in node card shares.
 *
 * `readCommon` exists because xyflow types a node's `data` as
 * `Record<string, unknown>` at the component boundary — the registry is open, so
 * the library cannot know which kind it is rendering. Reading through one
 * accessor keeps the "unknown -> string" narrowing in a single place instead of
 * scattering casts across five components, and gives a node with a corrupted
 * row a readable placeholder rather than a card that renders `undefined`.
 */

import type { WorkflowNodeCommonData } from '../types.js';

/**
 * Below this zoom a card stops drawing description text, action keys and
 * handles, and spends its pixels on the one thing legible at that scale — its
 * label. Ported from `EntityNode`'s level-of-detail bands, which were added
 * after 44 entity cards at zoom 0.5 rendered field text at 5 device pixels.
 * A 41-edge process diagram hits the same wall.
 */
export const LOD_DETAIL_VISIBLE = 0.55;

/** Narrow xyflow's `Record<string, unknown>` data to the fields every kind has. */
export function readCommon(data: unknown): {
  label: string;
  description?: string;
  laneId?: string;
} {
  const d = (data ?? {}) as Partial<WorkflowNodeCommonData>;
  return {
    // A blank label is a data defect, not a reason to render an empty box the
    // user cannot select or identify.
    label: typeof d.label === 'string' && d.label.length > 0 ? d.label : 'Untitled step',
    description: typeof d.description === 'string' ? d.description : undefined,
    laneId: typeof d.laneId === 'string' ? d.laneId : undefined,
  };
}

/**
 * The shared card shell. `dark:shadow-[var(--glow-card,none)]` matches
 * `EntityNode` — the estate's dark theme carries a glow token and a canvas card
 * that skips it reads as a different component.
 */
export function cardShellClass(selected: boolean | undefined, radius: string): string {
  return [
    'relative border bg-card shadow-md transition-all dark:shadow-[var(--glow-card,none)]',
    radius,
    selected ? 'border-primary ring-2 ring-ring' : 'border-border',
  ].join(' ');
}
