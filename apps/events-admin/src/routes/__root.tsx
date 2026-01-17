import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'

import type { RouterContext } from '@/lib/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const isDev = import.meta.env.DEV

  return (
    <NuqsAdapter>
      <Outlet />
      {isDev && (
        <>
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </NuqsAdapter>
  )
}
