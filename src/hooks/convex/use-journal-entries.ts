/**
 * React hooks for journal entry operations
 * Note: These hooks assume journal entry functions will be created in convex/journalEntries.ts
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import {
  CreateJournalEntryArgs,
  UpdateJournalEntryArgs,
  SearchFilters,
  JournalEntry,
} from '@/lib/types'
import { useCallback } from 'react'

// ============================================================================
// JOURNAL ENTRY QUERIES
// ============================================================================

/**
 * Get journal entries for a user
 * Note: Assumes journalEntries.getByUser function exists
 */
export const useJournalEntriesByUser = (
  userId?: string,
  limit: number = 20
) => {
  const entries = useQuery(
    api.journalEntries.getByUser,
    userId ? { userId: userId as Id<'users'>, limit } : 'skip'
  )

  return {
    entries: entries || [],
    isLoading: entries === undefined,
    count: entries?.length || 0,
    isEmpty: entries?.length === 0,

    // Filter helpers
    withMood: entries?.filter((e: JournalEntry) => e.mood) || [],
    withoutMood: entries?.filter((e: JournalEntry) => !e.mood) || [],
    withAIAnalysis:
      entries?.filter((e: JournalEntry) => e.allowAIAnalysis) || [],

    // Sort helpers
    byDate:
      entries?.sort(
        (a: JournalEntry, b: JournalEntry) => b.createdAt - a.createdAt
      ) || [],
    recent: entries?.slice(0, 5) || [],
  }
}

/**
 * Get a specific journal entry by ID
 */
export const useJournalEntryById = (entryId?: string, userId?: string) => {
  const entry = useQuery(
    api.journalEntries.getById,
    entryId && userId
      ? {
          entryId: entryId as Id<'journalEntries'>,
          userId: userId as Id<'users'>,
        }
      : 'skip'
  )

  return {
    entry,
    isLoading: entry === undefined,
    exists: !!entry,
    canEdit: entry?.userId === userId,
    hasAIAnalysis: entry?.allowAIAnalysis || false,
  }
}

/**
 * Get recent journal entries
 */
export const useRecentJournalEntries = (
  userId?: string,
  limit: number = 10
) => {
  const entries = useQuery(
    api.journalEntries.getRecent,
    userId ? { userId: userId as Id<'users'>, limit } : 'skip'
  )

  return {
    entries: entries || [],
    isLoading: entries === undefined,
    isEmpty: entries?.length === 0,
  }
}

/**
 * Search journal entries
 */
export const useSearchJournalEntries = (
  userId?: string,
  query?: string,
  filters?: SearchFilters,
  limit: number = 20
) => {
  const results = useQuery(
    api.journalEntries.search,
    userId && query
      ? {
          userId: userId as Id<'users'>,
          query,
          relationshipId: filters?.relationshipId as
            | Id<'relationships'>
            | undefined,
          startDate: filters?.startDate,
          endDate: filters?.endDate,
          isPrivate: filters?.isPrivate,
          tags: filters?.tags,
          limit,
        }
      : 'skip'
  )

  return {
    results,
    entries: results || [],
    total: results?.length || 0,
    hasMore: false, // Simple implementation for now
    isLoading: results === undefined,
    isEmpty: results?.length === 0,
  }
}

// ============================================================================
// JOURNAL ENTRY MUTATIONS
// ============================================================================

/**
 * Create a new journal entry
 */
export const useCreateJournalEntry = () => {
  const createEntry = useMutation(api.journalEntries.create)

  return {
    createEntry: useCallback(
      async (args: CreateJournalEntryArgs) => {
        try {
          const entryId = await createEntry({
            ...args,
            userId: args.userId as Id<'users'>,
            relationshipId: args.relationshipId as Id<'relationships'>,
          })
          return { success: true, entryId }
        } catch (error) {
          console.error('Failed to create journal entry:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create journal entry',
          }
        }
      },
      [createEntry]
    ),
  }
}

/**
 * Update an existing journal entry
 */
export const useUpdateJournalEntry = () => {
  const updateEntry = useMutation(api.journalEntries.update)

  return {
    updateEntry: useCallback(
      async (args: UpdateJournalEntryArgs) => {
        try {
          await updateEntry({
            ...args,
            entryId: args.entryId as Id<'journalEntries'>,
            userId: args.userId as Id<'users'>,
          })
          return { success: true }
        } catch (error) {
          console.error('Failed to update journal entry:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update journal entry',
          }
        }
      },
      [updateEntry]
    ),
  }
}

/**
 * Delete a journal entry
 */
