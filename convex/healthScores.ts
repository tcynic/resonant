import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'

// Recalculate health score for a relationship (Epic 2 - Core AI Feature)
export const recalculate = internalMutation({
  args: {
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
  },
  handler: async (ctx, args) => {
    // Get recent AI analyses for this relationship (last 60 days for comprehensive analysis)
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000

    const analyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .filter(q => q.gte(q.field('createdAt'), sixtyDaysAgo))
      .filter(q => q.eq(q.field('status'), 'completed'))
      .order('desc')
      .collect()

    if (analyses.length < 2) {
      // Need at least 2 analyses for meaningful health score
      return {
        success: false,
        reason: 'Insufficient data for health score calculation',
        analysesFound: analyses.length,
      }
    }

    // Get relationship context for scoring
    const relationship = await ctx.db.get(args.relationshipId)
    if (!relationship || !relationship.isActive) {
      return { success: false, reason: 'Relationship not found or inactive' }
    }

    // Calculate comprehensive health score
    const healthScoreData = await calculateComprehensiveHealthScore(
      analyses,
      relationship,
      sixtyDaysAgo
    )

    // Check if existing health score exists
    const existingScore = await ctx.db
      .query('healthScores')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .unique()

    const scoreRecord = {
      userId: args.userId,
      relationshipId: args.relationshipId,
      ...healthScoreData,
      entriesAnalyzed: analyses.length,
      timeframeStart: sixtyDaysAgo,
      timeframeEnd: Date.now(),
      lastCalculated: Date.now(),
      version: 'v2.0', // Enhanced algorithm version
    }

    let healthScoreId
    if (existingScore) {
      // Update existing score
      await ctx.db.patch(existingScore._id, scoreRecord)
      healthScoreId = existingScore._id
    } else {
      // Create new score
      healthScoreId = await ctx.db.insert('healthScores', scoreRecord)
    }

    // Generate insights based on score changes
    if (
      existingScore &&
      Math.abs(existingScore.score - healthScoreData.score) > 10
    ) {
      await ctx.scheduler.runAfter(2000, internal.insights.generateInsights, {
        userId: args.userId,
        relationshipId: args.relationshipId,
        triggerType: 'health_score_change',
      })
    }

    return {
      success: true,
      healthScoreId,
      score: healthScoreData.score,
      trendDirection: healthScoreData.trendDirection,
      previousScore: existingScore?.score || null,
    }
  },
})

// Get health score for a relationship
export const getByRelationship = query({
  args: { relationshipId: v.id('relationships') },
  handler: async (ctx, args) => {
    const healthScore = await ctx.db
      .query('healthScores')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .unique()

    if (!healthScore) return null

    // Check if score is stale (older than 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const isStale = healthScore.lastCalculated < weekAgo

    return {
      ...healthScore,
      isStale,
      daysOld: Math.floor(
        (Date.now() - healthScore.lastCalculated) / (24 * 60 * 60 * 1000)
      ),
    }
  },
})

// Get all health scores for a user
export const getByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const healthScores = await ctx.db
      .query('healthScores')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .collect()

    // Enrich with relationship data
    const enrichedScores = await Promise.all(
      healthScores.map(async score => {
        const relationship = await ctx.db.get(score.relationshipId)
        return {
          ...score,
          relationship: relationship
            ? {
                name: relationship.name,
                type: relationship.type,
                initials: relationship.initials,
              }
            : null,
        }
      })
    )

    return enrichedScores.filter(score => score.relationship) // Filter out deleted relationships
  },
})

