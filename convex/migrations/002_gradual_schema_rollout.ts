/**
 * Migration 002: Gradual Schema Rollout and Validation
 * Story: AI-Migration.5 - Enhanced Database Schema
 *
 * This migration implements feature flags and dual-write strategies
 * to safely roll out new schema fields and monitoring tables.
 */

import { mutation, query } from '../_generated/server'
import { v } from 'convex/values'
import { ConvexError } from 'convex/values'
import {
  validateAiAnalysisMetadata,
  validateSystemLog,
  validateApiUsage,
  validatePerformanceMetric,
  validateAuditTrail,
  createTimeWindow,
  generateCorrelationId,
} from '../utils/schema_helpers'

/**
 * Feature flags for gradual rollout
 */
interface SchemaFeatureFlags {
  enhancedAiAnalysis: boolean
  systemLogging: boolean
  apiUsageTracking: boolean
  performanceMetrics: boolean
  auditTrail: boolean
}

/**
 * Get current feature flags for schema rollout
 */
export const getSchemaFeatureFlags = query({
  args: {},
  handler: async (ctx): Promise<SchemaFeatureFlags> => {
    try {
      // Check if we have feature flags stored
      const flags = await ctx.db.query('userFeatureFlags').first()

      // Default flags for gradual rollout
      return {
        enhancedAiAnalysis: flags?.flags?.advancedAnalytics ?? false,
        systemLogging: true, // Always enabled for monitoring
        apiUsageTracking: flags?.flags?.advancedAnalytics ?? false,
        performanceMetrics: true, // Always enabled for monitoring
        auditTrail: flags?.flags?.advancedAnalytics ?? false,
      }
    } catch (error) {
      console.error('Failed to get feature flags:', error)
      // Safe defaults - only enable monitoring
      return {
        enhancedAiAnalysis: false,
        systemLogging: true,
        apiUsageTracking: false,
        performanceMetrics: true,
        auditTrail: false,
      }
    }
  },
})

/**
 * Update feature flags for schema rollout
 */
