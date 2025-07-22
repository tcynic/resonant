/**
 * Test Data Manager for Convex Database
 *
 * Provides functions for managing test data in the Convex database
 */

import { v } from 'convex/values'
import {
  mutation,
  query,
  internalMutation,
  MutationCtx,
  QueryCtx,
} from '../_generated/server'
import { ConvexError } from 'convex/values'
import { Id } from '../_generated/dataModel'

// Test user creation (bypasses normal validation for test purposes)
export const createTestUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (
    ctx: MutationCtx,
    args: { clerkId: string; name: string; email: string }
  ) => {
    // Check for existing user first
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()

    if (existingUser) {
      return existingUser._id
    }

    const userId = await ctx.db.insert('users', {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      createdAt: Date.now(),
    })

    return userId
  },
})

// Bulk create test relationships
export const createTestRelationships = mutation({
  args: {
    userId: v.id('users'),
    relationships: v.array(
      v.object({
        name: v.string(),
        type: v.union(
          v.literal('partner'),
          v.literal('family'),
          v.literal('friend'),
          v.literal('colleague'),
          v.literal('other')
        ),
      })
    ),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>
      relationships: {
        name: string
        type: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
      }[]
    }
  ) => {
    const relationshipIds: Id<'relationships'>[] = []
    const currentTime = Date.now()

    for (const relationship of args.relationships) {
      const relationshipId = await ctx.db.insert('relationships', {
        userId: args.userId,
        name: relationship.name,
        type: relationship.type,
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      relationshipIds.push(relationshipId)
    }

    return relationshipIds
  },
})

// Bulk create test journal entries
export const createTestJournalEntries = mutation({
  args: {
    userId: v.id('users'),
    entries: v.array(
      v.object({
        relationshipId: v.id('relationships'),
        content: v.string(),
        mood: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        isPrivate: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>
      entries: {
        relationshipId: Id<'relationships'>
        content: string
        mood?: string
        tags?: string[]
        isPrivate?: boolean
      }[]
    }
  ) => {
    const entryIds: Id<'journalEntries'>[] = []
    const currentTime = Date.now()

    for (const entry of args.entries) {
      const entryId = await ctx.db.insert('journalEntries', {
        userId: args.userId,
        relationshipId: entry.relationshipId,
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags,
        isPrivate: entry.isPrivate || false,
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      entryIds.push(entryId)
    }

    return entryIds
  },
})

// Clean up test data for a specific user
export const cleanupTestUser = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { clerkId: string }) => {
    // Find the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()

    if (!user) {
      return { deleted: false, reason: 'User not found' }
    }

    let deletedCount = 0

    // Delete journal entries
    const journalEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    for (const entry of journalEntries) {
      await ctx.db.delete(entry._id)
      deletedCount++
    }

    // Delete health scores
    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    for (const relationship of relationships) {
      const healthScores = await ctx.db
        .query('healthScores')
        .withIndex('by_relationship', (q: any) =>
          q.eq('relationshipId', relationship._id)
        )
        .collect()

      for (const score of healthScores) {
        await ctx.db.delete(score._id)
        deletedCount++
      }

      // Delete the relationship
      await ctx.db.delete(relationship._id)
      deletedCount++
    }

    // Delete the user
    await ctx.db.delete(user._id)
    deletedCount++

    return {
      deleted: true,
      deletedCount,
      userId: user._id,
    }
  },
})

// Clean up all test data (for test teardown)
export const cleanupAllTestData = mutation({
  args: {
    testDomain: v.string(), // e.g., "test.resonant.local"
  },
  handler: async (ctx: MutationCtx, args: { testDomain: string }) => {
    let deletedCount = 0

    // Find all test users by email domain
    const allUsers = await ctx.db.query('users').collect()
    const testUsers = allUsers.filter((user: any) =>
      user.email.includes(args.testDomain)
    )

    for (const user of testUsers) {
      // Delete journal entries
      const journalEntries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', (q: any) => q.eq('userId', user._id))
        .collect()

      for (const entry of journalEntries) {
        await ctx.db.delete(entry._id)
        deletedCount++
      }

      // Delete relationships and health scores
      const relationships = await ctx.db
        .query('relationships')
        .withIndex('by_user', (q: any) => q.eq('userId', user._id))
        .collect()

      for (const relationship of relationships) {
        const healthScores = await ctx.db
          .query('healthScores')
          .withIndex('by_relationship', (q: any) =>
            q.eq('relationshipId', relationship._id)
          )
          .collect()

        for (const score of healthScores) {
          await ctx.db.delete(score._id)
          deletedCount++
        }

        await ctx.db.delete(relationship._id)
        deletedCount++
      }

      // Delete the user
      await ctx.db.delete(user._id)
      deletedCount++
    }

    return {
      deleted: true,
      deletedCount,
      testUsersFound: testUsers.length,
    }
  },
})

// Get test data statistics
export const getTestDataStats = query({
  args: {
    testDomain: v.string(),
  },
  handler: async (ctx: QueryCtx, args: { testDomain: string }) => {
    const allUsers = await ctx.db.query('users').collect()
    const testUsers = allUsers.filter((user: any) =>
      user.email.includes(args.testDomain)
    )

    let totalRelationships = 0
    let totalJournalEntries = 0
    let totalHealthScores = 0

    for (const user of testUsers) {
      const relationships = await ctx.db
        .query('relationships')
        .withIndex('by_user', (q: any) => q.eq('userId', user._id))
        .collect()

      const journalEntries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', (q: any) => q.eq('userId', user._id))
        .collect()

      totalRelationships += relationships.length
      totalJournalEntries += journalEntries.length

      for (const relationship of relationships) {
        const healthScores = await ctx.db
          .query('healthScores')
          .withIndex('by_relationship', (q: any) =>
            q.eq('relationshipId', relationship._id)
          )
          .collect()
        totalHealthScores += healthScores.length
      }
    }

    return {
      testUsers: testUsers.length,
      totalRelationships,
      totalJournalEntries,
      totalHealthScores,
      userEmails: testUsers.map(u => u.email),
    }
  },
})

// Verify test user exists
export const verifyTestUser = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx: QueryCtx, args: { clerkId: string }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()

    if (!user) {
      return { exists: false, user: null }
    }

    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    const journalEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect()

    return {
      exists: true,
      user,
      relationshipCount: relationships.length,
      journalEntryCount: journalEntries.length,
    }
  },
})
