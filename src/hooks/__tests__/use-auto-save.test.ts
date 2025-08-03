import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoSave } from '../journal/use-auto-save'

// Mock the useDebounce hook to avoid timing issues
jest.mock('../use-debounce', () => ({
  useDebounce: jest.fn(value => value), // Return value immediately without debouncing
}))

describe('useAutoSave', () => {
  let mockLocalStorage: {
    getItem: jest.Mock
    setItem: jest.Mock
    removeItem: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Mock localStorage
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  const defaultOptions = {
    key: 'test-draft',
    enabled: true,
  }

  it('should initialize with default state when no existing draft', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() =>
      useAutoSave({ content: '', relationshipIds: [] }, defaultOptions)
    )

    // Wait for the initial effect to complete
    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.hasDraft).toBe(false)
      expect(result.current.lastSaved).toBeNull()
    })
  })

  it('should auto-save when content is provided', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, defaultOptions),
      { initialProps: { data: { content: '', relationshipIds: [] } } }
    )

    // Wait for initial render
    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.saveStatus).toBe('idle')
    })

    // Update to non-empty content
    await act(async () => {
      rerender({ data: { content: 'New draft content', relationshipIds: [] } })
    })

    // Advance timers to complete the save process
    await act(async () => {
      jest.advanceTimersByTime(100) // For the simulated save delay
      jest.advanceTimersByTime(100) // Additional time for promise resolution
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved')
      },
      { timeout: 10000 }
    )

    // Should have saved to localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'journal-draft-test-draft',
      expect.stringContaining('New draft content')
    )

    expect(result.current.hasDraft).toBe(true)
    expect(result.current.lastSaved).not.toBeNull()
  }, 10000)

  it('should provide clear draft function', async () => {
    const { result } = renderHook(() =>
      useAutoSave(
        { content: 'content to clear', relationshipIds: [] },
        defaultOptions
      )
    )

    // Wait for hook to initialize and save to complete
    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    // Wait for save to complete since we have content
    await act(async () => {
      jest.advanceTimersByTime(100) // For the save delay
      jest.advanceTimersByTime(100) // Additional time for promise resolution
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved')
      },
      { timeout: 10000 }
    )

    await act(async () => {
      result.current.clearDraft()
    })

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'journal-draft-test-draft'
    )
    expect(result.current.hasDraft).toBe(false)
    expect(result.current.saveStatus).toBe('idle')
    expect(result.current.lastSaved).toBeNull()
  })

  it('should not save when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, { ...defaultOptions, enabled: false }),
      { initialProps: { data: { content: '', relationshipIds: [] } } }
    )

    act(() => {
      rerender({
        data: { content: 'this should not be saved', relationshipIds: [] },
      })
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.saveStatus).toBe('idle')
    })
  })

  it('should handle different content types', async () => {
    const initialData = { content: 'Test', relationshipIds: ['rel-1'] }
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, defaultOptions),
      { initialProps: { data: initialData } }
    )

    // Wait for hook to initialize
    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    // Wait for initial save to complete
    await act(async () => {
      jest.advanceTimersByTime(100)
      jest.advanceTimersByTime(100) // Additional time for promise resolution
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved')
      },
      { timeout: 10000 }
    )

    // Update with additional fields
    await act(async () => {
      rerender({
        data: {
          content: 'Updated content',
          relationshipIds: ['rel-1', 'rel-2'],
        },
      })
    })

    // Wait for the new save to complete
    await act(async () => {
      jest.advanceTimersByTime(100)
      jest.advanceTimersByTime(100) // Additional time for promise resolution
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved')
      },
      { timeout: 10000 }
    )

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'journal-draft-test-draft',
      expect.stringContaining('Updated content')
    )
  }, 15000)

  it('should handle localStorage errors gracefully', async () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, defaultOptions),
      { initialProps: { data: { content: '', relationshipIds: [] } } }
    )

    await act(async () => {
      rerender({
        data: { content: 'content that fails to store', relationshipIds: [] },
      })
    })

    // Should start saving
    expect(result.current.saveStatus).toBe('saving')

    // Advance timers and wait for error state
    await act(async () => {
      jest.advanceTimersByTime(100)
      jest.advanceTimersByTime(100) // Additional time for promise resolution
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('error')
      },
      { timeout: 10000 }
    )

    // Should not throw error and handle gracefully
    expect(() => jest.runAllTimers()).not.toThrow()
  }, 15000)

  it('should not save empty content', async () => {
    const { result } = renderHook(() =>
      useAutoSave({ content: '', relationshipIds: [] }, defaultOptions)
    )

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.saveStatus).toBe('idle')
    })
  })

  it('should detect existing draft on mount', async () => {
    const existingDraft = JSON.stringify({
      content: 'Existing draft',
      relationshipIds: [],
      timestamp: Date.now(),
    })
    mockLocalStorage.getItem.mockReturnValue(existingDraft)

    const { result } = renderHook(() =>
      useAutoSave({ content: '', relationshipIds: [] }, defaultOptions)
    )

    // Wait for initial effect to complete
    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.hasDraft).toBe(true)
    })
  })

  it('should reset status to idle after successful save', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave(data, defaultOptions),
      { initialProps: { data: { content: '', relationshipIds: [] } } }
    )

    // Wait for hook to initialize
    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.saveStatus).toBe('idle')
    })

    await act(async () => {
      rerender({ data: { content: 'Test content', relationshipIds: [] } })
    })

    // Wait for save to complete
    await act(async () => {
      jest.advanceTimersByTime(100)
      jest.advanceTimersByTime(100) // Additional time for promise resolution
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved')
      },
      { timeout: 10000 }
    )

    // Wait for status reset timeout
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('idle')
      },
      { timeout: 10000 }
    )
  }, 15000)
})
