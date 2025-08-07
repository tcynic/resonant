import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'
import { MutationCtx } from './_generated/server'

// Get user's journaling patterns
export const getUserPattern = query({
  args: {
    userId: v.id('users'),
    patternType: v.union(
      v.literal('journaling_frequency'),
      v.literal('optimal_timing'),
      v.literal('engagement_response')
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userPatterns')
      .withIndex('by_user_and_type', q =>
        q.eq('userId', args.userId).eq('patternType', args.patternType)
      )
      .first()
  },
})

// Helper function to calculate journaling frequency
async function _calculateJournalingFrequency(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<Id<'userPatterns'>> {
  // Get all journal entries for user, ordered by creation date
  const entries = await ctx.db
    .query('journalEntries')
    .withIndex('by_user_created', q => q.eq('userId', userId))
    .collect()

  if (entries.length < 2) {
    // Not enough data for pattern analysis
    return await ctx.db.insert('userPatterns', {
      userId: userId,
      patternType: 'journaling_frequency',
      analysisData: {
        averageDaysBetweenEntries: undefined,
        mostActiveHours: undefined,
        bestResponseTimes: undefined,
        engagementScore: undefined,
        lastCalculated: Date.now(),
      },
      confidenceLevel: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  // Calculate average days between entries
  const intervals: number[] = []
  for (let i = 1; i < entries.length; i++) {
    const daysBetween =
      (entries[i].createdAt - entries[i - 1].createdAt) / (1000 * 60 * 60 * 24)
    intervals.push(daysBetween)
  }

  const averageDaysBetween =
    intervals.reduce((sum, days) => sum + days, 0) / intervals.length

  // Analyze most active hours
  const hourCounts: Record<number, number> = {}
  entries.forEach(entry => {
    const hour = new Date(entry.createdAt).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  const mostActiveHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // Calculate confidence based on data points
  const confidenceLevel = Math.min(entries.length / 20, 1) // Full confidence at 20+ entries

  // Upsert the pattern
  const existingPattern = await ctx.db
    .query('userPatterns')
    .withIndex('by_user_and_type', q =>
      q.eq('userId', userId).eq('patternType', 'journaling_frequency')
    )
    .first()

  const patternData = {
    userId: userId,
    patternType: 'journaling_frequency' as const,
    analysisData: {
      averageDaysBetweenEntries: averageDaysBetween,
      mostActiveHours,
      bestResponseTimes: undefined,
      engagementScore: undefined,
      lastCalculated: Date.now(),
    },
    confidenceLevel,
    updatedAt: Date.now(),
  }

  if (existingPattern) {
    await ctx.db.patch(existingPattern._id, patternData)
    return existingPattern._id
  } else {
    return await ctx.db.insert('userPatterns', {
      ...patternData,
      createdAt: Date.now(),
    })
  }
}

// Calculate journaling frequency patterns for a user
export const calculateJournalingFrequency = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await _calculateJournalingFrequency(ctx, args.userId)
  },
})

// Helper function to calculate optimal timing
async function _calculateOptimalTiming(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<Id<'userPatterns'>> {
  // Get reminder logs to analyze engagement patterns
  const reminderLogs = await ctx.db
    .query('reminderLogs')
    .withIndex('by_user', q => q.eq('userId', userId))
    .order('desc')
    .take(100) // Analyze last 100 reminders
    .then(logs => logs || [])

  if (reminderLogs.length < 5) {
    // Not enough data for pattern analysis
    return await ctx.db.insert('userPatterns', {
      userId: userId,
      patternType: 'optimal_timing',
      analysisData: {
        averageDaysBetweenEntries: undefined,
        mostActiveHours: undefined,
        bestResponseTimes: undefined,
        engagementScore: undefined,
        lastCalculated: Date.now(),
      },
      confidenceLevel: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  // Analyze engagement by time of day
  const timeEngagement: Record<string, { total: number; clicked: number }> = {}

  reminderLogs.forEach(log => {
    if (log.scheduledTime) {
      const time = new Date(log.scheduledTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      if (time) {
        if (!timeEngagement[time]) {
          timeEngagement[time] = { total: 0, clicked: 0 }
        }
        timeEngagement[time].total++
        if (log.status === 'clicked') {
          timeEngagement[time].clicked++
        }
      }
    }
  })

  // Find best response times (>50% click-through rate with at least 3 samples)
  const bestResponseTimes = Object.entries(timeEngagement)
    .filter(([_, data]) => data.total >= 3 && data.clicked / data.total > 0.5)
    .sort(([, a], [, b]) => b.clicked / b.total - a.clicked / a.total)
    .slice(0, 3)
    .map(([time]) => time)

  // Calculate overall engagement score
  const totalReminders = reminderLogs.length
  const clickedReminders = reminderLogs.filter(
    log => log.status === 'clicked'
  ).length
  const engagementScore = Math.round((clickedReminders / totalReminders) * 100)

  const confidenceLevel = Math.min(reminderLogs.length / 30, 1) // Full confidence at 30+ reminders

  // Upsert the pattern
  const existingPattern = await ctx.db
    .query('userPatterns')
    .withIndex('by_user_and_type', q =>
      q.eq('userId', userId).eq('patternType', 'optimal_timing')
    )
    .first()

  const patternData = {
    userId: userId,
    patternType: 'optimal_timing' as const,
    analysisData: {
      averageDaysBetweenEntries: undefined,
      mostActiveHours: undefined,
      bestResponseTimes,
      engagementScore,
      lastCalculated: Date.now(),
    },
    confidenceLevel,
    updatedAt: Date.now(),
  }

  if (existingPattern) {
    await ctx.db.patch(existingPattern._id, patternData)
    return existingPattern._id
  } else {
    return await ctx.db.insert('userPatterns', {
      ...patternData,
      createdAt: Date.now(),
    })
  }
}

// Calculate optimal timing patterns based on reminder engagement
export const calculateOptimalTiming = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await _calculateOptimalTiming(ctx, args.userId)
  },
})

// Helper function to calculate engagement response
async function _calculateEngagementResponse(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<Id<'userPatterns'>> {
  // Get all reminder logs for the user
  const reminderLogs = await ctx.db
    .query('reminderLogs')
    .withIndex('by_user', q => q.eq('userId', userId))
    .order('desc')
    .take(50)
    .then(logs => logs || [])

  if (reminderLogs.length < 3) {
    // Not enough data for pattern analysis
    return await ctx.db.insert('userPatterns', {
      userId: userId,
      patternType: 'engagement_response',
      analysisData: {
        averageDaysBetweenEntries: undefined,
        mostActiveHours: undefined,
        bestResponseTimes: undefined,
        engagementScore: undefined,
        lastCalculated: Date.now(),
      },
      confidenceLevel: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  // Calculate overall engagement score
  const clickedCount = reminderLogs.filter(
    log => log.status === 'clicked'
  ).length
  const dismissedCount = reminderLogs.filter(
    log => log.status === 'dismissed'
  ).length
  const deliveredCount = reminderLogs.filter(
    log => log.status === 'delivered'
  ).length

  const engagementScore = Math.round((clickedCount / reminderLogs.length) * 100)

  const confidenceLevel = Math.min(reminderLogs.length / 20, 1) // Full confidence at 20+ reminders

  // Upsert the pattern
  const existingPattern = await ctx.db
    .query('userPatterns')
    .withIndex('by_user_and_type', q =>
      q.eq('userId', userId).eq('patternType', 'engagement_response')
    )
    .first()

  const patternData = {
    userId: userId,
    patternType: 'engagement_response' as const,
    analysisData: {
      averageDaysBetweenEntries: undefined,
      mostActiveHours: undefined,
      bestResponseTimes: undefined,
      engagementScore,
      lastCalculated: Date.now(),
    },
    confidenceLevel,
    updatedAt: Date.now(),
  }

  if (existingPattern) {
    await ctx.db.patch(existingPattern._id, patternData)
    return existingPattern._id
  } else {
    return await ctx.db.insert('userPatterns', {
      ...patternData,
      createdAt: Date.now(),
    })
  }
}

// Calculate engagement response patterns
export const calculateEngagementResponse = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await _calculateEngagementResponse(ctx, args.userId)
  },
})

// Recalculate all patterns for a user
export const recalculateUserPatterns = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args): Promise<string> => {
    // Directly call the helper functions to avoid circular dependency
    await Promise.all([
      _calculateJournalingFrequency(ctx, args.userId),
      _calculateOptimalTiming(ctx, args.userId),
      _calculateEngagementResponse(ctx, args.userId),
    ])

    return `Recalculated patterns for user ${args.userId}`
  },
})

// Scheduled function to recalculate patterns for all users (called weekly)
export const recalculateAllUserPatterns = internalMutation({
  handler: async (ctx): Promise<string> => {
    // Get all users
    const users = await ctx.db.query('users').collect()

    const batchSize = 10
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)

      await Promise.all(
        batch.map(user =>
          // Directly call the helper functions to avoid circular dependency
          Promise.all([
            _calculateJournalingFrequency(ctx, user._id),
            _calculateOptimalTiming(ctx, user._id),
            _calculateEngagementResponse(ctx, user._id),
          ])
        )
      )
    }

    return `Recalculated patterns for ${users.length} users`
  },
})
