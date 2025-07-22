import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'
import {
  analyzeRelationshipsNeedingAttention,
  analyzeUserJournalingPattern,
  calculateNextReminderTime,
  generateReminderContent,
  isWithinDoNotDisturbHours,
} from './utils/reminder_logic'

// Get all scheduled reminders for processing
export const getScheduledReminders = query({
  args: { beforeTime: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('reminderLogs')
      .withIndex('by_scheduled_time')
      .filter(q =>
        q.and(
          q.lte(q.field('scheduledTime'), args.beforeTime),
          q.eq(q.field('status'), 'scheduled')
        )
      )
      .collect()
  },
})

// Identify relationships needing attention for a user
export const analyzeUserRelationshipsAttention = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Get user's relationships
    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    if (relationships.length === 0) {
      return []
    }

    // Get health scores for all relationships
    const healthScores = await ctx.db
      .query('healthScores')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    // Get recent journal entries grouped by relationship
    const recentEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    // Analyze which relationships need attention
    const analyses = analyzeRelationshipsNeedingAttention(
      relationships,
      healthScores,
      recentEntries
    )

    return analyses.slice(0, 5) // Return top 5 relationships needing attention
  },
})

// Get user's reminder preferences
export const getUserReminderSettings = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user?.preferences?.reminderSettings) {
      // Return default settings
      return {
        enabled: false,
        frequency: 'daily' as const,
        preferredTime: '09:00',
        timezone: 'UTC',
        doNotDisturbStart: '22:00',
        doNotDisturbEnd: '07:00',
        reminderTypes: {
          gentleNudge: true,
          relationshipFocus: true,
          healthScoreAlerts: false,
        },
      }
    }

    return user.preferences.reminderSettings
  },
})

