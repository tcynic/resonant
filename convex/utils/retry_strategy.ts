/**
 * Advanced retry strategy utilities for queue-based processing
 * Integrates circuit breaker patterns with intelligent backoff
 */

import { RETRY_CONFIG } from '../scheduler/queue_config'
import {
  shouldTripCircuitBreaker,
  isRecoverableError,
  getCircuitBreakerStatus,
} from './circuit_breaker'

export type QueuePriority = 'normal' | 'high' | 'urgent'

export interface RetryContext {
  priority: QueuePriority
  error: string
  retryCount: number
  originalPriority: QueuePriority
  totalWaitTime: number
  analysisId: string
  circuitBreakerState?: 'closed' | 'open' | 'half_open'
  lastAttemptTimestamp?: number
  retryHistory?: RetryAttempt[]
  adaptiveBackoffFactor?: number
}

export interface RetryAttempt {
  attempt: number
  timestamp: number
  delayMs: number
  errorType: string
  errorMessage: string
  circuitBreakerState: string
  jitterType?: string
  adaptiveBackoffFactor?: number
}

export interface RetryDecision {
  shouldRetry: boolean
  newPriority: QueuePriority
  backoffDelayMs: number
  maxRetries: number
  escalationReason?: string
  adaptiveBackoffFactor?: number
  jitterType?: 'full' | 'equal' | 'decorrelated' | 'exponential'
  errorClassification: {
    type: string
    isServiceError: boolean
    isRecoverable: boolean
    shouldTripCircuit: boolean
    fallbackEligible?: boolean
  }
  retryAttempt?: RetryAttempt
}

/**
 * Enhanced error classification for retry strategy with fallback eligibility
 */
const ENHANCED_ERROR_CATEGORIES = {
  network: {
    retryable: true,
    maxRetries: 3,
    backoffMultiplier: 2,
    fallbackEligible: true,
    circuitBreakerImpact: true,
  },
  rate_limit: {
    retryable: true,
    maxRetries: 5,
    backoffMultiplier: 3,
    fallbackEligible: true,
    customDelay: (attempt: number) =>
      Math.min(60000, 1000 * Math.pow(3, attempt)),
  },
  timeout: {
    retryable: true,
    maxRetries: 2,
    backoffMultiplier: 1.5,
    fallbackEligible: true,
    circuitBreakerImpact: true,
  },
  validation: {
    retryable: false,
    fallbackEligible: false,
    userActionRequired: true,
  },
  authentication: {
    retryable: false,
    fallbackEligible: false,
    systemActionRequired: true,
  },
  service_error: {
    retryable: true,
    maxRetries: 2,
    backoffMultiplier: 2,
    fallbackEligible: true,
    circuitBreakerImpact: true,
  },
} as const

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
 * Check if error type is eligible for fallback analysis
 */
export function isFallbackEligible(errorType: string): boolean {
  return (
    ENHANCED_ERROR_CATEGORIES[
      errorType as keyof typeof ENHANCED_ERROR_CATEGORIES
    ]?.fallbackEligible || false
  )
}

/**
 * Determine optimal retry strategy based on error context
 */
