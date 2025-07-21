/**
 * Dashboard-specific Convex queries for health score visualization
 */

import { v } from 'convex/values'
import { query, QueryCtx } from './_generated/server'
import { Id } from './_generated/dataModel'

// Get comprehensive dashboard data for user
export const getDashboardData = query({
  args: { userId: v.id('users') },
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'> }) => {
    // Get user's relationships
    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .collect()

    // Get health scores for all relationships efficiently
    const relationshipIds = relationships.map(rel => rel._id)
    const allHealthScores = await ctx.db
      .query('healthScores')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .collect()

    // Create a map for efficient lookup
    const healthScoreMap = new Map()
    allHealthScores.forEach(score => {
      const existing = healthScoreMap.get(score.relationshipId)
      if (!existing || score.lastUpdated > existing.lastUpdated) {
        healthScoreMap.set(score.relationshipId, score)
      }
    })

    const healthScores = relationships.map(
      rel => healthScoreMap.get(rel._id) || null
    )

    // Get recent journal entries (last 10)
    const recentEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .order('desc')
      .take(10)

    // Combine relationships with their health scores
    const relationshipsWithScores = relationships.map((relationship, index) => {
      const healthScore = healthScores[index]
      return {
        ...relationship,
        healthScore,
      }
    })

    // Calculate summary statistics
    const validScores = healthScores.filter(score => score !== null)
    const averageScore =
      validScores.length > 0
        ? Math.round(
            validScores.reduce((sum, score) => sum + score!.overallScore, 0) /
              validScores.length
          )
        : 0

    const totalDataPoints = validScores.reduce(
      (sum, score) => sum + (score?.dataPoints || 0),
      0
    )

    return {
      relationships: relationshipsWithScores,
      recentEntries,
      summary: {
        totalRelationships: relationships.length,
        trackedRelationships: validScores.length,
        averageHealthScore: averageScore,
        totalAnalyses: totalDataPoints,
        lastUpdated: Math.max(
          ...validScores.map(score => score?.lastUpdated || 0),
          ...recentEntries.map(entry => entry.updatedAt)
        ),
      },
    }
  },
})

// Get paginated journal entries with filtering
export const getFilteredJournalEntries = query({
  args: {
    userId: v.id('users'),
    relationshipIds: v.optional(v.array(v.id('relationships'))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>
      relationshipIds?: Id<'relationships'>[]
      startDate?: number
      endDate?: number
      searchTerm?: string
      limit?: number
      cursor?: string
    }
  ) => {
    const limit = args.limit || 20

    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))

    // Apply filters
    query = query.filter((q: any) => {
      let filters = []

      // Date range filter
      if (args.startDate) {
        filters.push(q.gte(q.field('createdAt'), args.startDate))
      }
      if (args.endDate) {
        filters.push(q.lte(q.field('createdAt'), args.endDate))
      }

      // Relationship filter
      if (args.relationshipIds && args.relationshipIds.length > 0) {
        const relationshipFilter = args.relationshipIds.map(id =>
          q.eq(q.field('relationshipId'), id)
        )
        if (relationshipFilter.length === 1) {
          filters.push(relationshipFilter[0])
        } else {
          filters.push(q.or(...relationshipFilter))
        }
      }

      // Search term filter (basic text search in content)
      if (args.searchTerm) {
        // Note: This is a simple contains search. For production, consider full-text search
        // For now, we'll skip text search as Convex doesn't have built-in contains
        // This would need to be implemented with a more sophisticated search solution
      }

      return filters.length > 0 ? q.and(...filters) : true
    })

    const entries = await query.order('desc').take(limit + 1) // Take one extra to check if there are more

    const hasMore = entries.length > limit
    const results = hasMore ? entries.slice(0, limit) : entries

    // Get relationship names for the entries
    const relationshipIds = [
      ...new Set(results.map(entry => entry.relationshipId)),
    ]
    const relationships = await Promise.all(
      relationshipIds.map(id => ctx.db.get(id))
    )

    const relationshipMap = new Map(
      relationships.filter(Boolean).map(rel => [rel!._id, rel!.name])
    )

    // Enhance entries with relationship names
    const enhancedEntries = results.map(entry => ({
      ...entry,
      relationshipName: relationshipMap.get(entry.relationshipId) || 'Unknown',
    }))

    return {
      entries: enhancedEntries,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]._id : null,
    }
  },
})

