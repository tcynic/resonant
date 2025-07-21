/**
 * Health Score Calculation Utilities
 * Helper functions for health score algorithms and data processing
 */

import { HealthScoreComponents } from '../../src/lib/types'

// Health score calculation weights (must sum to 1.0)
export const HEALTH_SCORE_WEIGHTS = {
  sentiment: 0.35, // 35% - Primary indicator of relationship satisfaction
  emotionalStability: 0.25, // 25% - Consistency in emotional responses
  energyImpact: 0.2, // 20% - How relationship affects user's energy
  conflictResolution: 0.1, // 10% - Ability to handle and resolve conflicts
  gratitude: 0.05, // 5% - Expression of appreciation and gratitude
  communicationFrequency: 0.05, // 5% - Regular communication patterns
} as const

// Score range constants
export const SCORE_RANGES = {
  MIN: 0,
  MAX: 100,
  NEUTRAL: 50,
  EXCELLENT_THRESHOLD: 80,
  GOOD_THRESHOLD: 60,
  POOR_THRESHOLD: 40,
} as const

// Time constants for calculations
export const TIME_CONSTANTS = {
  DEFAULT_ANALYSIS_DAYS: 30,
  TREND_STABILITY_THRESHOLD: 2, // Points needed for "stable" trend
  RECENT_WEIGHT_DECAY: 0.9, // How much recent entries are weighted
  MIN_ANALYSES_FOR_CONFIDENCE: 5,
  MAX_ANALYSES_FOR_FULL_CONFIDENCE: 15,
} as const

/**
 * Calculate weighted overall health score from component scores
 */
export function calculateOverallScore(
  componentScores: HealthScoreComponents
): number {
  const score =
    componentScores.sentiment * HEALTH_SCORE_WEIGHTS.sentiment +
    componentScores.emotionalStability *
      HEALTH_SCORE_WEIGHTS.emotionalStability +
    componentScores.energyImpact * HEALTH_SCORE_WEIGHTS.energyImpact +
    componentScores.conflictResolution *
      HEALTH_SCORE_WEIGHTS.conflictResolution +
    componentScores.gratitude * HEALTH_SCORE_WEIGHTS.gratitude +
    componentScores.communicationFrequency *
      HEALTH_SCORE_WEIGHTS.communicationFrequency

  return Math.round(
    Math.min(SCORE_RANGES.MAX, Math.max(SCORE_RANGES.MIN, score))
  )
}

/**
 * Calculate confidence level based on data availability and quality
 */
export function calculateConfidenceLevel(
  totalAnalyses: number,
  avgAIConfidence: number,
  componentScores: HealthScoreComponents
): number {
  // Data availability factor (0-1)
  const dataFactor = Math.min(
    1,
    totalAnalyses / TIME_CONSTANTS.MAX_ANALYSES_FOR_FULL_CONFIDENCE
  )

  // AI confidence factor (0-1)
  const aiFactor = Math.max(0.1, avgAIConfidence)

  // Component diversity factor - penalize too many neutral scores
  const neutralComponents = Object.values(componentScores).filter(
    score => Math.abs(score - SCORE_RANGES.NEUTRAL) < 5
  ).length
  const diversityFactor = Math.max(0.3, 1 - neutralComponents * 0.15)

  // Minimum data threshold
  const hasMinimumData =
    totalAnalyses >= TIME_CONSTANTS.MIN_ANALYSES_FOR_CONFIDENCE ? 1 : 0.5

  const overallConfidence =
    dataFactor * aiFactor * diversityFactor * hasMinimumData

  return Math.min(1, Math.max(0.1, overallConfidence))
}

/**
 * Calculate recency-weighted average from a series of scores
 */
export function calculateRecencyWeightedAverage(
  scores: Array<{ score: number; confidence?: number; timestamp?: number }>
): number {
  if (scores.length === 0) return SCORE_RANGES.NEUTRAL

  let weightedSum = 0
  let totalWeight = 0

  scores.forEach((item, index) => {
    // More recent scores get higher weight
    const recencyWeight = Math.pow(
      TIME_CONSTANTS.RECENT_WEIGHT_DECAY,
      scores.length - 1 - index
    )
    const confidenceWeight = item.confidence || 0.7
    const weight = recencyWeight * confidenceWeight

    weightedSum += item.score * weight
    totalWeight += weight
  })

  return totalWeight > 0 ? weightedSum / totalWeight : SCORE_RANGES.NEUTRAL
}

/**
 * Determine health score category and description
 */
export function getScoreCategory(score: number): {
  category: 'excellent' | 'good' | 'neutral' | 'needs_attention' | 'poor'
  label: string
  color: string
  description: string
} {
  if (score >= SCORE_RANGES.EXCELLENT_THRESHOLD) {
    return {
      category: 'excellent',
      label: 'Excellent',
      color: 'green',
      description:
        'This relationship is thriving with strong positive indicators',
    }
  } else if (score >= SCORE_RANGES.GOOD_THRESHOLD) {
    return {
      category: 'good',
      label: 'Good',
      color: 'blue',
      description: 'This relationship is healthy with room for growth',
    }
  } else if (score >= SCORE_RANGES.POOR_THRESHOLD) {
    return {
      category: 'neutral',
      label: 'Neutral',
      color: 'yellow',
      description: 'This relationship has mixed indicators',
    }
  } else if (score >= 20) {
    return {
      category: 'needs_attention',
      label: 'Needs Attention',
      color: 'orange',
      description: 'This relationship may benefit from focused attention',
    }
  } else {
    return {
      category: 'poor',
      label: 'Concerning',
      color: 'red',
      description: 'This relationship shows concerning patterns',
    }
  }
}