export function calculateRetryStrategy(context: RetryContext): RetryDecision {
  const {
    priority,
    error,
    retryCount,
    originalPriority,
    totalWaitTime,
    circuitBreakerState,
  } = context

  // Classify the error
  const errorType = classifyError(error)
  const isServiceError = shouldTripCircuitBreaker(error)
  const isRecoverable = isRecoverableError(error)
  const shouldTripCircuit = isServiceError
  const fallbackEligible = isFallbackEligible(errorType)

  const errorClassification = {
    type: errorType,
    isServiceError,
    isRecoverable,
    shouldTripCircuit,
    fallbackEligible,
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

  // Calculate enhanced adaptive backoff factor based on circuit breaker state and error patterns
  let adaptiveBackoffFactor =
    context.adaptiveBackoffFactor || calculateAdaptiveBackoffFactor(context)

  // Apply circuit breaker multipliers
  if (circuitBreakerState === 'open') {
    adaptiveBackoffFactor *= 3 // Significantly longer delays when circuit is open
  } else if (circuitBreakerState === 'half_open') {
    adaptiveBackoffFactor *= 1.5 // Slightly longer delays when testing recovery
  }

  // Apply error pattern learning: increase backoff if recent attempts failed with same error type
  if (context.retryHistory && context.retryHistory.length > 1) {
    const recentSameErrorTypes = context.retryHistory
      .slice(-3) // Look at last 3 attempts
      .filter(attempt => attempt.errorType === errorType).length

    if (recentSameErrorTypes >= 2) {
      adaptiveBackoffFactor *= 1.3 // Increase backoff for repeated same error types
    }
  }

  // Enhanced retry decision making with circuit breaker integration
  const shouldRetry = evaluateRetryDecision({
    isRecoverable,
    retryCount,
    maxRetries,
    circuitBreakerState,
    errorType,
    context,
    errorConfig,
  })

  if (!shouldRetry) {
    let escalationReason = generateEscalationReason({
      isRecoverable,
      retryCount,
      maxRetries,
      circuitBreakerState,
      errorType,
      context,
    })

    return {
      shouldRetry: false,
      newPriority: priority,
      backoffDelayMs: 0,
      maxRetries,
      escalationReason,
      adaptiveBackoffFactor,
      errorClassification,
    }
  }

  // Calculate new priority based on retry count and error severity
  let newPriority = priority

  if (isServiceError) {
    // Aggressive priority upgrade for service errors
    if (
      context.retryCount >= errorConfig.upgradeAfterAttempts &&
      priority === 'normal'
    ) {
      newPriority = 'high'
    } else if (
      context.retryCount >= errorConfig.upgradeAfterAttempts + 1 &&
      priority === 'high'
    ) {
      newPriority = 'urgent'
    }
  } else {
    // Standard priority upgrade for client errors
    if (
      context.retryCount >= errorConfig.upgradeAfterAttempts + 1 &&
      priority === 'normal'
    ) {
      newPriority = 'high'
    } else if (
      context.retryCount >= errorConfig.upgradeAfterAttempts + 2 &&
      priority === 'high'
    ) {
      newPriority = 'urgent'
    }
  }

  // Calculate backoff delay with improved jitter algorithms
  const { backoffDelayMs, jitterType } = calculateBackoffDelay({
    retryCount,
    errorType,
    priority: newPriority,
    isServiceError,
    errorConfig,
    adaptiveBackoffFactor,
    circuitBreakerState,
    lastAttemptTimestamp: context.lastAttemptTimestamp,
  })

  // Create retry attempt record for persistence
  const retryAttempt: RetryAttempt = {
    attempt: context.retryCount + 1,
    timestamp: Date.now(),
    delayMs: backoffDelayMs,
    errorType,
    errorMessage: error,
    circuitBreakerState: circuitBreakerState || 'closed',
    jitterType,
    adaptiveBackoffFactor,
  }

  return {
    shouldRetry: true,
    newPriority,
    backoffDelayMs,
    maxRetries,
    adaptiveBackoffFactor,
    jitterType,
    errorClassification,
    retryAttempt,
  }
}

/**
 * Enhanced retry decision evaluation with circuit breaker integration
 */
function evaluateRetryDecision(params: {
  isRecoverable: boolean
  retryCount: number
  maxRetries: number
  circuitBreakerState?: string
  errorType: string
  context: RetryContext
  errorConfig: any
}): boolean {
  const {
    isRecoverable,
    retryCount,
    maxRetries,
    circuitBreakerState,
    errorType,
    context,
    errorConfig,
  } = params

  // Basic retry conditions
  if (!isRecoverable) return false
  if (retryCount >= maxRetries) return false

  // Circuit breaker awareness
  if (circuitBreakerState === 'open') {
    // Never retry against open circuit - should trigger fallback instead
    return false
  }

  if (circuitBreakerState === 'half_open') {
    // Limited retries in half-open state - be more conservative
    const halfOpenLimit = Math.min(2, maxRetries / 2)
    if (context.retryCount >= halfOpenLimit) return false
  }

  // Intelligent decision based on error patterns and success rates
  if (context.retryHistory && context.retryHistory.length > 0) {
    const recentAttempts = context.retryHistory.slice(-5)

    // Pattern 1: Rapid consecutive failures of same error type
    const sameErrorTypeCount = recentAttempts.filter(
      attempt => attempt.errorType === errorType
    ).length
    if (sameErrorTypeCount >= 3 && recentAttempts.length >= 3) {
      // Three consecutive failures of same type - likely persistent issue
      return false
    }

    // Pattern 2: Time-based failure density
    if (recentAttempts.length >= 3) {
      const timeWindow = Date.now() - recentAttempts[0].timestamp
      const failureRate = recentAttempts.length / (timeWindow / 1000) // failures per second

      // If more than 1 failure per 30 seconds, likely systemic issue
      if (failureRate > 1 / 30) {
        return false
      }
    }

    // Pattern 3: Escalating delays indicate system stress
    const avgDelay =
      recentAttempts.reduce((sum, attempt) => sum + attempt.delayMs, 0) /
      recentAttempts.length
    if (avgDelay > 60000) {
      // Average delay over 1 minute indicates severe backoff
      return false
    }
  }

  // Success rate analysis for retry budget management
  const recentSuccessRate = calculateRecentSuccessRate(context)
  if (recentSuccessRate < 0.1 && context.retryCount >= 2) {
    // Less than 10% success rate and multiple attempts - consider fallback
    return false
  }

  // Error-specific retry logic enhancements
  if (errorType === 'rate_limit') {
    // For rate limiting, ensure we don't exceed reasonable attempt frequency
    const lastAttemptAge = context.lastAttemptTimestamp
      ? Date.now() - context.lastAttemptTimestamp
      : Infinity
    if (lastAttemptAge < 30000) {
      // Less than 30 seconds since last rate limit attempt
      return false
    }
  }

  if (errorType === 'timeout') {
    // For timeouts, consider circuit breaker state more heavily
    if (circuitBreakerState === 'half_open' && context.retryCount >= 1) {
      return false // Single timeout in half-open should trigger circuit opening
    }
  }

  if (errorType === 'service_error') {
    // Service errors in clusters indicate service degradation
    const recentServiceErrors =
      context.retryHistory?.filter(
        attempt =>
          attempt.errorType === 'service_error' &&
          Date.now() - attempt.timestamp < 300000
      ).length || 0

    if (recentServiceErrors >= 3) {
      return false // Multiple service errors in 5 minutes
    }
  }

  return true
}

/**
 * Generate detailed escalation reason for retry decision
 */
function generateEscalationReason(params: {
  isRecoverable: boolean
  retryCount: number
  maxRetries: number
  circuitBreakerState?: string
  errorType: string
  context: RetryContext
}): string {
  const {
    isRecoverable,
    retryCount,
    maxRetries,
    circuitBreakerState,
    errorType,
    context,
  } = params

  // Basic failure reasons
  if (!isRecoverable) {
    return `Non-recoverable ${errorType} error - user or system intervention required`
  }

  if (retryCount >= maxRetries) {
    return `Maximum retry attempts (${maxRetries}) exceeded for ${errorType} error`
  }

  // Circuit breaker related reasons
  if (circuitBreakerState === 'open') {
    return 'Circuit breaker is OPEN - all requests blocked, fallback analysis recommended'
  }

  if (circuitBreakerState === 'half_open' && context.retryCount >= 1) {
    return 'Circuit breaker in HALF-OPEN state - limiting retries to test service recovery'
  }

  // Pattern-based reasons
  if (context.retryHistory && context.retryHistory.length > 0) {
    const recentAttempts = context.retryHistory.slice(-5)
    const sameErrorTypeCount = recentAttempts.filter(
      attempt => attempt.errorType === errorType
    ).length

    if (sameErrorTypeCount >= 3) {
      return `Repeated ${errorType} errors (${sameErrorTypeCount} recent attempts) indicate persistent issue - fallback recommended`
    }

    const timeWindow =
      recentAttempts.length >= 3 ? Date.now() - recentAttempts[0].timestamp : 0
    const failureRate =
      timeWindow > 0 ? recentAttempts.length / (timeWindow / 1000) : 0

    if (failureRate > 1 / 30) {
      return `High failure rate (${Math.round(failureRate * 60)} failures/minute) indicates system stress - fallback recommended`
    }

    const avgDelay =
      recentAttempts.reduce((sum, attempt) => sum + attempt.delayMs, 0) /
      recentAttempts.length
    if (avgDelay > 60000) {
      return `Severe backoff delays (avg ${Math.round(avgDelay / 1000)}s) indicate system overload - fallback recommended`
    }
  }

  // Success rate based reasons
  const recentSuccessRate = calculateRecentSuccessRate(context)
  if (recentSuccessRate < 0.1 && context.retryCount >= 2) {
    return `Low success rate (${Math.round(recentSuccessRate * 100)}%) after ${context.retryCount} retries - fallback recommended`
  }

  // Error-specific reasons
  if (errorType === 'rate_limit') {
    const lastAttemptAge = context.lastAttemptTimestamp
      ? Date.now() - context.lastAttemptTimestamp
      : Infinity
    if (lastAttemptAge < 30000) {
      return `Rate limit retry attempted too soon (${Math.round(lastAttemptAge / 1000)}s ago) - waiting for cooldown`
    }
  }

  if (errorType === 'service_error') {
    const recentServiceErrors =
      context.retryHistory?.filter(
        attempt =>
          attempt.errorType === 'service_error' &&
          Date.now() - attempt.timestamp < 300000
      ).length || 0

    if (recentServiceErrors >= 3) {
      return `Multiple service errors (${recentServiceErrors}) in last 5 minutes indicate service degradation - fallback recommended`
    }
  }

  // Default reason
  return `Retry not recommended based on error analysis - consider fallback or manual intervention`
}

/**
 * Calculate recent success rate for retry budget analysis
 */
function calculateRecentSuccessRate(context: RetryContext): number {
  if (!context.retryHistory || context.retryHistory.length === 0) {
    return 1.0 // Assume good success rate if no history
  }

  const recentWindow = 24 * 60 * 60 * 1000 // 24 hours
  const cutoffTime = Date.now() - recentWindow

  // This would need to be enhanced with actual success data from database
  // For now, estimate based on retry patterns
  const totalAttempts = context.retryHistory.length
  const failedAttempts = context.retryHistory.filter(
    attempt => attempt.timestamp > cutoffTime
  ).length

  // Rough estimation: assume some attempts succeeded between retries
  const estimatedTotalRequests = totalAttempts * 2 // Rough multiplier
  const successfulRequests = Math.max(
    0,
    estimatedTotalRequests - failedAttempts
  )

  return estimatedTotalRequests > 0
    ? successfulRequests / estimatedTotalRequests
    : 1.0
}

/**
 * Calculate adaptive backoff factor based on retry history and error patterns
 */
function calculateAdaptiveBackoffFactor(context: RetryContext): number {
  let adaptiveFactor = 1.0

  if (!context.retryHistory || context.retryHistory.length === 0) {
    return adaptiveFactor
  }

  const recentAttempts = context.retryHistory.slice(-5) // Last 5 attempts

  // Factor 1: Escalate for repeated failures
  const failureStreak = recentAttempts.length
  if (failureStreak >= 3) {
    adaptiveFactor *= 1.2 + (failureStreak - 3) * 0.1 // 20% increase, then 10% per additional failure
  }

  // Factor 2: Consider error type patterns
  const errorTypes = recentAttempts.map(attempt => attempt.errorType)
  const uniqueErrorTypes = new Set(errorTypes).size

  if (uniqueErrorTypes === 1 && errorTypes.length >= 2) {
    // Same error type repeatedly - might be persistent issue
    adaptiveFactor *= 1.15
  } else if (uniqueErrorTypes > 2) {
    // Multiple different error types - system instability
    adaptiveFactor *= 1.25
  }

  // Factor 3: Time-based patterns (frequent failures in short time)
  if (recentAttempts.length >= 2) {
    const timeSpan =
      recentAttempts[recentAttempts.length - 1].timestamp -
      recentAttempts[0].timestamp
    const avgTimeBetweenAttempts = timeSpan / (recentAttempts.length - 1)

    // If attempts are very frequent (< 30 seconds apart on average), increase backoff
    if (avgTimeBetweenAttempts < 30000) {
      adaptiveFactor *= 1.3
    }
  }

  // Factor 4: Circuit breaker history patterns
  const circuitBreakerStates = recentAttempts.map(
    attempt => attempt.circuitBreakerState
  )
  const openCircuitAttempts = circuitBreakerStates.filter(
    state => state === 'open'
  ).length

  if (openCircuitAttempts > 0) {
    // Recent attempts against open circuit - be more conservative
    adaptiveFactor *= 1.4
  }

  // Factor 5: Progressive backoff based on total retry count
  const progressiveFactor = Math.min(2.0, 1 + context.retryCount * 0.1)
  adaptiveFactor *= progressiveFactor

  // Cap the adaptive factor to prevent excessive delays
  return Math.min(adaptiveFactor, 5.0)
}

/**
 * Jitter algorithms to prevent thundering herd problems
 */
export enum JitterType {
  FULL = 'full', // Full random jitter: random(0, exponential_backoff)
  EQUAL = 'equal', // Equal jitter: exponential_backoff/2 + random(0, exponential_backoff/2)
  DECORRELATED = 'decorrelated', // Decorrelated jitter: random(base_delay, previous_delay * 3)
  EXPONENTIAL = 'exponential', // Exponential jitter with random multiplier
}

/**
 * Calculate improved jitter for backoff delays with advanced algorithms
 * Implements sophisticated jitter patterns to prevent thundering herd problems more effectively
 */
function calculateJitter(
  baseDelay: number,
  jitterType: JitterType,
  retryCount: number,
  previousDelay?: number
): number {
  // Ensure minimum delay to prevent rapid-fire retries
  const minDelay = Math.max(1000, baseDelay * 0.05)

  switch (jitterType) {
    case JitterType.FULL:
      // Full jitter: random between minimum delay and calculated exponential backoff
      // Improved to include minimum delay threshold and better distribution
      const jitterRange = baseDelay - minDelay
      return minDelay + Math.random() * jitterRange

    case JitterType.EQUAL:
      // Equal jitter: base delay plus controlled random component
      // Improved with better balance between predictability and randomness
      const baseComponent = baseDelay * 0.6 // 60% of base delay is fixed
      const randomComponent = baseDelay * 0.4 // 40% is random
      return baseComponent + Math.random() * randomComponent

    case JitterType.DECORRELATED:
      // Decorrelated jitter: advanced algorithm to prevent synchronized retries
      // Uses a wider range and more sophisticated calculation
      const decorrelatedMin = Math.max(minDelay, baseDelay * 0.1)
      let decorrelatedMax: number

      if (previousDelay) {
        // Use previous delay with multiplier and cap to prevent runaway delays
        decorrelatedMax = Math.min(
          previousDelay * 2.5 + Math.random() * 1000,
          baseDelay * 4
        )
      } else {
        // First attempt uses base delay with variance
        decorrelatedMax = baseDelay * (1.5 + Math.random() * 0.5)
      }

      // Add entropy based on retry count to further decorrelate
      const entropyFactor = Math.sin(retryCount * Math.PI * 0.3) * 0.1 + 1
      const delay =
        decorrelatedMin + Math.random() * (decorrelatedMax - decorrelatedMin)
      return delay * entropyFactor

    case JitterType.EXPONENTIAL:
      // Exponential jitter with improved distribution and bounds checking
      // Uses beta distribution for more natural jitter patterns
      const alpha = 2 + retryCount * 0.2 // Shape parameter increases with retry count
      const beta = 2
      const betaRandom = betaDistribution(alpha, beta)

      // Apply beta-distributed jitter with bounds
      const jitterMultiplier = 0.3 + betaRandom * 1.4 // Range: 0.3 to 1.7
      const exponentialDelay = baseDelay * jitterMultiplier

      // Add small random component to break ties
      const tieBreaker = Math.random() * 100
      return Math.max(minDelay, exponentialDelay + tieBreaker)

    default:
      // Enhanced default jitter with better randomization
      const defaultMax = Math.min(baseDelay, RETRY_CONFIG.JITTER_MAX_MS)
      return minDelay + Math.random() * (defaultMax - minDelay)
  }
}

/**
 * Beta distribution approximation for more natural jitter patterns
 * Uses rejection sampling for better distribution characteristics
 */
function betaDistribution(alpha: number, beta: number): number {
  // Simple beta distribution approximation using gamma distribution method
  // For performance, we use a simpler approximation suitable for jitter calculation

  if (alpha === 1 && beta === 1) {
    return Math.random() // Uniform distribution
  }

  // For alpha > 1, beta > 1, use rejection sampling approximation
  let u1: number, u2: number, v: number, x: number
  const c = alpha - 1 + (beta - 1)

  do {
    u1 = Math.random()
    u2 = Math.random()
    v = (alpha - 1) * Math.log(u1) - (beta - 1) * Math.log(1 - u1)
    x = Math.exp(v)
  } while (
    u2 > Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1) &&
    Math.random() > 0.1
  )

  // Fallback to simpler calculation if rejection sampling fails
  if (isNaN(x) || x < 0 || x > 1) {
    x =
      Math.pow(Math.random(), 1 / alpha) /
      (Math.pow(Math.random(), 1 / alpha) + Math.pow(Math.random(), 1 / beta))
  }

  return Math.max(0, Math.min(1, x))
}

