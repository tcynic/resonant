import { Id } from '../_generated/dataModel'

// Advanced content generation interfaces
export interface ContentGenerationContext {
  userFirstName: string
  relationshipName: string
  relationshipType: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
  daysSinceLastEntry: number
  currentHealthScore?: number
  healthTrend: 'improving' | 'declining' | 'stable' | 'unknown'
  urgencyScore: number
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  userEngagementScore?: number
  recentMoods?: string[]
}

export interface NotificationTemplate {
  id: string
  type: 'gentle_nudge' | 'relationship_focus' | 'health_alert'
  template: string
  conditions?: {
    minUrgency?: number
    maxUrgency?: number
    healthTrends?: Array<'improving' | 'declining' | 'stable' | 'unknown'>
    relationshipTypes?: Array<
      'partner' | 'family' | 'friend' | 'colleague' | 'other'
    >
    timeOfDay?: Array<'morning' | 'afternoon' | 'evening' | 'night'>
    engagementScore?: { min?: number; max?: number }
  }
}

// Comprehensive template database
export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // Gentle Nudge Templates
  {
    id: 'gentle_morning_general',
    type: 'gentle_nudge',
    template:
      'Good morning {{userFirstName}}! Starting your day with a quick reflection about {{relationshipName}} might set a positive tone. How are you feeling?',
    conditions: {
      timeOfDay: ['morning'],
      maxUrgency: 40,
    },
  },
  {
    id: 'gentle_afternoon_check',
    type: 'gentle_nudge',
    template:
      "Hi {{userFirstName}}! It's been {{daysSinceLastEntry}} days since you've journaled about {{relationshipName}}. A mid-day reflection can be refreshing.",
    conditions: {
      timeOfDay: ['afternoon'],
      maxUrgency: 50,
    },
  },
  {
    id: 'gentle_evening_wind_down',
    type: 'gentle_nudge',
    template:
      'Evening, {{userFirstName}}! As you wind down, how about reflecting on your interactions with {{relationshipName}} today?',
    conditions: {
      timeOfDay: ['evening'],
      maxUrgency: 45,
    },
  },

  // Relationship Focus Templates - Partner
  {
    id: 'focus_partner_extended_absence',
    type: 'relationship_focus',
    template:
      "{{userFirstName}}, it's been {{daysSinceLastEntry}} days since you've reflected on your relationship with {{relationshipName}}. Your partnership deserves this attention.",
    conditions: {
      minUrgency: 50,
      relationshipTypes: ['partner'],
    },
  },
  {
    id: 'focus_family_connection',
    type: 'relationship_focus',
    template:
      'Hey {{userFirstName}}, family connections matter. How have things been with {{relationshipName}} lately? Take a moment to reflect.',
    conditions: {
      minUrgency: 40,
      relationshipTypes: ['family'],
    },
  },
  {
    id: 'focus_friend_maintenance',
    type: 'relationship_focus',
    template:
      "{{userFirstName}}, friendships need nurturing too. It's been {{daysSinceLastEntry}} days since you've thought about {{relationshipName}}. What's new with them?",
    conditions: {
      minUrgency: 35,
      relationshipTypes: ['friend'],
    },
  },

  // Health Alert Templates
  {
    id: 'alert_declining_urgent',
    type: 'health_alert',
    template:
      '{{userFirstName}}, your relationship with {{relationshipName}} seems to need some attention. Reflecting on recent interactions could help.',
    conditions: {
      minUrgency: 70,
      healthTrends: ['declining'],
    },
  },
  {
    id: 'alert_low_health_score',
    type: 'health_alert',
    template:
      'Hi {{userFirstName}}, it looks like there might be some challenges with {{relationshipName}}. Want to explore your feelings through journaling?',
    conditions: {
      minUrgency: 65,
    },
  },

  // High Engagement User Templates
  {
    id: 'engaged_user_appreciation',
    type: 'gentle_nudge',
    template:
      "You're doing great with your journaling, {{userFirstName}}! How about checking in with yourself about {{relationshipName}}?",
    conditions: {
      engagementScore: { min: 70 },
      maxUrgency: 40,
    },
  },

  // Low Engagement Recovery Templates
  {
    id: 'low_engagement_encouragement',
    type: 'gentle_nudge',
    template:
      "No pressure, {{userFirstName}}. Just wondering how you're feeling about {{relationshipName}} today. Even a quick note helps.",
    conditions: {
      engagementScore: { max: 40 },
      maxUrgency: 50,
    },
  },

  // Time-specific relationship focus
  {
    id: 'weekend_family_focus',
    type: 'relationship_focus',
    template:
      'Weekend vibes, {{userFirstName}}! Perfect time to reflect on family. How are things with {{relationshipName}}?',
    conditions: {
      relationshipTypes: ['family'],
      timeOfDay: ['morning', 'afternoon'],
      minUrgency: 30,
    },
  },
]

// Default fallback templates if no specific template matches
export const FALLBACK_TEMPLATES: Record<
  'gentle_nudge' | 'relationship_focus' | 'health_alert',
  string[]
