/**
 * Integration tests for dashboard real-time updates
 * Tests the interaction between dashboard components and live data updates
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
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

// Mock Convex with simulation of real-time updates
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}))

// Mock dashboard components for faster rendering
jest.mock('@/components/features/dashboard/health-score-card', () => {
  return function MockHealthScoreCard({ relationship, healthScore }: any) {
    return (
      <div data-testid="health-score-card">
        <span data-testid="relationship-name">{relationship.name}</span>
        <span data-testid="health-score">
          {healthScore?.overallScore || 'No Score'}
        </span>
      </div>
    )
  }
})

jest.mock('@/components/features/dashboard/trend-chart', () => {
  return function MockTrendChart({ data, relationshipNames }: any) {
    return (
      <div data-testid="trend-chart">
        <span data-testid="trend-relationships">
          {relationshipNames.join(', ')}
        </span>
        <span data-testid="trend-data-points">{data.length}</span>
      </div>
    )
  }
})

jest.mock('@/components/features/dashboard/recent-activity', () => {
  return function MockRecentActivity({ activities, totalCount }: any) {
    return (
      <div data-testid="recent-activity">
        <span data-testid="activity-count">{totalCount}</span>
        <div data-testid="activity-list">
          {activities.map((activity: any, index: number) => (
            <div key={index} data-testid="activity-item">
              {activity.relationship?.name || 'Unknown'}
            </div>
          ))}
        </div>
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
    return <span data-testid="connection-status">Live</span>
  }
})

jest.mock('@/components/features/dashboard/real-time-indicator', () => {
  return function MockRealTimeIndicator({ lastUpdated }: any) {
    return (
      <div data-testid="real-time-indicator">
        {lastUpdated ? 'Updated' : 'Loading...'}
      </div>
    )
  }
})

// Mock error boundary
jest.mock('@/components/ui/error-boundary', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
  DashboardErrorFallback: ({ error }: any) => (
    <div data-testid="dashboard-error">Error: {error?.message}</div>
  ),
  NetworkErrorFallback: () => (
    <div data-testid="network-error">Network Error</div>
  ),
}))

// Initial mock data
const initialDashboardData = {
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
  ],
  recentEntries: [],
  summary: {
    totalRelationships: 1,
    trackedRelationships: 1,
    averageHealthScore: 85,
    totalAnalyses: 15,
    lastUpdated: Date.now(),
  },
}

const initialDashboardStats = {
  totals: {
    relationships: 1,
    journalEntries: 15,
    trackedRelationships: 1,
  },
  activity: {
    entriesThisWeek: 3,
    entriesThisMonth: 12,
    averageEntriesPerWeek: 2.5,
  },
  health: {
    averageScore: 85,
    improvingRelationships: 1,
    decliningRelationships: 0,
    stableRelationships: 0,
  },
  lastUpdated: Date.now(),
}

const initialRecentActivity = {
  activities: [{ _id: 'entry-1', relationship: { name: 'Sarah' } }],
  totalCount: 3,
  analysisRate: 0.85,
}

const initialTrendData = {
  trends: [
    {
      timestamp: Date.now() - 86400000,
      date: new Date(Date.now() - 86400000).toISOString(),
      Sarah: 83,
    },
    {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      Sarah: 85,
    },
  ],
  relationshipNames: ['Sarah'],
  timeRange: {
    start: Date.now() - 30 * 24 * 60 * 60 * 1000,
    end: Date.now(),
    granularity: 'week',
  },
}

const { useQuery } = require('convex/react')

describe('Dashboard Integration Tests', () => {
  let queryCallCount = 0
  let currentData = {
    dashboardData: initialDashboardData,
    dashboardStats: initialDashboardStats,
    recentActivity: initialRecentActivity,
    trendData: initialTrendData,
  }

  beforeEach(() => {
    queryCallCount = 0
    currentData = {
      dashboardData: initialDashboardData,
      dashboardStats: initialDashboardStats,
      recentActivity: initialRecentActivity,
      trendData: initialTrendData,
    }

    useQuery.mockImplementation((api: any, args: any) => {
      if (args === 'skip') {
        return undefined
      }

      queryCallCount++

      switch (queryCallCount) {
        case 1:
          return currentData.dashboardData
        case 2:
          return currentData.dashboardStats
        case 3:
          return currentData.recentActivity
        case 4:
          return currentData.trendData
        default:
          return undefined
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should display initial dashboard data correctly', async () => {
    render(<DashboardContent />)

    // Verify initial data is displayed
    expect(screen.getByTestId('relationship-name')).toHaveTextContent('Sarah')
    expect(screen.getByTestId('health-score')).toHaveTextContent('85')
    expect(screen.getByTestId('activity-count')).toHaveTextContent('3')
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Live')
  })

  it('should update when new journal entry affects health score', async () => {
    const { rerender } = render(<DashboardContent />)

    // Verify initial state
    expect(screen.getByTestId('health-score')).toHaveTextContent('85')

    // Simulate new entry causing health score update
    act(() => {
      queryCallCount = 0
      currentData.dashboardData = {
        ...currentData.dashboardData,
        relationships: [
          {
            ...currentData.dashboardData.relationships[0],
            healthScore: {
              ...currentData.dashboardData.relationships[0].healthScore,
              overallScore: 87, // Health score improved
              dataPoints: 16,
              lastUpdated: Date.now(),
            },
          },
        ],
      }

      currentData.dashboardStats = {
        ...currentData.dashboardStats,
        health: {
          ...currentData.dashboardStats.health,
          averageScore: 87,
        },
        totals: {
          ...currentData.dashboardStats.totals,
          journalEntries: 16,
        },
        lastUpdated: Date.now(),
      }
    })

    // Trigger re-render to simulate real-time update
    rerender(<DashboardContent />)

    // Verify updated health score
    await waitFor(() => {
      expect(screen.getByTestId('health-score')).toHaveTextContent('87')
    })
  })

  it('should update recent activity when new entries are added', async () => {
    const { rerender } = render(<DashboardContent />)

    // Verify initial activity count
    expect(screen.getByTestId('activity-count')).toHaveTextContent('3')

    // Simulate new activity
    act(() => {
      queryCallCount = 0
      currentData.recentActivity = {
        ...currentData.recentActivity,
        activities: [
          { _id: 'entry-2', relationship: { name: 'Sarah' } },
          ...currentData.recentActivity.activities,
        ],
        totalCount: 4,
      }
    })

    rerender(<DashboardContent />)

    // Verify updated activity count
    await waitFor(() => {
      expect(screen.getByTestId('activity-count')).toHaveTextContent('4')
    })
  })

  it('should update trend chart when new data points are available', async () => {
    const { rerender } = render(<DashboardContent />)

    // Verify initial trend data
    expect(screen.getByTestId('trend-data-points')).toHaveTextContent('2')

    // Simulate new trend data point
    act(() => {
      queryCallCount = 0
      currentData.trendData = {
        ...currentData.trendData,
        trends: [
          ...currentData.trendData.trends,
          {
            timestamp: Date.now() + 86400000,
            date: new Date(Date.now() + 86400000).toISOString(),
            Sarah: 87,
          },
        ],
      }
    })

    rerender(<DashboardContent />)

    // Verify updated trend data
    await waitFor(() => {
      expect(screen.getByTestId('trend-data-points')).toHaveTextContent('3')
    })
  })

  it('should handle real-time updates when new relationship is added', async () => {
    const { rerender } = render(<DashboardContent />)

    // Verify initial relationship count
    expect(screen.getAllByTestId('health-score-card')).toHaveLength(1)
    expect(screen.getByTestId('trend-relationships')).toHaveTextContent('Sarah')

    // Simulate new relationship added
    act(() => {
      queryCallCount = 0
      currentData.dashboardData = {
        ...currentData.dashboardData,
        relationships: [
          ...currentData.dashboardData.relationships,
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
              dataPoints: 8,
            },
          },
        ],
      }

      currentData.dashboardStats = {
        ...currentData.dashboardStats,
        totals: {
          ...currentData.dashboardStats.totals,
          relationships: 2,
          trackedRelationships: 2,
        },
        health: {
          ...currentData.dashboardStats.health,
          averageScore: 81.5, // Average of 85 and 78
        },
      }

      currentData.trendData = {
        ...currentData.trendData,
        relationshipNames: ['Sarah', 'Alex'],
        trends: currentData.trendData.trends.map(trend => ({
          ...trend,
          Alex: trend.Sarah - 7, // Mock Alex's trend data
        })),
      }
    })

    rerender(<DashboardContent />)

    // Verify new relationship is displayed
    await waitFor(() => {
      expect(screen.getAllByTestId('health-score-card')).toHaveLength(2)
      expect(screen.getByTestId('trend-relationships')).toHaveTextContent(
        'Sarah, Alex'
      )
    })

    // Find the new relationship card
    const relationshipNames = screen.getAllByTestId('relationship-name')
    const relationshipNamesText = relationshipNames.map(el => el.textContent)
    expect(relationshipNamesText).toContain('Alex')
  })

  it('should show real-time indicator when data is updated', async () => {
    render(<DashboardContent />)

    // Verify real-time indicator shows updated state
    expect(screen.getByTestId('real-time-indicator')).toHaveTextContent(
      'Updated'
    )
  })

  it('should handle connection status updates', async () => {
    render(<DashboardContent />)

    // Verify connection status is shown
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Live')
  })

  it('should maintain data consistency across all dashboard components', async () => {
    const { rerender } = render(<DashboardContent />)

    // Simulate comprehensive data update affecting all components
    act(() => {
      queryCallCount = 0
      const newTimestamp = Date.now()

      currentData.dashboardData = {
        ...currentData.dashboardData,
        relationships: [
          {
            ...currentData.dashboardData.relationships[0],
            healthScore: {
              ...currentData.dashboardData.relationships[0].healthScore,
              overallScore: 90,
              dataPoints: 20,
              lastUpdated: newTimestamp,
            },
          },
        ],
      }

      currentData.dashboardStats = {
        ...currentData.dashboardStats,
        health: {
          ...currentData.dashboardStats.health,
          averageScore: 90,
        },
        totals: {
          ...currentData.dashboardStats.totals,
          journalEntries: 20,
        },
        activity: {
          ...currentData.dashboardStats.activity,
          entriesThisWeek: 5,
        },
        lastUpdated: newTimestamp,
      }

      currentData.recentActivity = {
        ...currentData.recentActivity,
        totalCount: 5,
        activities: [
          { _id: 'entry-3', relationship: { name: 'Sarah' } },
          { _id: 'entry-2', relationship: { name: 'Sarah' } },
          { _id: 'entry-1', relationship: { name: 'Sarah' } },
        ],
      }

      currentData.trendData = {
        ...currentData.trendData,
        trends: [
          ...currentData.trendData.trends,
          {
            timestamp: newTimestamp,
            date: new Date(newTimestamp).toISOString(),
            Sarah: 90,
          },
        ],
      }
    })

    rerender(<DashboardContent />)

    // Verify all components show consistent updated data
    await waitFor(() => {
      expect(screen.getByTestId('health-score')).toHaveTextContent('90')
      expect(screen.getByTestId('activity-count')).toHaveTextContent('5')
      expect(screen.getByTestId('trend-data-points')).toHaveTextContent('3')
    })

    // Verify stats grid shows updated values (use getAllByText for multiple instances)
    expect(screen.getAllByText('90')).toHaveLength(2) // Health score and average score
    expect(screen.getAllByText('5')).toHaveLength(2) // Entries this week and activity count
  })
})
