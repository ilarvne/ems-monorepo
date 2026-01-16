'use client'

import { parseAsInteger, parseAsString, parseAsArrayOf, useQueryStates } from 'nuqs'

export interface UseDataTableStateOptions {
  defaultSortBy?: string
  defaultSortDesc?: boolean
}

export function useDataTableState(options: UseDataTableStateOptions = {}) {
  const { defaultSortBy = 'id', defaultSortDesc = false } = options

  const [tableState, setTableState] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      pageSize: parseAsInteger.withDefault(10),
      search: parseAsString.withDefault(''),
      sortBy: parseAsString.withDefault(defaultSortBy),
      sortDesc: parseAsInteger.withDefault(defaultSortDesc ? 1 : 0),
      hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
      density: parseAsString.withDefault('comfortable')
    },
    {
      history: 'push'
    }
  )

  return { tableState, setTableState }
}
