import { Id } from '../_generated/dataModel'

// Types for reminder logic
export interface RelationshipAttentionAnalysis {
  relationshipId: Id<'relationships'>
  relationshipName: string
  urgencyScore: number // 0-100, higher means more urgent
  daysSinceLastEntry: number
  currentHealthScore?: number
  healthTrend: 'improving' | 'declining' | 'stable' | 'unknown'
  suggestedReminderType: 'gentle_nudge' | 'relationship_focus' | 'health_alert'
  reminderReason: string
}

export interface UserJournalingPattern {
  averageDaysBetweenEntries: number
  lastEntryDaysAgo: number
  isOverdue: boolean
  overdueBy: number // Days overdue based on pattern
  recommendedReminderTime: string // "HH:MM" format
  confidence: number // 0-1 based on data quality
}

// Calculate which relationships need attention
export function analyzeRelationshipsNeedingAttention(
  relationships: Array<{
    _id: Id<'relationships'>
    name: string
    userId: Id<'users'>
  }>,
  healthScores: Array<{
    relationshipId: Id<'relationships'>
    overallScore: number
    trendsData?: {
      improving: boolean
      trendDirection: 'up' | 'down' | 'stable'
      changeRate: number
    }
    lastUpdated: number
  }>,
  recentEntries: Array<{
    relationshipId: Id<'relationships'>
    createdAt: number
  }>
): RelationshipAttentionAnalysis[] {
  const now = Date.now()
  const analyses: RelationshipAttentionAnalysis[] = []

  for (const relationship of relationships) {
    // Find latest health score
    const healthScore = healthScores.find(
      hs => hs.relationshipId === relationship._id
    )

    // Find most recent entry for this relationship
    const recentEntry = recentEntries
      .filter(entry => entry.relationshipId === relationship._id)
      .sort((a, b) => b.createdAt - a.createdAt)[0]

    const daysSinceLastEntry = recentEntry
      ? Math.floor((now - recentEntry.createdAt) / (1000 * 60 * 60 * 24))
      : 999 // Very high number if no entries

    // Calculate urgency score
    let urgencyScore = 0
    let reminderReason = ''
    let suggestedType: 'gentle_nudge' | 'relationship_focus' | 'health_alert' =
      'gentle_nudge'

    // Base urgency on days since last entry
    if (daysSinceLastEntry > 14) {
      urgencyScore += 40
      reminderReason = `No journal entries for ${daysSinceLastEntry} days`
      suggestedType = 'relationship_focus'
    } else if (daysSinceLastEntry > 7) {
      urgencyScore += 20
      reminderReason = `Last entry was ${daysSinceLastEntry} days ago`
    }

    // Factor in health score
    if (healthScore) {
      if (healthScore.overallScore < 30) {
        urgencyScore += 30
        reminderReason += '. Low relationship health score'
        suggestedType = 'health_alert'
      } else if (healthScore.overallScore < 50) {
        urgencyScore += 15
        reminderReason += '. Below average health score'
      }

      // Factor in trends
      if (healthScore.trendsData?.trendDirection === 'down') {
        urgencyScore += Math.min(
          20,
          Math.abs(healthScore.trendsData.changeRate) * 10
        )
        reminderReason += '. Health score declining'
        if (healthScore.trendsData.changeRate < -10) {
          suggestedType = 'health_alert'
        }
      }
    } else {
      // No health data available - moderate urgency
      urgencyScore += 10
      reminderReason += '. No health analysis available'
    }

    // Only include relationships that need some attention
    if (urgencyScore > 10) {
      analyses.push({
        relationshipId: relationship._id,
        relationshipName: relationship.name,
        urgencyScore: Math.min(100, urgencyScore),
        daysSinceLastEntry,
        currentHealthScore: healthScore?.overallScore,
        healthTrend: healthScore?.trendsData?.improving
          ? 'improving'
          : healthScore?.trendsData?.trendDirection === 'down'
            ? 'declining'
            : healthScore?.trendsData?.trendDirection === 'stable'
              ? 'stable'
              : 'unknown',
        suggestedReminderType: suggestedType,
        reminderReason: reminderReason.trim(),
      })
    }
  }

  // Sort by urgency score (highest first)
  return analyses.sort((a, b) => b.urgencyScore - a.urgencyScore)
}

