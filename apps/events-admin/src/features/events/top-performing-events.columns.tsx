import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, TrendingUp, Users, Calendar } from 'lucide-react'

import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar'
import { Progress } from '@repo/ui/components/progress'

interface TopPerformingEvent {
  id: number
  title: string
  imageUrl?: string
  organization?: {
    id: number
    title: string
    imageUrl?: string
  }
  startTime: string
  totalRegistrations: number
  totalAttendees: number
  attendanceRate: number
}

export const topPerformingEventsColumns: ColumnDef<TopPerformingEvent>[] = [
  {
    accessorKey: 'title',
    header: 'Event',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-10 rounded-lg">
          <AvatarImage src={row.original.imageUrl} alt={row.original.title} className="object-cover" />
          <AvatarFallback className="rounded-lg">
            <Calendar className="size-4 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate" title={row.original.title}>{row.original.title}</span>
          {row.original.organization && (
            <span className="text-xs text-muted-foreground truncate" title={row.original.organization.title}>{row.original.organization.title}</span>
          )}
        </div>
      </div>
    )
  },
  {
    accessorKey: 'startTime',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        Date
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.startTime)
      return (
        <div className="text-sm">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )
    }
  },
  {
    accessorKey: 'totalRegistrations',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        <Users className="mr-2 size-4" />
        Registrations
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.totalRegistrations}</div>
    )
  },
  {
    accessorKey: 'totalAttendees',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        <Users className="mr-2 size-4" />
        Attendees
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.original.totalAttendees}</div>
    )
  },
  {
    accessorKey: 'attendanceRate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        <TrendingUp className="mr-2 size-4" />
        Attendance Rate
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const rate = row.original.attendanceRate
      const variant = rate >= 80 ? 'default' : rate >= 60 ? 'secondary' : 'outline'
      
      return (
        <div className="flex items-center gap-3">
          <Progress value={rate} className="h-2 w-24" />
          <Badge variant={variant} className="min-w-[60px] justify-center">
            {rate.toFixed(1)}%
          </Badge>
        </div>
      )
    }
  }
]
