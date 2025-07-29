/**
 * Queue Metrics and Monitoring System
 * Comprehensive real-time monitoring and analytics for the AI analysis queue
 */

import { internalQuery, internalMutation, query } from '../_generated/server'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import {
  QUEUE_CONFIG,
  PRIORITY_CRITERIA,
  QUEUE_HEALTH_LEVELS,
} from './queue_config'
import { getPriorityValue, isWithinSla } from '../utils/priority_assessment'

/**
 * Public query for real-time queue dashboard (admin access)
 */
export const getQueueDashboardPublic = query({
  handler: async (ctx): Promise<unknown> => {
    return await ctx.runQuery(
      internal.scheduler.queue_metrics.getQueueDashboard,
      {}
    )
  },
})

/**
 * Real-time queue dashboard metrics
 */
export const getQueueDashboard = internalQuery({
  handler: async ctx => {
    const now = Date.now()

    // Get all queue items
    const allQueueItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .collect()

    // Get completed items from last 24 hours for performance metrics
    const dayAgo = now - 24 * 60 * 60 * 1000
    const recentCompleted = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_created', q => q.eq('status', 'completed'))
      .filter(q => q.gt(q.field('createdAt'), dayAgo))
      .collect()

    // Get failed items from last 24 hours
    const recentFailed = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_created', q => q.eq('status', 'failed'))
      .filter(q => q.gt(q.field('createdAt'), dayAgo))
      .collect()

    // Calculate basic metrics
    const totalQueued = allQueueItems.length
    const capacityUtilization =
      (totalQueued / QUEUE_CONFIG.MAX_QUEUE_SIZE) * 100

    // Priority breakdown
    const priorityBreakdown = allQueueItems.reduce(
      (acc, item) => {
        const priority = item.priority || 'normal'
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Processing status breakdown
    const activeProcessing = allQueueItems.filter(
      item => item.processingStartedAt
    ).length
    const waitingInQueue = totalQueued - activeProcessing

    // Wait time analysis
    const waitTimes = allQueueItems.map(
      item => now - (item.queuedAt || item.createdAt)
    )
    const averageWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0
    const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0

    // SLA compliance analysis
    const slaCompliance = {
      urgent: calculateSlaCompliance(
        allQueueItems.filter(item => item.priority === 'urgent'),
        'urgent'
      ),
      high: calculateSlaCompliance(
        allQueueItems.filter(item => item.priority === 'high'),
        'high'
      ),
      normal: calculateSlaCompliance(
        allQueueItems.filter(item => item.priority === 'normal'),
        'normal'
      ),
    }

    // Performance metrics (last 24 hours)
    const totalProcessed24h = recentCompleted.length + recentFailed.length
    const successRate =
      totalProcessed24h > 0
        ? (recentCompleted.length / totalProcessed24h) * 100
        : 100

    const averageProcessingTime =
      recentCompleted.length > 0
        ? recentCompleted.reduce(
            (sum, item) => sum + (item.processingTime || 0),
            0
          ) / recentCompleted.length
        : 0

    // Throughput analysis
    const throughputPerHour = Math.round(totalProcessed24h / 24)
    const currentProcessingRate = activeProcessing // Items currently being processed

    // Health status determination
    const healthStatus = determineQueueHealth(
      capacityUtilization,
      averageWaitTime,
      successRate
    )

    return {
      // Basic queue status
      totalQueued,
      maxCapacity: QUEUE_CONFIG.MAX_QUEUE_SIZE,
      capacityUtilization: Math.round(capacityUtilization * 100) / 100,

      // Processing breakdown
      activeProcessing,
      waitingInQueue,
      maxConcurrentProcessing: QUEUE_CONFIG.MAX_CONCURRENT_PROCESSING,

      // Priority analysis
      priorityBreakdown,

      // Wait time metrics
      averageWaitTime: Math.round(averageWaitTime),
      maxWaitTime: Math.round(maxWaitTime),

      // SLA compliance
      slaCompliance,

      // Performance metrics (24h)
      performance24h: {
        totalProcessed: totalProcessed24h,
        completed: recentCompleted.length,
        failed: recentFailed.length,
        successRate: Math.round(successRate * 100) / 100,
        averageProcessingTime: Math.round(averageProcessingTime),
        throughputPerHour,
        currentProcessingRate,
      },

      // Health and alerting
      healthStatus,
      alerts: generateQueueAlerts(
        capacityUtilization,
        averageWaitTime,
        successRate,
        maxWaitTime
      ),

      // Timestamp
      timestamp: now,
      lastUpdated: new Date(now).toISOString(),
    }
  },
})

/**
 * Detailed queue performance analytics
 */
export const getQueueAnalytics = internalQuery({
  args: {
    timeRangeHours: v.optional(v.number()),
    includeUserBreakdown: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { timeRangeHours = 24, includeUserBreakdown = false }
  ) => {
    const now = Date.now()
    const startTime = now - timeRangeHours * 60 * 60 * 1000

    // Get all items within time range
    const allItems = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gt(q.field('createdAt'), startTime))
      .collect()

    // Separate by status
    const completed = allItems.filter(item => item.status === 'completed')
    const failed = allItems.filter(item => item.status === 'failed')
    const processing = allItems.filter(item => item.status === 'processing')

    // Performance analysis
    const totalItems = allItems.length
    const completionRate =
      totalItems > 0 ? (completed.length / totalItems) * 100 : 100

    // Processing time analysis
    const processingTimes = completed
      .filter(item => item.processingTime && item.processingTime > 0)
      .map(item => item.processingTime!)

    const processingTimeStats = calculateTimeStats(processingTimes)

    // Queue wait time analysis
    const waitTimes = completed
      .filter(item => item.queueWaitTime && item.queueWaitTime > 0)
      .map(item => item.queueWaitTime!)

    const waitTimeStats = calculateTimeStats(waitTimes)

    // Priority performance breakdown
    const priorityPerformance = {
      urgent: analyzePerformanceByPriority(
        allItems.filter(item => item.priority === 'urgent')
      ),
      high: analyzePerformanceByPriority(
        allItems.filter(item => item.priority === 'high')
      ),
      normal: analyzePerformanceByPriority(
        allItems.filter(item => item.priority === 'normal')
      ),
    }

    // Error analysis
    const errorAnalysis = analyzeErrors(failed)

    // Throughput timeline (hourly breakdown)
    const throughputTimeline = generateThroughputTimeline(
      allItems,
      timeRangeHours
    )

    // User breakdown (if requested)
    const userBreakdown = includeUserBreakdown
      ? generateUserBreakdown(allItems)
      : undefined

    return {
      timeRange: {
        hours: timeRangeHours,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(now).toISOString(),
      },
      summary: {
        totalItems,
        completed: completed.length,
        failed: failed.length,
        processing: processing.length,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      performance: {
        processingTime: processingTimeStats,
        waitTime: waitTimeStats,
        priorityBreakdown: priorityPerformance,
      },
      errors: errorAnalysis,
      throughput: throughputTimeline,
      ...(userBreakdown && { userBreakdown }),
      generatedAt: new Date(now).toISOString(),
    }
  },
})

/**
 * Queue health monitoring with alerting
 */
export const getQueueHealth = internalQuery({
  handler: async ctx => {
    const now = Date.now()

    // Get current queue state
    const queueItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .collect()

    // Calculate health metrics
    const totalQueued = queueItems.length
    const capacityUtilization =
      (totalQueued / QUEUE_CONFIG.MAX_QUEUE_SIZE) * 100

    const waitTimes = queueItems.map(
      item => now - (item.queuedAt || item.createdAt)
    )
    const averageWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0

    // Get recent failure rate (last hour)
    const hourAgo = now - 60 * 60 * 1000
    const recentItems = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gt(q.field('createdAt'), hourAgo))
      .collect()

    const recentCompleted = recentItems.filter(
      item => item.status === 'completed'
    ).length
    const recentFailed = recentItems.filter(
      item => item.status === 'failed'
    ).length
    const recentTotal = recentCompleted + recentFailed
    const successRate =
      recentTotal > 0 ? (recentCompleted / recentTotal) * 100 : 100

    // Determine overall health status
    const healthStatus = determineQueueHealth(
      capacityUtilization,
      averageWaitTime,
      successRate
    )

    // Generate specific alerts
    const alerts = generateQueueAlerts(
      capacityUtilization,
      averageWaitTime,
      successRate,
      Math.max(...waitTimes, 0)
    )

    // SLA violations
    const slaViolations = findSlaViolations(queueItems)

    // System recommendations
    const recommendations = generateRecommendations(
      capacityUtilization,
      averageWaitTime,
      successRate,
      slaViolations.length
    )

    return {
      status: healthStatus.status,
      score: healthStatus.score,
      metrics: {
        capacityUtilization: Math.round(capacityUtilization * 100) / 100,
        averageWaitTime: Math.round(averageWaitTime),
        successRate: Math.round(successRate * 100) / 100,
        totalQueued,
        activeProcessing: queueItems.filter(item => item.processingStartedAt)
          .length,
      },
      alerts,
      slaViolations,
      recommendations,
      lastChecked: new Date(now).toISOString(),
    }
  },
})

/**
 * Export queue metrics for external monitoring tools
 */
export const exportQueueMetrics = internalQuery({
  args: {
    format: v.optional(
      v.union(v.literal('prometheus'), v.literal('json'), v.literal('csv'))
    ),
  },
  handler: async (ctx, { format = 'json' }): Promise<unknown> => {
    const dashboard: unknown = await ctx.runQuery(
      internal.scheduler.queue_metrics.getQueueDashboard,
      {}
    )
    const health: unknown = await ctx.runQuery(
      internal.scheduler.queue_metrics.getQueueHealth,
      {}
    )

    const dashboardData = dashboard as any
    const healthData = health as any

    const metrics: Record<string, unknown> = {
      // Basic queue metrics
      queue_total_items: dashboardData.totalQueued,
      queue_capacity_utilization_percent: dashboardData.capacityUtilization,
      queue_average_wait_time_ms: dashboardData.averageWaitTime,
      queue_max_wait_time_ms: dashboardData.maxWaitTime,

      // Processing metrics
      queue_active_processing: dashboardData.activeProcessing,
      queue_waiting_count: dashboardData.waitingInQueue,

      // Priority breakdown
      queue_urgent_count: dashboardData.priorityBreakdown.urgent || 0,
      queue_high_count: dashboardData.priorityBreakdown.high || 0,
      queue_normal_count: dashboardData.priorityBreakdown.normal || 0,

      // Performance (24h)
      queue_throughput_per_hour: dashboardData.performance24h.throughputPerHour,
      queue_success_rate_percent: dashboardData.performance24h.successRate,
      queue_average_processing_time_ms:
        dashboardData.performance24h.averageProcessingTime,

      // Health
      queue_health_score: healthData.score,
      queue_alert_count: healthData.alerts.length,
      queue_sla_violations: healthData.slaViolations.length,

      // SLA compliance
      queue_sla_urgent_compliance_percent:
        dashboardData.slaCompliance.urgent.complianceRate,
      queue_sla_high_compliance_percent:
        dashboardData.slaCompliance.high.complianceRate,
      queue_sla_normal_compliance_percent:
        dashboardData.slaCompliance.normal.complianceRate,
    }

    if (format === 'prometheus') {
      return {
        format: 'prometheus',
        data: Object.entries(metrics)
          .map(([key, value]) => `${key} ${value}`)
          .join('\n'),
        timestamp: dashboardData.timestamp,
      }
    }

    if (format === 'csv') {
      const headers = Object.keys(metrics).join(',')
      const values = Object.values(metrics).join(',')
      return {
        format: 'csv',
        data: `${headers}\n${values}`,
        timestamp: dashboardData.timestamp,
      }
    }

    // Default JSON format
    return {
      format: 'json',
      data: metrics,
      timestamp: dashboardData.timestamp,
    }
  },
})

/**
 * Store queue metrics snapshot for historical analysis
 */
export const recordMetricsSnapshot = internalMutation({
  handler: async (ctx): Promise<unknown> => {
    const dashboard: unknown = await ctx.runQuery(
      internal.scheduler.queue_metrics.getQueueDashboard,
      {}
    )
    const health: unknown = await ctx.runQuery(
      internal.scheduler.queue_metrics.getQueueHealth,
      {}
    )

    const dashboardData = dashboard as any
    const healthData = health as any

    // Store snapshot in a metrics table (would need to be added to schema)
    // For now, return the snapshot data that could be stored
    return {
      snapshot: {
        timestamp: dashboardData.timestamp,
        queueMetrics: {
          totalQueued: dashboardData.totalQueued,
          capacityUtilization: dashboardData.capacityUtilization,
          averageWaitTime: dashboardData.averageWaitTime,
          maxWaitTime: dashboardData.maxWaitTime,
          priorityBreakdown: dashboardData.priorityBreakdown,
        },
        performance: dashboardData.performance24h,
        health: {
          status: healthData.status,
          score: healthData.score,
          alertCount: healthData.alerts.length,
          slaViolations: healthData.slaViolations.length,
        },
      },
      stored: false, // Would be true if we had metrics storage table
      message:
        'Metrics snapshot generated (storage table needed for persistence)',
    }
  },
})

// Helper functions

function calculateSlaCompliance(
  items: any[],
  priority: 'urgent' | 'high' | 'normal'
) {
  if (items.length === 0) {
    return { complianceRate: 100, violationCount: 0, averageTime: 0 }
  }

  const slaTarget = PRIORITY_CRITERIA[priority].slaTarget
  const completedItems = items.filter(
    item => item.status === 'completed' || item.status === 'failed'
  )

  if (completedItems.length === 0) {
    return { complianceRate: 100, violationCount: 0, averageTime: 0 }
  }

  const compliantItems = completedItems.filter(item => {
    const totalTime = item.totalProcessingTime || 0
    return totalTime <= slaTarget
  })

  const complianceRate = (compliantItems.length / completedItems.length) * 100
  const violationCount = completedItems.length - compliantItems.length
  const averageTime =
    completedItems.reduce(
      (sum, item) => sum + (item.totalProcessingTime || 0),
      0
    ) / completedItems.length

  return {
    complianceRate: Math.round(complianceRate * 100) / 100,
    violationCount,
    averageTime: Math.round(averageTime),
  }
}

function determineQueueHealth(
  capacityUtilization: number,
  averageWaitTime: number,
  successRate: number
) {
  let score = 100
  let status = 'healthy'

  // Capacity impact
  if (capacityUtilization > 95) {
    score -= 40
    status = 'critical'
  } else if (capacityUtilization > 80) {
    score -= 20
    status = 'warning'
  } else if (capacityUtilization > 50) {
    score -= 10
  }

  // Wait time impact
  if (averageWaitTime > QUEUE_CONFIG.CRITICAL_WAIT_TIME_THRESHOLD) {
    score -= 30
    status = status === 'healthy' ? 'critical' : status
  } else if (averageWaitTime > QUEUE_CONFIG.HIGH_WAIT_TIME_THRESHOLD) {
    score -= 15
    status = status === 'healthy' ? 'warning' : status
  }

  // Success rate impact
  if (successRate < 90) {
    score -= 25
    status = 'critical'
  } else if (successRate < 95) {
    score -= 10
    status = status === 'healthy' ? 'warning' : status
  }

  return { status, score: Math.max(0, score) }
}

function generateQueueAlerts(
  capacityUtilization: number,
  averageWaitTime: number,
  successRate: number,
  maxWaitTime: number
) {
  const alerts = []

  if (capacityUtilization > 95) {
    alerts.push({
      severity: 'critical',
      type: 'capacity',
      message: `Queue at ${Math.round(capacityUtilization)}% capacity - immediate action required`,
      threshold: 95,
      current: capacityUtilization,
    })
  } else if (capacityUtilization > 80) {
    alerts.push({
      severity: 'warning',
      type: 'capacity',
      message: `Queue approaching capacity at ${Math.round(capacityUtilization)}%`,
      threshold: 80,
      current: capacityUtilization,
    })
  }

  if (averageWaitTime > QUEUE_CONFIG.CRITICAL_WAIT_TIME_THRESHOLD) {
    alerts.push({
      severity: 'critical',
      type: 'wait_time',
      message: `Average wait time ${Math.round(averageWaitTime / 1000)}s exceeds critical threshold`,
      threshold: QUEUE_CONFIG.CRITICAL_WAIT_TIME_THRESHOLD,
      current: averageWaitTime,
    })
  } else if (averageWaitTime > QUEUE_CONFIG.HIGH_WAIT_TIME_THRESHOLD) {
    alerts.push({
      severity: 'warning',
      type: 'wait_time',
      message: `Average wait time ${Math.round(averageWaitTime / 1000)}s exceeds normal threshold`,
      threshold: QUEUE_CONFIG.HIGH_WAIT_TIME_THRESHOLD,
      current: averageWaitTime,
    })
  }

  if (successRate < 90) {
    alerts.push({
      severity: 'critical',
      type: 'success_rate',
      message: `Success rate ${Math.round(successRate)}% below critical threshold`,
      threshold: 90,
      current: successRate,
    })
  } else if (successRate < 95) {
    alerts.push({
      severity: 'warning',
      type: 'success_rate',
      message: `Success rate ${Math.round(successRate)}% below optimal threshold`,
      threshold: 95,
      current: successRate,
    })
  }

  if (maxWaitTime > 10 * 60 * 1000) {
    // 10 minutes
    alerts.push({
      severity: 'warning',
      type: 'max_wait_time',
      message: `Some items waiting over ${Math.round(maxWaitTime / 60000)} minutes`,
      threshold: 600000,
      current: maxWaitTime,
    })
  }

  return alerts
}

function findSlaViolations(queueItems: any[]) {
  const violations = []
  const now = Date.now()

  for (const item of queueItems) {
    const priority = item.priority || 'normal'
    const slaTarget = (PRIORITY_CRITERIA as any)[priority]?.slaTarget || 300000
    const currentWaitTime = now - (item.queuedAt || item.createdAt)

    if (currentWaitTime > slaTarget) {
      violations.push({
        analysisId: item._id,
        priority,
        currentWaitTime,
        slaTarget,
        violation: currentWaitTime - slaTarget,
        userId: item.userId,
        entryId: item.entryId,
      })
    }
  }

  return violations
}

function generateRecommendations(
  capacityUtilization: number,
  averageWaitTime: number,
  successRate: number,
  slaViolationCount: number
) {
  const recommendations = []

  if (capacityUtilization > 80) {
    recommendations.push({
      type: 'capacity',
      priority: capacityUtilization > 95 ? 'critical' : 'high',
      action: 'Increase processing capacity or implement queue throttling',
      impact: 'Reduce wait times and prevent queue overflow',
    })
  }

  if (averageWaitTime > QUEUE_CONFIG.HIGH_WAIT_TIME_THRESHOLD) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      action:
        'Optimize processing algorithms or increase concurrent processing limit',
      impact: 'Improve user experience and SLA compliance',
    })
  }

  if (successRate < 95) {
    recommendations.push({
      type: 'reliability',
      priority: 'critical',
      action: 'Investigate and fix processing errors, improve error handling',
      impact: 'Increase system reliability and reduce failed analyses',
    })
  }

  if (slaViolationCount > 0) {
    recommendations.push({
      type: 'sla',
      priority: 'high',
      action: 'Review priority assessment logic and consider capacity scaling',
      impact: 'Meet service level agreements and improve user satisfaction',
    })
  }

  return recommendations
}

