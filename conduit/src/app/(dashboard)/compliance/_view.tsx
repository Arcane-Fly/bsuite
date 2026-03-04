'use client'

import { useQuery } from '@tanstack/react-query'
import { useTenantId } from '@/hooks/useTenantId'
import { cn } from '@/lib/utils'
import { fetchComplianceChecks } from '@/services/complianceService'
import { useComplianceStore } from '@/stores/complianceStore'
import type { ComplianceCheck } from '@/types/entities'
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
} from 'lucide-react'
import { useMemo, useState } from 'react'

const CHECK_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'vevo', label: 'VEVO' },
  { value: 'usi', label: 'USI' },
  { value: 'police_check', label: 'Police Check' },
  { value: 'wwcc', label: 'WWCC' },
  { value: 'medical', label: 'Medical' },
  { value: 'abn', label: 'ABN' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'whs', label: 'WHS' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'expired', label: 'Expired' },
]

const STATUS_CONFIG: Record<string, { color: string; icon: typeof ShieldCheck }> = {
  pending: { color: 'bg-amber-100 text-amber-800', icon: Clock },
  passed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { color: 'bg-red-100 text-red-800', icon: ShieldX },
  expired: { color: 'bg-orange-100 text-orange-800', icon: ShieldAlert },
  not_required: { color: 'bg-gray-100 text-gray-600', icon: ShieldCheck },
}

function daysUntilExpiry(expiresAt: string | undefined | null): number | null {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ComplianceView() {
  const { tenantId } = useTenantId()
  const { filters, setFilters } = useComplianceStore()

  const { data: checks = [], isLoading: loading } = useQuery<ComplianceCheck[]>({
    queryKey: ['compliance-checks', tenantId, filters.status, filters.check_type],
    queryFn: () =>
      fetchComplianceChecks(tenantId!, { status: filters.status, check_type: filters.check_type }),
    enabled: !!tenantId,
    staleTime: 30_000,
  })

  const [now] = useState(() => Date.now())
  const summary = useMemo(() => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return {
      total: checks.length,
      passed: checks.filter((c) => c.status === 'passed').length,
      pending: checks.filter((c) => c.status === 'pending').length,
      failed: checks.filter((c) => c.status === 'failed').length,
      expired: checks.filter((c) => c.status === 'expired').length,
      expiringSoon: checks.filter(
        (c) => c.expires_at && c.status === 'passed' && new Date(c.expires_at).getTime() - now < thirtyDays && new Date(c.expires_at).getTime() > now
      ).length,
    }
  }, [checks, now])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
        <p className="text-sm text-muted-foreground">
          VEVO, USI, police checks, WWCC, and other compliance tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total Checks" value={summary.total} icon={ShieldCheck} color="text-foreground" />
        <SummaryCard label="Passed" value={summary.passed} icon={CheckCircle2} color="text-green-600" />
        <SummaryCard label="Pending" value={summary.pending} icon={Clock} color="text-amber-600" />
        <SummaryCard label="Failed / Expired" value={summary.failed + summary.expired} icon={ShieldX} color="text-red-600" />
        <SummaryCard label="Expiring (30d)" value={summary.expiringSoon} icon={AlertTriangle} color="text-orange-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ status: opt.value })}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filters.status === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label htmlFor="compliance-check-type" className="sr-only">Filter by check type</label>
        <select
          id="compliance-check-type"
          value={filters.check_type}
          onChange={(e) => setFilters({ check_type: e.target.value })}
          className="flex h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CHECK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Check List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : checks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No compliance checks</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Compliance checks will appear here as candidates progress through the pipeline.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {checks.map((check) => {
            const cfg = STATUS_CONFIG[check.status] ?? STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            const days = daysUntilExpiry(check.expires_at)
            const isExpiringSoon = days !== null && days > 0 && days <= 30

            return (
              <div key={check.id} className="flex items-center gap-4 p-4">
                <StatusIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium uppercase text-sm">
                      {check.check_type.replace('_', ' ')}
                    </span>
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
                      {check.status.replace('_', ' ')}
                    </span>
                    {isExpiringSoon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {days}d left
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {check.reference_number && <span>Ref: {check.reference_number}</span>}
                    {check.checked_at && (
                      <span>Checked: {new Date(check.checked_at).toLocaleDateString('en-AU')}</span>
                    )}
                    {check.expires_at && (
                      <span>
                        Expires: {new Date(check.expires_at).toLocaleDateString('en-AU')}
                        {days !== null && days < 0 && ' (overdue)'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}
