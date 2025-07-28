/**
 * Input validation and sanitization utilities for AI HTTP Actions
 */

import { z } from 'zod'

// Zod schema for AI processing request validation
export const AIProcessingRequestSchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  retryCount: z.number().int().min(0).max(5).optional(),
  priority: z.enum(['normal', 'high', 'urgent']).optional(),
})

// Zod schema for journal entry content validation
export const JournalContentSchema = z.object({
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content must be less than 10,000 characters')
    .refine(
      content => content.trim().length > 0,
      'Content cannot be empty or only whitespace'
    ),
  mood: z.string().optional(),
  relationshipContext: z.string().optional(),
})

// Content safety validation
export const ContentSafetySchema = z.object({
  text: z.string().refine(text => {
    // Basic content safety checks
    const suspiciousPatterns = [
      /(?:suicide|kill myself|end it all)/i,
      /(?:harm|hurt|violence)/i,
      /(?:explicit sexual|graphic)/i,
    ]

    return !suspiciousPatterns.some(pattern => pattern.test(text))
  }, 'Content may contain unsafe material'),
})

// User tier validation for API limits
export interface UserTierLimits {
  free: {
    dailyAnalyses: number
    maxRetries: number
    priorityAccess: boolean
  }
  premium: {
    dailyAnalyses: number
    maxRetries: number
    priorityAccess: boolean
  }
}

export const USER_TIER_LIMITS: UserTierLimits = {
  free: {
    dailyAnalyses: 10,
    maxRetries: 3,
    priorityAccess: false,
  },
  premium: {
    dailyAnalyses: 100,
    maxRetries: 5,
    priorityAccess: true,
  },
}

/**
 * Validate AI processing request
 */
export function validateAIRequest(data: unknown) {
  try {
    return AIProcessingRequestSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}`
      )
    }
    throw error
  }
}

/**
 * Validate and sanitize journal content
 */
export function validateJournalContent(data: unknown) {
  try {
    const validated = JournalContentSchema.parse(data)

    // Additional content safety check
    ContentSafetySchema.parse({ text: validated.content })

    return {
      ...validated,
      content: sanitizeContent(validated.content),
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Content validation error: ${error.issues.map((e: any) => e.message).join(', ')}`
      )
    }
    throw error
  }
}

/**
 * Sanitize content for AI processing
 */
export function sanitizeContent(content: string): string {
  return (
    content
      .trim()
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove potential script injections
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Basic HTML tag removal (keep basic formatting)
      .replace(/<(?!\/?(b|i|em|strong|br|p)\b)[^>]*>/gi, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
  )
}

/**
 * Check user tier limits for AI analysis
 */
export function checkUserTierLimits(
  userTier: 'free' | 'premium',
  dailyUsage: number,
  retryCount: number
): { allowed: boolean; reason?: string } {
  const limits = USER_TIER_LIMITS[userTier]

  if (dailyUsage >= limits.dailyAnalyses) {
    return {
      allowed: false,
      reason: `Daily analysis limit reached (${limits.dailyAnalyses} for ${userTier} tier)`,
    }
  }

  if (retryCount >= limits.maxRetries) {
    return {
      allowed: false,
      reason: `Maximum retry attempts reached (${limits.maxRetries} for ${userTier} tier)`,
    }
  }

  return { allowed: true }
}

/**
 * Generate request logging data for audit trail
 */
export function generateRequestLogData(
  request: any,
  userInfo: { id: string; email?: string; tier?: string }
) {
  return {
    timestamp: Date.now(),
    requestId: generateRequestId(),
    userId: userInfo.id,
    userEmail: userInfo.email,
    userTier: userInfo.tier || 'free',
    entryId: request.entryId,
    retryCount: request.retryCount || 0,
    priority: request.priority || 'normal',
    ipAddress: request.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: request.headers?.['user-agent'] || 'unknown',
  }
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `ai-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate user authentication token (for future use with Clerk)
 */
export async function validateUserAuth(authHeader: string | null): Promise<{
  valid: boolean
  userId?: string
  error?: string
}> {
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid authorization format' }
  }

  const token = authHeader.slice(7)

  if (!token) {
    return { valid: false, error: 'Missing authorization token' }
  }

  // For now, extract userId from token (will be replaced with Clerk validation)
  // This is a placeholder implementation
  try {
    // In production, this would validate the JWT with Clerk
    // For now, assume the token contains the userId
    const userId = token // Simplified for development

    return { valid: true, userId }
  } catch (error) {
    return { valid: false, error: 'Invalid authorization token' }
  }
}

/**
 * Rate limiting check (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  userId: string,
  userTier: 'free' | 'premium'
): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const limits = {
    free: 5, // 5 requests per minute for free users
    premium: 20, // 20 requests per minute for premium users
  }

  const key = `${userId}:${Math.floor(now / windowMs)}`
  const current = rateLimitMap.get(key) || {
    count: 0,
    resetTime: now + windowMs,
  }

  if (current.count >= limits[userTier]) {
    return { allowed: false, resetTime: current.resetTime }
  }

  // Update count
  rateLimitMap.set(key, {
    count: current.count + 1,
    resetTime: current.resetTime,
  })

  // Clean up old entries
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [mapKey, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(mapKey)
      }
    }
  }

  return { allowed: true }
}
