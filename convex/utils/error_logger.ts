/**
 * Enhanced Error Logging and Categorization System (Story AI-Migration.4)
 * Provides structured error logging with categorization, context collection, and monitoring integration
 */

import { MutationCtx, QueryCtx } from '../_generated/server'
import { ConvexError } from 'convex/values'
import { Id } from '../_generated/dataModel'

export interface ErrorContext {
  userId?: string
  entryId?: string
  analysisId?: string
  service: string
  operation: string
  userAgent?: string
  clientVersion?: string
  sessionId?: string
  requestId?: string
  environment: 'development' | 'production' | 'staging'
  timestamp: number
}

export interface ErrorClassification {
  category:
    | 'network'
    | 'authentication'
    | 'validation'
    | 'service_error'
    | 'rate_limit'
    | 'timeout'
    | 'circuit_breaker'
    | 'fallback'
    | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retryable: boolean
  circuitBreakerImpact: boolean
  fallbackEligible: boolean
  userImpact: 'none' | 'minor' | 'major' | 'blocking'
  businessImpact: 'none' | 'low' | 'medium' | 'high'
  tags: string[]
}

export interface StructuredErrorLog {
  id?: string
  errorMessage: string
  errorCode?: string
  stackTrace?: string
  context: ErrorContext
  classification: ErrorClassification
  metadata: {
    duration?: number
    retryCount?: number
    circuitBreakerState?: string
    fallbackUsed?: boolean
    fallbackMethod?: string
    recoveryAction?: string
    correlationId?: string
    parentErrorId?: string
    errorChain?: string[]
  }
  resolution?: {
    resolved: boolean
    resolvedAt?: number
    resolvedBy?: 'auto_recovery' | 'manual_intervention' | 'retry' | 'fallback'
    resolvedAction?: string
    notes?: string
  }
  aggregationKey: string // For grouping similar errors
  fingerprint: string // Unique identifier for exact error pattern
}

/**
 * Advanced error classification engine
 */
export function classifyError(
  error: Error | string,
  context: Partial<ErrorContext> = {}
): ErrorClassification {
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerError = errorMessage.toLowerCase()
  const stack =
    typeof error === 'object' && error.stack ? error.stack : undefined

  // Default classification
  let classification: ErrorClassification = {
    category: 'unknown',
    severity: 'medium',
    retryable: true,
    circuitBreakerImpact: false,
    fallbackEligible: false,
    userImpact: 'minor',
    businessImpact: 'low',
    tags: [],
  }

  // Network and connectivity errors
  if (
    lowerError.includes('network') ||
    lowerError.includes('connection') ||
    lowerError.includes('fetch')
  ) {
    classification = {
      ...classification,
      category: 'network',
      severity: 'high',
      retryable: true,
      circuitBreakerImpact: true,
      fallbackEligible: true,
      userImpact: 'major',
      businessImpact: 'medium',
      tags: ['connectivity', 'infrastructure'],
    }
  }
  // Timeout errors
  else if (
    lowerError.includes('timeout') ||
    lowerError.includes('time out') ||
    lowerError.includes('deadline exceeded')
  ) {
    classification = {
      ...classification,
      category: 'timeout',
      severity: 'high',
      retryable: true,
      circuitBreakerImpact: true,
      fallbackEligible: true,
      userImpact: 'major',
      businessImpact: 'medium',
      tags: ['performance', 'latency'],
    }
  }
  // Rate limiting errors
  else if (
    lowerError.includes('rate limit') ||
    lowerError.includes('too many requests') ||
    lowerError.includes('quota exceeded')
  ) {
    classification = {
      ...classification,
      category: 'rate_limit',
      severity: 'medium',
      retryable: true,
      circuitBreakerImpact: true,
      fallbackEligible: true,
      userImpact: 'major',
      businessImpact: 'high',
      tags: ['quota', 'capacity'],
    }
  }
  // Authentication and authorization errors
  else if (
    lowerError.includes('authentication') ||
    lowerError.includes('unauthorized') ||
    lowerError.includes('forbidden') ||
    lowerError.includes('access denied')
  ) {
    classification = {
      ...classification,
      category: 'authentication',
      severity: 'medium',
      retryable: false,
      circuitBreakerImpact: false,
      fallbackEligible: false,
      userImpact: 'blocking',
      businessImpact: 'medium',
      tags: ['auth', 'security'],
    }
  }
  // Validation errors
  else if (
    lowerError.includes('validation') ||
    lowerError.includes('invalid') ||
    lowerError.includes('malformed') ||
    lowerError.includes('bad request')
  ) {
    classification = {
      ...classification,
      category: 'validation',
      severity: 'low',
      retryable: false,
      circuitBreakerImpact: false,
      fallbackEligible: false,
      userImpact: 'minor',
      businessImpact: 'low',
      tags: ['input', 'format'],
    }
  }
  // Circuit breaker errors
  else if (
    lowerError.includes('circuit breaker') ||
    lowerError.includes('circuit_breaker')
  ) {
    classification = {
      ...classification,
      category: 'circuit_breaker',
      severity: 'critical',
      retryable: false,
      circuitBreakerImpact: true,
      fallbackEligible: true,
      userImpact: 'blocking',
      businessImpact: 'high',
      tags: ['circuit_breaker', 'service_protection'],
    }
  }
  // Fallback processing indicators
  else if (
    lowerError.includes('fallback') ||
    lowerError.includes('backup analysis')
  ) {
    classification = {
      ...classification,
      category: 'fallback',
      severity: 'low',
      retryable: false,
      circuitBreakerImpact: false,
      fallbackEligible: false,
      userImpact: 'minor',
      businessImpact: 'low',
      tags: ['fallback', 'backup_processing'],
    }
  }
  // Service errors (API, server errors)
  else if (
    lowerError.includes('internal server error') ||
    lowerError.includes('service unavailable') ||
    lowerError.includes('api error')
  ) {
    classification = {
      ...classification,
      category: 'service_error',
      severity: 'high',
      retryable: true,
      circuitBreakerImpact: true,
      fallbackEligible: true,
      userImpact: 'major',
      businessImpact: 'high',
      tags: ['api', 'service'],
    }
  }

  // Enhance classification based on context
  if (context.service === 'gemini_2_5_flash_lite') {
    classification.tags.push('ai_analysis', 'gemini')
  }

  if (context.operation === 'journal_analysis') {
    classification.tags.push('journal', 'analysis')
    if (classification.userImpact === 'blocking') {
      classification.businessImpact = 'high' // Journal analysis failures have high business impact
    }
  }

  // Stack trace analysis for additional context
  if (stack) {
    if (stack.includes('fetch') || stack.includes('XMLHttpRequest')) {
      classification.tags.push('http_request')
    }
    if (stack.includes('Promise') || stack.includes('async')) {
      classification.tags.push('async_operation')
    }
    if (stack.includes('convex')) {
      classification.tags.push('convex_backend')
    }
  }

  return classification
}