// Get health score trends for visualization
export const getDashboardTrends = query({
  args: {
    userId: v.id('users'),
    relationshipIds: v.optional(v.array(v.id('relationships'))),
    timeRangeDays: v.optional(v.number()),
    granularity: v.optional(
      v.union(v.literal('day'), v.literal('week'), v.literal('month'))
    ),
  },
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>
      relationshipIds?: Id<'relationships'>[]
      timeRangeDays?: number
      granularity?: 'day' | 'week' | 'month'
    }
  ) => {
    const timeRange = args.timeRangeDays || 30
    const granularity = args.granularity || 'week'
    const cutoffTime = Date.now() - timeRange * 24 * 60 * 60 * 1000

    // Get relationships to track
    let relationshipIds = args.relationshipIds
    if (!relationshipIds) {
      const relationships = await ctx.db
        .query('relationships')
        .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
        .collect()
      relationshipIds = relationships.map(rel => rel._id)
    }

    // Get sentiment analyses for the specified relationships and time range
    const analysesPromises = relationshipIds.map(relationshipId =>
      ctx.db
        .query('aiAnalysis')
        .withIndex('by_relationship', (q: any) =>
          q.eq('relationshipId', relationshipId)
        )
        .filter((q: any) =>
          q.and(
            q.eq(q.field('analysisType'), 'sentiment'),
            q.gte(q.field('createdAt'), cutoffTime)
          )
        )
        .collect()
    )

    const allAnalyses = (await Promise.all(analysesPromises)).flat()

    // Get relationship names
    const relationships = await Promise.all(
      relationshipIds.map(id => ctx.db.get(id))
    )
    const relationshipMap = new Map(
      relationships.filter(Boolean).map(rel => [rel!._id, rel!.name])
    )

    // Group analyses by time period
    const timeGroupSize =
      granularity === 'day'
        ? 24 * 60 * 60 * 1000
        : granularity === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000 // month

    const groupedData = allAnalyses.reduce(
      (acc, analysis) => {
        const timeGroup =
          Math.floor(analysis.createdAt / timeGroupSize) * timeGroupSize
        const relationshipId = analysis.relationshipId

        if (!acc[timeGroup]) {
          acc[timeGroup] = {}
        }
        if (!acc[timeGroup][relationshipId]) {
          acc[timeGroup][relationshipId] = {
            scores: [],
            relationshipName: relationshipMap.get(relationshipId) || 'Unknown',
          }
        }

        if (analysis.analysisResults.sentimentScore) {
          acc[timeGroup][relationshipId].scores.push(
            analysis.analysisResults.sentimentScore * 10 // Convert 1-10 to 10-100
          )
        }

        return acc
      },
      {} as Record<
        string,
        Record<string, { scores: number[]; relationshipName: string }>
      >
    )

    // Calculate averages and format for charting
    const trends = Object.entries(groupedData)
      .map(([timestamp, relationshipData]) => {
        const dataPoint: Record<string, any> = {
          timestamp: parseInt(timestamp),
          date: new Date(parseInt(timestamp)).toISOString(),
        }

        Object.entries(
          relationshipData as Record<
            string,
            { scores: number[]; relationshipName: string }
          >
        ).forEach(([relationshipId, data]) => {
          if (data.scores.length > 0) {
            const average =
              data.scores.reduce((sum, score) => sum + score, 0) /
              data.scores.length
            dataPoint[data.relationshipName] = Math.round(average)
            dataPoint[`${data.relationshipName}_count`] = data.scores.length
          }
        })

        return dataPoint
      })
      .sort((a, b) => a.timestamp - b.timestamp)

    return {
      trends,
      relationshipNames: Array.from(relationshipMap.values()),
      timeRange: {
        start: cutoffTime,
        end: Date.now(),
        granularity,
      },
    }
  },
})

