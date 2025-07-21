'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { JournalEntry, Relationship, MoodType } from '@/lib/types'
import Button from '@/components/ui/button'
import Card from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/ui/dialog'
import { useJournalEntryMutations } from '@/hooks/journal/use-journal-entries'

interface JournalEntryDetailProps {
  entry: JournalEntry
  relationship?: Relationship
  relatedEntries?: JournalEntry[]
  onEdit?: () => void
  onDelete?: () => void
  onBack?: () => void
  onViewRelated?: (entryId: string) => void
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

const moodLabels: Record<MoodType, string> = {
  happy: 'Happy',
  excited: 'Excited',
  content: 'Content',
  neutral: 'Neutral',
  sad: 'Sad',
  angry: 'Angry',
  frustrated: 'Frustrated',
  anxious: 'Anxious',
  confused: 'Confused',
  grateful: 'Grateful',
}

export default function JournalEntryDetail({
  entry,
  relationship,
  relatedEntries = [],
  onEdit,
  onDelete,
  onBack,
  onViewRelated,
}: JournalEntryDetailProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    isLoading: false,
  })

  const { deleteJournalEntry } = useJournalEntryMutations()

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasBeenUpdated = entry.updatedAt !== entry.createdAt

  const handleDeleteClick = () => {
    setDeleteConfirmation({ isOpen: true, isLoading: false })
  }

  const handleDeleteConfirm = async () => {
    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }))

    try {
      await deleteJournalEntry(entry._id)

      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error('Failed to delete journal entry:', error)
      // TODO: Show error notification
    } finally {
      setDeleteConfirmation({ isOpen: false, isLoading: false })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, isLoading: false })
  }

  const entryPreview =
    entry.content.length > 50
      ? entry.content.substring(0, 50) + '...'
      : entry.content

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="p-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal Entry</h1>
            <p className="text-gray-600">{formatDate(entry.createdAt)}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          {onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              Edit Entry
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" onClick={handleDeleteClick}>
              Delete Entry
            </Button>
          )}
        </div>
      </div>

      {/* Main entry content */}
      <Card className="p-6">
        <div className="space-y-6">
          {/* Entry metadata */}
          <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-200">
            {/* Relationship info */}
            {relationship && (
              <div className="flex items-center space-x-2">
                {relationship.photo ? (
                  <Image
                    src={relationship.photo}
                    alt={`${relationship.name} photo`}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {relationship.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-900">
                    {relationship.name}
                  </span>
                  <span className="text-sm text-gray-500 capitalize ml-2">
                    ({relationship.type})
                  </span>
                </div>
              </div>
            )}

            {/* Privacy indicator */}
            {entry.isPrivate && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                🔒 Private Entry
              </span>
            )}

            {/* Mood indicator */}
            {entry.mood && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                <span className="mr-1">
                  {moodEmojis[entry.mood as MoodType]}
                </span>
                {moodLabels[entry.mood as MoodType]}
              </span>
            )}

            {/* Edit indicator */}
            {hasBeenUpdated && (
              <span className="text-sm text-gray-500">
                Last edited: {formatDate(entry.updatedAt)}
              </span>
            )}
          </div>

          {/* Entry content */}
          <div className="prose prose-gray max-w-none">
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </div>
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Related entries */}
      {relatedEntries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Related Entries with {relationship?.name}
          </h3>
          <div className="space-y-3">
            {relatedEntries.slice(0, 5).map(relatedEntry => (
              <div
                key={relatedEntry._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    {relatedEntry.content.length > 80
                      ? relatedEntry.content.substring(0, 80) + '...'
                      : relatedEntry.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(relatedEntry.createdAt)}
                  </p>
                </div>
                {onViewRelated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewRelated(relatedEntry._id)}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
            {relatedEntries.length > 5 && (
              <p className="text-sm text-gray-500">
                ... and {relatedEntries.length - 5} more entries
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Journal Entry"
        message={`Are you sure you want to delete this journal entry? "${entryPreview}" This action cannot be undone.`}
        confirmText="Delete Entry"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deleteConfirmation.isLoading}
      />
    </div>
  )
}
