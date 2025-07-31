import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

// Legacy system migration & cleanup - Data Migration
export const legacyCleanupMigration = mutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const results = {
      processed: 0,
      migrated: 0,
      errors: 0,
      skipped: 0,
      errorMessages: [] as string[],
    }

    try {
      // Get all aiAnalysis records that need migration
      const analysisRecords = await ctx.db.query('aiAnalysis').collect()

      console.log(
        `Found ${analysisRecords.length} aiAnalysis records to process`
      )

      for (const record of analysisRecords) {
        results.processed++

        try {
          // Check if already migrated (has new format fields)
          if (record.modelType && record.circuitBreakerState) {
            results.skipped++
            continue
          }

          // Convert legacy status to new format
          const convertLegacyStatus = (status: string): 'processing' | 'completed' | 'failed' => {
            switch (status) {
              case 'completed':
                return 'completed'
              case 'failed':
                return 'failed'
              case 'processing':
                return 'processing'
              default:
                return 'completed' // Default for legacy records
            }
          }

          // Prepare migration data
          const migrationData = {
            // Enhanced Processing Metadata (Story AI-Migration.5)
            modelType: record.analysisVersion?.includes('gemini')
              ? 'gemini_2_5_flash_lite'
              : 'unknown',
            modelVersion: record.analysisVersion || 'legacy',
            requestTokens: Math.floor((record.tokensUsed || 0) * 0.7), // Estimate input tokens (70% of total)
            responseTokens: Math.floor((record.tokensUsed || 0) * 0.3), // Estimate output tokens (30% of total)
            cachingUsed: false, // Legacy records didn't use caching
            batchProcessed: false, // Legacy records weren't batch processed
            regionProcessed: 'us-central', // Default region for legacy records

            // Queue Management Fields (migrate from processing metadata)
            priority: 'normal' as const, // Default priority for legacy records
            queuedAt: record.createdAt, // Use createdAt as queue time
            processingStartedAt: record.createdAt + 1000, // Estimate processing start (1s after queue)
            estimatedCompletionTime:
              record.createdAt + (record.processingTime || 30000), // Estimate completion
            queuePosition: 0, // Legacy records completed, so position is 0
            queueWaitTime: 1000, // Estimate 1 second wait time
            totalProcessingTime: record.processingTime || 30000, // Use existing or default

            // Dead Letter Queue Management (legacy records weren't in DLQ)
            deadLetterQueue: false,
            deadLetterReason: undefined,
            deadLetterTimestamp: undefined,
            deadLetterCategory: undefined,
            deadLetterMetadata: undefined,

            // Circuit Breaker Integration (Story AI-Migration.4)
            circuitBreakerState: {
              service: record.analysisVersion?.includes('gemini')
                ? 'gemini_2_5_flash_lite'
                : 'unknown',
              state: 'closed' as const, // Legacy successful records had closed circuit breaker
              failureCount: 0, // Successful records had no failures
              lastReset: record.createdAt,
            },

            // Enhanced Error Classification (legacy records may not have this)
            lastErrorType: record.lastErrorMessage
              ? ('service_error' as const)
              : undefined,

            // Retry History (reconstruct from processingAttempts)
            retryHistory:
              record.processingAttempts && record.processingAttempts > 1
                ? Array.from(
                    { length: record.processingAttempts - 1 },
                    (_, i) => ({
                      attempt: i + 1,
                      timestamp: record.createdAt + i * 5000, // Estimate retry intervals
                      delayMs: Math.pow(2, i) * 1000, // Exponential backoff pattern
                      errorType: 'unknown',
                      errorMessage: 'Legacy retry attempt',
                      circuitBreakerState: 'closed',
                    })
                  )
                : undefined,

            // Fallback Analysis Results (legacy records didn't use fallback)
            fallbackUsed: false,
            fallbackConfidence: undefined,
            fallbackMethod: undefined,
            fallbackMetadata: undefined,

            // Recovery and Upgrade Tracking (legacy records don't need recovery)
            recoveryAttempted: false,
            upgradedFromFallback: false,
            originalFallbackId: undefined,
            recoveryTimestamp: undefined,

            // Fallback Upgrade Management (not applicable to legacy)
            upgradeInProgress: false,
            upgradeRequestedAt: undefined,
            upgradeReason: undefined,
            comparisonId: undefined,
            aiComparisonAvailable: false,
            upgradeRecommendation: undefined,

            // Enhanced Error Context
            errorContext: record.lastErrorMessage
              ? {
                  httpActionId: record.httpActionId,
                  requestId: `legacy_${record._id}`,
                  serviceEndpoint: record.analysisVersion?.includes('gemini')
                    ? 'gemini_api'
                    : 'unknown',
                  totalRetryTime:
                    record.processingAttempts && record.processingAttempts > 1
                      ? (record.processingAttempts - 1) * 5000
                      : undefined,
                  finalAttemptDelay: undefined,
                  escalationPath: undefined,
                }
              : undefined,

            // Ensure status is properly converted
            status: convertLegacyStatus(record.status),
          }

          if (dryRun) {
            console.log(`[DRY RUN] Would migrate record ${record._id}`)
            results.migrated++
          } else {
            // Apply the migration
            await ctx.db.patch(record._id, migrationData)
            console.log(`Migrated record ${record._id}`)
            results.migrated++
          }
        } catch (error) {
          results.errors++
          const errorMsg = `Error migrating record ${record._id}: ${error}`
          results.errorMessages.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // Log migration summary
      console.log('\n=== Migration Summary ===')
      console.log(`Processed: ${results.processed}`)
      console.log(`Migrated: ${results.migrated}`)
      console.log(`Skipped (already migrated): ${results.skipped}`)
      console.log(`Errors: ${results.errors}`)

      if (results.errors > 0) {
        console.log('\nError details:')
        results.errorMessages.forEach(msg => console.log(`  - ${msg}`))
      }

      console.log(
        dryRun
          ? '\n[DRY RUN] No actual changes made'
          : '\n✅ Migration completed successfully'
      )

      return results
    } catch (error) {
      console.error('Fatal migration error:', error)
      throw error
    }
  },
})

