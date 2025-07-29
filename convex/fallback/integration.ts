/**
 * Fallback Analysis Integration Module
 * Seamlessly integrates rule-based fallback analysis with main AI processing pipeline
 * Handles circuit breaker states, retry decisions, and quality assessment (Story AI-Migration.4)
 */

import { v } from 'convex/values'
import { internal } from '../_generated/api'
import { Doc } from '../_generated/dataModel'
import {
  analyzeSentimentFallback,
  validateFallbackResult,
  FallbackAnalysisResult,
} from './sentiment_analysis'
import {
  analyzePatterns,
  performAdvancedPatternAnalysis,
  generatePatternRecommendations,
} from './pattern_matching'
import {
  calculateRetryStrategy,
  createRetryContext,
  isFallbackEligible,
} from '../utils/retry_strategy'
import { getCircuitBreakerStatus } from '../utils/circuit_breaker'

/**
 * Enhanced fallback analysis result with integration metadata
 */
export interface IntegratedFallbackResult {
  // Core fallback analysis
  fallbackAnalysis: FallbackAnalysisResult
  patternAnalysis: ReturnType<typeof analyzePatterns>
  patternRecommendations: ReturnType<typeof generatePatternRecommendations>

  // Integration metadata
  integration: {
    fallbackTrigger:
      | 'circuit_breaker_open'
      | 'retry_exhausted'
      | 'api_unavailable'
      | 'manual_request'
    circuitBreakerState: 'open' | 'half_open' | 'closed'
    qualityAssessment: ReturnType<typeof validateFallbackResult>
    processingTime: number
    confidence: number
    shouldStoreResults: boolean
    aiComparisonAvailable: boolean
  }

  // Standardized output format (compatible with AI analysis results)
  standardizedResults: {
    sentimentScore: number // -1 to 1 scale
    emotionalKeywords: string[]
    confidenceLevel: number
    reasoning: string
    patterns?: {
      recurring_themes: string[]
      emotional_triggers: string[]
      communication_style: string
      relationship_dynamics: string[]
    }
    metadata: {
      analysisMethod: 'fallback_analysis'
      processingTime: number
      fallbackReason: string
      qualityScore: number
    }
  }
}

/**
 * Main integration function - decides when and how to use fallback analysis
 */
export async function executeFallbackAnalysis(
  ctx: any,
  entryId: string,
  userId: string,
  journalContent: string,
  options: {
    fallbackTrigger?:
      | 'circuit_breaker_open'
      | 'retry_exhausted'
      | 'api_unavailable'
      | 'manual_request'
    previousEntries?: string[]
    relationshipContext?: string
    retryCount?: number
    originalError?: string
  } = {}
): Promise<IntegratedFallbackResult> {
  const startTime = Date.now()

  const {
    fallbackTrigger = 'api_unavailable',
    previousEntries = [],
    relationshipContext,
    retryCount = 0,
    originalError = 'AI API unavailable',
  } = options

  // Get circuit breaker state for context
  const circuitBreakerState = await getCircuitBreakerStatus(ctx, 'gemini_2_5_flash_lite')

  // Perform core fallback analysis
  const fallbackAnalysis = analyzeSentimentFallback(
    journalContent,
    `${fallbackTrigger}: ${originalError}`
  )

  // Perform pattern analysis with historical context if available
  const patternAnalysis =
    previousEntries.length > 0
      ? performAdvancedPatternAnalysis(journalContent, previousEntries)
      : analyzePatterns(journalContent)

  // Generate actionable recommendations
  const patternRecommendations = generatePatternRecommendations(patternAnalysis)

  // Validate fallback result quality
  const qualityAssessment = validateFallbackResult(fallbackAnalysis)

  // Calculate overall confidence combining sentiment and pattern analysis
  const combinedConfidence = calculateCombinedConfidence(
    fallbackAnalysis.confidenceScore,
    patternAnalysis.confidenceScore,
    qualityAssessment.qualityScore
  )

  // Determine if results should be stored (quality threshold)
  const shouldStoreResults =
    combinedConfidence >= 0.3 && qualityAssessment.isValid

  // Convert to standardized format compatible with AI analysis results
  const standardizedResults = convertToStandardFormat(
    fallbackAnalysis,
    patternAnalysis,
    relationshipContext,
    startTime
  )

  const processingTime = Date.now() - startTime

  return {
    fallbackAnalysis,
    patternAnalysis,
    patternRecommendations,
    integration: {
      fallbackTrigger,
      circuitBreakerState: circuitBreakerState.status as 'closed' | 'open' | 'half_open',
      qualityAssessment,
      processingTime,
      confidence: combinedConfidence,
      shouldStoreResults,
      aiComparisonAvailable: false, // Set to true when we have AI result to compare
    },
    standardizedResults: {
      ...standardizedResults,
      confidenceLevel: combinedConfidence,
    },
  }
}

