'use client'

import * as React from 'react'
import { useQuery } from '@connectrpc/connect-query'
import { getEventTrends } from '@repo/proto'
import { TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'
import type { ChartConfig } from '@repo/ui/components/chart'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@repo/ui/components/chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/select'
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/components/toggle-group'

import { useIsMobile } from '@/hooks/use-mobile'

export const description = 'An interactive area chart'

const chartConfig = {
  visitors: {
    label: 'Activity'
  },
  eventCount: {
    label: 'Events',
    color: 'var(--secondary)'
  },
  registrationCount: {
    label: 'Registrations',
    color: 'var(--primary)'
  }
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState('90')

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('7')
    }
  }, [isMobile])

  const { data, isLoading } = useQuery(getEventTrends, { days: Number(timeRange) })

  const chartData = React.useMemo(() => {
    if (!data?.trends) return []
    return data.trends.map((trend) => ({
      date: trend.date,
      eventCount: trend.eventCount,
      registrationCount: trend.registrationCount
    }))
  }, [data])

  return (
    <Card className='@container/card col-span-1 xl:col-span-2'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <TrendingUp className='size-5' />
          Event Activity
        </CardTitle>
        <CardDescription>Events created and registrations over time</CardDescription>
        <CardAction>
          {isMobile ? (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className='w-[160px] rounded-lg sm:ml-auto' aria-label='Select a value'>
                <SelectValue placeholder='Last 3 months' />
              </SelectTrigger>
              <SelectContent className='rounded-xl'>
                <SelectItem value='7' className='rounded-lg'>
                  Last 7 days
                </SelectItem>
                <SelectItem value='30' className='rounded-lg'>
                  Last 30 days
                </SelectItem>
                <SelectItem value='90' className='rounded-lg'>
                  Last 3 months
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <ToggleGroup
              onValueChange={(value) => {
                if (value) setTimeRange(value)
              }}
              value={timeRange}
              type='single'
            >
              <ToggleGroupItem value='7' aria-label='Last 7 days' className='text-xs'>
                7d
              </ToggleGroupItem>
              <ToggleGroupItem value='30' aria-label='Last 30 days' className='text-xs'>
                30d
              </ToggleGroupItem>
              <ToggleGroupItem value='90' aria-label='Last 3 months' className='text-xs'>
                90d
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className='px-2 sm:p-6'>
        {isLoading ? (
          <div className='flex h-[250px] items-center justify-center'>
            <div className='text-muted-foreground'>Loading...</div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className='aspect-auto h-[250px] w-full'>
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 0,
                  right: 0,
                  top: 10,
                  bottom: 0
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                <XAxis
                  dataKey='date'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent

                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    }}
                    indicator='dot'
                  />
                }
              />
              <defs>
                <linearGradient id='fillRegistrationCount' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='var(--color-registrationCount)' stopOpacity={0.8} />
                  <stop offset='95%' stopColor='var(--color-registrationCount)' stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id='fillEventCount' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='var(--color-eventCount)' stopOpacity={1} />
                  <stop offset='95%' stopColor='var(--color-eventCount)' stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <Area
                dataKey='registrationCount'
                type='monotone'
                fill='url(#fillRegistrationCount)'
                fillOpacity={0.4}
                stroke='var(--color-registrationCount)'
                strokeWidth={2}
                stackId="1"
              />
              <Area
                dataKey='eventCount'
                type='monotone'
                fill='url(#fillEventCount)'
                fillOpacity={0.4}
                stroke='var(--color-eventCount)'
                strokeWidth={2}
                stackId="2"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
