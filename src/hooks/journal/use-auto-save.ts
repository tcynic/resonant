import { useEffect, useState } from 'react'
import { useDebounce } from '../use-debounce'

interface AutoSaveData {
  content: string
  relationshipIds: string[]
  mood?: string
  isPrivate?: boolean
  tags?: string[]
}

interface UseAutoSaveOptions {
  key: string
  delay?: number
  enabled?: boolean
}

interface UseAutoSaveReturn {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved: Date | null
  clearDraft: () => void
  hasDraft: boolean
}

/**
 * Hook for auto-saving journal entry drafts to localStorage
 */
export function useAutoSave(
  data: AutoSaveData,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const { key, delay = 500, enabled = true } = options
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  const debouncedData = useDebounce(data, delay)

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingDraft = localStorage.getItem(`journal-draft-${key}`)
      setHasDraft(!!existingDraft)
    }
  }, [key])

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !debouncedData || !debouncedData.content?.trim()) {
      return
    }

    let statusResetTimeout: NodeJS.Timeout

    const saveDraft = async () => {
      try {
        setSaveStatus('saving')

        // Simulate save delay for better UX
        await new Promise(resolve => setTimeout(resolve, 100))

        const draftData = {
          ...debouncedData,
          timestamp: Date.now(),
        }

        localStorage.setItem(`journal-draft-${key}`, JSON.stringify(draftData))
        setLastSaved(new Date())
        setHasDraft(true)
        setSaveStatus('saved')

        // Reset to idle after 2 seconds with proper cleanup
        statusResetTimeout = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        console.error('Failed to save draft:', error)
        setSaveStatus('error')
        // Reset to idle after error with proper cleanup
        statusResetTimeout = setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }

    saveDraft()

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (statusResetTimeout) {
        clearTimeout(statusResetTimeout)
      }
    }
  }, [debouncedData, enabled, key])

  const clearDraft = () => {
    try {
      localStorage.removeItem(`journal-draft-${key}`)
      setHasDraft(false)
      setSaveStatus('idle')
      setLastSaved(null)
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }

  return {
    saveStatus,
    lastSaved,
    clearDraft,
    hasDraft,
  }
}

/**
 * Hook to retrieve a saved draft
 */
export function useDraftLoader(key: string): AutoSaveData | null {
  const [draft, setDraft] = useState<AutoSaveData | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem(`journal-draft-${key}`)
        if (savedDraft) {
          const parsedDraft = JSON.parse(savedDraft)
          setDraft(parsedDraft)
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }
  }, [key])

  return draft
}
