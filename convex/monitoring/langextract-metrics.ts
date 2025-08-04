/**
 * LangExtract Performance Monitoring and Metrics Collection
 * Story LangExtract-3: Integration Testing & Production Readiness
 */

import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

// Metrics collection for LangExtract performance
export const recordLangExtractMetrics = mutation({
  args: {
    userId: v.id('users'),
    entryId: v.id('journalEntries'),
    processingTimeMs: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    extractedEntitiesCount: v.number(),
    structuredDataSize: v.object({
      emotions: v.number(),
      themes: v.number(),
      triggers: v.number(),
      communication: v.number(),
      relationships: v.number(),
    }),
    langExtractVersion: v.optional(v.string()),
    fallbackUsed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert('langExtractMetrics', {
      userId: args.userId,
      entryId: args.entryId,
      processingTimeMs: args.processingTimeMs,
      success: args.success,
      errorMessage: args.errorMessage,
      extractedEntitiesCount: args.extractedEntitiesCount,
      structuredDataSize: args.structuredDataSize,
      langExtractVersion: args.langExtractVersion || 'unknown',
      fallbackUsed: args.fallbackUsed,
      createdAt: now,
    })

    // Also update aggregate metrics
    await updateAggregateMetrics(ctx, args, now)
  },
})

async function updateAggregateMetrics(ctx: any, args: any, timestamp: number) {
  const hourlyKey = Math.floor(timestamp / (60 * 60 * 1000)) // Hour buckets

  const existing = await ctx.db
    .query('langExtractAggregateMetrics')
    .withIndex('by_hour', (q: any) => q.eq('hourBucket', hourlyKey))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalRequests: existing.totalRequests + 1,
      successfulRequests: existing.successfulRequests + (args.success ? 1 : 0),
      failedRequests: existing.failedRequests + (args.success ? 0 : 1),
      totalProcessingTime: existing.totalProcessingTime + args.processingTimeMs,
      averageProcessingTime:
        (existing.totalProcessingTime + args.processingTimeMs) /
        (existing.totalRequests + 1),
      totalEntitiesExtracted:
        existing.totalEntitiesExtracted + args.extractedEntitiesCount,
      fallbackUsageCount:
        existing.fallbackUsageCount + (args.fallbackUsed ? 1 : 0),
      lastUpdated: timestamp,
    })
  } else {
    await ctx.db.insert('langExtractAggregateMetrics', {
      hourBucket: hourlyKey,
      totalRequests: 1,
      successfulRequests: args.success ? 1 : 0,
      failedRequests: args.success ? 0 : 1,
      totalProcessingTime: args.processingTimeMs,
      averageProcessingTime: args.processingTimeMs,
      totalEntitiesExtracted: args.extractedEntitiesCount,
      fallbackUsageCount: args.fallbackUsed ? 1 : 0,
      createdAt: timestamp,
      lastUpdated: timestamp,
    })
  }
}

// Query for LangExtract performance metrics
export const getLangExtractMetrics = query({
  args: {
    userId: v.optional(v.id('users')),
    hours: v.optional(v.number()),
    includeFailures: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let metricsQuery = ctx.db.query('langExtractMetrics')

    if (args.userId) {
      metricsQuery = metricsQuery.withIndex('by_user', (q: any) =>
        q.eq('userId', args.userId)
      )
    }

    const hours = args.hours || 24
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000

    const metrics = await metricsQuery
      .filter((q: any) => q.gte(q.field('createdAt'), cutoffTime))
      .collect()

    if (!args.includeFailures) {
      return metrics.filter(m => m.success)
    }

    return metrics
  },
})

