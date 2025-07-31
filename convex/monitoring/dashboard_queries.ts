/**
 * Dashboard Data Aggregation Functions (Story AI-Migration.6)
 * Provides real-time data for monitoring and observability dashboards
 */

import { query } from '../_generated/server'
import { v } from 'convex/values'

/**
 * Get comprehensive system health metrics for main dashboard
 */
export const getSystemHealthMetrics = query({
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
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const windowMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeWindow]

    const startTime = Date.now() - windowMs
    const now = Date.now()

    // Get all AI analyses for the time window
    const analyses = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Calculate success rate
    const totalAnalyses = analyses.length
    const successfulAnalyses = analyses.filter(
      a => a.status === 'completed'
    ).length
    const successRate =
      totalAnalyses > 0 ? successfulAnalyses / totalAnalyses : 1.0

    // Calculate average processing time
    const completedAnalyses = analyses.filter(
      a => a.status === 'completed' && a.processingTime
    )
    const avgProcessingTime =
      completedAnalyses.length > 0
        ? completedAnalyses.reduce(
            (sum, a) => sum + (a.processingTime || 0),
            0
          ) / completedAnalyses.length
        : 0

    // Calculate total cost
    const totalCost = analyses.reduce((sum, a) => sum + (a.apiCost || 0), 0)

    // Get error rate from recent analyses
    const failedAnalyses = analyses.filter(a => a.status === 'failed').length
    const errorRate = totalAnalyses > 0 ? failedAnalyses / totalAnalyses : 0

    // Get circuit breaker statuses
    const circuitBreakerStatuses = await ctx.db
      .query('circuitBreakerStatus')
      .collect()

    const healthyCircuits = circuitBreakerStatuses.filter(
      cb => !cb.isOpen
    ).length
    const totalCircuits = circuitBreakerStatuses.length

    // Get active alerts
    const activeAlerts = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .collect()

    const criticalActiveAlerts = activeAlerts.filter(
      a => a.severity === 'emergency' || a.severity === 'critical'
    ).length

    // Calculate overall health score
    let healthScore = 100
    healthScore -= (1 - successRate) * 50 // Success rate impact
    healthScore -= errorRate * 30 // Error rate impact
    healthScore -= criticalActiveAlerts * 10 // Critical alerts impact
    healthScore -=
      Math.max(0, (totalCircuits - healthyCircuits) / totalCircuits) * 20 // Circuit breaker impact
    healthScore = Math.max(0, Math.min(100, healthScore))

    // Get queue metrics (if available)
    const queueMetrics = await getQueueHealthMetrics(ctx, startTime)

    return {
      timeWindow,
      period: { start: startTime, end: now },
      overview: {
        healthScore: Math.round(healthScore),
        status:
          healthScore >= 90
            ? 'excellent'
            : healthScore >= 75
              ? 'good'
              : healthScore >= 50
                ? 'fair'
                : 'poor',
        totalAnalyses,
        successRate: Math.round(successRate * 1000) / 10, // One decimal place
        avgProcessingTime: Math.round(avgProcessingTime),
        totalCost: Math.round(totalCost * 100) / 100, // Two decimal places
        errorRate: Math.round(errorRate * 1000) / 10,
      },
      serviceHealth: {
        circuitBreakers: {
          healthy: healthyCircuits,
          total: totalCircuits,
          status:
            healthyCircuits === totalCircuits
              ? 'all_healthy'
              : healthyCircuits >= Math.ceil(totalCircuits * 0.8)
                ? 'mostly_healthy'
                : 'degraded',
        },
        activeAlerts: {
          total: activeAlerts.length,
          critical: criticalActiveAlerts,
          bySeverity: {
            emergency: activeAlerts.filter(a => a.severity === 'emergency')
              .length,
            critical: activeAlerts.filter(a => a.severity === 'critical')
              .length,
            warning: activeAlerts.filter(a => a.severity === 'warning').length,
          },
        },
      },
      performance: {
        throughput: Math.round(totalAnalyses / (windowMs / (60 * 60 * 1000))), // Analyses per hour
        averageLatency: avgProcessingTime,
        p95Latency: calculatePercentile(
          completedAnalyses.map(a => a.processingTime || 0),
          95
        ),
        queue: queueMetrics,
      },
      trends: {
        successRate: await calculateSuccessRateTrend(ctx, timeWindow),
        cost: await calculateCostTrend(ctx, timeWindow),
        throughput: await calculateThroughputTrend(ctx, timeWindow),
      },
    }
  },
})

/**
 * Get detailed service comparison metrics
 */
