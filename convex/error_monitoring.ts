/**
 * Comprehensive Error Metrics and Monitoring System (Story AI-Migration.4)
 * Provides real-time monitoring, alerting, and analytics for error tracking
 */

import { query, mutation, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { getCircuitBreakerHealthStatus } from './utils/circuit_breaker'
import { queryErrorLogs, getErrorPatterns } from './utils/error_logger'

/**
 * Get comprehensive error monitoring dashboard data
 */
export const getErrorMonitoringDashboard = query({
  args: {
    timeRange: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    service: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const timeRange = args.timeRange || {
      start: now - 24 * 60 * 60 * 1000, // Last 24 hours
      end: now,
    }

    // Get error patterns and trends
    const patterns = await getErrorPatterns(ctx, timeRange, args.service)

    // Get circuit breaker health for all services
    const services = ['gemini_2_5_flash_lite', 'fallback_analysis']
    const circuitBreakerHealth = await Promise.all(
      services.map(async service => ({
        service,
        health: await getCircuitBreakerHealthStatus(ctx, service),
      }))
    )

    // Get recent critical alerts
    const criticalAlerts = await ctx.db
      .query('errorAggregates')
      .filter(
        q =>
          q.gte(
            q.field('timeWindow'),
            Math.floor((now - 60 * 60 * 1000) / (60 * 60 * 1000))
          ) && // Last hour
          q.eq(q.field('severity'), 'critical')
      )
      .collect()

    // Calculate overall system health score
    const totalErrors = patterns.categoryBreakdown.reduce(
      (sum, cat) => sum + cat.count,
      0
    )
    const criticalErrors =
      patterns.severityDistribution.find(s => s.severity === 'critical')
        ?.count || 0
    const healthyCircuits = circuitBreakerHealth.filter(
      cb => cb.health.isHealthy
    ).length

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          criticalErrors * 10 -
          (totalErrors - criticalErrors) * 0.5 -
          (services.length - healthyCircuits) * 20
      )
    )

    // Generate alerts
    const alerts = []

    // Critical error alerts
    if (criticalErrors > 0) {
      alerts.push({
        level: 'critical' as const,
        message: `${criticalErrors} critical errors in the last 24 hours`,
        timestamp: now,
        category: 'error_volume',
      })
    }

    // Circuit breaker alerts
    for (const cb of circuitBreakerHealth) {
      alerts.push(
        ...cb.health.alerts.map(alert => ({
          ...alert,
          category: 'circuit_breaker',
          service: cb.service,
        }))
      )
    }

    // High error rate alerts
    const errorRate = totalErrors / 24 // Errors per hour
    if (errorRate > 50) {
      alerts.push({
        level: 'warning' as const,
        message: `High error rate: ${Math.round(errorRate)} errors/hour`,
        timestamp: now,
        category: 'error_rate',
      })
    }

    return {
      overview: {
        healthScore: Math.round(healthScore),
        totalErrors,
        criticalErrors,
        errorRate: Math.round(errorRate),
        servicesHealthy: healthyCircuits,
        servicesTotal: services.length,
      },
      patterns,
      circuitBreakerHealth,
      alerts: alerts.sort((a, b) => b.timestamp - a.timestamp),
      recommendations: generateRecommendations(patterns, circuitBreakerHealth),
    }
  },
})

/**
 * Get real-time error metrics for monitoring
 */
