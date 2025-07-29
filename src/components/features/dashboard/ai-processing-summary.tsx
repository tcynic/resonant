'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ProcessingProgress } from '../journal/processing-progress'
import { AnalysisErrorHandler } from '../journal/analysis-error-handler'
import { useMutation } from 'convex/react'

interface AIProcessingSummaryProps {
  userId: Id<'users'>
}

export function AIProcessingSummary({ userId }: AIProcessingSummaryProps) {
  const activeProcessing = useQuery(api.aiAnalysis.getUserActiveProcessing, {
    userId,
  })
  const processingStats = useQuery(api.aiAnalysis.getProcessingStats, {
    userId,
  })
  const retryAnalysis = useMutation(api.scheduler.requeueAnalysis)

  const handleRetry = async (analysisId: Id<'aiAnalysis'>) => {
    await retryAnalysis({
      analysisId,
      priority: 'high',
      reason: 'user_requested',
    })
  }

  if (!activeProcessing && !processingStats) {
    return null
  }

  const hasActiveProcessing = activeProcessing && activeProcessing.length > 0
  const stats = processingStats || {
    totalProcessing: 0,
    averageWaitTime: 0,
    completedToday: 0,
    failedToday: 0,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            AI Analysis Status
          </h3>
          {hasActiveProcessing && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {activeProcessing!.length} Processing
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Processing Statistics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {stats.completedToday}
              </p>
              <p className="text-xs text-gray-600">Completed Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {stats.totalProcessing}
              </p>
              <p className="text-xs text-gray-600">In Queue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {stats.averageWaitTime > 0
                  ? `${Math.round(stats.averageWaitTime / 1000)}s`
                  : '—'}
              </p>
              <p className="text-xs text-gray-600">Avg Wait</p>
            </div>
          </div>

          {/* Active Processing Items */}
          {hasActiveProcessing && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                Currently Processing
              </h4>
              {activeProcessing!.map(analysis => (
                <div
                  key={analysis._id}
                  className="p-3 border border-gray-200 rounded-lg space-y-2"
                >
                  {/* Status and Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-gray-900">
                        Analysis {analysis._id.slice(-8)}
                      </span>
                      {analysis.priority && analysis.priority !== 'normal' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                          {analysis.priority === 'urgent'
                            ? 'High Priority'
                            : 'Priority'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {analysis.queuePosition &&
                        `Position ${analysis.queuePosition}`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {analysis.status === 'processing' && (
                    <ProcessingProgress
                      progress={{
                        phase: 'processing',
                        progress: analysis.queuePosition
                          ? Math.max(0, 100 - analysis.queuePosition * 10)
                          : 50,
                        eta: analysis.estimatedCompletionTime,
                        message: `Processing... ${analysis.queuePosition ? `Position ${analysis.queuePosition} in queue` : 'In progress'}`,
                      }}
                      compact={true}
                    />
                  )}

                  {/* Error Handler */}
                  {analysis.status === 'failed' && (
                    <AnalysisErrorHandler
                      error={analysis.lastErrorMessage}
                      onRetry={() => handleRetry(analysis._id)}
                      canRetry={(analysis.processingAttempts || 0) < 3}
                      compact={true}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!hasActiveProcessing && stats.totalProcessing === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-sm text-gray-600">All analyses complete</p>
              <p className="text-xs text-gray-500 mt-1">
                New journal entries will be analyzed automatically
              </p>
            </div>
          )}

          {/* Failed Analyses Alert */}
          {stats.failedToday > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-red-600">⚠️</span>
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {stats.failedToday} analysis
                    {stats.failedToday > 1 ? 'es' : ''} failed today
                  </p>
                  <p className="text-xs text-red-700">
                    Check your journal entries for retry options
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
