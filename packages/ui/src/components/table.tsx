import * as React from 'react'

import { cn } from '@repo/ui/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot='table-container' className='relative w-full overflow-x-auto'>
      <table data-slot='table' className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot='table-header' className={cn('bg-muted/50 [&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot='table-body' className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot='table-footer'
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot='table-row'
      className={cn('hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot='table-head'
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot='table-cell'
      className={cn(
        'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption data-slot='table-caption' className={cn('text-muted-foreground mt-4 text-sm', className)} {...props} />
  )
}

/**
 * Column resize handle component for Excel-like column resizing.
 * Use this in TableHead cells that should be resizable.
 */
interface ColumnResizerProps {
  onMouseDown: React.MouseEventHandler<HTMLDivElement>
  onTouchStart: React.TouchEventHandler<HTMLDivElement>
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>
  isResizing?: boolean
  className?: string
}

function ColumnResizer({ 
  onMouseDown, 
  onTouchStart, 
  onDoubleClick,
  isResizing = false, 
  className 
}: ColumnResizerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
      data-resizing={isResizing}
      className={cn(
        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none z-10',
        'bg-transparent hover:bg-primary/50 transition-colors',
        isResizing && 'bg-primary',
        className
      )}
    />
  )
}

/**
 * Truncated cell content wrapper for text that may overflow.
 * Displays a tooltip on hover with the full content.
 */
interface TruncatedCellProps {
  children: React.ReactNode
  title?: string
  className?: string
  maxWidth?: string
}

function TruncatedCell({ children, title, className, maxWidth }: TruncatedCellProps) {
  const content = typeof children === 'string' ? children : undefined
  
  return (
    <div 
      className={cn('truncate', className)}
      style={{ maxWidth: maxWidth || '100%' }}
      title={title || content}
    >
      {children}
    </div>
  )
}

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption,
  ColumnResizer,
  TruncatedCell
}
