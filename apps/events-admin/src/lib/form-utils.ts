import type { UseFormReturn, FieldValues, Path, FieldError } from 'react-hook-form'
import { toast } from 'sonner'

/**
 * Server-side field error structure
 */
export interface ServerFieldError {
  field: string
  message: string
}

/**
 * Server error response structure
 */
export interface ServerErrorResponse {
  message: string
  errors?: ServerFieldError[]
}

/**
 * Type guard for Connect-RPC errors
 */
function isConnectError(error: unknown): error is { code: string; message: string; metadata: Map<string, string> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'metadata' in error
  )
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (isConnectError(error)) {
    return error.message || `Request failed with code ${error.code}`
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}

/**
 * Parse server errors and set them on form fields
 * 
 * @example
 * ```tsx
 * const mutation = useMutation({
 *   mutationFn: createUser,
 *   onError: (error) => {
 *     handleServerErrors(form, error)
 *   },
 * })
 * ```
 */
export function handleServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  options: {
    /** Show toast for root-level errors */
    showToast?: boolean
    /** Field name mapping from server to form */
    fieldMapping?: Record<string, Path<T>>
  } = {}
): void {
  const { showToast = true, fieldMapping = {} } = options

  // Handle Connect-RPC errors
  if (isConnectError(error)) {
    // Try to parse structured error details from metadata
    const details = error.metadata.get('error-details')
    if (details) {
      try {
        const parsed = JSON.parse(details) as ServerErrorResponse
        if (parsed.errors) {
          setFieldErrors(form, parsed.errors, fieldMapping)
          return
        }
      } catch {
        // Fall through to generic handling
      }
    }

    // Show generic error
    if (showToast) {
      toast.error(error.message || 'Request failed')
    }
    return
  }

  // Handle plain Error objects with potential field errors
  if (error instanceof Error) {
    // Check if error has a response property (fetch errors)
    const responseError = error as Error & { response?: { data?: ServerErrorResponse } }
    if (responseError.response?.data?.errors) {
      setFieldErrors(form, responseError.response.data.errors, fieldMapping)
      return
    }

    if (showToast) {
      toast.error(error.message)
    }
    return
  }

  // Handle raw ServerErrorResponse
  if (isServerErrorResponse(error)) {
    if (error.errors) {
      setFieldErrors(form, error.errors, fieldMapping)
    }
    if (showToast && error.message) {
      toast.error(error.message)
    }
    return
  }

  // Fallback
  if (showToast) {
    toast.error(getErrorMessage(error))
  }
}

function isServerErrorResponse(error: unknown): error is ServerErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ServerErrorResponse).message === 'string'
  )
}

function setFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  errors: ServerFieldError[],
  fieldMapping: Record<string, Path<T>>
): void {
  for (const { field, message } of errors) {
    const formField = fieldMapping[field] || (field as Path<T>)
    form.setError(formField, {
      type: 'server',
      message,
    })
  }
}

/**
 * Clear server errors when user starts typing
 * Use this in form field onChange handlers
 */
export function clearServerError<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: Path<T>
): void {
  const error = form.formState.errors[fieldName] as FieldError | undefined
  if (error?.type === 'server') {
    form.clearErrors(fieldName)
  }
}

/**
 * Create a submit handler with loading state management
 * 
 * @example
 * ```tsx
 * const { handleSubmit, isSubmitting } = useSubmitHandler({
 *   form,
 *   onSubmit: async (data) => {
 *     await createEvent(data)
 *   },
 *   onSuccess: () => {
 *     toast.success('Event created!')
 *     onClose()
 *   },
 * })
 * ```
 */
export function createSubmitHandler<T extends FieldValues>(options: {
  form: UseFormReturn<T>
  onSubmit: (data: T) => Promise<void>
  onSuccess?: () => void
  onError?: (error: unknown) => void
  successMessage?: string
}) {
  const { form, onSubmit, onSuccess, onError, successMessage } = options

  return form.handleSubmit(async (data) => {
    try {
      await onSubmit(data)
      if (successMessage) {
        toast.success(successMessage)
      }
      onSuccess?.()
    } catch (error) {
      handleServerErrors(form, error)
      onError?.(error)
    }
  })
}

/**
 * Hook to track form dirty state for unsaved changes warning
 */
export function useFormDirtyWarning<T extends FieldValues>(
  form: UseFormReturn<T>,
  enabled = true
): void {
  const { isDirty } = form.formState

  // Handle browser refresh/close
  if (typeof window !== 'undefined' && enabled && isDirty) {
    window.onbeforeunload = () => 'You have unsaved changes. Are you sure you want to leave?'
  } else if (typeof window !== 'undefined') {
    window.onbeforeunload = null
  }
}
