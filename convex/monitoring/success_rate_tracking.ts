/**
 * Success Rate Tracking & Alerting System (Story AI-Migration.6)
 * Comprehensive success rate monitoring with configurable time windows and alerting
 */

import { query, mutation, internalMutation } from '../_generated/server'
import { v } from 'convex/values'
import { getCircuitBreakerHealthStatus } from '../utils/circuit_breaker'

// Performance thresholds based on story requirements
export const SUCCESS_RATE_THRESHOLDS = {
  warning: 0.92, // 8% buffer above critical
  critical: 0.9, // 5% buffer above emergency
  emergency: 0.85, // 10% below target (95%)
} as const

export const TIME_WINDOWS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const

/**
 * Calculate success rate for AI analysis pipeline
 */
export const calculateSuccessRate = query({
  args: {
    timeWindow: v.optional(
      v.union(
        v.literal('1h'),
        v.literal('6h'),
        v.literal('24h'),
        v.literal('7d'),
        v.literal('30d')
      )
    ),
    service: v.optional(v.string()), // Filter by specific service
    modelType: v.optional(v.string()), // Filter by model type
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const windowMs = TIME_WINDOWS[timeWindow]
    const startTime = Date.now() - windowMs

    // Build query filters
    let query = ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))

    if (args.service) {
      query = query.filter((q: any) => q.eq(q.field('modelType'), args.service))
    }

    if (args.modelType) {
      query = query.filter((q: any) =>
        q.eq(q.field('modelType'), args.modelType)
      )
    }

    const analyses = await query.collect()

    // Calculate success/failure counts
    const totalCount = analyses.length
    const successCount = analyses.filter(a => a.status === 'completed').length
    const failureCount = analyses.filter(a => a.status === 'failed').length
    const processingCount = analyses.filter(
      a => a.status === 'processing'
    ).length

    const successRate = totalCount > 0 ? successCount / totalCount : 1.0

    // Calculate trend by comparing with previous period
    const prevStartTime = startTime - windowMs
    const prevEndTime = startTime

    let prevQuery = ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), prevStartTime))
      .filter(q => q.lt(q.field('createdAt'), prevEndTime))

    if (args.service) {
      prevQuery = prevQuery.filter((q: any) =>
        q.eq(q.field('modelType'), args.service)
      )
    }

    const prevAnalyses = await prevQuery.collect()
    const prevTotalCount = prevAnalyses.length
    const prevSuccessCount = prevAnalyses.filter(
      a => a.status === 'completed'
    ).length
    const prevSuccessRate =
      prevTotalCount > 0 ? prevSuccessCount / prevTotalCount : 1.0

    const trendDirection =
      successRate > prevSuccessRate + 0.01
        ? 'improving'
        : successRate < prevSuccessRate - 0.01
          ? 'declining'
          : 'stable'

    // Determine alert level
    let alertLevel: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal'
    if (successRate <= SUCCESS_RATE_THRESHOLDS.emergency) {
      alertLevel = 'emergency'
    } else if (successRate <= SUCCESS_RATE_THRESHOLDS.critical) {
      alertLevel = 'critical'
    } else if (successRate <= SUCCESS_RATE_THRESHOLDS.warning) {
      alertLevel = 'warning'
    }

    return {
      timeWindow,
      startTime,
      endTime: Date.now(),
      metrics: {
        successRate,
        totalCount,
        successCount,
        failureCount,
        processingCount,
      },
      trend: {
        direction: trendDirection,
        previousSuccessRate: prevSuccessRate,
        change: successRate - prevSuccessRate,
      },
      alert: {
        level: alertLevel,
        thresholds: SUCCESS_RATE_THRESHOLDS,
        shouldAlert: alertLevel !== 'normal',
      },
      breakdown: {
        byService: args.service
          ? undefined
          : await getSuccessRateByService(ctx, startTime),
        byModelType: args.modelType
          ? undefined
          : await getSuccessRateByModelType(ctx, startTime),
      },
    }
  },
})

/**
 * Get success rate breakdown by service
 */
