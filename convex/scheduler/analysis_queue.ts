import { v } from 'convex/values'
import { internalMutation, internalQuery, query } from '../_generated/server'
import { internal } from '../_generated/api'
import {
  QUEUE_CONFIG,
  PRIORITY_CRITERIA,
  PRIORITY_LEVELS,
} from './queue_config'
import {
  assessPriority,
  assessPriorityWithContent,
  shouldUpgradePriority,
  getPriorityValue,
  comparePriorities,
} from '../utils/priority_assessment'
import {
  QueueCircuitBreaker,
  shouldTripCircuitBreaker,
  isRecoverableError,
  getCircuitBreakerHealthStatus,
  canExecuteRequest,
} from '../utils/circuit_breaker'
import {
  calculateRetryStrategy,
  createRetryContext,
} from '../utils/retry_strategy'
import {
  shouldUseFallbackAnalysis,
  handleFallbackInPipeline,
} from '../fallback/integration'

/**
 * Enqueue an analysis request with priority-based processing
 */
export const enqueueAnalysis = internalMutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
    delay: v.optional(v.number()),
    userTier: v.optional(v.union(v.literal('free'), v.literal('premium'))),
    entryContent: v.optional(v.string()),
    relationshipId: v.optional(v.id('relationships')),
  },
  handler: async (
    ctx,
    {
      entryId,
      userId,
      priority,
      delay = 0,
      userTier,
      entryContent,
      relationshipId,
    }
  ) => {
    // Input validation
    if (!entryId || !userId) {
      throw new Error('Missing required parameters: entryId and userId')
    }

    // Check for existing queued analysis to prevent duplicates
    const existing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_entry', q => q.eq('entryId', entryId))
      .filter(q =>
        q.or(
          q.eq(q.field('status'), 'processing'),
          q.eq(q.field('status'), 'completed')
        )
      )
      .first()

    if (existing) {
      return {
        status:
          existing.status === 'completed'
            ? 'already_analyzed'
            : 'already_queued',
        analysisId: existing._id,
        currentStatus: existing.status,
      }
    }

    // Assess priority automatically if not provided
    let finalPriority = priority
    if (!finalPriority && userTier) {
      const priorityAssessment = assessPriorityWithContent({
        userId: userId as string,
        userTier,
        relationshipId: relationshipId as string | undefined,
        entryContent,
        recentActivityHours: 0, // Could be calculated from recent entries
      })
      finalPriority = priorityAssessment.priority
    } else if (!finalPriority) {
      finalPriority = 'normal' // Default fallback
    }

    // Check current queue size for overflow handling
    const currentQueueSize = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status', q => q.eq('status', 'processing'))
      .collect()

    if (currentQueueSize.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
      // Queue overflow - calculate estimated wait time
      const averageProcessingTime = 30000 // 30 seconds default
      const queuePosition = currentQueueSize.length + 1
      const estimatedWaitTime = queuePosition * averageProcessingTime

      return {
        status: 'queue_full',
        queueSize: currentQueueSize.length,
        estimatedWaitTime,
        message: 'Queue at capacity. Please try again later.',
      }
    }

    // Create analysis record with processing status and queue metadata
    const queuedAt = Date.now()
    const analysisId = await ctx.db.insert('aiAnalysis', {
      entryId,
      userId,
      status: 'processing',
      processingAttempts: 0,
      priority: finalPriority,
      queuedAt,
      queuePosition: currentQueueSize.length + 1,
      estimatedCompletionTime:
        queuedAt + (delay || PRIORITY_CRITERIA[finalPriority].delay) + 30000,
      analysisVersion: 'queue-v1.0',
      processingTime: 0, // Will be updated when completed
      createdAt: queuedAt,
      sentimentScore: 0, // Default values for required fields
      emotionalKeywords: [],
      confidenceLevel: 0,
      reasoning: '',
    })

    // Calculate priority-based delay
    const scheduledDelay = delay || PRIORITY_CRITERIA[finalPriority].delay

    // Schedule HTTP Action processing
    await ctx.scheduler.runAfter(
      scheduledDelay,
      internal.aiAnalysis.scheduleHttpAnalysis,
      {
        entryId,
        userId,
        priority: finalPriority,
      }
    )

    return {
      status: 'queued',
      analysisId,
      priority: finalPriority,
      scheduledDelay,
      queuePosition: currentQueueSize.length + 1,
      estimatedCompletionTime: queuedAt + scheduledDelay + 30000,
    }
  },
})

/**
 * Dequeue analysis items for processing (priority-ordered)
 */
