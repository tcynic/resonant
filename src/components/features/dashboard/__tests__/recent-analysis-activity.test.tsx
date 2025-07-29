import { render, screen } from '@testing-library/react'
import { RecentAnalysisActivity } from '../recent-analysis-activity'
import { Id } from '@/convex/_generated/dataModel'

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) {
    return <a href={href}>{children}</a>
  }
})

import { useQuery } from 'convex/react'

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

describe('RecentAnalysisActivity', () => {
  const mockUserId = 'user-123' as Id<'users'>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should display recent analysis activities', () => {
    const mockAnalyses = [
      {
        _id: 'analysis-1' as Id<'aiAnalysis'>,
        status: 'completed' as const,
        sentimentScore: 0.8,
        confidenceLevel: 0.9,
        entryContent: 'Today was a great day with my partner.',
        relationshipName: 'Sarah',
        completedAt: Date.now() - 3600000, // 1 hour ago
        createdAt: Date.now() - 3600000,
        entryId: 'entry-1' as Id<'journalEntries'>,
      },
      {
        _id: 'analysis-2' as Id<'aiAnalysis'>,
        status: 'processing' as const,
        entryContent: 'Had a difficult conversation.',
        relationshipName: 'John',
        createdAt: Date.now() - 1800000, // 30 minutes ago
        entryId: 'entry-2' as Id<'journalEntries'>,
      },
    ]

    mockUseQuery.mockReturnValue(mockAnalyses)

    render(<RecentAnalysisActivity userId={mockUserId} />)

    expect(screen.getByText('Recent AI Analysis')).toBeInTheDocument()
    expect(screen.getByText('Positive')).toBeInTheDocument()
    expect(screen.getAllByText('Processing')).toHaveLength(2) // Once in status, once in summary
    expect(screen.getByText('Sarah')).toBeInTheDocument()
    expect(screen.getByText('John')).toBeInTheDocument()
  })

  test('should show empty state when no analyses', () => {
    mockUseQuery.mockReturnValue([])

    render(<RecentAnalysisActivity userId={mockUserId} />)

    expect(screen.getByText('No recent analyses')).toBeInTheDocument()
    expect(
      screen.getByText('Create journal entries to see AI insights')
    ).toBeInTheDocument()
  })

  test('should display confidence levels for completed analyses', () => {
    const mockAnalyses = [
      {
        _id: 'analysis-1' as Id<'aiAnalysis'>,
        status: 'completed' as const,
        sentimentScore: 0.6,
        confidenceLevel: 0.85,
        entryContent: 'Mixed feelings today.',
        completedAt: Date.now(),
        createdAt: Date.now(),
        entryId: 'entry-1' as Id<'journalEntries'>,
      },
    ]

    mockUseQuery.mockReturnValue(mockAnalyses)

    render(<RecentAnalysisActivity userId={mockUserId} />)

    expect(screen.getByText('85% confidence')).toBeInTheDocument()
  })

  test('should show summary statistics', () => {
    const mockAnalyses = [
      {
        _id: 'analysis-1' as Id<'aiAnalysis'>,
        status: 'completed' as const,
        createdAt: Date.now(),
        entryId: 'entry-1' as Id<'journalEntries'>,
      },
      {
        _id: 'analysis-2' as Id<'aiAnalysis'>,
        status: 'processing' as const,
        createdAt: Date.now(),
        entryId: 'entry-2' as Id<'journalEntries'>,
      },
      {
        _id: 'analysis-3' as Id<'aiAnalysis'>,
        status: 'failed' as const,
        createdAt: Date.now(),
        entryId: 'entry-3' as Id<'journalEntries'>,
      },
    ]

    mockUseQuery.mockReturnValue(mockAnalyses)

    render(<RecentAnalysisActivity userId={mockUserId} />)

    // Check that the summary statistics are displayed
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getAllByText('Processing')).toHaveLength(2) // Status + summary
    expect(screen.getAllByText('Failed')).toHaveLength(2) // Status + summary
  })

  test('should handle null data gracefully', () => {
    mockUseQuery.mockReturnValue(null)

    render(<RecentAnalysisActivity userId={mockUserId} />)

    expect(screen.getByText('No recent analyses')).toBeInTheDocument()
  })

  test('should format time correctly', () => {
    const mockAnalyses = [
      {
        _id: 'analysis-1' as Id<'aiAnalysis'>,
        status: 'completed' as const,
        completedAt: Date.now() - 30000, // 30 seconds ago
        createdAt: Date.now() - 30000,
        entryId: 'entry-1' as Id<'journalEntries'>,
      },
    ]

    mockUseQuery.mockReturnValue(mockAnalyses)

    render(<RecentAnalysisActivity userId={mockUserId} />)

    expect(screen.getByText('Just now')).toBeInTheDocument()
  })
})
