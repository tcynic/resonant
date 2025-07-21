import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import TrendChart from '../trend-chart'
import { TrendDataPoint } from '@/lib/types'

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}))

// Mock data
const mockTrendData: TrendDataPoint[] = [
  {
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    Partner: 85,
    'Best Friend': 78,
    Partner_count: 3,
    'Best Friend_count': 2,
  },
  {
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    Partner: 88,
    'Best Friend': 82,
    Partner_count: 4,
    'Best Friend_count': 3,
  },
  {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    Partner: 90,
    'Best Friend': 85,
    Partner_count: 5,
    'Best Friend_count': 4,
  },
]

const mockTimeRange = {
  start: Date.now() - 7 * 24 * 60 * 60 * 1000,
  end: Date.now(),
  granularity: 'day' as const,
}

const mockRelationshipNames = ['Partner', 'Best Friend']

describe('TrendChart', () => {
  it('should render chart components when data is provided', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByText('Daily Health Score Trends')).toBeInTheDocument()
  })

  it('should display empty state when no data provided', () => {
    render(
      <TrendChart data={[]} relationshipNames={[]} timeRange={mockTimeRange} />
    )

    expect(screen.getByText('No trend data available')).toBeInTheDocument()
    expect(
      screen.getByText('Journal entries needed to generate trends')
    ).toBeInTheDocument()
  })

  it('should display relationship count in subtitle', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    expect(screen.getByText('Tracking 2 relationships')).toBeInTheDocument()
  })

  it('should render time period selector', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    expect(screen.getByText('7D')).toBeInTheDocument()
    expect(screen.getByText('30D')).toBeInTheDocument()
    expect(screen.getByText('90D')).toBeInTheDocument()
  })

  it('should allow time period selection', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    const thirtyDayButton = screen.getByText('30D')
    fireEvent.click(thirtyDayButton)

    // The button should become active (visual feedback)
    expect(thirtyDayButton).toHaveClass('bg-white')
  })

  it('should display chart statistics', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    expect(screen.getByText('3')).toBeInTheDocument() // Data points
    expect(screen.getByText('Data Points')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Relationships
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Days Tracked')).toBeInTheDocument()
  })

  it('should render relationship legend with toggle functionality', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    expect(screen.getByText('Partner')).toBeInTheDocument()
    expect(screen.getByText('Best Friend')).toBeInTheDocument()

    // Should be able to click on relationship names to toggle visibility
    const partnerButton = screen.getByText('Partner')
    fireEvent.click(partnerButton)

    // After clicking, it should show visual feedback (grayed out)
    expect(partnerButton.closest('button')).toHaveClass('bg-gray-100')
  })

  it('should handle different granularity labels', () => {
    const weeklyTimeRange = { ...mockTimeRange, granularity: 'week' as const }
    const { rerender } = render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={weeklyTimeRange}
      />
    )

    expect(screen.getByText('Weekly Health Score Trends')).toBeInTheDocument()

    const monthlyTimeRange = { ...mockTimeRange, granularity: 'month' as const }
    rerender(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={monthlyTimeRange}
      />
    )

    expect(screen.getByText('Monthly Health Score Trends')).toBeInTheDocument()
  })

  it('should calculate days tracked correctly', () => {
    const sevenDayRange = {
      start: Date.now() - 7 * 24 * 60 * 60 * 1000,
      end: Date.now(),
      granularity: 'day' as const,
    }

    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={sevenDayRange}
      />
    )

    expect(screen.getByText('7')).toBeInTheDocument() // 7 days tracked
  })

  it('should render with custom height', () => {
    const { container } = render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
        height={500}
      />
    )

    // Check if height is applied to chart container
    const chartContainer = container.querySelector('[style*="height: 500px"]')
    expect(chartContainer).toBeInTheDocument()
  })

  it('should handle empty relationship names', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={[]}
        timeRange={mockTimeRange}
      />
    )

    expect(screen.getByText('Tracking 0 relationships')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
        className="custom-chart-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-chart-class')
  })

  it('should hide relationships when toggled', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    // Click to hide "Partner"
    const partnerButton = screen.getByText('Partner')
    fireEvent.click(partnerButton)

    // Should update the tracking count
    expect(screen.getByText('Tracking 1 relationships')).toBeInTheDocument()
  })

  it('should show different time period button states', () => {
    render(
      <TrendChart
        data={mockTrendData}
        relationshipNames={mockRelationshipNames}
        timeRange={mockTimeRange}
      />
    )

    const weekButton = screen.getByText('7D')
    const monthButton = screen.getByText('30D')
    const quarterButton = screen.getByText('90D')

    // Default should be month
    expect(monthButton).toHaveClass('bg-white')
    expect(weekButton).not.toHaveClass('bg-white')
    expect(quarterButton).not.toHaveClass('bg-white')

    // Click week button
    fireEvent.click(weekButton)
    expect(weekButton).toHaveClass('bg-white')
    expect(monthButton).not.toHaveClass('bg-white')
  })
})
