/**
 * Database performance monitoring and optimization utilities
 * Story: AI-Migration.5 - Enhanced Database Schema (INDEX-002)
 */

import { mutation, query } from '../_generated/server'
import { v } from 'convex/values'
import { ConvexError } from 'convex/values'

/**
 * Performance monitoring configuration
 */
const PERFORMANCE_CONFIG = {
  // Query performance thresholds (milliseconds)
  SLOW_QUERY_THRESHOLD: 200,
  VERY_SLOW_QUERY_THRESHOLD: 1000,

  // Index usage thresholds
  MIN_INDEX_USAGE_PERCENT: 95,

  // Batch sizes for performance operations
  ANALYSIS_BATCH_SIZE: 1000,

  // Time windows for analysis
  PERFORMANCE_WINDOW_HOURS: 24,
} as const

/**
 * Records query performance metrics
 */
export const recordQueryPerformance = mutation({
  args: {
    tableName: v.string(),
    indexName: v.optional(v.string()),
    queryType: v.union(
      v.literal('select'),
      v.literal('filter'),
      v.literal('aggregate')
    ),
    executionTimeMs: v.number(),
    recordsScanned: v.number(),
    recordsReturned: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      const timestamp = Date.now()
      const timeWindow =
        Math.floor(timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000) // Hour window

      // Record performance metric
      await ctx.db.insert('performanceMetrics', {
        metricType: 'response_time',
        service: `database_${args.tableName}`,
        value: args.executionTimeMs,
        unit: 'milliseconds',
        timestamp,
        timeWindow,
        tags: [args.tableName, args.indexName || 'no_index', args.queryType],
        metadata: {
          indexUsed: args.indexName || null,
          recordsScanned: args.recordsScanned,
          recordsReturned: args.recordsReturned,
          efficiency:
            args.recordsScanned > 0
              ? args.recordsReturned / args.recordsScanned
              : 1,
          ...args.metadata,
        },
      })

      // Log slow queries
      if (args.executionTimeMs > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
        await ctx.db.insert('systemLogs', {
          level:
            args.executionTimeMs > PERFORMANCE_CONFIG.VERY_SLOW_QUERY_THRESHOLD
              ? 'warn'
              : 'info',
          message: `Slow query detected on ${args.tableName}: ${args.executionTimeMs}ms`,
          service: 'database_monitor',
          timestamp,
          metadata: {
            tableName: args.tableName,
            indexName: args.indexName,
            executionTime: args.executionTimeMs,
            recordsScanned: args.recordsScanned,
            recordsReturned: args.recordsReturned,
            queryType: args.queryType,
          },
        })
      }
    } catch (error) {
      console.error('Failed to record query performance:', error)
      // Don't throw - performance monitoring shouldn't break queries
    }
  },
})

/**
 * Analyzes index usage patterns
 */