async function getSuccessRateByService(ctx: any, startTime: number) {
  const analyses = await ctx.db
    .query('aiAnalysis')
    .filter(q => q.gte(q.field('createdAt'), startTime))
    .collect()

  const serviceStats = new Map<string, { total: number; success: number }>()

  for (const analysis of analyses) {
    const service = analysis.modelType || 'unknown'
    const stats = serviceStats.get(service) || { total: 0, success: 0 }
    stats.total++
    if (analysis.status === 'completed') {
      stats.success++
    }
    serviceStats.set(service, stats)
  }

  return Array.from(serviceStats.entries()).map(([service, stats]) => ({
    service,
    successRate: stats.total > 0 ? stats.success / stats.total : 1.0,
    totalCount: stats.total,
    successCount: stats.success,
  }))
}

/**
 * Get success rate breakdown by model type
 */
async function getSuccessRateByModelType(ctx: any, startTime: number) {
  const analyses = await ctx.db
    .query('aiAnalysis')
    .filter(q => q.gte(q.field('createdAt'), startTime))
    .collect()

  const modelStats = new Map<string, { total: number; success: number }>()

  for (const analysis of analyses) {
    const modelType = analysis.modelType || 'unknown'
    const stats = modelStats.get(modelType) || { total: 0, success: 0 }
    stats.total++
    if (analysis.status === 'completed') {
      stats.success++
    }
    modelStats.set(modelType, stats)
  }

  return Array.from(modelStats.entries()).map(([modelType, stats]) => ({
    modelType,
    successRate: stats.total > 0 ? stats.success / stats.total : 1.0,
    totalCount: stats.total,
    successCount: stats.success,
  }))
}

/**
 * Get real-time success rate monitoring data
 */
export const getRealTimeSuccessRate = query({
  args: {
    refreshInterval: v.optional(v.number()), // seconds
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Get success rates for multiple time windows
    const timeWindows = ['1h', '6h', '24h'] as const
    const metrics = []

    for (const window of timeWindows) {
      const windowMs = TIME_WINDOWS[window]
      const startTime = now - windowMs

      const analyses = await ctx.db
        .query('aiAnalysis')
        .filter(q => q.gte(q.field('createdAt'), startTime))
        .collect()

      const totalCount = analyses.length
      const successCount = analyses.filter(a => a.status === 'completed').length
      const successRate = totalCount > 0 ? successCount / totalCount : 1.0

      let alertLevel: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal'
      if (successRate <= SUCCESS_RATE_THRESHOLDS.emergency) {
        alertLevel = 'emergency'
      } else if (successRate <= SUCCESS_RATE_THRESHOLDS.critical) {
        alertLevel = 'critical'
      } else if (successRate <= SUCCESS_RATE_THRESHOLDS.warning) {
        alertLevel = 'warning'
      }

      metrics.push({
        timeWindow: window,
        successRate,
        totalCount,
        successCount,
        failureCount: totalCount - successCount,
        processingCount: analyses.filter(a => a.status === 'processing').length,
        alertLevel,
        trend: {
          direction: 'stable' as const,
          previousSuccessRate: 0,
          change: 0,
        },
      })
    }

    // Get circuit breaker status for context
    const services = ['gemini_2_5_flash_lite', 'fallback_analysis']
    const circuitBreakerStatus = await Promise.all(
      services.map(async service => ({
        service,
        health: await getCircuitBreakerHealthStatus(ctx, service),
      }))
    )

    return {
      timestamp: now,
      metrics,
      circuitBreakerStatus,
      refreshInterval: args.refreshInterval || 30, // Default 30 seconds
      thresholds: SUCCESS_RATE_THRESHOLDS,
    }
  },
})

/**
 * Get success rate trend analysis and pattern detection
 */
export const getSuccessRateTrends = query({
  args: {
    timeWindow: v.union(v.literal('24h'), v.literal('7d'), v.literal('30d')),
    granularity: v.optional(v.union(v.literal('hourly'), v.literal('daily'))),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow
    const granularity =
      args.granularity || (timeWindow === '24h' ? 'hourly' : 'daily')
    const windowMs = TIME_WINDOWS[timeWindow]
    const startTime = Date.now() - windowMs

    // Calculate granularity interval
    const intervalMs =
      granularity === 'hourly' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const intervals = Math.ceil(windowMs / intervalMs)

    const trendData = []

    for (let i = 0; i < intervals; i++) {
      const intervalStart = startTime + i * intervalMs
      const intervalEnd = intervalStart + intervalMs

      const analyses = await ctx.db
        .query('aiAnalysis')
        .filter(q => q.gte(q.field('createdAt'), intervalStart))
        .filter(q => q.lt(q.field('createdAt'), intervalEnd))
        .collect()

      const totalCount = analyses.length
      const successCount = analyses.filter(a => a.status === 'completed').length
      const successRate = totalCount > 0 ? successCount / totalCount : null

      trendData.push({
        timestamp: intervalStart,
        successRate,
        totalCount,
        successCount,
        failureCount: totalCount - successCount,
      })
    }

    // Detect patterns
    const patterns = detectSuccessRatePatterns(trendData)

    return {
      timeWindow,
      granularity,
      startTime,
      endTime: Date.now(),
      trendData: trendData.filter(point => point.successRate !== null),
      patterns,
      summary: {
        averageSuccessRate: calculateAverage(
          trendData.map(p => p.successRate).filter(r => r !== null)
        ),
        minSuccessRate: Math.min(
          ...trendData.map(p => p.successRate).filter(r => r !== null)
        ),
        maxSuccessRate: Math.max(
          ...trendData.map(p => p.successRate).filter(r => r !== null)
        ),
        totalAnalyses: trendData.reduce((sum, p) => sum + p.totalCount, 0),
      },
    }
  },
})

