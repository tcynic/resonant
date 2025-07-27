/**
 * React hooks for health score operations
 * Provides type-safe access to health score functions with error handling
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { HealthScore, ForceRecalculateArgs } from '@/lib/types'
import { useCallback } from 'react'

// ============================================================================
// HEALTH SCORE QUERIES
// ============================================================================

/**
 * Get health score for a specific relationship
 */
export const useHealthScoreByRelationship = (relationshipId?: string) => {
  const healthScore = useQuery(
    api.healthScores.getByRelationship,
    relationshipId ? { relationshipId } : 'skip'
  )

  return {
    healthScore,
    isLoading: healthScore === undefined,
    exists: !!healthScore,
    score: healthScore?.score || 0,
    isStale: healthScore?.isStale || false,
    daysOld: healthScore?.daysOld || 0,
    trendDirection: healthScore?.trendDirection || 'stable',

    // Score categorization
    isExcellent: (healthScore?.score || 0) >= 85,
    isGood: (healthScore?.score || 0) >= 70 && (healthScore?.score || 0) < 85,
    isFair: (healthScore?.score || 0) >= 50 && (healthScore?.score || 0) < 70,
    isPoor: (healthScore?.score || 0) < 50,
    needsAttention: (healthScore?.score || 0) < 60,
  }
}

/**
 * Get all health scores for a user
 */
export const useHealthScoresByUser = (userId?: string) => {
  const healthScores = useQuery(
    api.healthScores.getByUser,
    userId ? { userId } : 'skip'
  )

  return {
    healthScores: healthScores || [],
    isLoading: healthScores === undefined,
    count: healthScores?.length || 0,
    isEmpty: healthScores?.length === 0,

    // Score analysis
    averageScore: healthScores?.length
      ? healthScores.reduce((sum, hs) => sum + hs.score, 0) /
        healthScores.length
      : 0,

    // Categorized scores
    excellent: healthScores?.filter(hs => hs.score >= 85) || [],
    good: healthScores?.filter(hs => hs.score >= 70 && hs.score < 85) || [],
    fair: healthScores?.filter(hs => hs.score >= 50 && hs.score < 70) || [],
    poor: healthScores?.filter(hs => hs.score < 50) || [],

    // Trend analysis
    improving:
      healthScores?.filter(hs => hs.trendDirection === 'improving') || [],
    declining:
      healthScores?.filter(hs => hs.trendDirection === 'declining') || [],
    stable: healthScores?.filter(hs => hs.trendDirection === 'stable') || [],
  }
}

/**
 * Get health scores summary for dashboard
 */
export const useHealthScoresSummary = (userId?: string) => {
  const summary = useQuery(
    api.healthScores.getSummary,
    userId ? { userId } : 'skip'
  )

  return {
    summary,
    isLoading: summary === undefined,

    // Quick access to key metrics
    totalRelationships: summary?.totalRelationships || 0,
    averageScore: summary?.averageScore || 0,
    healthyRelationships: summary?.healthyRelationships || 0,
    needsAttention: summary?.needsAttention || 0,

    // Trend counts
    improving: summary?.improving || 0,
    declining: summary?.declining || 0,
    stable: summary?.stable || 0,

    // Distribution
    scoreDistribution: summary?.scoreDistribution || {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    },

    // Highlighted relationships
    topPerforming: summary?.topPerformingRelationship,
    needingAttention: summary?.relationshipNeedingAttention,
  }
}

/**
 * Get health score history for trend analysis
 */
export const useHealthScoreHistory = (
  relationshipId?: string,
  days: number = 90
) => {
  const history = useQuery(
    api.healthScores.getHistory,
    relationshipId ? { relationshipId, days } : 'skip'
  )

  return {
    history,
    dataPoints: history?.dataPoints || [],
    isLoading: history === undefined,
    trend: history?.trend || 'stable',
    confidence: history?.confidence || 0,
    currentScore: history?.currentScore || 0,

    // Chart-ready data
    chartData:
      history?.dataPoints.map(point => ({
        x: new Date(point.timestamp).toLocaleDateString(),
        y: point.score,
        confidence: point.confidence,
      })) || [],

    // Trend analysis
    isImproving: history?.trend === 'improving',
    isDeclining: history?.trend === 'declining',
    isStable: history?.trend === 'stable',
  }
}

// ============================================================================
// HEALTH SCORE MUTATIONS
// ============================================================================

