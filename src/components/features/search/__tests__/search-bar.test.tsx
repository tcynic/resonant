import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../search-bar'

describe('SearchBar', () => {
  const mockOnSearch = jest.fn()
  const mockOnClear = jest.fn()
  const mockOnSuggestionSelect = jest.fn()

  const defaultProps = {
    onSearch: mockOnSearch,
    onClear: mockOnClear,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render search input with proper accessibility attributes', () => {
    render(<SearchBar {...defaultProps} />)

    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('aria-label', 'Search journal entries')
    expect(searchInput).toHaveAttribute(
      'placeholder',
      'Search journal entries...'
    )

    const searchRegion = screen.getByRole('search')
    expect(searchRegion).toBeInTheDocument()
  })

  it('should perform debounced search with 300ms delay', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} debounceMs={300} />)

    const searchInput = screen.getByRole('searchbox')

    // Type search query
    await user.type(searchInput, 'test search')

    // Should not call search immediately
    expect(mockOnSearch).not.toHaveBeenCalled()

    // Advance timers to trigger debounce
    jest.advanceTimersByTime(300)

    // Should call search after debounce delay
    expect(mockOnSearch).toHaveBeenCalledWith('test search')
  })

  it('should not search for queries less than 2 characters', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)

    const searchInput = screen.getByRole('searchbox')

    // Type single character
    await user.type(searchInput, 'a')
    jest.advanceTimersByTime(300)

    // Should not trigger search
    expect(mockOnSearch).not.toHaveBeenCalled()

    // Type second character
    await user.type(searchInput, 'b')
    jest.advanceTimersByTime(300)

    // Should trigger search now
    expect(mockOnSearch).toHaveBeenCalledWith('ab')
  })

  it('should clear search when clear button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<SearchBar {...defaultProps} />)

    const searchInput = screen.getByRole('searchbox')

    // Type some text to show clear button
    await user.type(searchInput, 'test')
    
    // Advance timers to process debounce
    jest.advanceTimersByTime(300)

    const clearButton = screen.getByRole('button', { name: 'Clear search' })
    expect(clearButton).toBeInTheDocument()

    // Click clear button
    await user.click(clearButton)

    expect(searchInput).toHaveValue('')
    expect(mockOnClear).toHaveBeenCalled()
  }, 10000)

  it('should handle search suggestions with keyboard navigation', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const suggestions = ['suggestion 1', 'suggestion 2', 'suggestion 3']

    render(
      <SearchBar
        {...defaultProps}
        suggestions={suggestions}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    )

    const searchInput = screen.getByRole('searchbox')

    // Type to trigger suggestions
    await user.type(searchInput, 'su')
    
    // Advance timers to process debounce
    jest.advanceTimersByTime(300)

    // Should show suggestions
    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()

    const suggestionItems = screen.getAllByRole('option')
    expect(suggestionItems).toHaveLength(3)

    // Navigate down with arrow key
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })

    // First suggestion should be selected
    expect(suggestionItems[0]).toHaveAttribute('aria-selected', 'true')

    // Navigate down again
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })

    // Second suggestion should be selected
    expect(suggestionItems[1]).toHaveAttribute('aria-selected', 'true')

    // Press Enter to select
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('suggestion 2')
  }, 10000)

  it('should handle Escape key to close suggestions', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const suggestions = ['suggestion 1', 'suggestion 2']

    render(<SearchBar {...defaultProps} suggestions={suggestions} />)

    const searchInput = screen.getByRole('searchbox')

    // Type to show suggestions
    await user.type(searchInput, 'su')
    
    // Advance timers to process debounce
    jest.advanceTimersByTime(300)

    // Suggestions should be visible
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // Press Escape
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    // Suggestions should be hidden
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  }, 10000)

  it('should show loading indicator when searching', () => {
    render(<SearchBar {...defaultProps} isLoading={true} />)

    const loadingIndicator = screen.getByLabelText('Searching...')
    expect(loadingIndicator).toBeInTheDocument()

    // Clear button should be hidden when loading
    expect(
      screen.queryByRole('button', { name: 'Clear search' })
    ).not.toBeInTheDocument()
  })

  it('should handle mouse interactions with suggestions', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const suggestions = ['mouse suggestion']

    render(
      <SearchBar
        {...defaultProps}
        suggestions={suggestions}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    )

    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'mouse')
    
    // Advance timers to process debounce
    jest.advanceTimersByTime(300)

    const suggestionItem = screen.getByRole('option')

    // Hover should select the item
    await user.hover(suggestionItem)
    expect(suggestionItem).toHaveAttribute('aria-selected', 'true')

    // Click should select the suggestion
    await user.click(suggestionItem)
    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('mouse suggestion')
  }, 10000)

  it('should provide screen reader announcements', async () => {
    const suggestions = ['announcement test']

    render(
      <SearchBar {...defaultProps} suggestions={suggestions} isLoading={true} />
    )

    // Check screen reader status region
    const statusRegion = screen.getByRole('status')
    expect(statusRegion).toBeInTheDocument()

    // Should announce loading state
    expect(statusRegion).toHaveTextContent('Searching...')
  })

  it('should handle Tab key for suggestion selection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const suggestions = ['tab suggestion']

    render(
      <SearchBar
        {...defaultProps}
        suggestions={suggestions}
        onSuggestionSelect={mockOnSuggestionSelect}
      />
    )

    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'tab')
    
    // Advance timers to process debounce
    jest.advanceTimersByTime(300)

    // Navigate to suggestion
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' })

    // Press Tab to select
    fireEvent.keyDown(searchInput, { key: 'Tab' })

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('tab suggestion')
  }, 10000)
})
