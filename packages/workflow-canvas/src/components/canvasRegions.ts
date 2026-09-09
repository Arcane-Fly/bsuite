/**
 * Partition canvas children into reserved regions.
 *
 * Chrome used to self-position with `absolute` over a React Flow pane that is
 * `absolute inset-0`. Fit View only sees that pane; sibling overlays do not
 * shrink it. Clicks on START→END therefore hit a transparent palette column.
 *
 * The canvas now owns a grid. Chrome components tag themselves with
 * `workflowRegion` (and `data-workflow-region` on the DOM). Anything else —
 * `FocusNodeBridge`, a post-publish banner tagged as toolbar — is sorted by
 * the same tag or lands in the diagram cell (the bridge returns null).
 *
 * Fragments are flattened: crm7 wraps toolbar/palette/inspector in `<>`.
 * `Children.forEach` is shallow and would otherwise drop the nested chrome.
 */

import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { WorkflowChromeRegion } from './chromeClasses.js';

/**
 * Container width below which the palette becomes a chip row and the inspector
 * shares the remaining row rather than three full columns.
 *
 * Measured against the CANVAS box, not the viewport: a 1024 viewport with the
 * nav expanded leaves ~700px for this surface; 1220 expanded leaves ~880px;
 * 1440 expanded leaves ~1100px. 800px is the split that gives 1024 compact and
 * 1220/1440 three columns without guessing at the viewport.
 */
export const COMPACT_MAX_WIDTH_PX = 800;

export type WorkflowCanvasLayout = 'compact' | 'regions';

/** Default `regions` so chrome rendered outside the canvas (unit tests, README) stays a rail. */
export const WorkflowCanvasLayoutContext = createContext<WorkflowCanvasLayout>('regions');

export interface PartitionedChrome {
  toolbar: ReactNode[];
  palette: ReactNode[];
  inspector: ReactNode[];
  rest: ReactNode[];
}

function regionOf(child: ReactElement): WorkflowChromeRegion | null {
  const fromProp = (child.props as { 'data-workflow-region'?: unknown })['data-workflow-region'];
  if (fromProp === 'toolbar' || fromProp === 'palette' || fromProp === 'inspector') {
    return fromProp;
  }
  const type = child.type;
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    const tagged = type as { workflowRegion?: unknown };
    if (
      tagged.workflowRegion === 'toolbar' ||
      tagged.workflowRegion === 'palette' ||
      tagged.workflowRegion === 'inspector'
    ) {
      return tagged.workflowRegion;
    }
  }
  return null;
}

export function partitionWorkflowChrome(children: ReactNode): PartitionedChrome {
  const toolbar: ReactNode[] = [];
  const palette: ReactNode[] = [];
  const inspector: ReactNode[] = [];
  const rest: ReactNode[] = [];

  const visit = (node: ReactNode): void => {
    Children.forEach(node, (child) => {
      if (child == null || typeof child === 'boolean') return;
      if (!isValidElement(child)) {
        rest.push(child);
        return;
      }
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      const region = regionOf(child);
      if (region === 'toolbar') toolbar.push(child);
      else if (region === 'palette') palette.push(child);
      else if (region === 'inspector') inspector.push(child);
      else rest.push(child);
    });
  };

  visit(children);
  return { toolbar, palette, inspector, rest };
}

export function layoutFromWidth(width: number): WorkflowCanvasLayout {
  return width > 0 && width < COMPACT_MAX_WIDTH_PX ? 'compact' : 'regions';
}
