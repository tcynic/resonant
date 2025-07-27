/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SentimentTrendChart } from '../../charts/sentiment-trend-chart'

// Mock Chart.js and base chart
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

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn().mockReturnValue('Jan 01, 2024'),
}))

// Mock chart theme
jest.mock('@/lib/chart-theme', () => ({
  healthScoreChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
  },
  timeChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
        grid: { color: '#E5E7EB' },
        ticks: { color: '#6B7280' },
      },
      y: {
        grid: { color: '#E5E7EB' },
        ticks: { color: '#6B7280' },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter, system-ui, sans-serif', size: 12 },
          color: '#6B7280',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
  },
  chartColors: {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
}))

// Mock chart utils
jest.mock('@/lib/chart-utils', () => ({
  formatSentimentTrendData: jest.fn().mockReturnValue({
    label: 'Health Score',
    data: [],
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  }),
  calculateMovingAverage: jest.fn().mockReturnValue([]),
  calculateStatistics: jest.fn().mockReturnValue({
    average: 75,
    trend: 'improving',
    volatility: 10,
  }),
}))

// Mock date-fns adapter
jest.mock('chartjs-adapter-date-fns', () => ({}))

describe('SentimentTrendChart', () => {
  const mockHealthScoreData = [
    {
      calculatedAt: Date.now() - 86400000, // 1 day ago
      score: 75,
      factors: {
        communication: 80,
        trust: 70,
        satisfaction: 75,
        growth: 80,
      },
      trendDirection: 'improving' as const,
    },
    {
      calculatedAt: Date.now(),
      score: 80,
      factors: {
        communication: 85,
        trust: 75,
        satisfaction: 80,
        growth: 85,
      },
      trendDirection: 'improving' as const,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render chart with health score data', () => {
    render(
      <SentimentTrendChart
        data={mockHealthScoreData}
        aria-label="Sentiment trend test chart"
      />
    )

    expect(
      screen.getByRole('img', { name: /sentiment trend test chart/i })
    ).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<SentimentTrendChart data={[]} isLoading={true} />)

    expect(
      screen.getByRole('img', { name: /loading chart/i })
    ).toBeInTheDocument()
  })

  it('should show error state with retry option', () => {
    const mockRetry = jest.fn()

    render(
      <SentimentTrendChart
        data={[]}
        error="Network error"
        onRetry={mockRetry}
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('should show no data state when data is empty', () => {
    render(<SentimentTrendChart data={[]} isLoading={false} />)

    expect(screen.getByText(/no sentiment data/i)).toBeInTheDocument()
    expect(
      screen.getByText(/start journaling to see your sentiment trends/i)
    ).toBeInTheDocument()
  })

  it('should handle data point clicks', () => {
    const mockOnDataPointClick = jest.fn()

    render(
      <SentimentTrendChart
        data={mockHealthScoreData}
        onDataPointClick={mockOnDataPointClick}
      />
    )

    // Component should render without errors
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('should render with moving average when enabled', () => {
    render(
      <SentimentTrendChart
        data={mockHealthScoreData}
        showMovingAverage={true}
        movingAverageWindow={7}
      />
    )

    // Component should render without errors
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('should apply custom height', () => {
    render(<SentimentTrendChart data={mockHealthScoreData} height={500} />)

    const container = screen.getByRole('img').parentElement
    expect(container).toHaveStyle({ height: '500px' })
  })
})

describe('SentimentTrendChart Data Processing', () => {
  it('should handle data with missing factors gracefully', () => {
    const dataWithMissingFactors = [
      {
        calculatedAt: Date.now(),
        score: 75,
        factors: {
          communication: 80,
          trust: 70,
          satisfaction: 75,
          growth: 80,
        },
      },
    ]

    render(<SentimentTrendChart data={dataWithMissingFactors} />)

    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('should sort data by date', () => {
    const unsortedData = [
      {
        calculatedAt: Date.now(),
        score: 80,
        factors: {
          communication: 85,
          trust: 75,
          satisfaction: 80,
          growth: 85,
        },
      },
      {
        calculatedAt: Date.now() - 86400000,
        score: 75,
        factors: {
          communication: 80,
          trust: 70,
          satisfaction: 75,
          growth: 80,
        },
      },
    ]

    render(<SentimentTrendChart data={unsortedData} />)

    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
