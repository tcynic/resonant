/**
 * Circuit Breaker Pattern Implementation for Queue-Based AI Processing
 * Prevents cascading failures and manages service degradation gracefully
 * Enhanced with database persistence for comprehensive error handling (Story AI-Migration.4)
 */

import { ConvexError } from 'convex/values'
import { MutationCtx, QueryCtx } from '../_generated/server'
import { internal } from '../_generated/api'

export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime: number
  nextAttemptTime: number
  successCount: number // For half-open state
}

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  timeoutMs: number // How long to keep circuit open
  monitoringWindowMs: number // Time window for failure tracking
  halfOpenMaxAttempts: number // Max attempts in half-open state before deciding
  healthCheckIntervalMs: number // How often to check if we can close circuit
}

// Default configuration for AI processing circuit breaker
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 consecutive failures
  timeoutMs: 60000, // Keep open for 1 minute
  monitoringWindowMs: 300000, // 5-minute monitoring window
  halfOpenMaxAttempts: 3, // Allow 3 test requests in half-open
  healthCheckIntervalMs: 30000, // Check health every 30 seconds
}

/**
 * Circuit breaker for managing API call reliability
 */
export class QueueCircuitBreaker {
  private state: CircuitBreakerState
  private config: CircuitBreakerConfig
  private recentFailures: number[] = []

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config }
    this.state = {
      status: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successCount: 0,
    }
  }

  /**
   * Check if request should be allowed through circuit breaker
   */
  canExecute(): boolean {
    const now = Date.now()

    switch (this.state.status) {
      case 'closed':
        return true

      case 'open':
        if (now >= this.state.nextAttemptTime) {
          this.state.status = 'half-open'
          this.state.successCount = 0
          return true
        }
        return false

      case 'half-open':
        return this.state.successCount < this.config.halfOpenMaxAttempts

      default:
        return false
    }
  }

  /**
   * Record successful execution
   */
  recordSuccess(): void {
    this.cleanupOldFailures()

    if (this.state.status === 'half-open') {
      this.state.successCount++

      // If we've had enough successful attempts, close the circuit
      if (this.state.successCount >= this.config.halfOpenMaxAttempts) {
        this.state.status = 'closed'
        this.state.failureCount = 0
        this.recentFailures = []
      }
    } else if (this.state.status === 'closed') {
      // Reset failure count on success
      this.state.failureCount = Math.max(0, this.state.failureCount - 1)
    }
  }

  /**
   * Record failed execution
   */
  recordFailure(error?: string): void {
    const now = Date.now()
    this.state.lastFailureTime = now
    this.recentFailures.push(now)

    this.cleanupOldFailures()

    if (this.state.status === 'half-open') {
      // Failure in half-open state immediately opens circuit
      this.openCircuit()
    } else if (this.state.status === 'closed') {
      this.state.failureCount++

      // Check if we should open the circuit
      if (this.recentFailures.length >= this.config.failureThreshold) {
        this.openCircuit()
      }
    }
  }

  /**
   * Get current circuit breaker status
   */
  getState(): CircuitBreakerState & {
    recentFailureCount: number
    timeUntilNextAttempt: number
  } {
    this.cleanupOldFailures()

    return {
      ...this.state,
      recentFailureCount: this.recentFailures.length,
      timeUntilNextAttempt: Math.max(
        0,
        this.state.nextAttemptTime - Date.now()
      ),
    }
  }

  /**
   * Force circuit to open (for manual intervention)
   */
  forceOpen(): void {
    this.openCircuit()
  }

  /**
   * Force circuit to close (for manual intervention)
   */
  forceClose(): void {
    this.state.status = 'closed'
    this.state.failureCount = 0
    this.state.successCount = 0
    this.recentFailures = []
  }

  /**
   * Get health status for monitoring
   */
  getHealthStatus(): {
    isHealthy: boolean
    status: string
    metrics: {
      failureRate: number
      avgResponseTime?: number
      lastFailureTime: number
    }
    recommendations: string[]
  } {
    this.cleanupOldFailures()

    const now = Date.now()
    const windowStart = now - this.config.monitoringWindowMs
    const recentFailureCount = this.recentFailures.length
    const failureRate = recentFailureCount / this.config.failureThreshold

    const recommendations: string[] = []
    let isHealthy = true

    if (this.state.status === 'open') {
      isHealthy = false
      recommendations.push(
        'Circuit is open - investigate underlying service issues'
      )
    } else if (this.state.status === 'half-open') {
      recommendations.push('Circuit is testing - monitor closely for stability')
    } else if (failureRate > 0.6) {
      recommendations.push(
        'High failure rate detected - consider preventive measures'
      )
    }

    if (recentFailureCount > 0 && now - this.state.lastFailureTime < 60000) {
      recommendations.push('Recent failures detected - check service health')
    }

    return {
      isHealthy,
      status: this.state.status,
      metrics: {
        failureRate: Math.round(failureRate * 100),
        lastFailureTime: this.state.lastFailureTime,
      },
      recommendations,
    }
  }

  private openCircuit(): void {
    this.state.status = 'open'
    this.state.nextAttemptTime = Date.now() + this.config.timeoutMs
    this.state.successCount = 0
  }

  private cleanupOldFailures(): void {
    const cutoffTime = Date.now() - this.config.monitoringWindowMs
    this.recentFailures = this.recentFailures.filter(time => time > cutoffTime)
  }
}

