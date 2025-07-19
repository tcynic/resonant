import { ConvexError } from 'convex/values'
import { VALIDATION_LIMITS, ERROR_MESSAGES } from '../constants'

/**
 * Validates user input fields
 */
export function validateUserInput(args: {
  clerkId?: string
  name?: string
  email?: string
}) {
  if (args.clerkId !== undefined && !args.clerkId?.trim()) {
    throw new ConvexError(ERROR_MESSAGES.CLERK_ID_REQUIRED)
  }

  if (args.name !== undefined && !args.name?.trim()) {
    throw new ConvexError(ERROR_MESSAGES.NAME_REQUIRED)
  }

  if (
    args.email !== undefined &&
    (!args.email?.trim() || !args.email.includes('@'))
  ) {
    throw new ConvexError(ERROR_MESSAGES.EMAIL_REQUIRED)
  }
}

/**
 * Validates relationship name
 */
export function validateRelationshipName(name: string, isRequired = true) {
  if (isRequired && !name?.trim()) {
    throw new ConvexError(ERROR_MESSAGES.RELATIONSHIP_NAME_REQUIRED)
  }

  if (name && name.trim().length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    throw new ConvexError(ERROR_MESSAGES.RELATIONSHIP_NAME_TOO_LONG)
  }
}

/**
 * Validates journal entry content
 */
export function validateContent(content: string, isRequired = true) {
  if (isRequired && !content?.trim()) {
    throw new ConvexError(ERROR_MESSAGES.CONTENT_REQUIRED)
  }

  if (content && content.trim().length > VALIDATION_LIMITS.CONTENT_MAX_LENGTH) {
    throw new ConvexError(ERROR_MESSAGES.CONTENT_TOO_LONG)
  }
}

/**
 * Validates tags array
 */
export function validateTags(tags: string[] | undefined) {
  if (!tags) return

  if (tags.length > VALIDATION_LIMITS.TAGS_MAX_COUNT) {
    throw new ConvexError(ERROR_MESSAGES.TAGS_TOO_MANY)
  }

  if (tags.some(tag => tag.length > VALIDATION_LIMITS.TAG_MAX_LENGTH)) {
    throw new ConvexError(ERROR_MESSAGES.TAG_TOO_LONG)
  }
}

/**
 * Cleans and filters tags
 */
export function cleanTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined
  return tags.map(tag => tag.trim()).filter(tag => tag.length > 0)
}
