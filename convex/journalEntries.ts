import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { ConvexError } from 'convex/values'

// Create a new journal entry
export const createEntry = mutation({
  args: {
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
    content: v.string(),
    mood: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.content?.trim()) {
      throw new ConvexError('Entry content is required')
    }
    if (args.content.trim().length > 10000) {
      throw new ConvexError('Entry content too long')
    }

    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    // Verify relationship exists and belongs to user
    const relationship = await ctx.db.get(args.relationshipId)
    if (!relationship) {
      throw new ConvexError('Relationship not found')
    }
    if (relationship.userId !== args.userId) {
      throw new ConvexError(
        "Unauthorized: Cannot create entry for another user's relationship"
      )
    }

    // Validate tags if provided
    if (args.tags && args.tags.length > 10) {
      throw new ConvexError('Too many tags (maximum 10)')
    }
    if (args.tags && args.tags.some(tag => tag.length > 50)) {
      throw new ConvexError('Tag too long (maximum 50 characters)')
    }

    try {
      const now = Date.now()
      const entryId = await ctx.db.insert('journalEntries', {
        userId: args.userId,
        relationshipId: args.relationshipId,
        content: args.content.trim(),
        mood: args.mood?.trim(),
        isPrivate: args.isPrivate || false,
        tags: args.tags?.map(tag => tag.trim()).filter(tag => tag.length > 0),
        createdAt: now,
        updatedAt: now,
      })

      return entryId
    } catch (error) {
      throw new ConvexError('Failed to create journal entry')
    }
  },
})

// Update an existing journal entry
export const updateEntry = mutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
    content: v.optional(v.string()),
    mood: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get existing entry
    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new ConvexError('Journal entry not found')
    }

    // Verify ownership
    if (entry.userId !== args.userId) {
      throw new ConvexError("Unauthorized: Cannot update another user's entry")
    }

    // Validate content if provided
    if (args.content !== undefined) {
      if (!args.content?.trim()) {
        throw new ConvexError('Entry content cannot be empty')
      }
      if (args.content.trim().length > 10000) {
        throw new ConvexError('Entry content too long')
      }
    }

    // Validate tags if provided
    if (args.tags && args.tags.length > 10) {
      throw new ConvexError('Too many tags (maximum 10)')
    }
    if (args.tags && args.tags.some(tag => tag.length > 50)) {
      throw new ConvexError('Tag too long (maximum 50 characters)')
    }

    try {
      const updateData: any = {
        updatedAt: Date.now(),
      }

      if (args.content !== undefined) {
        updateData.content = args.content.trim()
      }
      if (args.mood !== undefined) {
        updateData.mood = args.mood?.trim()
      }
      if (args.isPrivate !== undefined) {
        updateData.isPrivate = args.isPrivate
      }
      if (args.tags !== undefined) {
        updateData.tags = args.tags
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      }

      await ctx.db.patch(args.entryId, updateData)
      return true
    } catch (error) {
      throw new ConvexError('Failed to update journal entry')
    }
  },
})

// Delete a journal entry
export const deleteEntry = mutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Get existing entry
    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new ConvexError('Journal entry not found')
    }

    // Verify ownership
    if (entry.userId !== args.userId) {
      throw new ConvexError("Unauthorized: Cannot delete another user's entry")
    }

    try {
      await ctx.db.delete(args.entryId)
      return true
    } catch (error) {
      throw new ConvexError('Failed to delete journal entry')
    }
  },
})

// Get entries by user
export const getEntriesByUser = query({
  args: {
    userId: v.id('users'),
    isPrivate: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', args.userId))

    if (args.isPrivate !== undefined) {
      query = query.filter(q => q.eq(q.field('isPrivate'), args.isPrivate))
    }

    const limit = args.limit || 20
    return await query.order('desc').take(limit)
  },
})

// Get entries by relationship
export const getEntriesByRelationship = query({
  args: {
    relationshipId: v.id('relationships'),
    userId: v.id('users'),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify relationship belongs to user
    const relationship = await ctx.db.get(args.relationshipId)
    if (!relationship) {
      throw new ConvexError('Relationship not found')
    }
    if (relationship.userId !== args.userId) {
      throw new ConvexError(
        "Unauthorized: Cannot access another user's relationship entries"
      )
    }

    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )

    const limit = args.limit || 20
    return await query.order('desc').take(limit)
  },
})

// Get entry by ID
export const getEntryById = query({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new ConvexError('Journal entry not found')
    }

    // Verify ownership
    if (entry.userId !== args.userId) {
      throw new ConvexError("Unauthorized: Cannot access another user's entry")
    }

    return entry
  },
})

// Search entries
export const searchEntries = query({
  args: {
    userId: v.id('users'),
    query: v.optional(v.string()),
    relationshipId: v.optional(v.id('relationships')),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', args.userId))

    if (args.relationshipId) {
      query = query.filter(q =>
        q.eq(q.field('relationshipId'), args.relationshipId)
      )
    }

    if (args.isPrivate !== undefined) {
      query = query.filter(q => q.eq(q.field('isPrivate'), args.isPrivate))
    }

    if (args.startDate !== undefined) {
      query = query.filter(q => q.gte(q.field('createdAt'), args.startDate!))
    }

    if (args.endDate !== undefined) {
      query = query.filter(q => q.lte(q.field('createdAt'), args.endDate!))
    }

    const limit = args.limit || 20
    let entries = await query.order('desc').take(limit)

    // Apply text search filter (basic implementation)
    if (args.query) {
      const searchTerm = args.query.toLowerCase()
      entries = entries.filter(
        entry =>
          entry.content.toLowerCase().includes(searchTerm) ||
          entry.mood?.toLowerCase().includes(searchTerm)
      )
    }

    // Apply tags filter
    if (args.tags && args.tags.length > 0) {
      entries = entries.filter(
        entry => entry.tags && args.tags!.some(tag => entry.tags!.includes(tag))
      )
    }

    return entries
  },
})

// Get entries count
export const getEntriesCount = query({
  args: {
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', args.userId))

    if (args.relationshipId) {
      query = query.filter(q =>
        q.eq(q.field('relationshipId'), args.relationshipId)
      )
    }

    const entries = await query.collect()
    return entries.length
  },
})