// Calculate if user is overdue for journaling based on their pattern
export function analyzeUserJournalingPattern(
  userPattern: {
    analysisData: {
      averageDaysBetweenEntries?: number
      mostActiveHours?: number[]
      bestResponseTimes?: string[]
      engagementScore?: number
      lastCalculated: number
    }
    confidenceLevel: number
  } | null,
  lastEntryTimestamp: number | null,
  userTimezone: string = 'UTC'
): UserJournalingPattern {
  const now = Date.now()
  const defaultPattern = 3 // Default to 3 days if no pattern data

  // Calculate days since last entry
  const lastEntryDaysAgo = lastEntryTimestamp
    ? Math.floor((now - lastEntryTimestamp) / (1000 * 60 * 60 * 24))
    : 999

  // Use pattern data or defaults
  const averageDaysBetween =
    userPattern?.analysisData.averageDaysBetweenEntries ?? defaultPattern
  const confidence = userPattern?.confidenceLevel ?? 0

  // Calculate if overdue
  const isOverdue = lastEntryDaysAgo > averageDaysBetween * 1.5 // 50% buffer
  const overdueBy = Math.max(0, lastEntryDaysAgo - averageDaysBetween)

  // Determine recommended reminder time
  let recommendedTime = '09:00' // Default morning time

  if (userPattern?.analysisData.bestResponseTimes?.length) {
    // Use best response time if available
    recommendedTime = userPattern.analysisData.bestResponseTimes[0]
  } else if (userPattern?.analysisData.mostActiveHours?.length) {
    // Use most active hour if available
    const hour = userPattern.analysisData.mostActiveHours[0]
    recommendedTime = `${hour.toString().padStart(2, '0')}:00`
  }

  return {
    averageDaysBetweenEntries: averageDaysBetween,
    lastEntryDaysAgo,
    isOverdue,
    overdueBy,
    recommendedReminderTime: recommendedTime,
    confidence,
  }
}

// Check if current time is within "do not disturb" window
export function isWithinDoNotDisturbHours(
  currentTime: Date,
  doNotDisturbStart: string, // "HH:MM"
  doNotDisturbEnd: string, // "HH:MM"
  timezone: string = 'UTC'
): boolean {
  try {
    // Get current time in user's timezone
    const timeStr = currentTime.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    })

    const [startHour, startMin] = doNotDisturbStart.split(':').map(Number)
    const [endHour, endMin] = doNotDisturbEnd.split(':').map(Number)
    const [currentHour, currentMin] = timeStr.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    const currentMinutes = currentHour * 60 + currentMin

    // Handle overnight periods (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    } else {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    }
  } catch (error) {
    // If timezone parsing fails, assume not in DND hours
    return false
  }
}

