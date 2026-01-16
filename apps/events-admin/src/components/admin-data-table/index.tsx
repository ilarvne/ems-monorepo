'use client'

/* eslint-disable react-refresh/only-export-components */

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
  type VisibilityState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  CircleXIcon,
  Loader2Icon,
  SearchXIcon,
  Trash2Icon
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@repo/ui/components/alert-dialog'
import { Button, buttonVariants } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Label } from '@repo/ui/components/label'
import { Pagination, PaginationContent, PaginationItem, PaginationEllipsis } from '@repo/ui/components/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'
import { Skeleton } from '@repo/ui/components/skeleton'
import { cn } from '@repo/ui/lib/utils'

import { DataTableToolbar, type DensityValue } from './data-table-toolbar'
import { useDataTableState } from './use-data-table-state'

// ============================================================================
// Re-exports
// ============================================================================

export { useDataTableState } from './use-data-table-state'
export type { UseDataTableStateOptions } from './use-data-table-state'
export { createMultiColumnFilterFn } from './utils'
export { DataTableToolbar, DataTableSearch, DataTableViewOptions, DataTableDensityToggle } from './data-table-toolbar'
export type { DensityValue } from './data-table-toolbar'
export { FacetedFilter, type FacetedFilterOption, type FacetedFilterProps } from './faceted-filter'

// ============================================================================
// Types
// ============================================================================

export interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  totalCount: number
  hasActiveFilters?: boolean
  isLoading?: boolean
  searchColumnId?: string
  searchPlaceholder?: string
  enableVirtualization?: boolean
  enableDensityToggle?: boolean
  enableMultiSort?: boolean
  enableColumnResizing?: boolean
  defaultSortBy?: string
  defaultSortDesc?: boolean
  entityName?: string
  emptyState?: ReactNode
  toolbarActions?: ReactNode
  filterComponents?: ReactNode
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (selection: RowSelectionState) => void
  onRowClick?: (row: TData) => void
  onDeleteSelected?: (ids: (string | number)[]) => void
  /** Whether delete is currently in progress (shows loading state) */
  isDeleting?: boolean
  pageSizeOptions?: number[]
  getRowId?: (row: TData) => string
}

// ============================================================================
// Component: DataTable
// ============================================================================

