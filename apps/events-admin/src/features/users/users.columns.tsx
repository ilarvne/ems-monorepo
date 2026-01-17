import { type User } from '@repo/proto'
import { type ColumnDef, type FilterFn } from '@tanstack/react-table'

import { formatDate } from '@/lib/utils'

import { UserAvatar } from './user-avatar'

// Custom filter function for multi-column searching
export const multiColumnFilterFn: FilterFn<User> = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.username} ${row.original.email}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

// Column definitions - no select/delete columns (DataTable adds them automatically)
export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 60,
    minSize: 60,
    maxSize: 60,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.id}
      </span>
    )
  },
  {
    accessorKey: 'username',
    header: 'User',
    size: 200,
    minSize: 150,
    enableSorting: true,
    filterFn: multiColumnFilterFn,
    cell: ({ row }) => {
      const username = row.getValue('username') as string
      return (
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar username={username} />
          <span className="font-medium text-sm truncate" title={username}>
            {username}
          </span>
        </div>
      )
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
    size: 220,
    minSize: 150,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm truncate" title={row.getValue('email') as string}>
        {row.getValue('email') as string}
      </span>
    )
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    size: 120,
    minSize: 100,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(row.getValue('created_at') as string)}
      </span>
    )
  }
]
