'use client'

import type { Table } from '@tanstack/react-table'
import { Settings2Icon } from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@repo/ui/components/dropdown-menu'

interface DataTableViewOptionsProps<TData> {
  /** Table instance from TanStack Table */
  table: Table<TData>
  /** Custom column name formatter */
  formatColumnName?: (columnId: string) => string
}

/**
 * Formats a column ID into a human-readable title
 * Converts camelCase and snake_case to Title Case
 */
function defaultFormatColumnName(columnId: string): string {
  return columnId
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\s+/, '')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function DataTableViewOptions<TData>({
  table,
  formatColumnName = defaultFormatColumnName
}: DataTableViewOptionsProps<TData>) {
  const hidableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())

  if (hidableColumns.length === 0) {
    return null
  }

  const hiddenCount = hidableColumns.filter((col) => !col.getIsVisible()).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='h-9'>
          <Settings2Icon className='mr-2 size-4' />
          View
          {hiddenCount > 0 && (
            <span className='ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium'>
              {hiddenCount} hidden
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hidableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
            onSelect={(e) => e.preventDefault()}
          >
            {formatColumnName(column.id)}
          </DropdownMenuCheckboxItem>
        ))}
        {hiddenCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={() => {
                hidableColumns.forEach((col) => col.toggleVisibility(true))
              }}
              onSelect={(e) => e.preventDefault()}
            >
              Show all
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