export const updateSchemaFeatureFlags = mutation({
  args: {
    flags: v.object({
      enhancedAiAnalysis: v.boolean(),
      systemLogging: v.boolean(),
      apiUsageTracking: v.boolean(),
      performanceMetrics: v.boolean(),
      auditTrail: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    try {
      // This would typically be restricted to admin users
      // For now, we'll allow it for testing

      const existingFlags = await ctx.db.query('userFeatureFlags').first()

      if (existingFlags) {
        await ctx.db.patch(existingFlags._id, {
          flags: {
            ...existingFlags.flags,
            advancedAnalytics: args.flags.enhancedAiAnalysis,
          },
          lastUpdated: Date.now(),
        })
      }

      await ctx.db.insert('systemLogs', {
        level: 'info',
        message: 'Schema feature flags updated',
        service: 'schema_migration',
        timestamp: Date.now(),
        metadata: {
          flags: args.flags,
          correlationId: generateCorrelationId(),
        },
      })

      return { success: true, flags: args.flags }
    } catch (error) {
      throw new ConvexError(`Failed to update feature flags: ${error}`)
    }
  },
})

/**
 * Enhanced AI Analysis creation with dual-write strategy
 */
export const createEnhancedAiAnalysis = mutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
    // Standard fields
    sentimentScore: v.number(),
    emotionalKeywords: v.array(v.string()),
    confidenceLevel: v.number(),
    reasoning: v.string(),
    // Enhanced fields (optional based on feature flags)
    modelType: v.optional(v.string()),
    modelVersion: v.optional(v.string()),
    requestTokens: v.optional(v.number()),
    responseTokens: v.optional(v.number()),
    cachingUsed: v.optional(v.boolean()),
    batchProcessed: v.optional(v.boolean()),
    regionProcessed: v.optional(v.string()),
    // Processing metadata
    tokensUsed: v.optional(v.number()),
    apiCost: v.optional(v.number()),
    processingTime: v.number(),
    analysisVersion: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // @ts-ignore - convex-test library type definition limitation for ctx.runQuery
      const flags = await ctx.runQuery(getSchemaFeatureFlags, {})

      // Validate enhanced fields if feature is enabled
      if (flags.enhancedAiAnalysis) {
        validateAiAnalysisMetadata({
          modelType: args.modelType,
          modelVersion: args.modelVersion,
          requestTokens: args.requestTokens,
          responseTokens: args.responseTokens,
          cachingUsed: args.cachingUsed,
          batchProcessed: args.batchProcessed,
          regionProcessed: args.regionProcessed,
        })
      }

      // Create the analysis record
      const analysisData: any = {
        entryId: args.entryId,
        userId: args.userId,
        relationshipId: args.relationshipId,
        sentimentScore: args.sentimentScore,
        emotionalKeywords: args.emotionalKeywords,
        confidenceLevel: args.confidenceLevel,
        reasoning: args.reasoning,
        tokensUsed: args.tokensUsed,
        apiCost: args.apiCost,
        processingTime: args.processingTime,
        analysisVersion: args.analysisVersion,
        status: 'completed',
        createdAt: Date.now(),
      }

      // Add enhanced fields only if feature flag is enabled
      if (flags.enhancedAiAnalysis) {
        analysisData.modelType = args.modelType
        analysisData.modelVersion = args.modelVersion
        analysisData.requestTokens = args.requestTokens
        analysisData.responseTokens = args.responseTokens
        analysisData.cachingUsed = args.cachingUsed
        analysisData.batchProcessed = args.batchProcessed
        analysisData.regionProcessed = args.regionProcessed
      }

      const analysisId = await ctx.db.insert('aiAnalysis', analysisData)

      // Log the creation if system logging is enabled
      if (flags.systemLogging) {
        await ctx.db.insert('systemLogs', {
          level: 'info',
          message: 'AI analysis created',
          service: 'ai_analysis',
          userId: args.userId,
          timestamp: Date.now(),
          metadata: {
            analysisId,
            entryId: args.entryId,
            enhancedFieldsUsed: flags.enhancedAiAnalysis,
            modelType: args.modelType,
            processingTime: args.processingTime,
          },
        })
      }

      // Track API usage if enabled
      if (flags.apiUsageTracking && args.modelType) {
        const timeWindow = createTimeWindow(Date.now())

        await ctx.db.insert('apiUsage', {
          service: args.modelType,
          endpoint: 'analyze',
          method: 'POST',
          userId: args.userId,
          requestCount: 1,
          tokenUsage: args.tokensUsed || 0,
          cost: args.apiCost || 0,
          timeWindow,
          avgResponseTime: args.processingTime,
          errorCount: 0,
          successCount: 1,
        })
      }

      // Record performance metrics if enabled
      if (flags.performanceMetrics) {
        await ctx.db.insert('performanceMetrics', {
          metricType: 'response_time',
          service: 'ai_analysis',
          value: args.processingTime,
          unit: 'milliseconds',
          timestamp: Date.now(),
          timeWindow: createTimeWindow(Date.now()),
          tags: [args.modelType || 'unknown'],
          metadata: {
            environment: 'production',
            version: args.analysisVersion || 'unknown',
          },
        })
      }

      // Create audit trail if enabled
      if (flags.auditTrail) {
        await ctx.db.insert('auditTrail', {
          entityType: 'aiAnalysis',
          entityId: analysisId,
          action: 'create',
          userId: args.userId,
          timestamp: Date.now(),
          changes: {
            after: {
              entryId: args.entryId,
              sentimentScore: args.sentimentScore,
              modelType: args.modelType,
            },
          },
          metadata: {
            reason: 'AI analysis completion',
            source: 'ai_processing',
            requestId: generateCorrelationId(),
          },
        })
      }

      return {
        analysisId,
        featuresUsed: flags,
        success: true,
      }
    } catch (error) {
      // Log error if system logging is enabled
      // @ts-ignore - convex-test library type definition limitation for ctx.runQuery
      const flags = await ctx.runQuery(getSchemaFeatureFlags, {})
      if (flags.systemLogging) {
        await ctx.db.insert('systemLogs', {
          level: 'error',
          message: `Failed to create AI analysis: ${error}`,
          service: 'ai_analysis',
          userId: args.userId,
          timestamp: Date.now(),
          metadata: {
            entryId: args.entryId,
            error: String(error),
          },
        })
      }

      throw new ConvexError(`Failed to create enhanced AI analysis: ${error}`)
    }
  },
})

/**
 * Validate data consistency across old and new schema fields
 */
