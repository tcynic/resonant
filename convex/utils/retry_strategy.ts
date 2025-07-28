/**
 * Advanced retry strategy utilities for queue-based processing
 * Integrates circuit breaker patterns with intelligent backoff
 */

import { RETRY_CONFIG } from '../scheduler/queue_config'
import { shouldTripCircuitBreaker, isRecoverableError } from './circuit_breaker'

export type QueuePriority = 'normal' | 'high' | 'urgent'

export interface RetryContext {
  priority: QueuePriority
  error: string
  retryCount: number
  originalPriority: QueuePriority
  totalWaitTime: number
  analysisId: string
}

export interface RetryDecision {
  shouldRetry: boolean
  newPriority: QueuePriority
  backoffDelayMs: number
  maxRetries: number
  escalationReason?: string
  errorClassification: {
    type: string
    isServiceError: boolean
    isRecoverable: boolean
    shouldTripCircuit: boolean
  }
}

/**
 * Classify error type for retry strategy
 */
export function classifyError(error: string): string {
  const lowerError = error.toLowerCase()

  if (lowerError.includes('timeout') || lowerError.includes('timed out'))
    return 'timeout'
  if (lowerError.includes('network') || lowerError.includes('connection'))
    return 'network'
  if (lowerError.includes('rate limit') || lowerError.includes('quota'))
    return 'rate_limit'
  if (lowerError.includes('service') || lowerError.includes('server error'))
    return 'service_error'
  if (lowerError.includes('validation') || lowerError.includes('invalid'))
    return 'validation'
  if (lowerError.includes('auth') || lowerError.includes('unauthorized'))
    return 'authentication'
  if (lowerError.includes('api') || lowerError.includes('gemini'))
    return 'service_error'

  return 'unknown'
}

/**
 * Determine optimal retry strategy based on error context
 */
export function calculateRetryStrategy(context: RetryContext): RetryDecision {
  const { priority, error, retryCount, originalPriority, totalWaitTime } =
    context

  // Classify the error
  const errorType = classifyError(error)
  const isServiceError = shouldTripCircuitBreaker(error)
  const isRecoverable = isRecoverableError(error)
  const shouldTripCircuit = isServiceError

  const errorClassification = {
    type: errorType,
    isServiceError,
    isRecoverable,
    shouldTripCircuit,
  }

  // Get error-specific configuration
  const errorConfig = RETRY_CONFIG.ERROR_TYPE_CONFIG[
    errorType as keyof typeof RETRY_CONFIG.ERROR_TYPE_CONFIG
  ] || {
    maxRetries: RETRY_CONFIG.MAX_RETRY_ATTEMPTS,
    backoffMultiplier: 1,
    upgradeAfterAttempts: 2,
  }

  // Get priority-specific retry limits
  const priorityMaxRetries =
    RETRY_CONFIG.PRIORITY_RETRY_LIMITS[priority] ||
    RETRY_CONFIG.MAX_RETRY_ATTEMPTS

  // Determine effective max retries (minimum of error-specific and priority-specific)
  const maxRetries = Math.min(errorConfig.maxRetries, priorityMaxRetries)

  // Check if we should retry
  const shouldRetry = isRecoverable && retryCount < maxRetries

  if (!shouldRetry) {
    return {
      shouldRetry: false,
      newPriority: priority,
      backoffDelayMs: 0,
      maxRetries,
      escalationReason: !isRecoverable
        ? 'Non-recoverable error'
        : 'Maximum retry attempts exceeded',
      errorClassification,
    }
  }

  // Calculate new priority based on retry count and error severity
  let newPriority = priority

  if (isServiceError) {
    // Aggressive priority upgrade for service errors
    if (
      retryCount >= errorConfig.upgradeAfterAttempts &&
      priority === 'normal'
    ) {
      newPriority = 'high'
    } else if (
      retryCount >= errorConfig.upgradeAfterAttempts + 1 &&
      priority === 'high'
    ) {
      newPriority = 'urgent'
    }
  } else {
    // Standard priority upgrade for client errors
    if (
      retryCount >= errorConfig.upgradeAfterAttempts + 1 &&
      priority === 'normal'
    ) {
      newPriority = 'high'
    } else if (
      retryCount >= errorConfig.upgradeAfterAttempts + 2 &&
      priority === 'high'
    ) {
      newPriority = 'urgent'
    }
  }

  // Calculate backoff delay
  const backoffDelayMs = calculateBackoffDelay({
    retryCount,
    errorType,
    priority: newPriority,
    isServiceError,
    errorConfig,
  })

  return {
    shouldRetry: true,
    newPriority,
    backoffDelayMs,
    maxRetries,
    errorClassification,
  }
}

