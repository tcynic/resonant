/**
 * TypeScript type definitions for all Convex functions
 * This file provides complete type safety for frontend-backend communication
 */

import { Id, TableNames } from '../../../convex/_generated/dataModel'

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface User {
  _id: Id<'users'>
  clerkId: string
  name: string
  email: string
  tier: 'free' | 'premium'
  createdAt: number
  lastActiveAt: number
  onboardingCompleted: boolean
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: boolean
  aiAnalysisEnabled: boolean
  reminderSettings: ReminderSettings
  dataRetention: '1year' | '3years' | 'indefinite'
  language?: string
  dataSharing?: boolean
  analyticsOptIn?: boolean
  marketingOptIn?: boolean
  searchIndexing?: boolean
}

export interface ReminderSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  preferredTime: string // "HH:MM" format
  timezone: string
  doNotDisturbStart: string
  doNotDisturbEnd: string
  reminderTypes: {
    gentleNudge: boolean
    relationshipFocus: boolean
    healthScoreAlerts: boolean
  }
}

export interface Relationship {
  _id: Id<'relationships'>
  userId: Id<'users'>
  name: string
  type: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
  photo?: string
  initials: string
  isActive: boolean
  metadata: {
    importance: 'low' | 'medium' | 'high'
    tags: string[]
  }
  createdAt: number
  updatedAt: number
}

export interface JournalEntry {
  _id: Id<'journalEntries'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  content: string
  mood?: string
  tags: string[]
  allowAIAnalysis: boolean
  createdAt: number
  updatedAt: number
}

// ============================================================================
// AI ANALYSIS TYPES
// ============================================================================

export interface AIAnalysis {
  _id: Id<'aiAnalysis'>
  entryId: Id<'journalEntries'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  sentimentScore: number // -1 to 1
  emotionalKeywords: string[]
  confidenceLevel: number // 0 to 1
  reasoning: string
  patterns: AnalysisPatterns
  analysisVersion: string
  processingTime: number
  tokensUsed?: number
  apiCost?: number
  status: 'processing' | 'completed' | 'failed'
  createdAt: number
}

export interface AnalysisPatterns {
  recurring_themes: string[]
  emotional_triggers: string[]
  communication_style: 'collaborative' | 'direct' | 'neutral'
  relationship_dynamics: string[]
}

// ============================================================================
// HEALTH SCORE TYPES
// ============================================================================

export interface HealthScore {
  _id: Id<'healthScores'>
  userId: Id<'users'>
  relationshipId: Id<'relationships'>
  score: number // 0-100
  contributingFactors: string[]
  trendDirection: 'improving' | 'stable' | 'declining'
  confidence: number // 0-1
  recommendations: string[]
  factorBreakdown: FactorBreakdown
  entriesAnalyzed: number
  timeframeStart: number
  timeframeEnd: number
  lastCalculated: number
  version: string
}

export interface FactorBreakdown {
  communication: number // 0-100
  emotional_support: number // 0-100
  conflict_resolution: number // 0-100
  trust_intimacy: number // 0-100
  shared_growth: number // 0-100
}

export interface HealthScoreSummary {
  totalRelationships: number
  averageScore: number
  healthyRelationships: number
  needsAttention: number
  improving: number
  declining: number
  stable: number
  scoreDistribution: {
    excellent: number // 85+
    good: number // 70-84
    fair: number // 50-69
    poor: number // <50
  }
  topPerformingRelationship: {
    relationshipId: Id<'relationships'>
    score: number
    trendDirection: string
  } | null
  relationshipNeedingAttention: {
    relationshipId: Id<'relationships'>
    score: number
    trendDirection: string
  } | null
}

export interface HealthScoreHistory {
  dataPoints: HealthScoreDataPoint[]
  trend: 'improving' | 'stable' | 'declining'
  confidence: number
  currentScore: number
}

export interface HealthScoreDataPoint {
  timestamp: number
  score: number
  confidence: number
}

// ============================================================================
// INSIGHTS TYPES
// ============================================================================

export interface Insight {
  _id: Id<'insights'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  type:
    | 'pattern_recognition'
    | 'improvement_suggestion'
    | 'conversation_starter'
    | 'warning_signal'
    | 'celebration_prompt'
    | 'trend_alert'
  title: string
  description: string
  actionableSteps: string[]
  supportingData: InsightSupportingData
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'active' | 'dismissed' | 'acted_on' | 'expired'
  userInteraction?: UserInteraction
  createdAt: number
  expiresAt: number
}

export interface InsightSupportingData {
  confidence: number
  dataPoints: number
  timeframe: string
  triggerEvents: string[]
}

export interface UserInteraction {
  viewedAt?: number
  dismissedAt?: number
  actedOnAt?: number
  rating?: number // 1-5
  feedback?: string
}

export interface InsightsSummary {
  total: number
  active: number
  byType: {
    pattern_recognition: number
    improvement_suggestion: number
    conversation_starter: number
    warning_signal: number
    celebration_prompt: number
    trend_alert: number
  }
  byPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
}

