import { renderHook, act } from '@testing-library/react'
import {
  useJournalEntries,
  useJournalEntryById,
  useJournalEntryMutations,
} from '../use-journal-entries'
import { CreateJournalEntryData, UpdateJournalEntryData } from '@/lib/types'

// Mock the Clerk hook
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(() => ({ user: { id: 'mock_user_id' } })),
}))

// Mock Convex hooks (they don't exist yet, so we use virtual: true)
jest.mock(
  'convex/react',
  () => ({
    useQuery: jest.fn(),
    useMutation: jest.fn(),
  }),
  { virtual: true }
)

describe('useJournalEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useJournalEntries hook', () => {
    it('should return empty array and loading state for new users', () => {
      const { result } = renderHook(() => useJournalEntries())

      expect(result.current.journalEntries).toEqual([])
      expect(result.current.journalEntriesCount).toBe(0)
      expect(result.current.isLoading).toBe(false) // Mock implementation returns false
      expect(result.current.currentUser).toEqual({ _id: 'mock_user_id' })
    })

    it('should handle search options parameter', () => {
      const searchOptions = {
        query: 'test search',
        relationshipId: 'rel_123',
        mood: 'happy' as const,
      }

      const { result } = renderHook(() => useJournalEntries(searchOptions))

      expect(result.current.journalEntries).toEqual([])
      // Note: In the mock implementation, search options are not used
      // but the hook should accept them without error
    })
  })

  describe('useJournalEntryById hook', () => {
    it('should return null for non-existent entry', () => {
      const { result } = renderHook(() =>
        useJournalEntryById('non_existent_id')
      )

      expect(result.current.journalEntry).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.currentUser).toEqual({ _id: 'mock_user_id' })
    })

    it('should handle undefined entryId', () => {
      const { result } = renderHook(() => useJournalEntryById())

      expect(result.current.journalEntry).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useJournalEntryMutations hook', () => {
    let mockConsoleLog: jest.SpyInstance

    beforeEach(() => {
      mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      mockConsoleLog.mockRestore()
    })

    it('should provide CRUD operations', () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      expect(result.current.createJournalEntry).toBeDefined()
      expect(result.current.updateJournalEntry).toBeDefined()
      expect(result.current.deleteJournalEntry).toBeDefined()
      expect(result.current.isReady).toBe(true)
    })

    it('should create journal entry successfully', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const createData: CreateJournalEntryData = {
        relationshipId: 'rel_123',
        content: 'Test journal entry content',
        mood: 'happy',
        isPrivate: true,
        tags: ['test', 'journal'],
      }

      await act(async () => {
        const entryId = await result.current.createJournalEntry(createData)
        expect(entryId).toMatch(/^mock_journal_entry_\d+$/)
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Mock createJournalEntry called with:',
        createData
      )
    })

    it('should update journal entry successfully', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const updateData: UpdateJournalEntryData = {
        content: 'Updated journal entry content',
        mood: 'content',
        tags: ['updated', 'test'],
      }

      await act(async () => {
        const success = await result.current.updateJournalEntry(
          'entry_123',
          updateData
        )
        expect(success).toBe(true)
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Mock updateJournalEntry called with:',
        { entryId: 'entry_123', data: updateData }
      )
    })

    it('should validate update data - content too short', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const updateData: UpdateJournalEntryData = {
        content: 'Short', // Less than 10 characters
      }

      await act(async () => {
        await expect(
          result.current.updateJournalEntry('entry_123', updateData)
        ).rejects.toThrow('Content must be at least 10 characters')
      })
    })

    it('should validate update data - too many tags', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const updateData: UpdateJournalEntryData = {
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'], // More than 5 tags
      }

      await act(async () => {
        await expect(
          result.current.updateJournalEntry('entry_123', updateData)
        ).rejects.toThrow('Maximum 5 tags allowed')
      })
    })

    it('should delete journal entry successfully', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      await act(async () => {
        const success = await result.current.deleteJournalEntry('entry_123')
        expect(success).toBe(true)
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Mock deleteJournalEntry called with:',
        'entry_123'
      )
    })

    it('should handle async operations with proper timing', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const startTime = Date.now()

      await act(async () => {
        await result.current.deleteJournalEntry('entry_123')
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take at least 500ms due to mock delay
      expect(duration).toBeGreaterThanOrEqual(450) // Allow some tolerance
    })

    it('should handle authentication check in update', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const updateData: UpdateJournalEntryData = {
        content: 'Valid content with enough characters',
      }

      // The mock implementation has a currentUser, so this should succeed
      await act(async () => {
        const success = await result.current.updateJournalEntry(
          'entry_123',
          updateData
        )
        expect(success).toBe(true)
      })
    })
  })

  describe('Mock implementation behavior', () => {
    it('should simulate realistic API delays', async () => {
      const { result } = renderHook(() => useJournalEntryMutations())

      const operations = [
        () =>
          result.current.createJournalEntry({
            relationshipId: 'rel_123',
            content: 'Test content for timing',
          }),
        () =>
          result.current.updateJournalEntry('entry_123', {
            content: 'Updated content for timing',
          }),
        () => result.current.deleteJournalEntry('entry_123'),
      ]

      for (const operation of operations) {
        const startTime = Date.now()

        await act(async () => {
          await operation()
        })

        const duration = Date.now() - startTime
        expect(duration).toBeGreaterThanOrEqual(450) // 500ms delay with tolerance
      }
    })

    it('should provide consistent mock user ID', () => {
      const { result: result1 } = renderHook(() => useJournalEntries())
      const { result: result2 } = renderHook(() => useJournalEntryById('test'))
      const { result: result3 } = renderHook(() => useJournalEntryMutations())

      expect(result1.current.currentUser?._id).toBe('mock_user_id')
      expect(result2.current.currentUser?._id).toBe('mock_user_id')
      expect(result3.current.isReady).toBe(true) // Indicates currentUser exists
    })
  })
})
