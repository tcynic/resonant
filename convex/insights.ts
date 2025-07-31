import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

// Generate insights for a user based on their journal entries and analysis (Epic 4)
export const generateInsights = internalMutation({
  args: {
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
    triggerType: v.string(), // "new_analysis", "pattern_detected", "health_score_change"
  },
  handler: async (ctx, args) => {
    // Get recent AI analyses for context
    const recentAnalyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user_created', q => q.eq('userId', args.userId))
      .order('desc')
      .filter(q => q.eq(q.field('status'), 'completed'))
      .take(20)

    if (recentAnalyses.length < 3) {
      // Need more data to generate meaningful insights
      return { success: false, reason: 'Insufficient data for insights' }
    }

    // Filter by relationship if specified
    const relevantAnalyses = args.relationshipId
      ? recentAnalyses.filter(a => a.relationshipId === args.relationshipId)
      : recentAnalyses

    if (relevantAnalyses.length === 0) {
      return { success: false, reason: 'No relevant analyses found' }
    }

    // Generate different types of insights
    const insights = await generateVariousInsights(
      ctx,
      args.userId,
      args.relationshipId,
      relevantAnalyses
    )

    // Store insights in database
    const insertedInsights: any[] = []
    for (const insight of insights) {
      const insightId = await ctx.db.insert('insights', {
        ...insight,
        userId: args.userId,
        relationshipId: args.relationshipId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      insertedInsights.push(insightId)
    }

    return { success: true, insightsGenerated: insertedInsights.length }
  },
})

// Get active insights for a user
export const getActive = query({
  args: {
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
    type: v.optional(
      v.union(
        v.literal('pattern_recognition'),
        v.literal('improvement_suggestion'),
        v.literal('conversation_starter'),
        v.literal('warning_signal'),
        v.literal('celebration_prompt'),
        v.literal('trend_alert')
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('insights')
      .withIndex('by_user_and_active', q =>
        q.eq('userId', args.userId).eq('status', 'active')
      )
      .order('desc')

    const results = await query.collect()

    // Filter by relationship and type if specified
    return results.filter(insight => {
      if (
        args.relationshipId &&
        insight.relationshipId !== args.relationshipId
      ) {
        return false
      }
      if (args.type && insight.type !== args.type) {
        return false
      }
      return insight.expiresAt > Date.now() // Check not expired
    })
  },
})

// Mark insight as viewed
export const markViewed = mutation({
  args: { insightId: v.id('insights') },
  handler: async (ctx, args) => {
    const insight = await ctx.db.get(args.insightId)
    if (!insight) {
      throw new Error('Insight not found')
    }

    await ctx.db.patch(args.insightId, {
      userInteraction: {
        ...insight.userInteraction,
        viewedAt: Date.now(),
      },
    })

    return { success: true }
  },
})

// Dismiss an insight
export const dismiss = mutation({
  args: { insightId: v.id('insights') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.insightId, {
      status: 'dismissed',
      userInteraction: {
        dismissedAt: Date.now(),
      },
    })

    return { success: true }
  },
})

// Mark insight as acted upon
export const markActedOn = mutation({
  args: {
    insightId: v.id('insights'),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const insight = await ctx.db.get(args.insightId)
    if (!insight) {
      throw new Error('Insight not found')
    }

    await ctx.db.patch(args.insightId, {
      status: 'acted_on',
      userInteraction: {
        ...insight.userInteraction,
        actedOnAt: Date.now(),
        feedback: args.feedback,
      },
    })

    return { success: true }
  },
})

// Rate an insight (1-5 stars)
export const rateInsight = mutation({
  args: {
    insightId: v.id('insights'),
    rating: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const insight = await ctx.db.get(args.insightId)
    if (!insight) {
      throw new Error('Insight not found')
    }

    await ctx.db.patch(args.insightId, {
      userInteraction: {
        ...insight.userInteraction,
        rating: args.rating,
        feedback: args.feedback,
      },
    })

    return { success: true }
  },
})

// Get insights summary for dashboard
export const getSummary = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const allInsights = await ctx.db
      .query('insights')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    const activeInsights = allInsights.filter(
      i => i.status === 'active' && i.expiresAt > Date.now()
    )

    return {
      total: allInsights.length,
      active: activeInsights.length,
      byType: {
        pattern_recognition: activeInsights.filter(
          i => i.type === 'pattern_recognition'
        ).length,
        improvement_suggestion: activeInsights.filter(
          i => i.type === 'improvement_suggestion'
        ).length,
        conversation_starter: activeInsights.filter(
          i => i.type === 'conversation_starter'
        ).length,
        warning_signal: activeInsights.filter(i => i.type === 'warning_signal')
          .length,
        celebration_prompt: activeInsights.filter(
          i => i.type === 'celebration_prompt'
        ).length,
        trend_alert: activeInsights.filter(i => i.type === 'trend_alert')
          .length,
      },
      byPriority: {
        urgent: activeInsights.filter(i => i.priority === 'urgent').length,
        high: activeInsights.filter(i => i.priority === 'high').length,
        medium: activeInsights.filter(i => i.priority === 'medium').length,
        low: activeInsights.filter(i => i.priority === 'low').length,
      },
    }
  },
})