/**
 * Select optimal jitter type based on error characteristics
 */
function selectJitterType(
  errorType: string,
  circuitBreakerState?: string,
  retryCount?: number
): JitterType {
  // Use decorrelated jitter for service errors to prevent synchronized retries
  if (errorType === 'service_error' || circuitBreakerState === 'half_open') {
    return JitterType.DECORRELATED
  }

  // Use equal jitter for rate limiting to provide more predictable delays
  if (errorType === 'rate_limit') {
    return JitterType.EQUAL
  }

  // Use exponential jitter for network errors with high variance
  if (errorType === 'network' || errorType === 'timeout') {
    return JitterType.EXPONENTIAL
  }

  // Default to full jitter for other cases
  return JitterType.FULL
}

/**
 * Calculate intelligent backoff delay with improved jitter algorithms
 */
function calculateBackoffDelay(params: {
  retryCount: number
  errorType: string
  priority: QueuePriority
  isServiceError: boolean
  errorConfig: { backoffMultiplier: number }
  adaptiveBackoffFactor: number
  circuitBreakerState?: string
  lastAttemptTimestamp?: number
}): { backoffDelayMs: number; jitterType: JitterType } {
  const {
    retryCount,
    errorType,
    priority,
    isServiceError,
    errorConfig,
    adaptiveBackoffFactor,
    circuitBreakerState,
    lastAttemptTimestamp,
  } = params

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

  // Apply adaptive backoff factor based on circuit breaker state
  baseDelay *= adaptiveBackoffFactor

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

  // Select appropriate jitter type
  const jitterType = selectJitterType(
    errorType,
    circuitBreakerState,
    retryCount
  )

  // Calculate previous delay for decorrelated jitter
  const previousDelay = lastAttemptTimestamp
    ? Date.now() - lastAttemptTimestamp
    : undefined

  // Apply improved jitter
  const jitteredDelay = calculateJitter(
    baseDelay,
    jitterType,
    retryCount,
    previousDelay
  )

  // Ensure we don't exceed maximum delay
  const finalDelay = Math.min(jitteredDelay, RETRY_CONFIG.MAX_RETRY_DELAY)

  return {
    backoffDelayMs: finalDelay,
    jitterType,
  }
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
    lastProcessingAttempt?: number
    circuitBreakerState?: any
    retryHistory?: any[]
    adaptiveBackoffFactor?: number
  },
  error: string
): RetryContext {
  const priority = (analysis.priority || 'normal') as QueuePriority
  const retryCount = analysis.processingAttempts || 0
  const totalWaitTime = Date.now() - (analysis.queuedAt || analysis.createdAt)

  // Get circuit breaker state from analysis or query current state
  let circuitBreakerState: 'closed' | 'open' | 'half_open' | undefined
  if (analysis.circuitBreakerState?.state) {
    circuitBreakerState = analysis.circuitBreakerState.state
  }

  // Parse retry history from database format
  const retryHistory: RetryAttempt[] =
    analysis.retryHistory?.map(attempt => ({
      attempt: attempt.attempt,
      timestamp: attempt.timestamp,
      delayMs: attempt.delayMs,
      errorType: attempt.errorType,
      errorMessage: attempt.errorMessage,
      circuitBreakerState: attempt.circuitBreakerState,
      jitterType: attempt.jitterType,
      adaptiveBackoffFactor: attempt.adaptiveBackoffFactor,
    })) || []

  return {
    priority,
    error,
    retryCount,
    originalPriority: priority,
    totalWaitTime,
    analysisId: analysis._id,
    circuitBreakerState,
    lastAttemptTimestamp: analysis.lastProcessingAttempt,
    retryHistory,
    adaptiveBackoffFactor: analysis.adaptiveBackoffFactor,
  }
}

