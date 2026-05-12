import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  SquarePen,
  LockOpen,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from './utils.js';

const INDENTATION_PX = 20;

export interface LayerPanelItem {
  id: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface LayersPanelMovePayload {
  activeId: string;
  overId: string;
  depth: number;
}

export interface LayersPanelProps {
  items: LayerPanelItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (payload: LayersPanelMovePayload) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveAsSymbol: (id: string) => void;
  onWrapInContainer: (id: string) => void;
}

function getProjectedDepth(items: LayerPanelItem[], activeId: string, overId: string, offsetX: number): number {
  const active = items.find((item) => item.id === activeId);
  if (!active) return 0;
  const overIndex = items.findIndex((item) => item.id === overId);
  if (overIndex < 0) return active.depth;
  const previous = items[overIndex - 1];
  const next = items[overIndex + 1];
  const maxDepth = previous ? previous.depth + 1 : 0;
  const minDepth = next ? next.depth : 0;
  const projected = active.depth + Math.round(offsetX / INDENTATION_PX);
  return Math.max(minDepth, Math.min(maxDepth, projected));
}

function SortableLayerRow({
  item,
  isSelected,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onSelect,
  onContextMenu,
  onToggleHidden,
  onToggleLocked,
  onToggleCollapsed,
}: {
  item: LayerPanelItem;
  isSelected: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onSelect: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onToggleCollapsed: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${item.depth * INDENTATION_PX}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-layer-row-id={item.id}
      role="treeitem"
      aria-level={item.depth + 1}
      aria-selected={isSelected}
      aria-expanded={item.hasChildren ? !item.collapsed : undefined}
      className={cn(
        'group flex h-8 items-center gap-1 rounded px-1 text-xs text-foreground',
        isSelected ? 'bg-primary/20 ring-1 ring-primary/40' : 'hover:bg-muted/60',
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapsed();
        }}
        aria-label={item.collapsed ? `Expand ${item.name}` : `Collapse ${item.name}`}
        disabled={!item.hasChildren}
      >
        {item.hasChildren ? (
          item.collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <span className="h-3 w-3" />
        )}
      </button>
      <button
        type="button"
        className="inline-flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        aria-label={`Drag ${item.name}`}
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={item.locked ? `Unlock ${item.name}` : `Lock ${item.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleLocked();
        }}
      >
        {item.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
      </button>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={item.hidden ? `Show ${item.name}` : `Hide ${item.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleHidden();
        }}
      >
        {item.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onRenameValueChange(event.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onRenameCommit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              onRenameCancel();
            }
          }}
          className="h-6 min-w-0 flex-1 rounded border border-border bg-card px-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Rename ${item.name}`}
        />
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onStartRename();
          }}
          className={cn(
            'min-w-0 flex-1 truncate text-left text-xs',
            item.hidden && 'text-muted-foreground line-through',
          )}
          title={item.name}
          aria-label={`Select ${item.name}`}
        >
          {item.name}
        </button>
      )}
      {!isRenaming && (
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onStartRename();
          }}
          aria-label={`Rename ${item.name}`}
        >
          <SquarePen className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function LayersPanel({
  items,
  selectedId,
  onSelect,
  onMove,
  onToggleHidden,
  onToggleLocked,
  onToggleCollapsed,
  onRename,
  onDuplicate,
  onDelete,
  onSaveAsSymbol,
  onWrapInContainer,
}: LayersPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projectedDepth, setProjectedDepth] = useState<number>(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = items.length > 100;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 8,
  });

  const selectedIndex = useMemo(
    () => (selectedId ? items.findIndex((item) => item.id === selectedId) : -1),
    [items, selectedId],
  );

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', close);
    };
  }, []);

  const visibleItems = shouldVirtualize
    ? virtualizer.getVirtualItems().map((virtualRow) => ({ item: items[virtualRow.index], virtualRow }))
    : items.map((item, index) => ({ item, virtualRow: { index, start: index * 32, size: 32 } }));

  const commitRename = () => {
    if (!renamingId) return;
    const next = renameValue.trim();
    if (next) onRename(renamingId, next);
    setRenamingId(null);
  };

  const startRename = (id: string) => {
    const current = items.find((item) => item.id === id);
    setRenamingId(id);
    setRenameValue(current?.name ?? '');
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const overId = event.over?.id;
    if (!activeId || typeof overId !== 'string') return;
    setProjectedDepth(getProjectedDepth(items, activeId, overId, event.delta.x));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (!activeId || typeof overId !== 'string') {
      setActiveId(null);
      return;
    }
    onMove({ activeId, overId, depth: projectedDepth });
    setActiveId(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = items[Math.min(items.length - 1, Math.max(0, selectedIndex + 1))];
      if (next) onSelect(next.id);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = items[Math.max(0, selectedIndex <= 0 ? 0 : selectedIndex - 1)];
      if (previous) onSelect(previous.id);
      return;
    }
    if (event.key === 'Enter' && selectedId) {
      event.preventDefault();
      onSelect(selectedId);
      return;
    }
    if (event.key === 'F2' && selectedId) {
      event.preventDefault();
      startRename(selectedId);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-2" aria-label="Layers panel">
      <div className="mb-2 flex items-center justify-between px-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</h4>
        <span className="text-[11px] text-muted-foreground">{items.length}</span>
      </div>
      <div
        ref={scrollRef}
        role="tree"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative h-72 overflow-auto rounded border border-border/70 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            const id = String(event.active.id);
            setActiveId(id);
            const current = items.find((item) => item.id === id);
            setProjectedDepth(current?.depth ?? 0);
          }}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div
              style={{
                height: shouldVirtualize ? `${virtualizer.getTotalSize()}px` : undefined,
                position: 'relative',
              }}
              data-virtualized={shouldVirtualize || undefined}
            >
              {visibleItems.map(({ item, virtualRow }) => (
                <div
                  key={item.id}
                  style={
                    shouldVirtualize
                      ? {
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }
                      : undefined
                  }
                >
                  <SortableLayerRow
                    item={item}
                    isSelected={item.id === selectedId}
                    isRenaming={renamingId === item.id}
                    renameValue={renameValue}
                    onRenameValueChange={setRenameValue}
                    onRenameCommit={commitRename}
                    onRenameCancel={() => setRenamingId(null)}
                    onStartRename={() => startRename(item.id)}
                    onSelect={() => onSelect(item.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      onSelect(item.id);
                      setContextMenu({ id: item.id, x: event.clientX, y: event.clientY });
                    }}
                    onToggleHidden={() => onToggleHidden(item.id)}
                    onToggleLocked={() => onToggleLocked(item.id)}
                    onToggleCollapsed={() => onToggleCollapsed(item.id)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      {contextMenu && (
        <div
          role="menu"
          aria-label="Layer actions"
          className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {[
            { label: 'Duplicate', action: () => onDuplicate(contextMenu.id) },
            { label: 'Delete', action: () => onDelete(contextMenu.id) },
            { label: 'Save as Symbol', action: () => onSaveAsSymbol(contextMenu.id) },
            { label: 'Wrap in Container', action: () => onWrapInContainer(contextMenu.id) },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(event) => {
                event.stopPropagation();
                item.action();
                setContextMenu(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
