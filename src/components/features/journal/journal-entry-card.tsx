'use client'

import React from 'react'
import { JournalEntry, Relationship, MoodType } from '@/lib/types'
import Button from '@/components/ui/button'
import Card from '@/components/ui/card'

interface JournalEntryCardProps {
  entry: JournalEntry
  relationship?: Relationship
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
}

const moodEmojis: Record<MoodType, string> = {
  happy: '😊',
  excited: '🤩',
  content: '😌',
  neutral: '😐',
  sad: '😢',
  angry: '😠',
  frustrated: '😤',
  anxious: '😰',
  confused: '😕',
  grateful: '🙏',
}

export default function JournalEntryCard({
  entry,
  relationship,
  onView,
  onEdit,
  onDelete,
  showActions = true,
}: JournalEntryCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const hasBeenUpdated = entry.updatedAt !== entry.createdAt

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {/* Header with date and privacy indicator */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {formatDate(entry.createdAt)}
            </span>
            {hasBeenUpdated && (
              <span className="text-xs text-gray-500">
                (edited {formatDate(entry.updatedAt)})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {entry.isPrivate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                🔒 Private
              </span>
            )}
            {entry.mood && (
              <span className="text-lg" title={`Mood: ${entry.mood}`}>
                {moodEmojis[entry.mood as MoodType]}
              </span>
            )}
          </div>
        </div>

        {/* Relationship info */}
        {relationship && (
          <div className="flex items-center space-x-2">
            {relationship.photo ? (
              <img
                src={relationship.photo}
                alt={`${relationship.name} photo`}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {relationship.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-900">
              {relationship.name}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              ({relationship.type})
            </span>
          </div>
        )}

        {/* Content preview */}
        <div className="text-sm text-gray-800 leading-relaxed">
          {truncateContent(entry.content)}
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {showActions && (onView || onEdit || onDelete) && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="flex space-x-2">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onView}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="text-gray-600 hover:text-gray-700"
                >
                  Edit
                </Button>
              )}
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
