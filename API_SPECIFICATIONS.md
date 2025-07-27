# Resonant API Specifications

## Overview

The Resonant relationship health journal application provides a comprehensive API built on **Convex** as the primary backend with **Next.js 15** API routes for authentication webhooks and server actions. The system is designed for real-time data synchronization, AI-powered relationship insights, and type-safe operations.

### Architecture Stack

- **Backend**: Convex (real-time database + serverless functions)
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Authentication**: Clerk with Next.js integration
- **AI**: Google Gemini Flash for sentiment analysis and insights
- **Validation**: Zod schemas for type-safe operations
- **Real-time**: Convex subscriptions for live updates

---

## Authentication & Authorization

### Clerk Integration

**Authentication Flow**:

1. Users authenticate via Clerk (supports email, OAuth providers)
2. Clerk webhooks sync user data to Convex
3. All API calls use Clerk session tokens
4. Convex validates authentication through Clerk integration

**Webhook Endpoint**: `/api/webhooks/clerk`

```typescript
// POST /api/webhooks/clerk
interface ClerkWebhookPayload {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    first_name?: string
    last_name?: string
    email_addresses?: Array<{
      email_address: string
    }>
  }
}

// Response
interface WebhookResponse {
  status: 200 | 400 | 500
  message: string
}
```

**Headers Required**:

- `svix-id`: Webhook ID
- `svix-timestamp`: Timestamp
- `svix-signature`: HMAC signature

---

## Convex API Functions

### User Management

#### Query: `users.getCurrentUser`

Get current user by Clerk ID

```typescript
// Input
interface GetCurrentUserArgs {
  clerkId: string
}

// Output
interface User {
  _id: Id<'users'>
  clerkId: string
  name: string
  email: string
  tier: 'free' | 'premium'
  createdAt: number
  lastActiveAt?: number
  onboardingCompleted?: boolean
  preferences?: UserPreferences
}

interface UserPreferences {
  theme?: 'light' | 'dark'
  notifications?: boolean
  reminderSettings?: ReminderSettings
  language?: string
  dataSharing?: boolean
  analyticsOptIn?: boolean
  marketingOptIn?: boolean
  searchIndexing?: boolean
  aiAnalysisEnabled?: boolean
  dataRetention?: '1year' | '3years' | 'indefinite'
}
```

#### Mutation: `users.createUser`

Create new user (typically called via webhook)

```typescript
// Input
interface CreateUserArgs {
  clerkId: string
  name: string
  email: string
}

// Output
type UserId = Id<'users'>

// Validation Rules
const CreateUserSchema = z.object({
  clerkId: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
})
```

#### Mutation: `users.updateUserPreferences`

Update user preferences

```typescript
// Input
interface UpdateUserPreferencesArgs {
  userId: Id<'users'>
  preferences: Partial<UserPreferences>
}

// Output
boolean // Success status
```

#### Mutation: `users.completeOnboarding`

Mark onboarding as complete and set initial preferences

```typescript
// Input
interface CompleteOnboardingArgs {
  userId: Id<'users'>
  preferences?: {
    reminderFrequency: string
    preferredTime: string // "HH:MM" format
    timezone: string // IANA timezone
  }
}

// Output
interface OnboardingResponse {
  success: boolean
}
```

#### Mutation: `users.upgradeToPremium`

Upgrade user to premium tier

```typescript
// Input
interface UpgradeToPremiumArgs {
  userId: Id<'users'>
}

// Output
interface UpgradeResponse {
  success: boolean
}
```

### Relationship Management

#### Query: `relationships.getRelationshipsByUser`

Get user's relationships with optional filtering

```typescript
// Input
interface GetRelationshipsByUserArgs {
  userId: Id<'users'>
  type?: RelationshipType
  limit?: number
  offset?: number
}

type RelationshipType = 'partner' | 'family' | 'friend' | 'colleague' | 'other'

// Output
interface Relationship {
  _id: Id<'relationships'>
  userId: Id<'users'>
  name: string
  type: RelationshipType
  photo?: string
  initials?: string
  isActive?: boolean
  metadata?: {
    notes?: string
    anniversary?: number
    importance?: 'high' | 'medium' | 'low'
    tags?: string[]
  }
  createdAt: number
  updatedAt: number
}
;[]
```

#### Mutation: `relationships.createRelationship`

Create new relationship

