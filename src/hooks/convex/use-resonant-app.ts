/**
 * Combined application hook that provides all Resonant functionality
 * This is the main hook for components that need comprehensive app state
 */

import { useUser } from './use-users'
import { useRelationships } from './use-relationships'
import { useJournal } from './use-journal-entries'
import { useAIAnalysis } from './use-ai-analysis'
import { useHealthScores } from './use-health-scores'
import { useInsights } from './use-insights'

/**
 * Main application hook that combines all Convex functionality
 * Use this hook in dashboard components or when you need comprehensive app state
 */
export const useResonantApp = () => {
  // Get current user data
  const userHook = useUser()
  const { user, isLoading: userLoading, isAuthenticated } = userHook

  // Get user's relationships
  const relationshipsHook = useRelationships(user?._id)

  // Get user's journal entries
  const journalHook = useJournal(user?._id)

  // Get AI analysis data
  const aiAnalysisHook = useAIAnalysis(user?._id)

  // Get health scores
  const healthScoresHook = useHealthScores(user?._id)

  // Get insights
  const insightsHook = useInsights(user?._id)

  // Combined loading state
  const isLoading =
    userLoading ||
    relationshipsHook.isLoading ||
    journalHook.isLoading ||
    aiAnalysisHook.isLoading ||
    healthScoresHook.isLoading ||
    insightsHook.isLoading

  // App-wide computed properties
  const appMetrics = {
    // User metrics
    isPremium: user?.tier === 'premium',
    isOnboardingComplete: user?.onboardingCompleted || false,

    // Content metrics
    totalRelationships: relationshipsHook.count,
    totalJournalEntries: journalHook.totalEntries,
    totalAnalyses: aiAnalysisHook.totalAnalyses,
    averageHealthScore: healthScoresHook.averageScore,
    totalInsights: insightsHook.totalInsights,

    // Activity metrics
    hasRecentActivity: journalHook.hasRecentEntry,
    pendingAnalyses: aiAnalysisHook.pendingAnalyses,
    urgentInsights: insightsHook.urgentCount,
    relationshipsNeedingAttention:
      healthScoresHook.getScoresNeedingAttention().length,

    // Engagement metrics
    journalStreak: journalHook.stats?.currentStreak || 0,
    analysisSuccessRate:
      ((aiAnalysisHook.stats?.completed || 0) /
        Math.max(1, aiAnalysisHook.stats?.total || 1)) *
      100,
    averageConfidence: aiAnalysisHook.averageConfidence,

    // Feature usage
    aiAnalysisEnabled: user?.preferences?.aiAnalysisEnabled !== false,
    relationshipLimit: user?.tier === 'premium' ? Infinity : 3,
    isAtRelationshipLimit: relationshipsHook.isAtFreeLimit,
  }

  // App-wide status flags
  const appStatus = {
    isHealthy: appMetrics.averageHealthScore >= 70,
    needsAttention:
      appMetrics.relationshipsNeedingAttention > 0 ||
      appMetrics.urgentInsights > 0,
    hasRecentEngagement: appMetrics.hasRecentActivity,
    isActiveUser: appMetrics.totalJournalEntries > 5,
    canUpgrade: user?.tier === 'free',
  }

  // Quick actions (commonly used functions)
  const quickActions = {
    // User actions
    completeOnboarding: userHook.completeOnboarding,
    upgradeToPremium: userHook.upgradeToPremium,
    updatePreferences: userHook.updatePreferences,

    // Content creation
    createRelationship: relationshipsHook.createRelationship,
    createJournalEntry: journalHook.createEntry,
    queueAnalysis: aiAnalysisHook.queueAnalysis,

    // Health scores
    recalculateHealthScores: healthScoresHook.forceRecalculate,

    // Insights
    markInsightViewed: insightsHook.markViewed,
    dismissInsight: insightsHook.dismiss,
    markInsightActedOn: insightsHook.markActedOn,
  }

  // Dashboard data (ready-to-use for dashboard components)
  const dashboardData = {
    // User overview
    user: {
      name: user?.name || 'User',
      tier: user?.tier || 'free',
      memberSince: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString()
        : null,
      lastActive: user?.lastActiveAt
        ? new Date(user.lastActiveAt).toLocaleDateString()
        : null,
    },

    // Relationships overview
    relationships: {
      total: relationshipsHook.count,
      byType: relationshipsHook.typeCounts,
      healthyCount: healthScoresHook.summary?.healthyRelationships || 0,
      needsAttentionCount: healthScoresHook.summary?.needsAttention || 0,
      topPerforming: healthScoresHook.summary?.topPerformingRelationship,
      needingAttention: healthScoresHook.summary?.relationshipNeedingAttention,
    },

    // Journal overview
    journal: {
      totalEntries: journalHook.totalEntries,
      recentEntries: journalHook.recentEntries,
      stats: journalHook.stats,
      allTags: journalHook.allTags,
      allMoods: journalHook.allMoods,
    },

    // AI analysis overview
    analysis: {
      stats: aiAnalysisHook.stats,
      recentSentiment: aiAnalysisHook.recentSentiment,
      pendingCount: aiAnalysisHook.pendingAnalyses,
      enabled: appMetrics.aiAnalysisEnabled,
    },

    // Health scores overview
    healthScores: {
      summary: healthScoresHook.summary,
      metrics: healthScoresHook.healthScoreMetrics,
      overallStatus: healthScoresHook.overallHealthStatus,
    },

    // Insights overview
    insights: {
      summary: insightsHook.summary,
      metrics: insightsHook.insightMetrics,
      unviewedCount: insightsHook.unviewedCount,
      actionableInsights: insightsHook.getActionableInsights(),
    },
  }

  return {
    // Authentication state
    isAuthenticated,
    isLoading,

    // Individual hook access (for specific functionality)
    user: userHook,
    relationships: relationshipsHook,
    journal: journalHook,
    aiAnalysis: aiAnalysisHook,
    healthScores: healthScoresHook,
    insights: insightsHook,

    // App-wide state
    appMetrics,
    appStatus,
    dashboardData,
    quickActions,

    // Convenience getters
    getCurrentUser: () => user,
    getRelationshipOptions: () => relationshipsHook.relationshipOptions,
    getHealthScoreForRelationship: (relationshipId: string) =>
      healthScoresHook.getScoreForRelationship(relationshipId),
    getInsightsForRelationship: (relationshipId: string) =>
      insightsHook.getInsightsForRelationship(relationshipId),

    // Feature flags (for conditional rendering)
    features: {
      aiAnalysisEnabled: appMetrics.aiAnalysisEnabled,
      isPremium: appMetrics.isPremium,
      canCreateMoreRelationships: !appMetrics.isAtRelationshipLimit,
      hasOnboarded: appMetrics.isOnboardingComplete,
      hasContent: appMetrics.totalJournalEntries > 0,
      hasRelationships: appMetrics.totalRelationships > 0,
      hasInsights: appMetrics.totalInsights > 0,
    },
  }
}
