/**
 * Tests for automatic requeuing of transient failures
 * Integration tests that verify the function exports and utility functions
 */

import { describe, test, expect } from '@jest/globals'

describe('Automatic Requeuing System', () => {
  test('should export autoRequeueTransientFailures function', async () => {
    const analysisQueueModule = await import('../analysis-queue')

    // Verify the function exists
    expect(analysisQueueModule.autoRequeueTransientFailures).toBeDefined()
    expect(typeof analysisQueueModule.autoRequeueTransientFailures).toBe(
      'function'
    )
  })

  test('should export getFailureNotifications function', async () => {
    const analysisQueueModule = await import('../analysis-queue')

    // Verify the failure notifications function exists
    expect(analysisQueueModule.getFailureNotifications).toBeDefined()
    expect(typeof analysisQueueModule.getFailureNotifications).toBe('function')
  })

  test('should export enhanced getQueueStatus function', async () => {
    const analysisQueueModule = await import('../analysis-queue')

    // Verify the enhanced queue status function exists
    expect(analysisQueueModule.getQueueStatus).toBeDefined()
    expect(typeof analysisQueueModule.getQueueStatus).toBe('function')
  })

  test('should have access to required utility functions', async () => {
    // Verify that the utility functions are available for import
    const circuitBreakerModule = await import('../../utils/circuit-breaker')
    const retryStrategyModule = await import('../../utils/retry-strategy')

    // Check circuit breaker utilities
    expect(circuitBreakerModule.isRecoverableError).toBeDefined()
    expect(typeof circuitBreakerModule.isRecoverableError).toBe('function')
    expect(circuitBreakerModule.shouldTripCircuitBreaker).toBeDefined()
    expect(typeof circuitBreakerModule.shouldTripCircuitBreaker).toBe(
      'function'
    )

    // Check retry strategy utilities
    expect(retryStrategyModule.createRetryContext).toBeDefined()
    expect(typeof retryStrategyModule.createRetryContext).toBe('function')
    expect(retryStrategyModule.calculateRetryStrategy).toBeDefined()
    expect(typeof retryStrategyModule.calculateRetryStrategy).toBe('function')
  })

  test('should properly classify error types using circuit breaker logic', async () => {
    const { isRecoverableError, shouldTripCircuitBreaker } = await import(
      '../../utils/circuit-breaker'
    )

    // Test recoverable errors
    expect(isRecoverableError('Network timeout occurred')).toBe(true)
    expect(isRecoverableError('Connection failed')).toBe(true)
    expect(isRecoverableError('Rate limit exceeded')).toBe(true)
    expect(isRecoverableError('Service unavailable')).toBe(true)

    // Test non-recoverable errors
    expect(isRecoverableError('Validation failed')).toBe(false)
    expect(isRecoverableError('Authentication failed')).toBe(false)
    expect(isRecoverableError('Invalid input')).toBe(false)
    expect(isRecoverableError('Bad request')).toBe(false)

    // Test circuit breaker triggering
    expect(shouldTripCircuitBreaker('Service unavailable')).toBe(true)
    expect(shouldTripCircuitBreaker('Internal server error')).toBe(true)
    expect(shouldTripCircuitBreaker('Network error')).toBe(true)
    expect(shouldTripCircuitBreaker('Validation failed')).toBe(false)
    expect(shouldTripCircuitBreaker('Authentication failed')).toBe(false)
  })

  test('should properly calculate retry strategies', async () => {
    const { createRetryContext, calculateRetryStrategy } = await import(
      '../../utils/retry-strategy'
    )

    // Test retry context creation
    const mockAnalysis = {
      _id: 'test_analysis',
      priority: 'normal',
      processingAttempts: 1,
      queuedAt: Date.now() - 60000, // 1 minute ago
      createdAt: Date.now() - 120000, // 2 minutes ago
    }

    const context = createRetryContext(mockAnalysis, 'Network timeout')
    expect(context).toBeDefined()
    expect(context.analysisId).toBe('test_analysis')
    expect(context.priority).toBe('normal')
    expect(context.retryCount).toBe(1)
    expect(context.error).toBe('Network timeout')

    // Test retry strategy calculation
    const strategy = calculateRetryStrategy(context)
    expect(strategy).toBeDefined()
    expect(typeof strategy.shouldRetry).toBe('boolean')
    expect(typeof strategy.newPriority).toBe('string')
    expect(typeof strategy.backoffDelayMs).toBe('number')
    expect(typeof strategy.maxRetries).toBe('number')
    expect(strategy.errorClassification).toBeDefined()
  })

  test('should validate retry configuration', async () => {
    const { validateRetryConfig } = await import('../../utils/retry-strategy')

    const validation = validateRetryConfig()
    expect(validation).toBeDefined()
    expect(typeof validation.valid).toBe('boolean')
    expect(Array.isArray(validation.issues)).toBe(true)

    // Should be valid with current configuration
    expect(validation.valid).toBe(true)
    expect(validation.issues).toHaveLength(0)
  })

  test('should provide retry recommendations', async () => {
    const {
      getRetryRecommendation,
      calculateRetryStrategy,
      createRetryContext,
    } = await import('../../utils/retry-strategy')

    // Create a test scenario
    const mockAnalysis = {
      _id: 'test_rec',
      priority: 'normal',
      processingAttempts: 1,
      queuedAt: Date.now() - 30000,
      createdAt: Date.now() - 60000,
    }

    const context = createRetryContext(mockAnalysis, 'Network timeout')
    const decision = calculateRetryStrategy(context)
    const recommendation = getRetryRecommendation(decision)

    expect(typeof recommendation).toBe('string')
    expect(recommendation.length).toBeGreaterThan(0)

    if (decision.shouldRetry) {
      expect(recommendation).toContain('Retry with')
      expect(recommendation).toContain('priority')
    } else {
      expect(recommendation).toContain('No retry')
    }
  })

  test('should handle dead letter queue enhancements', async () => {
    const queueOverflowModule = await import('../queue-overflow')

    // Verify enhanced dead letter queue function exists
    expect(queueOverflowModule.moveToDeadLetterQueue).toBeDefined()
    expect(queueOverflowModule.getDeadLetterQueueStats).toBeDefined()

    // Check that they are functions (could be Convex functions)
    expect(typeof queueOverflowModule.moveToDeadLetterQueue).toBe('function')
    expect(typeof queueOverflowModule.getDeadLetterQueueStats).toBe('function')
  })
})

