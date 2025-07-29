/**
 * Enhanced Retry Strategy Tests
 * Tests the improved exponential backoff with jitter algorithms
 */

import {
  calculateRetryStrategy,
  createRetryContext,
  classifyError,
  isFallbackEligible,
  getRetryRecommendation,
  calculateRetryBudget,
  shouldAllowRetry,
  JitterType,
  type RetryContext,
  type RetryDecision,
} from '../retry_strategy'

// Mock circuit breaker functions
jest.mock('../circuit_breaker', () => ({
  shouldTripCircuitBreaker: jest.fn(
    (error: string) =>
      error.toLowerCase().includes('service') ||
      error.toLowerCase().includes('api')
  ),
  isRecoverableError: jest.fn((error: string) => {
    const lowerError = error.toLowerCase()
    return !lowerError.includes('validation') && !lowerError.includes('auth')
  }),
  getCircuitBreakerState: jest.fn(() => ({ state: 'closed' })),
}))

describe('Enhanced Retry Strategy', () => {
  describe('Error Classification', () => {
    test('classifies errors correctly', () => {
      expect(classifyError('Network timeout occurred')).toBe('timeout')
      expect(classifyError('Connection failed')).toBe('network')
      expect(classifyError('Rate limit exceeded')).toBe('rate_limit')
      expect(classifyError('Service error 500')).toBe('service_error')
      expect(classifyError('Invalid input validation')).toBe('validation')
      expect(classifyError('Unauthorized access')).toBe('authentication')
      expect(classifyError('Gemini API error')).toBe('service_error')
      expect(classifyError('Unknown error')).toBe('unknown')
    })

    test('determines fallback eligibility correctly', () => {
      expect(isFallbackEligible('network')).toBe(true)
      expect(isFallbackEligible('rate_limit')).toBe(true)
      expect(isFallbackEligible('timeout')).toBe(true)
      expect(isFallbackEligible('service_error')).toBe(true)
      expect(isFallbackEligible('validation')).toBe(false)
      expect(isFallbackEligible('authentication')).toBe(false)
      expect(isFallbackEligible('unknown')).toBe(false)
    })
  })

  describe('Circuit Breaker Integration', () => {
    test('adapts backoff based on circuit breaker state', () => {
      const baseContext: RetryContext = {
        priority: 'normal',
        error: 'Service error',
        retryCount: 1,
        originalPriority: 'normal',
        totalWaitTime: 5000,
        analysisId: 'test-id',
      }

      // Test with closed circuit breaker
      const closedResult = calculateRetryStrategy({
        ...baseContext,
        circuitBreakerState: 'closed',
      })
      expect(closedResult.shouldRetry).toBe(true)
      expect(closedResult.adaptiveBackoffFactor).toBe(1)

      // Test with half-open circuit breaker
      const halfOpenResult = calculateRetryStrategy({
        ...baseContext,
        circuitBreakerState: 'half_open',
      })
      expect(halfOpenResult.shouldRetry).toBe(true)
      expect(halfOpenResult.adaptiveBackoffFactor).toBe(1.5)

      // Test with open circuit breaker
      const openResult = calculateRetryStrategy({
        ...baseContext,
        circuitBreakerState: 'open',
      })
      expect(openResult.shouldRetry).toBe(false)
      expect(openResult.escalationReason).toContain('Circuit breaker is OPEN')
    })

    test('includes fallback eligibility in error classification', () => {
      const context: RetryContext = {
        priority: 'normal',
        error: 'Network timeout',
        retryCount: 1,
        originalPriority: 'normal',
        totalWaitTime: 5000,
        analysisId: 'test-id',
      }

      const result = calculateRetryStrategy(context)
      expect(result.errorClassification.fallbackEligible).toBe(true)
    })
  })

  describe('Improved Jitter Algorithms', () => {
    test('selects appropriate jitter type based on error', () => {
      const testCases = [
        { error: 'Service error', expectedJitter: 'decorrelated' },
        { error: 'Rate limit exceeded', expectedJitter: 'equal' },
        { error: 'Network timeout', expectedJitter: 'exponential' },
        { error: 'Connection failed', expectedJitter: 'exponential' },
        { error: 'Unknown error', expectedJitter: 'full' },
      ]

      testCases.forEach(({ error, expectedJitter }) => {
        const context: RetryContext = {
          priority: 'normal',
          error,
          retryCount: 1,
          originalPriority: 'normal',
          totalWaitTime: 5000,
          analysisId: 'test-id',
        }

        const result = calculateRetryStrategy(context)
        if (result.shouldRetry) {
          expect(result.jitterType).toBe(expectedJitter)
        }
      })
    })

    test('uses decorrelated jitter for half-open circuit breaker', () => {
      const context: RetryContext = {
        priority: 'normal',
        error: 'Network error',
        retryCount: 1,
        originalPriority: 'normal',
        totalWaitTime: 5000,
        analysisId: 'test-id',
        circuitBreakerState: 'half_open',
      }

      const result = calculateRetryStrategy(context)
      if (result.shouldRetry) {
        expect(result.jitterType).toBe('decorrelated')
      }
    })

    test('produces different delays with jitter', () => {
      const context: RetryContext = {
        priority: 'normal',
        error: 'Network timeout',
        retryCount: 2,
        originalPriority: 'normal',
        totalWaitTime: 5000,
        analysisId: 'test-id',
      }

      // Run multiple times to ensure different delays due to jitter
      const delays: number[] = []
      for (let i = 0; i < 10; i++) {
        const result = calculateRetryStrategy(context)
        if (result.shouldRetry) {
          delays.push(result.backoffDelayMs)
        }
      }

      // Ensure we got different delay values (jitter working)
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('Retry Budget Management', () => {
    test('calculates retry budget correctly', () => {
      const lowLoadStats = {
        currentSize: 100,
        maxSize: 1000,
        processingCount: 2,
        maxConcurrent: 10,
      }

      const budget = calculateRetryBudget(lowLoadStats)
      expect(budget.budgetPercentage).toBeGreaterThanOrEqual(0.8)
      expect(budget.recommendation).toBe('allow')

      const highLoadStats = {
        currentSize: 900,
        maxSize: 1000,
        processingCount: 9,
        maxConcurrent: 10,
      }

      const constrainedBudget = calculateRetryBudget(highLoadStats)
      expect(constrainedBudget.budgetPercentage).toBeLessThan(0.2)
      expect(constrainedBudget.recommendation).toBe('reject')
    })

    test('enforces retry budget constraints', () => {
      const retryDecision: RetryDecision = {
        shouldRetry: true,
        newPriority: 'normal',
        backoffDelayMs: 5000,
        maxRetries: 3,
        errorClassification: {
          type: 'network',
          isServiceError: false,
          isRecoverable: true,
          shouldTripCircuit: false,
          fallbackEligible: true,
        },
      }

      const highBudget = {
        availableBudget: 80,
        budgetPercentage: 0.8,
        recommendation: 'allow' as const,
      }

      const lowBudget = {
        availableBudget: 10,
        budgetPercentage: 0.1,
        recommendation: 'reject' as const,
      }

      expect(shouldAllowRetry(retryDecision, highBudget).allowed).toBe(true)
      expect(shouldAllowRetry(retryDecision, lowBudget).allowed).toBe(false)

      // Urgent priority should be allowed even with very low budget (>0.1)
      const urgentDecision = {
        ...retryDecision,
        newPriority: 'urgent' as const,
      }
      const veryLowBudget = {
        availableBudget: 15,
        budgetPercentage: 0.15,
        recommendation: 'reject' as const,
      }
      expect(shouldAllowRetry(urgentDecision, veryLowBudget).allowed).toBe(true)
    })
  })

  describe('Context Creation', () => {
    test('creates retry context with circuit breaker state', () => {
      const analysis = {
        _id: 'test-id',
        priority: 'high',
        processingAttempts: 2,
        queuedAt: Date.now() - 10000,
        createdAt: Date.now() - 15000,
        lastProcessingAttempt: Date.now() - 5000,
        circuitBreakerState: {
          state: 'half_open' as const,
          failureCount: 3,
        },
      }

      const context = createRetryContext(analysis, 'Service error')

      expect(context.priority).toBe('high')
      expect(context.retryCount).toBe(2)
      expect(context.circuitBreakerState).toBe('half_open')
      expect(context.lastAttemptTimestamp).toBe(analysis.lastProcessingAttempt)
      expect(context.totalWaitTime).toBeGreaterThan(0)
    })
  })

  describe('Retry Recommendations', () => {
    test('generates comprehensive retry recommendations', () => {
      const decision: RetryDecision = {
        shouldRetry: true,
        newPriority: 'high',
        backoffDelayMs: 8500,
        maxRetries: 3,
        adaptiveBackoffFactor: 1.5,
        jitterType: 'decorrelated',
        errorClassification: {
          type: 'service_error',
          isServiceError: true,
          isRecoverable: true,
          shouldTripCircuit: true,
          fallbackEligible: true,
        },
      }

      const recommendation = getRetryRecommendation(decision)

      expect(recommendation).toContain('high priority')
      expect(recommendation).toContain('delay')
      expect(recommendation).toContain('decorrelated jitter')
      expect(recommendation).toContain('1.5x adaptive backoff')
      expect(recommendation).toContain('service error')
      expect(recommendation).toContain('circuit breaker aware')
      expect(recommendation).toContain('fallback eligible')
    })

    test('generates escalation reasons for non-retry cases', () => {
      const nonRetryDecision: RetryDecision = {
        shouldRetry: false,
        newPriority: 'normal',
        backoffDelayMs: 0,
        maxRetries: 3,
        escalationReason: 'Circuit breaker is open - fallback recommended',
        errorClassification: {
          type: 'service_error',
          isServiceError: true,
          isRecoverable: true,
          shouldTripCircuit: true,
          fallbackEligible: true,
        },
      }

      const recommendation = getRetryRecommendation(nonRetryDecision)
      expect(recommendation).toBe(
        'Circuit breaker is open - fallback recommended'
      )
    })
  })

  describe('Priority Escalation', () => {
    test('escalates priority based on retry count and error severity', () => {
      // Test service error escalation (isServiceError = true, upgradeAfterAttempts = 2)
      const serviceErrorContext: RetryContext = {
        priority: 'normal',
        error: 'Service error 500',
        retryCount: 2, // retryCount >= upgradeAfterAttempts (2) should escalate
        originalPriority: 'normal',
        totalWaitTime: 10000,
        analysisId: 'test-id',
      }

      const result = calculateRetryStrategy(serviceErrorContext)
      expect(result.newPriority).toBe('high') // Should escalate for service errors

      // Test network error escalation (isServiceError = false, upgradeAfterAttempts = 1)
      // For non-service errors: retryCount >= upgradeAfterAttempts + 1 = 1 + 1 = 2
      const networkErrorContext: RetryContext = {
        priority: 'normal',
        error: 'Connection failed', // This should be classified as network error with upgradeAfterAttempts = 1
        retryCount: 2, // Should be >= 2 to escalate for client errors
        originalPriority: 'normal',
        totalWaitTime: 15000,
        analysisId: 'test-id',
      }

      const networkResult = calculateRetryStrategy(networkErrorContext)
      expect(networkResult.newPriority).toBe('high') // Should escalate for client errors at retry 2
    })
  })
})
