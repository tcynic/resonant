/**
 * Hook for fetching and managing chart data
 */

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useUser } from '@clerk/nextjs'
import { Id } from '../../../convex/_generated/dataModel'
import { TimeRange, getDateRange } from '@/lib/chart-utils'

/**
 * Chart configuration interface
 */
export interface ChartConfig {
  timeRange: TimeRange
  customStart?: Date
  customEnd?: Date
  selectedRelationships: string[]
  showTrendLines: boolean
  showAnnotations: boolean
  showMovingAverage?: boolean
  movingAverageWindow?: number
}

/**
 * Chart data hook for real-time updates
 */
export function useChartData(
  chartType: 'sentiment_trend' | 'health_score_trend' | 'pattern_analysis',
  config: ChartConfig
) {
  const { user } = useUser()

  // Calculate date range
  const dateRange = useMemo(
    () => getDateRange(config.timeRange, config.customStart, config.customEnd),
    [config.timeRange, config.customStart, config.customEnd]
  )

  // Convert relationship IDs to proper format
  const relationshipIds = useMemo(
    () => config.selectedRelationships.map(id => id as Id<'relationships'>),
    [config.selectedRelationships]
  )

  // Real-time subscription to trend data
  const trendData = useQuery(
    api.insights?.getTrendData || null,
    user?.id && api.insights?.getTrendData
      ? {
          userId: user.id as Id<'users'>,
          relationshipIds:
            relationshipIds.length > 0 ? relationshipIds : undefined,
          timeRange: {
            start: dateRange.start.getTime(),
            end: dateRange.end.getTime(),
            granularity:
              dateRange.granularity === 'daily'
                ? 'day'
                : dateRange.granularity === 'weekly'
                  ? 'week'
                  : 'month',
          },
          analyticsType: chartType,
        }
      : 'skip'
  )

  // Transform data for chart consumption
  const chartData = useMemo(() => {
    if (!trendData?.dataPoints) return null

    return {
      dataPoints: trendData.dataPoints.map((point: unknown) => {
        const dataPoint = point as {
          timestamp: number
          value: number
          metadata?: {
            factors?: {
              communication: number
              trust: number
              satisfaction: number
              growth: number
            }
          }
        }

        return {
          calculatedAt: dataPoint.timestamp,
          score: dataPoint.value,
          factors: dataPoint.metadata?.factors || {
            communication: dataPoint.value,
            trust: dataPoint.value,
            satisfaction: dataPoint.value,
            growth: dataPoint.value,
          },
          trendDirection:
            (trendData.metadata as { trend?: string })?.trend || 'stable',
        }
      }),
      statistics: trendData.metadata || {},
      patterns:
        (trendData.metadata as { patterns?: unknown[] })?.patterns || [],
    }
  }, [trendData])

  // Loading and error states
  const isLoading = trendData === undefined
  const hasError = trendData === null

  return {
    data: chartData?.dataPoints || [],
    statistics: chartData?.statistics,
    patterns: chartData?.patterns || [],
    isLoading,
    hasError,
    config,
  }
}

/**
 * Hook for relationship comparison data
 */
export function useRelationshipComparisonData(
  relationshipIds: string[],
  timeRange: TimeRange,
  metric: 'sentiment' | 'health_score' | 'entry_frequency' = 'sentiment',
  customStart?: Date,
  customEnd?: Date
) {
  const { user } = useUser()

  // Calculate date range
  const dateRange = useMemo(
    () => getDateRange(timeRange, customStart, customEnd),
    [timeRange, customStart, customEnd]
  )

  // Convert relationship IDs
  const ids = useMemo(
    () => relationshipIds.map(id => id as Id<'relationships'>),
    [relationshipIds]
  )

  // Real-time subscription to comparison data
  const comparisonData = useQuery(
    api.insights?.getRelationshipComparison || null,
    user?.id && ids.length > 0 && api.insights?.getRelationshipComparison
      ? {
          userId: user.id as Id<'users'>,
          relationshipIds: ids,
          timeRange: {
            start: dateRange.start.getTime(),
            end: dateRange.end.getTime(),
          },
          metric,
        }
      : 'skip'
  )

  const isLoading = comparisonData === undefined
  const hasError = comparisonData === null

  return {
    data: (comparisonData || []).filter(
      (item): item is NonNullable<typeof item> => item !== null
    ),
    isLoading,
    hasError,
  }
}

/**
 * Hook for chart preferences
 */
export function useChartPreferences() {
  const { user } = useUser()

  const preferences = useQuery(
    api.insights?.getChartPreferences || null,
    user?.id && api.insights?.getChartPreferences
      ? { userId: user.id as Id<'users'> }
      : 'skip'
  )

  const isLoading = preferences === undefined

  return {
    preferences,
    isLoading,
  }
}
