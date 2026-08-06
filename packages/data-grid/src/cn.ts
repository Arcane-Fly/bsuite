import clsx, { type ClassValue } from 'clsx';

/** Minimal className joiner, matching @bsuite/ui's `cn()` shape. Not pulling
 * in tailwind-merge here — this package's own class lists never conflict
 * (each cell renders one fixed set of utility classes), so the extra
 * dependency isn't worth it for a package with no consumer yet. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