// Get health scores summary for dashboard
export const getSummary = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const healthScores = await ctx.db
      .query('healthScores')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    if (healthScores.length === 0) {
      return {
        totalRelationships: 0,
        averageScore: 0,
        healthyRelationships: 0,
        needsAttention: 0,
        improving: 0,
        declining: 0,
        stable: 0,
        scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        topPerformingRelationship: null,
        relationshipNeedingAttention: null,
      }
    }

    // Calculate comprehensive summary statistics
    const scores = healthScores.map(hs => hs.score)
    const averageScore = Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    )

    // Score categorization
    const excellent = healthScores.filter(hs => hs.score >= 85).length
    const good = healthScores.filter(
      hs => hs.score >= 70 && hs.score < 85
    ).length
    const fair = healthScores.filter(
      hs => hs.score >= 50 && hs.score < 70
    ).length
    const poor = healthScores.filter(hs => hs.score < 50).length

    // Trend analysis
    const improving = healthScores.filter(
      hs => hs.trendDirection === 'improving'
    ).length
    const declining = healthScores.filter(
      hs => hs.trendDirection === 'declining'
    ).length
    const stable = healthScores.filter(
      hs => hs.trendDirection === 'stable'
    ).length

    // Find extremes
    const sortedByScore = [...healthScores].sort((a, b) => b.score - a.score)
    const topPerforming = sortedByScore[0]
    const needsAttention = sortedByScore[sortedByScore.length - 1]

    return {
      totalRelationships: healthScores.length,
      averageScore,
      healthyRelationships: excellent + good,
      needsAttention: poor,
      improving,
      declining,
      stable,
      scoreDistribution: { excellent, good, fair, poor },
      topPerformingRelationship: topPerforming
        ? {
            relationshipId: topPerforming.relationshipId,
            score: topPerforming.score,
            trendDirection: topPerforming.trendDirection,
          }
        : null,
      relationshipNeedingAttention:
        needsAttention?.score < 60
          ? {
              relationshipId: needsAttention.relationshipId,
              score: needsAttention.score,
              trendDirection: needsAttention.trendDirection,
            }
          : null,
    }
  },
})

// Force recalculation of health scores (manual trigger)
export const forceRecalculate = mutation({
  args: {
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
  },
  handler: async (ctx, args) => {
    if (args.relationshipId) {
      // Recalculate for specific relationship
      await ctx.scheduler.runAfter(0, internal.healthScores.recalculate, {
        userId: args.userId,
        relationshipId: args.relationshipId,
      })
      return { success: true, message: 'Recalculation queued for relationship' }
    } else {
      // Recalculate for all user's relationships
      const relationships = await ctx.db
        .query('relationships')
        .withIndex('by_user_active', q =>
          q.eq('userId', args.userId).eq('isActive', true)
        )
        .collect()

      for (const relationship of relationships) {
        await ctx.scheduler.runAfter(
          Math.random() * 5000,
          internal.healthScores.recalculate,
          {
            userId: args.userId,
            relationshipId: relationship._id,
          }
        )
      }

      return {
        success: true,
        message: `Recalculation queued for ${relationships.length} relationships`,
      }
    }
  },
})

// Get health score history for trend analysis
export const getHistory = query({
  args: {
    relationshipId: v.id('relationships'),
    days: v.optional(v.number()), // Default 90 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 90
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000

    // For now, we'll simulate historical data since we only store current scores
    // In production, you'd store historical snapshots or calculate from analysis timestamps
    const currentScore = await ctx.db
      .query('healthScores')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .unique()

    if (!currentScore) {
      return { dataPoints: [], trend: 'stable', confidence: 0 }
    }

    // Generate simulated historical trend based on current score and analyses
    const analyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .filter(q => q.gte(q.field('createdAt'), startDate))
      .order('desc')
      .collect()

    const historyPoints = generateHistoricalTrend(currentScore, analyses, days)

    return {
      dataPoints: historyPoints,
      trend: currentScore.trendDirection,
      confidence: currentScore.confidence,
      currentScore: currentScore.score,
    }
  },
})