export const getRealTimeErrorMetrics = query({
  args: {
    services: v.optional(v.array(v.string())),
    lastMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const timeWindow = args.lastMinutes || 5
    const startTime = now - timeWindow * 60 * 1000

    // Get recent error logs
    const recentErrors = await queryErrorLogs(
      ctx,
      {
        timeRange: { start: startTime, end: now },
        service: args.services?.[0], // TODO: Support multiple services
      },
      { limit: 100 }
    )

    // Calculate metrics
    const errorsByMinute = new Map<number, number>()
    const errorsByService = new Map<string, number>()
    const errorsByCategory = new Map<string, number>()

    for (const error of recentErrors.logs) {
      const minute = Math.floor(error.context.timestamp / (60 * 1000))
      errorsByMinute.set(minute, (errorsByMinute.get(minute) || 0) + 1)
      errorsByService.set(
        error.context.service,
        (errorsByService.get(error.context.service) || 0) + 1
      )
      errorsByCategory.set(
        error.classification.category,
        (errorsByCategory.get(error.classification.category) || 0) + 1
      )
    }

    return {
      timeRange: { start: startTime, end: now },
      totalErrors: recentErrors.total,
      errorsByMinute: Array.from(errorsByMinute.entries()).map(
        ([minute, count]) => ({
          minute: minute * 60 * 1000, // Convert back to timestamp
          count,
        })
      ),
      errorsByService: Array.from(errorsByService.entries()).map(
        ([service, count]) => ({
          service,
          count,
        })
      ),
      errorsByCategory: Array.from(errorsByCategory.entries()).map(
        ([category, count]) => ({
          category,
          count,
        })
      ),
      isHealthy: recentErrors.total < 10, // Threshold for health
      trend: calculateTrend(Array.from(errorsByMinute.values())),
    }
  },
})

/**
 * Get error details for investigation
 */
export const getErrorDetails = query({
  args: {
    errorId: v.id('errorLogs'),
  },
  handler: async (ctx, args) => {
    const error = await ctx.db.get(args.errorId)
    if (!error) {
      throw new Error('Error not found')
    }

    // Get related errors
    const relatedErrors = await ctx.db
      .query('errorLogs')
      .filter(q =>
        q.or(
          q.eq(q.field('fingerprint'), error.fingerprint),
          q.eq(q.field('aggregationKey'), error.aggregationKey)
        )
      )
      .order('desc')
      .take(10)

    // Get error context timeline
    const contextualErrors = await ctx.db
      .query('errorLogs')
      .filter(q =>
        q.and(
          q.eq(q.field('context.userId'), error.context.userId),
          q.gte(q.field('context.timestamp'), error.context.timestamp - 300000), // 5 minutes before
          q.lte(q.field('context.timestamp'), error.context.timestamp + 300000) // 5 minutes after
        )
      )
      .order('asc')
      .collect()

    return {
      error,
      relatedErrors,
      contextualErrors,
      impactAnalysis: {
        affectedUsers: await getAffectedUsersCount(
          ctx,
          error.fingerprint,
          error.context.timestamp
        ),
        businessImpact: calculateBusinessImpact({
          category: error.classification.category,
          message: error.errorMessage,
          classification: error.classification,
          context: error.context,
        }),
        recurrencePattern: await analyzeRecurrencePattern(
          ctx,
          error.fingerprint
        ),
      },
    }
  },
})

/**
 * Create or update monitoring alert
 */
export const createMonitoringAlert = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    conditions: v.object({
      errorCount: v.optional(v.number()),
      errorRate: v.optional(v.number()),
      category: v.optional(v.string()),
      severity: v.optional(v.string()),
      service: v.optional(v.string()),
      timeWindow: v.number(), // in minutes
    }),
    actions: v.object({
      notify: v.boolean(),
      autoResolve: v.boolean(),
      escalate: v.boolean(),
    }),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('monitoringAlerts', {
      // New schema fields
      alertType: 'error_monitoring',
      severity: 'warning',
      message: args.description,
      triggeredAt: Date.now(),
      escalationLevel: 0,
      autoResolved: false,
      notificationsSent: [],
      conditions: {
        threshold: args.conditions.errorCount || 0,
        actualValue: 0,
        timeWindow: `${args.conditions.timeWindow}ms`,
        service: args.conditions.service,
      },
      // Legacy compatibility fields
      name: args.name,
      description: args.description,
      actions: args.actions,
      enabled: args.enabled,
      updatedAt: Date.now(),
      triggeredCount: 0,
      lastTriggered: undefined,
    })
  },
})

