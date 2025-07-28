// User types
export interface User {
  _id: string
  clerkId: string
  name: string
  email: string
  createdAt: number
  preferences?: {
    theme?: 'light' | 'dark'
    notifications?: boolean
    language?: string
    dataSharing?: boolean
    analyticsOptIn?: boolean
    marketingOptIn?: boolean
    searchIndexing?: boolean
    dataRetention?: '1year' | '3years' | 'indefinite'
  }
}

// Relationship types
export interface Relationship {
  _id: string
  _creationTime: number
  userId: string
  name: string
  type: RelationshipType
  photo?: string
  createdAt: number
  updatedAt: number
}

export type RelationshipType =
  | 'partner'
  | 'family'
  | 'friend'
  | 'colleague'
  | 'other'

export type MoodType =
  | 'happy'
  | 'excited'
  | 'content'
  | 'neutral'
  | 'sad'
  | 'angry'
  | 'frustrated'
  | 'anxious'
  | 'confused'
  | 'grateful'

// Journal Entry types
export interface JournalEntry {
  _id: string
  _creationTime: number
  userId: string
  relationshipId?: string
  content: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
  allowAIAnalysis?: boolean
  wordCount?: number
  status?: 'draft' | 'published'
  entryType?: 'text' | 'voice' | 'mixed'
  createdAt: number
  updatedAt: number
}

// AI Analysis types
export type AnalysisType =
  | 'sentiment'
  | 'emotional_stability'
  | 'energy_impact'
  | 'conflict_resolution'
  | 'gratitude'

export interface AIAnalysisResults {
  sentimentScore?: number // 1-10 scale
  emotions?: string[]
  confidence: number // 0-1 scale
  rawResponse: string
  // Type-specific results
  stabilityScore?: number // 0-100 for emotional stability
  energyScore?: number // 1-10 for energy impact
  resolutionScore?: number // 1-10 for conflict resolution
  gratitudeScore?: number // 1-10 for gratitude
  additionalData?: unknown // Flexible field for analysis-specific data
}

export interface AIAnalysisMetadata {
  modelVersion: string
  processingTime: number
  tokenCount?: number
  apiCosts?: number
}

export interface AIAnalysis {
  _id: string
  journalEntryId: string
  relationshipId: string
  userId: string
  analysisType: AnalysisType
  analysisResults: AIAnalysisResults
  metadata: AIAnalysisMetadata
  createdAt: number
  updatedAt: number
}

// Health Score types (updated for AI-based scoring)
export interface HealthScoreComponents {
  sentiment: number // 0-100
  emotionalStability: number // 0-100
  energyImpact: number // 0-100
  conflictResolution: number // 0-100
  gratitude: number // 0-100
  communicationFrequency: number // 0-100
}

export interface HealthScoreTrends {
  improving: boolean
  trendDirection: 'up' | 'down' | 'stable'
  changeRate: number // Percentage change over time
}

export interface HealthScore {
  _id: string
  relationshipId: string
  userId: string
  overallScore: number // 0-100 scale
  componentScores: HealthScoreComponents
  lastUpdated: number
  dataPoints: number // Number of entries used in calculation
  confidenceLevel: number // 0-1 overall confidence in the score
  trendsData?: HealthScoreTrends
}

// Form types for creating/updating
export interface CreateUserData {
  clerkId: string
  name: string
  email: string
}

export interface CreateRelationshipData {
  name: string
  type: RelationshipType
  photo?: string
}

export interface UpdateRelationshipData {
  name?: string
  type?: RelationshipType
  photo?: string
}