export const dequeueAnalysis = internalQuery({
  args: {
    limit: v.optional(v.number()),
    priorityFilter: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
  },
  handler: async (ctx, { limit = 10, priorityFilter }) => {
    // Get all queued items that haven't started processing
    let query = ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .filter(q => q.eq(q.field('processingStartedAt'), undefined))

    // Apply priority filter if specified
    if (priorityFilter) {
      query = query.filter(q => q.eq(q.field('priority'), priorityFilter))
    }

    const queuedItems = await query.collect()

    // Sort by weighted priority (priority value + age bonus)
    const weightedItems = queuedItems.map(item => {
      const priorityValue = getPriorityValue(item.priority || 'normal')
      const ageBonus = Math.min(
        (Date.now() - (item.queuedAt || item.createdAt)) / 60000,
        5
      )
      const weight = priorityValue * 10 + ageBonus

      return { ...item, weight }
    })

    // Sort by weight (highest first) and take up to limit
    const sortedItems = weightedItems
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)

    return sortedItems.map(item => ({
      analysisId: item._id,
      entryId: item.entryId,
      userId: item.userId,
      priority: item.priority || 'normal',
      queuedAt: item.queuedAt,
      queuePosition: item.queuePosition,
      weight: item.weight,
      waitTime: Date.now() - (item.queuedAt || item.createdAt),
    }))
  },
})

/**
 * Enhanced requeue analysis with circuit breaker awareness and recovery workflows
 */
export const requeueAnalysis = internalMutation({
  args: {
    analysisId: v.id('aiAnalysis'),
    retryCount: v.number(),
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
    error: v.string(),
    isTransientError: v.optional(v.boolean()),
    delayMs: v.optional(v.number()),
    errorClassification: v.optional(
      v.object({
        category: v.string(),
        retryable: v.boolean(),
        circuitBreakerImpact: v.boolean(),
        fallbackEligible: v.boolean(),
      })
    ),
    circuitBreakerState: v.optional(
      v.object({
        service: v.string(),
        state: v.union(
          v.literal('closed'),
          v.literal('open'),
          v.literal('half_open')
        ),
        failureCount: v.number(),
        lastReset: v.optional(v.number()),
      })
    ),
  },
  handler: async (
    ctx,
    {
      analysisId,
      retryCount,
      priority,
      error,
      isTransientError = true,
      delayMs,
      errorClassification,
      circuitBreakerState,
    }
  ) => {
    const analysis = await ctx.db.get(analysisId)
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }

    // Check circuit breaker status for enhanced decision making
    const currentCircuitStatus = await getCircuitBreakerHealthStatus(
      ctx,
      'gemini_2_5_flash_lite'
    )

    // Create retry context for advanced strategy calculation
    const retryContext = createRetryContext(
      {
        _id: analysisId,
        priority: analysis.priority,
        processingAttempts: retryCount,
        queuedAt: analysis.queuedAt,
        createdAt: analysis.createdAt,
        circuitBreakerState:
          circuitBreakerState?.state ||
          (currentCircuitStatus.isHealthy ? 'closed' : 'open'),
      },
      error
    )

    // Calculate optimal retry strategy using advanced logic with circuit breaker awareness
    const retryDecision = calculateRetryStrategy(retryContext)

    // Consider fallback analysis for failed items when circuit breaker is open or error is fallback eligible
    const shouldConsiderFallback =
      !currentCircuitStatus.isHealthy ||
      (errorClassification?.fallbackEligible && retryCount >= 1) ||
      (errorClassification?.category === 'service_error' && retryCount >= 2)

    if (shouldConsiderFallback && !retryDecision.shouldRetry) {
      // Check if fallback analysis should be used instead of dead letter queue
      const fallbackDecision = await shouldUseFallbackAnalysis(
        ctx,
        analysis.entryId,
        analysis.userId,
        `Requeue failed: ${error}`,
        retryCount
      )

      if (fallbackDecision.useFallback) {
        // Process with fallback analysis instead of moving to dead letter queue
        const fallbackResult = await handleFallbackInPipeline(ctx, {
          entryId: analysis.entryId,
          userId: analysis.userId,
          journalContent: '', // Will be fetched in fallback pipeline
          relationshipContext: undefined,
          retryCount,
          originalError: error,
          })

        return {
          status: 'fallback_processed',
          analysisId: fallbackResult.analysisId,
          fallbackUsed: true,
          fallbackReason: fallbackDecision.reason,
          circuitBreakerState: fallbackDecision.circuitBreakerState,
          retryCount,
          originalError: error,
        }
      }
    }

    // Check if we should retry based on advanced strategy
    if (!retryDecision.shouldRetry) {
      // Move to dead letter queue based on strategy recommendation
      await ctx.runMutation(internal.scheduler.queue_overflow.moveToDeadLetterQueue, {
        analysisId,
        reason:
          retryDecision.escalationReason ||
          'Retry strategy determined no retry should occur',
        metadata: {
          originalPriority: analysis.priority,
          retryCount,
          lastError: error,
          totalProcessingTime:
            Date.now() - (analysis.queuedAt || analysis.createdAt),
          errorClassification: retryDecision.errorClassification,
          retryDecision: {
            maxRetries: retryDecision.maxRetries,
            escalationReason: retryDecision.escalationReason,
          },
        },
      })

      return {
        status: 'moved_to_dead_letter_queue',
        retryCount,
        error:
          retryDecision.escalationReason || 'Maximum retry attempts exceeded',
        shouldTripCircuit: retryDecision.errorClassification.shouldTripCircuit,
        errorClassification: retryDecision.errorClassification,
      }
    }

    // Use strategy-determined priority and backoff delay, or provided values
    const upgradedPriority = retryDecision.newPriority
    const backoffDelay = delayMs || retryDecision.backoffDelayMs

    // Update processing attempts and error information with enhanced context
    await ctx.db.patch(analysisId, {
      processingAttempts: retryCount,
      lastErrorMessage: `${error} (error_type: ${errorClassification?.category || retryDecision.errorClassification.type}, circuit_state: ${circuitBreakerState?.state || (currentCircuitStatus.isHealthy ? 'closed' : 'open')})`,
      lastErrorType:
        (errorClassification?.category === 'validation' || errorClassification?.category === 'network' || errorClassification?.category === 'rate_limit' || errorClassification?.category === 'timeout' || errorClassification?.category === 'service_error' || errorClassification?.category === 'authentication' ? errorClassification.category : undefined),
      processingStartedAt: undefined, // Reset processing started time
      priority: upgradedPriority,
      queuedAt: Date.now(), // Reset queue time for proper aging
      // Store circuit breaker state metadata
      circuitBreakerState: circuitBreakerState || {
        service: 'gemini_2_5_flash_lite',
        state: currentCircuitStatus.isHealthy ? 'closed' : 'open',
        failureCount: currentCircuitStatus.metrics?.errorCount24h || 0,
        lastReset: currentCircuitStatus.metrics?.lastFailureTime,
      },
    })

    // Reschedule with strategy-calculated backoff delay using HTTP Actions
    await ctx.scheduler.runAfter(
      backoffDelay,
      internal.aiAnalysis.scheduleHttpAnalysis,
      {
        entryId: analysis.entryId as string,
        userId: analysis.userId as string,
        priority: upgradedPriority,
      }
    )

    return {
      status: 'requeued',
      retryCount,
      originalPriority: analysis.priority,
      upgradedPriority,
      backoffDelay,
      analysisId,
      scheduledAt: Date.now() + backoffDelay,
      shouldTripCircuit: retryDecision.errorClassification.shouldTripCircuit,
      errorClassification: {
        isRecoverable: retryDecision.errorClassification.isRecoverable,
        isTransient:
          isTransientError && retryDecision.errorClassification.isRecoverable,
        shouldTripCircuitBreaker:
          retryDecision.errorClassification.shouldTripCircuit,
        type: retryDecision.errorClassification.type,
      },
      retryStrategy: {
        maxRetries: retryDecision.maxRetries,
        calculatedDelay: backoffDelay,
        priorityUpgrade: analysis.priority !== upgradedPriority,
      },
    }
  },
})

