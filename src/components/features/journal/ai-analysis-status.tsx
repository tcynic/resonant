'use client'

import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useAIAnalysisStatus } from '@/hooks/use-ai-analysis-status'
import { useProcessingProgress } from '@/hooks/use-processing-progress'
import { ProcessingProgress } from './processing-progress'
import { AnalysisErrorHandler } from './analysis-error-handler'

interface AIAnalysisStatusProps {
  entryId: Id<'journalEntries'>
  showProgress?: boolean
  allowRetry?: boolean
  compact?: boolean
}

interface StatusIndicatorProps {
  status: 'processing' | 'completed' | 'failed'
  compact?: boolean
}

function StatusIndicator({ status, compact = false }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: '🔄',
          label: 'Processing',
          className: 'text-blue-600 bg-blue-50 border-blue-200',
          ariaLabel: 'AI analysis in progress',
        }
      case 'completed':
        return {
          icon: '✅',
          label: 'Complete',
          className: 'text-green-600 bg-green-50 border-green-200',
          ariaLabel: 'AI analysis completed successfully',
        }
      case 'failed':
        return {
          icon: '❌',
          label: 'Failed',
          className: 'text-red-600 bg-red-50 border-red-200',
          ariaLabel: 'AI analysis failed',
        }
    }
  }

  const config = getStatusConfig()

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${config.className}`}
        aria-label={config.ariaLabel}
        role="status"
      >
        <span className="mr-1" aria-hidden="true">
          {config.icon}
        </span>
        {config.label}
      </span>
    )
  }

  return (
    <div
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg border ${config.className}`}
      aria-label={config.ariaLabel}
      role="status"
    >
      <span className="mr-2" aria-hidden="true">
        {config.icon}
      </span>
      <span>AI Analysis {config.label}</span>
    </div>
  )
}

function StatusSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
        <div className="h-4 bg-gray-300 rounded w-24"></div>
      </div>
    </div>
  )
}

export function AIAnalysisStatus({
  entryId,
  showProgress = true,
  allowRetry = true,
  compact = false,
}: AIAnalysisStatusProps) {
  const { status, progress, error, canRetry, isLoading, analysis } =
    useAIAnalysisStatus(entryId)
  const { progress: progressData } = useProcessingProgress(analysis)
  const retryAnalysis = useMutation(api.scheduler.requeueAnalysis)

  if (isLoading) {
    return <StatusSkeleton />
  }

  if (!analysis) {
    return null
  }

  const handleRetry = async () => {
    if (!analysis || !canRetry) return

    try {
      await retryAnalysis({
        analysisId: analysis._id,
        priority: 'high', // Upgrade priority on manual retry
        reason: 'user_requested',
      })
    } catch (error) {
      console.error('Failed to retry analysis:', error)
    }
  }

  return (
    <div
      className={`ai-analysis-status ${compact ? 'space-y-2' : 'space-y-4'}`}
    >
      <StatusIndicator status={status!} compact={compact} />

      {showProgress && status === 'processing' && progressData && (
        <ProcessingProgress
          progress={progressData}
          compact={compact}
          queuePosition={progress?.position}
          estimatedCompletion={progress?.estimatedCompletion}
          startedAt={progress?.processingStarted}
        />
      )}

      {status === 'failed' && allowRetry && (
        <AnalysisErrorHandler
          error={error}
          onRetry={handleRetry}
          canRetry={canRetry}
          compact={compact}
        />
      )}
    </div>
  )
}