// Calculate next optimal reminder time for a user
export function calculateNextReminderTime(
  userPattern: UserJournalingPattern,
  reminderSettings: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    preferredTime: string
    timezone: string
    doNotDisturbStart: string
    doNotDisturbEnd: string
  },
  lastReminderTime?: number
): number {
  const now = Date.now()

  // Calculate base interval based on frequency setting
  let baseIntervalMs: number
  switch (reminderSettings.frequency) {
    case 'daily':
      baseIntervalMs = 24 * 60 * 60 * 1000 // 1 day
      break
    case 'biweekly':
      baseIntervalMs = 48 * 60 * 60 * 1000 // 2 days
      break
    case 'monthly':
      baseIntervalMs = 30 * 24 * 60 * 60 * 1000 // 30 days
      break
    case 'weekly':
      baseIntervalMs = 7 * 24 * 60 * 60 * 1000 // 7 days
      break
  }

  // If user is significantly overdue, use more frequent reminders
  if (userPattern.isOverdue && userPattern.overdueBy > 3) {
    baseIntervalMs = Math.min(baseIntervalMs, 24 * 60 * 60 * 1000) // At least daily
  }

  // Calculate next reminder time
  const lastReminder = lastReminderTime ?? now - baseIntervalMs
  let nextReminderTime = lastReminder + baseIntervalMs

  // Ensure it's not in the past
  if (nextReminderTime < now) {
    nextReminderTime = now + 30 * 60 * 1000 // 30 minutes from now
  }

  // Adjust to preferred time of day
  const nextReminderDate = new Date(nextReminderTime)
  const [preferredHour, preferredMin] = reminderSettings.preferredTime
    .split(':')
    .map(Number)

  nextReminderDate.setHours(preferredHour, preferredMin, 0, 0)

  // If that time has already passed today, move to next day
  if (nextReminderDate.getTime() < now) {
    nextReminderDate.setDate(nextReminderDate.getDate() + 1)
  }

  // Check if it falls in DND hours, if so move to end of DND period
  if (
    isWithinDoNotDisturbHours(
      nextReminderDate,
      reminderSettings.doNotDisturbStart,
      reminderSettings.doNotDisturbEnd,
      reminderSettings.timezone
    )
  ) {
    const [endHour, endMin] = reminderSettings.doNotDisturbEnd
      .split(':')
      .map(Number)
    nextReminderDate.setHours(endHour, endMin, 0, 0)

    // If DND end is the next day, adjust accordingly
    if (endHour < preferredHour) {
      nextReminderDate.setDate(nextReminderDate.getDate() + 1)
    }
  }

  return nextReminderDate.getTime()
}