export const getServiceComparisonMetrics = query({
  args: {
    timeWindow: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const windowMs =
      {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }[timeWindow] || 24 * 60 * 60 * 1000

    const startTime = Date.now() - windowMs

    // Get analyses for comparison
    let analysesQuery = ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))

    const analyses = await analysesQuery.collect()

    // Group by service
    const serviceStats = new Map<
      string,
      {
        total: number
        successful: number
        failed: number
        totalCost: number
        totalProcessingTime: number
        fallbackUsage: number
      }
    >()

    for (const analysis of analyses) {
      const service = analysis.modelType || 'unknown'

      // Filter by requested services if specified
      if (args.services && !args.services.includes(service)) {
        continue
      }

      const stats = serviceStats.get(service) || {
        total: 0,
        successful: 0,
        failed: 0,
        totalCost: 0,
        totalProcessingTime: 0,
        fallbackUsage: 0,
      }

      stats.total += 1
      if (analysis.status === 'completed') {
        stats.successful += 1
      } else if (analysis.status === 'failed') {
        stats.failed += 1
      }

      stats.totalCost += analysis.apiCost || 0
      stats.totalProcessingTime += analysis.processingTime || 0

      if (analysis.fallbackUsed) {
        stats.fallbackUsage += 1
      }

      serviceStats.set(service, stats)
    }

    // Convert to comparison format
    const comparison = Array.from(serviceStats.entries()).map(
      ([service, stats]) => ({
        service,
        metrics: {
          totalRequests: stats.total,
          successRate: stats.total > 0 ? stats.successful / stats.total : 0,
          failureRate: stats.total > 0 ? stats.failed / stats.total : 0,
          avgProcessingTime:
            stats.successful > 0
              ? stats.totalProcessingTime / stats.successful
              : 0,
          totalCost: stats.totalCost,
          avgCostPerRequest:
            stats.total > 0 ? stats.totalCost / stats.total : 0,
          fallbackRate: stats.total > 0 ? stats.fallbackUsage / stats.total : 0,
        },
        health: {
          status:
            stats.total > 0 && stats.successful / stats.total >= 0.95
              ? 'excellent'
              : stats.total > 0 && stats.successful / stats.total >= 0.9
                ? 'good'
                : stats.total > 0 && stats.successful / stats.total >= 0.75
                  ? 'fair'
                  : 'poor',
          reliability:
            stats.total > 0
              ? stats.successful / stats.total >= 0.95
                ? 'high'
                : stats.successful / stats.total >= 0.85
                  ? 'medium'
                  : 'low'
              : 'unknown',
        },
      })
    )

    // Sort by success rate descending
    comparison.sort((a, b) => b.metrics.successRate - a.metrics.successRate)

    return {
      timeWindow,
      services: comparison,
      summary: {
        totalServices: comparison.length,
        bestPerforming: comparison[0]?.service || 'none',
        worstPerforming: comparison[comparison.length - 1]?.service || 'none',
        averageSuccessRate:
          comparison.length > 0
            ? comparison.reduce((sum, s) => sum + s.metrics.successRate, 0) /
              comparison.length
            : 0,
        totalCost: comparison.reduce((sum, s) => sum + s.metrics.totalCost, 0),
        totalRequests: comparison.reduce(
          (sum, s) => sum + s.metrics.totalRequests,
          0
        ),
      },
    }
  },
})

/**
 * Get real-time chart data for dashboard visualizations
 */
