// Validation constants for Convex functions
export const VALIDATION_LIMITS = {
  NAME_MAX_LENGTH: 100,
  CONTENT_MAX_LENGTH: 10000,
  MOOD_MAX_LENGTH: 50,
  TAG_MAX_LENGTH: 50,
  TAGS_MAX_COUNT: 10,
  QUERY_DEFAULT_LIMIT: 20,
  QUERY_MAX_LIMIT: 100,
} as const

export const ERROR_MESSAGES = {
  // User errors
  CLERK_ID_REQUIRED: 'Clerk ID is required',
  NAME_REQUIRED: 'Name is required',
  EMAIL_REQUIRED: 'Valid email is required',
  USER_NOT_FOUND: 'User not found',
  USER_CREATE_FAILED: 'Failed to create user',
  USER_UPDATE_FAILED: 'Failed to update user preferences',

  // Relationship errors
  RELATIONSHIP_NAME_REQUIRED: 'Relationship name is required',
  RELATIONSHIP_NAME_TOO_LONG: 'Relationship name too long',
  RELATIONSHIP_NAME_EMPTY: 'Relationship name cannot be empty',
  RELATIONSHIP_NOT_FOUND: 'Relationship not found',
  RELATIONSHIP_UNAUTHORIZED:
    "Unauthorized: Cannot access another user's relationship",
  RELATIONSHIP_CREATE_FAILED: 'Failed to create relationship',
  RELATIONSHIP_UPDATE_FAILED: 'Failed to update relationship',
  RELATIONSHIP_DELETE_FAILED: 'Failed to delete relationship',
  RELATIONSHIP_HAS_ENTRIES:
    'Cannot delete relationship with existing journal entries',

  // Journal entry errors
  CONTENT_REQUIRED: 'Entry content is required',
  CONTENT_TOO_LONG: 'Entry content too long',
  CONTENT_EMPTY: 'Entry content cannot be empty',
  ENTRY_NOT_FOUND: 'Journal entry not found',
  ENTRY_UNAUTHORIZED: "Unauthorized: Cannot access another user's entry",
  ENTRY_CREATE_FAILED: 'Failed to create journal entry',
  ENTRY_UPDATE_FAILED: 'Failed to update journal entry',
  ENTRY_DELETE_FAILED: 'Failed to delete journal entry',

  // Tag errors
  TAGS_TOO_MANY: 'Too many tags (maximum 10)',
  TAG_TOO_LONG: 'Tag too long (maximum 50 characters)',
} as const