/**
 * Error classification for circuit breaker decisions
 */
export function shouldTripCircuitBreaker(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerError = errorMessage.toLowerCase()

  // These errors should trip the circuit breaker (service-level failures)
  const serviceErrors = [
    'network error',
    'connection failed',
    'service unavailable',
    'internal server error',
    'timeout',
    'rate limit exceeded',
    'api error',
    'gemini api error',
    'service overload',
  ]

  // These errors should NOT trip the circuit breaker (client-level failures)
  const clientErrors = [
    'validation failed',
    'invalid input',
    'authentication failed',
    'authorization failed',
    'bad request',
    'user cancelled',
    'quota exceeded',
  ]

  // Check for service errors (should trip circuit)
  if (serviceErrors.some(pattern => lowerError.includes(pattern))) {
    return true
  }

  // Check for client errors (should not trip circuit)
  if (clientErrors.some(pattern => lowerError.includes(pattern))) {
    return false
  }

  // Default: trip circuit for unknown errors (fail safe)
  return true
}

/**
 * Determine if error is recoverable for retry logic
 */
export function isRecoverableError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerError = errorMessage.toLowerCase()

  // Recoverable errors (should retry)
  const recoverablePatterns = [
    'timeout',
    'network',
    'connection',
    'temporary',
    'rate limit',
    'service unavailable',
    'internal server error',
    'system overload',
  ]

  // Non-recoverable errors (should not retry)
  const nonRecoverablePatterns = [
    'validation',
    'invalid input',
    'authentication failed',
    'authorization failed',
    'bad request',
    'malformed',
    'user cancelled',
    'quota permanently exceeded',
  ]

  // Check non-recoverable first
  if (nonRecoverablePatterns.some(pattern => lowerError.includes(pattern))) {
    return false
  }

  // Check recoverable
  if (recoverablePatterns.some(pattern => lowerError.includes(pattern))) {
    return true
  }

  // Default: consider recoverable (try once more)
  return true
}

/**
 * Enhanced Circuit Breaker with Database Persistence (Story AI-Migration.4)
 * Extends the QueueCircuitBreaker with Convex database state management
 */

export interface DatabaseCircuitBreakerConfig extends CircuitBreakerConfig {
  service: string // Service identifier for database persistence
}

export const DEFAULT_SERVICE_CONFIG: DatabaseCircuitBreakerConfig = {
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  service: 'gemini_2_5_flash_lite',
}

