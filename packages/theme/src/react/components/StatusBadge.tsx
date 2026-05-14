/**
 * StatusBadge — canonical status pill across BSuite apps.
 *
 * Brand-Token Strategy A (operator-approved 2026-05-13): consolidates the
 * 4 parallel implementations from crm7/conduit/BSU/R80.3 into one published
 * primitive. Apps replace their local StatusBadge with `import { StatusBadge }
 * from '@bsuite/theme/react'`.
 *
 * Self-contained (no router, no className util peer-dep):
 *   - Visual-only by default. Wrap in your app's `<Link>` / `<button>` for
 *     navigation/click behaviour. Keeps this package router-agnostic.
 *   - Includes `variant` (6 colours) + auto-resolver `getStatusVariant()` +
 *     `formatStatusLabel()`. Exports `AutoStatusBadge` for the common
 *     "give me a badge from a status string" case.
 *
 * Visual contract (D2C Neon Electric + Braden Corporate compatible):
 *   - Tailwind v4 classes against the role tokens consumers ship via
 *     `@bsuite/theme/css` or `@bsuite/theme/braden-css`.
 *   - Dark-mode handled via `dark:` prefix on each variant.
 *
 * Sizes: 'sm' (default — table cells), 'md' (cards), 'lg' (heroes).
 */
import { type ReactNode, type CSSProperties } from 'react';

export type BadgeVariant =
  /** Green — Approved, Active, Complete */
  | 'success'
  /** Amber — Pending, In Progress */
  | 'warning'
  /** Red — Rejected, Failed, Overdue */
  | 'error'
  /** Blue — Draft, New, Scheduled */
  | 'info'
  /** Purple — Converted, Promoted */
  | 'purple'
  /** Gray — Inactive, Archived */
  | 'neutral';

export interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  /** sm = table cells (default), md = cards, lg = heroes */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
  /** Optional id/data attributes for testing */
  'data-testid'?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  warning:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  error:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  purple:
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const sizeClasses: Record<NonNullable<StatusBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function StatusBadge({
  variant,
  label,
  size = 'sm',
  className,
  style,
  'data-testid': testId,
}: StatusBadgeProps): ReactNode {
  const classes = [
    'inline-flex items-center font-medium rounded-full border',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} style={style} data-testid={testId}>
      {label}
    </span>
  );
}

/**
 * Map a status string to a semantic BadgeVariant.
 *
 * Normalizes lowercase + trim + underscores/hyphens → spaces, then matches
 * against the canonical synonym sets. Pass `overrides` to remap a domain-
 * specific status without forking the function.
 */
export function getStatusVariant(
  status: string,
  overrides?: Partial<Record<string, BadgeVariant>>,
): BadgeVariant {
  const normalized = status.toLowerCase().trim().replace(/_/g, ' ').replace(/-/g, ' ');

  if (overrides && normalized in overrides) {
    const override = overrides[normalized];
    if (override) return override;
  }

  const SUCCESS = [
    'approved', 'active', 'complete', 'completed', 'won',
    'current', 'on track', 'competent', 'pass', 'passed',
    'filled', 'resolved', 'closed won',
  ];
  const WARNING = [
    'pending', 'in progress', 'review', 'under review',
    'at risk', 'on leave', 'offered', 'onboarding',
    'probation', 'investigating', 'action required',
  ];
  const ERROR = [
    'rejected', 'failed', 'lost', 'overdue', 'fail',
    'cancelled', 'canceled', 'terminated', 'suspended',
    'behind', 'unavailable', 'expired', 'not yet competent',
    'closed lost',
  ];
  const INFO = [
    'draft', 'new', 'scheduled', 'open',
    'applicant', 'interviewing', 'reported',
  ];
  const PURPLE = ['converted', 'promoted', 'shortlisted'];

  if (SUCCESS.includes(normalized)) return 'success';
  if (WARNING.includes(normalized)) return 'warning';
  if (ERROR.includes(normalized)) return 'error';
  if (INFO.includes(normalized)) return 'info';
  if (PURPLE.includes(normalized)) return 'purple';
  return 'neutral';
}

/**
 * Format a raw status string into a human-readable label.
 * Examples: 'in_progress' → 'In Progress', 'not_yet_competent' → 'Not Yet Competent'.
 */
export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export interface AutoStatusBadgeProps extends Omit<StatusBadgeProps, 'variant' | 'label'> {
  status: string;
  /** Optional label override; auto-formatted from status when omitted. */
  label?: string;
  /** Override specific status→variant mappings for domain-specific needs. */
  variantOverrides?: Partial<Record<string, BadgeVariant>>;
}

/**
 * Convenience wrapper: derives variant + label from a raw status string.
 *
 * @example
 * <AutoStatusBadge status="in_progress" />
 * // renders <StatusBadge variant="warning" label="In Progress" />
 */
export function AutoStatusBadge({
  status,
  label,
  variantOverrides,
  ...rest
}: AutoStatusBadgeProps): ReactNode {
  const variant = getStatusVariant(status, variantOverrides);
  const displayLabel = label ?? formatStatusLabel(status);
  return <StatusBadge variant={variant} label={displayLabel} {...rest} />;
}
