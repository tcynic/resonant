'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ActivityItem } from '@/lib/types'

interface RecentActivityProps {
  activities: ActivityItem[]
  totalCount: number
  analysisRate: number
  className?: string
  showViewAll?: boolean
}

interface ActivityItemComponentProps {
  activity: ActivityItem
}

interface SentimentBadgeProps {
  score: number | null
  emotions: string[]
  confidence?: number | null
}

function SentimentBadge({ score, confidence }: SentimentBadgeProps) {
  if (score === null) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
        <span className="w-2 h-2 bg-gray-300 rounded-full mr-1" />
        Analyzing...
      </div>
    )
  }

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800'
    if (score >= 50) return 'bg-blue-100 text-blue-800'
    if (score >= 30) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getSentimentEmoji = (score: number) => {
    if (score >= 80) return '😊'
    if (score >= 60) return '🙂'
    if (score >= 40) return '😐'
    if (score >= 20) return '😔'
    return '😞'
  }

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return 'Positive'
    if (score >= 50) return 'Good'
    if (score >= 30) return 'Neutral'
    return 'Negative'
  }

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(score)}`}
    >
      <span className="mr-1">{getSentimentEmoji(score)}</span>
      {getSentimentLabel(score)}
      {confidence && confidence < 0.7 && (
        <span className="ml-1 text-xs opacity-75">?</span>
      )}
    </div>
  )
}

function ActivityItemComponent({ activity }: ActivityItemComponentProps) {
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (60 * 1000))
    const hours = Math.floor(diff / (60 * 60 * 1000))
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="flex space-x-3 p-4 hover:bg-gray-50 transition-colors rounded-lg">
      {/* Relationship Avatar */}
      <div className="flex-shrink-0">
        {activity.relationship?.photo ? (
          <Image
            src={activity.relationship.photo}
            alt={activity.relationship.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {activity.relationship?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900">
              {activity.relationship?.name || 'Unknown Relationship'}
            </h4>
            <span className="text-xs text-gray-500 capitalize">
              {activity.relationship?.type}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <SentimentBadge
              score={activity.analysisStatus.sentimentScore}
              emotions={activity.analysisStatus.emotions}
              confidence={activity.analysisStatus.confidence}
            />
            <span className="text-xs text-gray-500">
              {formatTimeAgo(activity.createdAt)}
            </span>
          </div>
        </div>

        {/* Entry Preview */}
        <p className="text-sm text-gray-700 mb-2">{activity.preview}</p>

        {/* Tags and Mood */}
        <div className="flex items-center space-x-4 text-xs">
          {activity.mood && (
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800">
              {activity.mood}
            </span>
          )}
          {activity.tags && activity.tags.length > 0 && (
            <div className="flex space-x-1">
              {activity.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                >
                  #{tag}
                </span>
              ))}
              {activity.tags.length > 3 && (
                <span className="text-gray-500">
                  +{activity.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Emotions Display */}
        {activity.analysisStatus.emotions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {activity.analysisStatus.emotions
              .slice(0, 4)
              .map((emotion, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
                >
                  {emotion}
                </span>
              ))}
            {activity.analysisStatus.emotions.length > 4 && (
              <span className="text-xs text-gray-500">
                +{activity.analysisStatus.emotions.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 flex items-center space-x-1">
        <Link
          href={`/journal/${activity._id}`}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="View entry"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </Link>
        <Link
          href={`/journal/${activity._id}/edit`}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Edit entry"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </Link>
      </div>
    </div>
  )
}

export default function RecentActivity({
  activities,
  totalCount,
  analysisRate,
  className = '',
  showViewAll = true,
}: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card className={className} padding="md">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-gray-400">📝</span>
            </div>
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">
              Start by creating your first journal entry
            </p>
            <Link
              href="/journal/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Journal Entry
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className} padding="none">
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500">
              {totalCount} entries • {Math.round(analysisRate * 100)}% analyzed
            </p>
          </div>
          {showViewAll && (
            <Link
              href="/journal"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-0 py-0">
        {/* Activity List */}
        <div className="divide-y divide-gray-100">
          {activities.map(activity => (
            <ActivityItemComponent key={activity._id} activity={activity} />
          ))}
        </div>

        {/* Footer with Quick Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Showing {activities.length} of {totalCount} recent entries
            </div>
            <div className="flex space-x-2">
              <Link
                href="/journal/new"
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Entry
              </Link>
              {showViewAll && (
                <Link
                  href="/journal"
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  View History
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
