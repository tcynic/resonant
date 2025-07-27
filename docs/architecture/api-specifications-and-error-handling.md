# API Specifications and Error Handling Patterns

This document provides comprehensive documentation for the Resonant application's API patterns, error handling strategies, and best practices for working with Convex backend functions.

## Table of Contents

1. [API Architecture Overview](#api-architecture-overview)
2. [Function Types and Patterns](#function-types-and-patterns)
3. [Argument Validation and Type Safety](#argument-validation-and-type-safety)
4. [Error Handling Strategies](#error-handling-strategies)
5. [Client-Side Integration Patterns](#client-side-integration-patterns)
6. [Performance and Optimization](#performance-and-optimization)
7. [Security Best Practices](#security-best-practices)
8. [Real-time Features](#real-time-features)
9. [Testing API Functions](#testing-api-functions)
10. [Troubleshooting Guide](#troubleshooting-guide)

## API Architecture Overview

### Convex Function Types

Resonant uses three types of Convex functions, each with specific purposes and capabilities:

```typescript
// Query Functions - Read-only operations
export const getJournalEntries = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()
  },
})

// Mutation Functions - Write operations with transactions
export const createJournalEntry = mutation({
  args: {
    userId: v.string(),
    content: v.string(),
    mood: v.optional(v.string()),
    relationshipId: v.optional(v.id('relationships')),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert('journalEntries', {
      ...args,
      createdAt: Date.now(),
    })

    // Schedule AI analysis if enabled
    if (args.allowAIAnalysis) {
      await ctx.scheduler.runAfter(0, internal.aiAnalysis.processEntry, {
        entryId,
        userId: args.userId,
      })
    }

    return entryId
  },
})

// Action Functions - External API calls and side effects
export const generateAIInsights = action({
  args: { analysisId: v.id('aiAnalyses') },
  handler: async (ctx, { analysisId }) => {
    const analysis = await ctx.runQuery(internal.aiAnalysis.getById, {
      analysisId,
    })

    // Call external AI service
    const insights = await callGeminiAPI(analysis.content)

    // Store results via mutation
    await ctx.runMutation(internal.insights.create, {
      analysisId,
      insights,
    })
  },
})
```

### API Naming Conventions

Functions are accessible via the generated API object using the path pattern:

```typescript
// File: convex/journalEntries.ts, export: list
api.journalEntries.list

// File: convex/users/profile.ts, export: update
api.users.profile.update

// File: convex/relationships.ts, export: default
api.relationships.default
```

### Internal vs Public Functions

```typescript
// Public function - accessible from client
export const createUser = mutation({
  args: { clerkId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthorized')

    return await createUserHelper(ctx, args)
  },
})

// Internal function - only callable from other Convex functions
export const createUserInternal = internalMutation({
  args: { clerkId: v.string(), name: v.string(), source: v.string() },
  handler: async (ctx, args) => {
    return await createUserHelper(ctx, args)
  },
})

// Shared helper function
async function createUserHelper(ctx: MutationCtx, args: any) {
  return await ctx.db.insert('users', {
    ...args,
    createdAt: Date.now(),
    tier: 'free',
  })
}
```

## Function Types and Patterns

### Query Function Patterns

#### Basic Data Retrieval

```typescript
export const getUserProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .unique()
  },
})
```

#### Filtered and Sorted Queries

```typescript
export const getJournalEntriesByMood = query({
  args: {
    userId: v.string(),
    mood: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, mood, limit = 50 }) => {
    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', userId))

    if (mood) {
      query = query.filter(q => q.eq(q.field('mood'), mood))
    }

    return await query.order('desc').take(limit)
  },
})
```

#### Paginated Queries

```typescript
export const getJournalEntriesPaginated = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { userId, paginationOpts }) => {
    return await ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('desc')
      .paginate(paginationOpts)
  },
})
```

### Mutation Function Patterns

#### Simple Create Operations

```typescript
export const createRelationship = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.union(
      v.literal('partner'),
      v.literal('family'),
      v.literal('friend')
    ),
  },
  handler: async (ctx, args) => {
    // Validate user exists and check tier limits
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.userId))
      .unique()

    if (!user) {
      throw new ConvexError('User not found')
    }

    // Check free tier limits
    if (user.tier === 'free') {
      const relationshipCount = await ctx.db
        .query('relationships')
        .withIndex('by_user_active', q =>
          q.eq('userId', args.userId).eq('isActive', true)
        )
        .collect()

      if (relationshipCount.length >= 3) {
        throw new ConvexError(
          'Free tier limited to 3 relationships. Upgrade to add more.'
        )
      }
    }

    return await ctx.db.insert('relationships', {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    })
  },
})
```

#### Complex Update Operations

```typescript
export const updateHealthScore = mutation({
  args: {
    relationshipId: v.id('relationships'),
    score: v.number(),
    factorBreakdown: v.object({
      communication: v.number(),
      emotional_support: v.number(),
      conflict_resolution: v.number(),
      trust_intimacy: v.number(),
      shared_growth: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Find existing health score
    const existingScore = await ctx.db
      .query('healthScores')
      .withIndex('by_relationship', q =>
        q.eq('relationshipId', args.relationshipId)
      )
      .unique()

    if (existingScore) {
      // Update existing score
      await ctx.db.patch(existingScore._id, {
        score: args.score,
        factorBreakdown: args.factorBreakdown,
        updatedAt: Date.now(),
      })
      return existingScore._id
    } else {
      // Create new score
      return await ctx.db.insert('healthScores', {
        relationshipId: args.relationshipId,
        score: args.score,
        factorBreakdown: args.factorBreakdown,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
  },
})
```

#### Transaction-like Operations

```typescript
export const transferData = mutation({
  args: {
    fromUserId: v.string(),
    toUserId: v.string(),
    entryIds: v.array(v.id('journalEntries')),
  },
  handler: async (ctx, { fromUserId, toUserId, entryIds }) => {
    // Verify both users exist
    const [fromUser, toUser] = await Promise.all([
      ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', fromUserId))
        .unique(),
      ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', toUserId))
        .unique(),
    ])

    if (!fromUser || !toUser) {
      throw new ConvexError('One or both users not found')
    }

    // Update all entries atomically
    const results = await Promise.all(
      entryIds.map(entryId =>
        ctx.db.patch(entryId, { userId: toUserId, transferredAt: Date.now() })
      )
    )

    // Log the transfer
    await ctx.db.insert('dataTransfers', {
      fromUserId,
      toUserId,
      entryIds,
      completedAt: Date.now(),
    })

    return { transferred: results.length }
  },
})
```

### Action Function Patterns

#### External API Integration

```typescript
export const analyzeWithAI = action({
  args: {
    entryId: v.id('journalEntries'),
    analysisType: v.union(v.literal('sentiment'), v.literal('patterns')),
  },
  handler: async (ctx, { entryId, analysisType }) => {
    // Get entry data
    const entry = await ctx.runQuery(internal.journalEntries.getById, {
      entryId,
    })
    if (!entry) {
      throw new ConvexError('Journal entry not found')
    }

    try {
      // Call external AI service
      const analysisResult = await callGeminiAPI(entry.content, analysisType)

      // Store results via mutation
      const analysisId = await ctx.runMutation(internal.aiAnalysis.create, {
        entryId,
        userId: entry.userId,
        type: analysisType,
        result: analysisResult,
        confidence: analysisResult.confidence,
      })

      // Generate insights if confidence is high
      if (analysisResult.confidence > 0.8) {
        await ctx.scheduler.runAfter(
          0,
          internal.insights.generateFromAnalysis,
          {
            analysisId,
          }
        )
      }

      return { analysisId, confidence: analysisResult.confidence }
    } catch (error) {
      // Log error and create failed analysis record
      await ctx.runMutation(internal.aiAnalysis.createFailed, {
        entryId,
        userId: entry.userId,
        type: analysisType,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new ConvexError('AI analysis failed. Please try again later.')
    }
  },
})
```

#### Scheduled Background Processing

```typescript
export const processScheduledAnalysis = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Get pending entries for analysis
    const pendingEntries = await ctx.runQuery(
      internal.journalEntries.getPendingAnalysis,
      {
        userId,
        limit: 10,
      }
    )

    for (const entry of pendingEntries) {
      try {
        // Process each entry
        await ctx.runAction(internal.aiAnalysis.analyzeEntry, {
          entryId: entry._id,
          priority: 'scheduled',
        })

        // Add delay between processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to process entry ${entry._id}:`, error)
        // Continue processing other entries
      }
    }
  },
})
```

## Argument Validation and Type Safety

### Zod Integration for Complex Validation

```typescript
import { v } from 'convex/values'

// Define complex validation schemas
const journalEntrySchema = v.object({
  userId: v.string(),
  content: v.string(),
  mood: v.optional(
    v.union(
      v.literal('ecstatic'),
      v.literal('joyful'),
      v.literal('happy'),
      v.literal('content'),
      v.literal('calm'),
      v.literal('neutral'),
      v.literal('concerned'),
      v.literal('sad'),
      v.literal('frustrated'),
      v.literal('angry'),
      v.literal('devastated')
    )
  ),
  relationshipId: v.optional(v.id('relationships')),
  tags: v.optional(v.array(v.string())),
  allowAIAnalysis: v.optional(v.boolean()),
  isPrivate: v.optional(v.boolean()),
})

export const createJournalEntry = mutation({
  args: journalEntrySchema,
  handler: async (ctx, args) => {
    // Args are fully typed and validated
    const entryId = await ctx.db.insert('journalEntries', {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return entryId
  },
})
```

### Custom Validation Functions

```typescript
// Custom validation helper
function validateUserAccess(userId: string, resourceUserId: string) {
  if (userId !== resourceUserId) {
    throw new ConvexError('Access denied: Resource belongs to another user')
  }
}

export const updateJournalEntry = mutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.string(),
    updates: v.object({
      content: v.optional(v.string()),
      mood: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { entryId, userId, updates }) => {
    // Get existing entry
    const entry = await ctx.db.get(entryId)
    if (!entry) {
      throw new ConvexError('Journal entry not found')
    }

    // Validate user access
    validateUserAccess(userId, entry.userId)

    // Update entry
    await ctx.db.patch(entryId, {
      ...updates,
      updatedAt: Date.now(),
    })

    return entryId
  },
})
```

## Error Handling Strategies

### Application Error Types

```typescript
// Define application-specific errors
export class ResonantError extends ConvexError {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super({ message, code, details })
  }
}

export class ValidationError extends ResonantError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field })
  }
}

