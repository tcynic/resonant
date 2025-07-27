import { v } from 'convex/values'
import { mutation, query, MutationCtx, QueryCtx } from './_generated/server'
import { ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'
import { validateRelationshipName } from './utils/validation'
import { ERROR_MESSAGES } from './constants'

// Create a new relationship
export const createRelationship = mutation({
  args: {
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
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      userId: Id<'users'>
      name: string
      type: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
      photo?: string
    }
  ) => {
    // Validate input using utility function
    validateRelationshipName(args.name)

    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    // Check free tier limits (3 relationships max)
    if (user.tier === 'free') {
      const relationshipCount = await ctx.db
        .query('relationships')
        .withIndex('by_user_active', (q: any) =>
          q.eq('userId', args.userId).eq('isActive', true)
        )
        .collect()

      if (relationshipCount.length >= 3) {
        throw new ConvexError(
          'Free tier limited to 3 relationships. Upgrade to premium for unlimited relationships.'
        )
      }
    }

    try {
      const now = Date.now()

      // Generate initials for privacy
      const initials = args.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 3)

      const relationshipId = await ctx.db.insert('relationships', {
        userId: args.userId,
        name: args.name.trim(),
        type: args.type,
        photo: args.photo,
        initials,
        isActive: true,
        metadata: {
          importance: 'medium',
          tags: [],
        },
        createdAt: now,
        updatedAt: now,
      })

      return relationshipId
    } catch (error) {
      throw new ConvexError('Failed to create relationship')
    }
  },
})

// Update an existing relationship
export const updateRelationship = mutation({
  args: {
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal('partner'),
        v.literal('family'),
        v.literal('friend'),
        v.literal('colleague'),
        v.literal('other')
      )
    ),
    photo: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    args: {
      relationshipId: Id<'relationships'>
      userId: Id<'users'>
      name?: string
      type?: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
      photo?: string
    }
  ) => {
    // Get existing relationship
    const relationship = await ctx.db.get(args.relationshipId)
    if (!relationship) {
      throw new ConvexError('Relationship not found')
    }

    // Verify ownership
    if (relationship.userId !== args.userId) {
      throw new ConvexError(
        "Unauthorized: Cannot update another user's relationship"
      )
    }

    // Validate name if provided
    if (args.name !== undefined) {
      if (!args.name?.trim()) {
        throw new ConvexError('Relationship name cannot be empty')
      }
      if (args.name.trim().length > 100) {
        throw new ConvexError('Relationship name too long')
      }
    }

    try {
      const updateData: Record<string, any> = {
        updatedAt: Date.now(),
      }

      if (args.name !== undefined) {
        updateData.name = args.name.trim()
      }
      if (args.type !== undefined) {
        updateData.type = args.type
      }
      if (args.photo !== undefined) {
        updateData.photo = args.photo
      }

      await ctx.db.patch(args.relationshipId, updateData)
      return true
    } catch (error) {
      throw new ConvexError('Failed to update relationship')
    }
  },
})

// Delete a relationship
export const deleteRelationship = mutation({
  args: {
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
  },
  handler: async (
    ctx: MutationCtx,
    args: { relationshipId: Id<'relationships'>; userId: Id<'users'> }
  ) => {
    // Get existing relationship
    const relationship = await ctx.db.get(args.relationshipId)
    if (!relationship) {
      throw new ConvexError('Relationship not found')
    }

    // Verify ownership
    if (relationship.userId !== args.userId) {
      throw new ConvexError(
        "Unauthorized: Cannot delete another user's relationship"
      )
    }

    try {
      // Check if there are any journal entries for this relationship
      const entries = await ctx.db
        .query('journalEntries')
        .withIndex('by_relationship', (q: any) =>
          q.eq('relationshipId', args.relationshipId)
        )
        .first()

      if (entries) {
        throw new ConvexError(
          'Cannot delete relationship with existing journal entries'
        )
      }

      await ctx.db.delete(args.relationshipId)
      return true
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error
      }
      throw new ConvexError('Failed to delete relationship')
    }
  },
})

// Get relationships by user
export const getRelationshipsByUser = query({
  args: {
    userId: v.id('users'),
    type: v.optional(
      v.union(
        v.literal('partner'),
        v.literal('family'),
        v.literal('friend'),
        v.literal('colleague'),
        v.literal('other')
      )
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (
    ctx: QueryCtx,
    args: {
      userId: Id<'users'>
      type?: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
      limit?: number
      offset?: number
    }
  ) => {
    let query = ctx.db
      .query('relationships')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))

    if (args.type) {
      query = query.filter((q: any) => q.eq(q.field('type'), args.type))
    }

    if (args.offset) {
      // Note: Convex doesn't have native offset, so we'll implement pagination differently
      // For now, we'll use a simpler approach
    }

    const limit = args.limit || 20
    return await query.order('desc').take(limit)
  },
})

// Get relationship by ID
export const getRelationshipById = query({
  args: {
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
  },
  handler: async (
    ctx: QueryCtx,
    args: { relationshipId: Id<'relationships'>; userId: Id<'users'> }
  ) => {
    const relationship = await ctx.db.get(args.relationshipId)
    if (!relationship) {
      throw new ConvexError('Relationship not found')
    }

    // Verify ownership
    if (relationship.userId !== args.userId) {
      throw new ConvexError(
        "Unauthorized: Cannot access another user's relationship"
      )
    }

    return relationship
  },
})

// Get relationships count by user
export const getRelationshipsCount = query({
  args: { userId: v.id('users') },
  handler: async (ctx: QueryCtx, args: { userId: Id<'users'> }) => {
    const relationships = await ctx.db
      .query('relationships')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .collect()

    return relationships.length
  },
})
