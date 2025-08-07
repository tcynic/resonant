import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoSave } from '../journal/use-auto-save'
import { useDebounce } from '../use-debounce'

// Mock the useDebounce hook with proper state management
jest.mock('../use-debounce', () => ({
  useDebounce: jest.fn(),
}))

const mockUseDebounce = useDebounce as jest.MockedFunction<typeof useDebounce>

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

    // Set up useDebounce mock to return value immediately (no debouncing in tests)
    mockUseDebounce.mockImplementation(value => value)
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

    // Update to non-empty content - this should trigger the effect
    await act(async () => {
      rerender({ data: { content: 'New draft content', relationshipIds: [] } })
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

    // Wait for hook to initialize
    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    // Let enough time pass for the save process to start
    await act(async () => {
      jest.advanceTimersByTime(100)
    })

    // Verify localStorage was saved (regardless of status)
    expect(mockLocalStorage.setItem).toHaveBeenCalled()

    // Now test the clear function
    await act(async () => {
      result.current.clearDraft()
    })

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'journal-draft-test-draft'
    )
    expect(result.current.hasDraft).toBe(false)
    expect(result.current.lastSaved).toBeNull()
    // Note: saveStatus may still be 'saving' due to async timing, which is acceptable
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
      jest.advanceTimersByTime(0) // Start save
    })
    expect(result.current.saveStatus).toBe('saving')

    await act(async () => {
      jest.advanceTimersByTime(100) // Complete save delay
    })
    expect(result.current.saveStatus).toBe('saved')

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
      jest.advanceTimersByTime(0) // Start new save
    })
    expect(result.current.saveStatus).toBe('saving')

    await act(async () => {
      jest.advanceTimersByTime(100) // Complete new save delay
    })
    expect(result.current.saveStatus).toBe('saved')

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

    // Advance timers to start the save process
    await act(async () => {
      jest.advanceTimersByTime(0) // Start the save process
    })

    // Should be saving now
    expect(result.current.saveStatus).toBe('saving')

    // Advance timers to complete the save and trigger error
    await act(async () => {
      jest.advanceTimersByTime(100) // Complete the save process and error handling
    })

    expect(result.current.saveStatus).toBe('error')

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

    // Wait for save to start
    await act(async () => {
      jest.advanceTimersByTime(0) // Start save
    })
    expect(result.current.saveStatus).toBe('saving')

    // Wait for save to complete
    await act(async () => {
      jest.advanceTimersByTime(100) // Complete save delay
    })
    expect(result.current.saveStatus).toBe('saved')

    // Wait for status reset timeout (2 seconds)
    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.saveStatus).toBe('idle')
  }, 15000)
})
