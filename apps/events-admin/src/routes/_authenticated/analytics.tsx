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
      {/* Page Header Skeleton */}
      <div className="px-4 lg:px-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      <div className="grid gap-6 px-4 lg:grid-cols-3 lg:px-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Event Activity Heatmap Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[120px] w-full" />
            </CardContent>
          </Card>

          {/* Area Chart Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          {/* Event Analytics Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
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

        {/* Right Column (1/3) */}
        <div className="flex flex-col gap-6">
          {/* Radial Engagement Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-52 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>

          {/* Pie Chart Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full rounded-full mx-auto max-w-[200px]" />
            </CardContent>
          </Card>

          {/* Club Leaderboard Skeleton */}
          <Card>
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