/**
 * Check monitoring alerts and trigger actions
 */
export const checkMonitoringAlerts = internalMutation({
  args: {},
  handler: async ctx => {
    const alerts = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('enabled'), true))
      .collect()

    const triggeredAlerts = []

    for (const alert of alerts) {
      const triggered = await evaluateAlert(ctx, alert)
      if (triggered) {
        triggeredAlerts.push(alert)

        // Update alert status
        await ctx.db.patch(alert._id, {
          triggeredCount: (alert.triggeredCount || 0) + 1,
          lastTriggered: Date.now(),
        })

        // Execute alert actions
        if (alert.actions?.notify) {
          await createNotification(ctx, alert, triggered)
        }
      }
    }

    return { triggeredAlerts: triggeredAlerts.length }
  },
})

/**
 * Get monitoring alert history
 */
export const getMonitoringAlertHistory = query({
  args: {
    alertId: v.optional(v.id('monitoringAlerts')),
    timeRange: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('alertHistory')

    if (args.alertId) {
      query = query.filter(q => q.eq(q.field('alertId'), args.alertId))
    }

    if (args.timeRange) {
      query = query.filter(
        q =>
          q.gte(q.field('triggeredAt'), args.timeRange!.start) &&
          q.lte(q.field('triggeredAt'), args.timeRange!.end)
      )
    }

    return await query.order('desc').take(100)
  },
})

/**
 * Get error trend analysis
 */
export const getErrorTrendAnalysis = query({
  args: {
    service: v.optional(v.string()),
    category: v.optional(v.string()),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    granularity: v.optional(v.union(v.literal('hour'), v.literal('day'))),
  },
  handler: async (ctx, args) => {
    const granularity = args.granularity || 'hour'
    const bucketSize =
      granularity === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000

    // Query error aggregates
    let query = ctx.db
      .query('errorAggregates')
      .filter(
        q =>
          q.gte(
            q.field('timeWindow'),
            Math.floor(args.timeRange.start / bucketSize)
          ) &&
          q.lte(
            q.field('timeWindow'),
            Math.floor(args.timeRange.end / bucketSize)
          )
      )

    if (args.service) {
      query = query.filter(q => q.eq(q.field('service'), args.service))
    }

    if (args.category) {
      query = query.filter(q => q.eq(q.field('category'), args.category))
    }

    const aggregates = await query.collect()

    // Group by time buckets
    const timeBuckets = new Map<
      number,
      {
        errorCount: number
        categories: Record<string, number>
        severities: Record<string, number>
      }
    >()

    for (const aggregate of aggregates) {
      const bucket = aggregate.timeWindow
      const existing = timeBuckets.get(bucket) || {
        errorCount: 0,
        categories: {},
        severities: {},
      }

      existing.errorCount += aggregate.count
      existing.categories[aggregate.category] =
        (existing.categories[aggregate.category] || 0) + aggregate.count
      existing.severities[aggregate.severity] =
        (existing.severities[aggregate.severity] || 0) + aggregate.count

      timeBuckets.set(bucket, existing)
    }

    // Convert to array and calculate trends
    const dataPoints = Array.from(timeBuckets.entries())
      .map(([bucket, data]) => ({
        timestamp: bucket * bucketSize,
        ...data,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Calculate trend metrics
    const errorCounts = dataPoints.map(d => d.errorCount)
    const trend = calculateTrendMetrics(errorCounts)

    return {
      dataPoints,
      trend,
      summary: {
        totalErrors: errorCounts.reduce((sum, count) => sum + count, 0),
        avgErrorsPerPeriod:
          errorCounts.length > 0
            ? errorCounts.reduce((sum, count) => sum + count, 0) /
              errorCounts.length
            : 0,
        peakErrors: Math.max(...errorCounts, 0),
        healthScore: calculatePeriodHealthScore(dataPoints),
      },
    }
  },
})

// Helper functions

async function evaluateAlert(ctx: any, alert: any): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - alert.conditions.timeWindow * 60 * 1000

  // Get recent errors matching alert conditions
  const filters: any = {
    timeRange: { start: windowStart, end: now },
  }

  if (alert.conditions.service) filters.service = alert.conditions.service
  if (alert.conditions.category) filters.category = alert.conditions.category
  if (alert.conditions.severity) filters.severity = alert.conditions.severity

  const errors = await queryErrorLogs(ctx, filters, { limit: 1000 })

  // Check error count threshold
  if (
    alert.conditions.errorCount &&
    errors.total >= alert.conditions.errorCount
  ) {
    return true
  }

  // Check error rate threshold
  if (alert.conditions.errorRate) {
    const rate = errors.total / (alert.conditions.timeWindow / 60) // errors per minute
    if (rate >= alert.conditions.errorRate) {
      return true
    }
  }

  return false
}

async function createNotification(ctx: any, alert: any, trigger: any) {
  // Create notification record
  await ctx.db.insert('notifications', {
    type: 'monitoring_alert',
    title: `Alert: ${alert.name}`,
    message: alert.description,
    data: {
      alertId: alert._id,
      trigger,
    },
    createdAt: Date.now(),
    read: false,
  })
}

async function getAffectedUsersCount(
  ctx: any,
  fingerprint: string,
  timestamp: number
): Promise<number> {
  const errors = await ctx.db
    .query('errorLogs')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('fingerprint'), fingerprint),
        q.gte(q.field('context.timestamp'), timestamp - 24 * 60 * 60 * 1000) // Last 24 hours
      )
    )
    .collect()

  const uniqueUsers = new Set(
    errors.map((e: any) => e.context.userId).filter(Boolean)
  )
  return uniqueUsers.size
}