/**
 * Generate error fingerprint for deduplication and pattern analysis
 */
export function generateErrorFingerprint(
  errorMessage: string,
  context: Partial<ErrorContext>,
  classification: ErrorClassification
): string {
  // Normalize error message for fingerprinting
  const normalizedMessage = errorMessage
    .toLowerCase()
    .replace(/\d+/g, 'N') // Replace numbers with N
    .replace(/[a-f0-9-]{36}/g, 'UUID') // Replace UUIDs
    .replace(/[a-f0-9]{8,}/g, 'HASH') // Replace long hex strings
    .replace(/\s+/g, ' ')
    .trim()

  const fingerprintData = {
    message: normalizedMessage,
    category: classification.category,
    service: context.service,
    operation: context.operation,
  }

  return btoa(JSON.stringify(fingerprintData))
    .replace(/[+/=]/g, '')
    .substring(0, 16)
}

/**
 * Generate aggregation key for grouping similar errors
 */
export function generateAggregationKey(
  classification: ErrorClassification,
  context: Partial<ErrorContext>
): string {
  return `${classification.category}:${context.service}:${context.operation}:${classification.severity}`
}

/**
 * Enhanced error logger with structured data and classification
 */
export async function logStructuredError(
  ctx: MutationCtx,
  error: Error | string,
  context: Partial<ErrorContext>,
  metadata: Partial<StructuredErrorLog['metadata']> = {}
): Promise<string> {
  const now = Date.now()
  const errorMessage = typeof error === 'string' ? error : error.message
  const stackTrace =
    typeof error === 'object' && error.stack ? error.stack : undefined

  // Complete context with defaults
  const fullContext: ErrorContext = {
    service: 'unknown',
    operation: 'unknown',
    environment:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
    timestamp: now,
    ...context,
  }

  // Classify the error
  const classification = classifyError(error, fullContext)

  // Generate identifiers
  const fingerprint = generateErrorFingerprint(
    errorMessage,
    fullContext,
    classification
  )
  const aggregationKey = generateAggregationKey(classification, fullContext)

  // Create structured log entry
  const logEntry: Omit<StructuredErrorLog, 'id'> = {
    errorMessage,
    stackTrace,
    context: fullContext,
    classification,
    metadata: {
      correlationId:
        metadata.correlationId ||
        `${fullContext.service}_${now}_${Math.random().toString(36).substring(2, 8)}`,
      ...metadata,
    },
    aggregationKey,
    fingerprint,
  }

  // Save to database
  const logId = await ctx.db.insert('errorLogs', logEntry)

  // Update error metrics for monitoring
  await updateErrorAggregates(ctx, logEntry, logId)

  return logId
}

