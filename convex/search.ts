import { v } from 'convex/values'
import { query } from './_generated/server'
import { ConvexError } from 'convex/values'
import { Id } from './_generated/dataModel'

// Advanced search interface for journal entries
export const searchJournalEntries = query({
  args: {
    userId: v.id('users'),
    searchQuery: v.string(),
    relationshipIds: v.optional(v.array(v.id('relationships'))),
    includePrivate: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      userId,
      searchQuery,
      relationshipIds = [],
      includePrivate = true,
      limit = 20,
      cursor,
    } = args

    // Validate search query
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      throw new ConvexError('Search query must be at least 2 characters long')
    }

    if (searchQuery.length > 200) {
      throw new ConvexError('Search query too long (maximum 200 characters)')
    }

    // Validate user exists
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new ConvexError('User not found')
    }

    try {
      // Build search query using the search index
      let searchBuilder = ctx.db
        .query('journalEntries')
        .withSearchIndex('search_content', q => {
          let query = q
            .search('content', searchQuery.trim())
            .eq('userId', userId)

          // Filter by privacy setting
          if (!includePrivate) {
            query = query.eq('isPrivate', false)
          }

          return query
        })

      // Get paginated results
      const searchResults = await searchBuilder.paginate({
        numItems: Math.min(limit, 50), // Cap at 50 for performance
        cursor: cursor || null,
      })

      let results = searchResults.page

      // Apply relationship filter if specified
      if (relationshipIds.length > 0) {
        // Verify relationships belong to user
        const relationships = await Promise.all(
          relationshipIds.map(id => ctx.db.get(id))
        )

        const validRelationshipIds = relationships
          .filter(rel => rel && rel.userId === userId)
          .map(rel => rel!._id)

        if (validRelationshipIds.length === 0) {
          throw new ConvexError('No valid relationships found')
        }

        results = results.filter(entry =>
          validRelationshipIds.includes(entry.relationshipId)
        )
      }

      // Enrich results with relationship data
      const enrichedResults = await Promise.all(
        results.map(async entry => {
          const relationship = await ctx.db.get(entry.relationshipId)

          return {
            _id: entry._id,
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags || [],
            isPrivate: entry.isPrivate || false,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            relationship: relationship
              ? {
                  _id: relationship._id,
                  name: relationship.name,
                  type: relationship.type,
                  photo: relationship.photo,
                }
              : null,
            // Add snippet preview (first 200 chars with search term highlighted)
            snippet: createSearchSnippet(entry.content, searchQuery, 200),
          }
        })
      )

      return {
        results: enrichedResults,
        hasMore: !searchResults.isDone,
        nextCursor: searchResults.continueCursor,
        totalResults: enrichedResults.length,
        searchQuery: searchQuery.trim(),
      }
    } catch (error) {
      console.error('Search failed:', error)
      throw new ConvexError('Search operation failed')
    }
  },
})

// Get search suggestions based on existing entries
export const getSearchSuggestions = query({
  args: {
    userId: v.id('users'),
    partialQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, partialQuery, limit = 5 } = args

    if (partialQuery.length < 2) {
      return []
    }

    // Get user's recent entries to extract keywords
    const recentEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user_created', q => q.eq('userId', userId))
      .order('desc')
      .take(100) // Look at recent 100 entries for suggestions

    // Extract unique words from content and tags
    const words = new Set<string>()
    const partial = partialQuery.toLowerCase()

    recentEntries.forEach(entry => {
      // Extract words from content
      const contentWords = entry.content.toLowerCase().match(/\b\w+\b/g) || []

      contentWords.forEach((word: string) => {
        if (word.length >= 3 && word.startsWith(partial) && word !== partial) {
          words.add(word)
        }
      })

      // Extract from tags
      if (entry.tags) {
        entry.tags.forEach((tag: string) => {
          const tagLower = tag.toLowerCase()
          if (
            tagLower.length >= 3 &&
            tagLower.startsWith(partial) &&
            tagLower !== partial
          ) {
            words.add(tagLower)
          }
        })
      }
    })

    // Return top suggestions sorted by length (shorter first)
    return Array.from(words)
      .sort((a, b) => a.length - b.length)
      .slice(0, limit)
  },
})

// Get relationship search results for filtering
export const getRelationshipSearchResults = query({
  args: {
    userId: v.id('users'),
    searchQuery: v.string(),
    relationshipIds: v.array(v.id('relationships')),
  },
  handler: async (ctx, args) => {
    const { userId, searchQuery, relationshipIds } = args

    // Get relationship names for display
    const relationships = await Promise.all(
      relationshipIds.map(async id => {
        const rel = await ctx.db.get(id)
        return rel && rel.userId === userId ? rel : null
      })
    )

    const validRelationships = relationships.filter(Boolean)

    // Get entry counts per relationship for this search
    const relationshipCounts = await Promise.all(
      validRelationships.map(async relationship => {
        const searchResults = await ctx.db
          .query('journalEntries')
          .withSearchIndex('search_content', q =>
            q
              .search('content', searchQuery)
              .eq('userId', userId)
              .eq('relationshipId', relationship!._id)
          )
          .collect()

        return {
          relationship: {
            _id: relationship!._id,
            name: relationship!.name,
            type: relationship!.type,
            photo: relationship!.photo,
          },
          entryCount: searchResults.length,
        }
      })
    )

    return relationshipCounts.filter(item => item.entryCount > 0)
  },
})

// Helper function to create search snippets
function createSearchSnippet(
  content: string,
  searchQuery: string,
  maxLength: number
): string {
  const query = searchQuery.toLowerCase()
  const contentLower = content.toLowerCase()
  const queryIndex = contentLower.indexOf(query)

  if (queryIndex === -1) {
    // If search term not found (shouldn't happen), return start of content
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content
  }

  // Calculate snippet bounds
  const contextLength = Math.floor((maxLength - query.length) / 2)
  const start = Math.max(0, queryIndex - contextLength)
  const end = Math.min(
    content.length,
    queryIndex + query.length + contextLength
  )

  let snippet = content.substring(start, end)

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  return snippet
}
