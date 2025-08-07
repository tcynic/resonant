/**
 * Standardized Error Handling Utilities
 *
 * Provides consistent error handling patterns across the application
 * for async operations, user feedback, and error logging.
 */

import {
  API_ERRORS,
  GENERIC_ERRORS,
  AUTH_ERRORS,
} from '@/lib/constants/error-messages'

/**
 * Error severity levels for logging and user feedback
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for better organization and handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  FILE_UPLOAD = 'file_upload',
  NOTIFICATION = 'notification',
  UNEXPECTED = 'unexpected',
}

/**
 * Standardized error interface
 */
export interface AppError {
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  code?: string
  details?: Record<string, unknown>
  timestamp: number
  userFriendly: boolean
}

/**
 * Error logging configuration
 */
export interface ErrorLogConfig {
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  logLevel: ErrorSeverity
}

const defaultLogConfig: ErrorLogConfig = {
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  logLevel: ErrorSeverity.MEDIUM,
}

/**
 * Creates a standardized error object
 */
export function createAppError(
  message: string,
  category: ErrorCategory,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  options: {
    code?: string
    details?: Record<string, unknown>
    userFriendly?: boolean
  } = {}
): AppError {
  return {
    message,
    category,
    severity,
    code: options.code,
    details: options.details,
    timestamp: Date.now(),
    userFriendly: options.userFriendly ?? true,
  }
}

/**
 * Logs error with appropriate level and formatting
 */
export function logError(
  error: AppError | Error | unknown,
  config: Partial<ErrorLogConfig> = {}
): void {
  const finalConfig = { ...defaultLogConfig, ...config }

  let appError: AppError

  if (error instanceof Error) {
    appError = createAppError(
      error.message,
      ErrorCategory.UNEXPECTED,
      ErrorSeverity.HIGH,
      {
        details: {
          stack: error.stack,
          name: error.name,
        },
        userFriendly: false,
      }
    )
  } else if (error && typeof error === 'object' && 'message' in error) {
    appError = error as AppError
  } else {
    appError = createAppError(
      'An unexpected error occurred',
      ErrorCategory.UNEXPECTED,
      ErrorSeverity.HIGH,
      {
        details: { originalError: error },
        userFriendly: true,
      }
    )
  }

  // Console logging for development
  if (finalConfig.enableConsoleLogging) {
    const logLevel = getSeverityLogLevel(appError.severity)
    const logMessage = `[${appError.category.toUpperCase()}] ${appError.message}`

    console[logLevel](logMessage, {
      timestamp: new Date(appError.timestamp).toISOString(),
      code: appError.code,
      details: appError.details,
    })
  }

  // Remote logging for production (placeholder)
  if (
    finalConfig.enableRemoteLogging &&
    shouldLogRemotely(appError.severity, finalConfig.logLevel)
  ) {
    // TODO: Implement remote logging service integration
    // This could be Sentry, LogRocket, or custom logging service
    void sendToRemoteLogging(appError)
  }
}

/**
 * Gets appropriate console log level for error severity
 */
function getSeverityLogLevel(
  severity: ErrorSeverity
): 'log' | 'warn' | 'error' {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'log'
    case ErrorSeverity.MEDIUM:
      return 'warn'
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      return 'error'
    default:
      return 'warn'
  }
}

/**
 * Determines if error should be logged remotely based on severity
 */
function shouldLogRemotely(
  errorSeverity: ErrorSeverity,
  logLevel: ErrorSeverity
): boolean {
  const severityOrder = {
    [ErrorSeverity.LOW]: 1,
    [ErrorSeverity.MEDIUM]: 2,
    [ErrorSeverity.HIGH]: 3,
    [ErrorSeverity.CRITICAL]: 4,
  }

  return severityOrder[errorSeverity] >= severityOrder[logLevel]
}

/**
 * Placeholder for remote logging service
 */
async function sendToRemoteLogging(error: AppError): Promise<void> {
  // TODO: Implement actual remote logging
  // For now, just a placeholder
  if (process.env.NODE_ENV === 'development') {
    console.log('Would send to remote logging:', error)
  }
}

/**
 * Standardized async operation wrapper with error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  options: {
    category: ErrorCategory
    onError?: (error: AppError) => void
    retryAttempts?: number
    retryDelay?: number
    fallbackValue?: T
  }
): Promise<{ data: T | null; error: AppError | null }> {
  const {
    category,
    onError,
    retryAttempts = 0,
    retryDelay = 1000,
    fallbackValue,
  } = options

  let lastError: AppError | null = null

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      const data = await operation()
      return { data, error: null }
    } catch (error) {
      lastError = createAppError(
        error instanceof Error ? error.message : 'Operation failed',
        category,
        attempt === retryAttempts ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
        {
          details: {
            attempt: attempt + 1,
            maxAttempts: retryAttempts + 1,
            originalError: error,
          },
        }
      )

      logError(lastError)

      if (onError) {
        onError(lastError)
      }

      // If not the last attempt, wait before retrying
      if (attempt < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  return {
    data: fallbackValue ?? null,
    error: lastError,
  }
}

/**
 * Gets user-friendly error message from various error types
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const appError = error as AppError
    if (appError.userFriendly) {
      return appError.message
    }
  }

  if (error instanceof Error) {
    // Map common error types to user-friendly messages
    if (error.message.includes('fetch')) {
      return API_ERRORS.NETWORK_ERROR
    }
    if (
      error.message.includes('unauthorized') ||
      error.message.includes('403')
    ) {
      return AUTH_ERRORS.PERMISSION_DENIED
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return API_ERRORS.LOAD_FAILED
    }
  }

  return GENERIC_ERRORS.UNEXPECTED_ERROR
}

/**
 * Creates error boundary compatible error info
 */
export function createErrorBoundaryInfo(
  error: Error,
  errorInfo: { componentStack: string }
) {
  return createAppError(
    error.message,
    ErrorCategory.UNEXPECTED,
    ErrorSeverity.CRITICAL,
    {
      code: 'REACT_ERROR_BOUNDARY',
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        name: error.name,
      },
      userFriendly: false,
    }
  )
}

/**
 * Validation error helper
 */
export function createValidationError(
  field: string,
  message: string,
  details?: Record<string, unknown>
) {
  return createAppError(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, {
    code: 'VALIDATION_ERROR',
    details: { field, ...details },
    userFriendly: true,
  })
}

/**
 * Network error helper
 */
export function createNetworkError(
  message: string,
  statusCode?: number,
  details?: Record<string, unknown>
) {
  return createAppError(
    message,
    ErrorCategory.NETWORK,
    statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
    {
      code: statusCode ? `HTTP_${statusCode}` : 'NETWORK_ERROR',
      details: { statusCode, ...details },
      userFriendly: true,
    }
  )
}

/**
 * File upload error helper
 */
export function createFileUploadError(
  message: string,
  filename?: string,
  details?: Record<string, unknown>
) {
  return createAppError(
    message,
    ErrorCategory.FILE_UPLOAD,
    ErrorSeverity.MEDIUM,
    {
      code: 'FILE_UPLOAD_ERROR',
      details: { filename, ...details },
      userFriendly: true,
    }
  )
}

/**
 * Authentication error helper
 */
export function createAuthError(
  message: string,
  details?: Record<string, unknown>
) {
  return createAppError(
    message,
    ErrorCategory.AUTHENTICATION,
    ErrorSeverity.HIGH,
    {
      code: 'AUTH_ERROR',
      details,
      userFriendly: true,
    }
  )
}
