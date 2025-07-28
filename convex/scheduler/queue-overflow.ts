/**
 * Queue Overflow and Backpressure Management System
 * Handles queue capacity limits, overflow strategies, and system load balancing
 */

import { internalMutation, internalQuery } from '../_generated/server'
import { v } from 'convex/values'
import { Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import {
  QUEUE_CONFIG,
  PRIORITY_CRITERIA,
  PRIORITY_LEVELS,
} from './queue-config'
import {
  getPriorityValue,
  shouldUpgradePriority,
} from '../utils/priority-assessment'

/**
 * Queue overflow strategies
 */
export type OverflowStrategy =
  | 'reject'
  | 'delay'
  | 'upgrade_priority'
  | 'dead_letter'

/**
 * Backpressure levels based on system load
 */
export type BackpressureLevel =
  | 'none'
  | 'light'
  | 'moderate'
  | 'heavy'
  | 'critical'

/**
 * Check queue capacity and apply backpressure
 */
export const checkQueueCapacity = internalQuery({
  args: {
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
  },
  handler: async (ctx, { priority = 'normal' }) => {
    // Get current queue size
    const currentQueue = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .collect()

    const totalQueued = currentQueue.length
    const capacityUtilization =
      (totalQueued / QUEUE_CONFIG.MAX_QUEUE_SIZE) * 100

    // Priority-specific capacity analysis
    const priorityBreakdown = currentQueue.reduce(
      (acc, item) => {
        const itemPriority = item.priority || 'normal'
        acc[itemPriority] = (acc[itemPriority] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Active processing analysis
    const activeProcessing = currentQueue.filter(
      item => item.processingStartedAt
    ).length
    const processingUtilization =
      (activeProcessing / QUEUE_CONFIG.MAX_CONCURRENT_PROCESSING) * 100

    // Determine backpressure level
    const backpressureLevel = determineBackpressureLevel(
      capacityUtilization,
      processingUtilization
    )

    // Calculate wait times for capacity assessment
    const now = Date.now()
    const waitTimes = currentQueue.map(
      item => now - (item.queuedAt || item.createdAt)
    )
    const averageWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0

    // Admission control decision
    const admissionDecision = makeAdmissionDecision(
      totalQueued,
      capacityUtilization,
      processingUtilization,
      priority,
      backpressureLevel,
      averageWaitTime
    )

    return {
      capacity: {
        totalQueued,
        maxCapacity: QUEUE_CONFIG.MAX_QUEUE_SIZE,
        capacityUtilization: Math.round(capacityUtilization * 100) / 100,
        remainingCapacity: QUEUE_CONFIG.MAX_QUEUE_SIZE - totalQueued,
        nearCapacity:
          capacityUtilization > QUEUE_CONFIG.NEAR_CAPACITY_THRESHOLD * 100,
      },
      processing: {
        activeProcessing,
        maxConcurrentProcessing: QUEUE_CONFIG.MAX_CONCURRENT_PROCESSING,
        processingUtilization: Math.round(processingUtilization * 100) / 100,
        availableProcessingSlots:
          QUEUE_CONFIG.MAX_CONCURRENT_PROCESSING - activeProcessing,
      },
      priorityBreakdown,
      backpressure: {
        level: backpressureLevel,
        averageWaitTime: Math.round(averageWaitTime),
        recommendedAction: getBackpressureAction(backpressureLevel),
      },
      admission: admissionDecision,
      timestamp: now,
    }
  },
})

/**
 * Apply overflow strategy when queue is at capacity
 */
export const handleQueueOverflow = internalMutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
    priority: v.union(
      v.literal('normal'),
      v.literal('high'),
      v.literal('urgent')
    ),
    strategy: v.optional(
      v.union(
        v.literal('reject'),
        v.literal('delay'),
        v.literal('upgrade_priority'),
        v.literal('dead_letter')
      )
    ),
  },
  handler: async (ctx, { entryId, userId, priority, strategy }) => {
    const capacityCheck = await ctx.runQuery(
      internal.scheduler.checkQueueCapacityInternal,
      { priority }
    )

    if (!capacityCheck.admission.allowed) {
      // Determine strategy if not provided
      const overflowStrategy =
        strategy ||
        determineOverflowStrategy(priority, capacityCheck.backpressure.level)

      return await executeOverflowStrategy(ctx, {
        entryId,
        userId,
        priority,
        strategy: overflowStrategy,
        capacityInfo: capacityCheck,
      })
    }

    // Queue has capacity, proceed normally
    return {
      status: 'proceed',
      message: 'Queue has available capacity',
      capacityInfo: capacityCheck,
    }
  },
})

/**
 * Implement backpressure throttling
 */
export const applyBackpressureThrottling = internalMutation({
  args: {
    requestCount: v.number(),
    timeWindowMs: v.optional(v.number()),
  },
  handler: async (ctx, { requestCount, timeWindowMs = 60000 }) => {
    const now = Date.now()
    const windowStart = now - timeWindowMs

    // Get recent queue additions
    const recentAdditions = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gt(q.field('createdAt'), windowStart))
      .collect()

    const currentRate = recentAdditions.length
    const capacityCheck = await ctx.runQuery(
      internal.scheduler.checkQueueCapacityInternal,
      {}
    )

    // Calculate throttling parameters
    const throttlingDecision = calculateThrottling(
      currentRate,
      requestCount,
      capacityCheck.backpressure.level,
      capacityCheck.capacity.capacityUtilization
    )

    return {
      throttling: throttlingDecision,
      currentRate,
      requestCount,
      timeWindow: timeWindowMs,
      backpressureLevel: capacityCheck.backpressure.level,
      capacityUtilization: capacityCheck.capacity.capacityUtilization,
      recommendedDelay: throttlingDecision.delay,
      timestamp: now,
    }
  },
})

