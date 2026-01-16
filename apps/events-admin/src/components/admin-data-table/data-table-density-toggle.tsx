'use client'

import { RowsIcon } from 'lucide-react'

import { Button } from '@repo/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@repo/ui/components/dropdown-menu'

export type DensityValue = 'compact' | 'comfortable' | 'spacious'

interface DataTableDensityToggleProps {
  /** Current density value */
  value: DensityValue
  /** Callback when density changes */
  onChange: (value: DensityValue) => void
}

const densityOptions: { value: DensityValue; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: '40px - See more rows' },
  { value: 'comfortable', label: 'Comfortable', description: '52px - Balanced' },
  { value: 'spacious', label: 'Spacious', description: '72px - Easy reading' }
]

export function DataTableDensityToggle({ value, onChange }: DataTableDensityToggleProps) {
  const currentOption = densityOptions.find((opt) => opt.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='h-9'>
          <RowsIcon className='mr-2 size-4' />
          {currentOption?.label ?? 'Density'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuLabel>Row density</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as DensityValue)}>
          {densityOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
