'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AnalysisErrorHandlerProps {
  error?: string
  onRetry: () => Promise<void>
  canRetry: boolean
  compact?: boolean
}

// Error categories and user messages from Dev Notes
const ERROR_MESSAGES = {
  timeout: {
    title: 'Analysis Taking Longer Than Expected',
    message:
      'The AI analysis is taking longer than usual. This might be due to high demand.',
    action: 'Retry Analysis',
    canRetry: true,
  },
  network: {
    title: 'Connection Issue',
    message:
      'There was a problem connecting to our AI service. Please check your internet connection.',
    action: 'Try Again',
    canRetry: true,
  },
  rate_limit: {
    title: 'Service Temporarily Unavailable',
    message:
      'Our AI service is experiencing high demand. Please wait a moment and try again.',
    action: 'Retry in 1 Minute',
    canRetry: true,
    retryDelay: 60000,
  },
  service_error: {
    title: 'AI Service Error',
    message:
      'The AI analysis service encountered an error. Our team has been notified.',
    action: 'Try Again Later',
    canRetry: true,
  },
  validation: {
    title: 'Content Issue',
    message:
      'There was an issue processing your journal entry content. Please check for any unusual characters.',
    action: 'Edit and Retry',
    canRetry: false,
  },
}

function categorizeError(errorMessage?: string) {
  if (!errorMessage) return ERROR_MESSAGES.service_error

  const message = errorMessage.toLowerCase()

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
}: AnalysisErrorHandlerProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const errorConfig = categorizeError(error)
  const shouldShowRetry = canRetry && errorConfig.canRetry

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
      <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-red-600" aria-hidden="true">
            ⚠️
          </span>
          <span className="text-sm text-red-700 font-medium">
            {errorConfig.title}
          </span>
        </div>
        {shouldShowRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="text-red-600 hover:text-red-700 hover:bg-red-100"
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <span className="text-red-600 mt-1" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-medium text-red-800">
              {errorConfig.title}
            </h4>
            <p className="text-sm text-red-700">{errorConfig.message}</p>
            {error && error !== errorConfig.message && (
              <details className="text-xs text-red-600">
                <summary className="cursor-pointer hover:text-red-700">
                  Technical details
                </summary>
                <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-x-auto">
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
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
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
