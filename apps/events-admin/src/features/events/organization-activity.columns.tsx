import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Calendar, TrendingUp, Building2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface OrganizationActivity {
  id: number
  title: string
  imageUrl?: string
  eventsThisMonth: number
  eventsLastMonth: number
  totalEvents: number
  averageAttendance: number
  growthRate: number
}

export const organizationActivityColumns: ColumnDef<OrganizationActivity>[] = [
  {
    accessorKey: 'title',
    header: 'Organization',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={row.original.imageUrl} alt={row.original.title} />
          <AvatarFallback>
            <Building2 className="size-4 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">{row.original.title}</span>
          <span className="text-xs text-muted-foreground">{row.original.totalEvents} total events</span>
        </div>
      </div>
    )
  },
  {
    accessorKey: 'eventsThisMonth',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        <Calendar className="mr-2 size-4" />
        This Month
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <Badge variant="default" className="min-w-[40px] justify-center">
          {row.original.eventsThisMonth}
        </Badge>
      </div>
    )
  },
  {
    accessorKey: 'eventsLastMonth',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        Last Month
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <Badge variant="secondary" className="min-w-[40px] justify-center">
          {row.original.eventsLastMonth}
        </Badge>
      </div>
    )
  },
  {
    accessorKey: 'growthRate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        <TrendingUp className="mr-2 size-4" />
        Growth
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const growth = row.original.growthRate
      const isPositive = growth > 0
      const isNeutral = growth === 0
      
      return (
        <div className="flex items-center gap-2">
          <Badge 
            variant={isPositive ? 'default' : isNeutral ? 'secondary' : 'outline'}
            className={isPositive ? 'bg-green-500/10 text-green-500 border-green-500/20' : isNeutral ? '' : 'bg-red-500/10 text-red-500 border-red-500/20'}
          >
            {isPositive && '+'}{growth.toFixed(1)}%
          </Badge>
        </div>
      )
    }
  },
  {
    accessorKey: 'averageAttendance',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-2"
      >
        Avg Attendance
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.averageAttendance.toFixed(1)}%
      </div>
    )
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const eventsThisMonth = row.original.eventsThisMonth
      const growth = row.original.growthRate
      
      let status: 'active' | 'growing' | 'declining' | 'inactive' = 'inactive'
      if (eventsThisMonth === 0) {
        status = 'inactive'
      } else if (growth > 20) {
        status = 'growing'
      } else if (growth < -20) {
        status = 'declining'
      } else {
        status = 'active'
      }
      
      const variants = {
        active: { label: 'Active', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
        growing: { label: 'Growing', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
        declining: { label: 'Declining', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
        inactive: { label: 'Inactive', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
      }
      
      const { label, className } = variants[status]
      
      return (
        <Badge variant="outline" className={className}>
          {label}
        </Badge>
      )
    }
  }
]
