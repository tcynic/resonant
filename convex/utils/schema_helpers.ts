/**
 * Schema validation and helper utilities
 * Story: AI-Migration.5 - Enhanced Database Schema
 */

import { ConvexError } from 'convex/values'

/**
 * Validation constants for new schema fields
 */
export const SCHEMA_VALIDATION = {
  // Model types
  VALID_MODEL_TYPES: [
    'gemini_2_5_flash_lite',
    'gpt_4',
    'gpt_3_5_turbo',
    'claude_3',
    'unknown',
  ],

  // Log levels
  VALID_LOG_LEVELS: ['debug', 'info', 'warn', 'error'],

  // Performance metric types
  VALID_METRIC_TYPES: [
    'response_time',
    'throughput',
    'error_rate',
    'memory_usage',
    'cpu_usage',
    'database_connections',
    'queue_depth',
  ],

  // Audit actions
  VALID_AUDIT_ACTIONS: ['create', 'update', 'delete', 'read'],

  // Field limits
  MAX_TOKEN_COUNT: 1000000, // 1M tokens max
  MAX_COST_USD: 1000, // $1000 max per request
  MAX_PROCESSING_TIME_MS: 300000, // 5 minutes max
  MAX_LOG_MESSAGE_LENGTH: 10000,
  MAX_SERVICE_NAME_LENGTH: 100,
  MAX_REGION_NAME_LENGTH: 50,
} as const

/**
 * Validates enhanced aiAnalysis metadata fields
 */
export function validateAiAnalysisMetadata(metadata: {
  modelType?: string
  modelVersion?: string
  requestTokens?: number
  responseTokens?: number
  cachingUsed?: boolean
  batchProcessed?: boolean
  regionProcessed?: string
}) {
  if (
    metadata.modelType &&
    !SCHEMA_VALIDATION.VALID_MODEL_TYPES.includes(metadata.modelType as any)
  ) {
    throw new ConvexError(`Invalid model type: ${metadata.modelType}`)
  }

  if (
    metadata.requestTokens &&
    (metadata.requestTokens < 0 ||
      metadata.requestTokens > SCHEMA_VALIDATION.MAX_TOKEN_COUNT)
  ) {
    throw new ConvexError(`Invalid request tokens: ${metadata.requestTokens}`)
  }

  if (
    metadata.responseTokens &&
    (metadata.responseTokens < 0 ||
      metadata.responseTokens > SCHEMA_VALIDATION.MAX_TOKEN_COUNT)
  ) {
    throw new ConvexError(`Invalid response tokens: ${metadata.responseTokens}`)
  }

  if (
    metadata.regionProcessed &&
    metadata.regionProcessed.length > SCHEMA_VALIDATION.MAX_REGION_NAME_LENGTH
  ) {
    throw new ConvexError(`Region name too long: ${metadata.regionProcessed}`)
  }
}

/**
 * Validates system log entry
 */
export function validateSystemLog(log: {
  level: string
  message: string
  service: string
  userId?: string
  sessionId?: string
}) {
  if (!SCHEMA_VALIDATION.VALID_LOG_LEVELS.includes(log.level as any)) {
    throw new ConvexError(`Invalid log level: ${log.level}`)
  }

  if (!log.message?.trim()) {
    throw new ConvexError('Log message is required')
  }

  if (log.message.length > SCHEMA_VALIDATION.MAX_LOG_MESSAGE_LENGTH) {
    throw new ConvexError(
      `Log message too long: ${log.message.length} characters`
    )
  }

  if (!log.service?.trim()) {
    throw new ConvexError('Service name is required')
  }

  if (log.service.length > SCHEMA_VALIDATION.MAX_SERVICE_NAME_LENGTH) {
    throw new ConvexError(`Service name too long: ${log.service}`)
  }
}

/**
 * Validates API usage metrics
 */