/**
 * Create enhanced retry history entry for database persistence
 */
export function createRetryHistoryEntry(
  retryAttempt: RetryAttempt,
  analysisId: string
): {
  analysisId: string
  retryAttempt: RetryAttempt
  shouldPersist: boolean
} {
  // Only persist significant retry attempts to prevent database bloat
  // Keep last 10 attempts or attempts with significant delays
  const shouldPersist =
    retryAttempt.delayMs > 5000 || // Significant delays (>5s)
    retryAttempt.attempt <= 10 || // First 10 attempts
    retryAttempt.circuitBreakerState !== 'closed' || // Circuit breaker events
    retryAttempt.errorType === 'service_error' // Service errors

  return {
    analysisId,
    retryAttempt,
    shouldPersist,
  }
}

/**
 * Calculate retry budget impact for new retry attempt
 */
export function calculateRetryBudgetImpact(
  retryDecision: RetryDecision,
  queueStats: {
    currentSize: number
    maxSize: number
    processingCount: number
    maxConcurrent: number
  }
): {
  budgetCost: number
  projectedImpact: 'low' | 'medium' | 'high'
  recommendation: string
} {
  const {
    backoffDelayMs,
    newPriority,
    adaptiveBackoffFactor = 1,
  } = retryDecision
  const { currentSize, maxSize, processingCount, maxConcurrent } = queueStats

  // Calculate base budget cost (normalized to 0-100 scale)
  let budgetCost = Math.min(100, backoffDelayMs / 1000) // 1 point per second of delay

  // Priority multipliers
  const priorityMultipliers = {
    urgent: 0.5, // Urgent retries cost less budget (system priority)
    high: 0.75, // High priority retries cost less
    normal: 1.0, // Normal priority retries use full budget
  }
  budgetCost *= priorityMultipliers[newPriority] || 1.0

  // Adaptive backoff multiplier (higher backoff = higher cost)
  budgetCost *= Math.min(adaptiveBackoffFactor, 3.0)

  // Queue capacity impact
  const queueUtilization = currentSize / maxSize
  const processingUtilization = processingCount / maxConcurrent
  const maxUtilization = Math.max(queueUtilization, processingUtilization)

  // Increase cost when queue is under pressure
  if (maxUtilization > 0.8) {
    budgetCost *= 1.5
  } else if (maxUtilization > 0.6) {
    budgetCost *= 1.2
  }

  // Determine projected impact
  let projectedImpact: 'low' | 'medium' | 'high'
  let recommendation: string

  if (budgetCost < 20) {
    projectedImpact = 'low'
    recommendation = 'Allow retry - minimal queue impact'
  } else if (budgetCost < 60) {
    projectedImpact = 'medium'
    recommendation = 'Allow with monitoring - moderate queue impact'
  } else {
    projectedImpact = 'high'
    recommendation = 'Consider fallback - high queue impact'
  }

  return {
    budgetCost: Math.round(budgetCost),
    projectedImpact,
    recommendation,
  }
}

