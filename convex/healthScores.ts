/**
 * Health Score Calculation Functions for Convex Backend
 * Calculates relationship health scores based on AI analysis results
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'
import { HealthScoreComponents, HealthScoreTrends } from '../src/lib/types'

// Health score calculation weights (total = 100%)
const SCORE_WEIGHTS = {
  sentiment: 0.35, // 35% - Most important for relationship health
  emotionalStability: 0.2, // 20% - Consistency in emotional responses
  energyImpact: 0.15, // 15% - How relationship affects energy
  conflictResolution: 0.15, // 15% - Ability to resolve conflicts
  gratitude: 0.1, // 10% - Gratitude and appreciation
  communicationFrequency: 0.05, // 5% - Based on journal entry frequency
} as const

// Create or update health score
export const updateHealthScore = mutation({
  args: {
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    overallScore: v.number(),
    componentScores: v.object({
      sentiment: v.number(),
      emotionalStability: v.number(),
      energyImpact: v.number(),
      conflictResolution: v.number(),
      gratitude: v.number(),
      communicationFrequency: v.number(),
    }),
    confidenceLevel: v.number(),
    dataPoints: v.number(),
    trendsData: v.optional(
      v.object({
        improving: v.boolean(),
        trendDirection: v.union(
          v.literal('up'),
          v.literal('down'),
          v.literal('stable')
        ),
        changeRate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if health score already exists
    const existing = await ctx.db
      .query('healthScores')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .first()

    if (existing) {
      // Update existing health score
      return await ctx.db.patch(existing._id, {
        overallScore: args.overallScore,
        componentScores: args.componentScores,
        lastUpdated: now,
        dataPoints: args.dataPoints,
        confidenceLevel: args.confidenceLevel,
        trendsData: args.trendsData,
      })
    } else {
      // Create new health score
      return await ctx.db.insert('healthScores', {
        relationshipId: args.relationshipId,
        userId: args.userId,
        overallScore: args.overallScore,
        componentScores: args.componentScores,
        lastUpdated: now,
        dataPoints: args.dataPoints,
        confidenceLevel: args.confidenceLevel,
        trendsData: args.trendsData,
      })
    }
  },
})

// Get health score by relationship
export const getHealthScoreByRelationship = query({
  args: {
    relationshipId: v.id('relationships'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('healthScores')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .first()
  },
})

// Get all health scores for user
export const getHealthScoresByUser = query({
  args: {
    userId: v.id('users'),
    sortBy: v.optional(
      v.union(
        v.literal('score'),
        v.literal('updated'),
        v.literal('relationship')
      )
    ),
  },
  handler: async (ctx, args) => {
    const scores = await ctx.db
      .query('healthScores')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    // Sort based on preference
    switch (args.sortBy) {
      case 'score':
        return scores.sort((a, b) => b.overallScore - a.overallScore)
      case 'updated':
        return scores.sort((a, b) => b.lastUpdated - a.lastUpdated)
      default:
        return scores
    }
  },
})

// Calculate health score from AI analyses
export const calculateHealthScoreFromAnalyses = mutation({
  args: {
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    timeRangeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeDays || 30
    const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000

    // Get all AI analyses for this relationship in the time range
    const analyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .filter(q => q.gte(q.field('createdAt'), cutoffTime))
      .collect()

    if (analyses.length === 0) {
      throw new Error('No analyses found for health score calculation')
    }

    // Group analyses by type
    const analysesByType = analyses.reduce(
      (acc, analysis) => {
        if (!acc[analysis.analysisType]) {
          acc[analysis.analysisType] = []
        }
        acc[analysis.analysisType].push(analysis)
        return acc
      },
      {} as Record<string, typeof analyses>
    )

    // Calculate component scores
    const componentScores: HealthScoreComponents = {
      sentiment: calculateSentimentScore(analysesByType.sentiment || []),
      emotionalStability: calculateStabilityScore(
        analysesByType.emotional_stability || []
      ),
      energyImpact: calculateEnergyScore(analysesByType.energy_impact || []),
      conflictResolution: calculateResolutionScore(
        analysesByType.conflict_resolution || []
      ),
      gratitude: calculateGratitudeScore(analysesByType.gratitude || []),
      communicationFrequency: calculateCommunicationScore(analyses, timeRange),
    }

    // Calculate overall score using weighted average
    const overallScore = Math.round(
      componentScores.sentiment * SCORE_WEIGHTS.sentiment +
        componentScores.emotionalStability * SCORE_WEIGHTS.emotionalStability +
        componentScores.energyImpact * SCORE_WEIGHTS.energyImpact +
        componentScores.conflictResolution * SCORE_WEIGHTS.conflictResolution +
        componentScores.gratitude * SCORE_WEIGHTS.gratitude +
        componentScores.communicationFrequency *
          SCORE_WEIGHTS.communicationFrequency
    )

    // Calculate confidence level based on data availability and recency
    const confidenceLevel = calculateConfidenceLevel(analyses, componentScores)

    // Calculate trends if we have historical data
    const trendsData = await calculateTrends(
      ctx,
      args.relationshipId,
      overallScore
    )

    // Update health score in database
    await ctx.runMutation('healthScores:updateHealthScore' as any, {
      relationshipId: args.relationshipId,
      userId: args.userId,
      overallScore,
      componentScores,
      confidenceLevel,
      dataPoints: analyses.length,
      trendsData,
    })

    return {
      overallScore,
      componentScores,
      confidenceLevel,
      dataPoints: analyses.length,
      trendsData,
      message: `Health score calculated from ${analyses.length} analyses over ${timeRange} days`,
    }
  },
})

// Helper function: Calculate sentiment component score
function calculateSentimentScore(sentimentAnalyses: any[]): number {
  if (sentimentAnalyses.length === 0) return 50 // Neutral score if no data

  // Convert 1-10 scale to 0-100 scale with recency weighting
  const weightedScores = sentimentAnalyses.map((analysis, index) => {
    const score = (analysis.analysisResults.sentimentScore || 5) * 10 // 1-10 -> 10-100
    const recencyWeight = Math.pow(0.9, sentimentAnalyses.length - 1 - index) // More recent = higher weight
    const confidenceWeight = analysis.analysisResults.confidence || 0.5

    return score * recencyWeight * confidenceWeight
  })

  const totalWeight = sentimentAnalyses.reduce((sum, analysis, index) => {
    const recencyWeight = Math.pow(0.9, sentimentAnalyses.length - 1 - index)
    const confidenceWeight = analysis.analysisResults.confidence || 0.5
    return sum + recencyWeight * confidenceWeight
  }, 0)

  const weightedAverage =
    weightedScores.reduce((sum, score) => sum + score, 0) / totalWeight

  return Math.min(100, Math.max(0, Math.round(weightedAverage)))
}

// Helper function: Calculate emotional stability score
function calculateStabilityScore(stabilityAnalyses: any[]): number {
  if (stabilityAnalyses.length === 0) return 50

  const scores = stabilityAnalyses.map(
    analysis => analysis.analysisResults.stabilityScore || 50
  )
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return Math.min(100, Math.max(0, Math.round(average)))
}

// Helper function: Calculate energy impact score
function calculateEnergyScore(energyAnalyses: any[]): number {
  if (energyAnalyses.length === 0) return 50

  // Convert 1-10 scale to 0-100 scale
  const scores = energyAnalyses.map(
    analysis => (analysis.analysisResults.energyScore || 5) * 10
  )
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return Math.min(100, Math.max(0, Math.round(average)))
}

// Helper function: Calculate conflict resolution score
function calculateResolutionScore(resolutionAnalyses: any[]): number {
  if (resolutionAnalyses.length === 0) return 50

  // Convert 1-10 scale to 0-100 scale
  const scores = resolutionAnalyses.map(
    analysis => (analysis.analysisResults.resolutionScore || 5) * 10
  )
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return Math.min(100, Math.max(0, Math.round(average)))
}

// Helper function: Calculate gratitude score
function calculateGratitudeScore(gratitudeAnalyses: any[]): number {
  if (gratitudeAnalyses.length === 0) return 50

  // Convert 1-10 scale to 0-100 scale
  const scores = gratitudeAnalyses.map(
    analysis => (analysis.analysisResults.gratitudeScore || 5) * 10
  )
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

  return Math.min(100, Math.max(0, Math.round(average)))
}

// Helper function: Calculate communication frequency score
function calculateCommunicationScore(
  allAnalyses: any[],
  timeRangeDays: number
): number {
  const totalEntries = allAnalyses.length
  const entriesPerDay = totalEntries / timeRangeDays

  // Score based on frequency: 0.5+ per day = 100, scaling down
  const maxDailyEntries = 0.5
  const score = Math.min(100, (entriesPerDay / maxDailyEntries) * 100)

  return Math.round(score)
}

// Helper function: Calculate confidence level
function calculateConfidenceLevel(
  analyses: any[],
  componentScores: HealthScoreComponents
): number {
  // Base confidence on data availability and AI confidence scores
  const dataAvailability = Math.min(1, analyses.length / 10) // Full confidence at 10+ analyses

  const avgAIConfidence =
    analyses.reduce((sum, analysis) => {
      return sum + (analysis.analysisResults.confidence || 0.5)
    }, 0) / analyses.length

  // Penalize if too many components are at default (50) score
  const defaultComponents = Object.values(componentScores).filter(
    score => score === 50
  ).length
  const componentPenalty = Math.max(0, 1 - defaultComponents * 0.15)

  const overallConfidence =
    dataAvailability * avgAIConfidence * componentPenalty

  return Math.min(1, Math.max(0.1, overallConfidence))
}

// Helper function: Calculate trends
async function calculateTrends(
  ctx: any,
  relationshipId: Id<'relationships'>,
  currentScore: number
): Promise<HealthScoreTrends | undefined> {
  // Get previous health score for comparison
  const previousScore = await ctx.db
    .query('healthScores')
    .withIndex('by_relationship', (q: any) =>
      q.eq('relationshipId', relationshipId)
    )
    .first()

  if (!previousScore) return undefined

  const scoreDifference = currentScore - previousScore.overallScore
  const changeRate =
    (Math.abs(scoreDifference) / previousScore.overallScore) * 100

  let trendDirection: 'up' | 'down' | 'stable'
  if (Math.abs(scoreDifference) < 2) {
    trendDirection = 'stable'
  } else if (scoreDifference > 0) {
    trendDirection = 'up'
  } else {
    trendDirection = 'down'
  }

  return {
    improving: trendDirection === 'up',
    trendDirection,
    changeRate: Math.round(changeRate * 100) / 100, // Round to 2 decimal places
  }
}

// Get health score trends over time
export const getHealthScoreTrends = query({
  args: {
    relationshipId: v.id('relationships'),
    timeRangeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeDays || 90
    const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000

    // Get sentiment analyses for trend calculation
    const sentimentAnalyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .filter(q =>
        q.and(
          q.eq(q.field('analysisType'), 'sentiment'),
          q.gte(q.field('createdAt'), cutoffTime)
        )
      )
      .order('asc')
      .collect()

    // Group by week for trend visualization
    const weeklyTrends = sentimentAnalyses.reduce(
      (acc, analysis) => {
        const weekStart =
          Math.floor(analysis.createdAt / (7 * 24 * 60 * 60 * 1000)) *
          (7 * 24 * 60 * 60 * 1000)

        if (!acc[weekStart]) {
          acc[weekStart] = {
            timestamp: weekStart,
            scores: [],
            count: 0,
          }
        }

        if (analysis.analysisResults.sentimentScore) {
          acc[weekStart].scores.push(
            analysis.analysisResults.sentimentScore * 10
          ) // Convert to 0-100
          acc[weekStart].count++
        }

        return acc
      },
      {} as Record<
        number,
        { timestamp: number; scores: number[]; count: number }
      >
    )

    // Calculate weekly averages
    const trends = Object.values(weeklyTrends)
      .map(week => ({
        timestamp: week.timestamp,
        averageScore:
          week.scores.reduce((sum, score) => sum + score, 0) /
          week.scores.length,
        entryCount: week.count,
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    return trends
  },
})

// Recalculate all health scores (maintenance function)
export const recalculateAllHealthScores = mutation({
  args: {
    userId: v.id('users'),
    timeRangeDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all relationships for user
    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    const results = []

    for (const relationship of relationships) {
      try {
        const result = await ctx.runMutation(
          'healthScores:calculateHealthScoreFromAnalyses' as any,
          {
            relationshipId: relationship._id,
            userId: args.userId,
            timeRangeDays: args.timeRangeDays,
          }
        )

        results.push({
          relationshipId: relationship._id,
          relationshipName: relationship.name,
          success: true,
          ...result,
        })
      } catch (error) {
        results.push({
          relationshipId: relationship._id,
          relationshipName: relationship.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      totalRelationships: relationships.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    }
  },
})