// Get recent activity summary with AI analysis status
export const getRecentActivity = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx: QueryCtx,
    args: { userId: Id<'users'>; limit?: number }
  ) => {
    const limit = args.limit || 10

    // Get recent journal entries
    const recentEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)

    // Get AI analyses for these entries
    const analysisPromises = recentEntries.map(entry =>
      ctx.db
        .query('aiAnalysis')
        .withIndex('by_journal_entry', (q: any) =>
          q.eq('journalEntryId', entry._id)
        )
        .collect()
    )

    const allAnalyses = await Promise.all(analysisPromises)

    // Get relationship names
    const relationshipIds = [
      ...new Set(recentEntries.map(entry => entry.relationshipId)),
    ]
    const relationships = await Promise.all(
      relationshipIds.map(id => ctx.db.get(id))
    )
    const relationshipMap = new Map(
      relationships.filter(Boolean).map(rel => [rel!._id, rel!])
    )

    // Combine entries with their analysis data
    const activityItems = recentEntries.map((entry, index) => {
      const analyses = allAnalyses[index]
      const relationship = relationshipMap.get(entry.relationshipId)

      // Get sentiment analysis if available
      const sentimentAnalysis = analyses.find(
        a => a.analysisType === 'sentiment'
      )
      const sentimentScore = sentimentAnalysis?.analysisResults.sentimentScore

      return {
        ...entry,
        relationship: relationship || null,
        analysisStatus: {
          total: analyses.length,
          hasAnalysis: analyses.length > 0,
          sentimentScore: sentimentScore
            ? Math.round(sentimentScore * 10)
            : null, // Convert to 0-100
          emotions: sentimentAnalysis?.analysisResults.emotions || [],
          confidence: sentimentAnalysis?.analysisResults.confidence || null,
        },
        preview:
          entry.content.substring(0, 150) +
          (entry.content.length > 150 ? '...' : ''),
      }
    })

    return {
      activities: activityItems,
      totalCount: activityItems.length,
      analysisRate:
        activityItems.filter(item => item.analysisStatus.hasAnalysis).length /
        activityItems.length,
    }
  },
})

// Get dashboard overview statistics
export const getDashboardStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'> }) => {
    // Get basic counts
    const [relationships, journalEntries, healthScores] = await Promise.all([
      ctx.db
        .query('relationships')
        .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('journalEntries')
        .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('healthScores')
        .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
        .collect(),
    ])

    // Calculate time-based statistics
    const now = Date.now()
    const lastWeek = now - 7 * 24 * 60 * 60 * 1000
    const lastMonth = now - 30 * 24 * 60 * 60 * 1000

    const recentEntries = journalEntries.filter(
      entry => entry.createdAt >= lastWeek
    )
    const monthlyEntries = journalEntries.filter(
      entry => entry.createdAt >= lastMonth
    )

    // Calculate health score statistics
    const validHealthScores = healthScores.filter(
      score => score.overallScore > 0
    )
    const averageHealthScore =
      validHealthScores.length > 0
        ? Math.round(
            validHealthScores.reduce(
              (sum, score) => sum + score.overallScore,
              0
            ) / validHealthScores.length
          )
        : 0

    // Find trending relationships (improving vs declining)
    const improvingRelationships = healthScores.filter(
      score => score.trendsData?.trendDirection === 'up'
    ).length

    const decliningRelationships = healthScores.filter(
      score => score.trendsData?.trendDirection === 'down'
    ).length

    return {
      totals: {
        relationships: relationships.length,
        journalEntries: journalEntries.length,
        trackedRelationships: validHealthScores.length,
      },
      activity: {
        entriesThisWeek: recentEntries.length,
        entriesThisMonth: monthlyEntries.length,
        averageEntriesPerWeek:
          Math.round(
            (journalEntries.length /
              Math.max(
                1,
                (now - Math.min(...journalEntries.map(e => e.createdAt))) /
                  (7 * 24 * 60 * 60 * 1000)
              )) *
              10
          ) / 10,
      },
      health: {
        averageScore: averageHealthScore,
        improvingRelationships,
        decliningRelationships,
        stableRelationships:
          validHealthScores.length -
          improvingRelationships -
          decliningRelationships,
      },
      lastUpdated: Math.max(
        ...healthScores.map(score => score.lastUpdated),
        ...journalEntries.map(entry => entry.updatedAt)
      ),
    }
  },
})
