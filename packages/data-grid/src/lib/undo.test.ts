import { describe, expect, it } from 'vitest';
import { UndoStack } from './undo.js';

describe('UndoStack', () => {
  it('starts empty', () => {
    const stack = new UndoStack<number>();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
    expect(stack.size).toBe(0);
  });

  it('undo returns entries in LIFO order', () => {
    const stack = new UndoStack<string>();
    stack.push({ before: 'b1', after: 'a1' });
    stack.push({ before: 'b2', after: 'a2' });
    stack.push({ before: 'b3', after: 'a3' });

    expect(stack.undo()).toEqual({ before: 'b3', after: 'a3' });
    expect(stack.undo()).toEqual({ before: 'b2', after: 'a2' });
    expect(stack.undo()).toEqual({ before: 'b1', after: 'a1' });
    expect(stack.undo()).toBeUndefined();
  });

  it('redo replays undone entries in reverse (most-recently-undone first)', () => {
    const stack = new UndoStack<string>();
    stack.push({ before: 'b1', after: 'a1' });
    stack.push({ before: 'b2', after: 'a2' });

    stack.undo(); // undoes b2/a2
    stack.undo(); // undoes b1/a1

    expect(stack.redo()).toEqual({ before: 'b1', after: 'a1' });
    expect(stack.redo()).toEqual({ before: 'b2', after: 'a2' });
    expect(stack.redo()).toBeUndefined();
  });

  it('pushing a new edit after an undo clears the redo stack', () => {
    const stack = new UndoStack<string>();
    stack.push({ before: 'b1', after: 'a1' });
    stack.undo();
    expect(stack.canRedo()).toBe(true);

    stack.push({ before: 'b2', after: 'a2' });
    expect(stack.canRedo()).toBe(false);
    expect(stack.redo()).toBeUndefined();
  });

  it('trims the oldest entry once the limit is exceeded', () => {
    const stack = new UndoStack<number>(3);
    stack.push({ before: 0, after: 1 });
    stack.push({ before: 1, after: 2 });
    stack.push({ before: 2, after: 3 });
    stack.push({ before: 3, after: 4 }); // evicts the first push

    expect(stack.size).toBe(3);
    // Undo three times; the entry for (before:0, after:1) must be gone.
    const seen: number[] = [];
    let entry = stack.undo();
    while (entry) {
      seen.push(entry.before);
      entry = stack.undo();
    }
    expect(seen).toEqual([3, 2, 1]);
  });

  it('discardLast removes the most recent entry without affecting redo', () => {
    const stack = new UndoStack<number>();
    stack.push({ before: 0, after: 1 });
    stack.push({ before: 1, after: 2 });
    stack.discardLast();
    expect(stack.size).toBe(1);
    expect(stack.undo()).toEqual({ before: 0, after: 1 });
  });

  it('clear empties both stacks', () => {
    const stack = new UndoStack<number>();
    stack.push({ before: 0, after: 1 });
    stack.undo();
    stack.clear();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });
});
