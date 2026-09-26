'use client'

/**
 * OklchColorPicker — A color input component for OKLCH color format
 *
 * OKLCH is the BSuite standard color format for the D2C Neon Electric theme.
 * This component provides a user-friendly interface for editing OKLCH colors
 * with visual preview and validation.
 *
 * Features:
 * - Live preview of the selected color
 * - Input fields for L (lightness), C (chroma), H (hue)
 * - Validation of OKLCH format
 * - Accessible labels and error messages
 *
 * Usage:
 *   <OklchColorPicker
 *     value="oklch(0.546 0.215 262.9)"
 *     onChange={(value) => console.log(value)}
 *     label="Primary Color"
 *   />
 */
import { useState, useEffect, type ChangeEvent } from 'react'
import { cn } from '../utils.js'

const OKLCH_RE = /^oklch\(\s*[\d.]+%?\s+[\d.]+%?\s+[\d.]+%?(?:\s*\/\s*[\d.]+%?)?\s*\)$/i

export interface OklchColorPickerProps {
  /** Current OKLCH color value, e.g. "oklch(0.546 0.215 262.9)" */
  value?: string
  /** Callback when color changes */
  onChange?: (value: string) => void
  /** Label for the color picker */
  label?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Optional className for the container */
  className?: string
  /** Optional description/helper text */
  description?: string
  /** Optional error message */
  error?: string
}

interface OklchComponents {
  l: number
  c: number
  h: number
  alpha?: number
}

function parseOklch(value: string): OklchComponents | null {
  if (!value || !OKLCH_RE.test(value)) return null

  const match = value.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)%?\s+([\d.]+)%?(?:\s*\/\s*([\d.]+)%?)?\s*\)/i)
  if (!match) return null

  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3]),
    alpha: match[4] ? parseFloat(match[4]) : undefined,
  }
}

function formatOklch(components: OklchComponents): string {
  const { l, c, h, alpha } = components
  if (alpha !== undefined && alpha !== 1) {
    return `oklch(${l} ${c} ${h} / ${alpha})`
  }
  return `oklch(${l} ${c} ${h})`
}

export function OklchColorPicker({
  value = 'oklch(0.546 0.215 262.9)',
  onChange,
  label,
  disabled = false,
  className,
  description,
  error,
}: OklchColorPickerProps) {
  const parsed = parseOklch(value)
  const [components, setComponents] = useState<OklchComponents>(
    parsed || { l: 0.5, c: 0.1, h: 0 }
  )
  const [inputValue, setInputValue] = useState(value)
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    const newParsed = parseOklch(value)
    if (newParsed) {
      setComponents(newParsed)
      setInputValue(value)
      setIsValid(true)
    }
  }, [value])

  const handleComponentChange = (key: keyof OklchComponents, val: string) => {
    const numVal = parseFloat(val)
    if (isNaN(numVal)) return

    const newComponents = { ...components, [key]: numVal }
    setComponents(newComponents)
    const formatted = formatOklch(newComponents)
    setInputValue(formatted)
    setIsValid(true)
    onChange?.(formatted)
  }

  const handleRawInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    const newParsed = parseOklch(newValue)
    if (newParsed) {
      setComponents(newParsed)
      setIsValid(true)
      onChange?.(newValue)
    } else {
      setIsValid(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {/* Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 rounded-md border-2 border-border-interactive shadow-sm"
          style={{ backgroundColor: inputValue }}
          aria-label="Color preview"
        />
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={handleRawInputChange}
            disabled={disabled}
            className={cn(
              'w-full rounded-md border border-border-interactive bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !isValid && 'border-destructive'
            )}
            placeholder="oklch(0.546 0.215 262.9)"
            aria-label="OKLCH color value"
            aria-invalid={!isValid}
          />
        </div>
      </div>

      {/* Component Sliders */}
      <div className="space-y-2">
        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2">
          <label htmlFor="oklch-l" className="text-sm text-muted-foreground">
            L (Light)
          </label>
          <input
            id="oklch-l"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={components.l}
            onChange={(e) => handleComponentChange('l', e.target.value)}
            disabled={disabled}
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Lightness"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={components.l.toFixed(2)}
            onChange={(e) => handleComponentChange('l', e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full rounded border border-border-interactive bg-background px-2 py-1 text-sm',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Lightness value"
          />
        </div>

        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2">
          <label htmlFor="oklch-c" className="text-sm text-muted-foreground">
            C (Chroma)
          </label>
          <input
            id="oklch-c"
            type="range"
            min="0"
            max="0.4"
            step="0.001"
            value={components.c}
            onChange={(e) => handleComponentChange('c', e.target.value)}
            disabled={disabled}
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Chroma"
          />
          <input
            type="number"
            min="0"
            max="0.4"
            step="0.001"
            value={components.c.toFixed(3)}
            onChange={(e) => handleComponentChange('c', e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full rounded border border-border-interactive bg-background px-2 py-1 text-sm',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Chroma value"
          />
        </div>

        <div className="grid grid-cols-[80px_1fr_60px] items-center gap-2">
          <label htmlFor="oklch-h" className="text-sm text-muted-foreground">
            H (Hue)
          </label>
          <input
            id="oklch-h"
            type="range"
            min="0"
            max="360"
            step="0.1"
            value={components.h}
            onChange={(e) => handleComponentChange('h', e.target.value)}
            disabled={disabled}
            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Hue"
          />
          <input
            type="number"
            min="0"
            max="360"
            step="0.1"
            value={components.h.toFixed(1)}
            onChange={(e) => handleComponentChange('h', e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full rounded border border-border-interactive bg-background px-2 py-1 text-sm',
              'focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            aria-label="Hue value"
          />
        </div>
      </div>

      {(error || !isValid) && (
        <p className="text-sm text-destructive">
          {error || 'Invalid OKLCH format. Expected: oklch(L C H) where L is 0-1, C is 0-0.4, H is 0-360'}
        </p>
      )}
    </div>
  )
}
