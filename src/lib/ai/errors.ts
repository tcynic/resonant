/**
 * Comprehensive Error Classes for AI Infrastructure
 * Handles all types of AI service failures with detailed context and recovery strategies
 */

import { AnalysisType } from '../types'

// Base AI Error class with enhanced context
export abstract class AIError extends Error {
  public readonly timestamp: number
  public readonly context: Record<string, unknown>
  public readonly recoverable: boolean
  public readonly retryable: boolean
  public readonly errorCode: string

  constructor(
    message: string,
    errorCode: string,
    context: Record<string, unknown> = {},
    recoverable: boolean = true,
    retryable: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.timestamp = Date.now()
    this.context = context
    this.recoverable = recoverable
    this.retryable = retryable
    this.errorCode = errorCode

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  // Serialize error for logging
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
      stack: this.stack,
    }
  }

  // Generate user-friendly message
  abstract getUserMessage(): string

  // Get recovery suggestions
  abstract getRecoveryActions(): string[]
}

// API Connection Errors
export class AIServiceConnectionError extends AIError {
  constructor(
    service: string,
    originalError?: Error,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Failed to connect to ${service} AI service: ${originalError?.message || 'Unknown connection error'}`,
      'AI_SERVICE_CONNECTION_ERROR',
      { service, originalError: originalError?.message, ...context },
      true,
      true
    )
  }

  getUserMessage(): string {
    return 'AI analysis is temporarily unavailable. Please try again in a few moments.'
  }

  getRecoveryActions(): string[] {
    return [
      'Check internet connection',
      'Verify API key configuration',
      'Try again in a few minutes',
      'Contact support if issue persists',
    ]
  }
}

// Authentication/Authorization Errors
export class AIServiceAuthError extends AIError {
  constructor(
    service: string,
    statusCode?: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Authentication failed for ${service} AI service`,
      'AI_SERVICE_AUTH_ERROR',
      { service, statusCode, ...context },
      false, // Not recoverable without fixing auth
      false // Don't retry auth failures
    )
  }

  getUserMessage(): string {
    return 'AI service authentication failed. Please contact support.'
  }

  getRecoveryActions(): string[] {
    return [
      'Verify API key is valid',
      'Check API key permissions',
      'Contact administrator',
      'Check service billing status',
    ]
  }
}

// Rate Limiting Errors
export class AIServiceRateLimitError extends AIError {
  public readonly retryAfter?: number

  constructor(
    service: string,
    retryAfter?: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Rate limit exceeded for ${service} AI service`,
      'AI_SERVICE_RATE_LIMIT_ERROR',
      { service, retryAfter, ...context },
      true,
      true
    )
    this.retryAfter = retryAfter
  }

  getUserMessage(): string {
    const waitTime = this.retryAfter
      ? `Please wait ${Math.ceil(this.retryAfter / 1000)} seconds`
      : 'Please wait a moment'
    return `AI analysis is temporarily rate limited. ${waitTime} before trying again.`
  }

  getRecoveryActions(): string[] {
    return [
      this.retryAfter
        ? `Wait ${Math.ceil(this.retryAfter / 1000)} seconds`
        : 'Wait before retrying',
      'Reduce analysis frequency',
      'Try again later',
      'Contact support for rate limit increase',
    ]
  }
}

// Content/Safety Filter Errors
export class AIContentFilterError extends AIError {
  constructor(
    reason: string,
    content?: string,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Content was blocked by AI safety filters: ${reason}`,
      'AI_CONTENT_FILTER_ERROR',
      { reason, contentLength: content?.length, ...context },
      false, // Not recoverable without content changes
      false // Don't retry filtered content
    )
  }

  getUserMessage(): string {
    return 'This content cannot be analyzed due to safety guidelines. Please try with different text.'
  }

  getRecoveryActions(): string[] {
    return [
      'Modify the journal entry content',
      'Remove potentially sensitive information',
      'Try with a different entry',
      'Contact support if content seems appropriate',
    ]
  }
}

// Analysis Processing Errors
export class AIAnalysisProcessingError extends AIError {
  public readonly analysisType: AnalysisType
  public readonly stage: string

