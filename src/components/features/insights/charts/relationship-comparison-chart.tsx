'use client'

import React, { useMemo, forwardRef, useState } from 'react'
import { ChartData } from 'chart.js'
import {
  BaseChart,
  ChartHandle,
  ChartError,
  ChartSkeleton,
  BaseChartProps,
} from './base-chart'
import { formatRelationshipComparisonData } from '@/lib/chart-utils'
import { comparisonChartOptions, relationshipColors } from '@/lib/chart-theme'
import { format } from 'date-fns'

/**
 * Relationship data interface
 */
interface RelationshipData {
  relationshipId: string
  name: string
  type: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
  photo?: string
  data: Array<{
    x: number
    y: number
  }>
  averageScore: number
}

/**
 * Relationship comparison chart props
 */
export interface RelationshipComparisonChartProps {
  data: RelationshipData[]
  isLoading?: boolean
  error?: string
  className?: string
  height?: number
  maxRelationships?: number
  showAverageLines?: boolean
  allowToggle?: boolean
  onDataPointClick?: (
    relationshipId: string,
    dataPoint: { x: number; y: number }
  ) => void
  onRelationshipToggle?: (relationshipId: string, visible: boolean) => void
  onRetry?: () => void
  'aria-label'?: string
}

/**
 * Relationship Comparison Chart Component
 *
 * Displays multiple relationship health scores for comparison with:
 * - Color-coded relationship lines
 * - Interactive legend with toggle functionality
 * - Average score reference lines
 * - Relationship type indicators
 * - Photo avatars in legend
 */
export const RelationshipComparisonChart = forwardRef<
  ChartHandle,
  RelationshipComparisonChartProps
