import { useQuery } from '@connectrpc/connect-query'
import { getUserEngagementLevels } from '@repo/proto'
import { TrendingUp, TrendingDown, VenetianMask } from 'lucide-react'
import { LabelList, RadialBar, RadialBarChart } from 'recharts'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'

const chartConfig = {
  count: {
    label: 'Users'
  },
  totalUsers: {
    label: 'Total Users',
    color: 'var(--chart-1)'
  },
  registered: {
    label: 'Registered',
    color: 'var(--chart-2)'
  },
  attended: {
    label: 'Attended',
    color: 'var(--chart-3)'
  },
  repeat: {
    label: 'Repeat',
    color: 'var(--chart-4)'
  }
} satisfies ChartConfig

export function ChartRadialEngagement() {
  const { data, isLoading } = useQuery(getUserEngagementLevels, {})

  if (isLoading) {
    return (
      <Card className='flex flex-col'>
        <CardHeader className='items-center pb-0'>
          <CardTitle className='flex items-center gap-2'>
            <VenetianMask className='size-5' />
            User Engagement Levels
          </CardTitle>
          <CardDescription>Progression from signup to repeat attendance</CardDescription>
        </CardHeader>
        <CardContent className='flex-1 pb-0'>
          <Skeleton className='h-[250px] w-full' />
        </CardContent>
      </Card>
    )
  }

  const levels = data?.levels || []
  const trendMessage = data?.trendMessage || ''
  const description = data?.description || ''
  const isPositiveTrend = data?.isPositiveTrend ?? true

  // Extract percentage change from trend message for badge display
  const percentageMatch = trendMessage.match(/\(([0-9.]+)%\s+(increase|decrease)/)
  const percentageChange = percentageMatch ? percentageMatch[1] : null
  const changeType = percentageMatch ? percentageMatch[2] : null
  
  // Get base conversion rate
  const conversionRateMatch = trendMessage.match(/^([0-9.]+)%/)
  const conversionRate = conversionRateMatch ? conversionRateMatch[1] : null

  if (levels.length === 0) {
    return (
      <Card className='flex flex-col'>
        <CardHeader className='items-center pb-0'>
          <CardTitle className='flex items-center gap-2'>
            <VenetianMask className='size-5' />
            User Engagement Levels
          </CardTitle>
          <CardDescription>No engagement data available</CardDescription>
        </CardHeader>
        <CardContent className='flex-1 pb-0 flex items-center justify-center'>
          <p className='text-sm text-muted-foreground'>No user engagement data to display</p>
        </CardContent>
      </Card>
    )
  }

  // Transform data for radial chart with labels
  // Map level names to config keys
  const levelToKey: Record<string, string> = {
    'Total Users': 'totalUsers',
    'Registered for Events': 'registered',
    'Attended Events': 'attended',
    'Repeat Attendees': 'repeat'
  }

  const chartData = levels.map((level) => {
    const configKey = levelToKey[level.level]
    return {
      level: configKey,
      count: level.count,
      percentage: level.percentage,
      fill: `var(--color-${configKey})`
    }
  })

  return (
    <Card className='flex flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle className='flex items-center gap-2'>
          <VenetianMask className='size-5' />
          User Engagement Levels
        </CardTitle>
        <CardDescription>User progression funnel</CardDescription>
      </CardHeader>
      <CardContent className='flex-1 pb-0'>
        <ChartContainer config={chartConfig} className='mx-auto aspect-square max-h-[250px]'>
          <RadialBarChart data={chartData} startAngle={-90} endAngle={380} innerRadius={30} outerRadius={110}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey='level' />} />
            <RadialBar dataKey='percentage' background>
              <LabelList
                position='insideStart'
                dataKey='percentage'
                className='fill-white capitalize mix-blend-luminosity'
                fontSize={11}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className='flex-col gap-2 text-sm'>
        <div className='flex flex-wrap items-center gap-2 leading-none font-medium'>
          {conversionRate && (
            <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20 animate-in fade-in zoom-in duration-300'>
              {conversionRate}%
            </span>
          )}
          <span>conversion rate</span>
          {percentageChange && (
            <>
              <span className='text-muted-foreground'>vs last week</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-semibold ring-1 ring-inset animate-in fade-in zoom-in duration-300 ${
                isPositiveTrend 
                  ? 'bg-green-500/10 text-green-700 ring-green-600/20 dark:text-green-400' 
                  : 'bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-400'
              }`}>
                {isPositiveTrend ? '+' : '-'}{percentageChange}%
              </span>
              {isPositiveTrend ? (
                <TrendingUp className='h-4 w-4 text-green-500' />
              ) : (
                <TrendingDown className='h-4 w-4 text-red-500' />
              )}
            </>
          )}
          {!percentageChange && (
            <>
              <span className='text-muted-foreground'>this week</span>
            </>
          )}
        </div>
        <div className='text-muted-foreground leading-none text-center'>{description}</div>
      </CardFooter>
    </Card>
  )
}
