import { PlatformRole, type User } from '@repo/proto'
import { type ColumnDef, type FilterFn } from '@tanstack/react-table'
import { MoreHorizontalIcon, ShieldIcon, Trash2Icon } from 'lucide-react'

import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@repo/ui/components/dropdown-menu'

import { formatDate } from '@/lib/utils'

import { AssignRoleDialog } from './assign-role-dialog'
import { UserAvatar } from './user-avatar'

// Custom filter function for multi-column searching
export const multiColumnFilterFn: FilterFn<User> = (row, _columnId, filterValue) => {
  const { firstName, lastName, username, email } = row.original
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : ''
  const searchableRowContent = `${fullName} ${username} ${email}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

// Helper to get display name
function getDisplayName(user: User): { name: string; isPending: boolean } {
  if (user.firstName && user.lastName) {
    return { name: `${user.firstName} ${user.lastName}`, isPending: false }
  }
  if (user.firstName) {
    return { name: user.firstName, isPending: false }
  }
  // No name set - show username but mark as pending
  return { name: user.username, isPending: true }
}

// Helper to get role badge styling
function getRoleBadge(role: PlatformRole) {
  switch (role) {
    case PlatformRole.ADMIN:
      return <Badge variant="default">Admin</Badge>
    case PlatformRole.STAFF:
      return <Badge variant="secondary">Staff</Badge>
    default:
      return <span className="text-xs text-muted-foreground">User</span>
  }
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
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
  },
  {
    id: 'name',
    accessorKey: 'firstName',
    header: 'Name',
    size: 200,
    minSize: 150,
    enableSorting: true,
    filterFn: multiColumnFilterFn,
    cell: ({ row }) => {
      const { name, isPending } = getDisplayName(row.original)
      return (
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar username={row.original.username} />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate" title={name}>
              {name}
            </span>
            {isPending && <span className="text-xs text-muted-foreground">Profile incomplete</span>}
          </div>
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
    accessorKey: 'platformRole',
    header: 'Role',
    size: 100,
    minSize: 80,
    enableSorting: true,
    cell: ({ row }) => getRoleBadge(row.original.platformRole)
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    size: 120,
    minSize: 100,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(row.original.createdAt)}
      </span>
    )
  },
  {
    id: 'actions',
    header: '',
    size: 50,
    cell: ({ row }) => {
      const user = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AssignRoleDialog user={user}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <ShieldIcon className="mr-2 h-4 w-4" />
                Assign role
              </DropdownMenuItem>
            </AssignRoleDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" disabled title="Coming soon">
              <Trash2Icon className="mr-2 h-4 w-4" />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]