/**
 * Detect patterns in success rate data
 */
function detectSuccessRatePatterns(
  trendData: Array<{ timestamp: number; successRate: number | null }>
) {
  const validData = trendData.filter(p => p.successRate !== null)
  if (validData.length < 3) {
    return []
  }

  const patterns = []

  // Detect downward trends
  let consecutiveDeclines = 0
  for (let i = 1; i < validData.length; i++) {
    if (validData[i].successRate! < validData[i - 1].successRate!) {
      consecutiveDeclines++
    } else {
      if (consecutiveDeclines >= 3) {
        patterns.push({
          type: 'declining_trend',
          description: `Success rate declined for ${consecutiveDeclines} consecutive periods`,
          confidence: Math.min(consecutiveDeclines / 5, 1.0),
          severity: consecutiveDeclines >= 5 ? 'high' : 'medium',
        })
      }
      consecutiveDeclines = 0
    }
  }

  // Detect volatility
  const rates = validData.map(p => p.successRate!)
  const average = calculateAverage(rates)
  const variance =
    rates.reduce((sum, rate) => sum + Math.pow(rate - average, 2), 0) /
    rates.length
  const standardDeviation = Math.sqrt(variance)

  if (standardDeviation > 0.1) {
    // High volatility threshold
    patterns.push({
      type: 'high_volatility',
      description: `Success rate shows high volatility (σ = ${standardDeviation.toFixed(3)})`,
      confidence: Math.min(standardDeviation / 0.2, 1.0),
      severity: standardDeviation > 0.15 ? 'high' : 'medium',
    })
  }

  // Detect recovery patterns
  let recoveryStreak = 0
  for (let i = 1; i < validData.length; i++) {
    if (validData[i].successRate! > validData[i - 1].successRate!) {
      recoveryStreak++
    } else {
      if (recoveryStreak >= 3) {
        patterns.push({
          type: 'recovery_trend',
          description: `Success rate improved for ${recoveryStreak} consecutive periods`,
          confidence: Math.min(recoveryStreak / 5, 1.0),
          severity: 'low',
        })
      }
      recoveryStreak = 0
    }
  }

  return patterns
}

function calculateAverage(numbers: number[]): number {
  return numbers.length > 0
    ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length
    : 0
}

/**
 * Check success rate thresholds and trigger alerts
 */
