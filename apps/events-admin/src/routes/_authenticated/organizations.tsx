import { Suspense, useState } from 'react'
import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listOrganizations, OrganizationStatus } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon, FilterIcon } from 'lucide-react'
import { parseAsArrayOf, parseAsInteger, useQueryState } from 'nuqs'

import { Button } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover'
import { Skeleton } from '@repo/ui/components/skeleton'

import { DataTable, useDataTableState } from '@/components/admin-data-table'
import { columns } from '@/features/organizations/organizations.columns'
import { CreateOrganizationForm } from '@/features/organizations/components/create-organization-form'

export const Route = createFileRoute('/_authenticated/organizations')({
  component: () => (
    <Suspense fallback={<OrganizationsLoading />}>
      <Organizations />
    </Suspense>
  )
})

function OrganizationsLoading() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-60" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="p-4 space-y-3">
            {/* Header row */}
            <div className="flex gap-4 border-b pb-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between gap-8">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-48" />
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

// Status filter options
const statusOptions = [
  { value: OrganizationStatus.ACTIVE, label: 'Active' },
  { value: OrganizationStatus.ARCHIVED, label: 'Archived' },
  { value: OrganizationStatus.FROZEN, label: 'Frozen' }
]

function Organizations() {
  const { tableState } = useDataTableState({ defaultSortBy: 'title', defaultSortDesc: false })
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Additional filter state for status
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsArrayOf(parseAsInteger).withDefault([]))

  // When filters are active, fetch all data for client-side filtering
  const hasActiveFilters = Boolean(tableState.search) || statusFilter.length > 0

  const { data } = useSuspenseQuery(listOrganizations, {
    limit: hasActiveFilters ? 1000 : tableState.pageSize,
    page: hasActiveFilters ? 1 : tableState.page
  })

  const handleStatusChange = (checked: boolean, value: number) => {
    const newValues = statusFilter ? [...statusFilter] : []
    if (checked) {
      newValues.push(value)
    } else {
      const index = newValues.indexOf(value)
      if (index > -1) {
        newValues.splice(index, 1)
      }
    }
    setStatusFilter(newValues.length ? newValues : null)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="mt-1 text-muted-foreground">Manage organizations</p>
        </div>
      </div>

      <DataTable
        data={data.organizations}
        columns={columns}
        totalCount={data.total || 0}
        hasActiveFilters={hasActiveFilters}
        searchColumnId="title"
        searchPlaceholder="Search organizations..."
        entityName="organizations"
        defaultSortBy="title"
        defaultSortDesc={false}
        filterComponents={
          <StatusFilter
            statusOptions={statusOptions}
            selectedValues={statusFilter}
            onFilterChange={handleStatusChange}
          />
        }
        toolbarActions={
          <Button className="ml-auto" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
            Add organization
          </Button>
        }
      />

      <Suspense fallback={null}>
        <CreateOrganizationForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </Suspense>
    </div>
  )
}

// Status filter component
function StatusFilter({
  statusOptions,
  selectedValues,
  onFilterChange
}: {
  statusOptions: { value: number; label: string }[]
  selectedValues: number[]
  onFilterChange: (checked: boolean, value: number) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <FilterIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
          Status
          {selectedValues.length > 0 && (
            <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
              {selectedValues.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-36 p-3">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Filter by status</div>
          <div className="space-y-3">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => onFilterChange(!!checked, option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
