/**
 * Convex functions for chart data and insights
 */

import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { Doc, Id } from './_generated/dataModel'

/**
 * Get trend data for charts with caching
 */
export const getTrendData = query({
  args: {
    userId: v.id('users'),
    relationshipIds: v.optional(v.array(v.id('relationships'))),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
      granularity: v.union(
        v.literal('daily'),
        v.literal('weekly'),
        v.literal('monthly')
      ),
    }),
    analyticsType: v.union(
      v.literal('sentiment_trend'),
      v.literal('health_score_trend'),
      v.literal('pattern_analysis')
    ),
  },
  handler: async (ctx, args) => {
    // Check for cached results first
    const cached = await ctx.db
      .query('trendAnalytics')
      .withIndex('by_user_and_type', q =>
        q.eq('userId', args.userId).eq('analyticsType', args.analyticsType)
      )
      .filter(q =>
        q.and(
          q.gte(q.field('cacheExpiresAt'), Date.now()),
          q.eq(q.field('timeframe.startDate'), args.timeRange.start),
          q.eq(q.field('timeframe.endDate'), args.timeRange.end),
          q.eq(q.field('timeframe.granularity'), args.timeRange.granularity)
        )
      )
      .first()

    if (cached) {
      return cached.computedData
    }

    // Compute fresh data if not cached
    let computedData

    if (args.analyticsType === 'health_score_trend') {
      computedData = await computeHealthScoreTrend(ctx, args)
    } else if (args.analyticsType === 'sentiment_trend') {
      computedData = await computeSentimentTrend(ctx, args)
    } else {
      computedData = await computePatternAnalysis(ctx, args)
    }

    // TODO: Implement caching with a separate mutation
    return computedData
  },
})

/**
 * Get relationship comparison data
 */
export const getRelationshipComparison = query({
  args: {
    userId: v.id('users'),
    relationshipIds: v.array(v.id('relationships')),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const comparisons = await Promise.all(
      args.relationshipIds.map(async relationshipId => {
        // Get health scores for this relationship
        const scores = await ctx.db
          .query('healthScores')
          .withIndex('by_relationship', q =>
            q.eq('relationshipId', relationshipId)
          )
          .filter(q =>
            q.and(
              q.gte(q.field('lastUpdated'), args.timeRange.start),
              q.lte(q.field('lastUpdated'), args.timeRange.end)
            )
          )
          .collect()

        // Get relationship details
        const relationship = await ctx.db.get(relationshipId)
        if (!relationship) return null

        // Format data points
        const data = scores.map(score => ({
          x: score.lastUpdated,
          y: score.overallScore,
        }))

        // Calculate average score
        const averageScore =
          scores.length > 0
            ? scores.reduce((sum: number, s: any) => sum + s.overallScore, 0) /
              scores.length
            : 0

        return {
          relationshipId,
          name: relationship.name,
          type: relationship.type,
          photo: relationship.photo,
          data,
          averageScore: Math.round(averageScore * 100) / 100,
        }
      })
    )

    return comparisons.filter(Boolean)
  },
})

/**
 * Get user chart preferences
 */
export const getChartPreferences = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('chartPreferences')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first()

    if (!preferences) {
      // Return default preferences
      return {
        dashboardCharts: [
          {
            chartType: 'health_score_trend' as const,
            position: { row: 0, col: 0 },
            size: { width: 2, height: 1 },
            config: {
              timeRange: 'month' as const,
              selectedRelationships: [],
              showTrendLines: true,
              showAnnotations: true,
              showMovingAverage: false,
              movingAverageWindow: 7,
            },
          },
          {
            chartType: 'sentiment_trend' as const,
            position: { row: 1, col: 0 },
            size: { width: 2, height: 1 },
            config: {
              timeRange: 'month' as const,
              selectedRelationships: [],
              showTrendLines: true,
              showAnnotations: false,
              showMovingAverage: true,
              movingAverageWindow: 7,
            },
          },
        ],
        exportPreferences: {
          defaultFormat: 'png' as const,
          includeData: false,
          highResolution: true,
        },
      }
    }

    return preferences
  },
})

/**
 * Update chart preferences
 */