// Get aggregate performance statistics
export const getLangExtractPerformanceStats = query({
  args: {
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24
    const hourBuckets = Math.floor(hours)
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000))
    const startHour = currentHour - hourBuckets

    const aggregateMetrics = await ctx.db
      .query('langExtractAggregateMetrics')
      .withIndex('by_hour', (q: any) => q.gte('hourBucket', startHour))
      .collect()

    if (aggregateMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageProcessingTime: 0,
        totalEntitiesExtracted: 0,
        fallbackUsageRate: 0,
        hourlyBreakdown: [],
      }
    }

    const totals = aggregateMetrics.reduce(
      (acc, metric) => ({
        totalRequests: acc.totalRequests + metric.totalRequests,
        successfulRequests: acc.successfulRequests + metric.successfulRequests,
        failedRequests: acc.failedRequests + metric.failedRequests,
        totalProcessingTime:
          acc.totalProcessingTime + metric.totalProcessingTime,
        totalEntitiesExtracted:
          acc.totalEntitiesExtracted + metric.totalEntitiesExtracted,
        fallbackUsageCount: acc.fallbackUsageCount + metric.fallbackUsageCount,
      }),
      {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalProcessingTime: 0,
        totalEntitiesExtracted: 0,
        fallbackUsageCount: 0,
      }
    )

    return {
      totalRequests: totals.totalRequests,
      successRate:
        totals.totalRequests > 0
          ? (totals.successfulRequests / totals.totalRequests) * 100
          : 0,
      averageProcessingTime:
        totals.totalRequests > 0
          ? totals.totalProcessingTime / totals.totalRequests
          : 0,
      totalEntitiesExtracted: totals.totalEntitiesExtracted,
      fallbackUsageRate:
        totals.totalRequests > 0
          ? (totals.fallbackUsageCount / totals.totalRequests) * 100
          : 0,
      hourlyBreakdown: aggregateMetrics.map(metric => ({
        hour: metric.hourBucket,
        timestamp: metric.hourBucket * 60 * 60 * 1000,
        requests: metric.totalRequests,
        successRate:
          metric.totalRequests > 0
            ? (metric.successfulRequests / metric.totalRequests) * 100
            : 0,
        averageProcessingTime: metric.averageProcessingTime,
        entitiesExtracted: metric.totalEntitiesExtracted,
      })),
    }
  },
})

// Get error analysis for failed LangExtract processing
export const getLangExtractErrorAnalysis = query({
  args: {
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000

    const failedMetrics = await ctx.db
      .query('langExtractMetrics')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('success'), false),
          q.gte(q.field('createdAt'), cutoffTime)
        )
      )
      .collect()

    // Group errors by type
    const errorGroups: { [key: string]: number } = {}
    const errorExamples: { [key: string]: string } = {}

    failedMetrics.forEach(metric => {
      if (metric.errorMessage) {
        // Categorize error types
        let errorType = 'Unknown Error'
        if (metric.errorMessage.includes('timeout')) {
          errorType = 'Timeout'
        } else if (metric.errorMessage.includes('network')) {
          errorType = 'Network Error'
        } else if (metric.errorMessage.includes('rate limit')) {
          errorType = 'Rate Limit'
        } else if (metric.errorMessage.includes('parsing')) {
          errorType = 'Parsing Error'
        } else if (metric.errorMessage.includes('authentication')) {
          errorType = 'Authentication Error'
        }

        errorGroups[errorType] = (errorGroups[errorType] || 0) + 1
        if (!errorExamples[errorType]) {
          errorExamples[errorType] = metric.errorMessage
        }
      }
    })

    return {
      totalFailures: failedMetrics.length,
      errorGroups,
      errorExamples,
      failureRate:
        failedMetrics.length > 0
          ? (failedMetrics.length /
              (failedMetrics.length +
                (await getSuccessfulRequestsCount(ctx, cutoffTime)))) *
            100
          : 0,
    }
  },
})

async function getSuccessfulRequestsCount(
  ctx: any,
  cutoffTime: number
): Promise<number> {
  const successfulMetrics = await ctx.db
    .query('langExtractMetrics')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('success'), true),
        q.gte(q.field('createdAt'), cutoffTime)
      )
    )
    .collect()

  return successfulMetrics.length
}

// Performance alerting
export const checkLangExtractPerformanceAlerts = query({
  args: {},
  handler: async ctx => {
    const recentStats = await getLangExtractPerformanceStats(ctx, { hours: 1 })
    const alerts = []

    // Alert on high failure rate
    if (recentStats.successRate < 90 && recentStats.totalRequests > 10) {
      alerts.push({
        type: 'high_failure_rate',
        severity: 'high',
        message: `LangExtract success rate is ${recentStats.successRate.toFixed(1)}% (below 90% threshold)`,
        value: recentStats.successRate,
        threshold: 90,
      })
    }

    // Alert on high processing time
    if (recentStats.averageProcessingTime > 5000) {
      // 5 seconds
      alerts.push({
        type: 'high_processing_time',
        severity: 'medium',
        message: `LangExtract average processing time is ${recentStats.averageProcessingTime.toFixed(0)}ms (above 5s threshold)`,
        value: recentStats.averageProcessingTime,
        threshold: 5000,
      })
    }

    // Alert on high fallback usage
    if (recentStats.fallbackUsageRate > 50 && recentStats.totalRequests > 5) {
      alerts.push({
        type: 'high_fallback_usage',
        severity: 'medium',
        message: `LangExtract fallback usage is ${recentStats.fallbackUsageRate.toFixed(1)}% (above 50% threshold)`,
        value: recentStats.fallbackUsageRate,
        threshold: 50,
      })
    }

    return alerts
  },
})