function calculateBusinessImpact(error: {
  category: string
  message: string
  classification?: { businessImpact?: string }
  context?: { endpoint?: string; userId?: string }
}): {
  severity: string
  estimatedRevenueLoss: number
  userExperienceImpact: string
} {
  const { classification } = error

  let estimatedRevenueLoss = 0
  let userExperienceImpact = 'minimal'

  switch (classification?.businessImpact) {
    case 'high':
      estimatedRevenueLoss = 1000
      userExperienceImpact = 'severe'
      break
    case 'medium':
      estimatedRevenueLoss = 100
      userExperienceImpact = 'moderate'
      break
    case 'low':
      estimatedRevenueLoss = 10
      userExperienceImpact = 'minor'
      break
  }

  return {
    severity: classification?.businessImpact || 'low',
    estimatedRevenueLoss,
    userExperienceImpact,
  }
}

async function analyzeRecurrencePattern(
  ctx: any,
  fingerprint: string
): Promise<{
  frequency: string
  pattern: string
  nextPredicted?: number
}> {
  const errors = await ctx.db
    .query('errorLogs')
    .filter((q: any) => q.eq(q.field('fingerprint'), fingerprint))
    .order('desc')
    .take(50)

  if (errors.length < 2) {
    return { frequency: 'insufficient_data', pattern: 'unknown' }
  }

  const timestamps = errors.map((e: any) => e.context.timestamp).sort()
  const intervals = timestamps
    .slice(1)
    .map((t: any, i: any) => t - timestamps[i])

  const avgInterval =
    intervals.reduce((sum: number, interval: number) => sum + interval, 0) /
    intervals.length

  let frequency = 'irregular'
  if (avgInterval < 60000)
    frequency = 'very_frequent' // < 1 minute
  else if (avgInterval < 300000)
    frequency = 'frequent' // < 5 minutes
  else if (avgInterval < 3600000)
    frequency = 'moderate' // < 1 hour
  else if (avgInterval < 86400000)
    frequency = 'infrequent' // < 1 day
  else frequency = 'rare'

  return {
    frequency,
    pattern: intervals.length > 5 ? 'recurring' : 'sporadic',
    nextPredicted:
      frequency !== 'irregular'
        ? timestamps[timestamps.length - 1] + avgInterval
        : undefined,
  }
}

