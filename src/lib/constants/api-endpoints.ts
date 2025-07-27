/**
 * API endpoint constants for type-safe Convex function calls
 * These match the function exports from your Convex files
 */

// ============================================================================
// USER ENDPOINTS
// ============================================================================

export const USER_ENDPOINTS = {
  // Mutations
  CREATE_USER: 'users:createUser',
  UPDATE_USER_PREFERENCES: 'users:updateUserPreferences',
  UPDATE_PRIVACY_SETTINGS: 'users:updatePrivacySettings',
  UPDATE_USER_FROM_CLERK: 'users:updateUserFromClerk',
  DELETE_USER_BY_CLERK_ID: 'users:deleteUserByClerkId',
  COMPLETE_ONBOARDING: 'users:completeOnboarding',
  UPGRADE_TO_PREMIUM: 'users:upgradeToPremium',

  // Queries
  GET_CURRENT_USER: 'users:getCurrentUser',
  GET_USER_BY_CLERK_ID: 'users:getUserByClerkId',
  GET_USER_BY_ID: 'users:getUserById',
  GET_USER_FEATURE_FLAGS: 'users:getUserFeatureFlags',
} as const

// ============================================================================
// RELATIONSHIP ENDPOINTS
// ============================================================================

export const RELATIONSHIP_ENDPOINTS = {
  // Mutations
  CREATE_RELATIONSHIP: 'relationships:createRelationship',
  UPDATE_RELATIONSHIP: 'relationships:updateRelationship',
  DELETE_RELATIONSHIP: 'relationships:deleteRelationship',

  // Queries
  GET_RELATIONSHIPS_BY_USER: 'relationships:getRelationshipsByUser',
  GET_RELATIONSHIP_BY_ID: 'relationships:getRelationshipById',
  GET_RELATIONSHIPS_COUNT: 'relationships:getRelationshipsCount',
} as const

// ============================================================================
// JOURNAL ENTRY ENDPOINTS
// ============================================================================

export const JOURNAL_ENDPOINTS = {
  // Mutations (you'll need to create these functions)
  CREATE_ENTRY: 'journalEntries:create',
  UPDATE_ENTRY: 'journalEntries:update',
  DELETE_ENTRY: 'journalEntries:delete',

  // Queries (you'll need to create these functions)
  GET_ENTRIES_BY_USER: 'journalEntries:getByUser',
  GET_ENTRY_BY_ID: 'journalEntries:getById',
  GET_RECENT_ENTRIES: 'journalEntries:getRecent',
  SEARCH_ENTRIES: 'journalEntries:search',
} as const

// ============================================================================
// AI ANALYSIS ENDPOINTS
// ============================================================================

export const AI_ANALYSIS_ENDPOINTS = {
  // Mutations
  QUEUE_ANALYSIS: 'aiAnalysis:queueAnalysis',

  // Internal mutations (called by scheduler)
  PROCESS_ENTRY: 'aiAnalysis:processEntry',

  // Queries
  GET_BY_ENTRY: 'aiAnalysis:getByEntry',
  GET_RECENT_BY_USER: 'aiAnalysis:getRecentByUser',
  GET_BY_RELATIONSHIP: 'aiAnalysis:getByRelationship',
  GET_STATS: 'aiAnalysis:getStats',
} as const

// ============================================================================
// HEALTH SCORE ENDPOINTS
// ============================================================================

export const HEALTH_SCORE_ENDPOINTS = {
  // Mutations
  FORCE_RECALCULATE: 'healthScores:forceRecalculate',

  // Internal mutations (called by scheduler)
  RECALCULATE: 'healthScores:recalculate',
  BULK_RECALCULATE: 'healthScores:bulkRecalculate',

  // Queries
  GET_BY_RELATIONSHIP: 'healthScores:getByRelationship',
  GET_BY_USER: 'healthScores:getByUser',
  GET_SUMMARY: 'healthScores:getSummary',
  GET_HISTORY: 'healthScores:getHistory',
} as const

// ============================================================================
// INSIGHTS ENDPOINTS
// ============================================================================

export const INSIGHTS_ENDPOINTS = {
  // Mutations
  MARK_VIEWED: 'insights:markViewed',
  DISMISS: 'insights:dismiss',
  MARK_ACTED_ON: 'insights:markActedOn',
  RATE_INSIGHT: 'insights:rateInsight',

  // Internal mutations (called by scheduler)
  GENERATE_INSIGHTS: 'insights:generateInsights',
  CLEANUP_EXPIRED: 'insights:cleanupExpired',

  // Queries
  GET_ACTIVE: 'insights:getActive',
  GET_SUMMARY: 'insights:getSummary',
} as const

// ============================================================================
// COMBINED ENDPOINTS OBJECT
// ============================================================================