// Generate contextual reminder content based on relationship analysis
export function generateReminderContent(
  analysis: RelationshipAttentionAnalysis,
  userFirstName: string = 'there',
  relationshipType:
    | 'partner'
    | 'family'
    | 'friend'
    | 'colleague'
    | 'other' = 'other',
  userEngagementScore?: number
): string {
  // Import the advanced content generation function (would be imported at top in real implementation)
  // For now, use the existing simpler template system but make it more sophisticated

  const timeOfDay = getTimeOfDay()

  const templates = {
    gentle_nudge: {
      morning: [
        `Good morning ${userFirstName}! Starting your day with a quick reflection about ${analysis.relationshipName} might set a positive tone. How are you feeling?`,
        `Morning ${userFirstName}! It's been ${analysis.daysSinceLastEntry} days since you've reflected on ${analysis.relationshipName}. What's on your mind?`,
        `Hi ${userFirstName}! A morning check-in with yourself about ${analysis.relationshipName} could be refreshing.`,
      ],
      afternoon: [
        `Hi ${userFirstName}! It's been ${analysis.daysSinceLastEntry} days since you've journaled about ${analysis.relationshipName}. A mid-day reflection can be refreshing.`,
        `${userFirstName}, take a moment to check in with yourself about ${analysis.relationshipName}. What's on your mind?`,
        `Hey ${userFirstName}! A quick journal entry about ${analysis.relationshipName} might help you stay connected to your feelings.`,
      ],
      evening: [
        `Evening ${userFirstName}! As you wind down, how about reflecting on your interactions with ${analysis.relationshipName} today?`,
        `Hi ${userFirstName}! Before you wrap up your day, consider how things are going with ${analysis.relationshipName}.`,
        `${userFirstName}, ending your day with some thoughts about ${analysis.relationshipName} might bring clarity.`,
      ],
      night: [
        `${userFirstName}, before you rest, a quick reflection on ${analysis.relationshipName} might be helpful.`,
        `Good evening ${userFirstName}! How about a gentle check-in with your feelings about ${analysis.relationshipName}?`,
        `Hi ${userFirstName}! A peaceful moment to think about ${analysis.relationshipName} before bed.`,
      ],
    },
    relationship_focus: {
      partner: [
        `${userFirstName}, it's been ${analysis.daysSinceLastEntry} days since you've reflected on your relationship with ${analysis.relationshipName}. Your partnership deserves this attention.`,
        `${userFirstName}, your relationship with ${analysis.relationshipName} hasn't appeared in your journal for ${analysis.daysSinceLastEntry} days. How are you both doing?`,
        `Time for a relationship check-in, ${userFirstName}! How have things been with ${analysis.relationshipName} lately?`,
      ],
      family: [
        `Hey ${userFirstName}, family connections matter. How have things been with ${analysis.relationshipName} lately? Take a moment to reflect.`,
        `${userFirstName}, it's been ${analysis.daysSinceLastEntry} days since you've thought about ${analysis.relationshipName}. Family bonds are precious.`,
        `${userFirstName}, consider reflecting on your recent interactions with ${analysis.relationshipName}. Family relationships evolve constantly.`,
      ],
      friend: [
        `${userFirstName}, friendships need nurturing too. It's been ${analysis.daysSinceLastEntry} days since you've thought about ${analysis.relationshipName}. What's new with them?`,
        `Hey ${userFirstName}! Your friendship with ${analysis.relationshipName} might benefit from some reflection. How are you both?`,
        `${userFirstName}, it might be worth reflecting on your recent times with ${analysis.relationshipName}. Friendships are treasures.`,
      ],
      colleague: [
        `${userFirstName}, workplace relationships matter too. How have things been with ${analysis.relationshipName} lately?`,
        `Hey ${userFirstName}! It's been ${analysis.daysSinceLastEntry} days since you've reflected on your working relationship with ${analysis.relationshipName}.`,
        `${userFirstName}, professional relationships benefit from reflection too. How are things with ${analysis.relationshipName}?`,
      ],
      other: [
        `${userFirstName}, it's worth reflecting on your relationship with ${analysis.relationshipName}. How have things been?`,
        `Hey ${userFirstName}! Your connection with ${analysis.relationshipName} deserves some attention. How are you feeling?`,
        `${userFirstName}, take a moment to think about your interactions with ${analysis.relationshipName}.`,
      ],
      default: [
        `${userFirstName}, ${analysis.relationshipName} hasn't appeared in your journal for ${analysis.daysSinceLastEntry} days. Is everything okay?`,
        `Time for a relationship check-in, ${userFirstName}! How have things been with ${analysis.relationshipName} lately?`,
        `${userFirstName}, it might be worth reflecting on your recent interactions with ${analysis.relationshipName}.`,
      ],
    },
    health_alert: [
      `${userFirstName}, your relationship with ${analysis.relationshipName} may need some attention. Consider journaling about recent interactions.`,
      `Hey ${userFirstName}, it looks like there might be some challenges with ${analysis.relationshipName}. Want to explore your feelings?`,
      `${userFirstName}, taking time to reflect on ${analysis.relationshipName} could help improve your connection.`,
      `${userFirstName}, some reflection on ${analysis.relationshipName} might help you understand what's happening in this relationship.`,
    ],
  }

  let templateArray: string[]

  if (analysis.suggestedReminderType === 'gentle_nudge') {
    templateArray = templates.gentle_nudge[timeOfDay]
  } else if (analysis.suggestedReminderType === 'relationship_focus') {
    templateArray =
      templates.relationship_focus[relationshipType] ||
      templates.relationship_focus.default
  } else {
    templateArray = templates.health_alert
  }

  // Adjust for user engagement score
  if (userEngagementScore !== undefined && userEngagementScore < 40) {
    // For low-engagement users, use softer language
    const softTemplates = templateArray.map(template =>
      template
        .replace(/should|must|need/, 'might want to')
        .replace(/Consider/, 'Maybe consider')
        .replace(/Take a moment/, 'If you feel like it, take a moment')
    )
    templateArray = softTemplates
  }

  const randomTemplate =
    templateArray[Math.floor(Math.random() * templateArray.length)]
  return randomTemplate
}

// Helper function to determine time of day
function getTimeOfDay(
  date: Date = new Date()
): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}