```typescript
// Input
interface CreateRelationshipArgs {
  userId: Id<'users'>
  name: string
  type: RelationshipType
  photo?: string
}

// Output
type RelationshipId = Id<'relationships'>

// Validation
const CreateRelationshipSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['partner', 'family', 'friend', 'colleague', 'other']),
  photo: z.string().url().optional(),
})

// Business Rules
// - Free tier: Maximum 3 relationships
// - Premium tier: Unlimited relationships
```

#### Mutation: `relationships.updateRelationship`

Update existing relationship

```typescript
// Input
interface UpdateRelationshipArgs {
  relationshipId: Id<'relationships'>
  userId: Id<'users'>
  name?: string
  type?: RelationshipType
  photo?: string
}

// Output
boolean // Success status
```

#### Mutation: `relationships.deleteRelationship`

Delete relationship (soft delete if has entries)

```typescript
// Input
interface DeleteRelationshipArgs {
  relationshipId: Id<'relationships'>
  userId: Id<'users'>
}

// Output
boolean // Success status

// Business Rules
// - Cannot delete relationship with existing journal entries
// - Returns ConvexError if entries exist
```

### Journal Entry Management

#### Query: `journalEntries.getEntriesByUser`

Get user's journal entries with pagination

```typescript
// Input
interface GetEntriesByUserArgs {
  userId: Id<'users'>
  isPrivate?: boolean
  limit?: number // Default: 20, Max: 100
  offset?: number
}

// Output
interface JournalEntry {
  _id: Id<'journalEntries'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  content: string
  mood?: string
  isPrivate?: boolean
  allowAIAnalysis?: boolean
  tags?: string[]
  wordCount?: number
  status?: 'draft' | 'published'
  entryType?: 'text' | 'voice' | 'mixed'
  createdAt: number
  updatedAt: number
}
;[]
```

#### Query: `journalEntries.getEntriesByRelationship`

Get entries for specific relationship

```typescript
// Input
interface GetEntriesByRelationshipArgs {
  relationshipId: Id<'relationships'>
  userId: Id<'users'>
  limit?: number
  offset?: number
}

// Output
JournalEntry[]
```

#### Mutation: `journalEntries.createEntry`

Create new journal entry

```typescript
// Input
interface CreateEntryArgs {
  userId: Id<'users'>
  relationshipId: Id<'relationships'>
  content: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

// Output
type EntryId = Id<'journalEntries'>

// Validation Rules
const CreateJournalEntrySchema = z.object({
  content: z.string().min(1).max(10000),
  mood: z.string().max(50).optional(),
  isPrivate: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(10).optional(),
})
```

#### Mutation: `journalEntries.updateEntry`

Update existing journal entry

```typescript
// Input
interface UpdateEntryArgs {
  entryId: Id<'journalEntries'>
  userId: Id<'users'>
  content?: string
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

// Output
boolean // Success status
```

#### Query: `journalEntries.searchEntries`

Advanced search with filters

```typescript
// Input
interface SearchEntriesArgs {
  userId: Id<'users'>
  query?: string // Text search in content
  relationshipId?: Id<'relationships'>
  startDate?: number // Unix timestamp
  endDate?: number // Unix timestamp
  isPrivate?: boolean
  tags?: string[]
  limit?: number
}

// Output
JournalEntry[]
```

### AI Analysis System

#### Mutation: `aiAnalysis.queueAnalysis`

Queue journal entry for AI analysis

```typescript
// Input
interface QueueAnalysisArgs {
  entryId: Id<'journalEntries'>
  priority?: 'high' | 'normal' | 'low'
}

// Output
interface QueueAnalysisResponse {
  status: 'queued' | 'skipped'
  reason?: string
  analysisId?: Id<'aiAnalysis'>
}

// Business Rules
// - Respects user's AI analysis preferences
// - Respects per-entry AI analysis settings
// - Premium users get 'high' priority by default
// - Skips if already analyzed
```

#### Query: `aiAnalysis.getByEntry`

Get AI analysis for specific journal entry

```typescript
// Input
interface GetByEntryArgs {
  entryId: Id<'journalEntries'>
}

// Output
interface AIAnalysis {
  _id: Id<'aiAnalysis'>
  entryId: Id<'journalEntries'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  sentimentScore: number // -1 to 1 scale
  emotionalKeywords: string[]
  confidenceLevel: number // 0-1 scale
  reasoning: string
  patterns?: {
    recurring_themes: string[]
    emotional_triggers: string[]
    communication_style: string
    relationship_dynamics: string[]
  }
  analysisVersion: string
  processingTime: number // milliseconds
  tokensUsed?: number
  apiCost?: number
  status: 'processing' | 'completed' | 'failed'
  createdAt: number
} | null
```

