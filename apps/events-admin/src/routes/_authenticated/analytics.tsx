import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

import { EventActivity } from '@/features/statistics/components/github-contributions'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { ChartRadialEngagement } from '@/features/statistics/components/chart-radial-engagement'
import { ChartPieInteractive } from '@/features/statistics/components/chart-pie-interactive'
import { ClubLeaderboard } from '@/features/statistics/components/club-leaderboard'
import { EventAnalytics } from '@/components/event-analytics'
import { Skeleton } from '@repo/ui/components/skeleton'
import { Card, CardContent, CardHeader } from '@repo/ui/components/card'

export const Route = createFileRoute('/_authenticated/analytics')({
  component: () => (
    <Suspense fallback={<AnalyticsLoading />}>
      <Analytics />
    </Suspense>
  )
})

function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="px-4 lg:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>

      <div className="grid gap-6 px-4 lg:grid-cols-3 lg:px-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Heatmap */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[100px] w-full" />
            </CardContent>
          </Card>

          {/* Area Chart */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>

          {/* Table */}
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

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Radial Chart */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-44 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[180px] w-full" />
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-40 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[220px] w-full" />
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
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
      </div>
    </div>
  )
}

function Analytics() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Event Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze event performance, identify opportunities, and track organization activity
        </p>
      </div>

      <div className="grid gap-6 px-4 lg:grid-cols-3 lg:px-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <EventActivity year={currentYear} />
          <ChartAreaInteractive />
          <EventAnalytics />
        </div>

        <div className="flex flex-col gap-6">
          <ChartRadialEngagement />
          <ChartPieInteractive year={currentYear} month={currentMonth} />
          <ClubLeaderboard limit={5} days={90} />
        </div>
      </div>
    </div>
  )
}
