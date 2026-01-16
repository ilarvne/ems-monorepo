import { Suspense, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useSuspenseQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarIcon, CheckIcon, ChevronsUpDownIcon, Loader2, PencilIcon, X, XIcon } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { createEvent, updateEvent, EventFormat, listOrganizations } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'
import { Button } from '@repo/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/popover'
import { Calendar } from '@repo/ui/components/calendar'
import { Badge } from '@repo/ui/components/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/command'
import { ImageUpload } from '@repo/ui/components/file-upload'
import { Switch } from '@repo/ui/components/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar'
import { cn } from '@repo/ui/lib/utils'
import { handleServerErrors, clearServerError } from '@/lib/form-utils'
import { NotebookEditor } from '@/components/notebook-editor'

// ============================================================================
// FORM SCHEMA
// ============================================================================

const createEventSchema = z
  .object({
    hasTime: z.boolean().default(true),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title must be less than 100 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must be less than 2000 characters'),
    format: z.nativeEnum(EventFormat, {
      errorMap: () => ({ message: 'Please select an event format' }),
    }),
    location: z.string().optional(),
    virtualLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    startDate: z.date({ required_error: 'Start date is required' }),
    endDate: z.date({ required_error: 'End date is required' }),
    organizationIds: z.array(z.number()).min(1, 'Select at least one organization'),
    tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
    coverImage: z.instanceof(File).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasTime) {
      if (!data.startTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Start time is required', path: ['startTime'] })
      }
      if (!data.endTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time is required', path: ['endTime'] })
      }
    }

    const start = new Date(data.startDate)
    const end = new Date(data.endDate)

    if (data.hasTime && data.startTime) {
      const [hours, minutes] = data.startTime.split(':').map(Number)
      start.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    } else {
      start.setHours(0, 0, 0, 0)
    }

    if (data.hasTime && data.endTime) {
      const [hours, minutes] = data.endTime.split(':').map(Number)
      end.setHours(hours ?? 0, minutes ?? 0, 0, 0)
    } else {
      end.setHours(23, 59, 0, 0)
    }

    if (!(end > start)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['endDate'] })
    }
  })
  .refine((data) => !(data.format === EventFormat.OFFLINE && !data.location), {
    message: 'Location is required for in-person events',
    path: ['location'],
  })
  .refine((data) => !(data.format === EventFormat.ONLINE && !data.virtualLink), {
    message: 'Virtual link is required for virtual events',
    path: ['virtualLink'],
  })

type CreateEventFormData = z.infer<typeof createEventSchema>

const defaultValues: Partial<CreateEventFormData> = {
  title: '',
  description: '',
  format: EventFormat.OFFLINE,
  hasTime: true,
  organizationIds: [],
  location: '',
  virtualLink: '',
  tags: [],
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

interface CreateEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId?: number
  initialValues?: Partial<CreateEventFormData>
}

