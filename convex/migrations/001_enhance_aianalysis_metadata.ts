/**
 * Migration 001: Enhance aiAnalysis table with additional metadata fields
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * This migration populates new optional metadata fields for existing aiAnalysis records
 * based on available data and reasonable defaults.
 */

import { mutation } from '../_generated/server'
import { ConvexError } from 'convex/values'

/**
 * Migrate existing aiAnalysis records to include enhanced metadata
 * This is a safe migration that only adds optional fields
 */
export const migrateAiAnalysisMetadata = mutation({
  args: {},
  handler: async ctx => {
    console.log('Starting aiAnalysis metadata enhancement migration...')

    let migratedCount = 0
    let errorCount = 0
    const batchSize = 100

    try {
      // Get all aiAnalysis records in batches
      const allRecords = await ctx.db.query('aiAnalysis').collect()
      console.log(`Found ${allRecords.length} aiAnalysis records to migrate`)

      // Process in batches to avoid timeout
      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize)

        for (const record of batch) {
          try {
            // Determine model type from existing data
            let modelType = 'unknown'
            if (record.analysisVersion) {
              if (
                record.analysisVersion.includes('gemini') ||
                record.analysisVersion.includes('2.5')
              ) {
                modelType = 'gemini_2_5_flash_lite'
              } else if (record.analysisVersion.includes('gpt')) {
                modelType = 'gpt_4'
              }
            }

            // Calculate request/response tokens from existing tokensUsed if available
            let requestTokens: number | undefined
            let responseTokens: number | undefined
            if (record.tokensUsed && record.tokensUsed > 0) {
              // Estimate 70% request, 30% response based on typical patterns
              requestTokens = Math.floor(record.tokensUsed * 0.7)
              responseTokens = Math.floor(record.tokensUsed * 0.3)
            }

            // Determine region based on existing data patterns
            let regionProcessed = 'us-central1' // Default region
            if (record.httpActionId && record.httpActionId.includes('eu')) {
              regionProcessed = 'europe-west1'
            }

            // Update record with new fields (only if they don't already exist)
            const updateData: any = {}

            if (!record.modelType) {
              updateData.modelType = modelType
            }

            if (!record.modelVersion && record.analysisVersion) {
              updateData.modelVersion = record.analysisVersion
            }

            if (!record.requestTokens && requestTokens) {
              updateData.requestTokens = requestTokens
            }

            if (!record.responseTokens && responseTokens) {
              updateData.responseTokens = responseTokens
            }

            if (!record.cachingUsed) {
              // Assume no caching for older records
              updateData.cachingUsed = false
            }

            if (!record.batchProcessed) {
              // Assume individual processing for older records
              updateData.batchProcessed = false
            }

            if (!record.regionProcessed) {
              updateData.regionProcessed = regionProcessed
            }

            // Only update if there are changes
            if (Object.keys(updateData).length > 0) {
              await ctx.db.patch(record._id, updateData)
              migratedCount++
            }
          } catch (error) {
            console.error(`Error migrating record ${record._id}:`, error)
            errorCount++
          }
        }

        // Log progress
        console.log(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allRecords.length / batchSize)}`
        )
      }

      console.log(
        `Migration completed. Updated ${migratedCount} records, ${errorCount} errors`
      )

      return {
        success: true,
        migratedCount,
        errorCount,
        totalRecords: allRecords.length,
      }
    } catch (error) {
      console.error('Migration failed:', error)
      throw new ConvexError(`Migration failed: ${error}`)
    }
  },
})

/**
 * Rollback migration - removes the new fields from all records
 * WARNING: This will permanently delete the migrated data
 */
export const rollbackAiAnalysisMetadata = mutation({
  args: {},
  handler: async ctx => {
    console.log('Starting rollback of aiAnalysis metadata enhancement...')

    let rollbackCount = 0
    const batchSize = 100

    try {
      const allRecords = await ctx.db.query('aiAnalysis').collect()
      console.log(`Found ${allRecords.length} records to rollback`)

      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize)

        for (const record of batch) {
          const updateData: any = {}

          // Remove new fields by setting them to undefined
          if (record.modelType) updateData.modelType = undefined
          if (record.modelVersion) updateData.modelVersion = undefined
          if (record.requestTokens) updateData.requestTokens = undefined
          if (record.responseTokens) updateData.responseTokens = undefined
          if (record.cachingUsed !== undefined)
            updateData.cachingUsed = undefined
          if (record.batchProcessed !== undefined)
            updateData.batchProcessed = undefined
          if (record.regionProcessed) updateData.regionProcessed = undefined

          if (Object.keys(updateData).length > 0) {
            await ctx.db.patch(record._id, updateData)
            rollbackCount++
          }
        }

        console.log(
          `Rolled back batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allRecords.length / batchSize)}`
        )
      }

      console.log(`Rollback completed. Updated ${rollbackCount} records`)

      return {
        success: true,
        rollbackCount,
        totalRecords: allRecords.length,
      }
    } catch (error) {
      console.error('Rollback failed:', error)
      throw new ConvexError(`Rollback failed: ${error}`)
    }
  },
})

/**
 * Validation function to check migration status
 */
export const validateMigration = mutation({
  args: {},
  handler: async ctx => {
    try {
      const allRecords = await ctx.db.query('aiAnalysis').collect()
      let migratedCount = 0
      let unmigrated = 0

      for (const record of allRecords) {
        if (
          record.modelType ||
          record.requestTokens ||
          record.regionProcessed
        ) {
          migratedCount++
        } else {
          unmigrated++
        }
      }

      return {
        totalRecords: allRecords.length,
        migratedRecords: migratedCount,
        unmigratedRecords: unmigrated,
        migrationComplete: unmigrated === 0,
      }
    } catch (error) {
      throw new ConvexError(`Validation failed: ${error}`)
    }
  },
})
