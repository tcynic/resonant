'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface AutoSaveOptions {
  delay?: number // Auto-save delay in milliseconds
  key: string // Unique key for this draft
  enabled?: boolean // Whether auto-save is enabled
  onSave?: (content: unknown) => Promise<void> // Optional callback for server-side save
  onError?: (error: Error) => void // Error handler
}

export interface AutoSaveState {
  isDrafted: boolean
  isAutoSaving: boolean
  lastSaved?: Date
  error?: Error
}

/**
 * Hook for automatic draft saving with local storage backup
 */
export function useAutoSave<T>(
  content: T,
  options: AutoSaveOptions
): AutoSaveState & {
  saveDraft: () => Promise<void>
  clearDraft: () => void
  getDraft: () => T | null
} {
  const {
    delay = 30000, // 30 seconds default
    key,
    enabled = true,
    onSave,
    onError,
  } = options

  const [isDrafted, setIsDrafted] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>()
  const [error, setError] = useState<Error | undefined>()

  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastContentRef = useRef<T>()

  // Generate storage key
  const storageKey = `draft_${key}`

  // Check if content has changed significantly
  const hasContentChanged = useCallback((newContent: T, oldContent?: T) => {
    if (!oldContent && !newContent) return false
    if (!oldContent || !newContent) return true

    // For strings, check minimum change threshold
    if (typeof newContent === 'string' && typeof oldContent === 'string') {
      const minChangeLength = 5 // Minimum characters changed to trigger save
      return (
        Math.abs(newContent.length - oldContent.length) >= minChangeLength ||
        newContent !== oldContent
      )
    }

    // For objects, do deep comparison
    try {
      return JSON.stringify(newContent) !== JSON.stringify(oldContent)
    } catch {
      return true // If JSON serialization fails, assume changed
    }
  }, [])

  // Save draft to local storage
  const saveDraftToStorage = useCallback(
    (contentToSave: T) => {
      try {
        const draftData = {
          content: contentToSave,
          timestamp: Date.now(),
          key,
        }
        localStorage.setItem(storageKey, JSON.stringify(draftData))
        return true
      } catch (error) {
        console.error('Failed to save draft to localStorage:', error)
        return false
      }
    },
    [storageKey, key]
  )

  // Load draft from local storage
  const getDraft = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const draftData = JSON.parse(stored)

      // Validate draft data structure
      if (!draftData || typeof draftData !== 'object' || !draftData.content) {
        return null
      }

      // Check if draft is too old (older than 24 hours)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      const age = Date.now() - draftData.timestamp
      if (age > maxAge) {
        localStorage.removeItem(storageKey)
        return null
      }

      return draftData.content as T
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error)
      return null
    }
  }, [storageKey])

  // Clear draft from local storage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setIsDrafted(false)
      setLastSaved(undefined)
      setError(undefined)
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [storageKey])

  // Manual save function
  const saveDraft = useCallback(async () => {
    if (!enabled || isAutoSaving) return

    setIsAutoSaving(true)
    setError(undefined)

    try {
      // Save to local storage first (always)
      const localSuccess = saveDraftToStorage(content)

      if (localSuccess) {
        setIsDrafted(true)
        setLastSaved(new Date())
      }

      // Call optional server-side save
      if (onSave) {
        await onSave(content)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Save failed')
      setError(err)
      onError?.(err)
    } finally {
      setIsAutoSaving(false)
      lastContentRef.current = content
    }
  }, [content, enabled, isAutoSaving, onSave, onError, saveDraftToStorage])

  // Auto-save effect
  useEffect(() => {
    if (!enabled || isAutoSaving) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only save if content has changed significantly
    if (!hasContentChanged(content, lastContentRef.current)) {
      return
    }

    // Check if content is worth saving (not empty)
    const isEmpty =
      !content ||
      (typeof content === 'string' && content.trim().length === 0) ||
      (typeof content === 'object' && Object.keys(content).length === 0)

    if (isEmpty) {
      return
    }

    // Set up auto-save timeout
    timeoutRef.current = setTimeout(saveDraft, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [content, enabled, delay, saveDraft, hasContentChanged, isAutoSaving])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isDrafted,
    isAutoSaving,
    lastSaved,
    error,
    saveDraft,
    clearDraft,
    getDraft,
  }
}

/**
 * Hook for draft recovery on component mount
 */
export function useDraftRecovery<T>(
  key: string,
  onRecover?: (draft: T) => void
): {
  hasDraft: boolean
  draftTimestamp?: Date
  recoverDraft: () => T | null
  clearDraft: () => void
} {
  const [hasDraft, setHasDraft] = useState(false)
  const [draftTimestamp, setDraftTimestamp] = useState<Date | undefined>()

  const storageKey = `draft_${key}`

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const draftData = JSON.parse(stored)
        const timestamp = new Date(draftData.timestamp)

        // Check if draft is not too old
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours
        const age = Date.now() - draftData.timestamp

        if (age <= maxAge) {
          setHasDraft(true)
          setDraftTimestamp(timestamp)

          // Auto-recover if callback provided
          if (onRecover && draftData.content) {
            onRecover(draftData.content)
          }
        } else {
          // Remove old draft
          localStorage.removeItem(storageKey)
        }
      }
    } catch (error) {
      console.error('Failed to check for draft:', error)
    }
  }, [storageKey, onRecover])

  const recoverDraft = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null

      const draftData = JSON.parse(stored)
      return draftData.content as T
    } catch (error) {
      console.error('Failed to recover draft:', error)
      return null
    }
  }, [storageKey])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setHasDraft(false)
      setDraftTimestamp(undefined)
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [storageKey])

  return {
    hasDraft,
    draftTimestamp,
    recoverDraft,
    clearDraft,
  }
}
