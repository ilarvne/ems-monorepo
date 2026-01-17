import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { EventAnalytics } from '@/components/event-analytics'
import { SectionCards } from '@/components/section-cards'
import { EventActivity } from '@/features/statistics/components/github-contributions'
import { ChartPieInteractive } from '@/features/statistics/components/chart-pie-interactive'
import { ClubLeaderboard } from '@/features/statistics/components/club-leaderboard'
import { ChartRadialEngagement } from '@/features/statistics/components/chart-radial-engagement'
import { Skeleton } from '@repo/ui/components/skeleton'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'

export const Route = createFileRoute('/_authenticated/')({
  component: () => (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  )
})

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards Section Skeleton */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row Skeleton: Area Chart (2/3) + Pie Chart (1/3) */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-full mx-auto max-w-[250px]" />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row Skeleton: Radial Chart (2/5) + Leaderboard (3/5) */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-52 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Activity Heatmap Skeleton */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[120px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Event Analytics Table Skeleton */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Dashboard() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards Section */}
      <SectionCards />

      {/* Charts Row: Area Chart (2/3) + Pie Chart (1/3) */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 xl:grid-cols-3">
        <ChartAreaInteractive />
        <ChartPieInteractive year={currentYear} month={currentMonth} />
      </div>

      {/* Analytics Row: Radial Chart (2/5) + Leaderboard (3/5) */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <ChartRadialEngagement />
        </div>
        <div className="xl:col-span-3">
          <ClubLeaderboard limit={5} days={90} />
        </div>
      </div>

      {/* Event Activity Heatmap */}
      <div className="px-4 lg:px-6">
        <EventActivity year={currentYear} />
      </div>

      {/* Event Analytics Table */}
      <div className="px-4 lg:px-6">
        <EventAnalytics />
      </div>
    </div>
  )
}
