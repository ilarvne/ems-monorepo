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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[180px] w-full" />
          </CardContent>
        </Card>
        <Card className="xl:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-52 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[100px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
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