export interface CreateJournalEntryData {
  relationshipId: string
  content: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

export interface UpdateJournalEntryData {
  content?: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

export interface CreateAIAnalysisData {
  journalEntryId: string
  relationshipId: string
  analysisType: AnalysisType
  analysisResults: AIAnalysisResults
  metadata: AIAnalysisMetadata
}

export interface UpdateHealthScoreData {
  overallScore: number
  componentScores: HealthScoreComponents
  confidenceLevel: number
  dataPoints: number
  trendsData?: HealthScoreTrends
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Convex utility types
export type ConvexId<T extends string> = `${T}_${string}`

// Enhanced search parameters
export interface SearchOptions {
  query?: string
  limit?: number
  offset?: number
}

export interface RelationshipSearchOptions extends SearchOptions {
  type?: RelationshipType
}

export interface JournalEntrySearchOptions extends SearchOptions {
  relationshipId?: string
  startDate?: number
  endDate?: number
  isPrivate?: boolean
  tags?: string[]
}

// Dashboard-specific types
export interface DashboardSummary {
  totalRelationships: number
  trackedRelationships: number
  averageHealthScore: number
  totalAnalyses: number
  lastUpdated: number
}

export interface RelationshipWithScore extends Relationship {
  healthScore: HealthScore | null
}

export interface DashboardData {
  relationships: RelationshipWithScore[]
  recentEntries: JournalEntry[]
  summary: DashboardSummary
}

export interface FilteredJournalEntry extends JournalEntry {
  relationshipName: string
}

export interface TrendDataPoint {
  timestamp: number
  date: string
  [relationshipName: string]: number | string
}

export interface DashboardTrends {
  trends: TrendDataPoint[]
  relationshipNames: string[]
  timeRange: {
    start: number
    end: number
    granularity: 'day' | 'week' | 'month'
  }
}

export interface ActivityItem extends JournalEntry {
  relationship: Relationship | null
  analysisStatus: {
    total: number
    hasAnalysis: boolean
    sentimentScore: number | null
    emotions: string[]
    confidence: number | null
  }
  preview: string
}

export interface RecentActivity {
  activities: ActivityItem[]
  totalCount: number
  analysisRate: number
}

export interface DashboardStats {
  totals: {
    relationships: number
    journalEntries: number
    trackedRelationships: number
  }
  activity: {
    entriesThisWeek: number
    entriesThisMonth: number
    averageEntriesPerWeek: number
  }
  health: {
    averageScore: number
    improvingRelationships: number
    decliningRelationships: number
    stableRelationships: number
  }
  lastUpdated: number
}

// User onboarding types
export interface CompleteOnboardingArgs {
  userId: string
  preferences?: {
    reminderFrequency: string
    preferredTime: string
    timezone: string
  }
}

// User feature flags
export interface UserFeatureFlags {
  conversationStarters: boolean
  relationshipGoals: boolean
  advancedAnalytics: boolean
  voiceJournaling: boolean
  smartReminders: boolean
  betaFeatures: boolean
}

// Convex user type (matches database schema)
export interface ConvexUser {
  _id: string
  clerkId: string
  name: string
  email: string
  createdAt: number
}

// Additional argument types for Convex functions
export interface CreateUserArgs {
  clerkId: string
  name: string
  email: string
}

export interface UpdateUserPreferencesArgs {
  userId: string
  preferences: Partial<{
    theme: 'light' | 'dark'
    notifications: boolean
    language: string
    dataSharing: boolean
    analyticsOptIn: boolean
    marketingOptIn: boolean
    searchIndexing: boolean
    dataRetention: '1year' | '3years' | 'indefinite'
  }>
}

// Relationship arguments
export interface CreateRelationshipArgs {
  userId: string
  name: string
  type: RelationshipType
  photo?: string
}

export interface UpdateRelationshipArgs {
  relationshipId: string
  userId: string
  name?: string
  type?: RelationshipType
  photo?: string
}

export interface GetRelationshipsByUserArgs {
  userId: string
  type?: RelationshipType
  limit?: number
  offset?: number
}

// Journal entry arguments
export interface CreateJournalEntryArgs {
  userId: string
  relationshipId: string
  content: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

export interface UpdateJournalEntryArgs {
  entryId: string
  userId: string
  content?: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

// Search filters
export interface SearchFilters {
  relationshipId?: string
  mood?: string
  tags?: string[]
  startDate?: number
  endDate?: number
  isPrivate?: boolean
}

// Insight types
export interface Insight {
  _id: string
  userId: string
  relationshipId?: string
  type:
    | 'pattern_recognition'
    | 'improvement_suggestion'
    | 'conversation_starter'
    | 'warning_signal'
    | 'celebration_prompt'
    | 'trend_alert'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  description: string
  actionableSteps: string[]
  supportingData: {
    confidence: number
    dataPoints: number
    timeframe: string
    triggerEvents: string[]
  }
  status: 'active' | 'dismissed' | 'acted_on' | 'expired'
  userInteraction?: {
    viewedAt?: number
    dismissedAt?: number
    actedOnAt?: number
    rating?: number
    feedback?: string
  }
  createdAt: number
  expiresAt: number
}

export interface GetActiveInsightsArgs {
  userId: string
  relationshipId?: string
  type?: Insight['type']
}

export interface RateInsightArgs {
  insightId: string
  rating: number
  feedback?: string
}

export interface MarkInsightActedOnArgs {
  insightId: string
  feedback?: string
}