// Clean up expired insights
export const cleanupExpired = internalMutation({
  args: {},
  handler: async ctx => {
    const expiredInsights = await ctx.db
      .query('insights')
      .withIndex('by_expires', q => q.lt('expiresAt', Date.now()))
      .collect()

    let deletedCount = 0
    for (const insight of expiredInsights) {
      await ctx.db.patch(insight._id, { status: 'expired' })
      deletedCount++
    }

    return { deletedCount }
  },
})

// Get trend data for charts
export const getTrendData = query({
  args: {
    userId: v.id('users'),
    relationshipIds: v.optional(v.array(v.id('relationships'))),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
      granularity: v.union(
        v.literal('day'),
        v.literal('week'),
        v.literal('month')
      ),
    }),
    analyticsType: v.union(
      v.literal('sentiment_trend'),
      v.literal('health_score_trend'),
      v.literal('pattern_analysis')
    ),
  },
  handler: async (ctx, args) => {
    // Get journal entries in time range
    const entries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user_created', q =>
        q
          .eq('userId', args.userId)
          .gte('createdAt', args.timeRange.start)
          .lte('createdAt', args.timeRange.end)
      )
      .collect()

    // Filter by relationships if specified
    const filteredEntries = args.relationshipIds
      ? entries.filter(
          entry =>
            entry.relationshipId &&
            args.relationshipIds!.includes(entry.relationshipId)
        )
      : entries

    // Get corresponding AI analyses
    const analyses = await Promise.all(
      filteredEntries.map(async entry => {
        const analysis = await ctx.db
          .query('aiAnalysis')
          .withIndex('by_entry', q => q.eq('entryId', entry._id))
          .first()
        return analysis ? { entry, analysis } : null
      })
    )

    const validAnalyses = analyses.filter(
      (item): item is { entry: any; analysis: any } => item !== null
    )

    // Process data based on analytics type
    switch (args.analyticsType) {
      case 'sentiment_trend':
        return processSentimentTrend(validAnalyses, args.timeRange.granularity)
      case 'health_score_trend':
        return processHealthScoreTrend(
          ctx,
          args.userId,
          args.relationshipIds,
          args.timeRange
        )
      case 'pattern_analysis':
        return processPatternAnalysis(validAnalyses)
      default:
        return { dataPoints: [], metadata: {} }
    }
  },
})

// Get relationship comparison data
export const getRelationshipComparison = query({
  args: {
    userId: v.id('users'),
    relationshipIds: v.array(v.id('relationships')),
    timeRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    metric: v.union(
      v.literal('sentiment'),
      v.literal('health_score'),
      v.literal('entry_frequency')
    ),
  },
  handler: async (ctx, args) => {
    const comparisonData: any[] = []

    for (const relationshipId of args.relationshipIds) {
      const relationship = await ctx.db.get(relationshipId)
      if (!relationship) continue

      const entries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user_created', q => q.eq('userId', args.userId))
        .filter(
          q =>
            q.eq(q.field('relationshipId'), relationshipId) &&
            q.gte(q.field('createdAt'), args.timeRange.start) &&
            q.lte(q.field('createdAt'), args.timeRange.end)
        )
        .collect()

      let value = 0
      if (args.metric === 'entry_frequency') {
        value = entries.length
      } else {
        const analyses = await Promise.all(
          entries.map(entry =>
            ctx.db
              .query('aiAnalysis')
              .withIndex('by_entry', q => q.eq('entryId', entry._id))
              .first()
          )
        )

        const validAnalyses = analyses.filter(Boolean)
        if (validAnalyses.length > 0) {
          if (args.metric === 'sentiment') {
            value =
              validAnalyses.reduce(
                (sum, analysis) => sum + analysis!.sentimentScore,
                0
              ) / validAnalyses.length
          } else if (args.metric === 'health_score') {
            const healthScore = await ctx.db
              .query('healthScores')
              .withIndex('by_relationship', q =>
                q.eq('relationshipId', relationshipId)
              )
              .order('desc')
              .first()
            value = healthScore?.score || 0
          }
        }
      }

      comparisonData.push({
        relationshipId,
        relationshipName: relationship.name,
        value,
        entries: entries.length,
      })
    }

    return comparisonData
  },
})

