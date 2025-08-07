/**
 * Fallback Analytics and Performance Tracking
 * Convex mutations and queries for fallback analysis performance monitoring
 * Supports upgrade decisions and quality tracking (Story AI-Migration.4)
 */

import { v } from 'convex/values'
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from '../_generated/server'
import { internal } from '../_generated/api'
import { Id } from '../_generated/dataModel'
import {
  compareAIAndFallback,
  generateFallbackQualityMetrics,
  shouldUpgradeFallbackResult,
  AIFallbackComparison,
  FallbackQualityMetrics,
} from './comparison'

/**
 * Compare a fallback result with its AI equivalent
 */
export const compareFallbackWithAI = internalMutation({
  args: {
    fallbackAnalysisId: v.id('aiAnalysis'),
    aiAnalysisId: v.id('aiAnalysis'),
  },
  handler: async (ctx, args) => {
    const fallbackAnalysis = await ctx.db.get(args.fallbackAnalysisId)
    const aiAnalysis = await ctx.db.get(args.aiAnalysisId)

    if (!fallbackAnalysis || !aiAnalysis) {
      throw new Error('Analysis records not found')
    }

    if (!fallbackAnalysis.fallbackMetadata) {
      throw new Error('Not a fallback analysis')
    }

    // Create fallback result object for comparison
    const fallbackResult = {
      fallbackAnalysis: {
        sentiment: determineSentimentFromScore(fallbackAnalysis.sentimentScore),
        confidenceScore: fallbackAnalysis.confidenceLevel,
        insights: fallbackAnalysis.fallbackMetadata.patternInsights,
        metadata: {
          keywordsMatched: fallbackAnalysis.emotionalKeywords || [],
          fallbackReason: fallbackAnalysis.fallbackMetadata.trigger,
        },
      },
      integration: {
        confidence: fallbackAnalysis.fallbackMetadata.confidence,
        qualityAssessment: {
          qualityScore: fallbackAnalysis.fallbackMetadata.qualityScore,
        },
        processingTime: fallbackAnalysis.fallbackMetadata.processingTime,
      },
      standardizedResults: {
        patterns: fallbackAnalysis.patterns,
      },
    }

    const comparison = await compareAIAndFallback(
      ctx,
      aiAnalysis,
      fallbackResult as any
    )

    // Store comparison results
    const comparisonId = await ctx.db.insert('fallbackComparisons', {
      fallbackAnalysisId: args.fallbackAnalysisId,
      aiAnalysisId: args.aiAnalysisId,
      comparisonResults: comparison,
      createdAt: Date.now(),
    })

    // Update fallback analysis with comparison metadata
    await ctx.db.patch(args.fallbackAnalysisId, {
      comparisonId,
      aiComparisonAvailable: true,
      upgradeRecommendation: comparison.upgradeRecommendation,
    })

    return comparisonId
  },
})

/**
 * Get comprehensive fallback quality metrics
 */
export const getFallbackQualityMetrics = query({
  args: {
    timeRangeHours: v.optional(v.number()),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const timeRangeHours = args.timeRangeHours || 24 * 7 // Default: last week
    const endTime = Date.now()
    const startTime = endTime - timeRangeHours * 60 * 60 * 1000

    let query = ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), startTime))
      .filter((q: any) => q.lte(q.field('createdAt'), endTime))
      .filter((q: any) => q.eq(q.field('analysisVersion'), 'fallback-v1.0'))

    if (args.userId) {
      query = query.filter((q: any) => q.eq(q.field('userId'), args.userId))
    }

    const fallbackAnalyses = await query.collect()

    // Get AI analyses for comparison
    let aiQuery = ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), startTime))
      .filter((q: any) => q.lte(q.field('createdAt'), endTime))
      .filter((q: any) => q.neq(q.field('analysisVersion'), 'fallback-v1.0'))
      .filter((q: any) => q.eq(q.field('status'), 'completed'))

    if (args.userId) {
      aiQuery = aiQuery.filter((q: any) => q.eq(q.field('userId'), args.userId))
    }

    const aiAnalyses = await aiQuery.collect()

    return await generateFallbackQualityMetrics(ctx, timeRangeHours)
  },
})

/**
 * Check if a fallback result should be upgraded
 */
export const checkUpgradeRecommendation = query({
  args: {
    fallbackAnalysisId: v.id('aiAnalysis'),
    qualityThreshold: v.optional(v.number()),
    costThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await shouldUpgradeFallbackResult(ctx, args.fallbackAnalysisId, {
      qualityThreshold: args.qualityThreshold,
      costThreshold: args.costThreshold,
    })
  },
})

/**
 * Get fallback vs AI performance comparison
 */