export const checkSuccessRateAlerts = internalMutation({
  args: {
    timeWindow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const windowMs = TIME_WINDOWS[timeWindow as keyof typeof TIME_WINDOWS]
    const startTime = Date.now() - windowMs

    // Calculate current success rate
    const analyses = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    const totalCount = analyses.length
    const successCount = analyses.filter(a => a.status === 'completed').length
    const successRate = totalCount > 0 ? successCount / totalCount : 1.0

    // Determine alert level
    let alertLevel: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal'
    if (successRate <= SUCCESS_RATE_THRESHOLDS.emergency) {
      alertLevel = 'emergency'
    } else if (successRate <= SUCCESS_RATE_THRESHOLDS.critical) {
      alertLevel = 'critical'
    } else if (successRate <= SUCCESS_RATE_THRESHOLDS.warning) {
      alertLevel = 'warning'
    }

    if (alertLevel === 'normal') {
      return { alertTriggered: false, successRate, alertLevel }
    }

    // Check if alert already exists for this condition
    const existingAlert = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('alertType'), 'success_rate'))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .filter(q => q.eq(q.field('conditions.timeWindow'), timeWindow))
      .first()

    if (existingAlert) {
      // Update existing alert with new data
      await ctx.db.patch(existingAlert._id, {
        conditions: {
          threshold: existingAlert.conditions.threshold,
          actualValue: successRate,
          service: existingAlert.conditions.service,
          timeWindow: existingAlert.conditions.timeWindow,
        },
        triggeredAt: Date.now(),
      })
      return {
        alertTriggered: false,
        successRate,
        alertLevel,
        alertId: existingAlert._id,
      }
    }

    // Create new alert
    const threshold =
      SUCCESS_RATE_THRESHOLDS[
        alertLevel as keyof typeof SUCCESS_RATE_THRESHOLDS
      ]
    const alertId = await ctx.db.insert('monitoringAlerts', {
      alertType: 'success_rate',
      severity: alertLevel as 'warning' | 'critical' | 'emergency',
      message: `Success rate (${(successRate * 100).toFixed(1)}%) below ${alertLevel} threshold (${(threshold * 100).toFixed(1)}%) for ${timeWindow}`,
      triggeredAt: Date.now(),
      escalationLevel: 0,
      autoResolved: false,
      notificationsSent: [],
      conditions: {
        threshold,
        actualValue: successRate,
        timeWindow,
      },
      metadata: {
        totalAnalyses: totalCount,
        successCount,
        failureCount: totalCount - successCount,
      },
    })

    return {
      alertTriggered: true,
      successRate,
      alertLevel,
      alertId,
      message: `Success rate alert: ${alertLevel} threshold breached`,
    }
  },
})

/**
 * Compare success rates across different AI models and services
 */
export const compareSuccessRatesAcrossServices = query({
  args: {
    timeWindow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const windowMs = TIME_WINDOWS[timeWindow as keyof typeof TIME_WINDOWS]
    const startTime = Date.now() - windowMs

    const analyses = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Group by model type and service
    const serviceComparison = new Map<
      string,
      {
        total: number
        success: number
        avgProcessingTime: number
        avgCost: number
        fallbackUsed: number
      }
    >()

    for (const analysis of analyses) {
      const key = `${analysis.modelType || 'unknown'}`
      const stats = serviceComparison.get(key) || {
        total: 0,
        success: 0,
        avgProcessingTime: 0,
        avgCost: 0,
        fallbackUsed: 0,
      }

      stats.total++
      if (analysis.status === 'completed') {
        stats.success++
      }
      stats.avgProcessingTime += analysis.processingTime || 0
      stats.avgCost += analysis.apiCost || 0
      if (analysis.fallbackUsed) {
        stats.fallbackUsed++
      }

      serviceComparison.set(key, stats)
    }

    // Calculate final metrics
    const comparison = Array.from(serviceComparison.entries()).map(
      ([service, stats]) => ({
        service,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
        totalAnalyses: stats.total,
        successCount: stats.success,
        failureCount: stats.total - stats.success,
        avgProcessingTime:
          stats.total > 0 ? stats.avgProcessingTime / stats.total : 0,
        avgCost: stats.total > 0 ? stats.avgCost / stats.total : 0,
        fallbackRate: stats.total > 0 ? stats.fallbackUsed / stats.total : 0,
        performance: {
          speed:
            stats.total > 0
              ? stats.avgProcessingTime / stats.total < 30000
                ? 'good'
                : 'slow'
              : 'unknown',
          cost:
            stats.total > 0
              ? stats.avgCost / stats.total < 0.01
                ? 'efficient'
                : 'expensive'
              : 'unknown',
          reliability:
            stats.total > 0
              ? stats.success / stats.total > 0.95
                ? 'excellent'
                : stats.success / stats.total > 0.9
                  ? 'good'
                  : 'poor'
              : 'unknown',
        },
      })
    )

    // Sort by success rate descending
    comparison.sort((a, b) => b.successRate - a.successRate)

    return {
      timeWindow,
      startTime,
      endTime: Date.now(),
      comparison,
      insights: {
        bestPerforming: comparison[0]?.service || 'none',
        worstPerforming: comparison[comparison.length - 1]?.service || 'none',
        totalServices: comparison.length,
        overallSuccessRate:
          comparison.reduce(
            (sum, s) => sum + s.successRate * s.totalAnalyses,
            0
          ) / comparison.reduce((sum, s) => sum + s.totalAnalyses, 0) || 0,
      },
    }
  },
})
