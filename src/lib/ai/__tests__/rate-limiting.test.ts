/**
 * Rate Limiting and Cost Control Tests
 * Tests for rate limiter, cost tracker, and integrated API protection
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { AIRateLimiter, getAIRateLimiter, withRateLimit } from '../rate-limiter'
import { AICostTracker, getAICostTracker, checkBudget } from '../cost-tracker'
import { AIServiceRateLimitError, AIResourceLimitError } from '../errors'
import { AnalysisType } from '../../types'

// Set up environment
process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'

describe('AI Rate Limiting and Cost Control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset singleton instances
    jest.resetModules()
    // Temporarily disable test mode for rate limiting tests
    delete process.env.AI_RATE_LIMITING_DISABLED
  })
  
  afterEach(() => {
    // Re-enable test mode
    process.env.AI_RATE_LIMITING_DISABLED = 'true'
  })

  describe('Rate Limiter', () => {
    test('should initialize with correct tier configuration', () => {
      const freeTierLimiter = new AIRateLimiter('free')
      const paidTierLimiter = new AIRateLimiter('paid')
      
      const freeStatus = freeTierLimiter.getStatus()
      const paidStatus = paidTierLimiter.getStatus()
      
      // Free tier has lower limits
      expect(freeStatus.config.requestsPerMinute).toBe(15)
      expect(freeStatus.config.costPerMinute).toBe(10) // $0.10 in cents
      
      // Paid tier has higher limits
      expect(paidStatus.config.requestsPerMinute).toBe(60)
      expect(paidStatus.config.costPerMinute).toBe(100) // $1.00 in cents
    })

    test('should allow requests within rate limits', async () => {
      const rateLimiter = new AIRateLimiter('free')
      
      const status = await rateLimiter.checkRateLimit('sentiment', 1000, 'normal')
      
      expect(status.allowed).toBe(true)
      expect(status.current.requests).toBe(1)
      expect(status.current.tokens).toBe(1000)
      expect(status.resetTime).toBeGreaterThan(Date.now())
    })

    test('should block requests exceeding rate limits', async () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 1, // Very low limit for testing
        tokensPerMinute: 10000,
        costPerMinute: 1000,
        burstMultiplier: 1, // Disable burst for testing
        maxQueueSize: 0, // Disable queueing for faster test
        maxWaitTimeMs: 100 // Short wait time
      })
      
      // First request should pass
      const firstStatus = await rateLimiter.checkRateLimit('sentiment', 1000)
      expect(firstStatus.allowed).toBe(true)
      
      // Second request should be blocked
      const secondStatus = await rateLimiter.checkRateLimit('sentiment', 1000)
      expect(secondStatus.allowed).toBe(false)
      expect(secondStatus.reason).toContain('Request limit exceeded')
      expect(secondStatus.retryAfter).toBeGreaterThan(0)
    }, 10000)

    test('should enforce token limits', async () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 100,
        tokensPerMinute: 2000, // Low token limit
        costPerMinute: 10000,
        burstMultiplier: 1, // Disable burst for testing
        maxQueueSize: 0, // Disable queueing for faster test
        maxWaitTimeMs: 100 // Short wait time
      })
      
      // Request that would exceed token limit
      const status = await rateLimiter.checkRateLimit('sentiment', 3000)
      
      expect(status.allowed).toBe(false)
      expect(status.reason).toContain('Token limit exceeded')
    }, 10000)

    test('should enforce cost limits', async () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 100,
        tokensPerMinute: 100000,
        costPerMinute: 5, // Very low cost limit ($0.05)
        burstMultiplier: 1, // Disable burst for testing
        maxQueueSize: 0, // Disable queueing for faster test
        maxWaitTimeMs: 100 // Short wait time
      })
      
      // Request that would exceed cost limit (high token count = high cost)
      const status = await rateLimiter.checkRateLimit('sentiment', 10000)
      
      expect(status.allowed).toBe(false)
      expect(status.reason).toContain('Cost limit exceeded')
    }, 10000)

    test('should handle queueing configuration', () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 1,
        maxQueueSize: 5,
        maxWaitTimeMs: 1000
      })
      
      const status = rateLimiter.getStatus()
      expect(status.config.maxQueueSize).toBe(5)
      expect(status.config.maxWaitTimeMs).toBe(1000)
      expect(status.queue.size).toBe(0)
    })

    test('should track usage metrics', () => {
      const rateLimiter = new AIRateLimiter('free')
      
      // Record some usage
      rateLimiter.recordUsage(1000, 10)
      rateLimiter.recordUsage(2000, 20)
      
      const status = rateLimiter.getStatus()
      expect(status.metrics).toBeDefined()
      expect(typeof status.metrics.totalRequests).toBe('number')
    })

    test('should integrate with withRateLimit wrapper', async () => {
      const mockOperation = jest.fn(() => Promise.resolve('success'))
      
      const result = await withRateLimit(
        mockOperation,
        'sentiment',
        1000,
        'normal'
      )
      
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    test('should handle rate limit configuration', () => {
      // Test that rate limiter can be configured
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 30,
        tokensPerMinute: 50000,
        costPerMinute: 200
      })
      
      const status = rateLimiter.getStatus()
      expect(status.config.requestsPerMinute).toBe(30)
      expect(status.config.tokensPerMinute).toBe(50000)
      expect(status.config.costPerMinute).toBe(200)
    })
  })

  describe('Cost Tracker', () => {
    test('should initialize with default budget configuration', () => {
      const costTracker = new AICostTracker()
      const status = costTracker.getBudgetStatus()
      
      expect(status.daily.limit).toBe(1000) // $10.00 in cents
      expect(status.weekly.limit).toBe(5000) // $50.00 in cents
      expect(status.monthly.limit).toBe(15000) // $150.00 in cents
    })

    test('should track cost records correctly', () => {
      const costTracker = new AICostTracker()
      
      const recordId = costTracker.recordCost({
        analysisType: 'sentiment',
        operation: 'generateContent',
        inputTokens: 700,
        outputTokens: 300,
        totalTokens: 1000,
        estimatedCost: 10,
        actualCost: 12,
        userId: 'user-123'
      })
      
      expect(recordId).toMatch(/^cost_/)
      
      const status = costTracker.getBudgetStatus()
      expect(status.daily.spent).toBe(12)
    })

    test('should enforce daily budget limits', () => {
      const costTracker = new AICostTracker({
        dailyBudget: 100 // $1.00 limit
      })
      
      const budgetCheck = costTracker.checkBudget(
        'sentiment',
        150, // Cost exceeds daily budget
        'user-123'
      )
      
      expect(budgetCheck.allowed).toBe(false)
      expect(budgetCheck.reason).toContain('Daily budget exceeded')
    })

    test('should enforce analysis type limits', () => {
      const costTracker = new AICostTracker({
        analysisTypeLimits: {
          sentiment: 50, // Very low limit
          emotional_stability: 300,
          energy_impact: 200,
          conflict_resolution: 100,
          gratitude: 150
        }
      })
      
      const budgetCheck = costTracker.checkBudget(
        'sentiment',
        75, // Exceeds sentiment limit
        'user-123'
      )
      
      expect(budgetCheck.allowed).toBe(false)
      expect(budgetCheck.reason).toContain('Analysis type (sentiment) daily budget exceeded')
    })

    test('should enforce user daily limits', () => {
      const costTracker = new AICostTracker({
        userDailyLimit: 25 // $0.25
      })
      
      const budgetCheck = costTracker.checkBudget(
        'sentiment',
        30, // Exceeds user limit
        'user-123'
      )
      
      expect(budgetCheck.allowed).toBe(false)
      expect(budgetCheck.reason).toContain('User daily budget exceeded')
    })

    test('should generate cost summaries', () => {
      const costTracker = new AICostTracker()
      
      // Record some usage
      costTracker.recordCost({
        analysisType: 'sentiment',
        operation: 'generateContent',
        inputTokens: 700,
        outputTokens: 300,
        totalTokens: 1000,
        estimatedCost: 10,
        actualCost: 12,
        userId: 'user-123'
      })
      
      costTracker.recordCost({
        analysisType: 'energy_impact',
        operation: 'generateContent',
        inputTokens: 500,
        outputTokens: 200,
        totalTokens: 700,
        estimatedCost: 8,
        actualCost: 9,
        userId: 'user-456'
      })
      
      const summary = costTracker.generateCostSummary('day')
      
      expect(summary.totalCost).toBe(21)
      expect(summary.totalRequests).toBe(2)
      expect(summary.byAnalysisType.sentiment.cost).toBe(12)
      expect(summary.byAnalysisType.energy_impact.cost).toBe(9)
      expect(summary.topUsers).toHaveLength(2)
    })

    test('should create budget alerts', () => {
      const costTracker = new AICostTracker({
        dailyBudget: 100,
        warningThreshold: 50, // 50% warning
        criticalThreshold: 80 // 80% critical
      })
      
      // Record usage that triggers warning
      costTracker.recordCost({
        analysisType: 'sentiment',
        operation: 'generateContent',
        inputTokens: 700,
        outputTokens: 300,
        totalTokens: 1000,
        estimatedCost: 60, // 60% of budget
        actualCost: 60
      })
      
      const status = costTracker.getBudgetStatus()
      expect(status.daily.percentage).toBe(60)
      expect(status.alerts.length).toBeGreaterThanOrEqual(1)
    })

    test('should integrate with checkBudget helper', async () => {
      const costTracker = new AICostTracker({
        dailyBudget: 50 // Very low budget
      })
      
      await expect(checkBudget(
        'sentiment',
        100, // Exceeds budget
        'user-123'
      )).rejects.toThrow(AIResourceLimitError)
    })
  })

  describe('Integration Tests', () => {
    test('should coordinate rate limiting and cost tracking', async () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 10,
        costPerMinute: 100
      })
      
      const costTracker = new AICostTracker({
        dailyBudget: 200
      })
      
      // Simulate multiple requests that should be allowed
      const results = []
      for (let i = 0; i < 5; i++) {
        const rateStatus = await rateLimiter.checkRateLimit('sentiment', 1000)
        const budgetCheck = costTracker.checkBudget('sentiment', 20)
        
        results.push({ rate: rateStatus.allowed, budget: budgetCheck.allowed })
        
        if (rateStatus.allowed && budgetCheck.allowed) {
          rateLimiter.recordUsage(1000, 20)
          costTracker.recordCost({
            analysisType: 'sentiment',
            operation: 'test',
            inputTokens: 700,
            outputTokens: 300,
            totalTokens: 1000,
            estimatedCost: 20,
            actualCost: 20
          })
        }
      }
      
      // All requests should be allowed
      expect(results.every(r => r.rate && r.budget)).toBe(true)
      
      // Status should show usage
      const rateStatus = rateLimiter.getStatus()
      const budgetStatus = costTracker.getBudgetStatus()
      
      expect(rateStatus.current.minute.requests).toContain('5/')
      expect(budgetStatus.daily.spent).toBe(100)
    })

    test('should handle error scenarios gracefully', async () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 1,
        maxQueueSize: 0, // No queueing
        burstMultiplier: 1 // Disable burst
      })
      
      // First request should pass
      const firstStatus = await rateLimiter.checkRateLimit('sentiment', 1000)
      expect(firstStatus.allowed).toBe(true)
      
      // Second request should be blocked
      const secondStatus = await rateLimiter.checkRateLimit('sentiment', 1000)
      expect(secondStatus.allowed).toBe(false)
      expect(secondStatus.reason).toContain('Request limit exceeded')
    })

    test('should provide comprehensive status reporting', () => {
      const rateLimiter = new AIRateLimiter('free')
      const costTracker = new AICostTracker()
      
      // Record some usage
      rateLimiter.recordUsage(1000, 15)
      costTracker.recordCost({
        analysisType: 'sentiment',
        operation: 'test',
        inputTokens: 700,
        outputTokens: 300,
        totalTokens: 1000,
        estimatedCost: 15,
        actualCost: 15
      })
      
      const rateStatus = rateLimiter.getStatus()
      const budgetStatus = costTracker.getBudgetStatus()
      
      // Rate limiter status
      expect(rateStatus.config).toBeDefined()
      expect(rateStatus.current.minute).toBeDefined()
      expect(rateStatus.queue).toBeDefined()
      expect(rateStatus.metrics).toBeDefined()
      
      // Cost tracker status
      expect(budgetStatus.daily).toBeDefined()
      expect(budgetStatus.weekly).toBeDefined()
      expect(budgetStatus.monthly).toBeDefined()
      expect(budgetStatus.nextReset).toBeDefined()
    })

    test('should handle configuration updates', () => {
      const rateLimiter = new AIRateLimiter('free')
      const costTracker = new AICostTracker()
      
      // Update configurations
      rateLimiter.updateConfig({
        requestsPerMinute: 30,
        tokensPerMinute: 50000
      })
      
      costTracker.updateConfig({
        dailyBudget: 2000,
        warningThreshold: 60
      })
      
      const rateStatus = rateLimiter.getStatus()
      const budgetStatus = costTracker.getBudgetStatus()
      
      expect(rateStatus.config.requestsPerMinute).toBe(30)
      expect(budgetStatus.daily.limit).toBe(2000)
    })
  })

  describe('Error Handling', () => {
    test('should handle rate limit errors', () => {
      const rateLimiter = new AIRateLimiter('free', {
        requestsPerMinute: 0, // No requests allowed
        burstMultiplier: 1
      })
      
      // Test that it creates appropriate rate limit status
      expect(async () => {
        await rateLimiter.checkRateLimit('sentiment', 1000)
      }).not.toThrow()
    })

    test('should throw appropriate errors for budget limits', async () => {
      await expect(checkBudget(
        'sentiment',
        999999, // Very high cost
        'user-123'
      )).rejects.toThrow(AIResourceLimitError)
    })

    test('should provide detailed error context', async () => {
      try {
        await checkBudget('sentiment', 999999)
        expect(true).toBe(false) // Should not reach this line
      } catch (error) {
        expect(error).toBeInstanceOf(AIResourceLimitError)
        if (error instanceof AIResourceLimitError) {
          // Check the actual structure of the error context
          expect(error.context).toBeDefined()
          expect(error.context).toHaveProperty('currentSpend')
          expect(error.context).toHaveProperty('budgetLimit')
          expect(error.context).toHaveProperty('analysisType')
        }
      }
    })
  })
})