export const getFallbackPerformanceComparison = query({
  args: {
    timeRangeHours: v.optional(v.number()),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const timeRangeHours = args.timeRangeHours || 24 * 7
    const endTime = Date.now()
    const startTime = endTime - timeRangeHours * 60 * 60 * 1000

    // Get fallback analyses
    let fallbackQuery = ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), startTime))
      .filter((q: any) => q.lte(q.field('createdAt'), endTime))
      .filter((q: any) => q.eq(q.field('analysisVersion'), 'fallback-v1.0'))

    if (args.userId) {
      fallbackQuery = fallbackQuery.filter((q: any) =>
        q.eq(q.field('userId'), args.userId)
      )
    }

    const fallbackAnalyses = await fallbackQuery.collect()

    // Get AI analyses
    let aiQuery = ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.gte(q.field('createdAt'), startTime))
      .filter((q: any) => q.lte(q.field('createdAt'), endTime))
      .filter((q: any) => q.neq(q.field('analysisVersion'), 'fallback-v1.0'))
      .filter((q: any) => q.eq(q.field('status'), 'completed'))

    if (args.userId) {
      aiQuery = aiQuery.filter((q: any) => q.eq(q.field('userId'), args.userId))
    }

    const aiAnalyses = await aiQuery.collect()

    // Calculate metrics
    const fallbackMetrics = {
      count: fallbackAnalyses.length,
      averageConfidence:
        fallbackAnalyses.reduce(
          (sum, a) => sum + (a.fallbackMetadata?.confidence || 0),
          0
        ) / (fallbackAnalyses.length || 1),
      averageProcessingTime:
        fallbackAnalyses.reduce(
          (sum, a) => sum + (a.fallbackMetadata?.processingTime || 0),
          0
        ) / (fallbackAnalyses.length || 1),
      successRate:
        fallbackAnalyses.filter(
          a => (a.fallbackMetadata?.qualityScore || 0) >= 0.3
        ).length / (fallbackAnalyses.length || 1),
      totalCost: 0, // Fallback is free
    }

    const aiMetrics = {
      count: aiAnalyses.length,
      averageConfidence:
        aiAnalyses.reduce((sum, a) => sum + (a.confidenceLevel || 0), 0) /
        (aiAnalyses.length || 1),
      averageProcessingTime:
        aiAnalyses.reduce((sum, a) => sum + (a.processingTime || 0), 0) /
        (aiAnalyses.length || 1),
      successRate:
        aiAnalyses.filter(a => (a.confidenceLevel || 0) >= 0.7).length /
        (aiAnalyses.length || 1),
      totalCost: aiAnalyses.reduce((sum, a) => sum + (a.apiCost || 0), 0),
    }

    // Calculate trigger-based breakdown
    const fallbackTriggers = fallbackAnalyses.reduce(
      (acc, analysis) => {
        const trigger = analysis.fallbackMetadata?.trigger || 'unknown'
        acc[trigger] = (acc[trigger] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      timeRange: { startTime, endTime, hours: timeRangeHours },
      fallback: fallbackMetrics,
      ai: aiMetrics,
      comparison: {
        costSavings: aiMetrics.totalCost,
        speedAdvantage:
          fallbackMetrics.averageProcessingTime <
          aiMetrics.averageProcessingTime
            ? 'fallback'
            : 'ai',
        qualityGap:
          aiMetrics.averageConfidence - fallbackMetrics.averageConfidence,
        availabilityImprovement:
          fallbackAnalyses.length /
          (fallbackAnalyses.length + aiAnalyses.length),
      },
      fallbackTriggers,
    }
  },
})

/**
 * Get detailed analysis comparison for a specific fallback result
 */
export const getAnalysisComparison = query({
  args: {
    fallbackAnalysisId: v.id('aiAnalysis'),
  },
  handler: async (ctx, args) => {
    const fallbackAnalysis = await ctx.db.get(args.fallbackAnalysisId)
    if (!fallbackAnalysis || !fallbackAnalysis.fallbackMetadata) {
      throw new Error('Fallback analysis not found')
    }

    // Try to find comparison record
    const comparison = fallbackAnalysis.comparisonId
      ? await ctx.db.get(fallbackAnalysis.comparisonId)
      : null

    if (comparison) {
      return {
        hasComparison: true,
        comparison: comparison.comparisonResults,
        fallbackAnalysis,
        aiAnalysisId: comparison.aiAnalysisId,
      }
    }

    // No comparison available - return fallback analysis details with upgrade recommendation
    const upgradeRecommendation = await shouldUpgradeFallbackResult(
      ctx,
      args.fallbackAnalysisId
    )

    return {
      hasComparison: false,
      fallbackAnalysis,
      upgradeRecommendation,
      suggestedActions: generateSuggestedActions(
        fallbackAnalysis,
        upgradeRecommendation
      ),
    }
  },
})