#### Query: `aiAnalysis.getRecentByUser`

Get recent analyses for user

```typescript
// Input
interface GetRecentByUserArgs {
  userId: Id<'users'>
  limit?: number // Default: 20
}

// Output
AIAnalysis[]
```

#### Query: `aiAnalysis.getStats`

Get AI analysis statistics for dashboard

```typescript
// Input
interface GetStatsArgs {
  userId: Id<'users'>
}

// Output
interface AIAnalysisStats {
  total: number
  completed: number
  processing: number
  failed: number
  averageConfidence: number
  averageSentiment: number
  totalTokensUsed: number
  totalApiCost: number
}
```

### Health Scores

#### Query: `healthScores.getByRelationship`

Get health score for specific relationship

```typescript
// Input
interface GetHealthScoreArgs {
  relationshipId: Id<'relationships'>
  userId: Id<'users'>
}

// Output
interface HealthScore {
  _id: Id<'healthScores'>
  userId: Id<'users'>
  relationshipId: Id<'relationships'>
  score: number // 0-100 scale
  contributingFactors: string[]
  trendDirection: 'improving' | 'stable' | 'declining'
  confidence: number // 0-1 confidence in accuracy
  recommendations: string[]
  factorBreakdown: {
    communication: number // 0-100
    emotional_support: number // 0-100
    conflict_resolution: number // 0-100
    trust_intimacy: number // 0-100
    shared_growth: number // 0-100
  }
  entriesAnalyzed: number
  timeframeStart: number
  timeframeEnd: number
  lastCalculated: number
  version: string
}
```

### Dashboard Data

#### Query: `dashboard.getDashboardData`

Get comprehensive dashboard overview

```typescript
// Input
interface GetDashboardDataArgs {
  userId: Id<'users'>
}

// Output
interface DashboardData {
  relationships: Array<Relationship & { healthScore: HealthScore | null }>
  recentEntries: JournalEntry[]
  summary: {
    totalRelationships: number
    trackedRelationships: number
    averageHealthScore: number
    totalAnalyses: number
    lastUpdated: number
  }
}
```

#### Query: `dashboard.getDashboardTrends`

Get trend data for visualization

```typescript
// Input
interface GetDashboardTrendsArgs {
  userId: Id<'users'>
  relationshipIds?: Id<'relationships'>[]
  timeRangeDays?: number // Default: 30
  granularity?: 'day' | 'week' | 'month' // Default: 'week'
}

// Output
interface DashboardTrends {
  trends: Array<{
    timestamp: number
    date: string
    [relationshipName: string]: number | string // Sentiment scores by relationship
  }>
  relationshipNames: string[]
  timeRange: {
    start: number
    end: number
    granularity: 'day' | 'week' | 'month'
  }
}
```

#### Query: `dashboard.getRecentActivity`

Get recent activity with analysis status

```typescript
// Input
interface GetRecentActivityArgs {
  userId: Id<'users'>
  limit?: number // Default: 10
}

// Output
interface RecentActivity {
  activities: Array<
    JournalEntry & {
      relationship: Relationship | null
      analysisStatus: {
        total: number
        hasAnalysis: boolean
        sentimentScore: number | null
        emotions: string[]
        confidence: number | null
      }
      preview: string // First 150 characters
    }
  >
  totalCount: number
  analysisRate: number // Percentage with analysis
}
```

### Insights & Recommendations

#### Query: `insights.getActive`

Get active insights for user

```typescript
// Input
interface GetActiveInsightsArgs {
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  type?: InsightType
}

type InsightType =
  | 'pattern_recognition'
  | 'improvement_suggestion'
  | 'conversation_starter'
  | 'warning_signal'
  | 'celebration_prompt'
  | 'trend_alert'

// Output
interface Insight {
  _id: Id<'insights'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  type: InsightType
  title: string
  description: string
  actionableSteps: string[]
  supportingData: {
    confidence: number // 0-1
    dataPoints: number
    timeframe: string
    triggerEvents: string[]
  }
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'active' | 'dismissed' | 'acted_on' | 'expired'
  userInteraction?: {
    viewedAt?: number
    dismissedAt?: number
    actedOnAt?: number
    rating?: number // 1-5 stars
    feedback?: string
  }
  expiresAt: number
  createdAt: number
}
;[]
```

