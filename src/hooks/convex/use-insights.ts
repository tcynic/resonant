/**
 * React hooks for insights operations
 * Provides type-safe access to insights functions with error handling
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import {
  Insight,
  GetActiveInsightsArgs,
  RateInsightArgs,
  MarkInsightActedOnArgs,
} from '@/lib/types'
import { useCallback } from 'react'

// ============================================================================
// INSIGHTS QUERIES
// ============================================================================

/**
 * Get active insights for a user
 */
export const useActiveInsights = (args?: GetActiveInsightsArgs) => {
  const insights = useQuery(api.insights.getActive, args || 'skip')

  return {
    insights: insights || [],
    isLoading: insights === undefined,
    count: insights?.length || 0,
    isEmpty: insights?.length === 0,

    // Filter by type
    byType: useCallback(
      (type: Insight['type']) => {
        return insights?.filter(i => i.type === type) || []
      },
      [insights]
    ),

    // Filter by priority
    byPriority: useCallback(
      (priority: Insight['priority']) => {
        return insights?.filter(i => i.priority === priority) || []
      },
      [insights]
    ),

    // Categorized insights
    urgent: insights?.filter(i => i.priority === 'urgent') || [],
    high: insights?.filter(i => i.priority === 'high') || [],
    medium: insights?.filter(i => i.priority === 'medium') || [],
    low: insights?.filter(i => i.priority === 'low') || [],

    // Type-specific insights
    patterns: insights?.filter(i => i.type === 'pattern_recognition') || [],
    improvements:
      insights?.filter(i => i.type === 'improvement_suggestion') || [],
    conversations:
      insights?.filter(i => i.type === 'conversation_starter') || [],
    warnings: insights?.filter(i => i.type === 'warning_signal') || [],
    celebrations: insights?.filter(i => i.type === 'celebration_prompt') || [],
    trends: insights?.filter(i => i.type === 'trend_alert') || [],
  }
}

/**
 * Get insights summary for dashboard
 */
export const useInsightsSummary = (userId?: string) => {
  const summary = useQuery(
    api.insights.getSummary,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  )

  return {
    summary,
    isLoading: summary === undefined,

    // Quick access to metrics
    total: summary?.total || 0,
    active: summary?.active || 0,

    // By type
    typeBreakdown: summary?.byType || {
      pattern_recognition: 0,
      improvement_suggestion: 0,
      conversation_starter: 0,
      warning_signal: 0,
      celebration_prompt: 0,
      trend_alert: 0,
    },

    // By priority
    priorityBreakdown: summary?.byPriority || {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    },

    // Computed metrics
    hasUrgentInsights: (summary?.byPriority?.urgent || 0) > 0,
    hasHighPriorityInsights: (summary?.byPriority?.high || 0) > 0,
    hasActionableInsights: (summary?.active || 0) > 0,
  }
}

// ============================================================================
// INSIGHTS MUTATIONS
// ============================================================================

/**
 * Mark an insight as viewed
 */
export const useMarkInsightViewed = () => {
  const markViewed = useMutation(api.insights.markViewed)

  return {
    markViewed: useCallback(
      async (insightId: string) => {
        try {
          await markViewed({ insightId: insightId as Id<'insights'> })
          return { success: true }
        } catch (error) {
          console.error('Failed to mark insight as viewed:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to mark insight as viewed',
          }
        }
      },
      [markViewed]
    ),
  }
}

/**
 * Dismiss an insight
 */
export const useDismissInsight = () => {
  const dismiss = useMutation(api.insights.dismiss)

  return {
    dismiss: useCallback(
      async (insightId: string) => {
        try {
          await dismiss({ insightId: insightId as Id<'insights'> })
          return { success: true }
        } catch (error) {
          console.error('Failed to dismiss insight:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to dismiss insight',
          }
        }
      },
      [dismiss]
    ),
  }
}

/**
 * Mark an insight as acted upon
 */
