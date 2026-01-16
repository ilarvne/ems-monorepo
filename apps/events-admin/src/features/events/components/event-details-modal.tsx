import { Suspense, useState } from 'react'
import { useMutation, useSuspenseQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  GlobeIcon,
  ImageIcon,
  Loader2,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  XIcon
} from 'lucide-react'
import { format, parseISO, isSameDay, formatDistanceToNow } from 'date-fns'

import { getEvent, updateEvent, deleteEvent, EventFormat } from '@repo/proto'

import { Button, buttonVariants } from '@repo/ui/components/button'
import { Badge } from '@repo/ui/components/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@repo/ui/components/dialog'
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
import { Skeleton } from '@repo/ui/components/skeleton'
import { cn } from '@repo/ui/lib/utils'

import { NotebookEditor } from '@/components/notebook-editor'
import { CreateEventForm } from './create-event-form'

// ============================================================================
// HELPERS
// ============================================================================

function formatEventDate(startTime: string, endTime?: string): string {
  const start = parseISO(startTime)
  const end = endTime ? parseISO(endTime) : start

  if (isSameDay(start, end)) {
    return format(start, 'EEEE, MMMM d, yyyy')
  }

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMMM d')} – ${format(end, 'd, yyyy')}`
    }
    return `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`
  }
  return `${format(start, 'MMMM d, yyyy')} – ${format(end, 'MMMM d, yyyy')}`
}

function formatEventTime(startTime: string, endTime?: string): string | null {
  const start = parseISO(startTime)
  const end = endTime ? parseISO(endTime) : null

  const startHours = start.getHours()
  const startMinutes = start.getMinutes()
  const endHours = end?.getHours() ?? 0
  const endMinutes = end?.getMinutes() ?? 0

  if (startHours === 0 && startMinutes === 0 && endHours === 23 && endMinutes === 59) {
    return null
  }

  const startFormatted = format(start, 'h:mm a')
  if (!end || isSameDay(start, end)) {
    const endFormatted = end ? format(end, 'h:mm a') : null
    return endFormatted ? `${startFormatted} – ${endFormatted}` : startFormatted
  }

  return startFormatted
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  return formatDistanceToNow(date, { addSuffix: true })
}

// ============================================================================
// EVENT DETAILS CONTENT
// ============================================================================

interface EventDetailsContentProps {
  eventId: number
  onClose: () => void
}