export const validateDataConsistency = query({
  args: {
    tableName: v.union(
      v.literal('aiAnalysis'),
      v.literal('systemLogs'),
      v.literal('apiUsage'),
      v.literal('performanceMetrics'),
      v.literal('auditTrail')
    ),
    sampleSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const sampleSize = args.sampleSize || 100
      let inconsistencies: Array<{
        id: string
        issue: string
        severity: 'low' | 'medium' | 'high'
      }> = []
      let records: any[] = []

      if (args.tableName === 'aiAnalysis') {
        records = await ctx.db.query('aiAnalysis').take(sampleSize)

        for (const record of records) {
          // Check token consistency
          if (
            record.tokensUsed &&
            record.requestTokens &&
            record.responseTokens
          ) {
            const calculatedTotal = record.requestTokens + record.responseTokens
            if (
              Math.abs(calculatedTotal - record.tokensUsed) >
              record.tokensUsed * 0.1
            ) {
              // 10% tolerance
              inconsistencies.push({
                id: record._id,
                issue: `Token count mismatch: total=${record.tokensUsed}, calculated=${calculatedTotal}`,
                severity: 'medium',
              })
            }
          }

          // Check model type consistency
          if (record.modelType && record.analysisVersion) {
            const versionMatchesType =
              (record.modelType.includes('gemini') &&
                record.analysisVersion.includes('gemini')) ||
              (record.modelType.includes('gpt') &&
                record.analysisVersion.includes('gpt'))
            if (!versionMatchesType) {
              inconsistencies.push({
                id: record._id,
                issue: `Model type doesn't match analysis version`,
                severity: 'low',
              })
            }
          }

          // Check cost reasonableness
          if (record.apiCost && record.tokensUsed) {
            const costPerToken = record.apiCost / record.tokensUsed
            if (costPerToken > 0.01) {
              // $0.01 per token seems too high
              inconsistencies.push({
                id: record._id,
                issue: `Unusually high cost per token: $${costPerToken.toFixed(4)}`,
                severity: 'high',
              })
            }
          }
        }
      }

      return {
        tableName: args.tableName,
        sampleSize: records?.length || 0,
        inconsistencies,
        consistencyScore:
          inconsistencies.length === 0
            ? 100
            : Math.max(
                0,
                100 - (inconsistencies.length / (records?.length || 1)) * 100
              ),
        summary: {
          total: inconsistencies.length,
          high: inconsistencies.filter(i => i.severity === 'high').length,
          medium: inconsistencies.filter(i => i.severity === 'medium').length,
          low: inconsistencies.filter(i => i.severity === 'low').length,
        },
      }
    } catch (error) {
      throw new ConvexError(`Data consistency validation failed: ${error}`)
    }
  },
})

/**
 * Monitor migration progress and performance
 */
export const getMigrationStatus = query({
  args: {},
  handler: async ctx => {
    try {
      // @ts-ignore - convex-test library type definition limitation for ctx.runQuery
      const flags = await ctx.runQuery(getSchemaFeatureFlags, {})

      // Count records with new fields
      const aiAnalysisRecords = await ctx.db.query('aiAnalysis').collect()
      const enhancedRecords = aiAnalysisRecords.filter(
        r => r.modelType || r.requestTokens || r.regionProcessed
      ).length

      // Get recent system logs
      const recentLogs = await ctx.db
        .query('systemLogs')
        .withIndex('by_timestamp', q =>
          q.gte('timestamp', Date.now() - 24 * 60 * 60 * 1000)
        )
        .collect()

      // Get performance data
      const recentMetrics = await ctx.db
        .query('performanceMetrics')
        .filter(q =>
          q.gte(q.field('timestamp'), Date.now() - 24 * 60 * 60 * 1000)
        )
        .collect()

      return {
        featureFlags: flags,
        migration: {
          totalAiAnalysisRecords: aiAnalysisRecords.length,
          enhancedRecords,
          migrationProgress:
            aiAnalysisRecords.length > 0
              ? Math.round((enhancedRecords / aiAnalysisRecords.length) * 100)
              : 0,
        },
        monitoring: {
          systemLogsLast24h: recentLogs.length,
          performanceMetricsLast24h: recentMetrics.length,
          errorLogsLast24h: recentLogs.filter(l => l.level === 'error').length,
        },
        health: {
          status:
            recentLogs.filter(l => l.level === 'error').length > 10
              ? 'warning'
              : 'healthy',
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return {
        featureFlags: {
          enhancedAiAnalysis: false,
          systemLogging: true,
          apiUsageTracking: false,
          performanceMetrics: true,
          auditTrail: false,
        },
        migration: {
          totalAiAnalysisRecords: 0,
          enhancedRecords: 0,
          migrationProgress: 0,
        },
        monitoring: {
          systemLogsLast24h: 0,
          performanceMetricsLast24h: 0,
          errorLogsLast24h: 0,
        },
        health: {
          status: 'error',
          lastUpdated: Date.now(),
          error: String(error),
        },
      }
    }
  },
})
