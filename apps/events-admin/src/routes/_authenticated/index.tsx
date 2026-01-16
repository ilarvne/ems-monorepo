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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* --- LEFT COLUMN (Spans 2) --- */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <SectionCards />
        
        {/* Activity & Trends */}
        <EventActivity year={currentYear} />
        <ChartAreaInteractive />
        
        {/* Data Table */}
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

      {/* --- RIGHT COLUMN (Spans 1) --- */}
      <div className="flex flex-col gap-6">
        {/* Engagement Charts */}
        <ChartRadialEngagement />
        <ChartPieInteractive year={currentYear} month={currentMonth} />
        <ClubLeaderboard limit={5} days={90} />
      </div>
    </div>
  )
}