// Validation function to check migration integrity
export const validateMigration = mutation({
  args: {},
  handler: async ctx => {
    const validation = {
      totalRecords: 0,
      migratedRecords: 0,
      unmigrated: 0,
      integrity: true,
      issues: [] as string[],
    }

    try {
      const allRecords = await ctx.db.query('aiAnalysis').collect()
      validation.totalRecords = allRecords.length

      for (const record of allRecords) {
        // Check if record has new format fields
        if (record.modelType && record.circuitBreakerState) {
          validation.migratedRecords++

          // Validate required fields are present
          if (
            !record.modelType ||
            !record.queuedAt ||
            !record.circuitBreakerState
          ) {
            validation.integrity = false
            validation.issues.push(
              `Record ${record._id} missing required migrated fields`
            )
          }
        } else {
          validation.unmigrated++
        }
      }

      console.log('\n=== Migration Validation ===')
      console.log(`Total records: ${validation.totalRecords}`)
      console.log(`Migrated records: ${validation.migratedRecords}`)
      console.log(`Unmigrated records: ${validation.unmigrated}`)
      console.log(
        `Integrity check: ${validation.integrity ? '✅ PASSED' : '❌ FAILED'}`
      )

      if (validation.issues.length > 0) {
        console.log('\nIntegrity issues found:')
        validation.issues.forEach(issue => console.log(`  - ${issue}`))
      }

      return validation
    } catch (error) {
      console.error('Validation error:', error)
      validation.integrity = false
      validation.issues.push(`Validation failed: ${error}`)
      return validation
    }
  },
})

