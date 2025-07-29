/**
 * Enhanced aiAnalysis table specific tests
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * Note: TypeScript errors in withIndex() calls are due to convex-test library
 * definition limitations. These are runtime functional despite the TypeScript warnings.
 */

import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach } from '@jest/globals'
import schema from '../schema'
import {
  validateAiAnalysisMetadata,
  estimateTokenSplit,
  SCHEMA_VALIDATION,
} from '../utils/schema_helpers'

describe('Enhanced aiAnalysis Table Tests', () => {
  let t: ReturnType<typeof convexTest>
  let userId: any
  let entryId: any

  beforeEach(async () => {
    t = convexTest(schema)

    // Setup test data
    const result = await t.run(async ctx => {
      const newUserId = await ctx.db.insert('users', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_clerk_id',
        createdAt: Date.now(),
      })

      const newEntryId = await ctx.db.insert('journalEntries', {
        userId: newUserId,
        content: 'Test journal entry for analysis',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      return { userId: newUserId, entryId: newEntryId }
    })

    userId = result.userId
    entryId = result.entryId
  })

  describe('Enhanced Metadata Fields', () => {
    test('should store all new metadata fields correctly', async () => {
      const analysisData = {
        entryId,
        userId,
        sentimentScore: 0.75,
        emotionalKeywords: ['excited', 'optimistic'],
        confidenceLevel: 0.92,
        reasoning:
          'The text contains positive emotional indicators and forward-looking language.',
        analysisVersion: 'gemini_2_5_flash_lite_v1.2',
        processingTime: 1850,
        tokensUsed: 420,
        apiCost: 0.0168,
        // Enhanced fields
        modelType: 'gemini_2_5_flash_lite',
        modelVersion: 'v1.2.0',
        requestTokens: 280,
        responseTokens: 140,
        cachingUsed: true,
        batchProcessed: false,
        regionProcessed: 'us-central1',
        status: 'completed',
        createdAt: Date.now(),
      }

      const result = await t.run(async ctx => {
        const analysisId = await ctx.db.insert('aiAnalysis', analysisData)
        const stored = await ctx.db.get(analysisId)
        return { analysisId, stored }
      })

      const { analysisId, stored } = result

      expect(stored).toBeDefined()
      expect(stored?.modelType).toBe('gemini_2_5_flash_lite')
      expect(stored?.modelVersion).toBe('v1.2.0')
      expect(stored?.requestTokens).toBe(280)
      expect(stored?.responseTokens).toBe(140)
      expect(stored?.cachingUsed).toBe(true)
      expect(stored?.batchProcessed).toBe(false)
      expect(stored?.regionProcessed).toBe('us-central1')
    })

    test('should handle optional fields gracefully', async () => {
      const minimalAnalysis = {
        entryId,
        userId,
        sentimentScore: 0.5,
        emotionalKeywords: ['neutral'],
        confidenceLevel: 0.8,
        reasoning: 'Basic analysis',
        analysisVersion: 'v1.0',
        processingTime: 1000,
        status: 'completed',
        createdAt: Date.now(),
      }

      const result = await t.run(async ctx => {
        const analysisId = await ctx.db.insert('aiAnalysis', minimalAnalysis)
        const stored = await ctx.db.get(analysisId)
        return { analysisId, stored }
      })

      const { analysisId, stored } = result

      expect(stored).toBeDefined()
      expect(stored?.modelType).toBeUndefined()
      expect(stored?.requestTokens).toBeUndefined()
      expect(stored?.responseTokens).toBeUndefined()
      expect(stored?.cachingUsed).toBeUndefined()
    })

    test('should support token usage calculations', async () => {
      const totalTokens = 500
      const { requestTokens, responseTokens } = estimateTokenSplit(
        totalTokens,
        'A long journal entry with lots of content'
      )

      const result = await t.run(async ctx => {
        const analysisId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.6,
          emotionalKeywords: ['content'],
          confidenceLevel: 0.85,
          reasoning: 'Analysis with calculated tokens',
          analysisVersion: 'v1.0',
          processingTime: 2000,
          tokensUsed: totalTokens,
          requestTokens,
          responseTokens,
          status: 'completed',
          createdAt: Date.now(),
        })

        const analysis = await ctx.db.get(analysisId)
        return { analysisId, analysis }
      })

      const { analysis } = result
      expect(analysis?.requestTokens).toBeDefined()
      expect(analysis?.responseTokens).toBeDefined()
      expect(
        (analysis?.requestTokens || 0) + (analysis?.responseTokens || 0)
      ).toBe(totalTokens)
    })
  })

  describe('Enhanced Indexing', () => {
    beforeEach(async () => {
      // Create test data with different models and costs
      const testCases = [
        {
          modelType: 'gemini_2_5_flash_lite',
          cost: 0.01,
          tokens: 200,
          time: 1500,
        },
        {
          modelType: 'gemini_2_5_flash_lite',
          cost: 0.02,
          tokens: 400,
          time: 2000,
        },
        { modelType: 'gpt_4', cost: 0.05, tokens: 300, time: 3000 },
        { modelType: 'gpt_4', cost: 0.03, tokens: 250, time: 2500 },
      ]

      await t.run(async ctx => {
        for (const [index, testCase] of testCases.entries()) {
          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: 0.5 + index * 0.1,
            emotionalKeywords: ['test'],
            confidenceLevel: 0.8,
            reasoning: `Test analysis ${index}`,
            analysisVersion: 'v1.0',
            processingTime: testCase.time,
            tokensUsed: testCase.tokens,
            apiCost: testCase.cost,
            modelType: testCase.modelType,
            status: 'completed',
            createdAt: Date.now() + index,
          })
        }
      })
    })

    test('by_model_type index should filter correctly', async () => {
      const geminiAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_model_type', (q: any) =>
            q.eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()
      })

      expect(geminiAnalyses).toHaveLength(2)
      geminiAnalyses.forEach((analysis: any) => {
        expect(analysis.modelType).toBe('gemini_2_5_flash_lite')
      })
    })

    test('by_cost_date index should enable cost-based queries', async () => {
      const expensiveAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_cost_date', (q: any) => q.gte('apiCost', 0.03))
          .collect()
      })

      expect(expensiveAnalyses.length).toBeGreaterThan(0)
      expensiveAnalyses.forEach((analysis: any) => {
        expect(analysis.apiCost).toBeGreaterThanOrEqual(0.03)
      })
    })

    test('by_user_model_date compound index should work', async () => {
      const userGptAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_user_model_date', (q: any) =>
            q.eq('userId', userId).eq('modelType', 'gpt_4')
          )
          .collect()
      })

      expect(userGptAnalyses).toHaveLength(2)
      userGptAnalyses.forEach((analysis: any) => {
        expect(analysis.userId).toBe(userId)
        expect(analysis.modelType).toBe('gpt_4')
      })
    })

    test('by_processing_time index should enable performance queries', async () => {
      const slowAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_processing_time', (q: any) =>
            q.gte('processingTime', 2500)
          )
          .collect()
      })

      expect(slowAnalyses.length).toBeGreaterThan(0)
      slowAnalyses.forEach((analysis: any) => {
        expect(analysis.processingTime).toBeGreaterThanOrEqual(2500)
      })
    })

    test('by_token_usage index should enable token-based analysis', async () => {
      const highTokenAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_token_usage', (q: any) => q.gte('tokensUsed', 300))
          .collect()
      })

      expect(highTokenAnalyses.length).toBeGreaterThan(0)
      highTokenAnalyses.forEach((analysis: any) => {
        expect(analysis.tokensUsed).toBeGreaterThanOrEqual(300)
      })
    })
  })

  describe('Validation Logic', () => {
    test('validateAiAnalysisMetadata should accept valid data', () => {
      const validMetadata = {
        modelType: 'gemini_2_5_flash_lite',
        modelVersion: 'v1.0',
        requestTokens: 200,
        responseTokens: 100,
        cachingUsed: true,
        batchProcessed: false,
        regionProcessed: 'us-central1',
      }

      expect(() => validateAiAnalysisMetadata(validMetadata)).not.toThrow()
    })

    test('validateAiAnalysisMetadata should reject invalid model type', () => {
      const invalidMetadata = {
        modelType: 'invalid_model_type',
        requestTokens: 200,
        responseTokens: 100,
      }

      expect(() => validateAiAnalysisMetadata(invalidMetadata)).toThrow()
    })

    test('validateAiAnalysisMetadata should reject negative tokens', () => {
      const invalidMetadata = {
        modelType: 'gemini_2_5_flash_lite',
        requestTokens: -100,
        responseTokens: 100,
      }

      expect(() => validateAiAnalysisMetadata(invalidMetadata)).toThrow()
    })

    test('validateAiAnalysisMetadata should reject excessive tokens', () => {
      const invalidMetadata = {
        modelType: 'gemini_2_5_flash_lite',
        requestTokens: SCHEMA_VALIDATION.MAX_TOKEN_COUNT + 1,
        responseTokens: 100,
      }

      expect(() => validateAiAnalysisMetadata(invalidMetadata)).toThrow()
    })
  })

  describe('Migration Compatibility', () => {
    test('should coexist with legacy records', async () => {
      const result = await t.run(async ctx => {
        // Insert legacy record (without enhanced fields)
        const legacyId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.6,
          emotionalKeywords: ['legacy'],
          confidenceLevel: 0.8,
          reasoning: 'Legacy analysis',
          analysisVersion: 'v0.9',
          processingTime: 1200,
          status: 'completed',
          createdAt: Date.now(),
        })

        // Insert enhanced record
        const enhancedId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['enhanced'],
          confidenceLevel: 0.9,
          reasoning: 'Enhanced analysis',
          analysisVersion: 'v1.0',
          processingTime: 1800,
          modelType: 'gemini_2_5_flash_lite',
          requestTokens: 150,
          responseTokens: 80,
          status: 'completed',
          createdAt: Date.now(),
        })

        // Both should be retrievable
        const legacy = await ctx.db.get(legacyId)
        const enhanced = await ctx.db.get(enhancedId)

        return { legacyId, enhancedId, legacy, enhanced }
      })

      const { legacyId, enhancedId, legacy, enhanced } = result

      expect(legacy).toBeDefined()
      expect(enhanced).toBeDefined()
      expect(legacy?.modelType).toBeUndefined()
      expect(enhanced?.modelType).toBe('gemini_2_5_flash_lite')

      // Queries should work on both
      const allAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_user', (q: any) => q.eq('userId', userId))
          .collect()
      })

      expect(allAnalyses).toHaveLength(2)
    })

    test('should handle partial migration scenarios', async () => {
      const result = await t.run(async ctx => {
        // Simulate partial migration where some fields are populated
        const partiallyMigratedId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.65,
          emotionalKeywords: ['partial'],
          confidenceLevel: 0.85,
          reasoning: 'Partially migrated analysis',
          analysisVersion: 'v1.0',
          processingTime: 1600,
          tokensUsed: 250,
          // Only some enhanced fields populated
          modelType: 'gemini_2_5_flash_lite',
          // requestTokens and responseTokens missing
          cachingUsed: false,
          status: 'completed',
          createdAt: Date.now(),
        })

        const analysis = await ctx.db.get(partiallyMigratedId)
        return { partiallyMigratedId, analysis }
      })

      const { analysis } = result
      expect(analysis).toBeDefined()
      expect(analysis?.modelType).toBe('gemini_2_5_flash_lite')
      expect(analysis?.requestTokens).toBeUndefined()
      expect(analysis?.responseTokens).toBeUndefined()
      expect(analysis?.cachingUsed).toBe(false)
    })
  })

  describe('Cost and Performance Analysis', () => {
    test('should enable cost analysis queries', async () => {
      const costTestCases = [
        { cost: 0.001, tokens: 50, model: 'gemini_2_5_flash_lite' },
        { cost: 0.005, tokens: 100, model: 'gemini_2_5_flash_lite' },
        { cost: 0.01, tokens: 150, model: 'gpt_4' },
        { cost: 0.02, tokens: 200, model: 'gpt_4' },
      ]

      await t.run(async ctx => {
        for (const [index, testCase] of costTestCases.entries()) {
          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: 0.5,
            emotionalKeywords: ['cost-test'],
            confidenceLevel: 0.8,
            reasoning: `Cost test ${index}`,
            analysisVersion: 'v1.0',
            processingTime: 1500,
            tokensUsed: testCase.tokens,
            apiCost: testCase.cost,
            modelType: testCase.model,
            status: 'completed',
            createdAt: Date.now() + index,
          })
        }
      })

      // Query by cost range
      const midRangeCostAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_cost_date', (q: any) =>
            q.gte('apiCost', 0.005).lt('apiCost', 0.015)
          )
          .collect()
      })

      expect(midRangeCostAnalyses).toHaveLength(2)

      // Calculate cost per token
      midRangeCostAnalyses.forEach((analysis: any) => {
        const costPerToken =
          (analysis.apiCost || 0) / (analysis.tokensUsed || 1)
        expect(costPerToken).toBeGreaterThan(0)
        expect(costPerToken).toBeLessThan(1) // Sanity check
      })
    })

    test('should support performance monitoring', async () => {
      const performanceTestCases = [
        { time: 800, tokens: 100 }, // Fast
        { time: 1500, tokens: 200 }, // Medium
        { time: 3000, tokens: 400 }, // Slow
        { time: 5000, tokens: 500 }, // Very slow
      ]

      await t.run(async ctx => {
        for (const [index, testCase] of performanceTestCases.entries()) {
          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: 0.5,
            emotionalKeywords: ['performance-test'],
            confidenceLevel: 0.8,
            reasoning: `Performance test ${index}`,
            analysisVersion: 'v1.0',
            processingTime: testCase.time,
            tokensUsed: testCase.tokens,
            modelType: 'gemini_2_5_flash_lite',
            status: 'completed',
            createdAt: Date.now() + index,
          })
        }
      })

      // Query slow analyses
      const slowAnalyses = await t.run(async ctx => {
        return await ctx.db
          .query('aiAnalysis')
          .withIndex('by_processing_time', (q: any) =>
            q.gte('processingTime', 2500)
          )
          .collect()
      })

      expect(slowAnalyses).toHaveLength(2)

      // Calculate processing efficiency (tokens per second)
      slowAnalyses.forEach((analysis: any) => {
        const tokensPerSecond =
          (analysis.tokensUsed || 0) / (analysis.processingTime / 1000)
        expect(tokensPerSecond).toBeGreaterThan(0)
      })
    })
  })
})
