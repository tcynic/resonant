import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RelationshipCard from '../relationship-card'

const mockRelationship = {
  _id: 'rel_123',
  userId: 'user_123',
  name: 'John Doe',
  type: 'friend' as const,
  photo: 'https://example.com/photo.jpg',
  createdAt: Date.now() - 86400000, // 1 day ago
  updatedAt: Date.now() - 3600000, // 1 hour ago
}

describe('RelationshipCard', () => {
  it('renders relationship information correctly', () => {
    render(<RelationshipCard relationship={mockRelationship} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Friend')).toBeInTheDocument()
    expect(screen.getByAltText('John Doe photo')).toBeInTheDocument()
  })

  it('renders relationship without photo', () => {
    const relationshipWithoutPhoto = { ...mockRelationship, photo: undefined }
    render(<RelationshipCard relationship={relationshipWithoutPhoto} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    // Should show default avatar icon
    expect(screen.queryByAltText('John Doe photo')).not.toBeInTheDocument()
  })

  it('shows action buttons when callbacks are provided', () => {
    const mockOnEdit = jest.fn()
    const mockOnDelete = jest.fn()

    render(
      <RelationshipCard 
        relationship={mockRelationship} 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides action buttons when showActions is false', () => {
    const mockOnEdit = jest.fn()
    const mockOnDelete = jest.fn()

    render(
      <RelationshipCard 
        relationship={mockRelationship} 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        showActions={false}
      />
    )

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnEdit = jest.fn()

    render(<RelationshipCard relationship={mockRelationship} onEdit={mockOnEdit} />)

    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    expect(mockOnEdit).toHaveBeenCalled()
  })

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnDelete = jest.fn()

    render(<RelationshipCard relationship={mockRelationship} onDelete={mockOnDelete} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalled()
  })

  it('displays correct relationship type styling', () => {
    const partnerRelationship = { ...mockRelationship, type: 'partner' as const }
    render(<RelationshipCard relationship={partnerRelationship} />)

    const typeElement = screen.getByText('Partner')
    expect(typeElement).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('displays dates correctly', () => {
    render(<RelationshipCard relationship={mockRelationship} />)

    // Should show "Added" date
    expect(screen.getByText(/added/i)).toBeInTheDocument()
    // Should show "Updated" date since updated != created
    expect(screen.getByText(/updated/i)).toBeInTheDocument()
  })

  it('handles relationship with same created and updated dates', () => {
    const sameDate = Date.now()
    const newRelationship = { 
      ...mockRelationship, 
      createdAt: sameDate,
      updatedAt: sameDate 
    }
    
    render(<RelationshipCard relationship={newRelationship} />)

    expect(screen.getByText(/added/i)).toBeInTheDocument()
    expect(screen.queryByText(/updated/i)).not.toBeInTheDocument()
  })
})