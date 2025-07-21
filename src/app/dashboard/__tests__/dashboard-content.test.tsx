import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardContent from '../dashboard-content'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'John',
    },
  }),
}))

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}))

// Mock dashboard components
jest.mock('@/components/features/dashboard/health-score-card', () => {
  return function MockHealthScoreCard({
    relationship,
  }: {
    relationship: { name: string }
  }) {
    return <div data-testid="health-score-card">{relationship.name}</div>
  }
})

jest.mock('@/components/features/dashboard/trend-chart', () => {
  return function MockTrendChart({
    relationshipNames,
  }: {
    relationshipNames: string[]
  }) {
    return (
      <div data-testid="trend-chart">
        Trend Chart: {relationshipNames.join(', ')}
      </div>
    )
  }
})

jest.mock('@/components/features/dashboard/recent-activity', () => {
  return function MockRecentActivity({
    totalCount,
  }: {
    activities?: unknown[]
    totalCount: number
  }) {
    return (
      <div data-testid="recent-activity">
        Recent Activity: {totalCount} items
      </div>
    )
  }
})

jest.mock('@/components/features/dashboard/entry-history', () => {
  return function MockEntryHistory() {
    return <div data-testid="entry-history">Entry History</div>
  }
})

jest.mock('@/components/features/dashboard/connection-status', () => {
  return function MockConnectionStatus() {
    return <span>Live</span>
  }
})

jest.mock('@/components/features/dashboard/real-time-indicator', () => {
  return function MockRealTimeIndicator() {
    return <div>Real-time indicator</div>
  }
})