/**
 * Calculate trend direction and magnitude
 */
export function calculateTrendData(
  currentScore: number,
  previousScore: number | null
): {
  direction: 'up' | 'down' | 'stable'
  magnitude: number
  isSignificant: boolean
} {
  if (previousScore === null) {
    return {
      direction: 'stable',
      magnitude: 0,
      isSignificant: false,
    }
  }

  const difference = currentScore - previousScore
  const magnitude = Math.abs(difference)
  const isSignificant = magnitude >= TIME_CONSTANTS.TREND_STABILITY_THRESHOLD

  let direction: 'up' | 'down' | 'stable'
  if (!isSignificant) {
    direction = 'stable'
  } else if (difference > 0) {
    direction = 'up'
  } else {
    direction = 'down'
  }

  return {
    direction,
    magnitude,
    isSignificant,
  }
}

/**
 * Calculate communication frequency score based on entry patterns
 */
export function calculateCommunicationFrequency(
  entryCount: number,
  timeRangeDays: number,
  optimalFrequencyPerWeek = 3
): number {
  const entriesPerWeek = (entryCount / timeRangeDays) * 7
  const optimalRatio = entriesPerWeek / optimalFrequencyPerWeek

  // Score peaks at optimal frequency, decreases for too few or too many
  let score: number
  if (optimalRatio <= 1) {
    score = optimalRatio * SCORE_RANGES.EXCELLENT_THRESHOLD
  } else {
    // Diminishing returns for too frequent entries
    score = SCORE_RANGES.EXCELLENT_THRESHOLD * (1 - (optimalRatio - 1) * 0.1)
  }

  return Math.round(
    Math.min(SCORE_RANGES.MAX, Math.max(SCORE_RANGES.MIN, score))
  )
}

/**
 * Normalize score from different scales to 0-100 range
 */
export function normalizeScore(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number = SCORE_RANGES.MIN,
  toMax: number = SCORE_RANGES.MAX
): number {
  // Handle edge cases
  if (fromMax === fromMin) return toMin

  // Linear normalization
  const normalizedValue =
    ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin

  return Math.round(Math.min(toMax, Math.max(toMin, normalizedValue)))
}

/**
 * Get insights and recommendations based on component scores
 */
export function generateHealthInsights(
  componentScores: HealthScoreComponents,
  overallScore: number,
  confidenceLevel: number
): {
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  confidenceNote?: string
} {
  const insights = {
    strengths: [] as string[],
    improvements: [] as string[],
    recommendations: [] as string[],
    confidenceNote: undefined as string | undefined,
  }

  // Add confidence note if low
  if (confidenceLevel < 0.6) {
    insights.confidenceNote =
      'Score confidence is moderate. Consider adding more journal entries for better accuracy.'
  }

  // Analyze each component
  const components = [
    {
      name: 'Sentiment',
      score: componentScores.sentiment,
      weight: HEALTH_SCORE_WEIGHTS.sentiment,
    },
    {
      name: 'Emotional Stability',
      score: componentScores.emotionalStability,
      weight: HEALTH_SCORE_WEIGHTS.emotionalStability,
    },
    {
      name: 'Energy Impact',
      score: componentScores.energyImpact,
      weight: HEALTH_SCORE_WEIGHTS.energyImpact,
    },
    {
      name: 'Conflict Resolution',
      score: componentScores.conflictResolution,
      weight: HEALTH_SCORE_WEIGHTS.conflictResolution,
    },
    {
      name: 'Gratitude Expression',
      score: componentScores.gratitude,
      weight: HEALTH_SCORE_WEIGHTS.gratitude,
    },
    {
      name: 'Communication Frequency',
      score: componentScores.communicationFrequency,
      weight: HEALTH_SCORE_WEIGHTS.communicationFrequency,
    },
  ]

  // Identify top performers and areas for improvement
  const sortedByScore = [...components].sort((a, b) => b.score - a.score)
  const topPerformers = sortedByScore
    .slice(0, 2)
    .filter(c => c.score >= SCORE_RANGES.GOOD_THRESHOLD)
  const needsImprovement = sortedByScore
    .slice(-2)
    .filter(c => c.score < SCORE_RANGES.GOOD_THRESHOLD)

  // Add strengths
  topPerformers.forEach(component => {
    insights.strengths.push(`Strong ${component.name.toLowerCase()} patterns`)
  })

  // Add improvement areas
  needsImprovement.forEach(component => {
    insights.improvements.push(`${component.name} could be enhanced`)
  })

  // Generate specific recommendations
  if (componentScores.sentiment < SCORE_RANGES.GOOD_THRESHOLD) {
    insights.recommendations.push(
      'Focus on positive interactions and shared activities'
    )
  }

  if (componentScores.conflictResolution < SCORE_RANGES.GOOD_THRESHOLD) {
    insights.recommendations.push(
      'Work on communication skills and conflict resolution strategies'
    )
  }

  if (componentScores.gratitude < SCORE_RANGES.GOOD_THRESHOLD) {
    insights.recommendations.push(
      'Express appreciation and gratitude more frequently'
    )
  }

  if (componentScores.communicationFrequency < SCORE_RANGES.GOOD_THRESHOLD) {
    insights.recommendations.push(
      'Increase regular check-ins and meaningful conversations'
    )
  }

  return insights
}
