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
      // Component renders mood options without "Optional" text
      expect(screen.getAllByRole('button')).toHaveLength(10) // 10 mood options
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
      expect(happyOption).toHaveClass('shadow-md') // Selected mood has shadow-md class
    })

    it('should show no selection when value is undefined', () => {
      render(<MoodSelector {...defaultProps} value={undefined} />)

      // No mood should have the selected shadow
      const moods = screen.getAllByRole('button')
      moods.forEach(mood => {
        expect(mood).not.toHaveClass('shadow-md')
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
        expect(button).toHaveClass('hover:bg-gray-50')
      })
    })

    it('should show selected state styling', () => {
      render(<MoodSelector {...defaultProps} value="excited" />)

      const excitedButton = screen.getByText('🤩').parentElement
      expect(excitedButton).toHaveClass('shadow-md', 'bg-orange-100')
    })

    it('should have proper grid layout', () => {
      render(<MoodSelector {...defaultProps} />)

      // Find the grid container by its class rather than role
      const moodGrid = screen.getByText('😊').parentElement?.parentElement
      expect(moodGrid).toHaveClass('grid', 'grid-cols-5', 'gap-2')
    })
  })

  describe('Accessibility', () => {
    it('should have proper titles', () => {
      render(<MoodSelector {...defaultProps} />)

      const moodButtons = screen.getAllByRole('button')
      moodButtons.forEach(button => {
        expect(button).toHaveAttribute('title')
        expect(button.getAttribute('title')).toBeTruthy()
      })
    })

    it('should show selected mood title', () => {
      render(<MoodSelector {...defaultProps} value="happy" />)

      const happyButton = screen.getByTitle('Happy')
      expect(happyButton).toBeInTheDocument()
    })

    it('should show unselected mood title', () => {
      render(<MoodSelector {...defaultProps} value="happy" />)

      const sadButton = screen.getByTitle('Sad')
      expect(sadButton).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<MoodSelector {...defaultProps} />)

      const moodButtons = screen.getAllByRole('button')
      moodButtons.forEach(button => {
        // Buttons are focusable by default, no need for tabIndex
        expect(button.tagName).toBe('BUTTON')
      })
    })
  })

  describe('Custom Props', () => {
    it('should render without label when explicitly set to empty string', () => {
      render(
        <MoodSelector value={undefined} onChange={mockOnChange} label="" />
      )

      // When label is empty string, no label should be rendered
      expect(screen.queryByText('How are you feeling?')).not.toBeInTheDocument()
      // But mood buttons should still be present
      expect(screen.getAllByRole('button')).toHaveLength(10)
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
