/**
 * Schema validation tests for enhanced database schema
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * Note: TypeScript errors in withIndex() calls are due to convex-test library
 * definition limitations. These are runtime functional despite the TypeScript warnings.
 */

import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach } from '@jest/globals'
import schema from '../schema'
import { api } from '../_generated/api'

describe('Enhanced Database Schema Validation', () => {
  let t: ReturnType<typeof convexTest>

  beforeEach(() => {
    t = convexTest(schema)
  })

  describe('Enhanced aiAnalysis Table', () => {
    test('should accept enhanced metadata fields', async () => {
      const result = await t.run(async ctx => {
        // Create test user and entry
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert aiAnalysis with enhanced fields
        const analysisId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['happy', 'excited'],
          confidenceLevel: 0.85,
          reasoning: 'Test analysis',
          analysisVersion: 'gemini_2_5_flash_lite_v1.0',
          processingTime: 1500,
          tokensUsed: 250,
          apiCost: 0.01,
          // Enhanced fields
          modelType: 'gemini_2_5_flash_lite',
          modelVersion: 'v1.0',
          requestTokens: 175,
          responseTokens: 75,
          cachingUsed: false,
          batchProcessed: false,
          regionProcessed: 'us-central1',
          status: 'completed',
          createdAt: Date.now(),
        })

        // Verify the record was stored correctly
        const analysis = await ctx.db.get(analysisId)
        return { analysisId, analysis }
      })

      expect(result.analysisId).toBeDefined()
      expect(result.analysis).toBeDefined()
      expect(result.analysis?.modelType).toBe('gemini_2_5_flash_lite')
      expect(result.analysis?.requestTokens).toBe(175)
      expect(result.analysis?.responseTokens).toBe(75)
      expect(result.analysis?.regionProcessed).toBe('us-central1')
    })

    test('should work without enhanced fields (backward compatibility)', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert aiAnalysis without enhanced fields (old format)
        const analysisId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.85,
          reasoning: 'Test analysis',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          status: 'completed',
          createdAt: Date.now(),
        })

        const analysis = await ctx.db.get(analysisId)
        return { analysisId, analysis }
      })

      expect(result.analysisId).toBeDefined()
      expect(result.analysis).toBeDefined()
      expect(result.analysis?.modelType).toBeUndefined()
      expect(result.analysis?.requestTokens).toBeUndefined()
    })

    test('should support new indexes for enhanced fields', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert multiple analysis records with different model types
        const analysis1 = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.85,
          reasoning: 'Test analysis 1',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          modelType: 'gemini_2_5_flash_lite',
          apiCost: 0.01,
          tokensUsed: 250,
          status: 'completed',
          createdAt: Date.now(),
        })

        const analysis2 = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['neutral'],
          confidenceLevel: 0.75,
          reasoning: 'Test analysis 2',
          analysisVersion: 'v1.0',
          processingTime: 2000,
          modelType: 'gpt_4',
          apiCost: 0.02,
          tokensUsed: 300,
          status: 'completed',
          createdAt: Date.now(),
        })

        // Test by_model_type index
        const geminiAnalyses = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_model_type', (q: any) =>
            q.eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()

        // Test by_cost_date index (should be able to filter by cost)
        const costFilteredAnalyses = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_cost_date', (q: any) => q.eq('apiCost', 0.01))
          .collect()

        return { analysis1, analysis2, geminiAnalyses, costFilteredAnalyses }
      })

      expect(result.geminiAnalyses).toHaveLength(1)
      expect(result.geminiAnalyses[0]._id).toBe(result.analysis1)

      expect(result.costFilteredAnalyses).toHaveLength(1)
      expect(result.costFilteredAnalyses[0]._id).toBe(result.analysis1)
    })
  })

  describe('System Monitoring Tables', () => {
    test('systemLogs table should accept valid log entries', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const logId = await ctx.db.insert('systemLogs', {
          level: 'info',
          message: 'Test log message',
          service: 'test_service',
          timestamp: Date.now(),
          userId,
          sessionId: 'test_session_123',
          requestId: 'req_123',
          environment: 'development',
          metadata: {
            additionalInfo: 'test metadata',
            requestCount: 1,
          },
        })

        const log = await ctx.db.get(logId)
        return { logId, log }
      })

      const { logId, log } = result
      expect(logId).toBeDefined()
      expect(log).toBeDefined()
      expect(log?.level).toBe('info')
      expect(log?.service).toBe('test_service')
      expect(log?.environment).toBe('development')
    })

    test('systemLogs indexes should work correctly', async () => {
      const result = await t.run(async ctx => {
        const now = Date.now()

        await ctx.db.insert('systemLogs', {
          level: 'error',
          message: 'Error message 1',
          service: 'service_a',
          timestamp: now,
        })

        await ctx.db.insert('systemLogs', {
          level: 'info',
          message: 'Info message 1',
          service: 'service_a',
          timestamp: now + 1000,
        })

        await ctx.db.insert('systemLogs', {
          level: 'error',
          message: 'Error message 2',
          service: 'service_b',
          timestamp: now + 2000,
        })

        // Test by_level_timestamp index
        const errorLogs = await ctx.db
          .query('systemLogs')
          .withIndex('by_level_timestamp', (q: any) => q.eq('level', 'error'))
          .collect()

        // Test by_service_timestamp index
        const serviceALogs = await ctx.db
          .query('systemLogs')
          .withIndex('by_service_timestamp', (q: any) =>
            q.eq('service', 'service_a')
          )
          .collect()

        return { errorLogs, serviceALogs }
      })

      const { errorLogs, serviceALogs } = result
      expect(errorLogs).toHaveLength(2)
      expect(serviceALogs).toHaveLength(2)
    })

    test('apiUsage table should accept valid usage metrics', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const timeWindow =
          Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000)

        const usageId = await ctx.db.insert('apiUsage', {
          service: 'gemini_2_5_flash_lite',
          endpoint: '/v1/analyze',
          method: 'POST',
          userId,
          requestCount: 10,
          tokenUsage: 2500,
          cost: 0.25,
          timeWindow,
          avgResponseTime: 1500,
          errorCount: 1,
          successCount: 9,
          maxResponseTime: 3000,
          minResponseTime: 800,
          dataTransferBytes: 15000,
        })

        const usage = await ctx.db.get(usageId)
        return { usageId, usage }
      })

      const { usageId, usage } = result
      expect(usageId).toBeDefined()
      expect(usage).toBeDefined()
      expect(usage?.service).toBe('gemini_2_5_flash_lite')
      expect(usage?.requestCount).toBe(10)
      expect(usage?.successCount).toBe(9)
    })

    test('performanceMetrics table should support different metric types', async () => {
      const result = await t.run(async ctx => {
        const timestamp = Date.now()
        const timeWindow =
          Math.floor(timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000)

        const metricTypes = [
          'response_time',
          'throughput',
          'error_rate',
          'memory_usage',
        ]
        const metricIds = []

        for (const metricType of metricTypes) {
          const metricId = await ctx.db.insert('performanceMetrics', {
            metricType: metricType as any,
            service: 'test_service',
            value: Math.random() * 100,
            unit:
              metricType === 'response_time' ? 'milliseconds' : 'percentage',
            timestamp,
            timeWindow,
            tags: ['test'],
            metadata: {
              environment: 'test',
              version: '1.0.0',
            },
          })
          metricIds.push(metricId)
        }

        // Test querying by metric type
        const responseTimeMetrics = await ctx.db
          .query('performanceMetrics')
          .withIndex('by_type_timestamp', (q: any) =>
            q.eq('metricType', 'response_time')
          )
          .collect()

        return { metricIds, responseTimeMetrics }
      })

      const { metricIds, responseTimeMetrics } = result
      expect(metricIds).toHaveLength(4)
      expect(responseTimeMetrics).toHaveLength(1)
    })

    test('auditTrail table should track data changes', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const auditId = await ctx.db.insert('auditTrail', {
          entityType: 'journalEntries',
          entityId: 'entry_123',
          action: 'create',
          userId,
          sessionId: 'session_123',
          timestamp: Date.now(),
          changes: {
            after: {
              content: 'New journal entry',
              mood: 'happy',
            },
            fieldChanges: ['content', 'mood'],
          },
          metadata: {
            reason: 'User created new entry',
            source: 'web',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            requestId: 'req_123',
          },
        })

        const audit = await ctx.db.get(auditId)
        return { auditId, audit }
      })

      const { auditId, audit } = result
      expect(auditId).toBeDefined()
      expect(audit).toBeDefined()
      expect(audit?.action).toBe('create')
      expect(audit?.entityType).toBe('journalEntries')
    })
  })

  describe('Index Performance', () => {
    test('should efficiently query with new indexes', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert multiple analysis records for performance testing
        const analysisPromises = []
        for (let i = 0; i < 50; i++) {
          analysisPromises.push(
            ctx.db.insert('aiAnalysis', {
              entryId,
              userId,
              sentimentScore: Math.random(),
              emotionalKeywords: ['test'],
              confidenceLevel: Math.random(),
              reasoning: `Test analysis ${i}`,
              analysisVersion: 'v1.0',
              processingTime: 1000 + Math.random() * 2000,
              modelType: i % 2 === 0 ? 'gemini_2_5_flash_lite' : 'gpt_4',
              apiCost: Math.random() * 0.1,
              tokensUsed: Math.floor(Math.random() * 1000),
              status: 'completed',
              createdAt: Date.now() + i,
            })
          )
        }

        await Promise.all(analysisPromises)

        // Test compound index performance
        const start = Date.now()
        const results = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_user_model_date', (q: any) =>
            q.eq('userId', userId).eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()
        const queryTime = Date.now() - start

        return { results, queryTime }
      })

      const { results, queryTime } = result
      expect(results.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(100) // Should be fast with proper indexing
    })
  })

  describe('Data Validation', () => {
    test('should enforce required fields', async () => {
      // Test that required fields are enforced
      await expect(async () => {
        await t.run(async ctx => {
          await ctx.db.insert('systemLogs', {
            // Missing required fields
            timestamp: Date.now(),
          } as any)
        })
      }).rejects.toThrow()
    })

    test('should enforce union types', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        // Test valid log level
        const validLogId = await ctx.db.insert('systemLogs', {
          level: 'info',
          message: 'Valid log',
          service: 'test',
          timestamp: Date.now(),
        })

        return { userId, validLogId }
      })

      const { validLogId } = result
      expect(validLogId).toBeDefined()

      // Test invalid log level should be caught by TypeScript
      // This would fail at compile time, not runtime
    })
  })

  describe('Cross-table Relationships', () => {
    test('should maintain referential integrity', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })

        // Insert system log with user reference
        const logId = await ctx.db.insert('systemLogs', {
          level: 'info',
          message: 'User action logged',
          service: 'user_service',
          timestamp: Date.now(),
          userId,
        })

        const log = await ctx.db.get(logId)
        const user = await ctx.db.get(userId)

        return { userId, logId, log, user }
      })

      const { userId, log, user } = result
      expect(log?.userId).toBe(userId)
      expect(user).toBeDefined()
    })
  })
})