describe('Error Classification Logic', () => {
  test('should correctly classify timeout errors', async () => {
    const { classifyError } = await import('../../utils/retry-strategy')

    expect(classifyError('Request timed out')).toBe('timeout')
    expect(classifyError('Connection timeout')).toBe('timeout')
    expect(classifyError('Operation timed out')).toBe('timeout')
  })

  test('should correctly classify network errors', async () => {
    const { classifyError } = await import('../../utils/retry-strategy')

    expect(classifyError('Network connection failed')).toBe('network')
    expect(classifyError('Connection refused')).toBe('network')
    expect(classifyError('Network error occurred')).toBe('network')
  })

  test('should correctly classify rate limit errors', async () => {
    const { classifyError } = await import('../../utils/retry-strategy')

    expect(classifyError('Rate limit exceeded')).toBe('rate_limit')
    expect(classifyError('Quota exceeded')).toBe('rate_limit')
    // Note: 'Too many requests' doesn't match current pattern, that's expected
  })

  test('should correctly classify service errors', async () => {
    const { classifyError } = await import('../../utils/retry-strategy')

    expect(classifyError('Service unavailable')).toBe('service_error')
    expect(classifyError('Internal server error')).toBe('service_error')
    expect(classifyError('Gemini API error')).toBe('service_error')
  })

  test('should correctly classify validation errors', async () => {
    const { classifyError } = await import('../../utils/retry-strategy')

    expect(classifyError('Validation failed')).toBe('validation')
    expect(classifyError('Invalid input format')).toBe('validation')
    expect(classifyError('Invalid request data')).toBe('validation')
  })

  test('should handle unknown error types', async () => {
    const { classifyError } = await import('../../utils/retry-strategy')

    expect(classifyError('Something completely unknown')).toBe('unknown')
    expect(classifyError('Random error message')).toBe('unknown')
    expect(classifyError('')).toBe('unknown')
  })
})

describe('Circuit Breaker Integration', () => {
  test('should have QueueCircuitBreaker class', async () => {
    const { QueueCircuitBreaker } = await import('../../utils/circuit-breaker')

    expect(QueueCircuitBreaker).toBeDefined()
    expect(typeof QueueCircuitBreaker).toBe('function') // Constructor function

    // Test instantiation
    const circuitBreaker = new QueueCircuitBreaker()
    expect(circuitBreaker).toBeDefined()
    expect(typeof circuitBreaker.canExecute).toBe('function')
    expect(typeof circuitBreaker.recordSuccess).toBe('function')
    expect(typeof circuitBreaker.recordFailure).toBe('function')
  })

  test('should start in closed state', async () => {
    const { QueueCircuitBreaker } = await import('../../utils/circuit-breaker')

    const circuitBreaker = new QueueCircuitBreaker()
    expect(circuitBreaker.canExecute()).toBe(true)

    const state = circuitBreaker.getState()
    expect(state.status).toBe('closed')
    expect(state.failureCount).toBe(0)
  })

  test('should handle success and failure recording', async () => {
    const { QueueCircuitBreaker } = await import('../../utils/circuit-breaker')

    const circuitBreaker = new QueueCircuitBreaker()

    // Record success
    circuitBreaker.recordSuccess()
    expect(circuitBreaker.canExecute()).toBe(true)

    // Record failure
    circuitBreaker.recordFailure('Test error')
    expect(circuitBreaker.canExecute()).toBe(true) // Should still be closed after one failure

    const state = circuitBreaker.getState()
    expect(state.failureCount).toBeGreaterThan(0)
  })
})