#### Mutation: `insights.markViewed`

Mark insight as viewed

```typescript
// Input
interface MarkViewedArgs {
  insightId: Id<'insights'>
}

// Output
interface InsightResponse {
  success: boolean
}
```

#### Mutation: `insights.dismiss`

Dismiss an insight

```typescript
// Input
interface DismissInsightArgs {
  insightId: Id<'insights'>
}

// Output
InsightResponse
```

#### Mutation: `insights.markActedOn`

Mark insight as acted upon

```typescript
// Input
interface MarkActedOnArgs {
  insightId: Id<'insights'>
  feedback?: string
}

// Output
InsightResponse
```

#### Mutation: `insights.rateInsight`

Rate insight quality

```typescript
// Input
interface RateInsightArgs {
  insightId: Id<'insights'>
  rating: number // 1-5
  feedback?: string
}

// Output
InsightResponse

// Validation
const RateInsightSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
})
```

### Search & Discovery

#### Query: `search.searchAll`

Global search across content

```typescript
// Input
interface SearchAllArgs {
  userId: Id<'users'>
  query: string
  filters?: {
    contentTypes?: ('entries' | 'relationships' | 'insights')[]
    dateRange?: { start: number; end: number }
    relationshipIds?: Id<'relationships'>[]
  }
  limit?: number
}

// Output
interface SearchResults {
  entries: JournalEntry[]
  relationships: Relationship[]
  insights: Insight[]
  totalResults: number
}
```

### Notifications & Reminders

#### Query: `notifications.getReminders`

Get user's reminder settings and history

```typescript
// Input
interface GetRemindersArgs {
  userId: Id<'users'>
  status?: 'scheduled' | 'delivered' | 'clicked' | 'dismissed' | 'failed'
  limit?: number
}

// Output
interface Reminder {
  _id: Id<'reminders'>
  userId: Id<'users'>
  relationshipId?: Id<'relationships'>
  type:
    | 'gentle_nudge'
    | 'relationship_focus'
    | 'health_alert'
    | 'appreciation_prompt'
    | 'pattern_insight'
  prompt: string
  scheduledTime: number
  status:
    | 'scheduled'
    | 'delivered'
    | 'clicked'
    | 'dismissed'
    | 'snoozed'
    | 'cancelled'
  settings: {
    priority: 'low' | 'medium' | 'high'
    canSnooze: boolean
    snoozeOptions: string[]
    expiresAt?: number
  }
  deliveryMetadata?: {
    deliveredAt: number
    clickedAt?: number
    dismissedAt?: number
    snoozedUntil?: number
    responseAction?: string
  }
  createdAt: number
}
;[]
```

### Data Export

#### Query: `dataExport.exportUserData`

Export user's data (GDPR compliance)

```typescript
// Input
interface ExportUserDataArgs {
  userId: Id<'users'>
  format: 'json' | 'csv'
  includeAnalysis?: boolean
}

// Output
interface ExportResponse {
  downloadUrl: string
  expiresAt: number
  fileSize: number
  format: string
}
```

---

## Error Handling

### Standard Error Response Format

```typescript
interface ConvexError {
  message: string
  code?: string
  details?: Record<string, any>
}

// Common Error Codes
const ERROR_CODES = {
  USER_NOT_FOUND: 'User not found',
  RELATIONSHIP_NOT_FOUND: 'Relationship not found',
  ENTRY_NOT_FOUND: 'Journal entry not found',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_FAILED: 'Input validation failed',
  TIER_LIMIT_EXCEEDED: 'Free tier limit exceeded',
  AI_ANALYSIS_DISABLED: 'AI analysis disabled',
  INSUFFICIENT_DATA: 'Insufficient data for operation',
}
```

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication failed)
- `403`: Forbidden (authorization failed)
- `404`: Not Found
- `429`: Rate Limited
- `500`: Internal Server Error

---

## Rate Limiting & Quotas

### Free Tier Limits

```typescript
interface FreeTierLimits {
  relationships: 3
  journalEntriesPerMonth: 100
  aiAnalysesPerMonth: 20
  dataExportsPerMonth: 1
  searchQueriesPerDay: 50
}
```

### Premium Tier Limits

```typescript
interface PremiumTierLimits {
  relationships: 'unlimited'
  journalEntriesPerMonth: 'unlimited'
  aiAnalysesPerMonth: 500
  dataExportsPerMonth: 10
  searchQueriesPerDay: 1000
  voiceJournaling: true
  advancedAnalytics: true
  priorityProcessing: true
}
```