// ============================================================================
// FUNCTION ARGUMENT TYPES
// ============================================================================

// User Functions
export interface CreateUserArgs {
  clerkId: string
  name: string
  email: string
}

export interface UpdateUserPreferencesArgs {
  userId: Id<'users'>
  preferences: Partial<UserPreferences>
}

export interface CompleteOnboardingArgs {
  userId: Id<'users'>
  preferences?: {
    reminderFrequency: string
    preferredTime: string
    timezone: string
  }
}

// Relationship Functions
export interface CreateRelationshipArgs {
  userId: Id<'users'>
  name: string
  type: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
  photo?: string
}

export interface UpdateRelationshipArgs {
  relationshipId: Id<'relationships'>
  userId: Id<'users'>
  name?: string
  type?: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
  photo?: string
}

export interface GetRelationshipsByUserArgs {
  userId: Id<'users'>
  type?: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
  limit?: number
  offset?: number
}

// Journal Entry Functions
export interface CreateJournalEntryArgs {
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  content: string
  mood?: string
  tags?: string[]
  allowAIAnalysis?: boolean
}

export interface UpdateJournalEntryArgs {
  entryId: Id<'journalEntries'>
  userId: Id<'users'>
  content?: string
  mood?: string
  tags?: string[]
  allowAIAnalysis?: boolean
}

// AI Analysis Functions
export interface QueueAnalysisArgs {
  entryId: Id<'journalEntries'>
  priority?: 'high' | 'normal' | 'low'
}

export interface GetAnalysesByUserArgs {
  userId: Id<'users'>
  limit?: number
}

export interface GetAnalysesByRelationshipArgs {
  relationshipId: Id<'relationships'>
  limit?: number
}

// Health Score Functions
export interface ForceRecalculateArgs {
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
}

export interface GetHealthScoreHistoryArgs {
  relationshipId: Id<'relationships'>
  days?: number
}

// Insights Functions
export interface GetActiveInsightsArgs {
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  type?: Insight['type']
}

export interface RateInsightArgs {
  insightId: Id<'insights'>
  rating: number // 1-5
  feedback?: string
}

export interface MarkInsightActedOnArgs {
  insightId: Id<'insights'>
  feedback?: string
}

// ============================================================================
// FUNCTION RETURN TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface QueueAnalysisResponse {
  status: 'queued' | 'skipped'
  analysisId?: Id<'aiAnalysis'>
  reason?: string
}

export interface RecalculateHealthScoreResponse {
  success: boolean
  healthScoreId?: Id<'healthScores'>
  score?: number
  trendDirection?: string
  previousScore?: number | null
  reason?: string
  analysesFound?: number
}

export interface AnalysisStats {
  total: number
  completed: number
  processing: number
  failed: number
  averageConfidence: number
  averageSentiment: number
  totalTokensUsed: number
  totalApiCost: number
}

// ============================================================================
// ENHANCED RELATIONSHIP TYPES WITH HEALTH SCORES
// ============================================================================

export interface RelationshipWithHealthScore extends Relationship {
  healthScore?: HealthScore & {
    isStale: boolean
    daysOld: number
  }
  relationship?: {
    name: string
    type: string
    initials: string
  }
}

// ============================================================================
// FEATURE FLAG TYPES
// ============================================================================

export interface UserFeatureFlags {
  _id: Id<'userFeatureFlags'>
  userId: Id<'users'>
  flags: {
    advancedAnalytics: boolean
    voiceJournaling: boolean
    smartReminders: boolean
    conversationStarters: boolean
    relationshipGoals: boolean
    betaFeatures: boolean
  }
  lastUpdated: number
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ConvexError {
  message: string
  code?: string
  details?: Record<string, unknown>
}

// ============================================================================
// CHART AND DASHBOARD TYPES
// ============================================================================

export interface ChartDataPoint {
  timestamp: number
  value: number
  label?: string
  metadata?: Record<string, unknown>
}

export interface TrendData {
  dataPoints: ChartDataPoint[]
  trend: 'up' | 'down' | 'stable'
  change: number // percentage change
  period: string
}

export interface DashboardSummary {
  user: User
  relationshipsCount: number
  recentEntries: number
  averageHealthScore: number
  pendingInsights: number
  analysisStats: AnalysisStats
  healthScoreSummary: HealthScoreSummary
  insightsSummary: InsightsSummary
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

export interface SearchFilters {
  dateRange?: {
    start: number
    end: number
  }
  relationships?: Id<'relationships'>[]
  moods?: string[]
  tags?: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  hasAnalysis?: boolean
}

export interface SearchResults {
  entries: JournalEntry[]
  total: number
  page: number
  hasMore: boolean
}

// ============================================================================
// EXPORT UTILITY TYPES
// ============================================================================

export type ConvexId<T extends TableNames> = Id<T>
export type Timestamp = number
export type SentimentScore = number // -1 to 1
export type ConfidenceLevel = number // 0 to 1
export type HealthScoreValue = number // 0 to 100
