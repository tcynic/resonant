import {
  CreateUserSchema,
  CreateRelationshipSchema,
  CreateJournalEntrySchema,
  validateData,
} from '../validations'

describe('Validation Schemas', () => {
  describe('CreateUserSchema', () => {
    it('validates correct user data', () => {
      const validData = {
        clerkId: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
      }

      expect(() => validateData(CreateUserSchema, validData)).not.toThrow()
    })

    it('rejects invalid email', () => {
      const invalidData = {
        clerkId: 'user_123',
        name: 'John Doe',
        email: 'invalid-email',
      }

      expect(() => validateData(CreateUserSchema, invalidData)).toThrow(
        'Invalid email format'
      )
    })

    it('rejects missing required fields', () => {
      const invalidData = {
        clerkId: 'user_123',
        name: '',
        email: 'john@example.com',
      }

      expect(() => validateData(CreateUserSchema, invalidData)).toThrow(
        'Name is required'
      )
    })
  })

  describe('CreateRelationshipSchema', () => {
    it('validates correct relationship data', () => {
      const validData = {
        name: 'My Partner',
        type: 'partner' as const,
        photo: 'https://example.com/photo.jpg',
      }

      expect(() =>
        validateData(CreateRelationshipSchema, validData)
      ).not.toThrow()
    })

    it('validates relationship without photo', () => {
      const validData = {
        name: 'My Friend',
        type: 'friend' as const,
      }

      expect(() =>
        validateData(CreateRelationshipSchema, validData)
      ).not.toThrow()
    })

    it('rejects invalid relationship type', () => {
      const invalidData = {
        name: 'Test',
        type: 'invalid',
      }

      expect(() =>
        validateData(CreateRelationshipSchema, invalidData)
      ).toThrow()
    })

    it('rejects invalid photo URL', () => {
      const invalidData = {
        name: 'Test',
        type: 'friend' as const,
        photo: 'not-a-url',
      }

      expect(() => validateData(CreateRelationshipSchema, invalidData)).toThrow(
        'Invalid photo URL'
      )
    })
  })

  describe('CreateJournalEntrySchema', () => {
    it('validates correct journal entry data', () => {
      const validData = {
        relationshipId: 'rel_123',
        content: 'Had a great conversation today.',
        mood: 'happy',
        isPrivate: true,
        tags: ['conversation', 'positive'],
      }

      expect(() =>
        validateData(CreateJournalEntrySchema, validData)
      ).not.toThrow()
    })

    it('validates minimal journal entry data', () => {
      const validData = {
        relationshipId: 'rel_123',
        content: 'Simple entry',
      }

      expect(() =>
        validateData(CreateJournalEntrySchema, validData)
      ).not.toThrow()
    })

    it('rejects empty content', () => {
      const invalidData = {
        relationshipId: 'rel_123',
        content: '',
      }

      expect(() => validateData(CreateJournalEntrySchema, invalidData)).toThrow(
        'Content is required'
      )
    })

    it('rejects too many tags', () => {
      const invalidData = {
        relationshipId: 'rel_123',
        content: 'Test content',
        tags: Array(15).fill('tag'), // More than 10 tags
      }

      expect(() => validateData(CreateJournalEntrySchema, invalidData)).toThrow(
        'Too many tags'
      )
    })

    it('sets default isPrivate to false', () => {
      const data = {
        relationshipId: 'rel_123',
        content: 'Test content',
      }

      const result = validateData(CreateJournalEntrySchema, data)
      expect(result.isPrivate).toBe(false)
    })
  })
})
