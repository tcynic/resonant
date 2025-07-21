/**
 * AI Analysis Functions for Convex Backend
 * Handles queue-based processing of journal entries for sentiment analysis
 */

import { v } from 'convex/values'
import {
  mutation,
  query,
  action,
  MutationCtx,
  QueryCtx,
  ActionCtx,
} from './_generated/server'
import { Id } from './_generated/dataModel'
import {
  AnalysisType,
  AIAnalysisResults,
  AIAnalysisMetadata,
} from '../src/lib/types'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: parseInt(process.env.AI_ANALYSIS_RATE_LIMIT || '60'),
  batchSize: parseInt(process.env.AI_ANALYSIS_BATCH_SIZE || '10'),
  retryAttempts: 3,
  retryDelayMs: 1000,
}

// Analysis queue status
export type AnalysisQueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'

// Create AI analysis record
export const createAnalysis = mutation({
  args: {
    journalEntryId: v.id('journalEntries'),
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    analysisType: v.union(
      v.literal('sentiment'),
      v.literal('emotional_stability'),
      v.literal('energy_impact'),
      v.literal('conflict_resolution'),
      v.literal('gratitude')
    ),
    analysisResults: v.object({
      sentimentScore: v.optional(v.number()),
      emotions: v.optional(v.array(v.string())),
      confidence: v.number(),
      rawResponse: v.string(),
      stabilityScore: v.optional(v.number()),
      energyScore: v.optional(v.number()),
      resolutionScore: v.optional(v.number()),
      gratitudeScore: v.optional(v.number()),
      additionalData: v.optional(v.record(v.string(), v.string())),
    }),
    metadata: v.object({
      modelVersion: v.string(),
      processingTime: v.number(),
      tokenCount: v.optional(v.number()),
      apiCosts: v.optional(v.number()),
    }),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      journalEntryId: Id<'journalEntries'>
      relationshipId: Id<'relationships'>
      userId: Id<'users'>
      analysisType:
        | 'sentiment'
        | 'emotional_stability'
        | 'energy_impact'
        | 'conflict_resolution'
        | 'gratitude'
      analysisResults: {
        sentimentScore?: number
        emotions?: string[]
        confidence: number
        rawResponse: string
        stabilityScore?: number
        energyScore?: number
        resolutionScore?: number
        gratitudeScore?: number
        additionalData?: Record<string, any>
      }
      metadata: {
        modelVersion: string
        processingTime: number
        tokenCount?: number
        apiCosts?: number
      }
    }
  ) => {
    const now = Date.now()

    return await ctx.db.insert('aiAnalysis', {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Get analysis by journal entry
export const getAnalysisByJournalEntry = query({
  args: {
    journalEntryId: v.id('journalEntries'),
    analysisType: v.optional(
      v.union(
        v.literal('sentiment'),
        v.literal('emotional_stability'),
        v.literal('energy_impact'),
        v.literal('conflict_resolution'),
        v.literal('gratitude')
      )
    ),
  },
  handler: async (
    ctx: QueryCtx,
    args: {
      journalEntryId: Id<'journalEntries'>
      analysisType?:
        | 'sentiment'
        | 'emotional_stability'
        | 'energy_impact'
        | 'conflict_resolution'
        | 'gratitude'
    }
  ) => {
    if (args.analysisType) {
      return await ctx.db
        .query('aiAnalysis')
        .withIndex('by_journal_entry', (q: any) =>
          q.eq('journalEntryId', args.journalEntryId)
        )
        .filter((q: any) => q.eq(q.field('analysisType'), args.analysisType))
        .first()
    }

    return await ctx.db
      .query('aiAnalysis')
      .withIndex('by_journal_entry', (q: any) =>
        q.eq('journalEntryId', args.journalEntryId)
      )
      .collect()
  },
})

// Get analyses by user and type
export const getAnalysesByUser = query({
  args: {
    userId: v.id('users'),
    analysisType: v.optional(
      v.union(
        v.literal('sentiment'),
        v.literal('emotional_stability'),
        v.literal('energy_impact'),
        v.literal('conflict_resolution'),
        v.literal('gratitude')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>
      analysisType?:
        | 'sentiment'
        | 'emotional_stability'
        | 'energy_impact'
        | 'conflict_resolution'
        | 'gratitude'
      limit?: number
    }
  ) => {
    let query = ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))

    if (args.analysisType) {
      query = query.filter((q: any) =>
        q.eq(q.field('analysisType'), args.analysisType)
      )
    }

    const results = await query.order('desc').take(args.limit || 50)

    return results
  },
})

// Get recent sentiment trends for relationship
export const getSentimentTrends = query({
  args: {
    relationshipId: v.id('relationships'),
    days: v.optional(v.number()),
  },
  handler: async (
    ctx: QueryCtx,
    args: { relationshipId: Id<'relationships'>; days?: number }
  ) => {
    const daysBack = args.days || 30
    const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000

    const analyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_relationship', (q: any) =>
        q.eq('relationshipId', args.relationshipId)
      )
      .filter((q: any) =>
        q.and(
          q.eq(q.field('analysisType'), 'sentiment'),
          q.gte(q.field('createdAt'), cutoffTime)
        )
      )
      .order('desc')
      .collect()

    return analyses.map(analysis => ({
      sentimentScore: analysis.analysisResults.sentimentScore || 0,
      confidence: analysis.analysisResults.confidence,
      timestamp: analysis.createdAt,
      emotions: analysis.analysisResults.emotions || [],
    }))
  },
})

// Analysis queue management
export const queueAnalysisForJournalEntry = mutation({
  args: {
    journalEntryId: v.id('journalEntries'),
    analysisTypes: v.array(
      v.union(
        v.literal('sentiment'),
        v.literal('emotional_stability'),
        v.literal('energy_impact'),
        v.literal('conflict_resolution'),
        v.literal('gratitude')
      )
    ),
    priority: v.optional(
      v.union(v.literal('high'), v.literal('normal'), v.literal('low'))
    ),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      journalEntryId: Id<'journalEntries'>
      analysisTypes: (
        | 'sentiment'
        | 'emotional_stability'
        | 'energy_impact'
        | 'conflict_resolution'
        | 'gratitude'
      )[]
      priority?: 'high' | 'normal' | 'low'
    }
  ) => {
    // Get journal entry details
    const journalEntry = await ctx.db.get(args.journalEntryId)
    if (!journalEntry) {
      throw new Error('Journal entry not found')
    }

    // Check if analyses already exist
    const existingAnalyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_journal_entry', (q: any) =>
        q.eq('journalEntryId', args.journalEntryId)
      )
      .collect()

    const existingTypes = new Set(existingAnalyses.map(a => a.analysisType))
    const newAnalysisTypes = args.analysisTypes.filter(
      type => !existingTypes.has(type)
    )

    if (newAnalysisTypes.length === 0) {
      return { message: 'All requested analyses already exist', queuedCount: 0 }
    }

    // Schedule analysis action for new types
    const scheduledId = await ctx.scheduler.runAfter(
      0,
      'aiAnalysis:processAnalysisQueue' as any,
      {
        journalEntryId: args.journalEntryId,
        relationshipId: journalEntry.relationshipId,
        userId: journalEntry.userId,
        analysisTypes: newAnalysisTypes,
        priority: args.priority || 'normal',
      }
    )

    return {
      message: `Queued ${newAnalysisTypes.length} analysis types`,
      queuedCount: newAnalysisTypes.length,
      scheduledId,
      analysisTypes: newAnalysisTypes,
    }
  },
})

