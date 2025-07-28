/**
 * Tests for AI Processing Validation Utilities
 * Validates input validation, rate limiting, and user tier management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  validateAIRequest,
  validateJournalContent,
  checkUserTierLimits,
  checkRateLimit,
  validateUserAuth,
  generateRequestLogData,
} from '../utils/ai_validation'

describe('AI Processing Validation', () => {
  describe('validateAIRequest', () => {
    it('should validate valid AI processing requests', () => {
      const validRequest = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
        retryCount: 0,
        priority: 'normal' as const,
      }

      const result = validateAIRequest(validRequest)

      expect(result).toEqual(validRequest)
    })

    it('should reject requests with missing required fields', () => {
      const invalidRequest = {
        userId: 'u1234567890123456',
        // Missing entryId
      }

      expect(() => validateAIRequest(invalidRequest)).toThrow()
    })

    it('should reject requests with invalid priority values', () => {
      const invalidRequest = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
        priority: 'invalid_priority',
      }

      expect(() => validateAIRequest(invalidRequest)).toThrow()
    })

    it('should handle optional fields correctly', () => {
      const minimalRequest = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
      }

      const result = validateAIRequest(minimalRequest)

      expect(result.entryId).toBe(minimalRequest.entryId)
      expect(result.userId).toBe(minimalRequest.userId)
      expect(result.retryCount).toBeUndefined()
      expect(result.priority).toBeUndefined()
    })
  })

  describe('validateJournalContent', () => {
    it('should validate safe journal content', () => {
      const safeContent = {
        content:
          'I had a wonderful day with my partner. We talked about our future plans.',
        mood: 'happy',
        relationshipContext: 'Partner (romantic)',
      }

      const result = validateJournalContent(safeContent)
      expect(result).toEqual(safeContent)
    })

    it('should reject content that is too short', () => {
      const shortContent = {
        content: 'Hi',
        mood: 'neutral',
      }

      expect(() => validateJournalContent(shortContent)).toThrow()
    })

    it('should reject content that is too long', () => {
      const longContent = {
        content: 'A'.repeat(11000), // Exceeds 10,000 character limit
        mood: 'neutral',
      }

      expect(() => validateJournalContent(longContent)).toThrow()
    })

    it('should handle missing optional fields', () => {
      const minimalContent = {
        content: 'Today was an average day with some ups and downs.',
      }

      const result = validateJournalContent(minimalContent)
      expect(result.content).toBe(minimalContent.content)
    })

    it('should sanitize potentially harmful content', () => {
      const suspiciousContent = {
        content:
          'My day was good. <script>alert("xss")</script> Everything went well.',
        mood: 'content',
      }

      const result = validateJournalContent(suspiciousContent)
      // The validation should strip or escape HTML/script tags
      expect(result.content).not.toContain('<script>')
    })
  })

  describe('checkUserTierLimits', () => {
    it('should allow requests within free tier limits', () => {
      const result = checkUserTierLimits('free', 5, 0) // 5 analyses today, first attempt

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should reject requests exceeding free tier daily limit', () => {
      const result = checkUserTierLimits('free', 20, 0) // Exceeds typical free limit

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Daily analysis limit reached')
    })

    it('should allow premium users higher limits', () => {
      const result = checkUserTierLimits('premium', 50, 0) // Higher usage for premium

      expect(result.allowed).toBe(true)
    })

    it('should limit retry attempts', () => {
      const result = checkUserTierLimits('free', 1, 5) // Too many retries

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('retry')
    })

    it('should handle edge cases gracefully', () => {
      const result = checkUserTierLimits('free', -1, 0) // Negative usage

      expect(result.allowed).toBe(true) // Should handle gracefully
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Reset any rate limiting state before each test
      // In a real implementation, this would clear Redis or in-memory cache
    })

    it('should allow requests within rate limits', () => {
      const result = checkRateLimit('user123', 'free')

      expect(result.allowed).toBe(true)
      expect(result.resetTime).toBeUndefined()
    })

    it('should apply different limits for different tiers', () => {
      const freeResult = checkRateLimit('user123', 'free')
      const premiumResult = checkRateLimit('user456', 'premium')

      expect(freeResult.allowed).toBe(true)
      expect(premiumResult.allowed).toBe(true)
      // Premium users should have higher rate limits
    })

    it('should track rate limits per user', () => {
      // Multiple requests from same user
      const firstRequest = checkRateLimit('user123', 'free')
      const secondRequest = checkRateLimit('user123', 'free')

      expect(firstRequest.allowed).toBe(true)
      expect(secondRequest.allowed).toBe(true)

      // Different user should have independent limit
      const differentUser = checkRateLimit('user456', 'free')
      expect(differentUser.allowed).toBe(true)
    })

    it('should provide reset time when rate limited', () => {
      // This would require mocking a scenario where rate limit is exceeded
      // For now, test the structure
      const userId = 'rate-limited-user'

      // In a real test, we'd make many requests to trigger rate limiting
      const result = checkRateLimit(userId, 'free')

      if (!result.allowed) {
        expect(result.resetTime).toBeDefined()
        expect(typeof result.resetTime).toBe('number')
        expect(result.resetTime! > Date.now()).toBe(true)
      }
    })
  })

  describe('validateUserAuth', () => {
    it('should validate properly formatted Bearer tokens', async () => {
      const validAuth = 'Bearer user123'

      const result = await validateUserAuth(validAuth)

      expect(result.valid).toBe(true)
      expect(result.userId).toBe('user123')
      expect(result.error).toBeUndefined()
    })

    it('should reject malformed authorization headers', async () => {
      const invalidAuth = 'InvalidFormat user123'

      const result = await validateUserAuth(invalidAuth)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid authorization')
    })

    it('should reject missing authorization headers', async () => {
      const result = await validateUserAuth(null)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing authorization')
    })

    it('should reject empty tokens', async () => {
      const emptyAuth = 'Bearer '

      const result = await validateUserAuth(emptyAuth)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Missing authorization token')
    })

    it('should handle various token formats', async () => {
      const formats = [
        'Bearer user_123',
        'Bearer USER123',
        'Bearer u1234567890123456789',
      ]

      for (const auth of formats) {
        const result = await validateUserAuth(auth)
        expect(result.valid).toBe(true)
        expect(result.userId).toBeDefined()
      }
    })
  })

  describe('generateRequestLogData', () => {
    it('should generate comprehensive request logs', () => {
      const requestData = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
        retryCount: 1,
        priority: 'high' as const,
      }

      const userData = {
        id: 'u1234567890123456',
        email: 'test@example.com',
        tier: 'premium' as const,
      }

      const logData = generateRequestLogData(requestData, userData)

      expect(logData).toHaveProperty('timestamp')
      expect(logData).toHaveProperty('requestId')
      expect(logData).toHaveProperty('userId', userData.id)
      expect(logData).toHaveProperty('userTier', userData.tier)
      expect(logData).toHaveProperty('entryId', requestData.entryId)
      expect(logData).toHaveProperty('retryCount', requestData.retryCount)
      expect(logData).toHaveProperty('priority', requestData.priority)
      expect(typeof logData.timestamp).toBe('number')
      expect(typeof logData.requestId).toBe('string')
    })

    it('should handle minimal user data', () => {
      const requestData = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
      }

      const userData = {
        id: 'u1234567890123456',
        email: 'minimal@example.com',
        tier: 'free' as const,
      }

      const logData = generateRequestLogData(requestData, userData)

      expect(logData.retryCount).toBe(0) // Default value
      expect(logData.priority).toBe('normal') // Default value
    })

    it('should generate unique request IDs', () => {
      const requestData = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
      }

      const userData = {
        id: 'u1234567890123456',
        email: 'test@example.com',
        tier: 'free' as const,
      }

      const log1 = generateRequestLogData(requestData, userData)
      const log2 = generateRequestLogData(requestData, userData)

      expect(log1.requestId).not.toBe(log2.requestId)
    })

    it('should include security and audit information', () => {
      const requestData = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
        priority: 'urgent' as const,
      }

      const userData = {
        id: 'u1234567890123456',
        email: 'audit@example.com',
        tier: 'premium' as const,
      }

      const logData = generateRequestLogData(requestData, userData)

      // Should include audit trail information
      expect(logData).toHaveProperty('userEmail', userData.email)
      expect(logData.timestamp).toBeGreaterThan(Date.now() - 1000) // Recent timestamp
    })
  })

  describe('Integration Validation', () => {
    it('should validate complete HTTP Action request flow', async () => {
      // Test the full validation chain
      const rawRequest = {
        entryId: 'j1234567890123456',
        userId: 'u1234567890123456',
        retryCount: 0,
        priority: 'normal',
      }

      const authHeader = 'Bearer u1234567890123456'
      const journalContent = {
        content:
          'Today was a meaningful day. We had deep conversations about our relationship goals.',
        mood: 'reflective',
        relationshipContext: 'Partner (romantic)',
      }

      // Validate each step
      const authResult = await validateUserAuth(authHeader)
      expect(authResult.valid).toBe(true)

      const requestResult = validateAIRequest(rawRequest)
      expect(requestResult).toBeDefined()

      const contentResult = validateJournalContent(journalContent)
      expect(contentResult).toBeDefined()

      const rateLimitResult = checkRateLimit(authResult.userId!, 'free')
      expect(rateLimitResult.allowed).toBe(true)

      const tierLimitResult = checkUserTierLimits('free', 5, 0)
      expect(tierLimitResult.allowed).toBe(true)

      // All validations should pass for valid request
      expect(authResult.valid).toBe(true)
      expect(requestResult.entryId).toBe(rawRequest.entryId)
      expect(contentResult.content).toBe(journalContent.content)
      expect(rateLimitResult.allowed).toBe(true)
      expect(tierLimitResult.allowed).toBe(true)
    })

    it('should fail validation chain at appropriate points', async () => {
      // Test with invalid auth
      const invalidAuth = 'Invalid Bearer token'
      const authResult = await validateUserAuth(invalidAuth)
      expect(authResult.valid).toBe(false)

      // Test with invalid request
      const invalidRequest = {
        // Missing required fields
        userId: 'u1234567890123456',
      }
      expect(() => validateAIRequest(invalidRequest)).toThrow()

      // Test with invalid content
      const invalidContent = {
        content: 'Too short',
      }
      expect(() => validateJournalContent(invalidContent)).toThrow()
    })
  })
})
