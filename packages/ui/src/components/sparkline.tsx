'use client'

import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface SparklineProps {
  data: { value: number }[]
  color?: string
  height?: number
  className?: string
}

/**
 * A minimal sparkline chart for showing trends in KPI cards.
 * Uses recharts' AreaChart for a smooth, minimal visualization.
 */
export function Sparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 32,
  className
}: SparklineProps) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sparkline-gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sparkline-gradient-${color.replace(/[^a-zA-Z0-9]/g, '')})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Calculate percentage change between first and last values
 */
export function calculateTrend(data: { value: number }[]): {
  percentage: number
  direction: 'up' | 'down' | 'neutral'
} {
  if (!data || data.length < 2) {
    return { percentage: 0, direction: 'neutral' }
  }

  const firstHalf = data.slice(0, Math.floor(data.length / 2))
  const secondHalf = data.slice(Math.floor(data.length / 2))

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length

  if (firstAvg === 0) {
    return { percentage: secondAvg > 0 ? 100 : 0, direction: secondAvg > 0 ? 'up' : 'neutral' }
  }

  const percentage = ((secondAvg - firstAvg) / firstAvg) * 100

  return {
    percentage: Math.abs(Math.round(percentage)),
    direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral'
  }
}