/**
 * Calculate intelligent backoff delay
 */
function calculateBackoffDelay(params: {
  retryCount: number
  errorType: string
  priority: QueuePriority
  isServiceError: boolean
  errorConfig: { backoffMultiplier: number }
}): number {
  const { retryCount, errorType, priority, isServiceError, errorConfig } =
    params

  // Base exponential backoff
  let baseDelay = Math.pow(RETRY_CONFIG.RETRY_BACKOFF_BASE, retryCount) * 1000

  // Apply error-specific multiplier
  baseDelay *= errorConfig.backoffMultiplier

  // Apply circuit breaker multiplier for service errors
  if (isServiceError) {
    baseDelay *= RETRY_CONFIG.SERVICE_ERROR_BACKOFF_MULTIPLIER
  } else {
    baseDelay *= RETRY_CONFIG.CLIENT_ERROR_BACKOFF_MULTIPLIER
  }

  // Priority-based adjustment (urgent items get slightly shorter delays)
  switch (priority) {
    case 'urgent':
      baseDelay *= 0.8 // 20% reduction
      break
    case 'high':
      baseDelay *= 0.9 // 10% reduction
      break
    case 'normal':
      // No adjustment
      break
  }

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * RETRY_CONFIG.JITTER_MAX_MS
  const finalDelay = baseDelay + jitter

  // Ensure we don't exceed maximum delay
  return Math.min(finalDelay, RETRY_CONFIG.MAX_RETRY_DELAY)
}

/**
 * Create retry context from queue analysis item
 */
export function createRetryContext(
  analysis: {
    _id: string
    priority?: string
    processingAttempts?: number
    queuedAt?: number
    createdAt: number
  },
  error: string
): RetryContext {
  const priority = (analysis.priority || 'normal') as QueuePriority
  const retryCount = analysis.processingAttempts || 0
  const totalWaitTime = Date.now() - (analysis.queuedAt || analysis.createdAt)

  return {
    priority,
    error,
    retryCount,
    originalPriority: priority,
    totalWaitTime,
    analysisId: analysis._id,
  }
}

/**
 * Generate retry recommendation for monitoring
 */
export function getRetryRecommendation(decision: RetryDecision): string {
  if (!decision.shouldRetry) {
    return decision.escalationReason || 'No retry recommended'
  }

  const { errorClassification, newPriority, backoffDelayMs } = decision
  const delaySeconds = Math.round(backoffDelayMs / 1000)

  let recommendation = `Retry with ${newPriority} priority after ${delaySeconds}s delay`

  if (errorClassification.isServiceError) {
    recommendation += ' (service error - circuit breaker aware)'
  }

  if (errorClassification.type !== 'unknown') {
    recommendation += ` (${errorClassification.type})`
  }

  return recommendation
}

/**
 * Validate retry configuration
 */
export function validateRetryConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check basic constraints
  if (RETRY_CONFIG.MAX_RETRY_ATTEMPTS < 1) {
    issues.push('MAX_RETRY_ATTEMPTS must be at least 1')
  }

  if (RETRY_CONFIG.RETRY_BACKOFF_BASE < 1) {
    issues.push('RETRY_BACKOFF_BASE must be at least 1')
  }

  if (RETRY_CONFIG.MAX_RETRY_DELAY < 1000) {
    issues.push('MAX_RETRY_DELAY must be at least 1 second')
  }

  // Check priority limits
  const priorities = Object.keys(RETRY_CONFIG.PRIORITY_RETRY_LIMITS)
  for (const priority of priorities) {
    const limit =
      RETRY_CONFIG.PRIORITY_RETRY_LIMITS[
        priority as keyof typeof RETRY_CONFIG.PRIORITY_RETRY_LIMITS
      ]
    if (limit < 0) {
      issues.push(`Priority ${priority} retry limit cannot be negative`)
    }
  }

  // Check error type configs
  const errorTypes = Object.keys(RETRY_CONFIG.ERROR_TYPE_CONFIG)
  for (const errorType of errorTypes) {
    const config =
      RETRY_CONFIG.ERROR_TYPE_CONFIG[
        errorType as keyof typeof RETRY_CONFIG.ERROR_TYPE_CONFIG
      ]
    if (config.maxRetries < 0) {
      issues.push(`Error type ${errorType} maxRetries cannot be negative`)
    }
    if (config.backoffMultiplier < 0) {
      issues.push(
        `Error type ${errorType} backoffMultiplier cannot be negative`
      )
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}
