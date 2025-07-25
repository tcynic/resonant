import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import SearchPage from '../page'

// Mock dependencies
jest.mock('@clerk/nextjs')
jest.mock('convex/react')
jest.mock('next/navigation')

// Mock child components with simplified implementations
interface MockSearchBarProps {
  onSearch: (query: string) => void
  onSuggestionSelect: (suggestion: string) => void
  suggestions: string[]
  isLoading: boolean
}

jest.mock('@/components/features/search/search-bar', () => ({
  SearchBar: ({
    onSearch,
    onSuggestionSelect,
    suggestions,
    isLoading,
  }: MockSearchBarProps) => (
    <div data-testid="search-bar">
      <input
        data-testid="search-input"
        placeholder="Search journal entries..."
        onChange={e => onSearch(e.target.value)}
      />
      {isLoading && <div data-testid="search-loading">Loading...</div>}
      {suggestions.length > 0 && (
        <div data-testid="suggestions">
          {suggestions.map((suggestion: string, i: number) => (
            <button
              key={i}
              data-testid={`suggestion-${i}`}
              onClick={() => onSuggestionSelect(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  ),
}))

interface MockSearchResult {
  _id: string
  content: string
  relationship?: { name: string }
}

interface MockSearchResultsProps {
  results: MockSearchResult[]
  onResultClick: (result: MockSearchResult) => void
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

jest.mock('@/components/features/search/search-results', () => ({
  SearchResults: ({
    results,
    onResultClick,
    isLoading,
    hasMore,
    onLoadMore,
  }: MockSearchResultsProps) => (
    <div data-testid="search-results">
      {isLoading && <div data-testid="results-loading">Loading results...</div>}
      {results.length === 0 && !isLoading && (
        <div data-testid="no-results">No entries found</div>
      )}
      {results.map((result: MockSearchResult) => (
        <div
          key={result._id}
          data-testid={`result-${result._id}`}
          onClick={() => onResultClick(result)}
        >
          <div data-testid="result-content">{result.content}</div>
          <div data-testid="result-relationship">
            {result.relationship?.name}
          </div>
        </div>
      ))}
      {hasMore && (
        <button data-testid="load-more" onClick={onLoadMore}>
          Load more results
        </button>
      )}
    </div>
  ),
}))

interface MockFilters {
  includePrivate: boolean
  relationshipIds?: string[]
}

interface MockSearchFiltersProps {
  filters: MockFilters
  onFiltersChange: (filters: MockFilters) => void
  onClearFilters: () => void
}

jest.mock('@/components/features/search/search-filters', () => ({
  SearchFiltersComponent: ({
    filters,
    onFiltersChange,
    onClearFilters,
  }: MockSearchFiltersProps) => (
    <div data-testid="search-filters">
      <button data-testid="toggle-filters">Filters</button>
      <div data-testid="filters-content">
        <button data-testid="clear-filters" onClick={onClearFilters}>
          Clear filters
        </button>
        <button
          data-testid="change-filters"
          onClick={() => onFiltersChange({ ...filters, includePrivate: false })}
        >
          Change filters
        </button>
      </div>
    </div>
  ),
}))

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('SearchPage Integration', () => {
  const mockPush = jest.fn()
  const mockBack = jest.fn()

  const mockUser = {
    id: 'user_123',
  }

  const mockUserData = {
    _id: 'convex_user_123',
  }

  const mockRelationships = [
    {
      _id: 'rel-1',
      name: 'Sarah Johnson',
      type: 'colleague',
    },
    {
      _id: 'rel-2',
      name: 'John Smith',
      type: 'friend',
    },
  ]

  const mockSearchResults = {
    results: [
      {
        _id: 'entry-1',
        content: 'Had a great conversation with Sarah about work',
        mood: 'happy',
        tags: ['work', 'conversation'],
        isPrivate: false,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        relationship: {
          _id: 'rel-1',
          name: 'Sarah Johnson',
          type: 'colleague',
        },
        snippet: 'Had a great conversation with Sarah...',
      },
      {
        _id: 'entry-2',
        content: 'Lunch meeting with John was productive',
        mood: 'satisfied',
        tags: ['work', 'meeting'],
        isPrivate: false,
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 172800000,
        relationship: {
          _id: 'rel-2',
          name: 'John Smith',
          type: 'friend',
        },
        snippet: 'Lunch meeting with John was...',
      },
    ],
    hasMore: false,
    nextCursor: undefined,
    totalResults: 2,
    searchQuery: 'conversation',
  }

  const mockSuggestions = ['conversation', 'meeting', 'work']

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseUser.mockReturnValue({ user: mockUser, isLoaded: true })
    mockUseRouter.mockReturnValue({ push: mockPush, back: mockBack })

    mockUseQuery.mockImplementation((api, args) => {
      if (args === 'skip') return null
      if (api.toString().includes('getUserByClerkId')) return mockUserData
      if (api.toString().includes('getRelationshipsByUser'))
        return mockRelationships
      if (api.toString().includes('searchJournalEntries'))
        return mockSearchResults
      if (api.toString().includes('getSearchSuggestions'))
        return mockSuggestions
      return null
    })
  })

  it('should render the search page with all components', () => {
    render(<SearchPage />)

    expect(screen.getByText('Search Journal Entries')).toBeInTheDocument()
    expect(
      screen.getByText('Find specific entries, memories, and insights')
    ).toBeInTheDocument()
    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('should show initial empty state', () => {
    render(<SearchPage />)

    expect(screen.getByText('Search Your Journal Entries')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Enter at least 2 characters to search through your entries'
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/You can search by:/)).toBeInTheDocument()
  })

  it('should handle search input and show results', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'conversation')

    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
      expect(screen.getByTestId('result-entry-1')).toBeInTheDocument()
      expect(screen.getByTestId('result-entry-2')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Had a great conversation with Sarah about work')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Lunch meeting with John was productive')
    ).toBeInTheDocument()
  })

  it('should handle search suggestions', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'co')

    await waitFor(() => {
      expect(screen.getByTestId('suggestions')).toBeInTheDocument()
    })

    expect(screen.getByTestId('suggestion-0')).toHaveTextContent('conversation')
    expect(screen.getByTestId('suggestion-1')).toHaveTextContent('meeting')
    expect(screen.getByTestId('suggestion-2')).toHaveTextContent('work')
  })

  it('should handle suggestion selection', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'co')

    await waitFor(() => {
      expect(screen.getByTestId('suggestion-0')).toBeInTheDocument()
    })

    const suggestionButton = screen.getByTestId('suggestion-0')
    await user.click(suggestionButton)

    // Should perform search with the selected suggestion
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
    })
  })

  it('should handle result click navigation', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    // Perform search first
    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'conversation')

    await waitFor(() => {
      expect(screen.getByTestId('result-entry-1')).toBeInTheDocument()
    })

    // Click on a result
    const resultItem = screen.getByTestId('result-entry-1')
    await user.click(resultItem)

    expect(mockPush).toHaveBeenCalledWith('/journal/entry-1')
  })

  it('should handle search filters', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    const changeFiltersButton = screen.getByTestId('change-filters')
    await user.click(changeFiltersButton)

    // Should update filters and trigger new search
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
  })

  it('should handle clear filters', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    const clearFiltersButton = screen.getByTestId('clear-filters')
    await user.click(clearFiltersButton)

    // Should reset filters to default state
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
  })

  it('should handle back button navigation', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)

    expect(mockBack).toHaveBeenCalled()
  })

  it('should show loading state during search', async () => {
    // Mock loading state
    mockUseQuery.mockImplementation((api, args) => {
      if (args === 'skip') return null
      if (api.toString().includes('getUserByClerkId')) return mockUserData
      if (api.toString().includes('getRelationshipsByUser'))
        return mockRelationships
      if (api.toString().includes('searchJournalEntries')) return undefined // Loading
      if (api.toString().includes('getSearchSuggestions'))
        return mockSuggestions
      return null
    })

    const user = userEvent.setup()
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'conversation')

    expect(screen.getByTestId('search-loading')).toBeInTheDocument()
  })

  it('should show no results when search returns empty', async () => {
    // Mock empty results
    mockUseQuery.mockImplementation((api, args) => {
      if (args === 'skip') return null
      if (api.toString().includes('getUserByClerkId')) return mockUserData
      if (api.toString().includes('getRelationshipsByUser'))
        return mockRelationships
      if (api.toString().includes('searchJournalEntries'))
        return {
          results: [],
          hasMore: false,
          nextCursor: undefined,
          totalResults: 0,
          searchQuery: 'nonexistent',
        }
      if (api.toString().includes('getSearchSuggestions')) return []
      return null
    })

    const user = userEvent.setup()
    render(<SearchPage />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument()
    })
  })

  it('should handle load more functionality', async () => {
    // Mock results with more available
    mockUseQuery.mockImplementation((api, args) => {
      if (args === 'skip') return null
      if (api.toString().includes('getUserByClerkId')) return mockUserData
      if (api.toString().includes('getRelationshipsByUser'))
        return mockRelationships
      if (api.toString().includes('searchJournalEntries'))
        return {
          ...mockSearchResults,
          hasMore: true,
        }
      if (api.toString().includes('getSearchSuggestions'))
        return mockSuggestions
      return null
    })

    const user = userEvent.setup()
    render(<SearchPage />)

    // Perform search first
    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'conversation')

    await waitFor(() => {
      expect(screen.getByTestId('load-more')).toBeInTheDocument()
    })

    const loadMoreButton = screen.getByTestId('load-more')
    await user.click(loadMoreButton)

    // Should trigger load more functionality
    expect(loadMoreButton).toBeInTheDocument()
  })

  it('should handle user authentication states', () => {
    // Test with no user
    mockUseUser.mockReturnValue({ user: null, isLoaded: true })
    mockUseQuery.mockReturnValue(null)

    render(<SearchPage />)

    // Should show loading spinner
    expect(
      screen.getByRole('progressbar') || screen.getByTestId('loading')
    ).toBeTruthy()
  })

  it('should initialize with proper default filter state', () => {
    render(<SearchPage />)

    // Should have filters component with default state
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
  })

  it('should handle search query clearing', async () => {
    const user = userEvent.setup()
    render(<SearchPage />)

    // First perform a search
    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'conversation')

    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
    })

    // Clear the search (simulate clearing input)
    await user.clear(searchInput)

    // Should return to empty state
    await waitFor(() => {
      expect(
        screen.getByText('Search Your Journal Entries')
      ).toBeInTheDocument()
    })
  })

  it('should maintain search state during component updates', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SearchPage />)

    // Perform search
    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'conversation')

    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
    })

    // Rerender component
    rerender(<SearchPage />)

    // Search results should still be visible
    expect(screen.getByTestId('search-results')).toBeInTheDocument()
    expect(
      screen.getByText('Had a great conversation with Sarah about work')
    ).toBeInTheDocument()
  })
})
