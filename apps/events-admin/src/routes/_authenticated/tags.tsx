import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listTags } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

import { Button } from '@repo/ui/components/button'

import { DataTable, useDataTableState } from '@/components/admin-data-table'
import { columns } from '@/features/tags/tags.columns'

export const Route = createFileRoute('/_authenticated/tags')({
  component: Tags
})

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
