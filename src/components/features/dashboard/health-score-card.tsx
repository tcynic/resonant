'use client'

import React from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { AnalysisErrorFallback } from '@/components/ui/error-boundary'
import { HealthScore, Relationship } from '@/lib/types'

interface HealthScoreCardProps {
  healthScore: HealthScore | null
  relationship: Relationship
  className?: string
  showDetails?: boolean
  error?: Error | null
  isLoading?: boolean
}

interface ScoreProgressProps {
  score: number
  label: string
  className?: string
}

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable'
  changeRate: number
  improving: boolean
}

function ScoreProgress({ score, label, className = '' }: ScoreProgressProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    if (score >= 20) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center space-x-2">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getScoreColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-sm font-semibold ${getScoreTextColor(score)}`}>
          {Math.round(score)}
        </span>
      </div>
    </div>
  )
}

function TrendIndicator({
  direction,
  changeRate,
  improving,
}: TrendIndicatorProps) {
  const getTrendIcon = () => {
    switch (direction) {
      case 'up':
        return '↗️'
      case 'down':
        return '↘️'
      default:
        return '→'
    }
  }

  const getTrendColor = () => {
    if (direction === 'stable') return 'text-gray-500'
    return improving ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div
      className={`flex items-center space-x-1 ${getTrendColor()}`}
      data-testid="trend-indicator"
      aria-label={`Trend ${direction}, ${direction === 'stable' ? 'stable' : `${changeRate.toFixed(1)}% change`}`}
    >
      <span className="text-sm">{getTrendIcon()}</span>
      <span className="text-xs font-medium">
        {direction === 'stable' ? 'Stable' : `${changeRate.toFixed(1)}%`}
      </span>
    </div>
  )
}

export default function HealthScoreCard({
  healthScore,
  relationship,
  className = '',
  showDetails = true,
  error = null,
  isLoading = false,
}: HealthScoreCardProps) {
  // Handle loading state
  if (isLoading) {
    return (
      <Card className={`${className}`} padding="md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                <div>
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Handle error state
  if (error) {
    return (
      <Card className={`${className}`} padding="md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                {relationship.photo ? (
                  <Image
                    src={relationship.photo}
                    alt={relationship.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 font-medium text-lg">
                      {relationship.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {relationship.name}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {relationship.type}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnalysisErrorFallback relationshipName={relationship.name} />
        </CardContent>
      </Card>
    )
  }

  if (!healthScore) {
    return (
      <Card className={`${className}`} padding="md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {relationship.name}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {relationship.type}
              </p>
            </div>
            {relationship.photo && (
              <Image
                src={relationship.photo}
                alt={relationship.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-gray-400">📊</span>
            </div>
            <p className="text-gray-500 text-sm">
              No health score data available yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Add journal entries to generate insights
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getOverallScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    if (score >= 20) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Neutral'
    if (score >= 20) return 'Needs Attention'
    return 'Concerning'
  }

  const formatLastUpdated = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor(diff / (60 * 60 * 1000))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  return (
    <Card className={`${className}`} padding="md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              {relationship.photo ? (
                <Image
                  src={relationship.photo}
                  alt={relationship.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-medium">
                    {relationship.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {relationship.name}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {relationship.type}
                </p>
              </div>
            </div>
          </div>
          {healthScore.trendsData && (
            <TrendIndicator
              direction={healthScore.trendsData.trendDirection}
              changeRate={healthScore.trendsData.changeRate}
              improving={healthScore.trendsData.improving}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Overall Score Display */}
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 mx-auto mb-3">
            {/* Circular progress */}
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className={getOverallScoreColor(healthScore.overallScore)}
                strokeDasharray={`${healthScore.overallScore * 0.88} 88`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-xl font-bold ${getOverallScoreColor(healthScore.overallScore)}`}
                aria-label={`Health score for ${relationship.name}`}
              >
                {healthScore.overallScore}
              </span>
            </div>
          </div>
          <p
            className={`font-medium ${getOverallScoreColor(healthScore.overallScore)}`}
          >
            {getScoreLabel(healthScore.overallScore)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on {healthScore.dataPoints} entries
          </p>
        </div>

        {showDetails && (
          <>
            {/* Component Scores */}
            <div className="space-y-3 mb-4">
              <ScoreProgress
                score={healthScore.componentScores.sentiment}
                label="Sentiment"
              />
              <ScoreProgress
                score={healthScore.componentScores.emotionalStability}
                label="Emotional Stability"
              />
              <ScoreProgress
                score={healthScore.componentScores.energyImpact}
                label="Energy Impact"
              />
              <ScoreProgress
                score={healthScore.componentScores.conflictResolution}
                label="Conflict Resolution"
              />
              <ScoreProgress
                score={healthScore.componentScores.gratitude}
                label="Gratitude"
              />
              <ScoreProgress
                score={healthScore.componentScores.communicationFrequency}
                label="Communication"
              />
            </div>

            {/* Confidence and Last Updated */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
              <span>
                Confidence: {Math.round(healthScore.confidenceLevel * 100)}%
              </span>
              <span data-testid="last-updated">
                Updated {formatLastUpdated(healthScore.lastUpdated)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
