import { convexTest } from 'convex-test'
import { describe, it, expect, beforeEach } from '@jest/globals'
import { api } from '../../_generated/api'
import schema from '../../schema'
import { Id } from '../../_generated/dataModel'

describe('Legacy System Migration & Cleanup', () => {
  let t: ReturnType<typeof convexTest>

  beforeEach(() => {
    t = convexTest(schema)
  })

  describe('Data Migration Script', () => {
    it('should migrate legacy aiAnalysis records to enhanced schema', async () => {
      // Create legacy aiAnalysis record
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const relationshipId = await t.run(async ctx => {
        return await ctx.db.insert('relationships', {
          userId,
          name: 'Test Relationship',
          type: 'partner',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          relationshipId,
          content: 'Test journal entry for migration',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Create legacy aiAnalysis record (without new fields)
      const legacyAnalysisId = await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          relationshipId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy', 'content'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis reasoning',
          analysisVersion: 'gemini-2.5-flash-lite-v1.0',
          processingTime: 2500,
          tokensUsed: 150,
          apiCost: 0.0001,
          processingAttempts: 1,
          status: 'completed',
          createdAt: Date.now(),
        })
      })

      // Run migration
      const migrationResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.legacyCleanupMigration,
        { dryRun: false }
      )

      // Verify migration results
      expect(migrationResult.processed).toBe(1)
      expect(migrationResult.migrated).toBe(1)
      expect(migrationResult.errors).toBe(0)

      // Verify the record was migrated
      const migratedRecord = await t.run(async ctx => {
        return await ctx.db.get(legacyAnalysisId)
      })

      expect(migratedRecord).toBeDefined()
      expect(migratedRecord!.modelType).toBe('gemini_2_5_flash_lite')
      expect(migratedRecord!.queuedAt).toBeDefined()
      expect(migratedRecord!.circuitBreakerState).toBeDefined()
      expect(migratedRecord!.circuitBreakerState!.service).toBe(
        'gemini_2_5_flash_lite'
      )
      expect(migratedRecord!.circuitBreakerState!.state).toBe('closed')
      expect(migratedRecord!.priority).toBe('normal')
      expect(migratedRecord!.fallbackUsed).toBe(false)
    })

    it('should skip already migrated records', async () => {
      // Create an already migrated record
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const migratedAnalysisId = await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis',
          analysisVersion: 'gemini-2.5-flash-lite-v1.0',
          processingTime: 2500,
          status: 'completed',
          createdAt: Date.now(),
          // Already has new format fields
          modelType: 'gemini_2_5_flash_lite',
          queueMetadata: {
            priority: 'normal',
            queuedAt: Date.now(),
          },
        })
      })

      // Run migration
      const migrationResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.legacyCleanupMigration,
        { dryRun: false }
      )

      // Should skip the already migrated record
      expect(migrationResult.processed).toBe(1)
      expect(migrationResult.skipped).toBe(1)
      expect(migrationResult.migrated).toBe(0)
    })

    it('should handle dry run mode correctly', async () => {
      // Create legacy record
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const legacyAnalysisId = await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis',
          analysisVersion: 'gemini-2.5-flash-lite-v1.0',
          status: 'completed',
          createdAt: Date.now(),
        })
      })

      // Run dry run migration
      const migrationResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.legacyCleanupMigration,
        { dryRun: true }
      )

      // Should report migration but not actually change data
      expect(migrationResult.processed).toBe(1)
      expect(migrationResult.migrated).toBe(1)

      // Verify record was not actually changed
      const unchangedRecord = await t.run(async ctx => {
        return await ctx.db.get(legacyAnalysisId)
      })

      expect(unchangedRecord!.modelType).toBeUndefined()
      expect(unchangedRecord!.queuedAt).toBeUndefined()
    })
  })

  describe('Migration Validation', () => {
    it('should validate migration integrity', async () => {
      // Create and migrate a record
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis',
          analysisVersion: 'gemini-2.5-flash-lite-v1.0',
          status: 'completed',
          createdAt: Date.now(),
          // Pre-migrated fields
          modelType: 'gemini_2_5_flash_lite',
          queuedAt: Date.now(),
          circuitBreakerState: {
            service: 'gemini_2_5_flash_lite',
            state: 'closed',
            failureCount: 0,
          },
        })
      })

      // Validate migration
      const validationResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.validateMigration,
        {}
      )

      expect(validationResult.totalRecords).toBe(1)
      expect(validationResult.migratedRecords).toBe(1)
      expect(validationResult.unmigrated).toBe(0)
      expect(validationResult.integrity).toBe(true)
      expect(validationResult.issues).toHaveLength(0)
    })

    it('should detect integrity issues', async () => {
      // Create a record missing required migrated fields
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis',
          status: 'completed',
          createdAt: Date.now(),
          // Partially migrated - missing required fields
          modelType: 'gemini_2_5_flash_lite',
          // Missing queuedAt and circuitBreakerState
        })
      })

      // Validate migration
      const validationResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.validateMigration,
        {}
      )

      expect(validationResult.integrity).toBe(false)
      expect(validationResult.issues.length).toBeGreaterThan(0)
    })
  })

  describe('Migration Rollback', () => {
    it('should rollback migrated records', async () => {
      // Create migrated record
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const migratedAnalysisId = await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis',
          status: 'completed',
          createdAt: Date.now(),
          // Migrated fields
          modelType: 'gemini_2_5_flash_lite',
          queuedAt: Date.now(),
          priority: 'normal',
          circuitBreakerState: {
            service: 'gemini_2_5_flash_lite',
            state: 'closed',
            failureCount: 0,
          },
        })
      })

      // Run rollback
      const rollbackResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.rollbackMigration,
        { dryRun: false }
      )

      expect(rollbackResult.processed).toBe(1)
      expect(rollbackResult.rolledBack).toBe(1)
      expect(rollbackResult.errors).toBe(0)

      // Verify rollback
      const rolledBackRecord = await t.run(async ctx => {
        return await ctx.db.get(migratedAnalysisId)
      })

      expect(rolledBackRecord!.modelType).toBeUndefined()
      expect(rolledBackRecord!.queuedAt).toBeUndefined()
      expect(rolledBackRecord!.circuitBreakerState).toBeUndefined()
    })

    it('should handle rollback dry run mode', async () => {
      // Create migrated record
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const entryId = await t.run(async ctx => {
        return await ctx.db.insert('journalEntries', {
          userId,
          content: 'Test journal entry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const migratedAnalysisId = await t.run(async ctx => {
        return await ctx.db.insert('aiAnalysis', {
          entryId,
          userId,
          sentimentScore: 0.5,
          emotionalKeywords: ['happy'],
          confidenceLevel: 0.9,
          reasoning: 'Test analysis',
          status: 'completed',
          createdAt: Date.now(),
          modelType: 'gemini_2_5_flash_lite',
          queuedAt: Date.now(),
        })
      })

      // Run dry run rollback
      const rollbackResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.rollbackMigration,
        { dryRun: true }
      )

      expect(rollbackResult.processed).toBe(1)
      expect(rollbackResult.rolledBack).toBe(1)

      // Verify record was not actually changed
      const unchangedRecord = await t.run(async ctx => {
        return await ctx.db.get(migratedAnalysisId)
      })

      expect(unchangedRecord!.modelType).toBe('gemini_2_5_flash_lite')
      expect(unchangedRecord!.queuedAt).toBeDefined()
    })
  })

  describe('Performance Testing', () => {
    it('should handle large datasets efficiently', async () => {
      // Create multiple legacy records
      const userId = await t.run(async ctx => {
        return await ctx.db.insert('users', {
          name: 'Test User',
          email: 'test@example.com',
          clerkId: 'test_clerk_id',
          createdAt: Date.now(),
        })
      })

      const recordCount = 10 // Small number for test performance
      const recordIds: Id<'aiAnalysis'>[] = []

      // Create multiple legacy records
      for (let i = 0; i < recordCount; i++) {
        const entryId = await t.run(async ctx => {
          return await ctx.db.insert('journalEntries', {
            userId,
            content: `Test journal entry ${i}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        })

        const analysisId = await t.run(async ctx => {
          return await ctx.db.insert('aiAnalysis', {
            entryId,
            userId,
            sentimentScore: 0.5,
            emotionalKeywords: ['happy'],
            confidenceLevel: 0.9,
            reasoning: `Test analysis ${i}`,
            analysisVersion: 'gemini-2.5-flash-lite-v1.0',
            status: 'completed',
            createdAt: Date.now(),
          })
        })

        recordIds.push(analysisId)
      }

      // Measure migration performance
      const startTime = Date.now()

      const migrationResult = await t.mutation(
        api.migrations.legacy_cleanup_v7.legacyCleanupMigration,
        { dryRun: false }
      )

      const endTime = Date.now()
      const migrationTime = endTime - startTime

      expect(migrationResult.processed).toBe(recordCount)
      expect(migrationResult.migrated).toBe(recordCount)
      expect(migrationResult.errors).toBe(0)

      // Verify performance requirement (target: <10 seconds per 1K records)
      // For 10 records, should be much faster
      expect(migrationTime).toBeLessThan(5000) // 5 seconds for 10 records

      console.log(`Migration of ${recordCount} records took ${migrationTime}ms`)
    })
  })
})
