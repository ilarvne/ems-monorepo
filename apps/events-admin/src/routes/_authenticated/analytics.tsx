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
  component: Analytics
})

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

          <Suspense
            fallback={
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-96 mt-2" />
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

        <div className="flex flex-col gap-6">
          <ChartRadialEngagement />
          <ChartPieInteractive year={currentYear} month={currentMonth} />
          <ClubLeaderboard limit={5} days={90} />
        </div>
      </div>
    </div>
  )
}
