import { render, screen } from '@testing-library/react'
import { AIProcessingSummary } from '../ai-processing-summary'
import { Id } from '@/convex/_generated/dataModel'

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}))

import { useQuery } from 'convex/react'

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

describe('AIProcessingSummary', () => {
  const mockUserId = 'user-123' as Id<'users'>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should display processing statistics', () => {
    mockUseQuery
      .mockReturnValueOnce([]) // getUserActiveProcessing
      .mockReturnValueOnce({
        // getProcessingStats
        totalProcessing: 2,
        completedToday: 5,
        failedToday: 1,
        averageWaitTime: 30000,
      })

    render(<AIProcessingSummary userId={mockUserId} />)

    expect(screen.getByText('5')).toBeInTheDocument() // Completed today
    expect(screen.getByText('2')).toBeInTheDocument() // In queue
    expect(screen.getByText('30s')).toBeInTheDocument() // Average wait time
  })

  test('should display active processing items', () => {
    const mockActiveProcessing = [
      {
        _id: 'analysis-1' as Id<'aiAnalysis'>,
        status: 'processing' as const,
        priority: 'high' as const,
        queuePosition: 1,
        processingAttempts: 1,
      },
    ]

    mockUseQuery
      .mockReturnValueOnce(mockActiveProcessing) // getUserActiveProcessing
      .mockReturnValueOnce({
        // getProcessingStats
        totalProcessing: 1,
        completedToday: 0,
        failedToday: 0,
        averageWaitTime: 0,
      })

    render(<AIProcessingSummary userId={mockUserId} />)

    expect(screen.getByText('1 Processing')).toBeInTheDocument()
    expect(screen.getByText(/Analysis .{8}/)).toBeInTheDocument() // Analysis ID
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  test('should show empty state when no processing', () => {
    mockUseQuery
      .mockReturnValueOnce([]) // getUserActiveProcessing
      .mockReturnValueOnce({
        // getProcessingStats
        totalProcessing: 0,
        completedToday: 0,
        failedToday: 0,
        averageWaitTime: 0,
      })

    render(<AIProcessingSummary userId={mockUserId} />)

    expect(screen.getByText('All analyses complete')).toBeInTheDocument()
    expect(
      screen.getByText('New journal entries will be analyzed automatically')
    ).toBeInTheDocument()
  })

  test('should show failed analyses alert', () => {
    mockUseQuery
      .mockReturnValueOnce([]) // getUserActiveProcessing
      .mockReturnValueOnce({
        // getProcessingStats
        totalProcessing: 0,
        completedToday: 2,
        failedToday: 3,
        averageWaitTime: 0,
      })

    render(<AIProcessingSummary userId={mockUserId} />)

    expect(screen.getByText(/\d+ analyses? failed today/)).toBeInTheDocument()
    expect(screen.getByText(/check your journal entries/i)).toBeInTheDocument()
  })

  test('should handle null data gracefully', () => {
    mockUseQuery.mockReturnValue(null)

    const { container } = render(<AIProcessingSummary userId={mockUserId} />)

    expect(container.firstChild).toBeNull()
  })
})
