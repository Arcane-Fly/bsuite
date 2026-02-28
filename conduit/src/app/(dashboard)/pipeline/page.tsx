'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  Modifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { usePipelineStore } from '@/stores/pipelineStore'
import { useTenantId } from '@/hooks/useTenantId'
import type { PipelineEntry } from '@/types/entities'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { KanbanColumn, KanbanCard } from '@/components/pipeline'

/** Restrict drag movement to within the browser window edges. */
const restrictToWindowEdges: Modifier = ({ transform }) => {
  return {
    ...transform,
    x: Math.max(
      -window.scrollX,
      Math.min(transform.x, document.documentElement.clientWidth - window.scrollX)
    ),
    y: Math.max(
      -window.scrollY,
      Math.min(transform.y, document.documentElement.clientHeight - window.scrollY)
    ),
  }
}

export default function PipelinePage() {
  const { tenantId } = useTenantId()
  const { stages, entries, loading, fetchPipeline, moveEntry } =
    usePipelineStore()

  const [activeId, setActiveId] = useState<string | null>(null)
  // Track local entry-to-stage mapping for optimistic cross-column moves
  const [localEntries, setLocalEntries] = useState<PipelineEntry[]>([])
  const moveInFlight = useRef(false)

  useEffect(() => {
    if (tenantId) fetchPipeline(tenantId)
  }, [tenantId, fetchPipeline])

  // Keep local entries in sync with store
  useEffect(() => {
    setLocalEntries(entries)
  }, [entries])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getEntriesForStage = useCallback(
    (stageId: string): PipelineEntry[] =>
      localEntries.filter((e) => e.stage_id === stageId),
    [localEntries]
  )

  const activeEntry = useMemo(
    () => (activeId ? localEntries.find((e) => e.id === activeId) ?? null : null),
    [activeId, localEntries]
  )

  /** Find which stage an entry currently belongs to */
  function findStageForEntry(entryId: string): string | undefined {
    return localEntries.find((e) => e.id === entryId)?.stage_id
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeEntryId = active.id as string
    const overId = over.id as string

    // Determine the target stage: either the column itself or the column
    // that contains the entry we're hovering over
    const overData = over.data.current
    const targetStageId =
      overData?.type === 'column'
        ? (overData.stageId as string)
        : findStageForEntry(overId)

    if (!targetStageId) return

    const sourceStageId = findStageForEntry(activeEntryId)
    if (sourceStageId === targetStageId) return

    // Optimistic cross-column movement during drag
    setLocalEntries((prev) =>
      prev.map((e) =>
        e.id === activeEntryId ? { ...e, stage_id: targetStageId } : e
      )
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || moveInFlight.current) return

    const activeEntryId = active.id as string
    const overId = over.id as string

    // Determine target stage
    const overData = over.data.current
    const targetStageId =
      overData?.type === 'column'
        ? (overData.stageId as string)
        : findStageForEntry(overId)

    if (!targetStageId) return

    // Check if the entry actually moved to a different stage from the store
    const originalEntry = entries.find((e) => e.id === activeEntryId)
    if (!originalEntry || originalEntry.stage_id === targetStageId) return

    // Persist the move
    moveInFlight.current = true
    const ok = await moveEntry(activeEntryId, targetStageId)
    moveInFlight.current = false

    if (ok) {
      const stage = stages.find((s) => s.id === targetStageId)
      toast.success(`Moved to ${stage?.name ?? 'stage'}`)
    } else {
      // Revert optimistic update
      setLocalEntries(entries)
      toast.error('Failed to move candidate')
    }
  }

  function handleDragCancel() {
    setActiveId(null)
    // Revert any optimistic changes
    setLocalEntries(entries)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <EmptyState
          icon={Users}
          title="No pipeline stages"
          description="Pipeline stages will be set up automatically when you add candidates."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag candidates between stages to move them through your pipeline
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        modifiers={[restrictToWindowEdges]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              entries={getEntriesForStage(stage.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeEntry ? (
            <KanbanCard entry={activeEntry} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
