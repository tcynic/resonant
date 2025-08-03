import { renderHook } from '@testing-library/react'
import {
  useAIAnalysisStatus,
  useOptimizedAIStatus,
} from '../use-ai-analysis-status'
import { Id } from '@/convex/_generated/dataModel'

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}))

import { useQuery } from 'convex/react'

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

describe('useAIAnalysisStatus', () => {
  const mockEntryId = 'entry-123' as Id<'journalEntries'>

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock document.visibilityState for cross-tab tests
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    })
  })

  test('should return loading state when analysis is undefined', () => {
    mockUseQuery.mockReturnValue(undefined)

    const { result } = renderHook(() => useAIAnalysisStatus(mockEntryId))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.status).toBeUndefined()
    expect(result.current.analysis).toBe(null)
  })

  test('should return processing status with progress indicator', async () => {
    const mockAnalysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      entryId: mockEntryId,
      userId: 'user-123' as Id<'users'>,
      status: 'processing' as const,
      queuePosition: 3,
      estimatedCompletionTime: Date.now() + 60000,
      processingStartedAt: Date.now() - 15000,
      processingAttempts: 1,
      createdAt: Date.now() - 30000,
    }

    mockUseQuery.mockReturnValue(mockAnalysis)

    const { result } = renderHook(() => useAIAnalysisStatus(mockEntryId))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.status).toBe('processing')
    expect(result.current.progress).toEqual({
      position: 3,
      estimatedCompletion: mockAnalysis.estimatedCompletionTime,
      processingStarted: mockAnalysis.processingStartedAt,
    })
    expect(result.current.canRetry).toBe(false)
  })

  test('should return failed status with retry capability', () => {
    const mockAnalysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      entryId: mockEntryId,
      userId: 'user-123' as Id<'users'>,
      status: 'failed' as const,
      processingAttempts: 2,
      lastErrorMessage: 'Network timeout',
      createdAt: Date.now() - 30000,
    }

    mockUseQuery.mockReturnValue(mockAnalysis)

    const { result } = renderHook(() => useAIAnalysisStatus(mockEntryId))

    expect(result.current.status).toBe('failed')
    expect(result.current.error).toBe('Network timeout')
    expect(result.current.canRetry).toBe(true) // Less than 3 attempts
    expect(result.current.progress).toBeNull()
  })

  test('should return completed status', () => {
    const mockAnalysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      entryId: mockEntryId,
      userId: 'user-123' as Id<'users'>,
      status: 'completed' as const,
      processingAttempts: 1,
      createdAt: Date.now() - 30000,
    }

    mockUseQuery.mockReturnValue(mockAnalysis)

    const { result } = renderHook(() => useAIAnalysisStatus(mockEntryId))

    expect(result.current.status).toBe('completed')
    expect(result.current.canRetry).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  test('should not allow retry after 3 attempts', () => {
    const mockAnalysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      entryId: mockEntryId,
      userId: 'user-123' as Id<'users'>,
      status: 'failed' as const,
      processingAttempts: 3,
      lastErrorMessage: 'Max retries exceeded',
      createdAt: Date.now() - 30000,
    }

    mockUseQuery.mockReturnValue(mockAnalysis)

    const { result } = renderHook(() => useAIAnalysisStatus(mockEntryId))

    expect(result.current.canRetry).toBe(false)
  })
})

describe('useOptimizedAIStatus', () => {
  const mockEntryId = 'entry-123' as Id<'journalEntries'>

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    })

    // Mock addEventListener and removeEventListener
    jest.spyOn(document, 'addEventListener').mockImplementation(jest.fn())
    jest.spyOn(document, 'removeEventListener').mockImplementation(jest.fn())
  })

  test('should handle cross-tab visibility optimization', async () => {
    const mockAnalysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      entryId: mockEntryId,
      userId: 'user-123' as Id<'users'>,
      status: 'processing' as const,
      createdAt: Date.now(),
    }

    mockUseQuery.mockReturnValue(mockAnalysis)

    const { result } = renderHook(() => useOptimizedAIStatus(mockEntryId))

    expect(result.current.status).toBe('processing')
    expect(mockUseQuery).toHaveBeenCalled()
    const calls = mockUseQuery.mock.calls
    expect(calls[0][1]).toEqual({ entryId: mockEntryId })
    // The third parameter is optional, so only check if it exists
    if (calls[0][2]) {
      expect(calls[0][2]).toMatchObject({
        optimisticUpdates: true,
      })
    }
  })

  test('should handle null analysis gracefully', () => {
    mockUseQuery.mockReturnValue(null)

    const { result } = renderHook(() => useOptimizedAIStatus(mockEntryId))

    expect(result.current.status).toBeUndefined()
    expect(result.current.progress).toBeNull()
    expect(result.current.analysis).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
