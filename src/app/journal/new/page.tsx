'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import JournalEntryEditor from '@/components/features/journal/journal-entry-editor'
import { useJournalEntryMutations } from '@/hooks/journal/use-journal-entries'
import { CreateJournalEntryData } from '@/lib/types'

export default function NewJournalEntryPage() {
  const router = useRouter()
  const { createJournalEntry } = useJournalEntryMutations()
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async (data: CreateJournalEntryData): Promise<string> => {
    setIsLoading(true)
    try {
      const entryId = await createJournalEntry(data)
      router.push(`/journal/${entryId}`)
      return entryId
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

  return (
    <div className="container mx-auto py-8 px-4">
      <JournalEntryEditor
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
