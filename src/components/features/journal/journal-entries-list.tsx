'use client'

import React, { useState, useMemo } from 'react'
import {
  useJournalEntries,
  useJournalEntryMutations,
} from '@/hooks/journal/use-journal-entries'
import { useRelationships } from '@/hooks/use-relationships'
import { JournalEntry, MoodType, JournalEntrySearchOptions } from '@/lib/types'
import Input from '@/components/ui/input'
import Select from '@/components/ui/select'
import Button from '@/components/ui/button'
import { ConfirmationDialog } from '@/components/ui/dialog'
import JournalEntryCard from './journal-entry-card'

interface JournalEntriesListProps {
  onCreateNew?: () => void
  onView?: (entryId: string) => void
  onEdit?: (entryId: string) => void
  onDelete?: (entryId: string) => void
  searchOptions?: JournalEntrySearchOptions
}

const moodOptions = [
  { value: 'all', label: 'All Moods' },
  { value: 'happy', label: '😊 Happy' },
  { value: 'excited', label: '🤩 Excited' },
  { value: 'content', label: '😌 Content' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'sad', label: '😢 Sad' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'frustrated', label: '😤 Frustrated' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'confused', label: '😕 Confused' },
  { value: 'grateful', label: '🙏 Grateful' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'updated', label: 'Recently Updated' },
]

export default function JournalEntriesList({
  onCreateNew,
  onView,
  onEdit,
  onDelete,
}: JournalEntriesListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMood, setFilterMood] = useState<MoodType | 'all'>('all')
  const [filterRelationship, setFilterRelationship] = useState<string>('all')
  const [filterPrivacy, setFilterPrivacy] = useState<
    'all' | 'private' | 'shared'
  >('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'updated'>(
    'newest'
  )
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    entryId: string
    entryTitle: string
  }>({ isOpen: false, entryId: '', entryTitle: '' })

  const { journalEntries, isLoading } = useJournalEntries()
  const { relationships } = useRelationships()
  const { deleteJournalEntry } = useJournalEntryMutations()
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)

  // Create relationship options for filter
  const relationshipOptions = useMemo(
    () => [
      { value: 'all', label: 'All Relationships' },
      ...relationships.map(rel => ({
        value: rel._id,
        label: rel.name,
      })),
    ],
    [relationships]
  )

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    const filtered = journalEntries.filter((entry: JournalEntry) => {
      // Search term filter
      const matchesSearch =
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.tags &&
          entry.tags.some(tag =>
            tag.toLowerCase().includes(searchTerm.toLowerCase())
          ))

      // Mood filter
      const matchesMood = filterMood === 'all' || entry.mood === filterMood

      // Relationship filter
      const matchesRelationship =
        filterRelationship === 'all' ||
        entry.relationshipId === filterRelationship

      // Privacy filter
      const matchesPrivacy =
        filterPrivacy === 'all' ||
        (filterPrivacy === 'private' && entry.isPrivate) ||
        (filterPrivacy === 'shared' && !entry.isPrivate)

      return (
        matchesSearch && matchesMood && matchesRelationship && matchesPrivacy
      )
    })

    // Sort entries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt - b.createdAt
        case 'updated':
          return b.updatedAt - a.updatedAt
        case 'newest':
        default:
          return b.createdAt - a.createdAt
      }
    })

    return filtered
  }, [
    journalEntries,
    searchTerm,
    filterMood,
    filterRelationship,
    filterPrivacy,
    sortBy,
  ])

  const clearFilters = () => {
    setSearchTerm('')
    setFilterMood('all')
    setFilterRelationship('all')
    setFilterPrivacy('all')
    setSortBy('newest')
  }

  const hasActiveFilters =
    searchTerm ||
    filterMood !== 'all' ||
    filterRelationship !== 'all' ||
    filterPrivacy !== 'all' ||
    sortBy !== 'newest'

  const handleDeleteClick = (entryId: string, entry: JournalEntry) => {
    const entryTitle =
      entry.content.length > 50
        ? entry.content.substring(0, 50) + '...'
        : entry.content

    setDeleteConfirmation({
      isOpen: true,
      entryId,
      entryTitle,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.entryId) return

    setIsDeletingEntry(true)
    try {
      await deleteJournalEntry(deleteConfirmation.entryId)

      // Call the parent's onDelete callback if provided
      if (onDelete) {
        onDelete(deleteConfirmation.entryId)
      }

      // Close the confirmation dialog
      setDeleteConfirmation({ isOpen: false, entryId: '', entryTitle: '' })
    } catch (error) {
      console.error('Failed to delete journal entry:', error)
      // TODO: Show error notification
    } finally {
      setIsDeletingEntry(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, entryId: '', entryTitle: '' })
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loading-skeleton">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Journal Entries</h2>
          <p className="text-gray-600">
            Your relationship journal ({journalEntries.length} total entries)
          </p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} variant="primary">
            Write New Entry
          </Button>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <Input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Select
          value={filterRelationship}
          onChange={e => setFilterRelationship(e.target.value)}
          options={relationshipOptions}
        />

        <Select
          value={filterMood}
          onChange={e => setFilterMood(e.target.value as MoodType | 'all')}
          options={moodOptions}
        />

        <Select
          value={sortBy}
          onChange={e =>
            setSortBy(e.target.value as 'newest' | 'oldest' | 'updated')
          }
          options={sortOptions}
        />
      </div>

      {/* Privacy and Clear Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Select
            value={filterPrivacy}
            onChange={e =>
              setFilterPrivacy(e.target.value as 'all' | 'private' | 'shared')
            }
            options={[
              { value: 'all', label: 'All Entries' },
              { value: 'private', label: '🔒 Private Only' },
              { value: 'shared', label: '🔓 Shared Only' },
            ]}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results Count */}
        {filteredAndSortedEntries.length !== journalEntries.length && (
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedEntries.length} of {journalEntries.length}{' '}
            entries
          </p>
        )}
      </div>

      {/* Entries List */}
      {filteredAndSortedEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedEntries.map((entry: JournalEntry) => {
            const relationship = relationships.find(
              r => r._id === entry.relationshipId
            )

            return (
              <JournalEntryCard
                key={entry._id}
                entry={entry}
                relationship={relationship}
                onView={onView ? () => onView(entry._id) : undefined}
                onEdit={onEdit ? () => onEdit(entry._id) : undefined}
                onDelete={() => handleDeleteClick(entry._id, entry)}
              />
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          {hasActiveFilters ? (
            /* No Results State */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No entries found
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Try adjusting your search terms or filter criteria to find what
                you&apos;re looking for.
              </p>
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            /* No Entries State */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No journal entries yet
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Start journaling about your relationships to track patterns and
                insights over time.
              </p>
              {onCreateNew && (
                <Button onClick={onCreateNew} variant="primary">
                  Write Your First Entry
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Journal Entry"
        message={`Are you sure you want to delete this journal entry? "${deleteConfirmation.entryTitle}" This action cannot be undone.`}
        confirmText="Delete Entry"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeletingEntry}
      />
    </div>
  )
}
