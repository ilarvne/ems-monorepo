import { useMutation, useSuspenseQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { listEventsForAdmin, deleteEvent, EventFormat, type Event } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { type RowSelectionState } from '@tanstack/react-table'
import { PlusIcon, UploadIcon, FilterIcon, Trash2Icon, DownloadIcon, XIcon, ChevronRightIcon, CheckIcon, SearchIcon, Loader2Icon } from 'lucide-react'
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryState, useQueryStates } from 'nuqs'
import { Suspense, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@repo/ui/components/alert-dialog'
import { Badge } from '@repo/ui/components/badge'
import { Button, buttonVariants } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
import { FloatingActionBar } from '@repo/ui/components/floating-action-bar'
import { Input } from '@repo/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover'
import { ScrollArea } from '@repo/ui/components/scroll-area'
import { Skeleton } from '@repo/ui/components/skeleton'
import { cn } from '@repo/ui/lib/utils'

import { DataTable } from '@/components/admin-data-table'
import { columns } from '@/features/events/events.columns'
import { SimpleEventCardList } from '@/features/events/event-card'
import { CreateEventForm } from '@/features/events/components/create-event-form'
import { ExcelImportDialog } from '@/features/events/components/excel-import-dialog'
import { EventDetailsModalControlled } from '@/features/events/components'
import { exportEventsToExcel, exportSelectedEventsToExcel } from '@/lib/excel-export'

export const Route = createFileRoute('/_authenticated/events')({
  component: () => (
    <Suspense fallback={<EventsLoading />}>
      <Events />
    </Suspense>
  )
})

function EventsLoading() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-60" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex gap-4 border-b pb-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between gap-8">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Status filter options
const statusOptions = [
  { value: 'live', label: 'Live' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' }
]

// Helper to determine event status
function getEventStatus(event: Event): 'live' | 'today' | 'upcoming' | 'past' {
  const now = new Date()
  const startTime = new Date(event.startTime)
  const endTime = event.endTime ? new Date(event.endTime) : startTime

  // Check if event is currently live
  if (now >= startTime && now <= endTime) {
    return 'live'
  }

  // Check if event is today (but not live)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  if (startTime >= todayStart && startTime < todayEnd && now < startTime) {
    return 'today'
  }

  // Check if event is in the past
  if (endTime < now) {
    return 'past'
  }

  // Otherwise it's upcoming
  return 'upcoming'
}

// Format filter options
const formatOptions = [
  { value: EventFormat.ONLINE, label: 'Online' },
  { value: EventFormat.OFFLINE, label: 'Offline' }
]

function Events() {
  const queryClient = useQueryClient()
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
  // Bulk delete confirmation state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<number[]>([])

  // Delete mutation
  const deleteMutation = useMutation(deleteEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
    },
    onError: () => {
      toast.error('Failed to delete event')
    }
  })

  // Additional filter state for format
  const [formatFilter, setFormatFilter] = useQueryState(
    'format',
    parseAsArrayOf(parseAsInteger).withDefault([])
  )

  // Status filter state (upcoming, today, past, live)
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsArrayOf(parseAsString).withDefault([])
  )

  // Organization filter state
  const [orgFilter, setOrgFilter] = useQueryState(
    'org',
    parseAsArrayOf(parseAsInteger).withDefault([])
  )

  // Action trigger from URL
  const [actionState, setActionState] = useQueryStates({
    action: parseAsString.withDefault('')
  })

  // Derive dialog open state from URL action OR local state
  const isCreateFromUrl = actionState.action === 'create'
  const isImportFromUrl = actionState.action === 'import'

  // Dialog handlers that clear URL action when closing
  const handleCreateDialogChange = useCallback(
    (open: boolean) => {
      setIsCreateDialogOpen(open)
      if (!open && isCreateFromUrl) {
        setActionState({ action: null })
      }
    },
    [isCreateFromUrl, setActionState]
  )

  const handleImportDialogChange = useCallback(
    (open: boolean) => {
      setIsImportDialogOpen(open)
      if (!open && isImportFromUrl) {
        setActionState({ action: null })
      }
    },
    [isImportFromUrl, setActionState]
  )

  // Count of active format/status/org filters for filter badge
  const activeFilterCount = formatFilter.length + statusFilter.length + orgFilter.length

  // Always fetch all events for client-side pagination and filtering
  const { data } = useSuspenseQuery(listEventsForAdmin, {
    limit: 1000,
    page: 1
  })

  // Extract unique organizations from events
  const organizationOptions = useMemo(() => {
    const orgMap = new Map<number, string>()
    data.events.forEach((event) => {
      if (event.organization?.id && event.organization?.title) {
        orgMap.set(event.organization.id, event.organization.title)
      }
    })
    return Array.from(orgMap.entries())
      .map(([id, title]) => ({ value: id, label: title }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data.events])

  // Apply client-side filters for status, format, and organization
  const filteredEvents = useMemo(() => {
    let events = data.events

    // Apply format filter
    if (formatFilter.length > 0) {
      events = events.filter((event) => formatFilter.includes(event.format))
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      events = events.filter((event) => statusFilter.includes(getEventStatus(event)))
    }

    // Apply organization filter
    if (orgFilter.length > 0) {
      events = events.filter((event) => event.organization?.id && orgFilter.includes(event.organization.id))
    }

    return events
  }, [data.events, formatFilter, statusFilter, orgFilter])

  const handleFormatChange = (checked: boolean, value: number) => {
    const newValues = formatFilter ? [...formatFilter] : []
    if (checked) {
      newValues.push(value)
    } else {
      const index = newValues.indexOf(value)
      if (index > -1) {
        newValues.splice(index, 1)
      }
    }
    setFormatFilter(newValues.length ? newValues : null)
  }

  const handleStatusChange = (checked: boolean, value: string) => {
    const newValues = statusFilter ? [...statusFilter] : []
    if (checked) {
      newValues.push(value)
    } else {
      const index = newValues.indexOf(value)
      if (index > -1) {
        newValues.splice(index, 1)
      }
    }
    setStatusFilter(newValues.length ? newValues : null)
  }

  const handleOrgChange = (checked: boolean, value: number) => {
    const newValues = orgFilter ? [...orgFilter] : []
    if (checked) {
      newValues.push(value)
    } else {
      const index = newValues.indexOf(value)
      if (index > -1) {
        newValues.splice(index, 1)
      }
    }
    setOrgFilter(newValues.length ? newValues : null)
  }

  // Handle row click - open event details sheet
  const handleRowClick = useCallback((event: Event) => {
    setSelectedEventId(event.id)
  }, [])

  // Handle row selection change from DataTable
  const handleRowSelectionChange = useCallback((selection: RowSelectionState) => {
    setRowSelection(selection)
  }, [])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setRowSelection({})
  }, [])

  // Get selected event IDs from current selection
  const selectedEventIds = Object.keys(rowSelection).map((id) => parseInt(id, 10))
  const selectedCount = selectedEventIds.length

  // Handle delete selected - opens confirmation dialog
  const handleDeleteSelected = useCallback(
    (ids: (string | number)[]) => {
      setPendingBulkDeleteIds(ids.map((id) => Number(id)))
      setIsBulkDeleteDialogOpen(true)
    },
    []
  )

  // Actually perform the delete after confirmation
  const handleConfirmDelete = useCallback(async () => {
    try {
      // Delete events sequentially to avoid overwhelming the server
      for (const id of pendingBulkDeleteIds) {
        await deleteMutation.mutateAsync({ id })
      }
      toast.success(
        pendingBulkDeleteIds.length === 1
          ? 'Event deleted'
          : `${pendingBulkDeleteIds.length} events deleted`
      )
      setRowSelection({})
      setIsBulkDeleteDialogOpen(false)
      setPendingBulkDeleteIds([])
    } catch {
      // Error is already handled by mutation onError
    }
  }, [pendingBulkDeleteIds, deleteMutation])

  // Handle export all events (exports filtered results when filters are active)
  const handleExportAll = useCallback(async () => {
    try {
      await exportEventsToExcel(filteredEvents)
      toast.success('Export completed', {
        description: `Exported ${filteredEvents.length} events to Excel`
      })
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [filteredEvents])

  // Handle export selected events
  const handleExportSelected = useCallback(async () => {
    try {
      await exportSelectedEventsToExcel(filteredEvents, selectedEventIds)
      toast.success('Export completed', {
        description: `Exported ${selectedEventIds.length} selected events to Excel`
      })
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }, [filteredEvents, selectedEventIds])

  return (
    <div className="p-6 lg:p-8 space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">Manage events and activities</p>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DataTable
          data={filteredEvents}
          columns={columns}
          totalCount={filteredEvents.length}
          hasActiveFilters={true}
          searchColumnId="title"
          searchPlaceholder="Search events..."
          entityName="events"
          defaultSortBy="startTime"
          defaultSortDesc={true}
          enableVirtualization={false}
          enableDensityToggle={true}
          enableMultiSort={true}
          rowSelection={rowSelection}
          onRowClick={handleRowClick}
          onRowSelectionChange={handleRowSelectionChange}
          onDeleteSelected={handleDeleteSelected}
          getRowId={(row) => String(row.id)}
          filterComponents={
            <EventsFilter
              formatFilter={formatFilter}
              statusFilter={statusFilter}
              orgFilter={orgFilter}
              organizationOptions={organizationOptions}
              activeFilterCount={activeFilterCount}
              onFormatChange={handleFormatChange}
              onStatusChange={handleStatusChange}
              onOrgChange={handleOrgChange}
            />
          }
          toolbarActions={
            <>
              <Button variant="outline" size="sm" onClick={handleExportAll} className="h-9">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="h-9">
                <UploadIcon className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="h-9">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </>
          }
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div className="space-y-4">
          {/* Mobile search and actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} size="icon">
              <UploadIcon size={16} />
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="flex-1">
              <PlusIcon className="mr-2" size={16} />
              Add event
            </Button>
          </div>
          <SimpleEventCardList events={data.events} />
        </div>
      </div>

      {/* Floating Action Bar for bulk actions */}
      <FloatingActionBar
        selectedCount={selectedCount}
        totalCount={data.total || 0}
        onClearSelection={handleClearSelection}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportSelected}
          className="gap-2"
        >
          <DownloadIcon className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleDeleteSelected(selectedEventIds)}
          className="gap-2"
        >
          <Trash2Icon className="h-4 w-4" />
          Delete
        </Button>
      </FloatingActionBar>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent style={{ overscrollBehavior: 'contain' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingBulkDeleteIds.length === 1 ? 'Event' : `${pendingBulkDeleteIds.length} Events`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              {pendingBulkDeleteIds.length === 1
                ? 'this event'
                : `these ${pendingBulkDeleteIds.length} events`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deleteMutation.isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <ExcelImportDialog
        open={isImportDialogOpen || isImportFromUrl}
        onOpenChange={handleImportDialogChange}
      />
      <CreateEventForm
        open={isCreateDialogOpen || isCreateFromUrl}
        onOpenChange={handleCreateDialogChange}
      />
      <EventDetailsModalControlled
        eventId={selectedEventId}
        onClose={() => setSelectedEventId(null)}
      />
    </div>
  )
}

// Combined filter component for status, format, and organization
function EventsFilter({
  formatFilter,
  statusFilter,
  orgFilter,
  organizationOptions,
  activeFilterCount,
  onFormatChange,
  onStatusChange,
  onOrgChange
}: {
  formatFilter: number[]
  statusFilter: string[]
  orgFilter: number[]
  organizationOptions: { value: number; label: string }[]
  activeFilterCount: number
  onFormatChange: (checked: boolean, value: number) => void
  onStatusChange: (checked: boolean, value: string) => void
  onOrgChange: (checked: boolean, value: number) => void
}) {
  const [orgSubmenuOpen, setOrgSubmenuOpen] = useState(false)
  const [orgSearch, setOrgSearch] = useState('')

  // Filter organizations by search term
  const filteredOrgs = useMemo(() => {
    if (!orgSearch.trim()) return organizationOptions
    const search = orgSearch.toLowerCase()
    return organizationOptions.filter((org) => org.label.toLowerCase().includes(search))
  }, [organizationOptions, orgSearch])

  // Reset search when submenu closes
  const handleOrgSubmenuChange = (open: boolean) => {
    setOrgSubmenuOpen(open)
    if (!open) setOrgSearch('')
  }

  return (
    <div className="flex items-center gap-2">
      {/* All Filters in One Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-0">
          <div className="p-1">
            {/* Organization - Nested Submenu */}
            {organizationOptions.length > 0 && (
              <Popover open={orgSubmenuOpen} onOpenChange={handleOrgSubmenuChange}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                      orgFilter.length > 0 && 'font-medium'
                    )}
                  >
                    <span>Organization</span>
                    <div className="flex items-center gap-1">
                      {orgFilter.length > 0 && (
                        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                          {orgFilter.length}
                        </Badge>
                      )}
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-64 p-0" sideOffset={2}>
                  <div className="p-2 border-b">
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search organizations..."
                        value={orgSearch}
                        onChange={(e) => setOrgSearch(e.target.value)}
                        className="h-8 pl-8 text-sm"
                      />
                    </div>
                  </div>
                  <ScrollArea className="max-h-64">
                    <div className="p-1">
                      {filteredOrgs.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No organizations found
                        </div>
                      ) : (
                        filteredOrgs.map((org) => {
                          const isSelected = orgFilter.includes(org.value)
                          return (
                            <button
                              key={org.value}
                              onClick={() => onOrgChange(!isSelected, org.value)}
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              <div
                                className={cn(
                                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30'
                                )}
                              >
                                {isSelected && <CheckIcon className="h-3 w-3" />}
                              </div>
                              <span className="truncate">{org.label}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                  {orgFilter.length > 0 && (
                    <div className="border-t p-1">
                      <button
                        onClick={() => orgFilter.forEach((id) => onOrgChange(false, id))}
                        className="flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <XIcon className="h-3 w-3" />
                        Clear all ({orgFilter.length})
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            <div className="my-1 border-t" />

            {/* Status Section */}
            <div className="px-2 py-1">
              <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </div>
              <div className="space-y-0.5">
                {statusOptions.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 hover:bg-accent">
                    <Checkbox
                      checked={statusFilter.includes(option.value)}
                      onCheckedChange={(checked) => onStatusChange(!!checked, option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="my-1 border-t" />

            {/* Format Section */}
            <div className="px-2 py-1">
              <div className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Format
              </div>
              <div className="space-y-0.5">
                {formatOptions.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 hover:bg-accent">
                    <Checkbox
                      checked={formatFilter.includes(option.value)}
                      onCheckedChange={(checked) => onFormatChange(!!checked, option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Filter Badges - Status and Format only (no org badges) */}
      {(statusFilter.length > 0 || formatFilter.length > 0) && (
        <div className="flex items-center gap-1 flex-wrap">
          {/* Status badges */}
          {statusFilter.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="text-xs gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => onStatusChange(false, status)}
            >
              {statusOptions.find((o) => o.value === status)?.label}
              <XIcon className="h-3 w-3" />
            </Badge>
          ))}
          {/* Format badges */}
          {formatFilter.map((format) => (
            <Badge
              key={format}
              variant="secondary"
              className="text-xs gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => onFormatChange(false, format)}
            >
              {formatOptions.find((o) => o.value === format)?.label}
              <XIcon className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
