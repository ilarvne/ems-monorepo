'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { Circle, Clock, Calendar, CheckCircle } from 'lucide-react'

import { cn } from '@repo/ui/lib/utils'

/**
 * Event status types
 */
export type EventStatus = 'live' | 'ongoing' | 'upcoming' | 'today' | 'past'

/**
 * Status badge variants using semantic status colors
 * WCAG AA compliant - never rely on color alone (includes icon + text)
 */
const eventStatusBadgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      status: {
        live: 'bg-status-live/15 text-status-live border-status-live/30 dark:bg-status-live/20 dark:border-status-live/40',
        ongoing:
          'bg-status-ongoing/15 text-status-ongoing border-status-ongoing/30 dark:bg-status-ongoing/20 dark:border-status-ongoing/40',
        upcoming:
          'bg-status-upcoming/15 text-status-upcoming border-status-upcoming/30 dark:bg-status-upcoming/20 dark:border-status-upcoming/40',
        today:
          'bg-status-today/15 text-status-today border-status-today/30 dark:bg-status-today/20 dark:border-status-today/40',
        past: 'bg-status-past/15 text-status-past border-status-past/30 dark:bg-status-past/20 dark:border-status-past/40'
      }
    },
    defaultVariants: {
      status: 'upcoming'
    }
  }
)

/**
 * Icon component for each status
 */
function StatusIcon({ status, className }: { status: EventStatus; className?: string }) {
  const iconClass = cn('size-3', className)

  switch (status) {
    case 'live':
      // Pulsing dot only for live events
      return (
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-live opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-status-live" />
        </span>
      )
    case 'ongoing':
      // Static dot for ongoing events (no animation)
      return <span className="inline-flex size-2.5 rounded-full bg-status-ongoing" />
    case 'today':
      return <Clock className={iconClass} />
    case 'upcoming':
      return <Calendar className={iconClass} />
    case 'past':
      return <CheckCircle className={iconClass} />
    default:
      return <Circle className={iconClass} />
  }
}

/**
 * Human-readable label for each status
 */
function getStatusLabel(status: EventStatus): string {
  switch (status) {
    case 'live':
      return 'Live Now'
    case 'ongoing':
      return 'Ongoing'
    case 'today':
      return 'Today'
    case 'upcoming':
      return 'Upcoming'
    case 'past':
      return 'Past'
    default:
      return status
  }
}

interface EventStatusBadgeProps extends VariantProps<typeof eventStatusBadgeVariants> {
  /** Event status */
  status: EventStatus
  /** Show icon before text (default: true) */
  showIcon?: boolean
  /** Show text label (default: true) */
  showLabel?: boolean
  /** Custom label text */
  label?: string
  /** Additional className */
  className?: string
}

/**
 * Event status badge component with semantic colors and accessibility features.
 *
 * Features:
 * - WCAG AA compliant colors
 * - Icon + text (not color alone) for accessibility
 * - Animated pulse for live status only
 * - Consistent styling across light/dark modes
 *
 * @example
 * ```tsx
 * <EventStatusBadge status="live" />
 * <EventStatusBadge status="upcoming" showIcon={false} />
 * <EventStatusBadge status="past" label="Completed" />
 * ```
 */
export function EventStatusBadge({
  status,
  showIcon = true,
  showLabel = true,
  label,
  className
}: EventStatusBadgeProps) {
  const displayLabel = label ?? getStatusLabel(status)

  return (
    <span
      className={cn(eventStatusBadgeVariants({ status }), className)}
      role="status"
      aria-label={`Event status: ${displayLabel}`}
    >
      {showIcon && <StatusIcon status={status} />}
      {showLabel && <span>{displayLabel}</span>}
    </span>
  )
}

export { eventStatusBadgeVariants }
