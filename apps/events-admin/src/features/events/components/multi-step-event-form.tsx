import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'
import { ImageUpload } from '@/components/ui/file-upload'
import { cn } from '@/lib/utils'
import { useMultiStepForm, type Step } from '@/hooks/use-multi-step-form'
import { handleServerErrors } from '@/lib/form-utils'

// ============================================================================
// MULTI-STEP FORM SCHEMA
// Split schema by steps for partial validation
// ============================================================================

// Step 1: Basic Info
const basicInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  format: z.nativeEnum(EventFormat),
})

// Step 2: Schedule & Location
const scheduleSchema = z.object({
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date({ required_error: 'End date is required' }),
  location: z.string().optional(),
})

// Step 3: Settings
const settingsSchema = z.object({
  capacity: z.coerce.number().min(1).max(10000).optional(),
  isPublic: z.boolean().default(true),
  coverImage: z.instanceof(File).optional(),
})

// Combined schema for final submission
const fullEventSchema = basicInfoSchema
  .merge(scheduleSchema)
  .merge(settingsSchema)
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  })

type EventFormData = z.infer<typeof fullEventSchema>

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

const steps: Step[] = [
  {
    id: 'basic-info',
    title: 'Basic Info',
    description: 'Event name and description',
    fields: ['title', 'description', 'format'],
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'When and where',
    fields: ['startDate', 'endDate', 'location'],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Capacity and visibility',
    fields: ['capacity', 'isPublic', 'coverImage'],
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

interface MultiStepEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MultiStepEventForm({ open, onOpenChange }: MultiStepEventFormProps) {
  const queryClient = useQueryClient()

  const form = useForm<EventFormData>({
    resolver: zodResolver(fullEventSchema),
    defaultValues: {
      title: '',
      description: '',
      format: EventFormat.OFFLINE,
      location: '',
      isPublic: true,
    },
    mode: 'onBlur',
  })

  const {
    currentStep,
    step,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    progress,
    goToStep,
  } = useMultiStepForm({
    form,
    steps,
  })

  // Mutation for final submission
  const mutation = useMutation(createEvent, {
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

  const handleNext = async () => {
    const canProceed = await nextStep()
    if (canProceed && isLastStep) {
      // On last step, submit the form
      const data = form.getValues()
      mutation.mutate({
        title: data.title,
        description: data.description,
        format: data.format,
        location: data.location || '',
        startTime: data.startDate.toISOString(),
        endTime: data.endDate.toISOString(),
        userId: 0,
        organizationId: 0,
        tagIds: [],
      })
    }
  }

  const watchFormat = form.watch('format')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {steps.length}: {step.title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(index)}
                disabled={index > currentStep}
                className={cn(
                  'flex flex-col items-center gap-1 text-xs transition-colors',
                  index === currentStep
                    ? 'text-primary'
                    : index < currentStep
                      ? 'text-muted-foreground cursor-pointer hover:text-foreground'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2',
                    index === currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index < currentStep
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="hidden sm:block">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-6">
            {/* Step 1: Basic Info */}
            {step.id === 'basic-info' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual Tech Conference 2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your event..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Format</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
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
              </div>
            )}

            {/* Step 2: Schedule & Location */}
            {step.id === 'schedule' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchFormat === EventFormat.OFFLINE && (
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, City, State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Step 3: Settings */}
            {step.id === 'settings' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Leave empty for unlimited"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Set a maximum number of attendees (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        Upload a cover image (max 5MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </form>
        </Form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={isFirstStep || mutation.isPending}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLastStep ? (
              <>
                Create Event
                <Check className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
