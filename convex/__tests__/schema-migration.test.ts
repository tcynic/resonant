/**
 * Schema migration tests
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * Note: TypeScript errors in withIndex() calls are due to convex-test library
 * definition limitations. These are runtime functional despite the TypeScript warnings.
 */

import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach } from '@jest/globals'
import schema from '../schema'
import { api } from '../_generated/api'

describe('Schema Migration Tests', () => {
  let t: ReturnType<typeof convexTest>

  beforeEach(() => {
    t = convexTest(schema)
  })

  describe('Data Migration Integrity', () => {
    test('should migrate existing aiAnalysis records without data loss', async () => {
      const result = await t.run(async ctx => {
        // Create user and journal entry
        const userId = await ctx.db.insert('users', {
          name: 'Migration Test User',
          email: 'migrate@test.com',
          clerkId: 'migrate_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test entry for migration',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert legacy-style aiAnalysis record
        const legacyAnalysisId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.75,
          emotionalKeywords: ['happy', 'confident'],
          confidenceLevel: 0.88,
          reasoning:
            'User expresses positive emotions and confidence in their goals.',
          analysisVersion: 'v0.9.0',
          processingTime: 1200,
          tokensUsed: 180,
          apiCost: 0.007,
          status: 'completed',
          createdAt: Date.now(),
        })

        // Verify legacy record exists
        const legacyRecord = await ctx.db.get(legacyAnalysisId)
        expect(legacyRecord).toBeDefined()
        expect(legacyRecord?.modelType).toBeUndefined()
        expect(legacyRecord?.requestTokens).toBeUndefined()

        // Simulate migration by updating record with enhanced fields
        await ctx.db.patch(legacyAnalysisId, {
          modelType: 'gemini_2_5_flash_lite',
          modelVersion: 'v1.0',
          requestTokens: 126, // 70% of total tokens
          responseTokens: 54, // 30% of total tokens
          cachingUsed: false,
          batchProcessed: false,
          regionProcessed: 'us-central1',
        })

        // Verify migration preserved original data
        const migratedRecord = await ctx.db.get(legacyAnalysisId)

        return { legacyAnalysisId, migratedRecord }
      })

      const { migratedRecord } = result
      expect(migratedRecord).toBeDefined()
      expect(migratedRecord?.sentimentScore).toBe(0.75)
      expect(migratedRecord?.emotionalKeywords).toEqual(['happy', 'confident'])
      expect(migratedRecord?.tokensUsed).toBe(180)
      expect(migratedRecord?.processingTime).toBe(1200)

      // Verify new fields were added
      expect(migratedRecord?.modelType).toBe('gemini_2_5_flash_lite')
      expect(migratedRecord?.requestTokens).toBe(126)
      expect(migratedRecord?.responseTokens).toBe(54)
      expect(migratedRecord?.regionProcessed).toBe('us-central1')
    })

    test('should handle partial migration gracefully', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Partial Migration User',
          email: 'partial@test.com',
          clerkId: 'partial_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Partial migration test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert record with some enhanced fields but not others
        const partialAnalysisId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.6,
          emotionalKeywords: ['mixed'],
          confidenceLevel: 0.8,
          reasoning: 'Mixed sentiment detected',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          tokensUsed: 200,
          // Some enhanced fields present
          modelType: 'gemini_2_5_flash_lite',
          cachingUsed: false,
          // Others missing (requestTokens, responseTokens, etc.)
          status: 'completed',
          createdAt: Date.now(),
        })

        const record = await ctx.db.get(partialAnalysisId)
        expect(record).toBeDefined()
        expect(record?.modelType).toBe('gemini_2_5_flash_lite')
        expect(record?.cachingUsed).toBe(false)
        expect(record?.requestTokens).toBeUndefined()
        expect(record?.responseTokens).toBeUndefined()

        // Should still be queryable by existing indexes
        const userAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_user', (q: any) => q.eq('userId', userId))
          .collect()

        return { userId, partialAnalysisId, record, userAnalyses }
      })

      const { userAnalyses } = result

      expect(userAnalyses).toHaveLength(1)
    })

    test('should maintain query performance after migration', async () => {
      const setupResult = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Performance Test User',
          email: 'perf@test.com',
          clerkId: 'perf_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Performance test entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        return { userId, entryId }
      })

      const { userId, entryId } = setupResult

      const result = await t.run(async ctx => {
        // Insert multiple records (some migrated, some not)
        const recordIds = []
        for (let i = 0; i < 20; i++) {
          const isEnhanced = i % 2 === 0 // Every other record is enhanced

          const recordData: any = {
            entryId,
            userId,
            sentimentScore: Math.random(),
            emotionalKeywords: ['test'],
            confidenceLevel: 0.8,
            reasoning: `Test analysis ${i}`,
            analysisVersion: 'v1.0',
            processingTime: 1000 + Math.random() * 1000,
            tokensUsed: Math.floor(100 + Math.random() * 200),
            apiCost: Math.random() * 0.05,
            status: 'completed',
            createdAt: Date.now() + i,
          }

          if (isEnhanced) {
            recordData.modelType =
              i % 4 === 0 ? 'gemini_2_5_flash_lite' : 'gpt_4'
            recordData.requestTokens = Math.floor(recordData.tokensUsed * 0.7)
            recordData.responseTokens =
              recordData.tokensUsed - recordData.requestTokens
            recordData.cachingUsed = Math.random() > 0.5
            recordData.regionProcessed = 'us-central1'
          }

          const recordId = await ctx.db.insert('aiAnalysis', recordData)
          recordIds.push(recordId)
        }

        // Test query performance with mixed data
        const start = Date.now()

        // Query by user (should work for all records)
        const userAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_user', (q: any) => q.eq('userId', userId))
          .collect()

        // Query by model type (should work for enhanced records)
        const geminiAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_model_type', (q: any) =>
            q.eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()

        const queryTime = Date.now() - start

        return { recordIds, userAnalyses, geminiAnalyses, queryTime }
      })

      const { userAnalyses, geminiAnalyses, queryTime } = result

      expect(userAnalyses).toHaveLength(20)
      expect(geminiAnalyses.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(100) // Should be fast
    })
  })

  describe('Feature Flag Migration', () => {
    test('should support gradual feature rollout', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Feature Flag User',
          email: 'flags@test.com',
          clerkId: 'flags_clerk_id',
          createdAt: Date.now(),
        })

        // Test with feature flags disabled (legacy mode)
        const legacyFeatureFlags = {
          enhancedAiAnalysis: false,
          systemLogging: true,
          apiUsageTracking: false,
          performanceMetrics: true,
          auditTrail: false,
        }

        // Simulate feature flag check by only using basic fields
        const basicAnalysisId = await ctx.db.insert('aiAnalysis', {
          entryId: await ctx.db.insert('journalEntries', {
            userId,
            content: 'Basic analysis test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['basic'],
          confidenceLevel: 0.85,
          reasoning: 'Basic analysis mode',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          status: 'completed',
          createdAt: Date.now(),
        })

        const basicRecord = await ctx.db.get(basicAnalysisId)
        expect(basicRecord?.modelType).toBeUndefined()

        // Test with feature flags enabled (enhanced mode)
        const enhancedAnalysisId = await ctx.db.insert('aiAnalysis', {
          entryId: await ctx.db.insert('journalEntries', {
            userId,
            content: 'Enhanced analysis test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
          userId,
          sentimentScore: 0.8,
          emotionalKeywords: ['enhanced'],
          confidenceLevel: 0.9,
          reasoning: 'Enhanced analysis mode',
          analysisVersion: 'v1.0',
          processingTime: 1800,
          // Enhanced fields (when feature flag is enabled)
          modelType: 'gemini_2_5_flash_lite',
          requestTokens: 140,
          responseTokens: 60,
          cachingUsed: true,
          regionProcessed: 'us-central1',
          status: 'completed',
          createdAt: Date.now(),
        })

        const enhancedRecord = await ctx.db.get(enhancedAnalysisId)
        expect(enhancedRecord?.modelType).toBe('gemini_2_5_flash_lite')

        // Both records should coexist and be queryable
        const allRecords = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_user', (q: any) => q.eq('userId', userId))
          .collect()

        return {
          userId,
          basicAnalysisId,
          enhancedAnalysisId,
          basicRecord,
          enhancedRecord,
          allRecords,
        }
      })

      const { allRecords } = result

      expect(allRecords).toHaveLength(2)
    })
  })

  describe('Rollback Procedures', () => {
    test('should support safe rollback of enhanced fields', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Rollback Test User',
          email: 'rollback@test.com',
          clerkId: 'rollback_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Rollback test entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert enhanced record
        const enhancedId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.75,
          emotionalKeywords: ['rollback-test'],
          confidenceLevel: 0.88,
          reasoning: 'Pre-rollback analysis',
          analysisVersion: 'v1.0',
          processingTime: 1600,
          tokensUsed: 250,
          apiCost: 0.012,
          // Enhanced fields
          modelType: 'gemini_2_5_flash_lite',
          modelVersion: 'v1.0',
          requestTokens: 175,
          responseTokens: 75,
          cachingUsed: true,
          batchProcessed: false,
          regionProcessed: 'us-central1',
          status: 'completed',
          createdAt: Date.now(),
        })

        // Verify enhanced record exists with all fields
        const beforeRollback = await ctx.db.get(enhancedId)
        expect(beforeRollback?.modelType).toBe('gemini_2_5_flash_lite')
        expect(beforeRollback?.requestTokens).toBe(175)

        // Simulate rollback by removing enhanced fields (set to undefined)
        await ctx.db.patch(enhancedId, {
          modelType: undefined,
          modelVersion: undefined,
          requestTokens: undefined,
          responseTokens: undefined,
          cachingUsed: undefined,
          batchProcessed: undefined,
          regionProcessed: undefined,
        })

        // Verify rollback preserved core data
        const afterRollback = await ctx.db.get(enhancedId)

        return { enhancedId, beforeRollback, afterRollback }
      })

      const { afterRollback } = result
      expect(afterRollback?.sentimentScore).toBe(0.75)
      expect(afterRollback?.emotionalKeywords).toEqual(['rollback-test'])
      expect(afterRollback?.tokensUsed).toBe(250)
      expect(afterRollback?.processingTime).toBe(1600)

      // Verify enhanced fields were removed
      expect(afterRollback?.modelType).toBeUndefined()
      expect(afterRollback?.requestTokens).toBeUndefined()
      expect(afterRollback?.responseTokens).toBeUndefined()
      expect(afterRollback?.cachingUsed).toBeUndefined()
    })
  })

  describe('Data Consistency Validation', () => {
    test('should validate token count consistency', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Consistency Test User',
          email: 'consistency@test.com',
          clerkId: 'consistency_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Consistency test entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert record with consistent token counts
        const consistentId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['consistent'],
          confidenceLevel: 0.85,
          reasoning: 'Consistent token counts',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          tokensUsed: 300,
          requestTokens: 200,
          responseTokens: 100, // Total matches tokensUsed
          modelType: 'gemini_2_5_flash_lite',
          status: 'completed',
          createdAt: Date.now(),
        })

        // Insert record with inconsistent token counts
        const inconsistentId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.6,
          emotionalKeywords: ['inconsistent'],
          confidenceLevel: 0.8,
          reasoning: 'Inconsistent token counts',
          analysisVersion: 'v1.0',
          processingTime: 1800,
          tokensUsed: 300,
          requestTokens: 150,
          responseTokens: 100, // Total (250) doesn't match tokensUsed (300)
          modelType: 'gemini_2_5_flash_lite',
          status: 'completed',
          createdAt: Date.now(),
        })

        // Validation logic
        const consistent = await ctx.db.get(consistentId)
        const inconsistent = await ctx.db.get(inconsistentId)

        return { consistentId, inconsistentId, consistent, inconsistent }
      })

      const { consistent, inconsistent } = result

      // Check consistency
      const consistentTotal =
        (consistent?.requestTokens || 0) + (consistent?.responseTokens || 0)
      const inconsistentTotal =
        (inconsistent?.requestTokens || 0) + (inconsistent?.responseTokens || 0)

      expect(consistentTotal).toBe(consistent?.tokensUsed)
      expect(inconsistentTotal).not.toBe(inconsistent?.tokensUsed)
    })

    test('should validate cost reasonableness', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Cost Test User',
          email: 'cost@test.com',
          clerkId: 'cost_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Cost validation test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert record with reasonable cost
        const reasonableId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['reasonable'],
          confidenceLevel: 0.85,
          reasoning: 'Reasonable cost analysis',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          tokensUsed: 200,
          apiCost: 0.008, // $0.00004 per token - reasonable
          modelType: 'gemini_2_5_flash_lite',
          status: 'completed',
          createdAt: Date.now(),
        })

        // Insert record with unreasonable cost
        const unreasonableId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.6,
          emotionalKeywords: ['expensive'],
          confidenceLevel: 0.8,
          reasoning: 'Expensive analysis',
          analysisVersion: 'v1.0',
          processingTime: 1800,
          tokensUsed: 200,
          apiCost: 2.0, // $0.01 per token - seems high
          modelType: 'premium_model',
          status: 'completed',
          createdAt: Date.now(),
        })

        const reasonable = await ctx.db.get(reasonableId)
        const unreasonable = await ctx.db.get(unreasonableId)

        return { reasonableId, unreasonableId, reasonable, unreasonable }
      })

      const { reasonable, unreasonable } = result

      const reasonableCostPerToken =
        (reasonable?.apiCost || 0) / (reasonable?.tokensUsed || 1)
      const unreasonableCostPerToken =
        (unreasonable?.apiCost || 0) / (unreasonable?.tokensUsed || 1)

      expect(reasonableCostPerToken).toBeLessThan(0.001) // Less than $0.001 per token
      expect(unreasonableCostPerToken).toBeGreaterThan(0.005) // More than $0.005 per token
    })
  })

  describe('Index Migration', () => {
    test('should maintain existing index functionality', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Index Test User',
          email: 'index@test.com',
          clerkId: 'index_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Index test entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert records to test existing indexes
        const analysisIds = []
        for (let i = 0; i < 5; i++) {
          const id = await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: 0.5 + i * 0.1,
            emotionalKeywords: [`test-${i}`],
            confidenceLevel: 0.8,
            reasoning: `Test analysis ${i}`,
            analysisVersion: 'v1.0',
            processingTime: 1000 + i * 200,
            status: i < 3 ? 'completed' : 'processing',
            createdAt: Date.now() + i,
          })
          analysisIds.push(id)
        }

        // Test existing indexes still work
        const userAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_user', (q: any) => q.eq('userId', userId))
          .collect()
        expect(userAnalyses).toHaveLength(5)

        const completedAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_status', (q: any) => q.eq('status', 'completed'))
          .collect()

        return { userId, analysisIds, userAnalyses, completedAnalyses }
      })

      const { userAnalyses, completedAnalyses } = result
      expect(userAnalyses).toHaveLength(5)
      expect(completedAnalyses).toHaveLength(3)
    })

    test('should enable new index functionality', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'New Index Test User',
          email: 'newindex@test.com',
          clerkId: 'newindex_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'New index test entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert records with enhanced fields for new indexes
        const models = ['gemini_2_5_flash_lite', 'gpt_4', 'claude_3']
        for (const [index, model] of models.entries()) {
          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: 0.7,
            emotionalKeywords: ['new-index-test'],
            confidenceLevel: 0.85,
            reasoning: `Test analysis for ${model}`,
            analysisVersion: 'v1.0',
            processingTime: 1500,
            tokensUsed: 200 + index * 50,
            apiCost: 0.01 + index * 0.01,
            modelType: model,
            status: 'completed',
            createdAt: Date.now() + index,
          })
        }

        // Test new indexes
        const geminiAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_model_type', (q: any) =>
            q.eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()
        expect(geminiAnalyses).toHaveLength(1)

        const expensiveAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_cost_date', (q: any) => q.gte('apiCost', 0.02))
          .collect()
        expect(expensiveAnalyses).toHaveLength(2)

        const highTokenAnalyses = await ctx.db
          .query('aiAnalysis')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_token_usage', (q: any) => q.gte('tokensUsed', 250))
          .collect()

        return { userId, geminiAnalyses, expensiveAnalyses, highTokenAnalyses }
      })

      const { geminiAnalyses, expensiveAnalyses, highTokenAnalyses } = result
      expect(geminiAnalyses).toHaveLength(1)
      expect(expensiveAnalyses).toHaveLength(2)
      expect(highTokenAnalyses).toHaveLength(1)
    })
  })
})