/**
 * Force recalculation of health scores
 */
export const useForceRecalculate = () => {
  const forceRecalculate = useMutation(api.healthScores.forceRecalculate)

  return {
    forceRecalculate: useCallback(
      async (args: ForceRecalculateArgs) => {
        try {
          const result = await forceRecalculate(args)
          return { success: true, data: result }
        } catch (error) {
          console.error('Failed to recalculate health scores:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to recalculate health scores',
          }
        }
      },
      [forceRecalculate]
    ),
  }
}

// ============================================================================
// HEALTH SCORE UTILITIES
// ============================================================================

/**
 * Health score utilities and helpers
 */
export const useHealthScoreUtils = () => {
  return {
    // Score interpretation
    getScoreLabel: useCallback((score: number) => {
      if (score >= 85) return 'Excellent'
      if (score >= 70) return 'Good'
      if (score >= 50) return 'Fair'
      return 'Needs Attention'
    }, []),

    getScoreColor: useCallback((score: number) => {
      if (score >= 85) return 'green'
      if (score >= 70) return 'blue'
      if (score >= 50) return 'yellow'
      return 'red'
    }, []),

    getTrendIcon: useCallback((trend: string) => {
      switch (trend) {
        case 'improving':
          return '↗️'
        case 'declining':
          return '↘️'
        default:
          return '→'
      }
    }, []),

    getTrendLabel: useCallback((trend: string) => {
      switch (trend) {
        case 'improving':
          return 'Improving'
        case 'declining':
          return 'Declining'
        default:
          return 'Stable'
      }
    }, []),

    // Factor analysis
    getWeakestFactor: useCallback(
      (factorBreakdown?: Record<string, number>) => {
        if (!factorBreakdown) return null
        const factors = Object.entries(factorBreakdown) as [string, number][]
        return factors.reduce((min, current) =>
          current[1] < min[1] ? current : min
        )[0]
      },
      []
    ),

    getStrongestFactor: useCallback(
      (factorBreakdown?: Record<string, number>) => {
        if (!factorBreakdown) return null
        const factors = Object.entries(factorBreakdown) as [string, number][]
        return factors.reduce((max, current) =>
          current[1] > max[1] ? current : max
        )[0]
      },
      []
    ),

    // Recommendations
    getPriorityRecommendation: useCallback((healthScore?: HealthScore) => {
      if (!healthScore?.recommendations?.length) return null
      return healthScore.recommendations[0] // First recommendation is highest priority
    }, []),
  }
}

// ============================================================================
// COMBINED HEALTH SCORES HOOK
// ============================================================================

/**
 * Comprehensive health scores hook with all functionality
 */
export const useHealthScores = (userId?: string) => {
  const { healthScores, isLoading, isEmpty, averageScore } =
    useHealthScoresByUser(userId)
  const { summary } = useHealthScoresSummary(userId)
  const { forceRecalculate } = useForceRecalculate()
  const utils = useHealthScoreUtils()

  return {
    // Data
    healthScores,
    summary,
    isLoading,
    isEmpty,
    averageScore,

    // Actions
    forceRecalculate,

    // Utilities
    ...utils,

    // Helpers
    getScoreForRelationship: useCallback(
      (relationshipId: string) => {
        return healthScores.find(hs => hs.relationshipId === relationshipId)
      },
      [healthScores]
    ),

    getScoresNeedingAttention: useCallback(() => {
      return healthScores.filter(hs => hs.score < 60)
    }, [healthScores]),

    getTopPerformingScores: useCallback(
      (limit: number = 3) => {
        return [...healthScores]
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
      },
      [healthScores]
    ),

    // Computed properties
    hasHealthyRelationships: healthScores.some(hs => hs.score >= 70),
    hasRelationshipsNeedingAttention: healthScores.some(hs => hs.score < 60),
    overallHealthStatus:
      averageScore >= 70
        ? 'healthy'
        : averageScore >= 50
          ? 'fair'
          : 'needs_attention',

    // Dashboard metrics
    healthScoreMetrics: {
      total: healthScores.length,
      average: Math.round(averageScore),
      healthy: healthScores.filter(hs => hs.score >= 70).length,
      needsAttention: healthScores.filter(hs => hs.score < 60).length,
      improving: healthScores.filter(hs => hs.trendDirection === 'improving')
        .length,
      declining: healthScores.filter(hs => hs.trendDirection === 'declining')
        .length,
    },
  }
}
