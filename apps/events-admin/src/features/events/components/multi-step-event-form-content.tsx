import { type UseFormReturn } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react'
import { EventFormat } from '@repo/proto'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form'
import { Input } from '@repo/ui/components/input'
import { Button } from '@repo/ui/components/button'
import { Calendar } from '@repo/ui/components/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover'
import { Switch } from '@repo/ui/components/switch'
import { Textarea } from '@repo/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import { ImageUpload } from '@repo/ui/components/file-upload'
import { cn } from '@repo/ui/lib/utils'
import { type EventFormData, eventFormSteps } from './event-form-schema'
import { useMultiStepForm } from '@/hooks/use-multi-step-form'

interface MultiStepEventFormContentProps {
  form: UseFormReturn<EventFormData>
  isPending: boolean
  onSubmit: () => void
  className?: string
  // Pass the hook return values to control the UI from the parent or just use internal logic?
  // Actually, standardizing on the hook being internal or passed is key.
  // To keep "smart" logic like 'nextStep' which relies on form state, we should probably initialize the hook here
  // OR pass the hook controls down.
  // Passing form down is necessary.
  // Let's instantiate the multi-step hook inside here or in the parent?
  // The parent needs to know "isLastStep" to trigger submission logic potentially?
  // Or the parent just passes a "handleSubmit" and this component handles the stepping.
  // Let's put the hook HERE so the UI is tightly coupled to the stepping logic.
}

export function MultiStepEventFormContent({
  form,
  isPending,
  onSubmit,
  className,
}: MultiStepEventFormContentProps) {
  const {
    currentStep,
    step,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
  } = useMultiStepForm({
    form,
    steps: eventFormSteps,
  })

  const handleNext = async () => {
    const canProceed = await nextStep()
    if (canProceed && isLastStep) {
      onSubmit()
    }
  }

   const watchFormat = form.watch('format')
   const watchHasTime = form.watch('hasTime')

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Accessibility: Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        Step {currentStep + 1} of {eventFormSteps.length}: {step.title}
      </div>

      {/* Header / Progress Section */}
      <div className="space-y-6 mb-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step.description}
          </p>
        </div>

        {/* Micro-Progress Bar (Segmented) */}
        <div className="flex gap-2 w-full" role="progressbar" aria-valuenow={((currentStep + 1) / eventFormSteps.length) * 100}>
          {eventFormSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                index <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Clickable Stepper (Visual) */}
        {/* Only show on larger screens usually, but we can keep it responsive */}
        {/* Hidden on mobile to save space? Or simplified. Let's keep it but make it small. */}
        <div className="flex justify-between px-1">
          {eventFormSteps.map((s, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const canJump = index < currentStep // Allow backward jumping

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => canJump && goToStep(index)}
                disabled={!canJump}
                className={cn(
                  'flex flex-col items-center gap-2 group',
                  canJump ? 'cursor-pointer' : 'cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-all',
                    isCompleted || isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span 
                  className={cn(
                    "text-[10px] uppercase tracking-wider font-medium hidden sm:block",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form Fields Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-1 -mx-1 py-2">
        <Form {...form}>
          <form className="space-y-6">
            {/* Step 1: Basic Info */}
            {step.id === 'basic-info' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual Tech Conference 2025" {...field} autoFocus />
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
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Specific time</div>
                    <div className="text-sm text-muted-foreground">
                      Turn off for all-day or date-only events.
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="hasTime"
                    render={({ field }) => (
                      <FormItem>
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
                        <FormLabel>Start date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
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
                        <FormLabel>End date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
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
                          <FormLabel>Start time</FormLabel>
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
                          <FormLabel>End time</FormLabel>
                          <FormControl>
                            <Input type="time" value={field.value ?? ''} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

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
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
                          autoFocus
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
      </div>

      {/* Footer / Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 mt-2 border-t bg-background sticky bottom-0 z-10">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep || isPending}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={isPending}
        >
          {isPending ? (
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
      </div>
    </div>
  )
}