/**
 * Get comprehensive queue status for real-time UI updates including circuit breaker and fallback information
 */
export const getQueueStatus = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    // Get current circuit breaker status for user display
    const circuitBreakerStatus = await getCircuitBreakerHealthStatus(
      ctx,
      'gemini_2_5_flash_lite'
    )
    // Get user's processing queue items
    const userQueueItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.eq(q.field('status'), 'processing'))
      .collect()

    // Get user's recent failed items (last 1 hour) for status updates
    const recentFailures = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'failed'),
          q.gt(q.field('createdAt'), Date.now() - 60 * 60 * 1000) // Last hour
        )
      )
      .collect()

    // Get user's recent completions (last 1 hour) for success rate calculation
    const recentCompletions = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'completed'),
          q.gt(q.field('createdAt'), Date.now() - 60 * 60 * 1000) // Last hour
        )
      )
      .collect()

    // Enhanced queue status with failure tracking
    const queueStatusItems = await Promise.all(
      userQueueItems.map(async item => {
        // Get all items with higher priority that were queued before this item
        const higherPriorityItems = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_status_priority', q => q.eq('status', 'processing'))
          .filter(q =>
            q.and(
              q.or(
                q.gt(q.field('priority'), item.priority || 'normal'),
                q.and(
                  q.eq(q.field('priority'), item.priority || 'normal'),
                  q.lt(q.field('queuedAt'), item.queuedAt || item.createdAt)
                )
              )
            )
          )
          .collect()

        // Estimate position in queue (approximate)
        const estimatedPosition = higherPriorityItems.length + 1

        // Estimate wait time based on priority and queue position
        const basePriorityDelay =
          PRIORITY_CRITERIA[item.priority || 'normal'].delay
        const estimatedWaitTime = basePriorityDelay + estimatedPosition * 2000 // 2 seconds per item ahead

        // Determine retry status and failure information
        const isRetry = (item.processingAttempts || 0) > 0
        const hasErrors = !!item.lastErrorMessage
        const isStuck =
          item.processingStartedAt &&
          Date.now() - item.processingStartedAt >
            QUEUE_CONFIG.DEFAULT_PROCESSING_TIMEOUT

        return {
          entryId: item.entryId,
          analysisId: item._id,
          priority: item.priority || 'normal',
          status: item.status,
          queuedAt: item.queuedAt || item.createdAt,
          processingStartedAt: item.processingStartedAt,
          estimatedPosition,
          estimatedWaitTime,
          currentWaitTime: Date.now() - (item.queuedAt || item.createdAt),
          processingAttempts: item.processingAttempts || 0,
          lastErrorMessage: item.lastErrorMessage,
          lastErrorType: item.lastErrorType,
          retryStatus: {
            isRetry,
            hasErrors,
            isStuck,
            nextRetryEligible: isRetry && hasErrors && !isStuck,
            estimatedNextRetry: isRetry
              ? Date.now() + Math.pow(2, item.processingAttempts || 0) * 1000
              : null,
          },
          // Enhanced with circuit breaker and fallback information
          circuitBreakerInfo: {
            currentState: circuitBreakerStatus.isHealthy ? 'closed' : 'open',
            itemState: item.circuitBreakerState?.state || 'unknown',
            canExecute: circuitBreakerStatus.isHealthy,
            failureCount: circuitBreakerStatus.metrics?.errorCount24h || 0,
            lastUpdate: circuitBreakerStatus.metrics?.lastFailureTime,
          },
          fallbackInfo: {
            usedFallback: item.fallbackUsed || false,
            fallbackEligible:
              item.lastErrorType === 'service_error' ||
              item.lastErrorType === 'rate_limit',
            fallbackConfidence: item.fallbackConfidence,
            fallbackMethod: item.fallbackMethod,
            canUseFallback:
              !circuitBreakerStatus.isHealthy ||
              (item.processingAttempts || 0) >= 2,
          },
          healthIndicators: {
            priority: item.priority || 'normal',
            waitTimeExceedsTarget:
              Date.now() - (item.queuedAt || item.createdAt) >
              PRIORITY_CRITERIA[item.priority || 'normal'].maxWaitTime,
            processingTimeExceedsTarget: item.processingStartedAt
              ? Date.now() - item.processingStartedAt >
                PRIORITY_CRITERIA[item.priority || 'normal'].slaTarget
              : false,
            circuitBreakerImpact: !circuitBreakerStatus.isHealthy,
            fallbackAvailable:
              !circuitBreakerStatus.isHealthy ||
              (item.processingAttempts || 0) >= 1,
          },
        }
      })
    )

    // Enhanced failure analysis
    const failureAnalysis = recentFailures.map(failure => ({
      analysisId: failure._id,
      entryId: failure.entryId,
      failedAt: failure.createdAt,
      reason: failure.lastErrorMessage,
      retryCount: failure.processingAttempts || 0,
      priority: failure.priority || 'normal',
      isDeadLetter: failure.deadLetterQueue || false,
      deadLetterCategory: failure.deadLetterCategory,
      isRecoverable: isRecoverableError(failure.lastErrorMessage || ''),
      autoRequeueEligible:
        (failure.processingAttempts || 0) < 3 &&
        isRecoverableError(failure.lastErrorMessage || '') &&
        !failure.deadLetterQueue,
    }))

    // Get overall queue health metrics
    const totalQueuedItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status', q => q.eq('status', 'processing'))
      .collect()

    const capacityUtilization =
      (totalQueuedItems.length / QUEUE_CONFIG.MAX_QUEUE_SIZE) * 100
    const averageWaitTime =
      totalQueuedItems.length > 0
        ? totalQueuedItems.reduce(
            (sum, item) =>
              sum + (Date.now() - (item.queuedAt || item.createdAt)),
            0
          ) / totalQueuedItems.length
        : 0

    // Calculate user-specific success rate
    const totalRecentAttempts = recentFailures.length + recentCompletions.length
    const successRate =
      totalRecentAttempts > 0
        ? (recentCompletions.length / totalRecentAttempts) * 100
        : 100

    return {
      userItems: queueStatusItems,
      failureAnalysis: {
        recentFailures: failureAnalysis,
        totalFailures: recentFailures.length,
        recoverableFailures: failureAnalysis.filter(f => f.isRecoverable)
          .length,
        deadLetterItems: failureAnalysis.filter(f => f.isDeadLetter).length,
        autoRequeueEligible: failureAnalysis.filter(f => f.autoRequeueEligible)
          .length,
      },
      performanceMetrics: {
        recentSuccesses: recentCompletions.length,
        recentFailures: recentFailures.length,
        successRate: Math.round(successRate * 100) / 100,
        avgRetryAttempts:
          recentFailures.length > 0
            ? recentFailures.reduce(
                (sum, f) => sum + (f.processingAttempts || 0),
                0
              ) / recentFailures.length
            : 0,
      },
      queueHealth: {
        totalQueued: totalQueuedItems.length,
        capacityUtilization: Math.round(capacityUtilization * 100) / 100,
        averageWaitTime: Math.round(averageWaitTime),
        isHealthy: capacityUtilization < 80 && averageWaitTime < 120000, // Less than 2 minutes
        needsAttention:
          failureAnalysis.filter(f => !f.isRecoverable).length > 0,
      },
      // Enhanced with circuit breaker and fallback status
      systemStatus: {
        circuitBreaker: {
          isHealthy: circuitBreakerStatus.isHealthy,
          status: circuitBreakerStatus.status,
          errorCount24h: circuitBreakerStatus.metrics?.errorCount24h || 0,
          successCount24h: circuitBreakerStatus.metrics?.successCount24h || 0,
          failureRate: circuitBreakerStatus.metrics?.failureRate || 0,
          lastFailureTime: circuitBreakerStatus.metrics?.lastFailureTime,
          recommendations: circuitBreakerStatus.recommendations || [],
          alerts: circuitBreakerStatus.alerts || [],
        },
        fallbackAnalysis: {
          available: true,
          recentFallbacks: recentCompletions.filter(c => c.fallbackUsed).length,
          avgFallbackConfidence:
            recentCompletions
              .filter(c => c.fallbackUsed && c.fallbackConfidence)
              .reduce((sum, c) => sum + (c.fallbackConfidence || 0), 0) /
            Math.max(1, recentCompletions.filter(c => c.fallbackUsed).length),
          fallbackSuccessRate:
            (recentCompletions.filter(c => c.fallbackUsed).length /
              Math.max(
                1,
                recentFailures.filter(f => (f as any).autoRequeueEligible).length +
                  recentCompletions.filter(c => c.fallbackUsed).length
              )) *
            100,
        },
        recovery: {
          autoRecoveryActive:
            !circuitBreakerStatus.isHealthy &&
            circuitBreakerStatus.status !== 'critical',
          recoveryProcessingItems: queueStatusItems.filter(
            item => item.retryStatus.isRetry
          ).length,
          estimatedRecoveryTime: !circuitBreakerStatus.isHealthy
            ? Math.max(
                ...(circuitBreakerStatus.alerts?.map(
                  a => (a as any).estimatedRecoveryTime || 300000
                ) || [300000])
              )
            : null,
          fallbackItemsEligibleForUpgrade: recentCompletions.filter(
            c => c.fallbackUsed && (c.fallbackConfidence || 0) < 0.7
          ).length,
        },
      },
      timestamp: Date.now(),
    }
  },
})

