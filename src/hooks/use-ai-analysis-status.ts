'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useState, useEffect } from 'react'

interface AIAnalysisStatus {
  _id: Id<'aiAnalysis'>
  entryId: Id<'journalEntries'>
  userId: Id<'users'>
  status: 'processing' | 'completed' | 'failed'
  queuePosition?: number
  estimatedCompletionTime?: number
  processingStartedAt?: number
  processingAttempts?: number
  lastErrorMessage?: string
  priority?: 'normal' | 'high' | 'urgent'
  createdAt: number
  statusUpdatedAt?: number
}

export interface UseAIAnalysisStatusReturn {
  status?: 'processing' | 'completed' | 'failed'
  progress: {
    position?: number
    estimatedCompletion?: number
    processingStarted?: number
  } | null
  error?: string
  canRetry: boolean
  isLoading: boolean
  analysis: AIAnalysisStatus | null
}

// Real-time status subscription pattern
export function useAIAnalysisStatus(
  entryId: Id<'journalEntries'>
): UseAIAnalysisStatusReturn {
  const analysis = useQuery(api.aiAnalysis.getStatusWithQueue, { entryId })

  return {
    status: analysis?.status,
    progress: analysis?.queuePosition
      ? {
          position: analysis.queuePosition,
          estimatedCompletion: analysis.estimatedCompletionTime,
          processingStarted: analysis.processingStartedAt,
        }
      : null,
    error: analysis?.lastErrorMessage,
    canRetry:
      analysis?.status === 'failed' && (analysis?.processingAttempts || 0) < 3,
    isLoading: analysis === undefined,
    analysis: analysis ? (analysis as AIAnalysisStatus) : null,
  }
}

// Optimized subscription pattern for cross-tab compatibility
export function useOptimizedAIStatus(
  entryId: Id<'journalEntries'>
): UseAIAnalysisStatusReturn {
  const [isTabVisible, setIsTabVisible] = useState(
    typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true
  )

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Reduce subscription frequency for hidden tabs
  const analysis = useQuery(
    api.aiAnalysis.getStatusWithQueue,
    { entryId },
    {
      // Slower polling for background tabs
      ...(typeof window !== 'undefined' && {
        optimisticUpdates: isTabVisible,
      }),
    }
  )

  return {
    status: analysis?.status,
    progress: analysis?.queuePosition
      ? {
          position: analysis.queuePosition,
          estimatedCompletion: analysis.estimatedCompletionTime,
          processingStarted: analysis.processingStartedAt,
        }
      : null,
    error: analysis?.lastErrorMessage,
    canRetry:
      analysis?.status === 'failed' && (analysis?.processingAttempts || 0) < 3,
    isLoading: analysis === undefined,
    analysis: analysis ? (analysis as AIAnalysisStatus) : null,
  }
}

// Hook for getting user's active processing items
export function useUserActiveProcessing(userId: Id<'users'>) {
  const processing = useQuery(api.aiAnalysis.getUserActiveProcessing, {
    userId,
  })

  return {
    items: processing || [],
    count: processing?.length || 0,
    isLoading: processing === undefined,
  }
}

// Hook for processing statistics
export function useProcessingStats(userId?: Id<'users'>) {
  const stats = useQuery(
    api.aiAnalysis.getProcessingStats,
    userId ? { userId } : {}
  )

  return {
    stats: stats || {
      total: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      queuedItems: 0,
      averageProcessingTime: 0,
      successRate: 0,
    },
    isLoading: stats === undefined,
  }
}
