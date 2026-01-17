import { type Organization, OrganizationStatus } from '@repo/proto'
import { type ColumnDef, type FilterFn } from '@tanstack/react-table'
import { Globe, CheckCircle2, XCircle, Snowflake, ImageIcon } from 'lucide-react'

import { Badge } from '@repo/ui/components/badge'
import { Instagram } from '@repo/ui/components/svgs/instagram'
import { LinkedIn } from '@repo/ui/components/svgs/linkedin'
import { Telegram } from '@repo/ui/components/svgs/telegram'
import { TiktokIconDark } from '@repo/ui/components/svgs/tiktokIconDark'
import { YouTube } from '@repo/ui/components/svgs/youtube'

import { formatDate } from '@/lib/utils'

import { SocialIcon } from './social-icon'

// Custom filter functions
export const multiColumnFilterFn: FilterFn<Organization> = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.title} ${row.original.description}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

export const statusFilterFn: FilterFn<Organization> = (row, columnId, filterValue: number[]) => {
  if (!filterValue?.length) return true
  const status = row.getValue(columnId) as number
  return filterValue.includes(status)
}

// Column definitions - no select/delete columns (DataTable adds them automatically)
export const columns: ColumnDef<Organization>[] = [
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
    accessorKey: 'imageUrl',
    header: 'Image',
    size: 64,
    minSize: 64,
    maxSize: 64,
    enableSorting: false,
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl
      return (
        <div className="flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={row.original.title}
              className="h-9 w-9 rounded-md object-cover bg-muted"
            />
          ) : (
            <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
            </div>
          )}
        </div>
      )
    }
  },
  {
    accessorKey: 'title',
    header: 'Organization',
    size: 200,
    minSize: 150,
    enableSorting: true,
    filterFn: multiColumnFilterFn,
    cell: ({ row }) => (
      <span className="font-medium text-sm truncate" title={row.original.title}>
        {row.original.title}
      </span>
    )
  },
  {
    accessorKey: 'organizationTypeId',
    header: 'Type',
    size: 80,
    minSize: 60,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        #{row.original.organizationTypeId}
      </span>
    )
  },
  {
    accessorKey: 'socials',
    header: 'Socials',
    size: 160,
    minSize: 140,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <SocialIcon url={row.original.instagram} icon={Instagram} />
        <SocialIcon url={row.original.linkedin} icon={LinkedIn} />
        <SocialIcon url={row.original.website} icon={Globe} />
        <SocialIcon url={row.original.youtube} icon={YouTube} />
        <SocialIcon url={row.original.tiktok} icon={TiktokIconDark} />
        <SocialIcon url={row.original.telegramChannel} icon={Telegram} variant="channel" />
        <SocialIcon url={row.original.telegramChat} icon={Telegram} variant="chat" />
      </div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 100,
    minSize: 90,
    enableSorting: true,
    filterFn: statusFilterFn,
    cell: ({ row }) => {
      const status = row.original.status || OrganizationStatus.ACTIVE
      return (
        <Badge
          variant="outline"
          className={
            status === OrganizationStatus.ACTIVE
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs'
              : status === OrganizationStatus.ARCHIVED
                ? 'bg-orange-50 text-orange-700 border-orange-200 gap-1 text-xs'
                : 'bg-blue-50 text-blue-700 border-blue-200 gap-1 text-xs'
          }
        >
          {status === OrganizationStatus.ACTIVE ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : status === OrganizationStatus.ARCHIVED ? (
            <XCircle className="h-3 w-3" />
          ) : (
            <Snowflake className="h-3 w-3" />
          )}
          {status === OrganizationStatus.ACTIVE
            ? 'Active'
            : status === OrganizationStatus.ARCHIVED
              ? 'Archived'
              : 'Frozen'}
        </Badge>
      )
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    size: 100,
    minSize: 90,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(row.original.createdAt)}
      </span>
    )
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    size: 100,
    minSize: 90,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {formatDate(row.original.updatedAt)}
      </span>
    )
  }
]
