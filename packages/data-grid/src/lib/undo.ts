/**
 * Generic undo/redo stack over batch entries. Deliberately data-agnostic
 * (`T` is typically `CellEdit[]`) so the same class backs both the grid's
 * internal Ctrl/Cmd+Z handling AND a host toolbar's Undo/Redo buttons —
 * DataGridHandle exposes `undo()`/`redo()` backed by the same instance.
 */
export interface UndoEntry<T> {
  label?: string;
  before: T;
  after: T;
}

export class UndoStack<T> {
  private undoList: UndoEntry<T>[] = [];
  private redoList: UndoEntry<T>[] = [];
  private readonly limit: number;

  constructor(limit = 200) {
    this.limit = limit;
  }

  /** Push a completed edit. Clears the redo stack — the standard editor
   * convention: once you make a new edit, the old "future" is gone. */
  push(entry: UndoEntry<T>): void {
    this.undoList.push(entry);
    if (this.undoList.length > this.limit) {
      this.undoList.shift();
    }
    this.redoList = [];
  }

  canUndo(): boolean {
    return this.undoList.length > 0;
  }

  canRedo(): boolean {
    return this.redoList.length > 0;
  }

  /** Pop the most recent entry and move it to the redo stack. The caller is
   * responsible for applying `entry.before`. Returns undefined if empty. */
  undo(): UndoEntry<T> | undefined {
    const entry = this.undoList.pop();
    if (!entry) return undefined;
    this.redoList.push(entry);
    return entry;
  }

  /** Pop the most recently undone entry and move it back to the undo stack.
   * The caller is responsible for applying `entry.after`. */
  redo(): UndoEntry<T> | undefined {
    const entry = this.redoList.pop();
    if (!entry) return undefined;
    this.undoList.push(entry);
    return entry;
  }

  /** Discard the most recently pushed entry without applying anything —
   * used when a commit's mutation callback fails and the edit never really
   * happened (see DataGrid's onError handling). */
  discardLast(): void {
    this.undoList.pop();
  }

  clear(): void {
    this.undoList = [];
    this.redoList = [];
  }

  get size(): number {
    return this.undoList.length;
  }

  get redoSize(): number {
    return this.redoList.length;
  }
}