/**
 * Get real-time failure notifications for queue-aware status updates
 */
export const getFailureNotifications = query({
  args: {
    userId: v.id('users'),
    since: v.optional(v.number()), // Timestamp to get notifications since
  },
  handler: async (ctx, { userId, since = Date.now() - 5 * 60 * 1000 }) => {
    // Get recent failures since the specified time
    const recentFailures = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'failed'),
          q.gt(q.field('createdAt'), since)
        )
      )
      .collect()

    // Get recent requeuings (items that were failed but are now processing again)
    const recentRequeuings = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'processing'),
          q.gt(q.field('processingAttempts'), 0),
          q.gt(q.field('queuedAt'), since)
        )
      )
      .collect()

    // Get recent dead letter queue escalations
    const recentDeadLetterEscalations = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q =>
        q.and(
          q.eq(q.field('status'), 'failed'),
          q.eq(q.field('deadLetterQueue'), true),
          q.gt(q.field('deadLetterTimestamp'), since)
        )
      )
      .collect()

    // Create structured notifications
    const failureNotifications = recentFailures.map(failure => ({
      type: 'failure' as const,
      timestamp: failure.createdAt,
      analysisId: failure._id,
      entryId: failure.entryId,
      priority: failure.priority || 'normal',
      message: `Analysis failed: ${failure.lastErrorMessage}`,
      retryCount: failure.processingAttempts || 0,
      isRecoverable: isRecoverableError(failure.lastErrorMessage || ''),
      action:
        (failure.processingAttempts || 0) < 3 &&
        isRecoverableError(failure.lastErrorMessage || '')
          ? 'auto_retry_scheduled'
          : 'moved_to_dead_letter',
      metadata: {
        errorType: failure.lastErrorMessage?.toLowerCase().includes('timeout')
          ? 'timeout'
          : failure.lastErrorMessage?.toLowerCase().includes('network')
            ? 'network'
            : failure.lastErrorMessage?.toLowerCase().includes('validation')
              ? 'validation'
              : 'unknown',
        canRetry:
          !failure.deadLetterQueue && (failure.processingAttempts || 0) < 3,
      },
    }))

    const requeueNotifications = recentRequeuings.map(requeue => ({
      type: 'requeue' as const,
      timestamp: requeue.queuedAt || requeue.createdAt,
      analysisId: requeue._id,
      entryId: requeue.entryId,
      priority: requeue.priority || 'normal',
      message: `Analysis requeued for retry (attempt ${requeue.processingAttempts})`,
      retryCount: requeue.processingAttempts || 0,
      action: 'processing',
      metadata: {
        previousFailure: requeue.lastErrorMessage,
        estimatedCompletion:
          Date.now() +
          PRIORITY_CRITERIA[requeue.priority || 'normal'].slaTarget,
      },
    }))

    const deadLetterNotifications = recentDeadLetterEscalations.map(
      escalation => ({
        type: 'dead_letter' as const,
        timestamp: escalation.deadLetterTimestamp || escalation.createdAt,
        analysisId: escalation._id,
        entryId: escalation.entryId,
        priority: escalation.priority || 'normal',
        message: `Analysis permanently failed: ${escalation.deadLetterReason}`,
        retryCount: escalation.processingAttempts || 0,
        action: 'requires_manual_intervention',
        metadata: {
          category: escalation.deadLetterCategory,
          finalError: escalation.lastErrorMessage,
          needsInvestigation:
            escalation.deadLetterMetadata?.isServiceError || false,
        },
      })
    )

    // Combine and sort all notifications by timestamp
    const allNotifications = [
      ...failureNotifications,
      ...requeueNotifications,
      ...deadLetterNotifications,
    ].sort((a, b) => b.timestamp - a.timestamp)

    return {
      notifications: allNotifications,
      summary: {
        totalNotifications: allNotifications.length,
        failures: failureNotifications.length,
        requeues: requeueNotifications.length,
        deadLetterEscalations: deadLetterNotifications.length,
        recoverableFailures: failureNotifications.filter(n => n.isRecoverable)
          .length,
        needsAttention: deadLetterNotifications.length,
      },
      since,
      timestamp: Date.now(),
    }
  },
})