// Get chart preferences for a user
export const getChartPreferences = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as Id<'users'>)
    if (!user) {
      return {
        theme: 'light',
        showTrendLines: true,
        showAnnotations: false,
        defaultTimeRange: '30d',
        preferredChartTypes: ['sentiment_trend'],
      }
    }

    // Return user preferences or defaults
    return {
      theme: user.preferences?.theme || 'light',
      showTrendLines: true,
      showAnnotations: false,
      defaultTimeRange: '30d',
      preferredChartTypes: ['sentiment_trend', 'health_score_trend'],
    }
  },
})

// Helper function to generate various types of insights
async function generateVariousInsights(
  ctx: any,
  userId: Id<'users'>,
  relationshipId: Id<'relationships'> | undefined,
  analyses: any[]
) {
  const insights: any[] = []

  // Pattern recognition insights
  const patterns = detectPatterns(analyses)
  if (patterns.length > 0) {
    insights.push({
      type: 'pattern_recognition' as const,
      title: 'Recurring Pattern Detected',
      description: `I've noticed ${patterns[0]} appearing in your recent journal entries.`,
      actionableSteps: [
        'Reflect on this pattern in your next journal entry',
        'Consider discussing this observation with your relationship',
        'Monitor how this pattern affects your relationship satisfaction',
      ],
      supportingData: {
        confidence: 0.8,
        dataPoints: analyses.length,
        timeframe: 'last 30 days',
        triggerEvents: [patterns[0]],
      },
      priority: 'medium' as const,
      status: 'active' as const,
    })
  }

  // Sentiment trend insights
  const sentimentTrend = analyzeSentimentTrend(analyses)
  if (sentimentTrend.significant) {
    const isImproving = sentimentTrend.direction > 0
    insights.push({
      type: isImproving
        ? ('celebration_prompt' as const)
        : ('warning_signal' as const),
      title: isImproving
        ? 'Positive Trend Detected!'
        : 'Concerning Trend Noticed',
      description: isImproving
        ? 'Your relationship sentiment has been improving consistently. Keep up the great work!'
        : 'Your relationship sentiment has been declining. This might be a good time to check in.',
      actionableSteps: isImproving
        ? [
            "Acknowledge what's been working well",
            'Express gratitude to your relationship partner',
            "Continue the positive behaviors you've identified",
          ]
        : [
            'Schedule a gentle check-in conversation',
            'Reflect on recent stressors affecting the relationship',
            'Consider seeking support if the trend continues',
          ],
      supportingData: {
        confidence: sentimentTrend.confidence,
        dataPoints: analyses.length,
        timeframe: 'last 30 days',
        triggerEvents: [
          `${Math.abs(sentimentTrend.direction * 100).toFixed(0)}% sentiment change`,
        ],
      },
      priority: isImproving
        ? ('low' as const)
        : sentimentTrend.direction < -0.3
          ? ('high' as const)
          : ('medium' as const),
      status: 'active' as const,
    })
  }

  // Communication style insights
  const communicationInsight = analyzeCommunication(analyses)
  if (communicationInsight) {
    insights.push({
      type: 'improvement_suggestion' as const,
      title: 'Communication Enhancement Opportunity',
      description: communicationInsight.description,
      actionableSteps: communicationInsight.suggestions,
      supportingData: {
        confidence: 0.7,
        dataPoints: analyses.length,
        timeframe: 'recent entries',
        triggerEvents: ['communication_pattern_analysis'],
      },
      priority: 'medium' as const,
      status: 'active' as const,
    })
  }

  // Conversation starter suggestions
  if (analyses.length >= 5) {
    const conversationStarter = generateConversationStarter(analyses)
    insights.push({
      type: 'conversation_starter' as const,
      title: 'Suggested Conversation Topic',
      description: conversationStarter.topic,
      actionableSteps: [
        conversationStarter.approach,
        'Choose a calm, private moment for this conversation',
        'Listen actively and ask follow-up questions',
      ],
      supportingData: {
        confidence: 0.6,
        dataPoints: analyses.length,
        timeframe: 'based on recent patterns',
        triggerEvents: ['conversation_opportunity'],
      },
      priority: 'low' as const,
      status: 'active' as const,
    })
  }

  return insights
}

