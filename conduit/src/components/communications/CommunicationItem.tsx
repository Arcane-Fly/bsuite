'use client'

import { cn } from '@/lib/utils'
import type { Communication } from '@/types/entities'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
} from 'lucide-react'

const channelConfig: Record<
  Communication['channel'],
  { icon: typeof Mail; label: string; color: string }
> = {
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  },
  phone: {
    icon: Phone,
    label: 'Phone',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  },
  note: {
    icon: StickyNote,
    label: 'Note',
    color: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
  },
}

interface CommunicationItemProps {
  communication: Communication
  className?: string
}

export function CommunicationItem({
  communication,
  className,
}: CommunicationItemProps) {
  const config = channelConfig[communication.channel]
  const Icon = config.icon
  const DirectionIcon =
    communication.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight

  const timestamp = communication.sent_at ?? communication.created_at
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true })

  return (
    <div className={cn('flex gap-3 py-3', className)}>
      {/* Channel icon */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          config.color
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          <DirectionIcon
            className={cn(
              'h-3 w-3',
              communication.direction === 'inbound'
                ? 'text-blue-500'
                : 'text-emerald-500'
            )}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {communication.delivered_at && (
            <span className="text-xs text-emerald-600">Delivered</span>
          )}
          {communication.read_at && (
            <span className="text-xs text-blue-600">Read</span>
          )}
        </div>

        {communication.subject && (
          <p className="mt-0.5 text-sm font-medium text-foreground truncate">
            {communication.subject}
          </p>
        )}

        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
          {communication.body}
        </p>
      </div>
    </div>
  )
}
