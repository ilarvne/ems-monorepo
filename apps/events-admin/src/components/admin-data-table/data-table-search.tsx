'use client'

import { useRef } from 'react'
import type { Table } from '@tanstack/react-table'
import { SearchIcon, XIcon } from 'lucide-react'

import { Input } from '@repo/ui/components/input'
import { cn } from '@repo/ui/lib/utils'

interface DataTableSearchProps<TData> {
  /** Table instance from TanStack Table */
  table: Table<TData>
  /** Column ID to apply the search filter to */
  columnId: string
  /** Placeholder text */
  placeholder?: string
  /** Additional class names */
  className?: string
}

export function DataTableSearch<TData>({
  table,
  columnId,
  placeholder = 'Search...',
  className
}: DataTableSearchProps<TData>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const column = table.getColumn(columnId)
  const filterValue = (column?.getFilterValue() as string) ?? ''

  if (!column) {
    return null
  }

  const handleClear = () => {
    column.setFilterValue('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
      />
      <Input
        ref={inputRef}
        type='text'
        placeholder={placeholder}
        value={filterValue}
        onChange={(e) => column.setFilterValue(e.target.value)}
        className={cn('h-9 w-full pl-9 md:w-64', filterValue && 'pr-9')}
        aria-label={placeholder}
      />
      {filterValue && (
        <button
          type='button'
          onClick={handleClear}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
          aria-label='Clear search'
        >
          <XIcon className='size-4' />
        </button>
      )}
    </div>
  )
}
