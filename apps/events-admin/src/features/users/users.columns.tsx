import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { useState } from 'react'
import type { User } from '@repo/proto'

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<User> = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.username} ${row.original.email}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

const UserAvatar = ({ username }: { username: string }) => {
  const [imageError, setImageError] = useState(false)
  const avatarUrl = `https://t.me/i/userpic/320/${username}.jpg`

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    // Check if image is 1x1 pixel (placeholder)
    if (img.naturalWidth === 1 && img.naturalHeight === 1) {
      setImageError(true)
    }
  }

  if (imageError) {
    return (
      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium'>
        {username.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      alt={username}
      className='h-10 w-10 shrink-0 rounded-full object-cover'
      onError={() => setImageError(true)}
      onLoad={handleImageLoad}
      src={avatarUrl}
    />
  )
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 60
  },
  {
    accessorKey: 'username',
    header: 'Username',
    size: 200,
    filterFn: multiColumnFilterFn,
    cell: ({ row }) => {
      const username = row.getValue('username') as string

      return (
        <div className='flex items-center gap-3'>
          <UserAvatar username={username} />
          <span className='font-medium'>{username}</span>
        </div>
      )
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
    size: 200
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    size: 150,
    cell: ({ row }) => {
      const dateString = row.getValue('created_at') as string
      if (!dateString) return '-'
      
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date)
    }
  }
]
