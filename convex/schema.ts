import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

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
              v.literal('every2days'),
              v.literal('weekly')
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
    .index('by_processing_started', ['processingStartedAt']),

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
})
