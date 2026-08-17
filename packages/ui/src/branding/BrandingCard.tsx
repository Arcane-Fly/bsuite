'use client'

/**
 * BrandingCard — A card component for displaying and editing branding settings
 *
 * This component provides a UI for viewing and editing tenant branding
 * configuration, including colors, logos, and other brand properties.
 *
 * Features:
 * - Display current branding values
 * - Edit buttons for each branding property
 * - Integration with ColorEditorSheet for color editing
 * - Accessible and responsive design
 * - Supports OKLCH color format
 *
 * Usage:
 *   <BrandingCard
 *     branding={{
 *       primary: "oklch(0.546 0.215 262.9)",
 *       accent: "oklch(0.769 0.132 191.7)",
 *       logo_url: "https://example.com/logo.svg"
 *     }}
 *     onUpdate={(key, value) => console.log('Updated:', key, value)}
 *     renderColorEditor={(props) => <OklchColorPicker {...props} />}
 *   />
 */
import { useState, type ReactNode } from 'react'
import { cn } from '../utils.js'

export interface BrandingCardProps {
  /** Current branding configuration */
  branding: {
    primary?: string
    accent?: string
    logo_url?: string
    logo_light_url?: string
    logo_dark_url?: string
    favicon_url?: string
    company_name?: string
    font_stack?: string | null
  }
  /** Callback when a branding property is updated */
  onUpdate: (key: string, value: string) => void | Promise<void>
  /** Render function for the color editor component */
  renderColorEditor: (props: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
  }) => ReactNode
  /** Optional className for the card */
  className?: string
  /** Whether editing is disabled */
  disabled?: boolean
  /** Optional title for the card */
  title?: string
  /** Optional description for the card */
  description?: string
}

interface ColorEditorState {
  open: boolean
  field: string
  label: string
  value: string
}

