import { VALIDATION_LIMITS, ERROR_MESSAGES } from '../constants'

describe('Constants', () => {
  describe('VALIDATION_LIMITS', () => {
    it('has reasonable validation limits', () => {
      expect(VALIDATION_LIMITS.NAME_MAX_LENGTH).toBe(100)
      expect(VALIDATION_LIMITS.CONTENT_MAX_LENGTH).toBe(10000)
      expect(VALIDATION_LIMITS.MOOD_MAX_LENGTH).toBe(50)
      expect(VALIDATION_LIMITS.TAG_MAX_LENGTH).toBe(50)
      expect(VALIDATION_LIMITS.TAGS_MAX_COUNT).toBe(10)
      expect(VALIDATION_LIMITS.QUERY_DEFAULT_LIMIT).toBe(20)
      expect(VALIDATION_LIMITS.QUERY_MAX_LIMIT).toBe(100)
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('has all required error messages', () => {
      // User error messages
      expect(ERROR_MESSAGES.CLERK_ID_REQUIRED).toBeTruthy()
      expect(ERROR_MESSAGES.NAME_REQUIRED).toBeTruthy()
      expect(ERROR_MESSAGES.EMAIL_REQUIRED).toBeTruthy()
      expect(ERROR_MESSAGES.USER_NOT_FOUND).toBeTruthy()

      // Relationship error messages
      expect(ERROR_MESSAGES.RELATIONSHIP_NAME_REQUIRED).toBeTruthy()
      expect(ERROR_MESSAGES.RELATIONSHIP_NOT_FOUND).toBeTruthy()
      expect(ERROR_MESSAGES.RELATIONSHIP_UNAUTHORIZED).toBeTruthy()

      // Journal entry error messages
      expect(ERROR_MESSAGES.CONTENT_REQUIRED).toBeTruthy()
      expect(ERROR_MESSAGES.ENTRY_NOT_FOUND).toBeTruthy()
      expect(ERROR_MESSAGES.ENTRY_UNAUTHORIZED).toBeTruthy()

      // Tag error messages
      expect(ERROR_MESSAGES.TAGS_TOO_MANY).toBeTruthy()
      expect(ERROR_MESSAGES.TAG_TOO_LONG).toBeTruthy()
    })

    it('has consistent error message formatting', () => {
      const messages = Object.values(ERROR_MESSAGES)

      // All messages should be strings
      messages.forEach(message => {
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })
  })
})
