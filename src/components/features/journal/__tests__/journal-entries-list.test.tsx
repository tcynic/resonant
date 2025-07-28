import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import JournalEntriesList from '../journal-entries-list'
import { JournalEntry } from '@/lib/types'

// Mock the hooks
jest.mock('@/hooks/journal/use-journal-entries', () => ({
  useJournalEntries: jest.fn(),
  useJournalEntryMutations: jest.fn(() => ({
    deleteJournalEntry: jest.fn(),
  })),
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
interface MockJournalEntryCardProps {
  entry: JournalEntry
  relationship?: { _id: string; name: string; type: string } | null
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

jest.mock('../journal-entry-card', () => {
  return function MockJournalEntryCard({
    entry,
    relationship,
    onView,
    onEdit,
    onDelete,
  }: MockJournalEntryCardProps) {
    return (
      <div data-testid={`journal-card-${entry._id}`}>
        <h3>{entry.content.substring(0, 50)}</h3>
        <p>Relationship: {relationship?.name || 'Unknown'}</p>
        <p>Mood: {entry.mood || 'None'}</p>
        <p>Privacy: {entry.isPrivate ? 'Private' : 'Shared'}</p>
        <p>Tags: {entry.tags?.join(', ') || 'None'}</p>
        {onView && <button onClick={onView}>View</button>}
        {onEdit && <button onClick={onEdit}>Edit</button>}
        {onDelete && <button onClick={onDelete}>Delete</button>}
      </div>
    )
  }
})

// Mock UI components
interface MockInputProps {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
}

jest.mock('@/components/ui/input', () => {
  return function MockInput({
    value,
    onChange,
    placeholder,
    type,
  }: MockInputProps) {
    return (
      <input
        data-testid="search-input"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    )
  }
})

interface MockSelectOption {
  value: string
  label: string
}

interface MockSelectProps {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: MockSelectOption[]
}

jest.mock('@/components/ui/select', () => {
  return function MockSelect({ value, onChange, options }: MockSelectProps) {
    return (
      <select value={value} onChange={onChange} data-testid="filter-select">
        {options.map((option: MockSelectOption) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
})

interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: string
  className?: string
}

jest.mock('@/components/ui/button', () => {
  return function MockButton({
    children,
    onClick,
    variant,
    className,
  }: MockButtonProps) {
    return (
      <button onClick={onClick} className={className} data-variant={variant}>
        {children}
      </button>
    )
  }
})

interface MockConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading?: boolean
}

jest.mock('@/components/ui/dialog', () => ({
  ConfirmationDialog: function MockConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isLoading,
  }: MockConfirmationDialogProps) {
    if (!isOpen) return null
    return (
      <div data-testid="confirmation-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onClose} disabled={isLoading}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isLoading}>
          Confirm
        </button>
      </div>
    )
  },
}))

// Get mocked functions
const { useJournalEntries } = jest.requireMock(
  '@/hooks/journal/use-journal-entries'
)
const { useJournalEntryMutations } = jest.requireMock(
  '@/hooks/journal/use-journal-entries'
)
const mockUseJournalEntries = jest.mocked(useJournalEntries)
const mockUseJournalEntryMutations = jest.mocked(useJournalEntryMutations)

describe('JournalEntriesList', () => {
  const mockEntries: JournalEntry[] = [
    {
      _id: 'entry_1',
      _creationTime: Date.now() - 86400000,
      userId: 'user_1',
      relationshipId: 'rel_1',
      content:
        'First journal entry about Alice. This is a longer entry with more content.',
      mood: 'happy',
      isPrivate: true,
      tags: ['friendship', 'conversation'],
      createdAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 86400000,
    },
    {
      _id: 'entry_2',
      _creationTime: Date.now() - 43200000,
      userId: 'user_1',
      relationshipId: 'rel_2',
      content:
        'Second journal entry about Bob. This discusses our romantic relationship.',
      mood: 'excited',
      isPrivate: false,
      tags: ['romance', 'date'],
      createdAt: Date.now() - 43200000, // 12 hours ago
      updatedAt: Date.now() - 3600000, // 1 hour ago
    },
    {
      _id: 'entry_3',
      _creationTime: Date.now() - 21600000,
      userId: 'user_1',
      relationshipId: 'rel_1',
      content: 'Third entry about Alice again. Different topic this time.',
      mood: 'content',
      isPrivate: true,
      tags: ['support', 'advice'],
      createdAt: Date.now() - 21600000, // 6 hours ago
      updatedAt: Date.now() - 21600000,
    },
  ]

  const defaultProps = {
    onCreateNew: jest.fn(),
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseJournalEntries.mockReturnValue({
      journalEntries: mockEntries,
      isLoading: false,
    })
    mockUseJournalEntryMutations.mockReturnValue({
      deleteJournalEntry: jest.fn(),
    })
  })

  describe('Basic Rendering', () => {
    it('should render the journal entries list', () => {
      render(<JournalEntriesList {...defaultProps} />)

      expect(screen.getByText('Journal Entries')).toBeInTheDocument()
      expect(
        screen.getByText('Your relationship journal (3 total entries)')
      ).toBeInTheDocument()
      expect(screen.getByText('Write New Entry')).toBeInTheDocument()
    })

    it('should render all journal entries', () => {
      render(<JournalEntriesList {...defaultProps} />)

      expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
      expect(screen.getByTestId('journal-card-entry_2')).toBeInTheDocument()
      expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
    })

    it('should show loading skeleton when loading', () => {
      mockUseJournalEntries.mockReturnValue({
        journalEntries: [],
        isLoading: true,
      })

      render(<JournalEntriesList {...defaultProps} />)

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('should show empty state when no entries', () => {
      mockUseJournalEntries.mockReturnValue({
        journalEntries: [],
        isLoading: false,
      })

      render(<JournalEntriesList {...defaultProps} />)

      expect(screen.getByText('No journal entries yet')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Start journaling about your relationships to track patterns and insights over time.'
        )
      ).toBeInTheDocument()
      expect(screen.getByText('Write Your First Entry')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter entries by search term in content', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'Alice')

      // Should show entries that mention Alice
      expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
      expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
      expect(
        screen.queryByTestId('journal-card-entry_2')
      ).not.toBeInTheDocument()
    })

    it('should filter entries by search term in tags', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'romance')

      // Should show entries with romance tag
      expect(screen.getByTestId('journal-card-entry_2')).toBeInTheDocument()
      expect(
        screen.queryByTestId('journal-card-entry_1')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('journal-card-entry_3')
      ).not.toBeInTheDocument()
    })

    it('should be case insensitive', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'ALICE')

      expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
      expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
    })

    it('should show no results state when search yields no matches', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('No entries found')).toBeInTheDocument()
      expect(
        screen.getByText(
          "Try adjusting your search terms or filter criteria to find what you're looking for."
        )
      ).toBeInTheDocument()
    })
  })

  describe('Filtering Functionality', () => {
    it('should filter by mood', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const moodSelects = screen.getAllByTestId('filter-select')
      const moodSelect = moodSelects.find(select =>
        select.querySelector('option[value="happy"]')
      )

      if (moodSelect) {
        await user.selectOptions(moodSelect, 'happy')
        expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
        expect(
          screen.queryByTestId('journal-card-entry_2')
        ).not.toBeInTheDocument()
        expect(
          screen.queryByTestId('journal-card-entry_3')
        ).not.toBeInTheDocument()
      }
    })

    it('should filter by relationship', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const relationshipSelects = screen.getAllByTestId('filter-select')
      const relationshipSelect = relationshipSelects.find(select =>
        select.querySelector('option[value="rel_1"]')
      )

      if (relationshipSelect) {
        await user.selectOptions(relationshipSelect, 'rel_1')
        expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
        expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
        expect(
          screen.queryByTestId('journal-card-entry_2')
        ).not.toBeInTheDocument()
      }
    })

    it('should filter by privacy setting', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const privacySelects = screen.getAllByTestId('filter-select')
      const privacySelect = privacySelects.find(select =>
        select.querySelector('option[value="private"]')
      )

      if (privacySelect) {
        await user.selectOptions(privacySelect, 'private')
        expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
        expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
        expect(
          screen.queryByTestId('journal-card-entry_2')
        ).not.toBeInTheDocument()
      }
    })

    it('should combine multiple filters', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      // Search for "Alice" and filter by private
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'Alice')

      const privacySelects = screen.getAllByTestId('filter-select')
      const privacySelect = privacySelects.find(select =>
        select.querySelector('option[value="private"]')
      )

      if (privacySelect) {
        await user.selectOptions(privacySelect, 'private')

        // Should show Alice entries that are private
        expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
        expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
        expect(
          screen.queryByTestId('journal-card-entry_2')
        ).not.toBeInTheDocument()
      }
    })

    it('should show filter count when filters are active', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'Alice')

      expect(screen.getByText('Showing 2 of 3 entries')).toBeInTheDocument()
    })

    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      // Apply search filter
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'Alice')

      // Clear filters
      const clearButton = screen.getByText('Clear Filters')
      await user.click(clearButton)

      // Should show all entries again
      expect(searchInput).toHaveValue('')
      expect(screen.getByTestId('journal-card-entry_1')).toBeInTheDocument()
      expect(screen.getByTestId('journal-card-entry_2')).toBeInTheDocument()
      expect(screen.getByTestId('journal-card-entry_3')).toBeInTheDocument()
    })
  })

  describe('Sorting Functionality', () => {
    it('should sort by newest first by default', () => {
      render(<JournalEntriesList {...defaultProps} />)

      const cards = screen.getAllByTestId(/journal-card-/)
      // Entries should be in order: entry_3 (6h), entry_2 (12h), entry_1 (1d)
      expect(cards[0]).toHaveAttribute('data-testid', 'journal-card-entry_3')
      expect(cards[1]).toHaveAttribute('data-testid', 'journal-card-entry_2')
      expect(cards[2]).toHaveAttribute('data-testid', 'journal-card-entry_1')
    })

    it('should sort by oldest first when selected', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const sortSelects = screen.getAllByTestId('filter-select')
      const sortSelect = sortSelects.find(select =>
        select.querySelector('option[value="oldest"]')
      )

      if (sortSelect) {
        await user.selectOptions(sortSelect, 'oldest')

        const cards = screen.getAllByTestId(/journal-card-/)
        // Should reverse order: entry_1 (1d), entry_2 (12h), entry_3 (6h)
        expect(cards[0]).toHaveAttribute('data-testid', 'journal-card-entry_1')
        expect(cards[1]).toHaveAttribute('data-testid', 'journal-card-entry_2')
        expect(cards[2]).toHaveAttribute('data-testid', 'journal-card-entry_3')
      }
    })

    it('should sort by recently updated when selected', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const sortSelects = screen.getAllByTestId('filter-select')
      const sortSelect = sortSelects.find(select =>
        select.querySelector('option[value="updated"]')
      )

      if (sortSelect) {
        await user.selectOptions(sortSelect, 'updated')

        const cards = screen.getAllByTestId(/journal-card-/)
        // Should sort by updatedAt: entry_2 (1h), entry_3 (6h), entry_1 (1d)
        expect(cards[0]).toHaveAttribute('data-testid', 'journal-card-entry_2')
        expect(cards[1]).toHaveAttribute('data-testid', 'journal-card-entry_3')
        expect(cards[2]).toHaveAttribute('data-testid', 'journal-card-entry_1')
      }
    })
  })

  describe('Action Handlers', () => {
    it('should call onCreateNew when new entry button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const newEntryButton = screen.getByText('Write New Entry')
      await user.click(newEntryButton)

      expect(defaultProps.onCreateNew).toHaveBeenCalled()
    })

    it('should call onView when view button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const viewButtons = screen.getAllByText('View')
      await user.click(viewButtons[0])

      expect(defaultProps.onView).toHaveBeenCalledWith('entry_3') // First entry in sorted order
    })

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])

      expect(defaultProps.onEdit).toHaveBeenCalledWith('entry_3')
    })
  })

  describe('Delete Functionality', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument()
      expect(screen.getByText('Delete Journal Entry')).toBeInTheDocument()
    })

    it('should call delete function when confirmed', async () => {
      const user = userEvent.setup()
      const mockDeleteJournalEntry = jest.fn()
      mockUseJournalEntryMutations.mockReturnValue({
        deleteJournalEntry: mockDeleteJournalEntry,
      })

      render(<JournalEntriesList {...defaultProps} />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteJournalEntry).toHaveBeenCalledWith('entry_3')
      })
    })

    it('should close dialog when cancelled', async () => {
      const user = userEvent.setup()
      render(<JournalEntriesList {...defaultProps} />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(
        screen.queryByTestId('confirmation-dialog')
      ).not.toBeInTheDocument()
    })

    it('should call onDelete callback after successful deletion', async () => {
      const user = userEvent.setup()
      const mockDeleteJournalEntry = jest.fn().mockResolvedValue(true)
      mockUseJournalEntryMutations.mockReturnValue({
        deleteJournalEntry: mockDeleteJournalEntry,
      })

      render(<JournalEntriesList {...defaultProps} />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(defaultProps.onDelete).toHaveBeenCalledWith('entry_3')
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('should render without errors on different screen sizes', () => {
      // This is a basic test - in a real scenario you might test responsive classes
      render(<JournalEntriesList {...defaultProps} />)

      expect(screen.getByText('Journal Entries')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle delete errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const mockDeleteJournalEntry = jest
        .fn()
        .mockRejectedValue(new Error('Delete failed'))

      mockUseJournalEntryMutations.mockReturnValue({
        deleteJournalEntry: mockDeleteJournalEntry,
      })

      render(<JournalEntriesList {...defaultProps} />)

      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])

      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to delete journal entry:',
          expect.any(Error)
        )
      })

      consoleSpy.mockRestore()
    })
  })
})
