import type { Tag } from '@repo/proto'
import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export const columns: ColumnDef<Tag>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 80,
    cell: ({ row }) => <div className='font-mono text-xs text-muted-foreground'>{row.getValue('id')}</div>
  },
  {
    accessorKey: 'name',
    header: 'Tag Name',
    size: 200,
    cell: ({ row }) => (
      <Badge variant='secondary' className='font-medium'>
        {row.getValue('name')}
      </Badge>
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    size: 150,
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return <div className='text-sm text-muted-foreground'>{date.toLocaleDateString()}</div>
    }
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    size: 150,
    cell: ({ row }) => {
      const date = new Date(row.getValue('updatedAt'))
      return <div className='text-sm text-muted-foreground'>{date.toLocaleDateString()}</div>
    }
  },
  {
    id: 'actions',
    size: 50,
    enableHiding: false,
    cell: ({ row }) => {
      const tag = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Open menu</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tag.id.toString())}>
              Copy tag ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit tag</DropdownMenuItem>
            <DropdownMenuItem className='text-destructive'>Delete tag</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]