export const API_ENDPOINTS = {
  USERS: USER_ENDPOINTS,
  RELATIONSHIPS: RELATIONSHIP_ENDPOINTS,
  JOURNAL: JOURNAL_ENDPOINTS,
  AI_ANALYSIS: AI_ANALYSIS_ENDPOINTS,
  HEALTH_SCORES: HEALTH_SCORE_ENDPOINTS,
  INSIGHTS: INSIGHTS_ENDPOINTS,
} as const

// ============================================================================
// TYPE-SAFE ENDPOINT GETTERS
// ============================================================================

export type UserEndpoint = (typeof USER_ENDPOINTS)[keyof typeof USER_ENDPOINTS]
export type RelationshipEndpoint =
  (typeof RELATIONSHIP_ENDPOINTS)[keyof typeof RELATIONSHIP_ENDPOINTS]
export type JournalEndpoint =
  (typeof JOURNAL_ENDPOINTS)[keyof typeof JOURNAL_ENDPOINTS]
export type AIAnalysisEndpoint =
  (typeof AI_ANALYSIS_ENDPOINTS)[keyof typeof AI_ANALYSIS_ENDPOINTS]
export type HealthScoreEndpoint =
  (typeof HEALTH_SCORE_ENDPOINTS)[keyof typeof HEALTH_SCORE_ENDPOINTS]
export type InsightsEndpoint =
  (typeof INSIGHTS_ENDPOINTS)[keyof typeof INSIGHTS_ENDPOINTS]

export type AnyEndpoint =
  | UserEndpoint
  | RelationshipEndpoint
  | JournalEndpoint
  | AIAnalysisEndpoint
  | HealthScoreEndpoint
  | InsightsEndpoint

// ============================================================================
// ENDPOINT VALIDATION HELPERS
// ============================================================================

export const isUserEndpoint = (endpoint: string): endpoint is UserEndpoint => {
  return Object.values(USER_ENDPOINTS).includes(endpoint as UserEndpoint)
}

export const isRelationshipEndpoint = (
  endpoint: string
): endpoint is RelationshipEndpoint => {
  return Object.values(RELATIONSHIP_ENDPOINTS).includes(
    endpoint as RelationshipEndpoint
  )
}

export const isJournalEndpoint = (
  endpoint: string
): endpoint is JournalEndpoint => {
  return Object.values(JOURNAL_ENDPOINTS).includes(endpoint as JournalEndpoint)
}

export const isAIAnalysisEndpoint = (
  endpoint: string
): endpoint is AIAnalysisEndpoint => {
  return Object.values(AI_ANALYSIS_ENDPOINTS).includes(
    endpoint as AIAnalysisEndpoint
  )
}

export const isHealthScoreEndpoint = (
  endpoint: string
): endpoint is HealthScoreEndpoint => {
  return Object.values(HEALTH_SCORE_ENDPOINTS).includes(
    endpoint as HealthScoreEndpoint
  )
}

export const isInsightsEndpoint = (
  endpoint: string
): endpoint is InsightsEndpoint => {
  return Object.values(INSIGHTS_ENDPOINTS).includes(
    endpoint as InsightsEndpoint
  )
}

// ============================================================================
// ERROR HANDLING CONSTANTS
// ============================================================================

export const ERROR_CODES = {
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_CREATE_FAILED: 'USER_CREATE_FAILED',
  USER_UPDATE_FAILED: 'USER_UPDATE_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Relationship errors
  RELATIONSHIP_NOT_FOUND: 'RELATIONSHIP_NOT_FOUND',
  RELATIONSHIP_CREATE_FAILED: 'RELATIONSHIP_CREATE_FAILED',
  RELATIONSHIP_UPDATE_FAILED: 'RELATIONSHIP_UPDATE_FAILED',
  RELATIONSHIP_DELETE_FAILED: 'RELATIONSHIP_DELETE_FAILED',
  TIER_LIMIT_EXCEEDED: 'TIER_LIMIT_EXCEEDED',

  // Journal errors
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
  ENTRY_CREATE_FAILED: 'ENTRY_CREATE_FAILED',
  ENTRY_UPDATE_FAILED: 'ENTRY_UPDATE_FAILED',
  ENTRY_DELETE_FAILED: 'ENTRY_DELETE_FAILED',

  // Analysis errors
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  ANALYSIS_DISABLED: 'ANALYSIS_DISABLED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',

  // Health score errors
  HEALTH_SCORE_CALCULATION_FAILED: 'HEALTH_SCORE_CALCULATION_FAILED',

  // Insights errors
  INSIGHT_NOT_FOUND: 'INSIGHT_NOT_FOUND',
  INSIGHT_UPDATE_FAILED: 'INSIGHT_UPDATE_FAILED',

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
