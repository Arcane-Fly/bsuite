'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchAnalytics, type AnalyticsSummary } from '@/services/analyticsService'
import { cn } from '@/lib/utils'
import {
    BarChart3,
    Briefcase,
    GitPullRequestArrow,
    MessageSquare,
    TrendingUp,
    Users,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  placed: 'bg-blue-500',
  available: 'bg-emerald-500',
  interviewing: 'bg-amber-500',
  withdrawn: 'bg-gray-400',
  rejected: 'bg-red-400',
  archived: 'bg-gray-300',
  open: 'bg-green-500',
  draft: 'bg-gray-400',
  closed: 'bg-red-400',
  filled: 'bg-blue-500',
  cancelled: 'bg-orange-400',
}

interface AnalyticsViewProps {
  tenantId: string
  initialData: AnalyticsSummary
}

export function AnalyticsView({ tenantId, initialData }: AnalyticsViewProps) {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['analytics', tenantId],
    queryFn: () => fetchAnalytics(tenantId),
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Sourcing metrics, pipeline velocity, and conversion rates
          </p>
        </div>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load analytics'}
        </div>
      </div>
    )
  }

  const s = summary

  const isEmpty =
    !s ||
    (s.totalCandidates === 0 &&
      s.totalJobs === 0 &&
      s.totalPipelineEntries === 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Sourcing metrics, pipeline velocity, and conversion rates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Total Candidates"
          value={s?.totalCandidates ?? 0}
          icon={Users}
          color="text-blue-600"
        />
        <SummaryCard
          label="Total Jobs"
          value={s?.totalJobs ?? 0}
          icon={Briefcase}
          color="text-indigo-600"
        />
        <SummaryCard
          label="Active Jobs"
          value={s?.activeJobs ?? 0}
          icon={TrendingUp}
          color="text-green-600"
        />
        <SummaryCard
          label="In Pipeline"
          value={s?.totalPipelineEntries ?? 0}
          icon={GitPullRequestArrow}
          color="text-amber-600"
        />
        <SummaryCard
          label="Communications"
          value={s?.totalCommunications ?? 0}
          icon={MessageSquare}
          color="text-purple-600"
        />
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BarChart3
            className="h-12 w-12 text-muted-foreground/50"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-medium">No data yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add candidates and jobs to start seeing sourcing and pipeline
            analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Pipeline Distribution */}
          {s && s.pipelineByStage.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Pipeline Distribution
              </h2>
              <div className="rounded-lg border">
                <div className="divide-y">
                  {s.pipelineByStage.map(({ stage, count }) => {
                    const total = s.totalPipelineEntries || 1
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div
                        key={stage.id}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.color ?? '#6b7280' }}
                          aria-hidden="true"
                        />
                        <span className="min-w-[120px] text-sm font-medium">
                          {stage.name}
                        </span>
                        <div className="flex-1">
                          <div className="h-2 w-full rounded-full bg-secondary">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  stage.color ?? '#3b82f6',
                              }}
                            />
                          </div>
                        </div>
                        <span className="min-w-[60px] text-right text-sm tabular-nums text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Candidate Status Breakdown */}
            {s && Object.keys(s.candidatesByStatus).length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidates by Status
                </h2>
                <div className="rounded-lg border p-4">
                  <div className="space-y-3">
                    {Object.entries(s.candidatesByStatus)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-2.5 w-2.5 shrink-0 rounded-full',
                              STATUS_COLORS[status] ?? 'bg-gray-400'
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-[100px] text-sm capitalize">
                            {status.replace('_', ' ')}
                          </span>
                          <div className="flex-1">
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div
                                className={cn(
                                  'h-1.5 rounded-full',
                                  STATUS_COLORS[status] ?? 'bg-gray-400'
                                )}
                                style={{
                                  width: `${Math.round((count / s.totalCandidates) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            )}

            {/* Candidate Sources */}
            {s && Object.keys(s.candidatesBySource).length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Candidate Sources
                </h2>
                <div className="rounded-lg border p-4">
                  <div className="space-y-3">
                    {Object.entries(s.candidatesBySource)
                      .sort(([, a], [, b]) => b - a)
                      .map(([source, count]) => (
                        <div key={source} className="flex items-center gap-3">
                          <span className="min-w-[100px] text-sm capitalize">
                            {source.replace('_', ' ')}
                          </span>
                          <div className="flex-1">
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div
                                className="h-1.5 rounded-full bg-blue-500"
                                style={{
                                  width: `${Math.round((count / s.totalCandidates) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            )}

            {/* Job Status Breakdown */}
            {s && Object.keys(s.jobsByStatus).length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Jobs by Status
                </h2>
                <div className="rounded-lg border p-4">
                  <div className="space-y-3">
                    {Object.entries(s.jobsByStatus)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-2.5 w-2.5 shrink-0 rounded-full',
                              STATUS_COLORS[status] ?? 'bg-gray-400'
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-[100px] text-sm capitalize">
                            {status.replace('_', ' ')}
                          </span>
                          <div className="flex-1">
                            <div className="h-1.5 w-full rounded-full bg-secondary">
                              <div
                                className={cn(
                                  'h-1.5 rounded-full',
                                  STATUS_COLORS[status] ?? 'bg-gray-400'
                                )}
                                style={{
                                  width: `${Math.round((count / s.totalJobs) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            )}

            {/* Recent Activity */}
            {s &&
              (s.recentCandidates.length > 0 || s.recentJobs.length > 0) && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Activity
                  </h2>
                  <div className="rounded-lg border divide-y">
                    {s.recentCandidates.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Users
                          className="h-4 w-4 shrink-0 text-blue-500"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Candidate added
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('en-AU')}
                        </span>
                      </div>
                    ))}
                    {s.recentJobs.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Briefcase
                          className="h-4 w-4 shrink-0 text-indigo-500"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {j.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Job created
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(j.created_at).toLocaleDateString('en-AU')}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
          </div>
        </>
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
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}
