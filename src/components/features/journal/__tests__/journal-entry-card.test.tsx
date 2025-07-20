import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import JournalEntryCard from '../journal-entry-card'
import { JournalEntry, Relationship } from '@/lib/types'

// Mock Card component
jest.mock('@/components/ui/card', () => {
  return function MockCard({ children, className }: any) {
    return (
      <div className={className} data-testid="journal-card">
        {children}
      </div>
    )
  }
})

jest.mock('@/components/ui/button', () => {
  return function MockButton({
    children,
    onClick,
    variant,
    size,
    className,
  }: any) {
    return (
      <button
        onClick={onClick}
        className={className}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </button>
    )
  }
})

describe('JournalEntryCard', () => {
  const mockEntry: JournalEntry = {
    _id: 'entry_123',
    userId: 'user_123',
    relationshipId: 'rel_123',
    content:
      'This is a test journal entry with some content that might be long enough to test truncation functionality.',
    mood: 'happy',
    isPrivate: true,
    tags: ['test', 'journal', 'entry'],
    createdAt: Date.now() - 86400000, // 1 day ago
    updatedAt: Date.now() - 3600000, // 1 hour ago (edited)
  }

  const mockRelationship: Relationship = {
    _id: 'rel_123',
    name: 'Alice',
    type: 'friend',
    userId: 'user_123',
    photo: 'https://example.com/alice.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const defaultProps = {
    entry: mockEntry,
    relationship: mockRelationship,
    onView: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render journal entry card', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByTestId('journal-card')).toBeInTheDocument()
      expect(
        screen.getByText(/This is a test journal entry/)
      ).toBeInTheDocument()
    })

    it('should truncate long content', () => {
      const longEntry = {
        ...mockEntry,
        content:
          'This is a very long journal entry that should be truncated because it exceeds the maximum length limit that we have set for the preview in the card component.',
      }

      render(<JournalEntryCard {...defaultProps} entry={longEntry} />)

      const content = screen.getByText(/This is a very long journal entry/)
      expect(content.textContent).toMatch(/\.\.\./)
      expect(content.textContent!.length).toBeLessThanOrEqual(153) // 150 chars + "..."
    })

    it('should not truncate short content', () => {
      const shortEntry = {
        ...mockEntry,
        content: 'Short content',
      }

      render(<JournalEntryCard {...defaultProps} entry={shortEntry} />)

      const content = screen.getByText('Short content')
      expect(content.textContent).not.toMatch(/\.\.\./)
    })
  })

  describe('Date Formatting', () => {
    beforeAll(() => {
      // Mock Date.now() for consistent testing
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('should show "Today" for entries created today', () => {
      const todayEntry = {
        ...mockEntry,
        createdAt: Date.now() - 3600000, // 1 hour ago
        updatedAt: Date.now() - 3600000,
      }

      render(<JournalEntryCard {...defaultProps} entry={todayEntry} />)

      expect(screen.getByText(/Today at/)).toBeInTheDocument()
    })

    it('should show "Yesterday" for entries created yesterday', () => {
      const yesterdayEntry = {
        ...mockEntry,
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now() - 86400000,
      }

      render(<JournalEntryCard {...defaultProps} entry={yesterdayEntry} />)

      expect(screen.getByText(/Yesterday at/)).toBeInTheDocument()
    })

    it('should show days ago for recent entries', () => {
      const recentEntry = {
        ...mockEntry,
        createdAt: Date.now() - 3 * 86400000, // 3 days ago
        updatedAt: Date.now() - 3 * 86400000,
      }

      render(<JournalEntryCard {...defaultProps} entry={recentEntry} />)

      expect(screen.getByText('3 days ago')).toBeInTheDocument()
    })

    it('should show formatted date for older entries', () => {
      const oldEntry = {
        ...mockEntry,
        createdAt: Date.now() - 10 * 86400000, // 10 days ago
        updatedAt: Date.now() - 10 * 86400000,
      }

      render(<JournalEntryCard {...defaultProps} entry={oldEntry} />)

      // Should show formatted date instead of "X days ago"
      const dateElement = screen.getByText(/\d+\/\d+\/\d+/)
      expect(dateElement).toBeInTheDocument()
    })

    it('should show edit indicator when entry has been updated', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByText(/\(edited/)).toBeInTheDocument()
    })

    it('should not show edit indicator when entry has not been updated', () => {
      const unEditedEntry = {
        ...mockEntry,
        updatedAt: mockEntry.createdAt, // Same as created time
      }

      render(<JournalEntryCard {...defaultProps} entry={unEditedEntry} />)

      expect(screen.queryByText(/\(edited/)).not.toBeInTheDocument()
    })
  })

  describe('Mood Display', () => {
    it('should display mood emoji when mood is present', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByText('😊')).toBeInTheDocument()
    })

    it('should not display mood when not present', () => {
      const entryWithoutMood = {
        ...mockEntry,
        mood: undefined,
      }

      render(<JournalEntryCard {...defaultProps} entry={entryWithoutMood} />)

      expect(screen.queryByText('😊')).not.toBeInTheDocument()
    })

    it('should show mood tooltip', () => {
      render(<JournalEntryCard {...defaultProps} />)

      const moodElement = screen.getByTitle('Mood: happy')
      expect(moodElement).toBeInTheDocument()
    })
  })

  describe('Privacy Indicator', () => {
    it('should show private indicator for private entries', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByText('🔒 Private')).toBeInTheDocument()
    })

    it('should not show private indicator for public entries', () => {
      const publicEntry = {
        ...mockEntry,
        isPrivate: false,
      }

      render(<JournalEntryCard {...defaultProps} entry={publicEntry} />)

      expect(screen.queryByText('🔒 Private')).not.toBeInTheDocument()
    })
  })

  describe('Relationship Display', () => {
    it('should display relationship name and type', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('(friend)')).toBeInTheDocument()
    })

    it('should display relationship photo when available', () => {
      render(<JournalEntryCard {...defaultProps} />)

      const img = screen.getByAltText('Alice photo')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg')
    })

    it('should display initials when photo is not available', () => {
      const relationshipWithoutPhoto = {
        ...mockRelationship,
        photo: undefined,
      }

      render(
        <JournalEntryCard
          {...defaultProps}
          relationship={relationshipWithoutPhoto}
        />
      )

      expect(screen.getByText('A')).toBeInTheDocument() // First letter of Alice
    })

    it('should handle missing relationship gracefully', () => {
      render(<JournalEntryCard {...defaultProps} relationship={undefined} />)

      expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    })
  })

  describe('Tags Display', () => {
    it('should display all tags', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByText('#test')).toBeInTheDocument()
      expect(screen.getByText('#journal')).toBeInTheDocument()
      expect(screen.getByText('#entry')).toBeInTheDocument()
    })

    it('should not display tags section when no tags', () => {
      const entryWithoutTags = {
        ...mockEntry,
        tags: undefined,
      }

      render(<JournalEntryCard {...defaultProps} entry={entryWithoutTags} />)

      expect(screen.queryByText(/^#/)).not.toBeInTheDocument()
    })

    it('should handle empty tags array', () => {
      const entryWithEmptyTags = {
        ...mockEntry,
        tags: [],
      }

      render(<JournalEntryCard {...defaultProps} entry={entryWithEmptyTags} />)

      expect(screen.queryByText(/^#/)).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render action buttons when callbacks are provided', () => {
      render(<JournalEntryCard {...defaultProps} />)

      expect(screen.getByText('View')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should call onView when view button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntryCard {...defaultProps} />)

      const viewButton = screen.getByText('View')
      await user.click(viewButton)

      expect(defaultProps.onView).toHaveBeenCalledTimes(1)
    })

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntryCard {...defaultProps} />)

      const editButton = screen.getByText('Edit')
      await user.click(editButton)

      expect(defaultProps.onEdit).toHaveBeenCalledTimes(1)
    })

    it('should call onDelete when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<JournalEntryCard {...defaultProps} />)

      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      expect(defaultProps.onDelete).toHaveBeenCalledTimes(1)
    })

    it('should not render actions when showActions is false', () => {
      render(<JournalEntryCard {...defaultProps} showActions={false} />)

      expect(screen.queryByText('View')).not.toBeInTheDocument()
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should not render action buttons when callbacks are not provided', () => {
      render(
        <JournalEntryCard
          entry={mockEntry}
          relationship={mockRelationship}
          onView={undefined}
          onEdit={undefined}
          onDelete={undefined}
        />
      )

      expect(screen.queryByText('View')).not.toBeInTheDocument()
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should render only provided action buttons', () => {
      render(
        <JournalEntryCard
          entry={mockEntry}
          relationship={mockRelationship}
          onView={defaultProps.onView}
          onEdit={undefined}
          onDelete={defaultProps.onDelete}
        />
      )

      expect(screen.getByText('View')).toBeInTheDocument()
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply hover effect class', () => {
      render(<JournalEntryCard {...defaultProps} />)

      const card = screen.getByTestId('journal-card')
      expect(card).toHaveClass('hover:shadow-md')
    })

    it('should apply proper button variants', () => {
      render(<JournalEntryCard {...defaultProps} />)

      const viewButton = screen.getByText('View')
      const editButton = screen.getByText('Edit')
      const deleteButton = screen.getByText('Delete')

      expect(viewButton).toHaveAttribute('data-variant', 'ghost')
      expect(editButton).toHaveAttribute('data-variant', 'ghost')
      expect(deleteButton).toHaveAttribute('data-variant', 'ghost')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long relationship names', () => {
      const longNameRelationship = {
        ...mockRelationship,
        name: 'This is a very long relationship name that might cause layout issues',
      }

      render(
        <JournalEntryCard
          {...defaultProps}
          relationship={longNameRelationship}
        />
      )

      expect(
        screen.getByText(
          'This is a very long relationship name that might cause layout issues'
        )
      ).toBeInTheDocument()
    })

    it('should handle many tags', () => {
      const entryWithManyTags = {
        ...mockEntry,
        tags: Array.from({ length: 10 }, (_, i) => `tag${i + 1}`),
      }

      render(<JournalEntryCard {...defaultProps} entry={entryWithManyTags} />)

      // Check that all tags are rendered
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`#tag${i}`)).toBeInTheDocument()
      }
    })

    it('should handle special characters in content', () => {
      const entryWithSpecialChars = {
        ...mockEntry,
        content: 'Content with "quotes" and <tags> & special chars!',
      }

      render(
        <JournalEntryCard {...defaultProps} entry={entryWithSpecialChars} />
      )

      expect(
        screen.getByText('Content with "quotes" and <tags> & special chars!')
      ).toBeInTheDocument()
    })

    it('should handle undefined mood gracefully', () => {
      const entryWithUndefinedMood = {
        ...mockEntry,
        mood: undefined,
      }

      render(
        <JournalEntryCard {...defaultProps} entry={entryWithUndefinedMood} />
      )

      // Should not crash and should not show any mood
      expect(screen.getByTestId('journal-card')).toBeInTheDocument()
    })
  })
})
