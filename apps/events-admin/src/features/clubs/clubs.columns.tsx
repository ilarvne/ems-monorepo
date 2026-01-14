import type { Organization } from '@repo/proto'
import { OrganizationStatus } from '@repo/proto'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { Globe, CheckCircle2, XCircle, Snowflake } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Instagram } from '@/components/ui/svgs/instagram'
import { Linkedin } from '@/components/ui/svgs/linkedin'
import { Telegram } from '@/components/ui/svgs/telegram'
import { TiktokIconDark } from '@/components/ui/svgs/tiktokIconDark'
import { Youtube } from '@/components/ui/svgs/youtube'

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

export const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'imageUrl',
    header: 'Image',
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl
      return imageUrl ? (
        <img src={imageUrl} alt={row.original.title} className='h-10 w-10 rounded-md object-cover' />
      ) : (
        <div className='h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground'>
          No img
        </div>
      )
    }
  },
  {
    accessorKey: 'title',
    header: 'Club Name'
  },
  {
    accessorKey: 'organizationTypeId',
    header: 'Type ID'
  },
  // {
  //   accessorKey: 'description',
  //   header: 'Description',
  //   cell: ({ row }) => row.original.description || 'N/A'
  // },
  {
    accessorKey: 'socials',
    header: 'Socials',
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <SocialIcon url={row.original.instagram} icon={Instagram} />
        <SocialIcon url={row.original.linkedin} icon={Linkedin} />
        <SocialIcon url={row.original.website} icon={Globe} />
        <SocialIcon url={row.original.youtube} icon={Youtube} />
        <SocialIcon url={row.original.tiktok} icon={TiktokIconDark} />
        <SocialIcon url={row.original.telegramChannel} icon={Telegram} variant='channel' />
        <SocialIcon url={row.original.telegramChat} icon={Telegram} variant='chat' />
      </div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    filterFn: statusFilterFn,
    cell: ({ row }) => {
      const status = row.original.status || OrganizationStatus.ACTIVE
      console.log(`organization name: ${row.original.title}, status: ${status}`)
      return (
        <Badge
          variant='outline'
          className={
            status === OrganizationStatus.ACTIVE
              ? 'text-green-700 dark:text-green-400 border-green-500/50'
              : status === OrganizationStatus.ARCHIVED
                ? 'text-orange-700 dark:text-orange-400 border-orange-500/50'
                : 'text-blue-700 dark:text-blue-400 border-blue-500/50'
          }
        >
          {status === OrganizationStatus.ACTIVE ? (
            <CheckCircle2 className='h-3 w-3' />
          ) : status === OrganizationStatus.ARCHIVED ? (
            <XCircle className='h-3 w-3' />
          ) : (
            <Snowflake className='h-3 w-3' />
          )}
          <span className='capitalize'>
            {status === OrganizationStatus.ACTIVE
              ? 'Active'
              : status === OrganizationStatus.ARCHIVED
                ? 'Archived'
                : 'Frozen'}
          </span>
        </Badge>
      )
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.original.createdAt
      return date ? new Date(date).toLocaleDateString() : 'N/A'
    }
  },
  {
    accessorKey: 'updatedAt',
    header: 'Last Updated',
    cell: ({ row }) => {
      const date = row.original.updatedAt
      return date ? new Date(date).toLocaleDateString() : 'N/A'
    }
  }
]