// Process analysis queue (Convex action for external API calls)
export const processAnalysisQueue = action({
  args: {
    journalEntryId: v.id('journalEntries'),
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    analysisTypes: v.array(
      v.union(
        v.literal('sentiment'),
        v.literal('emotional_stability'),
        v.literal('energy_impact'),
        v.literal('conflict_resolution'),
        v.literal('gratitude')
      )
    ),
    priority: v.optional(v.string()),
    retryAttempt: v.optional(v.number()),
  },
  handler: async (
    ctx: ActionCtx,
    args: {
      journalEntryId: Id<'journalEntries'>
      relationshipId: Id<'relationships'>
      userId: Id<'users'>
      analysisTypes: (
        | 'sentiment'
        | 'emotional_stability'
        | 'energy_impact'
        | 'conflict_resolution'
        | 'gratitude'
      )[]
      priority?: string
      retryAttempt?: number
    }
  ) => {
    const { GeminiClient } = await import('../src/lib/ai/gemini-client')
    const { RelationshipAnalyzer } = await import('../src/lib/ai/analysis')

    try {
      // Get journal entry content
      const journalEntry = await ctx.runQuery('journalEntries:getById' as any, {
        id: args.journalEntryId,
      })

      if (!journalEntry) {
        throw new Error('Journal entry not found')
      }

      // Initialize AI analyzer
      const geminiClient = new GeminiClient()
      const analyzer = new RelationshipAnalyzer(geminiClient)

      // Process each analysis type
      const results = []

      for (const analysisType of args.analysisTypes) {
        try {
          let analysisResult: unknown
          const startTime = Date.now()

          switch (analysisType) {
            case 'sentiment':
              analysisResult = await analyzer.analyzeSentiment(
                journalEntry.content
              )
              break
            case 'emotional_stability':
              // Get recent sentiment history for stability analysis
              const sentimentHistory = await ctx.runQuery(
                'aiAnalysis:getSentimentTrends' as any,
                {
                  relationshipId: args.relationshipId,
                  days: 30,
                }
              )
              analysisResult =
                await analyzer.analyzeEmotionalStability(sentimentHistory)
              break
            case 'energy_impact':
              analysisResult = await analyzer.analyzeEnergyImpact(
                journalEntry.content
              )
              break
            default:
              // For conflict_resolution and gratitude, use sentiment analysis as base
              analysisResult = await analyzer.analyzeSentiment(
                journalEntry.content
              )
              break
          }

          const processingTime = Date.now() - startTime

          // Create analysis record
          const analysisId = await ctx.runMutation(
            'aiAnalysis:createAnalysis' as any,
            {
              journalEntryId: args.journalEntryId,
              relationshipId: args.relationshipId,
              userId: args.userId,
              analysisType,
              analysisResults: {
                sentimentScore:
                  (analysisResult as any).sentiment_score ||
                  (analysisResult as any).sentimentScore,
                emotions:
                  (analysisResult as any).emotions_detected ||
                  (analysisResult as any).emotions ||
                  [],
                confidence: (analysisResult as any).confidence,
                rawResponse: JSON.stringify(analysisResult),
                stabilityScore: (analysisResult as any).stability_score,
                energyScore: (analysisResult as any).energy_impact_score,
                resolutionScore: (analysisResult as any).resolution_score,
                gratitudeScore: (analysisResult as any).gratitude_score,
              },
              metadata: {
                modelVersion: 'gemini-1.5-flash',
                processingTime,
                tokenCount: (analysisResult as any).usage?.totalTokenCount,
                apiCosts: (analysisResult as any).usage?.estimatedCost,
              },
            }
          )

          results.push({
            analysisType,
            analysisId,
            success: true,
            processingTime,
          })

          // Rate limiting delay between requests
          if (
            args.analysisTypes.indexOf(analysisType) <
            args.analysisTypes.length - 1
          ) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error(`Analysis failed for type ${analysisType}:`, error)

          results.push({
            analysisType,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryAttempt: args.retryAttempt || 0,
          })

          // Schedule retry for failed analysis if under retry limit
          const retryAttempt = (args.retryAttempt || 0) + 1
          if (retryAttempt <= RATE_LIMIT_CONFIG.retryAttempts) {
            const retryDelay =
              RATE_LIMIT_CONFIG.retryDelayMs * Math.pow(2, retryAttempt - 1)

            await ctx.scheduler.runAfter(
              retryDelay,
              'aiAnalysis:processAnalysisQueue' as any,
              {
                ...args,
                analysisTypes: [analysisType],
                retryAttempt,
              }
            )
          }
        }
      }

      return {
        success: true,
        processedCount: results.filter(r => r.success).length,
        failedCount: results.filter(r => !r.success).length,
        results,
      }
    } catch (error) {
      console.error('Analysis queue processing failed:', error)

      // Schedule retry for entire batch if under retry limit
      const retryAttempt = (args.retryAttempt || 0) + 1
      if (retryAttempt <= RATE_LIMIT_CONFIG.retryAttempts) {
        const retryDelay =
          RATE_LIMIT_CONFIG.retryDelayMs * Math.pow(2, retryAttempt - 1)

        await ctx.scheduler.runAfter(
          retryDelay,
          'aiAnalysis:processAnalysisQueue' as any,
          {
            ...args,
            retryAttempt,
          }
        )
      }

      throw new Error(
        `Analysis processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  },
})

// Batch analysis for multiple journal entries
export const queueBatchAnalysis = mutation({
  args: {
    journalEntryIds: v.array(v.id('journalEntries')),
    analysisTypes: v.array(
      v.union(
        v.literal('sentiment'),
        v.literal('emotional_stability'),
        v.literal('energy_impact'),
        v.literal('conflict_resolution'),
        v.literal('gratitude')
      )
    ),
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      journalEntryIds: Id<'journalEntries'>[]
      analysisTypes: (
        | 'sentiment'
        | 'emotional_stability'
        | 'energy_impact'
        | 'conflict_resolution'
        | 'gratitude'
      )[]
      batchSize?: number
    }
  ) => {
    const batchSize = args.batchSize || RATE_LIMIT_CONFIG.batchSize
    const batches = []

    // Split into batches
    for (let i = 0; i < args.journalEntryIds.length; i += batchSize) {
      const batch = args.journalEntryIds.slice(i, i + batchSize)
      batches.push(batch)
    }

    // Schedule each batch with staggered timing to respect rate limits
    const scheduledIds = []
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const delay = i * 60000 // 1 minute delay between batches

      for (const journalEntryId of batch) {
        const scheduledId = await ctx.scheduler.runAfter(
          delay,
          'aiAnalysis:queueAnalysisForJournalEntry' as any,
          {
            journalEntryId,
            analysisTypes: args.analysisTypes,
            priority: 'normal',
          }
        )
        scheduledIds.push(scheduledId)
      }
    }

    return {
      message: `Queued ${args.journalEntryIds.length} entries in ${batches.length} batches`,
      batchCount: batches.length,
      totalEntries: args.journalEntryIds.length,
      scheduledIds,
    }
  },
})

// Get analysis statistics
export const getAnalysisStats = query({
  args: {
    userId: v.id('users'),
    timeRange: v.optional(
      v.union(v.literal('7d'), v.literal('30d'), v.literal('90d'))
    ),
  },
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'>; timeRange?: '7d' | '30d' | '90d' }
  ) => {
    const timeRange = args.timeRange || '30d'
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

    const analyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .filter((q: any) => q.gte(q.field('createdAt'), cutoffTime))
      .collect()

    const stats = {
      totalAnalyses: analyses.length,
      byType: {} as Record<string, number>,
      averageConfidence: 0,
      totalProcessingTime: 0,
      totalTokens: 0,
      totalCosts: 0,
    }

    let confidenceSum = 0
    let confidenceCount = 0

    for (const analysis of analyses) {
      // Count by type
      stats.byType[analysis.analysisType] =
        (stats.byType[analysis.analysisType] || 0) + 1

      // Aggregate metrics
      if (analysis.analysisResults.confidence) {
        confidenceSum += analysis.analysisResults.confidence
        confidenceCount++
      }

      stats.totalProcessingTime += analysis.metadata.processingTime
      stats.totalTokens += analysis.metadata.tokenCount || 0
      stats.totalCosts += analysis.metadata.apiCosts || 0
    }

    stats.averageConfidence =
      confidenceCount > 0 ? confidenceSum / confidenceCount : 0

    return stats
  },
})
