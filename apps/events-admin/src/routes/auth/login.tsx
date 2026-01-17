import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@repo/ui/components/button'
import { useAuth } from '@/lib/auth'

// Validate search params for redirect
const searchSchema = z.object({
  redirect: z.string().optional()
})

export const Route = createFileRoute('/auth/login')({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    // If already authenticated or in guest mode, redirect to dashboard
    if (context.auth.isAuthenticated || context.auth.isGuest) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage
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
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left Pane - Login Form */}
      <div className="flex flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between p-6 lg:hidden">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg tracking-tight">
              <span className="font-normal">AITU</span>{' '}
              <span className="font-bold">EMS</span>
            </span>
          </div>
        </header>

        {/* Login Form Container */}
        <main className="flex flex-1 items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-sm space-y-8">
            {/* Logo - Desktop */}
            <div className="hidden lg:flex items-center gap-2 text-foreground">
              <CalendarIcon className="h-8 w-8 text-primary" aria-hidden="true" />
              <span className="text-xl tracking-tight">
                <span className="font-normal">AITU</span>{' '}
                <span className="font-bold">EMS</span>
              </span>
            </div>

            {/* Welcome Text */}
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
              <p className="text-muted-foreground">
                Sign in with your organization account to continue
              </p>
            </div>

            {/* Login Actions */}
            <div className="space-y-4">
              <Button
                onClick={handleMicrosoftLogin}
                className="w-full h-12 gap-3 text-base transition-transform active:scale-[0.98]"
                size="lg"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <MicrosoftIcon className="h-5 w-5" aria-hidden="true" />
                )}
                <span>{isLoading ? 'Redirecting\u2026' : 'Sign in with Microsoft'}</span>
              </Button>

              <div className="relative" role="separator" aria-orientation="horizontal">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                onClick={handleGuestMode}
                className="w-full h-11 gap-3 transition-transform active:scale-[0.98]"
                size="lg"
                variant="outline"
                disabled={isLoading}
              >
                <GuestIcon className="h-5 w-5" aria-hidden="true" />
                <span>Continue as Guest</span>
              </Button>
            </div>

            {/* Help Text */}
            <div className="space-y-3 text-center lg:text-left text-sm text-muted-foreground">
              <p>
                Use your <strong>@astanait.edu.kz</strong> account to sign in.
              </p>
              <p className="text-xs">
                Guest access is limited to viewing the calendar and organizations.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Right Pane - Image */}
      <div className="relative hidden lg:block">
        <img
          src="/expo2017.jpg"
          alt="EXPO 2017 Astana - Nur Alem Sphere"
          className="absolute inset-0 h-full w-full object-cover"
          width={1200}
          height={800}
        />
        {/* Gradient overlay for better text contrast if needed */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" aria-hidden="true" />

        {/* Branding overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          {/* Top spacer */}
          <div />

          {/* Bottom content */}
          <div className="relative z-10 flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tight text-white text-pretty drop-shadow-lg">
              Event Management System
            </h2>
            <p className="text-base text-white/90 max-w-md text-pretty drop-shadow-md">
              Streamline your university events. Plan, organize, and track all campus activities in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

function GuestIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
