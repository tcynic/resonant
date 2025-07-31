/**
 * AI Processing Helper Utilities for Convex
 * Shared utilities for AI analysis queue management and processing
 */

import { AnalysisType } from '../../src/lib/types'

// Rate limiting and queue configuration
export const AI_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: parseInt(process.env.AI_ANALYSIS_RATE_LIMIT || '60'),
  BATCH_SIZE: parseInt(process.env.AI_ANALYSIS_BATCH_SIZE || '10'),
  RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 30000, // 30 seconds
  ANALYSIS_TIMEOUT: parseInt(process.env.AI_ANALYSIS_TIMEOUT || '30000'), // 30 seconds

  // Cost tracking (estimated costs in USD)
  ESTIMATED_COST_PER_TOKEN: 0.00001, // $0.01 per 1000 tokens
  MAX_DAILY_COST: 10.0, // $10 daily limit

  // Priority queue settings
  PRIORITY_WEIGHTS: {
    high: 3,
    normal: 1,
    low: 0.5,
  },
} as const

// Analysis type priorities and dependencies
export const ANALYSIS_DEPENDENCIES: Record<AnalysisType, AnalysisType[]> = {
  sentiment: [], // Base analysis, no dependencies
  emotional_stability: ['sentiment'], // Requires sentiment history
  energy_impact: [], // Independent analysis
  conflict_resolution: ['sentiment'], // Uses sentiment as input
  gratitude: [], // Independent analysis
}

// Analysis processing order based on dependencies
export const ANALYSIS_PROCESSING_ORDER: AnalysisType[] = [
  'sentiment', // Must be first (base for others)
  'energy_impact', // Independent
  'gratitude', // Independent
  'emotional_stability', // Depends on sentiment
  'conflict_resolution', // Depends on sentiment
]

/**
 * Sort analysis types by processing order and dependencies
 */
export function sortAnalysisTypesByDependencies(
  types: AnalysisType[]
): AnalysisType[] {
  return ANALYSIS_PROCESSING_ORDER.filter(type => types.includes(type))
}

/**
 * Calculate exponential backoff delay for retries
 */
export function calculateRetryDelay(attempt: number): number {
  const baseDelay = AI_CONFIG.RETRY_BASE_DELAY
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitteredDelay = exponentialDelay * (0.8 + Math.random() * 0.4) // Add 20% jitter

  return Math.min(jitteredDelay, AI_CONFIG.MAX_RETRY_DELAY)
}

/**
 * Calculate priority score for queue scheduling
 */
export function calculatePriorityScore(
  priority: 'high' | 'normal' | 'low',
  analysisType: AnalysisType,
  retryAttempt: number = 0
): number {
  const basePriority = AI_CONFIG.PRIORITY_WEIGHTS[priority]

  // Boost priority for base analyses that others depend on
  const dependencyBoost = analysisType === 'sentiment' ? 1.5 : 1.0

  // Reduce priority for retries to prevent retry loops from blocking new work
  const retryPenalty = Math.pow(0.8, retryAttempt)

  return basePriority * dependencyBoost * retryPenalty
}

/**
 * Validate analysis configuration and environment
 */
export function validateAnalysisEnvironment(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required environment variables
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    errors.push('GOOGLE_GEMINI_API_KEY environment variable is required')
  }

  // Validate rate limit configuration
  if (
    AI_CONFIG.MAX_REQUESTS_PER_MINUTE < 1 ||
    AI_CONFIG.MAX_REQUESTS_PER_MINUTE > 1000
  ) {
    warnings.push(
      'AI_ANALYSIS_RATE_LIMIT should be between 1 and 1000 requests per minute'
    )
  }

  // Validate batch size
  if (AI_CONFIG.BATCH_SIZE < 1 || AI_CONFIG.BATCH_SIZE > 50) {
    warnings.push('AI_ANALYSIS_BATCH_SIZE should be between 1 and 50')
  }

  // Validate timeout
  if (
    AI_CONFIG.ANALYSIS_TIMEOUT < 5000 ||
    AI_CONFIG.ANALYSIS_TIMEOUT > 120000
  ) {
    warnings.push('AI_ANALYSIS_TIMEOUT should be between 5 and 120 seconds')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generate analysis metadata for tracking
 */
export function generateAnalysisMetadata(
  startTime: number,
  tokenCount?: number,
  modelVersion: string = 'gemini-2.5-flash-lite'
): {
  modelVersion: string
  processingTime: number
  tokenCount?: number
  apiCosts?: number
} {
  const processingTime = Date.now() - startTime

  const metadata = {
    modelVersion,
    processingTime,
    tokenCount,
    apiCosts: tokenCount
      ? tokenCount * AI_CONFIG.ESTIMATED_COST_PER_TOKEN
      : undefined,
  }

  return metadata
}

/**
 * Check if daily cost limit has been exceeded
 */
export function checkDailyCostLimit(todaysCosts: number): {
  withinLimit: boolean
  remainingBudget: number
  warningThreshold: boolean
} {
  const remainingBudget = AI_CONFIG.MAX_DAILY_COST - todaysCosts
  const warningThreshold = todaysCosts > AI_CONFIG.MAX_DAILY_COST * 0.8 // 80% warning

  return {
    withinLimit: remainingBudget > 0,
    remainingBudget,
    warningThreshold,
  }
}

/**
 * Sanitize journal entry content for AI analysis
 */
export function sanitizeJournalContent(content: string): string {
  // Remove potential PII patterns (emails, phone numbers, addresses)
  const sanitized = content
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Remove phone numbers (basic patterns)
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    // Remove potential SSN patterns
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
    // Remove potential credit card patterns
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
    // Trim excessive whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate if too long (AI models have token limits)
  const maxLength = 2000 // Conservative limit for analysis
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength) + '...'
  }

  return sanitized
}

