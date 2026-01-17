import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AppSidebar } from '@/components/app-sidebar'
import { GuestHeader } from '@/components/guest-header'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@repo/ui/components/sidebar'

// Routes that guests can access
const GUEST_ALLOWED_ROUTES = ['/calendar', '/organizations']

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    const isGuestAllowedRoute = GUEST_ALLOWED_ROUTES.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    )
    
    // Allow access if authenticated OR (guest mode AND allowed route)
    if (context.auth.isAuthenticated) {
      return { isGuest: false }
    }
    
    if (context.auth.isGuest && isGuestAllowedRoute) {
      return { isGuest: true }
    }
    
    // Not authenticated and not a valid guest access
    throw redirect({
      to: '/auth/login',
      search: {
        redirect: location.href,
      },
    })
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isGuest } = Route.useRouteContext()
  
  // Guest mode: simplified header without sidebar
  if (isGuest) {
    return (
      <div className="min-h-screen bg-background">
        <GuestHeader />
        <main className="container py-6">
          <div className="@container/main mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    )
  }
  
  // Authenticated mode: full sidebar layout
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 14)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {/* Main Content with max-width for readability on ultra-wide monitors */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="@container/main mx-auto w-full max-w-7xl py-4 md:py-6">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
