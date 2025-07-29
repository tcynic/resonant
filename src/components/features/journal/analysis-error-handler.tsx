'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AnalysisErrorHandlerProps {
  error?: string
  onRetry: () => Promise<void>
  canRetry: boolean
  compact?: boolean
  // Enhanced with circuit breaker and fallback information
  circuitBreakerStatus?: {
    isHealthy: boolean
    status: string
    failureCount?: number
    canExecute?: boolean
  }
  fallbackInfo?: {
    usedFallback?: boolean
    fallbackMethod?: string
    fallbackConfidence?: number
    canUseFallback?: boolean
    fallbackReason?: string
  }
  recoveryInfo?: {
    autoRecoveryActive?: boolean
    estimatedRecoveryTime?: number
    isRecovering?: boolean
  }
}

// Enhanced error categories with circuit breaker and fallback awareness
const ERROR_MESSAGES = {
  timeout: {
    title: 'Analysis Taking Longer Than Expected',
    message:
      'The AI analysis is taking longer than usual. This might be due to high demand.',
    action: 'Retry Analysis',
    canRetry: true,
    fallbackEligible: true,
  },
  network: {
    title: 'Connection Issue',
    message:
      'There was a problem connecting to our AI service. Please check your internet connection.',
    action: 'Try Again',
    canRetry: true,
    fallbackEligible: true,
  },
  rate_limit: {
    title: 'Service Temporarily Unavailable',
    message:
      'Our AI service is experiencing high demand. Please wait a moment and try again.',
    action: 'Retry in 1 Minute',
    canRetry: true,
    retryDelay: 60000,
    fallbackEligible: true,
  },
  service_error: {
    title: 'AI Service Error',
    message:
      'The AI analysis service encountered an error. Our team has been notified.',
    action: 'Try Again Later',
    canRetry: true,
    fallbackEligible: true,
  },
  validation: {
    title: 'Content Issue',
    message:
      'There was an issue processing your journal entry content. Please check for any unusual characters.',
    action: 'Edit and Retry',
    canRetry: false,
    fallbackEligible: false,
  },
  circuit_breaker_open: {
    title: 'Service Temporarily Protected',
    message:
      'Our AI service is temporarily protected due to recent issues. Using alternative analysis method.',
    action: 'Continue with Backup Analysis',
    canRetry: false,
    fallbackEligible: true,
  },
  fallback_processing: {
    title: 'Using Backup Analysis',
    message:
      'AI service is unavailable. Using our backup analysis system for your journal entry.',
    action: 'Processing with Backup',
    canRetry: false,
    fallbackEligible: true,
  },
}

function categorizeError(
  errorMessage?: string,
  circuitBreakerStatus?: { isHealthy: boolean; canExecute?: boolean },
  fallbackInfo?: {
    usedFallback?: boolean
    canUseFallback?: boolean
    fallbackReason?: string
  }
) {
  // Check for fallback processing first
  if (fallbackInfo?.usedFallback) {
    return ERROR_MESSAGES.fallback_processing
  }

  // Check circuit breaker status
  if (circuitBreakerStatus && !circuitBreakerStatus.isHealthy) {
    return ERROR_MESSAGES.circuit_breaker_open
  }

  if (!errorMessage) {
    // If no specific error but can use fallback, suggest it
    if (fallbackInfo?.canUseFallback) {
      return ERROR_MESSAGES.circuit_breaker_open
    }
    return ERROR_MESSAGES.service_error
  }

  const message = errorMessage.toLowerCase()

  // Check for circuit breaker related errors
  if (
    message.includes('circuit breaker') ||
    message.includes('circuit_breaker')
  ) {
    return ERROR_MESSAGES.circuit_breaker_open
  }

  if (message.includes('timeout') || message.includes('taking longer')) {
    return ERROR_MESSAGES.timeout
  }
  if (message.includes('network') || message.includes('connection')) {
    return ERROR_MESSAGES.network
  }
  if (message.includes('rate limit') || message.includes('high demand')) {
    return ERROR_MESSAGES.rate_limit
  }
  if (message.includes('validation') || message.includes('content')) {
    return ERROR_MESSAGES.validation
  }

  return ERROR_MESSAGES.service_error
}

