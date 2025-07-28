import {
  mutation,
  query,
  internalQuery,
  internalMutation,
  internalAction,
  QueryCtx,
} from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
// NOTE: AI analysis now uses HTTP Actions instead of client-side bridge

// Queue journal entry for AI analysis (Epic 2)
export const queueAnalysis = mutation({
  args: {
    entryId: v.id('journalEntries'),
    priority: v.optional(
      v.union(v.literal('high'), v.literal('normal'), v.literal('low'))
    ),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new Error('Journal entry not found')
    }

    // Check if user has AI analysis enabled (default to true if not set)
    const user = await ctx.db.get(entry.userId)
    if (user?.preferences?.aiAnalysisEnabled === false) {
      return { status: 'skipped', reason: 'AI analysis disabled' }
    }

    // Check if entry allows AI analysis
    if (entry.allowAIAnalysis === false) {
      return { status: 'skipped', reason: 'Entry marked private from AI' }
    }

    // Check if already analyzed
    const existingAnalysis = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_entry', q => q.eq('entryId', args.entryId))
      .unique()

    if (existingAnalysis) {
      return { status: 'skipped', reason: 'Already analyzed' }
    }

    // Create processing record
    const analysisId = await ctx.db.insert('aiAnalysis', {
      entryId: args.entryId,
      userId: entry.userId,
      relationshipId: entry.relationshipId,
      sentimentScore: 0, // Placeholder
      emotionalKeywords: [],
      confidenceLevel: 0,
      reasoning: '',
      analysisVersion: 'dspy-v1.0',
      processingTime: 0,
      status: 'processing',
      createdAt: Date.now(),
    })

    // Schedule HTTP Action-based AI processing
    const priority =
      args.priority || (user?.tier === 'premium' ? 'high' : 'normal')
    await ctx.scheduler.runAfter(0, internal.aiAnalysis.scheduleHttpAnalysis, {
      entryId: args.entryId as string,
      userId: entry.userId as string,
      priority,
    })

    return { status: 'queued', analysisId }
  },
})

// Get AI analysis for a journal entry
export const getByEntry = query({
  args: { entryId: v.id('journalEntries') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('aiAnalysis')
      .withIndex('by_entry', q => q.eq('entryId', args.entryId))
      .unique()
  },
})

// Get recent analyses for a user
export const getRecentByUser = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20

    return await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user_created', q => q.eq('userId', args.userId))
      .order('desc')
      .filter(q => q.eq(q.field('status'), 'completed'))
      .take(limit)
  },
})

// Internal query to get recent analyses for pattern detection
export const getRecentForPatterns = internalQuery({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: QueryCtx, args: { userId: string; limit?: number }) => {
    const limit = args.limit || 5

    return await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user_created', (q: any) =>
        q.eq('userId', args.userId as Id<'users'>)
      )
      .order('desc')
      .filter((q: any) => q.eq(q.field('status'), 'completed'))
      .take(limit)
  },
})