export class AccessDeniedError extends ResonantError {
  constructor(resource: string) {
    super(`Access denied to ${resource}`, 'ACCESS_DENIED', { resource })
  }
}

export class QuotaExceededError extends ResonantError {
  constructor(quotaType: string, limit: number) {
    super(`${quotaType} quota exceeded (limit: ${limit})`, 'QUOTA_EXCEEDED', {
      quotaType,
      limit,
    })
  }
}
```

### Server-Side Error Handling

```typescript
export const createRelationshipWithErrorHandling = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Input validation
      if (!args.name.trim()) {
        throw new ValidationError('Relationship name cannot be empty', 'name')
      }

      if (!['partner', 'family', 'friend'].includes(args.type)) {
        throw new ValidationError('Invalid relationship type', 'type')
      }

      // Business logic validation
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', args.userId))
        .unique()

      if (!user) {
        throw new AccessDeniedError('user profile')
      }

      // Check quota limits
      if (user.tier === 'free') {
        const relationshipCount = await ctx.db
          .query('relationships')
          .withIndex('by_user_active', q =>
            q.eq('userId', args.userId).eq('isActive', true)
          )
          .collect()

        if (relationshipCount.length >= 3) {
          throw new QuotaExceededError('relationships', 3)
        }
      }

      // Create relationship
      const relationshipId = await ctx.db.insert('relationships', {
        userId: args.userId,
        name: args.name.trim(),
        type: args.type,
        isActive: true,
        createdAt: Date.now(),
      })

      return { success: true, relationshipId }
    } catch (error) {
      // Log error for monitoring
      console.error('Error creating relationship:', {
        userId: args.userId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Re-throw application errors
      if (error instanceof ResonantError) {
        throw error
      }

      // Handle unexpected errors
      throw new ConvexError(
        'An unexpected error occurred while creating the relationship'
      )
    }
  },
})
```

### Client-Side Error Handling

```typescript
// React component error handling
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function CreateRelationshipForm({ userId }: { userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const createRelationship = useMutation(api.relationships.create);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await createRelationship({
        userId,
        name: formData.get("name") as string,
        type: formData.get("type") as string,
      });

      // Handle success
      console.log("Relationship created:", result.relationshipId);

    } catch (err) {
      // Handle different error types
      if (err instanceof ConvexError) {
        const errorData = err.data as { message: string; code: string; details?: any };

        switch (errorData.code) {
          case "VALIDATION_ERROR":
            setError(`Validation error: ${errorData.message}`);
            break;
          case "ACCESS_DENIED":
            setError("You don't have permission to perform this action");
            break;
          case "QUOTA_EXCEEDED":
            setError("You've reached your relationship limit. Upgrade to add more.");
            break;
          default:
            setError(errorData.message);
        }
      } else {
        // Handle unexpected errors
        setError("An unexpected error occurred. Please try again.");
        console.error("Unexpected error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {/* Form fields */}
    </form>
  );
}
```

### Error Recovery Patterns

```typescript
// Retry mechanism for transient errors
export const createEntryWithRetry = mutation({
  args: { userId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const maxRetries = 3
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await ctx.db.insert('journalEntries', {
          ...args,
          createdAt: Date.now(),
        })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Only retry on write conflicts
        if (
          lastError.message.includes('Write conflict') &&
          attempt < maxRetries
        ) {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          )
          continue
        }

        throw lastError
      }
    }

    throw lastError || new Error('Max retries exceeded')
  },
})
```

### Partial Rollback Pattern

```typescript
export const processEntryWithPartialRollback = mutation({
  args: { entryId: v.id('journalEntries') },
  handler: async (ctx, { entryId }) => {
    try {
      // Attempt main operation
      await ctx.runMutation(internal.aiAnalysis.processEntry, { entryId })

      // If successful, update status
      await ctx.db.patch(entryId, {
        status: 'processed',
        processedAt: Date.now(),
      })
    } catch (error) {
      // Main operation failed, but log the failure
      // This write will commit even though the main operation rolled back
      await ctx.db.insert('processingFailures', {
        entryId,
        error: error instanceof Error ? error.message : String(error),
        failedAt: Date.now(),
      })

      // Update entry status to indicate failure
      await ctx.db.patch(entryId, {
        status: 'failed',
        lastError: error instanceof Error ? error.message : String(error),
      })
    }
  },
})
```

## Client-Side Integration Patterns

### React Hook Integration

```typescript
// Custom hook for mutation with error handling
export function useCreateRelationship() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const createRelationshipMutation = useMutation(api.relationships.create)

  const createRelationship = useCallback(
    async (data: { userId: string; name: string; type: string }) => {
      setError(null)
      setIsLoading(true)

      try {
        const result = await createRelationshipMutation(data)
        setIsLoading(false)
        return { success: true, data: result }
      } catch (err) {
        const errorMessage = handleConvexError(err)
        setError(errorMessage)
        setIsLoading(false)
        return { success: false, error: errorMessage }
      }
    },
    [createRelationshipMutation]
  )

  return {
    createRelationship,
    error,
    isLoading,
    clearError: () => setError(null),
  }
}