/**
 * Integrate fallback analysis into the main AI processing pipeline
 * Called when circuit breaker is open or retry strategy recommends fallback
 */
export async function handleFallbackInPipeline(
  ctx: any,
  analysisRequest: {
    entryId: string
    userId: string
    journalContent: string
    relationshipContext?: string
    retryCount: number
    originalError: string
    analysisId?: string
  }
): Promise<{
  success: boolean
  analysisId: string
  fallbackUsed: true
  results: IntegratedFallbackResult
}> {
  // Get journal entry context
  const journalEntry = await ctx.runQuery(
    internal.journalEntries.getForAnalysis,
    {
      entryId: analysisRequest.entryId,
    }
  )

  if (!journalEntry) {
    throw new Error('Journal entry not found for fallback analysis')
  }

  // Get previous entries for pattern analysis
  const previousAnalyses = await getPreviousAnalysesForFallback(
    ctx,
    analysisRequest.userId,
    5
  )
  const previousEntries = previousAnalyses
    .map((analysis: any) => analysis.originalContent)
    .filter(Boolean)

  // Determine fallback trigger based on context
  const circuitBreakerState = await getCircuitBreakerStatus(ctx, 'gemini_2_5_flash_lite')
  let fallbackTrigger:
    | 'circuit_breaker_open'
    | 'retry_exhausted'
    | 'api_unavailable'
    | 'manual_request'

  if (circuitBreakerState.status === 'open') {
    fallbackTrigger = 'circuit_breaker_open'
  } else if (analysisRequest.retryCount >= 3) {
    fallbackTrigger = 'retry_exhausted'
  } else {
    fallbackTrigger = 'api_unavailable'
  }

  // Execute integrated fallback analysis
  const fallbackResults = await executeFallbackAnalysis(
    ctx,
    analysisRequest.entryId,
    analysisRequest.userId,
    analysisRequest.journalContent,
    {
      fallbackTrigger,
      previousEntries,
      relationshipContext: analysisRequest.relationshipContext,
      retryCount: analysisRequest.retryCount,
      originalError: analysisRequest.originalError,
    }
  )

  // Store results if quality is sufficient
  let analysisId: string

  if (fallbackResults.integration.shouldStoreResults) {
    if (analysisRequest.analysisId) {
      // Update existing analysis record
      await ctx.runMutation(internal.aiAnalysis.completeFallbackAnalysis, {
        analysisId: analysisRequest.analysisId,
        results: fallbackResults.standardizedResults,
        fallbackMetadata: {
          trigger: fallbackTrigger,
          qualityScore:
            fallbackResults.integration.qualityAssessment.qualityScore,
          confidence: fallbackResults.integration.confidence,
          processingTime: fallbackResults.integration.processingTime,
          patternInsights: fallbackResults.patternAnalysis.relationshipInsights,
          recommendations:
            fallbackResults.patternRecommendations.actionableInsights,
        },
      })
      analysisId = analysisRequest.analysisId
    } else {
      // Create new analysis record
      analysisId = await ctx.runMutation(
        internal.aiAnalysis.storeFallbackResult,
        {
          entryId: analysisRequest.entryId,
          userId: analysisRequest.userId,
          relationshipId: journalEntry.relationshipId,
          ...fallbackResults.standardizedResults,
          fallbackMetadata: {
            trigger: fallbackTrigger,
            qualityScore:
              fallbackResults.integration.qualityAssessment.qualityScore,
            confidence: fallbackResults.integration.confidence,
            processingTime: fallbackResults.integration.processingTime,
            patternInsights:
              fallbackResults.patternAnalysis.relationshipInsights,
            recommendations:
              fallbackResults.patternRecommendations.actionableInsights,
          },
        }
      )
    }
  } else {
    // Store with low quality marker for debugging
    if (analysisRequest.analysisId) {
      await ctx.runMutation(internal.aiAnalysis.markFallbackLowQuality, {
        analysisId: analysisRequest.analysisId,
        reason: fallbackResults.integration.qualityAssessment.issues.join('; '),
        confidence: fallbackResults.integration.confidence,
      })
      analysisId = analysisRequest.analysisId
    } else {
      analysisId = await ctx.runMutation(
        internal.aiAnalysis.createFailedAnalysis,
        {
          entryId: analysisRequest.entryId,
          userId: analysisRequest.userId,
          error: `Fallback analysis quality too low: ${fallbackResults.integration.qualityAssessment.issues.join('; ')}`,
          processingAttempts: analysisRequest.retryCount + 1,
        }
      )
    }
  }

  return {
    success: true,
    analysisId,
    fallbackUsed: true,
    results: fallbackResults,
  }
}

