/**
 * Circuit Breaker Pattern Implementation for Queue-Based AI Processing
 * Prevents cascading failures and manages service degradation gracefully
 */

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