export const getChartData = query({
  args: {
    chartType: v.union(
      v.literal('success_rate'),
      v.literal('processing_time'),
      v.literal('cost'),
      v.literal('throughput'),
      v.literal('error_rate')
    ),
    timeWindow: v.optional(v.string()),
    granularity: v.optional(
      v.union(v.literal('minute'), v.literal('hour'), v.literal('day'))
    ),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const granularity = args.granularity || 'hour'

    const windowMs =
      {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }[timeWindow] || 24 * 60 * 60 * 1000

    const bucketSize = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    }[granularity]

    const startTime = Date.now() - windowMs
    const now = Date.now()

    // Get analyses for the time window
    const analyses = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Create time buckets
    const buckets = new Map<
      number,
      {
        total: number
        successful: number
        failed: number
        totalProcessingTime: number
        totalCost: number
      }
    >()

    // Initialize buckets
    for (let time = startTime; time < now; time += bucketSize) {
      const bucketKey = Math.floor(time / bucketSize)
      buckets.set(bucketKey, {
        total: 0,
        successful: 0,
        failed: 0,
        totalProcessingTime: 0,
        totalCost: 0,
      })
    }

    // Fill buckets with data
    for (const analysis of analyses) {
      const bucketKey = Math.floor(analysis.createdAt / bucketSize)
      const bucket = buckets.get(bucketKey)

      if (bucket) {
        bucket.total += 1
        if (analysis.status === 'completed') {
          bucket.successful += 1
        } else if (analysis.status === 'failed') {
          bucket.failed += 1
        }
        bucket.totalProcessingTime += analysis.processingTime || 0
        bucket.totalCost += analysis.apiCost || 0
      }
    }

    // Convert to chart data points
    const dataPoints = Array.from(buckets.entries())
      .map(([bucketKey, data]) => {
        const timestamp = bucketKey * bucketSize

        let value: number
        switch (args.chartType) {
          case 'success_rate':
            value = data.total > 0 ? (data.successful / data.total) * 100 : 100
            break
          case 'processing_time':
            value =
              data.successful > 0
                ? data.totalProcessingTime / data.successful
                : 0
            break
          case 'cost':
            value = data.totalCost
            break
          case 'throughput':
            value = data.total
            break
          case 'error_rate':
            value = data.total > 0 ? (data.failed / data.total) * 100 : 0
            break
          default:
            value = 0
        }

        return {
          timestamp,
          value: Math.round(value * 100) / 100, // Round to 2 decimal places
          rawData: data,
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp)

    return {
      chartType: args.chartType,
      timeWindow,
      granularity,
      dataPoints,
      summary: {
        current: dataPoints[dataPoints.length - 1]?.value || 0,
        average:
          dataPoints.length > 0
            ? dataPoints.reduce((sum, d) => sum + d.value, 0) /
              dataPoints.length
            : 0,
        min: Math.min(...dataPoints.map(d => d.value), 0),
        max: Math.max(...dataPoints.map(d => d.value), 0),
        trend: calculateSimpleTrend(dataPoints.map(d => d.value)),
      },
    }
  },
})

// Helper functions

async function getQueueHealthMetrics(ctx: any, startTime: number) {
  // This would integrate with the queue system from previous stories
  // For now, return placeholder data
  return {
    avgWaitTime: 2500, // milliseconds
    currentQueueSize: 0,
    throughput: 45, // requests per minute
    status: 'healthy' as const,
  }
}

async function calculateSuccessRateTrend(ctx: any, timeWindow: string) {
  // Get current and previous period success rates
  const windowMs =
    {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeWindow] || 24 * 60 * 60 * 1000

  const now = Date.now()
  const currentStart = now - windowMs
  const previousStart = now - 2 * windowMs

  const [currentAnalyses, previousAnalyses] = await Promise.all([
    ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), currentStart))
      .collect(),
    ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), previousStart))
      .filter((q: any) => q.lt(q.field('createdAt'), currentStart))
      .collect(),
  ])

  const currentSuccessRate =
    currentAnalyses.length > 0
      ? currentAnalyses.filter((a: any) => a.status === 'completed').length /
        currentAnalyses.length
      : 1.0

  const previousSuccessRate =
    previousAnalyses.length > 0
      ? previousAnalyses.filter((a: any) => a.status === 'completed').length /
        previousAnalyses.length
      : 1.0

  const change = currentSuccessRate - previousSuccessRate
  const percentChange =
    previousSuccessRate > 0 ? (change / previousSuccessRate) * 100 : 0

  return {
    current: currentSuccessRate,
    previous: previousSuccessRate,
    change,
    percentChange,
    direction: change > 0.01 ? 'up' : change < -0.01 ? 'down' : 'stable',
  }
}

async function calculateCostTrend(ctx: any, timeWindow: string) {
  const windowMs =
    {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeWindow] || 24 * 60 * 60 * 1000

  const now = Date.now()
  const currentStart = now - windowMs
  const previousStart = now - 2 * windowMs

  const [currentAnalyses, previousAnalyses] = await Promise.all([
    ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), currentStart))
      .collect(),
    ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), previousStart))
      .filter((q: any) => q.lt(q.field('createdAt'), currentStart))
      .collect(),
  ])

  const currentCost = currentAnalyses.reduce(
    (sum: number, a: any) => sum + (a.apiCost || 0),
    0
  )
  const previousCost = previousAnalyses.reduce(
    (sum: number, a: any) => sum + (a.apiCost || 0),
    0
  )

  const change = currentCost - previousCost
  const percentChange = previousCost > 0 ? (change / previousCost) * 100 : 0

  return {
    current: currentCost,
    previous: previousCost,
    change,
    percentChange,
    direction: change > 0.01 ? 'up' : change < -0.01 ? 'down' : 'stable',
  }
}

async function calculateThroughputTrend(ctx: any, timeWindow: string) {
  const windowMs =
    {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeWindow] || 24 * 60 * 60 * 1000

  const now = Date.now()
  const currentStart = now - windowMs
  const previousStart = now - 2 * windowMs

  const [currentAnalyses, previousAnalyses] = await Promise.all([
    ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), currentStart))
      .collect(),
    ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), previousStart))
      .filter((q: any) => q.lt(q.field('createdAt'), currentStart))
      .collect(),
  ])

  const currentThroughput =
    currentAnalyses.length / (windowMs / (60 * 60 * 1000)) // per hour
  const previousThroughput =
    previousAnalyses.length / (windowMs / (60 * 60 * 1000))

  const change = currentThroughput - previousThroughput
  const percentChange =
    previousThroughput > 0 ? (change / previousThroughput) * 100 : 0

  return {
    current: currentThroughput,
    previous: previousThroughput,
    change,
    percentChange,
    direction: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable',
  }
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0

  const sorted = values.filter(v => v > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return 0

  const index = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) {
    return sorted[lower]
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function calculateSimpleTrend(values: number[]) {
  if (values.length < 2) return 'stable'

  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length
  const secondAvg =
    secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length

  const change = secondAvg - firstAvg
  const changePercent = firstAvg > 0 ? Math.abs(change / firstAvg) : 0

  if (changePercent < 0.05) return 'stable' // Less than 5% change
  return change > 0 ? 'up' : 'down'
}
