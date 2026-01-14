import { useState, useCallback } from 'react'
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form'

export interface Step {
  id: string
  title: string
  description?: string
  /** Fields to validate before proceeding to next step */
  fields: string[]
}

interface UseMultiStepFormOptions<T extends FieldValues> {
  form: UseFormReturn<T>
  steps: Step[]
}

interface UseMultiStepFormReturn {
  /** Current step index (0-based) */
  currentStep: number
  /** Current step object */
  step: Step
  /** Total number of steps */
  totalSteps: number
  /** Whether on first step */
  isFirstStep: boolean
  /** Whether on last step */
  isLastStep: boolean
  /** Progress percentage (0-100) */
  progress: number
  /** Go to next step (validates current step fields first) */
  nextStep: () => Promise<boolean>
  /** Go to previous step */
  prevStep: () => void
  /** Go to specific step */
  goToStep: (index: number) => void
  /** Reset to first step */
  reset: () => void
}

/**
 * Hook for managing multi-step forms with per-step validation
 * 
 * @example
 * ```tsx
 * const steps: Step[] = [
 *   { id: 'personal', title: 'Personal Info', fields: ['name', 'email'] },
 *   { id: 'address', title: 'Address', fields: ['street', 'city', 'zip'] },
 *   { id: 'confirm', title: 'Confirm', fields: [] },
 * ]
 * 
 * const form = useForm<FormData>({ resolver: zodResolver(schema) })
 * const stepper = useMultiStepForm({ form, steps })
 * ```
 */
export function useMultiStepForm<T extends FieldValues>({
  form,
  steps,
}: UseMultiStepFormOptions<T>): UseMultiStepFormReturn {
  const [currentStep, setCurrentStep] = useState(0)

  const step = steps[currentStep]
  const totalSteps = steps.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const progress = ((currentStep + 1) / totalSteps) * 100

  const nextStep = useCallback(async () => {
    // Validate only the fields for the current step
    const fieldsToValidate = step.fields as Path<T>[]
    const isValid = await form.trigger(fieldsToValidate)

    if (isValid && !isLastStep) {
      setCurrentStep((prev) => prev + 1)
      return true
    }
    return isValid
  }, [form, step.fields, isLastStep])

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [isFirstStep])

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStep(index)
      }
    },
    [totalSteps]
  )

  const reset = useCallback(() => {
    setCurrentStep(0)
  }, [])

  return {
    currentStep,
    step,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    prevStep,
    goToStep,
    reset,
  }
}
