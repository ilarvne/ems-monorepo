import { Suspense } from 'react'
import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listTags } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import { Skeleton } from '@repo/ui/components/skeleton'

import { DataTable, useDataTableState } from '@/components/admin-data-table'
import { columns } from '@/features/tags/tags.columns'

export const Route = createFileRoute('/_authenticated/tags')({
  component: () => (
    <Suspense fallback={<TagsLoading />}>
      <Tags />
    </Suspense>
  )
})

function TagsLoading() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-56" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex gap-4 border-b pb-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-8 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between gap-8">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Tags() {
  const { tableState } = useDataTableState({ defaultSortBy: 'name', defaultSortDesc: false })

  // When filters are active, fetch all data for client-side filtering
  const hasActiveFilters = Boolean(tableState.search)

  const { data } = useSuspenseQuery(listTags, {
    limit: hasActiveFilters ? 1000 : tableState.pageSize,
    page: hasActiveFilters ? 1 : tableState.page
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
          <p className="text-muted-foreground mt-1">Manage event tags and categories</p>
        </div>
      </div>

      <DataTable
        data={data.tags}
        columns={columns}
        totalCount={data.total || 0}
        hasActiveFilters={hasActiveFilters}
        searchColumnId="name"
        searchPlaceholder="Search tags..."
        entityName="tags"
        defaultSortBy="name"
        defaultSortDesc={false}
        toolbarActions={
          <Button className="ml-auto">
            <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
            Add tag
          </Button>
        }
      />
    </div>
  )
}