export function DataTable<TData extends { id?: string | number }>({
  data,
  columns: baseColumns,
  totalCount,
  hasActiveFilters = false,
  isLoading = false,
  searchColumnId = 'title',
  searchPlaceholder = 'Search...',
  enableVirtualization = false,
  enableDensityToggle = false,
  enableMultiSort = false,
  enableColumnResizing = false,
  defaultSortBy = 'id',
  defaultSortDesc = false,
  entityName = 'items',
  emptyState,
  toolbarActions,
  filterComponents,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  onRowClick,
  onDeleteSelected,
  isDeleting = false,
  pageSizeOptions = [10, 25, 50, 100],
  getRowId: customGetRowId
}: DataTableProps<TData>) {
  const id = useId()
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [announcement, setAnnouncement] = useState<string>('')
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null)
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<(string | number)[]>([])

  // Support controlled or uncontrolled row selection
  const isControlled = controlledRowSelection !== undefined
  const rowSelection = isControlled ? controlledRowSelection : internalRowSelection

  const { tableState, setTableState } = useDataTableState({
    defaultSortBy,
    defaultSortDesc
  })

  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = []
    if (tableState.search) {
      filters.push({ id: searchColumnId, value: tableState.search })
    }
    return filters
  }, [tableState.search, searchColumnId])

  const columnVisibility: VisibilityState = useMemo(() => {
    const visibility: VisibilityState = {}
    tableState.hiddenColumns.forEach((col) => {
      visibility[col] = false
    })
    return visibility
  }, [tableState.hiddenColumns])

  const sorting: SortingState = useMemo(
    () => [{ id: tableState.sortBy, desc: tableState.sortDesc === 1 }],
    [tableState.sortBy, tableState.sortDesc]
  )

  const setColumnFilters = useCallback(
    (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
      const searchFilter = newFilters.find((f) => f.id === searchColumnId)
      setTableState({ search: (searchFilter?.value as string) || null, page: 1 })
    },
    [columnFilters, searchColumnId, setTableState]
  )

  const setColumnVisibility = useCallback(
    (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
      const hidden = Object.entries(newVisibility)
        .filter(([, visible]) => !visible)
        .map(([col]) => col)
      setTableState({ hiddenColumns: hidden.length > 0 ? hidden : null })
    },
    [columnVisibility, setTableState]
  )

  const setSorting = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      if (newSorting.length > 0) {
        setTableState({ sortBy: newSorting[0].id, sortDesc: newSorting[0].desc ? 1 : 0 })
        // Announce sort change for screen readers
        const direction = newSorting[0].desc ? 'descending' : 'ascending'
        setAnnouncement(`Sorted by ${newSorting[0].id}, ${direction}`)
      }
    },
    [sorting, setTableState]
  )

  const handleRowSelectionChange = useCallback(
    (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      // Update internal state if uncontrolled
      if (!isControlled) {
        setInternalRowSelection(newSelection)
      }
      // Always notify parent
      onRowSelectionChange?.(newSelection)
    },
    [rowSelection, isControlled, onRowSelectionChange]
  )

  const handleDensityChange = useCallback(
    (value: DensityValue) => {
      setTableState({ density: value })
    },
    [setTableState]
  )

  // Column with select checkbox and delete action
  const columns: ColumnDef<TData>[] = useMemo(
    () => [
      {
        id: 'select',
        size: 48,
        minSize: 48,
        maxSize: 48,
        enableHiding: false,
        enableSorting: false,
        header: () => null, // We use the Select All button in toolbar instead
        cell: ({ row }) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
          >
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
        )
      },
      ...baseColumns.filter((col) => col.id !== 'actions'), // Remove old actions column
      {
        id: 'delete',
        size: 48,
        minSize: 48,
        maxSize: 48,
        enableHiding: false,
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking delete
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                const rowId = row.original.id
                if (rowId !== undefined && onDeleteSelected) {
                  setPendingDeleteIds([rowId])
                  setDeleteConfirmOpen(true)
                }
              }}
              aria-label="Delete row"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    ],
    [baseColumns, onDeleteSelected]
  )

  // Custom getRowId function
  const getRowId = useCallback(
    (row: TData, index: number) => {
      if (customGetRowId) return customGetRowId(row)
      if (row.id !== undefined) return String(row.id)
      return String(index)
    },
    [customGetRowId]
  )

  // When hasActiveFilters is true: fetch all data, use client-side pagination
  // When hasActiveFilters is false: data is pre-paginated from server, use manual pagination
  const isServerSidePagination = !hasActiveFilters

  // For client-side pagination, we need internal state that's not tied to URL
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: tableState.pageSize
  })

  // Use URL-based pagination for server-side, internal state for client-side
  const pagination: PaginationState = useMemo(
    () => isServerSidePagination 
      ? { pageIndex: tableState.page - 1, pageSize: tableState.pageSize }
      : internalPagination,
    [isServerSidePagination, tableState.page, tableState.pageSize, internalPagination]
  )

  // Reset internal pagination when switching to client-side mode or when data changes significantly
  useEffect(() => {
    if (!isServerSidePagination) {
      setInternalPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [isServerSidePagination])

  const setPagination = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      
      if (isServerSidePagination) {
        // Server-side: update URL params
        setTableState({ page: newPagination.pageIndex + 1, pageSize: newPagination.pageSize })
      } else {
        // Client-side: update internal state only
        setInternalPagination(newPagination)
      }
    },
    [pagination, isServerSidePagination, setTableState]
  )

  // Column resize mode: 'onChange' updates during drag, 'onEnd' updates when released
  const columnResizeMode: ColumnResizeMode = 'onChange'

  const table = useReactTable({
    columns,
    data,
    getRowId,
    // For server-side pagination, provide rowCount so table knows total pages
    // For client-side pagination, let the table calculate from data
    ...(isServerSidePagination
      ? { manualPagination: true, rowCount: totalCount }
      : { manualPagination: false }),
    manualFiltering: false,
    enableSortingRemoval: false,
    enableMultiSort,
    maxMultiSortColCount: enableMultiSort ? 3 : 1,
    // Column resizing configuration
    enableColumnResizing,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: setSorting,
    state: { columnFilters, columnVisibility, pagination, rowSelection, sorting }
  })

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    estimateSize: () => (tableState.density === 'compact' ? 40 : 52),
    getScrollElement: () => tableContainerRef.current,
    overscan: 10,
    enabled: enableVirtualization
  })

  const handleClearFilters = useCallback(() => {
    table.resetColumnFilters()
    setTableState({ search: null, page: 1 })
  }, [table, setTableState])

  const handleRowClick = useCallback(
    (row: Row<TData>) => {
      if (onRowClick) {
        onRowClick(row.original)
      }
    },
    [onRowClick]
  )

  // Selection helpers
  const isAllSelected = table.getIsAllRowsSelected()
  const isSomeSelected = table.getIsSomeRowsSelected()

  const handleSelectAll = useCallback(() => {
    if (isAllSelected || isSomeSelected) {
      table.resetRowSelection()
      setAnnouncement('All rows deselected')
    } else {
      table.toggleAllRowsSelected(true)
      setAnnouncement(`All ${table.getRowModel().rows.length} rows selected`)
    }
  }, [table, isAllSelected, isSomeSelected])

  // Keyboard navigation for grid
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableElement>) => {
      const rows = table.getRowModel().rows
      const visibleColumns = table.getVisibleFlatColumns()
      if (!focusedCell || rows.length === 0) return

      const { rowIndex, colIndex } = focusedCell
      let newRowIndex = rowIndex
      let newColIndex = colIndex
      let handled = false

      switch (event.key) {
        case 'ArrowUp':
          if (rowIndex > 0) {
            newRowIndex = rowIndex - 1
            handled = true
          }
          break
        case 'ArrowDown':
          if (rowIndex < rows.length - 1) {
            newRowIndex = rowIndex + 1
            handled = true
          }
          break
        case 'ArrowLeft':
          if (colIndex > 0) {
            newColIndex = colIndex - 1
            handled = true
          }
          break
        case 'ArrowRight':
          if (colIndex < visibleColumns.length - 1) {
            newColIndex = colIndex + 1
            handled = true
          }
          break
        case 'Home':
          if (event.ctrlKey) {
            newRowIndex = 0
            newColIndex = 0
          } else {
            newColIndex = 0
          }
          handled = true
          break
        case 'End':
          if (event.ctrlKey) {
            newRowIndex = rows.length - 1
            newColIndex = visibleColumns.length - 1
          } else {
            newColIndex = visibleColumns.length - 1
          }
          handled = true
          break
        case 'Enter':
        case ' ':
          // Toggle selection or trigger click
          if (onRowClick) {
            onRowClick(rows[rowIndex].original)
            handled = true
          }
          break
        case 'Escape':
          // Clear focus
          setFocusedCell(null)
          tableRef.current?.blur()
          handled = true
          break
      }

      if (handled) {
        event.preventDefault()
        if (newRowIndex !== rowIndex || newColIndex !== colIndex) {
          setFocusedCell({ rowIndex: newRowIndex, colIndex: newColIndex })
          // Focus the cell element
          const cellId = `cell-${newRowIndex}-${newColIndex}`
          document.getElementById(cellId)?.focus()
        }
      }
    },
    [table, focusedCell, onRowClick]
  )

  // Initialize focus on first cell when table is focused
  const handleTableFocus = useCallback(() => {
    if (!focusedCell && table.getRowModel().rows.length > 0) {
      setFocusedCell({ rowIndex: 0, colIndex: 0 })
    }
  }, [focusedCell, table])

  // Pagination calculations
  // For server-side pagination, use totalCount prop
  // For client-side (filtered), use filtered row count
  const displayTotalCount = isServerSidePagination ? totalCount : table.getFilteredRowModel().rows.length
  const currentPage = table.getState().pagination.pageIndex + 1
  const pageSize = table.getState().pagination.pageSize
  // Calculate total pages ourselves to ensure consistency with displayTotalCount
  const totalPages = Math.ceil(displayTotalCount / pageSize)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <DataTableToolbar
        table={table}
        searchColumnId={searchColumnId}
        searchPlaceholder={searchPlaceholder}
        enableViewOptions={true}
        enableDensityToggle={enableDensityToggle}
        density={tableState.density as DensityValue}
        onDensityChange={handleDensityChange}
        filterSlot={filterComponents}
        actionSlot={
          <div className="flex items-center gap-2">
            {/* Select All / Deselect All Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-9 gap-2"
            >
              {isAllSelected || isSomeSelected ? (
                <>
                  <CircleXIcon className="h-4 w-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Select All
                </>
              )}
            </Button>

            {toolbarActions}
          </div>
        }
      />

      {/* Table */}
      <div className="rounded-lg border bg-background overflow-hidden">
        <div
          className={cn('overflow-x-hidden', enableVirtualization && 'max-h-[600px] overflow-y-auto')}
          ref={tableContainerRef}
        >
          <table
            ref={tableRef}
            role="grid"
            aria-label={`${entityName} data table`}
            aria-rowcount={displayTotalCount}
            aria-busy={isLoading}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={handleTableFocus}
            className="w-full table-fixed outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {/* ========== HEADER ========== */}
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b" role="rowgroup">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} role="row">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    // Only treat columns as numeric if they are specifically numeric value columns
                    // Exclude foreign key ID columns like organizationId, userId, etc.
                    const columnId = header.column.id.toLowerCase()
                    const isNumeric = columnId === 'id' || 
                      ['amount', 'price', 'count', 'total', 'quantity', 'balance'].some(
                        (key) => columnId.includes(key)
                      )
                    // Determine aria-sort value
                    const ariaSort = canSort
                      ? sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : 'none'
                      : undefined

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        role="columnheader"
                        aria-sort={ariaSort}
                        scope="col"
                        className={cn(
                          'h-11 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground relative',
                          'transition-colors duration-150',
                          isNumeric ? 'text-right' : 'text-left',
                          canSort && 'cursor-pointer select-none hover:bg-muted/60 hover:text-foreground',
                          sorted && 'text-foreground bg-muted/40'
                        )}
                        style={{ width: header.getSize() }}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center gap-1.5',
                              isNumeric && 'justify-end'
                            )}
                          >
                            <span className="truncate">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {canSort && (
                              <span
                                className={cn(
                                  'transition-all duration-200 flex-shrink-0',
                                  sorted ? 'opacity-100' : 'opacity-40'
                                )}
                              >
                                {sorted === 'asc' && <ArrowUpIcon className="h-3.5 w-3.5" />}
                                {sorted === 'desc' && <ArrowDownIcon className="h-3.5 w-3.5" />}
                                {!sorted && <ChevronsUpDownIcon className="h-3.5 w-3.5" />}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Column Resize Handle */}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onClick={(e) => e.stopPropagation()} // Prevent triggering sort
                            onDoubleClick={() => header.column.resetSize()} // Double-click to reset
                            className={cn(
                              'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                              'hover:bg-primary/50 transition-colors',
                              header.column.getIsResizing() && 'bg-primary'
                            )}
                          />
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            {/* ========== BODY ========== */}
            <tbody className="divide-y divide-border" role="rowgroup">
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: pageSize }).map((_, rowIndex) => (
                  <tr
                    key={`skeleton-${rowIndex}`}
                    role="row"
                    aria-hidden="true"
                    className={cn(
                      rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                      tableState.density === 'compact' ? 'h-10' : tableState.density === 'spacious' ? 'h-[72px]' : 'h-[52px]'
                    )}
                  >
                    {columns.map((_, colIndex) => (
                      <td
                        key={`skeleton-cell-${rowIndex}-${colIndex}`}
                        className={cn(
                          'px-3 align-middle',
                          tableState.density === 'compact' ? 'py-1' : tableState.density === 'spacious' ? 'py-4' : 'py-2'
                        )}
                      >
                        <Skeleton
                          className={cn(
                            'h-4',
                            colIndex === 0 ? 'w-4' : colIndex === columns.length - 1 ? 'w-8' : 'w-full max-w-[200px]'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                enableVirtualization ? (
                  <>
                    {rowVirtualizer.getVirtualItems().length > 0 && (
                      <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px` }} aria-hidden="true" />
                    )}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = table.getRowModel().rows[virtualRow.index]
                      return (
                        <TableRow
                          key={row.id}
                          row={row}
                          rowIndex={virtualRow.index}
                          density={tableState.density}
                          onClick={handleRowClick}
                          isClickable={!!onRowClick}
                          virtualRef={rowVirtualizer.measureElement}
                          dataIndex={virtualRow.index}
                          focusedCell={focusedCell}
                        />
                      )
                    })}
                    {rowVirtualizer.getVirtualItems().length > 0 && (
                      <tr
                        style={{
                          height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)}px`
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </>
                ) : (
                  table.getRowModel().rows.map((row, rowIndex) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      rowIndex={rowIndex}
                      density={tableState.density}
                      onClick={handleRowClick}
                      isClickable={!!onRowClick}
                      focusedCell={focusedCell}
                    />
                  ))
                )
              ) : (
                <tr role="row">
                  <td className="h-40 text-center" colSpan={columns.length} role="gridcell">
                    {emptyState || (
                      <div className="flex flex-col items-center justify-center gap-3 py-8">
                        <SearchXIcon className="h-10 w-10 text-muted-foreground/50" />
                        <div>
                          <p className="font-medium">No {entityName} found</p>
                          {hasActiveFilters && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Try adjusting your search or filter criteria
                            </p>
                          )}
                        </div>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" onClick={handleClearFilters}>
                            <CircleXIcon className="mr-2 h-4 w-4" />
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground whitespace-nowrap" htmlFor={`${id}-pageSize`}>
            Rows per page
          </Label>
          <Select
            onValueChange={(value) => table.setPageSize(Number(value))}
            value={table.getState().pagination.pageSize.toString()}
          >
            <SelectTrigger className="h-9 w-[70px]" id={`${id}-pageSize`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-auto">
          <PaginationContent className="gap-1">
            {/* First Page */}
            <PaginationItem>
              <Button
                aria-label="Go to first page"
                className="size-9"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.firstPage()}
                size="icon"
                variant="outline"
              >
                <ChevronFirstIcon className="size-4" />
              </Button>
            </PaginationItem>

            {/* Previous Page */}
            <PaginationItem>
              <Button
                aria-label="Go to previous page"
                className="size-9"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                size="icon"
                variant="outline"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
            </PaginationItem>

            {/* Page Numbers */}
            {(() => {
              const pages: (number | 'ellipsis')[] = []
              const maxVisiblePages = 5

              if (totalPages <= maxVisiblePages + 2) {
                // Show all pages if total is small
                for (let i = 1; i <= totalPages; i++) pages.push(i)
              } else {
                // Always show first page
                pages.push(1)

                // Calculate range around current page
                let rangeStart = Math.max(2, currentPage - 1)
                let rangeEnd = Math.min(totalPages - 1, currentPage + 1)

                // Adjust range to show more pages
                if (currentPage <= 3) {
                  rangeEnd = Math.min(totalPages - 1, 4)
                } else if (currentPage >= totalPages - 2) {
                  rangeStart = Math.max(2, totalPages - 3)
                }

                // Add ellipsis before range if needed
                if (rangeStart > 2) pages.push('ellipsis')

                // Add range pages
                for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)

                // Add ellipsis after range if needed
                if (rangeEnd < totalPages - 1) pages.push('ellipsis')

                // Always show last page
                if (totalPages > 1) pages.push(totalPages)
              }

              return pages.map((page, idx) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <Button
                      aria-label={`Go to page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={cn(
                        'size-9 font-medium',
                        currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                      )}
                      onClick={() => table.setPageIndex(page - 1)}
                      size="icon"
                      variant={currentPage === page ? 'default' : 'outline'}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                )
              )
            })()}

            {/* Next Page */}
            <PaginationItem>
              <Button
                aria-label="Go to next page"
                className="size-9"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                size="icon"
                variant="outline"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </PaginationItem>

            {/* Last Page */}
            <PaginationItem>
              <Button
                aria-label="Go to last page"
                className="size-9"
                disabled={!table.getCanNextPage()}
                onClick={() => table.lastPage()}
                size="icon"
                variant="outline"
              >
                <ChevronLastIcon className="size-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Screen reader live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent style={{ overscrollBehavior: 'contain' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDeleteIds.length === 1 ? 'Item' : `${pendingDeleteIds.length} Items`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{' '}
              {pendingDeleteIds.length === 1
                ? 'this item'
                : `these ${pendingDeleteIds.length} items`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSelected?.(pendingDeleteIds)
                setDeleteConfirmOpen(false)
                setPendingDeleteIds([])
              }}
              disabled={isDeleting}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {isDeleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
// TableRow Component - Extracted for cleaner code
// ============================================================================

interface TableRowProps<TData> {
  row: Row<TData>
  rowIndex: number
  density: string
  onClick?: (row: Row<TData>) => void
  isClickable: boolean
  virtualRef?: (element: HTMLTableRowElement | null) => void
  dataIndex?: number
  focusedCell?: { rowIndex: number; colIndex: number } | null
}

function TableRow<TData>({
  row,
  rowIndex,
  density,
  onClick,
  isClickable,
  virtualRef,
  dataIndex,
  focusedCell
}: TableRowProps<TData>) {
  const isEven = rowIndex % 2 === 0

  return (
    <tr
      ref={virtualRef}
      role="row"
      aria-rowindex={rowIndex + 2} // +2 because header row is 1
      aria-selected={row.getIsSelected()}
      data-index={dataIndex}
      data-state={row.getIsSelected() && 'selected'}
      className={cn(
        'transition-colors duration-150 border-l-2 border-l-transparent',
        // Zebra striping
        isEven ? 'bg-background' : 'bg-muted/30',
        // Hover state - subtle left border accent for neo-flat design
        'hover:bg-muted/50 hover:border-l-primary/50',
        // Selected state
        'data-[state=selected]:bg-primary/8 data-[state=selected]:border-l-primary data-[state=selected]:hover:bg-primary/12',
        // Clickable cursor
        isClickable && 'cursor-pointer',
        // Height based on density
        density === 'compact' ? 'h-10' : density === 'spacious' ? 'h-[72px]' : 'h-[52px]'
      )}
      onClick={() => onClick?.(row)}
    >
      {row.getVisibleCells().map((cell, colIndex) => {
        const isNumeric = ['id', 'amount', 'price', 'count', 'total'].some(
          (key) => cell.column.id.toLowerCase().includes(key)
        )
        const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === colIndex

        return (
          <td
            key={cell.id}
            id={`cell-${rowIndex}-${colIndex}`}
            role="gridcell"
            tabIndex={isFocused ? 0 : -1}
            className={cn(
              'px-3 align-middle overflow-hidden outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              density === 'compact' ? 'py-1' : density === 'spacious' ? 'py-4' : 'py-2',
              isNumeric ? 'text-right tabular-nums' : 'text-left'
            )}
            style={{ width: cell.column.getSize() }}
          >
            <div className="truncate">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

export type { ColumnDef, RowSelectionState, TanstackTable }
