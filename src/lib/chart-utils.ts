/**
 * Chart utility functions for data transformation and formatting
 */

import { format, subDays, subMonths, subYears } from 'date-fns'
import {
  chartColors,
  relationshipColors,
  getHealthScoreColor,
} from './chart-theme'

/**
 * Time range options for chart filtering
 */
export type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'custom'

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  x: number | Date
  y: number
  metadata?: Record<string, unknown>
}

/**
 * Dataset configuration for Chart.js
 */
export interface ChartDataset {
  label: string
  data: ChartDataPoint[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
  fill?: boolean
  tension?: number
}

/**
 * Chart configuration interface
 */
export interface ChartConfig {
  selectedRelationships: string[]
  timeRange: {
    start: number
    end: number
    granularity: 'daily' | 'weekly' | 'monthly'
  }
  showTrendLines: boolean
  showAnnotations: boolean
}

/**
 * Get date range based on time range selection
 */
export function getDateRange(
  timeRange: TimeRange,
  customStart?: Date,
  customEnd?: Date
): {
  start: Date
  end: Date
  granularity: 'daily' | 'weekly' | 'monthly'
} {
  const now = new Date()

  switch (timeRange) {
    case 'week':
      return {
        start: subDays(now, 7),
        end: now,
        granularity: 'daily',
      }
    case 'month':
      return {
        start: subMonths(now, 1),
        end: now,
        granularity: 'daily',
      }
    case 'quarter':
      return {
        start: subMonths(now, 3),
        end: now,
        granularity: 'weekly',
      }
    case 'year':
      return {
        start: subYears(now, 1),
        end: now,
        granularity: 'monthly',
      }
    case 'custom':
      return {
        start: customStart || subMonths(now, 1),
        end: customEnd || now,
        granularity: 'daily',
      }
    default:
      return {
        start: subMonths(now, 1),
        end: now,
        granularity: 'daily',
      }
  }
}

/**
 * Format data for sentiment trend chart
 */
export function formatSentimentTrendData(
  healthScores: Array<{
    calculatedAt: number
    score: number
    factors: {
      communication: number
      trust: number
      satisfaction: number
      growth: number
    }
  }>
): ChartDataset {
  const data: ChartDataPoint[] = healthScores.map(score => ({
    x: new Date(score.calculatedAt),
    y: score.score,
    metadata: {
      factors: score.factors,
    },
  }))

  return {
    label: 'Health Score',
    data,
    borderColor: chartColors.primary,
    backgroundColor: chartColors.background,
    borderWidth: 2,
    fill: true,
    tension: 0.3,
  }
}

/**
 * Format data for health score progression chart with color gradient
 */
export function formatHealthScoreData(
  healthScores: Array<{
    calculatedAt: number
    score: number
    trendDirection?: 'improving' | 'stable' | 'declining'
  }>
): ChartDataset {
  const data: ChartDataPoint[] = healthScores.map(score => ({
    x: new Date(score.calculatedAt),
    y: score.score,
    metadata: {
      trend: score.trendDirection,
    },
  }))

  // Create gradient colors based on score values
  const backgroundColors = healthScores.map(score =>
    getHealthScoreColor(score.score)
  )
  const borderColors = healthScores.map(score =>
    getHealthScoreColor(score.score)
  )

  return {
    label: 'Health Score',
    data,
    backgroundColor: backgroundColors,
    borderColor: borderColors,
    borderWidth: 2,
    fill: false,
    tension: 0.3,
  }
}

/**
 * Format data for relationship comparison chart
 */
export function formatRelationshipComparisonData(
  relationships: Array<{
    relationshipId: string
    name: string
    data: Array<{
      x: number
      y: number
    }>
    averageScore: number
  }>
): ChartDataset[] {
  return relationships.map((relationship, index) => {
    const colorIndex = index % relationshipColors.length
    const color = relationshipColors[colorIndex]

    return {
      label: relationship.name,
      data: relationship.data.map(point => ({
        x: new Date(point.x),
        y: point.y,
      })),
      borderColor: color,
      backgroundColor: color + '20', // Add transparency
      borderWidth: 2,
      fill: false,
      tension: 0.3,
    }
  })
}

/**
 * Calculate moving average for trend smoothing
 */
export function calculateMovingAverage(
  data: ChartDataPoint[],
  windowSize: number = 7
): ChartDataPoint[] {
  if (data.length < windowSize) return data

  return data.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2))
    const end = Math.min(data.length, start + windowSize)
    const slice = data.slice(start, end)

    const average = slice.reduce((sum, p) => sum + p.y, 0) / slice.length

    return {
      x: point.x,
      y: Math.round(average * 100) / 100, // Round to 2 decimal places
      metadata: {
        ...point.metadata,
        isMovingAverage: true,
        originalValue: point.y,
      },
    }
  })
}

