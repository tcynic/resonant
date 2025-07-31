/**
 * System monitoring tables tests
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * Note: TypeScript errors in withIndex() calls are due to convex-test library
 * definition limitations. These are runtime functional despite the TypeScript warnings.
 */

import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach } from '@jest/globals'
import schema from '../schema'
import {
  validateSystemLog,
  validateApiUsage,
  validatePerformanceMetric,
  validateAuditTrail,
  createTimeWindow,
  generateCorrelationId,
} from '../utils/schema_helpers'

describe('System Monitoring Tables Tests', () => {
  let t: ReturnType<typeof convexTest>
  let userId: any

  beforeEach(async () => {
    t = convexTest(schema)

    const result = await t.run(async ctx => {
      const newUserId = await ctx.db.insert('users', {
        name: 'Test User',
        email: 'test@example.com',
        clerkId: 'test_clerk_id',
        createdAt: Date.now(),
      })
      return { userId: newUserId }
    })

    userId = result.userId
  })

  describe('systemLogs Table', () => {
    test('should store system logs with all fields', async () => {
      const logData = {
        level: 'info' as const,
        message: 'User logged in successfully',
        service: 'authentication',
        timestamp: Date.now(),
        userId,
        sessionId: 'sess_123456',
        requestId: 'req_789012',
        environment: 'production' as const,
        metadata: {
          loginMethod: 'email',
          duration: 1200,
          ipAddress: '192.168.1.100',
        },
      }

      const result = await t.run(async ctx => {
        const logId = await ctx.db.insert('systemLogs', logData)
        const stored = await ctx.db.get(logId)
        return { logId, stored }
      })

      const { logId, stored } = result

      expect(stored).toBeDefined()
      expect(stored?.level).toBe('info')
      expect(stored?.message).toBe('User logged in successfully')
      expect(stored?.service).toBe('authentication')
      expect(stored?.userId).toBe(userId)
      expect(stored?.sessionId).toBe('sess_123456')
      expect(stored?.environment).toBe('production')
      expect(stored?.metadata?.loginMethod).toBe('email')
    })

    test('should support all log levels', async () => {
      const logLevels = ['debug', 'info', 'warn', 'error'] as const
      const logIds = []

      const result = await t.run(async ctx => {
        const newLogIds = []
        for (const level of logLevels) {
          const logId = await ctx.db.insert('systemLogs', {
            level,
            message: `Test ${level} message`,
            service: 'test_service',
            timestamp: Date.now(),
          })
          newLogIds.push(logId)
        }

        // Test querying by log level
        const errorLogs = await ctx.db
          .query('systemLogs')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_level_timestamp', (q: any) => q.eq('level', 'error'))
          .collect()

        return { logIds: newLogIds, errorLogs }
      })

      const { logIds, errorLogs } = result
      expect(logIds).toHaveLength(4)

      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].level).toBe('error')
    })

    test('should index by service and timestamp', async () => {
      const services = ['auth', 'database', 'ai_processing']
      const baseTime = Date.now()

      const result = await t.run(async ctx => {
        for (const [index, service] of services.entries()) {
          await ctx.db.insert('systemLogs', {
            level: 'info',
            message: `Message from ${service}`,
            service,
            timestamp: baseTime + index * 1000,
          })
        }

        // Query by service
        const authLogs = await ctx.db
          .query('systemLogs')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_service_timestamp', (q: any) =>
            q.eq('service', 'auth')
          )
          .collect()

        // Query by timestamp range
        const recentLogs = await ctx.db
          .query('systemLogs')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_timestamp', (q: any) => q.gte('timestamp', baseTime))
          .collect()

        return { authLogs, recentLogs }
      })

      const { authLogs, recentLogs } = result
      expect(authLogs).toHaveLength(1)
      expect(authLogs[0].service).toBe('auth')

      expect(recentLogs).toHaveLength(3)
    })

    test('should validate log entries', () => {
      const validLog = {
        level: 'info',
        message: 'Valid log message',
        service: 'test_service',
        userId: 'user_123',
      }

      expect(() => validateSystemLog(validLog)).not.toThrow()

      // Test invalid log level
      const invalidLevel = { ...validLog, level: 'invalid_level' }
      expect(() => validateSystemLog(invalidLevel)).toThrow()

      // Test empty message
      const emptyMessage = { ...validLog, message: '' }
      expect(() => validateSystemLog(emptyMessage)).toThrow()

      // Test too long message
      const longMessage = { ...validLog, message: 'x'.repeat(15000) }
      expect(() => validateSystemLog(longMessage)).toThrow()
    })
  })

  describe('apiUsage Table', () => {
    test('should track API usage metrics', async () => {
      const timeWindow = createTimeWindow(Date.now())

      const usageData = {
        service: 'gemini_2_5_flash_lite',
        endpoint: '/v1/generateText',
        method: 'POST',
        userId,
        requestCount: 25,
        tokenUsage: 5000,
        cost: 0.5,
        timeWindow,
        avgResponseTime: 1800,
        errorCount: 2,
        successCount: 23,
        maxResponseTime: 4500,
        minResponseTime: 800,
        dataTransferBytes: 125000,
      }

      const result = await t.run(async ctx => {
        const usageId = await ctx.db.insert('apiUsage', usageData)
        const stored = await ctx.db.get(usageId)
        return { usageId, stored }
      })

      const { usageId, stored } = result

      expect(stored).toBeDefined()
      expect(stored?.service).toBe('gemini_2_5_flash_lite')
      expect(stored?.requestCount).toBe(25)
      expect(stored?.tokenUsage).toBe(5000)
      expect(stored?.cost).toBe(0.5)
      expect(stored?.successCount).toBe(23)
      expect(stored?.errorCount).toBe(2)
    })

    test('should aggregate by time windows', async () => {
      const baseTime = Date.now()
      const hourWindow1 = createTimeWindow(baseTime)
      const hourWindow2 = createTimeWindow(baseTime + 2 * 60 * 60 * 1000) // 2 hours later

      const result = await t.run(async ctx => {
        // Insert usage for two different time windows
        await ctx.db.insert('apiUsage', {
          service: 'gemini_2_5_flash_lite',
          endpoint: '/analyze',
          method: 'POST',
          userId,
          requestCount: 10,
          timeWindow: hourWindow1,
          avgResponseTime: 1500,
          errorCount: 0,
          successCount: 10,
        })

        await ctx.db.insert('apiUsage', {
          service: 'gemini_2_5_flash_lite',
          endpoint: '/analyze',
          method: 'POST',
          userId,
          requestCount: 15,
          timeWindow: hourWindow2,
          avgResponseTime: 1800,
          errorCount: 1,
          successCount: 14,
        })

        // Query by time window
        const window1Usage = await ctx.db
          .query('apiUsage')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_time_window', (q: any) =>
            q.eq('timeWindow', hourWindow1)
          )
          .collect()

        return { window1Usage }
      })

      const { window1Usage } = result

      expect(window1Usage).toHaveLength(1)
      expect(window1Usage[0].requestCount).toBe(10)
    })

    test('should enable cost analysis', async () => {
      const services = [
        { name: 'gemini_2_5_flash_lite', cost: 0.02 },
        { name: 'gpt_4', cost: 0.08 },
        { name: 'claude_3', cost: 0.05 },
      ]

      const timeWindow = createTimeWindow(Date.now())

      const result = await t.run(async ctx => {
        for (const service of services) {
          await ctx.db.insert('apiUsage', {
            service: service.name,
            endpoint: '/analyze',
            method: 'POST',
            userId,
            requestCount: 10,
            cost: service.cost,
            timeWindow,
            avgResponseTime: 2000,
            errorCount: 0,
            successCount: 10,
          })
        }

        // Query expensive services
        const expensiveServices = await ctx.db
          .query('apiUsage')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_cost', (q: any) => q.gte('cost', 0.05))
          .collect()

        return { expensiveServices }
      })

      const { expensiveServices } = result

      expect(expensiveServices).toHaveLength(2)
      expect(expensiveServices.some((s: any) => s.service === 'gpt_4')).toBe(
        true
      )
      expect(expensiveServices.some((s: any) => s.service === 'claude_3')).toBe(
        true
      )
    })

    test('should validate API usage metrics', () => {
      const validUsage = {
        service: 'gemini_2_5_flash_lite',
        endpoint: '/analyze',
        method: 'POST',
        requestCount: 10,
        avgResponseTime: 1500,
        errorCount: 1,
        successCount: 9,
      }

      expect(() => validateApiUsage(validUsage)).not.toThrow()

      // Test negative request count
      const negativeRequests = { ...validUsage, requestCount: -5 }
      expect(() => validateApiUsage(negativeRequests)).toThrow()

      // Test missing service
      const missingService = { ...validUsage, service: '' }
      expect(() => validateApiUsage(missingService)).toThrow()
    })
  })

  describe('performanceMetrics Table', () => {
    test('should store different metric types', async () => {
      const metricTypes = [
        { type: 'response_time', value: 1500, unit: 'milliseconds' },
        { type: 'throughput', value: 250, unit: 'requests/sec' },
        { type: 'error_rate', value: 2.5, unit: 'percentage' },
        { type: 'memory_usage', value: 512, unit: 'megabytes' },
      ] as const

      const timestamp = Date.now()
      const timeWindow = createTimeWindow(timestamp)

      for (const metric of metricTypes) {
        const result = await t.run(async ctx => {
          const metricId = await ctx.db.insert('performanceMetrics', {
            metricType: metric.type,
            service: 'api_gateway',
            value: metric.value,
            unit: metric.unit,
            timestamp,
            timeWindow,
            tags: ['production', 'critical'],
            metadata: {
              region: 'us-central1',
              version: '2.1.0',
              environment: 'production',
            },
          })

          const stored = await ctx.db.get(metricId)
          return { metricId, stored }
        })

        const { stored } = result
        expect(stored?.metricType).toBe(metric.type)
        expect(stored?.value).toBe(metric.value)
        expect(stored?.unit).toBe(metric.unit)
      }
    })

    test('should enable performance analysis queries', async () => {
      const services = ['api_gateway', 'database', 'ai_processing']
      const timestamp = Date.now()

      const result = await t.run(async ctx => {
        for (const [index, service] of services.entries()) {
          await ctx.db.insert('performanceMetrics', {
            metricType: 'response_time',
            service,
            value: 1000 + index * 500, // 1000, 1500, 2000ms
            unit: 'milliseconds',
            timestamp: timestamp + index,
            timeWindow: createTimeWindow(timestamp),
            tags: ['performance'],
          })
        }

        // Query slow services (>1200ms)
        const slowServices = await ctx.db
          .query('performanceMetrics')
          .filter((q: any) =>
            q.and(
              q.eq(q.field('metricType'), 'response_time'),
              q.gt(q.field('value'), 1200)
            )
          )
          .collect()

        return { slowServices }
      })

      const { slowServices } = result

      expect(slowServices).toHaveLength(2)
      expect(slowServices.every((s: any) => s.value > 1200)).toBe(true)
    })

    test('should validate performance metrics', () => {
      const validMetric = {
        metricType: 'response_time',
        service: 'api_service',
        value: 1500,
        unit: 'milliseconds',
        timestamp: Date.now(),
      }

      expect(() => validatePerformanceMetric(validMetric)).not.toThrow()

      // Test invalid metric type
      const invalidType = { ...validMetric, metricType: 'invalid_metric' }
      expect(() => validatePerformanceMetric(invalidType)).toThrow()

      // Test negative value
      const negativeValue = { ...validMetric, value: -100 }
      expect(() => validatePerformanceMetric(negativeValue)).toThrow()
    })
  })

  describe('auditTrail Table', () => {
    test('should track data changes', async () => {
      const auditData = {
        entityType: 'journalEntries',
        entityId: 'entry_12345',
        action: 'update' as const,
        userId,
        sessionId: 'session_abcdef',
        timestamp: Date.now(),
        changes: {
          before: {
            content: 'Original journal entry content',
            mood: 'neutral',
          },
          after: {
            content: 'Updated journal entry content',
            mood: 'happy',
          },
          fieldChanges: ['content', 'mood'],
        },
        metadata: {
          reason: 'User edited journal entry',
          source: 'web_app',
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0 (Chrome)',
          requestId: generateCorrelationId(),
        },
      }

      const result = await t.run(async ctx => {
        const auditId = await ctx.db.insert('auditTrail', auditData)
        const stored = await ctx.db.get(auditId)
        return { auditId, stored }
      })

      const { auditId, stored } = result

      expect(stored).toBeDefined()
      expect(stored?.action).toBe('update')
      expect(stored?.entityType).toBe('journalEntries')
      expect(stored?.changes?.fieldChanges).toEqual(['content', 'mood'])
      expect(stored?.metadata?.source).toBe('web_app')
    })

    test('should support all audit actions', async () => {
      const actions = ['create', 'update', 'delete', 'read'] as const
      const auditIds = []

      const result = await t.run(async ctx => {
        const newAuditIds = []
        for (const action of actions) {
          const auditId = await ctx.db.insert('auditTrail', {
            entityType: 'users',
            entityId: 'user_123',
            action,
            userId,
            timestamp: Date.now(),
            changes:
              action === 'read'
                ? undefined
                : {
                    after: { name: 'Test User' },
                  },
          })
          newAuditIds.push(auditId)
        }

        // Query by action type
        const updateActions = await ctx.db
          .query('auditTrail')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_action_timestamp', (q: any) =>
            q.eq('action', 'update')
          )
          .collect()

        return { auditIds: newAuditIds, updateActions }
      })

      const { auditIds, updateActions } = result
      expect(auditIds).toHaveLength(4)

      expect(updateActions).toHaveLength(1)
    })

    test('should enable entity tracking', async () => {
      const entities = [
        { type: 'users', id: 'user_1' },
        { type: 'users', id: 'user_2' },
        { type: 'journalEntries', id: 'entry_1' },
      ]

      const result = await t.run(async ctx => {
        for (const entity of entities) {
          await ctx.db.insert('auditTrail', {
            entityType: entity.type,
            entityId: entity.id,
            action: 'create',
            userId,
            timestamp: Date.now(),
          })
        }

        // Query by entity type and ID
        const userAudits = await ctx.db
          .query('auditTrail')
          // @ts-expect-error - convex-test library TypeScript definition limitations
          .withIndex('by_entity_type_id', (q: any) =>
            q.eq('entityType', 'users').eq('entityId', 'user_1')
          )
          .collect()

        return { userAudits }
      })

      const { userAudits } = result

      expect(userAudits).toHaveLength(1)
      expect(userAudits[0].entityId).toBe('user_1')
    })

    test('should validate audit trail entries', () => {
      const validAudit = {
        entityType: 'journalEntries',
        entityId: 'entry_123',
        action: 'create',
        userId: 'user_456',
        timestamp: Date.now(),
      }

      expect(() => validateAuditTrail(validAudit)).not.toThrow()

      // Test invalid action
      const invalidAction = { ...validAudit, action: 'invalid_action' }
      expect(() => validateAuditTrail(invalidAction)).toThrow()

      // Test missing entity type
      const missingEntityType = { ...validAudit, entityType: '' }
      expect(() => validateAuditTrail(missingEntityType)).toThrow()
    })
  })

  describe('Cross-table Relationships', () => {
    test('should maintain referential integrity with users', async () => {
      const result = await t.run(async ctx => {
        // Create system log referencing user
        const logId = await ctx.db.insert('systemLogs', {
          level: 'info',
          message: 'User action logged',
          service: 'user_service',
          timestamp: Date.now(),
          userId,
        })

        // Create audit trail referencing user
        const auditId = await ctx.db.insert('auditTrail', {
          entityType: 'profile',
          entityId: 'profile_123',
          action: 'update',
          userId,
          timestamp: Date.now(),
        })

        // Create API usage referencing user
        const usageId = await ctx.db.insert('apiUsage', {
          service: 'user_api',
          endpoint: '/profile',
          method: 'GET',
          userId,
          requestCount: 1,
          timeWindow: createTimeWindow(Date.now()),
          avgResponseTime: 200,
          errorCount: 0,
          successCount: 1,
        })

        // Verify all records exist and reference the same user
        const log = await ctx.db.get(logId)
        const audit = await ctx.db.get(auditId)
        const usage = await ctx.db.get(usageId)
        const user = await ctx.db.get(userId)

        return { logId, auditId, usageId, log, audit, usage, user }
      })

      const { log, audit, usage, user } = result
      expect(log?.userId).toBe(userId)
      expect(audit?.userId).toBe(userId)
      expect(usage?.userId).toBe(userId)
      expect(user).toBeDefined()
    })
  })

  describe('Time Window Utilities', () => {
    test('createTimeWindow should create hourly buckets', () => {
      const timestamp1 = new Date('2024-01-01T10:30:00Z').getTime()
      const timestamp2 = new Date('2024-01-01T10:45:00Z').getTime()
      const timestamp3 = new Date('2024-01-01T11:15:00Z').getTime()

      const window1 = createTimeWindow(timestamp1)
      const window2 = createTimeWindow(timestamp2)
      const window3 = createTimeWindow(timestamp3)

      // Same hour should produce same window
      expect(window1).toBe(window2)

      // Different hour should produce different window
      expect(window1).not.toBe(window3)

      // Windows should be hour-aligned
      expect(window1 % (60 * 60 * 1000)).toBe(0)
    })

    test('generateCorrelationId should create unique IDs', () => {
      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })
})
