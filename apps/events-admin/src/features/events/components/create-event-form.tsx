import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarIcon, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { createEvent, EventFormat } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ui/file-upload'
import { cn } from '@/lib/utils'
import { handleServerErrors, clearServerError } from '@/lib/form-utils'

// ============================================================================
// FORM SCHEMA - Zod validation with custom error messages
// ============================================================================

const createEventSchema = z.object({
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
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date({
    required_error: 'End date is required',
  }),
  capacity: z.coerce
    .number()
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity must be less than 10,000')
    .optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
  coverImage: z.instanceof(File).optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
}).refine((data) => {
  // OFFLINE = in-person events require location
  if (data.format === EventFormat.OFFLINE && !data.location) {
    return false
  }
  return true
}, {
  message: 'Location is required for in-person events',
  path: ['location'],
}).refine((data) => {
  // ONLINE = virtual events require virtual link
  if (data.format === EventFormat.ONLINE && !data.virtualLink) {
    return false
  }
  return true
}, {
  message: 'Virtual link is required for virtual events',
  path: ['virtualLink'],
})

type CreateEventFormData = z.infer<typeof createEventSchema>

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultValues: Partial<CreateEventFormData> = {
  title: '',
  description: '',
  format: EventFormat.OFFLINE, // Default to in-person
  location: '',
  virtualLink: '',
  tags: [],
  capacity: undefined,
}

// ============================================================================
// COMPONENT
// ============================================================================

interface CreateEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional event ID for edit mode */
  eventId?: number
  /** Initial values for edit mode */
  initialValues?: Partial<CreateEventFormData>
}

export function CreateEventForm({
  open,
  onOpenChange,
  eventId,
  initialValues,
}: CreateEventFormProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!eventId
  const [tagInput, setTagInput] = useState('')

  // Initialize form with react-hook-form + zod resolver
  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
    // Validate on blur for better UX
    mode: 'onBlur',
  })

  const { isSubmitting, isDirty } = form.formState
  const watchFormat = form.watch('format')
  const watchTags = form.watch('tags')

  // Create/update mutation using Connect-Query
  const mutation = useMutation(createEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success(isEditMode ? 'Event updated!' : 'Event created!')
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      handleServerErrors(form, error)
    },
  })

  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    // In real app, upload image first if present
    // const imageUrl = data.coverImage ? await uploadImage(data.coverImage) : undefined

    await mutation.mutateAsync({
      title: data.title,
      description: data.description,
      format: data.format,
      location: data.location || '',
      startTime: data.startDate.toISOString(),
      endTime: data.endDate.toISOString(),
      userId: 0, // Will be set by backend from session
      organizationId: 0, // Will be set by backend
      tagIds: [], // Tags would be handled separately
    })
  })

  // Tag management
  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && watchTags.length < 5 && !watchTags.includes(trimmed)) {
      form.setValue('tags', [...watchTags, trimmed], { shouldValidate: true })
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue(
      'tags',
      watchTags.filter((t) => t !== tagToRemove),
      { shouldValidate: true }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'Create Event'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the event details below.'
              : 'Fill in the details to create a new event.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Annual Tech Conference 2025"
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your event..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/2000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Format */}
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={String(EventFormat.OFFLINE)}>
                        In Person
                      </SelectItem>
                      <SelectItem value={String(EventFormat.ONLINE)}>
                        Virtual
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional: Location (for OFFLINE events) */}
            {watchFormat === EventFormat.OFFLINE && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City, State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Conditional: Virtual Link (for ONLINE events) */}
            {watchFormat === EventFormat.ONLINE && (
              <FormField
                control={form.control}
                name="virtualLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Virtual Link *</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://zoom.us/j/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date Range */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                    <FormLabel>End Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
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

            {/* Capacity */}
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Leave empty for unlimited"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of attendees (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder="Type a tag and press Enter"
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
                        <div className="flex flex-wrap gap-2">
                          {watchTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 rounded-full hover:bg-muted"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {watchTags.length}/5 tags. Press Enter to add.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      aspectRatio="video"
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a cover image (max 5MB, JPG/PNG/WebP)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
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
  )
}
