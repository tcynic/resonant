'use client'

import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import JournalEntryEditor from '@/components/features/journal/journal-entry-editor'
import {
  useJournalEntryById,
  useUpdateJournalEntry,
} from '@/hooks/convex/use-journal-entries'
import { useCurrentUser } from '@/hooks/convex/use-users'
import { UpdateJournalEntryData } from '@/lib/types'

export default function EditJournalEntryPage() {
  const router = useRouter()
  const params = useParams()
  const entryId = params.id as string

  const { user } = useCurrentUser()
  const { entry: journalEntry, isLoading: isLoadingEntry } =
    useJournalEntryById(entryId, user?._id)
  const { updateEntry } = useUpdateJournalEntry()
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async (data: UpdateJournalEntryData): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    try {
      const result = await updateEntry({
        entryId,
        userId: user._id,
        ...data,
      })

      if (result.success) {
        router.push(`/journal/${entryId}`)
        return entryId
      } else {
        throw new Error(result.error || 'Failed to update entry')
      }
    } catch (error) {
      console.error('Failed to update journal entry:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoadingEntry) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
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
            The journal entry you&apos;re trying to edit doesn&apos;t exist or
            has been deleted.
          </p>
          <button
            onClick={() => router.push('/journal')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Journal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <JournalEntryEditor
        entry={journalEntry}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
