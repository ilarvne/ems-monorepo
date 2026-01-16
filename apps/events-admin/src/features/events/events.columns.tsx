import type { Event } from '@repo/proto'
import { EventFormat } from '@repo/proto'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { MapPinIcon, ImageIcon, CalendarDaysIcon } from 'lucide-react'

import { Badge } from '@repo/ui/components/badge'
import { EventStatusBadge } from '@repo/ui/components/event-status-badge'
import { cn } from '@repo/ui/lib/utils'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get compact relative time string
 */
function getRelativeTime(dateString: string): { text: string; isUpcoming: boolean; isPast: boolean } {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / (1000 * 60))
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const isUpcoming = diffMs > 0
  const isPast = diffMs < 0

  if (Math.abs(diffMins) < 60) {
    return {
      text: isUpcoming ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`,
      isUpcoming,
      isPast
    }
  }
  if (Math.abs(diffHours) < 24) {
    return {
      text: isUpcoming ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`,
      isUpcoming,
      isPast
    }
  }
  if (Math.abs(diffDays) < 7) {
    return {
      text: isUpcoming ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`,
      isUpcoming,
      isPast
    }
  }
  if (Math.abs(diffDays) < 30) {
    const weeks = Math.round(Math.abs(diffDays) / 7)
    return {
      text: isUpcoming ? `in ${weeks}w` : `${weeks}w ago`,
      isUpcoming,
      isPast
    }
  }

  return { text: '', isUpcoming: false, isPast: true }
}

/**
 * Get event status based on start time
 */
type EventStatus = 'upcoming' | 'today' | 'past' | 'ongoing'

function getEventStatus(startTime: string, endTime?: string): EventStatus {
  const now = new Date()
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Check if ongoing (started but not ended)
  if (end && start <= now && end >= now) {
    return 'ongoing'
  }

  // Check if today
  if (start >= today && start < tomorrow) {
    return 'today'
  }

  // Check if upcoming
  if (start >= tomorrow) {
    return 'upcoming'
  }

  return 'past'
}

// ============================================================================
// Filter Functions
// ============================================================================

export const multiColumnFilterFn: FilterFn<Event> = (row, _columnId, filterValue) => {
  const searchableRowContent =
    `${row.original.title} ${row.original.description} ${row.original.location}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

export const formatFilterFn: FilterFn<Event> = (row, columnId, filterValue: number[]) => {
  if (!filterValue?.length) return true
  const format = row.getValue(columnId) as number
  return filterValue.includes(format)
}

// ============================================================================
// Column Definitions
// ============================================================================

export const columns: ColumnDef<Event>[] = [
  // ID Column - minimal width
  {
    accessorKey: 'id',
    header: 'ID',
    size: 55,
    minSize: 55,
    maxSize: 55,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        #{row.original.id}
      </span>
    )
  },

  // Image Column
  {
    accessorKey: 'imageUrl',
    header: '',
    size: 52,
    minSize: 52,
    maxSize: 52,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl
      return (
        <div className="flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-9 w-9 rounded-lg object-cover bg-muted ring-1 ring-border/50"
              loading="lazy"
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center ring-1 ring-border/30">
              <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
        </div>
      )
    }
  },

  // Title & Description Column - primary focus
  {
    accessorKey: 'title',
    header: 'Event',
    size: 320,
    minSize: 200,
    enableSorting: true,
    filterFn: multiColumnFilterFn,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-0.5 min-w-0 py-1">
          <span
            className="font-medium text-sm truncate"
            title={row.original.title}
          >
            {row.original.title}
          </span>
          {row.original.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[280px]">
              {row.original.description}
            </span>
          )}
        </div>
      )
    }
  },

  // Organization Column - show name if available
  {
    accessorKey: 'organizationId',
    header: 'Organization',
    size: 160,
    minSize: 120,
    enableSorting: false,
    cell: ({ row }) => {
      const org = row.original.organization
      return (
        <div className="flex items-center gap-2 min-w-0">
          {org?.imageUrl ? (
            <img
              src={org.imageUrl}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 rounded-full object-cover bg-muted ring-1 ring-border/30"
              loading="lazy"
            />
          ) : (
            <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {org?.title?.[0]?.toUpperCase() || '#'}
            </div>
          )}
          <span className="text-sm truncate" title={org?.title}>
            {org?.title || `Org #${row.original.organizationId}`}
          </span>
        </div>
      )
    }
  },

  // Location Column
  {
    accessorKey: 'location',
    header: 'Location',
    size: 150,
    minSize: 100,
    enableSorting: false,
    cell: ({ row }) => {
      const location = row.original.location
      if (!location || location === 'TBD') {
        return <span className="text-xs text-muted-foreground/60 italic">TBD</span>
      }
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
          <span className="text-sm truncate" title={location}>
            {location}
          </span>
        </div>
      )
    }
  },

  // Date Column - compact with relative time
  {
    accessorKey: 'startTime',
    header: 'Date',
    size: 120,
    minSize: 100,
    enableSorting: true,
    cell: ({ row }) => {
      const startTime = row.original.startTime
      if (!startTime) return <span className="text-muted-foreground">-</span>

      try {
        const date = new Date(startTime)
        const relative = getRelativeTime(startTime)

        // Format: "Jan 15" or "Jan 15, 2024" if different year
        const now = new Date()
        const sameYear = date.getFullYear() === now.getFullYear()
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          ...(sameYear ? {} : { year: 'numeric' })
        })

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <CalendarDaysIcon className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
              <span className="text-sm font-medium tabular-nums">{dateStr}</span>
            </div>
            {relative.text && (
              <span
                className={cn(
                  'text-xs font-medium pl-5',
                  relative.isUpcoming && 'text-status-upcoming',
                  relative.isPast && 'text-muted-foreground/60'
                )}
              >
                {relative.text}
              </span>
            )}
          </div>
        )
      } catch {
        return <span className="text-muted-foreground">-</span>
      }
    }
  },

  // Status Column - event lifecycle status
  {
    id: 'status',
    header: 'Status',
    size: 120,
    minSize: 110,
    maxSize: 140,
    enableSorting: false,
    cell: ({ row }) => {
      const status = getEventStatus(row.original.startTime, row.original.endTime)
      return <EventStatusBadge status={status} />
    }
  },

  // Format Column
  {
    accessorKey: 'format',
    header: 'Format',
    size: 95,
    minSize: 95,
    maxSize: 95,
    enableSorting: false,
    filterFn: formatFilterFn,
    cell: ({ row }) => {
      const eventFormat = row.original.format

      if (eventFormat === EventFormat.ONLINE) {
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 text-xs font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </Badge>
        )
      }

      if (eventFormat === EventFormat.OFFLINE) {
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 text-xs font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            Offline
          </Badge>
        )
      }

      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Unknown
        </Badge>
      )
    }
  }
]