/**
 * Get circuit breaker status from database with fallback to in-memory
 */
export async function getCircuitBreakerStatus(
  ctx: QueryCtx,
  service: string
): Promise<
  CircuitBreakerState & {
    recentFailureCount: number
    timeUntilNextAttempt: number
  }
> {
  // Try to get from database cache first
  const dbStatus = await ctx.db
    .query('circuitBreakerStatus')
    .withIndex('by_service', q => q.eq('service', service))
    .first()

  if (dbStatus) {
    const now = Date.now()
    return {
      status: dbStatus.isOpen ? 'open' : 'closed',
      failureCount: dbStatus.failureCount,
      lastFailureTime: dbStatus.lastFailure || 0,
      nextAttemptTime: dbStatus.nextAttemptTime || 0,
      successCount: 0, // Reset on query
      recentFailureCount: dbStatus.failureCount,
      timeUntilNextAttempt: Math.max(0, (dbStatus.nextAttemptTime || 0) - now),
    }
  }

  // Fallback to default closed state
  return {
    status: 'closed',
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0,
    successCount: 0,
    recentFailureCount: 0,
    timeUntilNextAttempt: 0,
  }
}

/**
 * Check if circuit breaker allows execution
 */
export async function canExecuteRequest(
  ctx: QueryCtx,
  service: string
): Promise<boolean> {
  const status = await getCircuitBreakerStatus(ctx, service)
  const now = Date.now()

  switch (status.status) {
    case 'closed':
      return true

    case 'open':
      if (now >= status.nextAttemptTime) {
        // Transition to half-open should be handled by mutation
        return true
      }
      return false

    case 'half-open':
      // Allow limited attempts in half-open state
      return (
        status.successCount < DEFAULT_CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts
      )

    default:
      return false
  }
}

/**
 * Record circuit breaker success with database persistence
 */
export async function recordCircuitBreakerSuccess(
  ctx: MutationCtx,
  service: string,
  processingTime?: number
) {
  const now = Date.now()

  // Get or create circuit breaker status
  let dbStatus = await ctx.db
    .query('circuitBreakerStatus')
    .withIndex('by_service', q => q.eq('service', service))
    .first()

  if (!dbStatus) {
    // Create new status entry
    await ctx.db.insert('circuitBreakerStatus', {
      service,
      isOpen: false,
      failureCount: 0,
      lastFailure: undefined,
      nextAttemptTime: undefined,
      updatedAt: now,
    })
  } else {
    // Update existing status
    await ctx.db.patch(dbStatus._id, {
      isOpen: false,
      failureCount: Math.max(0, dbStatus.failureCount - 1), // Reduce failure count on success
      updatedAt: now,
    })
  }

  // Update error metrics
  await updateErrorMetrics(ctx, service, true, processingTime)
}

/**
 * Record circuit breaker failure with database persistence
 */
export async function recordCircuitBreakerFailure(
  ctx: MutationCtx,
  service: string,
  error: string,
  processingTime?: number
) {
  const now = Date.now()
  const config = DEFAULT_SERVICE_CONFIG

  // Get or create circuit breaker status
  let dbStatus = await ctx.db
    .query('circuitBreakerStatus')
    .withIndex('by_service', q => q.eq('service', service))
    .first()

  let newFailureCount = 1

  if (dbStatus) {
    newFailureCount = dbStatus.failureCount + 1
  }

  const shouldOpen = newFailureCount >= config.failureThreshold
  const nextAttemptTime = shouldOpen ? now + config.timeoutMs : undefined

  if (!dbStatus) {
    // Create new status entry
    await ctx.db.insert('circuitBreakerStatus', {
      service,
      isOpen: shouldOpen,
      failureCount: newFailureCount,
      lastFailure: now,
      nextAttemptTime,
      updatedAt: now,
    })
  } else {
    // Update existing status
    await ctx.db.patch(dbStatus._id, {
      isOpen: shouldOpen,
      failureCount: newFailureCount,
      lastFailure: now,
      nextAttemptTime,
      updatedAt: now,
    })
  }

  // Update error metrics
  await updateErrorMetrics(ctx, service, false, processingTime)
}