// Mock error boundary
jest.mock('@/components/ui/error-boundary', () => ({
  __esModule: true,
  default: ({
    children,
    fallback,
  }: {
    children?: React.ReactNode
    fallback?: React.ReactNode
  }) => {
    return children || fallback
  },
  DashboardErrorFallback: ({
    error,
    onRetry,
  }: {
    error?: Error
    onRetry?: () => void
  }) => (
    <div data-testid="dashboard-error">
      Error: {error?.message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
  NetworkErrorFallback: ({ onRetry }: { onRetry?: () => void }) => (
    <div data-testid="network-error">
      Network Error
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}))

import { useQuery } from 'convex/react'

// Mock data
const mockDashboardData = {
  relationships: [
    {
      _id: 'rel-1',
      name: 'Sarah',
      type: 'partner',
      healthScore: {
        _id: 'score-1',
        overallScore: 85,
        componentScores: {
          sentiment: 8.5,
          emotionalStability: 7.8,
          energyImpact: 9.2,
          conflictResolution: 8.0,
          gratitude: 7.5,
          communicationFrequency: 8.8,
        },
        lastUpdated: Date.now(),
        dataPoints: 15,
      },
    },
    {
      _id: 'rel-2',
      name: 'Alex',
      type: 'friend',
      healthScore: {
        _id: 'score-2',
        overallScore: 78,
        componentScores: {
          sentiment: 7.8,
          emotionalStability: 7.5,
          energyImpact: 8.0,
          conflictResolution: 7.0,
          gratitude: 8.2,
          communicationFrequency: 7.8,
        },
        lastUpdated: Date.now(),
        dataPoints: 12,
      },
    },
  ],
  recentEntries: [],
  summary: {
    totalRelationships: 2,
    trackedRelationships: 2,
    averageHealthScore: 82,
    totalAnalyses: 27,
    lastUpdated: Date.now(),
  },
}

const mockDashboardStats = {
  totals: {
    relationships: 2,
    journalEntries: 25,
    trackedRelationships: 2,
  },
  activity: {
    entriesThisWeek: 5,
    entriesThisMonth: 18,
    averageEntriesPerWeek: 3.2,
  },
  health: {
    averageScore: 82,
    improvingRelationships: 1,
    decliningRelationships: 0,
    stableRelationships: 1,
  },
  lastUpdated: Date.now(),
}

const mockRecentActivity = {
  activities: [
    { _id: 'entry-1', relationship: { name: 'Sarah' } },
    { _id: 'entry-2', relationship: { name: 'Alex' } },
  ],
  totalCount: 10,
  analysisRate: 0.85,
}

const mockTrendData = {
  trends: [
    {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      Sarah: 85,
      Alex: 78,
    },
  ],
  relationshipNames: ['Sarah', 'Alex'],
  timeRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000,
    end: Date.now(),
    granularity: 'week',
  },
}

describe('DashboardContent', () => {
  beforeEach(() => {
    // Mock useQuery with simple call counting
    let callCount = 0(
      useQuery as jest.MockedFunction<typeof useQuery>
    ).mockImplementation((api: unknown, args: unknown) => {
      // Handle 'skip' queries first
      if (args === 'skip') {
        return undefined
      }

      // Return mock data based on call order in component
      callCount++

      switch (callCount) {
        case 1: // dashboardData
          return mockDashboardData
        case 2: // dashboardStats
          return mockDashboardStats
        case 3: // recentActivity
          return mockRecentActivity
        case 4: // trendData
          return mockTrendData
        default:
          return undefined
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render dashboard with all main sections', () => {
    render(<DashboardContent />)

    expect(screen.getByText(/Good \w+, John!/)).toBeInTheDocument()
    expect(screen.getByText('Relationship Health Scores')).toBeInTheDocument()
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByTestId('entry-history')).toBeInTheDocument()
  })

  it('should display loading state when data is undefined', () => {
    ;(useQuery as jest.MockedFunction<typeof useQuery>).mockReturnValue(
      undefined
    )

    render(<DashboardContent />)

    // Should show loading skeletons
    const loadingElements = document.querySelectorAll('.animate-pulse')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('should display error state when data fails to load', () => {
    useQuery.mockReturnValue(null)

    render(<DashboardContent />)

    expect(screen.getByTestId('dashboard-error')).toBeInTheDocument()
    expect(
      screen.getByText(/Failed to load dashboard data/)
    ).toBeInTheDocument()
  })

  it('should display empty state when no relationships exist', () => {
    // Mock useQuery with simple call counting for empty state
    let callCount = 0(
      useQuery as jest.MockedFunction<typeof useQuery>
    ).mockImplementation((api: unknown, args: unknown) => {
      if (args === 'skip') {
        return undefined
      }

      callCount++

      switch (callCount) {
        case 1: // dashboardData
          return { relationships: [], recentEntries: [], summary: {} }
        case 2: // dashboardStats
          return mockDashboardStats
        case 3: // recentActivity
          return mockRecentActivity
        default:
          return undefined
      }
    })

    render(<DashboardContent />)

    expect(
      screen.getByText('Welcome to your Relationship Health Journal!')
    ).toBeInTheDocument()
    expect(screen.getByText('Add Relationship')).toBeInTheDocument()
    expect(screen.getByText('Create First Entry')).toBeInTheDocument()
  })

  it('should render health score cards for each relationship', () => {
    render(<DashboardContent />)

    expect(screen.getAllByTestId('health-score-card')).toHaveLength(2)
    expect(screen.getByText('Sarah')).toBeInTheDocument()
    expect(screen.getByText('Alex')).toBeInTheDocument()
  })

  it('should display dashboard statistics', () => {
    render(<DashboardContent />)

    expect(screen.getByText('2')).toBeInTheDocument() // Relationships count
    expect(screen.getByText('82')).toBeInTheDocument() // Average health score
    expect(screen.getByText('5')).toBeInTheDocument() // Entries this week
    expect(screen.getByText('1')).toBeInTheDocument() // Improving relationships
  })

  it('should show recent activity component', () => {
    render(<DashboardContent />)

    expect(screen.getByTestId('recent-activity')).toBeInTheDocument()
    expect(screen.getByText('Recent Activity: 10 items')).toBeInTheDocument()
  })

  it('should render trend chart when data is available', () => {
    render(<DashboardContent />)

    expect(screen.getByTestId('trend-chart')).toBeInTheDocument()
    expect(screen.getByText('Trend Chart: Sarah, Alex')).toBeInTheDocument()
  })

  it('should not render trend chart when no data', () => {
    ;(useQuery as jest.MockedFunction<typeof useQuery>).mockImplementation(
      (api: unknown) => {
        const apiName = api?._name || api?.name || String(api)
        if (typeof apiName === 'string') {
          if (apiName.includes('getDashboardTrends')) {
            return { trends: [], relationshipNames: [], timeRange: {} }
          }
          if (apiName.includes('getDashboardData')) {
            return mockDashboardData
          }
          if (apiName.includes('getDashboardStats')) {
            return mockDashboardStats
          }
          if (apiName.includes('getRecentActivity')) {
            return mockRecentActivity
          }
        }
        return undefined
      }
    )

    render(<DashboardContent />)

    expect(screen.queryByTestId('trend-chart')).not.toBeInTheDocument()
  })

  it('should display quick action links', () => {
    render(<DashboardContent />)

    expect(screen.getByText('New Journal Entry')).toBeInTheDocument()
    expect(screen.getByText('Add Relationship')).toBeInTheDocument()
    expect(screen.getByText('View History')).toBeInTheDocument()

    // Check links have correct hrefs
    expect(screen.getByText('New Journal Entry').closest('a')).toHaveAttribute(
      'href',
      '/journal/new'
    )
    expect(screen.getByText('Add Relationship').closest('a')).toHaveAttribute(
      'href',
      '/relationships/new'
    )
    expect(screen.getByText('View History').closest('a')).toHaveAttribute(
      'href',
      '/journal'
    )
  })

  it('should show appropriate greeting based on time of day', () => {
    render(<DashboardContent />)

    // Should show one of the greetings
    const greetingText = screen.getByText(/Good \w+, John!/)
    expect(greetingText).toBeInTheDocument()

    const greetingContent = greetingText.textContent
    expect([
      'Good morning, John!',
      'Good afternoon, John!',
      'Good evening, John!',
    ]).toContain(greetingContent)
  })

  it('should display last updated time', () => {
    render(<DashboardContent />)

    // Check for any form of "updated" text - could be "Updated X ago" or "Loading..."
    expect(screen.getByText(/Updated|Loading/)).toBeInTheDocument()
  })

  it('should show live connection status', () => {
    render(<DashboardContent />)

    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('should render refresh button', () => {
    render(<DashboardContent />)

    const refreshButton = screen.getByText('Refresh')
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton.closest('button')).toBeInTheDocument()
  })

  it('should handle refresh button click', () => {
    // Just test that the button is clickable - actual reload testing is complex in JSDOM
    render(<DashboardContent />)

    const refreshButton = screen.getByText('Refresh')
    expect(refreshButton).toBeEnabled()

    // Test click doesn't throw error
    expect(() => {
      fireEvent.click(refreshButton)
    }).not.toThrow()
  })

  it('should show relationship count in health scores section', () => {
    render(<DashboardContent />)

    expect(screen.getByText('2 relationships tracked')).toBeInTheDocument()
  })

  it('should display stats with proper labels', () => {
    render(<DashboardContent />)

    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Avg Health Score')).toBeInTheDocument()
    expect(screen.getByText('This Week')).toBeInTheDocument()
    expect(screen.getByText('Improving')).toBeInTheDocument()
  })

  it('should handle different health score states', () => {
    const lowScoreStats = {
      ...mockDashboardStats,
      health: {
        ...mockDashboardStats.health,
        averageScore: 45,
      },
    }

    // Mock useQuery with simple call counting for low score state
    let callCount = 0(
      useQuery as jest.MockedFunction<typeof useQuery>
    ).mockImplementation((api: unknown, args: unknown) => {
      if (args === 'skip') {
        return undefined
      }

      callCount++

      switch (callCount) {
        case 1: // dashboardData
          return mockDashboardData
        case 2: // dashboardStats
          return lowScoreStats
        case 3: // recentActivity
          return mockRecentActivity
        case 4: // trendData
          return mockTrendData
        default:
          return undefined
      }
    })

    render(<DashboardContent />)

    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('Needs focus')).toBeInTheDocument()
  })
})
