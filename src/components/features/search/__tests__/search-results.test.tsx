import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchResults, SearchResult } from '../search-results'

// Mock next/image
interface MockImageProps {
  src: string
  alt: string
  [key: string]: unknown
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: MockImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

describe('SearchResults', () => {
  const mockOnResultClick = jest.fn()
  const mockOnLoadMore = jest.fn()

  const mockResults: SearchResult[] = [
    {
      _id: '1',
      content:
        'Had a great conversation with Sarah about work projects and future goals',
      mood: 'happy',
      tags: ['work', 'goals'],
      isPrivate: false,
      createdAt: Date.now() - 86400000, // 1 day ago
      updatedAt: Date.now() - 86400000,
      relationship: {
        _id: 'rel-1',
        name: 'Sarah Johnson',
        type: 'colleague',
        photo: '/test-photo.jpg',
      },
      snippet: 'Had a great conversation with Sarah about work...',
    },
    {
      _id: '2',
      content:
        'Long journal entry that should show the expand/collapse functionality because it exceeds the 200 character limit for displaying full content in the search results view',
      mood: 'neutral',
      tags: ['reflection'],
      isPrivate: true,
      createdAt: Date.now() - 172800000, // 2 days ago
      updatedAt: Date.now() - 172800000,
      relationship: {
        _id: 'rel-2',
        name: 'Self',
        type: 'personal',
      },
      snippet: 'Long journal entry that should show...',
    },
  ]

  const defaultProps = {
    results: mockResults,
    searchQuery: 'conversation',
    onResultClick: mockOnResultClick,
    onLoadMore: mockOnLoadMore,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render search results with proper structure', () => {
    render(<SearchResults {...defaultProps} />)

    const resultsList = screen.getByRole('list', { name: 'Search results' })
    expect(resultsList).toBeInTheDocument()

    const resultItems = screen.getAllByRole('listitem')
    expect(resultItems).toHaveLength(2)
  })

  it('should display result content with highlighted search terms', () => {
    render(<SearchResults {...defaultProps} />)

    // Should show highlighted text components for search query
    expect(screen.getByText('conversation')).toBeInTheDocument()
  })

  it('should show relationship information with photo', () => {
    render(<SearchResults {...defaultProps} />)

    // Check relationship name
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()

    // Check photo rendering
    const photo = screen.getByAltText('Sarah Johnson')
    expect(photo).toBeInTheDocument()
    expect(photo).toHaveAttribute('src', '/test-photo.jpg')
  })

  it('should show relationship initials when no photo available', () => {
    render(<SearchResults {...defaultProps} />)

    // Should show initials for relationship without photo
    expect(screen.getByText('S')).toBeInTheDocument() // "Self" -> "S"
  })

  it('should display privacy indicators for private entries', () => {
    render(<SearchResults {...defaultProps} />)

    // Should show "Private" text for private entry
    expect(screen.getByText('Private')).toBeInTheDocument()
  })

  it('should format dates correctly', () => {
    render(<SearchResults {...defaultProps} />)

    // Should show relative dates
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText('2 days ago')).toBeInTheDocument()
  })

  it('should show expand/collapse functionality for long content', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...defaultProps} />)

    // Find expand button for long content
    const expandButton = screen.getByText('Show more')
    expect(expandButton).toBeInTheDocument()

    // Click to expand
    await user.click(expandButton)

    // Should show collapse button and full content
    expect(screen.getByText('Show less')).toBeInTheDocument()

    // Click to collapse
    const collapseButton = screen.getByText('Show less')
    await user.click(collapseButton)

    // Should show expand button again
    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('should handle result click events', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...defaultProps} />)

    const firstResult = screen.getAllByRole('listitem')[0]
    await user.click(firstResult)

    expect(mockOnResultClick).toHaveBeenCalledWith(mockResults[0])
  })

  it('should prevent result click when expand button is clicked', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...defaultProps} />)

    const expandButton = screen.getByText('Show more')
    await user.click(expandButton)

    // Should not trigger result click when expand button is clicked
    expect(mockOnResultClick).not.toHaveBeenCalled()
  })

  it('should display tags with highlighting', () => {
    render(<SearchResults {...defaultProps} />)

    // Should show tags
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('goals')).toBeInTheDocument()
    expect(screen.getByText('reflection')).toBeInTheDocument()
  })

  it('should display mood indicators', () => {
    render(<SearchResults {...defaultProps} />)

    // Should show mood badges
    expect(screen.getByText('happy')).toBeInTheDocument()
    expect(screen.getByText('neutral')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<SearchResults {...defaultProps} results={[]} isLoading={true} />)

    // Should show loading skeleton
    const loadingCards = screen.getAllByTestId(/loading-card/i)
    expect(loadingCards.length).toBeGreaterThan(0)
  })

  it('should show empty state when no results', () => {
    render(<SearchResults {...defaultProps} results={[]} isLoading={false} />)

    expect(screen.getByText('No entries found')).toBeInTheDocument()
    expect(
      screen.getByText(/Try adjusting your search terms/)
    ).toBeInTheDocument()
  })

  it('should display total results count', () => {
    render(<SearchResults {...defaultProps} totalResults={25} />)

    expect(
      screen.getByText('25 results for "conversation"')
    ).toBeInTheDocument()
  })

  it('should show load more button when hasMore is true', async () => {
    const user = userEvent.setup()
    render(<SearchResults {...defaultProps} hasMore={true} />)

    const loadMoreButton = screen.getByText('Load more results')
    expect(loadMoreButton).toBeInTheDocument()

    await user.click(loadMoreButton)
    expect(mockOnLoadMore).toHaveBeenCalled()
  })

  it('should show loading state on load more button', () => {
    render(<SearchResults {...defaultProps} hasMore={true} isLoading={true} />)

    const loadMoreButton = screen.getByText('Loading...')
    expect(loadMoreButton).toBeInTheDocument()
    expect(loadMoreButton).toBeDisabled()
  })

  it('should handle relationship initials correctly', () => {
    const resultsWithComplexNames: SearchResult[] = [
      {
        ...mockResults[0],
        relationship: {
          _id: 'rel-3',
          name: 'Mary Jane Watson',
          type: 'friend',
        },
      },
    ]

    render(
      <SearchResults {...defaultProps} results={resultsWithComplexNames} />
    )

    // Should show "MJ" for "Mary Jane Watson"
    expect(screen.getByText('MJ')).toBeInTheDocument()
  })

  it('should handle missing relationship gracefully', () => {
    const resultsWithoutRelationship: SearchResult[] = [
      {
        ...mockResults[0],
        relationship: null,
      },
    ]

    render(
      <SearchResults {...defaultProps} results={resultsWithoutRelationship} />
    )

    // Should show fallback indicator
    expect(screen.getByText('?')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('should meet accessibility requirements', () => {
    render(<SearchResults {...defaultProps} />)

    // Check ARIA labels and roles
    const resultsList = screen.getByRole('list')
    expect(resultsList).toHaveAttribute('aria-label', 'Search results')

    const listItems = screen.getAllByRole('listitem')
    listItems.forEach(item => {
      expect(item).toBeInTheDocument()
    })
  })
})
