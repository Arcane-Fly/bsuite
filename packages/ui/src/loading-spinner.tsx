import type { SVGAttributes } from 'react'
import { cn } from './utils.js'

export interface LoadingSpinnerProps extends SVGAttributes<SVGSVGElement> {
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function LoadingSpinner({
  className,
  label = 'Loading',
  size = 'md',
  ...props
}: LoadingSpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      className={cn('animate-spin text-primary', sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  )
}
