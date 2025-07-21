import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    createdAt: v.number(),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.union(v.literal('light'), v.literal('dark'))),
        notifications: v.optional(v.boolean()),
        language: v.optional(v.string()),
      })
    ),
  }).index('by_clerk_id', ['clerkId']),

  relationships: defineTable({
    userId: v.id('users'),
    name: v.string(),
    type: v.union(
      v.literal('partner'),
      v.literal('family'),
      v.literal('friend'),
      v.literal('colleague'),
      v.literal('other')
    ),
    photo: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_type', ['type']),

  journalEntries: defineTable({
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
    content: v.string(),
    mood: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_user_and_private', ['userId', 'isPrivate']),

  // AI Analysis Results
  aiAnalysis: defineTable({
    journalEntryId: v.id('journalEntries'),
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    analysisType: v.union(
      v.literal('sentiment'),
      v.literal('emotional_stability'),
      v.literal('energy_impact'),
      v.literal('conflict_resolution'),
      v.literal('gratitude')
    ),
    analysisResults: v.object({
      sentimentScore: v.optional(v.number()), // 1-10 scale
      emotions: v.optional(v.array(v.string())),
      confidence: v.number(), // 0-1 scale
      rawResponse: v.string(),
      // Type-specific results
      stabilityScore: v.optional(v.number()), // 0-100 for emotional stability
      energyScore: v.optional(v.number()), // 1-10 for energy impact
      resolutionScore: v.optional(v.number()), // 1-10 for conflict resolution
      gratitudeScore: v.optional(v.number()), // 1-10 for gratitude
      additionalData: v.optional(v.any()) // Flexible field for analysis-specific data
    }),
    metadata: v.object({
      modelVersion: v.string(),
      processingTime: v.number(),
      tokenCount: v.optional(v.number()),
      apiCosts: v.optional(v.number())
    }),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index('by_journal_entry', ['journalEntryId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_user', ['userId'])
    .index('by_analysis_type', ['analysisType'])
    .index('by_user_and_type', ['userId', 'analysisType']),

  // Relationship Health Scores (updated for AI-based scoring)
  healthScores: defineTable({
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    overallScore: v.number(), // 0-100 scale
    componentScores: v.object({
      sentiment: v.number(),           // 0-100
      emotionalStability: v.number(),  // 0-100
      energyImpact: v.number(),       // 0-100
      conflictResolution: v.number(),  // 0-100
      gratitude: v.number(),          // 0-100
      communicationFrequency: v.number() // 0-100
    }),
    lastUpdated: v.number(),
    dataPoints: v.number(), // Number of entries used in calculation
    confidenceLevel: v.number(), // 0-1 overall confidence in the score
    trendsData: v.optional(v.object({
      improving: v.boolean(),
      trendDirection: v.union(v.literal('up'), v.literal('down'), v.literal('stable')),
      changeRate: v.number() // Percentage change over time
    }))
  })
    .index('by_relationship', ['relationshipId'])
    .index('by_user', ['userId'])
    .index('by_score', ['overallScore']),
})