export function AnalysisErrorHandler({
  error,
  onRetry,
  canRetry,
  compact = false,
  circuitBreakerStatus,
  fallbackInfo,
  recoveryInfo,
}: AnalysisErrorHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const errorConfig = categorizeError(error, circuitBreakerStatus, fallbackInfo)
  const shouldShowRetry =
    canRetry && errorConfig.canRetry && !fallbackInfo?.usedFallback
  // TODO: Use fallback info for UI indicators
  // const isUsingFallback = fallbackInfo?.usedFallback || fallbackInfo?.canUseFallback

  const handleRetry = async () => {
    if (!shouldShowRetry) return

    setIsRetrying(true)
    try {
      await onRetry()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
    } finally {
      setIsRetrying(false)
      setShowConfirmDialog(false)
    }
  }

  const handleRetryClick = () => {
    if (errorConfig === ERROR_MESSAGES.rate_limit) {
      setShowConfirmDialog(true)
    } else {
      handleRetry()
    }
  }

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between p-2 border rounded-lg ${
          fallbackInfo?.usedFallback
            ? 'bg-blue-50 border-blue-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span
            className={`${
              fallbackInfo?.usedFallback ? 'text-blue-600' : 'text-red-600'
            }`}
            aria-hidden="true"
          >
            {fallbackInfo?.usedFallback ? '🔄' : '⚠️'}
          </span>
          <div className="flex flex-col">
            <span
              className={`text-sm font-medium ${
                fallbackInfo?.usedFallback ? 'text-blue-700' : 'text-red-700'
              }`}
            >
              {errorConfig.title}
            </span>
            {/* Circuit breaker status indicator */}
            {circuitBreakerStatus && !circuitBreakerStatus.isHealthy && (
              <span className="text-xs text-orange-600">
                Service Protection Active
              </span>
            )}
            {/* Fallback confidence indicator */}
            {fallbackInfo?.usedFallback && fallbackInfo.fallbackConfidence && (
              <span className="text-xs text-blue-600">
                Confidence: {Math.round(fallbackInfo.fallbackConfidence * 100)}%
              </span>
            )}
          </div>
        </div>
        {shouldShowRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetryClick}
            disabled={isRetrying}
            className={`${
              fallbackInfo?.usedFallback
                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                : 'text-red-600 hover:text-red-700 hover:bg-red-100'
            }`}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={`p-4 border rounded-lg ${
          fallbackInfo?.usedFallback
            ? 'bg-blue-50 border-blue-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-start space-x-3">
          <span
            className={`mt-1 ${
              fallbackInfo?.usedFallback ? 'text-blue-600' : 'text-red-600'
            }`}
            aria-hidden="true"
          >
            {fallbackInfo?.usedFallback ? '🔄' : '⚠️'}
          </span>
          <div className="flex-1 space-y-3">
            <h4
              className={`text-sm font-medium ${
                fallbackInfo?.usedFallback ? 'text-blue-800' : 'text-red-800'
              }`}
            >
              {errorConfig.title}
            </h4>
            <p
              className={`text-sm ${
                fallbackInfo?.usedFallback ? 'text-blue-700' : 'text-red-700'
              }`}
            >
              {errorConfig.message}
            </p>

            {/* Circuit Breaker Status Display */}
            {circuitBreakerStatus && (
              <div className="bg-white/50 p-3 rounded border">
                <h5 className="text-xs font-medium text-gray-700 mb-2">
                  Service Status
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Health:</span>
                    <span
                      className={`text-xs font-medium ${
                        circuitBreakerStatus.isHealthy
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {circuitBreakerStatus.isHealthy ? 'Healthy' : 'Degraded'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Status:</span>
                    <span
                      className={`text-xs font-medium ${
                        circuitBreakerStatus.status === 'closed'
                          ? 'text-green-600'
                          : circuitBreakerStatus.status === 'half-open'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {circuitBreakerStatus.status
                        .replace('-', ' ')
                        .toUpperCase()}
                    </span>
                  </div>
                  {circuitBreakerStatus.failureCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Recent Failures:
                      </span>
                      <span className="text-xs text-gray-800">
                        {circuitBreakerStatus.failureCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fallback Information Display */}
            {fallbackInfo && (
              <div className="bg-white/50 p-3 rounded border">
                <h5 className="text-xs font-medium text-gray-700 mb-2">
                  Analysis Method
                </h5>
                <div className="space-y-2">
                  {fallbackInfo.usedFallback && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Method:</span>
                        <span className="text-xs text-blue-700 font-medium">
                          {fallbackInfo.fallbackMethod || 'Backup Analysis'}
                        </span>
                      </div>
                      {fallbackInfo.fallbackConfidence && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            Confidence:
                          </span>
                          <span className="text-xs text-blue-700 font-medium">
                            {Math.round(fallbackInfo.fallbackConfidence * 100)}%
                          </span>
                        </div>
                      )}
                      {fallbackInfo.fallbackReason && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-600">
                            Reason:{' '}
                          </span>
                          <span className="text-xs text-gray-700">
                            {fallbackInfo.fallbackReason}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {!fallbackInfo.usedFallback &&
                    fallbackInfo.canUseFallback && (
                      <div className="text-xs text-blue-600">
                        Backup analysis available if needed
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Recovery Information Display */}
            {recoveryInfo && (
              <div className="bg-white/50 p-3 rounded border">
                <h5 className="text-xs font-medium text-gray-700 mb-2">
                  Recovery Status
                </h5>
                <div className="space-y-2">
                  {recoveryInfo.autoRecoveryActive && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-700">
                        Auto-recovery active
                      </span>
                    </div>
                  )}

                  {recoveryInfo.isRecovering && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-yellow-700">
                        Service recovering
                      </span>
                    </div>
                  )}

                  {recoveryInfo.estimatedRecoveryTime && (
                    <div className="text-xs text-gray-600">
                      Est. recovery:{' '}
                      {Math.round(recoveryInfo.estimatedRecoveryTime / 1000)}s
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && error !== errorConfig.message && (
              <details
                className={`text-xs ${
                  fallbackInfo?.usedFallback ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                <summary
                  className={`cursor-pointer ${
                    fallbackInfo?.usedFallback
                      ? 'hover:text-blue-700'
                      : 'hover:text-red-700'
                  }`}
                >
                  Technical details
                </summary>
                <pre
                  className={`mt-1 p-2 rounded text-xs overflow-x-auto ${
                    fallbackInfo?.usedFallback ? 'bg-blue-100' : 'bg-red-100'
                  }`}
                >
                  {error}
                </pre>
              </details>
            )}
          </div>
        </div>

        {shouldShowRetry && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              onClick={handleRetryClick}
              disabled={isRetrying}
              className={`${
                fallbackInfo?.usedFallback
                  ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                  : 'text-red-600 hover:text-red-700 hover:bg-red-100'
              }`}
            >
              {isRetrying ? 'Retrying...' : errorConfig.action}
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation dialog for rate limit retry */}
      {showConfirmDialog && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-yellow-800">
              Confirm Retry
            </h4>
            <p className="text-sm text-yellow-700">
              This will retry the analysis immediately, but it may fail again
              due to high demand. Consider waiting a few minutes for better
              results.
            </p>
            <div className="flex space-x-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmDialog(false)}
                className="text-yellow-600 hover:text-yellow-700"
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
              >
                {isRetrying ? 'Retrying...' : 'Retry Now'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
