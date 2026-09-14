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
  private traversing = new WeakSet<UndoEntry<T>>();
  private readonly limit: number;

  constructor(limit = 200) {
    this.limit = limit;
  }

  /** Push an edit intent. Clears the redo stack — the standard editor
   * convention: once you make a new edit, the old "future" is gone. */
  push(entry: UndoEntry<T>): void {
    this.undoList.push(entry);
    if (this.undoList.length > this.limit) {
      this.undoList.shift();
    }
    this.redoList = [];
  }

  canUndo(): boolean {
    return this.undoList.some((entry) => !this.traversing.has(entry));
  }

  canRedo(): boolean {
    return this.redoList.some((entry) => !this.traversing.has(entry));
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

  /** Legacy synchronous removal. Async callers must use identity-based replace. */
  discardLast(): void {
    this.undoList.pop();
  }

  /** Replace this exact entry wherever it lives; unrelated newer edits survive. */
  replace(entry: UndoEntry<T>, replacement?: UndoEntry<T>): void {
    for (const list of [this.undoList, this.redoList]) {
      const index = list.indexOf(entry);
      if (index !== -1) list.splice(index, 1, ...(replacement ? [replacement] : []));
    }
  }

  /** Reserve a traversal in place until its asynchronous persistence settles. */
  begin(direction: 'undo' | 'redo'): UndoEntry<T> | undefined {
    const list = direction === 'undo' ? this.undoList : this.redoList;
    for (let index = list.length - 1; index >= 0; index--) {
      const entry = list[index];
      if (!this.traversing.has(entry)) {
        this.traversing.add(entry);
        return entry;
      }
    }
    return undefined;
  }

  /** Failed cells remain retryable on the original side; saved cells move. */
  settle(entry: UndoEntry<T>, direction: 'undo' | 'redo', saved?: UndoEntry<T>, failed?: UndoEntry<T>): void {
    const source = direction === 'undo' ? this.undoList : this.redoList;
    const target = direction === 'undo' ? this.redoList : this.undoList;
    const index = source.indexOf(entry);
    if (index === -1) return; // A new edit already invalidated this redo history.
    const wasLatest = index === source.length - 1;
    source.splice(index, 1, ...(failed ? [failed] : []));
    // Undoing an older entry while a newer edit exists cannot create a valid redo future.
    if (saved && (direction === 'redo' || wasLatest)) target.push(saved);
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