// Get analyses for a specific relationship
export const getByRelationship = query({
  args: {
    relationshipId: v.id('relationships'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50

    return await ctx.db
      .query('aiAnalysis')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .order('desc')
      .filter(q => q.eq(q.field('status'), 'completed'))
      .take(limit)
  },
})

// DEPRECATED: triggerAnalysis function removed - AI analysis now uses HTTP Actions directly via scheduleHttpAnalysis

// DEPRECATED: processEntry function removed - AI analysis now uses HTTP Actions directly

// Reprocess stuck journal entries (entries without analysis or stuck in processing state)
export const reprocessStuckEntries = mutation({
  args: {
    userId: v.optional(v.id('users')),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false

    // Get all journal entries for the user (or all if no userId provided)
    const entries = args.userId
      ? await ctx.db
          .query('journalEntries')
          .withIndex('by_user', q => q.eq('userId', args.userId!))
          .collect()
      : await ctx.db.query('journalEntries').collect()

    // Find entries that don't have completed analysis
    const stuckEntries = []

    for (const entry of entries) {
      // Skip private entries that shouldn't be analyzed
      if (entry.allowAIAnalysis === false) continue

      // Check if this entry has any analysis
      const existingAnalysis = await ctx.db
        .query('aiAnalysis')
        .withIndex('by_entry', q => q.eq('entryId', entry._id))
        .unique()

      if (!existingAnalysis) {
        // No analysis at all - needs processing
        stuckEntries.push({
          entryId: entry._id,
          reason: 'no_analysis',
          createdAt: entry.createdAt,
        })
      } else if (existingAnalysis.status === 'processing') {
        // Check if it's been processing for too long (more than 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        if (existingAnalysis.createdAt < fiveMinutesAgo) {
          stuckEntries.push({
            entryId: entry._id,
            reason: 'stuck_processing',
            createdAt: entry.createdAt,
            analysisId: existingAnalysis._id,
          })
        }
      } else if (existingAnalysis.status === 'failed') {
        // Failed analysis - could retry
        stuckEntries.push({
          entryId: entry._id,
          reason: 'failed_analysis',
          createdAt: entry.createdAt,
          analysisId: existingAnalysis._id,
        })
      }
    }

    if (dryRun) {
      return {
        found: stuckEntries.length,
        entries: stuckEntries,
        action: 'dry_run_only',
      }
    }

    // Actually reprocess the stuck entries
    const reprocessed = []
    for (const stuck of stuckEntries) {
      try {
        // Get the journal entry to access userId
        const entry = await ctx.db.get(stuck.entryId)
        if (!entry) {
          reprocessed.push({ ...stuck, action: 'failed_entry_not_found' })
          continue
        }

        if (stuck.reason === 'no_analysis') {
          // Trigger new analysis via HTTP Actions
          await ctx.scheduler.runAfter(
            0,
            internal.aiAnalysis.scheduleHttpAnalysis,
            {
              entryId: stuck.entryId as string,
              userId: entry.userId as string,
              priority: 'normal',
            }
          )
          reprocessed.push({ ...stuck, action: 'triggered_http_analysis' })
        } else if (
          stuck.reason === 'stuck_processing' ||
          stuck.reason === 'failed_analysis'
        ) {
          // Reset existing analysis and retrigger
          if (stuck.analysisId) {
            await ctx.db.patch(stuck.analysisId, {
              status: 'processing',
              reasoning: 'Reprocessing stuck entry',
              processingTime: 0,
            })
          }
          // Reset to allow HTTP Actions to retry
          await ctx.scheduler.runAfter(
            0,
            internal.aiAnalysis.scheduleHttpAnalysis,
            {
              entryId: stuck.entryId as string,
              userId: entry.userId as string,
              priority: 'normal',
            }
          )
          reprocessed.push({ ...stuck, action: 'reprocessed_via_http_actions' })
        }
      } catch (error) {
        reprocessed.push({
          ...stuck,
          action: 'failed_to_reprocess',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      found: stuckEntries.length,
      reprocessed: reprocessed.length,
      details: reprocessed,
    }
  },
})

// Get analysis statistics for dashboard
export const getStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const analyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    const stats = {
      total: analyses.length,
      completed: analyses.filter(a => a.status === 'completed').length,
      processing: analyses.filter(a => a.status === 'processing').length,
      failed: analyses.filter(a => a.status === 'failed').length,
      averageConfidence: 0,
      averageSentiment: 0,
      totalTokensUsed: 0,
      totalApiCost: 0,
    }

    const completedAnalyses = analyses.filter(a => a.status === 'completed')
    if (completedAnalyses.length > 0) {
      stats.averageConfidence =
        completedAnalyses.reduce((sum, a) => sum + a.confidenceLevel, 0) /
        completedAnalyses.length
      stats.averageSentiment =
        completedAnalyses.reduce((sum, a) => sum + a.sentimentScore, 0) /
        completedAnalyses.length
      stats.totalTokensUsed = completedAnalyses.reduce(
        (sum, a) => sum + (a.tokensUsed || 0),
        0
      )
      stats.totalApiCost = completedAnalyses.reduce(
        (sum, a) => sum + (a.apiCost || 0),
        0
      )
    }

    return stats
  },
})

// Real AI analysis function using DSPy + Gemini implementation
// Internal mutations for HTTP Actions support
export const updateStatus = internalMutation({
  args: {
    entryId: v.string(),
    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    processingAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_entry', q =>
        q.eq('entryId', args.entryId as Id<'journalEntries'>)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.processingAttempts && {
          processingAttempts: args.processingAttempts,
        }),
      })
    } else if (args.status === 'processing') {
      // Create new analysis record
      const entry = await ctx.db.get(args.entryId as Id<'journalEntries'>)
      if (entry) {
        await ctx.db.insert('aiAnalysis', {
          entryId: args.entryId as Id<'journalEntries'>,
          userId: entry.userId,
          relationshipId: entry.relationshipId,
          sentimentScore: 0,
          emotionalKeywords: [],
          confidenceLevel: 0,
          reasoning: 'Processing...',
          analysisVersion: 'http-actions-v1.0',
          processingTime: 0,
          status: args.status,
          createdAt: Date.now(),
          processingAttempts: args.processingAttempts || 1,
        })
      }
    }
  },
})

