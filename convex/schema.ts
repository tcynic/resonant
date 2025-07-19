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

  healthScores: defineTable({
    relationshipId: v.id('relationships'),
    score: v.number(),
    factors: v.object({
      communication: v.number(),
      trust: v.number(),
      satisfaction: v.number(),
    }),
    calculatedAt: v.number(),
  }).index('by_relationship', ['relationshipId']),
})
