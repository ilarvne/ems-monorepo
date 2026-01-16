import { z } from 'zod'
import { EventFormat } from '@repo/proto'
import { type Step } from '@/hooks/use-multi-step-form'

// ============================================================================
// MULTI-STEP FORM SCHEMA
// Split schema by steps for partial validation
// ============================================================================

// Step 1: Basic Info
export const basicInfoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  format: z.nativeEnum(EventFormat),
})

// Step 2: Schedule & Location
export const scheduleSchema = z.object({
  hasTime: z.boolean().default(true),
  startDate: z.date({ required_error: 'Start date is required' }),
  startTime: z.string().optional(),
  endDate: z.date({ required_error: 'End date is required' }),
  endTime: z.string().optional(),
  location: z.string().optional(),
})


// Step 3: Settings
export const settingsSchema = z.object({
  capacity: z.coerce.number().min(1).max(10000).optional(),
  isPublic: z.boolean().default(true),
  coverImage: z.instanceof(File).optional(),
})

// Combined schema for final submission
export const fullEventSchema = basicInfoSchema
  .merge(scheduleSchema)
  .merge(settingsSchema)
  .superRefine((data, ctx) => {
    if (data.hasTime) {
      if (!data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start time is required',
          path: ['startTime'],
        })
      }

      if (!data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time is required',
          path: ['endTime'],
        })
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
      end.setHours(0, 0, 0, 0)
    }

    if (!(end > start)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      })
    }
  })

export type EventFormData = z.infer<typeof fullEventSchema>

// ============================================================================
// STEP DEFINITIONS
// ============================================================================

export const eventFormSteps: Step[] = [
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
    fields: ['hasTime', 'startDate', 'startTime', 'endDate', 'endTime', 'location'],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Capacity and visibility',
    fields: ['capacity', 'isPublic', 'coverImage'],
  },
]