// Rollback function for emergency situations
export const rollbackMigration = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun = true }) => {
    const rollback = {
      processed: 0,
      rolledBack: 0,
      errors: 0,
      errorMessages: [] as string[],
    }

    try {
      // Get all migrated records (have new format fields)
      const migratedRecords = await ctx.db
        .query('aiAnalysis')
        .filter(q => q.neq(q.field('modelType'), undefined))
        .collect()

      console.log(
        `Found ${migratedRecords.length} migrated records to rollback`
      )

      for (const record of migratedRecords) {
        rollback.processed++

        try {
          // Remove new fields added in migration
          const rollbackFields = {
            modelType: undefined,
            modelVersion: undefined,
            requestTokens: undefined,
            responseTokens: undefined,
            cachingUsed: undefined,
            batchProcessed: undefined,
            regionProcessed: undefined,
            priority: undefined,
            queuedAt: undefined,
            processingStartedAt: undefined,
            estimatedCompletionTime: undefined,
            queuePosition: undefined,
            queueWaitTime: undefined,
            totalProcessingTime: undefined,
            deadLetterQueue: undefined,
            deadLetterReason: undefined,
            deadLetterTimestamp: undefined,
            deadLetterCategory: undefined,
            deadLetterMetadata: undefined,
            circuitBreakerState: undefined,
            lastErrorType: undefined,
            retryHistory: undefined,
            fallbackUsed: undefined,
            fallbackConfidence: undefined,
            fallbackMethod: undefined,
            fallbackMetadata: undefined,
            recoveryAttempted: undefined,
            upgradedFromFallback: undefined,
            originalFallbackId: undefined,
            recoveryTimestamp: undefined,
            upgradeInProgress: undefined,
            upgradeRequestedAt: undefined,
            upgradeReason: undefined,
            comparisonId: undefined,
            aiComparisonAvailable: undefined,
            upgradeRecommendation: undefined,
            errorContext: undefined,
          }

          if (dryRun) {
            console.log(`[DRY RUN] Would rollback record ${record._id}`)
            rollback.rolledBack++
          } else {
            await ctx.db.patch(record._id, rollbackFields)
            console.log(`Rolled back record ${record._id}`)
            rollback.rolledBack++
          }
        } catch (error) {
          rollback.errors++
          const errorMsg = `Error rolling back record ${record._id}: ${error}`
          rollback.errorMessages.push(errorMsg)
          console.error(errorMsg)
        }
      }

      console.log('\n=== Rollback Summary ===')
      console.log(`Processed: ${rollback.processed}`)
      console.log(`Rolled back: ${rollback.rolledBack}`)
      console.log(`Errors: ${rollback.errors}`)

      if (rollback.errors > 0) {
        console.log('\nRollback error details:')
        rollback.errorMessages.forEach(msg => console.log(`  - ${msg}`))
      }

      console.log(
        dryRun
          ? '\n[DRY RUN] No actual changes made'
          : '\n✅ Rollback completed'
      )

      return rollback
    } catch (error) {
      console.error('Fatal rollback error:', error)
      throw error
    }
  },
})

// Test function to verify migration data structure
export const testMigratedData = query({
  args: {},
  handler: async ctx => {
    // Get 3 sample records to verify structure
    const sampleRecords = await ctx.db.query('aiAnalysis').take(3)

    const testResults = {
      sampleCount: sampleRecords.length,
      samples: sampleRecords.map(record => ({
        id: record._id,
        hasModelType: !!record.modelType,
        hasCircuitBreaker: !!record.circuitBreakerState,
        hasQueuedAt: !!record.queuedAt,
        hasPriority: !!record.priority,
        hasRetryHistory: !!record.retryHistory,
        modelType: record.modelType,
        status: record.status,
        originalFields: {
          analysisVersion: record.analysisVersion,
          tokensUsed: record.tokensUsed,
          processingTime: record.processingTime,
        },
        enhancedFields: {
          requestTokens: record.requestTokens,
          responseTokens: record.responseTokens,
          queueWaitTime: record.queueWaitTime,
          circuitBreakerState: record.circuitBreakerState?.service,
        },
      })),
    }

    return testResults
  },
})

// Default export for test compatibility
export default legacyCleanupMigration
