'use client'

import { useEffect, useState } from 'react'
import { usePipelineStore } from '@/stores/pipelineStore'
import { useTenantId } from '@/hooks/useTenantId'
import type { PipelineEntry } from '@/types/entities'
import { Mail, Star, GripVertical, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import { EmptyState } from '@/components/common/EmptyState'
import { StatusBadge } from '@/components/common/StatusBadge'

export default function PipelinePage() {
  const { tenantId } = useTenantId()
  const { stages, entries, loading, fetchPipeline, moveEntry } = usePipelineStore()
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  useEffect(() => {
    if (tenantId) fetchPipeline(tenantId)
  }, [tenantId, fetchPipeline])

  function getEntriesForStage(stageId: string): PipelineEntry[] {
    return entries.filter((e) => e.stage_id === stageId)
  }

  function handleDragStart(entryId: string) {
    setDraggedEntry(entryId)
  }

  function handleDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault()
    setDragOverStage(stageId)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  async function handleDrop(stageId: string) {
    if (!draggedEntry) return
    setDragOverStage(null)

    const entry = entries.find((e) => e.id === draggedEntry)
    if (!entry || entry.stage_id === stageId) {
      setDraggedEntry(null)
      return
    }

    const ok = await moveEntry(draggedEntry, stageId)
    if (ok) {
      const stage = stages.find((s) => s.id === stageId)
      toast.success(`Moved to ${stage?.name ?? 'stage'}`)
    } else {
      toast.error('Failed to move candidate')
    }
    setDraggedEntry(null)
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageEntries = getEntriesForStage(stage.id)
          const isDragOver = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30',
                isDragOver && 'ring-2 ring-primary'
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.id)}
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
                  label={stageEntries.length.toString()}
                />
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 p-2 min-h-[120px]">
                {stageEntries.map((entry) => {
                  const c = entry.candidate
                  if (!c) return null

                  return (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={() => handleDragStart(entry.id)}
                      className={cn(
                        'cursor-grab rounded-md border bg-background p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing',
                        draggedEntry === entry.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/40" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/candidates/${c.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {c.first_name} {c.last_name}
                          </Link>
                          {c.email && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          )}
                          {c.rating && (
                            <div className="flex items-center gap-0.5 mt-1 text-xs text-amber-600">
                              <Star className="h-3 w-3 fill-current" />
                              {c.rating}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {stageEntries.length === 0 && (
                  <div className="flex h-20 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
