'use client'

import type { ReactNode } from 'react'
import type { Table } from '@tanstack/react-table'
import { XIcon } from 'lucide-react'

import { Button } from '@repo/ui/components/button'

import { DataTableSearch } from './data-table-search'
import { DataTableViewOptions } from './data-table-view-options'
import { DataTableDensityToggle, type DensityValue } from './data-table-density-toggle'

interface DataTableToolbarProps<TData> {
  /** Table instance from TanStack Table */
  table: Table<TData>
  /** Column ID to apply the search filter to */
  searchColumnId?: string
  /** Placeholder text for search input */
  searchPlaceholder?: string
  /** Whether to show the column visibility toggle */
  enableViewOptions?: boolean
  /** Whether to show the density toggle */
  enableDensityToggle?: boolean
  /** Current density value */
  density?: DensityValue
  /** Callback when density changes */
  onDensityChange?: (value: DensityValue) => void
  /** Additional filter components to render */
  filterSlot?: ReactNode
  /** Action buttons to render on the right side */
  actionSlot?: ReactNode
  /** Custom column name formatter for view options */
  formatColumnName?: (columnId: string) => string
}

export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchPlaceholder = 'Search...',
  enableViewOptions = true,
  enableDensityToggle = false,
  density = 'comfortable',
  onDensityChange,
  filterSlot,
  actionSlot,
  formatColumnName
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      {/* Left side: Search and filters */}
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {searchColumnId && (
          <DataTableSearch
            table={table}
            columnId={searchColumnId}
            placeholder={searchPlaceholder}
          />
        )}

        {filterSlot}

        {isFiltered && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => table.resetColumnFilters()}
            className='h-9 px-2 lg:px-3'
          >
            Reset
            <XIcon className='ml-2 size-4' />
          </Button>
        )}
      </div>

      {/* Right side: View options and actions */}
      <div className='flex items-center gap-2'>
        {enableDensityToggle && onDensityChange && (
          <DataTableDensityToggle value={density} onChange={onDensityChange} />
        )}

        {enableViewOptions && (
          <DataTableViewOptions table={table} formatColumnName={formatColumnName} />
        )}

        {actionSlot}
      </div>
    </div>
  )
}

export { DataTableSearch } from './data-table-search'
export { DataTableViewOptions } from './data-table-view-options'
export { DataTableDensityToggle, type DensityValue } from './data-table-density-toggle'
