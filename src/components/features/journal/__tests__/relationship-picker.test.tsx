import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RelationshipPicker from '../relationship-picker'
import { Relationship } from '@/lib/types'

// Mock the useRelationships hook
jest.mock('@/hooks/use-relationships', () => ({
  useRelationships: jest.fn(),
}))

import { useRelationships } from '@/hooks/use-relationships'

const mockUseRelationships = useRelationships as jest.MockedFunction<
  typeof useRelationships
>

describe('RelationshipPicker', () => {
  const mockOnChange = jest.fn()

  const mockRelationships = [
    {
      _id: 'rel_1',
      _creationTime: Date.now(),
      userId: 'user_123',
      name: 'Alice Johnson',
      type: 'friend' as const,
      photo: 'https://example.com/alice.jpg',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      _id: 'rel_2',
      _creationTime: Date.now(),
      userId: 'user_123',
      name: 'Bob Smith',
      type: 'romantic' as const,
      photo: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      _id: 'rel_3',
      _creationTime: Date.now(),
      userId: 'user_123',
      name: 'Carol Davis',
      type: 'family' as const,
      photo: 'https://example.com/carol.jpg',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ] as Relationship[]

  const defaultProps = {
    value: [],
    onChange: mockOnChange,
    label: 'Select Relationships',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRelationships.mockReturnValue({
      relationships: mockRelationships as never,
      relationshipsCount: mockRelationships.length,
      isLoading: false,
      currentUser: {
        _id: 'user_123',
        clerkId: 'clerk_123',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: Date.now(),
      },
    })
  })

  describe('Basic Rendering', () => {
    it('should render relationship picker component', () => {
      render(<RelationshipPicker {...defaultProps} />)

      expect(screen.getByText('Select Relationships')).toBeInTheDocument()
      expect(screen.getByText('Select relationships...')).toBeInTheDocument()
    })

    it('should render with custom label', () => {
      render(
        <RelationshipPicker {...defaultProps} label="Choose Relationships" />
      )

      expect(screen.getByText('Choose Relationships')).toBeInTheDocument()
    })

    it('should show required indicator when required', () => {
      render(<RelationshipPicker {...defaultProps} required />)

      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('*')).toHaveClass('text-red-500')
    })

    it('should show error message when provided', () => {
      render(
        <RelationshipPicker {...defaultProps} error="This field is required" />
      )

      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.getByText('This field is required')).toHaveClass(
        'text-red-600'
      )
    })

    it('should apply error styling to button when error exists', () => {
      render(<RelationshipPicker {...defaultProps} error="Error message" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border-red-300')
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      mockUseRelationships.mockReturnValue({
        relationships: [],
        relationshipsCount: 0,
        isLoading: true,
        currentUser: {
          _id: 'user_123',
          clerkId: 'clerk_123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: Date.now(),
        },
      })

      render(<RelationshipPicker {...defaultProps} />)

      expect(screen.getByText('Select Relationships')).toBeInTheDocument()
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })

  describe('Dropdown Interaction', () => {
    it('should open dropdown when button is clicked', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Carol Davis')).toBeInTheDocument()
    })

    it('should close dropdown when button is clicked again', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)
      await user.click(button)

      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })

    it('should show arrow rotation when dropdown is open', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      const arrow = button.querySelector('svg')

      expect(arrow).not.toHaveClass('rotate-180')

      await user.click(button)
      expect(arrow).toHaveClass('rotate-180')
    })

    it('should apply focus styles when dropdown is open', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(button).toHaveClass('ring-2', 'ring-blue-500', 'border-blue-500')
    })
  })

  describe('Multiple Selection Mode', () => {
    it('should select multiple relationships in multiple mode', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} multiple />)

      const button = screen.getByRole('button')
      await user.click(button)

      const aliceOption = screen.getByText('Alice Johnson').closest('div')
      await user.click(aliceOption!)
      expect(mockOnChange).toHaveBeenCalledWith(['rel_1'])

      // For the second selection, we need to simulate the updated value
      mockOnChange.mockClear()
      const bobOption = screen.getByText('Bob Smith').closest('div')
      await user.click(bobOption!)
      expect(mockOnChange).toHaveBeenCalledWith(['rel_2'])
    })

    it('should deselect relationship when clicked again in multiple mode', async () => {
      const user = userEvent.setup()
      render(
        <RelationshipPicker {...defaultProps} value={['rel_1']} multiple />
      )

      // Click the main dropdown button (should be the first button)
      const dropdownButton = screen.getAllByRole('button')[0]
      await user.click(dropdownButton)

      // Find Alice's checkbox in the dropdown and click to deselect
      const checkboxes = screen.getAllByRole('checkbox')
      const aliceCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('div')?.textContent?.includes('Alice Johnson')
      )
      expect(aliceCheckbox).toBeTruthy()
      expect(aliceCheckbox).toBeChecked()

      await user.click(aliceCheckbox!)
      expect(mockOnChange).toHaveBeenCalledWith([])
    })

    it('should show checkboxes in multiple mode', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} multiple />)

      const button = screen.getByRole('button')
      await user.click(button)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(3)
    })

    it('should check checkboxes for selected relationships', async () => {
      const user = userEvent.setup()
      render(
        <RelationshipPicker
          {...defaultProps}
          value={['rel_1', 'rel_3']}
          multiple
        />
      )

      const dropdownButton = screen.getAllByRole('button')[0]
      await user.click(dropdownButton)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(3)
      expect(checkboxes[0]).toBeChecked() // Alice
      expect(checkboxes[1]).not.toBeChecked() // Bob
      expect(checkboxes[2]).toBeChecked() // Carol
    })

    it('should display selected relationships as tags', () => {
      render(
        <RelationshipPicker
          {...defaultProps}
          value={['rel_1', 'rel_2']}
          multiple
        />
      )

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()

      const removeButtons = screen.getAllByText('×')
      expect(removeButtons).toHaveLength(2)
    })

    it('should remove relationship when tag X is clicked', async () => {
      const user = userEvent.setup()
      render(
        <RelationshipPicker
          {...defaultProps}
          value={['rel_1', 'rel_2']}
          multiple
        />
      )

      const removeButtons = screen.getAllByText('×')
      await user.click(removeButtons[0])

      expect(mockOnChange).toHaveBeenCalledWith(['rel_2'])
    })

    it('should show count when multiple relationships selected', () => {
      render(
        <RelationshipPicker
          {...defaultProps}
          value={['rel_1', 'rel_2']}
          multiple
        />
      )

      expect(screen.getByText('2 relationships selected')).toBeInTheDocument()
    })
  })

  describe('Single Selection Mode', () => {
    it('should select single relationship in single mode', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} multiple={false} />)

      const button = screen.getByRole('button')
      await user.click(button)

      const aliceOption = screen.getByText('Alice Johnson').closest('div')
      await user.click(aliceOption!)

      expect(mockOnChange).toHaveBeenCalledWith(['rel_1'])
    })

    it('should close dropdown after selection in single mode', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} multiple={false} />)

      const button = screen.getByRole('button')
      await user.click(button)

      const aliceOption = screen.getByText('Alice Johnson').closest('div')
      await user.click(aliceOption!)

      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
    })

    it('should show single selection placeholder in single mode', () => {
      render(<RelationshipPicker {...defaultProps} multiple={false} />)

      expect(screen.getByText('Select a relationship...')).toBeInTheDocument()
    })

    it('should not show checkboxes in single mode', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} multiple={false} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    })

    it('should display selected relationship name in single mode', () => {
      render(
        <RelationshipPicker
          {...defaultProps}
          value={['rel_1']}
          multiple={false}
        />
      )

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
  })

  describe('Relationship Display', () => {
    it('should display relationship photo when available', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      const alicePhoto = screen.getByAltText('Alice Johnson photo')
      expect(alicePhoto).toBeInTheDocument()
      expect(alicePhoto).toHaveAttribute('src', 'https://example.com/alice.jpg')
    })

    it('should display initials when photo is not available', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(screen.getByText('B')).toBeInTheDocument() // Bob's initial
    })

    it('should display relationship type', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(screen.getByText('friend')).toBeInTheDocument()
      expect(screen.getByText('romantic')).toBeInTheDocument()
      expect(screen.getByText('family')).toBeInTheDocument()
    })

    it('should capitalize relationship type', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      const typeElements = screen.getAllByText(/friend|romantic|family/)
      typeElements.forEach(element => {
        expect(element).toHaveClass('capitalize')
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no relationships exist', async () => {
      const user = userEvent.setup()
      mockUseRelationships.mockReturnValue({
        relationships: [],
        relationshipsCount: 0,
        isLoading: false,
        currentUser: {
          _id: 'user_123',
          clerkId: 'clerk_123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: Date.now(),
        },
      })

      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(
        screen.getByText(
          'No relationships found. Create some relationships first.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should have accessible text for selected relationships', () => {
      render(
        <RelationshipPicker {...defaultProps} value={['rel_1']} multiple />
      )

      // Find Alice Johnson in the selected tags area using a more specific selector
      const selectedTag = document.querySelector('.bg-blue-100')
      expect(selectedTag).toBeInTheDocument()
      expect(selectedTag).toHaveTextContent('Alice Johnson')
    })

    it('should show unknown relationship for invalid IDs', () => {
      render(
        <RelationshipPicker
          {...defaultProps}
          value={['invalid_id']}
          multiple={false}
        />
      )

      expect(screen.getByText('Unknown relationship')).toBeInTheDocument()
    })
  })

  describe('Hover Effects', () => {
    it('should apply hover styles to relationship options', async () => {
      const user = userEvent.setup()
      render(<RelationshipPicker {...defaultProps} />)

      const button = screen.getByRole('button')
      await user.click(button)

      // Find the clickable div that contains Alice Johnson
      const aliceContainer = screen
        .getByText('Alice Johnson')
        .closest('div[class*="hover:bg-gray-100"]')
      expect(aliceContainer).toHaveClass('hover:bg-gray-100', 'cursor-pointer')
    })
  })
})
