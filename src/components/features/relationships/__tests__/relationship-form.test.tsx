import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RelationshipForm from '../relationship-form'
import { useRelationshipMutations } from '@/hooks/use-relationships'

// Mock the hooks and dependencies
jest.mock('@/hooks/use-relationships')
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { id: 'user_123' } }),
}))
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}))
// Mock Convex generated files (these files don't exist yet in development)
jest.mock('../../../../convex/_generated/api', () => ({}), { virtual: true })
jest.mock('../../../../convex/_generated/dataModel', () => ({}), {
  virtual: true,
})

const mockCreateRelationship = jest.fn()
const mockUpdateRelationship = jest.fn()
const mockDeleteRelationship = jest.fn()

const mockUseRelationshipMutations =
  useRelationshipMutations as jest.MockedFunction<
    typeof useRelationshipMutations
  >

describe('RelationshipForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRelationshipMutations.mockReturnValue({
      createRelationship: mockCreateRelationship,
      updateRelationship: mockUpdateRelationship,
      deleteRelationship: mockDeleteRelationship,
      isReady: true,
    })
  })

  describe('Create Mode', () => {
    it('renders create form with all required fields', () => {
      render(<RelationshipForm />)

      expect(screen.getByLabelText(/relationship name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/relationship type/i)).toBeInTheDocument()
      expect(screen.getByText(/photo \(optional\)/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create relationship/i })
      ).toBeInTheDocument()
    })

    it('displays validation errors for empty required fields', async () => {
      const user = userEvent.setup()
      render(<RelationshipForm />)

      const submitButton = screen.getByRole('button', {
        name: /create relationship/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/relationship name is required/i)
        ).toBeInTheDocument()
      })
    })

    it('displays validation error for name that is too long', async () => {
      const user = userEvent.setup()
      render(<RelationshipForm />)

      const nameInput = screen.getByLabelText(/relationship name/i)
      const longName = 'a'.repeat(101) // Exceeds 100 character limit

      await user.type(nameInput, longName)

      const submitButton = screen.getByRole('button', {
        name: /create relationship/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/name too long/i)).toBeInTheDocument()
      })
    })

    it('successfully creates relationship with valid data', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      mockCreateRelationship.mockResolvedValue('rel_123')

      render(<RelationshipForm onSuccess={mockOnSuccess} />)

      // Fill form
      await user.type(screen.getByLabelText(/relationship name/i), 'John Doe')
      await user.selectOptions(
        screen.getByLabelText(/relationship type/i),
        'friend'
      )

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /create relationship/i })
      )

      await waitFor(() => {
        expect(mockCreateRelationship).toHaveBeenCalledWith({
          name: 'John Doe',
          type: 'friend',
          photo: '',
        })
        expect(mockOnSuccess).toHaveBeenCalledWith('rel_123')
      })
    })

    it('resets form after successful creation', async () => {
      const user = userEvent.setup()
      mockCreateRelationship.mockResolvedValue('rel_123')

      render(<RelationshipForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/relationship name/i), 'John Doe')
      await user.selectOptions(
        screen.getByLabelText(/relationship type/i),
        'friend'
      )
      await user.click(
        screen.getByRole('button', { name: /create relationship/i })
      )

      await waitFor(() => {
        expect(mockCreateRelationship).toHaveBeenCalled()
      })

      // Check form is reset
      expect(screen.getByLabelText(/relationship name/i)).toHaveValue('')
      expect(screen.getByLabelText(/relationship type/i)).toHaveValue('friend')
    })

    it('displays error message on creation failure', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to create relationship'
      mockCreateRelationship.mockRejectedValue(new Error(errorMessage))

      render(<RelationshipForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/relationship name/i), 'John Doe')
      await user.click(
        screen.getByRole('button', { name: /create relationship/i })
      )

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    const mockRelationship = {
      _id: 'rel_123',
      _creationTime: Date.now(),
      userId: 'user_123',
      name: 'Jane Smith',
      type: 'family' as const,
      photo: 'https://example.com/photo.jpg',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    it('renders edit form with pre-populated data', () => {
      render(<RelationshipForm relationship={mockRelationship} />)

      expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument()
      expect(screen.getByDisplayValue('family')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /update relationship/i })
      ).toBeInTheDocument()
    })

    it('successfully updates relationship with changed data', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = jest.fn()
      mockUpdateRelationship.mockResolvedValue(true)

      render(
        <RelationshipForm
          relationship={mockRelationship}
          onSuccess={mockOnSuccess}
        />
      )

      // Change name
      const nameInput = screen.getByDisplayValue('Jane Smith')
      await user.clear(nameInput)
      await user.type(nameInput, 'Jane Doe')

      // Submit form
      await user.click(
        screen.getByRole('button', { name: /update relationship/i })
      )

      await waitFor(() => {
        expect(mockUpdateRelationship).toHaveBeenCalledWith('rel_123', {
          name: 'Jane Doe',
          type: undefined,
          photo: undefined,
        })
        expect(mockOnSuccess).toHaveBeenCalledWith('rel_123')
      })
    })

    it('does not send unchanged fields in update', async () => {
      const user = userEvent.setup()
      mockUpdateRelationship.mockResolvedValue(true)

      render(<RelationshipForm relationship={mockRelationship} />)

      // Submit without changes
      await user.click(
        screen.getByRole('button', { name: /update relationship/i })
      )

      await waitFor(() => {
        expect(mockUpdateRelationship).toHaveBeenCalledWith('rel_123', {
          name: undefined,
          type: undefined,
          photo: undefined,
        })
      })
    })
  })

  describe('Photo Upload', () => {
    it('shows upload area when no photo is provided', () => {
      render(<RelationshipForm />)

      expect(screen.getByText(/click to upload a photo/i)).toBeInTheDocument()
      expect(screen.getByText(/png, jpg up to 5mb/i)).toBeInTheDocument()
    })

    it('shows photo preview when photo is provided', () => {
      const mockRelationship = {
        _id: 'rel_123',
        _creationTime: Date.now(),
        userId: 'user_123',
        name: 'Jane Smith',
        type: 'family' as const,
        photo:
          'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      render(<RelationshipForm relationship={mockRelationship} />)

      expect(
        screen.getByAltText(/relationship photo preview/i)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /remove photo/i })
      ).toBeInTheDocument()
    })
  })

  describe('Form Actions', () => {
    it('shows cancel button when onCancel is provided', () => {
      const mockOnCancel = jest.fn()
      render(<RelationshipForm onCancel={mockOnCancel} />)

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnCancel = jest.fn()
      render(<RelationshipForm onCancel={mockOnCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('disables submit button when not ready', () => {
      mockUseRelationshipMutations.mockReturnValue({
        createRelationship: mockCreateRelationship,
        updateRelationship: mockUpdateRelationship,
        deleteRelationship: mockDeleteRelationship,
        isReady: false,
      })

      render(<RelationshipForm />)

      expect(
        screen.getByRole('button', { name: /create relationship/i })
      ).toBeDisabled()
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      mockCreateRelationship.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<RelationshipForm />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/relationship name/i), 'John Doe')
      await user.click(
        screen.getByRole('button', { name: /create relationship/i })
      )

      expect(
        screen.getByRole('button', { name: /creating.../i })
      ).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and accessibility attributes', () => {
      render(<RelationshipForm />)

      expect(screen.getByLabelText(/relationship name/i)).toHaveAttribute(
        'required'
      )
      expect(screen.getByLabelText(/relationship type/i)).toHaveAttribute(
        'required'
      )
    })

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<RelationshipForm />)

      await user.click(
        screen.getByRole('button', { name: /create relationship/i })
      )

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/relationship name/i)
        const errorMessage = screen.getByText(/relationship name is required/i)
        expect(nameInput).toBeInvalid()
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })
})
