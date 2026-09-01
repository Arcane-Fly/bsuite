/**
 * `useUndoRedo` — a 50-snapshot buffer.
 *
 * LIFTED FROM `crm7/src/pages/sales/pipeline-flow-inner.tsx`, where it was
 * added for red-team amendment #17 of
 * `docs/plans/20260510-universal-canvas-capability-implementation-v1.00F.md`
 * (§3.5 row 17: "Undo/redo — IN SCOPE this cycle, useUndoRedo hook, depth 50"),
 * shipped, and then never called: the Sales Pipeline that carried it renders
 * `nodesDraggable={false}`, so there was nothing to undo. It has been written
 * and waiting since May.
 *
 * TWO CORRECTIONS ON THE WAY ACROSS, both found by writing the first tests it
 * has ever had:
 *
 * 1. ONE STATE OBJECT, NOT THREE. The original held `past`, `present` and
 *    `future` as three `useState`s, and `set` read `present` from the render
 *    closure. React batches, so two `set` calls in the same tick BOTH pushed
 *    the same stale `present` onto the past — the second edit's predecessor was
 *    silently lost and undo skipped a step. One state object updated through a
 *    single functional updater cannot get this wrong, because every transition
 *    reads the value React is actually holding.
 *
 * 2. STABLE CALLBACKS. The originals were re-created every render, so any
 *    consumer that listed them in a `useCallback`/`useEffect` dependency array
 *    re-ran on every keystroke. This canvas binds them to a keyboard shortcut
 *    and to memoised drag handlers, so that mattered here.
 */

import { useCallback, useState } from 'react';

export const UNDO_STACK_LIMIT = 50;

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UndoRedoApi<T> {
  state: T;
  /** Push a new present, keeping the old one as an undo step. Clears redo. */
  set: (next: T) => void;
  /**
   * Change the present WITHOUT adding an undo step.
   *
   * This is what a drag uses between its start and its end: a pointer-move
   * emits a change per frame, and one gesture must be one undo step, not sixty.
   */
  replace: (next: T) => void;
  /**
   * Record the CURRENT present as an undo step without changing it.
   *
   * Called at the START of a drag. Checkpointing at the end instead would push
   * the second-to-last frame of the gesture, so undo would move the node back
   * by one pointer-move rather than back to where the drag began.
   */
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  /** Drop both stacks. Loading a different workflow is not an undoable edit. */
  reset: (next: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

function push<T>(stack: T[], value: T): T[] {
  const grown = [...stack, value];
  return grown.length > UNDO_STACK_LIMIT ? grown.slice(-UNDO_STACK_LIMIT) : grown;
}

export function useUndoRedo<T>(initial: T): UndoRedoApi<T> {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = useCallback((next: T): void => {
    setHistory((h) => ({ past: push(h.past, h.present), present: next, future: [] }));
  }, []);

  const replace = useCallback((next: T): void => {
    setHistory((h) => ({ ...h, present: next }));
  }, []);

  const checkpoint = useCallback((): void => {
    setHistory((h) => ({ past: push(h.past, h.present), present: h.present, future: [] }));
  }, []);

  const undo = useCallback((): void => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1] as T,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback((): void => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      return {
        past: push(h.past, h.present),
        present: h.future[0] as T,
        future: h.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((next: T): void => {
    setHistory({ past: [], present: next, future: [] });
  }, []);

  return {
    state: history.present,
    set,
    replace,
    checkpoint,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
