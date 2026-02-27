'use client'

import { useState } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Flag,
} from 'lucide-react'
import { toast } from 'sonner'
import type { PipelineStage } from '@/types/entities'
import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog'

const STAGE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
  '#f97316',
]

interface PipelineStagesSectionProps {
  tenantId: string
}

export function PipelineStagesSection({ tenantId }: PipelineStagesSectionProps) {
  const { stages, saving, createStage, updateStage, deleteStage, reorderStages } = useSettingsStore()
  const { requestConfirm, dialogProps } = useConfirmDialog()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newIsTerminal, setNewIsTerminal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editIsTerminal, setEditIsTerminal] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) {
      toast.error('Stage name is required')
      return
    }
    const ok = await createStage(tenantId, {
      name: newName.trim(),
      color: newColor,
      is_terminal: newIsTerminal,
    })
    if (ok) {
      toast.success(`Stage "${newName.trim()}" created`)
      setNewName('')
      setNewColor('#3b82f6')
      setNewIsTerminal(false)
      setIsAdding(false)
    } else {
      toast.error('Failed to create stage')
    }
  }

  function startEdit(stage: PipelineStage) {
    setEditingId(stage.id)
    setEditName(stage.name)
    setEditColor(stage.color ?? '#3b82f6')
    setEditIsTerminal(stage.is_terminal)
  }

  async function handleSaveEdit(stageId: string) {
    if (!editName.trim()) {
      toast.error('Stage name is required')
      return
    }
    const ok = await updateStage(stageId, {
      name: editName.trim(),
      color: editColor,
      is_terminal: editIsTerminal,
    })
    if (ok) {
      toast.success('Stage updated')
      setEditingId(null)
    } else {
      toast.error('Failed to update stage')
    }
  }

  function handleDelete(stage: PipelineStage) {
    requestConfirm(
      { title: 'Delete Stage', description: `Delete stage "${stage.name}"? Candidates in this stage will need to be reassigned.` },
      async () => {
        const ok = await deleteStage(stage.id)
        if (ok) {
          toast.success(`Stage "${stage.name}" deleted`)
        } else {
          toast.error('Failed to delete stage. It may have candidates assigned.')
        }
      },
    )
  }

  async function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const currentIds = stages.map((s) => s.id)
    const fromIndex = currentIds.indexOf(draggedId)
    const toIndex = currentIds.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...currentIds]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, draggedId)

    const ok = await reorderStages(tenantId, reordered)
    if (ok) {
      toast.success('Stages reordered')
    } else {
      toast.error('Failed to reorder stages')
    }
    setDraggedId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Pipeline Stages</h3>
          <p className="text-sm text-muted-foreground">
            Define the stages candidates move through in your recruitment pipeline.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Stage
          </button>
        )}
      </div>

      {stages.length === 0 && !isAdding && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Flag className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No pipeline stages configured yet.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Create your first stage
          </button>
        </div>
      )}

      <div className="space-y-1">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            draggable={editingId !== stage.id}
            onDragStart={() => setDraggedId(stage.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage.id)}
            className={cn(
              'group flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors',
              draggedId === stage.id && 'opacity-50',
              draggedId && draggedId !== stage.id && 'border-dashed'
            )}
          >
            <GripVertical
              className="h-4 w-4 text-muted-foreground/40 cursor-grab shrink-0"
              aria-hidden="true"
            />

            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
              {index + 1}
            </span>

            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color ?? '#3b82f6' }}
              aria-hidden="true"
            />

            {editingId === stage.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(stage.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <div className="flex gap-1">
                  {STAGE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={cn(
                        'h-5 w-5 rounded-full border-2 transition-all',
                        editColor === c ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={editIsTerminal}
                    onChange={(e) => setEditIsTerminal(e.target.checked)}
                    className="rounded"
                  />
                  Terminal
                </label>
                <button
                  onClick={() => handleSaveEdit(stage.id)}
                  disabled={saving}
                  className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 transition-colors"
                  aria-label="Save"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{stage.name}</span>
                {stage.is_terminal && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Terminal
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(stage)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label={`Edit ${stage.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(stage)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={`Delete ${stage.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/10">
          <Plus className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Stage name..."
            className="flex-1 rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') setIsAdding(false)
            }}
          />
          <div className="flex gap-1">
            {STAGE_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-all',
                  newColor === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <input
              type="checkbox"
              checked={newIsTerminal}
              onChange={(e) => setNewIsTerminal(e.target.checked)}
              className="rounded"
            />
            Terminal
          </label>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Add
          </button>
          <button
            onClick={() => { setIsAdding(false); setNewName(''); }}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
