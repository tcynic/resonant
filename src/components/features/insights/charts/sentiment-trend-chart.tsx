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
import {
  formatSentimentTrendData,
  calculateMovingAverage,
  ChartDataPoint,
} from '@/lib/chart-utils'
import { timeChartOptions } from '@/lib/chart-theme'
import { format } from 'date-fns'

/**
 * Health score data interface for sentiment trends
 */
interface HealthScoreData {
  calculatedAt: number
  score: number
  factors: {
    communication: number
    trust: number
    satisfaction: number
    growth: number
  }
  trendDirection?: 'improving' | 'stable' | 'declining'
}

/**
 * Sentiment trend chart props
 */
export interface SentimentTrendChartProps {
  data: HealthScoreData[]
  isLoading?: boolean
  error?: string
  className?: string
  height?: number
  showMovingAverage?: boolean
  movingAverageWindow?: number
  onDataPointClick?: (data: HealthScoreData) => void
  onRetry?: () => void
  'aria-label'?: string
}

/**
 * Sentiment Trend Chart Component
 *
 * Displays sentiment progression over time with:
 * - Health score trend line
 * - Optional moving average overlay
 * - Interactive data points
 * - Factor breakdown in tooltips
 * - Trend direction indicators
 */
export const SentimentTrendChart = forwardRef<
  ChartHandle,
  SentimentTrendChartProps
>(
  (
    {
      data,
      isLoading = false,
      error,
      className,
      height = 400,
      showMovingAverage = false,
      movingAverageWindow = 7,
      onDataPointClick,
      onRetry,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    // Transform data for Chart.js
    const chartData = useMemo(() => {
      if (!data || data.length === 0) {
        return null
      }

      // Sort data by date
      const sortedData = [...data].sort(
        (a, b) => a.calculatedAt - b.calculatedAt
      )

      // Format basic trend data
      const trendDataset = formatSentimentTrendData(sortedData)

      const datasets = [trendDataset]

      // Add moving average if requested
      if (showMovingAverage && sortedData.length >= movingAverageWindow) {
        const movingAverageData = calculateMovingAverage(
          trendDataset.data,
          movingAverageWindow
        )

        datasets.push({
          label: `${movingAverageWindow}-day Moving Average`,
          data: movingAverageData,
          borderColor: '#6B7280', // Gray-500
          backgroundColor: 'transparent',
          borderWidth: 1,
          // borderDash: [5, 5], // Temporarily disabled for build compatibility
          fill: false,
          // tension: 0.3, // Temporarily disabled for build compatibility
          // pointRadius: 0, // Temporarily disabled for build compatibility
          // pointHoverRadius: 4, // Temporarily disabled for build compatibility
        })
      }

      return {
        datasets,
      }
    }, [data, showMovingAverage, movingAverageWindow])

    // Chart options with custom tooltip
    const chartOptions = useMemo(
      () => ({
        ...timeChartOptions,
        scales: {
          ...timeChartOptions.scales,
          y: {
            ...timeChartOptions.scales.y,
            min: 0,
            max: 100,
            ticks: {
              ...timeChartOptions.scales.y.ticks,
              callback: function (value: number) {
                return value + '%'
              },
            },
            title: {
              display: true,
              text: 'Health Score',
              color: '#6B7280',
              font: {
                size: 12,
                weight: '500',
              },
            },
          },
          x: {
            ...timeChartOptions.scales.x,
            title: {
              display: true,
              text: 'Date',
              color: '#6B7280',
              font: {
                size: 12,
                weight: '500',
              },
            },
          },
        },
        plugins: {
          ...timeChartOptions.plugins,
          tooltip: {
            ...timeChartOptions.plugins.tooltip,
            callbacks: {
              title: function (context: TooltipItem[]) {
                if (context[0]?.parsed?.x) {
                  return format(new Date(context[0].parsed.x), 'MMM dd, yyyy')
                }
                return ''
              },
              label: function (context: TooltipItem) {
                const datasetLabel = context.dataset.label || ''
                const value = context.parsed.y

                // For main trend line, show detailed breakdown
                if (context.datasetIndex === 0) {
                  const dataPoint = chartData?.datasets[0]?.data[
                    context.dataIndex
                  ] as ChartDataPoint
                  const factors = dataPoint?.metadata
                    ?.factors as HealthScoreData['factors']

                  if (factors) {
                    return [
                      `${datasetLabel}: ${value}%`,
                      '',
                      'Factor Breakdown:',
                      `Communication: ${factors.communication}%`,
                      `Trust: ${factors.trust}%`,
                      `Satisfaction: ${factors.satisfaction}%`,
                      `Growth: ${factors.growth}%`,
                    ]
                  }
                }

                return `${datasetLabel}: ${value}%`
              },
            },
          },
          legend: {
            ...timeChartOptions.plugins.legend,
            labels: {
              ...timeChartOptions.plugins.legend.labels,
              filter: function (legendItem: LegendItem) {
                // Show legend for moving average, hide for main trend
                return legendItem.datasetIndex !== 0 || showMovingAverage
              },
            },
          },
        },
      }),
      [chartData, showMovingAverage]
    )

    // Handle data point clicks
    const handleDataPointClick = (datasetIndex: number, pointIndex: number) => {
      if (datasetIndex === 0 && data && data[pointIndex] && onDataPointClick) {
        onDataPointClick(data[pointIndex])
      }
    }

    // Loading state
    if (isLoading) {
      return <ChartSkeleton height={height} className={className} />
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
          aria-label="No sentiment data available"
        >
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium mb-1">No sentiment data</div>
            <div className="text-xs">
              Start journaling to see your sentiment trends
            </div>
          </div>
        </div>
      )
    }

    return (
      <BaseChart
        ref={ref}
        type="line"
        data={chartData as unknown as ChartData<'line'>}
        options={chartOptions as BaseChartProps['options']}
        className={className}
        height={height}
        onDataPointClick={handleDataPointClick}
        aria-label={
          ariaLabel || 'Sentiment trend chart showing health score over time'
        }
      />
    )
  }
)

SentimentTrendChart.displayName = 'SentimentTrendChart'

// Type definitions for Chart.js tooltip context
interface TooltipItem {
  datasetIndex: number
  dataIndex: number
  parsed: {
    x: number
    y: number
  }
  dataset: {
    label?: string
  }
}

interface LegendItem {
  datasetIndex: number
  text: string
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  hidden: boolean
}