/**
 * Request upgrade of a fallback analysis to AI analysis
 */
export const requestFallbackUpgrade = mutation({
  args: {
    fallbackAnalysisId: v.id('aiAnalysis'),
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fallbackAnalysis = await ctx.db.get(args.fallbackAnalysisId)
    if (!fallbackAnalysis || !fallbackAnalysis.fallbackMetadata) {
      throw new Error('Fallback analysis not found')
    }

    // Check if upgrade is already in progress
    if (fallbackAnalysis.upgradeInProgress) {
      return {
        success: false,
        reason: 'Upgrade already in progress',
      }
    }

    // Get the original journal entry
    const journalEntry = await ctx.db.get(fallbackAnalysis.entryId)
    if (!journalEntry) {
      throw new Error('Original journal entry not found')
    }

    // Mark upgrade as in progress
    await ctx.db.patch(args.fallbackAnalysisId, {
      upgradeInProgress: true,
      upgradeRequestedAt: Date.now(),
      upgradeReason: args.reason || 'Manual upgrade request',
    })

    // Enqueue AI analysis with appropriate priority
    const priority = args.priority || 'normal'
    const { enqueueAnalysis } = await import('../scheduler/enqueueHelper')
    await enqueueAnalysis(ctx as any, {
      entryId: fallbackAnalysis.entryId as any,
      userId: fallbackAnalysis.userId as any,
      priority,
    })

    return {
      success: true,
      message: `Upgrade requested with ${priority} priority`,
      estimatedCompletion:
        Date.now() +
        (priority === 'urgent' ? 30000 : priority === 'high' ? 60000 : 120000),
    }
  },
})

/**
 * Get fallback upgrade queue status
 */
export const getFallbackUpgradeQueue = query({
  args: {
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.eq(q.field('upgradeInProgress'), true))

    if (args.userId) {
      query = query.filter((q: any) => q.eq(q.field('userId'), args.userId))
    }

    const upgradesInProgress = await query.collect()

    // Get completed upgrades (recently completed)
    const recentCompletions = await ctx.db
      .query('aiAnalysis')
      .filter((q: any) => q.neq(q.field('originalFallbackId'), undefined))
      .filter((q: any) => q.eq(q.field('status'), 'completed'))
      .order('desc')
      .take(10)

    return {
      inProgress: upgradesInProgress.map(analysis => ({
        id: analysis._id,
        entryId: analysis.entryId,
        requestedAt: analysis.upgradeRequestedAt,
        reason: analysis.upgradeReason,
        estimatedCompletion:
          (analysis.upgradeRequestedAt || Date.now()) + 120000, // 2 minutes default
      })),
      recentCompletions: recentCompletions.map(analysis => ({
        id: analysis._id,
        originalFallbackId: analysis.originalFallbackId,
        completedAt: analysis.createdAt,
        improvement: calculateUpgradeImprovement(analysis),
      })),
    }
  },
})

/**
 * Helper functions
 */

function determineSentimentFromScore(
  score: number
): 'positive' | 'negative' | 'neutral' {
  if (score > 0.2) return 'positive'
  if (score < -0.2) return 'negative'
  return 'neutral'
}

function generateSuggestedActions(
  fallbackAnalysis: any,
  upgradeRecommendation: any
): string[] {
  const actions: string[] = []

  if (upgradeRecommendation.shouldUpgrade) {
    actions.push(
      `Upgrade to AI analysis (${Math.round(upgradeRecommendation.confidence * 100)}% confidence)`
    )
    actions.push(
      `Expected improvement: ${Math.round(upgradeRecommendation.estimatedBenefit * 100)}%`
    )
  }

  const quality = fallbackAnalysis.fallbackMetadata?.qualityScore || 0
  if (quality < 0.3) {
    actions.push('Consider upgrading due to low quality score')
  } else if (quality > 0.7) {
    actions.push('High quality fallback result - upgrade may not be necessary')
  }

  const trigger = fallbackAnalysis.fallbackMetadata?.trigger
  if (trigger === 'circuit_breaker_open') {
    actions.push('Wait for circuit breaker recovery before upgrading')
  } else if (trigger === 'rate_limit') {
    actions.push('Consider upgrading when rate limits reset')
  }

  return actions
}

function calculateUpgradeImprovement(upgradedAnalysis: any): number {
  // Placeholder - would calculate actual improvement metrics
  return Math.random() * 0.3 + 0.1 // 10-40% improvement
}
