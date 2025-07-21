/**
 * AI Error Recovery and Retry Strategies
 * Implements sophisticated retry logic with exponential backoff and circuit breakers
 */

import { AIError, getRecoveryStrategy } from './errors'
import { aiMonitoring } from './monitoring'
import { aiFallback, withFallback } from './fallback'
import { AnalysisType } from '../types'

// Circuit breaker states
enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit is open, calls fail fast
  HALF_OPEN = 'half_open', // Testing if service is recovered
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  recoveryTimeoutMs: number // Time to wait before testing recovery
  successThreshold: number // Number of successes needed to close circuit
  timeWindowMs: number // Time window for failure counting
}

// Retry configuration
interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number
}

const defaultCircuitConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000, // 30 seconds
  successThreshold: 3,
  timeWindowMs: 60000, // 1 minute
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
}

// Circuit breaker implementation
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number[] = []
  private successes: number = 0
  private lastFailureTime: number = 0
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...defaultCircuitConfig, ...config }
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Fast fail if circuit is open and recovery timeout hasn't elapsed
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure < this.config.recoveryTimeoutMs) {
        if (fallback) {
          aiMonitoring.logError(
            new (class extends AIError {
              getUserMessage() {
                return 'Service temporarily unavailable, using fallback'
              }
              getRecoveryActions() {
                return ['Wait for service recovery', 'Try again later']
              }
            })('Circuit breaker open - using fallback', 'CIRCUIT_BREAKER_OPEN'),
            { circuitState: this.state, timeSinceLastFailure }
          )
          return await fallback()
        }
        throw new (class extends AIError {
          getUserMessage() {
            return 'Service temporarily unavailable. Please try again later.'
          }
          getRecoveryActions() {
            return ['Wait for service recovery', 'Try again in a few minutes']
          }
        })('Circuit breaker is open', 'CIRCUIT_BREAKER_OPEN')
      } else {
        // Try to transition to half-open
        this.state = CircuitState.HALF_OPEN
        this.successes = 0
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()

      // Use fallback if available and appropriate
      if (
        fallback &&
        error instanceof AIError &&
        aiFallback.shouldUseFallback(error)
      ) {
        return await fallback()
      }

      throw error
    }
  }

  private onSuccess(): void {
    this.cleanOldFailures()

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED
        this.failures = []
        this.successes = 0
        console.info('🔧 Circuit breaker closed - service recovered')
      }
    } else if (this.state === CircuitState.OPEN) {
      // Unexpected success while open - close immediately
      this.state = CircuitState.CLOSED
      this.failures = []
      this.successes = 0
    }
  }

  private onFailure(): void {
    const now = Date.now()
    this.failures.push(now)
    this.lastFailureTime = now
    this.cleanOldFailures()

    if (
      this.state === CircuitState.CLOSED &&
      this.failures.length >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN
      console.warn(
        `🚨 Circuit breaker opened after ${this.failures.length} failures`
      )
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN
      this.successes = 0
      console.warn('🚨 Circuit breaker reopened - service still failing')
    }
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.timeWindowMs
    this.failures = this.failures.filter(time => time >= cutoff)
  }

  getState(): { state: CircuitState; failures: number; successes: number } {
    this.cleanOldFailures()
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failures = []
    this.successes = 0
    this.lastFailureTime = 0
  }
}

// Retry manager with exponential backoff
class RetryManager {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...defaultRetryConfig, ...config }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    let lastError: Error = new Error('No attempts made')
    let attempt = 1

    while (attempt <= this.config.maxAttempts) {
      try {
        const result = await operation()

        // Log successful retry if it wasn't the first attempt
        if (attempt > 1) {
          aiMonitoring.recordMetric({
            timestamp: Date.now(),
            analysisType: (context.analysisType as AnalysisType) || 'sentiment',
            operation: (context.operation as string) || 'retry',
            duration: 0,
            success: true,
            retryAttempt: attempt,
            userId: context.userId as string,
          })
        }

        return result
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (error instanceof AIError) {
          const strategy = getRecoveryStrategy(error)
          if (!strategy.retryable || attempt >= this.config.maxAttempts) {
            throw error
          }

          // Use custom retry delay if specified
          if (strategy.retryDelay && strategy.retryDelay > 0) {
            await this.delay(strategy.retryDelay)
            attempt++
            continue
          }
        }

        // Check if we should retry
        if (attempt >= this.config.maxAttempts) {
          break
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt)

        console.warn(
          `⏳ Retry ${attempt}/${this.config.maxAttempts} after ${delay}ms for: ${error instanceof Error ? error.message : 'Unknown error'}`
        )

        // Record failed attempt
        aiMonitoring.recordMetric({
          timestamp: Date.now(),
          analysisType: (context.analysisType as AnalysisType) || 'sentiment',
          operation: (context.operation as string) || 'retry',
          duration: 0,
          success: false,
          error: error instanceof AIError ? error : undefined,
          retryAttempt: attempt,
          userId: context.userId as string,
        })

        await this.delay(delay)
        attempt++
      }
    }

    // All retries exhausted
    throw new (class extends AIError {
      getUserMessage() {
        return 'Operation failed after multiple attempts. Please try again later.'
      }
      getRecoveryActions() {
        return [
          'Wait longer before retrying',
          'Check service status',
          'Contact support',
        ]
      }
    })(
      `Operation failed after ${this.config.maxAttempts} attempts: ${lastError.message}`,
      'RETRY_EXHAUSTED',
      {
        maxAttempts: this.config.maxAttempts,
        lastError: lastError.message,
        ...context,
      }
    )
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay =
      this.config.baseDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt - 1)

    // Apply jitter to prevent thundering herd
    const jitter = 1 + (Math.random() - 0.5) * 2 * this.config.jitterFactor
    const delayWithJitter = exponentialDelay * jitter

    // Clamp to max delay
    return Math.min(delayWithJitter, this.config.maxDelayMs)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Recovery orchestrator that combines circuit breaker, retry logic, and fallbacks
