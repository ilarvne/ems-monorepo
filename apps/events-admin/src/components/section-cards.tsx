'use client'

import { useQuery } from '@connectrpc/connect-query'
import { getOverallStatistics, getEventTrends } from '@repo/proto'
import { TrendingDown, TrendingUp, Calendar, Users, Ticket, CheckCircle } from 'lucide-react'
import { useMemo } from 'react'

import { Card, CardContent } from '@repo/ui/components/card'
import { Skeleton } from '@repo/ui/components/skeleton'
import { Sparkline, calculateTrend } from '@repo/ui/components/sparkline'

export function SectionCards() {
  const { data, isLoading } = useQuery(getOverallStatistics, {})
  const { data: trendsData, isLoading: trendsLoading } = useQuery(getEventTrends, { days: 30 })

  // Transform trend data for sparklines
  const eventSparklineData = useMemo(() => {
    if (!trendsData?.trends) return []
    return trendsData.trends.map((t) => ({ value: t.eventCount }))
  }, [trendsData])

  const registrationSparklineData = useMemo(() => {
    if (!trendsData?.trends) return []
    return trendsData.trends.map((t) => ({ value: t.registrationCount }))
  }, [trendsData])

  // Calculate trends
  const eventTrend = useMemo(() => calculateTrend(eventSparklineData), [eventSparklineData])
  const registrationTrend = useMemo(() => calculateTrend(registrationSparklineData), [registrationSparklineData])

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-4'>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className='col-span-1 border-border/50'>
            <CardContent className='p-6'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-8 w-32 mt-2' />
              <Skeleton className='h-8 w-full mt-4' />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = data

  // Calculate month-over-month growth (simplified)
  const registrationsGrowth = stats?.registrationsThisMonth || 0

  const TrendBadge = ({ direction, percentage }: { direction: 'up' | 'down' | 'neutral', percentage: number }) => {
    if (direction === 'neutral' || percentage === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          Stable
        </span>
      )
    }
    
    const isPositive = direction === 'up'
    const ColorClass = isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    const Icon = isPositive ? TrendingUp : TrendingDown
    
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ColorClass}`}>
        <Icon className="h-3 w-3" />
        {percentage}%
      </span>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4'>
      {/* Total Events */}
      <Card className='relative overflow-hidden rounded-2xl border border-border/50'>
        <div className="absolute right-4 top-4 opacity-5">
            <Calendar className="h-24 w-24" />
        </div>
        <CardContent className='p-6'>
          <p className="text-sm font-medium text-muted-foreground">Total Events</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
                {stats?.totalEvents ?? 0}
            </span>
            <span className="text-sm text-muted-foreground">events</span>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <TrendBadge direction={eventTrend.direction} percentage={eventTrend.percentage} />
            <span className="text-xs text-muted-foreground">vs last 30 days</span>
          </div>

          {!trendsLoading && eventSparklineData.length > 0 && (
            <div className='mt-4 h-10'>
              <Sparkline data={eventSparklineData} height={40} color='hsl(var(--primary))' />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Users */}
      <Card className='relative overflow-hidden rounded-2xl border border-border/50'>
        <div className="absolute right-4 top-4 opacity-5">
            <Users className="h-24 w-24" />
        </div>
        <CardContent className='p-6'>
          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
                {stats?.totalUsers ?? 0}
            </span>
            <span className="text-sm text-muted-foreground">users</span>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
             <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                <TrendingUp className="h-3 w-3" />
                Active
             </span>
             <span className="text-xs text-muted-foreground">platform wide</span>
          </div>
        </CardContent>
      </Card>

      {/* Registrations */}
      <Card className='relative overflow-hidden rounded-2xl border border-border/50'>
        <div className="absolute right-4 top-4 opacity-5">
            <Ticket className="h-24 w-24" />
        </div>
        <CardContent className='p-6'>
          <p className="text-sm font-medium text-muted-foreground">Registrations</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
                {stats?.totalRegistrations ?? 0}
            </span>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <TrendBadge direction={registrationTrend.direction} percentage={registrationTrend.percentage} />
            <span className="text-xs text-muted-foreground">+{registrationsGrowth} this month</span>
          </div>

          {!trendsLoading && registrationSparklineData.length > 0 && (
            <div className='mt-4 h-10'>
              <Sparkline data={registrationSparklineData} height={40} color='hsl(var(--chart-2))' />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card className='relative overflow-hidden rounded-2xl border border-border/50'>
        <div className="absolute right-4 top-4 opacity-5">
            <CheckCircle className="h-24 w-24" />
        </div>
        <CardContent className='p-6'>
          <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
                {stats?.averageAttendanceRate?.toFixed(1) ?? 0}%
            </span>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
             {(stats?.averageAttendanceRate ?? 0) >= 70 ? (
                 <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Strong
                 </span>
             ) : (
                 <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    Needs Focus
                 </span>
             )}
             <span className="text-xs text-muted-foreground">conversion rate</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
