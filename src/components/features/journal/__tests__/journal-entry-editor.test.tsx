import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import JournalEntryEditor from '../journal-entry-editor'
import { JournalEntry } from '@/lib/types'

// Mock the hooks
jest.mock('@/hooks/journal/use-auto-save', () => ({
  useAutoSave: jest.fn(() => ({
    saveStatus: 'idle',
    lastSaved: null,
    clearDraft: jest.fn(),
    hasDraft: false,
  })),
  useDraftLoader: jest.fn(() => null),
}))

jest.mock('@/hooks/use-relationships', () => ({
  useRelationships: jest.fn(() => ({
    relationships: [
      { _id: 'rel_1', name: 'Alice', type: 'friend' },
      { _id: 'rel_2', name: 'Bob', type: 'romantic' },
    ],
  })),
}))

// Mock child components
interface MockMoodSelectorProps {
  value?: string
  onChange?: (mood: string) => void
  label?: string
}

jest.mock('../mood-selector', () => {
  return function MockMoodSelector({
    value,
    onChange,
    label,
  }: MockMoodSelectorProps) {
    return (
      <div data-testid="mood-selector">
        <label>{label}</label>
        <select
          data-testid="mood-select"
          value={value || ''}
          onChange={e => onChange?.(e.target.value || '')}
        >
          <option value="">No mood selected</option>
          <option value="happy">Happy</option>
          <option value="sad">Sad</option>
        </select>
      </div>
    )
  }
})

interface MockTagInputProps {
  value?: string[]
  onChange: (tags: string[]) => void
  label?: string
}

jest.mock('../tag-input', () => {
  return function MockTagInput({ value, onChange, label }: MockTagInputProps) {
    return (
      <div data-testid="tag-input">
        <label>{label}</label>
        <input
          data-testid="tag-input-field"
          value={value?.join(', ') || ''}
          onChange={e => onChange(e.target.value.split(', ').filter(Boolean))}
          placeholder="Enter tags separated by commas"
        />
      </div>
    )
  }
})

interface MockRelationshipPickerProps {
  value?: string[]
  onChange: (ids: string[]) => void
  label?: string
  required?: boolean
}

jest.mock('../relationship-picker', () => {
  return function MockRelationshipPicker({
    value,
    onChange,
    label,
    required,
  }: MockRelationshipPickerProps) {
    return (
      <div data-testid="relationship-picker">
        <label>
          {label} {required && '*'}
        </label>
        <select
          data-testid="relationship-select"
          value={value?.[0] || ''}
          onChange={e => onChange(e.target.value ? [e.target.value] : [])}
          required={required}
        >
          <option value="">Select a relationship</option>
          <option value="rel_1">Alice</option>
          <option value="rel_2">Bob</option>
        </select>
      </div>
    )
  }
})

