/**
 * React hooks for AI analysis operations
 * Provides type-safe access to AI analysis functions with error handling
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { QueueAnalysisArgs } from '../../lib/types/convex-types'
import { useCallback } from 'react'

// ============================================================================
// AI ANALYSIS QUERIES
// ============================================================================

/**
 * Get AI analysis for a specific journal entry
 */
export const useAnalysisByEntry = (entryId?: string) => {
  const analysis = useQuery(
    api.aiAnalysis.getByEntry,
    entryId ? { entryId: entryId as Id<'journalEntries'> } : 'skip'
  )

  return {
    analysis,
    isLoading: analysis === undefined,
    exists: !!analysis,
    isCompleted: analysis?.status === 'completed',
    isProcessing: analysis?.status === 'processing',
    isFailed: analysis?.status === 'failed',
    sentimentScore: analysis?.sentimentScore || 0,
    confidence: analysis?.confidenceLevel || 0,
  }
}

/**
 * Get recent AI analyses for a user
 */
export const useRecentAnalysesByUser = (
  userId?: string,
  limit: number = 20
) => {
  const analyses = useQuery(
    api.aiAnalysis.getRecentByUser,
    userId ? { userId: userId as Id<'users'>, limit } : 'skip'
  )

  return {
    analyses: analyses || [],
    isLoading: analyses === undefined,
    count: analyses?.length || 0,
    isEmpty: analyses?.length === 0,

    // Filter helpers
    completed: analyses?.filter(a => a.status === 'completed') || [],
    processing: analyses?.filter(a => a.status === 'processing') || [],
    failed: analyses?.filter(a => a.status === 'failed') || [],

    // Sentiment helpers
    positive: analyses?.filter(a => a.sentimentScore > 0.2) || [],
    negative: analyses?.filter(a => a.sentimentScore < -0.2) || [],
    neutral: analyses?.filter(a => Math.abs(a.sentimentScore) <= 0.2) || [],
  }
}

/**
 * Get AI analyses for a specific relationship
 */
export const useAnalysesByRelationship = (
  relationshipId?: string,
  limit: number = 50
) => {
  const analyses = useQuery(
    api.aiAnalysis.getByRelationship,
    relationshipId
      ? { relationshipId: relationshipId as Id<'relationships'>, limit }
      : 'skip'
  )

  return {
    analyses: analyses || [],
    isLoading: analyses === undefined,
    count: analyses?.length || 0,
    isEmpty: analyses?.length === 0,

    // Computed metrics
    averageSentiment: analyses?.length
      ? analyses.reduce((sum, a) => sum + a.sentimentScore, 0) / analyses.length
      : 0,

    averageConfidence: analyses?.length
      ? analyses.reduce((sum, a) => sum + a.confidenceLevel, 0) /
        analyses.length
      : 0,

    // Trend analysis
    recentTrend: analyses?.length
      ? analyses.slice(0, 5).reduce((sum, a) => sum + a.sentimentScore, 0) /
        Math.min(5, analyses.length)
      : 0,
  }
}

/**
 * Get AI analysis statistics for a user
 */
export const useAnalysisStats = (userId?: string) => {
  const stats = useQuery(
    api.aiAnalysis.getStats,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  )

  return {
    stats,
    isLoading: stats === undefined,

    // Computed metrics
    successRate: stats ? (stats.completed / (stats.total || 1)) * 100 : 0,
    averageProcessingTime: 0, // Would need to calculate from individual analyses
    totalCost: stats?.totalApiCost || 0,
    totalTokens: stats?.totalTokensUsed || 0,
  }
}

// ============================================================================
// AI ANALYSIS MUTATIONS
// ============================================================================

/**
 * Queue a journal entry for AI analysis
 */
export const useQueueAnalysis = () => {
  const queueAnalysis = useMutation(api.aiAnalysis.queueAnalysis)

  return {
    queueAnalysis: useCallback(
      async (args: QueueAnalysisArgs) => {
        try {
          const result = await queueAnalysis(args)
          return { success: true, data: result }
        } catch (error) {
          console.error('Failed to queue analysis:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to queue analysis',
          }
        }
      },
      [queueAnalysis]
    ),
  }
}

// ============================================================================
// ANALYSIS PATTERNS AND INSIGHTS
// ============================================================================

/**
 * Extract patterns from analyses for a relationship
 */
