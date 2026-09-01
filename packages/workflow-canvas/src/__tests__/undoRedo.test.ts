/**
 * The 50-snapshot undo buffer, and the rule that ONE DRAG IS ONE UNDO STEP.
 *
 * The hook came from `crm7/src/pages/sales/pipeline-flow-inner.tsx`, where it
 * has never been exercised — that canvas renders `nodesDraggable={false}`, so
 * there was nothing to undo. These are the first tests it has ever had, and two
 * of them found real defects in the original: history corrupted by React
 * batching, and a drag checkpoint taken one frame too late.
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NodeChange } from '@xyflow/react';

import { UNDO_STACK_LIMIT, useUndoRedo } from '../hooks/useUndoRedo.js';
import {
  isDragEnd,
  isDragStart,
  isStructuralChange,
} from '../hooks/useWorkflowController.js';

describe('useUndoRedo', () => {
  it('starts with nothing to undo or redo', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('walks back and forward through the history', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    expect(result.current.state).toBe(2);

    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.state).toBe(1);
  });

  it('keeps every step when several edits land in ONE React batch', () => {
    // THE DEFECT THIS FOUND. The crm7 original read `present` from the render
    // closure, so two `set` calls in the same tick both pushed the SAME stale
    // value and one step vanished. Three sets in one act must leave three
    // recoverable states, not two.
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => {
      result.current.set(1);
      result.current.set(2);
      result.current.set(3);
    });
    expect(result.current.state).toBe(3);
    act(() => result.current.undo());
    expect(result.current.state).toBe(2);
    act(() => result.current.undo());
    expect(result.current.state).toBe(1);
    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
  });

  it('discards the redo future once a new edit is made', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => result.current.set(1));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.set(9));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.state).toBe(9);
  });

  it('caps the past at 50 snapshots', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => {
      for (let i = 1; i <= UNDO_STACK_LIMIT + 20; i += 1) result.current.set(i);
    });

    // Each undo needs its OWN act(): inside one, `result.current` never
    // re-renders, so `canUndo` would be stale and the loop would never stop.
    let undone = 0;
    while (result.current.canUndo && undone < 500) {
      act(() => result.current.undo());
      undone += 1;
    }
    expect(undone).toBe(UNDO_STACK_LIMIT);
  });

  it('replace() changes the present WITHOUT adding an undo step', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => result.current.replace(5));
    expect(result.current.state).toBe(5);
    expect(result.current.canUndo).toBe(false);
  });

  it('checkpoint() banks the present without changing it', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => result.current.checkpoint());
    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(true);
  });

  it('checkpoint-then-replace is one undo step back to where the drag began', () => {
    // The drag contract, end to end: bank 0, then let the gesture's frames
    // replace. Undo must return the whole gesture, not its last frame.
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => {
      result.current.checkpoint();
      result.current.replace(1);
    });
    act(() => result.current.replace(2));
    act(() => result.current.replace(3));
    expect(result.current.state).toBe(3);

    act(() => result.current.undo());
    expect(result.current.state).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('reset() drops both stacks — a different workflow is not an undoable edit', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    act(() => result.current.set(1));
    act(() => result.current.set(2));
    act(() => result.current.reset(100));
    expect(result.current.state).toBe(100);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('keeps its callbacks referentially stable across renders', () => {
    // The crm7 original re-created these every render, which re-ran any
    // memoised handler that listed them as a dependency.
    const { result, rerender } = renderHook(() => useUndoRedo(0));
    const first = result.current.set;
    const firstCheckpoint = result.current.checkpoint;
    act(() => result.current.set(1));
    rerender();
    expect(result.current.set).toBe(first);
    expect(result.current.checkpoint).toBe(firstCheckpoint);
  });

  it('undo and redo are no-ops at the ends rather than throwing', () => {
    const { result } = renderHook(() => useUndoRedo('only'));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.state).toBe('only');
  });
});

describe('the drag/edit predicates the controller composes', () => {
  it('isDragStart sees the frames emitted DURING a drag', () => {
    const mid: NodeChange[] = [
      { id: 'a', type: 'position', position: { x: 10, y: 0 }, dragging: true },
    ];
    expect(isDragStart(mid)).toBe(true);
    expect(isDragEnd(mid)).toBe(false);
  });

  it('isDragEnd sees the change that ENDS the drag', () => {
    const end: NodeChange[] = [
      { id: 'a', type: 'position', position: { x: 90, y: 0 }, dragging: false },
    ];
    expect(isDragEnd(end)).toBe(true);
    expect(isDragStart(end)).toBe(false);
  });

  it('isStructuralChange sees adds and removes', () => {
    expect(isStructuralChange([{ type: 'remove', id: 'a' }] as NodeChange[])).toBe(true);
    expect(
      isStructuralChange([
        { type: 'add', item: { id: 'b', position: { x: 0, y: 0 }, data: {} } },
      ] as NodeChange[]),
    ).toBe(true);
  });

  it('ignores selection and measurement — neither is an edit the user made', () => {
    const select: NodeChange[] = [{ id: 'a', type: 'select', selected: true }];
    const measure: NodeChange[] = [
      { id: 'a', type: 'dimensions', dimensions: { width: 220, height: 88 } },
    ];
    for (const changes of [select, measure]) {
      expect(isDragStart(changes)).toBe(false);
      expect(isDragEnd(changes)).toBe(false);
      expect(isStructuralChange(changes)).toBe(false);
    }
  });
});
