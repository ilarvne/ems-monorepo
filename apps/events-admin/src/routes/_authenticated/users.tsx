import { useSuspenseQuery } from '@connectrpc/connect-query'
import { listUsers } from '@repo/proto'
import type { User } from '@repo/proto'
import { createFileRoute } from '@tanstack/react-router'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
  type VisibilityState
} from '@tanstack/react-table'
import {
  ListFilterIcon,
  CircleXIcon,
  Columns3Icon,
  PlusIcon,
  ChevronFirstIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronLastIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon
} from 'lucide-react'
import { parseAsInteger, parseAsString, parseAsArrayOf, useQueryStates } from 'nuqs'
import { Suspense, useMemo, useRef, useId } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { cn } from '@/lib/utils'

import { columns as baseColumns } from '@/features/users/users.columns'

export const Route = createFileRoute('/_authenticated/users')({
  component: () => (
    <Suspense fallback={<UsersLoading />}>
      <Users />
    </Suspense>
  )
})

function UsersLoading() {
  return (
    <div className='p-8'>
      <div className='flex justify-between items-center mb-6'>
        <div className='space-y-2'>
          <Skeleton className='h-9 w-24' />
          <Skeleton className='h-5 w-48' />
        </div>
      </div>

      <div className='space-y-4'>
        {/* Filters skeleton */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <Skeleton className='h-10 w-60' />
            <Skeleton className='h-10 w-20' />
          </div>
          <Skeleton className='h-10 w-24' />
        </div>

        {/* Table skeleton */}
        <div className='overflow-hidden rounded-md border bg-background'>
          <div className='p-4 space-y-3'>
            {/* Header row */}
            <div className='flex gap-4'>
              <Skeleton className='h-4 w-8' />
              <Skeleton className='h-4 w-12' />
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-4 w-48' />
              <Skeleton className='h-4 w-32' />
            </div>
            {/* Table rows */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className='flex gap-4 items-center'>
                <Skeleton className='h-4 w-8' />
                <Skeleton className='h-4 w-12' />
                <div className='flex items-center gap-3'>
                  <Skeleton className='h-10 w-10 rounded-full' />
                  <Skeleton className='h-4 w-24' />
                </div>
                <Skeleton className='h-4 w-48' />
                <Skeleton className='h-4 w-32' />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination skeleton */}
        <div className='flex items-center justify-between gap-8'>
          <Skeleton className='h-10 w-32' />
          <Skeleton className='h-5 w-40' />
          <div className='flex gap-2'>
            <Skeleton className='h-10 w-10' />
            <Skeleton className='h-10 w-10' />
            <Skeleton className='h-10 w-10' />
            <Skeleton className='h-10 w-10' />
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<User> = (row, _columnId, filterValue) => {
  const searchableRowContent = `${row.original.username} ${row.original.email}`.toLowerCase()
  const searchTerm = (filterValue ?? '').toLowerCase()
  return searchableRowContent.includes(searchTerm)
}

function Users() {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // URL state management with nuqs
  const [tableState, setTableState] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(10),
      search: parseAsString.withDefault(''),
      sortBy: parseAsString.withDefault('id'),
      sortDesc: parseAsInteger.withDefault(0),
      hiddenColumns: parseAsArrayOf(parseAsString).withDefault([])
    },
    {
      history: 'push'
    }
  )

  // Fetch data based on pagination state
  const hasActiveFilters = tableState.search

  const { data } = useSuspenseQuery(listUsers, {
    limit: hasActiveFilters ? 1000 : tableState.pageSize,
    page: hasActiveFilters ? 1 : tableState.page
  })

  // Sync URL state to table state
  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = []
    if (tableState.search) {
      filters.push({ id: 'username', value: tableState.search })
    }
    return filters
  }, [tableState.search])

  const columnVisibility: VisibilityState = useMemo(() => {
    const visibility: VisibilityState = {}
    tableState.hiddenColumns.forEach((col) => {
      visibility[col] = false
    })
    return visibility
  }, [tableState.hiddenColumns])

  const pagination: PaginationState = useMemo(
    () => ({
      pageIndex: tableState.page - 1,
      pageSize: tableState.pageSize
    }),
    [tableState.page, tableState.pageSize]
  )

  const sorting: SortingState = useMemo(
    () => [
      {
        id: tableState.sortBy,
        desc: tableState.sortDesc === 1
      }
    ],
    [tableState.sortBy, tableState.sortDesc]
  )

  // Handlers to update URL state
  const setColumnFilters = (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
    const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
    const searchFilter = newFilters.find((f) => f.id === 'username')

    setTableState({
      search: (searchFilter?.value as string) || null,
      page: 1
    })
  }

  const setColumnVisibility = (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
    const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
    const hidden = Object.entries(newVisibility)
      .filter(([, visible]) => !visible)
      .map(([col]) => col)

    setTableState({
      hiddenColumns: hidden.length > 0 ? hidden : null
    })
  }

  const setPagination = (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater
    setTableState({
      page: newPagination.pageIndex + 1,
      pageSize: newPagination.pageSize
    })
  }

  const setSorting = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater
    if (newSorting.length > 0) {
      setTableState({
        sortBy: newSorting[0].id,
        sortDesc: newSorting[0].desc ? 1 : 0
      })
    }
  }

  // Enhanced columns with select and sorting
  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: 'select',
        size: 28,
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            aria-label='Select all'
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label='Select row'
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        )
      },
      ...baseColumns.filter((col) => 'accessorKey' in col && col.accessorKey !== 'id')
    ],
    []
  )

  const table = useReactTable({
    columns,
    data: data.users,
    pageCount: hasActiveFilters ? -1 : Math.ceil((data.total || 0) / pagination.pageSize),
    manualPagination: !hasActiveFilters,
    manualFiltering: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnVisibility,
      pagination,
      sorting
    }
  })

  return (
    <div className='p-8'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Users</h1>
          <p className='text-muted-foreground mt-1'>Manage users and accounts</p>
        </div>
      </div>

      <div className='space-y-4'>
        {/* Filters */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            {/* Filter by username or email */}
            <div className='relative'>
              <Input
                aria-label='Filter by username or email'
                className={cn('peer min-w-60 ps-9', Boolean(table.getColumn('username')?.getFilterValue()) && 'pe-9')}
                id={`${id}-input`}
                onChange={(e) => table.getColumn('username')?.setFilterValue(e.target.value)}
                placeholder='Search users...'
                ref={inputRef}
                type='text'
                value={(table.getColumn('username')?.getFilterValue() ?? '') as string}
              />
              <div className='pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50'>
                <ListFilterIcon aria-hidden='true' size={16} />
              </div>
              {Boolean(table.getColumn('username')?.getFilterValue()) && (
                <button
                  aria-label='Clear filter'
                  className='absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
                  onClick={() => {
                    table.getColumn('username')?.setFilterValue('')
                    if (inputRef.current) {
                      inputRef.current.focus()
                    }
                  }}
                  type='button'
                >
                  <CircleXIcon aria-hidden='true' size={16} />
                </button>
              )}
            </div>

            {/* Toggle columns visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline'>
                  <Columns3Icon aria-hidden='true' className='-ms-1 opacity-60' size={16} />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        checked={column.getIsVisible()}
                        className='capitalize'
                        key={column.id}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Add user button */}
          <Button className='ml-auto'>
            <PlusIcon aria-hidden='true' className='-ms-1 opacity-60' size={16} />
            Add user
          </Button>
        </div>

        {/* Table */}
        <div className='overflow-hidden rounded-md border bg-background'>
          <Table className='table-fixed'>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow className='hover:bg-transparent' key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        className='h-11'
                        key={header.id}
                        style={{ width: header.getSize() ? `${header.getSize()}px` : undefined }}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <Button
                            className='-ms-3 h-auto p-3 data-[state=open]:bg-accent'
                            onClick={header.column.getToggleSortingHandler()}
                            variant='ghost'
                          >
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {{
                              asc: <ArrowUpIcon aria-hidden='true' className='ms-2 size-4' />,
                              desc: <ArrowDownIcon aria-hidden='true' className='ms-2 size-4' />
                            }[header.column.getIsSorted() as string] ?? (
                              <ChevronsUpDownIcon aria-hidden='true' className='ms-2 size-4 opacity-40' />
                            )}
                          </Button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow data-state={row.getIsSelected() && 'selected'} key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell className='last:py-0' key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className='h-24 text-center' colSpan={columns.length}>
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between gap-8'>
          {/* Results per page */}
          <div className='flex items-center gap-3'>
            <Label className='max-sm:sr-only' htmlFor={id}>
              Rows per page
            </Label>
            <Select
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
              value={table.getState().pagination.pageSize.toString()}
            >
              <SelectTrigger className='w-fit whitespace-nowrap' id={id}>
                <SelectValue placeholder='Select number of results' />
              </SelectTrigger>
              <SelectContent className='[&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2 [&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8'>
                {[5, 10, 25, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page number information */}
          <div className='flex grow justify-end whitespace-nowrap text-muted-foreground text-sm'>
            <p aria-live='polite' className='whitespace-nowrap text-muted-foreground text-sm'>
              <span className='text-foreground'>
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  hasActiveFilters ? table.getFilteredRowModel().rows.length : data.total || 0
                )}
              </span>{' '}
              of{' '}
              <span className='text-foreground'>
                {hasActiveFilters ? table.getFilteredRowModel().rows.length : data.total || 0}
              </span>
            </p>
          </div>

          {/* Pagination buttons */}
          <div>
            <Pagination>
              <PaginationContent>
                {/* First page button */}
                <PaginationItem>
                  <Button
                    aria-label='Go to first page'
                    className='disabled:pointer-events-none disabled:opacity-50'
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.firstPage()}
                    size='icon'
                    variant='outline'
                  >
                    <ChevronFirstIcon aria-hidden='true' size={16} />
                  </Button>
                </PaginationItem>
                {/* Previous page button */}
                <PaginationItem>
                  <Button
                    aria-label='Go to previous page'
                    className='disabled:pointer-events-none disabled:opacity-50'
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                    size='icon'
                    variant='outline'
                  >
                    <ChevronLeftIcon aria-hidden='true' size={16} />
                  </Button>
                </PaginationItem>
                {/* Next page button */}
                <PaginationItem>
                  <Button
                    aria-label='Go to next page'
                    className='disabled:pointer-events-none disabled:opacity-50'
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                    size='icon'
                    variant='outline'
                  >
                    <ChevronRightIcon aria-hidden='true' size={16} />
                  </Button>
                </PaginationItem>
                {/* Last page button */}
                <PaginationItem>
                  <Button
                    aria-label='Go to last page'
                    className='disabled:pointer-events-none disabled:opacity-50'
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.lastPage()}
                    size='icon'
                    variant='outline'
                  >
                    <ChevronLastIcon aria-hidden='true' size={16} />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  )
}
