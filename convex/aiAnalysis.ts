import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'

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

      // Simulate DSPy analysis (replace with actual DSPy integration)
      const analysisResult = await simulateDSPyAnalysis(
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

// Mock DSPy analysis function (replace with real DSPy + Gemini implementation)
async function simulateDSPyAnalysis(
  content: string,
  relationshipContext: string,
  mood?: string,
  previousAnalyses?: any[]
) {
  // Simulate processing delay (remove in production)
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))

  // Enhanced sentiment analysis simulation
  const positiveWords = [
    'love',
    'happy',
    'joy',
    'great',
    'wonderful',
    'amazing',
    'grateful',
    'excited',
    'proud',
  ]
  const negativeWords = [
    'sad',
    'angry',
    'frustrated',
    'disappointed',
    'hurt',
    'upset',
    'worried',
    'stressed',
  ]
  const conflictWords = [
    'argue',
    'fight',
    'disagree',
    'conflict',
    'tension',
    'misunderstanding',
  ]

  const words = content.toLowerCase().split(/\s+/)
  let sentimentScore = 0
  const emotionalKeywords: string[] = []
  let hasConflict = false

  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) {
      sentimentScore += 0.2
      emotionalKeywords.push(word)
    } else if (negativeWords.some(nw => word.includes(nw))) {
      sentimentScore -= 0.2
      emotionalKeywords.push(word)
    } else if (conflictWords.some(cw => word.includes(cw))) {
      hasConflict = true
      sentimentScore -= 0.1
      emotionalKeywords.push(word)
    }
  })

  // Mood influence
  if (mood) {
    const moodScore = getMoodSentiment(mood)
    sentimentScore = (sentimentScore + moodScore) / 2 // Average with mood
  }

  // Normalize sentiment score to -1 to 1 range
  sentimentScore = Math.max(-1, Math.min(1, sentimentScore))

  // Pattern detection based on content and previous analyses
  const patterns = detectPatterns(
    content,
    relationshipContext,
    previousAnalyses || []
  )

  return {
    sentimentScore: Number(sentimentScore.toFixed(3)),
    emotionalKeywords: [...new Set(emotionalKeywords)].slice(0, 5), // Top 5 unique keywords
    confidenceLevel: Number((0.7 + Math.random() * 0.25).toFixed(3)), // 70-95% confidence
    reasoning: generateReasoning(
      words.length,
      emotionalKeywords.length,
      sentimentScore,
      hasConflict
    ),
    patterns,
    tokensUsed: Math.floor(words.length * 1.3), // Estimate tokens
    apiCost: Number((Math.floor(words.length * 1.3) * 0.00015).toFixed(6)), // Cost estimate
  }
}

function getMoodSentiment(mood: string): number {
  const moodMap: { [key: string]: number } = {
    ecstatic: 1.0,
    joyful: 0.8,
    happy: 0.6,
    content: 0.4,
    calm: 0.2,
    neutral: 0.0,
    concerned: -0.2,
    sad: -0.4,
    frustrated: -0.6,
    angry: -0.8,
    devastated: -1.0,
  }

  return moodMap[mood.toLowerCase()] || 0
}

function detectPatterns(
  content: string,
  relationshipContext: string,
  previousAnalyses: any[]
) {
  const themes: string[] = []
  const triggers: string[] = []

  // Communication style detection
  let communicationStyle = 'neutral'
  if (content.includes('we talked') || content.includes('we discussed')) {
    communicationStyle = 'collaborative'
    themes.push('open_communication')
  } else if (content.includes('I told') || content.includes('I said')) {
    communicationStyle = 'direct'
  }

  // Common themes detection
  if (content.includes('support') || content.includes('help')) {
    themes.push('mutual_support')
  }
  if (content.includes('time together') || content.includes('spent time')) {
    themes.push('quality_time')
  }
  if (content.includes('understand') || content.includes('listen')) {
    themes.push('empathy')
  }

  // Emotional triggers
  if (content.includes('work') || content.includes('job')) {
    triggers.push('work_stress')
  }
  if (content.includes('family') || content.includes('parents')) {
    triggers.push('family_dynamics')
  }

  return {
    recurring_themes: themes,
    emotional_triggers: triggers,
    communication_style: communicationStyle,
    relationship_dynamics: ['building_connection', 'navigating_challenges'],
  }
}

function generateReasoning(
  wordCount: number,
  emotionalWordCount: number,
  sentiment: number,
  hasConflict: boolean
): string {
  let reasoning = `Analyzed ${wordCount} words with ${emotionalWordCount} emotional indicators. `

  if (sentiment > 0.3) {
    reasoning += 'Strong positive sentiment detected. '
  } else if (sentiment < -0.3) {
    reasoning += 'Concerning negative sentiment identified. '
  } else {
    reasoning += 'Balanced emotional tone observed. '
  }

  if (hasConflict) {
    reasoning +=
      'Conflict indicators present, suggesting areas for relationship attention.'
  } else {
    reasoning += 'Communication appears constructive and healthy.'
  }

  return reasoning
}
