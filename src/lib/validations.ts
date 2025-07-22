import { z } from 'zod'

// User validation schemas
export const CreateUserSchema = z.object({
  clerkId: z.string().min(1, 'Clerk ID is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
})

export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  notifications: z.boolean().optional(),
  language: z.string().optional(),
})

// Relationship validation schemas
export const RelationshipTypeSchema = z.enum([
  'partner',
  'family',
  'friend',
  'colleague',
  'other',
])

export const CreateRelationshipSchema = z.object({
  name: z
    .string()
    .min(1, 'Relationship name is required')
    .max(100, 'Name too long'),
  type: RelationshipTypeSchema,
  photo: z.string().url('Invalid photo URL').optional().or(z.literal('')),
})

export const UpdateRelationshipSchema = z.object({
  name: z
    .string()
    .min(1, 'Relationship name is required')
    .max(100, 'Name too long')
    .optional(),
  type: RelationshipTypeSchema.optional(),
  photo: z.string().url('Invalid photo URL').optional().or(z.literal('')),
})

// Journal Entry validation schemas
export const CreateJournalEntrySchema = z.object({
  relationshipId: z.string().min(1, 'Relationship ID is required'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content too long'),
  mood: z.string().max(50, 'Mood description too long').optional(),
  isPrivate: z.boolean().optional().default(false),
  tags: z
    .array(z.string().max(50, 'Tag too long'))
    .max(10, 'Too many tags')
    .optional(),
})

export const UpdateJournalEntrySchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content too long')
    .optional(),
  mood: z.string().max(50, 'Mood description too long').optional(),
  isPrivate: z.boolean().optional(),
  tags: z
    .array(z.string().max(50, 'Tag too long'))
    .max(10, 'Too many tags')
    .optional(),
})

// Search and filter schemas
export const SearchEntriesSchema = z.object({
  query: z.string().optional(),
  relationshipId: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export const FilterRelationshipsSchema = z.object({
  type: RelationshipTypeSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// Validation helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }
    throw error
  }
}
