import { TransportProvider } from '@connectrpc/connect-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from './features/theme/theme-provider'
import { transport, queryClient } from './lib/api'
import { AuthProvider, useAuth } from './lib/auth'
import { router } from './lib/router'

function InnerApp() {
  const auth = useAuth()

  return (
    <RouterProvider 
      router={router} 
      context={{ auth }} 
    />
  )
}

export function App() {
  return (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
          <AuthProvider>
            <InnerApp />
            <Toaster richColors closeButton position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </TransportProvider>
  )
}
