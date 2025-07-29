/**
 * Queue Maintenance and Automatic Requeuing System
 * Handles periodic maintenance tasks for the queue system including automatic requeuing of transient failures
 */

import { internalMutation } from '../_generated/server'
import { internal } from '../_generated/api'

/**
 * Manual function to automatically requeue transient failures
 * Can be called manually or triggered by external scheduler
 */
export const triggerAutoRequeue: any = internalMutation({
  args: {},
  handler: async (ctx: any): Promise<any> => {
    // Call the auto-requeue function with default parameters
    return await ctx.runMutation(
      internal.scheduler.analysis_queue.autoRequeueTransientFailures,
      {
        maxAge: 30 * 60 * 1000, // Check failures from last 30 minutes
        batchSize: 20, // Process up to 20 items per run
      }
    )
  },
})

/**
 * Manual function to upgrade aging requests
 * Can be called manually or triggered by external scheduler
 */
export const triggerPriorityUpgrade: any = internalMutation({
  args: {},
  handler: async (ctx: any): Promise<any> => {
    return await ctx.runMutation(
      internal.scheduler.analysis_queue.upgradeAgingRequests,
      {}
    )
  },
})

/**
 * Manual function to purge expired queue items
 * Can be called manually or triggered by external scheduler
 */
export const triggerQueueCleanup: any = internalMutation({
  args: {},
  handler: async (ctx: any): Promise<any> => {
    return await ctx.runMutation(
      internal.scheduler.analysis_queue.purgeExpiredQueue,
      {
        maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
        dryRun: false,
      }
    )
  },
})

/**
 * Manual trigger for emergency auto-requeue
 * Can be called by admins when system issues are resolved
 */
export const emergencyAutoRequeue: any = internalMutation({
  handler: async (ctx: any): Promise<any> => {
    // Run auto-requeue with extended parameters for emergency situations
    const result: any = await ctx.runMutation(
      internal.scheduler.analysis_queue.autoRequeueTransientFailures,
      {
        maxAge: 2 * 60 * 60 * 1000, // Check failures from last 2 hours
        batchSize: 50, // Process more items in emergency
      }
    )

    // Also purge very old items to free up queue space
    const purgeResult: any = await ctx.runMutation(
      internal.scheduler.analysis_queue.purgeExpiredQueue,
      {
        maxAgeMs: 6 * 60 * 60 * 1000, // 6 hours for emergency cleanup
        dryRun: false,
      }
    )

    return {
      status: 'emergency_requeue_completed',
      autoRequeueResult: result,
      purgeResult,
      timestamp: Date.now(),
    }
  },
})

/**
 * Health check for automatic requeuing system
 * Returns metrics about the effectiveness of auto-requeuing
 */
export const getAutoRequeueHealthMetrics = internalMutation({
  handler: async ctx => {
    const now = Date.now()
    const last24Hours = now - 24 * 60 * 60 * 1000
    const lastHour = now - 60 * 60 * 1000

    // Get failed analyses in last 24 hours
    const recentFailures = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status', q => q.eq('status', 'failed'))
      .filter(q => q.gt(q.field('createdAt'), last24Hours))
      .collect()

    // Get successful analyses in last hour (potential auto-requeue successes)
    const recentSuccesses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status', q => q.eq('status', 'completed'))
      .filter(q =>
        q.and(
          q.gt(q.field('createdAt'), lastHour),
          q.gt(q.field('processingAttempts'), 1) // Multi-attempt successes
        )
      )
      .collect()

    // Analyze failure patterns
    const failuresByError = recentFailures.reduce(
      (acc, failure) => {
        const errorType = failure.lastErrorMessage || 'unknown'
        const isRecoverable =
          errorType.toLowerCase().includes('timeout') ||
          errorType.toLowerCase().includes('network') ||
          errorType.toLowerCase().includes('rate limit')

        if (!acc[errorType]) {
          acc[errorType] = { count: 0, recoverable: isRecoverable }
        }
        acc[errorType].count++
        return acc
      },
      {} as Record<string, { count: number; recoverable: boolean }>
    )

    // Calculate success rate after retries
    const multiAttemptItems =
      recentSuccesses.length +
      recentFailures.filter(f => (f.processingAttempts || 0) > 1).length
    const successAfterRetryRate =
      multiAttemptItems > 0
        ? (recentSuccesses.length / multiAttemptItems) * 100
        : 0

    return {
      timestamp: now,
      metrics: {
        recentFailures: recentFailures.length,
        recentRetrySuccesses: recentSuccesses.length,
        successAfterRetryRate: Math.round(successAfterRetryRate * 100) / 100,
        failuresByError,
        recoverableFailures: Object.values(failuresByError)
          .filter(f => f.recoverable)
          .reduce((sum, f) => sum + f.count, 0),
        nonRecoverableFailures: Object.values(failuresByError)
          .filter(f => !f.recoverable)
          .reduce((sum, f) => sum + f.count, 0),
      },
      recommendations: generateAutoRequeueRecommendations(
        successAfterRetryRate,
        recentFailures.length,
        recentSuccesses.length
      ),
    }
  },
})

/**
 * Generate recommendations for auto-requeue system tuning
 */
function generateAutoRequeueRecommendations(
  successRate: number,
  failureCount: number,
  retrySuccessCount: number
): string[] {
  const recommendations: string[] = []

  if (successRate < 30 && retrySuccessCount > 0) {
    recommendations.push(
      'Consider increasing retry limits for recoverable errors'
    )
  }

  if (successRate > 80 && failureCount > 10) {
    recommendations.push(
      'Auto-requeue system performing well - maintain current settings'
    )
  }

  if (failureCount > 50 && successRate < 50) {
    recommendations.push(
      'High failure rate detected - investigate underlying service issues'
    )
  }

  if (retrySuccessCount === 0 && failureCount > 5) {
    recommendations.push(
      'No retry successes - check if auto-requeue system is functioning'
    )
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Auto-requeue system operating within normal parameters'
    )
  }

  return recommendations
}
