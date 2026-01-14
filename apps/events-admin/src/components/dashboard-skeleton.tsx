import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardSkeletonProps {
  /** Number of cards to show */
  cards?: number
  /** Number of columns on large screens */
  columns?: 2 | 3 | 4
}

/**
 * Skeleton loader for dashboard stat cards
 */
export function DashboardCardsSkeleton({ cards = 4, columns = 4 }: DashboardSkeletonProps) {
  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid gap-4 ${columnClasses[columns]}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='size-4 rounded-full' />
          </CardHeader>
          <CardContent>
            <Skeleton className='mb-1 h-8 w-[60px]' />
            <Skeleton className='h-3 w-[140px]' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Skeleton loader for a data table
 */
export function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-4'>
      {/* Table header */}
      <div className='flex items-center justify-between'>
        <Skeleton className='h-10 w-[250px]' />
        <Skeleton className='h-10 w-[100px]' />
      </div>
      {/* Table rows */}
      <div className='rounded-md border'>
        <div className='border-b p-4'>
          <div className='flex items-center gap-4'>
            <Skeleton className='h-4 w-[150px]' />
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='h-4 w-[80px]' />
            <Skeleton className='ml-auto h-4 w-[60px]' />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className='border-b p-4 last:border-0'>
            <div className='flex items-center gap-4'>
              <Skeleton className='h-4 w-[150px]' />
              <Skeleton className='h-4 w-[100px]' />
              <Skeleton className='h-4 w-[80px]' />
              <Skeleton className='ml-auto h-8 w-8 rounded-full' />
            </div>
          </div>
        ))}
      </div>
      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <Skeleton className='h-4 w-[150px]' />
        <div className='flex gap-2'>
          <Skeleton className='size-8' />
          <Skeleton className='size-8' />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for chart/graph components
 */
export function ChartSkeleton({ height = 350 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className='h-5 w-[150px]' />
        <Skeleton className='h-4 w-[250px]' />
      </CardHeader>
      <CardContent>
        <Skeleton className='w-full' style={{ height }} />
      </CardContent>
    </Card>
  )
}

/**
 * Full page skeleton for dashboard route
 */
export function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Page header */}
      <div className='space-y-1'>
        <Skeleton className='h-8 w-[200px]' />
        <Skeleton className='h-4 w-[350px]' />
      </div>
      {/* Stats cards */}
      <DashboardCardsSkeleton cards={4} columns={4} />
      {/* Charts row */}
      <div className='grid gap-4 md:grid-cols-2'>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      {/* Data table */}
      <DataTableSkeleton rows={5} />
    </div>
  )
}
