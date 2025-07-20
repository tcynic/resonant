'use client'

/**
 * Client component wrapper for journal entry testing
 */

import JournalEntryEditor from '@/components/features/journal/journal-entry-editor'
import { CreateJournalEntryData, UpdateJournalEntryData } from '@/lib/types'

export function JournalDemoClient() {
  const handleSave = async (
    entry: CreateJournalEntryData | UpdateJournalEntryData
  ): Promise<string> => {
    console.log('Demo: Journal entry would be saved:', entry)
    const relationshipId =
      'relationshipId' in entry ? entry.relationshipId : 'None selected'
    alert(
      `Demo: Journal entry created!\n\nContent: ${entry.content}\nMood: ${entry.mood || 'Not set'}\nTags: ${entry.tags?.join(', ') || 'None'}\nRelationship: ${relationshipId}`
    )
    return `demo_entry_${Date.now()}`
  }

  const handleCancel = () => {
    console.log('Demo: Journal entry creation cancelled')
    alert('Demo: Journal entry creation cancelled')
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <JournalEntryEditor onSave={handleSave} onCancel={handleCancel} />
    </div>
  )
}