export class AIRecoveryService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private retryManager: RetryManager
  private recoveryAttempts: Map<string, number> = new Map()

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryManager = new RetryManager(retryConfig)
  }

  // Execute operation with full recovery strategy
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    options: {
      operationId: string
      analysisType: AnalysisType
      fallback?: () => Promise<T>
      context?: Record<string, unknown>
      skipCircuitBreaker?: boolean
      skipRetry?: boolean
    }
  ): Promise<T> {
    const {
      operationId,
      analysisType,
      fallback,
      context = {},
      skipCircuitBreaker,
      skipRetry,
    } = options

    // Get or create circuit breaker for this operation
    let circuitBreaker: CircuitBreaker | undefined
    if (!skipCircuitBreaker) {
      if (!this.circuitBreakers.has(operationId)) {
        this.circuitBreakers.set(operationId, new CircuitBreaker())
      }
      circuitBreaker = this.circuitBreakers.get(operationId)!
    }

    // Track recovery attempts
    const attemptKey = `${operationId}_${Date.now()}`
    this.recoveryAttempts.set(attemptKey, 0)

    try {
      const executeOperation = async (): Promise<T> => {
        if (skipRetry) {
          return await operation()
        } else {
          return await this.retryManager.executeWithRetry(operation, {
            ...context,
            analysisType,
            operation: operationId,
          })
        }
      }

      let result: T
      if (circuitBreaker) {
        result = await circuitBreaker.execute(executeOperation, fallback)
      } else {
        result = await withFallback(
          executeOperation,
          fallback ||
            (() => {
              throw new Error('No fallback available')
            }),
          operationId
        )
      }

      // Success - clean up recovery tracking
      this.recoveryAttempts.delete(attemptKey)
      return result
    } catch (error) {
      // Track failed recovery attempt
      const attempts = this.recoveryAttempts.get(attemptKey) || 0
      this.recoveryAttempts.set(attemptKey, attempts + 1)

      // Log the failure with recovery context
      if (error instanceof AIError) {
        aiMonitoring.logError(error, {
          ...context,
          operationId,
          analysisType,
          recoveryAttempts: attempts + 1,
          circuitBreakerState: circuitBreaker?.getState().state,
          fallbackAvailable: !!fallback,
        })
      }

      throw error
    }
  }

  // Get recovery status for monitoring
  getRecoveryStatus(): {
    circuitBreakers: Record<
      string,
      { state: CircuitState; failures: number; successes: number }
    >
    activeRecoveryAttempts: number
    fallbackStatus: ReturnType<typeof aiFallback.getStatus>
  } {
    const circuitStatus: Record<
      string,
      { state: CircuitState; failures: number; successes: number }
    > = {}
    for (const [id, breaker] of this.circuitBreakers.entries()) {
      circuitStatus[id] = breaker.getState()
    }

    return {
      circuitBreakers: circuitStatus,
      activeRecoveryAttempts: this.recoveryAttempts.size,
      fallbackStatus: aiFallback.getStatus(),
    }
  }

  // Reset specific circuit breaker
  resetCircuitBreaker(operationId: string): boolean {
    const breaker = this.circuitBreakers.get(operationId)
    if (breaker) {
      breaker.reset()
      console.info(`🔧 Circuit breaker reset for ${operationId}`)
      return true
    }
    return false
  }

  // Reset all circuit breakers
  resetAllCircuitBreakers(): void {
    for (const [, breaker] of this.circuitBreakers.entries()) {
      breaker.reset()
    }
    console.info('🔧 All circuit breakers reset')
  }

  // Health check for recovery system
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'down'
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check circuit breaker states
    const openCircuits = Array.from(this.circuitBreakers.entries()).filter(
      ([, breaker]) => breaker.getState().state === CircuitState.OPEN
    )

    if (openCircuits.length > 0) {
      issues.push(`${openCircuits.length} circuit breaker(s) open`)
      recommendations.push('Investigate failing operations')
    }

    // Check if fallback is active
    if (aiFallback.isFallbackActive()) {
      issues.push(`Fallback mode active: ${aiFallback.getFallbackReason()}`)
      recommendations.push('Resolve primary AI service issues')
    }

    // Check active recovery attempts
    if (this.recoveryAttempts.size > 10) {
      issues.push(
        `High number of recovery attempts: ${this.recoveryAttempts.size}`
      )
      recommendations.push('Check for systematic issues')
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'down'
    if (issues.length === 0) {
      status = 'healthy'
    } else if (
      openCircuits.length === this.circuitBreakers.size &&
      this.circuitBreakers.size > 0
    ) {
      status = 'down'
    } else {
      status = 'degraded'
    }

    return { status, issues, recommendations }
  }

  // Cleanup old recovery attempts
  cleanup(): void {
    const cutoff = Date.now() - 300000 // 5 minutes
    for (const [key] of this.recoveryAttempts.entries()) {
      const timestamp = parseInt(key.split('_').pop() || '0')
      if (timestamp < cutoff) {
        this.recoveryAttempts.delete(key)
      }
    }
  }
}

// Singleton recovery service
export const aiRecovery = new AIRecoveryService()

// Cleanup interval
setInterval(() => aiRecovery.cleanup(), 60000) // Clean up every minute

// Helper function for common AI operations
export async function executeAIOperation<T>(
  operation: () => Promise<T>,
  operationId: string,
  analysisType: AnalysisType,
  fallback?: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  return aiRecovery.executeWithRecovery(operation, {
    operationId,
    analysisType,
    fallback,
    context,
  })
}

export default aiRecovery
