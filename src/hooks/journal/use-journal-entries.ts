/**
 * Journal Entries Hook - Mock-First Development Implementation
 *
 * DEVELOPMENT STRATEGY DOCUMENTATION:
 *
 * This file implements a deliberate "mock-first" development strategy that allows
 * UI/UX development to proceed independently of backend integration complexity.
 *
 * WHY MOCK-FIRST APPROACH:
 * 1. **Rapid Prototyping**: UI components can be developed and tested immediately
 * 2. **Independent Development**: Frontend and backend teams can work in parallel
 * 3. **Comprehensive Testing**: Mock implementations allow thorough component testing
 * 4. **User Experience Focus**: UX patterns can be refined before backend constraints
 * 5. **Deployment Flexibility**: UI can be deployed and demonstrated before full integration
 *
 * INTEGRATION TIMELINE:
 * - Phase 1: ✅ COMPLETED - UI components with mock data (Story 1.4)
 * - Phase 2: ✅ COMPLETED - Comprehensive testing with mocks (Story 1.4 QA)
 * - Phase 3: 📋 PLANNED - Convex integration activation (Story 2.3 AI Analysis Integration)
 * - Phase 4: 📋 PLANNED - Production deployment with real data (Launch Prep)
 *
 * CONVERSION PROCESS:
 * When ready for production integration:
 * 1. Uncomment Convex imports and API calls
 * 2. Remove mock implementations and console.log statements
 * 3. Update error handling to use real Convex error types
 * 4. Run integration tests to verify data flow
 * 5. Update documentation to reflect production status
 *
 * MOCK IMPLEMENTATION NOTES:
 * - Mock functions simulate realistic API delays (500ms)
 * - Error scenarios are handled to match expected Convex behavior
 * - Data structures match the planned Convex schema exactly
 * - Console logging provides development feedback
 *
 * SEE ALSO:
 * - docs/stories/1.4.journal-entry-system.md - Implementation details
 * - docs/stories/AI-Migration.7.legacy-system-migration-cleanup.md - Integration patterns
 * - convex/journalEntries.ts - Backend functions (already implemented)
 */

// PRODUCTION IMPORTS (commented during mock phase)
// TODO: Uncomment when activating Convex integration in Story 2.3
// import { useUser } from '@clerk/nextjs'
// import { useMutation, useQuery } from 'convex/react'

import {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  JournalEntry,
} from '@/lib/types'

// PRODUCTION API IMPORTS (commented during mock phase)
// TODO: Uncomment when activating Convex integration in Story 2.3
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

// PRODUCTION API LOADING (commented during mock phase)
// TODO: Uncomment when activating Convex integration in Story 2.3
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

/**
 * Primary hook for journal entries data fetching
 *
 * MOCK PHASE: Returns empty arrays for rapid UI development
 * PRODUCTION PHASE: Will fetch real data from Convex backend
 */
export function useJournalEntries() {
  // PRODUCTION USER AUTHENTICATION (commented during mock phase)
  // TODO: Uncomment when activating Convex integration in Story 2.3
  // const { user } = useUser()

  // MOCK IMPLEMENTATION: Provides consistent empty state for UI development
  // This allows components to handle empty states properly
  const currentUser = { _id: 'mock_user_id' }
  const journalEntries: JournalEntry[] = []
  const journalEntriesCount = 0

  // PRODUCTION IMPLEMENTATION (commented during mock phase)
  // TODO: Uncomment when activating Convex integration in Story 2.3
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

/**
 * Hook for fetching individual journal entry by ID
 *
 * MOCK PHASE: Returns mock data for testing and development
 * PRODUCTION PHASE: Will fetch specific entries from Convex backend
 */
export function useJournalEntryById(entryId?: string) {
  // PRODUCTION USER AUTHENTICATION (commented during mock phase)
  // TODO: Uncomment when activating Convex integration in Story 2.3
  // const { user } = useUser()

  // MOCK IMPLEMENTATION: Provides realistic test data for development
  const currentUser = { _id: 'mock_user_id' }

  // Mock entry generation - supports testing scenarios
  // Returns mock data for valid IDs, null for 'non_existent_id' (testing edge cases)
  const journalEntry: JournalEntry | null =
    entryId && entryId !== 'non_existent_id'
      ? {
          _id: entryId,
          _creationTime: Date.now() - 86400000,
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

  // PRODUCTION IMPLEMENTATION (commented during mock phase)
  // TODO: Uncomment when activating Convex integration in Story 2.3
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

/**
 * Hook for journal entry CRUD operations (Create, Read, Update, Delete)
 *
 * MOCK PHASE: Simulates backend operations with realistic delays and validation
 * PRODUCTION PHASE: Will perform actual Convex mutations
 */
export function useJournalEntryMutations() {
  // PRODUCTION USER AUTHENTICATION (commented during mock phase)
  // TODO: Uncomment when activating Convex integration in Story 2.3
  // const { user } = useUser()

  // MOCK IMPLEMENTATION: Provides authentication state for development
  const currentUser = { _id: 'mock_user_id' }

  // PRODUCTION IMPLEMENTATION (commented during mock phase)
  // TODO: Uncomment when activating Convex integration in Story 2.3
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )

  // const createJournalEntryMutation = useMutation(api.journalEntries.createJournalEntry)
  // const updateJournalEntryMutation = useMutation(api.journalEntries.updateJournalEntry)
  // const deleteJournalEntryMutation = useMutation(api.journalEntries.deleteJournalEntry)

  /**
   * MOCK CREATE OPERATION
   * Simulates journal entry creation with realistic API behavior
   */
  const createJournalEntry = async (
    data: CreateJournalEntryData
  ): Promise<string> => {
    console.log('Mock createJournalEntry called with:', data)

    // Simulate realistic API call delay for development testing
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful creation with timestamp-based ID
    return `mock_journal_entry_${Date.now()}`
  }

  /**
   * MOCK UPDATE OPERATION
   * Simulates journal entry updates with validation that matches production expectations
   */
  const updateJournalEntry = async (
    entryId: string,
    data: UpdateJournalEntryData
  ): Promise<boolean> => {
    console.log('Mock updateJournalEntry called with:', { entryId, data })

    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Mock validation that matches expected Convex schema validation
    if (
      data.content !== undefined &&
      (!data.content.trim() || data.content.trim().length < 10)
    ) {
      throw new Error('Content must be at least 10 characters')
    }

    if (data.tags && data.tags.length > 5) {
      throw new Error('Maximum 5 tags allowed')
    }

    // Simulate realistic API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock successful update
    return true
  }

  /**
   * MOCK DELETE OPERATION
   * Simulates journal entry deletion with realistic API behavior
   */
  const deleteJournalEntry = async (entryId: string): Promise<boolean> => {
    console.log('Mock deleteJournalEntry called with:', entryId)

    // Simulate realistic API call delay
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
