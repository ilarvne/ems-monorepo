import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

import { DataTable } from '@/components/data-table'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/analytics')({
  component: Analytics
})

function Analytics() {
  const mockData = [
    {
      id: 1,
      header: 'Executive Summary',
      type: 'Executive Summary',
      status: 'Done',
      target: '2',
      limit: '5',
      reviewer: 'Eddie Lake'
    },
    {
      id: 2,
      header: 'Technical Approach',
      type: 'Technical Approach',
      status: 'In Progress',
      target: '10',
      limit: '15',
      reviewer: 'Jamik Tashpulatov'
    },
    {
      id: 3,
      header: 'Past Performance',
      type: 'Narrative',
      status: 'Not Started',
      target: '5',
      limit: '8',
      reviewer: 'Assign reviewer'
    }
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Event Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze event performance, identify opportunities, and track organization activity
        </p>
      </div>
      <Suspense
        fallback={
          <div className="px-4 lg:px-6">
            <Skeleton className="h-[600px] w-full" />
          </div>
        }
      >
        <DataTable data={mockData} />
      </Suspense>
    </div>
  )
}