/**
 * Detect trend direction from data points
 */
export function detectTrendDirection(
  data: ChartDataPoint[]
): 'improving' | 'stable' | 'declining' {
  if (data.length < 2) return 'stable'

  const firstHalf = data.slice(0, Math.ceil(data.length / 2))
  const secondHalf = data.slice(Math.floor(data.length / 2))

  const firstAverage =
    firstHalf.reduce((sum, point) => sum + point.y, 0) / firstHalf.length
  const secondAverage =
    secondHalf.reduce((sum, point) => sum + point.y, 0) / secondHalf.length

  const difference = secondAverage - firstAverage
  const threshold = 2 // Minimum change threshold

  if (difference > threshold) return 'improving'
  if (difference < -threshold) return 'declining'
  return 'stable'
}

/**
 * Calculate statistical insights from chart data
 */
export function calculateStatistics(data: ChartDataPoint[]): {
  average: number
  min: number
  max: number
  trend: 'improving' | 'stable' | 'declining'
  volatility: number
  bestPeriod: { start: Date; end: Date; value: number }
  worstPeriod: { start: Date; end: Date; value: number }
} {
  if (data.length === 0) {
    const now = new Date()
    return {
      average: 0,
      min: 0,
      max: 0,
      trend: 'stable',
      volatility: 0,
      bestPeriod: { start: now, end: now, value: 0 },
      worstPeriod: { start: now, end: now, value: 0 },
    }
  }

  const values = data.map(point => point.y)
  const average = values.reduce((sum, val) => sum + val, 0) / values.length
  const min = Math.min(...values)
  const max = Math.max(...values)

  // Calculate standard deviation for volatility
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) /
    values.length
  const volatility = Math.sqrt(variance)

  // Find best and worst periods (single data points for now)
  const maxIndex = values.indexOf(max)
  const minIndex = values.indexOf(min)

  const bestPeriod = {
    start: new Date(data[maxIndex].x),
    end: new Date(data[maxIndex].x),
    value: max,
  }

  const worstPeriod = {
    start: new Date(data[minIndex].x),
    end: new Date(data[minIndex].x),
    value: min,
  }

  return {
    average: Math.round(average * 100) / 100,
    min,
    max,
    trend: detectTrendDirection(data),
    volatility: Math.round(volatility * 100) / 100,
    bestPeriod,
    worstPeriod,
  }
}

/**
 * Format date for chart labels
 */
export function formatChartDate(
  date: Date,
  granularity: 'daily' | 'weekly' | 'monthly'
): string {
  switch (granularity) {
    case 'daily':
      return format(date, 'MMM dd')
    case 'weekly':
      return format(date, 'MMM dd')
    case 'monthly':
      return format(date, 'MMM yyyy')
    default:
      return format(date, 'MMM dd')
  }
}

/**
 * Generate chart export filename
 */
export function generateExportFilename(
  chartType: string,
  timeRange: string,
  fileFormat: 'png' | 'pdf'
): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm')
  return `resonant-${chartType}-${timeRange}-${timestamp}.${fileFormat}`
}

/**
 * Validate chart data for consistency
 */
export function validateChartData(data: ChartDataPoint[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (data.length === 0) {
    errors.push('Chart data is empty')
  }

  // Check for valid date/timestamp values
  const hasInvalidDates = data.some(point => {
    const date = new Date(point.x)
    return isNaN(date.getTime())
  })

  if (hasInvalidDates) {
    errors.push('Some data points have invalid dates')
  }

  // Check for valid numeric values
  const hasInvalidValues = data.some(
    point => typeof point.y !== 'number' || isNaN(point.y)
  )

  if (hasInvalidValues) {
    errors.push('Some data points have invalid numeric values')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