/**
 * Enhanced circuit breaker integration with fallback decision logic
 */
export async function shouldUseFallbackAnalysis(
  ctx: any,
  entryId: string,
  userId: string,
  error: string,
  retryCount: number = 0
): Promise<{
  useFallback: boolean
  reason: string
  circuitBreakerState: string
  retryRecommendation?: any
}> {
  // Get circuit breaker state
  const circuitBreakerState = await getCircuitBreakerStatus(ctx, 'gemini_2_5_flash_lite')

  // Create retry context for analysis
  const mockAnalysis = {
    _id: 'temp-id',
    priority: 'normal' as const,
    processingAttempts: retryCount,
    queuedAt: Date.now() - 5000,
    createdAt: Date.now() - 10000,
    lastProcessingAttempt: Date.now() - 1000,
    circuitBreakerState: {
      state: circuitBreakerState.status,
      failureCount: circuitBreakerState.failureCount || 0,
    },
  }

  const retryContext = createRetryContext(mockAnalysis, error)
  const retryRecommendation = calculateRetryStrategy(retryContext)

  // Decision logic for fallback usage
  let useFallback = false
  let reason = ''

  if (circuitBreakerState.status === 'open') {
    useFallback = true
    reason = 'Circuit breaker is OPEN - using fallback analysis'
  } else if (
    !retryRecommendation.shouldRetry &&
    isFallbackEligible(retryRecommendation.errorClassification.type)
  ) {
    useFallback = true
    reason = 'Retry strategy recommends fallback after exhausting retries'
  } else if (
    retryCount >= 3 &&
    isFallbackEligible(retryRecommendation.errorClassification.type)
  ) {
    useFallback = true
    reason = 'Maximum retries exceeded - falling back to rule-based analysis'
  } else if (
    error.toLowerCase().includes('rate limit') &&
    isFallbackEligible(retryRecommendation.errorClassification.type)
  ) {
    useFallback = true
    reason =
      'Rate limit encountered - using fallback to maintain service availability'
  }

  return {
    useFallback,
    reason,
    circuitBreakerState: circuitBreakerState.status,
    retryRecommendation: retryRecommendation.shouldRetry
      ? retryRecommendation
      : undefined,
  }
}

/**
 * Calculate combined confidence from multiple analysis sources
 */
function calculateCombinedConfidence(
  sentimentConfidence: number,
  patternConfidence: number,
  qualityScore: number
): number {
  // Weighted combination: sentiment (40%), patterns (30%), quality (30%)
  const combined =
    sentimentConfidence * 0.4 + patternConfidence * 0.3 + qualityScore * 0.3

  // Apply bonuses for multiple signal sources
  let bonus = 0
  if (sentimentConfidence > 0.5 && patternConfidence > 0.5) {
    bonus += 0.1 // Multiple strong signals
  }
  if (qualityScore > 0.7) {
    bonus += 0.05 // High quality analysis
  }

  return Math.min(0.95, Math.max(0.1, combined + bonus)) // Cap between 0.1 and 0.95
}

/**
 * Convert fallback analysis results to standardized format compatible with AI analysis
 */
function convertToStandardFormat(
  fallbackAnalysis: FallbackAnalysisResult,
  patternAnalysis: ReturnType<typeof analyzePatterns>,
  relationshipContext?: string,
  startTime: number = Date.now()
): IntegratedFallbackResult['standardizedResults'] {
  // Convert sentiment score from categorical to numeric (-1 to 1 scale)
  let sentimentScore: number
  switch (fallbackAnalysis.sentiment) {
    case 'positive':
      sentimentScore = 0.5 + fallbackAnalysis.confidenceScore * 0.5 // 0.5 to 1.0
      break
    case 'negative':
      sentimentScore = -0.5 - fallbackAnalysis.confidenceScore * 0.5 // -1.0 to -0.5
      break
    default:
      sentimentScore = 0 // neutral
  }

  // Extract emotional keywords from metadata
  const emotionalKeywords = fallbackAnalysis.metadata.keywordsMatched
    .map(keyword => keyword.replace(/^[+-]/, '').replace(/^rel:/, ''))
    .filter((keyword, index, arr) => arr.indexOf(keyword) === index) // Remove duplicates

  // Combine insights from both analyses
  const combinedInsights = [
    ...fallbackAnalysis.insights,
    ...patternAnalysis.relationshipInsights,
  ]

  // Create reasoning from analysis results
  const reasoning = createFallbackReasoning(
    fallbackAnalysis,
    patternAnalysis,
    combinedInsights
  )

  // Create patterns object compatible with AI analysis format
  const patterns =
    patternAnalysis.matches.length > 0
      ? {
          recurring_themes: extractRecurringThemes(patternAnalysis),
          emotional_triggers: extractEmotionalTriggers(
            fallbackAnalysis,
            patternAnalysis
          ),
          communication_style: determineCommunicationStyle(patternAnalysis),
          relationship_dynamics: extractRelationshipDynamics(patternAnalysis),
        }
      : undefined

  return {
    sentimentScore,
    emotionalKeywords,
    confidenceLevel: 0, // Will be set by caller
    reasoning,
    patterns,
    metadata: {
      analysisMethod: 'fallback_analysis',
      processingTime: Date.now() - startTime,
      fallbackReason: fallbackAnalysis.metadata.fallbackReason,
      qualityScore: 0, // Will be set by caller
    },
  }
}

