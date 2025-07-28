import { renderHook } from '@testing-library/react'
import {
  useProcessingProgress,
  calculateProcessingProgress,
  formatDuration,
  getRelativeTime,
} from '../use-processing-progress'
import { Id } from '@/convex/_generated/dataModel'

describe('calculateProcessingProgress', () => {
  test('should return null for non-processing status', () => {
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'completed' as const,
      createdAt: Date.now(),
    }

    const result = calculateProcessingProgress(analysis)
    expect(result).toEqual({
      phase: 'completed',
      progress: 100,
      message: 'Analysis complete',
    })
  })

  test('should calculate queued progress correctly', () => {
    const now = Date.now()
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'processing' as const,
      queuedAt: now - 15000, // 15 seconds ago
      queuePosition: 3,
      estimatedCompletionTime: now + 45000,
      createdAt: now - 15000,
    }

    const result = calculateProcessingProgress(analysis)

    expect(result).toMatchObject({
      phase: 'queued',
      eta: analysis.estimatedCompletionTime,
      message: 'Position 3 in queue',
    })
    expect(result!.progress).toBeGreaterThan(0)
    expect(result!.progress).toBeLessThan(30)
  })

  test('should calculate processing progress correctly', () => {
    const now = Date.now()
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'processing' as const,
      queuedAt: now - 60000, // 1 minute ago
      processingStartedAt: now - 30000, // 30 seconds ago
      estimatedCompletionTime: now + 15000,
      createdAt: now - 60000,
    }

    const result = calculateProcessingProgress(analysis)

    expect(result).toMatchObject({
      phase: 'processing',
      eta: analysis.estimatedCompletionTime,
      message: 'Analyzing your journal entry...',
    })
    expect(result!.progress).toBeGreaterThanOrEqual(30)
    expect(result!.progress).toBeLessThanOrEqual(100)
  })

  test('should handle failed status', () => {
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'failed' as const,
      createdAt: Date.now(),
    }

    const result = calculateProcessingProgress(analysis)
    expect(result).toEqual({
      phase: 'failed',
      progress: 0,
      message: 'Analysis failed',
    })
  })
})

describe('useProcessingProgress', () => {
  test('should format ETA correctly', () => {
    const now = Date.now()
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'processing' as const,
      processingStartedAt: now - 15000,
      estimatedCompletionTime: now + 90000, // 90 seconds from now
      createdAt: now - 30000,
    }

    const { result } = renderHook(() => useProcessingProgress(analysis))

    expect(result.current.etaFormatted).toMatch(/~1 minute/)
    expect(result.current.isProcessing).toBe(true)
    expect(result.current.isCompleted).toBe(false)
  })

  test('should handle ETA in seconds', () => {
    const now = Date.now()
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'processing' as const,
      processingStartedAt: now - 5000,
      estimatedCompletionTime: now + 30000, // 30 seconds from now
      createdAt: now - 20000,
    }

    const { result } = renderHook(() => useProcessingProgress(analysis))

    expect(result.current.etaFormatted).toMatch(/~\d+ seconds/)
  })

  test('should show "Any moment now" for overdue ETA', () => {
    const now = Date.now()
    const analysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'processing' as const,
      processingStartedAt: now - 60000,
      estimatedCompletionTime: now - 5000, // 5 seconds ago
      createdAt: now - 60000,
    }

    const { result } = renderHook(() => useProcessingProgress(analysis))

    expect(result.current.etaFormatted).toBe('Any moment now...')
  })

  test('should return correct priority labels', () => {
    const baseAnalysis = {
      _id: 'analysis-123' as Id<'aiAnalysis'>,
      status: 'processing' as const,
      createdAt: Date.now(),
    }

    const urgentAnalysis = { ...baseAnalysis, priority: 'urgent' as const }
    const highAnalysis = { ...baseAnalysis, priority: 'high' as const }
    const normalAnalysis = { ...baseAnalysis, priority: 'normal' as const }

    const urgentResult = renderHook(() => useProcessingProgress(urgentAnalysis))
      .result.current
    const highResult = renderHook(() => useProcessingProgress(highAnalysis))
      .result.current
    const normalResult = renderHook(() => useProcessingProgress(normalAnalysis))
      .result.current

    expect(urgentResult.priorityLabel).toBe('High Priority')
    expect(highResult.priorityLabel).toBe('Priority')
    expect(normalResult.priorityLabel).toBe('Standard')
  })
})

describe('utility functions', () => {
  test('formatDuration should format milliseconds correctly', () => {
    expect(formatDuration(1500)).toBe('1s')
    expect(formatDuration(65000)).toBe('1m 5s')
    expect(formatDuration(3661000)).toBe('1h 1m')
    expect(formatDuration(7322000)).toBe('2h 2m')
  })

  test('getRelativeTime should format timestamps correctly', () => {
    const now = Date.now()

    expect(getRelativeTime(now - 1000)).toBe('Just now')
    expect(getRelativeTime(now - 120000)).toBe('2 minutes ago')
    expect(getRelativeTime(now - 3600000)).toBe('1 hour ago')
    expect(getRelativeTime(now - 86400000)).toBe('1 day ago')
    expect(getRelativeTime(now - 172800000)).toBe('2 days ago')
  })
})