/**
 * Update error metrics for analytics
 */
async function updateErrorMetrics(
  ctx: MutationCtx,
  service: string,
  success: boolean,
  processingTime?: number
) {
  const now = Date.now()
  const timeWindow = Math.floor(now / (60 * 60 * 1000)) // Hour bucket

  // Get or create metrics entry for this time window
  let metrics = await ctx.db
    .query('errorMetrics')
    .withIndex('by_service_time', q =>
      q.eq('service', service).eq('timeWindow', timeWindow)
    )
    .first()

  if (!metrics) {
    // Create new metrics entry
    await ctx.db.insert('errorMetrics', {
      service,
      timeWindow,
      errorCount: success ? 0 : 1,
      successCount: success ? 1 : 0,
      avgProcessingTime: processingTime,
      costImpact: undefined, // To be calculated based on service pricing
    })
  } else {
    // Update existing metrics
    const newErrorCount = success ? metrics.errorCount : metrics.errorCount + 1
    const newSuccessCount = success
      ? metrics.successCount + 1
      : metrics.successCount
    const totalRequests = newErrorCount + newSuccessCount

    // Calculate running average processing time
    let newAvgProcessingTime = metrics.avgProcessingTime
    if (processingTime && newAvgProcessingTime) {
      newAvgProcessingTime =
        (newAvgProcessingTime * (totalRequests - 1) + processingTime) /
        totalRequests
    } else if (processingTime) {
      newAvgProcessingTime = processingTime
    }

    await ctx.db.patch(metrics._id, {
      errorCount: newErrorCount,
      successCount: newSuccessCount,
      avgProcessingTime: newAvgProcessingTime,
    })
  }
}

/**
 * Get comprehensive health status with database-backed metrics and trend analysis
 */
