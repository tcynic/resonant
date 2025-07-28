'use client'

import { useMemo } from 'react'
import { Id } from '@/convex/_generated/dataModel'

interface AIAnalysisStatus {
  _id: Id<'aiAnalysis'>
  status: 'processing' | 'completed' | 'failed'
  queuePosition?: number
  estimatedCompletionTime?: number
  processingStartedAt?: number
  queuedAt?: number
  createdAt: number
  priority?: 'normal' | 'high' | 'urgent'
}

interface ProcessingProgress {
  phase: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  eta?: number
  message: string
}

// Processing progress calculation
export function calculateProcessingProgress(
  analysis: AIAnalysisStatus | null
): ProcessingProgress | null {
  if (!analysis || analysis.status !== 'processing') {
    if (analysis?.status === 'completed') {
      return {
        phase: 'completed',
        progress: 100,
        message: 'Analysis complete',
      }
    }
    if (analysis?.status === 'failed') {
      return {
        phase: 'failed',
        progress: 0,
        message: 'Analysis failed',
      }
    }
    return null
  }

  const now = Date.now()
  const queuedAt = analysis.queuedAt || analysis.createdAt
  const processingStartedAt = analysis.processingStartedAt

  // Phase 1: Queued (0-30%)
  if (!processingStartedAt) {
    const queueWaitTime = now - queuedAt
    const averageQueueTime = 30000 // 30 seconds average
    const queueProgress = Math.min(queueWaitTime / averageQueueTime, 1) * 30

    return {
      phase: 'queued',
      progress: queueProgress,
      eta: analysis.estimatedCompletionTime,
      message: `Position ${analysis.queuePosition || 'Processing'} in queue`,
    }
  }

  // Phase 2: Processing (30-100%)
  const processingTime = now - processingStartedAt
  const averageProcessingTime = 45000 // 45 seconds average
  const processingProgress =
    Math.min(processingTime / averageProcessingTime, 1) * 70

  return {
    phase: 'processing',
    progress: 30 + processingProgress,
    eta: analysis.estimatedCompletionTime,
    message: 'Analyzing your journal entry...',
  }
}

// Hook for processing progress with ETA management
export function useProcessingProgress(analysis: AIAnalysisStatus | null) {
  const progress = useMemo(
    () => calculateProcessingProgress(analysis),
    [analysis]
  )

  const etaFormatted = useMemo(() => {
    if (!progress?.eta) return null

    const remaining = progress.eta - Date.now()
    if (remaining <= 0) return 'Any moment now...'

    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    if (minutes > 0) {
      return `~${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
    } else {
      return `~${seconds} second${seconds !== 1 ? 's' : ''} remaining`
    }
  }, [progress?.eta])

  const priorityLabel = useMemo(() => {
    if (!analysis?.priority) return null

    const labels = {
      urgent: 'High Priority',
      high: 'Priority',
      normal: 'Standard',
    }
    return labels[analysis.priority]
  }, [analysis?.priority])

  return {
    progress,
    etaFormatted,
    priorityLabel,
    isQueued: progress?.phase === 'queued',
    isProcessing: progress?.phase === 'processing',
    isCompleted: progress?.phase === 'completed',
    isFailed: progress?.phase === 'failed',
  }
}

// Utility function for time formatting
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Utility function for relative time
export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  return 'Just now'
}
