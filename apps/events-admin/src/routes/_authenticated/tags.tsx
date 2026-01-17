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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-56" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <Skeleton className="h-4 w-full max-w-xl" />
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
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-24" />
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
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage event tags and categories</p>
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
          <Button className="ml-auto" disabled title="Coming soon">
            <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
            Add tag
          </Button>
        }
      />
    </div>
  )
}