/**
 * Generate user-friendly retry progress indicators
 */
export function generateRetryProgressIndicator(
  retryDecision: RetryDecision,
  context: RetryContext
): {
  message: string
  progressPercent: number
  estimatedWaitTime: string
  nextAction: string
  severity: 'info' | 'warning' | 'error'
} {
  const {
    shouldRetry,
    backoffDelayMs,
    maxRetries,
    newPriority,
    errorClassification,
  } = retryDecision

  if (!shouldRetry) {
    return {
      message: retryDecision.escalationReason || 'Analysis retry not possible',
      progressPercent: 100,
      estimatedWaitTime: 'N/A',
      nextAction: errorClassification.fallbackEligible
        ? 'Using fallback analysis'
        : 'Manual intervention required',
      severity: 'error',
    }
  }

  // Calculate progress percentage
  const progressPercent = Math.round((context.retryCount / maxRetries) * 100)

  // Format estimated wait time
  const waitTimeSeconds = Math.round(backoffDelayMs / 1000)
  let estimatedWaitTime: string
  if (waitTimeSeconds < 60) {
    estimatedWaitTime = `${waitTimeSeconds} seconds`
  } else if (waitTimeSeconds < 3600) {
    estimatedWaitTime = `${Math.round(waitTimeSeconds / 60)} minutes`
  } else {
    estimatedWaitTime = `${Math.round(waitTimeSeconds / 3600)} hours`
  }

  // Generate contextual message
  let message: string
  let severity: 'info' | 'warning' | 'error' = 'info'

  if (context.retryCount === 0) {
    message = `Starting analysis with ${newPriority} priority`
    severity = 'info'
  } else if (context.retryCount < maxRetries / 2) {
    message = `Retry attempt ${context.retryCount + 1} of ${maxRetries} (${errorClassification.type} error)`
    severity = 'info'
  } else if (context.retryCount < maxRetries - 1) {
    message = `Retry attempt ${context.retryCount + 1} of ${maxRetries} - escalated to ${newPriority} priority`
    severity = 'warning'
  } else {
    message = `Final retry attempt ${context.retryCount + 1} of ${maxRetries} - ${newPriority} priority`
    severity = 'warning'
  }

  // Determine next action
  let nextAction: string
  if (context.retryCount >= maxRetries - 1) {
    nextAction = errorClassification.fallbackEligible
      ? 'Will use fallback if this fails'
      : 'Manual review if this fails'
  } else {
    nextAction = `Will retry ${maxRetries - (context.retryCount + 1)} more times if needed`
  }

  // Add circuit breaker context
  if (context.circuitBreakerState === 'half_open') {
    message += ' (testing service recovery)'
    severity = 'warning'
  }

  return {
    message,
    progressPercent,
    estimatedWaitTime,
    nextAction,
    severity,
  }
}

