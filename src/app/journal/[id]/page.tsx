'use client'

import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import JournalEntryDetail from '@/components/features/journal/journal-entry-detail'
import {
  useJournalEntryById,
  useJournalEntriesByUser,
} from '@/hooks/convex/use-journal-entries'
import { useCurrentUser } from '@/hooks/convex/use-users'
import { useRelationships } from '@/hooks/use-relationships'
import type { JournalEntry } from '@/lib/types'

export default function JournalEntryViewPage() {
  const router = useRouter()
  const params = useParams()
  const entryId = params.id as string

  const { user } = useCurrentUser()
  const { entry: journalEntry, isLoading } = useJournalEntryById(
    entryId,
    user?._id
  )
  const { relationships } = useRelationships()
  const { entries: journalEntries } = useJournalEntriesByUser(user?._id)

  // Find the relationship for this entry
  const relationship = useMemo(() => {
    if (!journalEntry || !journalEntry.relationshipId) return undefined
    return relationships.find(
      (r: { _id: string }) => r._id === journalEntry.relationshipId
    )
  }, [journalEntry, relationships])

  // Find related entries with the same relationship
  const relatedEntries = useMemo(() => {
    if (!journalEntry || !journalEntry.relationshipId) return []
    return journalEntries
      .filter(
        (entry: JournalEntry) =>
          entry._id !== journalEntry._id &&
          entry.relationshipId === journalEntry.relationshipId
      )
      .sort((a: JournalEntry, b: JournalEntry) => b.createdAt - a.createdAt)
  }, [journalEntry, journalEntries])

  const handleEdit = () => {
    router.push(`/journal/${entryId}/edit`)
  }

  const handleDelete = () => {
    router.push('/journal')
  }

  const handleBack = () => {
    router.back()
  }

  const handleViewRelated = (relatedEntryId: string) => {
    router.push(`/journal/${relatedEntryId}`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-lg h-96"></div>
        </div>
      </div>
    )
  }

  if (!journalEntry) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Entry Not Found</h1>
          <p className="text-gray-600">
            The journal entry you&apos;re looking for doesn&apos;t exist or has
            been deleted.
          </p>
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <JournalEntryDetail
        entry={journalEntry}
        relationship={relationship}
        relatedEntries={relatedEntries}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBack={handleBack}
        onViewRelated={handleViewRelated}
      />
    </div>
  )
}
