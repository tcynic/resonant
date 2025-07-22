'use client'

import React, { useState, useEffect } from 'react'
import {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  JournalEntry,
  MoodType,
} from '@/lib/types'
import Textarea from '@/components/ui/textarea'
import Button from '@/components/ui/button'
import Checkbox from '@/components/ui/checkbox'
import MoodSelector from './mood-selector'
import TagInput from './tag-input'
import RelationshipPicker from './relationship-picker'
import { useAutoSave, useDraftRecovery } from '@/hooks/useAutoSave'
import {
  AutoSaveStatus,
  DraftRecovery,
} from '@/components/features/data-management/draft-recovery'

interface JournalEntryEditorProps {
  entry?: JournalEntry
  onSave: (
    data: CreateJournalEntryData | UpdateJournalEntryData
  ) => Promise<string>
  onCancel?: () => void
  isLoading?: boolean
}

export default function JournalEntryEditor({
  entry,
  onSave,
  onCancel,
  isLoading = false,
}: JournalEntryEditorProps) {
  const isEditing = !!entry
  const draftKey = isEditing ? `edit-${entry._id}` : 'new'

  // Form state
  const [content, setContent] = useState(entry?.content || '')
  const [relationshipIds, setRelationshipIds] = useState<string[]>(
    entry ? [entry.relationshipId] : []
  )
  const [mood, setMood] = useState<MoodType | undefined>(
    entry?.mood as MoodType
  )
  const [isPrivate, setIsPrivate] = useState(entry?.isPrivate ?? true)
  const [tags, setTags] = useState<string[]>(entry?.tags || [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [characterCount, setCharacterCount] = useState(content.length)

  // Auto-save functionality
  const autoSaveData = {
    content,
    relationshipIds,
    mood,
    isPrivate,
    tags,
  }

  const autoSaveResult = useAutoSave(autoSaveData, {
    key: draftKey,
    enabled: !isEditing && content.trim().length > 10, // Only save meaningful content
    delay: 30000, // 30 seconds
  })

  // Draft recovery for new entries
  const draftRecovery = useDraftRecovery(
    draftKey,
    (draft: typeof autoSaveData) => {
      setContent(draft.content || '')
      setRelationshipIds(draft.relationshipIds || [])
      setMood(draft.mood as MoodType)
      setIsPrivate(draft.isPrivate ?? true)
      setTags(draft.tags || [])
    }
  )

  // Update character count
  useEffect(() => {
    setCharacterCount(content.length)
  }, [content])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!content.trim()) {
      newErrors.content = 'Content is required'
    } else if (content.trim().length < 10) {
      newErrors.content = 'Content must be at least 10 characters'
    }

    if (relationshipIds.length === 0) {
      newErrors.relationships = 'At least one relationship must be selected'
    }

    if (tags.length > 5) {
      newErrors.tags = 'Maximum 5 tags allowed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      if (isEditing) {
        // For editing, only send changed fields
        const updateData: UpdateJournalEntryData = {}

        if (content !== entry.content) updateData.content = content
        if (mood !== entry.mood) updateData.mood = mood
        if (isPrivate !== entry.isPrivate) updateData.isPrivate = isPrivate
        if (JSON.stringify(tags) !== JSON.stringify(entry.tags))
          updateData.tags = tags

        await onSave(updateData)
      } else {
        // For new entries, use the first selected relationship
        const createData: CreateJournalEntryData = {
          relationshipId: relationshipIds[0],
          content: content.trim(),
          mood,
          isPrivate,
          tags,
        }

        const newEntryId = await onSave(createData)

        // Clear draft after successful save
        if (newEntryId) {
          autoSaveResult.clearDraft()
        }
      }
    } catch (error) {
      console.error('Failed to save journal entry:', error)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <div className="space-y-6">
      {/* Draft Recovery Notification */}
      <DraftRecovery
        isVisible={!isEditing && draftRecovery.hasDraft}
        draftTimestamp={draftRecovery.draftTimestamp}
        onRecover={() => {
          const draft = draftRecovery.recoverDraft()
          if (draft) {
            setContent(draft.content || '')
            setRelationshipIds(draft.relationshipIds || [])
            setMood(draft.mood as MoodType)
            setIsPrivate(draft.isPrivate ?? true)
            setTags(draft.tags || [])
          }
        }}
        onDismiss={() => draftRecovery.clearDraft()}
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
          </h2>
          {!isEditing && (
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-sm text-gray-600">
                Share your thoughts and feelings
              </p>
              <AutoSaveStatus
                isAutoSaving={autoSaveResult.isAutoSaving}
                isDrafted={autoSaveResult.isDrafted}
                lastSaved={autoSaveResult.lastSaved}
                error={autoSaveResult.error}
              />
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500">{characterCount} characters</div>
      </div>

      {/* Main form */}
      <div className="space-y-6">
        {/* Relationship selection */}
        <RelationshipPicker
          value={relationshipIds}
          onChange={setRelationshipIds}
          label="About which relationship(s)?"
          error={errors.relationships}
          multiple={!isEditing} // Only allow multiple for new entries
          required
        />

        {/* Content */}
        <Textarea
          label="What's on your mind?"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write about your thoughts, feelings, interactions, or anything related to your relationships..."
          rows={8}
          autoResize
          error={errors.content}
          helperText="Minimum 10 characters required"
        />

        {/* Mood selector */}
        <MoodSelector
          value={mood}
          onChange={setMood}
          label="How are you feeling? (Optional)"
        />

        {/* Tags */}
        <TagInput
          value={tags}
          onChange={setTags}
          label="Tags (Optional)"
          error={errors.tags}
          maxTags={5}
          placeholder="Add tags to categorize this entry..."
          suggestions={[
            'communication',
            'conflict',
            'quality-time',
            'appreciation',
            'growth',
            'challenge',
          ]}
        />

        {/* Privacy settings */}
        <Checkbox
          checked={isPrivate}
          onChange={e => setIsPrivate(e.target.checked)}
          label="Keep this entry private"
          description="Private entries are not used for AI analysis and insights"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <div>
          {onCancel && (
            <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
        </div>
        <div className="flex space-x-3">
          {!isEditing && draftRecovery.hasDraft && (
            <Button
              variant="secondary"
              onClick={() => draftRecovery.clearDraft()}
              disabled={isLoading}
            >
              Clear Draft
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isLoading}
            disabled={!content.trim() || relationshipIds.length === 0}
          >
            {isLoading
              ? isEditing
                ? 'Updating...'
                : 'Saving...'
              : isEditing
                ? 'Update Entry'
                : 'Save Entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}