/**
 * Generate enhanced retry metrics for monitoring and analytics
 */
export function generateRetryMetrics(
  retryDecision: RetryDecision,
  context: RetryContext
): {
  retryId: string
  analysisId: string
  attempt: number
  totalAttempts: number
  errorCategory: string
  priority: string
  delayMs: number
  adaptiveBackoffFactor: number
  circuitBreakerState: string
  jitterType: string
  fallbackEligible: boolean
  escalationPath: string[]
  retryBudgetCost?: number
  userNotificationSent: boolean
  timestamp: number
} {
  // Generate escalation path history
  const escalationPath: string[] = []
  if (context.retryHistory) {
    const priorities = context.retryHistory.map(() => 'normal') // Would need actual priority history
    escalationPath.push(context.originalPriority)
    if (retryDecision.newPriority !== context.originalPriority) {
      escalationPath.push(retryDecision.newPriority)
    }
  }

  return {
    retryId: `retry_${context.analysisId}_${retryDecision.retryAttempt?.attempt || 0}`,
    analysisId: context.analysisId,
    attempt: retryDecision.retryAttempt?.attempt || 0,
    totalAttempts: retryDecision.maxRetries,
    errorCategory: retryDecision.errorClassification.type,
    priority: retryDecision.newPriority,
    delayMs: retryDecision.backoffDelayMs,
    adaptiveBackoffFactor: retryDecision.adaptiveBackoffFactor || 1,
    circuitBreakerState: context.circuitBreakerState || 'closed',
    jitterType: retryDecision.jitterType || 'none',
    fallbackEligible:
      retryDecision.errorClassification.fallbackEligible || false,
    escalationPath,
    userNotificationSent:
      retryDecision.retryAttempt?.attempt === 1 ||
      retryDecision.newPriority !== context.priority,
    timestamp: Date.now(),
  }
}