export const useMarkInsightActedOn = () => {
  const markActedOn = useMutation(api.insights.markActedOn)

  return {
    markActedOn: useCallback(
      async (args: MarkInsightActedOnArgs) => {
        try {
          await markActedOn(args)
          return { success: true }
        } catch (error) {
          console.error('Failed to mark insight as acted on:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to mark insight as acted on',
          }
        }
      },
      [markActedOn]
    ),
  }
}

/**
 * Rate an insight
 */
export const useRateInsight = () => {
  const rateInsight = useMutation(api.insights.rateInsight)

  return {
    rateInsight: useCallback(
      async (args: RateInsightArgs) => {
        try {
          await rateInsight(args)
          return { success: true }
        } catch (error) {
          console.error('Failed to rate insight:', error)
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Failed to rate insight',
          }
        }
      },
      [rateInsight]
    ),
  }
}

// ============================================================================
// INSIGHTS UTILITIES
// ============================================================================

/**
 * Insights utilities and helpers
 */
export const useInsightsUtils = () => {
  return {
    // Priority styling
    getPriorityColor: useCallback((priority: Insight['priority']) => {
      switch (priority) {
        case 'urgent':
          return 'red'
        case 'high':
          return 'orange'
        case 'medium':
          return 'blue'
        case 'low':
          return 'gray'
        default:
          return 'gray'
      }
    }, []),

    getPriorityIcon: useCallback((priority: Insight['priority']) => {
      switch (priority) {
        case 'urgent':
          return '🚨'
        case 'high':
          return '⚠️'
        case 'medium':
          return 'ℹ️'
        case 'low':
          return '💡'
        default:
          return '💡'
      }
    }, []),

    // Type styling
    getTypeIcon: useCallback((type: Insight['type']) => {
      switch (type) {
        case 'pattern_recognition':
          return '🔍'
        case 'improvement_suggestion':
          return '💡'
        case 'conversation_starter':
          return '💬'
        case 'warning_signal':
          return '⚠️'
        case 'celebration_prompt':
          return '🎉'
        case 'trend_alert':
          return '📈'
        default:
          return 'ℹ️'
      }
    }, []),

    getTypeLabel: useCallback((type: Insight['type']) => {
      switch (type) {
        case 'pattern_recognition':
          return 'Pattern Detected'
        case 'improvement_suggestion':
          return 'Improvement Idea'
        case 'conversation_starter':
          return 'Conversation Starter'
        case 'warning_signal':
          return 'Attention Needed'
        case 'celebration_prompt':
          return 'Celebrate Success'
        case 'trend_alert':
          return 'Trend Alert'
        default:
          return 'Insight'
      }
    }, []),

    // Interaction helpers
    hasBeenViewed: useCallback((insight: Insight) => {
      return !!insight.userInteraction?.viewedAt
    }, []),

    hasBeenActedOn: useCallback((insight: Insight) => {
      return !!insight.userInteraction?.actedOnAt
    }, []),

    hasBeenRated: useCallback((insight: Insight) => {
      return !!insight.userInteraction?.rating
    }, []),

    isExpired: useCallback((insight: Insight) => {
      return insight.expiresAt < Date.now()
    }, []),

    // Time helpers
    getTimeUntilExpiry: useCallback((insight: Insight) => {
      const msUntilExpiry = insight.expiresAt - Date.now()
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000))
      return Math.max(0, daysUntilExpiry)
    }, []),

    getTimeSinceCreated: useCallback((insight: Insight) => {
      const msSinceCreated = Date.now() - insight.createdAt
      const daysSinceCreated = Math.floor(
        msSinceCreated / (24 * 60 * 60 * 1000)
      )
      if (daysSinceCreated === 0) return 'Today'
      if (daysSinceCreated === 1) return 'Yesterday'
      return `${daysSinceCreated} days ago`
    }, []),
  }
}

// ============================================================================
// INSIGHTS FILTERING AND SORTING
// ============================================================================

/**
 * Advanced insights filtering and sorting
 */
