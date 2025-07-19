import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RelationshipsList from '../relationships-list'
import { useRelationships } from '@/hooks/use-relationships'

// Mock the hooks
jest.mock('@/hooks/use-relationships')
jest.mock('../relationship-card', () => {
  return function MockRelationshipCard({ relationship }: any) {
    return (
      <div data-testid={`relationship-card-${relationship._id}`}>
        {relationship.name}
      </div>
    )
  }
})

const mockUseRelationships = useRelationships as jest.MockedFunction<
  typeof useRelationships
>

describe('RelationshipsList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders empty state when no relationships exist', () => {
    mockUseRelationships.mockReturnValue({
      relationships: [],
      relationshipsCount: 0,
      isLoading: false,
      currentUser: { _id: 'user_123' },
    })

    render(<RelationshipsList />)

    expect(screen.getByText(/no relationships yet/i)).toBeInTheDocument()
    expect(
      screen.getByText(/start building your relationship journal/i)
    ).toBeInTheDocument()
  })

  it('renders loading state', () => {
    mockUseRelationships.mockReturnValue({
      relationships: [],
      relationshipsCount: 0,
      isLoading: true,
      currentUser: undefined,
    })

    render(<RelationshipsList />)

    // Should show loading skeleton
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders relationships when they exist', () => {
    const mockRelationships = [
      {
        _id: 'rel_1',
        userId: 'user_123',
        name: 'John Doe',
        type: 'friend' as const,
        photo: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: 'rel_2',
        userId: 'user_123',
        name: 'Jane Smith',
        type: 'family' as const,
        photo: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    mockUseRelationships.mockReturnValue({
      relationships: mockRelationships,
      relationshipsCount: 2,
      isLoading: false,
      currentUser: { _id: 'user_123' },
    })

    render(<RelationshipsList />)

    expect(screen.getByText('Relationships')).toBeInTheDocument()
    expect(
      screen.getByText(/manage your relationships \(2 total\)/i)
    ).toBeInTheDocument()
    expect(screen.getByTestId('relationship-card-rel_1')).toBeInTheDocument()
    expect(screen.getByTestId('relationship-card-rel_2')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    const mockRelationships = [
      {
        _id: 'rel_1',
        userId: 'user_123',
        name: 'John Doe',
        type: 'friend' as const,
        photo: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: 'rel_2',
        userId: 'user_123',
        name: 'Jane Smith',
        type: 'family' as const,
        photo: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    mockUseRelationships.mockReturnValue({
      relationships: mockRelationships,
      relationshipsCount: 2,
      isLoading: false,
      currentUser: { _id: 'user_123' },
    })

    render(<RelationshipsList />)

    const searchInput = screen.getByPlaceholderText(/search relationships/i)
    await user.type(searchInput, 'John')

    // Should filter to show only John
    expect(screen.getByTestId('relationship-card-rel_1')).toBeInTheDocument()
    expect(
      screen.queryByTestId('relationship-card-rel_2')
    ).not.toBeInTheDocument()
  })

  it('calls onCreateNew when add button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnCreateNew = jest.fn()

    mockUseRelationships.mockReturnValue({
      relationships: [],
      relationshipsCount: 0,
      isLoading: false,
      currentUser: { _id: 'user_123' },
    })

    render(<RelationshipsList onCreateNew={mockOnCreateNew} />)

    const addButton = screen.getByRole('button', { name: /add relationship/i })
    await user.click(addButton)

    expect(mockOnCreateNew).toHaveBeenCalled()
  })

  it('shows search results count when filtering', async () => {
    const user = userEvent.setup()
    const mockRelationships = [
      {
        _id: 'rel_1',
        userId: 'user_123',
        name: 'John Doe',
        type: 'friend' as const,
        photo: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: 'rel_2',
        userId: 'user_123',
        name: 'Jane Smith',
        type: 'family' as const,
        photo: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    mockUseRelationships.mockReturnValue({
      relationships: mockRelationships,
      relationshipsCount: 2,
      isLoading: false,
      currentUser: { _id: 'user_123' },
    })

    render(<RelationshipsList />)

    const searchInput = screen.getByPlaceholderText(/search relationships/i)
    await user.type(searchInput, 'John')

    expect(
      screen.getByText(/showing 1 of 2 relationships/i)
    ).toBeInTheDocument()
  })
})
