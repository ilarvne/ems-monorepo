import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/auth/callback')({
  component: CallbackPage,
})

function CallbackPage() {
  const router = useRouter()
  const { checkSession } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Re-check session after OAuth callback
        const session = await checkSession()
        
        // Invalidate router to pick up new auth state
        await router.invalidate()

        if (session?.active) {
          // Redirect to dashboard
          await router.navigate({ to: '/' })
        } else {
          // Auth failed
          setError('Authentication failed. Please try again.')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('An error occurred during authentication.')
      }
    }

    handleCallback()
  }, [checkSession, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Authentication Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.navigate({ to: '/auth/login' })}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle>Authenticating...</CardTitle>
          <CardDescription>Please wait while we verify your identity</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    </div>
  )
}
