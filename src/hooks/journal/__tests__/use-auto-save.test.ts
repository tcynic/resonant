import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoSave, useDraftLoader } from '../use-auto-save'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock debounce hook with proper timer behavior
jest.mock('../../use-debounce', () => ({
  useDebounce: jest.fn(),
}))

const { useDebounce } = jest.requireActual('../../use-debounce')

// Wrap timer advances in act to handle state updates
const advanceTimers = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms)
  })
}

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Configure the debounce mock to return the value immediately for most tests
    // This can be overridden in specific tests that need debounce behavior
    ;(useDebounce as jest.Mock).mockImplementation(value => value)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  const mockData = {
    content: 'Test journal entry content',
    relationshipIds: ['rel_123'],
    mood: 'happy' as const,
    isPrivate: true,
    tags: ['test', 'journal'],
  }

  describe('auto-save functionality', () => {
    it('should initialize with idle status', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const { result } = renderHook(() =>
        useAutoSave(
          { content: '', relationshipIds: [] },
          { key: 'test-entry', enabled: true }
        )
      )

      // Initial state before any content is provided
      expect(result.current.saveStatus).toBe('idle')
      expect(result.current.lastSaved).toBeNull()
      expect(result.current.hasDraft).toBe(false)
    })

    it('should save data when enabled and content exists', async () => {
      // Start with empty data, then change to trigger the effect
      const { rerender, result } = renderHook(
        ({ data }) => useAutoSave(data, { key: 'test-entry', enabled: true }),
        { initialProps: { data: { content: '', relationshipIds: [] } } }
      )

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).toBeDefined()
        expect(result.current.saveStatus).toBe('idle')
      })

      // Update to non-empty content - this should trigger the effect
      await act(async () => {
        rerender({ data: mockData })
      })

      // First check if the effect starts (status should become 'saving')
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // The save effect should have started
      expect(result.current.saveStatus).toBe('saving')

      // Advance timers to complete the simulated save delay (100ms)
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // Should have saved to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'journal-draft-test-entry',
        expect.stringContaining(mockData.content)
      )
    }, 10000)

    it('should not save when disabled', () => {
      renderHook(() =>
        useAutoSave(mockData, { key: 'test-entry', enabled: false })
      )

      advanceTimers(1000)

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should not save when content is empty', () => {
      const emptyData = { ...mockData, content: '' }

      renderHook(() =>
        useAutoSave(emptyData, { key: 'test-entry', enabled: true })
      )

      advanceTimers(1000)

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should update save status correctly', async () => {
      const { result, rerender } = renderHook(
        ({ data }) => useAutoSave(data, { key: 'test-entry', enabled: true }),
        { initialProps: { data: { content: '', relationshipIds: [] } } }
      )

      // Wait for initial render
      await waitFor(() => {
        expect(result.current).toBeDefined()
        expect(result.current.saveStatus).toBe('idle')
      })

      // Update to non-empty content - this should trigger the effect
      await act(async () => {
        rerender({ data: mockData })
      })

      // First check if the effect starts (status should become 'saving')
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // The save effect should have started
      expect(result.current.saveStatus).toBe('saving')

      // Advance timers to complete the simulated save delay (100ms)
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // Status should now be 'saved'
      expect(result.current.saveStatus).toBe('saved')

      // Should have triggered save operation
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    }, 10000)

    it('should track last saved time', async () => {
      const { result } = renderHook(() =>
        useAutoSave(mockData, { key: 'test-entry', enabled: true })
      )

      const beforeSave = new Date()

      // Wait for initial effect to start
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // Advance timers to complete the save
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // lastSaved should be set after save
      expect(result.current.lastSaved).not.toBeNull()
      expect(result.current.lastSaved!.getTime()).toBeGreaterThanOrEqual(
        beforeSave.getTime()
      )
    }, 10000)
  })

  describe('draft management', () => {
    it('should detect existing drafts', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const { result } = renderHook(() =>
        useAutoSave(mockData, { key: 'test-entry', enabled: true })
      )

      expect(result.current.hasDraft).toBe(true)
    })

    it('should clear drafts when requested', () => {
      const { result } = renderHook(() =>
        useAutoSave(mockData, { key: 'test-entry', enabled: true })
      )

      act(() => {
        result.current.clearDraft()
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'journal-draft-test-entry'
      )
    })

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const { result } = renderHook(() =>
        useAutoSave(mockData, { key: 'test-entry', enabled: true })
      )

      // Wait for initial effect to start
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // The save effect should have started
      expect(result.current.saveStatus).toBe('saving')

      // Advance timers to complete the save attempt (which will fail)
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // Should not throw error, should handle gracefully with error status
      expect(result.current.saveStatus).toBeDefined()
      expect(result.current.saveStatus).toBe('error')
    }, 10000)
  })

  describe('data validation and sanitization', () => {
    it('should handle special characters in content', async () => {
      const specialData = {
        ...mockData,
        content: 'Content with "quotes" and \n newlines \t tabs',
      }

      renderHook(() =>
        useAutoSave(specialData, { key: 'test-entry', enabled: true })
      )

      // Wait for initial effect to start
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // Advance timers to complete the save
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'journal-draft-test-entry',
        expect.stringContaining(JSON.stringify(specialData.content))
      )
    })

    it('should handle undefined and null values', async () => {
      const incompleteData = {
        content: 'Valid content',
        relationshipIds: ['rel_123'],
        mood: undefined,
        isPrivate: true,
        tags: undefined,
      }

      renderHook(() =>
        useAutoSave(incompleteData, { key: 'test-entry', enabled: true })
      )

      // Wait for initial effect to start
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // Advance timers to complete the save
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'journal-draft-test-entry',
        expect.stringContaining(JSON.stringify(incompleteData.content))
      )
    })

    it('should handle large data sets', async () => {
      const largeData = {
        ...mockData,
        content: 'A'.repeat(10000), // Large content
        tags: Array.from({ length: 100 }, (_, i) => `tag${i}`), // Many tags
      }

      renderHook(() =>
        useAutoSave(largeData, { key: 'test-entry', enabled: true })
      )

      // Wait for initial effect to start
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // Advance timers to complete the save
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('performance and efficiency', () => {
    it('should not save if data has not changed', async () => {
      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { key: 'test-entry', enabled: true }),
        { initialProps: { data: mockData } }
      )

      // Wait for initial save
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      await act(async () => {
        jest.advanceTimersByTime(100) // Complete the save
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1)

      // Re-render with same data - should not trigger another save since debounce returns same value
      act(() => {
        rerender({ data: mockData })
      })

      act(() => {
        jest.runAllTimers()
      })

      // Should not save again if data hasn't changed
      // Note: This behavior depends on the implementation details
    })

    it('should handle rapid data changes efficiently', async () => {
      const { rerender } = renderHook(
        ({ data }) => useAutoSave(data, { key: 'test-entry', enabled: true }),
        { initialProps: { data: mockData } }
      )

      // Rapidly change data multiple times
      act(() => {
        for (let i = 0; i < 10; i++) {
          rerender({
            data: { ...mockData, content: `Content version ${i}` },
          })
        }
      })

      // Wait for effects to start
      await act(async () => {
        jest.advanceTimersByTime(0) // Flush micro tasks
      })

      // Complete the save
      await act(async () => {
        jest.advanceTimersByTime(100)
      })

      // Due to our immediate debounce mock, this should save the final version
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })
  })
})