export async function getCircuitBreakerHealthStatus(
  ctx: QueryCtx,
  service: string
): Promise<{
  isHealthy: boolean
  status: string
  metrics: {
    failureRate: number
    avgResponseTime?: number
    lastFailureTime: number
    errorCount24h: number
    successCount24h: number
    failureRateTrend: number // Percentage change from previous 24h period
    responseTimeTrend: number // Percentage change from previous 24h period
    historicalFailureRate: { hour: number; failureRate: number }[]
  }
  recommendations: string[]
  alerts: {
    level: 'info' | 'warning' | 'critical'
    message: string
    timestamp: number
  }[]
}> {
  const circuitStatus = await getCircuitBreakerStatus(ctx, service)
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const twoDaysAgo = now - 48 * 60 * 60 * 1000

  // Get 48-hour error metrics for trend analysis
  const allMetrics = await ctx.db
    .query('errorMetrics')
    .withIndex('by_service_time', q => q.eq('service', service))
    .filter(q =>
      q.gte(q.field('timeWindow'), Math.floor(twoDaysAgo / (60 * 60 * 1000)))
    )
    .collect()

  // Split metrics into current 24h and previous 24h for trend analysis
  const currentDayMetrics = allMetrics.filter(
    m => m.timeWindow >= Math.floor(oneDayAgo / (60 * 60 * 1000))
  )
  const previousDayMetrics = allMetrics.filter(
    m => m.timeWindow < Math.floor(oneDayAgo / (60 * 60 * 1000))
  )

  // Current 24h stats
  const totalErrors = currentDayMetrics.reduce(
    (sum, m) => sum + m.errorCount,
    0
  )
  const totalSuccess = currentDayMetrics.reduce(
    (sum, m) => sum + m.successCount,
    0
  )
  const totalRequests = totalErrors + totalSuccess
  const failureRate =
    totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

  const avgProcessingTime =
    currentDayMetrics.length > 0
      ? currentDayMetrics.reduce(
          (sum, m) => sum + (m.avgProcessingTime || 0),
          0
        ) / currentDayMetrics.length
      : undefined

  // Previous 24h stats for trend calculation
  const prevTotalErrors = previousDayMetrics.reduce(
    (sum, m) => sum + m.errorCount,
    0
  )
  const prevTotalSuccess = previousDayMetrics.reduce(
    (sum, m) => sum + m.successCount,
    0
  )
  const prevTotalRequests = prevTotalErrors + prevTotalSuccess
  const prevFailureRate =
    prevTotalRequests > 0 ? (prevTotalErrors / prevTotalRequests) * 100 : 0

  const prevAvgProcessingTime =
    previousDayMetrics.length > 0
      ? previousDayMetrics.reduce(
          (sum, m) => sum + (m.avgProcessingTime || 0),
          0
        ) / previousDayMetrics.length
      : undefined

  // Calculate trends
  const failureRateTrend =
    prevFailureRate > 0
      ? ((failureRate - prevFailureRate) / prevFailureRate) * 100
      : 0
  const responseTimeTrend =
    avgProcessingTime && prevAvgProcessingTime && prevAvgProcessingTime > 0
      ? ((avgProcessingTime - prevAvgProcessingTime) / prevAvgProcessingTime) *
        100
      : 0

  // Generate historical failure rate data (last 24 hours by hour)
  const historicalFailureRate: { hour: number; failureRate: number }[] = []
  for (let i = 23; i >= 0; i--) {
    const hourStart = now - i * 60 * 60 * 1000
    const timeWindow = Math.floor(hourStart / (60 * 60 * 1000))
    const hourMetrics = allMetrics.find(m => m.timeWindow === timeWindow)

    if (hourMetrics) {
      const hourTotal = hourMetrics.errorCount + hourMetrics.successCount
      const hourFailureRate =
        hourTotal > 0 ? (hourMetrics.errorCount / hourTotal) * 100 : 0
      historicalFailureRate.push({
        hour: timeWindow,
        failureRate: hourFailureRate,
      })
    } else {
      historicalFailureRate.push({ hour: timeWindow, failureRate: 0 })
    }
  }

  // Generate recommendations and alerts
  const recommendations: string[] = []
  const alerts: {
    level: 'info' | 'warning' | 'critical'
    message: string
    timestamp: number
  }[] = []
  let isHealthy = true

  // Circuit status alerts
  if (circuitStatus.status === 'open') {
    isHealthy = false
    recommendations.push(
      'Circuit is open - investigate underlying service issues'
    )
    alerts.push({
      level: 'critical',
      message: `Circuit breaker is OPEN for ${service}. All requests are being blocked.`,
      timestamp: now,
    })
  } else if (circuitStatus.status === 'half-open') {
    recommendations.push('Circuit is testing - monitor closely for stability')
    alerts.push({
      level: 'warning',
      message: `Circuit breaker is HALF-OPEN for ${service}. Testing service recovery.`,
      timestamp: now,
    })
  }

  // Failure rate alerts
  if (failureRate > 60) {
    isHealthy = false
    recommendations.push(
      'High failure rate detected - consider preventive measures'
    )
    alerts.push({
      level: 'critical',
      message: `High failure rate (${Math.round(failureRate)}%) detected for ${service}`,
      timestamp: now,
    })
  } else if (failureRate > 30) {
    recommendations.push('Elevated failure rate detected - monitor closely')
    alerts.push({
      level: 'warning',
      message: `Elevated failure rate (${Math.round(failureRate)}%) detected for ${service}`,
      timestamp: now,
    })
  }

  // Trend-based alerts
  if (failureRateTrend > 50) {
    recommendations.push('Failure rate is trending upward significantly')
    alerts.push({
      level: 'warning',
      message: `Failure rate increased by ${Math.round(failureRateTrend)}% compared to previous 24h`,
      timestamp: now,
    })
  }

  if (responseTimeTrend > 100) {
    recommendations.push('Response times are degrading rapidly')
    alerts.push({
      level: 'warning',
      message: `Average response time increased by ${Math.round(responseTimeTrend)}% compared to previous 24h`,
      timestamp: now,
    })
  }

  // Recent failure alerts
  if (totalErrors > 0 && now - circuitStatus.lastFailureTime < 60000) {
    recommendations.push('Recent failures detected - check service health')
    alerts.push({
      level: 'info',
      message: `Recent failure detected for ${service} within the last minute`,
      timestamp: now,
    })
  }

  // Performance alerts
  if (avgProcessingTime && avgProcessingTime > 10000) {
    recommendations.push(
      'Very high response times detected - immediate attention required'
    )
    alerts.push({
      level: 'critical',
      message: `Very high average response time (${Math.round(avgProcessingTime)}ms) for ${service}`,
      timestamp: now,
    })
  } else if (avgProcessingTime && avgProcessingTime > 5000) {
    recommendations.push(
      'High response times detected - check service performance'
    )
    alerts.push({
      level: 'warning',
      message: `High average response time (${Math.round(avgProcessingTime)}ms) for ${service}`,
      timestamp: now,
    })
  }

  // Recovery success alert
  if (
    circuitStatus.status === 'closed' &&
    totalSuccess > 0 &&
    prevFailureRate > 20 &&
    failureRate < 10
  ) {
    alerts.push({
      level: 'info',
      message: `Service ${service} appears to be recovering - failure rate improved from ${Math.round(prevFailureRate)}% to ${Math.round(failureRate)}%`,
      timestamp: now,
    })
  }

  return {
    isHealthy,
    status: circuitStatus.status,
    metrics: {
      failureRate: Math.round(failureRate),
      avgResponseTime: avgProcessingTime,
      lastFailureTime: circuitStatus.lastFailureTime,
      errorCount24h: totalErrors,
      successCount24h: totalSuccess,
      failureRateTrend: Math.round(failureRateTrend),
      responseTimeTrend: Math.round(responseTimeTrend),
      historicalFailureRate,
    },
    recommendations,
    alerts,
  }
}

