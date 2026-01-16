import { type Tag } from '@repo/proto'
import { type ColumnDef, type FilterFn } from '@tanstack/react-table'

import { Badge } from '@repo/ui/components/badge'

// Helper function for formatting dates
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  } catch {
    return '-'
  }
}

// Custom filter function for tag name searching
export const multiColumnFilterFn: FilterFn<Tag> = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.name}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

// Column definitions - no select/delete columns (DataTable adds them automatically)
export const columns: ColumnDef<Tag>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 70,
    minSize: 60,
    maxSize: 80,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue('id')}
      </span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Tag Name',
    size: 200,
    minSize: 120,
    enableSorting: true,
    filterFn: multiColumnFilterFn,
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-medium text-xs truncate max-w-full">
        {row.getValue('name')}
      </Badge>
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    size: 120,
    minSize: 100,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(row.getValue('createdAt') as string)}
      </span>
    )
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    size: 120,
    minSize: 100,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(row.getValue('updatedAt') as string)}
      </span>
    )
  }
]