export const useDeleteJournalEntry = () => {
  const deleteEntry = useMutation(api.journalEntries.delete)

  return {
    deleteEntry: useCallback(
      async (entryId: string, userId: string) => {
        try {
          await deleteEntry({
            entryId: entryId as Id<'journalEntries'>,
            userId: userId as Id<'users'>,
          })
          return { success: true }
        } catch (error) {
          console.error('Failed to delete journal entry:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to delete journal entry',
          }
        }
      },
      [deleteEntry]
    ),
  }
}

// ============================================================================
// JOURNAL ENTRY STATISTICS
// ============================================================================

/**
 * Get journal entry statistics for a user
 */
export const useJournalEntryStats = (userId?: string) => {
  const { entries, isLoading } = useJournalEntriesByUser(userId, 1000) // Get all entries for stats

  const stats = {
    total: entries.length,
    thisWeek: 0,
    thisMonth: 0,
    withMood: 0,
    withAIAnalysis: 0,
    averageLength: 0,
    longestStreak: 0,
    currentStreak: 0,
  }

  if (!isLoading && entries.length > 0) {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000

    stats.thisWeek = entries.filter(
      (e: JournalEntry) => e.createdAt >= weekAgo
    ).length
    stats.thisMonth = entries.filter(
      (e: JournalEntry) => e.createdAt >= monthAgo
    ).length
    stats.withMood = entries.filter((e: JournalEntry) => e.mood).length
    stats.withAIAnalysis = entries.filter(
      (e: JournalEntry) => e.allowAIAnalysis
    ).length
    stats.averageLength = Math.round(
      entries.reduce(
        (sum: number, e: JournalEntry) => sum + e.content.length,
        0
      ) / entries.length
    )

    // Calculate streaks (consecutive days with entries)
    const entriesByDate = entries.reduce(
      (acc: Record<string, number>, entry: JournalEntry) => {
        const date = new Date(entry.createdAt).toDateString()
        acc[date] = (acc[date] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const dates = Object.keys(entriesByDate).sort()
    let currentStreak = 0
    let longestStreak = 0
    let streakCount = 0

    for (let i = dates.length - 1; i >= 0; i--) {
      const current = new Date(dates[i])
      const previous = i > 0 ? new Date(dates[i - 1]) : null

      if (
        !previous ||
        current.getTime() - previous.getTime() <= 24 * 60 * 60 * 1000
      ) {
        streakCount++
      } else {
        if (i === dates.length - 1) currentStreak = streakCount
        longestStreak = Math.max(longestStreak, streakCount)
        streakCount = 1
      }
    }

    stats.currentStreak = currentStreak
    stats.longestStreak = Math.max(longestStreak, streakCount)
  }

  return {
    stats,
    isLoading,
  }
}

// ============================================================================
// COMBINED JOURNAL HOOK
// ============================================================================

/**
 * Comprehensive journal hook with all journal functionality
 */
export const useJournal = (userId?: string) => {
  const { entries, isLoading, isEmpty } = useJournalEntriesByUser(userId)
  const { createEntry } = useCreateJournalEntry()
  const { updateEntry } = useUpdateJournalEntry()
  const { deleteEntry } = useDeleteJournalEntry()
  const { stats } = useJournalEntryStats(userId)

  return {
    // Data
    entries,
    isLoading,
    isEmpty,
    stats,

    // Actions
    createEntry,
    updateEntry,
    deleteEntry,

    // Helpers
    getEntryByDate: useCallback(
      (date: string) => {
        return entries.find(
          (e: JournalEntry) =>
            new Date(e.createdAt).toDateString() ===
            new Date(date).toDateString()
        )
      },
      [entries]
    ),

    getEntriesForRelationship: useCallback(
      (relationshipId: string) => {
        return entries.filter(
          (e: JournalEntry) => e.relationshipId === relationshipId
        )
      },
      [entries]
    ),

    getEntriesByMood: useCallback(
      (mood: string) => {
        return entries.filter((e: JournalEntry) => e.mood === mood)
      },
      [entries]
    ),

    getEntriesWithTag: useCallback(
      (tag: string) => {
        return entries.filter(
          (e: JournalEntry) => e.tags && e.tags.includes(tag)
        )
      },
      [entries]
    ),

    // Computed properties
    totalEntries: entries.length,
    recentEntries: entries.slice(0, 5),
    hasRecentEntry: entries.some(
      (e: JournalEntry) => Date.now() - e.createdAt < 24 * 60 * 60 * 1000
    ),
    allTags: [...new Set(entries.flatMap((e: JournalEntry) => e.tags || []))],
    allMoods: [
      ...new Set(entries.map((e: JournalEntry) => e.mood).filter(Boolean)),
    ],
  }
}
