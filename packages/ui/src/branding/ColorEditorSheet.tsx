'use client'

/**
 * ColorEditorSheet — A sheet/dialog for editing branding colors
 *
 * This component provides a slide-out sheet interface for editing
 * color values. It uses a slot-based design for the color editor
 * to allow consumers to inject their own color picker implementation
 * (e.g., OklchColorPicker, or a custom one).
 *
 * Features:
 * - Slot-based color editor (renderEditor prop)
 * - Save/Cancel actions
 * - Accessible dialog implementation
 * - Responsive design
 *
 * Usage:
 *   <ColorEditorSheet
 *     open={isOpen}
 *     onOpenChange={setIsOpen}
 *     title="Edit Primary Color"
 *     value="oklch(0.546 0.215 262.9)"
 *     onSave={(value) => console.log('Saved:', value)}
 *     renderEditor={(props) => <OklchColorPicker {...props} />}
 *   />
 *
 * Note: Consumers must have shadcn Sheet component installed:
 *   npx shadcn@latest add sheet
 */
import { useState, useEffect, type ReactNode } from 'react'
import { cn } from '../utils.js'

export interface ColorEditorSheetProps {
  /** Whether the sheet is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Sheet title */
  title?: string
  /** Description text */
  description?: string
  /** Current color value */
  value: string
  /** Callback when Save is clicked */
  onSave: (value: string) => void
  /** Callback when Cancel is clicked (optional, defaults to closing sheet) */
  onCancel?: () => void
  /** Render function for the color editor component */
  renderEditor: (props: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
  }) => ReactNode
  /** Optional className for the sheet content */
  className?: string
  /** Whether save button should be disabled */
  disabled?: boolean
}

/**
 * ColorEditorSheet - Generic sheet for editing colors
 *
 * This is a "bring your own Sheet" component. Consumers must:
 * 1. Have shadcn Sheet installed in their app
 * 2. Pass this component to their app-specific Sheet wrapper
 *
 * For consumers WITHOUT shadcn Sheet, they can use this as a
 * regular dialog/modal by wrapping it in their own dialog primitive.
 *
 * Internal implementation uses basic HTML + Tailwind for flexibility.
 */
export function ColorEditorSheet({
  open,
  onOpenChange,
  title = 'Edit Color',
  description,
  value,
  onSave,
  onCancel,
  renderEditor,
  className,
  disabled = false,
}: ColorEditorSheetProps) {
  const [editValue, setEditValue] = useState(value)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (open) {
      setEditValue(value)
      setHasChanges(false)
    }
  }, [open, value])

  const handleChange = (newValue: string) => {
    setEditValue(newValue)
    setHasChanges(newValue !== value)
  }

  const handleSave = () => {
    onSave(editValue)
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-editor-title"
      aria-describedby={description ? 'color-editor-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-background shadow-lg sm:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <h2
              id="color-editor-title"
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p
                id="color-editor-description"
                className="text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className={cn(
              'rounded-sm opacity-70 ring-offset-background transition-opacity',
              'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:pointer-events-none'
            )}
            aria-label="Close"
            disabled={disabled}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={cn('flex-1 overflow-y-auto px-6 py-6', className)}>
          {renderEditor({
            value: editValue,
            onChange: handleChange,
            disabled,
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={disabled}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
              'border border-border-interactive bg-background hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || !hasChanges}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
              'bg-primary text-text-on-primary hover:bg-primary/90',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