export const useInsightsFiltering = (insights: Insight[]) => {
  return {
    // Sorting functions
    sortByPriority: useCallback(() => {
      const priorityOrder: Record<string, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      }
      return [...insights].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      )
    }, [insights]),

    sortByDate: useCallback(
      (ascending = false) => {
        return [...insights].sort((a, b) =>
          ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
        )
      },
      [insights]
    ),

    sortByType: useCallback(() => {
      return [...insights].sort((a, b) => a.type.localeCompare(b.type))
    }, [insights]),

    // Filtering functions
    filterByPriority: useCallback(
      (priorities: Insight['priority'][]) => {
        return insights.filter(i => priorities.includes(i.priority))
      },
      [insights]
    ),

    filterByType: useCallback(
      (types: Insight['type'][]) => {
        return insights.filter(i => types.includes(i.type))
      },
      [insights]
    ),

    filterByRelationship: useCallback(
      (relationshipId?: string) => {
        if (!relationshipId) return insights
        return insights.filter(i => i.relationshipId === relationshipId)
      },
      [insights]
    ),

    filterUnviewed: useCallback(() => {
      return insights.filter(i => !i.userInteraction?.viewedAt)
    }, [insights]),

    filterActionable: useCallback(() => {
      return insights.filter(
        i =>
          i.priority === 'urgent' ||
          i.priority === 'high' ||
          i.type === 'warning_signal'
      )
    }, [insights]),
  }
}

// ============================================================================
// COMBINED INSIGHTS HOOK
// ============================================================================

/**
 * Comprehensive insights hook with all functionality
 */
export const useInsights = (userId?: string, relationshipId?: string) => {
  const { insights, isLoading, isEmpty } = useActiveInsights(
    userId ? { userId, relationshipId } : undefined
  )
  const { summary } = useInsightsSummary(userId)
  const { markViewed } = useMarkInsightViewed()
  const { dismiss } = useDismissInsight()
  const { markActedOn } = useMarkInsightActedOn()
  const { rateInsight } = useRateInsight()
  const utils = useInsightsUtils()
  const filtering = useInsightsFiltering(insights)

  return {
    // Data
    insights,
    summary,
    isLoading,
    isEmpty,

    // Actions
    markViewed,
    dismiss,
    markActedOn,
    rateInsight,

    // Utilities
    ...utils,

    // Filtering and sorting
    ...filtering,

    // Helpers
    getInsightById: useCallback(
      (id: string) => {
        return insights.find(i => i._id === id)
      },
      [insights]
    ),

    getInsightsForRelationship: useCallback(
      (relId: string) => {
        return insights.filter(i => i.relationshipId === relId)
      },
      [insights]
    ),

    getUnviewedInsights: useCallback(() => {
      return insights.filter(i => !i.userInteraction?.viewedAt)
    }, [insights]),

    getActionableInsights: useCallback(() => {
      return insights.filter(
        i => i.priority === 'urgent' || i.priority === 'high'
      )
    }, [insights]),

    // Computed properties
    totalInsights: insights.length,
    unviewedCount: insights.filter(i => !i.userInteraction?.viewedAt).length,
    urgentCount: insights.filter(i => i.priority === 'urgent').length,
    highPriorityCount: insights.filter(i => i.priority === 'high').length,

    // Dashboard metrics
    insightMetrics: {
      total: insights.length,
      unviewed: insights.filter(i => !i.userInteraction?.viewedAt).length,
      urgent: insights.filter(i => i.priority === 'urgent').length,
      warnings: insights.filter(i => i.type === 'warning_signal').length,
      celebrations: insights.filter(i => i.type === 'celebration_prompt')
        .length,
      conversations: insights.filter(i => i.type === 'conversation_starter')
        .length,
    },

    // Status helpers
    hasUrgentInsights: insights.some(i => i.priority === 'urgent'),
    hasWarnings: insights.some(i => i.type === 'warning_signal'),
    hasCelebrations: insights.some(i => i.type === 'celebration_prompt'),
    hasUnviewedInsights: insights.some(i => !i.userInteraction?.viewedAt),
  }
}