export const storeResult = internalMutation({
  args: {
    entryId: v.string(),
    userId: v.string(),
    relationshipId: v.optional(v.string()),
    sentimentScore: v.number(),
    emotionalKeywords: v.array(v.string()),
    confidenceLevel: v.number(),
    reasoning: v.string(),
    patterns: v.optional(
      v.object({
        recurring_themes: v.array(v.string()),
        emotional_triggers: v.array(v.string()),
        communication_style: v.string(),
        relationship_dynamics: v.array(v.string()),
      })
    ),
    emotionalStability: v.optional(
      v.object({
        stability_score: v.number(),
        trend_direction: v.union(
          v.literal('improving'),
          v.literal('declining'),
          v.literal('stable')
        ),
        volatility_level: v.union(
          v.literal('low'),
          v.literal('moderate'),
          v.literal('high')
        ),
        recovery_patterns: v.string(),
      })
    ),
    energyImpact: v.optional(
      v.object({
        energy_score: v.number(),
        energy_indicators: v.array(v.string()),
        overall_effect: v.union(
          v.literal('energizing'),
          v.literal('neutral'),
          v.literal('draining')
        ),
        explanation: v.string(),
      })
    ),
    analysisVersion: v.string(),
    processingTime: v.number(),
    tokensUsed: v.number(),
    apiCost: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_entry', q =>
        q.eq('entryId', args.entryId as Id<'journalEntries'>)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        sentimentScore: args.sentimentScore,
        emotionalKeywords: args.emotionalKeywords,
        confidenceLevel: args.confidenceLevel,
        reasoning: args.reasoning,
        patterns: args.patterns,
        emotionalStability: (args as any).emotionalStability,
        energyImpact: (args as any).energyImpact,
        analysisVersion: args.analysisVersion,
        processingTime: args.processingTime,
        tokensUsed: args.tokensUsed,
        apiCost: args.apiCost,
        status: args.status as 'processing' | 'completed' | 'failed',
      })
      return existing._id
    } else {
      const analysisId = await ctx.db.insert('aiAnalysis', {
        entryId: args.entryId as Id<'journalEntries'>,
        userId: args.userId as Id<'users'>,
        relationshipId: args.relationshipId as Id<'relationships'> | undefined,
        sentimentScore: args.sentimentScore,
        emotionalKeywords: args.emotionalKeywords,
        confidenceLevel: args.confidenceLevel,
        reasoning: args.reasoning,
        patterns: args.patterns,
        emotionalStability: (args as any).emotionalStability,
        energyImpact: (args as any).energyImpact,
        analysisVersion: args.analysisVersion,
        processingTime: args.processingTime,
        tokensUsed: args.tokensUsed,
        apiCost: args.apiCost,
        status: args.status as 'processing' | 'completed' | 'failed',
        createdAt: Date.now(),
      })
      return analysisId
    }
  },
})

export const markFailed = internalMutation({
  args: {
    entryId: v.string(),
    error: v.string(),
    processingAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_entry', q =>
        q.eq('entryId', args.entryId as Id<'journalEntries'>)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'failed',
        reasoning: `Analysis failed: ${args.error}`,
        ...(args.processingAttempts && {
          processingAttempts: args.processingAttempts,
        }),
      })
    }
  },
})

// Internal action for retry scheduling
export const retryAnalysisInternal = internalAction({
  args: {
    entryId: v.string(),
    userId: v.string(),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Make HTTP request to own HTTP Action endpoint
    const response = await fetch(`${process.env.CONVEX_SITE_URL}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: args.entryId,
        userId: args.userId,
        retryCount: args.retryCount,
      }),
    })

    const result = await response.json()
    return result
  },
})

// Internal action to schedule HTTP Action-based AI analysis
export const scheduleHttpAnalysis = internalAction({
  args: {
    entryId: v.string(),
    userId: v.string(),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    // Make HTTP request to our HTTP Action endpoint for AI analysis
    const siteUrl = process.env.CONVEX_SITE_URL
    if (!siteUrl) {
      throw new Error('CONVEX_SITE_URL environment variable not set')
    }

    try {
      const response = await fetch(`${siteUrl}/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add proper authentication header when Clerk integration is complete
          Authorization: `Bearer ${args.userId}`, // Simplified for now
        },
        body: JSON.stringify({
          entryId: args.entryId,
          userId: args.userId,
          retryCount: 0,
          priority: args.priority,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('HTTP Action AI analysis failed:', result)
        // Mark as failed in database
        await ctx.runMutation(internal.aiAnalysis.markFailed, {
          entryId: args.entryId,
          error: result.error || 'HTTP Action request failed',
        })
      }

      return result
    } catch (error) {
      console.error('Failed to call HTTP Action for AI analysis:', error)
      // Mark as failed in database
      await ctx.runMutation(internal.aiAnalysis.markFailed, {
        entryId: args.entryId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  },
})

// performRealAIAnalysis function removed - AI analysis now uses HTTP Actions
