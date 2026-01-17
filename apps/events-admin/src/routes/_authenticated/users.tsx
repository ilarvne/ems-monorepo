import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listUsers } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { UserPlusIcon } from 'lucide-react'
import { Suspense } from 'react'

import { Button } from '@repo/ui/components/button'
import { Skeleton } from '@repo/ui/components/skeleton'

import { DataTable, useDataTableState } from '@/components/admin-data-table'
import { PreRegisterUserDialog } from '@/features/users/pre-register-user-dialog'
import { columns } from '@/features/users/users.columns'

export const Route = createFileRoute('/_authenticated/users')({
  component: () => (
    <Suspense fallback={<UsersLoading />}>
      <Users />
    </Suspense>
  )
})

function UsersLoading() {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 last:border-0">
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}

function Users() {
  const { tableState } = useDataTableState({ defaultSortBy: 'id', defaultSortDesc: false })

  // When filters are active, fetch all data for client-side filtering
  const hasActiveFilters = Boolean(tableState.search)

  const { data } = useSuspenseQuery(listUsers, {
    limit: hasActiveFilters ? 1000 : tableState.pageSize,
    page: hasActiveFilters ? 1 : tableState.page
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users, roles, and pre-registrations</p>
      </div>

      <DataTable
        data={data.users}
        columns={columns}
        totalCount={data.total || 0}
        hasActiveFilters={hasActiveFilters}
        searchColumnId="username"
        searchPlaceholder="Search users..."
        entityName="users"
        defaultSortBy="id"
        defaultSortDesc={false}
        toolbarActions={
          <PreRegisterUserDialog>
            <Button className="ml-auto">
              <UserPlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
              Pre-register user
            </Button>
          </PreRegisterUserDialog>
        }
      />
    </div>
  )
}