export const analyzeIndexUsage = query({
  args: {
    tableName: v.optional(v.string()),
    timeWindowHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeWindowHours =
      args.timeWindowHours || PERFORMANCE_CONFIG.PERFORMANCE_WINDOW_HOURS
    const cutoffTime = Date.now() - timeWindowHours * 60 * 60 * 1000

    try {
      // Get performance metrics for database queries
      let metricsQuery = ctx.db
        .query('performanceMetrics')
        .withIndex('by_type_timestamp', q =>
          q.eq('metricType', 'response_time').gte('timestamp', cutoffTime)
        )

      const metrics = await metricsQuery.collect()

      // Filter by table if specified
      const filteredMetrics = args.tableName
        ? metrics.filter(m => m.service === `database_${args.tableName}`)
        : metrics

      // Analyze index usage
      const indexStats = new Map<
        string,
        {
          tableName: string
          indexName: string
          queryCount: number
          totalTime: number
          avgTime: number
          recordsScanned: number
          recordsReturned: number
          efficiency: number
        }
      >()

      for (const metric of filteredMetrics) {
        if (!metric.tags || metric.tags.length < 2) continue

        const tableName = metric.tags[0]
        const indexName = metric.tags[1]
        const key = `${tableName}:${indexName}`

        const existing = indexStats.get(key) || {
          tableName,
          indexName,
          queryCount: 0,
          totalTime: 0,
          avgTime: 0,
          recordsScanned: 0,
          recordsReturned: 0,
          efficiency: 0,
        }

        existing.queryCount++
        existing.totalTime += metric.value
        existing.avgTime = existing.totalTime / existing.queryCount

        if (metric.metadata?.recordsScanned) {
          existing.recordsScanned += metric.metadata.recordsScanned
        }
        if (metric.metadata?.recordsReturned) {
          existing.recordsReturned += metric.metadata.recordsReturned
        }

        existing.efficiency =
          existing.recordsScanned > 0
            ? existing.recordsReturned / existing.recordsScanned
            : 1

        indexStats.set(key, existing)
      }

      // Convert to array and add recommendations
      const results = Array.from(indexStats.values()).map(stat => ({
        ...stat,
        isEfficient:
          stat.efficiency >= PERFORMANCE_CONFIG.MIN_INDEX_USAGE_PERCENT / 100,
        isPerformant: stat.avgTime <= PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD,
        recommendations: generateIndexRecommendations(stat),
      }))

      return {
        timeWindowHours,
        totalQueries: filteredMetrics.length,
        indexStats: results.sort((a, b) => b.queryCount - a.queryCount),
        summary: {
          efficientIndexes: results.filter(r => r.isEfficient).length,
          inefficientIndexes: results.filter(r => !r.isEfficient).length,
          slowIndexes: results.filter(r => !r.isPerformant).length,
          avgQueryTime:
            filteredMetrics.length > 0
              ? filteredMetrics.reduce((sum, m) => sum + m.value, 0) /
                filteredMetrics.length
              : 0,
        },
      }
    } catch (error) {
      throw new ConvexError(`Index analysis failed: ${error}`)
    }
  },
})

/**
 * Generates optimization recommendations
 */
export const generateOptimizationRecommendations = query({
  args: {
    tableName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Get index usage analysis
      // @ts-ignore - convex-test library type definition limitation for ctx.runQuery
      const indexAnalysis = await ctx.runQuery(analyzeIndexUsage, {
        tableName: args.tableName,
        timeWindowHours: PERFORMANCE_CONFIG.PERFORMANCE_WINDOW_HOURS,
      })

      const recommendations: Array<{
        type: 'performance' | 'efficiency' | 'cost'
        priority: 'high' | 'medium' | 'low'
        table: string
        index: string
        issue: string
        recommendation: string
        impact: string
      }> = []

      // Analyze each index
      for (const stat of indexAnalysis.indexStats) {
        // Slow query recommendations
        if (!stat.isPerformant) {
          recommendations.push({
            type: 'performance',
            priority:
              stat.avgTime > PERFORMANCE_CONFIG.VERY_SLOW_QUERY_THRESHOLD
                ? 'high'
                : 'medium',
            table: stat.tableName,
            index: stat.indexName,
            issue: `Slow queries (avg ${Math.round(stat.avgTime)}ms)`,
            recommendation:
              stat.indexName === 'no_index'
                ? 'Add appropriate index for common query patterns'
                : 'Review query patterns and consider compound indexes',
            impact: `Could improve ${stat.queryCount} queries per day`,
          })
        }

        // Efficiency recommendations
        if (!stat.isEfficient) {
          recommendations.push({
            type: 'efficiency',
            priority: 'medium',
            table: stat.tableName,
            index: stat.indexName,
            issue: `Low index efficiency (${Math.round(stat.efficiency * 100)}%)`,
            recommendation: 'Review query patterns and filter conditions',
            impact: `Scanning ${Math.round(stat.recordsScanned / stat.queryCount)} records per query`,
          })
        }

        // Unused index detection (very few queries)
        if (stat.queryCount < 10 && stat.indexName !== 'no_index') {
          recommendations.push({
            type: 'cost',
            priority: 'low',
            table: stat.tableName,
            index: stat.indexName,
            issue: `Rarely used index (${stat.queryCount} queries)`,
            recommendation:
              'Consider removing if not needed for specific operations',
            impact: 'Reduces storage overhead and write performance impact',
          })
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      recommendations.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      )

      return {
        tableName: args.tableName,
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        mediumPriority: recommendations.filter(r => r.priority === 'medium')
          .length,
        lowPriority: recommendations.filter(r => r.priority === 'low').length,
        recommendations,
      }
    } catch (error) {
      throw new ConvexError(`Optimization analysis failed: ${error}`)
    }
  },
})