/**
 * Force circuit breaker open (for manual intervention)
 */
export async function forceCircuitBreakerOpen(
  ctx: MutationCtx,
  service: string
) {
  const now = Date.now()
  const config = DEFAULT_SERVICE_CONFIG

  let dbStatus = await ctx.db
    .query('circuitBreakerStatus')
    .withIndex('by_service', q => q.eq('service', service))
    .first()

  if (!dbStatus) {
    await ctx.db.insert('circuitBreakerStatus', {
      service,
      isOpen: true,
      failureCount: config.failureThreshold,
      lastFailure: now,
      nextAttemptTime: now + config.timeoutMs,
      updatedAt: now,
    })
  } else {
    await ctx.db.patch(dbStatus._id, {
      isOpen: true,
      failureCount: config.failureThreshold,
      lastFailure: now,
      nextAttemptTime: now + config.timeoutMs,
      updatedAt: now,
    })
  }
}

/**
 * Force circuit breaker closed (for manual intervention)
 */
export async function forceCircuitBreakerClosed(
  ctx: MutationCtx,
  service: string
) {
  const now = Date.now()

  let dbStatus = await ctx.db
    .query('circuitBreakerStatus')
    .withIndex('by_service', q => q.eq('service', service))
    .first()

  if (!dbStatus) {
    await ctx.db.insert('circuitBreakerStatus', {
      service,
      isOpen: false,
      failureCount: 0,
      lastFailure: undefined,
      nextAttemptTime: undefined,
      updatedAt: now,
    })
  } else {
    await ctx.db.patch(dbStatus._id, {
      isOpen: false,
      failureCount: 0,
      lastFailure: undefined,
      nextAttemptTime: undefined,
      updatedAt: now,
    })
  }
}

