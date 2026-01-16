import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listUsers } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { Suspense } from 'react'

import { Button } from '@repo/ui/components/button'
import { Skeleton } from '@repo/ui/components/skeleton'

import { DataTable, useDataTableState } from '@/components/admin-data-table'
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-60" />
            <Skeleton className="h-10 w-20" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex gap-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-12" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between gap-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage users and accounts</p>
        </div>
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
          <Button className="ml-auto">
            <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
            Add user
          </Button>
        }
      />
    </div>
  )
}
