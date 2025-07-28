import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { analyzeJournalEntry, fallbackAnalysis } from './utils/ai-bridge'

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

    // Check if user has AI analysis enabled
    const user = await ctx.db.get(entry.userId)
    if (!user?.preferences?.aiAnalysisEnabled) {
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
      args.priority || (user.tier === 'premium' ? 'high' : 'normal')
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
    console.error('Real AI analysis failed, using fallback:', error)

    // Fallback to rule-based analysis
    const fallbackResult = fallbackAnalysis(content, mood)

    return {
      sentimentScore: fallbackResult.sentimentScore || 0,
      emotionalKeywords: fallbackResult.emotionalKeywords || [],
      confidenceLevel: fallbackResult.confidenceLevel || 0.5,
      reasoning:
        fallbackResult.reasoning ||
        'Fallback analysis used due to AI service unavailability',
      patterns: fallbackResult.patterns || {
        recurring_themes: [],
        emotional_triggers: [],
        communication_style: 'unknown',
        relationship_dynamics: [],
      },
      tokensUsed: fallbackResult.tokensUsed || 0,
      apiCost: fallbackResult.apiCost || 0,
    }
  }
}
