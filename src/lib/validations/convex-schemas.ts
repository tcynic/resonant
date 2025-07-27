/**
 * Zod validation schemas that match Convex function arguments
 * These provide client-side validation before making API calls
 */

import { z } from 'zod'

// ============================================================================
// BASIC VALIDATION SCHEMAS
// ============================================================================

export const ClerkIdSchema = z.string().min(1, 'Clerk ID is required')
export const NameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
export const EmailSchema = z.string().email('Invalid email address')
export const RelationshipTypeSchema = z.enum([
  'partner',
  'family',
  'friend',
  'colleague',
  'other',
])
export const TierSchema = z.enum(['free', 'premium'])
export const ThemeSchema = z.enum(['light', 'dark'])

// ============================================================================
// USER VALIDATION SCHEMAS
// ============================================================================

export const CreateUserSchema = z.object({
  clerkId: ClerkIdSchema,
  name: NameSchema,
  email: EmailSchema,
})

export const UpdateUserPreferencesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  preferences: z.object({
    theme: ThemeSchema.optional(),
    notifications: z.boolean().optional(),
    language: z.string().optional(),
    aiAnalysisEnabled: z.boolean().optional(),
    dataSharing: z.boolean().optional(),
    analyticsOptIn: z.boolean().optional(),
    marketingOptIn: z.boolean().optional(),
    searchIndexing: z.boolean().optional(),
    dataRetention: z.enum(['1year', '3years', 'indefinite']).optional(),
    reminderSettings: z
      .object({
        enabled: z.boolean().optional(),
        frequency: z
          .enum(['daily', 'weekly', 'biweekly', 'monthly'])
          .optional(),
        preferredTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
          .optional(),
        timezone: z.string().optional(),
        doNotDisturbStart: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
          .optional(),
        doNotDisturbEnd: z
          .string()
          .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
          .optional(),
        reminderTypes: z
          .object({
            gentleNudge: z.boolean().optional(),
            relationshipFocus: z.boolean().optional(),
            healthScoreAlerts: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
})

export const CompleteOnboardingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  preferences: z
    .object({
      reminderFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
      preferredTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
      timezone: z.string().min(1, 'Timezone is required'),
    })
    .optional(),
})

// ============================================================================
// RELATIONSHIP VALIDATION SCHEMAS
// ============================================================================

export const CreateRelationshipSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z
    .string()
    .min(1, 'Relationship name is required')
    .max(100, 'Relationship name too long')
    .refine(
      name => name.trim().length > 0,
      'Relationship name cannot be empty'
    ),
  type: RelationshipTypeSchema,
  photo: z.string().url('Invalid photo URL').optional(),
})

export const UpdateRelationshipSchema = z.object({
  relationshipId: z.string().min(1, 'Relationship ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  name: z
    .string()
    .min(1, 'Relationship name is required')
    .max(100, 'Relationship name too long')
    .optional(),
  type: RelationshipTypeSchema.optional(),
  photo: z.string().url('Invalid photo URL').optional().or(z.literal('')),
})

export const GetRelationshipsByUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: RelationshipTypeSchema.optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
})

// ============================================================================
// JOURNAL ENTRY VALIDATION SCHEMAS
// ============================================================================

export const MoodSchema = z.enum([
  'ecstatic',
  'joyful',
  'happy',
  'content',
  'calm',
  'neutral',
  'concerned',
  'sad',
  'frustrated',
  'angry',
  'devastated',
])

export const CreateJournalEntrySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  relationshipId: z.string().min(1).optional(),
  content: z
    .string()
    .min(10, 'Journal entry must be at least 10 characters')
    .max(10000, 'Journal entry too long'),
  mood: MoodSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Too many tags').optional(),
  allowAIAnalysis: z.boolean().optional().default(true),
})

export const UpdateJournalEntrySchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  content: z
    .string()
    .min(10, 'Journal entry must be at least 10 characters')
    .max(10000, 'Journal entry too long')
    .optional(),
  mood: MoodSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Too many tags').optional(),
  allowAIAnalysis: z.boolean().optional(),
})

// ============================================================================
// AI ANALYSIS VALIDATION SCHEMAS
// ============================================================================

export const QueueAnalysisSchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required'),
  priority: z.enum(['high', 'normal', 'low']).optional(),
})

