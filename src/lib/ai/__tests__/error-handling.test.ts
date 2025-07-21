/**
 * Comprehensive Error Handling Tests
 * Tests error handling, recovery, monitoring, and fallback systems
 */

import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals'
import {
  AIServiceConnectionError,
  AIServiceAuthError,
  AIServiceRateLimitError,
  AIAnalysisProcessingError,
  AIDataValidationError,
  AIResourceLimitError,
  AITimeoutError,
  AIPartialFailureError,
  getErrorSeverity,
  getRecoveryStrategy,
  AIErrorSeverity
} from '../errors'
import { aiMonitoring, withMonitoring } from '../monitoring'
import { aiFallback, withFallback, AIFallbackService } from '../fallback'
import { aiRecovery, executeAIOperation } from '../recovery'

// Set up environment
process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'

describe('Comprehensive Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fallback state
    aiFallback.deactivateFallback()
    // Reset circuit breakers
    aiRecovery.resetAllCircuitBreakers()
    // Clear monitoring state
    aiMonitoring.resetState()
  })

  describe('Error Classification and Severity', () => {
    test('should classify connection errors as HIGH severity', () => {
      const error = new AIServiceConnectionError('gemini', new Error('Network timeout'))
      expect(getErrorSeverity(error)).toBe(AIErrorSeverity.HIGH)
      expect(error.recoverable).toBe(true)
      expect(error.retryable).toBe(true)
    })

    test('should classify auth errors as CRITICAL severity', () => {
      const error = new AIServiceAuthError('gemini', 401)
      expect(getErrorSeverity(error)).toBe(AIErrorSeverity.CRITICAL)
      expect(error.recoverable).toBe(false)
      expect(error.retryable).toBe(false)
    })

    test('should classify rate limit errors as MEDIUM severity', () => {
      const error = new AIServiceRateLimitError('gemini', 60000)
      expect(getErrorSeverity(error)).toBe(AIErrorSeverity.MEDIUM)
      expect(error.retryable).toBe(true)
      expect(error.retryAfter).toBe(60000)
    })

    test('should provide user-friendly messages', () => {
      const connectionError = new AIServiceConnectionError('gemini')
      expect(connectionError.getUserMessage()).toContain('temporarily unavailable')
      
      const authError = new AIServiceAuthError('gemini')
      expect(authError.getUserMessage()).toContain('authentication failed')
      
      const rateLimitError = new AIServiceRateLimitError('gemini', 30000)
      expect(rateLimitError.getUserMessage()).toContain('rate limited')
    })

    test('should provide recovery actions', () => {
      const error = new AIServiceConnectionError('gemini')
      const actions = error.getRecoveryActions()
      expect(actions).toContain('Check internet connection')
      expect(actions).toContain('Try again in a few minutes')
    })
  })

  describe('Recovery Strategies', () => {
    test('should provide appropriate retry strategies for different errors', () => {
      const connectionError = new AIServiceConnectionError('gemini')
      const connectionStrategy = getRecoveryStrategy(connectionError)
      expect(connectionStrategy.retryable).toBe(true)
      expect(connectionStrategy.maxRetries).toBe(3)
      expect(connectionStrategy.retryDelay).toBe(5000)

      const authError = new AIServiceAuthError('gemini')
      const authStrategy = getRecoveryStrategy(authError)
      expect(authStrategy.retryable).toBe(false)
      expect(authStrategy.maxRetries).toBe(0)

      const rateLimitError = new AIServiceRateLimitError('gemini', 30000)
      const rateLimitStrategy = getRecoveryStrategy(rateLimitError)
      expect(rateLimitStrategy.retryDelay).toBe(30000)
      expect(rateLimitStrategy.maxRetries).toBe(1)
    })
  })

  describe('Monitoring System', () => {
    test('should track error metrics', () => {
      const error = new AIAnalysisProcessingError('sentiment', 'generation')
      aiMonitoring.logError(error, { userId: 'test-user' })

      const stats = aiMonitoring.getErrorStats(3600000) // 1 hour
      expect(stats.total).toBe(1)
      expect(stats.byType['AIAnalysisProcessingError']).toBe(1)
      expect(stats.bySeverity[AIErrorSeverity.LOW]).toBe(1)
      expect(stats.recentErrors).toHaveLength(1)
    })

    test('should track performance metrics', () => {
      aiMonitoring.recordMetric({
        timestamp: Date.now(),
        analysisType: 'sentiment',
        operation: 'test_analysis',
        duration: 1500,
        success: true,
        tokens: 100,
        confidence: 0.9
      })

      const performance = aiMonitoring.getPerformanceMetrics()
      expect(performance.totalRequests).toBe(1)
      expect(performance.successfulRequests).toBe(1)
      expect(performance.failedRequests).toBe(0)
      expect(performance.averageLatency).toBe(1500)
    })

    test('should provide health status', () => {
      const health = aiMonitoring.getHealthStatus()
      expect(health.status).toBe('healthy')
      expect(health.issues).toHaveLength(0)
    })

    test('should monitor operations with timing', async () => {
      const operation = jest.fn(() => Promise.resolve('success'))
      
      const result = await withMonitoring('test_operation', 'sentiment', operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('Fallback System', () => {
    test('should perform rule-based sentiment analysis', async () => {
      const positiveEntry = "I had an amazing day with my partner! We were so happy and connected."
      const result = await aiFallback.analyzeSentimentFallback(positiveEntry)
      
      expect(result.sentiment_score).toBeGreaterThan(6)
      expect(result.emotions_detected).toContain('joy')
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.explanation).toContain('Fallback analysis')
    })

    test('should analyze negative sentiment correctly', async () => {
      const negativeEntry = "We had a terrible fight today. I feel so angry and hurt."
      const result = await aiFallback.analyzeSentimentFallback(negativeEntry)
      
      expect(result.sentiment_score).toBeLessThan(5)
      expect(result.emotions_detected).toContain('anger')
      expect(result.confidence).toBeGreaterThan(0.3)
    })

    test('should perform stability analysis fallback', async () => {
      const sentimentHistory = [
        { score: 8, timestamp: Date.now(), emotions: ['happy'] },
        { score: 6, timestamp: Date.now() - 86400000, emotions: ['content'] },
        { score: 7, timestamp: Date.now() - 172800000, emotions: ['positive'] }
      ]
      
      const result = await aiFallback.analyzeStabilityFallback(sentimentHistory)
      
      expect(result.stability_score).toBeGreaterThan(0)
      expect(result.trend_direction).toMatch(/improving|declining|stable/)
      expect(result.volatility_level).toMatch(/low|moderate|high/)
      expect(result.recovery_patterns).toContain('offline mode')
    })

    test('should activate and deactivate fallback mode', () => {
      expect(aiFallback.isFallbackActive()).toBe(false)
      
      aiFallback.activateFallback('Test reason')
      expect(aiFallback.isFallbackActive()).toBe(true)
      expect(aiFallback.getFallbackReason()).toBe('Test reason')
      
      aiFallback.deactivateFallback()
      expect(aiFallback.isFallbackActive()).toBe(false)
    })

    test('should use fallback with withFallback helper', async () => {
      const primaryOperation = jest.fn(() => Promise.reject(new AIServiceConnectionError('gemini')))
      const fallbackOperation = jest.fn(() => Promise.resolve('fallback_result'))
      
      const result = await withFallback(primaryOperation, fallbackOperation, 'test_operation')
      
      expect(result).toBe('fallback_result')
      expect(primaryOperation).toHaveBeenCalledTimes(1)
      expect(fallbackOperation).toHaveBeenCalledTimes(1)
      expect(aiFallback.isFallbackActive()).toBe(true)
    })
  })

  describe('Circuit Breaker and Recovery', () => {
    test('should execute operation successfully', async () => {
      const operation = jest.fn(() => Promise.resolve('success'))
      
      const result = await executeAIOperation(
        operation,
        'test_operation',
        'sentiment'
      )
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    test('should retry failed operations (unit test)', () => {
      // Test the retry strategy configuration rather than execution timing
      const connectionError = new AIServiceConnectionError('gemini')
      const strategy = getRecoveryStrategy(connectionError)
      
      expect(strategy.retryable).toBe(true)
      expect(strategy.maxRetries).toBe(3)
      expect(strategy.retryDelay).toBe(5000)
    })

    test('should determine fallback eligibility', () => {
      // Test fallback decision logic
      const connectionError = new AIServiceConnectionError('gemini')
      const authError = new AIServiceAuthError('gemini')
      
      expect(aiFallback.shouldUseFallback(connectionError)).toBe(true)
      expect(aiFallback.shouldUseFallback(authError)).toBe(false) // Not retryable by default
    })

    test('should track recovery status', () => {
      const status = aiRecovery.getRecoveryStatus()
      
      expect(status).toHaveProperty('circuitBreakers')
      expect(status).toHaveProperty('activeRecoveryAttempts')
      expect(status).toHaveProperty('fallbackStatus')
      expect(status.fallbackStatus.capabilities).toContain('Rule-based sentiment analysis')
    })

    test('should provide health status for recovery system', () => {
      const health = aiRecovery.getHealthStatus()
      
      expect(health.status).toMatch(/healthy|degraded|down/)
      expect(Array.isArray(health.issues)).toBe(true)
      expect(Array.isArray(health.recommendations)).toBe(true)
    })
  })

  describe('Partial Failure Handling', () => {
    test('should handle partial analysis failures', () => {
      const successfulAnalyses = ['sentiment', 'energy_impact'] as const
      const failedAnalyses = [
        { type: 'emotional_stability' as const, error: new Error('Stability analysis failed') }
      ]
      
      const partialError = new AIPartialFailureError(
        [...successfulAnalyses],
        failedAnalyses
      )
      
      expect(partialError.successfulAnalyses).toEqual(successfulAnalyses)
      expect(partialError.failedAnalyses).toHaveLength(1)
      expect(partialError.getUserMessage()).toContain('Some AI analyses completed successfully')
      expect(partialError.getRecoveryActions()).toContain('Retry failed analyses individually')
    })
  })

  describe('Integration Tests', () => {
    test('should integrate all error handling components', () => {
      // Test that all components are properly integrated
      const error = new AIServiceConnectionError('gemini')
      
      // Error classification
      const severity = getErrorSeverity(error)
      expect(severity).toBeDefined()
      
      // Recovery strategy
      const strategy = getRecoveryStrategy(error)
      expect(strategy).toBeDefined()
      
      // Fallback eligibility
      const shouldFallback = aiFallback.shouldUseFallback(error)
      expect(shouldFallback).toBe(true)
      
      // Recovery status
      const status = aiRecovery.getRecoveryStatus()
      expect(status).toBeDefined()
    })

    test('should export comprehensive metrics', () => {
      // Log some test errors and metrics
      aiMonitoring.logError(new AIServiceConnectionError('gemini'))
      aiMonitoring.recordMetric({
        timestamp: Date.now(),
        analysisType: 'sentiment',
        operation: 'test',
        duration: 1000,
        success: true
      })

      const metrics = aiMonitoring.exportMetrics()
      
      expect(metrics).toHaveProperty('errors')
      expect(metrics).toHaveProperty('performance')
      expect(metrics).toHaveProperty('health')
      expect(metrics).toHaveProperty('alerts')
      
      expect(metrics.errors.total).toBeGreaterThan(0)
      expect(metrics.performance.totalRequests).toBeGreaterThan(0)
      expect(metrics.health.status).toMatch(/healthy|degraded|down/)
    })
  })

  describe('Error Context and Debugging', () => {
    test('should provide rich error context', () => {
      const error = new AIAnalysisProcessingError(
        'sentiment',
        'validation',
        new Error('Schema validation failed'),
        { userId: 'test-user', journalEntryId: 'entry-123' }
      )

      const errorJson = error.toJSON()
      
      expect(errorJson.name).toBe('AIAnalysisProcessingError')
      expect(errorJson.errorCode).toBe('AI_ANALYSIS_PROCESSING_ERROR')
      expect(errorJson.context.userId).toBe('test-user')
      expect(errorJson.context.journalEntryId).toBe('entry-123')
      expect(errorJson.recoverable).toBe(true)
      expect(errorJson.retryable).toBe(true)
      expect(errorJson.timestamp).toBeDefined()
    })

    test('should track error patterns for debugging', () => {
      // Simulate multiple similar errors
      for (let i = 0; i < 5; i++) {
        aiMonitoring.logError(new AIServiceRateLimitError('gemini', 60000))
      }

      const stats = aiMonitoring.getErrorStats()
      expect(stats.byType['AIServiceRateLimitError']).toBe(5)
      expect(stats.bySeverity[AIErrorSeverity.MEDIUM]).toBe(5)
    })
  })
})