/**
 * Implement dead letter queue for permanently failed items with enhanced escalation logic
 */
export const moveToDeadLetterQueue = internalMutation({
  args: {
    analysisId: v.id('aiAnalysis'),
    reason: v.string(),
    metadata: v.optional(
      v.object({
        originalPriority: v.optional(v.string()),
        retryCount: v.optional(v.number()),
        lastError: v.optional(v.string()),
        totalProcessingTime: v.optional(v.number()),
        errorClassification: v.optional(
          v.object({
            type: v.optional(v.string()),
            isServiceError: v.optional(v.boolean()),
            isRecoverable: v.optional(v.boolean()),
            shouldTripCircuit: v.optional(v.boolean()),
          })
        ),
        retryDecision: v.optional(
          v.object({
            maxRetries: v.optional(v.number()),
            escalationReason: v.optional(v.string()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { analysisId, reason, metadata }) => {
    const analysis = await ctx.db.get(analysisId)
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }

    // Determine escalation category based on error classification and retry attempts
    const errorType = metadata?.errorClassification?.type || 'unknown'
    const retryCount = metadata?.retryCount || analysis.processingAttempts || 0
    const isServiceError =
      metadata?.errorClassification?.isServiceError || false
    const maxRetries = metadata?.retryDecision?.maxRetries || 3

    // Create detailed escalation reason
    let escalationCategory = 'permanent_failure'
    if (retryCount >= maxRetries) {
      escalationCategory = 'max_retries_exceeded'
    } else if (!metadata?.errorClassification?.isRecoverable) {
      escalationCategory = 'non_recoverable_error'
    } else if (
      isServiceError &&
      metadata?.errorClassification?.shouldTripCircuit
    ) {
      escalationCategory = 'circuit_breaker_triggered'
    }

    // Enhanced dead letter queue entry with comprehensive metadata
    await ctx.db.patch(analysisId, {
      status: 'failed',
      lastErrorMessage: `Dead Letter Queue: ${reason}`,
      deadLetterQueue: true,
      deadLetterReason: reason,
      deadLetterTimestamp: Date.now(),
      deadLetterCategory: escalationCategory,
      deadLetterMetadata: {
        errorType,
        isServiceError,
        isRecoverable: metadata?.errorClassification?.isRecoverable || false,
        shouldTripCircuit:
          metadata?.errorClassification?.shouldTripCircuit || false,
        finalRetryCount: retryCount,
        maxRetriesAllowed: maxRetries,
        escalationReason: metadata?.retryDecision?.escalationReason,
        originalPriority: metadata?.originalPriority || analysis.priority,
        processingHistory: {
          queuedAt: analysis.queuedAt,
          firstAttemptAt: analysis.createdAt,
          finalAttemptAt: Date.now(),
          totalWaitTime: Date.now() - (analysis.queuedAt || analysis.createdAt),
        },
      },
      totalProcessingTime:
        metadata?.totalProcessingTime ||
        Date.now() - (analysis.queuedAt || analysis.createdAt),
    })

    // Log dead letter queue entry for monitoring and alerting
    return {
      status: 'moved_to_dead_letter_queue',
      analysisId,
      reason,
      escalationCategory,
      metadata: {
        entryId: analysis.entryId,
        userId: analysis.userId,
        originalPriority: metadata?.originalPriority || analysis.priority,
        retryCount,
        maxRetries,
        lastError: metadata?.lastError || analysis.lastErrorMessage,
        totalWaitTime: Date.now() - (analysis.queuedAt || analysis.createdAt),
        errorClassification: {
          type: errorType,
          isServiceError,
          isRecoverable: metadata?.errorClassification?.isRecoverable || false,
          shouldTripCircuit:
            metadata?.errorClassification?.shouldTripCircuit || false,
        },
        escalationTrigger: metadata?.retryDecision?.escalationReason || reason,
      },
      timestamp: Date.now(),
      needsInvestigation:
        isServiceError || escalationCategory === 'circuit_breaker_triggered',
      alertPriority: isServiceError ? 'high' : 'medium',
    }
  },
})

/**
 * Get dead letter queue statistics and management
 */
export const getDeadLetterQueueStats = internalQuery({
  args: {
    timeRangeHours: v.optional(v.number()),
  },
  handler: async (ctx, { timeRangeHours = 24 }) => {
    const now = Date.now()
    const startTime = now - timeRangeHours * 60 * 60 * 1000

    // Get all dead letter queue items
    const deadLetterItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_created', q => q.eq('status', 'failed'))
      .filter(q =>
        q.and(
          q.eq(q.field('deadLetterQueue'), true),
          q.gt(q.field('deadLetterTimestamp'), startTime)
        )
      )
      .collect()

    // Enhanced analysis with new metadata structure
    const reasonBreakdown = deadLetterItems.reduce(
      (acc, item) => {
        const reason = item.deadLetterReason || 'unknown'
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const categoryBreakdown = deadLetterItems.reduce(
      (acc, item) => {
        const category = item.deadLetterCategory || 'permanent_failure'
        acc[category] = (acc[category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const errorTypeBreakdown = deadLetterItems.reduce(
      (acc, item) => {
        const errorType = item.deadLetterMetadata?.errorType || 'unknown'
        acc[errorType] = (acc[errorType] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const priorityBreakdown = deadLetterItems.reduce(
      (acc, item) => {
        const priority = item.priority || 'normal'
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Advanced recovery and investigation analysis
    const serviceErrorItems = deadLetterItems.filter(
      item => item.deadLetterMetadata?.isServiceError || false
    )

    const circuitBreakerTriggered = deadLetterItems.filter(
      item => item.deadLetterCategory === 'circuit_breaker_triggered'
    )

    const maxRetriesExceeded = deadLetterItems.filter(
      item => item.deadLetterCategory === 'max_retries_exceeded'
    )

    const nonRecoverableErrors = deadLetterItems.filter(
      item => item.deadLetterCategory === 'non_recoverable_error'
    )

    // Calculate average retry attempts and wait times
    const avgRetryAttempts =
      deadLetterItems.length > 0
        ? deadLetterItems.reduce(
            (sum, item) =>
              sum + (item.deadLetterMetadata?.finalRetryCount || 0),
            0
          ) / deadLetterItems.length
        : 0

    const avgWaitTime =
      deadLetterItems.length > 0
        ? deadLetterItems.reduce(
            (sum, item) =>
              sum +
              (item.deadLetterMetadata?.processingHistory?.totalWaitTime || 0),
            0
          ) / deadLetterItems.length
        : 0

    return {
      summary: {
        totalDeadLetterItems: deadLetterItems.length,
        timeRange: { hours: timeRangeHours, startTime, endTime: now },
        serviceErrorCount: serviceErrorItems.length,
        circuitBreakerTriggered: circuitBreakerTriggered.length,
        maxRetriesExceeded: maxRetriesExceeded.length,
        nonRecoverableErrors: nonRecoverableErrors.length,
        needsInvestigation:
          serviceErrorItems.length + circuitBreakerTriggered.length,
        avgRetryAttempts: Math.round(avgRetryAttempts * 100) / 100,
        avgWaitTimeMs: Math.round(avgWaitTime),
      },
      breakdown: {
        byReason: reasonBreakdown,
        byCategory: categoryBreakdown,
        byErrorType: errorTypeBreakdown,
        byPriority: priorityBreakdown,
      },
      recoverableItems: recoverableItems.map(item => ({
        analysisId: item._id,
        entryId: item.entryId,
        userId: item.userId,
        reason: item.deadLetterReason,
        lastError: item.lastErrorMessage,
        priority: item.priority,
        retryCount: item.processingAttempts,
        recoveryRecommendation: getRecoveryRecommendation(
          item.deadLetterReason || ''
        ),
      })),
      timestamp: now,
    }
  },
})

/**
 * Recover items from dead letter queue
 */
export const recoverFromDeadLetterQueue = internalMutation({
  args: {
    analysisIds: v.array(v.id('aiAnalysis')),
    newPriority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
  },
  handler: async (ctx, { analysisIds, newPriority = 'high' }) => {
    const recoveredItems = []
    const failedRecoveries = []

    for (const analysisId of analysisIds) {
      try {
        const analysis = await ctx.db.get(analysisId)
        if (!analysis || !analysis.deadLetterQueue) {
          failedRecoveries.push({
            analysisId,
            reason: 'Item not found in dead letter queue',
          })
          continue
        }

        // Check if item is recoverable
        if (
          !isRecoverable(
            analysis.deadLetterReason || '',
            analysis.lastErrorMessage || ''
          )
        ) {
          failedRecoveries.push({
            analysisId,
            reason: 'Item not recoverable - permanent failure',
          })
          continue
        }

        // Reset analysis for retry
        await ctx.db.patch(analysisId, {
          status: 'processing',
          priority: newPriority,
          processingAttempts: 0,
          processingStartedAt: undefined,
          queuedAt: Date.now(),
          deadLetterQueue: false,
          deadLetterReason: undefined,
          deadLetterTimestamp: undefined,
          lastErrorMessage: 'Recovered from dead letter queue',
        })

        // Reschedule processing
        const delay = PRIORITY_CRITERIA[newPriority].delay
        // Use HTTP Actions for processing
        await ctx.scheduler.runAfter(
          delay,
          internal.aiAnalysis.scheduleHttpAnalysis,
          {
            entryId: analysis.entryId as string,
            userId: analysis.userId as string,
            priority: newPriority,
          }
        )

        recoveredItems.push({
          analysisId,
          entryId: analysis.entryId,
          userId: analysis.userId,
          newPriority,
          scheduledDelay: delay,
        })
      } catch (error) {
        failedRecoveries.push({
          analysisId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      status: 'completed',
      recovered: recoveredItems.length,
      failed: failedRecoveries.length,
      recoveredItems,
      failedRecoveries,
      timestamp: Date.now(),
    }
  },
})

/**
 * Get queue load balancing recommendations
 */
export const getLoadBalancingRecommendations = internalQuery({
  handler: async ctx => {
    const capacityCheck = await ctx.runQuery(
      internal.scheduler.checkQueueCapacityInternal,
      {}
    )
    const now = Date.now()

    // Analyze current load distribution
    const currentQueue = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .collect()

    const loadAnalysis = analyzeLoadDistribution(currentQueue, now)
    const recommendations = generateLoadBalancingRecommendations(
      capacityCheck,
      loadAnalysis
    )

    return {
      currentLoad: loadAnalysis,
      capacity: capacityCheck.capacity,
      backpressure: capacityCheck.backpressure,
      recommendations,
      timestamp: now,
    }
  },
})

// Helper functions

function determineBackpressureLevel(
  capacityUtilization: number,
  processingUtilization: number
): BackpressureLevel {
  const maxUtilization = Math.max(capacityUtilization, processingUtilization)

  if (maxUtilization >= 95) return 'critical'
  if (maxUtilization >= 85) return 'heavy'
  if (maxUtilization >= 70) return 'moderate'
  if (maxUtilization >= 50) return 'light'
  return 'none'
}

function makeAdmissionDecision(
  totalQueued: number,
  capacityUtilization: number,
  processingUtilization: number,
  priority: string,
  backpressureLevel: BackpressureLevel,
  averageWaitTime: number
) {
  // Always allow urgent priority unless at critical capacity
  if (priority === 'urgent' && capacityUtilization < 98) {
    return {
      allowed: true,
      reason: 'Urgent priority - allowed despite backpressure',
      estimatedWaitTime: averageWaitTime,
    }
  }

  // Reject if at maximum capacity
  if (totalQueued >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
    return {
      allowed: false,
      reason: 'Queue at maximum capacity',
      estimatedWaitTime: null,
      suggestedRetryAfter: calculateRetryDelay(backpressureLevel),
    }
  }

  // Apply backpressure-based admission control
  const admissionThreshold = getAdmissionThreshold(backpressureLevel, priority)

  if (capacityUtilization > admissionThreshold) {
    return {
      allowed: false,
      reason: `Backpressure active - capacity ${Math.round(capacityUtilization)}% exceeds threshold ${admissionThreshold}%`,
      estimatedWaitTime: null,
      suggestedRetryAfter: calculateRetryDelay(backpressureLevel),
    }
  }

  return {
    allowed: true,
    reason: 'Admission approved',
    estimatedWaitTime: averageWaitTime,
  }
}

function determineOverflowStrategy(
  priority: string,
  backpressureLevel: BackpressureLevel
): OverflowStrategy {
  // Critical backpressure: reject or dead letter
  if (backpressureLevel === 'critical') {
    return priority === 'urgent' ? 'upgrade_priority' : 'reject'
  }

  // Heavy backpressure: delay or upgrade
  if (backpressureLevel === 'heavy') {
    return priority === 'normal' ? 'delay' : 'upgrade_priority'
  }

  // Moderate backpressure: delay
  if (backpressureLevel === 'moderate') {
    return 'delay'
  }

  // Default strategy
  return priority === 'urgent' ? 'upgrade_priority' : 'delay'
}

async function executeOverflowStrategy(
  ctx: any,
  params: {
    entryId: Id<'journalEntries'>
    userId: Id<'users'>
    priority: string
    strategy: OverflowStrategy
    capacityInfo: any
  }
) {
  const { entryId, userId, priority, strategy, capacityInfo } = params

  switch (strategy) {
    case 'reject':
      return {
        status: 'rejected',
        reason: 'Queue overflow - request rejected',
        strategy,
        retryAfter: calculateRetryDelay(capacityInfo.backpressure.level),
        capacityInfo,
      }

    case 'delay':
      const delayMs = calculateDelayForOverflow(
        capacityInfo.backpressure.level,
        priority
      )
      return {
        status: 'delayed',
        reason: `Queue overflow - delayed processing by ${Math.round(delayMs / 1000)}s`,
        strategy,
        delayMs,
        retryAfter: delayMs,
        capacityInfo,
      }

    case 'upgrade_priority':
      const upgradedPriority = priority === 'normal' ? 'high' : 'urgent'
      return {
        status: 'priority_upgraded',
        reason: `Queue overflow - priority upgraded from ${priority} to ${upgradedPriority}`,
        strategy,
        originalPriority: priority,
        newPriority: upgradedPriority,
        capacityInfo,
      }

    case 'dead_letter':
      return {
        status: 'dead_letter_queued',
        reason:
          'Queue overflow - moved to dead letter queue for later processing',
        strategy,
        capacityInfo,
      }

    default:
      return {
        status: 'error',
        reason: `Unknown overflow strategy: ${strategy}`,
        strategy,
        capacityInfo,
      }
  }
}

function calculateThrottling(
  currentRate: number,
  requestCount: number,
  backpressureLevel: BackpressureLevel,
  capacityUtilization: number
) {
  const baseThreshold = 100 // requests per minute
  const throttlingMultiplier = getThrottlingMultiplier(backpressureLevel)
  const adjustedThreshold = baseThreshold * throttlingMultiplier

  const shouldThrottle =
    currentRate > adjustedThreshold || capacityUtilization > 80

  if (!shouldThrottle) {
    return {
      shouldThrottle: false,
      delay: 0,
      reason: 'No throttling required',
    }
  }

  // Calculate throttling delay
  const excessRate = Math.max(0, currentRate - adjustedThreshold)
  const baseDelay = 1000 // 1 second base delay
  const delay = baseDelay * (1 + excessRate / adjustedThreshold)

  return {
    shouldThrottle: true,
    delay: Math.min(delay, 30000), // Max 30 second delay
    reason: `Rate ${currentRate}/min exceeds threshold ${adjustedThreshold}/min`,
    currentRate,
    threshold: adjustedThreshold,
    backpressureLevel,
  }
}

function getBackpressureAction(level: BackpressureLevel): string {
  switch (level) {
    case 'none':
      return 'Normal operation'
    case 'light':
      return 'Monitor queue growth'
    case 'moderate':
      return 'Apply light throttling'
    case 'heavy':
      return 'Reject low priority requests'
    case 'critical':
      return 'Emergency capacity scaling required'
    default:
      return 'Unknown backpressure level'
  }
}

function getAdmissionThreshold(
  backpressureLevel: BackpressureLevel,
  priority: string
): number {
  const baseThresholds = {
    urgent: 95,
    high: 85,
    normal: 75,
  }

  const backpressureAdjustment = {
    none: 0,
    light: -5,
    moderate: -10,
    heavy: -15,
    critical: -20,
  }

  const baseThreshold =
    baseThresholds[priority as keyof typeof baseThresholds] || 75
  const adjustment = backpressureAdjustment[backpressureLevel]

  return Math.max(50, baseThreshold + adjustment) // Never go below 50%
}

function calculateRetryDelay(backpressureLevel: BackpressureLevel): number {
  const baseDelay = 30000 // 30 seconds
  const multipliers = {
    none: 0,
    light: 1,
    moderate: 2,
    heavy: 4,
    critical: 8,
  }

  return baseDelay * (multipliers[backpressureLevel] || 1)
}

function calculateDelayForOverflow(
  backpressureLevel: BackpressureLevel,
  priority: string
): number {
  const baseDelays = {
    urgent: 5000, // 5 seconds
    high: 15000, // 15 seconds
    normal: 30000, // 30 seconds
  }

  const backpressureMultipliers = {
    none: 0.5,
    light: 1,
    moderate: 2,
    heavy: 4,
    critical: 8,
  }

  const baseDelay = baseDelays[priority as keyof typeof baseDelays] || 30000
  const multiplier = backpressureMultipliers[backpressureLevel] || 1

  return Math.min(baseDelay * multiplier, 300000) // Max 5-minute delay
}

function getThrottlingMultiplier(backpressureLevel: BackpressureLevel): number {
  switch (backpressureLevel) {
    case 'none':
      return 1.0
    case 'light':
      return 0.9
    case 'moderate':
      return 0.7
    case 'heavy':
      return 0.5
    case 'critical':
      return 0.3
    default:
      return 1.0
  }
}

function isRecoverable(deadLetterReason: string, lastError: string): boolean {
  const nonRecoverablePatterns = [
    'validation',
    'invalid_input',
    'malformed_request',
    'authentication_failed',
    'quota_permanently_exceeded',
    'user_cancelled',
  ]

  const recoverablePatterns = [
    'timeout',
    'network',
    'temporary',
    'rate_limit',
    'capacity',
    'system_overload',
  ]

  const combinedText = `${deadLetterReason} ${lastError}`.toLowerCase()

  // Check for non-recoverable patterns first
  if (nonRecoverablePatterns.some(pattern => combinedText.includes(pattern))) {
    return false
  }

  // Check for recoverable patterns
  if (recoverablePatterns.some(pattern => combinedText.includes(pattern))) {
    return true
  }

  // Default to recoverable for unknown patterns (better to retry than lose data)
  return true
}

function getRecoveryRecommendation(deadLetterReason: string): string {
  const reason = deadLetterReason.toLowerCase()

  if (reason.includes('timeout')) return 'Retry with increased timeout'
  if (reason.includes('network')) return 'Retry when network conditions improve'
  if (reason.includes('rate_limit')) return 'Retry with exponential backoff'
  if (reason.includes('capacity')) return 'Retry during low-load period'
  if (reason.includes('overload')) return 'Retry with reduced priority'

  return 'Retry with standard parameters'
}

function analyzeLoadDistribution(queueItems: any[], currentTime: number) {
  const priorityDistribution = queueItems.reduce(
    (acc, item) => {
      const priority = item.priority || 'normal'
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const ageDistribution = {
    fresh: 0, // < 1 minute
    recent: 0, // 1-5 minutes
    aging: 0, // 5-15 minutes
    stale: 0, // > 15 minutes
  }

  queueItems.forEach(item => {
    const age = currentTime - (item.queuedAt || item.createdAt)
    const ageMinutes = age / 60000

    if (ageMinutes < 1) ageDistribution.fresh++
    else if (ageMinutes < 5) ageDistribution.recent++
    else if (ageMinutes < 15) ageDistribution.aging++
    else ageDistribution.stale++
  })

  return {
    total: queueItems.length,
    priorityDistribution,
    ageDistribution,
    averageAge:
      queueItems.length > 0
        ? queueItems.reduce(
            (sum, item) =>
              sum + (currentTime - (item.queuedAt || item.createdAt)),
            0
          ) / queueItems.length
        : 0,
  }
}

function generateLoadBalancingRecommendations(
  capacityInfo: any,
  loadAnalysis: any
) {
  const recommendations = []

  // Capacity recommendations
  if (capacityInfo.capacity.capacityUtilization > 85) {
    recommendations.push({
      type: 'capacity',
      priority: 'high',
      action: 'Scale up processing capacity or implement load shedding',
      reason: `Queue at ${Math.round(capacityInfo.capacity.capacityUtilization)}% capacity`,
    })
  }

  // Processing bottleneck recommendations
  if (capacityInfo.processing.processingUtilization > 90) {
    recommendations.push({
      type: 'processing',
      priority: 'high',
      action:
        'Increase concurrent processing limit or optimize processing performance',
      reason: `Processing at ${Math.round(capacityInfo.processing.processingUtilization)}% utilization`,
    })
  }

  // Age-based recommendations
  if (loadAnalysis.ageDistribution.stale > 0) {
    recommendations.push({
      type: 'aging',
      priority: 'medium',
      action: 'Implement priority upgrades for aging requests',
      reason: `${loadAnalysis.ageDistribution.stale} items waiting over 15 minutes`,
    })
  }

  // Priority distribution recommendations
  const urgentRatio =
    (loadAnalysis.priorityDistribution.urgent || 0) / loadAnalysis.total
  if (urgentRatio > 0.3) {
    recommendations.push({
      type: 'priority',
      priority: 'medium',
      action: 'Review priority assessment logic - too many urgent items',
      reason: `${Math.round(urgentRatio * 100)}% of queue is urgent priority`,
    })
  }

  return recommendations
}