/**
 * Helper function to generate specific index recommendations
 */
function generateIndexRecommendations(stat: {
  tableName: string
  indexName: string
  queryCount: number
  avgTime: number
  efficiency: number
}): string[] {
  const recommendations: string[] = []

  if (stat.indexName === 'no_index') {
    recommendations.push(
      'Add index for this query pattern to improve performance'
    )
  }

  if (stat.avgTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
    recommendations.push('Consider compound indexes for complex query patterns')
    recommendations.push('Review filter conditions for index optimization')
  }

  if (stat.efficiency < 0.5) {
    recommendations.push(
      'Query is scanning too many records - review filter selectivity'
    )
  }

  if (stat.queryCount > 1000) {
    recommendations.push('High-frequency query - ensure optimal indexing')
  }

  return recommendations
}

/**
 * Database health check
 */
export const performDatabaseHealthCheck = query({
  args: {},
  handler: async ctx => {
    try {
      const now = Date.now()
      const last24Hours = now - 24 * 60 * 60 * 1000

      // Get recent performance metrics
      const recentMetrics = await ctx.db
        .query('performanceMetrics')
        .filter(q => q.gte(q.field('timestamp'), last24Hours))
        .collect()

      // Get recent errors
      const recentErrors = await ctx.db
        .query('systemLogs')
        .withIndex('by_level_timestamp', q =>
          q.eq('level', 'error').gte('timestamp', last24Hours)
        )
        .collect()

      // Calculate health metrics
      const avgResponseTime =
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.value, 0) /
            recentMetrics.length
          : 0

      const errorRate = recentErrors.length / Math.max(recentMetrics.length, 1)

      // Determine health status
      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
      const issues: string[] = []

      if (avgResponseTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
        healthStatus = 'warning'
        issues.push(
          `Average response time is high: ${Math.round(avgResponseTime)}ms`
        )
      }

      if (errorRate > 0.05) {
        // 5% error rate
        healthStatus = 'critical'
        issues.push(`High error rate: ${Math.round(errorRate * 100)}%`)
      }

      if (recentMetrics.length === 0) {
        healthStatus = 'warning'
        issues.push('No recent performance data available')
      }

      return {
        status: healthStatus,
        timestamp: now,
        metrics: {
          avgResponseTime: Math.round(avgResponseTime),
          totalQueries: recentMetrics.length,
          errorCount: recentErrors.length,
          errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
        },
        issues,
        recommendations:
          issues.length > 0
            ? [
                'Review recent performance metrics',
                'Check for slow queries',
                'Monitor error logs',
              ]
            : ['Database is performing well'],
      }
    } catch (error) {
      return {
        status: 'critical' as const,
        timestamp: Date.now(),
        metrics: {
          avgResponseTime: 0,
          totalQueries: 0,
          errorCount: 0,
          errorRate: 0,
        },
        issues: [`Health check failed: ${error}`],
        recommendations: [
          'Investigate health check failure',
          'Check database connectivity',
        ],
      }
    }
  },
})
