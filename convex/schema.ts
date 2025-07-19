import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    createdAt: v.number(),
  }).index('by_clerk_id', ['clerkId']),

  relationships: defineTable({
    userId: v.id('users'),
    name: v.string(),
    type: v.string(), // "partner", "friend", "family", etc.
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  journalEntries: defineTable({
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
    content: v.string(),
    mood: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId']),

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
