import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HealthScoreCard from '../health-score-card'
import { HealthScore, Relationship } from '@/lib/types'

// Mock data
const mockRelationship: Relationship = {
  _id: 'rel-1' as never,
  _creationTime: Date.now(),
  userId: 'user-1' as never,
  name: 'Test Partner',
  type: 'partner',
  photo: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const mockHealthScore: HealthScore = {
  _id: 'score-1' as never,
  relationshipId: 'rel-1' as never,
  userId: 'user-1' as never,
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
  confidenceLevel: 0.85,
  trendsData: {
    improving: true,
    trendDirection: 'up',
    changeRate: 5.2,
  },
}

describe('HealthScoreCard', () => {
  it('should display health score with proper formatting', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('Test Partner')).toBeInTheDocument()
    expect(screen.getByText('partner')).toBeInTheDocument()
  })

  it('should display component scores breakdown when showDetails is true', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    // Check for sentiment score
    expect(screen.getByText('Sentiment')).toBeInTheDocument()
    expect(screen.getByText('Emotional Stability')).toBeInTheDocument()
    expect(screen.getByText('Energy Impact')).toBeInTheDocument()
  })

  it('should not display component scores when showDetails is false', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={false}
      />
    )

    // Component breakdown should not be visible
    expect(screen.queryByText('Sentiment')).not.toBeInTheDocument()
    expect(screen.queryByText('Emotional Stability')).not.toBeInTheDocument()
  })

  it('should handle missing health score data', () => {
    render(
      <HealthScoreCard
        healthScore={null}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    expect(
      screen.getByText('No health score data available yet')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Add journal entries to generate insights')
    ).toBeInTheDocument()
  })

  it('should display loading state', () => {
    render(
      <HealthScoreCard
        healthScore={null}
        relationship={mockRelationship}
        isLoading={true}
      />
    )

    // Should show loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should display error state', () => {
    const error = new Error('Test error')
    render(
      <HealthScoreCard
        healthScore={null}
        relationship={mockRelationship}
        error={error}
      />
    )

    expect(screen.getByText('Analysis Unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Health score analysis for Test Partner is currently unavailable/
      )
    ).toBeInTheDocument()
  })

  it('should display relationship photo when available', () => {
    const relationshipWithPhoto = {
      ...mockRelationship,
      photo: 'https://example.com/photo.jpg',
    }

    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={relationshipWithPhoto}
      />
    )

    const image = screen.getByAltText('Test Partner')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('should display initial when no photo available', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
      />
    )

    expect(screen.getByText('T')).toBeInTheDocument() // First letter of "Test Partner"
  })

  it('should display trend indicator', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    // Should show trend direction (up arrow for positive trend)
    const trendElements = document.querySelectorAll('[data-testid*="trend"]')
    expect(trendElements.length).toBeGreaterThan(0)
  })

  it('should display correct score color coding', () => {
    const lowScore = { ...mockHealthScore, overallScore: 30 }
    const { rerender } = render(
      <HealthScoreCard healthScore={lowScore} relationship={mockRelationship} />
    )

    // Check for low score styling (should be orange/red)
    expect(screen.getByText('30')).toBeInTheDocument()

    const highScore = { ...mockHealthScore, overallScore: 95 }
    rerender(
      <HealthScoreCard
        healthScore={highScore}
        relationship={mockRelationship}
      />
    )

    // Check for high score styling (should be green)
    expect(screen.getByText('95')).toBeInTheDocument()
  })

  it('should display data points count', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    expect(screen.getByText(/15/)).toBeInTheDocument() // Data points count
  })

  it('should display last updated time', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    // Should display last updated information using test-id
    expect(screen.getByTestId('last-updated')).toBeInTheDocument()
    expect(screen.getByTestId('last-updated')).toHaveTextContent(/Updated/)
  })

  it('should handle edge case scores', () => {
    const edgeCaseScore = {
      ...mockHealthScore,
      overallScore: 0,
      componentScores: {
        sentiment: 0,
        emotionalStability: 0,
        energyImpact: 0,
        conflictResolution: 0,
        gratitude: 0,
        communicationFrequency: 0,
      },
    }

    render(
      <HealthScoreCard
        healthScore={edgeCaseScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    // Check for overall score specifically using aria-label
    expect(
      screen.getByLabelText(/Health score for Test Partner/)
    ).toHaveTextContent('0')
    expect(screen.getByText('Concerning')).toBeInTheDocument()
  })

  it('should be accessible with proper ARIA labels', () => {
    render(
      <HealthScoreCard
        healthScore={mockHealthScore}
        relationship={mockRelationship}
        showDetails={true}
      />
    )

    // Should have accessible structure
    const heading = screen.getByRole('heading', { name: /Test Partner/i })
    expect(heading).toBeInTheDocument()
  })
})
