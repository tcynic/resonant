'use client'

import { useState } from 'react'
import { AlertCircle, RotateCcw, X, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Button from '@/components/ui/button'

export interface DraftRecoveryProps {
  isVisible: boolean
  draftTimestamp?: Date
  onRecover: () => void
  onDismiss: () => void
  title?: string
  message?: string
  className?: string
}

export function DraftRecovery({
  isVisible,
  draftTimestamp,
  onRecover,
  onDismiss,
  title = 'Draft Available',
  message = 'You have an unsaved draft. Would you like to recover it?',
  className = '',
}: DraftRecoveryProps) {
  const [isRecovering, setIsRecovering] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (!isVisible || isDismissed) {
    return null
  }

  const handleRecover = async () => {
    setIsRecovering(true)
    try {
      await onRecover()
      setIsDismissed(true)
    } catch (error) {
      console.error('Failed to recover draft:', error)
    } finally {
      setIsRecovering(false)
    }
  }

  const handleDismiss = () => {
    onDismiss()
    setIsDismissed(true)
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) {
      return 'just now'
    } else if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    } else if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    } else {
      return `${days} day${days === 1 ? '' : 's'} ago`
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md ${className}`}
      role="alert"
      aria-live="polite"
    >
      <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50 border-blue-200 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-blue-900 mb-1">{title}</h3>

            <p className="text-sm text-blue-800 mb-2">{message}</p>

            {draftTimestamp && (
              <div className="flex items-center text-xs text-blue-700 mb-3">
                <Clock className="w-3 h-3 mr-1" />
                <span>Last saved {formatTimestamp(draftTimestamp)}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={handleRecover}
                disabled={isRecovering}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRecovering ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Recover Draft
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-blue-800 hover:text-blue-900 hover:bg-blue-100"
              >
                Dismiss
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-blue-100 transition-colors"
            aria-label="Dismiss draft notification"
          >
            <X className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </Card>
    </div>
  )
}

/**
 * Auto-save status indicator component
 */
export interface AutoSaveStatusProps {
  isAutoSaving: boolean
  isDrafted: boolean
  lastSaved?: Date
  error?: Error
  className?: string
}

export function AutoSaveStatus({
  isAutoSaving,
  isDrafted,
  lastSaved,
  error,
  className = '',
}: AutoSaveStatusProps) {
  const getStatusText = () => {
    if (error) {
      return 'Save failed'
    }
    if (isAutoSaving) {
      return 'Saving...'
    }
    if (isDrafted && lastSaved) {
      return `Saved ${formatRelativeTime(lastSaved)}`
    }
    return 'Not saved'
  }

  const getStatusColor = () => {
    if (error) {
      return 'text-red-600'
    }
    if (isAutoSaving) {
      return 'text-blue-600'
    }
    if (isDrafted) {
      return 'text-green-600'
    }
    return 'text-gray-500'
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)

    if (seconds < 30) {
      return 'just now'
    } else if (seconds < 60) {
      return `${seconds}s ago`
    } else if (minutes < 60) {
      return `${minutes}m ago`
    } else {
      return 'a while ago'
    }
  }

  return (
    <div
      className={`flex items-center space-x-1 text-xs ${getStatusColor()} ${className}`}
      role="status"
      aria-live="polite"
    >
      {isAutoSaving && (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      )}

      <span>{getStatusText()}</span>

      {error && (
        <AlertCircle
          className="w-3 h-3"
          aria-label={`Error: ${error.message}`}
        />
      )}
    </div>
  )
}

/**
 * Draft indicator badge for navigation or lists
 */
export interface DraftIndicatorProps {
  hasDraft: boolean
  className?: string
}

export function DraftIndicator({
  hasDraft,
  className = '',
}: DraftIndicatorProps) {
  if (!hasDraft) return null

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ${className}`}
      title="Has unsaved draft"
    >
      Draft
    </span>
  )
}
