'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import Card, { CardHeader, CardContent } from './card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <DefaultErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error }: { error?: Error }) {
  return (
    <Card padding="md" className="border-red-200 bg-red-50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <span className="text-red-600 text-xl">⚠️</span>
          <h3 className="text-lg font-semibold text-red-800">
            Something went wrong
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-red-700 mb-4">
          We encountered an unexpected error while loading this section.
        </p>
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mb-4">
            <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
              Error details (development mode)
            </summary>
            <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Reload Page
        </button>
      </CardContent>
    </Card>
  )
}

// Specific error fallback components for different scenarios
export function DashboardErrorFallback({
  onRetry,
}: {
  error?: Error
  onRetry?: () => void
}) {
  return (
    <Card padding="md" className="border-red-200 bg-red-50">
      <CardContent>
        <div className="text-center py-8" data-testid="dashboard-error">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Dashboard Error
          </h3>
          <p className="text-red-700 mb-4 max-w-md mx-auto">
            We couldn&apos;t load your dashboard data. This might be a temporary
            network issue.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            )}
            <a
              href="/dashboard"
              className="px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-md border border-red-300 hover:bg-red-50 transition-colors"
            >
              Refresh Dashboard
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalysisErrorFallback({
  relationshipName,
}: {
  relationshipName?: string
}) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-yellow-600 text-lg">⚠️</span>
        <h4 className="font-medium text-yellow-800">Analysis Unavailable</h4>
      </div>
      <p className="text-yellow-700 text-sm">
        {relationshipName
          ? `Health score analysis for ${relationshipName} is currently unavailable.`
          : 'Health score analysis is currently unavailable for this relationship.'}
      </p>
      <p className="text-yellow-600 text-xs mt-1">
        This may be because the AI analysis is still processing or temporarily
        unavailable.
      </p>
    </div>
  )
}

export function NetworkErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card padding="md" className="border-orange-200 bg-orange-50">
      <CardContent>
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-xl text-orange-600">📡</span>
          </div>
          <h4 className="font-medium text-orange-800 mb-2">Connection Issue</h4>
          <p className="text-orange-700 text-sm mb-4">
            Unable to connect to our servers. Please check your internet
            connection.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ErrorBoundary