/**
 * Update error aggregation metrics for dashboards and monitoring
 */
async function updateErrorAggregates(
  ctx: MutationCtx,
  logEntry: Omit<StructuredErrorLog, 'id'>,
  logId: string
) {
  const now = Date.now()
  const timeWindow = Math.floor(now / (60 * 60 * 1000)) // Hour bucket

  // Update hourly aggregates
  let hourlyAggregate = await ctx.db
    .query('errorAggregates')
    .withIndex('by_time_service_category', q =>
      q
        .eq('timeWindow', timeWindow)
        .eq('service', logEntry.context.service)
        .eq('category', logEntry.classification.category)
    )
    .first()

  if (!hourlyAggregate) {
    await ctx.db.insert('errorAggregates', {
      timeWindow,
      service: logEntry.context.service,
      category: logEntry.classification.category,
      count: 1,
      severity: logEntry.classification.severity,
      lastSeen: now,
      fingerprints: [logEntry.fingerprint],
      aggregationKeys: [logEntry.aggregationKey],
      sampleErrorIds: [logId],
      userImpactCounts: {
        none: logEntry.classification.userImpact === 'none' ? 1 : 0,
        minor: logEntry.classification.userImpact === 'minor' ? 1 : 0,
        major: logEntry.classification.userImpact === 'major' ? 1 : 0,
        blocking: logEntry.classification.userImpact === 'blocking' ? 1 : 0,
      },
      businessImpactCounts: {
        none: logEntry.classification.businessImpact === 'none' ? 1 : 0,
        low: logEntry.classification.businessImpact === 'low' ? 1 : 0,
        medium: logEntry.classification.businessImpact === 'medium' ? 1 : 0,
        high: logEntry.classification.businessImpact === 'high' ? 1 : 0,
      },
    })
  } else {
    // Update existing aggregate
    const newFingerprints = Array.from(
      new Set([...hourlyAggregate.fingerprints, logEntry.fingerprint])
    )
    const newAggregationKeys = Array.from(
      new Set([...hourlyAggregate.aggregationKeys, logEntry.aggregationKey])
    )
    const newSampleIds = [...hourlyAggregate.sampleErrorIds, logId].slice(-10) // Keep last 10 samples

    // Update user impact counts
    const userImpactCounts = { ...hourlyAggregate.userImpactCounts }
    userImpactCounts[logEntry.classification.userImpact]++

    // Update business impact counts
    const businessImpactCounts = { ...hourlyAggregate.businessImpactCounts }
    businessImpactCounts[logEntry.classification.businessImpact]++

    await ctx.db.patch(hourlyAggregate._id, {
      count: hourlyAggregate.count + 1,
      lastSeen: now,
      fingerprints: newFingerprints,
      aggregationKeys: newAggregationKeys,
      sampleErrorIds: newSampleIds,
      userImpactCounts,
      businessImpactCounts,
      // Update severity to highest seen
      severity: getHighestSeverity(
        hourlyAggregate.severity,
        logEntry.classification.severity
      ),
    })
  }
}

/**
 * Helper to determine highest severity
 */
function getHighestSeverity(
  current: 'low' | 'medium' | 'high' | 'critical',
  new_: 'low' | 'medium' | 'high' | 'critical'
): 'low' | 'medium' | 'high' | 'critical' {
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
  return severityOrder[new_] > severityOrder[current] ? new_ : current
}

/**
 * Query error logs with filtering and pagination
 */
