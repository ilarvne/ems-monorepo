import { createRouter } from '@tanstack/react-router'

import { routeTree } from '../routeTree.gen'
import type { AuthContext } from './auth'

// Define router context interface
export interface RouterContext {
  auth: AuthContext
}

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: {
    // Will be provided by RouterProvider
    auth: undefined!,
  },
})

// Register for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