// Update user's reminder preferences
export const updateReminderSettings = mutation({
  args: {
    userId: v.id('users'),
    settings: v.object({
      enabled: v.boolean(),
      frequency: v.union(
        v.literal('daily'),
        v.literal('every2days'),
        v.literal('weekly')
      ),
      preferredTime: v.string(),
      timezone: v.string(),
      doNotDisturbStart: v.string(),
      doNotDisturbEnd: v.string(),
      reminderTypes: v.object({
        gentleNudge: v.boolean(),
        relationshipFocus: v.boolean(),
        healthScoreAlerts: v.boolean(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const updatedPreferences = {
      ...user.preferences,
      reminderSettings: args.settings,
    }

    await ctx.db.patch(args.userId, {
      preferences: updatedPreferences,
    })

    return { success: true }
  },
})

// Schedule a new reminder for a user
export const scheduleReminder = internalMutation({
  args: {
    userId: v.id('users'),
    reminderType: v.union(
      v.literal('gentle_nudge'),
      v.literal('relationship_focus'),
      v.literal('health_alert')
    ),
    scheduledTime: v.number(),
    targetRelationshipId: v.optional(v.id('relationships')),
    content: v.string(),
    triggerReason: v.string(),
    healthScoreAtTime: v.optional(v.number()),
    daysSinceLastEntry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('reminderLogs', {
      userId: args.userId,
      reminderType: args.reminderType,
      targetRelationshipId: args.targetRelationshipId,
      scheduledTime: args.scheduledTime,
      status: 'scheduled',
      content: args.content,
      metadata: {
        triggerReason: args.triggerReason,
        healthScoreAtTime: args.healthScoreAtTime,
        daysSinceLastEntry: args.daysSinceLastEntry,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Mark reminder as delivered
export const markReminderDelivered = internalMutation({
  args: { reminderId: v.id('reminderLogs') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, {
      status: 'delivered',
      deliveredTime: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Mark reminder as clicked (user engaged)
export const markReminderClicked = mutation({
  args: { reminderId: v.id('reminderLogs') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, {
      status: 'clicked',
      updatedAt: Date.now(),
    })

    // Trigger pattern recalculation for this user
    const reminder = await ctx.db.get(args.reminderId)
    if (reminder) {
      await ctx.runMutation(internal.userPatterns.recalculateUserPatterns, {
        userId: reminder.userId,
      })
    }
  },
})

// Mark reminder as dismissed
export const markReminderDismissed = mutation({
  args: { reminderId: v.id('reminderLogs') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, {
      status: 'dismissed',
      updatedAt: Date.now(),
    })
  },
})

// Process scheduled reminders (called by cron job)
export const processScheduledReminders = internalMutation({
  handler: async ctx => {
    const now = Date.now()

    // Get all reminders that should be sent now
    const dueReminders = await ctx.db
      .query('reminderLogs')
      .withIndex('by_scheduled_time')
      .filter(q =>
        q.and(
          q.lte(q.field('scheduledTime'), now),
          q.eq(q.field('status'), 'scheduled')
        )
      )
      .collect()

    let processedCount = 0
    let failedCount = 0

    for (const reminder of dueReminders) {
      try {
        // Get user's current reminder settings to check if still enabled
        const user = await ctx.db.get(reminder.userId)
        const reminderSettings = user?.preferences?.reminderSettings

        if (!reminderSettings?.enabled) {
          // User has disabled reminders, mark as failed
          await ctx.db.patch(reminder._id, {
            status: 'failed',
            updatedAt: now,
          })
          failedCount++
          continue
        }

        // Check if current time is in do not disturb hours
        if (
          isWithinDoNotDisturbHours(
            new Date(now),
            reminderSettings.doNotDisturbStart,
            reminderSettings.doNotDisturbEnd,
            reminderSettings.timezone
          )
        ) {
          // Reschedule for after DND period
          const [endHour, endMin] = reminderSettings.doNotDisturbEnd
            .split(':')
            .map(Number)
          const nextTime = new Date(now)
          nextTime.setHours(endHour, endMin, 0, 0)

          if (nextTime.getTime() <= now) {
            nextTime.setDate(nextTime.getDate() + 1)
          }

          await ctx.db.patch(reminder._id, {
            scheduledTime: nextTime.getTime(),
            updatedAt: now,
          })
          continue
        }

        // Check reminder type permissions
        const typeEnabled =
          reminderSettings.reminderTypes[
            reminder.reminderType === 'gentle_nudge'
              ? 'gentleNudge'
              : reminder.reminderType === 'relationship_focus'
                ? 'relationshipFocus'
                : 'healthScoreAlerts'
          ]

        if (!typeEnabled) {
          await ctx.db.patch(reminder._id, {
            status: 'failed',
            updatedAt: now,
          })
          failedCount++
          continue
        }

        // Mark as delivered (actual notification sending would happen here)
        await ctx.runMutation(internal.notifications.markReminderDelivered, {
          reminderId: reminder._id,
        })

        processedCount++
      } catch (error) {
        // Mark reminder as failed
        await ctx.db.patch(reminder._id, {
          status: 'failed',
          updatedAt: now,
        })
        failedCount++
      }
    }

    return {
      processedCount,
      failedCount,
      totalDue: dueReminders.length,
    }
  },
})

// Generate and schedule smart reminders for a user
export const generateSmartReminders = internalMutation({
  args: { userId: v.id('users') },
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        scheduledCount: number
        patternAnalysis: any
        relationshipsAnalysis: any[]
      }
    | { message: string }
  > => {
    // Get user info
    const user = await ctx.db.get(args.userId)
    if (!user?.preferences?.reminderSettings?.enabled) {
      return { message: 'Reminders disabled for user' }
    }

    const reminderSettings = user.preferences.reminderSettings
    const userName = user.name.split(' ')[0] || 'there'

    // Get user's journaling patterns
    const journalingPattern = await ctx.db
      .query('userPatterns')
      .withIndex('by_user_and_type', q =>
        q.eq('userId', args.userId).eq('patternType', 'journaling_frequency')
      )
      .first()

    const optimalTimingPattern = await ctx.db
      .query('userPatterns')
      .withIndex('by_user_and_type', q =>
        q.eq('userId', args.userId).eq('patternType', 'optimal_timing')
      )
      .first()

    // Get last journal entry
    const lastEntry = await ctx.db
      .query('journalEntries')
      .withIndex('by_user_created', q => q.eq('userId', args.userId))
      .order('desc')
      .first()

    // Analyze user's journaling pattern
    const patternAnalysis = analyzeUserJournalingPattern(
      journalingPattern,
      lastEntry?.createdAt ?? null,
      reminderSettings.timezone
    )

    // Get relationships needing attention directly using the handler logic
    // Get user's relationships
    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    let relationshipsAnalysis: any[] = []

    if (relationships.length > 0) {
      // Get health scores for all relationships
      const healthScores = await ctx.db
        .query('healthScores')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect()

      // Get recent journal entries grouped by relationship
      const recentEntries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect()

      // Analyze which relationships need attention
      relationshipsAnalysis = analyzeRelationshipsNeedingAttention(
        relationships,
        healthScores,
        recentEntries
      ).slice(0, 5) // Return top 5 relationships needing attention
    }

    const scheduledReminders: Id<'reminderLogs'>[] = []

    // Schedule general journaling reminder if user is overdue
    if (
      patternAnalysis.isOverdue &&
      reminderSettings.reminderTypes.gentleNudge
    ) {
      const nextReminderTime = calculateNextReminderTime(
        patternAnalysis,
        reminderSettings
      )

      const content = `Hi ${userName}! It's been ${patternAnalysis.lastEntryDaysAgo} days since your last journal entry. Take a moment to reflect on your relationships - how are you feeling?`

      const reminderId = await ctx.runMutation(
        internal.notifications.scheduleReminder,
        {
          userId: args.userId,
          reminderType: 'gentle_nudge',
          scheduledTime: nextReminderTime,
          content,
          triggerReason: `User overdue by ${patternAnalysis.overdueBy} days`,
          daysSinceLastEntry: patternAnalysis.lastEntryDaysAgo,
        }
      )

      scheduledReminders.push(reminderId)
    }

    // Schedule relationship-specific reminders
    const topRelationships = relationshipsAnalysis.slice(0, 2) // Top 2 most urgent

    for (const analysis of topRelationships) {
      const typeEnabled =
        reminderSettings.reminderTypes[
          analysis.suggestedReminderType === 'gentle_nudge'
            ? 'gentleNudge'
            : analysis.suggestedReminderType === 'relationship_focus'
              ? 'relationshipFocus'
              : 'healthScoreAlerts'
        ]

      if (typeEnabled && analysis.urgencyScore > 30) {
        const nextReminderTime =
          calculateNextReminderTime(patternAnalysis, reminderSettings) +
          scheduledReminders.length * 60 * 60 * 1000 // Stagger by 1 hour

        // Get relationship details for content generation
        const relationship = relationships.find(
          r => r._id === analysis.relationshipId
        )
        const relationshipType = relationship?.type || 'other'

        // Get user's engagement score
        const engagementPattern = await ctx.db
          .query('userPatterns')
          .withIndex('by_user_and_type', q =>
            q.eq('userId', args.userId).eq('patternType', 'engagement_response')
          )
          .first()

        const userEngagementScore =
          engagementPattern?.analysisData.engagementScore

        const content = generateReminderContent(
          analysis,
          userName,
          relationshipType,
          userEngagementScore
        )

        const reminderId = await ctx.runMutation(
          internal.notifications.scheduleReminder,
          {
            userId: args.userId,
            reminderType: analysis.suggestedReminderType,
            scheduledTime: nextReminderTime,
            targetRelationshipId: analysis.relationshipId,
            content,
            triggerReason: analysis.reminderReason,
            healthScoreAtTime: analysis.currentHealthScore,
            daysSinceLastEntry: analysis.daysSinceLastEntry,
          }
        )

        scheduledReminders.push(reminderId)
      }
    }

    return {
      scheduledCount: scheduledReminders.length,
      patternAnalysis,
      relationshipsAnalysis: relationshipsAnalysis.slice(0, 3),
    }
  },
})

// Get reminder history for a user
export const getUserReminderHistory = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    return await ctx.db
      .query('reminderLogs')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
  },
})

// Get reminder analytics for a user
export const getUserReminderAnalytics = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query('reminderLogs')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect()

    if (reminders.length === 0) {
      return {
        totalReminders: 0,
        deliveredReminders: 0,
        clickedReminders: 0,
        dismissedReminders: 0,
        clickThroughRate: 0,
        engagementScore: 50,
      }
    }

    const delivered = reminders.filter(
      r =>
        r.status === 'delivered' ||
        r.status === 'clicked' ||
        r.status === 'dismissed'
    ).length
    const clicked = reminders.filter(r => r.status === 'clicked').length
    const dismissed = reminders.filter(r => r.status === 'dismissed').length

    return {
      totalReminders: reminders.length,
      deliveredReminders: delivered,
      clickedReminders: clicked,
      dismissedReminders: dismissed,
      clickThroughRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      engagementScore:
        delivered > 0
          ? Math.round(((clicked - dismissed * 0.5) / delivered) * 100)
          : 50,
    }
  },
})

// Generate smart reminders for all users (called by cron job)
export const generateDailyReminders = internalMutation({
  handler: async (
    ctx
  ): Promise<{
    processedUsers: number
    totalScheduledReminders: number
    failedUsers: number
  }> => {
    // Get all users with enabled reminder settings
    const users = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('preferences.reminderSettings.enabled'), true))
      .collect()

    let processedUsers = 0
    let totalScheduledReminders = 0
    let failedUsers = 0

    const batchSize = 20

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async user => {
          try {
            const result = await ctx.runMutation(
              internal.notifications.generateSmartReminders,
              {
                userId: user._id,
              }
            )

            if (typeof result === 'object' && 'scheduledCount' in result) {
              totalScheduledReminders += result.scheduledCount
              processedUsers++
            } else {
              // User has disabled reminders or other issue
              processedUsers++
            }
          } catch (error) {
            console.error(
              `Failed to generate reminders for user ${user._id}:`,
              error
            )
            failedUsers++
          }
        })
      )
    }

    return {
      processedUsers,
      totalScheduledReminders,
      failedUsers,
    }
  },
})
