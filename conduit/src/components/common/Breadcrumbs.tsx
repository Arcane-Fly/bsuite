'use client'

import { NAV_CONFIG } from '@/config/navigation'
import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Crumb {
  label: string
  href: string
  current: boolean
}

const SEGMENT_LABELS: Record<string, string> = {
  candidates: 'Candidates',
  'talent-pools': 'Talent Pools',
  jobs: 'Jobs',
  pipeline: 'Pipeline',
  offers: 'Offers',
  interviews: 'Interviews',
  onboarding: 'Onboarding',
  compliance: 'Compliance',
  analytics: 'Analytics',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  distribute: 'Distribution',
}

function buildNavLabelMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const section of NAV_CONFIG.sections) {
    if (section.href) map.set(section.href, section.label)
    if (section.groups) {
      for (const group of section.groups) {
        for (const item of group) {
          map.set(item.href, item.label)
        }
      }
    }
  }
  return map
}

const navLabels = buildNavLabelMap()

function isUuid(segment: string): boolean {
  return segment.length > 8 && segment.includes('-')
}

function getLabelForSegment(segment: string, fullPath: string): string {
  if (navLabels.has(fullPath)) return navLabels.get(fullPath)!
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
  if (isUuid(segment)) return 'Details'
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function Breadcrumbs() {
  const pathname = usePathname()

  if (!pathname || pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const crumbs: Crumb[] = []

  for (let i = 0; i < segments.length; i++) {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = getLabelForSegment(segments[i], href)
    crumbs.push({
      label,
      href,
      current: i === segments.length - 1,
    })
  }

  if (crumbs.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            href={NAV_CONFIG.app.homeHref}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
            {crumb.current ? (
              <span className="rounded-md px-1.5 py-0.5 font-medium text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
