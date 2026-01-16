'use client'

import { useMemo } from 'react'
import type { Column } from '@tanstack/react-table'
import { FilterIcon } from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import { Checkbox } from '@repo/ui/components/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover'

export interface FacetedFilterOption {
  value: number | string
  label: string
}

export interface FacetedFilterProps<TData> {
  /** The column to filter */
  column: Column<TData, unknown> | undefined
  /** The title to display on the button */
  title: string
  /** Options for the filter */
  options: FacetedFilterOption[]
}

export function FacetedFilter<TData>({ column, title, options }: FacetedFilterProps<TData>) {
  // Get current filter values
  const selectedValues = useMemo(() => {
    const filterValue = column?.getFilterValue() as (number | string)[]
    return filterValue ?? []
  }, [column])

  // Get counts for each value from faceted values
  const facetedCounts = useMemo(() => {
    if (!column) return new Map()
    return column.getFacetedUniqueValues()
  }, [column])

  const handleChange = (checked: boolean, value: number | string) => {
    const currentValues = column?.getFilterValue() as (number | string)[] | undefined
    const newValues = currentValues ? [...currentValues] : []

    if (checked) {
      newValues.push(value)
    } else {
      const index = newValues.indexOf(value)
      if (index > -1) {
        newValues.splice(index, 1)
      }
    }

    column?.setFilterValue(newValues.length ? newValues : undefined)
  }

  if (!column) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline'>
          <FilterIcon aria-hidden='true' className='-ms-1 opacity-60' size={16} />
          {title}
          {selectedValues.length > 0 && (
            <span className='-me-1 inline-flex h-5 max-h-full items-center rounded border bg-background px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground/70'>
              {selectedValues.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto min-w-36 p-3'>
        <div className='space-y-3'>
          <div className='font-medium text-muted-foreground text-xs'>Filter by {title.toLowerCase()}</div>
          <div className='space-y-3'>
            {options.map((option) => (
              <label key={String(option.value)} className='flex cursor-pointer items-center gap-2'>
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => handleChange(!!checked, option.value)}
                />
                <span className='flex grow justify-between gap-2 text-sm'>
                  <span>{option.label}</span>
                  <span className='text-muted-foreground'>{facetedCounts.get(option.value) ?? 0}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
