import type { Event } from '@repo/proto'
import { EventFormat } from '@repo/proto'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { Calendar, MapPin, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

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

// Custom filter functions
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

export const columns: ColumnDef<Event>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 60
  },
  {
    accessorKey: 'imageUrl',
    header: 'Image',
    size: 80,
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl
      return imageUrl ? (
        <img src={imageUrl} alt={row.original.title} className='h-12 w-12 rounded-md object-cover' />
      ) : (
        <div className='h-12 w-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground'>
          No image
        </div>
      )
    }
  },
  {
    accessorKey: 'title',
    header: 'Title',
    size: 250,
    cell: ({ row }) => (
      <div>
        <div className='font-medium'>{row.original.title}</div>
        {row.original.description && (
          <div className='text-sm text-muted-foreground line-clamp-1'>{row.original.description}</div>
        )}
      </div>
    )
  },
  {
    accessorKey: 'organizationId',
    header: 'Organization',
    size: 120,
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5 text-sm'>
        <Users className='h-4 w-4 text-muted-foreground' />
        <span>Org #{row.original.organizationId}</span>
      </div>
    )
  },
  {
    accessorKey: 'location',
    header: 'Location',
    size: 180,
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5 text-sm'>
        <MapPin className='h-4 w-4 text-muted-foreground' />
        <span className='line-clamp-1'>{row.original.location}</span>
      </div>
    )
  },
  {
    accessorKey: 'startTime',
    header: 'Start Time',
    size: 150,
    cell: ({ row }) => (
      <div className='flex items-center gap-1.5 text-sm'>
        <Calendar className='h-4 w-4 text-muted-foreground' />
        <span>{formatDate(row.original.startTime, true)}</span>
      </div>
    )
  },
  {
    accessorKey: 'format',
    header: 'Format',
    size: 100,
    filterFn: formatFilterFn,
    cell: ({ row }) => {
      const eventFormat = row.original.format

      if (eventFormat === EventFormat.ONLINE) {
        return (
          <Badge variant='secondary' className='gap-1 bg-[#F3F3F3] text-black'>
            <span className='h-2 w-2 rounded-full bg-blue-500' />
            Online
          </Badge>
        )
      }

      if (eventFormat === EventFormat.OFFLINE) {
        return (
          <Badge variant='secondary' className='gap-1 bg-[#F3F3F3] text-black'>
            <span className='h-2 w-2 rounded-full bg-green-500' />
            Offline
          </Badge>
        )
      }

      return <Badge variant='outline'>Unknown</Badge>
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    size: 150,
    cell: ({ row }) => <span className='text-sm text-muted-foreground'>{formatDate(row.original.createdAt)}</span>
  }
]