function calculateTimeStats(times: number[]) {
  if (times.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, p95: 0, p99: 0 }
  }

  const sorted = times.sort((a, b) => a - b)
  const sum = times.reduce((a, b) => a + b, 0)

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: Math.round(sum / times.length),
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }
}

function analyzePerformanceByPriority(items: any[]) {
  const completed = items.filter(item => item.status === 'completed')
  const failed = items.filter(item => item.status === 'failed')
  const processing = items.filter(item => item.status === 'processing')

  const total = items.length
  const successRate =
    total > 0
      ? (completed.length / (completed.length + failed.length)) * 100
      : 100

  const processingTimes = completed
    .filter(item => item.processingTime)
    .map(item => item.processingTime!)

  return {
    total,
    completed: completed.length,
    failed: failed.length,
    processing: processing.length,
    successRate: Math.round(successRate * 100) / 100,
    averageProcessingTime:
      processingTimes.length > 0
        ? Math.round(
            processingTimes.reduce((sum, time) => sum + time, 0) /
              processingTimes.length
          )
        : 0,
  }
}

function analyzeErrors(failedItems: any[]) {
  const errorCounts = failedItems.reduce(
    (acc, item) => {
      const errorType = categorizeError(
        item.lastErrorMessage || 'Unknown error'
      )
      acc[errorType] = (acc[errorType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topErrors = Object.entries(errorCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }))

  return {
    totalErrors: failedItems.length,
    errorBreakdown: errorCounts,
    topErrors,
  }
}

function categorizeError(errorMessage: string): string {
  const message = errorMessage.toLowerCase()

  if (message.includes('timeout') || message.includes('timed out'))
    return 'timeout'
  if (message.includes('network') || message.includes('connection'))
    return 'network'
  if (message.includes('rate limit') || message.includes('quota'))
    return 'rate_limit'
  if (message.includes('auth') || message.includes('unauthorized'))
    return 'authentication'
  if (message.includes('api') || message.includes('gemini')) return 'api_error'
  if (message.includes('cancel') || message.includes('cancelled'))
    return 'cancelled'
  if (message.includes('validation') || message.includes('invalid'))
    return 'validation'
  if (message.includes('expired') || message.includes('maximum age'))
    return 'expired'

  return 'other'
}

function generateThroughputTimeline(items: any[], timeRangeHours: number) {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  const timeline = []

  for (let i = timeRangeHours - 1; i >= 0; i--) {
    const hourStart = now - (i + 1) * hourMs
    const hourEnd = now - i * hourMs

    const hourItems = items.filter(
      item => item.createdAt >= hourStart && item.createdAt < hourEnd
    )

    const completed = hourItems.filter(
      item => item.status === 'completed'
    ).length
    const failed = hourItems.filter(item => item.status === 'failed').length

    timeline.push({
      hour: new Date(hourStart).toISOString().slice(0, 13) + ':00:00Z',
      total: hourItems.length,
      completed,
      failed,
      successRate:
        hourItems.length > 0 ? (completed / (completed + failed)) * 100 : 100,
    })
  }

  return timeline
}

function generateUserBreakdown(items: any[]) {
  const userStats = items.reduce(
    (acc, item) => {
      const userId = item.userId
      if (!acc[userId]) {
        acc[userId] = { total: 0, completed: 0, failed: 0, processing: 0 }
      }

      acc[userId].total++
      acc[userId][item.status]++

      return acc
    },
    {} as Record<string, any>
  )

  return Object.entries(userStats)
    .map(([userId, stats]) => ({
      userId,
      ...(stats as any),
      successRate:
        (stats as any).total > 0
          ? ((stats as any).completed /
              ((stats as any).completed + (stats as any).failed)) *
            100
          : 100,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20) // Top 20 users
}