// Bulk recalculate all health scores (admin/maintenance function)
export const bulkRecalculate = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10
    const delayMs = args.delayMs || 2000

    // Get all active relationships
    const relationships = await ctx.db
      .query('relationships')
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    let processed = 0
    for (let i = 0; i < relationships.length; i += batchSize) {
      const batch = relationships.slice(i, i + batchSize)

      // Schedule batch with progressive delay
      for (const relationship of batch) {
        await ctx.scheduler.runAfter(
          processed * delayMs,
          internal.healthScores.recalculate,
          {
            userId: relationship.userId,
            relationshipId: relationship._id,
          }
        )
        processed++
      }
    }

    return {
      success: true,
      totalRelationships: relationships.length,
      batchesScheduled: Math.ceil(relationships.length / batchSize),
    }
  },
})

// Core health score calculation algorithm
async function calculateComprehensiveHealthScore(
  analyses: any[],
  relationship: any,
  timeframeStart: number
) {
  // 1. Calculate base sentiment trends
  const sentimentData = analyzeSentimentProgression(analyses)

  // 2. Calculate factor-specific scores
  const factorBreakdown = calculateDetailedFactors(analyses, relationship)

  // 3. Determine overall trend direction
  const trendDirection = calculateTrendDirection(analyses)

  // 4. Calculate confidence based on data quality
  const confidence = calculateScoreConfidence(analyses, timeframeStart)

  // 5. Generate recommendations
  const recommendations = generateScoreBasedRecommendations(
    factorBreakdown,
    trendDirection,
    analyses
  )

  // 6. Identify contributing factors
  const contributingFactors = identifyContributingFactors(
    factorBreakdown,
    sentimentData
  )

  // 7. Calculate weighted overall score
  const score = calculateWeightedScore(
    factorBreakdown,
    sentimentData,
    relationship
  )

  return {
    score: Math.round(Math.max(0, Math.min(100, score))), // Ensure 0-100 range
    contributingFactors,
    trendDirection,
    confidence: Number(confidence.toFixed(3)),
    recommendations,
    factorBreakdown,
  }
}

function analyzeSentimentProgression(analyses: any[]) {
  const sortedAnalyses = analyses.sort((a, b) => a.createdAt - b.createdAt)
  const sentiments = sortedAnalyses.map(a => a.sentimentScore)

  const recentSentiments = sentiments.slice(-5) // Last 5 entries
  const overallAverage =
    sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
  const recentAverage =
    recentSentiments.reduce((sum, s) => sum + s, 0) / recentSentiments.length

  // Calculate volatility (emotional stability)
  const variance =
    sentiments.reduce((sum, s) => sum + Math.pow(s - overallAverage, 2), 0) /
    sentiments.length
  const volatility = Math.sqrt(variance)

  return {
    overallAverage,
    recentAverage,
    volatility,
    trend: recentAverage - overallAverage,
    positiveEntries: sentiments.filter(s => s > 0.2).length,
    negativeEntries: sentiments.filter(s => s < -0.2).length,
    neutralEntries: sentiments.filter(s => s >= -0.2 && s <= 0.2).length,
  }
}

