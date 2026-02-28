'use client';

/**
 * ScoutIcon — Branded AI assistant icon for Conduit (Scout).
 *
 * A stylized 4-point sparkle/starburst with a center dot.
 * Uses `currentColor` so it inherits from Tailwind's `text-*` classes,
 * compatible with Conduit's Tailwind v4 OKLch CSS variable system.
 *
 * Accepts `size` (default 24) and `className` props like Lucide icons.
 */

import { cn } from '@/lib/utils';

interface ScoutIconProps {
  size?: number;
  className?: string;
}

export function ScoutIcon({ size = 24, className }: ScoutIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('inline-block shrink-0', className)}
      aria-hidden="true"
    >
      {/* 4-point starburst */}
      <path
        d="M12 2 L14.4 9.6 L22 12 L14.4 14.4 L12 22 L9.6 14.4 L2 12 L9.6 9.6 Z"
        fill="currentColor"
      />

      {/* Center intelligence dot */}
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
