import { v } from 'convex/values'

export const monitoringSchemas = {
  // System Monitoring and Alerting (Story AI-Migration.6)
  systemMonitoring: {
    service: v.string(), // 'gemini_2_5_flash_lite', 'convex_functions', 'queue_system'
    metric: v.string(), // 'response_time', 'error_rate', 'throughput', 'availability'
    value: v.number(),
    threshold: v.optional(v.number()), // Alert threshold for this metric
    status: v.union(
      v.literal('healthy'),
      v.literal('warning'),
      v.literal('critical'),
      v.literal('unknown')
    ),
    region: v.optional(v.string()), // Geographic region
    metadata: v.optional(
      v.object({
        sampleSize: v.optional(v.number()),
        timeWindow: v.optional(v.string()),
        aggregationType: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
    ),
    timestamp: v.number(),
  },

  alertHistory: {
    alertId: v.string(), // Unique identifier for alert
    service: v.string(),
    metric: v.string(),
    severity: v.union(
      v.literal('info'),
      v.literal('warning'),
      v.literal('critical')
    ),
    message: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('acknowledged'),
      v.literal('resolved')
    ),
    acknowledgedBy: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    escalationLevel: v.optional(v.number()),
    notificationsSent: v.optional(v.array(v.string())),
    metadata: v.optional(
      v.object({
        thresholdValue: v.optional(v.number()),
        actualValue: v.optional(v.number()),
        duration: v.optional(v.number()),
        affectedUsers: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  },

  // Performance Metrics (Story AI-Migration.6)
  performanceMetrics: {
    service: v.string(),
    operation: v.string(), // 'ai_analysis', 'queue_processing', 'db_query'
    duration: v.number(), // milliseconds
    success: v.boolean(),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    entryId: v.optional(v.id('journalEntries')),
    batchId: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        tokensUsed: v.optional(v.number()),
        cost: v.optional(v.number()),
        cacheHit: v.optional(v.boolean()),
        retryCount: v.optional(v.number()),
        queueWaitTime: v.optional(v.number()),
      })
    ),
    timestamp: v.number(),
  },

  // Circuit Breaker State Tracking (Story AI-Migration.4)
  circuitBreakerStates: {
    service: v.string(), // Service identifier
    state: v.union(
      v.literal('closed'),
      v.literal('open'),
      v.literal('half_open')
    ),
    failureCount: v.number(),
    successCount: v.number(), // For half-open state tracking
    lastFailure: v.optional(v.number()),
    lastSuccess: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    failureThreshold: v.number(),
    timeout: v.number(), // Circuit breaker timeout in ms
    metadata: v.optional(
      v.object({
        recentFailures: v.optional(v.array(v.string())),
        avgResponseTime: v.optional(v.number()),
        errorRate: v.optional(v.number()),
        lastErrorType: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  },

  // Queue Health Metrics (Story AI-Migration.2)
  queueHealthMetrics: {
    queueType: v.union(
      v.literal('ai_analysis'),
      v.literal('high_priority'),
      v.literal('dead_letter')
    ),
    totalItems: v.number(),
    processingItems: v.number(),
    completedItems: v.number(),
    failedItems: v.number(),
    averageWaitTime: v.number(), // milliseconds
    averageProcessingTime: v.number(), // milliseconds
    throughput: v.number(), // items per minute
    errorRate: v.number(), // percentage
    oldestItem: v.optional(v.number()), // timestamp of oldest queued item
    queueCapacity: v.number(),
    utilizationRate: v.number(), // percentage
    metadata: v.optional(
      v.object({
        priorityDistribution: v.optional(
          v.object({
            normal: v.number(),
            high: v.number(),
            urgent: v.number(),
          })
        ),
        recentErrors: v.optional(v.array(v.string())),
      })
    ),
    timestamp: v.number(),
  },

  // Cost Monitoring (Story AI-Migration.6)
  costTracking: {
    service: v.string(), // 'gemini_2_5_flash_lite', 'convex', etc.
    operation: v.string(),
    cost: v.number(), // in USD
    tokensUsed: v.optional(v.number()),
    userId: v.optional(v.id('users')),
    userTier: v.optional(v.union(v.literal('free'), v.literal('premium'))),
    billingPeriod: v.string(), // 'YYYY-MM' format
    metadata: v.optional(
      v.object({
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        model: v.optional(v.string()),
        region: v.optional(v.string()),
        cacheUsed: v.optional(v.boolean()),
      })
    ),
    timestamp: v.number(),
  },

  // LangExtract Performance Metrics (Story LangExtract-2)
  langExtractMetrics: {
    operation: v.union(
      v.literal('preprocess'),
      v.literal('extract'),
      v.literal('validate')
    ),
    duration: v.number(), // milliseconds
    success: v.boolean(),
    tokensProcessed: v.optional(v.number()),
    structuredDataGenerated: v.optional(v.boolean()),
    fallbackUsed: v.optional(v.boolean()),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    entryId: v.optional(v.id('journalEntries')),
    userId: v.optional(v.id('users')),
    metadata: v.optional(
      v.object({
        inputLength: v.optional(v.number()),
        outputFields: v.optional(v.number()),
        confidenceScore: v.optional(v.number()),
        validationErrors: v.optional(v.array(v.string())),
      })
    ),
    timestamp: v.number(),
  },

  // Aggregate LangExtract Performance (Story LangExtract-2)
  langExtractAggregateMetrics: {
    timeWindow: v.string(), // 'hourly', 'daily', 'weekly'
    period: v.string(), // ISO 8601 timestamp
    totalOperations: v.number(),
    successfulOperations: v.number(),
    failedOperations: v.number(),
    averageDuration: v.number(),
    averageConfidence: v.optional(v.number()),
    fallbackRate: v.number(), // percentage
    errorBreakdown: v.optional(
      v.object({
        network: v.number(),
        timeout: v.number(),
        validation: v.number(),
        service: v.number(),
        other: v.number(),
      })
    ),
    performanceGrade: v.union(
      v.literal('excellent'),
      v.literal('good'),
      v.literal('fair'),
      v.literal('poor')
    ),
    recommendations: v.optional(v.array(v.string())),
    createdAt: v.number(),
  },
}