/**
 * Get all circuit breaker statuses for monitoring dashboard
 */
export async function getAllCircuitBreakerStatuses(ctx: QueryCtx): Promise<
  {
    service: string
    status: 'open' | 'closed' | 'half-open'
    isHealthy: boolean
    failureCount: number
    lastFailure?: number
    nextAttemptTime?: number
    updatedAt: number
  }[]
> {
  const allStatuses = await ctx.db.query('circuitBreakerStatus').collect()

  return allStatuses.map(status => ({
    service: status.service,
    status: status.isOpen ? 'open' : 'closed',
    isHealthy:
      !status.isOpen &&
      status.failureCount < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
    failureCount: status.failureCount,
    lastFailure: status.lastFailure,
    nextAttemptTime: status.nextAttemptTime,
    updatedAt: status.updatedAt,
  }))
}

/**
 * Get circuit breaker alerts for real-time notifications
 */
export async function getCircuitBreakerAlerts(
  ctx: QueryCtx,
  since?: number
): Promise<
  {
    level: 'info' | 'warning' | 'critical'
    message: string
    service: string
    timestamp: number
    details?: unknown
  }[]
> {
  const alerts: {
    level: 'info' | 'warning' | 'critical'
    message: string
    service: string
    timestamp: number
    details?: unknown
  }[] = []

  const allStatuses = await ctx.db.query('circuitBreakerStatus').collect()
  const cutoffTime = since || Date.now() - 60 * 60 * 1000 // Default to last hour

  for (const status of allStatuses) {
    // Only include recent updates
    if (status.updatedAt < cutoffTime) continue

    if (status.isOpen) {
      alerts.push({
        level: 'critical',
        message: `Circuit breaker OPENED for ${status.service}`,
        service: status.service,
        timestamp: status.updatedAt,
        details: {
          failureCount: status.failureCount,
          nextAttemptTime: status.nextAttemptTime,
        },
      })
    } else if (
      status.failureCount >
      DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold * 0.8
    ) {
      alerts.push({
        level: 'warning',
        message: `High failure count (${status.failureCount}) approaching threshold for ${status.service}`,
        service: status.service,
        timestamp: status.updatedAt,
        details: {
          failureCount: status.failureCount,
          threshold: DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
        },
      })
    }
  }

  // Sort by timestamp descending (most recent first)
  return alerts.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Get circuit breaker summary statistics
 */
export async function getCircuitBreakerSummary(ctx: QueryCtx): Promise<{
  totalServices: number
  healthyServices: number
  openCircuits: number
  recentFailures: number
  avgFailureRate: number
  lastUpdate: number
}> {
  const allStatuses = await ctx.db.query('circuitBreakerStatus').collect()
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // Get recent metrics for failure rate calculation
  const recentMetrics = await ctx.db
    .query('errorMetrics')
    .filter(q =>
      q.gte(q.field('timeWindow'), Math.floor(oneDayAgo / (60 * 60 * 1000)))
    )
    .collect()

  const totalServices = allStatuses.length
  const openCircuits = allStatuses.filter(s => s.isOpen).length
  const healthyServices = allStatuses.filter(
    s =>
      !s.isOpen &&
      s.failureCount < DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold * 0.5
  ).length

  // Calculate recent failures and average failure rate
  const totalErrors = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0)
  const totalSuccess = recentMetrics.reduce((sum, m) => sum + m.successCount, 0)
  const totalRequests = totalErrors + totalSuccess
  const avgFailureRate =
    totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

  const lastUpdate = Math.max(...allStatuses.map(s => s.updatedAt), 0)

  return {
    totalServices,
    healthyServices,
    openCircuits,
    recentFailures: totalErrors,
    avgFailureRate: Math.round(avgFailureRate),
    lastUpdate,
  }
}
