import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import TagInput from '../tag-input'

describe('TagInput', () => {
  const mockOnChange = jest.fn()

  const defaultProps = {
    value: [],
    onChange: mockOnChange,
    label: 'Tags',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render tag input component', () => {
      render(<TagInput {...defaultProps} />)

      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
      expect(screen.getByText('Press Enter or comma to add tags')).toBeInTheDocument()
      expect(screen.getByText('0/5 tags')).toBeInTheDocument()
    })

    it('should render with custom label and placeholder', () => {
      render(
        <TagInput
          {...defaultProps}
          label="Custom Tags"
          placeholder="Enter custom tags..."
        />
      )

      expect(screen.getByText('Custom Tags')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter custom tags...')).toBeInTheDocument()
    })

    it('should render without label when not provided', () => {
      render(<TagInput value={[]} onChange={mockOnChange} label="" />)

      expect(screen.queryByText('Tags')).not.toBeInTheDocument()
      expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
    })

    it('should show error message when provided', () => {
      render(<TagInput {...defaultProps} error="This field is required" />)

      expect(screen.getByText('This field is required')).toBeInTheDocument()
      expect(screen.getByText('This field is required')).toHaveClass('text-red-600')
    })
  })

  describe('Tag Display', () => {
    it('should display existing tags', () => {
      render(<TagInput {...defaultProps} value={['work', 'personal']} />)

      expect(screen.getByText('work')).toBeInTheDocument()
      expect(screen.getByText('personal')).toBeInTheDocument()
      expect(screen.getByText('2/5 tags')).toBeInTheDocument()
    })

    it('should show remove buttons for each tag', () => {
      render(<TagInput {...defaultProps} value={['work', 'personal']} />)

      const removeButtons = screen.getAllByText('×')
      expect(removeButtons).toHaveLength(2)
    })

    it('should hide placeholder when tags exist', () => {
      render(<TagInput {...defaultProps} value={['work']} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', '')
    })
  })

  describe('Adding Tags', () => {
    it('should add tag when Enter is pressed', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'work')
      await user.keyboard('{Enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['work'])
    })

    it('should add tag when comma is pressed', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'work,')

      expect(mockOnChange).toHaveBeenCalledWith(['work'])
    })

    it('should clear input after adding tag', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'work')
      await user.keyboard('{Enter}')

      expect(input).toHaveValue('')
    })

    it('should trim whitespace from tags', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '  work  ')
      await user.keyboard('{Enter}')

      expect(mockOnChange).toHaveBeenCalledWith(['work'])
    })

    it('should not add empty tags', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '   ')
      await user.keyboard('{Enter}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} value={['work']} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'work')
      await user.keyboard('{Enter}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should not add tags when max limit is reached', async () => {
      const user = userEvent.setup()
      render(
        <TagInput
          {...defaultProps}
          value={['tag1', 'tag2', 'tag3', 'tag4', 'tag5']}
          maxTags={5}
        />
      )

      const input = screen.queryByRole('textbox')
      expect(input).not.toBeInTheDocument()
    })
  })

  describe('Removing Tags', () => {
    it('should remove tag when X button is clicked', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} value={['work', 'personal']} />)

      const removeButtons = screen.getAllByText('×')
      await user.click(removeButtons[0])

      expect(mockOnChange).toHaveBeenCalledWith(['personal'])
    })

    it('should remove last tag when backspace is pressed on empty input', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} value={['work', 'personal']} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Backspace}')

      expect(mockOnChange).toHaveBeenCalledWith(['work'])
    })

    it('should not remove tag when backspace is pressed with text in input', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} value={['work']} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')
      await user.keyboard('{Backspace}')

      expect(mockOnChange).not.toHaveBeenCalled()
    })
  })

  describe('Suggestions', () => {
    const suggestions = ['work', 'personal', 'urgent', 'important']

    it('should show suggestions when typing', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} suggestions={suggestions} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'w')

      expect(screen.getByText('work')).toBeInTheDocument()
    })

    it('should filter suggestions based on input', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} suggestions={suggestions} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'per')

      expect(screen.getByText('personal')).toBeInTheDocument()
      expect(screen.queryByText('work')).not.toBeInTheDocument()
    })

    it('should hide suggestions that are already selected', async () => {
      const user = userEvent.setup()
      render(
        <TagInput
          {...defaultProps}
          value={['work']}
          suggestions={suggestions}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'w')

      // The word "work" will appear as a selected tag, but not as a suggestion
      const suggestionDropdown = screen.queryByRole('button', { name: 'work' })
      expect(suggestionDropdown).not.toBeInTheDocument()
    })

    it('should add tag when suggestion is clicked', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} suggestions={suggestions} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'w')

      // Wait for suggestions to appear and verify structure
      await screen.findByText('work')
      
      // Use fireEvent since userEvent might have timing issues
      const suggestionButton = screen.getByText('work').closest('button')
      expect(suggestionButton).toBeTruthy()
      
      fireEvent.click(suggestionButton!)
      expect(mockOnChange).toHaveBeenCalledWith(['work'])
    })

    it('should hide suggestions when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <TagInput {...defaultProps} suggestions={suggestions} />
          <div data-testid="outside">Outside</div>
        </div>
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'w')

      expect(screen.getByText('work')).toBeInTheDocument()

      const outside = screen.getByTestId('outside')
      await user.click(outside)

      expect(screen.queryByText('work')).not.toBeInTheDocument()
    })

    it('should show suggestions when input is focused with existing text', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} suggestions={suggestions} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'w')
      
      // Click outside to hide suggestions
      await user.click(document.body)
      expect(screen.queryByText('work')).not.toBeInTheDocument()

      // Focus input again
      await user.click(input)
      expect(screen.getByText('work')).toBeInTheDocument()
    })
  })

  describe('Max Tags Limit', () => {
    it('should respect custom max tags limit', () => {
      render(
        <TagInput
          {...defaultProps}
          value={['tag1', 'tag2']}
          maxTags={3}
        />
      )

      expect(screen.getByText('2/3 tags')).toBeInTheDocument()
    })

    it('should hide input when max tags reached', () => {
      render(
        <TagInput
          {...defaultProps}
          value={['tag1', 'tag2', 'tag3']}
          maxTags={3}
        />
      )

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Accessibility', () => {
    it('should prevent default behavior for Enter and comma keys', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<TagInput {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      // Test that Enter adds tag
      await user.keyboard('{Enter}')
      expect(mockOnChange).toHaveBeenCalledWith(['test'])
      
      // Reset and test comma behavior with a new component instance
      mockOnChange.mockClear()
      rerender(<TagInput value={['test']} onChange={mockOnChange} />)
      
      // Get the new input after rerender
      const inputs = screen.getAllByRole('textbox')
      const newInput = inputs[inputs.length - 1] // Get the last input
      await user.type(newInput, 'another,')
      expect(mockOnChange).toHaveBeenCalledWith(['test', 'another'])
    })
  })

  describe('Case Sensitivity', () => {
    it('should be case insensitive for suggestion filtering', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} suggestions={['WORK', 'Personal']} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'work')

      expect(screen.getByText('WORK')).toBeInTheDocument()
    })

    it('should use exact string matching for duplicate detection', async () => {
      const user = userEvent.setup()
      render(<TagInput {...defaultProps} value={['WORK']} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'work')
      await user.keyboard('{Enter}')

      // Component uses exact string matching, so 'work' != 'WORK'
      expect(mockOnChange).toHaveBeenCalledWith(['WORK', 'work'])
    })
  })
})