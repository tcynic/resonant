import { v } from 'convex/values'
import {
  mutation,
  query,
  internalMutation,
  MutationCtx,
  QueryCtx,
} from './_generated/server'
import { ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'
import { validateUserInput } from './utils/validation'
import { ERROR_MESSAGES } from './constants'

// User creation with validation
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (
    ctx: MutationCtx,
    args: { clerkId: string; name: string; email: string }
  ) => {
    // Validate input using utility function
    validateUserInput(args)

    // Check for existing user
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()

    if (existingUser) {
      return existingUser._id
    }

    try {
      const userId = await ctx.db.insert('users', {
        clerkId: args.clerkId,
        name: args.name.trim(),
        email: args.email.toLowerCase().trim(),
        createdAt: Date.now(),
      })

      return userId
    } catch (error) {
      throw new ConvexError(ERROR_MESSAGES.USER_CREATE_FAILED)
    }
  },
})

// Get current user by Clerk ID
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx: QueryCtx, args: { clerkId: string }) => {
    validateUserInput({ clerkId: args.clerkId })

    return await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()
  },
})

// Get user by Clerk ID (convenience function)
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx: QueryCtx, args: { clerkId: string }) => {
    validateUserInput({ clerkId: args.clerkId })

    return await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()
  },
})

// Get user by ID
export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'> }) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError(ERROR_MESSAGES.USER_NOT_FOUND)
    }
    return user
  },
})

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    userId: v.id('users'),
    preferences: v.object({
      theme: v.optional(v.union(v.literal('light'), v.literal('dark'))),
      notifications: v.optional(v.boolean()),
      language: v.optional(v.string()),
    }),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>
      preferences: {
        theme?: 'light' | 'dark'
        notifications?: boolean
        language?: string
      }
    }
  ) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError(ERROR_MESSAGES.USER_NOT_FOUND)
    }

    try {
      await ctx.db.patch(args.userId, {
        preferences: args.preferences,
      })
      return true
    } catch (error) {
      throw new ConvexError(ERROR_MESSAGES.USER_UPDATE_FAILED)
    }
  },
})

// Update user privacy settings
export const updatePrivacySettings = mutation({
  args: {
    userId: v.id('users'),
    preferences: v.object({
      theme: v.optional(v.union(v.literal('light'), v.literal('dark'))),
      notifications: v.optional(v.boolean()),
      language: v.optional(v.string()),
      dataSharing: v.optional(v.boolean()),
      analyticsOptIn: v.optional(v.boolean()),
      marketingOptIn: v.optional(v.boolean()),
      searchIndexing: v.optional(v.boolean()),
      dataRetention: v.optional(
        v.union(
          v.literal('1year'),
          v.literal('3years'),
          v.literal('indefinite')
        )
      ),
    }),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>
      preferences: {
        theme?: 'light' | 'dark'
        notifications?: boolean
        language?: string
        dataSharing?: boolean
        analyticsOptIn?: boolean
        marketingOptIn?: boolean
        searchIndexing?: boolean
        dataRetention?: '1year' | '3years' | 'indefinite'
      }
    }
  ) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError(ERROR_MESSAGES.USER_NOT_FOUND)
    }

    try {
      await ctx.db.patch(args.userId, {
        preferences: {
          ...user.preferences,
          ...args.preferences,
        },
      })
      return true
    } catch (error) {
      throw new ConvexError(ERROR_MESSAGES.USER_UPDATE_FAILED)
    }
  },
})

// Internal function for webhook - update user from Clerk
export const updateUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (
    ctx: MutationCtx,
    args: { clerkId: string; name: string; email: string }
  ) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()

    if (user) {
      await ctx.db.patch(user._id, {
        name: args.name.trim(),
        email: args.email.toLowerCase().trim(),
      })
    }
  },
})

// Internal function for webhook - delete user by Clerk ID
export const deleteUserByClerkId = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { clerkId: string }) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', args.clerkId))
      .first()

    if (user) {
      // Note: In a production app, you'd want to handle cascading deletes
      // For now, we'll just delete the user record
      await ctx.db.delete(user._id)
    }
  },
})