function detectPatterns(analyses: any[]): string[] {
  const patterns: string[] = []
  const themes = analyses.flatMap(a => a.patterns?.recurring_themes || [])
  const triggers = analyses.flatMap(a => a.patterns?.emotional_triggers || [])

  // Count frequency of themes and triggers
  const themeCount: { [key: string]: number } = {}
  const triggerCount: { [key: string]: number } = {}

  themes.forEach(theme => {
    themeCount[theme] = (themeCount[theme] || 0) + 1
  })

  triggers.forEach(trigger => {
    triggerCount[trigger] = (triggerCount[trigger] || 0) + 1
  })

  // Find patterns that appear in 30%+ of analyses
  const threshold = Math.max(2, Math.floor(analyses.length * 0.3))

  Object.entries(themeCount).forEach(([theme, count]) => {
    if (count >= threshold) {
      patterns.push(`frequent focus on ${theme.replace('_', ' ')}`)
    }
  })

  Object.entries(triggerCount).forEach(([trigger, count]) => {
    if (count >= threshold) {
      patterns.push(
        `recurring ${trigger.replace('_', ' ')} as an emotional trigger`
      )
    }
  })

  return patterns
}

function analyzeSentimentTrend(analyses: any[]) {
  if (analyses.length < 5) {
    return { significant: false, direction: 0, confidence: 0 }
  }

  // Split into first half and second half
  const midpoint = Math.floor(analyses.length / 2)
  const recent = analyses.slice(0, midpoint)
  const older = analyses.slice(midpoint)

  const recentAvg =
    recent.reduce((sum, a) => sum + a.sentimentScore, 0) / recent.length
  const olderAvg =
    older.reduce((sum, a) => sum + a.sentimentScore, 0) / older.length

  const direction = recentAvg - olderAvg
  const significant = Math.abs(direction) > 0.2 // 20% change threshold

  return {
    significant,
    direction,
    confidence: Math.min(1, analyses.length / 10), // Higher confidence with more data
  }
}

function analyzeCommunication(analyses: any[]) {
  const communicationStyles = analyses
    .map(a => a.patterns?.communication_style)
    .filter(Boolean)

  if (communicationStyles.length < 3) return null

  const styleCount: { [key: string]: number } = {}
  communicationStyles.forEach(style => {
    styleCount[style] = (styleCount[style] || 0) + 1
  })

  const dominantStyle = Object.entries(styleCount).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0]

  if (dominantStyle === 'direct') {
    return {
      description:
        'Your communication style tends to be quite direct. Consider incorporating more collaborative language.',
      suggestions: [
        "Try starting conversations with 'How do you feel about...'",
        "Use 'we' language instead of 'you' language",
        'Ask for their perspective before sharing yours',
      ],
    }
  } else if (dominantStyle === 'neutral') {
    return {
      description:
        'Your communication appears somewhat neutral. Adding more emotional expression could deepen your connection.',
      suggestions: [
        'Share your feelings more explicitly',
        'Use specific examples when discussing experiences',
        'Express appreciation and gratitude more frequently',
      ],
    }
  }

  return null
}

