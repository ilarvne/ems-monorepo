import type { Event } from '@repo/proto'
import { EventFormat } from '@repo/proto'
import type { Row } from '@tanstack/react-table'
import { Calendar, MapPin, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

const formatDate = (dateString: string, includeTime = false) => {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return new Intl.DateTimeFormat('en-US', options).format(date)
}

interface EventCardProps {
  row: Row<Event>
}

/**
 * Mobile-friendly card view for an event row
 */
export function EventCard({ row }: EventCardProps) {
  const event = row.original
  const eventFormat = event.format

  return (
    <Card className='relative'>
      <CardHeader className='flex flex-row items-start gap-3 pb-2'>
        {/* Selection checkbox */}
        <Checkbox
          aria-label='Select event'
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          className='mt-1'
        />
        
        {/* Event image */}
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className='h-16 w-16 rounded-md object-cover'
          />
        ) : (
          <div className='h-16 w-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground'>
            No image
          </div>
        )}

        {/* Title and description */}
        <div className='flex-1 min-w-0'>
          <h3 className='font-medium text-sm leading-tight line-clamp-2'>{event.title}</h3>
          {event.description && (
            <p className='text-xs text-muted-foreground line-clamp-2 mt-1'>
              {event.description}
            </p>
          )}
        </div>

        {/* Format badge */}
        {eventFormat === EventFormat.ONLINE ? (
          <Badge variant='secondary' className='gap-1 bg-[#F3F3F3] text-black shrink-0'>
            <span className='h-2 w-2 rounded-full bg-blue-500' />
            Online
          </Badge>
        ) : eventFormat === EventFormat.OFFLINE ? (
          <Badge variant='secondary' className='gap-1 bg-[#F3F3F3] text-black shrink-0'>
            <span className='h-2 w-2 rounded-full bg-green-500' />
            Offline
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className='pt-0'>
        <div className='flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground'>
          {/* Date & Time */}
          <div className='flex items-center gap-1'>
            <Calendar className='h-3.5 w-3.5' />
            <span>{formatDate(event.startTime, true)}</span>
          </div>

          {/* Location */}
          {event.location && (
            <div className='flex items-center gap-1'>
              <MapPin className='h-3.5 w-3.5' />
              <span className='line-clamp-1'>{event.location}</span>
            </div>
          )}

          {/* Organization */}
          <div className='flex items-center gap-1'>
            <Users className='h-3.5 w-3.5' />
            <span>Org #{event.organizationId}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface EventCardListProps {
  rows: Row<Event>[]
}

/**
 * Mobile card list for events - shows instead of table on small screens
 */
export function EventCardList({ rows }: EventCardListProps) {
  if (rows.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        No events found.
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-3'>
      {rows.map((row) => (
        <EventCard key={row.id} row={row} />
      ))}
    </div>
  )
}