export function validateApiUsage(usage: {
  service: string
  endpoint: string
  method: string
  requestCount: number
  tokenUsage?: number
  cost?: number
  avgResponseTime: number
  errorCount: number
  successCount: number
}) {
  if (!usage.service?.trim()) {
    throw new ConvexError('Service name is required')
  }

  if (!usage.endpoint?.trim()) {
    throw new ConvexError('Endpoint is required')
  }

  if (!usage.method?.trim()) {
    throw new ConvexError('Method is required')
  }

  if (usage.requestCount < 0) {
    throw new ConvexError('Request count cannot be negative')
  }

  if (usage.tokenUsage && usage.tokenUsage < 0) {
    throw new ConvexError('Token usage cannot be negative')
  }

  if (
    usage.cost &&
    (usage.cost < 0 || usage.cost > SCHEMA_VALIDATION.MAX_COST_USD)
  ) {
    throw new ConvexError(`Invalid cost: ${usage.cost}`)
  }

  if (usage.avgResponseTime < 0) {
    throw new ConvexError('Average response time cannot be negative')
  }

  if (usage.errorCount < 0 || usage.successCount < 0) {
    throw new ConvexError('Error and success counts cannot be negative')
  }
}

/**
 * Validates performance metrics
 */
export function validatePerformanceMetric(metric: {
  metricType: string
  service: string
  value: number
  unit: string
  timestamp: number
}) {
  if (
    !SCHEMA_VALIDATION.VALID_METRIC_TYPES.includes(metric.metricType as any)
  ) {
    throw new ConvexError(`Invalid metric type: ${metric.metricType}`)
  }

  if (!metric.service?.trim()) {
    throw new ConvexError('Service name is required')
  }

  if (!metric.unit?.trim()) {
    throw new ConvexError('Unit is required')
  }

  if (metric.value < 0) {
    throw new ConvexError('Metric value cannot be negative')
  }

  if (metric.timestamp <= 0) {
    throw new ConvexError('Valid timestamp is required')
  }
}

/**
 * Validates audit trail entry
 */
export function validateAuditTrail(audit: {
  entityType: string
  entityId: string
  action: string
  userId?: string
  timestamp: number
}) {
  if (!audit.entityType?.trim()) {
    throw new ConvexError('Entity type is required')
  }

  if (!audit.entityId?.trim()) {
    throw new ConvexError('Entity ID is required')
  }

  if (!SCHEMA_VALIDATION.VALID_AUDIT_ACTIONS.includes(audit.action as any)) {
    throw new ConvexError(`Invalid audit action: ${audit.action}`)
  }

  if (audit.timestamp <= 0) {
    throw new ConvexError('Valid timestamp is required')
  }
}

/**
 * Sanitizes and prepares metadata for storage
 */
export function sanitizeMetadata(metadata: unknown): any {
  if (metadata === null || metadata === undefined) {
    return undefined
  }

  // Remove any functions or other non-serializable data
  try {
    return JSON.parse(JSON.stringify(metadata))
  } catch (error) {
    console.warn('Failed to sanitize metadata:', error)
    return undefined
  }
}

/**
 * Creates a time window bucket for aggregation
 * @param timestamp Unix timestamp in milliseconds
 * @param windowSizeMinutes Size of the window in minutes (default: 60 = 1 hour)
 */
export function createTimeWindow(
  timestamp: number,
  windowSizeMinutes: number = 60
): number {
  const windowSizeMs = windowSizeMinutes * 60 * 1000
  return Math.floor(timestamp / windowSizeMs) * windowSizeMs
}

/**
 * Generates a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Estimates token split for request/response based on content analysis
 */
export function estimateTokenSplit(
  totalTokens: number,
  content: string
): {
  requestTokens: number
  responseTokens: number
} {
  if (totalTokens <= 0) {
    return { requestTokens: 0, responseTokens: 0 }
  }

  // Simple heuristic: longer content usually means more input tokens
  const contentLength = content?.length || 0
  const inputRatio = contentLength > 1000 ? 0.8 : 0.7 // 80% input for long content, 70% for short

  const requestTokens = Math.floor(totalTokens * inputRatio)
  const responseTokens = totalTokens - requestTokens

  return { requestTokens, responseTokens }
}
