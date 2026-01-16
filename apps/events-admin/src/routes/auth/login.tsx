import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'
import { useAuth } from '@/lib/auth'

// Validate search params for redirect
const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/auth/login')({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    // If already authenticated or in guest mode, redirect to dashboard
    if (context.auth.isAuthenticated || context.auth.isGuest) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const { login, continueAsGuest } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleMicrosoftLogin = async () => {
    setIsLoading(true)
    try {
      // Use redirect from search params, or default to origin
      const returnTo = search.redirect || window.location.origin
      await login(returnTo)
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoading(false)
    }
    // Note: Don't set isLoading to false on success - page will redirect
  }

  const handleGuestMode = () => {
    continueAsGuest()
    // Use window.location for immediate redirect without React state issues
    window.location.href = '/calendar'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl">
            <span>AITU</span> <span className="font-bold">EMS</span>
          </CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleMicrosoftLogin}
            className="w-full gap-2"
            size="lg"
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <MicrosoftIcon className="h-5 w-5" />
            )}
            {isLoading ? 'Redirecting...' : 'Sign in with Microsoft'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            onClick={handleGuestMode}
            className="w-full gap-2"
            size="lg"
            variant="ghost"
            disabled={isLoading}
          >
            <GuestIcon className="h-5 w-5" />
            Continue as Guest
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            Use your organization Microsoft account to sign in.
            <br />
            Guest access is limited to viewing the calendar and organizations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

function GuestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
