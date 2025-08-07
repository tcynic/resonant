/**
 * Unit tests for StructuredInsights component
 */

import { render } from '@testing-library/react'
import StructuredInsights from '../components/features/dashboard/structured-insights'
import { LangExtractResult } from '../lib/types'

describe('StructuredInsights', () => {
  const mockLangExtractData: LangExtractResult = {
    structuredData: {
      emotions: [
        { text: 'happy', type: 'positive', intensity: 'high' },
        { text: 'excited', type: 'positive', intensity: 'medium' },
      ],
      themes: [
        { text: 'quality time', category: 'relationship', context: 'weekend' },
        { text: 'work stress', category: 'career', context: 'deadline' },
      ],
      triggers: [
        { text: 'deadline pressure', type: 'work', severity: 'medium' },
      ],
      communication: [
        { text: 'good conversation', style: 'collaborative', tone: 'positive' },
      ],
      relationships: [
        {
          text: 'feeling connected',
          type: 'emotional_connection',
          dynamic: 'positive',
        },
      ],
    },
    extractedEntities: ['happy', 'excited', 'quality time', 'work stress'],
    processingSuccess: true,
    processingTimeMs: 1500,
  }

  const mockFailedData: LangExtractResult = {
    structuredData: {
      emotions: [],
      themes: [],
      triggers: [],
      communication: [],
      relationships: [],
    },
    extractedEntities: [],
    processingSuccess: false,
    errorMessage: 'Processing failed',
  }

  it('renders structured insights when data is available', () => {
    const { getByText } = render(
      <StructuredInsights langExtractData={mockLangExtractData} />
    )

    expect(getByText('Structured Insights')).toBeInTheDocument()
    expect(getByText('happy')).toBeInTheDocument()
    expect(getByText('quality time')).toBeInTheDocument()
    expect(getByText('deadline pressure')).toBeInTheDocument()
  })

  it('renders compact view correctly', () => {
    const { getByText } = render(
      <StructuredInsights
        langExtractData={mockLangExtractData}
        compact={true}
      />
    )

    expect(getByText('Enhanced Insights')).toBeInTheDocument()
    expect(getByText('happy')).toBeInTheDocument()
    expect(getByText('quality time')).toBeInTheDocument()
  })

  it('shows processing time when available', () => {
    const { getByText } = render(
      <StructuredInsights langExtractData={mockLangExtractData} />
    )

    expect(getByText(/1500ms/)).toBeInTheDocument()
  })

  it('does not render when processing failed', () => {
    const { container } = render(
      <StructuredInsights langExtractData={mockFailedData} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('does not render when no structured data is available', () => {
    const emptyData: LangExtractResult = {
      ...mockLangExtractData,
      structuredData: {
        emotions: [],
        themes: [],
        triggers: [],
        communication: [],
        relationships: [],
      },
    }

    const { container } = render(
      <StructuredInsights langExtractData={emptyData} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('displays emotion intensity indicators', () => {
    const { container } = render(
      <StructuredInsights langExtractData={mockLangExtractData} />
    )

    // High intensity should show ●●●
    const highIntensityElement = container.querySelector(
      '[title*="high intensity"]'
    )
    expect(highIntensityElement).toBeInTheDocument()
  })

  it('categorizes themes with appropriate colors', () => {
    const { container } = render(
      <StructuredInsights langExtractData={mockLangExtractData} />
    )

    // Should have relationship-themed color classes
    const relationshipTheme = container.querySelector('.bg-pink-100')
    expect(relationshipTheme).toBeInTheDocument()

    // Should have career-themed color classes
    const careerTheme = container.querySelector('.bg-purple-100')
    expect(careerTheme).toBeInTheDocument()
  })
})
