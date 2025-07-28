'use client'

import { useState, useEffect } from 'react'
import { formatDuration } from '@/hooks/use-processing-progress'

interface ProcessingProgressProps {
  progress: {
    phase: 'queued' | 'processing' | 'completed' | 'failed'
    progress: number // 0-100
    eta?: number
    message: string
  }
  compact?: boolean
  queuePosition?: number
  estimatedCompletion?: number
  startedAt?: number
}

export function ProcessingProgress({
  progress,
  compact = false,
  queuePosition,
  estimatedCompletion,
  startedAt,
}: ProcessingProgressProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Update current time every second for live ETA calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatETA = (eta: number | undefined) => {
    if (!eta) return null

    const remaining = eta - currentTime
    if (remaining <= 0) return 'Any moment now...'

    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    if (minutes > 0) {
      return `~${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
    } else {
      return `~${seconds} second${seconds !== 1 ? 's' : ''} remaining`
    }
  }

  const getPhaseIcon = () => {
    switch (progress.phase) {
      case 'queued':
        return '⏳'
      case 'processing':
        return '🧠'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
    }
  }

  const getProgressColor = () => {
    switch (progress.phase) {
      case 'queued':
        return 'bg-yellow-500'
      case 'processing':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
    }
  }

  const etaText = formatETA(estimatedCompletion || progress.eta)

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span aria-hidden="true">{getPhaseIcon()}</span>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(progress.progress, 100)}%` }}
              role="progressbar"
              aria-valuenow={progress.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${Math.round(progress.progress)}%`}
            />
          </div>
        </div>
        {etaText && <span className="text-xs">{etaText}</span>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg" aria-hidden="true">
            {getPhaseIcon()}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progress.message}
          </span>
        </div>
        {etaText && (
          <span className="text-sm text-gray-500" aria-live="polite">
            {etaText}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span aria-live="polite">{Math.round(progress.progress)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
            role="progressbar"
            aria-valuenow={progress.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`AI analysis progress: ${Math.round(progress.progress)}%`}
          />
        </div>
      </div>

      {queuePosition && progress.phase === 'queued' && (
        <div className="text-sm text-gray-600">
          <span>Position in queue: </span>
          <span className="font-medium">#{queuePosition}</span>
        </div>
      )}

      {startedAt && progress.phase === 'processing' && (
        <div className="text-sm text-gray-600">
          <span>Processing for: </span>
          <span className="font-medium" aria-live="polite">
            {formatDuration(currentTime - startedAt)}
          </span>
        </div>
      )}
    </div>
  )
}