/**
 * Create analysis task identifier for tracking
 */
export function createAnalysisTaskId(
  userId: string,
  journalEntryId: string,
  analysisType: AnalysisType
): string {
  return `${userId}_${journalEntryId}_${analysisType}_${Date.now()}`
}

/**
 * Parse and validate AI response structure
 */
export function validateAIResponse(
  response: any,
  analysisType: AnalysisType
): {
  valid: boolean
  errors: string[]
  normalizedResponse: any
} {
  const errors: string[] = []

  // Common validation
  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object')
    return { valid: false, errors, normalizedResponse: null }
  }

  if (
    typeof response.confidence !== 'number' ||
    response.confidence < 0 ||
    response.confidence > 1
  ) {
    errors.push('Confidence must be a number between 0 and 1')
  }

  // Type-specific validation
  switch (analysisType) {
    case 'sentiment':
      if (
        typeof response.sentiment_score !== 'number' ||
        response.sentiment_score < 1 ||
        response.sentiment_score > 10
      ) {
        errors.push('Sentiment score must be a number between 1 and 10')
      }
      if (!Array.isArray(response.emotions_detected)) {
        errors.push('Emotions detected must be an array')
      }
      break

    case 'emotional_stability':
      if (
        typeof response.stability_score !== 'number' ||
        response.stability_score < 0 ||
        response.stability_score > 100
      ) {
        errors.push('Stability score must be a number between 0 and 100')
      }
      break

    case 'energy_impact':
      if (
        typeof response.energy_impact_score !== 'number' ||
        response.energy_impact_score < 1 ||
        response.energy_impact_score > 10
      ) {
        errors.push('Energy impact score must be a number between 1 and 10')
      }
      break

    default:
      // For other types, just check basic structure
      break
  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedResponse: response,
  }
}

/**
 * Create batch processing schedule with rate limiting
 */
export function createBatchSchedule(
  itemCount: number,
  batchSize: number = AI_CONFIG.BATCH_SIZE,
  rateLimitPerMinute: number = AI_CONFIG.MAX_REQUESTS_PER_MINUTE
): Array<{ batchIndex: number; itemsInBatch: number; delayMs: number }> {
  const batches = Math.ceil(itemCount / batchSize)
  const minDelayBetweenBatches = (60000 / rateLimitPerMinute) * batchSize // Ensure rate limit compliance

  const schedule: any[] = []

  for (let i = 0; i < batches; i++) {
    const remainingItems = itemCount - i * batchSize
    const itemsInBatch = Math.min(batchSize, remainingItems)
    const delayMs = i * minDelayBetweenBatches

    schedule.push({
      batchIndex: i,
      itemsInBatch,
      delayMs,
    })
  }

  return schedule
}

/**
 * Log analysis performance metrics
 */
export function logAnalysisMetrics(
  analysisType: AnalysisType,
  processingTime: number,
  tokenCount?: number,
  success: boolean = true,
  error?: string
): void {
  const metrics = {
    timestamp: new Date().toISOString(),
    analysisType,
    processingTime,
    tokenCount,
    success,
    error,
  }

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('AI Analysis Metrics:', JSON.stringify(metrics, null, 2))
  }

  // In production, this could be sent to monitoring service
  // Example: sendToMonitoring(metrics)
}