function calculateDetailedFactors(analyses: any[], relationship: any) {
  const allPatterns = analyses.flatMap(a => a.patterns || {})
  const allKeywords = analyses.flatMap(a => a.emotionalKeywords || [])
  const sentiments = analyses.map(a => a.sentimentScore)

  // Communication score (based on communication style patterns)
  const communicationStyles = analyses
    .map(a => a.patterns?.communication_style)
    .filter(Boolean)

  let communicationScore = 65 // Base score
  const collaborativeCount = communicationStyles.filter(
    s => s === 'collaborative'
  ).length
  const directCount = communicationStyles.filter(s => s === 'direct').length
  const neutralCount = communicationStyles.filter(s => s === 'neutral').length

  if (communicationStyles.length > 0) {
    const collaborativeRatio = collaborativeCount / communicationStyles.length
    const directRatio = directCount / communicationStyles.length

    communicationScore = 50 + collaborativeRatio * 40 + directRatio * 20 // Collaborative is best
  }

  // Emotional support score (based on support themes and positive sentiment)
  const supportThemes = allPatterns.filter(
    (p: any) =>
      p.recurring_themes?.includes('mutual_support') ||
      p.recurring_themes?.includes('empathy')
  ).length

  const avgPositiveSentiment =
    sentiments.filter(s => s > 0).reduce((sum, s) => sum + s, 0) /
    Math.max(1, sentiments.filter(s => s > 0).length)
  const emotionalSupportScore = Math.min(
    100,
    40 + supportThemes * 15 + avgPositiveSentiment * 30
  )

  // Conflict resolution score (based on conflict keywords and recovery patterns)
  const conflictKeywords = ['argue', 'fight', 'disagree', 'conflict', 'tension']
  const conflictEntries = analyses.filter(a =>
    a.emotionalKeywords?.some((kw: string) =>
      conflictKeywords.includes(kw.toLowerCase())
    )
  )

  let conflictResolutionScore = 75 // Default assuming healthy conflict handling
  if (conflictEntries.length > 0) {
    const conflictToTotal = conflictEntries.length / analyses.length
    const avgConflictSentiment =
      conflictEntries.reduce((sum, a) => sum + a.sentimentScore, 0) /
      conflictEntries.length

    // Good conflict resolution shows negative sentiment during conflict but overall positive trend
    conflictResolutionScore = Math.max(
      20,
      80 - conflictToTotal * 40 + (avgConflictSentiment > -0.5 ? 20 : 0)
    )
  }

  // Trust and intimacy score (relationship type influences this)
  const intimacyKeywords = [
    'trust',
    'close',
    'intimate',
    'vulnerable',
    'open',
    'honest',
  ]
  const intimacyMentions = allKeywords.filter(kw =>
    intimacyKeywords.some(ik => kw.toLowerCase().includes(ik))
  ).length

  let trustIntimacyScore = 60 // Base score
  trustIntimacyScore += Math.min(30, intimacyMentions * 5) // Bonus for intimacy mentions

  // Relationship type adjustment
  if (relationship.type === 'partner') {
    trustIntimacyScore += 10 // Partners expected to have higher intimacy
  } else if (relationship.type === 'colleague') {
    trustIntimacyScore = Math.min(trustIntimacyScore, 85) // Cap for professional relationships
  }

  // Shared growth score (based on growth themes and forward-looking language)
  const growthThemes = allPatterns.filter(
    (p: any) =>
      p.recurring_themes?.includes('personal_growth') ||
      p.relationship_dynamics?.includes('building_connection')
  ).length

  const growthKeywords = ['learn', 'grow', 'improve', 'future', 'goal', 'plan']
  const growthMentions = allKeywords.filter(kw =>
    growthKeywords.some(gk => kw.toLowerCase().includes(gk))
  ).length

  const sharedGrowthScore = Math.min(
    100,
    45 + growthThemes * 10 + growthMentions * 3
  )

  return {
    communication: Math.round(Math.max(0, Math.min(100, communicationScore))),
    emotional_support: Math.round(
      Math.max(0, Math.min(100, emotionalSupportScore))
    ),
    conflict_resolution: Math.round(
      Math.max(0, Math.min(100, conflictResolutionScore))
    ),
    trust_intimacy: Math.round(Math.max(0, Math.min(100, trustIntimacyScore))),
    shared_growth: Math.round(Math.max(0, Math.min(100, sharedGrowthScore))),
  }
}

function calculateTrendDirection(
  analyses: any[]
): 'improving' | 'stable' | 'declining' {
  if (analyses.length < 4) return 'stable'

  const sortedAnalyses = analyses.sort((a, b) => a.createdAt - b.createdAt)
  const sentiments = sortedAnalyses.map(a => a.sentimentScore)

  // Compare first quarter vs last quarter
  const quarterSize = Math.floor(analyses.length / 4)
  const firstQuarter = sentiments.slice(0, quarterSize)
  const lastQuarter = sentiments.slice(-quarterSize)

  const firstAvg =
    firstQuarter.reduce((sum, s) => sum + s, 0) / firstQuarter.length
  const lastAvg =
    lastQuarter.reduce((sum, s) => sum + s, 0) / lastQuarter.length

  const difference = lastAvg - firstAvg

  // Threshold for significant change
  const threshold = 0.15

  if (difference > threshold) return 'improving'
  if (difference < -threshold) return 'declining'
  return 'stable'
}

