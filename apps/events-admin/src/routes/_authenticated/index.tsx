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
  component: Dashboard
})

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
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-2 h-4 w-96" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          }
        >
          <EventAnalytics />
        </Suspense>
      </div>
    </div>
  )
}