export async function queryErrorLogs(
  ctx: QueryCtx,
  filters: {
    service?: string
    category?: string
    severity?: string
    timeRange?: { start: number; end: number }
    userId?: string
    fingerprint?: string
    aggregationKey?: string
  } = {},
  pagination: { limit?: number; offset?: number } = {}
): Promise<{
  logs: StructuredErrorLog[]
  total: number
  hasMore: boolean
}> {
  let query = ctx.db.query('errorLogs')

  // Apply filters
  if (filters.service) {
    query = query.filter(q => q.eq(q.field('context.service'), filters.service))
  }
  if (filters.category) {
    query = query.filter(q =>
      q.eq(q.field('classification.category'), filters.category)
    )
  }
  if (filters.severity) {
    query = query.filter(q =>
      q.eq(q.field('classification.severity'), filters.severity)
    )
  }
  if (filters.timeRange) {
    query = query.filter(
      q =>
        q.gte(q.field('context.timestamp'), filters.timeRange!.start) &&
        q.lte(q.field('context.timestamp'), filters.timeRange!.end)
    )
  }
  if (filters.userId) {
    query = query.filter(q => q.eq(q.field('context.userId'), filters.userId))
  }
  if (filters.fingerprint) {
    query = query.filter(q => q.eq(q.field('fingerprint'), filters.fingerprint))
  }
  if (filters.aggregationKey) {
    query = query.filter(q =>
      q.eq(q.field('aggregationKey'), filters.aggregationKey)
    )
  }

  // Get total count
  const allResults = await query.collect()
  const total = allResults.length

  // Apply pagination
  const limit = pagination.limit || 50
  const offset = pagination.offset || 0
  const paginatedResults = allResults.slice(offset, offset + limit)

  return {
    logs: paginatedResults as StructuredErrorLog[],
    total,
    hasMore: offset + limit < total,
  }
}

/**
 * Get error patterns and trends for monitoring dashboard
 */
export async function getErrorPatterns(
  ctx: QueryCtx,
  timeRange: { start: number; end: number },
  service?: string
): Promise<{
  topErrors: {
    fingerprint: string
    message: string
    count: number
    category: string
    severity: string
    trend: 'increasing' | 'decreasing' | 'stable'
  }[]
  categoryBreakdown: {
    category: string
    count: number
    percentage: number
  }[]
  severityDistribution: {
    severity: string
    count: number
    percentage: number
  }[]
  impactAnalysis: {
    userImpact: Record<string, number>
    businessImpact: Record<string, number>
  }
  trends: {
    hourly: {
      hour: number
      errorCount: number
      severityWeightedCount: number
    }[]
    patterns: string[]
  }
}> {
  const startHour = Math.floor(timeRange.start / (60 * 60 * 1000))
  const endHour = Math.floor(timeRange.end / (60 * 60 * 1000))

  // Query aggregated data
  let query = ctx.db
    .query('errorAggregates')
    .filter(
      q =>
        q.gte(q.field('timeWindow'), startHour) &&
        q.lte(q.field('timeWindow'), endHour)
    )

  if (service) {
    query = query.filter(q => q.eq(q.field('service'), service))
  }

  const aggregates = await query.collect()

  // Calculate top errors by fingerprint
  const fingerprintCounts = new Map<
    string,
    { count: number; category: string; severity: string; message?: string }
  >()
  const categoryCounts = new Map<string, number>()
  const severityCounts = new Map<string, number>()
  const userImpactCounts = { none: 0, minor: 0, major: 0, blocking: 0 }
  const businessImpactCounts = { none: 0, low: 0, medium: 0, high: 0 }

  for (const aggregate of aggregates) {
    // Aggregate fingerprint data
    for (const fingerprint of aggregate.fingerprints) {
      const existing = fingerprintCounts.get(fingerprint)
      if (existing) {
        existing.count += aggregate.count
      } else {
        fingerprintCounts.set(fingerprint, {
          count: aggregate.count,
          category: aggregate.category,
          severity: aggregate.severity,
        })
      }
    }

    // Category breakdown
    const categoryCount = categoryCounts.get(aggregate.category) || 0
    categoryCounts.set(aggregate.category, categoryCount + aggregate.count)

    // Severity distribution
    const severityCount = severityCounts.get(aggregate.severity) || 0
    severityCounts.set(aggregate.severity, severityCount + aggregate.count)

    // Impact analysis
    Object.entries(aggregate.userImpactCounts).forEach(([impact, count]) => {
      userImpactCounts[impact as keyof typeof userImpactCounts] += count
    })
    Object.entries(aggregate.businessImpactCounts).forEach(
      ([impact, count]) => {
        businessImpactCounts[impact as keyof typeof businessImpactCounts] +=
          count
      }
    )
  }

  const totalErrors = Array.from(categoryCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  )

  // Get top errors with sample messages
  const topFingerprints = Array.from(fingerprintCounts.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)

  const topErrors = await Promise.all(
    topFingerprints.map(async ([fingerprint, data]) => {
      // Get a sample error message for this fingerprint
      const sampleLog = await ctx.db
        .query('errorLogs')
        .filter(q => q.eq(q.field('fingerprint'), fingerprint))
        .first()

      return {
        fingerprint,
        message: sampleLog?.errorMessage || 'Unknown error',
        count: data.count,
        category: data.category,
        severity: data.severity,
        trend: 'stable' as const, // TODO: Calculate actual trend
      }
    })
  )

  // Calculate category breakdown with percentages
  const categoryBreakdown = Array.from(categoryCounts.entries()).map(
    ([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalErrors) * 100),
    })
  )

  // Calculate severity distribution with percentages
  const severityDistribution = Array.from(severityCounts.entries()).map(
    ([severity, count]) => ({
      severity,
      count,
      percentage: Math.round((count / totalErrors) * 100),
    })
  )

  // Generate hourly trends
  const hourlyTrends = new Map<
    number,
    { errorCount: number; severityWeightedCount: number }
  >()
  const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 }

  for (const aggregate of aggregates) {
    const existing = hourlyTrends.get(aggregate.timeWindow) || {
      errorCount: 0,
      severityWeightedCount: 0,
    }
    existing.errorCount += aggregate.count
    existing.severityWeightedCount +=
      aggregate.count * severityWeights[aggregate.severity]
    hourlyTrends.set(aggregate.timeWindow, existing)
  }

  const hourly = Array.from(hourlyTrends.entries())
    .map(([hour, data]) => ({
      hour,
      ...data,
    }))
    .sort((a, b) => a.hour - b.hour)

  return {
    topErrors,
    categoryBreakdown,
    severityDistribution,
    impactAnalysis: {
      userImpact: userImpactCounts,
      businessImpact: businessImpactCounts,
    },
    trends: {
      hourly,
      patterns: [], // TODO: Implement pattern detection
    },
  }
}

