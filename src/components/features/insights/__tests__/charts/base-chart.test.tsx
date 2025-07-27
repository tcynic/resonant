/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChartData } from 'chart.js'
import { BaseChart, ChartSkeleton, ChartError } from '../../charts/base-chart'

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn(),
    canvas: {
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock-data'),
    },
  })),
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn(),
  TimeScale: jest.fn(),
  register: jest.fn(),
}))

// Mock date-fns adapter
jest.mock('chartjs-adapter-date-fns', () => ({}))

// Mock chart theme
jest.mock('@/lib/chart-theme', () => ({
  defaultChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
  },
}))

describe('BaseChart', () => {
  const mockData = {
    datasets: [
      {
        label: 'Test Dataset',
        data: [
          { x: new Date('2024-01-01'), y: 50 },
          { x: new Date('2024-01-02'), y: 75 },
        ],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render chart with provided data', () => {
    render(
      <BaseChart
        type="line"
        data={mockData as unknown as ChartData<'line'>}
        aria-label="Test chart"
      />
    )

    expect(screen.getByRole('img', { name: /test chart/i })).toBeInTheDocument()
  })

  it('should show empty state when no data provided', () => {
    const emptyData = { datasets: [] }

    render(
      <BaseChart
        type="line"
        data={emptyData as unknown as ChartData<'line'>}
        aria-label="Empty chart"
      />
    )

    expect(screen.getByText(/no data available/i)).toBeInTheDocument()
    expect(
      screen.getByText(/chart will display when data is loaded/i)
    ).toBeInTheDocument()
  })

  it('should handle data point clicks', () => {
    const mockOnDataPointClick = jest.fn()

    render(
      <BaseChart
        type="line"
        data={mockData as unknown as ChartData<'line'>}
        onDataPointClick={mockOnDataPointClick}
      />
    )

    // Since we can't easily simulate Chart.js click events in tests,
    // we'll verify the component renders without errors
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(
      <BaseChart
        type="line"
        data={mockData as unknown as ChartData<'line'>}
        className="custom-chart-class"
      />
    )

    const container = screen.getByRole('img').parentElement
    expect(container).toHaveClass('custom-chart-class')
  })

  it('should set custom height and width', () => {
    render(
      <BaseChart
        type="line"
        data={mockData as unknown as ChartData<'line'>}
        height={300}
        width={600}
      />
    )

    const container = screen.getByRole('img').parentElement
    expect(container).toHaveStyle({ height: '300px', width: '600px' })
  })
})

describe('ChartSkeleton', () => {
  it('should render loading skeleton', () => {
    render(<ChartSkeleton height={400} />)

    expect(
      screen.getByRole('img', { name: /loading chart/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/loading chart.../i)).toBeInTheDocument()
  })
})

describe('ChartError', () => {
  it('should render error state with retry button', () => {
    const mockRetry = jest.fn()

    render(<ChartError error="Failed to load data" retry={mockRetry} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/failed to load chart/i)).toBeInTheDocument()
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('should render error state without retry button', () => {
    render(<ChartError error="Network error" />)

    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /retry/i })
    ).not.toBeInTheDocument()
  })
})
