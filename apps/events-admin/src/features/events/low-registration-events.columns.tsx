import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, AlertTriangle, Calendar, Users, Clock } from 'lucide-react'

import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar'
import { Progress } from '@repo/ui/components/progress'

interface LowRegistrationEvent {
  id: number
  title: string
  imageUrl?: string
  organization?: {
    id: number
    title: string
    imageUrl?: string
  }
  startTime: string
  capacity: number
  totalRegistrations: number
  capacityUtilization: number
  daysUntilEvent: number
}

export const lowRegistrationEventsColumns: ColumnDef<LowRegistrationEvent>[] = [
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
        <div className="flex flex-col">
          <span className="font-medium">{row.original.title}</span>
          {row.original.organization && (
            <span className="text-xs text-muted-foreground">{row.original.organization.title}</span>
          )}
        </div>
      </div>
    )
  },
  {
    accessorKey: 'daysUntilEvent',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        <Clock className="mr-2 size-4" />
        Days Until
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const days = row.original.daysUntilEvent
      const isUrgent = days <= 7
      
      return (
        <div className="flex items-center gap-2">
          {isUrgent && <AlertTriangle className="size-4 text-orange-500" />}
          <Badge variant={isUrgent ? 'destructive' : 'secondary'}>
            {days} {days === 1 ? 'day' : 'days'}
          </Badge>
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
      <div className="text-center">
        <div className="font-medium">{row.original.totalRegistrations}</div>
        <div className="text-xs text-muted-foreground">of {row.original.capacity}</div>
      </div>
    )
  },
  {
    accessorKey: 'capacityUtilization',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        Capacity Utilization
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const utilization = row.original.capacityUtilization
      const variant = utilization < 30 ? 'destructive' : utilization < 50 ? 'secondary' : 'default'
      
      return (
        <div className="flex items-center gap-3">
          <Progress value={utilization} className="h-2 w-24" />
          <Badge variant={variant} className="min-w-[60px] justify-center">
            {utilization.toFixed(1)}%
          </Badge>
        </div>
      )
    }
  },
  {
    id: 'urgency',
    header: 'Priority',
    cell: ({ row }) => {
      const utilization = row.original.capacityUtilization
      const days = row.original.daysUntilEvent
      
      let priority: 'high' | 'medium' | 'low' = 'low'
      if ((utilization < 30 && days <= 7) || (utilization < 50 && days <= 3)) {
        priority = 'high'
      } else if (utilization < 50 && days <= 14) {
        priority = 'medium'
      }
      
      const variants = {
        high: { label: 'High', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
        medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
        low: { label: 'Low', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' }
      }
      
      const { label, className } = variants[priority]
      
      return (
        <Badge variant="outline" className={className}>
          {label}
        </Badge>
      )
    }
  }
]
