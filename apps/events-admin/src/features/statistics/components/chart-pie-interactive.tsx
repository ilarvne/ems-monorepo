"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import { PieChartIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  ChartConfig,
} from "@/components/ui/chart"
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from '@connectrpc/connect-query'
import { getEventTagsDistributionByMonth } from '@repo/proto'

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

interface TagData {
  tagId: number
  tagName: string
  eventCount: number
}

interface ChartDataItem extends TagData {
  fill: string
}

function generateChartConfig(tags: TagData[]): ChartConfig {
  const config: ChartConfig = {
    eventCount: {
      label: 'Events',
    },
  }
  
  tags.forEach((tag, index) => {
    config[`tag${tag.tagId}`] = {
      label: tag.tagName,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }
  })
  
  return config
}

interface ChartPieInteractiveProps {
  year?: number;
  month?: number;
}

export function ChartPieInteractive({ year, month }: ChartPieInteractiveProps) {
  const id = "pie-interactive"
  const currentDate = new Date()
  const [selectedYear] = React.useState(year ?? currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = React.useState(month ?? currentDate.getMonth() + 1)
  const [activeTagId, setActiveTagId] = React.useState<number | null>(null)
  
  // TODO: Replace with actual import once proto is rebuilt:
  // import { getEventTagsDistributionByMonth } from '@repo/proto-events/events-StatisticsService_connectquery'
  // import { transport } from '@/lib/api'
  // 
  const { data, isLoading } = useQuery(
    getEventTagsDistributionByMonth, {
        year: selectedYear,
        month: selectedMonth,
    }
  )
  
  const chartData = React.useMemo<ChartDataItem[]>(() => {
    if (!data?.tags) return []
    return data.tags.map((tag, index) => ({
      ...tag,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
  }, [data])

  const chartConfig = React.useMemo(
    () => (chartData.length > 0 ? generateChartConfig(data?.tags || []) : {}),
    [data?.tags, chartData.length]
  )

  const activeIndex = React.useMemo(() => {
    if (!activeTagId) return 0
    return chartData.findIndex((item) => item.tagId === activeTagId)
  }, [activeTagId, chartData])

  React.useEffect(() => {
    if (chartData.length > 0 && !activeTagId) {
      setActiveTagId(chartData[0].tagId)
    }
  }, [chartData, activeTagId])

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <PieChartIcon className='size-5' />
            Event Tags Distribution
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || chartData.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <PieChartIcon className='size-5' />
            Event Tags Distribution
          </CardTitle>
          <CardDescription>
            {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No events found for this month</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className='flex items-center gap-2'>
            <PieChartIcon className='size-5' />
            Event Tags Distribution
          </CardTitle>
          <CardDescription>
            {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear} • {data?.totalEvents || 0} events
          </CardDescription>
        </div>
        <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
          <SelectTrigger
            className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
            aria-label="Select month"
          >
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {MONTHS.map((month) => (
              <SelectItem
                key={month.value}
                value={month.value.toString()}
                className="rounded-lg"
              >
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="eventCount"
              nameKey="tagName"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              onClick={(data) => setActiveTagId(data.tagId)}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const activeTag = chartData[activeIndex]
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {activeTag?.eventCount || 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Events
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
