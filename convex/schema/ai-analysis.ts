import { v } from 'convex/values'
import { langExtractDataSchema } from './langextract-types'

export const aiAnalysisSchema = {
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
    v.literal('pending'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('failed'),
    v.literal('fallback_completed'), // Story AI-Migration.4
    v.literal('recovery_pending'), // Story AI-Migration.4
    v.literal('upgrade_pending') // Story AI-Migration.4
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
}