export function CreateEventForm({ open, onOpenChange, eventId, initialValues }: CreateEventFormProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!eventId
  const [tagInput, setTagInput] = useState('')
  const [isDescriptionEditorOpen, setIsDescriptionEditorOpen] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { ...defaultValues, ...initialValues },
    mode: 'onBlur',
  })

  const { isDirty } = form.formState
  const watchFormat = form.watch('format')
  const watchHasTime = form.watch('hasTime')
  const watchTags = form.watch('tags')
  const watchOrganizationIds = form.watch('organizationIds')
  const watchDescription = form.watch('description')

  const organizationsQuery = useSuspenseQuery(listOrganizations, { page: 1, limit: 1000 })
  const organizations = organizationsQuery.data.organizations

  const selectedOrganizations = useMemo(() => {
    if (!watchOrganizationIds || watchOrganizationIds.length === 0) return []
    return organizations.filter((org) => watchOrganizationIds.includes(org.id))
  }, [organizations, watchOrganizationIds])

  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false)

  const createMutation = useMutation(createEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success('Event created!')
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      handleServerErrors(form, error)
    },
  })

  const updateMutation = useMutation(updateEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success('Event updated!')
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      handleServerErrors(form, error)
    },
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleSubmit = form.handleSubmit(async (data) => {
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (data.hasTime) {
      const [startHour, startMinute] = (data.startTime ?? '00:00').split(':').map(Number)
      const [endHour, endMinute] = (data.endTime ?? '23:59').split(':').map(Number)
      startDate.setHours(startHour, startMinute, 0, 0)
      endDate.setHours(endHour, endMinute, 0, 0)
    } else {
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 0, 0)
    }

    if (isEditMode && eventId) {
      await updateMutation.mutateAsync({
        id: eventId,
        title: data.title,
        description: data.description,
        format: data.format,
        location: data.location || '',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        organizationId: data.organizationIds[0],
        tagIds: [],
      })
    } else {
      await createMutation.mutateAsync({
        title: data.title,
        description: data.description,
        format: data.format,
        location: data.location || '',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        userId: 0,
        organizationId: data.organizationIds[0],
        tagIds: [],
      })
    }
  })

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && watchTags.length < 5 && !watchTags.includes(trimmed)) {
      form.setValue('tags', [...watchTags, trimmed], { shouldValidate: true })
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue('tags', watchTags.filter((t) => t !== tagToRemove), { shouldValidate: true })
  }

  const handleOpenDescriptionEditor = () => {
    setDescriptionDraft(watchDescription || '')
    setIsDescriptionEditorOpen(true)
  }

  const handleSaveDescription = () => {
    form.setValue('description', descriptionDraft, { shouldValidate: true, shouldDirty: true })
    setIsDescriptionEditorOpen(false)
  }

  // Strip HTML tags to get plain text length for display
  const getPlainTextLength = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent?.length || 0
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] w-[min(900px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
          style={{ overscrollBehavior: 'contain' }}
          showCloseButton={false}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>{isEditMode ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-6 p-6 md:grid-cols-2">
                  {/* LEFT COLUMN: Basic Info + Schedule */}
                  <div className="space-y-6">
                    {/* Basic Info Section */}
                    <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <legend className="sr-only">Basic Information</legend>
                      <SectionHeader title="Basic Information" />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Annual Tech Conference…"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  clearServerError(form, 'title')
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Description - Clickable preview that opens editor popup */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ fieldState }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <button
                                type="button"
                                onClick={handleOpenDescriptionEditor}
                                className={cn(
                                  'group relative w-full rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                                  fieldState.invalid && 'border-destructive'
                                )}
                              >
                                {watchDescription ? (
                                  <div
                                    className="prose prose-sm prose-neutral dark:prose-invert line-clamp-3 max-w-none text-sm"
                                    dangerouslySetInnerHTML={{ __html: watchDescription }}
                                  />
                                ) : (
                                  <span className="text-sm text-muted-foreground">Click to add description…</span>
                                )}
                                <div className="absolute right-2 top-2 rounded-md bg-muted p-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <PencilIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                </div>
                              </button>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">{getPlainTextLength(watchDescription || '')}/2000</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="format"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Format</FormLabel>
                              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select format…" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={String(EventFormat.OFFLINE)}>In Person</SelectItem>
                                  <SelectItem value={String(EventFormat.ONLINE)}>Virtual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchFormat === EventFormat.OFFLINE && (
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 Main St…" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {watchFormat === EventFormat.ONLINE && (
                          <FormField
                            control={form.control}
                            name="virtualLink"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Virtual Link</FormLabel>
                                <FormControl>
                                  <Input type="url" placeholder="https://zoom.us/j/…" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </fieldset>

                    {/* Schedule Section */}
                    <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <legend className="sr-only">Schedule</legend>
                      <div className="flex items-center justify-between">
                        <SectionHeader title="Schedule" description="Set date and optional time" />
                        <FormField
                          control={form.control}
                          name="hasTime"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormLabel className="text-xs text-muted-foreground">Include time</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Start Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                                    >
                                      {field.value ? format(field.value, 'PP') : 'Pick date…'}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>End Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                                    >
                                      {field.value ? format(field.value, 'PP') : 'Pick date…'}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => {
                                      const startDate = form.getValues('startDate')
                                      return date < new Date() || (startDate && date < startDate)
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {watchHasTime && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input type="time" value={field.value ?? ''} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" value={field.value ?? ''} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </fieldset>
                  </div>

                  {/* RIGHT COLUMN: Organization, Tags, Cover Image */}
                  <div className="space-y-6">
                    {/* Organization Section */}
                    <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <legend className="sr-only">Organizations</legend>
                      <SectionHeader title="Organizations" description="Select one or more hosting organizations" />

                      <FormField
                        control={form.control}
                        name="organizationIds"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            {/* Selected organizations as badges */}
                            {selectedOrganizations.length > 0 && (
                              <div className="mb-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                                {selectedOrganizations.map((org) => (
                                  <Badge key={org.id} variant="secondary" className="gap-1 py-1 text-xs">
                                    <Avatar className="size-4">
                                      <AvatarImage src={org.imageUrl ?? undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {org.title.slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="max-w-24 truncate">{org.title}</span>
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(field.value.filter((id) => id !== org.id))}
                                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                      aria-label={`Remove ${org.title}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Organization picker button */}
                            <Popover open={isOrganizationOpen} onOpenChange={setIsOrganizationOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isOrganizationOpen}
                                    className={cn(
                                      'w-full justify-between',
                                      field.value.length === 0 && 'text-muted-foreground',
                                      fieldState.invalid && 'border-destructive'
                                    )}
                                  >
                                    <span>
                                      {field.value.length === 0
                                        ? 'Select organizations…'
                                        : `${field.value.length} organization${field.value.length > 1 ? 's' : ''} selected`}
                                    </span>
                                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search…" />
                                  <CommandList>
                                    <CommandEmpty>No organizations found.</CommandEmpty>
                                    <CommandGroup>
                                      {organizations.map((org) => {
                                        const isSelected = field.value.includes(org.id)
                                        const initials = org.title.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
                                        return (
                                          <CommandItem
                                            key={org.id}
                                            value={`${org.id} ${org.title}`}
                                            onSelect={() => {
                                              const newValue = isSelected
                                                ? field.value.filter((id) => id !== org.id)
                                                : [...field.value, org.id]
                                              field.onChange(newValue)
                                            }}
                                          >
                                            <CheckIcon className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                                            <Avatar className="mr-2 size-5">
                                              <AvatarImage src={org.imageUrl ?? undefined} alt={org.title} />
                                              <AvatarFallback className="text-[9px]">{initials || 'ORG'}</AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">{org.title}</span>
                                          </CommandItem>
                                        )
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </fieldset>

                    {/* Tags Section */}
                    <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <legend className="sr-only">Tags</legend>
                      <SectionHeader title="Tags" description="Add up to 5 tags" />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={() => (
                          <FormItem>
                            <FormControl>
                              <div className="space-y-2">
                                <Input
                                  placeholder="Type and press Enter…"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      addTag(tagInput)
                                    }
                                  }}
                                  disabled={watchTags.length >= 5}
                                />
                                {watchTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {watchTags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={() => removeTag(tag)}
                                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                          aria-label={`Remove ${tag}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </fieldset>

                    {/* Cover Image Section */}
                    <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <legend className="sr-only">Cover Image</legend>
                      <SectionHeader title="Cover Image" description="JPG, PNG, or WebP (max 5 MB)" />

                      <FormField
                        control={form.control}
                        name="coverImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <ImageUpload value={field.value} onChange={field.onChange} aspectRatio="video" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </fieldset>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || (!isDirty && !isEditMode)}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? 'Save Changes' : 'Create Event'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Description Editor Popup */}
      <Dialog open={isDescriptionEditorOpen} onOpenChange={setIsDescriptionEditorOpen}>
        <DialogContent
          className="flex max-h-[90vh] w-[min(700px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0"
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
              placeholder="Write your event description…"
              minHeight="300px"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsDescriptionEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveDescription}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// TRIGGER WRAPPER COMPONENT
// ============================================================================

interface CreateEventTriggerProps {
  children: React.ReactNode
  startDate?: Date
  startTime?: { hour: number; minute: number }
}

export function CreateEventTrigger({ children, startDate, startTime }: CreateEventTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const initialValues = useMemo(() => {
    const values: Partial<CreateEventFormData> = {}

    if (startDate) {
      values.startDate = startDate
      values.endDate = startDate
    }

    if (startTime) {
      const startTimeStr = `${startTime.hour.toString().padStart(2, '0')}:${startTime.minute.toString().padStart(2, '0')}`
      const endHour = startTime.minute >= 30 ? startTime.hour + 1 : startTime.hour
      const endMinute = startTime.minute >= 30 ? 0 : 30
      const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
      values.startTime = startTimeStr
      values.endTime = endTimeStr
      values.hasTime = true
    }

    return values
  }, [startDate, startTime])

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <Suspense fallback={null}>
        <CreateEventForm open={isOpen} onOpenChange={setIsOpen} initialValues={initialValues} />
      </Suspense>
    </>
  )
}