/**
 * Internal wrapper for checkQueueCapacity from queue-overflow.ts
 */
export const checkQueueCapacityInternal: any = internalQuery({
  args: {
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    // Call the function from queue-overflow module via scheduler
    return await ctx.runQuery(internal.scheduler.queue_overflow.checkQueueCapacity, args)
  },
})

/**
 * Cancel queued analysis (user-initiated cancellation)
 */
export const cancelQueuedAnalysis = internalMutation({
  args: {
    analysisId: v.id('aiAnalysis'),
    userId: v.id('users'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { analysisId, userId, reason = 'User cancelled' }) => {
    const analysis = await ctx.db.get(analysisId)
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found`)
    }

    // Verify user owns this analysis request
    if (analysis.userId !== userId) {
      throw new Error(
        'Unauthorized: You can only cancel your own analysis requests'
      )
    }

    // Check if cancellation is allowed based on current status
    if (analysis.status === 'completed') {
      return {
        status: 'cannot_cancel',
        message: 'Analysis has already completed successfully',
        currentStatus: analysis.status,
      }
    }

    if (analysis.status === 'failed') {
      return {
        status: 'already_cancelled',
        message: 'Analysis has already failed or been cancelled',
        currentStatus: analysis.status,
      }
    }

    // Allow cancellation if still in processing state, even if started
    // (users should be able to cancel long-running processes)
    const wasProcessingStarted = !!analysis.processingStartedAt
    const totalWaitTime = Date.now() - (analysis.queuedAt || analysis.createdAt)

    // Update status to failed with cancellation reason
    await ctx.db.patch(analysisId, {
      status: 'failed',
      lastErrorMessage: `Cancelled by user: ${reason}`,
      totalProcessingTime: totalWaitTime,
    })

    return {
      status: 'cancelled',
      analysisId,
      reason,
      wasProcessingStarted,
      totalWaitTime,
      refundEligible: !wasProcessingStarted, // Could be used for premium user credits
    }
  },
})

/**
 * Purge expired queue items for maintenance
 */
export const purgeExpiredQueue = internalMutation({
  args: {
    maxAgeMs: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { maxAgeMs = QUEUE_CONFIG.MAX_ITEM_AGE_MS, dryRun = false }
  ) => {
    const cutoffTime = Date.now() - maxAgeMs

    // Find expired items in various states
    const expiredProcessing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_created', q => q.eq('status', 'processing'))
      .filter(q => q.lt(q.field('createdAt'), cutoffTime))
      .collect()

    // Find orphaned items (processing started but never completed)
    const stuckProcessing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .filter(q =>
        q.and(
          q.neq(q.field('processingStartedAt'), undefined),
          q.lt(
            q.field('processingStartedAt'),
            Date.now() - QUEUE_CONFIG.DEFAULT_PROCESSING_TIMEOUT
          )
        )
      )
      .collect()

    const allExpiredItems = [...expiredProcessing, ...stuckProcessing]
    const uniqueExpiredItems = Array.from(
      new Map(allExpiredItems.map(item => [item._id, item])).values()
    )

    if (dryRun) {
      return {
        status: 'dry_run',
        wouldPurgeCount: uniqueExpiredItems.length,
        expiredProcessing: expiredProcessing.length,
        stuckProcessing: stuckProcessing.length,
        cutoffTime,
        details: uniqueExpiredItems.map(item => ({
          analysisId: item._id,
          userId: item.userId,
          entryId: item.entryId,
          status: item.status,
          createdAt: item.createdAt,
          queuedAt: item.queuedAt,
          processingStartedAt: item.processingStartedAt,
          age: Date.now() - item.createdAt,
          reason: expiredProcessing.some(i => i._id === item._id)
            ? 'expired'
            : 'stuck',
        })),
      }
    }

    let purgedCount = 0
    const purgedDetails = []

    for (const item of uniqueExpiredItems) {
      const age = Date.now() - item.createdAt
      const isStuck = stuckProcessing.some(i => i._id === item._id)
      const reason = isStuck
        ? 'Processing timeout exceeded'
        : 'Queue item expired'

      await ctx.db.patch(item._id, {
        status: 'failed',
        lastErrorMessage: `${reason} - maximum age exceeded (${Math.round(age / 60000)} minutes)`,
        totalProcessingTime: Date.now() - (item.queuedAt || item.createdAt),
      })

      purgedDetails.push({
        analysisId: item._id,
        userId: item.userId,
        entryId: item.entryId,
        age,
        reason,
      })

      purgedCount++
    }

    return {
      status: 'completed',
      purgedCount,
      expiredProcessing: expiredProcessing.length,
      stuckProcessing: stuckProcessing.length,
      cutoffTime,
      maxAgeMs,
      details: purgedDetails,
      message: `Purged ${purgedCount} expired/stuck queue items`,
    }
  },
})

/**
 * Get queue status and metrics (internal)
 */
export const getQueueMetrics = internalQuery({
  handler: async ctx => {
    const queueStats = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status', q => q.eq('status', 'processing'))
      .collect()

    const priorityBreakdown = queueStats.reduce(
      (acc, item) => {
        const priority = item.priority || 'normal'
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const averageWaitTime =
      queueStats.length > 0
        ? queueStats.reduce((sum, item) => {
            return sum + (Date.now() - (item.queuedAt || item.createdAt))
          }, 0) / queueStats.length
        : 0

    const oldestItemAge =
      queueStats.length > 0
        ? Math.max(
            ...queueStats.map(
              item => Date.now() - (item.queuedAt || item.createdAt)
            )
          )
        : 0

    return {
      totalQueued: queueStats.length,
      maxCapacity: QUEUE_CONFIG.MAX_QUEUE_SIZE,
      capacityUtilization:
        (queueStats.length / QUEUE_CONFIG.MAX_QUEUE_SIZE) * 100,
      priorityBreakdown,
      averageWaitTime,
      oldestItemAge,
      processingCapacity: QUEUE_CONFIG.MAX_CONCURRENT_PROCESSING,
      isNearCapacity: queueStats.length > QUEUE_CONFIG.MAX_QUEUE_SIZE * 0.8,
    }
  },
})

/**
 * Process queue with weighted priority-based scheduling
 */
export const processQueueWithWeights = internalMutation({
  args: {
    maxBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, { maxBatchSize = 10 }) => {
    // Get all queued items sorted by priority and age
    const queuedItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .filter(q => q.eq(q.field('processingStartedAt'), undefined))
      .collect()

    if (queuedItems.length === 0) {
      return { processed: 0, message: 'No items in queue' }
    }

    // Check system capacity
    const activeProcessing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_processing_started')
      .filter(q => q.neq(q.field('processingStartedAt'), undefined))
      .filter(q => q.eq(q.field('status'), 'processing'))
      .collect()

    const availableCapacity =
      QUEUE_CONFIG.MAX_CONCURRENT_PROCESSING - activeProcessing.length
    if (availableCapacity <= 0) {
      return { processed: 0, message: 'At capacity, no processing available' }
    }

    // Apply weighted priority scheduling
    const weightedItems = queuedItems.map(item => {
      const priorityValue = getPriorityValue(item.priority || 'normal')
      const ageBonus = Math.min(
        (Date.now() - (item.queuedAt || item.createdAt)) / 60000,
        5
      ) // Max 5 points for age
      const weight = priorityValue * 10 + ageBonus

      return { ...item, weight }
    })

    // Sort by weight (highest first) and take up to available capacity
    const itemsToProcess = weightedItems
      .sort((a, b) => b.weight - a.weight)
      .slice(0, Math.min(availableCapacity, maxBatchSize))

    const processedItems = []

    // Process each item
    for (const item of itemsToProcess) {
      try {
        // Check for priority upgrades due to aging
        const currentPriority = item.priority || 'normal'
        const upgradedPriority = shouldUpgradePriority(
          currentPriority,
          item.queuedAt || item.createdAt
        )

        // Update processing status
        await ctx.db.patch(item._id, {
          processingStartedAt: Date.now(),
          priority: upgradedPriority,
        })

        // Schedule processing with upgraded priority
        const delay = PRIORITY_CRITERIA[upgradedPriority].delay
        await ctx.scheduler.runAfter(
          delay,
          internal.aiAnalysis.scheduleHttpAnalysis,
          {
            entryId: item.entryId,
            userId: item.userId,
            priority: upgradedPriority,
          }
        )

        processedItems.push({
          analysisId: item._id,
          originalPriority: currentPriority,
          upgradedPriority,
          weight: item.weight,
          scheduledDelay: delay,
        })
      } catch (error) {
        console.error(`Failed to process queue item ${item._id}:`, error)
      }
    }

    return {
      processed: processedItems.length,
      details: processedItems,
      availableCapacity,
      queueLength: queuedItems.length,
    }
  },
})

/**
 * Automatically requeue failed analyses with transient errors
 */
export const autoRequeueTransientFailures = internalMutation({
  args: {
    maxAge: v.optional(v.number()), // Max age in milliseconds for failed items to consider
    batchSize: v.optional(v.number()), // Max number of items to requeue per run
  },
  handler: async (ctx, { maxAge = 30 * 60 * 1000, batchSize = 10 }) => {
    const cutoffTime = Date.now() - maxAge

    // Find recently failed analyses that might have transient errors
    const failedAnalyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status', q => q.eq('status', 'failed'))
      .filter(q =>
        q.and(
          q.gt(q.field('createdAt'), cutoffTime), // Only recent failures
          q.lt(q.field('processingAttempts'), 3), // Haven't exhausted retries
          q.neq(q.field('lastErrorMessage'), undefined) // Have error message
        )
      )
      .collect()

    if (failedAnalyses.length === 0) {
      return {
        status: 'no_candidates',
        message: 'No failed analyses with transient errors found',
        checkedCutoff: cutoffTime,
      }
    }

    const requeuedItems = []
    const skippedItems = []

    // Process failed items up to batch size
    for (const analysis of failedAnalyses.slice(0, batchSize)) {
      const errorMessage = analysis.lastErrorMessage || 'Unknown error'
      const errorIsRecoverable = isRecoverableError(errorMessage)
      const retryCount = analysis.processingAttempts || 0

      // Only requeue if error is recoverable and we haven't exceeded retry limits
      if (errorIsRecoverable && retryCount < 3) {
        try {
          // Create retry context and calculate strategy
          const retryContext = createRetryContext(
            {
              _id: analysis._id,
              priority: analysis.priority,
              processingAttempts: retryCount,
              queuedAt: analysis.queuedAt,
              createdAt: analysis.createdAt,
            },
            errorMessage
          )

          const retryDecision = calculateRetryStrategy(retryContext)

          if (retryDecision.shouldRetry) {
            // Reset status to processing for requeuing
            await ctx.db.patch(analysis._id, {
              status: 'processing',
              processingStartedAt: undefined,
              processingAttempts: retryCount + 1,
              priority: retryDecision.newPriority,
              queuedAt: Date.now(),
              lastErrorMessage: `Auto-requeued: ${errorMessage}`,
            })

            // Schedule retry with calculated backoff
            await ctx.scheduler.runAfter(
              retryDecision.backoffDelayMs,
              internal.aiAnalysis.scheduleHttpAnalysis,
              {
                entryId: analysis.entryId,
                userId: analysis.userId,
                priority: retryDecision.newPriority,
              }
            )

            requeuedItems.push({
              analysisId: analysis._id,
              entryId: analysis.entryId,
              originalPriority: analysis.priority,
              newPriority: retryDecision.newPriority,
              retryCount: retryCount + 1,
              backoffDelay: retryDecision.backoffDelayMs,
              errorType: retryDecision.errorClassification.type,
              scheduledAt: Date.now() + retryDecision.backoffDelayMs,
            })
          } else {
            skippedItems.push({
              analysisId: analysis._id,
              reason:
                retryDecision.escalationReason || 'Retry strategy declined',
              retryCount,
            })
          }
        } catch (error) {
          console.error(
            `Failed to auto-requeue analysis ${analysis._id}:`,
            error
          )
          skippedItems.push({
            analysisId: analysis._id,
            reason: `Requeue error: ${error instanceof Error ? error.message : 'Unknown'}`,
            retryCount,
          })
        }
      } else {
        skippedItems.push({
          analysisId: analysis._id,
          reason: errorIsRecoverable
            ? 'Maximum retries exceeded'
            : 'Non-recoverable error',
          retryCount,
          errorIsRecoverable,
        })
      }
    }

    return {
      status: 'completed',
      requeued: requeuedItems.length,
      skipped: skippedItems.length,
      totalCandidates: failedAnalyses.length,
      processedBatch: Math.min(batchSize, failedAnalyses.length),
      details: {
        requeuedItems,
        skippedItems: skippedItems.slice(0, 5), // Limit details to avoid large responses
      },
      nextRunRecommended: failedAnalyses.length > batchSize,
    }
  },
})

/**
 * Upgrade aging requests in the queue
 */
export const upgradeAgingRequests = internalMutation({
  args: {},
  handler: async ctx => {
    // Find items that have been waiting too long
    const agingItems = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_status_priority', q => q.eq('status', 'processing'))
      .filter(q => q.eq(q.field('processingStartedAt'), undefined))
      .collect()

    const upgradedItems = []

    for (const item of agingItems) {
      const currentPriority = item.priority || 'normal'
      const upgradedPriority = shouldUpgradePriority(
        currentPriority,
        item.queuedAt || item.createdAt
      )

      if (upgradedPriority !== currentPriority) {
        await ctx.db.patch(item._id, {
          priority: upgradedPriority,
        })

        upgradedItems.push({
          analysisId: item._id,
          originalPriority: currentPriority,
          upgradedPriority,
          waitTime: Date.now() - (item.queuedAt || item.createdAt),
        })
      }
    }

    return {
      upgraded: upgradedItems.length,
      details: upgradedItems,
    }
  },
})
