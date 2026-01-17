'use client'

import { useQuery } from '@connectrpc/connect-query'
import { getOverallStatistics } from '@repo/proto'
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'

import { Badge } from '@repo/ui/components/badge'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Skeleton } from '@repo/ui/components/skeleton'

export function SectionCards() {
  const { data, isLoading } = useQuery(getOverallStatistics, {})

  if (isLoading) {
    return (
      <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4'>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className='@container/card'>
            <CardHeader>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-8 w-32' />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  const stats = data

  // Calculate month-over-month growth (simplified)
  const eventsGrowth = stats?.eventsThisMonth || 0
  const registrationsGrowth = stats?.registrationsThisMonth || 0

  return (
    <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4'>
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Total Events</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
            {stats?.totalEvents ?? 0}
          </CardTitle>
          <CardAction>
            <Badge variant='outline'>
              {eventsGrowth > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {eventsGrowth} this month
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {stats?.upcomingEvents ?? 0} upcoming events
          </div>
          <div className='text-muted-foreground'>Active event count across all organizations</div>
        </CardFooter>
      </Card>
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
            {stats?.totalUsers ?? 0}
          </CardTitle>
          <CardAction>
            <Badge variant='outline'>
              <IconTrendingUp />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>Registered platform users</div>
          <div className='text-muted-foreground'>Total user base across the platform</div>
        </CardFooter>
      </Card>
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Event Registrations</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
            {stats?.totalRegistrations ?? 0}
          </CardTitle>
          <CardAction>
            <Badge variant='outline'>
              {registrationsGrowth > 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              +{registrationsGrowth} this month
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            Strong engagement <IconTrendingUp className='size-4' />
          </div>
          <div className='text-muted-foreground'>Total registrations across all events</div>
        </CardFooter>
      </Card>
      <Card className='@container/card'>
        <CardHeader>
          <CardDescription>Attendance Rate</CardDescription>
          <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
            {stats?.averageAttendanceRate?.toFixed(1) ?? 0}%
          </CardTitle>
          <CardAction>
            <Badge variant='outline'>
              {(stats?.averageAttendanceRate ?? 0) >= 70 ? <IconTrendingUp /> : <IconTrendingDown />}
              Average
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className='flex-col items-start gap-1.5 text-sm'>
          <div className='line-clamp-1 flex gap-2 font-medium'>
            {(stats?.averageAttendanceRate ?? 0) >= 70 ? 'Strong' : 'Moderate'} attendance performance
          </div>
          <div className='text-muted-foreground'>Average attendance rate across events</div>
        </CardFooter>
      </Card>
    </div>
  )
}
