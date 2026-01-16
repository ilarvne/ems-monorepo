import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createEvent, EventFormat } from '@repo/proto'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@repo/ui/components/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@repo/ui/components/drawer'

import { useMediaQuery } from '@/hooks/use-media-query'
import { handleServerErrors } from '@/lib/form-utils'
import { MultiStepEventFormContent } from './multi-step-event-form-content'
import { type EventFormData, fullEventSchema } from './event-form-schema'

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'draft_event_form'

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

interface MultiStepEventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MultiStepEventForm({ open, onOpenChange }: MultiStepEventFormProps) {
  const queryClient = useQueryClient()
  // Use responsive hook to switch between Dialog (Desktop) and Drawer (Mobile)
  const isDesktop = useMediaQuery('(min-width: 640px)')

  // 1. Initialize Form
  const form = useForm<EventFormData>({
    resolver: zodResolver(fullEventSchema),
    defaultValues: {
      title: '',
      description: '',
      format: EventFormat.OFFLINE,
      hasTime: true,
      location: '',
      isPublic: true,
    },
    mode: 'onBlur',
  })

  // 2. Load Draft from LocalStorage on Mount
  useEffect(() => {
    if (open) {
      const savedDraft = localStorage.getItem(STORAGE_KEY)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          // Restore dates properly (JSON stringifies them)
          if (parsed.startDate) parsed.startDate = new Date(parsed.startDate)
          if (parsed.endDate) parsed.endDate = new Date(parsed.endDate)

          // Ensure time strings exist for older drafts
          if (typeof parsed.hasTime !== 'boolean') parsed.hasTime = true

          form.reset(parsed)
          toast.info('Draft Restored', {
            description: 'We found an unfinished event and restored it for you.',
            duration: 4000,
          })
        } catch (e) {
          console.error('Failed to parse draft', e)
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [open, form])

  // 3. Auto-Save Draft to LocalStorage
  // Watch all values and save on change (debounced slightly by effect nature)
  const formValues = form.watch()
  useEffect(() => {
    if (open) {
      const handler = setTimeout(() => {
        // Don't save if form is empty or just initialized defaults
        if (formValues.title || formValues.description) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(formValues))
        }
      }, 500)
      return () => clearTimeout(handler)
    }
  }, [formValues, open])

  // 4. API Mutation
  const mutation = useMutation(createEvent, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connect-query'] })
      toast.success('Event created!')
      
      // Clear draft
      localStorage.removeItem(STORAGE_KEY)
      
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      handleServerErrors(form, error)
    },
  })

  const handleSubmit = () => {
    const data = form.getValues()

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
      end.setHours(0, 0, 0, 0)
    }

    mutation.mutate({
      title: data.title,
      description: data.description,
      format: data.format,
      location: data.location || '',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      userId: 0,
      organizationId: 0,
      tagIds: [],
    })
  }

  // 5. Render Responsive Container
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl sm:max-h-[85vh] h-full sm:h-auto flex flex-col p-0 gap-0 overflow-hidden">
          {/* Visually Hidden Title/Desc for Accessibility but rendered inside content effectively */}
          <div className="sr-only">
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>Fill out the details to create a new event</DialogDescription>
          </div>
          
          {/* Render Content with Padding */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            <MultiStepEventFormContent 
              form={form}
              isPending={mutation.isPending}
              onSubmit={handleSubmit}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader className="text-left">
          <DrawerTitle>Create Event</DrawerTitle>
          <DrawerDescription>
            Fill out the details to create a new event
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <MultiStepEventFormContent 
            form={form}
            isPending={mutation.isPending}
            onSubmit={handleSubmit}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
