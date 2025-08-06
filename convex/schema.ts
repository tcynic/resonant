import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { langExtractDataSchema } from './schema/langextract_types'

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    tier: v.optional(v.union(v.literal('free'), v.literal('premium'))), // Subscription tier
    createdAt: v.number(),
    lastActiveAt: v.optional(v.number()), // For usage analytics
    onboardingCompleted: v.optional(v.boolean()), // Track onboarding progress
    preferences: v.optional(
      v.object({
        theme: v.optional(v.union(v.literal('light'), v.literal('dark'))),
        notifications: v.optional(v.boolean()),
        reminderSettings: v.optional(
          v.object({
            enabled: v.boolean(),
            frequency: v.union(
              v.literal('daily'),
              v.literal('weekly'),
              v.literal('biweekly'),
              v.literal('monthly')
            ),
            preferredTime: v.string(), // "HH:MM" format
            timezone: v.string(), // IANA timezone
            doNotDisturbStart: v.string(), // "HH:MM"
            doNotDisturbEnd: v.string(), // "HH:MM"
            reminderTypes: v.object({
              gentleNudge: v.boolean(),
              relationshipFocus: v.boolean(),
              healthScoreAlerts: v.boolean(),
            }),
          })
        ),
        language: v.optional(v.string()),
        dataSharing: v.optional(v.boolean()),
        analyticsOptIn: v.optional(v.boolean()),
        marketingOptIn: v.optional(v.boolean()),
        searchIndexing: v.optional(v.boolean()),
        aiAnalysisEnabled: v.optional(v.boolean()), // Global AI analysis toggle
        dataRetention: v.optional(
          v.union(
            v.literal('1year'),
            v.literal('3years'),
            v.literal('indefinite')
          )
        ),
      })
    ),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_tier', ['tier'])
    .index('by_last_active', ['lastActiveAt']),

  relationships: defineTable({
    userId: v.id('users'),
    name: v.string(),
    type: v.union(
      v.literal('partner'),
      v.literal('family'),
      v.literal('friend'),
      v.literal('colleague'),
      v.literal('other')
    ),
    photo: v.optional(v.string()),
    initials: v.optional(v.string()), // For privacy in AI analysis
    isActive: v.optional(v.boolean()), // Allow soft deletion
    metadata: v.optional(
      v.object({
        notes: v.optional(v.string()),
        anniversary: v.optional(v.number()),
        importance: v.optional(
          v.union(v.literal('high'), v.literal('medium'), v.literal('low'))
        ),
        tags: v.optional(v.array(v.string())),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_type', ['type'])
    .index('by_user_active', ['userId', 'isActive']),

  journalEntries: defineTable({
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')), // Allow general entries
    content: v.string(),
    mood: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    allowAIAnalysis: v.optional(v.boolean()), // Per-entry AI control
    tags: v.optional(v.array(v.string())),
    wordCount: v.optional(v.number()), // For analytics
    status: v.optional(v.union(v.literal('draft'), v.literal('published'))),
    entryType: v.optional(
      v.union(v.literal('text'), v.literal('voice'), v.literal('mixed'))
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_user_and_private', ['userId', 'isPrivate'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_and_ai_analysis', ['userId', 'allowAIAnalysis'])
    .index('by_status', ['status'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['userId', 'relationshipId', 'isPrivate'],
    }),

  // AI Analysis Results - Enhanced for DSPy pipeline
  aiAnalysis: defineTable({
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')),
    // Sentiment Analysis Results
    sentimentScore: v.number(), // -1 to 1 scale (DSPy standard)
    emotionalKeywords: v.array(v.string()),
    confidenceLevel: v.number(), // 0-1 scale
    reasoning: v.string(), // AI explanation
    // Pattern Detection Results
    patterns: v.optional(
      v.object({
        recurring_themes: v.array(v.string()),
        emotional_triggers: v.array(v.string()),
        communication_style: v.string(),
        relationship_dynamics: v.array(v.string()),
      })
    ),
    // Emotional Stability Analysis (Pattern Detection Migration)
    emotionalStability: v.optional(
      v.object({
        stability_score: v.number(), // 0-100
        trend_direction: v.union(
          v.literal('improving'),
          v.literal('declining'),
          v.literal('stable')
        ),
        volatility_level: v.union(
          v.literal('low'),
          v.literal('moderate'),
          v.literal('high')
        ),
        recovery_patterns: v.string(),
      })
    ),
    // Energy Impact Analysis (Pattern Detection Migration)
    energyImpact: v.optional(
      v.object({
        energy_score: v.number(), // 1-10
        energy_indicators: v.array(v.string()),
        overall_effect: v.union(
          v.literal('energizing'),
          v.literal('neutral'),
          v.literal('draining')
        ),
        explanation: v.string(),
      })
    ),
    // Processing Metadata
    analysisVersion: v.string(), // Track DSPy model versions
    processingTime: v.number(), // milliseconds
    tokensUsed: v.optional(v.number()),
    apiCost: v.optional(v.number()),
    processingAttempts: v.optional(v.number()), // For HTTP Actions retry tracking
    lastErrorMessage: v.optional(v.string()), // For debugging HTTP Action failures
    httpActionId: v.optional(v.string()), // For request tracking

    // Enhanced Processing Metadata (Story AI-Migration.5)
    modelType: v.optional(v.string()), // 'gemini_2_5_flash_lite', 'gpt_4', etc.
    modelVersion: v.optional(v.string()), // Specific model version tracking
    requestTokens: v.optional(v.number()), // Input tokens for detailed usage
    responseTokens: v.optional(v.number()), // Output tokens for detailed usage
    cachingUsed: v.optional(v.boolean()), // Whether response was cached
    batchProcessed: v.optional(v.boolean()), // Whether part of batch processing
    regionProcessed: v.optional(v.string()), // Geographic region for processing
    // Queue Management Fields
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
    queuedAt: v.optional(v.number()), // When item was added to queue
    processingStartedAt: v.optional(v.number()), // When processing began
    estimatedCompletionTime: v.optional(v.number()), // ETA for user display
    queuePosition: v.optional(v.number()), // Position in queue for user feedback
    // Queue Performance Tracking
    queueWaitTime: v.optional(v.number()), // Time spent waiting in queue
    totalProcessingTime: v.optional(v.number()), // End-to-end processing time
    // Dead Letter Queue Management
    deadLetterQueue: v.optional(v.boolean()), // Mark items in dead letter queue
    deadLetterReason: v.optional(v.string()), // Why item was moved to dead letter queue
    deadLetterTimestamp: v.optional(v.number()), // When moved to dead letter queue
    deadLetterCategory: v.optional(v.string()), // Category of dead letter failure
    deadLetterMetadata: v.optional(v.any()), // Enhanced metadata for investigation

    // Circuit Breaker Integration (Story AI-Migration.4)
    circuitBreakerState: v.optional(
      v.object({
        service: v.string(), // Service identifier (e.g., 'gemini_2_5_flash_lite')
        state: v.union(
          // Circuit breaker state at time of processing
          v.literal('closed'),
          v.literal('open'),
          v.literal('half_open')
        ),
        failureCount: v.number(), // Failures at time of processing
        lastReset: v.optional(v.number()), // Last circuit breaker reset timestamp
      })
    ),

    // Enhanced Error Classification (extends existing lastErrorMessage)
    lastErrorType: v.optional(
      v.union(
        v.literal('network'),
        v.literal('rate_limit'),
        v.literal('timeout'),
        v.literal('validation'),
        v.literal('service_error'),
        v.literal('authentication')
      )
    ),

    // Retry History (enhances existing processingAttempts)
    retryHistory: v.optional(
      v.array(
        v.object({
          attempt: v.number(),
          timestamp: v.number(),
          delayMs: v.number(),
          errorType: v.string(),
          errorMessage: v.string(),
          circuitBreakerState: v.string(),
        })
      )
    ),

    // Fallback Analysis Results (Story AI-Migration.4)
    fallbackUsed: v.optional(v.boolean()),
    fallbackConfidence: v.optional(v.number()), // 0-1 confidence score
    fallbackMethod: v.optional(v.string()), // 'keyword_sentiment', 'rule_based', etc.
    fallbackMetadata: v.optional(
      v.object({
        trigger: v.string(), // Why fallback was used
        qualityScore: v.number(), // Quality assessment score
        confidence: v.number(), // Combined confidence score
        processingTime: v.number(), // Processing time in ms
        patternInsights: v.array(v.string()), // Pattern analysis insights
        recommendations: v.array(v.string()), // Actionable recommendations
        keywordsMatched: v.optional(v.array(v.string())), // For backwards compatibility
        rulesFired: v.optional(v.array(v.string())), // For backwards compatibility
        processingTimeMs: v.optional(v.number()), // For backwards compatibility
      })
    ),

    // Recovery and Upgrade Tracking
    recoveryAttempted: v.optional(v.boolean()),
    upgradedFromFallback: v.optional(v.boolean()), // True if this result replaced a fallback
    originalFallbackId: v.optional(v.id('aiAnalysis')), // Reference to original fallback result
    recoveryTimestamp: v.optional(v.number()),

    // Fallback Upgrade Management (Story AI-Migration.4)
    upgradeInProgress: v.optional(v.boolean()), // True if upgrade to AI analysis is in progress
    upgradeRequestedAt: v.optional(v.number()), // When upgrade was requested
    upgradeReason: v.optional(v.string()), // Why upgrade was requested
    comparisonId: v.optional(v.id('fallbackComparisons')), // Reference to comparison record
    aiComparisonAvailable: v.optional(v.boolean()), // True if comparison with AI exists
    upgradeRecommendation: v.optional(
      v.object({
        shouldUpgrade: v.boolean(),
        confidence: v.number(),
        reason: v.string(),
        urgency: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
        estimatedImprovement: v.number(),
      })
    ),

    // Enhanced Error Context (builds on existing fields)
    errorContext: v.optional(
      v.object({
        httpActionId: v.optional(v.string()), // From existing field
        requestId: v.optional(v.string()),
        serviceEndpoint: v.optional(v.string()),
        totalRetryTime: v.optional(v.number()), // Total time spent in retries
        finalAttemptDelay: v.optional(v.number()),
        escalationPath: v.optional(v.array(v.string())), // Priority escalation history
      })
    ),

    // LangExtract Structured Data (Story LangExtract-2)
    // Using modular schema definition for better maintainability
    langExtractData: v.optional(langExtractDataSchema),

    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    createdAt: v.number(),
  })
    .index('by_entry', ['entryId'])
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_status', ['status'])
    .index('by_status_created', ['status', 'createdAt'])
    .index('by_priority_queued', ['priority', 'queuedAt'])
    .index('by_status_priority', ['status', 'priority'])
    .index('by_queue_position', ['queuePosition'])
    .index('by_processing_started', ['processingStartedAt'])
    .index('by_user_status', ['userId', 'status'])
    // Enhanced indexes for new metadata fields (Story AI-Migration.5)
    .index('by_model_type', ['modelType'])
    .index('by_cost_date', ['apiCost', 'createdAt'])
    .index('by_user_model_date', ['userId', 'modelType', 'createdAt'])
    .index('by_processing_time', ['processingTime'])
    .index('by_token_usage', ['tokensUsed'])
    .index('by_model_type_cost', ['modelType', 'apiCost'])
    .index('by_user_cost_date', ['userId', 'apiCost', 'createdAt'])
    .index('by_region_model_time', [
      'regionProcessed',
      'modelType',
      'createdAt',
    ]),
  // Note: LangExtract indexes would require custom queries due to nested object structure

  // Relationship Health Scores - Enhanced for comprehensive tracking
  healthScores: defineTable({
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
    score: v.number(), // 0-100 scale
    contributingFactors: v.array(v.string()), // What influenced the score
    trendDirection: v.union(
      v.literal('improving'),
      v.literal('stable'),
      v.literal('declining')
    ),
    confidence: v.number(), // 0-1 confidence in accuracy
    recommendations: v.array(v.string()), // Actionable suggestions
    // Detailed factor breakdown
    factorBreakdown: v.object({
      communication: v.number(), // 0-100
      emotional_support: v.number(), // 0-100
      conflict_resolution: v.number(), // 0-100
      trust_intimacy: v.number(), // 0-100
      shared_growth: v.number(), // 0-100
    }),
    // Metadata for score calculation
    entriesAnalyzed: v.number(), // Data points used
    timeframeStart: v.number(), // Period start
    timeframeEnd: v.number(), // Period end
    lastCalculated: v.number(),
    version: v.string(), // Algorithm version for consistency
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_score', ['score'])
    .index('by_user_calculated', ['userId', 'lastCalculated']),

  // Reminder delivery tracking
  reminderLogs: defineTable({
    userId: v.id('users'),
    reminderType: v.union(
      v.literal('gentle_nudge'),
      v.literal('relationship_focus'),
      v.literal('health_alert')
    ),
    targetRelationshipId: v.optional(v.id('relationships')), // For relationship-specific reminders
    scheduledTime: v.number(),
    deliveredTime: v.optional(v.number()),
    status: v.union(
      v.literal('scheduled'),
      v.literal('delivered'),
      v.literal('clicked'),
      v.literal('dismissed'),
      v.literal('failed')
    ),
    content: v.string(), // The actual reminder message
    metadata: v.object({
      triggerReason: v.string(), // Why this reminder was sent
      healthScoreAtTime: v.optional(v.number()),
      daysSinceLastEntry: v.optional(v.number()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_status', ['userId', 'status'])
    .index('by_scheduled_time', ['scheduledTime']),

  // User pattern analysis
  userPatterns: defineTable({
    userId: v.id('users'),
    patternType: v.union(
      v.literal('journaling_frequency'),
      v.literal('optimal_timing'),
      v.literal('engagement_response')
    ),
    analysisData: v.object({
      averageDaysBetweenEntries: v.optional(v.number()),
      mostActiveHours: v.optional(v.array(v.number())), // Hours of day (0-23)
      bestResponseTimes: v.optional(v.array(v.string())), // "HH:MM" format
      engagementScore: v.optional(v.number()), // 0-100 based on reminder responses
      lastCalculated: v.number(),
    }),
    confidenceLevel: v.number(), // 0-1 based on data availability
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_pattern_type', ['patternType'])
    .index('by_user_and_type', ['userId', 'patternType']),

  // Chart preferences and configurations
  chartPreferences: defineTable({
    userId: v.id('users'),
    dashboardCharts: v.array(
      v.object({
        chartType: v.union(
          v.literal('sentiment_trend'),
          v.literal('health_score_trend'),
          v.literal('relationship_comparison'),
          v.literal('correlation_analysis')
        ),
        position: v.object({ row: v.number(), col: v.number() }),
        size: v.object({ width: v.number(), height: v.number() }),
        config: v.object({
          timeRange: v.union(
            v.literal('week'),
            v.literal('month'),
            v.literal('quarter'),
            v.literal('year'),
            v.literal('custom')
          ),
          selectedRelationships: v.array(v.id('relationships')),
          showTrendLines: v.boolean(),
          showAnnotations: v.boolean(),
          showMovingAverage: v.optional(v.boolean()),
          movingAverageWindow: v.optional(v.number()),
        }),
      })
    ),
    exportPreferences: v.object({
      defaultFormat: v.union(v.literal('png'), v.literal('pdf')),
      includeData: v.boolean(),
      highResolution: v.boolean(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Computed trend analytics for performance
  trendAnalytics: defineTable({
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')), // null for user-level trends
    analyticsType: v.union(
      v.literal('sentiment_trend'),
      v.literal('health_score_trend'),
      v.literal('pattern_analysis')
    ),
    timeframe: v.object({
      startDate: v.number(),
      endDate: v.number(),
      granularity: v.union(
        v.literal('daily'),
        v.literal('weekly'),
        v.literal('monthly')
      ),
    }),
    computedData: v.object({
      dataPoints: v.array(
        v.object({
          timestamp: v.number(),
          value: v.number(),
          metadata: v.optional(
            v.object({
              entryCount: v.number(),
              significantEvents: v.array(v.string()),
              factors: v.optional(
                v.object({
                  communication: v.number(),
                  trust: v.number(),
                  satisfaction: v.number(),
                  growth: v.number(),
                })
              ),
            })
          ),
        })
      ),
      statistics: v.object({
        average: v.number(),
        trend: v.union(
          v.literal('improving'),
          v.literal('stable'),
          v.literal('declining')
        ),
        volatility: v.number(), // Standard deviation
        bestPeriod: v.object({ start: v.number(), end: v.number() }),
        worstPeriod: v.object({ start: v.number(), end: v.number() }),
      }),
      patterns: v.array(
        v.object({
          type: v.string(), // 'seasonal', 'weekly_cycle', 'improvement_streak'
          confidence: v.number(), // 0-1
          description: v.string(),
        })
      ),
    }),
    lastCalculated: v.number(),
    cacheExpiresAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_relationship', ['userId', 'relationshipId'])
    .index('by_expiry', ['cacheExpiresAt'])
    .index('by_user_and_type', ['userId', 'analyticsType']),

  // Voice Journaling Support (Epic 4 - Premium Feature)
  voiceEntries: defineTable({
    userId: v.id('users'),
    entryId: v.id('journalEntries'), // Links to main journal entry
    audioFileUrl: v.string(), // Storage URL for audio file
    transcription: v.string(), // Voice-to-text result
    transcriptionConfidence: v.number(), // 0-1 accuracy score
    duration: v.number(), // seconds
    status: v.union(
      v.literal('recording'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    metadata: v.object({
      fileSize: v.number(), // bytes
      audioFormat: v.string(), // mp3, wav, etc.
      transcriptionService: v.string(), // Which service used
      processingTime: v.number(), // ms for transcription
    }),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_entry', ['entryId'])
    .index('by_status', ['status']),

  // Smart Reminders (Epic 4)
  reminders: defineTable({
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')), // Can be general or relationship-specific
    type: v.union(
      v.literal('gentle_nudge'),
      v.literal('relationship_focus'),
      v.literal('health_alert'),
      v.literal('appreciation_prompt'),
      v.literal('pattern_insight')
    ),
    prompt: v.string(), // The actual reminder message
    scheduledTime: v.number(), // When to deliver
    status: v.union(
      v.literal('scheduled'),
      v.literal('delivered'),
      v.literal('clicked'),
      v.literal('dismissed'),
      v.literal('snoozed'),
      v.literal('cancelled')
    ),
    settings: v.object({
      priority: v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high')
      ),
      canSnooze: v.boolean(),
      snoozeOptions: v.array(v.string()), // ["1 hour", "tomorrow", "next week"]
      expiresAt: v.optional(v.number()), // Auto-cancel if not delivered
    }),
    deliveryMetadata: v.optional(
      v.object({
        deliveredAt: v.number(),
        clickedAt: v.optional(v.number()),
        dismissedAt: v.optional(v.number()),
        snoozedUntil: v.optional(v.number()),
        responseAction: v.optional(v.string()), // What user did after reminder
      })
    ),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_scheduled_time', ['scheduledTime'])
    .index('by_status', ['status'])
    .index('by_user_and_status', ['userId', 'status']),

  // Actionable Insights & Suggestions (Epic 4)
  insights: defineTable({
    userId: v.id('users'),
    relationshipId: v.optional(v.id('relationships')), // Can be general or relationship-specific
    type: v.union(
      v.literal('pattern_recognition'),
      v.literal('improvement_suggestion'),
      v.literal('conversation_starter'),
      v.literal('warning_signal'),
      v.literal('celebration_prompt'),
      v.literal('trend_alert')
    ),
    title: v.string(), // Insight headline
    description: v.string(), // Detailed explanation
    actionableSteps: v.array(v.string()), // Specific things user can do
    supportingData: v.object({
      confidence: v.number(), // 0-1 how confident AI is
      dataPoints: v.number(), // Number of entries analyzed
      timeframe: v.string(), // "last 30 days", etc.
      triggerEvents: v.array(v.string()), // What caused this insight
    }),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('urgent')
    ),
    status: v.union(
      v.literal('active'),
      v.literal('dismissed'),
      v.literal('acted_on'),
      v.literal('expired')
    ),
    userInteraction: v.optional(
      v.object({
        viewedAt: v.optional(v.number()),
        dismissedAt: v.optional(v.number()),
        actedOnAt: v.optional(v.number()),
        rating: v.optional(v.number()), // 1-5 user rating of insight quality
        feedback: v.optional(v.string()), // User's text feedback
      })
    ),
    expiresAt: v.number(), // When insight becomes stale
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_type', ['type'])
    .index('by_priority', ['priority'])
    .index('by_status', ['status'])
    .index('by_user_and_active', ['userId', 'status'])
    .index('by_expires', ['expiresAt']),

  // Conversation Starters & Scripts (Epic 4 - Actionable Guidance)
  conversationStarters: defineTable({
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
    category: v.union(
      v.literal('check_in'),
      v.literal('appreciation'),
      v.literal('difficult_topic'),
      v.literal('deepening_connection'),
      v.literal('conflict_resolution'),
      v.literal('boundary_setting')
    ),
    prompt: v.string(), // The conversation starter
    context: v.string(), // Why this was suggested
    difficulty: v.union(
      v.literal('easy'),
      v.literal('medium'),
      v.literal('challenging')
    ),
    suggestedTiming: v.string(), // "during a quiet moment", "over dinner", etc.
    relatedInsights: v.array(v.id('insights')), // Connected to specific insights
    userFeedback: v.optional(
      v.object({
        used: v.boolean(),
        helpful: v.optional(v.boolean()),
        outcome: v.optional(v.string()), // How the conversation went
        rating: v.optional(v.number()), // 1-5 stars
      })
    ),
    createdAt: v.number(),
    expiresAt: v.number(), // Context-sensitive suggestions expire
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_category', ['category'])
    .index('by_user_and_relationship', ['userId', 'relationshipId']),

  // Progress Tracking for Relationship Goals (Epic 4)
  relationshipGoals: defineTable({
    userId: v.id('users'),
    relationshipId: v.id('relationships'),
    title: v.string(), // "Improve communication", "Show more appreciation"
    description: v.string(),
    category: v.union(
      v.literal('communication'),
      v.literal('appreciation'),
      v.literal('conflict_resolution'),
      v.literal('quality_time'),
      v.literal('trust_building'),
      v.literal('personal_growth')
    ),
    targetMetric: v.object({
      type: v.string(), // "health_score_increase", "entry_frequency", "positive_sentiment"
      target: v.number(), // Target value
      current: v.number(), // Current value
      unit: v.string(), // "points", "entries per week", "percentage"
    }),
    milestones: v.array(
      v.object({
        title: v.string(),
        target: v.number(),
        achieved: v.boolean(),
        achievedAt: v.optional(v.number()),
      })
    ),
    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('paused'),
      v.literal('cancelled')
    ),
    targetDate: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_relationship', ['relationshipId'])
    .index('by_status', ['status'])
    .index('by_user_and_status', ['userId', 'status']),

  // User Usage Analytics (for Premium insights and product optimization)
  usageAnalytics: defineTable({
    userId: v.id('users'),
    date: v.string(), // YYYY-MM-DD for daily aggregation
    metrics: v.object({
      journalEntries: v.number(),
      voiceEntries: v.number(),
      dashboardViews: v.number(),
      insightsViewed: v.number(),
      remindersReceived: v.number(),
      remindersActedOn: v.number(),
      relationshipsViewed: v.array(v.id('relationships')),
      timeSpentMinutes: v.number(),
      featuresUsed: v.array(v.string()), // Track feature adoption
    }),
    sessionCount: v.number(),
    lastUpdated: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_date', ['date'])
    .index('by_user_and_date', ['userId', 'date']),

  // Feature Flags & A/B Testing (for Epic 4 advanced features)
  userFeatureFlags: defineTable({
    userId: v.id('users'),
    flags: v.object({
      advancedAnalytics: v.boolean(),
      voiceJournaling: v.boolean(),
      smartReminders: v.boolean(),
      conversationStarters: v.boolean(),
      relationshipGoals: v.boolean(),
      betaFeatures: v.boolean(),
    }),
    abTestGroups: v.optional(
      v.object({
        reminderAlgorithm: v.optional(v.string()), // "v1", "v2", "control"
        insightGeneration: v.optional(v.string()),
        dashboardLayout: v.optional(v.string()),
      })
    ),
    lastUpdated: v.number(),
  }).index('by_user', ['userId']),

  // Circuit breaker status cache (for fast lookups) - Story AI-Migration.4
  circuitBreakerStatus: defineTable({
    service: v.string(),
    isOpen: v.boolean(),
    failureCount: v.number(),
    lastFailure: v.optional(v.number()),
    nextAttemptTime: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_service', ['service']),

  // Error rate tracking (for analytics) - Story AI-Migration.4
  errorMetrics: defineTable({
    service: v.string(),
    timeWindow: v.number(), // Hour bucket for aggregation
    errorCount: v.number(),
    successCount: v.number(),
    avgProcessingTime: v.optional(v.number()),
    costImpact: v.optional(v.number()),
  }).index('by_service_time', ['service', 'timeWindow']),

  // Fallback Analysis Comparisons (Story AI-Migration.4)
  fallbackComparisons: defineTable({
    fallbackAnalysisId: v.id('aiAnalysis'),
    aiAnalysisId: v.id('aiAnalysis'),
    comparisonResults: v.object({
      sentimentAgreement: v.object({
        agreement: v.boolean(),
        aiSentiment: v.union(
          v.literal('positive'),
          v.literal('negative'),
          v.literal('neutral')
        ),
        fallbackSentiment: v.union(
          v.literal('positive'),
          v.literal('negative'),
          v.literal('neutral')
        ),
        confidenceDelta: v.number(),
        scoreDistance: v.number(),
      }),
      qualityComparison: v.object({
        aiQuality: v.number(),
        fallbackQuality: v.number(),
        qualityAdvantage: v.union(
          v.literal('ai'),
          v.literal('fallback'),
          v.literal('similar')
        ),
        confidenceReliability: v.number(),
      }),
      patternConsistency: v.object({
        keywordOverlap: v.number(),
        themeAlignment: v.number(),
        insightSimilarity: v.number(),
        contradictions: v.array(v.string()),
      }),
      performance: v.object({
        aiProcessingTime: v.number(),
        fallbackProcessingTime: v.number(),
        costComparison: v.object({
          aiCost: v.number(),
          fallbackCost: v.number(),
          costSavings: v.number(),
        }),
        speedAdvantage: v.union(v.literal('ai'), v.literal('fallback')),
      }),
      upgradeRecommendation: v.object({
        shouldUpgrade: v.boolean(),
        confidence: v.number(),
        reason: v.string(),
        urgency: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
        estimatedImprovement: v.number(),
      }),
      comparisonMetadata: v.object({
        comparisonMethod: v.string(),
        processingTime: v.number(),
        analysisVersion: v.string(),
        timestamp: v.number(),
      }),
    }),
    createdAt: v.number(),
  })
    .index('by_fallback_analysis', ['fallbackAnalysisId'])
    .index('by_ai_analysis', ['aiAnalysisId'])
    .index('by_created_at', ['createdAt']),

  // Structured Error Logs (Story AI-Migration.4)
  errorLogs: defineTable({
    errorMessage: v.string(),
    errorCode: v.optional(v.string()),
    stackTrace: v.optional(v.string()),
    context: v.object({
      userId: v.optional(v.string()),
      entryId: v.optional(v.string()),
      analysisId: v.optional(v.string()),
      service: v.string(),
      operation: v.string(),
      userAgent: v.optional(v.string()),
      clientVersion: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      requestId: v.optional(v.string()),
      environment: v.union(
        v.literal('development'),
        v.literal('production'),
        v.literal('staging')
      ),
      timestamp: v.number(),
    }),
    classification: v.object({
      category: v.union(
        v.literal('network'),
        v.literal('authentication'),
        v.literal('validation'),
        v.literal('service_error'),
        v.literal('rate_limit'),
        v.literal('timeout'),
        v.literal('circuit_breaker'),
        v.literal('fallback'),
        v.literal('unknown')
      ),
      severity: v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
      ),
      retryable: v.boolean(),
      circuitBreakerImpact: v.boolean(),
      fallbackEligible: v.boolean(),
      userImpact: v.union(
        v.literal('none'),
        v.literal('minor'),
        v.literal('major'),
        v.literal('blocking')
      ),
      businessImpact: v.union(
        v.literal('none'),
        v.literal('low'),
        v.literal('medium'),
        v.literal('high')
      ),
      tags: v.array(v.string()),
    }),
    metadata: v.object({
      duration: v.optional(v.number()),
      retryCount: v.optional(v.number()),
      circuitBreakerState: v.optional(v.string()),
      fallbackUsed: v.optional(v.boolean()),
      fallbackMethod: v.optional(v.string()),
      recoveryAction: v.optional(v.string()),
      correlationId: v.optional(v.string()),
      parentErrorId: v.optional(v.string()),
      errorChain: v.optional(v.array(v.string())),
    }),
    resolution: v.optional(
      v.object({
        resolved: v.boolean(),
        resolvedAt: v.optional(v.number()),
        resolvedBy: v.optional(
          v.union(
            v.literal('auto_recovery'),
            v.literal('manual_intervention'),
            v.literal('retry'),
            v.literal('fallback')
          )
        ),
        resolvedAction: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    aggregationKey: v.string(),
    fingerprint: v.string(),
  })
    .index('by_service', ['context.service'])
    .index('by_category', ['classification.category'])
    .index('by_severity', ['classification.severity'])
    .index('by_timestamp', ['context.timestamp'])
    .index('by_fingerprint', ['fingerprint'])
    .index('by_aggregation_key', ['aggregationKey']),

  // Error Aggregates (Story AI-Migration.4)
  errorAggregates: defineTable({
    timeWindow: v.number(),
    service: v.string(),
    category: v.string(),
    count: v.number(),
    severity: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    lastSeen: v.number(),
    fingerprints: v.array(v.string()),
    aggregationKeys: v.array(v.string()),
    sampleErrorIds: v.array(v.string()),
    userImpactCounts: v.object({
      none: v.number(),
      minor: v.number(),
      major: v.number(),
      blocking: v.number(),
    }),
    businessImpactCounts: v.object({
      none: v.number(),
      low: v.number(),
      medium: v.number(),
      high: v.number(),
    }),
  })
    .index('by_time_service_category', ['timeWindow', 'service', 'category'])
    .index('by_service', ['service'])
    .index('by_last_seen', ['lastSeen']),

  // Recovery Workflows (Story AI-Migration.4)
  recoveryWorkflows: defineTable({
    service: v.string(),
    phase: v.union(
      v.literal('detection'),
      v.literal('validation'),
      v.literal('gradual_recovery'),
      v.literal('full_recovery'),
      v.literal('monitoring'),
      v.literal('failed')
    ),
    startedAt: v.number(),
    lastUpdate: v.number(),
    progress: v.number(),
    steps: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        status: v.union(
          v.literal('pending'),
          v.literal('in_progress'),
          v.literal('completed'),
          v.literal('failed'),
          v.literal('skipped')
        ),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        duration: v.optional(v.number()),
        data: v.optional(v.any()),
        error: v.optional(v.string()),
        retryCount: v.number(),
        maxRetries: v.number(),
      })
    ),
    currentStepIndex: v.number(),
    estimatedTimeRemaining: v.optional(v.number()),
    autoRecoveryEnabled: v.boolean(),
  })
    .index('by_service', ['service'])
    .index('by_phase', ['phase'])
    .index('by_started_at', ['startedAt']),

  // Service Health Checks (Story AI-Migration.4)
  serviceHealthChecks: defineTable({
    service: v.string(),
    timestamp: v.number(),
    success: v.boolean(),
    responseTime: v.number(),
    error: v.optional(v.string()),
    data: v.optional(v.any()),
    checkType: v.union(
      v.literal('ping'),
      v.literal('api_call'),
      v.literal('circuit_breaker_test'),
      v.literal('custom')
    ),
  })
    .index('by_service', ['service'])
    .index('by_timestamp', ['timestamp'])
    .index('by_service_timestamp', ['service', 'timestamp']),

  // Recovery Orchestration State (Story AI-Migration.4)
  recoveryOrchestrationState: defineTable({
    sessionId: v.string(),
    status: v.union(
      v.literal('planning'),
      v.literal('executing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    startedAt: v.number(),
    lastUpdate: v.number(),
    config: v.object({
      enabled: v.boolean(),
      maxConcurrentRecoveries: v.number(),
      serviceDelay: v.number(),
      dependencyAware: v.boolean(),
      autoRecovery: v.boolean(),
      notificationThreshold: v.union(
        v.literal('all'),
        v.literal('critical'),
        v.literal('none')
      ),
      recoveryTimeout: v.number(),
    }),
    plannedServices: v.array(v.string()),
    completedServices: v.array(v.string()),
    failedServices: v.array(v.string()),
    currentPhase: v.string(),
    estimatedCompletion: v.optional(v.number()),
    progress: v.number(),
    recoveryPlan: v.optional(v.any()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index('by_session', ['sessionId'])
    .index('by_status', ['status'])
    .index('by_started_at', ['startedAt']),

  // Enhanced Monitoring Alerts (Story AI-Migration.6)
  monitoringAlerts: defineTable({
    alertType: v.string(), // 'success_rate', 'cost_budget', 'health_check', 'processing_time', 'failure_detection'
    severity: v.union(
      v.literal('warning'),
      v.literal('critical'),
      v.literal('emergency')
    ),
    message: v.string(),
    triggeredAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedBy: v.optional(v.id('users')),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id('users')),
    metadata: v.optional(v.any()), // Alert-specific data
    conditions: v.object({
      threshold: v.number(),
      actualValue: v.number(),
      service: v.optional(v.string()),
      timeWindow: v.string(), // '1h', '24h', '7d', etc.
    }),
    escalationLevel: v.number(), // 0 = initial, 1+ = escalated
    escalatedAt: v.optional(v.number()),
    autoResolved: v.boolean(),
    notificationsSent: v.array(v.string()), // Track which channels were notified
    // Legacy fields for backward compatibility
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    actions: v.optional(
      v.object({
        notify: v.boolean(),
        autoResolve: v.boolean(),
        escalate: v.boolean(),
      })
    ),
    enabled: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    triggeredCount: v.optional(v.number()),
    lastTriggered: v.optional(v.number()),
  })
    .index('by_type_triggered', ['alertType', 'triggeredAt'])
    .index('by_severity_unresolved', ['severity', 'resolvedAt'])
    .index('by_triggered_at', ['triggeredAt'])
    .index('by_acknowledged', ['acknowledgedAt'])
    .index('by_resolved', ['resolvedAt'])
    .index('by_escalation_level', ['escalationLevel'])
    .index('by_enabled', ['enabled']) // Legacy index
    .index('by_name', ['name']), // Legacy index

  // Alert History (Story AI-Migration.4)
  alertHistory: defineTable({
    alertId: v.id('monitoringAlerts'),
    triggeredAt: v.number(),
    resolvedAt: v.optional(v.number()),
    severity: v.union(
      v.literal('info'),
      v.literal('warning'),
      v.literal('critical')
    ),
    message: v.string(),
    data: v.optional(v.any()),
    acknowledged: v.boolean(),
    acknowledgedBy: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
  })
    .index('by_alert', ['alertId'])
    .index('by_triggered_at', ['triggeredAt'])
    .index('by_severity', ['severity']),

  // Notifications (Story AI-Migration.4)
  notifications: defineTable({
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    createdAt: v.number(),
    read: v.boolean(),
  })
    .index('by_type', ['type'])
    .index('by_created_at', ['createdAt'])
    .index('by_read', ['read']),

  // Alerting Configuration (Story AI-Migration.6)
  alertingConfig: defineTable({
    alertType: v.string(), // 'success_rate', 'cost_budget', 'health_check', 'processing_time'
    thresholds: v.object({
      warning: v.optional(v.number()),
      critical: v.optional(v.number()),
      emergency: v.optional(v.number()),
    }),
    recipients: v.array(v.string()), // Email addresses or user IDs
    enabled: v.boolean(),
    lastTriggered: v.optional(v.number()),
    createdBy: v.id('users'),
    updatedAt: v.number(),
    deliveryChannels: v.object({
      email: v.boolean(),
      dashboard: v.boolean(),
      webhook: v.optional(v.string()), // Webhook URL if enabled
    }),
    escalationRules: v.optional(
      v.object({
        escalateAfter: v.number(), // Minutes before escalation
        escalationRecipients: v.array(v.string()),
        maxEscalations: v.number(),
      })
    ),
  })
    .index('by_type', ['alertType'])
    .index('by_enabled', ['enabled'])
    .index('by_created_by', ['createdBy']),

  // Budget Tracking (Story AI-Migration.6)
  budgetTracking: defineTable({
    timeWindow: v.string(), // 'daily', 'weekly', 'monthly'
    budgetLimit: v.number(), // Budget limit in USD
    currentSpend: v.number(), // Current spending in USD
    projectedSpend: v.number(), // Projected spending based on current rate
    alertThreshold: v.number(), // Percentage (0.8 = 80%)
    windowStart: v.number(), // Start of the time window (Unix timestamp)
    windowEnd: v.number(), // End of the time window (Unix timestamp)
    lastUpdated: v.number(),
    service: v.optional(v.string()), // Service-specific budget ('gemini', 'convex', 'all')
    costBreakdown: v.optional(
      v.object({
        aiAnalysis: v.number(),
        storage: v.number(),
        bandwidth: v.number(),
        other: v.number(),
      })
    ),
    budgetUtilization: v.number(), // Percentage of budget used (0-1)
    daysRemaining: v.optional(v.number()), // Days left in budget period
    burnRate: v.number(), // Current daily burn rate in USD
    forecastAccuracy: v.optional(v.number()), // Accuracy of previous forecasts (0-1)
  })
    .index('by_window_start', ['timeWindow', 'windowStart'])
    .index('by_service_window', ['service', 'timeWindow', 'windowStart'])
    .index('by_utilization', ['budgetUtilization'])
    .index('by_last_updated', ['lastUpdated']),

  // System Monitoring Tables (Story AI-Migration.5)

  // System-wide application logs (new table)
  systemLogs: defineTable({
    level: v.union(
      v.literal('debug'),
      v.literal('info'),
      v.literal('warn'),
      v.literal('error')
    ),
    message: v.string(),
    service: v.string(), // Service that generated the log
    metadata: v.optional(v.any()), // Additional context data
    timestamp: v.number(),
    userId: v.optional(v.id('users')), // Associated user if applicable
    sessionId: v.optional(v.string()), // Session tracking
    requestId: v.optional(v.string()), // Request correlation ID
    environment: v.optional(
      v.union(
        v.literal('development'),
        v.literal('staging'),
        v.literal('production')
      )
    ),
  })
    .index('by_level_timestamp', ['level', 'timestamp'])
    .index('by_service_timestamp', ['service', 'timestamp'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_environment_level_timestamp', [
      'environment',
      'level',
      'timestamp',
    ]),

  // API usage tracking for cost monitoring (new table)
  apiUsage: defineTable({
    service: v.string(), // 'gemini_2_5_flash_lite', 'convex', 'clerk', etc.
    endpoint: v.string(), // API endpoint called
    method: v.string(), // HTTP method or operation type
    userId: v.optional(v.id('users')), // User making the request
    requestCount: v.number(), // Number of requests in this time window
    tokenUsage: v.optional(v.number()), // Total tokens used
    cost: v.optional(v.number()), // Cost in USD
    timeWindow: v.number(), // Hour bucket for aggregation (Unix timestamp)
    avgResponseTime: v.number(), // Average response time in ms
    errorCount: v.number(), // Number of failed requests
    successCount: v.number(), // Number of successful requests
    maxResponseTime: v.optional(v.number()), // Peak response time
    minResponseTime: v.optional(v.number()), // Fastest response time
    dataTransferBytes: v.optional(v.number()), // Bytes transferred
  })
    .index('by_service_time', ['service', 'timeWindow'])
    .index('by_user_service_time', ['userId', 'service', 'timeWindow'])
    .index('by_cost', ['cost'])
    .index('by_error_rate', ['errorCount', 'successCount'])
    .index('by_time_window', ['timeWindow'])
    .index('by_service_cost_time', ['service', 'cost', 'timeWindow']),

  // System performance tracking (new table)
  performanceMetrics: defineTable({
    metricType: v.union(
      v.literal('response_time'),
      v.literal('throughput'),
      v.literal('error_rate'),
      v.literal('memory_usage'),
      v.literal('cpu_usage'),
      v.literal('database_connections'),
      v.literal('queue_depth')
    ),
    service: v.string(), // Service being measured
    value: v.number(), // Metric value
    unit: v.string(), // 'ms', 'requests/sec', 'percentage', 'bytes', etc.
    timestamp: v.number(),
    timeWindow: v.number(), // Aggregation window (5min, 15min, 1hour, etc.)
    tags: v.optional(v.array(v.string())), // Additional categorization
    metadata: v.optional(
      v.object({
        region: v.optional(v.string()),
        version: v.optional(v.string()),
        environment: v.optional(v.string()),
        threshold: v.optional(v.number()), // Performance threshold if applicable
        anomaly: v.optional(v.boolean()), // Whether this is an anomalous reading
        recordsScanned: v.optional(v.number()), // For database query efficiency
        recordsReturned: v.optional(v.number()), // For database query efficiency
      })
    ),
  })
    .index('by_service_type_time', ['service', 'metricType', 'timestamp'])
    .index('by_type_timestamp', ['metricType', 'timestamp'])
    .index('by_time_window', ['timeWindow'])
    .index('by_service_timestamp', ['service', 'timestamp']),

  // Data change tracking (new table)
  auditTrail: defineTable({
    entityType: v.string(), // 'users', 'journalEntries', 'aiAnalysis', etc.
    entityId: v.string(), // ID of the changed entity
    action: v.union(
      v.literal('create'),
      v.literal('update'),
      v.literal('delete'),
      v.literal('read') // For sensitive data access tracking
    ),
    userId: v.optional(v.id('users')), // User who made the change
    sessionId: v.optional(v.string()), // Session tracking
    timestamp: v.number(),
    changes: v.optional(
      v.object({
        before: v.optional(v.any()), // Previous state (for updates/deletes)
        after: v.optional(v.any()), // New state (for creates/updates)
        fieldChanges: v.optional(v.array(v.string())), // List of changed fields
      })
    ),
    metadata: v.optional(
      v.object({
        reason: v.optional(v.string()), // Reason for the change
        source: v.optional(v.string()), // 'web', 'api', 'scheduled_job', etc.
        ipAddress: v.optional(v.string()), // Client IP if available
        userAgent: v.optional(v.string()), // Client user agent
        requestId: v.optional(v.string()), // Request correlation ID
      })
    ),
  })
    .index('by_entity_type_id', ['entityType', 'entityId'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_action_timestamp', ['action', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_entity_type_timestamp', ['entityType', 'timestamp']),

  // Health Check Results (Story AI-Migration.6)
  healthCheckResults: defineTable({
    service: v.string(), // Service name (e.g., 'gemini_2_5_flash_lite', 'convex_database')
    serviceType: v.union(
      v.literal('ai_service'),
      v.literal('database'),
      v.literal('queue'),
      v.literal('external_dependency'),
      v.literal('circuit_breaker')
    ),
    status: v.union(
      v.literal('healthy'),
      v.literal('degraded'),
      v.literal('unhealthy'),
      v.literal('unknown')
    ),
    responseTime: v.number(), // Health check response time in ms
    message: v.string(), // Human-readable status message
    details: v.any(), // Service-specific health details
    checkedAt: v.number(), // When the health check was performed
  })
    .index('by_service_time', ['service', 'checkedAt'])
    .index('by_service_type_time', ['serviceType', 'checkedAt'])
    .index('by_status_time', ['status', 'checkedAt'])
    .index('by_service_status', ['service', 'status']),

  // System Health Aggregation (Story AI-Migration.6)
  systemHealth: defineTable({
    overallStatus: v.union(
      v.literal('healthy'),
      v.literal('degraded'),
      v.literal('unhealthy'),
      v.literal('unknown')
    ),
    healthScore: v.number(), // 0-100 overall health score
    servicesSummary: v.object({
      total: v.number(),
      healthy: v.number(),
      degraded: v.number(),
      unhealthy: v.number(),
    }),
    checkedAt: v.number(), // When the system health was calculated
    checkDuration: v.number(), // How long the health check took in ms
  })
    .index('by_checked_at', ['checkedAt'])
    .index('by_status_time', ['overallStatus', 'checkedAt']),

  // Health Check Scheduling (Story AI-Migration.6)
  healthCheckSchedule: defineTable({
    intervalMinutes: v.number(), // How often to run health checks
    nextScheduledAt: v.number(), // When the next health check should run
    isActive: v.boolean(), // Whether this schedule is currently active
    createdAt: v.number(),
  })
    .index('by_active_next', ['isActive', 'nextScheduledAt'])
    .index('by_created_at', ['createdAt']),

  // Failure Detection System (Story AI-Migration.6 AC-5)
  failureDetections: defineTable({
    pattern: v.union(
      v.literal('error_spike'),
      v.literal('performance_degradation'),
      v.literal('cascade_failure'),
      v.literal('resource_exhaustion'),
      v.literal('dependency_failure')
    ),
    severity: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    confidence: v.number(), // 0-1 confidence score
    status: v.union(
      v.literal('active'),
      v.literal('investigating'),
      v.literal('resolved'),
      v.literal('suppressed')
    ),
    affectedServices: v.array(v.string()),
    correlatedFailures: v.array(v.string()),
    rootCauseAnalysis: v.object({
      primaryCause: v.string(),
      contributingFactors: v.array(v.string()),
      timeline: v.array(
        v.object({
          timestamp: v.number(),
          event: v.string(),
          service: v.string(),
        })
      ),
    }),
    recommendations: v.array(
      v.object({
        action: v.string(),
        priority: v.union(
          v.literal('immediate'),
          v.literal('high'),
          v.literal('medium'),
          v.literal('low')
        ),
        estimatedImpact: v.string(),
      })
    ),
    detectedAt: v.number(),
    investigationStarted: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolution: v.optional(v.string()),
    resolutionNotes: v.optional(v.string()),
    resolvedBy: v.optional(v.string()), // User ID who resolved
    metadata: v.optional(v.any()), // Additional detection metadata
  })
    .index('by_pattern_status', ['pattern', 'status'])
    .index('by_severity_detected', ['severity', 'detectedAt'])
    .index('by_status_detected', ['status', 'detectedAt'])
    .index('by_detected_at', ['detectedAt']),

  // LangExtract Performance Metrics (Story LangExtract-3)
  langExtractMetrics: defineTable({
    userId: v.id('users'),
    entryId: v.id('journalEntries'),
    processingTimeMs: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    extractedEntitiesCount: v.number(),
    structuredDataSize: v.object({
      emotions: v.number(),
      themes: v.number(),
      triggers: v.number(),
      communication: v.number(),
      relationships: v.number(),
    }),
    langExtractVersion: v.string(),
    fallbackUsed: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_success', ['success'])
    .index('by_created_at', ['createdAt'])
    .index('by_user_created', ['userId', 'createdAt']),

  // LangExtract Aggregate Metrics (Story LangExtract-3)
  langExtractAggregateMetrics: defineTable({
    hourBucket: v.number(), // Hour timestamp for aggregation
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalProcessingTime: v.number(),
    averageProcessingTime: v.number(),
    totalEntitiesExtracted: v.number(),
    fallbackUsageCount: v.number(),
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index('by_hour', ['hourBucket'])
    .index('by_created_at', ['createdAt']),
})
