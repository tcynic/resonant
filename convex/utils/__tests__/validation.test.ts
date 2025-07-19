import { ConvexError } from 'convex/values'
import {
  validateUserInput,
  validateRelationshipName,
  validateContent,
  validateTags,
  cleanTags,
} from '../validation'

describe('Validation Utils', () => {
  describe('validateUserInput', () => {
    it('passes with valid user input', () => {
      expect(() =>
        validateUserInput({
          clerkId: 'user_123',
          name: 'John Doe',
          email: 'john@example.com',
        })
      ).not.toThrow()
    })

    it('throws for empty clerkId', () => {
      expect(() =>
        validateUserInput({
          clerkId: '',
          name: 'John',
          email: 'john@example.com',
        })
      ).toThrow(ConvexError)
    })

    it('throws for empty name', () => {
      expect(() =>
        validateUserInput({
          clerkId: 'user_123',
          name: '',
          email: 'john@example.com',
        })
      ).toThrow(ConvexError)
    })

    it('throws for invalid email', () => {
      expect(() =>
        validateUserInput({
          clerkId: 'user_123',
          name: 'John',
          email: 'invalid',
        })
      ).toThrow(ConvexError)
    })
  })

  describe('validateRelationshipName', () => {
    it('passes with valid name', () => {
      expect(() => validateRelationshipName('My Partner')).not.toThrow()
    })

    it('throws for empty name when required', () => {
      expect(() => validateRelationshipName('')).toThrow(ConvexError)
    })

    it('throws for name too long', () => {
      const longName = 'a'.repeat(101)
      expect(() => validateRelationshipName(longName)).toThrow(ConvexError)
    })

    it('allows empty name when not required', () => {
      expect(() => validateRelationshipName('', false)).not.toThrow()
    })
  })

  describe('validateContent', () => {
    it('passes with valid content', () => {
      expect(() => validateContent('Some journal content')).not.toThrow()
    })

    it('throws for empty content when required', () => {
      expect(() => validateContent('')).toThrow(ConvexError)
    })

    it('throws for content too long', () => {
      const longContent = 'a'.repeat(10001)
      expect(() => validateContent(longContent)).toThrow(ConvexError)
    })

    it('allows empty content when not required', () => {
      expect(() => validateContent('', false)).not.toThrow()
    })
  })

  describe('validateTags', () => {
    it('passes with valid tags', () => {
      expect(() => validateTags(['tag1', 'tag2'])).not.toThrow()
    })

    it('passes with undefined tags', () => {
      expect(() => validateTags(undefined)).not.toThrow()
    })

    it('throws for too many tags', () => {
      const manyTags = Array(11).fill('tag')
      expect(() => validateTags(manyTags)).toThrow(ConvexError)
    })

    it('throws for tag too long', () => {
      const longTag = 'a'.repeat(51)
      expect(() => validateTags([longTag])).toThrow(ConvexError)
    })
  })

  describe('cleanTags', () => {
    it('returns undefined for undefined input', () => {
      expect(cleanTags(undefined)).toBeUndefined()
    })

    it('trims and filters empty tags', () => {
      const input = ['  tag1  ', '', '  tag2  ', '   ']
      const result = cleanTags(input)
      expect(result).toEqual(['tag1', 'tag2'])
    })

    it('returns empty array when all tags are empty', () => {
      const input = ['', '   ', '']
      const result = cleanTags(input)
      expect(result).toEqual([])
    })
  })
})
