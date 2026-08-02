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
  /** Deep blue — Converted, Promoted, Exported, Paid: terminal states that
   *  have moved past success. Was `purple`, renamed 0.7.0: the variant was
   *  named for a colour rather than a role, and that colour is quarantined
   *  from semantics (purple collapses onto primary blue under protanopia). */
  | 'secondary'
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

/*
 * Role-bound, not palette-bound. Until 0.7.0 these were raw Tailwind palette
 * classes (`bg-emerald-50`, `bg-red-50`, …), which meant the design-system
 * component every app imports was invisible to tenant white-labelling —
 * BrandingProvider mutates the role layer, and these bound below it.
 *
 * Tint is derived from the role colour with a slash-opacity fill plus the
 * AA-safe `*-text` variant for type, so one definition covers light and dark
 * and no `dark:` duplicate is needed.
 */
const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-role-success/10 text-success-text border-role-success/30',
  warning: 'bg-role-warning/10 text-warning-text border-role-warning/30',
  error: 'bg-role-error/10 text-error-text border-role-error/30',
  info: 'bg-role-info/10 text-accent-text border-role-info/30',
  secondary: 'bg-role-secondary/10 text-primary-text border-role-secondary/30',
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
  const SECONDARY = ['converted', 'promoted', 'shortlisted', 'exported', 'paid', 'qualified'];

  if (SUCCESS.includes(normalized)) return 'success';
  if (WARNING.includes(normalized)) return 'warning';
  if (ERROR.includes(normalized)) return 'error';
  if (INFO.includes(normalized)) return 'info';
  if (SECONDARY.includes(normalized)) return 'secondary';
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
