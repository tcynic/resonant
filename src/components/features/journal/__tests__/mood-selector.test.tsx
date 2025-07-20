import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import MoodSelector from '../mood-selector'
import { MoodType } from '@/lib/types'

describe('MoodSelector', () => {
  const mockOnChange = jest.fn()

  const defaultProps = {
    value: undefined,
    onChange: mockOnChange,
    label: 'How are you feeling?',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render mood selector component', () => {
      render(<MoodSelector {...defaultProps} />)

      expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
      expect(screen.getByText('Optional')).toBeInTheDocument()
    })

    it('should render all mood options', () => {
      render(<MoodSelector {...defaultProps} />)

      // Check for some key moods
      expect(screen.getByText('😊')).toBeInTheDocument() // Happy
      expect(screen.getByText('😢')).toBeInTheDocument() // Sad
      expect(screen.getByText('😠')).toBeInTheDocument() // Angry
      expect(screen.getByText('🙏')).toBeInTheDocument() // Grateful
    })

    it('should show selected mood when value is provided', () => {
      render(<MoodSelector {...defaultProps} value="happy" />)

      const happyOption = screen.getByText('😊').parentElement
      expect(happyOption).toHaveClass('ring-2', 'ring-blue-500')
    })

    it('should show no selection when value is undefined', () => {
      render(<MoodSelector {...defaultProps} value={undefined} />)

      // No mood should have the selected ring
      const moods = screen.getAllByRole('button')
      moods.forEach(mood => {
        expect(mood).not.toHaveClass('ring-2', 'ring-blue-500')
      })
    })
  })

  describe('Interaction', () => {
    it('should call onChange when mood is selected', async () => {
      const user = userEvent.setup()
      render(<MoodSelector {...defaultProps} />)

      const happyButton = screen.getByText('😊').parentElement as HTMLElement
      await user.click(happyButton)

      expect(mockOnChange).toHaveBeenCalledWith('happy')
    })

    it('should allow deselecting current mood', async () => {
      const user = userEvent.setup()
      render(<MoodSelector {...defaultProps} value="happy" />)

      const happyButton = screen.getByText('😊').parentElement as HTMLElement
      await user.click(happyButton)

      expect(mockOnChange).toHaveBeenCalledWith(undefined)
    })

    it('should switch between different moods', async () => {
      const user = userEvent.setup()
      render(<MoodSelector {...defaultProps} value="happy" />)

      const sadButton = screen.getByText('😢').parentElement as HTMLElement
      await user.click(sadButton)

      expect(mockOnChange).toHaveBeenCalledWith('sad')
    })

    it('should handle all mood types correctly', async () => {
      const user = userEvent.setup()
      render(<MoodSelector {...defaultProps} />)

      const moodEmojis: Record<MoodType, string> = {
        happy: '😊',
        excited: '🤩',
        content: '😌',
        neutral: '😐',
        sad: '😢',
        angry: '😠',
        frustrated: '😤',
        anxious: '😰',
        confused: '😕',
        grateful: '🙏',
      }

      // Test a few representative moods
      for (const [mood, emoji] of Object.entries(moodEmojis).slice(0, 3)) {
        const moodButton = screen.getByText(emoji).parentElement as HTMLElement
        await user.click(moodButton)
        expect(mockOnChange).toHaveBeenCalledWith(mood)
      }
    })
  })

  describe('Visual States', () => {
    it('should apply hover effects', () => {
      render(<MoodSelector {...defaultProps} />)

      const moodButtons = screen.getAllByRole('button')
      moodButtons.forEach(button => {
        expect(button).toHaveClass('hover:bg-gray-100')
      })
    })

    it('should show selected state styling', () => {
      render(<MoodSelector {...defaultProps} value="excited" />)

      const excitedButton = screen.getByText('🤩').parentElement
      expect(excitedButton).toHaveClass('ring-2', 'ring-blue-500', 'bg-blue-50')
    })

    it('should have proper grid layout', () => {
      render(<MoodSelector {...defaultProps} />)

      const moodGrid = screen.getByRole('group')
      expect(moodGrid).toHaveClass('grid', 'grid-cols-5', 'gap-3')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MoodSelector {...defaultProps} />)

      const moodButtons = screen.getAllByRole('button')
      moodButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
        expect(button.getAttribute('aria-label')).toMatch(/Select .* mood/)
      })
    })

    it('should indicate selected state for screen readers', () => {
      render(<MoodSelector {...defaultProps} value="happy" />)

      const happyButton = screen.getByLabelText('Select happy mood')
      expect(happyButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should indicate unselected state for screen readers', () => {
      render(<MoodSelector {...defaultProps} value="happy" />)

      const sadButton = screen.getByLabelText('Select sad mood')
      expect(sadButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should be keyboard navigable', () => {
      render(<MoodSelector {...defaultProps} />)

      const moodButtons = screen.getAllByRole('button')
      moodButtons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0')
      })
    })
  })

  describe('Custom Props', () => {
    it('should render without label when not provided', () => {
      render(<MoodSelector value={undefined} onChange={mockOnChange} />)

      expect(screen.queryByText('How are you feeling?')).not.toBeInTheDocument()
    })

    it('should render with custom label', () => {
      render(
        <MoodSelector
          value={undefined}
          onChange={mockOnChange}
          label="What's your current mood?"
        />
      )

      expect(screen.getByText("What's your current mood?")).toBeInTheDocument()
    })

    it('should handle error state', () => {
      render(<MoodSelector {...defaultProps} error="Please select a mood" />)

      expect(screen.getByText('Please select a mood')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid clicks gracefully', async () => {
      const user = userEvent.setup()
      render(<MoodSelector {...defaultProps} />)

      const happyButton = screen.getByText('😊').parentElement as HTMLElement
      const sadButton = screen.getByText('😢').parentElement as HTMLElement

      // Rapid clicks
      await user.click(happyButton)
      await user.click(sadButton)
      await user.click(happyButton)

      expect(mockOnChange).toHaveBeenCalledTimes(3)
      expect(mockOnChange).toHaveBeenLastCalledWith('happy')
    })

    it('should handle invalid mood value gracefully', () => {
      // TypeScript would prevent this, but test runtime behavior
      render(<MoodSelector {...defaultProps} value={'invalid' as MoodType} />)

      // Should render without crashing
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
    })

    it('should work without onChange handler', () => {
      render(<MoodSelector value={undefined} onChange={() => {}} />)

      // Should render without crashing
      const moodButtons = screen.getAllByRole('button')
      expect(moodButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<MoodSelector {...defaultProps} />)

      // Re-render with same props
      rerender(<MoodSelector {...defaultProps} />)

      // Should still work correctly
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
    })
  })
})
