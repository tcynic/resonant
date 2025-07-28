'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import JournalEntryEditor from '@/components/features/journal/journal-entry-editor'
import { useCreateJournalEntry } from '@/hooks/convex/use-journal-entries'
import { useCurrentUser } from '@/hooks/convex/use-users'
import { CreateJournalEntryData, UpdateJournalEntryData } from '@/lib/types'

export default function NewJournalEntryPage() {
  const router = useRouter()
  const { createEntry } = useCreateJournalEntry()
  const { user, isLoading: userLoading } = useCurrentUser()
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async (
    data: CreateJournalEntryData | UpdateJournalEntryData
  ): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    setIsLoading(true)
    try {
      // For new entries, we expect CreateJournalEntryData
      const createData = data as CreateJournalEntryData
      const result = await createEntry({
        userId: user._id,
        relationshipId: createData.relationshipId,
        content: createData.content,
        mood: createData.mood,
        isPrivate: createData.isPrivate,
        tags: createData.tags,
      })

      if (result.success && result.entryId) {
        router.push(`/journal/${result.entryId}`)
        return result.entryId
      } else {
        throw new Error(result.error || 'Failed to create entry')
      }
    } catch (error) {
      console.error('Failed to create journal entry:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (userLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center text-red-600">
          Please sign in to create journal entries
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <JournalEntryEditor
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading || userLoading}
      />
    </div>
  )
}