describe('JournalEntryEditor', () => {
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('New Entry Mode', () => {
    it('should render editor for new entry', () => {
      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      expect(screen.getByText('New Journal Entry')).toBeInTheDocument()
      expect(
        screen.getByText('Share your thoughts and feelings')
      ).toBeInTheDocument()
      expect(screen.getByLabelText("What's on your mind?")).toBeInTheDocument()
      expect(screen.getByText('Save Entry')).toBeInTheDocument()
    })

    it('should show character count', () => {
      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      expect(screen.getByText('0 characters')).toBeInTheDocument()
    })

    it('should update character count when typing', async () => {
      const user = userEvent.setup()

      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      const textarea = screen.getByLabelText("What's on your mind?")
      await user.type(textarea, 'Hello')

      expect(screen.getByText('5 characters')).toBeInTheDocument()
    })

    it('should require content and relationship for save', async () => {
      const user = userEvent.setup()

      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      const saveButton = screen.getByText('Save Entry')
      expect(saveButton).toBeDisabled()

      // Add content but no relationship
      const textarea = screen.getByLabelText("What's on your mind?")
      await user.type(textarea, 'This is a test entry with enough content')

      expect(saveButton).toBeDisabled() // Still disabled without relationship

      // Add relationship
      const relationshipSelect = screen.getByTestId('relationship-select')
      await user.selectOptions(relationshipSelect, 'rel_1')

      expect(saveButton).not.toBeDisabled()
    })

    it('should validate minimum content length', async () => {
      const user = userEvent.setup()

      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Add relationship first
      const relationshipSelect = screen.getByTestId('relationship-select')
      await user.selectOptions(relationshipSelect, 'rel_1')

      // Add short content
      const textarea = screen.getByLabelText("What's on your mind?")
      await user.type(textarea, 'Short')

      const saveButton = screen.getByText('Save Entry')
      await user.click(saveButton)

      // Should show validation error
      expect(
        screen.getByText('Content must be at least 10 characters')
      ).toBeInTheDocument()
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should call onSave with correct data', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValue('new_entry_id')

      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Fill in all fields
      const textarea = screen.getByLabelText("What's on your mind?")
      await user.type(
        textarea,
        'This is a complete journal entry with enough content'
      )

      const relationshipSelect = screen.getByTestId('relationship-select')
      await user.selectOptions(relationshipSelect, 'rel_1')

      const moodSelect = screen.getByTestId('mood-select')
      await user.selectOptions(moodSelect, 'happy')

      const tagInput = screen.getByTestId('tag-input-field')
      await user.type(tagInput, 'testjournal')
      await user.keyboard('{Enter}')

      // Private checkbox should start as false (unchecked), so we don't click it

      const saveButton = screen.getByText('Save Entry')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          relationshipId: 'rel_1',
          content: 'This is a complete journal entry with enough content',
          mood: 'happy',
          isPrivate: false,
          tags: ['testjournal'],
        })
      })
    })

    it('should handle cancel action', async () => {
      const user = userEvent.setup()

      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Edit Entry Mode', () => {
    const mockEntry: JournalEntry = {
      _id: 'entry_123',
      _creationTime: Date.now() - 86400000,
      userId: 'user_123',
      relationshipId: 'rel_1',
      content: 'Existing journal entry content',
      mood: 'happy',
      isPrivate: true,
      tags: ['existing', 'entry'],
      createdAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 3600000, // 1 hour ago
    }

    it('should render editor in edit mode', () => {
      render(
        <JournalEntryEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Edit Journal Entry')).toBeInTheDocument()
      expect(screen.getByText('Update Entry')).toBeInTheDocument()
    })

    it('should pre-populate form with existing data', () => {
      render(
        <JournalEntryEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const textarea = screen.getByLabelText("What's on your mind?")
      expect(textarea).toHaveValue('Existing journal entry content')

      const relationshipSelect = screen.getByTestId('relationship-select')
      expect(relationshipSelect).toHaveValue('rel_1')

      const moodSelect = screen.getByTestId('mood-select')
      expect(moodSelect).toHaveValue('happy')

      const tagInput = screen.getByTestId('tag-input-field')
      expect(tagInput).toHaveValue('existing, entry')

      const privateCheckbox = screen.getByLabelText('Keep this entry private')
      expect(privateCheckbox).toBeChecked()
    })

    it('should only send changed fields on update', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValue('entry_123')

      render(
        <JournalEntryEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // Only change the mood
      const moodSelect = screen.getByTestId('mood-select')
      await user.selectOptions(moodSelect, 'sad')

      const updateButton = screen.getByText('Update Entry')
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          mood: 'sad',
        })
      })
    })

    it('should detect and send multiple changes', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValue('entry_123')

      render(
        <JournalEntryEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // Change multiple fields
      const textarea = screen.getByLabelText("What's on your mind?")
      await user.clear(textarea)
      await user.type(
        textarea,
        'Updated journal entry content with new information'
      )

      const moodSelect = screen.getByTestId('mood-select')
      await user.selectOptions(moodSelect, 'sad')

      const privateCheckbox = screen.getByLabelText('Keep this entry private')
      await user.click(privateCheckbox) // Toggle to false

      const updateButton = screen.getByText('Update Entry')
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          content: 'Updated journal entry content with new information',
          mood: 'sad',
          isPrivate: false,
        })
      })
    })

    it('should not include unchanged fields in update', async () => {
      const user = userEvent.setup()
      mockOnSave.mockResolvedValue('entry_123')

      render(
        <JournalEntryEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      // Don't change anything, just click update
      const updateButton = screen.getByText('Update Entry')
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({})
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during save', () => {
      render(
        <JournalEntryEditor
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      const saveButton = screen.getByText('Saving...')
      expect(saveButton).toBeDisabled()
    })

    it('should show loading state during update', () => {
      const mockEntry: JournalEntry = {
        _id: 'entry_123',
        _creationTime: Date.now(),
        userId: 'user_123',
        relationshipId: 'rel_1',
        content: 'Existing content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      render(
        <JournalEntryEditor
          entry={mockEntry}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      const updateButton = screen.getByText('Updating...')
      expect(updateButton).toBeDisabled()
    })

    it('should disable cancel button during loading', () => {
      render(
        <JournalEntryEditor
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockOnSave.mockRejectedValue(new Error('Save failed'))

      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      // Fill in required fields
      const textarea = screen.getByLabelText("What's on your mind?")
      await user.type(textarea, 'This is a test entry with enough content')

      const relationshipSelect = screen.getByTestId('relationship-select')
      await user.selectOptions(relationshipSelect, 'rel_1')

      const saveButton = screen.getByText('Save Entry')
      await user.click(saveButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save journal entry:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and required indicators', () => {
      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      expect(screen.getByLabelText("What's on your mind?")).toBeInTheDocument()
      expect(screen.getByText(/\*/)).toBeInTheDocument() // Required indicator
    })

    it('should associate helper text with form fields', () => {
      render(<JournalEntryEditor onSave={mockOnSave} onCancel={mockOnCancel} />)

      expect(
        screen.getByText('Minimum 10 characters required')
      ).toBeInTheDocument()
    })
  })
})