// Error handling utility
function handleConvexError(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as { message: string; code: string }

    // Return user-friendly messages for known error codes
    switch (data.code) {
      case 'QUOTA_EXCEEDED':
        return "You've reached your limit. Please upgrade your plan."
      case 'VALIDATION_ERROR':
        return data.message
      case 'ACCESS_DENIED':
        return "You don't have permission to perform this action."
      default:
        return data.message
    }
  }

  return 'An unexpected error occurred. Please try again.'
}
```

### Promise-Based Error Handling

```typescript
// Alternative promise-based approach
export function useRelationshipMutations() {
  const createRelationship = useMutation(api.relationships.create)
  const updateRelationship = useMutation(api.relationships.update)
  const deleteRelationship = useMutation(api.relationships.delete)

  return {
    createRelationship: (data: any) =>
      createRelationship(data)
        .then(result => ({ success: true, data: result }))
        .catch(error => ({ success: false, error: handleConvexError(error) })),

    updateRelationship: (data: any) =>
      updateRelationship(data)
        .then(result => ({ success: true, data: result }))
        .catch(error => ({ success: false, error: handleConvexError(error) })),

    deleteRelationship: (relationshipId: string) =>
      deleteRelationship({ relationshipId })
        .then(() => ({ success: true }))
        .catch(error => ({ success: false, error: handleConvexError(error) })),
  }
}
```

## Performance and Optimization

### Efficient Query Patterns

```typescript
// ✅ Good: Use indexes for filtering
export const getRelationshipsByType = query({
  args: { userId: v.string(), type: v.string() },
  handler: async (ctx, { userId, type }) => {
    return await ctx.db
      .query('relationships')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', type))
      .collect()
  },
})