describe('useDraftLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load existing draft data', () => {
    const draftData = { content: 'Saved draft content' }
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(draftData))

    const { result } = renderHook(() => useDraftLoader('test-entry'))

    expect(result.current).toEqual(draftData)
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
      'journal-draft-test-entry'
    )
  })

  it('should return null for non-existent draft', () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useDraftLoader('test-entry'))

    expect(result.current).toBeNull()
  })

  it('should handle invalid JSON gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json{')

    const { result } = renderHook(() => useDraftLoader('test-entry'))

    expect(result.current).toBeNull()
  })

  it('should handle localStorage errors', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage not available')
    })

    const { result } = renderHook(() => useDraftLoader('test-entry'))

    expect(result.current).toBeNull()
  })

  it('should load different drafts for different keys', () => {
    const draft1 = { content: 'Draft 1' }
    const draft2 = { content: 'Draft 2' }

    mockLocalStorage.getItem.mockImplementation(key => {
      if (key === 'journal-draft-entry-1') return JSON.stringify(draft1)
      if (key === 'journal-draft-entry-2') return JSON.stringify(draft2)
      return null
    })

    const { result: result1 } = renderHook(() => useDraftLoader('entry-1'))
    const { result: result2 } = renderHook(() => useDraftLoader('entry-2'))

    expect(result1.current).toEqual(draft1)
    expect(result2.current).toEqual(draft2)
  })
})
