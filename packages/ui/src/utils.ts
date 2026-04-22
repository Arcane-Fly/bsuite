import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classNames, resolving conflicts (later wins).
 *
 * Behaviour-equivalent to the shadcn/ui `cn()` helper every BSuite app
 * already uses locally — centralising it here so every `@bsuite/ui`
 * component can share one implementation without consumers wiring it up.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
