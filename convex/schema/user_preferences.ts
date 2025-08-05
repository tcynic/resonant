import { v } from 'convex/values'

export const userPreferencesSchema = v.object({
  theme: v.optional(v.union(v.literal('light'), v.literal('dark'))),
  notifications: v.optional(v.boolean()),
  reminderSettings: v.optional(
    v.object({
      enabled: v.boolean(),
      frequency: v.union(
        v.literal('daily'),
        v.literal('every2days'),
        v.literal('weekly')
      ),
      preferredTime: v.string(), // "HH:MM" format
      timezone: v.string(), // IANA timezone
      doNotDisturbStart: v.string(), // "HH:MM"
      doNotDisturbEnd: v.string(), // "HH:MM"
      reminderTypes: v.object({
        gentleNudge: v.boolean(),
        relationshipFocus: v.boolean(),
        healthScoreAlerts: v.boolean(),
      }),
    })
  ),
  language: v.optional(v.string()),
  dataSharing: v.optional(v.boolean()),
  analyticsOptIn: v.optional(v.boolean()),
  marketingOptIn: v.optional(v.boolean()),
  searchIndexing: v.optional(v.boolean()),
  aiAnalysisEnabled: v.optional(v.boolean()), // Global AI analysis toggle
  dataRetention: v.optional(
    v.union(v.literal('1year'), v.literal('3years'), v.literal('indefinite'))
  ),
})
