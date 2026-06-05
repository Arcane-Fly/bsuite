import type { HTMLAttributes } from 'react'
import { cn } from './utils.js'

export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive'

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusBadgeTone
}

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  info: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-status-success/20 bg-status-success/10 text-status-success',
  warning: 'border-status-warning/20 bg-status-warning/10 text-status-warning',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
}

export function StatusBadge({ className, tone = 'neutral', ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