export const updateChartPreferences = mutation({
  args: {
    userId: v.id('users'),
    preferences: v.object({
      dashboardCharts: v.array(
        v.object({
          chartType: v.union(
            v.literal('sentiment_trend'),
            v.literal('health_score_trend'),
            v.literal('relationship_comparison'),
            v.literal('correlation_analysis')
          ),
          position: v.object({ row: v.number(), col: v.number() }),
          size: v.object({ width: v.number(), height: v.number() }),
          config: v.object({
            timeRange: v.union(
              v.literal('week'),
              v.literal('month'),
              v.literal('quarter'),
              v.literal('year'),
              v.literal('custom')
            ),
            selectedRelationships: v.array(v.id('relationships')),
            showTrendLines: v.boolean(),
            showAnnotations: v.boolean(),
            showMovingAverage: v.optional(v.boolean()),
            movingAverageWindow: v.optional(v.number()),
          }),
        })
      ),
      exportPreferences: v.object({
        defaultFormat: v.union(v.literal('png'), v.literal('pdf')),
        includeData: v.boolean(),
        highResolution: v.boolean(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('chartPreferences')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.preferences,
        updatedAt: Date.now(),
      })
      return existing._id
    } else {
      return await ctx.db.insert('chartPreferences', {
        userId: args.userId,
        ...args.preferences,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  },
})

/**
 * Invalidate cached analytics
 */
export const invalidateAnalyticsCache = mutation({
  args: {
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
    analyticsType: v.optional(
      v.union(
        v.literal('sentiment_trend'),
        v.literal('health_score_trend'),
        v.literal('pattern_analysis')
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('trendAnalytics')
      .withIndex('by_user', q => q.eq('userId', args.userId))

    if (args.relationshipId) {
      query = query.filter(q =>
        q.eq(q.field('relationshipId'), args.relationshipId)
      )
    }

    if (args.analyticsType) {
      query = query.filter(q =>
        q.eq(q.field('analyticsType'), args.analyticsType)
      )
    }

    const records = await query.collect()

    // Mark all matching records as expired
    await Promise.all(
      records.map(record =>
        ctx.db.patch(record._id, {
          cacheExpiresAt: Date.now() - 1, // Expire immediately
        })
      )
    )

    return records.length
  },
})

/**
 * Helper function to compute health score trends
 */
async function computeHealthScoreTrend(
  ctx: any,
  args: {
    userId: Id<'users'>
    relationshipIds?: Id<'relationships'>[]
    timeRange: any
  }
) {
  let query = ctx.db
    .query('healthScores')
    .withIndex('by_user', (q: any) => q.eq('userId', args.userId))

  if (args.relationshipIds && args.relationshipIds.length > 0) {
    // For now, just use the first relationship ID
    const relationshipId = args.relationshipIds[0]
    query = ctx.db
      .query('healthScores')
      .withIndex('by_relationship', (q: any) =>
        q.eq('relationshipId', relationshipId)
      )
  }

  const healthScores = await query
    .filter((q: unknown) =>
      (q as any).and(
        (q as any).gte((q as any).field('lastUpdated'), args.timeRange.start),
        (q as any).lte((q as any).field('lastUpdated'), args.timeRange.end)
      )
    )
    .collect()

  const dataPoints = healthScores.map((score: Doc<'healthScores'>) => ({
    timestamp: score.lastUpdated,
    value: score.overallScore,
    metadata: {
      entryCount: score.dataPoints,
      significantEvents: [],
      factors: {
        communication: score.componentScores.sentiment,
        trust: score.componentScores.emotionalStability,
        satisfaction: score.componentScores.energyImpact,
        growth: score.componentScores.gratitude,
      },
    },
  }))

  // Calculate statistics
  const values = dataPoints.map((p: any) => p.value)
  const average =
    values.length > 0
      ? values.reduce((sum: number, val: number) => sum + val, 0) /
        values.length
      : 0
  const min = values.length > 0 ? Math.min(...values) : 0
  const max = values.length > 0 ? Math.max(...values) : 0

  // Calculate trend direction
  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (values.length >= 2) {
    const firstHalf = values.slice(0, Math.ceil(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg =
      firstHalf.reduce((sum: number, val: number) => sum + val, 0) /
      firstHalf.length
    const secondAvg =
      secondHalf.reduce((sum: number, val: number) => sum + val, 0) /
      secondHalf.length

    if (secondAvg > firstAvg + 2) trend = 'improving'
    else if (secondAvg < firstAvg - 2) trend = 'declining'
  }

  // Calculate volatility (standard deviation)
  const variance =
    values.length > 0
      ? values.reduce(
          (sum: number, val: number) => sum + Math.pow(val - average, 2),
          0
        ) / values.length
      : 0
  const volatility = Math.sqrt(variance)

  return {
    dataPoints,
    statistics: {
      average: Math.round(average * 100) / 100,
      trend,
      volatility: Math.round(volatility * 100) / 100,
      bestPeriod: { start: args.timeRange.start, end: args.timeRange.end },
      worstPeriod: { start: args.timeRange.start, end: args.timeRange.end },
    },
    patterns: [],
  }
}

/**
 * Helper function to compute sentiment trends
 */
async function computeSentimentTrend(
  ctx: any,
  args: {
    userId: Id<'users'>
    relationshipIds?: Id<'relationships'>[]
    timeRange: any
  }
) {
  // For sentiment trends, we look at AI analysis results
  const aiAnalysis = await ctx.db
    .query('aiAnalysis')
    .withIndex('by_user_and_type', (q: any) =>
      q.eq('userId', args.userId).eq('analysisType', 'sentiment')
    )
    .filter((q: unknown) =>
      (q as any).and(
        (q as any).gte((q as any).field('createdAt'), args.timeRange.start),
        (q as any).lte((q as any).field('createdAt'), args.timeRange.end)
      )
    )
    .collect()

  const dataPoints = aiAnalysis.map((analysis: Doc<'aiAnalysis'>) => ({
    timestamp: analysis.createdAt,
    value: (analysis.analysisResults.sentimentScore || 5) * 10, // Convert 1-10 to 0-100
    metadata: {
      entryCount: 1,
      significantEvents: [],
    },
  }))

  // Calculate basic statistics
  const values = dataPoints.map((p: any) => p.value)
  const average =
    values.length > 0
      ? values.reduce((sum: number, val: number) => sum + val, 0) /
        values.length
      : 50

  return {
    dataPoints,
    statistics: {
      average: Math.round(average * 100) / 100,
      trend: 'stable' as const,
      volatility: 0,
      bestPeriod: { start: args.timeRange.start, end: args.timeRange.end },
      worstPeriod: { start: args.timeRange.start, end: args.timeRange.end },
    },
    patterns: [],
  }
}

/**
 * Helper function to compute pattern analysis
 */
async function computePatternAnalysis(
  ctx: any,
  args: { userId: Id<'users'>; timeRange: any }
) {
  // Placeholder for pattern analysis
  return {
    dataPoints: [],
    statistics: {
      average: 0,
      trend: 'stable' as const,
      volatility: 0,
      bestPeriod: { start: args.timeRange.start, end: args.timeRange.end },
      worstPeriod: { start: args.timeRange.start, end: args.timeRange.end },
    },
    patterns: [],
  }
}