  constructor(
    analysisType: AnalysisType,
    stage: string,
    originalError?: Error,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Failed to process ${analysisType} analysis at ${stage} stage: ${originalError?.message || 'Unknown processing error'}`,
      'AI_ANALYSIS_PROCESSING_ERROR',
      {
        analysisType,
        stage,
        originalError: originalError?.message,
        ...context,
      },
      true,
      true
    )
    this.analysisType = analysisType
    this.stage = stage
  }

  getUserMessage(): string {
    return `${this.analysisType} analysis could not be completed. Please try again.`
  }

  getRecoveryActions(): string[] {
    return [
      'Try analyzing the entry again',
      'Check journal entry content',
      'Try a different analysis type',
      'Contact support if issue persists',
    ]
  }
}

// Data Validation Errors
export class AIDataValidationError extends AIError {
  public readonly validationErrors: string[]

  constructor(
    validationErrors: string[],
    data?: unknown,
    context: Record<string, unknown> = {}
  ) {
    super(
      `AI response validation failed: ${validationErrors.join(', ')}`,
      'AI_DATA_VALIDATION_ERROR',
      { validationErrors, dataType: typeof data, ...context },
      true,
      true
    )
    this.validationErrors = validationErrors
  }

  getUserMessage(): string {
    return 'AI analysis returned unexpected results. Please try again.'
  }

  getRecoveryActions(): string[] {
    return [
      'Retry the analysis',
      'Try with simpler journal entry',
      'Check entry for unusual characters',
      'Contact support if issue persists',
    ]
  }
}

// Resource/Cost Limit Errors
export class AIResourceLimitError extends AIError {
  public readonly limitType: 'daily' | 'monthly' | 'tokens' | 'requests'
  public readonly currentUsage: number
  public readonly limit: number

  constructor(
    limitType: 'daily' | 'monthly' | 'tokens' | 'requests',
    currentUsage: number,
    limit: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `AI service ${limitType} limit exceeded: ${currentUsage}/${limit}`,
      'AI_RESOURCE_LIMIT_ERROR',
      { limitType, currentUsage, limit, ...context },
      false, // Not recoverable until limit resets
      false // Don't retry until limit resets
    )
    this.limitType = limitType
    this.currentUsage = currentUsage
    this.limit = limit
  }

  getUserMessage(): string {
    const resetTime = this.limitType === 'daily' ? 'tomorrow' : 'next month'
    return `AI analysis ${this.limitType} limit reached. Service will resume ${resetTime}.`
  }

  getRecoveryActions(): string[] {
    const resetTime = this.limitType === 'daily' ? 'tomorrow' : 'next month'
    return [
      `Wait until ${resetTime} for limit reset`,
      'Contact support for limit increase',
      'Reduce analysis frequency',
      'Prioritize most important entries',
    ]
  }
}

// Timeout Errors
export class AITimeoutError extends AIError {
  public readonly timeoutMs: number

  constructor(
    operation: string,
    timeoutMs: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `AI operation '${operation}' timed out after ${timeoutMs}ms`,
      'AI_TIMEOUT_ERROR',
      { operation, timeoutMs, ...context },
      true,
      true
    )
    this.timeoutMs = timeoutMs
  }

  getUserMessage(): string {
    return 'AI analysis is taking longer than expected. Please try again.'
  }

  getRecoveryActions(): string[] {
    return [
      'Try again with a shorter journal entry',
      'Wait a moment and retry',
      'Check internet connection',
      'Contact support if timeouts persist',
    ]
  }
}

// Queue/Scheduling Errors
export class AIQueueError extends AIError {
  public readonly queueSize: number
  public readonly estimatedWait?: number

  constructor(
    reason: string,
    queueSize: number,
    estimatedWait?: number,
    context: Record<string, unknown> = {}
  ) {
    super(
      `AI analysis queue error: ${reason}`,
      'AI_QUEUE_ERROR',
      { reason, queueSize, estimatedWait, ...context },
      true,
      true
    )
    this.queueSize = queueSize
    this.estimatedWait = estimatedWait
  }

  getUserMessage(): string {
    const waitMsg = this.estimatedWait
      ? ` (estimated wait: ${Math.ceil(this.estimatedWait / 1000)}s)`
      : ''
    return `AI analysis is queued${waitMsg}. Your analysis will be processed shortly.`
  }

  getRecoveryActions(): string[] {
    return [
      'Wait for queue to process',
      'Try again in a few minutes',
      'Reduce analysis frequency during peak times',
      'Contact support if delays persist',
    ]
  }
}

// Partial Failure Errors (when some analyses succeed, others fail)
export class AIPartialFailureError extends AIError {
  public readonly successfulAnalyses: AnalysisType[]
  public readonly failedAnalyses: Array<{ type: AnalysisType; error: Error }>

  constructor(
    successfulAnalyses: AnalysisType[],
    failedAnalyses: Array<{ type: AnalysisType; error: Error }>,
    context: Record<string, unknown> = {}
  ) {
    super(
      `Partial analysis failure: ${failedAnalyses.length} of ${successfulAnalyses.length + failedAnalyses.length} analyses failed`,
      'AI_PARTIAL_FAILURE_ERROR',
      {
        successfulAnalyses,
        failedAnalyses: failedAnalyses.map(f => ({
          type: f.type,
          error: f.error.message,
        })),
        ...context,
      },
      true,
      true
    )
    this.successfulAnalyses = successfulAnalyses
    this.failedAnalyses = failedAnalyses
  }

  getUserMessage(): string {
    return `Some AI analyses completed successfully. ${this.failedAnalyses.length} analysis(es) failed and can be retried.`
  }

  getRecoveryActions(): string[] {
    return [
      'Retry failed analyses individually',
      'Review successful results',
      'Check if partial results meet your needs',
      'Contact support if specific analyses consistently fail',
    ]
  }
}

// Error factory function for creating appropriate error types
export function createAIError(
  type: string,
  message: string,
  context: Record<string, unknown> = {}
): AIError {
  switch (type) {
    case 'connection':
      return new AIServiceConnectionError(
        (context.service as string) || 'unknown',
        undefined,
        context
      )
    case 'auth':
      return new AIServiceAuthError(
        (context.service as string) || 'unknown',
        context.statusCode as number,
        context
      )
    case 'rate_limit':
      return new AIServiceRateLimitError(
        (context.service as string) || 'unknown',
        context.retryAfter as number,
        context
      )
    case 'content_filter':
      return new AIContentFilterError(
        message,
        context.content as string,
        context
      )
    case 'processing':
      return new AIAnalysisProcessingError(
        (context.analysisType as AnalysisType) || 'sentiment',
        (context.stage as string) || 'unknown',
        undefined,
        context
      )
    case 'validation':
      return new AIDataValidationError([message], context.data, context)
    case 'resource_limit':
      return new AIResourceLimitError(
        (context.limitType as 'daily' | 'monthly' | 'tokens' | 'requests') ||
          'daily',
        (context.currentUsage as number) || 0,
        (context.limit as number) || 0,
        context
      )
    case 'timeout':
      return new AITimeoutError(
        (context.operation as string) || 'unknown',
        (context.timeoutMs as number) || 30000,
        context
      )
    case 'queue':
      return new AIQueueError(
        message,
        (context.queueSize as number) || 0,
        context.estimatedWait as number,
        context
      )
    default:
      // Fallback to generic processing error
      return new AIAnalysisProcessingError(
        (context.analysisType as AnalysisType) || 'sentiment',
        'unknown',
        new Error(message),
        context
      )
  }
}

// Error severity levels for logging and monitoring
export enum AIErrorSeverity {
  LOW = 'low', // Temporary issues, retryable
  MEDIUM = 'medium', // Service degradation, some impact
  HIGH = 'high', // Significant failures, user impact
  CRITICAL = 'critical', // System-wide issues, immediate attention
}

// Determine error severity
export function getErrorSeverity(error: AIError): AIErrorSeverity {
  if (
    error instanceof AIServiceAuthError ||
    error instanceof AIResourceLimitError
  ) {
    return AIErrorSeverity.CRITICAL
  }

  if (
    error instanceof AIServiceConnectionError ||
    error instanceof AIQueueError
  ) {
    return AIErrorSeverity.HIGH
  }

  if (
    error instanceof AIServiceRateLimitError ||
    error instanceof AITimeoutError
  ) {
    return AIErrorSeverity.MEDIUM
  }

  return AIErrorSeverity.LOW
}

// Error aggregation for monitoring
export interface AIErrorStats {
  total: number
  byType: Record<string, number>
  bySeverity: Record<AIErrorSeverity, number>
  recentErrors: AIError[]
  errorRate: number // errors per hour
}

// Error recovery strategies
export interface AIErrorRecoveryStrategy {
  canRecover: boolean
  retryable: boolean
  retryDelay: number
  maxRetries: number
  fallbackAction?: () => Promise<unknown>
}

export function getRecoveryStrategy(error: AIError): AIErrorRecoveryStrategy {
  const baseStrategy: AIErrorRecoveryStrategy = {
    canRecover: error.recoverable,
    retryable: error.retryable,
    retryDelay: 1000,
    maxRetries: 3,
  }

  if (error instanceof AIServiceRateLimitError) {
    return {
      ...baseStrategy,
      retryDelay: error.retryAfter || 60000,
      maxRetries: 1,
    }
  }

  if (error instanceof AITimeoutError) {
    return {
      ...baseStrategy,
      retryDelay: 2000,
      maxRetries: 2,
    }
  }

  if (error instanceof AIServiceConnectionError) {
    return {
      ...baseStrategy,
      retryDelay: 5000,
      maxRetries: 3,
    }
  }

  if (
    error instanceof AIServiceAuthError ||
    error instanceof AIContentFilterError
  ) {
    return {
      ...baseStrategy,
      canRecover: false,
      retryable: false,
      maxRetries: 0,
    }
  }

  return baseStrategy
}
