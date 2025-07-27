'use client'

import React, { useMemo, forwardRef } from 'react'
import { ChartData } from 'chart.js'
import {
  BaseChart,
  ChartHandle,
  ChartError,
  ChartSkeleton,
  BaseChartProps,
} from './base-chart'
import { formatHealthScoreData, calculateStatistics } from '@/lib/chart-utils'
import { healthScoreChartOptions, getHealthScoreColor } from '@/lib/chart-theme'
import { format } from 'date-fns'

/**
 * Health score data interface
 */
interface HealthScoreData {
  calculatedAt: number
  score: number
  trendDirection?: 'improving' | 'stable' | 'declining'
  factors?: {
    communication: number
    trust: number
    satisfaction: number
    growth: number
  }
}

/**
 * Health score chart props
 */
export interface HealthScoreChartProps {
  data: HealthScoreData[]
  isLoading?: boolean
  error?: string
  className?: string
  height?: number
  showTrendIndicators?: boolean
  showStatistics?: boolean
  onDataPointClick?: (data: HealthScoreData) => void
  onRetry?: () => void
  'aria-label'?: string
}

/**
 * Health Score Chart Component
 *
 * Displays health score progression with:
 * - Color-coded score ranges
 * - Trend direction indicators
 * - Statistical summary
 * - Interactive data points
 * - Real-time updates
 */
export const HealthScoreChart = forwardRef<ChartHandle, HealthScoreChartProps>(
  (
    {
      data,
      isLoading = false,
      error,
      className,
      height = 400,
      showTrendIndicators = true,
      showStatistics = false,
      onDataPointClick,
      onRetry,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    // Calculate statistics
    const statistics = useMemo(() => {
      if (!data || data.length === 0) return null

      const chartDataPoints = data.map(item => ({
        x: new Date(item.calculatedAt),
        y: item.score,
      }))

      return calculateStatistics(chartDataPoints)
    }, [data])

    // Transform data for Chart.js
    const chartData = useMemo(() => {
      if (!data || data.length === 0) {
        return null
      }

      // Sort data by date
      const sortedData = [...data].sort(
        (a, b) => a.calculatedAt - b.calculatedAt
      )

      // Format health score data with color coding
      const dataset = formatHealthScoreData(sortedData)

      // Add trend annotations if enabled
      const annotations = showTrendIndicators
        ? sortedData.map(item => ({
            type: 'point' as const,
            xValue: new Date(item.calculatedAt),
            yValue: item.score,
            backgroundColor: getTrendColor(item.trendDirection),
            borderColor: getTrendColor(item.trendDirection),
            radius:
              item.trendDirection === 'improving'
                ? 8
                : item.trendDirection === 'declining'
                  ? 6
                  : 4,
          }))
        : []

      return {
        datasets: [dataset],
        annotations,
      }
    }, [data, showTrendIndicators])

    // Enhanced chart options
    const chartOptions = useMemo(
      () => ({
        ...healthScoreChartOptions,
        plugins: {
          ...healthScoreChartOptions.plugins,
          tooltip: {
            ...healthScoreChartOptions.plugins.tooltip,
            callbacks: {
              title: function (context: TooltipItem[]) {
                if (context[0]?.parsed?.x) {
                  return format(new Date(context[0].parsed.x), 'MMM dd, yyyy')
                }
                return ''
              },
              label: function (context: TooltipItem) {
                const value = context.parsed.y
                const dataPoint = data[context.dataIndex]

                const lines = [`Health Score: ${value}%`]

                if (dataPoint?.trendDirection) {
                  const trendText = {
                    improving: '📈 Improving',
                    stable: '➡️ Stable',
                    declining: '📉 Declining',
                  }[dataPoint.trendDirection]
                  lines.push(`Trend: ${trendText}`)
                }

                if (dataPoint?.factors) {
                  lines.push('', 'Factor Breakdown:')
                  lines.push(
                    `Communication: ${dataPoint.factors.communication}%`
                  )
                  lines.push(`Trust: ${dataPoint.factors.trust}%`)
                  lines.push(`Satisfaction: ${dataPoint.factors.satisfaction}%`)
                  lines.push(`Growth: ${dataPoint.factors.growth}%`)
                }

                return lines
              },
              labelColor: function (context: TooltipItem) {
                const score = context.parsed.y
                return {
                  borderColor: getHealthScoreColor(score),
                  backgroundColor: getHealthScoreColor(score),
                }
              },
            },
          },
          legend: {
            display: false, // Hide legend for single dataset
          },
        },
        scales: {
          ...healthScoreChartOptions.scales,
          y: {
            ...healthScoreChartOptions.scales.y,
            grid: {
              ...healthScoreChartOptions.scales.y.grid,
              color: function (context: ScaleContext) {
                // Add colored zones
                if (context.tick.value === 80) return '#10B981' // Excellent threshold
                if (context.tick.value === 60) return '#F59E0B' // Good threshold
                if (context.tick.value === 40) return '#EF4444' // Fair threshold
                return '#E5E7EB' // Default grid color
              },
            },
          },
        },
      }),
      [data]
    )

    // Handle data point clicks
    const handleDataPointClick = (datasetIndex: number, pointIndex: number) => {
      if (data && data[pointIndex] && onDataPointClick) {
        onDataPointClick(data[pointIndex])
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="space-y-4">
          <ChartSkeleton height={height} className={className} />
          {showStatistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Error state
    if (error) {
      return (
        <ChartError
          error={error}
          retry={onRetry}
          height={height}
          className={className}
        />
      )
    }

    // No data state
    if (!chartData) {
      return (
        <div
          className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
          style={{ height }}
          role="img"
          aria-label="No health score data available"
        >
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium mb-1">No health score data</div>
            <div className="text-xs">
              Health scores are calculated from your journal entries
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <BaseChart
          ref={ref}
          type="line"
          data={chartData as unknown as ChartData<'line'>}
          options={chartOptions as BaseChartProps['options']}
          className={className}
          height={height}
          onDataPointClick={handleDataPointClick}
          aria-label={
            ariaLabel || 'Health score chart showing progression over time'
          }
        />

        {showStatistics && statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Average</div>
              <div className="text-lg font-semibold text-gray-900">
                {statistics.average}%
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Trend</div>
              <div className="text-lg font-semibold">
                {statistics.trend === 'improving' && (
                  <span className="text-green-600">📈 Up</span>
                )}
                {statistics.trend === 'stable' && (
                  <span className="text-blue-600">➡️ Stable</span>
                )}
                {statistics.trend === 'declining' && (
                  <span className="text-red-600">📉 Down</span>
                )}
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Best</div>
              <div className="text-lg font-semibold text-green-600">
                {statistics.max}%
              </div>
              <div className="text-xs text-gray-400">
                {format(statistics.bestPeriod.start, 'MMM dd')}
              </div>
            </div>

            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Lowest</div>
              <div className="text-lg font-semibold text-orange-600">
                {statistics.min}%
              </div>
              <div className="text-xs text-gray-400">
                {format(statistics.worstPeriod.start, 'MMM dd')}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

HealthScoreChart.displayName = 'HealthScoreChart'

// Helper function to get trend indicator color
function getTrendColor(trend?: 'improving' | 'stable' | 'declining'): string {
  switch (trend) {
    case 'improving':
      return '#10B981' // Green
    case 'declining':
      return '#EF4444' // Red
    case 'stable':
    default:
      return '#6B7280' // Gray
  }
}

// Type definitions
interface TooltipItem {
  datasetIndex: number
  dataIndex: number
  parsed: {
    x: number
    y: number
  }
}

interface ScaleContext {
  tick: {
    value: number
  }
}
