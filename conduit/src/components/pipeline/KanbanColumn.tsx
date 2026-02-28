'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { PipelineEntry, PipelineStage } from '@/types/entities'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  stage: PipelineStage
  entries: PipelineEntry[]
}

export function KanbanColumn({ stage, entries }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: 'column', stageId: stage.id },
  })

  const entryIds = entries.map((e) => e.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-all duration-200',
        isOver && 'ring-2 ring-primary'
      )}
    >
      {/* Stage Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: stage.color ?? '#6b7280' }}
          />
          <span className="text-sm font-semibold">{stage.name}</span>
        </div>
        <StatusBadge
          variant="neutral"
          label={entries.length.toString()}
        />
      </div>

      {/* Cards */}
      <SortableContext
        items={entryIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[120px] flex-1 space-y-2 p-2">
          {entries.map((entry) => (
            <KanbanCard key={entry.id} entry={entry} />
          ))}

          {entries.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
              Drag candidates here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