function calculateTrend(values: number[]): {
  direction: string
  strength: number
} {
  if (values.length < 2) return { direction: 'stable', strength: 0 }

  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length
  const secondAvg =
    secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length

  const change = secondAvg - firstAvg
  const strength = Math.abs(change) / (firstAvg || 1)

  if (strength < 0.1) return { direction: 'stable', strength: 0 }
  return {
    direction: change > 0 ? 'increasing' : 'decreasing',
    strength: Math.round(strength * 100),
  }
}

function calculateTrendMetrics(values: number[]): {
  direction: string
  slope: number
  rsquared: number
  forecast: number[]
} {
  if (values.length < 3) {
    return { direction: 'stable', slope: 0, rsquared: 0, forecast: [] }
  }

  // Simple linear regression
  const n = values.length
  const xValues = Array.from({ length: n }, (_, i) => i)
  const xSum = xValues.reduce((sum, x) => sum + x, 0)
  const ySum = values.reduce((sum, y) => sum + y, 0)
  const xySum = xValues.reduce((sum, x, i) => sum + x * values[i], 0)
  const x2Sum = xValues.reduce((sum, x) => sum + x * x, 0)

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum)
  const intercept = (ySum - slope * xSum) / n

  // Calculate R-squared
  const yMean = ySum / n
  const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0)
  const ssRes = values.reduce((sum, y, i) => {
    const predicted = slope * i + intercept
    return sum + Math.pow(y - predicted, 2)
  }, 0)
  const rsquared = 1 - ssRes / ssTotal

  // Generate forecast for next 5 periods
  const forecast = Array.from(
    { length: 5 },
    (_, i) => slope * (n + i) + intercept
  )

  return {
    direction:
      slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
    slope,
    rsquared,
    forecast,
  }
}

function calculatePeriodHealthScore(dataPoints: any[]): number {
  if (dataPoints.length === 0) return 100

  const totalErrors = dataPoints.reduce((sum, d) => sum + d.errorCount, 0)
  const avgErrorsPerPeriod = totalErrors / dataPoints.length

  // Health score decreases with error rate
  return Math.max(0, Math.min(100, 100 - avgErrorsPerPeriod * 2))
}

function generateRecommendations(
  patterns: any,
  circuitBreakerHealth: any[]
): string[] {
  const recommendations = []

  // Error pattern recommendations
  if (patterns.categoryBreakdown.length > 0) {
    const topCategory = patterns.categoryBreakdown[0]
    if (topCategory.percentage > 50) {
      switch (topCategory.category) {
        case 'network':
          recommendations.push(
            'High network errors detected - check connectivity and add retry logic'
          )
          break
        case 'timeout':
          recommendations.push(
            'Frequent timeouts - consider increasing timeout values or optimizing service performance'
          )
          break
        case 'rate_limit':
          recommendations.push(
            'Rate limiting issues - implement exponential backoff or request throttling'
          )
          break
        case 'service_error':
          recommendations.push(
            'Service errors dominating - investigate upstream service health'
          )
          break
      }
    }
  }

  // Circuit breaker recommendations
  const unhealthyCircuits = circuitBreakerHealth.filter(
    cb => !cb.health.isHealthy
  )
  if (unhealthyCircuits.length > 0) {
    recommendations.push(
      `${unhealthyCircuits.length} circuit breaker(s) unhealthy - review service dependencies`
    )
  }

  // Severity recommendations
  const criticalPercentage =
    patterns.severityDistribution.find((s: any) => s.severity === 'critical')
      ?.percentage || 0
  if (criticalPercentage > 10) {
    recommendations.push(
      'High critical error rate - immediate investigation required'
    )
  }

  return recommendations
}