export const GetAnalysesByUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limit: z.number().min(1).max(100).optional(),
})

export const GetAnalysesByRelationshipSchema = z.object({
  relationshipId: z.string().min(1, 'Relationship ID is required'),
  limit: z.number().min(1).max(100).optional(),
})

// ============================================================================
// HEALTH SCORE VALIDATION SCHEMAS
// ============================================================================

export const ForceRecalculateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  relationshipId: z.string().min(1).optional(),
})

export const GetHealthScoreHistorySchema = z.object({
  relationshipId: z.string().min(1, 'Relationship ID is required'),
  days: z.number().min(1).max(365).optional(),
})

// ============================================================================
// INSIGHTS VALIDATION SCHEMAS
// ============================================================================

export const InsightTypeSchema = z.enum([
  'pattern_recognition',
  'improvement_suggestion',
  'conversation_starter',
  'warning_signal',
  'celebration_prompt',
  'trend_alert',
])

export const InsightPrioritySchema = z.enum(['urgent', 'high', 'medium', 'low'])

export const GetActiveInsightsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  relationshipId: z.string().min(1).optional(),
  type: InsightTypeSchema.optional(),
})

export const RateInsightSchema = z.object({
  insightId: z.string().min(1, 'Insight ID is required'),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  feedback: z.string().max(500, 'Feedback too long').optional(),
})

export const MarkInsightActedOnSchema = z.object({
  insightId: z.string().min(1, 'Insight ID is required'),
  feedback: z.string().max(500, 'Feedback too long').optional(),
})

// ============================================================================
// SEARCH AND FILTER VALIDATION SCHEMAS
// ============================================================================

export const SearchFiltersSchema = z.object({
  dateRange: z
    .object({
      start: z.number().min(0),
      end: z.number().min(0),
    })
    .optional(),
  relationships: z.array(z.string().min(1)).optional(),
  moods: z.array(MoodSchema).optional(),
  tags: z.array(z.string().min(1)).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  hasAnalysis: z.boolean().optional(),
})

export const SearchEntriesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(200, 'Query too long'),
  filters: SearchFiltersSchema.optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
})

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

export const validateConvexId = (id: string, entityType: string) => {
  const schema = z.string().min(1, `${entityType} ID is required`)
  return schema.parse(id)
}

export const validatePagination = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

export const validateTimeRange = z
  .object({
    start: z.number().min(0, 'Start time must be positive'),
    end: z.number().min(0, 'End time must be positive'),
  })
  .refine(data => data.end >= data.start, 'End time must be after start time')

// ============================================================================
// FORM VALIDATION SCHEMAS
// ============================================================================

export const JournalEntryFormSchema = z.object({
  content: z
    .string()
    .min(10, 'Please write at least 10 characters')
    .max(10000, 'Entry is too long'),
  mood: MoodSchema.optional(),
  tags: z.array(z.string()).max(10, 'Too many tags').optional(),
  relationshipId: z.string().optional(),
  allowAIAnalysis: z.boolean().default(true),
})

export const RelationshipFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  type: RelationshipTypeSchema,
  photo: z.string().url('Invalid photo URL').optional().or(z.literal('')),
})

export const UserPreferencesFormSchema = z.object({
  theme: ThemeSchema,
  notifications: z.boolean(),
  aiAnalysisEnabled: z.boolean(),
  reminderFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  timezone: z.string().min(1, 'Timezone is required'),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserPreferencesInput = z.infer<
  typeof UpdateUserPreferencesSchema
>
export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipSchema>
export type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipSchema>
export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntrySchema>
export type UpdateJournalEntryInput = z.infer<typeof UpdateJournalEntrySchema>
export type QueueAnalysisInput = z.infer<typeof QueueAnalysisSchema>
export type GetActiveInsightsInput = z.infer<typeof GetActiveInsightsSchema>
export type RateInsightInput = z.infer<typeof RateInsightSchema>
export type SearchFiltersInput = z.infer<typeof SearchFiltersSchema>
export type SearchEntriesInput = z.infer<typeof SearchEntriesSchema>
export type JournalEntryFormInput = z.infer<typeof JournalEntryFormSchema>
export type RelationshipFormInput = z.infer<typeof RelationshipFormSchema>
export type UserPreferencesFormInput = z.infer<typeof UserPreferencesFormSchema>
