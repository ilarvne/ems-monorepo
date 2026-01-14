'use client'

import * as React from 'react'
import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listEventsForAdmin, getTopPerformingEvents, getLowRegistrationEvents, getOrganizationActivity } from '@repo/proto'
import { Calendar, Clock, CheckCircle2, Timer, XCircle, ImageIcon, TrendingUp, AlertTriangle, Building2 } from 'lucide-react'
import { type ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { topPerformingEventsColumns } from '@/features/events/top-performing-events.columns'
import { lowRegistrationEventsColumns } from '@/features/events/low-registration-events.columns'
import { organizationActivityColumns } from '@/features/events/organization-activity.columns'

interface Event {
  id: number
  title: string
  imageUrl?: string
  startTime: string
  endTime: string
  totalRegistrations: number
  totalAttendees: number
  organization?: { 
    id: number
    title: string
    imageUrl?: string
  }
  tags?: Array<{
    id: number
    name: string
  }>
}

function getEventStatus(startTime: string, endTime: string): 'upcoming' | 'in-progress' | 'completed' {
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'in-progress'
  return 'completed'
}

function StatusBadge({ status }: { status: 'upcoming' | 'in-progress' | 'completed' }) {
  const variants = {
    upcoming: { icon: Clock, label: 'Upcoming', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    'in-progress': { icon: Timer, label: 'In Progress', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    completed: { icon: CheckCircle2, label: 'Completed', className: 'bg-green-500/10 text-green-500 border-green-500/20' }
  }

  const { icon: Icon, label, className } = variants[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 size-3" />
      {label}
    </Badge>
  )
}

function ConversionProgress({ registrations, attendees }: { registrations: number; attendees: number }) {
  const rate = registrations > 0 ? (attendees / registrations) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 space-y-1">
        <Progress value={rate} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{attendees} attended</span>
          <span>{registrations} registered</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">{rate.toFixed(1)}%</div>
        <div className="text-xs text-muted-foreground">conversion</div>
      </div>
    </div>
  )
}

const columns: ColumnDef<Event>[] = [
  {
    accessorKey: 'title',
    header: 'Event',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-12 rounded-lg">
          <AvatarImage src={row.original.imageUrl} alt={row.original.title} className="object-cover" />
          <AvatarFallback className="rounded-lg">
            <ImageIcon className="size-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <div className="font-medium">{row.original.title}</div>
          {row.original.tags && row.original.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs px-1.5 py-0">
                  {tag.name}
                </Badge>
              ))}
              {row.original.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  +{row.original.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
  {
    accessorKey: 'organization',
    header: 'Organization',
    cell: ({ row }) => {
      const org = row.original.organization
      if (!org) return null
      
      return (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarImage src={org.imageUrl} alt={org.title} />
            <AvatarFallback className="text-xs">
              {org.title.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{org.title}</span>
        </div>
      )
    }
  },
  {
    accessorKey: 'startTime',
    header: 'Date & Time',
    cell: ({ row }) => {
      const start = new Date(row.original.startTime)
      return (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 text-muted-foreground" />
          <div>
            <div>{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div className="text-xs text-muted-foreground">
              {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = getEventStatus(row.original.startTime, row.original.endTime)
      return <StatusBadge status={status} />
    }
  },
  {
    accessorKey: 'conversion',
    header: 'Attendance Conversion',
    cell: ({ row }) => (
      <ConversionProgress 
        registrations={row.original.totalRegistrations} 
        attendees={row.original.totalAttendees} 
      />
    )
  }
]

export function EventAnalytics() {
  'use no memo'
  
  // Pre-fetch all data at parent level to avoid suspense on tab switch
  const recentEventsQuery = useSuspenseQuery(listEventsForAdmin, {
    page: 1,
    limit: 10
  })
  
  const topPerformingQuery = useSuspenseQuery(getTopPerformingEvents, {
    limit: 10,
    days: 90
  })
  
  const lowRegistrationQuery = useSuspenseQuery(getLowRegistrationEvents, {
    threshold: 50,
    daysAhead: 30
  })
  
  const organizationActivityQuery = useSuspenseQuery(getOrganizationActivity, {
    limit: 10
  })
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Calendar className='size-5' />
          Event Analytics
        </CardTitle>
        <CardDescription>View recent events, top performers, promotion opportunities, and organization activity</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recent">Recent Events</TabsTrigger>
            <TabsTrigger value="top-performing">
              <TrendingUp className="mr-2 size-4" />
              Top Performing
            </TabsTrigger>
            <TabsTrigger value="low-registration">
              <AlertTriangle className="mr-2 size-4" />
              Needs Promotion
            </TabsTrigger>
            <TabsTrigger value="organization-activity">
              <Building2 className="mr-2 size-4" />
              Organizations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="mt-4">
            <RecentEventsView data={recentEventsQuery.data} />
          </TabsContent>
          
          <TabsContent value="top-performing" className="mt-4">
            <TopPerformingEventsView data={topPerformingQuery.data} />
          </TabsContent>
          
          <TabsContent value="low-registration" className="mt-4">
            <LowRegistrationEventsView data={lowRegistrationQuery.data} />
          </TabsContent>
          
          <TabsContent value="organization-activity" className="mt-4">
            <OrganizationActivityView data={organizationActivityQuery.data} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function RecentEventsView({ data }: { data: any }) {
  'use no memo'
  
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'startTime', desc: true }
  ])

  const events = (data?.events || []) as Event[]

  const table = useReactTable({
    data: events,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="size-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No events found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TopPerformingEventsView({ data }: { data: any }) {
  'use no memo'
  
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'attendanceRate', desc: true }
  ])

  const events = React.useMemo(() => (data?.events || []) as any[], [data])

  const table = useReactTable({
    data: events,
    columns: topPerformingEventsColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="size-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No top performing events found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LowRegistrationEventsView({ data }: { data: any }) {
  'use no memo'
  
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'daysUntilEvent', desc: false }
  ])

  const events = React.useMemo(() => (data?.events || []) as any[], [data])

  const table = useReactTable({
    data: events,
    columns: lowRegistrationEventsColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="size-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No events with low registration found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function OrganizationActivityView({ data }: { data: any }) {
  'use no memo'
  
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'eventsThisMonth', desc: true }
  ])

  const organizations = React.useMemo(() => (data?.organizations || []) as any[], [data])

  const table = useReactTable({
    data: organizations,
    columns: organizationActivityColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="size-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No organization activity found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
