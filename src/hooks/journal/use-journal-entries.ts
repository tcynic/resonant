// TODO: Re-enable when ready for production
// import { useUser } from '@clerk/nextjs'
// TODO: Re-enable these imports when Convex integration is complete
// import { useMutation, useQuery } from 'convex/react'
import {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  JournalEntry,
} from '@/lib/types'

// TODO: Re-enable Convex API imports when generated files are available
// Import Convex API - these will be mocked in tests
// let api: {
//   users: { getCurrentUser: string }
//   journalEntries: {
//     createJournalEntry: string
//     updateJournalEntry: string
//     deleteJournalEntry: string
//     getJournalEntriesByUser: string
//     getJournalEntryById: string
//     searchJournalEntries: string
//   }
// }

// try {
//   // eslint-disable-next-line @typescript-eslint/no-require-imports
//   const convexApi = require('../../../convex/_generated/api')
//   api = convexApi.api
// } catch {
//   // Handle case where generated files don't exist (e.g., in tests)
//   api = {
//     users: { getCurrentUser: 'users:getCurrentUser' },
//     journalEntries: {
//       createJournalEntry: 'journalEntries:createJournalEntry',
//       updateJournalEntry: 'journalEntries:updateJournalEntry',
//       deleteJournalEntry: 'journalEntries:deleteJournalEntry',
//       getJournalEntriesByUser: 'journalEntries:getJournalEntriesByUser',
//       getJournalEntryById: 'journalEntries:getJournalEntryById',
//       searchJournalEntries: 'journalEntries:searchJournalEntries',
//     },
//   }
// }

export function useJournalEntries() {
  // TODO: Re-enable user authentication when ready for production
  // const { user } = useUser()

  // Mock data for development until Convex is fully integrated
  const currentUser = { _id: 'mock_user_id' }
  const journalEntries: JournalEntry[] = []
  const journalEntriesCount = 0

  // TODO: Replace with actual Convex queries when generated files are available
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )

  // const journalEntries = useQuery(
  //   api.journalEntries.getJournalEntriesByUser,
  //   currentUser ? { userId: currentUser._id, ...searchOptions } : 'skip'
  // )

  return {
    journalEntries: journalEntries || [],
    journalEntriesCount: journalEntriesCount || 0,
    isLoading: currentUser === undefined,
    currentUser,
  }
}

export function useJournalEntryById(entryId?: string) {
  // TODO: Re-enable user authentication when ready for production
  // const { user } = useUser()

  // Mock data for development until Convex is fully integrated
  const currentUser = { _id: 'mock_user_id' }

  // Provide mock entry if entryId is provided
  const journalEntry: JournalEntry | null = entryId
    ? {
        _id: entryId,
        userId: 'mock_user_id',
        relationshipId: 'mock_relationship_id',
        content: 'Mock journal entry content for testing',
        mood: 'happy',
        isPrivate: false,
        tags: ['mock', 'testing'],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
      }
    : null

  // TODO: Replace with actual Convex queries when generated files are available
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )

  // const journalEntry = useQuery(
  //   api.journalEntries.getJournalEntryById,
  //   currentUser && entryId ? { entryId } : 'skip'
  // )

  return {
    journalEntry,
    isLoading: currentUser === undefined,
    currentUser,
  }
}

export function useJournalEntryMutations() {
  // TODO: Re-enable user authentication when ready for production
  // const { user } = useUser()

  // Mock data for development until Convex is fully integrated
  const currentUser = { _id: 'mock_user_id' }

  // TODO: Replace with actual Convex mutations when generated files are available
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )

  // const createJournalEntryMutation = useMutation(api.journalEntries.createJournalEntry)
  // const updateJournalEntryMutation = useMutation(api.journalEntries.updateJournalEntry)
  // const deleteJournalEntryMutation = useMutation(api.journalEntries.deleteJournalEntry)

  const createJournalEntry = async (
    data: CreateJournalEntryData
  ): Promise<string> => {
    console.log('Mock createJournalEntry called with:', data)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful creation
    return `mock_journal_entry_${Date.now()}`
  }

  const updateJournalEntry = async (
    entryId: string,
    data: UpdateJournalEntryData
  ): Promise<boolean> => {
    console.log('Mock updateJournalEntry called with:', { entryId, data })

    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Validate update data
    if (
      data.content !== undefined &&
      (!data.content.trim() || data.content.trim().length < 10)
    ) {
      throw new Error('Content must be at least 10 characters')
    }

    if (data.tags && data.tags.length > 5) {
      throw new Error('Maximum 5 tags allowed')
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful update
    return true
  }

  const deleteJournalEntry = async (entryId: string): Promise<boolean> => {
    console.log('Mock deleteJournalEntry called with:', entryId)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful deletion
    return true
  }

  return {
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    isReady: !!currentUser,
  }
}
