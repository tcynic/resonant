'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { LangExtractResult } from '@/lib/types'

type WithLangExtract = {
  langExtractData?: LangExtractResult
}

function hasEnhancedInsights(item: unknown): item is WithLangExtract {
  return typeof item === 'object' && item !== null && 'langExtractData' in item
}

interface RecentAnalysisActivityProps {
  userId: Id<'users'>
  limit?: number
}

export function RecentAnalysisActivity({
  userId,
  limit = 5,
}: RecentAnalysisActivityProps) {
  const recentAnalyses = useQuery(api.aiAnalysis.getRecentAnalyses, {
    userId,
    limit,
  })

  if (!recentAnalyses || recentAnalyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Recent AI Analysis
          </h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-sm text-gray-600">No recent analyses</p>
            <p className="text-xs text-gray-500 mt-1">
              Create journal entries to see AI insights
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasAnyEnhancedInsights = Array.isArray(recentAnalyses)
    ? recentAnalyses.some(
        a => hasEnhancedInsights(a) && a.langExtractData?.processingSuccess
      )
    : false

  const isEnhancedAnalysis = (item: unknown): boolean =>
    hasEnhancedInsights(item) && !!item.langExtractData?.processingSuccess

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getSentimentEmoji = (score?: number) => {
    if (!score) return '📊'
    if (score >= 0.7) return '😊'
    if (score >= 0.3) return '😐'
    return '😔'
  }

  const getSentimentLabel = (score?: number) => {
    if (!score) return 'Analyzed'
    if (score >= 0.7) return 'Positive'
    if (score >= 0.3) return 'Neutral'
    return 'Negative'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'processing':
        return '⏳'
      case 'failed':
        return '❌'
      default:
        return '📊'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'processing':
        return 'text-blue-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent AI Analysis
          </h3>
          <div className="flex items-center gap-2">
            {hasAnyEnhancedInsights && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                🔍 Enhanced
              </span>
            )}
            <Link
              href="/journal"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentAnalyses.map(analysis => (
            <div
              key={analysis._id}
              className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                <span className="text-lg">
                  {analysis.status === 'completed'
                    ? getSentimentEmoji(analysis.sentimentScore)
                    : getStatusIcon(analysis.status)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-medium ${getStatusColor(analysis.status)}`}
                    >
                      {analysis.status === 'completed'
                        ? getSentimentLabel(analysis.sentimentScore)
                        : analysis.status.charAt(0).toUpperCase() +
                          analysis.status.slice(1)}
                    </span>
                    {isEnhancedAnalysis(analysis) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                        Enhanced
                      </span>
                    )}
                    {analysis.relationshipName && (
                      <span className="text-xs text-gray-500">
                        • {analysis.relationshipName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimeAgo(analysis.createdAt)}
                  </span>
                </div>

                {/* Entry Preview */}
                {analysis.entryContent && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {analysis.entryContent.length > 100
                      ? `${analysis.entryContent.substring(0, 100)}...`
                      : analysis.entryContent}
                  </p>
                )}

                {/* Confidence Level */}
                {analysis.status === 'completed' &&
                  analysis.confidenceLevel && (
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${analysis.confidenceLevel * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(analysis.confidenceLevel * 100)}% confidence
                      </span>
                    </div>
                  )}

                {/* View Entry Link */}
                <Link
                  href={`/journal/${analysis.entryId}`}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                >
                  View Entry →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-green-600">
                {recentAnalyses.filter(a => a.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-600">Completed</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-600">
                {recentAnalyses.filter(a => a.status === 'processing').length}
              </p>
              <p className="text-xs text-gray-600">Processing</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">
                {recentAnalyses.filter(a => a.status === 'failed').length}
              </p>
              <p className="text-xs text-gray-600">Failed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