---

## Real-time Subscriptions

### Convex Subscriptions

Real-time updates are automatically handled by Convex's reactive queries. Clients subscribe to data changes through:

```typescript
// Example: Subscribe to user's relationships
const relationships = useQuery(api.relationships.getRelationshipsByUser, {
  userId: user.id,
})

// Example: Subscribe to dashboard data
const dashboardData = useQuery(api.dashboard.getDashboardData, {
  userId: user.id,
})

// Example: Subscribe to AI analysis updates
const analysisStatus = useQuery(api.aiAnalysis.getByEntry, {
  entryId: entryId,
})
```

### Subscription Events

- **New journal entries**: Auto-update recent activity
- **AI analysis completion**: Update analysis status in UI
- **Health score changes**: Refresh dashboard metrics
- **New insights**: Show notification badges
- **Reminder delivery**: Update notification state

---

## Data Validation Schemas

### Zod Validation Schemas

```typescript
// User schemas
const CreateUserSchema = z.object({
  clerkId: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
})

// Relationship schemas
const CreateRelationshipSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['partner', 'family', 'friend', 'colleague', 'other']),
  photo: z.string().url().optional(),
})

// Journal entry schemas
const CreateJournalEntrySchema = z.object({
  relationshipId: z.string().min(1),
  content: z.string().min(1).max(10000),
  mood: z.string().max(50).optional(),
  isPrivate: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

// Search schemas
const SearchEntriesSchema = z.object({
  query: z.string().optional(),
  relationshipId: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
})
```

---

## AI Integration Patterns

### Google Gemini Flash Integration

```typescript
// AI Analysis Pipeline
interface AIAnalysisRequest {
  content: string
  relationshipContext: string
  mood?: string
  previousAnalyses: AIAnalysis[]
}

interface AIAnalysisResponse {
  sentimentScore: number // -1 to 1
  emotionalKeywords: string[]
  confidenceLevel: number // 0-1
  reasoning: string
  patterns: {
    recurring_themes: string[]
    emotional_triggers: string[]
    communication_style: string
    relationship_dynamics: string[]
  }
  processingTime: number
  tokensUsed: number
  apiCost: number
}
```

### DSPy Integration Pattern

```typescript
// DSPy-style structured analysis
interface DSPyAnalysisConfig {
  modelVersion: string
  temperature: number
  maxTokens: number
  analysisType: 'sentiment' | 'pattern' | 'insight'
}

// Processing pipeline
async function processDSPyAnalysis(
  entry: JournalEntry,
  config: DSPyAnalysisConfig
): Promise<AIAnalysisResponse>
```

---

## Security & Privacy

### Data Protection

- **Encryption**: All data encrypted at rest and in transit
- **Privacy Controls**: Per-entry AI analysis opt-out
- **Data Retention**: Configurable retention periods
- **GDPR Compliance**: Data export and deletion capabilities
- **Authentication**: Clerk-managed secure authentication
- **Authorization**: Row-level security in Convex

### Privacy-First Features

```typescript
interface PrivacySettings {
  aiAnalysisEnabled: boolean
  dataSharing: boolean
  analyticsOptIn: boolean
  marketingOptIn: boolean
  searchIndexing: boolean
  dataRetention: '1year' | '3years' | 'indefinite'
}
```

---

## Development & Testing

### Environment Configuration

```bash
# Required Environment Variables
NEXT_PUBLIC_CONVEX_URL=         # From npx convex dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Clerk dashboard
CLERK_SECRET_KEY=               # Clerk dashboard
CLERK_WEBHOOK_SECRET=           # Webhook verification
GOOGLE_GEMINI_API_KEY=          # AI analysis features
```

### API Testing Patterns

```typescript
// Example test for journal entry creation
describe('Journal Entry API', () => {
  it('should create entry with valid data', async () => {
    const entryData = {
      userId: testUserId,
      relationshipId: testRelationshipId,
      content: 'Test entry content',
      mood: 'happy',
      tags: ['test', 'example'],
    }

    const entryId = await ctx.runMutation(
      api.journalEntries.createEntry,
      entryData
    )

    expect(entryId).toBeDefined()
  })
})
```

This comprehensive API specification covers all major functionality of the Resonant application, providing developers with the complete interface for building features, integrating with the backend, and maintaining type safety throughout the application.
