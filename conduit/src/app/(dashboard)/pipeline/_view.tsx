'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { createClient } from '@/lib/supabase/client'
import type { PipelineEntry, PipelineStage } from '@/types/entities'
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

interface PipelineData {
  stages: PipelineStage[]
  entries: PipelineEntry[]
}

export function PipelineView() {
  const { tenantId } = useTenantId()
  const { moveEntry } = usePipelineStore()
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery<PipelineData>({
    queryKey: ['pipeline', tenantId],
    queryFn: async () => {
      if (!tenantId) return { stages: [], entries: [] }
      const supabase = createClient()
      const [stagesRes, entriesRes] = await Promise.all([
        supabase
          .from('r7_pipeline_stages')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('order', { ascending: true }),
        supabase
          .from('r7_pipeline_entries')
          .select('*, candidate:r7_candidates(id, first_name, last_name, email, avatar_url, rating), stage:r7_pipeline_stages(id, name, color, "order")')
          .eq('tenant_id', tenantId)
          .order('entered_at', { ascending: false }),
      ])
      if (stagesRes.error) throw stagesRes.error
      if (entriesRes.error) throw entriesRes.error
      return {
        stages: (stagesRes.data as PipelineStage[]) ?? [],
        entries: (entriesRes.data as PipelineEntry[]) ?? [],
      }
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  })

  const stages = data?.stages ?? []
  const serverEntries = data?.entries ?? []

  const [activeId, setActiveId] = useState<string | null>(null)
  // Track local entry-to-stage mapping for optimistic cross-column moves
  const [localEntries, setLocalEntries] = useState<PipelineEntry[]>([])
  const moveInFlight = useRef(false)

  // Keep local entries in sync with server data
  const entries = localEntries.length > 0 ? localEntries : serverEntries

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
      entries.filter((e) => e.stage_id === stageId),
    [entries]
  )

  const activeEntry = useMemo(
    () => (activeId ? entries.find((e) => e.id === activeId) ?? null : null),
    [activeId, entries]
  )

  /** Find which stage an entry currently belongs to */
  function findStageForEntry(entryId: string): string | undefined {
    return entries.find((e) => e.id === entryId)?.stage_id
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    // Snapshot server entries as baseline for this drag session
    if (localEntries.length === 0) {
      setLocalEntries(serverEntries)
    }
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

    if (!over || moveInFlight.current) {
      setLocalEntries([])
      return
    }

    const activeEntryId = active.id as string
    const overId = over.id as string

    // Determine target stage
    const overData = over.data.current
    const targetStageId =
      overData?.type === 'column'
        ? (overData.stageId as string)
        : findStageForEntry(overId)

    if (!targetStageId) {
      setLocalEntries([])
      return
    }

    // Check if the entry actually moved to a different stage from the server data
    const originalEntry = serverEntries.find((e) => e.id === activeEntryId)
    if (!originalEntry || originalEntry.stage_id === targetStageId) {
      setLocalEntries([])
      return
    }

    // Persist the move
    moveInFlight.current = true
    const ok = await moveEntry(activeEntryId, targetStageId)
    moveInFlight.current = false

    if (ok) {
      const stage = stages.find((s) => s.id === targetStageId)
      toast.success(`Moved to ${stage?.name ?? 'stage'}`)
      // Invalidate to sync server state
      void queryClient.invalidateQueries({ queryKey: ['pipeline', tenantId] })
    } else {
      // Revert optimistic update
      toast.error('Failed to move candidate')
    }
    setLocalEntries([])
  }

  function handleDragCancel() {
    setActiveId(null)
    setLocalEntries([])
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