/**
 * Mark error as resolved
 */
export async function markErrorResolved(
  ctx: MutationCtx,
  errorId: string,
  resolution: StructuredErrorLog['resolution']
) {
  await ctx.db.patch(errorId as any, {
    resolution: {
      resolved: true,
      resolvedAt: Date.now(),
      ...resolution,
    },
  })
}

/**
 * Get error context for correlation and debugging
 */
export async function getErrorContext(
  ctx: QueryCtx,
  errorId: string
): Promise<{
  error: StructuredErrorLog | null
  relatedErrors: StructuredErrorLog[]
  timeline: {
    timestamp: number
    event: string
    details: any
  }[]
}> {
  const error = await ctx.db.get(errorId as Id<'errorLogs'>)
  if (!error) {
    return { error: null, relatedErrors: [], timeline: [] }
  }

  // Find related errors by correlation ID, fingerprint, or user
  const relatedErrors = await ctx.db
    .query('errorLogs')
    .filter(q => {
      const filters: any[] = []

      // Only add correlation ID filter if metadata exists
      if (error.metadata?.correlationId) {
        filters.push(
          q.eq(q.field('metadata.correlationId'), error.metadata.correlationId)
        )
      }

      // Only add fingerprint filter if fingerprint exists
      if (error.fingerprint) {
        filters.push(q.eq(q.field('fingerprint'), error.fingerprint))
      }

      // Only add context filter if context exists
      if (error.context?.userId && error.context?.timestamp) {
        filters.push(
          q.and(
            q.eq(q.field('context.userId'), error.context.userId),
            q.gte(
              q.field('context.timestamp'),
              error.context.timestamp - 60000
            ), // Within 1 minute
            q.lte(q.field('context.timestamp'), error.context.timestamp + 60000)
          )
        )
      }

      // If no filters, return a filter that matches nothing (use impossible creation time)
      return filters.length > 0
        ? q.or(...filters)
        : q.eq(q.field('_creationTime'), -1)
    })
    .collect()

  // Build timeline of related events
  const timeline = relatedErrors
    .map(err => ({
      timestamp: err.context.timestamp,
      event: `${err.classification.category} error`,
      details: {
        message: err.errorMessage,
        service: err.context.service,
        operation: err.context.operation,
      },
    }))
    .sort((a, b) => a.timestamp - b.timestamp)

  return {
    error: error as StructuredErrorLog,
    relatedErrors: relatedErrors.filter(
      err => err._id !== errorId
    ) as StructuredErrorLog[],
    timeline,
  }
}
