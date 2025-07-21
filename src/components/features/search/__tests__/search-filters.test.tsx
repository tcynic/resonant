import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchFiltersComponent, SearchFilters } from '../search-filters'

// Mock next/image
interface MockImageProps {
  src: string
  alt: string
  [key: string]: unknown
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: MockImageProps) => (
    <img src={src} alt={alt} {...props} />
  ),
}))

describe('SearchFiltersComponent', () => {
  const mockOnFiltersChange = jest.fn()
  const mockOnClearFilters = jest.fn()

  const mockRelationships = [
    {
      _id: 'rel-1',
      name: 'Sarah Johnson',
      type: 'colleague',
      photo: '/sarah.jpg',
    },
    {
      _id: 'rel-2',
      name: 'John Smith',
      type: 'friend',
    },
  ]

  const mockTags = ['work', 'personal', 'goals', 'reflection']
  const mockMoods = ['happy', 'sad', 'excited', 'anxious']

  const defaultFilters: SearchFilters = {
    relationshipIds: [],
    dateRange: {},
    includePrivate: true,
    tags: [],
    mood: undefined,
  }

  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: mockOnFiltersChange,
    relationships: mockRelationships,
    availableTags: mockTags,
    availableMoods: mockMoods,
    onClearFilters: mockOnClearFilters,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render filters toggle button', () => {
    render(<SearchFiltersComponent {...defaultProps} />)

    const filterButton = screen.getByRole('button', { name: /filters/i })
    expect(filterButton).toBeInTheDocument()
  })

  it('should expand filters when toggle button is clicked', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Should show relationship filters
    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
  })

  it('should show active filters indicator', () => {
    const filtersWithActive: SearchFilters = {
      ...defaultFilters,
      relationshipIds: ['rel-1'],
      includePrivate: false,
    }

    render(
      <SearchFiltersComponent {...defaultProps} filters={filtersWithActive} />
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('should handle relationship filter selection', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Select a relationship
    const sarahCheckbox = screen.getByLabelText(/Sarah Johnson/i)
    await user.click(sarahCheckbox)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      relationshipIds: ['rel-1'],
    })
  })

  it('should display relationship photos and initials correctly', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Should show photo for Sarah
    const sarahPhoto = screen.getByAltText('Sarah Johnson')
    expect(sarahPhoto).toBeInTheDocument()

    // Should show initials for John (no photo)
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('should handle date range preset selection', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Click "Last Week" preset
    const lastWeekButton = screen.getByRole('button', { name: 'Last Week' })
    await user.click(lastWeekButton)

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: expect.objectContaining({
          start: expect.any(Number),
          end: expect.any(Number),
        }),
      })
    )
  })

  it('should handle custom date range input', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Set start date
    const startDateInput = screen.getByLabelText('From')
    await user.type(startDateInput, '2024-01-01')
    fireEvent.blur(startDateInput)

    expect(mockOnFiltersChange).toHaveBeenCalled()
  })

  it('should handle privacy filter toggle', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Toggle privacy filter
    const privacyCheckbox = screen.getByLabelText('Include private entries')
    await user.click(privacyCheckbox)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      includePrivate: false,
    })
  })

  it('should handle tag filter selection', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Click work tag
    const workTag = screen.getByRole('button', { name: 'work' })
    await user.click(workTag)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      tags: ['work'],
    })
  })

  it('should handle mood filter selection', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Click happy mood
    const happyMood = screen.getByRole('button', { name: 'happy' })
    await user.click(happyMood)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      mood: 'happy',
    })
  })

  it('should handle clear all filters', async () => {
    const user = userEvent.setup()
    const filtersWithData: SearchFilters = {
      relationshipIds: ['rel-1'],
      dateRange: { start: Date.now() - 86400000 },
      includePrivate: false,
      tags: ['work'],
      mood: 'happy',
    }

    render(
      <SearchFiltersComponent {...defaultProps} filters={filtersWithData} />
    )

    // Should show clear button when filters are active
    const clearButton = screen.getByRole('button', { name: /clear all/i })
    await user.click(clearButton)

    expect(mockOnClearFilters).toHaveBeenCalled()
  })

  it('should show selected state for active filters', async () => {
    const user = userEvent.setup()
    const filtersWithSelections: SearchFilters = {
      relationshipIds: ['rel-1'],
      dateRange: {},
      includePrivate: true,
      tags: ['work', 'personal'],
      mood: 'happy',
    }

    render(
      <SearchFiltersComponent
        {...defaultProps}
        filters={filtersWithSelections}
      />
    )

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Work and personal tags should appear selected
    const workTag = screen.getByRole('button', { name: 'work' })
    const personalTag = screen.getByRole('button', { name: 'personal' })

    expect(workTag).toHaveClass('bg-blue-100')
    expect(personalTag).toHaveClass('bg-blue-100')

    // Happy mood should appear selected
    const happyMood = screen.getByRole('button', { name: 'happy' })
    expect(happyMood).toHaveClass('bg-yellow-100')
  })

  it('should handle deselection of active filters', async () => {
    const user = userEvent.setup()
    const filtersWithSelections: SearchFilters = {
      ...defaultFilters,
      tags: ['work'],
      mood: 'happy',
    }

    render(
      <SearchFiltersComponent
        {...defaultProps}
        filters={filtersWithSelections}
      />
    )

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Click selected work tag to deselect
    const workTag = screen.getByRole('button', { name: 'work' })
    await user.click(workTag)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...filtersWithSelections,
      tags: [],
    })

    // Click selected mood to deselect
    const happyMood = screen.getByRole('button', { name: 'happy' })
    await user.click(happyMood)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...filtersWithSelections,
      mood: undefined,
    })
  })

  it('should not show tags section when no tags available', () => {
    render(<SearchFiltersComponent {...defaultProps} availableTags={[]} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filterButton)

    // Tags section should not be rendered
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  it('should not show mood section when no moods available', () => {
    render(<SearchFiltersComponent {...defaultProps} availableMoods={[]} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filterButton)

    // Mood section should not be rendered
    expect(screen.queryByText('Mood')).not.toBeInTheDocument()
  })

  it('should handle multiple relationship selections', async () => {
    const user = userEvent.setup()
    render(<SearchFiltersComponent {...defaultProps} />)

    // Expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i })
    await user.click(filterButton)

    // Select multiple relationships
    const sarahCheckbox = screen.getByLabelText(/Sarah Johnson/i)
    const johnCheckbox = screen.getByLabelText(/John Smith/i)

    await user.click(sarahCheckbox)
    await user.click(johnCheckbox)

    expect(mockOnFiltersChange).toHaveBeenLastCalledWith({
      ...defaultFilters,
      relationshipIds: ['rel-1', 'rel-2'],
    })
  })
})
