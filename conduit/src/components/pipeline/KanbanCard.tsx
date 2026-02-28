'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PipelineEntry } from '@/types/entities'
import { GripVertical, Mail, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface KanbanCardProps {
  entry: PipelineEntry
  isDragOverlay?: boolean
}

export function KanbanCard({ entry, isDragOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 0.2s ease',
  }

  const c = entry.candidate
  if (!c) return null

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={cn(
        'min-h-[44px] rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-40',
        isDragOverlay && 'rotate-[2deg] shadow-lg ring-2 ring-primary'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Drag ${c.first_name} ${c.last_name}`}
          {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <Link
            href={`/candidates/${c.id}`}
            className="text-sm font-medium hover:underline"
            onClick={(e) => {
              // Prevent navigation when dragging
              if (isDragging) e.preventDefault()
            }}
          >
            {c.first_name} {c.last_name}
          </Link>
          {c.email && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" aria-hidden="true" />
              <span className="truncate">{c.email}</span>
            </div>
          )}
          {c.rating != null && c.rating > 0 && (
            <div className="mt-1 flex items-center gap-0.5 text-xs text-amber-600">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {c.rating}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