/**
 * Helper functions for standardized format conversion
 */
function createFallbackReasoning(
  sentiment: FallbackAnalysisResult,
  patterns: ReturnType<typeof analyzePatterns>,
  insights: string[]
): string {
  const reasoningParts = [
    `Sentiment analysis (${sentiment.method}): ${sentiment.sentiment} with ${Math.round(sentiment.confidenceScore * 100)}% confidence`,
    `Analysis identified ${sentiment.metadata.keywordsMatched.length} sentiment indicators`,
    `Pattern analysis found ${patterns.matches.length} relationship patterns`,
  ]

  if (patterns.dominantCategory) {
    reasoningParts.push(`Primary focus area: ${patterns.dominantCategory}`)
  }

  if (insights.length > 0) {
    reasoningParts.push(`Key insights: ${insights.slice(0, 2).join('; ')}`)
  }

  return reasoningParts.join('. ') + '.'
}

function extractRecurringThemes(
  patterns: ReturnType<typeof analyzePatterns>
): string[] {
  const themes = patterns.matches
    .filter(
      match =>
        match.sentiment === 'positive' ||
        Math.abs(patterns.categoryScores[match.category] || 0) > 0.5
    )
    .map(match => match.insight)
    .slice(0, 3)

  return themes.length > 0 ? themes : ['General relationship reflection']
}

function extractEmotionalTriggers(
  sentiment: FallbackAnalysisResult,
  patterns: ReturnType<typeof analyzePatterns>
): string[] {
  const triggers: string[] = []

  // From negative patterns
  patterns.matches
    .filter(match => match.sentiment === 'negative')
    .forEach(match => {
      if (match.category === 'conflict') {
        triggers.push('Conflict situations')
      } else if (match.category === 'communication') {
        triggers.push('Communication difficulties')
      } else if (match.category === 'stress') {
        triggers.push('External stressors')
      }
    })

  // From sentiment analysis rules
  if (sentiment.metadata.rulesFired.includes('question_uncertainty')) {
    triggers.push('Uncertainty and doubt')
  }

  return triggers.length > 0
    ? [...new Set(triggers)]
    : ['Relationship challenges']
}

function determineCommunicationStyle(
  patterns: ReturnType<typeof analyzePatterns>
): string {
  const communicationMatches = patterns.matches.filter(
    match => match.category === 'communication'
  )

  if (communicationMatches.length === 0) {
    return 'Communication style unclear from current entry'
  }

  const positiveComm = communicationMatches.filter(
    match => match.sentiment === 'positive'
  )
  const negativeComm = communicationMatches.filter(
    match => match.sentiment === 'negative'
  )

  if (positiveComm.length > negativeComm.length) {
    return 'Open and constructive communication approach'
  } else if (negativeComm.length > positiveComm.length) {
    return 'Communication challenges and barriers present'
  } else {
    return 'Mixed communication patterns observed'
  }
}

function extractRelationshipDynamics(
  patterns: ReturnType<typeof analyzePatterns>
): string[] {
  const dynamics: string[] = []

  Object.entries(patterns.categoryScores).forEach(([category, score]) => {
    if (Math.abs(score) > 0.5) {
      if (score > 0) {
        dynamics.push(`Positive ${category} dynamics`)
      } else {
        dynamics.push(
          `${category.charAt(0).toUpperCase() + category.slice(1)} challenges`
        )
      }
    }
  })

  return dynamics.length > 0 ? dynamics : ['Standard relationship interactions']
}

/**
 * Get previous analyses for fallback pattern matching
 */
async function getPreviousAnalysesForFallback(
  ctx: any,
  userId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    // This would need to be implemented in aiAnalysis.ts
    const analyses = await ctx.runQuery(
      internal.aiAnalysis.getRecentForFallback,
      {
        userId,
        limit,
      }
    )
    return analyses || []
  } catch (error) {
    console.warn(
      'Failed to get previous analyses for fallback pattern matching:',
      error
    )
    return []
  }
}
