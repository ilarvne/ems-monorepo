import type { FilterFn } from '@tanstack/react-table'

/**
 * Create a multi-column filter function for TanStack Table
 * @param getSearchableContent Function to extract searchable content from a row
 * @returns FilterFn that can be used as a column filter
 */
export function createMultiColumnFilterFn<TData>(
  getSearchableContent: (row: TData) => string
): FilterFn<TData> {
  return (row, _columnId, filterValue) => {
    const searchableRowContent = getSearchableContent(row.original).toLowerCase()
    const searchTerm = (filterValue ?? '').toLowerCase()
    return searchableRowContent.includes(searchTerm)
  }
}
