/**
 * Index performance and load testing validation
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * Note: TypeScript errors in withIndex() calls are due to convex-test library
 * definition limitations. These are runtime functional despite the TypeScript warnings.
 */

import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach, afterEach } from '@jest/globals'
import schema from '../schema'

describe('Index Performance and Load Testing', () => {
  let t: ReturnType<typeof convexTest>
  let testStartTime: number

  beforeEach(() => {
    t = convexTest(schema)
    testStartTime = Date.now()
  })

  afterEach(() => {
    const testDuration = Date.now() - testStartTime
    if (testDuration > 5000) {
      // More than 5 seconds
      console.warn(
        `Test took ${testDuration}ms - may indicate performance issue`
      )
    }
  })

  describe('Enhanced aiAnalysis Index Performance', () => {
    let userId: any
    let entryIds: any[]

    beforeEach(async () => {
      // Setup test data
      const result = await t.run(async ctx => {
        const newUserId = await ctx.db.insert('users', {
          name: 'Performance Test User',
          email: 'perf@test.com',
          clerkId: 'perf_test_user',
          createdAt: Date.now(),
        })

        // Create multiple journal entries
        const newEntryIds = []
        for (let i = 0; i < 10; i++) {
          const entryId = await ctx.db.insert('journalEntries', {
            userId: newUserId,
            content: `Performance test journal entry ${i}`,
            createdAt: Date.now() + i,
            updatedAt: Date.now() + i,
          })
          newEntryIds.push(entryId)
        }

        return { userId: newUserId, entryIds: newEntryIds }
      })

      userId = result.userId
      entryIds = result.entryIds
    })

    test('should handle large dataset efficiently with by_model_type index', async () => {
      const RECORD_COUNT = 500
      const models = ['gemini_2_5_flash_lite', 'gpt_4', 'claude_3']

      const result = await t.run(async ctx => {
        // Insert large dataset
        const insertStart = Date.now()
        const insertPromises = []

        for (let i = 0; i < RECORD_COUNT; i++) {
          const modelType = models[i % models.length]
          const entryId = entryIds[i % entryIds.length]

          insertPromises.push(
            ctx.db.insert('aiAnalysis', {
              entryId,
              userId,
              sentimentScore: Math.random(),
              emotionalKeywords: [`load-test-${i}`],
              confidenceLevel: 0.7 + Math.random() * 0.3,
              reasoning: `Load test analysis ${i}`,
              analysisVersion: 'v1.0',
              processingTime: 1000 + Math.random() * 2000,
              tokensUsed: Math.floor(100 + Math.random() * 400),
              apiCost: Math.random() * 0.05,
              modelType,
              requestTokens: Math.floor(50 + Math.random() * 200),
              responseTokens: Math.floor(50 + Math.random() * 200),
              cachingUsed: Math.random() > 0.5,
              regionProcessed: 'us-central1',
              status: 'completed',
              createdAt: Date.now() + i,
            })
          )
        }

        await Promise.all(insertPromises)
        const insertTime = Date.now() - insertStart
        console.log(`Inserted ${RECORD_COUNT} records in ${insertTime}ms`)

        // Test query performance with by_model_type index
        const queryStart = Date.now()
        const geminiRecords = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_model_type', (q: any) =>
            q.eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()
        const queryTime = Date.now() - queryStart

        return { insertTime, geminiRecords, queryTime }
      })

      const { geminiRecords, queryTime } = result

      expect(geminiRecords.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(200) // Should be under 200ms
      console.log(
        `Query by model type took ${queryTime}ms for ${geminiRecords.length} results`
      )
    })

    test('should perform efficiently with compound index by_user_model_date', async () => {
      const RECORD_COUNT = 300
      const models = ['gemini_2_5_flash_lite', 'gpt_4']

      const result = await t.run(async ctx => {
        // Insert test data with timestamps spread over time
        const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago

        for (let i = 0; i < RECORD_COUNT; i++) {
          const modelType = models[i % models.length]
          const entryId = entryIds[i % entryIds.length]
          const createdAt = baseTime + i * 60 * 60 * 1000 // Spread over hours

          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: Math.random(),
            emotionalKeywords: ['compound-index-test'],
            confidenceLevel: 0.8,
            reasoning: `Compound index test ${i}`,
            analysisVersion: 'v1.0',
            processingTime: 1500,
            tokensUsed: 200,
            apiCost: 0.01,
            modelType,
            status: 'completed',
            createdAt,
          })
        }

        // Test compound index performance
        const queryStart = Date.now()
        const userGeminiRecords = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_user_model_date', (q: any) =>
            q.eq('userId', userId).eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()
        const queryTime = Date.now() - queryStart

        return { userGeminiRecords, queryTime }
      })

      const { userGeminiRecords, queryTime } = result

      expect(userGeminiRecords.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(150) // Should be very fast with compound index
      console.log(
        `Compound index query took ${queryTime}ms for ${userGeminiRecords.length} results`
      )
    })

    test('should handle cost-based queries efficiently with by_cost_date index', async () => {
      const RECORD_COUNT = 400

      const result = await t.run(async ctx => {
        // Insert records with varying costs
        for (let i = 0; i < RECORD_COUNT; i++) {
          const entryId = entryIds[i % entryIds.length]
          const cost = Math.random() * 0.1 // $0 to $0.10

          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: Math.random(),
            emotionalKeywords: ['cost-test'],
            confidenceLevel: 0.8,
            reasoning: 'Cost analysis test',
            analysisVersion: 'v1.0',
            processingTime: 1500,
            tokensUsed: 200,
            apiCost: cost,
            modelType: 'gemini_2_5_flash_lite',
            status: 'completed',
            createdAt: Date.now() + i,
          })
        }

        // Test range queries on cost
        const queryStart = Date.now()
        const expensiveAnalyses = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_cost_date', (q: any) => q.gte('apiCost', 0.05))
          .collect()
        const queryTime = Date.now() - queryStart

        return { expensiveAnalyses, queryTime }
      })

      const { expensiveAnalyses, queryTime } = result

      expect(expensiveAnalyses.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(200)
      console.log(
        `Cost range query took ${queryTime}ms for ${expensiveAnalyses.length} results`
      )

      // Verify cost filter worked
      expensiveAnalyses.forEach((analysis: any) => {
        expect(analysis.apiCost).toBeGreaterThanOrEqual(0.05)
      })
    })

    test('should efficiently query by token usage', async () => {
      const RECORD_COUNT = 350

      const result = await t.run(async ctx => {
        // Insert records with varying token usage
        for (let i = 0; i < RECORD_COUNT; i++) {
          const entryId = entryIds[i % entryIds.length]
          const tokens = Math.floor(50 + Math.random() * 950) // 50-1000 tokens

          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: Math.random(),
            emotionalKeywords: ['token-test'],
            confidenceLevel: 0.8,
            reasoning: 'Token usage test',
            analysisVersion: 'v1.0',
            processingTime: 1500,
            tokensUsed: tokens,
            apiCost: tokens * 0.00005, // 5 cents per 1000 tokens
            modelType: 'gemini_2_5_flash_lite',
            status: 'completed',
            createdAt: Date.now() + i,
          })
        }

        // Test token usage queries
        const queryStart = Date.now()
        const highTokenAnalyses = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_token_usage', (q: any) => q.gte('tokensUsed', 500))
          .collect()
        const queryTime = Date.now() - queryStart

        return { highTokenAnalyses, queryTime }
      })

      const { highTokenAnalyses, queryTime } = result

      expect(queryTime).toBeLessThan(200)
      console.log(
        `Token usage query took ${queryTime}ms for ${highTokenAnalyses.length} results`
      )

      // Verify token filter worked
      highTokenAnalyses.forEach((analysis: any) => {
        expect(analysis.tokensUsed).toBeGreaterThanOrEqual(500)
      })
    })
  })

  describe('System Monitoring Table Performance', () => {
    test('should handle high-volume system logging efficiently', async () => {
      const LOG_COUNT = 1000
      const services = [
        'auth',
        'database',
        'ai_processing',
        'api_gateway',
        'scheduler',
      ]
      const levels = ['debug', 'info', 'warn', 'error'] as const

      const result = await t.run(async ctx => {
        // Insert high volume of logs
        const insertStart = Date.now()
        const logPromises = []

        for (let i = 0; i < LOG_COUNT; i++) {
          const service = services[i % services.length]
          const level = levels[i % levels.length]

          logPromises.push(
            ctx.db.insert('systemLogs', {
              level,
              message: `High volume test log ${i} from ${service}`,
              service,
              timestamp: Date.now() + i,
              metadata: {
                logIndex: i,
                batchId: Math.floor(i / 100),
              },
            })
          )
        }

        await Promise.all(logPromises)
        const insertTime = Date.now() - insertStart
        console.log(`Inserted ${LOG_COUNT} log records in ${insertTime}ms`)

        // Test querying by level and timestamp
        const queryStart = Date.now()
        const errorLogs = await ctx.db
          .query('systemLogs')
          .withIndex('by_level_timestamp', (q: any) => q.eq('level', 'error'))
          .collect()
        const queryTime = Date.now() - queryStart

        return { insertTime, errorLogs, queryTime }
      })

      const { errorLogs, queryTime } = result

      expect(errorLogs.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(150)
      console.log(
        `Error log query took ${queryTime}ms for ${errorLogs.length} results`
      )
    })

    test('should efficiently aggregate API usage metrics', async () => {
      const USAGE_RECORDS = 200
      const services = [
        'gemini_2_5_flash_lite',
        'gpt_4',
        'claude_3',
        'convex_api',
      ]
      const timeWindows = []

      // Generate hourly time windows for the last week
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      for (let i = 0; i < 24 * 7; i++) {
        const windowTime = weekAgo + i * 60 * 60 * 1000
        const alignedWindow =
          Math.floor(windowTime / (60 * 60 * 1000)) * (60 * 60 * 1000)
        timeWindows.push(alignedWindow)
      }

      const result = await t.run(async ctx => {
        // Insert API usage data
        for (let i = 0; i < USAGE_RECORDS; i++) {
          const service = services[i % services.length]
          const timeWindow = timeWindows[i % timeWindows.length]

          await ctx.db.insert('apiUsage', {
            service,
            endpoint: '/analyze',
            method: 'POST',
            requestCount: Math.floor(1 + Math.random() * 50),
            tokenUsage: Math.floor(100 + Math.random() * 900),
            cost: Math.random() * 0.5,
            timeWindow,
            avgResponseTime: 1000 + Math.random() * 2000,
            errorCount: Math.floor(Math.random() * 5),
            successCount: Math.floor(10 + Math.random() * 40),
          })
        }

        // Test service-based aggregation queries
        const queryStart = Date.now()
        const geminiUsage = await ctx.db
          .query('apiUsage')
          .withIndex('by_service_time', (q: any) =>
            q.eq('service', 'gemini_2_5_flash_lite')
          )
          .collect()
        const queryTime = Date.now() - queryStart

        return { geminiUsage, queryTime }
      })

      const { geminiUsage, queryTime } = result

      expect(geminiUsage.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(200)
      console.log(
        `API usage query took ${queryTime}ms for ${geminiUsage.length} results`
      )

      // Test cost-based queries
      const costResult = await t.run(async ctx => {
        const costQueryStart = Date.now()
        const expensiveUsage = await ctx.db
          .query('apiUsage')
          .withIndex('by_cost', (q: any) => q.gte('cost', 0.1))
          .collect()
        const costQueryTime = Date.now() - costQueryStart

        return { expensiveUsage, costQueryTime }
      })

      const { expensiveUsage, costQueryTime } = costResult

      expect(costQueryTime).toBeLessThan(150)
      console.log(
        `Cost query took ${costQueryTime}ms for ${expensiveUsage.length} results`
      )
    })

    test('should handle performance metrics efficiently', async () => {
      const METRIC_COUNT = 800
      const metricTypes = [
        'response_time',
        'throughput',
        'error_rate',
        'memory_usage',
        'cpu_usage',
      ] as const
      const services = [
        'api_gateway',
        'database',
        'ai_processing',
        'auth_service',
      ]

      const result = await t.run(async ctx => {
        // Insert performance metrics
        const insertStart = Date.now()
        for (let i = 0; i < METRIC_COUNT; i++) {
          const metricType = metricTypes[i % metricTypes.length]
          const service = services[i % services.length]

          await ctx.db.insert('performanceMetrics', {
            metricType,
            service,
            value: Math.random() * 100,
            unit:
              metricType === 'response_time' ? 'milliseconds' : 'percentage',
            timestamp: Date.now() + i,
            timeWindow:
              Math.floor((Date.now() + i) / (60 * 60 * 1000)) *
              (60 * 60 * 1000),
            tags: [service, 'load-test'],
          })
        }
        const insertTime = Date.now() - insertStart
        console.log(
          `Inserted ${METRIC_COUNT} performance metrics in ${insertTime}ms`
        )

        // Test querying by service and metric type
        const queryStart = Date.now()
        const responseTimeMetrics = await ctx.db
          .query('performanceMetrics')
          .withIndex('by_service_type_time', (q: any) =>
            q.eq('service', 'api_gateway').eq('metricType', 'response_time')
          )
          .collect()
        const queryTime = Date.now() - queryStart

        return { insertTime, responseTimeMetrics, queryTime }
      })

      const { responseTimeMetrics, queryTime } = result

      expect(responseTimeMetrics.length).toBeGreaterThan(0)
      expect(queryTime).toBeLessThan(200)
      console.log(
        `Performance metrics query took ${queryTime}ms for ${responseTimeMetrics.length} results`
      )
    })
  })

  describe('Concurrent Access Performance', () => {
    test('should handle concurrent reads efficiently', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Concurrent Test User',
          email: 'concurrent@test.com',
          clerkId: 'concurrent_test',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Concurrent access test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert base data
        const recordIds = []
        for (let i = 0; i < 100; i++) {
          const recordId = await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: Math.random(),
            emotionalKeywords: ['concurrent-test'],
            confidenceLevel: 0.8,
            reasoning: `Concurrent test ${i}`,
            analysisVersion: 'v1.0',
            processingTime: 1500,
            modelType: i % 2 === 0 ? 'gemini_2_5_flash_lite' : 'gpt_4',
            status: 'completed',
            createdAt: Date.now() + i,
          })
          recordIds.push(recordId)
        }

        // Simulate concurrent read operations
        const concurrentStart = Date.now()
        const queries = [
          ctx.db
            .query('aiAnalysis')
            .withIndex('by_user', (q: any) => q.eq('userId', userId))
            .collect(),
          ctx.db
            .query('aiAnalysis')
            .withIndex('by_model_type', (q: any) =>
              q.eq('modelType', 'gemini_2_5_flash_lite')
            )
            .collect(),
          ctx.db
            .query('aiAnalysis')
            .withIndex('by_status', (q: any) => q.eq('status', 'completed'))
            .collect(),
          ctx.db
            .query('aiAnalysis')
            .withIndex('by_user_model_date', (q: any) =>
              q.eq('userId', userId).eq('modelType', 'gpt_4')
            )
            .collect(),
          ctx.db
            .query('aiAnalysis')
            .withIndex('by_processing_time', (q: any) =>
              q.gte('processingTime', 1000)
            )
            .collect(),
        ]

        const results = await Promise.all(queries)
        const concurrentTime = Date.now() - concurrentStart

        return { userId, recordIds, results, concurrentTime }
      })

      const { results, concurrentTime } = result

      expect(results).toHaveLength(5)
      results.forEach((result: any) => expect(result.length).toBeGreaterThan(0))
      expect(concurrentTime).toBeLessThan(500) // All queries should complete quickly
      console.log(`5 concurrent queries completed in ${concurrentTime}ms`)
    })

    test('should handle mixed read/write operations', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Mixed Operations User',
          email: 'mixed@test.com',
          clerkId: 'mixed_ops_test',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Mixed operations test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Simulate mixed read/write workload
        const mixedStart = Date.now()
        const operations = []

        // Add write operations
        for (let i = 0; i < 20; i++) {
          operations.push(
            ctx.db.insert('aiAnalysis', {
              entryId,
              userId,
              sentimentScore: Math.random(),
              emotionalKeywords: [`mixed-${i}`],
              confidenceLevel: 0.8,
              reasoning: `Mixed operation test ${i}`,
              analysisVersion: 'v1.0',
              processingTime: 1500,
              modelType: 'gemini_2_5_flash_lite',
              status: i % 3 === 0 ? 'processing' : 'completed',
              createdAt: Date.now() + i,
            })
          )
        }

        // Add read operations
        operations.push(
          ctx.db
            .query('aiAnalysis')
            .withIndex('by_user', (q: any) => q.eq('userId', userId))
            .collect()
        )
        operations.push(
          ctx.db
            .query('systemLogs')
            .withIndex('by_service_timestamp', (q: any) =>
              q.eq('service', 'test')
            )
            .collect()
        )

        const results = await Promise.all(operations)
        const mixedTime = Date.now() - mixedStart

        return { userId, results, mixedTime }
      })

      const { results, mixedTime } = result

      expect(results).toHaveLength(22) // 20 inserts + 2 queries
      expect(mixedTime).toBeLessThan(1000)
      console.log(`Mixed read/write operations completed in ${mixedTime}ms`)
    })
  })

  describe('Memory and Storage Efficiency', () => {
    test('should efficiently store enhanced metadata without excessive overhead', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Storage Test User',
          email: 'storage@test.com',
          clerkId: 'storage_test',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Storage efficiency test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert record with minimal data
        const minimalId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['minimal'],
          confidenceLevel: 0.8,
          reasoning: 'Minimal test',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          status: 'completed',
          createdAt: Date.now(),
        })

        // Insert record with all enhanced fields
        const enhancedId = await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.7,
          emotionalKeywords: ['enhanced'],
          confidenceLevel: 0.8,
          reasoning: 'Enhanced test with full metadata',
          analysisVersion: 'v1.0',
          processingTime: 1500,
          tokensUsed: 200,
          apiCost: 0.01,
          modelType: 'gemini_2_5_flash_lite',
          modelVersion: 'v1.0',
          requestTokens: 140,
          responseTokens: 60,
          cachingUsed: true,
          batchProcessed: false,
          regionProcessed: 'us-central1',
          status: 'completed',
          createdAt: Date.now(),
        })

        // Both records should be retrievable efficiently
        const queryStart = Date.now()
        const minimal = await ctx.db.get(minimalId)
        const enhanced = await ctx.db.get(enhancedId)
        const queryTime = Date.now() - queryStart

        return { minimalId, enhancedId, minimal, enhanced, queryTime }
      })

      const { minimal, enhanced, queryTime } = result

      expect(minimal).toBeDefined()
      expect(enhanced).toBeDefined()
      expect(queryTime).toBeLessThan(50) // Should be very fast

      // Verify data integrity
      expect(minimal?.modelType).toBeUndefined()
      expect(enhanced?.modelType).toBe('gemini_2_5_flash_lite')
    })
  })

  describe('Query Optimization', () => {
    test('should prefer indexed queries over full table scans', async () => {
      const result = await t.run(async ctx => {
        const userId = await ctx.db.insert('users', {
          name: 'Query Optimization User',
          email: 'optimization@test.com',
          clerkId: 'opt_test',
          createdAt: Date.now(),
        })

        const entryId = await ctx.db.insert('journalEntries', {
          userId,
          content: 'Query optimization test',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        // Insert dataset for optimization testing
        for (let i = 0; i < 200; i++) {
          await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: Math.random(),
            emotionalKeywords: ['optimization'],
            confidenceLevel: 0.8,
            reasoning: `Optimization test ${i}`,
            analysisVersion: 'v1.0',
            processingTime: 1000 + Math.random() * 2000,
            tokensUsed: Math.floor(100 + Math.random() * 400),
            apiCost: Math.random() * 0.05,
            modelType: i % 3 === 0 ? 'gemini_2_5_flash_lite' : 'gpt_4',
            status: 'completed',
            createdAt: Date.now() + i,
          })
        }

        // Test indexed query performance (should be fast)
        const indexedStart = Date.now()
        const indexedResults = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_model_type', (q: any) =>
            q.eq('modelType', 'gemini_2_5_flash_lite')
          )
          .collect()
        const indexedTime = Date.now() - indexedStart

        // Test filtered query performance (may be slower but should still be reasonable)
        const filteredStart = Date.now()
        const filteredResults = await ctx.db
          .query('aiAnalysis')
          .filter((q: any) => q.gte(q.field('processingTime'), 2000))
          .collect()
        const filteredTime = Date.now() - filteredStart

        return { indexedResults, indexedTime, filteredResults, filteredTime }
      })

      const { indexedResults, indexedTime, filteredResults, filteredTime } =
        result

      expect(indexedResults.length).toBeGreaterThan(0)
      expect(filteredResults.length).toBeGreaterThan(0)
      expect(indexedTime).toBeLessThan(100) // Indexed query should be very fast
      expect(filteredTime).toBeLessThan(300) // Filtered query should still be reasonable

      console.log(
        `Indexed query: ${indexedTime}ms, Filtered query: ${filteredTime}ms`
      )
    })
  })
})