>(
  (
    {
      data,
      isLoading = false,
      error,
      className,
      height = 400,
      maxRelationships = 5,
      showAverageLines = true,
      allowToggle = true,
      onDataPointClick,
      onRelationshipToggle,
      onRetry,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    // Track which relationships are visible
    const [visibleRelationships, setVisibleRelationships] = useState<
      Set<string>
    >(new Set(data?.map(r => r.relationshipId) || []))

    // Limit relationships and filter visible ones
    const processedData = useMemo(() => {
      if (!data || data.length === 0) return []

      return data
        .slice(0, maxRelationships)
        .filter(relationship =>
          visibleRelationships.has(relationship.relationshipId)
        )
        .sort((a, b) => b.averageScore - a.averageScore) // Sort by average score
    }, [data, maxRelationships, visibleRelationships])

    // Transform data for Chart.js
    const chartData = useMemo(() => {
      if (processedData.length === 0) {
        return null
      }

      const datasets = formatRelationshipComparisonData(processedData)

      // Add average lines if requested
      if (showAverageLines) {
        processedData.forEach((relationship, index) => {
          const color = relationshipColors[index % relationshipColors.length]

          datasets.push({
            label: `${relationship.name} Average`,
            data: relationship.data.map(point => ({
              x: new Date(point.x),
              y: relationship.averageScore,
            })),
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 1,
            // borderDash: [3, 3], // Temporarily disabled for build compatibility
            fill: false,
            // pointRadius: 0, // Temporarily disabled for build compatibility
            // pointHoverRadius: 0, // Temporarily disabled for build compatibility
            // tension: 0, // Temporarily disabled for build compatibility
          })
        })
      }

      return { datasets }
    }, [processedData, showAverageLines])

    // Enhanced chart options
    const chartOptions = useMemo(
      () => ({
        ...comparisonChartOptions,
        plugins: {
          ...comparisonChartOptions.plugins,
          tooltip: {
            ...comparisonChartOptions.plugins.tooltip,
            callbacks: {
              title: function (context: TooltipItem[]) {
                if (context[0]?.parsed?.x) {
                  return format(new Date(context[0].parsed.x), 'MMM dd, yyyy')
                }
                return ''
              },
              label: function (context: TooltipItem) {
                const datasetLabel = context.dataset.label || ''
                const value = context.parsed.y

                // Find the relationship data
                const relationshipIndex = Math.floor(
                  context.datasetIndex / (showAverageLines ? 2 : 1)
                )
                const relationship = processedData[relationshipIndex]

                if (datasetLabel.includes('Average')) {
                  return `${datasetLabel}: ${value}%`
                }

                const lines = [
                  `${datasetLabel}: ${value}%`,
                  `Type: ${relationship?.type || 'Unknown'}`,
                  `Average: ${relationship?.averageScore || 0}%`,
                ]

                return lines
              },
              labelColor: function (context: TooltipItem) {
                const color = context.dataset.borderColor as string
                return {
                  borderColor: color,
                  backgroundColor: color,
                }
              },
            },
          },
          legend: {
            ...comparisonChartOptions.plugins.legend,
            display: false, // We'll create a custom legend
          },
        },
        scales: {
          ...comparisonChartOptions.scales,
          y: {
            ...comparisonChartOptions.scales.y,
            min: 0,
            max: 100,
            ticks: {
              ...comparisonChartOptions.scales.y.ticks,
              callback: function (value: number) {
                return value + '%'
              },
            },
            title: {
              display: true,
              text: 'Health Score',
              color: '#6B7280',
              font: {
                size: 12,
                weight: '500',
              },
            },
          },
          x: {
            ...comparisonChartOptions.scales.x,
            title: {
              display: true,
              text: 'Date',
              color: '#6B7280',
              font: {
                size: 12,
                weight: '500',
              },
            },
          },
        },
      }),
      [processedData, showAverageLines]
    )

    // Handle data point clicks
    const handleDataPointClick = (datasetIndex: number, pointIndex: number) => {
      if (!onDataPointClick) return

      const relationshipIndex = Math.floor(
        datasetIndex / (showAverageLines ? 2 : 1)
      )
      const relationship = processedData[relationshipIndex]

      if (relationship && relationship.data[pointIndex]) {
        onDataPointClick(
          relationship.relationshipId,
          relationship.data[pointIndex]
        )
      }
    }

    // Handle relationship toggle
    const handleRelationshipToggle = (relationshipId: string) => {
      if (!allowToggle) return

      const newVisible = new Set(visibleRelationships)
      if (newVisible.has(relationshipId)) {
        newVisible.delete(relationshipId)
      } else {
        newVisible.add(relationshipId)
      }

      setVisibleRelationships(newVisible)

      if (onRelationshipToggle) {
        onRelationshipToggle(relationshipId, newVisible.has(relationshipId))
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="space-y-4">
          <ChartSkeleton height={height} className={className} />
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center space-x-2"
              >
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Error state
    if (error) {
      return (
        <ChartError
          error={error}
          retry={onRetry}
          height={height}
          className={className}
        />
      )
    }

    // No data state
    if (!data || data.length === 0) {
      return (
        <div
          className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
          style={{ height }}
          role="img"
          aria-label="No relationship data available"
        >
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium mb-1">No relationship data</div>
            <div className="text-xs">
              Add relationships and journal entries to see comparisons
            </div>
          </div>
        </div>
      )
    }

    // No visible relationships
    if (!chartData) {
      return (
        <div className="space-y-4">
          <div
            className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200"
            style={{ height }}
            role="img"
            aria-label="No visible relationships"
          >
            <div className="text-center text-gray-500">
              <div className="text-sm font-medium mb-1">
                No visible relationships
              </div>
              <div className="text-xs">
                Select relationships below to display them
              </div>
            </div>
          </div>

          <RelationshipLegend
            relationships={data.slice(0, maxRelationships)}
            visibleRelationships={visibleRelationships}
            onToggle={allowToggle ? handleRelationshipToggle : undefined}
          />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <BaseChart
          ref={ref}
          type="line"
          data={chartData as unknown as ChartData<'line'>}
          options={chartOptions as BaseChartProps['options']}
          className={className}
          height={height}
          onDataPointClick={handleDataPointClick}
          aria-label={
            ariaLabel ||
            'Relationship comparison chart showing health scores over time'
          }
        />

        <RelationshipLegend
          relationships={data.slice(0, maxRelationships)}
          visibleRelationships={visibleRelationships}
          onToggle={allowToggle ? handleRelationshipToggle : undefined}
          showAverageScores
        />
      </div>
    )
  }
)

RelationshipComparisonChart.displayName = 'RelationshipComparisonChart'

/**
 * Custom legend component for relationships
 */
interface RelationshipLegendProps {
  relationships: RelationshipData[]
  visibleRelationships: Set<string>
  onToggle?: (relationshipId: string) => void
  showAverageScores?: boolean
}

function RelationshipLegend({
  relationships,
  visibleRelationships,
  onToggle,
  showAverageScores = false,
}: RelationshipLegendProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {relationships.map((relationship, index) => {
        const color = relationshipColors[index % relationshipColors.length]
        const isVisible = visibleRelationships.has(relationship.relationshipId)
        const isClickable = !!onToggle

        return (
          <div
            key={relationship.relationshipId}
            className={`flex items-center space-x-2 p-2 rounded-lg border transition-all ${
              isClickable ? 'cursor-pointer hover:bg-gray-50' : ''
            } ${
              isVisible
                ? 'bg-white border-gray-200'
                : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
            onClick={
              isClickable
                ? () => onToggle(relationship.relationshipId)
                : undefined
            }
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={e => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onToggle(relationship.relationshipId)
              }
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />

            {relationship.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={relationship.photo}
                alt={relationship.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {relationship.name.charAt(0).toUpperCase()}
              </div>
            )}

            <span className="text-sm font-medium text-gray-900">
              {relationship.name}
            </span>

            <span className="text-xs text-gray-500 capitalize">
              {relationship.type}
            </span>

            {showAverageScores && (
              <span className="text-xs font-medium text-gray-600">
                {relationship.averageScore}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Type definitions
interface TooltipItem {
  datasetIndex: number
  dataIndex: number
  parsed: {
    x: number
    y: number
  }
  dataset: {
    label?: string
    borderColor?: string
  }
}