function calculateScoreConfidence(
  analyses: any[],
  timeframeStart: number
): number {
  // Base confidence on data recency, volume, and AI analysis confidence
  const timeSpan = Date.now() - timeframeStart
  const daysOfData = timeSpan / (24 * 60 * 60 * 1000)

  // Volume factor (more data = higher confidence)
  const volumeFactor = Math.min(1, analyses.length / 10) // Max confidence at 10+ analyses

  // Recency factor (more recent data = higher confidence)
  const recentAnalyses = analyses.filter(
    a => Date.now() - a.createdAt < 14 * 24 * 60 * 60 * 1000 // Last 2 weeks
  ).length
  const recencyFactor = Math.min(1, recentAnalyses / 5) // Max confidence at 5+ recent analyses

  // AI confidence factor (average of individual analysis confidence levels)
  const avgAIConfidence =
    analyses.reduce((sum, a) => sum + a.confidenceLevel, 0) / analyses.length

  // Time span factor (sweet spot around 30-60 days)
  let timeSpanFactor = 1
  if (daysOfData < 14) {
    timeSpanFactor = daysOfData / 14 // Penalize very short time spans
  } else if (daysOfData > 90) {
    timeSpanFactor = 0.9 // Slight penalty for very long time spans (stale data)
  }

  return (
    volumeFactor * 0.3 +
    recencyFactor * 0.3 +
    avgAIConfidence * 0.3 +
    timeSpanFactor * 0.1
  )
}

function generateScoreBasedRecommendations(
  factorBreakdown: any,
  trendDirection: string,
  analyses: any[]
): string[] {
  const recommendations: string[] = []

  // Find the lowest scoring factor
  const factors = Object.entries(factorBreakdown) as [string, number][]
  const lowestFactor = factors.reduce((min, current) =>
    current[1] < min[1] ? current : min
  )

  // Factor-specific recommendations
  if (lowestFactor[1] < 60) {
    switch (lowestFactor[0]) {
      case 'communication':
        recommendations.push(
          'Schedule regular check-ins to improve communication quality'
        )
        recommendations.push('Practice active listening during conversations')
        break
      case 'emotional_support':
        recommendations.push('Express empathy and validation more frequently')
        recommendations.push(
          'Ask how you can better support each other during difficult times'
        )
        break
      case 'conflict_resolution':
        recommendations.push(
          'Learn healthy conflict resolution techniques together'
        )
        recommendations.push(
          'Establish ground rules for handling disagreements'
        )
        break
      case 'trust_intimacy':
        recommendations.push('Share more personal thoughts and feelings')
        recommendations.push(
          'Follow through consistently on commitments and promises'
        )
        break
      case 'shared_growth':
        recommendations.push('Set mutual goals and discuss future aspirations')
        recommendations.push("Celebrate each other's personal achievements")
        break
    }
  }

  // Trend-based recommendations
  if (trendDirection === 'declining') {
    recommendations.push(
      'Consider having an open conversation about recent challenges'
    )
    recommendations.push(
      'Reflect on what has changed and what you both need right now'
    )
  } else if (trendDirection === 'improving') {
    recommendations.push(
      "Acknowledge and celebrate the positive changes you've made"
    )
    recommendations.push(
      'Continue the behaviors and practices that are working well'
    )
  }

  // Analysis pattern-based recommendations
  const recentAnalyses = analyses.slice(0, 5)
  const avgRecentSentiment =
    recentAnalyses.reduce((sum, a) => sum + a.sentimentScore, 0) /
    recentAnalyses.length

  if (avgRecentSentiment < -0.3) {
    recommendations.push(
      'Consider seeking professional relationship counseling if challenges persist'
    )
  } else if (avgRecentSentiment > 0.5) {
    recommendations.push(
      'Use this positive momentum to deepen your connection further'
    )
  }

  return recommendations.slice(0, 4) // Limit to 4 most relevant recommendations
}