export function BrandingCard({
  branding,
  onUpdate,
  renderColorEditor,
  className,
  disabled = false,
  title = 'Brand Settings',
  description,
}: BrandingCardProps) {
  const [colorEditor, setColorEditor] = useState<ColorEditorState>({
    open: false,
    field: '',
    label: '',
    value: '',
  })

  const openColorEditor = (field: string, label: string, currentValue: string) => {
    setColorEditor({
      open: true,
      field,
      label,
      value: currentValue || '',
    })
  }

  const closeColorEditor = () => {
    setColorEditor(prev => ({ ...prev, open: false }))
  }

  const handleColorSave = async (value: string) => {
    await onUpdate(colorEditor.field, value)
    closeColorEditor()
  }

  const handleTextUpdate = async (field: string, value: string) => {
    await onUpdate(field, value)
  }

  return (
    <>
      <div
        className={cn(
          'rounded-lg border border-input bg-card text-card-foreground shadow-sm',
          className
        )}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Content */}
        <div className="divide-y divide-border">
          {/* Primary Color */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div
                className="h-10 w-10 rounded border border-input shadow-sm"
                style={{ backgroundColor: branding.primary || 'oklch(0.546 0.215 262.9)' }}
                aria-label="Primary color preview"
              />
              <div>
                <div className="font-medium">Primary Color</div>
                <div className="text-sm text-muted-foreground">
                  {branding.primary || 'Not set'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                openColorEditor(
                  'primary',
                  'Primary Color',
                  branding.primary || 'oklch(0.546 0.215 262.9)'
                )
              }
              disabled={disabled}
              className={cn(
                'rounded-md border border-input bg-background px-4 py-2 text-sm font-medium',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              Edit
            </button>
          </div>

          {/* Accent Color */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div
                className="h-10 w-10 rounded border border-input shadow-sm"
                style={{ backgroundColor: branding.accent || 'oklch(0.769 0.132 191.7)' }}
                aria-label="Accent color preview"
              />
              <div>
                <div className="font-medium">Accent Color</div>
                <div className="text-sm text-muted-foreground">
                  {branding.accent || 'Not set'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                openColorEditor(
                  'accent',
                  'Accent Color',
                  branding.accent || 'oklch(0.769 0.132 191.7)'
                )
              }
              disabled={disabled}
              className={cn(
                'rounded-md border border-input bg-background px-4 py-2 text-sm font-medium',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              Edit
            </button>
          </div>

          {/* Company Name */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <label htmlFor="company-name" className="font-medium">
              Company Name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="company-name"
                type="text"
                value={branding.company_name || ''}
                onChange={(e) => handleTextUpdate('company_name', e.target.value)}
                disabled={disabled}
                placeholder="Enter company name"
                className={cn(
                  'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used in logo alt text and other branding contexts
            </p>
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <label htmlFor="logo-url" className="font-medium">
              Logo URL
            </label>
            <div className="flex items-center gap-2">
              <input
                id="logo-url"
                type="url"
                value={branding.logo_url || ''}
                onChange={(e) => handleTextUpdate('logo_url', e.target.value)}
                disabled={disabled}
                placeholder="https://example.com/logo.svg"
                className={cn(
                  'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
            {branding.logo_url && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={branding.logo_url}
                  alt="Logo preview"
                  className="h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Logo Light URL */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <label htmlFor="logo-light-url" className="font-medium">
              Logo URL (Light Mode)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="logo-light-url"
                type="url"
                value={branding.logo_light_url || ''}
                onChange={(e) => handleTextUpdate('logo_light_url', e.target.value)}
                disabled={disabled}
                placeholder="https://example.com/logo-light.svg"
                className={cn(
                  'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional: Use a different logo for light mode
            </p>
          </div>

          {/* Logo Dark URL */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <label htmlFor="logo-dark-url" className="font-medium">
              Logo URL (Dark Mode)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="logo-dark-url"
                type="url"
                value={branding.logo_dark_url || ''}
                onChange={(e) => handleTextUpdate('logo_dark_url', e.target.value)}
                disabled={disabled}
                placeholder="https://example.com/logo-dark.svg"
                className={cn(
                  'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional: Use a different logo for dark mode
            </p>
          </div>

          {/* Favicon URL */}
          <div className="flex flex-col gap-2 px-6 py-4">
            <label htmlFor="favicon-url" className="font-medium">
              Favicon URL
            </label>
            <div className="flex items-center gap-2">
              <input
                id="favicon-url"
                type="url"
                value={branding.favicon_url || ''}
                onChange={(e) => handleTextUpdate('favicon_url', e.target.value)}
                disabled={disabled}
                placeholder="https://example.com/favicon.ico"
                className={cn(
                  'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Square icon shown in browser tabs (16x16 or 32x32)
            </p>
          </div>
        </div>
      </div>

      {/* Color Editor Sheet */}
      {colorEditor.open && (
        <ColorEditorSheetWrapper
          open={colorEditor.open}
          title={`Edit ${colorEditor.label}`}
          description="Adjust the OKLCH color values using the sliders below"
          value={colorEditor.value}
          onSave={handleColorSave}
          onCancel={closeColorEditor}
          renderEditor={renderColorEditor}
        />
      )}
    </>
  )
}

// Internal wrapper for ColorEditorSheet to avoid circular dependency
interface ColorEditorSheetWrapperProps {
  open: boolean
  title: string
  description: string
  value: string
  onSave: (value: string) => void
  onCancel: () => void
  renderEditor: (props: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
  }) => ReactNode
}

function ColorEditorSheetWrapper({
  open,
  title,
  description,
  value,
  onSave,
  onCancel,
  renderEditor,
}: ColorEditorSheetWrapperProps) {
  const [editValue, setEditValue] = useState(value)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (newValue: string) => {
    setEditValue(newValue)
    setHasChanges(newValue !== value)
  }

  const handleSave = () => {
    onSave(editValue)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-editor-title"
      aria-describedby="color-editor-description"
    >
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-background shadow-lg sm:max-w-md">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <h2
              id="color-editor-title"
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
            <p
              id="color-editor-description"
              className="text-sm text-muted-foreground"
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-sm opacity-70 ring-offset-background transition-opacity',
              'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
            aria-label="Close"
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderEditor({
            value: editValue,
            onChange: handleChange,
          })}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
              'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
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