// ❌ Bad: Full table scan with filter
export const getRelationshipsByTypeBad = query({
  args: { userId: v.string(), type: v.string() },
  handler: async (ctx, { userId, type }) => {
    const allRelationships = await ctx.db.query('relationships').collect()
    return allRelationships.filter(r => r.userId === userId && r.type === type)
  },
})
```

### Batching Operations

```typescript
// Batch multiple related operations
export const createUserWithRelationships = mutation({
  args: {
    userData: v.object({
      clerkId: v.string(),
      name: v.string(),
    }),
    relationships: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
      })
    ),
  },
  handler: async (ctx, { userData, relationships }) => {
    // Create user first
    const userId = await ctx.db.insert('users', {
      ...userData,
      tier: 'free',
      createdAt: Date.now(),
    })

    // Batch create relationships
    const relationshipIds = await Promise.all(
      relationships.map(rel =>
        ctx.db.insert('relationships', {
          userId: userData.clerkId,
          name: rel.name,
          type: rel.type,
          isActive: true,
          createdAt: Date.now(),
        })
      )
    )

    return { userId, relationshipIds }
  },
})
```

### Caching Strategies

```typescript
// Cache expensive computations
export const getUserDashboardData = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Check for cached result first
    const cached = await ctx.db
      .query('dashboardCache')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.gt(q.field('expiresAt'), Date.now()))
      .unique()

    if (cached) {
      return cached.data
    }

    // Compute fresh data
    const [user, relationships, entries, healthScores] = await Promise.all([
      ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
        .unique(),
      ctx.db
        .query('relationships')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('journalEntries')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(10),
      ctx.db
        .query('healthScores')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect(),
    ])

    const dashboardData = {
      user,
      relationshipCount: relationships.length,
      recentEntries: entries,
      averageHealthScore:
        healthScores.reduce((sum, hs) => sum + hs.score, 0) /
        healthScores.length,
    }

    // Cache for 5 minutes
    await ctx.db.insert('dashboardCache', {
      userId,
      data: dashboardData,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    })

    return dashboardData
  },
})
```

## Security Best Practices

### Authentication Verification

```typescript
// Always verify authentication in mutations
export const secureUpdateProfile = mutation({
  args: { userId: v.string(), updates: v.object({ name: v.string() }) },
  handler: async (ctx, { userId, updates }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Authentication required')
    }

    // Verify user owns the resource
    if (identity.subject !== userId) {
      throw new ConvexError(
        "Access denied: Cannot modify another user's profile"
      )
    }

    // Proceed with update
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
      .unique()

    if (!user) {
      throw new ConvexError('User not found')
    }

    await ctx.db.patch(user._id, {
      ...updates,
      updatedAt: Date.now(),
    })

    return user._id
  },
})
```

### Input Sanitization

```typescript
// Sanitize user input
function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export const createJournalEntrySafe = mutation({
  args: {
    userId: v.string(),
    content: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Sanitize inputs
    const sanitizedContent = sanitizeString(args.content)
    const sanitizedTitle = args.title ? sanitizeString(args.title) : undefined

    // Validate content length
    if (sanitizedContent.length < 10) {
      throw new ValidationError('Content must be at least 10 characters long')
    }

    if (sanitizedContent.length > 10000) {
      throw new ValidationError('Content must be less than 10,000 characters')
    }

    return await ctx.db.insert('journalEntries', {
      userId: args.userId,
      content: sanitizedContent,
      title: sanitizedTitle,
      createdAt: Date.now(),
    })
  },
})
```

### Rate Limiting

```typescript
// Simple rate limiting pattern
export const createEntryWithRateLimit = mutation({
  args: { userId: v.string(), content: v.string() },
  handler: async (ctx, { userId, content }) => {
    // Check recent entries for rate limiting
    const recentEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', q => q.eq('userId', userId))
      .filter(q => q.gt(q.field('createdAt'), Date.now() - 60 * 1000)) // Last minute
      .collect()

    if (recentEntries.length >= 5) {
      throw new ConvexError(
        'Rate limit exceeded. Please wait before creating another entry.'
      )
    }

    return await ctx.db.insert('journalEntries', {
      userId,
      content,
      createdAt: Date.now(),
    })
  },
})
```

## Real-time Features

### Live Query Updates

```typescript
// Client-side real-time subscription
export function useRealTimeHealthScores(userId: string) {
  const healthScores = useQuery(api.healthScores.getByUser, { userId })
  const [previousScores, setPreviousScores] = useState<any[]>([])

  useEffect(() => {
    if (healthScores && healthScores !== previousScores) {
      // Detect changes
      const changes = detectHealthScoreChanges(previousScores, healthScores)

      if (changes.length > 0) {
        // Notify user of significant changes
        changes.forEach(change => {
          if (Math.abs(change.scoreDiff) > 10) {
            showNotification(
              `${change.relationshipName} health score ${change.scoreDiff > 0 ? 'improved' : 'declined'} by ${Math.abs(change.scoreDiff)} points`
            )
          }
        })
      }

      setPreviousScores(healthScores)
    }
  }, [healthScores, previousScores])

  return healthScores
}
```

### Push Notifications

```typescript
// Trigger notification on significant events
export const createInsightWithNotification = mutation({
  args: {
    userId: v.string(),
    relationshipId: v.id('relationships'),
    type: v.string(),
    priority: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const insightId = await ctx.db.insert('insights', {
      ...args,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    // Schedule notification for high-priority insights
    if (args.priority === 'urgent' || args.priority === 'high') {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.sendInsightNotification,
        {
          userId: args.userId,
          insightId,
          title: args.title,
        }
      )
    }

    return insightId
  },
})
```

## Testing API Functions

### Unit Testing Functions

```typescript
// Mock Convex context for testing
function createMockContext(): any {
  const mockDb = {
    query: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  }

  return {
    db: mockDb,
    auth: {
      getUserIdentity: jest.fn(),
    },
    scheduler: {
      runAfter: jest.fn(),
    },
  }
}

// Test example
describe('createRelationship', () => {
  it('should create a relationship successfully', async () => {
    const mockCtx = createMockContext()
    const mockUser = { _id: 'user1', tier: 'premium' }

    mockCtx.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        unique: jest.fn().mockResolvedValue(mockUser),
      }),
    })

    mockCtx.db.insert.mockResolvedValue('rel1')

    const result = await createRelationship.handler(mockCtx, {
      userId: 'user1',
      name: 'Test Relationship',
      type: 'friend',
    })

    expect(result).toBe('rel1')
    expect(mockCtx.db.insert).toHaveBeenCalledWith('relationships', {
      userId: 'user1',
      name: 'Test Relationship',
      type: 'friend',
      isActive: true,
      createdAt: expect.any(Number),
    })
  })

  it('should throw error for free tier user at limit', async () => {
    const mockCtx = createMockContext()
    const mockUser = { _id: 'user1', tier: 'free' }

    mockCtx.db.query.mockReturnValue({
      withIndex: jest.fn().mockReturnValue({
        unique: jest.fn().mockResolvedValue(mockUser),
        collect: jest.fn().mockResolvedValue([{}, {}, {}]), // 3 existing relationships
      }),
    })

    await expect(
      createRelationship.handler(mockCtx, {
        userId: 'user1',
        name: 'Test Relationship',
        type: 'friend',
      })
    ).rejects.toThrow('Free tier limited to 3 relationships')
  })
})
```

### Integration Testing

```typescript
// Integration test with real Convex client
import { ConvexTestingHelper } from 'convex/testing'

