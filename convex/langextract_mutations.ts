/**
 * LangExtract Internal Mutations
 *
 * This file contains internal mutations for LangExtract processing metrics
 * without the "use node" directive since mutations run in the standard Convex runtime.
 */

import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

/**
 * Internal mutation to record LangExtract processing metrics
 */
export const recordProcessingMetrics = internalMutation({
  args: {
    userId: v.string(),
    entryId: v.string(),
    result: v.object({
      structuredData: v.object({
        emotions: v.array(
          v.object({
            text: v.string(),
            type: v.string(),
            intensity: v.optional(v.string()),
          })
        ),
        themes: v.array(
          v.object({
            text: v.string(),
            category: v.string(),
            context: v.optional(v.string()),
          })
        ),
        triggers: v.array(
          v.object({
            text: v.string(),
            type: v.string(),
            severity: v.optional(v.string()),
          })
        ),
        communication: v.array(
          v.object({
            text: v.string(),
            style: v.string(),
            tone: v.optional(v.string()),
          })
        ),
        relationships: v.array(
          v.object({
            text: v.string(),
            type: v.string(),
            dynamic: v.optional(v.string()),
          })
        ),
      }),
      extractedEntities: v.array(v.string()),
      processingSuccess: v.boolean(),
      errorMessage: v.optional(v.string()),
    }),
    processingTimeMs: v.number(),
    fallbackUsed: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      // Calculate structured data counts
      const structuredDataSize = {
        emotions: args.result.structuredData.emotions.length,
        themes: args.result.structuredData.themes.length,
        triggers: args.result.structuredData.triggers.length,
        communication: args.result.structuredData.communication.length,
        relationships: args.result.structuredData.relationships.length,
      }

      // Record metrics using the monitoring function
      await ctx.runMutation(
        (internal as any)['monitoring/langextract_metrics']
          .recordLangExtractMetrics,
        {
          userId: args.userId,
          entryId: args.entryId,
          processingTimeMs: args.processingTimeMs,
          success: args.result.processingSuccess,
          errorMessage: args.result.errorMessage,
          extractedEntitiesCount: args.result.extractedEntities.length,
          structuredDataSize,
          langExtractVersion: 'v1.0',
          fallbackUsed: args.fallbackUsed,
        }
      )
    } catch (error) {
      console.error('Failed to record LangExtract metrics:', error)
      // Don't throw - metrics recording should not fail the main process
    }
  },
})
