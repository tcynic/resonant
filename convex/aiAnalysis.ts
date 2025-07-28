import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { analyzeJournalEntry, fallbackAnalysis } from './utils/ai_bridge'

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

    // Schedule the actual AI processing
    const priority =
      args.priority || (user?.tier === 'premium' ? 'high' : 'normal')
    await ctx.scheduler.runAfter(0, internal.aiAnalysis.processEntry, {
      analysisId,
      entryId: args.entryId,
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

// Internal function to trigger AI analysis (called by scheduler from journal creation)
export const triggerAnalysis = internalMutation({
  args: {
    entryId: v.id('journalEntries'),
    priority: v.string(),
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

    // Create processing record and start analysis
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

    // Schedule the actual AI processing
    await ctx.scheduler.runAfter(0, internal.aiAnalysis.processEntry, {
      analysisId,
      entryId: args.entryId,
      priority: args.priority,
    })

    return { status: 'queued', analysisId }
  },
})

// Internal function to process AI analysis (called by scheduler)
export const processEntry = internalMutation({
  args: {
    analysisId: v.id('aiAnalysis'),
    entryId: v.id('journalEntries'),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    try {
      const entry = await ctx.db.get(args.entryId)
      const analysis = await ctx.db.get(args.analysisId)

      if (!entry || !analysis) {
        throw new Error('Entry or analysis record not found')
      }

      // Get relationship context for better analysis
      let relationshipContext = ''
      if (entry.relationshipId) {
        const relationship = await ctx.db.get(entry.relationshipId)
        if (relationship) {
          relationshipContext = `${relationship.initials || relationship.name} (${relationship.type})`
        }
      }

      // Get previous analyses for pattern detection
      const previousAnalyses = await ctx.db
        .query('aiAnalysis')
        .withIndex('by_user_created', q => q.eq('userId', entry.userId))
        .order('desc')
        .filter(q => q.eq(q.field('status'), 'completed'))
        .take(5)

      // Real AI analysis using DSPy integration
      const analysisResult = await performRealAIAnalysis(
        entry.content,
        relationshipContext,
        entry.mood,
        previousAnalyses
      )

      // Update analysis record with results
      await ctx.db.patch(args.analysisId, {
        sentimentScore: analysisResult.sentimentScore,
        emotionalKeywords: analysisResult.emotionalKeywords,
        confidenceLevel: analysisResult.confidenceLevel,
        reasoning: analysisResult.reasoning,
        patterns: analysisResult.patterns,
        processingTime: Date.now() - startTime,
        tokensUsed: analysisResult.tokensUsed,
        apiCost: analysisResult.apiCost,
        status: 'completed',
      })

      // Trigger health score recalculation if this is for a relationship
      if (entry.relationshipId) {
        await ctx.scheduler.runAfter(5000, internal.healthScores.recalculate, {
          userId: entry.userId,
          relationshipId: entry.relationshipId,
        })
      }

      return { success: true }
    } catch (error) {
      // Mark analysis as failed
      await ctx.db.patch(args.analysisId, {
        status: 'failed',
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: Date.now() - startTime,
      })

      throw error
    }
  },
})

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
          createdAt: entry.createdAt
        })
      } else if (existingAnalysis.status === 'processing') {
        // Check if it's been processing for too long (more than 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        if (existingAnalysis.createdAt < fiveMinutesAgo) {
          stuckEntries.push({
            entryId: entry._id,
            reason: 'stuck_processing',
            createdAt: entry.createdAt,
            analysisId: existingAnalysis._id
          })
        }
      } else if (existingAnalysis.status === 'failed') {
        // Failed analysis - could retry
        stuckEntries.push({
          entryId: entry._id,
          reason: 'failed_analysis',
          createdAt: entry.createdAt,
          analysisId: existingAnalysis._id
        })
      }
    }
    
    if (dryRun) {
      return {
        found: stuckEntries.length,
        entries: stuckEntries,
        action: 'dry_run_only'
      }
    }
    
    // Actually reprocess the stuck entries
    const reprocessed = []
    for (const stuck of stuckEntries) {
      try {
        if (stuck.reason === 'no_analysis') {
          // Trigger new analysis
          await ctx.scheduler.runAfter(0, internal.aiAnalysis.triggerAnalysis, {
            entryId: stuck.entryId,
            priority: 'normal',
          })
          reprocessed.push({ ...stuck, action: 'triggered_new_analysis' })
        } else if (stuck.reason === 'stuck_processing' || stuck.reason === 'failed_analysis') {
          // Reset existing analysis and retrigger
          if (stuck.analysisId) {
            await ctx.db.patch(stuck.analysisId, {
              status: 'processing',
              reasoning: 'Reprocessing stuck entry',
              processingTime: 0,
            })
          }
          await ctx.scheduler.runAfter(0, internal.aiAnalysis.processEntry, {
            analysisId: stuck.analysisId!,
            entryId: stuck.entryId,
            priority: 'normal',
          })
          reprocessed.push({ ...stuck, action: 'reprocessed_existing' })
        }
      } catch (error) {
        reprocessed.push({ 
          ...stuck, 
          action: 'failed_to_reprocess',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return {
      found: stuckEntries.length,
      reprocessed: reprocessed.length,
      details: reprocessed
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
async function performRealAIAnalysis(
  content: string,
  relationshipContext: string,
  mood?: string,
  previousAnalyses?: any[]
) {
  try {
    // Prepare sentiment history for stability analysis
    const sentimentHistory =
      previousAnalyses?.map(analysis => ({
        score: analysis.sentimentScore * 4.5 + 5.5, // Convert -1,1 scale back to 1-10
        timestamp: analysis.createdAt,
        emotions: analysis.emotionalKeywords,
      })) || []

    // Call real AI analysis
    const result = await analyzeJournalEntry(
      content,
      relationshipContext,
      mood,
      sentimentHistory
    )

    return {
      sentimentScore: result.sentimentScore,
      emotionalKeywords: result.emotionalKeywords,
      confidenceLevel: result.confidenceLevel,
      reasoning: result.reasoning,
      patterns: result.patterns,
      tokensUsed: result.tokensUsed,
      apiCost: result.apiCost,
    }
  } catch (error) {
    console.error('AI analysis failed:', error)
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