/**
 * Generate retry recommendation for monitoring
 */
export function getRetryRecommendation(decision: RetryDecision): string {
  if (!decision.shouldRetry) {
    return decision.escalationReason || 'No retry recommended'
  }

  const {
    errorClassification,
    newPriority,
    backoffDelayMs,
    jitterType,
    adaptiveBackoffFactor,
  } = decision
  const delaySeconds = Math.round(backoffDelayMs / 1000)

  let recommendation = `Retry with ${newPriority} priority after ${delaySeconds}s delay`

  if (jitterType) {
    recommendation += ` (${jitterType} jitter)`
  }

  if (adaptiveBackoffFactor && adaptiveBackoffFactor > 1) {
    recommendation += ` (${adaptiveBackoffFactor}x adaptive backoff)`
  }

  if (errorClassification.isServiceError) {
    recommendation += ' (service error - circuit breaker aware)'
  }

  if (errorClassification.fallbackEligible) {
    recommendation += ' (fallback eligible)'
  }

  if (errorClassification.type !== 'unknown') {
    recommendation += ` (${errorClassification.type})`
  }

  return recommendation
}

/**
 * Calculate retry budget based on queue capacity and current load
 */
export function calculateRetryBudget(queueStats: {
  currentSize: number
  maxSize: number
  processingCount: number
  maxConcurrent: number
}): {
  availableBudget: number
  budgetPercentage: number
  recommendation: 'allow' | 'throttle' | 'reject'
} {
  const { currentSize, maxSize, processingCount, maxConcurrent } = queueStats

  // Calculate capacity utilization
  const queueUtilization = currentSize / maxSize
  const processingUtilization = processingCount / maxConcurrent

  // Maximum utilization determines budget constraints
  const maxUtilization = Math.max(queueUtilization, processingUtilization)

  // Calculate available retry budget (inverse of utilization)
  const budgetPercentage = Math.max(0, 1 - maxUtilization)
  const availableBudget = Math.floor(budgetPercentage * 100)

  // Determine recommendation based on budget
  let recommendation: 'allow' | 'throttle' | 'reject'
  if (budgetPercentage > 0.7) {
    recommendation = 'allow' // High budget - allow all retries
  } else if (budgetPercentage > 0.3) {
    recommendation = 'throttle' // Medium budget - throttle retries
  } else {
    recommendation = 'reject' // Low budget - reject new retries
  }

  return {
    availableBudget,
    budgetPercentage,
    recommendation,
  }
}

/**
 * Check if retry should be allowed based on budget constraints
 */
export function shouldAllowRetry(
  retryDecision: RetryDecision,
  retryBudget: ReturnType<typeof calculateRetryBudget>
): { allowed: boolean; reason?: string } {
  if (!retryDecision.shouldRetry) {
    return { allowed: false, reason: retryDecision.escalationReason }
  }

  const { recommendation, budgetPercentage } = retryBudget

  switch (recommendation) {
    case 'allow':
      return { allowed: true }

    case 'throttle':
      // Allow urgent and high priority retries, throttle normal priority
      if (retryDecision.newPriority === 'urgent') {
        return { allowed: true }
      } else if (
        retryDecision.newPriority === 'high' &&
        budgetPercentage > 0.4
      ) {
        return { allowed: true }
      } else if (
        retryDecision.newPriority === 'normal' &&
        budgetPercentage > 0.5
      ) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Queue capacity throttling - retry budget exhausted',
      }

    case 'reject':
      // Only allow urgent retries when budget is severely constrained
      if (retryDecision.newPriority === 'urgent' && budgetPercentage > 0.1) {
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: 'Queue overloaded - retry budget exhausted',
      }

    default:
      return { allowed: false, reason: 'Unknown budget recommendation' }
  }
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
