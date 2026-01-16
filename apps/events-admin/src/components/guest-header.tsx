import { Link } from '@tanstack/react-router'
import { CalendarDays, Users, LogIn } from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import { useAuth } from '@/lib/auth'

export function GuestHeader() {
  const { exitGuestMode, login } = useAuth()

  const handleSignIn = async () => {
    exitGuestMode()
    await login()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/calendar" className="flex items-center gap-1">
            <span className="text-base">AITU</span>
            <span className="text-base font-bold">EMS</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/calendar"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </Link>
            <Link
              to="/organizations"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
            >
              <Users className="h-4 w-4" />
              Organizations
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Guest Mode</span>
          <Button onClick={handleSignIn} size="sm" variant="default" className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    </header>
  )
}