describe('Relationship API Integration', () => {
  let convex: ConvexTestingHelper

  beforeEach(async () => {
    convex = new ConvexTestingHelper()
    await convex.run(async ctx => {
      // Set up test data
      await ctx.db.insert('users', {
        clerkId: 'test-user',
        name: 'Test User',
        tier: 'free',
        createdAt: Date.now(),
      })
    })
  })

  it('should handle relationship creation flow', async () => {
    const relationshipId = await convex.mutation(api.relationships.create, {
      userId: 'test-user',
      name: 'Test Friend',
      type: 'friend',
    })

    expect(relationshipId).toBeDefined()

    const relationships = await convex.query(api.relationships.getByUser, {
      userId: 'test-user',
    })

    expect(relationships).toHaveLength(1)
    expect(relationships[0].name).toBe('Test Friend')
  })
})
```

## Troubleshooting Guide

### Common Error Patterns

#### Write Conflicts

```typescript
// Problem: Multiple clients updating the same document
// Solution: Implement retry logic or optimistic locking

export const updateCounterSafely = mutation({
  args: { counterId: v.id('counters') },
  handler: async (ctx, { counterId }) => {
    const maxRetries = 3

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const counter = await ctx.db.get(counterId)
        if (!counter) throw new ConvexError('Counter not found')

        await ctx.db.patch(counterId, {
          value: counter.value + 1,
          version: counter.version + 1, // Optimistic locking
        })

        return counter.value + 1
      } catch (error) {
        if (error.message.includes('Write conflict') && attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.random() * Math.pow(2, attempt) * 100)
          )
          continue
        }
        throw error
      }
    }
  },
})
```

#### Authentication Issues

```typescript
// Problem: User not authenticated or identity mismatch
// Solution: Proper authentication checks