function EventDetailsContent({ eventId, onClose }: EventDetailsContentProps) {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [isDescriptionEditorOpen, setIsDescriptionEditorOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const queryClient = useQueryClient()

  const { data } = useSuspenseQuery(getEvent, { id: eventId })
  const event = data?.event

  const descriptionMutation = useMutation(updateEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success('Description updated')
      setIsDescriptionEditorOpen(false)
    },
    onError: () => {
      toast.error('Failed to update description')
    }
  })

  const deleteMutation = useMutation(deleteEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success('Event deleted')
      setIsDeleteDialogOpen(false)
      onClose()
    },
    onError: () => {
      toast.error('Failed to delete event')
    }
  })

  const handleCopyLink = () => {
    const url = `${window.location.origin}/events/${eventId}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  const handleOpenDescriptionEditor = () => {
    setDescriptionDraft(event?.description || '')
    setIsDescriptionEditorOpen(true)
  }

  const handleSaveDescription = async () => {
    if (!event) return

    await descriptionMutation.mutateAsync({
      id: event.id,
      title: event.title,
      description: descriptionDraft,
      format: event.format,
      location: event.location || '',
      startTime: event.startTime,
      endTime: event.endTime || event.startTime
    })
  }

  const handleDelete = async () => {
    if (!event) return
    await deleteMutation.mutateAsync({ id: event.id })
  }

  if (!event) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Event not found</p>
      </div>
    )
  }

  const timeDisplay = formatEventTime(event.startTime, event.endTime)
  const relativeTime = getRelativeTime(event.startTime)
  const org = event.organization

  // Prepare initial values for edit form
  const startDate = new Date(event.startTime)
  const endDate = event.endTime ? new Date(event.endTime) : new Date(event.startTime)
  const isAllDay =
    startDate.getHours() === 0 &&
    startDate.getMinutes() === 0 &&
    endDate.getHours() === 23 &&
    endDate.getMinutes() === 59

  const editFormInitialValues = {
    title: event.title,
    description: event.description || '',
    format: event.format,
    location: event.location || '',
    virtualLink: '',
    hasTime: !isAllDay,
    startDate,
    endDate,
    startTime: isAllDay ? '' : format(startDate, 'HH:mm'),
    endTime: isAllDay ? '' : format(endDate, 'HH:mm'),
    organizationIds: event.organization ? [event.organization.id] : [],
    tags: []
  }

  return (
    <>
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          <DialogTitle className="text-lg font-semibold leading-tight">{event.title}</DialogTitle>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLink} aria-label="Copy link">
            <CopyIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsEditFormOpen(true)}
            aria-label="Edit event"
          >
            <PencilIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setIsDeleteDialogOpen(true)}
            aria-label="Delete event"
          >
            <Trash2Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close" className="h-8 w-8" onClick={onClose}>
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Content - scrollable area */}
      <div className="overflow-y-auto">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr,280px]">
            {/* LEFT: Image + Description */}
            <div className="space-y-4">
              {/* Cover Image - smaller with edit button */}
              <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt=""
                    width={400}
                    height={160}
                    className="aspect-[5/2] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[5/2] w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" aria-hidden="true" />
                    <span className="text-xs">No cover image</span>
                  </div>
                )}

              </div>

              {/* Description - Clickable to open editor */}
              <button
                type="button"
                onClick={handleOpenDescriptionEditor}
                className="w-full rounded-lg border bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h3>
                {event.description ? (
                  <div
                    className="prose prose-sm prose-neutral dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Click to add a description...</p>
                )}
              </button>
            </div>

            {/* RIGHT: Sidebar with metadata */}
            <div className="space-y-4">
              {/* Date & Time */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{formatEventDate(event.startTime, event.endTime)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium">{timeDisplay || 'All day'}</p>
                  </div>
                </div>
              </div>

              {/* Format & Location */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {event.format === EventFormat.ONLINE ? (
                      <GlobeIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <MapPinIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                    )}
                    <span className="text-sm">{event.format === EventFormat.ONLINE ? 'Online' : 'In Person'}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      event.format === EventFormat.ONLINE
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    )}
                  >
                    {event.format === EventFormat.ONLINE ? 'Virtual' : 'Physical'}
                  </Badge>
                </div>
                {event.location && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <p className="text-sm">{event.location}</p>
                  </div>
                )}
              </div>

              {/* Organization */}
              {org && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-2">Organized by</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={org.imageUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-sm">{org.title?.[0]?.toUpperCase() || 'O'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{org.title}</span>
                  </div>
                </div>
              )}

              {/* Event ID */}
              <div className="text-center">
                <span className="text-xs text-muted-foreground font-mono">Event #{event.id}</span>
              </div>
            </div>
          </div>
        </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent style={{ overscrollBehavior: 'contain' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{event.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Description Editor Popup */}
      <Dialog open={isDescriptionEditorOpen} onOpenChange={setIsDescriptionEditorOpen}>
      <DialogContent
        className="grid max-h-[90vh] w-[min(900px,calc(100vw-2rem))] grid-rows-[auto_1fr] gap-0 overflow-hidden p-0"
        style={{ overscrollBehavior: 'contain' }}
        showCloseButton={false}
      >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <DialogTitle>Edit Description</DialogTitle>
              <DialogDescription className="text-xs">Use the toolbar to format your text</DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={() => setIsDescriptionEditorOpen(false)}
            >
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <NotebookEditor
              value={descriptionDraft}
              onChange={setDescriptionDraft}
              placeholder="Write your event description..."
              minHeight="300px"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDescriptionEditorOpen(false)}
              disabled={descriptionMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveDescription} disabled={descriptionMutation.isPending}>
              {descriptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {descriptionMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Form */}
      <CreateEventForm
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        eventId={event.id}
        initialValues={editFormInitialValues}
      />
    </>
  )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function EventDetailsSkeleton() {
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      <div className="overflow-y-auto p-6">
        <div className="grid gap-6 md:grid-cols-[1fr,280px]">
          <div className="space-y-4">
            <Skeleton className="aspect-[5/2] w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// MAIN MODAL COMPONENT (with trigger)
// ============================================================================

interface EventDetailsModalProps {
  eventId: number
  children: React.ReactNode
}

export function EventDetailsModal({ eventId, children }: EventDetailsModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{children}</div>
      <DialogContent
        className="flex max-h-[90vh] w-[min(900px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
        style={{ overscrollBehavior: 'contain' }}
        showCloseButton={false}
      >
        <Suspense fallback={<EventDetailsSkeleton />}>
          <EventDetailsContent eventId={eventId} onClose={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// CONTROLLED VERSION (for external state management)
// ============================================================================

interface EventDetailsModalControlledProps {
  eventId: number | null
  onClose: () => void
}

export function EventDetailsModalControlled({ eventId, onClose }: EventDetailsModalControlledProps) {
  if (!eventId) return null

  return (
    <Dialog open={!!eventId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[90vh] w-[min(900px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
        style={{ overscrollBehavior: 'contain' }}
        showCloseButton={false}
      >
        <Suspense fallback={<EventDetailsSkeleton />}>
          <EventDetailsContent eventId={eventId} onClose={onClose} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}