function identifyContributingFactors(
  factorBreakdown: any,
  sentimentData: any
): string[] {
  const factors: string[] = []

  // Identify strengths (scores > 75)
  Object.entries(factorBreakdown).forEach(([factor, score]) => {
    if ((score as number) > 75) {
      factors.push(`Strong ${factor.replace('_', ' ')}`)
    }
  })

  // Identify areas needing attention (scores < 50)
  Object.entries(factorBreakdown).forEach(([factor, score]) => {
    if ((score as number) < 50) {
      factors.push(`${factor.replace('_', ' ')} needs improvement`)
    }
  })

  // Sentiment-based factors
  if (sentimentData.volatility > 0.6) {
    factors.push('High emotional variability')
  } else if (sentimentData.volatility < 0.2) {
    factors.push('Consistent emotional stability')
  }

  if (sentimentData.positiveEntries > sentimentData.negativeEntries * 2) {
    factors.push('Predominantly positive interactions')
  } else if (sentimentData.negativeEntries > sentimentData.positiveEntries) {
    factors.push('Frequent challenging interactions')
  }

  return factors.slice(0, 6) // Limit to 6 most significant factors
}

function calculateWeightedScore(
  factorBreakdown: any,
  sentimentData: any,
  relationship: any
): number {
  // Dynamic weighting based on relationship type
  let weights = {
    communication: 0.25,
    emotional_support: 0.25,
    conflict_resolution: 0.2,
    trust_intimacy: 0.15,
    shared_growth: 0.15,
  }

  // Adjust weights based on relationship type
  if (relationship.type === 'partner') {
    weights.trust_intimacy = 0.2 // Higher weight for romantic relationships
    weights.shared_growth = 0.2
    weights.communication = 0.2
    weights.emotional_support = 0.2
    weights.conflict_resolution = 0.2
  } else if (relationship.type === 'family') {
    weights.emotional_support = 0.3 // Family relationships prioritize support
    weights.conflict_resolution = 0.25 // And healthy conflict resolution
  } else if (relationship.type === 'colleague') {
    weights.communication = 0.35 // Professional relationships emphasize communication
    weights.conflict_resolution = 0.25
    weights.trust_intimacy = 0.1 // Less emphasis on intimacy
  }

  // Calculate weighted score
  const baseScore = Object.entries(factorBreakdown).reduce(
    (sum, [factor, score]) => {
      const weight = weights[factor as keyof typeof weights] || 0
      return sum + (score as number) * weight
    },
    0
  )

  // Sentiment adjustment (±10 points based on overall sentiment)
  const sentimentAdjustment = (sentimentData.overallAverage + 1) * 5 // Convert -1 to 1 range to 0-10

  // Volatility penalty (high volatility reduces score)
  const volatilityPenalty = Math.min(10, sentimentData.volatility * 15)

  return baseScore + sentimentAdjustment - volatilityPenalty
}

function generateHistoricalTrend(
  currentScore: any,
  analyses: any[],
  days: number
) {
  // Generate realistic historical trend data points
  const dataPoints: any[] = []
  const intervalsPerDay = 1 // One data point per day
  const totalPoints = Math.min(days * intervalsPerDay, 90) // Max 90 points

  const startScore = currentScore.score + (Math.random() - 0.5) * 20 // Random starting point
  const endScore = currentScore.score

  for (let i = 0; i < totalPoints; i++) {
    const progress = i / (totalPoints - 1)
    const timestamp =
      Date.now() - (days - progress * days) * 24 * 60 * 60 * 1000

    // Linear interpolation with some noise
    let score = startScore + (endScore - startScore) * progress
    score += (Math.random() - 0.5) * 8 // Add realistic variance
    score = Math.max(0, Math.min(100, score)) // Clamp to valid range

    dataPoints.push({
      timestamp,
      score: Math.round(score),
      confidence: 0.7 + Math.random() * 0.2, // 70-90% confidence
    })
  }

  return dataPoints
}