export const useAnalysisPatterns = (relationshipId?: string) => {
  const { analyses, isLoading } = useAnalysesByRelationship(relationshipId)

  const patterns = {
    communicationStyles: {} as Record<string, number>,
    recurringThemes: {} as Record<string, number>,
    emotionalTriggers: {} as Record<string, number>,
    relationshipDynamics: {} as Record<string, number>,
  }

  if (!isLoading && analyses.length > 0) {
    analyses.forEach(analysis => {
      if (analysis.patterns) {
        // Count communication styles
        if (analysis.patterns.communication_style) {
          patterns.communicationStyles[analysis.patterns.communication_style] =
            (patterns.communicationStyles[
              analysis.patterns.communication_style
            ] || 0) + 1
        }

        // Count recurring themes
        analysis.patterns.recurring_themes?.forEach(theme => {
          patterns.recurringThemes[theme] =
            (patterns.recurringThemes[theme] || 0) + 1
        })

        // Count emotional triggers
        analysis.patterns.emotional_triggers?.forEach(trigger => {
          patterns.emotionalTriggers[trigger] =
            (patterns.emotionalTriggers[trigger] || 0) + 1
        })

        // Count relationship dynamics
        analysis.patterns.relationship_dynamics?.forEach(dynamic => {
          patterns.relationshipDynamics[dynamic] =
            (patterns.relationshipDynamics[dynamic] || 0) + 1
        })
      }
    })
  }

  return {
    patterns,
    isLoading,

    // Top patterns
    topCommunicationStyle:
      Object.entries(patterns.communicationStyles).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] || null,

    topThemes: Object.entries(patterns.recurringThemes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([theme]) => theme),

    topTriggers: Object.entries(patterns.emotionalTriggers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([trigger]) => trigger),
  }
}

/**
 * Get sentiment trends over time
 */
export const useSentimentTrends = (
  relationshipId?: string,
  days: number = 30
) => {
  const { analyses, isLoading } = useAnalysesByRelationship(relationshipId)

  const trends = {
    dataPoints: [] as Array<{
      date: string
      sentiment: number
      confidence: number
    }>,
    average: 0,
    trend: 'stable' as 'improving' | 'declining' | 'stable',
    volatility: 0,
  }

  if (!isLoading && analyses.length > 0) {
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000
    const recentAnalyses = analyses
      .filter(a => a.createdAt >= cutoffDate)
      .sort((a, b) => a.createdAt - b.createdAt)

    // Create data points
    trends.dataPoints = recentAnalyses.map(analysis => ({
      date: new Date(analysis.createdAt).toISOString().split('T')[0],
      sentiment: analysis.sentimentScore,
      confidence: analysis.confidenceLevel,
    }))

    // Calculate average
    trends.average =
      recentAnalyses.reduce((sum, a) => sum + a.sentimentScore, 0) /
      recentAnalyses.length

    // Calculate trend direction
    if (recentAnalyses.length >= 4) {
      const firstHalf = recentAnalyses.slice(
        0,
        Math.floor(recentAnalyses.length / 2)
      )
      const secondHalf = recentAnalyses.slice(
        Math.floor(recentAnalyses.length / 2)
      )

      const firstAvg =
        firstHalf.reduce((sum, a) => sum + a.sentimentScore, 0) /
        firstHalf.length
      const secondAvg =
        secondHalf.reduce((sum, a) => sum + a.sentimentScore, 0) /
        secondHalf.length

      const difference = secondAvg - firstAvg
      if (difference > 0.15) trends.trend = 'improving'
      else if (difference < -0.15) trends.trend = 'declining'
      else trends.trend = 'stable'
    }

    // Calculate volatility (standard deviation)
    const variance =
      recentAnalyses.reduce(
        (sum, a) => sum + Math.pow(a.sentimentScore - trends.average, 2),
        0
      ) / recentAnalyses.length
    trends.volatility = Math.sqrt(variance)
  }

  return {
    trends,
    isLoading,
    hasEnoughData: analyses.length >= 3,
  }
}

// ============================================================================
// COMBINED AI ANALYSIS HOOK
// ============================================================================

/**
 * Comprehensive AI analysis hook with all analysis functionality
 */
export const useAIAnalysis = (userId?: string) => {
  const { analyses, isLoading, isEmpty } = useRecentAnalysesByUser(userId)
  const { stats } = useAnalysisStats(userId)
  const { queueAnalysis } = useQueueAnalysis()

  return {
    // Data
    analyses,
    stats,
    isLoading,
    isEmpty,

    // Actions
    queueAnalysis,

    // Helpers
    getAnalysisForEntry: useCallback(
      (entryId: string) => {
        return analyses.find(a => a.entryId === entryId)
      },
      [analyses]
    ),

    getAnalysesForRelationship: useCallback(
      (relationshipId: string) => {
        return analyses.filter(a => a.relationshipId === relationshipId)
      },
      [analyses]
    ),

    // Computed properties
    totalAnalyses: analyses.length,
    pendingAnalyses: analyses.filter(a => a.status === 'processing').length,
    recentSentiment:
      analyses.slice(0, 5).reduce((sum, a) => sum + a.sentimentScore, 0) /
      Math.min(5, analyses.length),
    averageConfidence: analyses.length
      ? analyses.reduce((sum, a) => sum + a.confidenceLevel, 0) /
        analyses.length
      : 0,

    // Status helpers
    hasProcessingAnalyses: analyses.some(a => a.status === 'processing'),
    hasFailedAnalyses: analyses.some(a => a.status === 'failed'),
    analysisEnabled: true, // This could be tied to user preferences
  }
}
