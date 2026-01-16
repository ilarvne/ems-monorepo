import { Configuration, FrontendApi, type Session } from '@ory/client'
import * as React from 'react'

const KRATOS_PUBLIC_URL = import.meta.env.VITE_KRATOS_PUBLIC_URL || 'http://localhost:4433'

// Initialize Ory Kratos SDK
export const kratos = new FrontendApi(
  new Configuration({
    basePath: KRATOS_PUBLIC_URL,
    baseOptions: {
      withCredentials: true, // Essential for cookie-based sessions
    },
  })
)

// Re-export Session type for convenience
export type { Session }

// Extract traits type from identity schema
export interface KratosIdentityTraits {
  email: string
  name?: {
    first?: string
    last?: string
  }
}

export interface AuthContext {
  isAuthenticated: boolean
  isLoading: boolean
  isGuest: boolean
  session: Session | null
  login: (returnTo?: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<Session | null>
  continueAsGuest: () => void
  exitGuestMode: () => void
}

const AuthContext = React.createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isGuest, setIsGuest] = React.useState(() => {
    return localStorage.getItem('guestMode') === 'true'
  })

  const isAuthenticated = !!session?.active

  // Check session with Kratos /sessions/whoami
  const checkSession = React.useCallback(async (): Promise<Session | null> => {
    try {
      const { data } = await kratos.toSession()
      setSession(data)
      return data
    } catch (error: any) {
      // 401 means not authenticated - this is expected
      if (error.response?.status === 401) {
        setSession(null)
        return null
      }
      console.error('Failed to check session:', error)
      setSession(null)
      return null
    }
  }, [])

  // Initial session check on mount
  React.useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await checkSession()
      setIsLoading(false)
    }
    init()
  }, [checkSession])

  // Initiate login via Kratos browser flow
  const login = React.useCallback(async (returnTo?: string) => {
    try {
      // 1. Create browser login flow
      const { data: flow } = await kratos.createBrowserLoginFlow({
        returnTo: returnTo || window.location.origin,
      })

      // 2. Find the Microsoft OIDC provider button
      const microsoftNode = flow.ui.nodes.find(
        (node) =>
          node.group === 'oidc' &&
          node.attributes.node_type === 'input' &&
          (node.attributes as any).value === 'microsoft'
      )

      if (!microsoftNode) {
        console.error('Microsoft OIDC provider not found in flow')
        return
      }

      // 3. Get CSRF token
      const csrfNode = flow.ui.nodes.find(
        (node) => (node.attributes as any).name === 'csrf_token'
      )
      const csrfToken = csrfNode ? (csrfNode.attributes as any).value : ''

      // 4. Submit form to Kratos (required for OIDC - cannot use AJAX due to redirects)
      const form = document.createElement('form')
      form.action = flow.ui.action
      form.method = 'POST'
      form.style.display = 'none'

      // Provider input
      const providerInput = document.createElement('input')
      providerInput.name = 'provider'
      providerInput.value = 'microsoft'
      form.appendChild(providerInput)

      // CSRF token
      const csrfInput = document.createElement('input')
      csrfInput.name = 'csrf_token'
      csrfInput.value = csrfToken
      form.appendChild(csrfInput)

      document.body.appendChild(form)
      form.submit()
    } catch (error) {
      console.error('Failed to initiate login:', error)
    }
  }, [])

  // Logout via Kratos browser flow
  const logout = React.useCallback(async () => {
    try {
      // Clear guest mode on logout
      setIsGuest(false)
      localStorage.removeItem('guestMode')
      // Create logout flow (requires CSRF token)
      const { data } = await kratos.createBrowserLogoutFlow()
      // Redirect to logout URL (clears session cookie)
      window.location.href = data.logout_url
    } catch (error: any) {
      // If no active session, just clear local state
      if (error.response?.status === 401) {
        setSession(null)
        window.location.href = '/auth/login'
        return
      }
      console.error('Logout failed:', error)
      setSession(null)
    }
  }, [])

  // Continue as guest (limited access)
  const continueAsGuest = React.useCallback(() => {
    setIsGuest(true)
    localStorage.setItem('guestMode', 'true')
  }, [])

  // Exit guest mode
  const exitGuestMode = React.useCallback(() => {
    setIsGuest(false)
    localStorage.removeItem('guestMode')
  }, [])

  // Show loading spinner during initial session check
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isGuest,
        session,
        login,
        logout,
        checkSession,
        continueAsGuest,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper to get user display name from session
export function getUserDisplayName(session: Session | null): string {
  if (!session) return 'Guest'
  const traits = session.identity?.traits as KratosIdentityTraits | undefined
  if (!traits) return 'User'
  if (traits.name?.first && traits.name?.last) {
    return `${traits.name.first} ${traits.name.last}`
  }
  if (traits.name?.first) return traits.name.first
  return traits.email?.split('@')[0] || 'User'
}

// Helper to get user initials for avatar
export function getUserInitials(session: Session | null): string {
  if (!session) return '?'
  const traits = session.identity?.traits as KratosIdentityTraits | undefined
  if (!traits) return '?'
  if (traits.name?.first && traits.name?.last) {
    return `${traits.name.first[0]}${traits.name.last[0]}`.toUpperCase()
  }
  return traits.email?.substring(0, 2).toUpperCase() || '??'
}

// Helper to get user email
export function getUserEmail(session: Session | null): string {
  if (!session) return ''
  const traits = session.identity?.traits as KratosIdentityTraits | undefined
  return traits?.email || ''
}
