/**
 * Tests for Success Rate Tracking & Alerting System (Story AI-Migration.6)
 */

import { convexTest } from 'convex-test'
import { expect, test, beforeEach, describe } from '@jest/globals'
import schema from '../../schema'
import {
  calculateSuccessRate,
  getRealTimeSuccessRate,
  getSuccessRateTrends,
  checkSuccessRateAlerts,
  compareSuccessRatesAcrossServices,
  SUCCESS_RATE_THRESHOLDS,
} from '../success_rate_tracking'

const modules = {
  calculateSuccessRate,
  getRealTimeSuccessRate,
  getSuccessRateTrends,
  checkSuccessRateAlerts,
  compareSuccessRatesAcrossServices,
}

describe('Success Rate Tracking System', () => {
  let t: any

  beforeEach(async () => {
    t = convexTest(schema, modules as any)
  })

  describe('calculateSuccessRate', () => {
    test('should calculate correct success rate with completed analyses', async () => {
      // Create test user
      const userId = await t.run(async (ctx: any) => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_user_123',
          createdAt: Date.now(),
        })
      })

      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Create test analyses - 8 successful, 2 failed
      const analyses = []
      for (let i = 0; i < 8; i++) {
        // @ts-ignore - convex-test TypeScript limitations
        analyses.push(
          // @ts-ignore - convex-test TypeScript limitations
          await t.run(async (ctx: any) => {
            return await ctx.db.insert('aiAnalysis', {
              entryId: 'test_entry_' + i,
              userId,
              sentimentScore: 0.5,
              emotionalKeywords: ['happy'],
              confidenceLevel: 0.8,
              reasoning: 'Test analysis',
              status: 'completed',
              createdAt: oneHourAgo + i * 1000,
              modelType: 'gemini_2_5_flash_lite',
              processingTime: 1000,
              apiCost: 0.001,
            })
          })
        )
      }

      for (let i = 0; i < 2; i++) {
        // @ts-ignore - convex-test TypeScript limitations
        analyses.push(
          // @ts-ignore - convex-test TypeScript limitations
          await t.run(async (ctx: any) => {
            return await ctx.db.insert('aiAnalysis', {
              entryId: 'test_entry_failed_' + i,
              userId,
              sentimentScore: 0,
              emotionalKeywords: [],
              confidenceLevel: 0,
              reasoning: 'Failed analysis',
              status: 'failed',
              createdAt: oneHourAgo + (i + 8) * 1000,
              modelType: 'gemini_2_5_flash_lite',
              processingTime: 5000,
            })
          })
        )
      }

      // Test success rate calculation
      const result = await t.query(calculateSuccessRate, { timeWindow: '1h' })

      expect(result.metrics.successRate).toBe(0.8) // 8/10 = 80%
      expect(result.metrics.totalCount).toBe(10)
      expect(result.metrics.successCount).toBe(8)
      expect(result.metrics.failureCount).toBe(2)
      expect(result.alert.level).toBe('warning') // Below 92% threshold
    })

    test('should handle empty dataset gracefully', async () => {
      const result = await t.query(calculateSuccessRate, { timeWindow: '1h' })

      expect(result.metrics.successRate).toBe(1.0) // Default to 100% when no data
      expect(result.metrics.totalCount).toBe(0)
      expect(result.alert.level).toBe('normal')
    })

    test('should filter by service correctly', async () => {
      const userId = await t.run(async (ctx: any) => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_user_123',
          createdAt: Date.now(),
        })
      })

      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Create analyses for different services
      // @ts-ignore - convex-test TypeScript limitations
      await t.run(async ctx => {
        await ctx.db.insert('aiAnalysis', {
          entryId: 'gemini_entry',
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.8,
          reasoning: 'Gemini analysis',
          status: 'completed',
          createdAt: oneHourAgo,
          modelType: 'gemini_2_5_flash_lite',
        })

        await ctx.db.insert('aiAnalysis', {
          entryId: 'fallback_entry',
          userId,
          sentimentScore: 0.3,
          emotionalKeywords: ['sad'],
          confidenceLevel: 0.6,
          reasoning: 'Fallback analysis',
          status: 'failed',
          createdAt: oneHourAgo + 1000,
          modelType: 'fallback_analysis',
        })
      })

      // Test filtering by Gemini service
      const geminiResult = await t.query(calculateSuccessRate, {
        timeWindow: '1h',
        service: 'gemini_2_5_flash_lite',
      })

      expect(geminiResult.metrics.totalCount).toBe(1)
      expect(geminiResult.metrics.successCount).toBe(1)
      expect(geminiResult.metrics.successRate).toBe(1.0)

      // Test filtering by fallback service
      const fallbackResult = await t.query(calculateSuccessRate, {
        timeWindow: '1h',
        service: 'fallback_analysis',
      })

      expect(fallbackResult.metrics.totalCount).toBe(1)
      expect(fallbackResult.metrics.successCount).toBe(0)
      expect(fallbackResult.metrics.successRate).toBe(0.0)
    })
  })

  describe('getRealTimeSuccessRate', () => {
    test('should return metrics for multiple time windows', async () => {
      const userId = await t.run(async (ctx: any) => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_user_123',
          createdAt: Date.now(),
        })
      })

      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Create successful analysis
      // @ts-ignore - convex-test TypeScript limitations
      await t.run(async ctx => {
        await ctx.db.insert('aiAnalysis', {
          entryId: 'test_entry',
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.8,
          reasoning: 'Test analysis',
          status: 'completed',
          createdAt: oneHourAgo,
          modelType: 'gemini_2_5_flash_lite',
        })
      })

      const result = await t.query(getRealTimeSuccessRate, {})

      expect(result.metrics).toHaveLength(3) // 1h, 6h, 24h
      expect(result.metrics[0].timeWindow).toBe('1h')
      expect(result.metrics[0].successRate).toBe(1.0)
      expect(result.thresholds).toEqual(SUCCESS_RATE_THRESHOLDS)
      expect(result.circuitBreakerStatus).toHaveLength(2) // gemini and fallback services
    })
  })

  describe('getSuccessRateTrends', () => {
    test('should calculate trend data with correct granularity', async () => {
      const userId = await t.mutation('users:create', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_user_123',
        createdAt: Date.now(),
      })

      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000

      // Create analyses spread across the day
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = oneDayAgo + hour * 60 * 60 * 1000
        const isSuccessful = hour % 4 !== 0 // 75% success rate pattern

        // @ts-ignore - convex-test TypeScript limitations
        await t.run(async ctx => {
          await ctx.db.insert('aiAnalysis', {
            entryId: `test_entry_${hour}`,
            userId,
            sentimentScore: 0.5,
            emotionalKeywords: ['neutral'],
            confidenceLevel: 0.8,
            reasoning: `Analysis for hour ${hour}`,
            status: isSuccessful ? 'completed' : 'failed',
            createdAt: timestamp,
            modelType: 'gemini_2_5_flash_lite',
          })
        })
      }

      const result = await t.query('getSuccessRateTrends', {
        timeWindow: '24h',
        granularity: 'hourly',
      })

      expect(result.timeWindow).toBe('24h')
      expect(result.granularity).toBe('hourly')
      expect(result.trendData.length).toBeGreaterThan(0)
      expect(result.summary.averageSuccessRate).toBe(0.75) // Expected 75% success rate
      expect(result.patterns).toBeDefined()
    })

    test('should detect high volatility patterns', async () => {
      const userId = await t.mutation('users:create', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_user_123',
        createdAt: Date.now(),
      })

      const now = Date.now()
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

      // Create highly volatile success rates (alternating very high and very low)
      for (let day = 0; day < 7; day++) {
        const timestamp = sevenDaysAgo + day * 24 * 60 * 60 * 1000
        const isHighSuccessDay = day % 2 === 0

        for (let i = 0; i < 10; i++) {
          const isSuccessful = isHighSuccessDay ? i < 9 : i < 2 // 90% vs 20% success

          // @ts-ignore - convex-test TypeScript limitations
          await t.run(async (ctx: any) => {
            await ctx.db.insert('aiAnalysis', {
              entryId: `volatile_entry_${day}_${i}`,
              userId,
              sentimentScore: 0.5,
              emotionalKeywords: ['test'],
              confidenceLevel: 0.8,
              reasoning: `Volatile analysis day ${day} item ${i}`,
              status: isSuccessful ? 'completed' : 'failed',
              createdAt: timestamp + i * 1000,
              modelType: 'gemini_2_5_flash_lite',
            })
          })
        }
      }

      const result = await t.query('getSuccessRateTrends', {
        timeWindow: '7d',
        granularity: 'daily',
      })

      expect(result.patterns.some(p => p.type === 'high_volatility')).toBe(true)
    })
  })

  describe('checkSuccessRateAlerts', () => {
    test('should trigger alert when success rate drops below threshold', async () => {
      const userId = await t.mutation('users:create', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_user_123',
        createdAt: Date.now(),
      })

      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Create mostly failed analyses (20% success rate)
      for (let i = 0; i < 10; i++) {
        const isSuccessful = i < 2 // Only 2 out of 10 successful

        // @ts-ignore - convex-test TypeScript limitations
        await t.run(async ctx => {
          await ctx.db.insert('aiAnalysis', {
            entryId: `alert_test_entry_${i}`,
            userId,
            sentimentScore: 0.5,
            emotionalKeywords: ['test'],
            confidenceLevel: 0.8,
            reasoning: `Alert test analysis ${i}`,
            status: isSuccessful ? 'completed' : 'failed',
            createdAt: oneHourAgo + i * 1000,
            modelType: 'gemini_2_5_flash_lite',
          })
        })
      }

      const result = await t.mutation('checkSuccessRateAlerts', {
        timeWindow: '1h',
      })

      expect(result.alertTriggered).toBe(true)
      expect(result.successRate).toBe(0.2)
      expect(result.alertLevel).toBe('emergency') // 20% is below all thresholds
      expect(result.alertId).toBeDefined()

      // Verify alert was created in database
      // @ts-ignore - convex-test TypeScript limitations
      const alert = await t.run(async ctx => {
        return await ctx.db.get(result.alertId)
      })

      expect(alert).toBeDefined()
      expect(alert.alertType).toBe('success_rate')
      expect(alert.severity).toBe('emergency')
    })

    test('should not trigger duplicate alerts', async () => {
      const userId = await t.mutation('users:create', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_user_123',
        createdAt: Date.now(),
      })

      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Create failed analyses
      for (let i = 0; i < 5; i++) {
        // @ts-ignore - convex-test TypeScript limitations
        await t.run(async ctx => {
          await ctx.db.insert('aiAnalysis', {
            entryId: `duplicate_test_entry_${i}`,
            userId,
            sentimentScore: 0.5,
            emotionalKeywords: ['test'],
            confidenceLevel: 0.8,
            reasoning: `Duplicate test analysis ${i}`,
            status: 'failed',
            createdAt: oneHourAgo + i * 1000,
            modelType: 'gemini_2_5_flash_lite',
          })
        })
      }

      // First alert should be triggered
      const firstResult = await t.mutation('checkSuccessRateAlerts', {
        timeWindow: '1h',
      })
      expect(firstResult.alertTriggered).toBe(true)

      // Second alert check should not trigger new alert
      const secondResult = await t.mutation('checkSuccessRateAlerts', {
        timeWindow: '1h',
      })
      expect(secondResult.alertTriggered).toBe(false)
      expect(secondResult.alertId).toBe(firstResult.alertId)
    })
  })

  describe('compareSuccessRatesAcrossServices', () => {
    test('should compare performance across different services', async () => {
      const userId = await t.mutation('users:create', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_user_123',
        createdAt: Date.now(),
      })

      const now = Date.now()
      const oneHourAgo = now - 60 * 60 * 1000

      // Create analyses for Gemini (high success rate)
      for (let i = 0; i < 10; i++) {
        // @ts-ignore - convex-test TypeScript limitations
        await t.run(async ctx => {
          await ctx.db.insert('aiAnalysis', {
            entryId: `gemini_compare_${i}`,
            userId,
            sentimentScore: 0.7,
            emotionalKeywords: ['positive'],
            confidenceLevel: 0.9,
            reasoning: `Gemini analysis ${i}`,
            status: i < 9 ? 'completed' : 'failed', // 90% success
            createdAt: oneHourAgo + i * 1000,
            modelType: 'gemini_2_5_flash_lite',
            processingTime: 1500,
            apiCost: 0.002,
          })
        })
      }

      // Create analyses for fallback (lower success rate)
      for (let i = 0; i < 10; i++) {
        // @ts-ignore - convex-test TypeScript limitations
        await t.run(async ctx => {
          await ctx.db.insert('aiAnalysis', {
            entryId: `fallback_compare_${i}`,
            userId,
            sentimentScore: 0.4,
            emotionalKeywords: ['neutral'],
            confidenceLevel: 0.6,
            reasoning: `Fallback analysis ${i}`,
            status: i < 7 ? 'completed' : 'failed', // 70% success
            createdAt: oneHourAgo + i * 1000,
            modelType: 'fallback_analysis',
            processingTime: 500,
            apiCost: 0.0005,
            fallbackUsed: true,
          })
        })
      }

      const result = await t.query('compareSuccessRatesAcrossServices', {
        timeWindow: '1h',
      })

      expect(result.comparison).toHaveLength(2)
      expect(result.insights.bestPerforming).toBe('gemini_2_5_flash_lite')
      expect(result.insights.worstPerforming).toBe('fallback_analysis')

      // Find Gemini results
      const geminiStats = result.comparison.find(
        c => c.service === 'gemini_2_5_flash_lite'
      )
      expect(geminiStats?.successRate).toBe(0.9)
      expect(geminiStats?.performance.reliability).toBe('good')

      // Find fallback results
      const fallbackStats = result.comparison.find(
        c => c.service === 'fallback_analysis'
      )
      expect(fallbackStats?.successRate).toBe(0.7)
      expect(fallbackStats?.fallbackRate).toBe(1.0) // All fallback analyses used fallback
    })
  })

  describe('Alert Thresholds', () => {
    test('should correctly classify alert levels', async () => {
      // Test data for different success rates
      const testCases = [
        { successRate: 0.95, expectedLevel: 'normal' },
        { successRate: 0.91, expectedLevel: 'warning' },
        { successRate: 0.89, expectedLevel: 'critical' },
        { successRate: 0.8, expectedLevel: 'emergency' },
      ]

      for (const testCase of testCases) {
        const userId = await t.mutation('users:create', {
          name: `Test User ${testCase.successRate}`,
          email: `test${testCase.successRate}@example.com`,
          clerkId: `test_user_${testCase.successRate}`,
          createdAt: Date.now(),
        })

        const now = Date.now()
        const oneHourAgo = now - 60 * 60 * 1000
        const totalAnalyses = 100
        const successfulAnalyses = Math.floor(
          totalAnalyses * testCase.successRate
        )

        // Create analyses with exact success rate
        for (let i = 0; i < totalAnalyses; i++) {
          const isSuccessful = i < successfulAnalyses

          // @ts-ignore - convex-test TypeScript limitations
          await t.run(async (ctx: any) => {
            await ctx.db.insert('aiAnalysis', {
              entryId: `threshold_test_${testCase.successRate}_${i}`,
              userId,
              sentimentScore: 0.5,
              emotionalKeywords: ['test'],
              confidenceLevel: 0.8,
              reasoning: `Threshold test ${testCase.successRate}`,
              status: isSuccessful ? 'completed' : 'failed',
              createdAt: oneHourAgo + i * 100,
              modelType: 'gemini_2_5_flash_lite',
            })
          })
        }

        const result = await t.query('calculateSuccessRate', {
          timeWindow: '1h',
        })
        expect(result.alert.level).toBe(testCase.expectedLevel)
        expect(result.metrics.successRate).toBeCloseTo(testCase.successRate, 2)
      }
    })
  })
})