async function ensureAuthenticated(
  ctx: any,
  expectedUserId?: string
): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError('Authentication required')
  }

  if (expectedUserId && identity.subject !== expectedUserId) {
    throw new ConvexError('Access denied: User ID mismatch')
  }

  return identity
}
```

#### Performance Issues

```typescript
// Problem: Slow queries due to missing indexes
// Solution: Add appropriate indexes and optimize queries

// ❌ Slow: Full table scan
const getOldEntries = query({
  handler: async ctx => {
    const allEntries = await ctx.db.query('journalEntries').collect()
    return allEntries.filter(
      entry => entry.createdAt < Date.now() - 30 * 24 * 60 * 60 * 1000
    )
  },
})

// ✅ Fast: Use index with proper filtering
const getOldEntriesOptimized = query({
  handler: async ctx => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    return await ctx.db
      .query('journalEntries')
      .withIndex('by_created_at', q => q.lt('createdAt', thirtyDaysAgo))
      .collect()
  },
})
```

### Debugging Tools

```typescript
// Add comprehensive logging for debugging
export const debugMutation = mutation({
  args: { userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    try {
      console.log('Mutation started:', {
        userId: args.userId,
        timestamp: new Date().toISOString(),
        args: JSON.stringify(args, null, 2),
      })

      // Your mutation logic here
      const result = await ctx.db.insert('debugTable', args.data)

      console.log('Mutation completed:', {
        userId: args.userId,
        result,
        duration: Date.now() - startTime,
      })

      return result
    } catch (error) {
      console.error('Mutation failed:', {
        userId: args.userId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      })

      throw error
    }
  },
})
```

### Monitoring and Observability

```typescript
// Create monitoring helpers
export const logUserAction = internalMutation({
  args: {
    userId: v.string(),
    action: v.string(),
    metadata: v.optional(v.any()),
    success: v.boolean(),
    duration: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('userActionLogs', {
      ...args,
      timestamp: Date.now(),
    })
  },
})

// Use in mutations for monitoring
export const monitoredCreateEntry = mutation({
  args: { userId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    try {
      const result = await ctx.db.insert('journalEntries', {
        ...args,
        createdAt: Date.now(),
      })

      // Log successful action
      await ctx.runMutation(internal.monitoring.logUserAction, {
        userId: args.userId,
        action: 'create_entry',
        metadata: { entryId: result },
        success: true,
        duration: Date.now() - startTime,
      })

      return result
    } catch (error) {
      // Log failed action
      await ctx.runMutation(internal.monitoring.logUserAction, {
        userId: args.userId,
        action: 'create_entry',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  },
})
```

This comprehensive API documentation provides the foundation for building robust, error-resistant applications with Convex and demonstrates the patterns used throughout the Resonant application.
