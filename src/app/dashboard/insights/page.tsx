'use client'

// Force dynamic rendering to avoid build-time API issues with Convex stubs
export const dynamic = 'force-dynamic'

import React, { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SentimentTrendChart } from '@/components/features/insights/charts/sentiment-trend-chart'
import { HealthScoreChart } from '@/components/features/insights/charts/health-score-chart'
import { RelationshipComparisonChart } from '@/components/features/insights/charts/relationship-comparison-chart'
import { TimeRangeSelector } from '@/components/features/insights/controls/time-range-selector'
import { ChartExportButton } from '@/components/features/insights/charts/chart-export-button'
import { ChartHandle } from '@/components/features/insights/charts/base-chart'
import {
  useChartData,
  useRelationshipComparisonData,
} from '@/hooks/insights/use-chart-data'
import { TimeRange } from '@/lib/chart-utils'
import { Settings, TrendingUp, BarChart3, Users } from 'lucide-react'

/**
 * Insights Dashboard Page
 *
 * Displays advanced visualizations and trend analysis with:
 * - Multiple chart types
 * - Interactive controls
 * - Export functionality
 * - Responsive layout
 */
export default function InsightsPage() {
  // State for chart configurations
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [customStart, setCustomStart] = useState<Date>()
  const [customEnd, setCustomEnd] = useState<Date>()
  const [selectedRelationships] = useState<string[]>([])
  const [showMovingAverage, setShowMovingAverage] = useState(false)

  // Chart refs for export functionality
  const sentimentChartRef = useRef<ChartHandle>(null)
  const healthScoreChartRef = useRef<ChartHandle>(null)
  const comparisonChartRef = useRef<ChartHandle>(null)

  // Chart preferences (commented out for now)
  // const { preferences, isLoading: preferencesLoading } = useChartPreferences()

  // Chart data hooks
  const sentimentData = useChartData('sentiment_trend', {
    timeRange,
    customStart,
    customEnd,
    selectedRelationships,
    showTrendLines: true,
    showAnnotations: false,
    showMovingAverage,
    movingAverageWindow: 7,
  })

  const healthScoreData = useChartData('health_score_trend', {
    timeRange,
    customStart,
    customEnd,
    selectedRelationships,
    showTrendLines: true,
    showAnnotations: true,
    showMovingAverage: false,
  })

  const comparisonData = useRelationshipComparisonData(
    selectedRelationships,
    timeRange,
    'sentiment',
    customStart,
    customEnd
  )

  // Handle time range changes
  const handleTimeRangeChange = (
    newTimeRange: TimeRange,
    newCustomStart?: Date,
    newCustomEnd?: Date
  ) => {
    setTimeRange(newTimeRange)
    setCustomStart(newCustomStart)
    setCustomEnd(newCustomEnd)
  }

  // Handle export events
  const handleExportStart = () => {
    console.log('Export started')
  }

  const handleExportComplete = (fileName: string) => {
    console.log('Export completed:', fileName)
    // You could show a toast notification here
  }

  const handleExportError = (error: string) => {
    console.error('Export failed:', error)
    // You could show an error toast here
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Insights & Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Explore patterns and trends in your relationship data
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings size={16} className="mr-2" />
            Customize
          </Button>
        </div>
      </div>

      {/* Time Range Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Period</CardTitle>
          <CardDescription>
            Select the time range for your analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeRangeSelector
            value={timeRange}
            customStart={customStart}
            customEnd={customEnd}
            onChange={handleTimeRangeChange}
          />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp size={20} />
                <span>Health Score Trends</span>
              </CardTitle>
              <CardDescription>
                Track your relationship health scores over time
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showMovingAverage}
                  onChange={e => setShowMovingAverage(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>7-day average</span>
              </label>
              <ChartExportButton
                chartRef={healthScoreChartRef}
                chartType="health-score-trend"
                timeRange={timeRange}
                onExportStart={handleExportStart}
                onExportComplete={handleExportComplete}
                onExportError={handleExportError}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <HealthScoreChart
                ref={healthScoreChartRef}
                data={healthScoreData.data}
                isLoading={healthScoreData.isLoading}
                error={
                  healthScoreData.hasError
                    ? 'Failed to load health score data'
                    : undefined
                }
                showTrendIndicators={true}
                showStatistics={true}
                height={384}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Trend Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 size={20} />
                <span>Sentiment Analysis</span>
              </CardTitle>
              <CardDescription>
                Emotional patterns in your journal entries
              </CardDescription>
            </div>
            <ChartExportButton
              chartRef={sentimentChartRef}
              chartType="sentiment-trend"
              timeRange={timeRange}
              onExportStart={handleExportStart}
              onExportComplete={handleExportComplete}
              onExportError={handleExportError}
            />
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <SentimentTrendChart
                ref={sentimentChartRef}
                data={sentimentData.data}
                isLoading={sentimentData.isLoading}
                error={
                  sentimentData.hasError
                    ? 'Failed to load sentiment data'
                    : undefined
                }
                showMovingAverage={showMovingAverage}
                movingAverageWindow={7}
                height={320}
              />
            </div>
          </CardContent>
        </Card>

        {/* Relationship Comparison Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users size={20} />
                <span>Relationship Comparison</span>
              </CardTitle>
              <CardDescription>
                Compare health scores across relationships
              </CardDescription>
            </div>
            <ChartExportButton
              chartRef={comparisonChartRef}
              chartType="relationship-comparison"
              timeRange={timeRange}
              onExportStart={handleExportStart}
              onExportComplete={handleExportComplete}
              onExportError={handleExportError}
            />
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <RelationshipComparisonChart
                ref={comparisonChartRef}
                data={comparisonData.data.map(
                  (item: {
                    relationshipId: string
                    relationshipName: string
                    value: number
                  }) => ({
                    relationshipId: item.relationshipId,
                    name: item.relationshipName,
                    type: 'friend' as const, // Default type since we don't have it from comparison data
                    data: [{ x: Date.now(), y: item.value }],
                    averageScore: item.value,
                  })
                )}
                isLoading={comparisonData.isLoading}
                error={
                  comparisonData.hasError
                    ? 'Failed to load comparison data'
                    : undefined
                }
                maxRelationships={5}
                showAverageLines={true}
                allowToggle={true}
                height={320}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Summary */}
      {healthScoreData.statistics && (
        <Card>
          <CardHeader>
            <CardTitle>Period Summary</CardTitle>
            <CardDescription>
              Key insights from your selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(
                    (healthScoreData.statistics as { average?: number })
                      ?.average || 0
                  )}
                  %
                </div>
                <div className="text-sm text-blue-800">
                  Average Health Score
                </div>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(healthScoreData.statistics as { trend?: string })?.trend ===
                  'improving'
                    ? '📈'
                    : (healthScoreData.statistics as { trend?: string })
                          ?.trend === 'declining'
                      ? '📉'
                      : '➡️'}
                </div>
                <div className="text-sm text-green-800 capitalize">
                  {(healthScoreData.statistics as { trend?: string })?.trend ||
                    'stable'}
                </div>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {sentimentData.data.length}
                </div>
                <div className="text-sm text-purple-800">Data Points</div>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {(healthScoreData.statistics as { volatility?: string })
                    ?.volatility || 'Low'}
                </div>
                <div className="text-sm text-orange-800">Volatility Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!healthScoreData.isLoading && healthScoreData.data.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No data available</h3>
              <p className="text-sm">
                Start journaling about your relationships to see insights and
                trends appear here.
              </p>
            </div>
            <Button className="mt-4">Create Your First Entry</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