> = {
  gentle_nudge: [
    'Hi {{userFirstName}}! Take a moment to reflect on {{relationshipName}}. How are you feeling?',
    '{{userFirstName}}, a quick check-in with yourself about {{relationshipName}} might be helpful.',
    'Hey {{userFirstName}}! Consider journaling about {{relationshipName}} when you have a moment.',
  ],
  relationship_focus: [
    '{{userFirstName}}, it might be worth reflecting on your relationship with {{relationshipName}}.',
    'Time for a relationship check-in, {{userFirstName}}! How have things been with {{relationshipName}}?',
    '{{userFirstName}}, consider exploring your recent interactions with {{relationshipName}}.',
  ],
  health_alert: [
    '{{userFirstName}}, your relationship with {{relationshipName}} may need some attention. Consider reflecting on it.',
    'Hey {{userFirstName}}, taking time to think about {{relationshipName}} could be beneficial.',
    '{{userFirstName}}, some reflection on {{relationshipName}} might help improve your connection.',
  ],
}

// Advanced content generation function
export function generateAdvancedReminderContent(
  context: ContentGenerationContext,
  reminderType: 'gentle_nudge' | 'relationship_focus' | 'health_alert'
): string {
  // Find matching templates based on context
  const matchingTemplates = NOTIFICATION_TEMPLATES.filter(template => {
    if (template.type !== reminderType) return false

    const conditions = template.conditions
    if (!conditions) return true

    // Check urgency conditions
    if (conditions.minUrgency && context.urgencyScore < conditions.minUrgency)
      return false
    if (conditions.maxUrgency && context.urgencyScore > conditions.maxUrgency)
      return false

    // Check health trend conditions
    if (
      conditions.healthTrends &&
      !conditions.healthTrends.includes(context.healthTrend)
    )
      return false

    // Check relationship type conditions
    if (
      conditions.relationshipTypes &&
      !conditions.relationshipTypes.includes(context.relationshipType)
    )
      return false

    // Check time of day conditions
    if (
      conditions.timeOfDay &&
      !conditions.timeOfDay.includes(context.timeOfDay)
    )
      return false

    // Check engagement score conditions
    if (
      conditions.engagementScore &&
      context.userEngagementScore !== undefined
    ) {
      if (
        conditions.engagementScore.min &&
        context.userEngagementScore < conditions.engagementScore.min
      )
        return false
      if (
        conditions.engagementScore.max &&
        context.userEngagementScore > conditions.engagementScore.max
      )
        return false
    }

    return true
  })

  // Select template - prefer matching templates, fallback to defaults
  let selectedTemplate: string

  if (matchingTemplates.length > 0) {
    const randomTemplate =
      matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)]
    selectedTemplate = randomTemplate.template
  } else {
    const fallbackTemplates = FALLBACK_TEMPLATES[reminderType]
    selectedTemplate =
      fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]
  }

  // Replace template variables
  return selectedTemplate
    .replace(/\{\{userFirstName\}\}/g, context.userFirstName)
    .replace(/\{\{relationshipName\}\}/g, context.relationshipName)
    .replace(
      /\{\{daysSinceLastEntry\}\}/g,
      context.daysSinceLastEntry.toString()
    )
    .replace(/\{\{urgencyScore\}\}/g, context.urgencyScore.toString())
    .replace(
      /\{\{healthScore\}\}/g,
      context.currentHealthScore?.toString() || 'unknown'
    )
}

// Helper function to determine time of day
export function getTimeOfDay(
  date: Date = new Date()
): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

// A/B Testing framework for template effectiveness
export interface TemplateTest {
  templateId: string
  variantName: string
  template: string
  impressions: number
  clicks: number
  conversions: number // Actions taken after clicking
}

export function selectTemplateVariant(
  baseTemplate: NotificationTemplate,
  tests: TemplateTest[] = []
): string {
  // If no A/B tests are running, return the base template
  if (tests.length === 0) {
    return baseTemplate.template
  }

  // Simple A/B testing logic - select variant with highest conversion rate
  // In production, this would implement proper statistical significance testing
  const bestVariant = tests.reduce((best, current) => {
    const currentRate =
      current.impressions > 0 ? current.conversions / current.impressions : 0
    const bestRate =
      best.impressions > 0 ? best.conversions / best.impressions : 0
    return currentRate > bestRate ? current : best
  })

  return bestVariant.template
}

// Content personalization based on user patterns
export function personalizeContent(
  baseContent: string,
  userPatterns: {
    preferredTone?: 'casual' | 'formal' | 'encouraging'
    responseHistory?: Array<{ content: string; wasClicked: boolean }>
  }
): string {
  // This is a simplified personalization example
  // In a full implementation, this would use NLP and user behavior analysis

  let personalizedContent = baseContent

  // Adjust tone based on user preference
  if (userPatterns.preferredTone === 'formal') {
    personalizedContent = personalizedContent.replace(/Hey|Hi/, 'Hello')
  } else if (userPatterns.preferredTone === 'encouraging') {
    personalizedContent = personalizedContent.replace(
      /might/,
      'will definitely'
    )
    personalizedContent = personalizedContent.replace(
      /consider/,
      'go ahead and'
    )
  }

  return personalizedContent
}
