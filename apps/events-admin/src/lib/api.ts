import { createConnectTransport } from '@connectrpc/connect-web'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ConnectError, type Interceptor } from '@connectrpc/connect'
import { toast } from 'sonner'

/**
 * Global error handling interceptor for Connect-RPC
 */
const errorInterceptor: Interceptor = (next) => async (req) => {
  try {
    return await next(req)
  } catch (err) {
    if (err instanceof ConnectError) {
      console.error(`[ConnectError] ${err.code}: ${err.message}`)
      // Handle specific error codes
      switch (err.code) {
        case 16: // Unauthenticated
          // Optionally redirect to login or refresh token
          break
        case 7: // PermissionDenied
          toast.error('You do not have permission to perform this action.')
          break
        default:
          // Fallback handled by TanStack Query caches
          break
      }
    }
    throw err
  }
}

/**
 * Connect-RPC transport configuration
 * - Uses binary format (Protobuf) in production for performance
 * - Falls back to JSON in development for easier debugging
 */
export const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5555',
  useBinaryFormat: import.meta.env.PROD,
  interceptors: [errorInterceptor],
})

/**
 * Extract a user-friendly error message from Connect-RPC errors
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof ConnectError) {
    // ConnectError has structured error information
    return error.message || `Request failed with code ${error.code}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

/**
 * TanStack Query client with global error handling and sensible defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed requests once before showing error
      retry: 1,
      // Don't refetch on window focus in development
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast for queries that have already been cached
      // (to avoid showing errors on initial load which should be handled by components)
      if (query.state.data !== undefined) {
        toast.error(`Background sync failed: ${getErrorMessage(error)}`)
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Show toast for all mutation errors
      toast.error(getErrorMessage(error))
    },
  }),
})

/**
 * Helper to create invalidation query keys for Connect-RPC services
 * Usage: invalidateQueries({ queryKey: createQueryKey(listEvents) })
 */
export function createServiceQueryKey(serviceMethod: { service: { typeName: string }; name: string }) {
  return [serviceMethod.service.typeName, serviceMethod.name] as const
}