function generateConversationStarter(analyses: any[]) {
  const themes = analyses.flatMap(a => a.patterns?.recurring_themes || [])
  const mostCommonTheme = themes.reduce(
    (acc, theme) => {
      acc[theme] = (acc[theme] || 0) + 1
      return acc
    },
    {} as { [key: string]: number }
  )

  const topTheme = Object.entries(mostCommonTheme).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )[0]?.[0]

  const conversationStarters = {
    open_communication: {
      topic: 'How can we continue improving our communication?',
      approach:
        'Share what you appreciate about how you both communicate and explore ways to make it even better.',
    },
    mutual_support: {
      topic: 'How can we better support each other during challenging times?',
      approach:
        'Discuss specific ways you each prefer to receive support and how to recognize when support is needed.',
    },
    quality_time: {
      topic: 'What activities make you feel most connected to me?',
      approach:
        'Explore what quality time means to each of you and plan activities that fulfill those needs.',
    },
    empathy: {
      topic:
        "How do you like to be understood when you're going through something difficult?",
      approach:
        'Share your preferences for emotional support and learn about theirs.',
    },
  }

  return (
    conversationStarters[topTheme as keyof typeof conversationStarters] || {
      topic: "What's one thing you'd like us to focus on in our relationship?",
      approach:
        'Create a safe space for open dialogue about relationship priorities and goals.',
    }
  )
}

// Helper functions for trend data processing
function processSentimentTrend(
  analyses: Array<{ entry: any; analysis: any }>,
  granularity: 'day' | 'week' | 'month'
) {
  if (!analyses || analyses.length === 0) {
    return { dataPoints: [], metadata: { total: 0, average: 0 } }
  }

  const groupedData = new Map()

  analyses.forEach(({ entry, analysis }) => {
    const date = new Date(entry.createdAt)
    let key: string

    switch (granularity) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }

    if (!groupedData.has(key)) {
      groupedData.set(key, { scores: [], count: 0 })
    }

    groupedData.get(key).scores.push(analysis.sentimentScore)
    groupedData.get(key).count++
  })

  const dataPoints = Array.from(groupedData.entries())
    .map(([date, data]) => ({
      timestamp: new Date(date).getTime(),
      date,
      value:
        data.scores.reduce((sum: number, score: number) => sum + score, 0) /
        data.scores.length,
      count: data.count,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)

  const average =
    dataPoints.reduce((sum, point) => sum + point.value, 0) / dataPoints.length

  return {
    dataPoints,
    metadata: {
      total: analyses.length,
      average: isNaN(average) ? 0 : average,
      granularity,
    },
  }
}

async function processHealthScoreTrend(
  ctx: any,
  userId: Id<'users'>,
  relationshipIds: Id<'relationships'>[] | undefined,
  timeRange: { start: number; end: number }
) {
  const healthScores = await ctx.db
    .query('healthScores')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .filter(
      (q: any) =>
        q.gte(q.field('lastCalculated'), timeRange.start) &&
        q.lte(q.field('lastCalculated'), timeRange.end)
    )
    .collect()

  const filteredScores = relationshipIds
    ? healthScores.filter((score: any) =>
        relationshipIds.includes(score.relationshipId)
      )
    : healthScores

  const dataPoints = filteredScores
    .map((score: any) => ({
      timestamp: score.lastCalculated,
      date: new Date(score.lastCalculated).toISOString().split('T')[0],
      value: score.score,
      relationshipId: score.relationshipId,
      confidence: score.confidence,
    }))
    .sort((a: any, b: any) => a.timestamp - b.timestamp)

  return {
    dataPoints,
    metadata: {
      total: filteredScores.length,
      average:
        dataPoints.reduce((sum: number, point: any) => sum + point.value, 0) /
          dataPoints.length || 0,
    },
  }
}

function processPatternAnalysis(
  analyses: Array<{ entry: any; analysis: any }>
) {
  if (!analyses || analyses.length === 0) {
    return { dataPoints: [], metadata: { patterns: [], total: 0 } }
  }

  const patternCount = new Map()
  const themes = analyses.flatMap(
    ({ analysis }) => analysis.patterns?.recurring_themes || []
  )

  themes.forEach(theme => {
    patternCount.set(theme, (patternCount.get(theme) || 0) + 1)
  })

  const sortedPatterns = Array.from(patternCount.entries())
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10) // Top 10 patterns

  const dataPoints = sortedPatterns.map(([pattern, count]) => ({
    label: pattern.replace('_', ' '),
    value: count as number,
    percentage: ((count as number) / analyses.length) * 100,
  }))

  return {
    dataPoints,
    metadata: {
      patterns: sortedPatterns.map(([pattern]) => pattern),
      total: analyses.length,
      uniquePatterns: patternCount.size,
    },
  }
}
