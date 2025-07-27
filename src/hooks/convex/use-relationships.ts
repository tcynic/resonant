/**
 * React hooks for relationship-related Convex operations
 * Provides type-safe access to relationship functions with error handling
 */

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Relationship,
  CreateRelationshipArgs,
  UpdateRelationshipArgs,
  GetRelationshipsByUserArgs,
} from '@/lib/types'
import { Id } from '../../../convex/_generated/dataModel'
import { useCallback } from 'react'

// ============================================================================
// RELATIONSHIP QUERIES
// ============================================================================

/**
 * Get all relationships for a user
 */
export const useRelationshipsByUser = (args?: GetRelationshipsByUserArgs) => {
  const relationships = useQuery(
    api.relationships.getRelationshipsByUser,
    args ? { ...args, userId: args.userId as Id<'users'> } : 'skip'
  )

  return {
    relationships: relationships || [],
    isLoading: relationships === undefined,
    count: relationships?.length || 0,
    isEmpty: relationships?.length === 0,

    // Filter helpers
    byType: useCallback(
      (type: Relationship['type']) => {
        return relationships?.filter(r => r.type === type) || []
      },
      [relationships]
    ),

    // Active relationships only
    active: relationships?.filter(r => r.isActive) || [],
  }
}

/**
 * Get a specific relationship by ID
 */
export const useRelationshipById = (
  relationshipId?: string,
  userId?: string
) => {
  const relationship = useQuery(
    api.relationships.getRelationshipById,
    relationshipId && userId
      ? {
          relationshipId: relationshipId as Id<'relationships'>,
          userId: userId as Id<'users'>,
        }
      : 'skip'
  )

  return {
    relationship,
    isLoading: relationship === undefined,
    exists: !!relationship,
    isActive: relationship?.isActive || false,
  }
}

/**
 * Get relationship count for a user
 */
export const useRelationshipsCount = (userId?: string) => {
  const count = useQuery(
    api.relationships.getRelationshipsCount,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  )

  return {
    count: count || 0,
    isLoading: count === undefined,
    isAtFreeLimit: count !== undefined && count >= 3,
  }
}

// ============================================================================
// RELATIONSHIP MUTATIONS
// ============================================================================

/**
 * Create a new relationship
 */
export const useCreateRelationship = () => {
  const createRelationship = useMutation(api.relationships.createRelationship)

  return {
    createRelationship: useCallback(
      async (args: CreateRelationshipArgs) => {
        try {
          const relationshipId = await createRelationship({
            ...args,
            userId: args.userId as Id<'users'>,
          })
          return { success: true, relationshipId }
        } catch (error) {
          console.error('Failed to create relationship:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create relationship',
          }
        }
      },
      [createRelationship]
    ),
  }
}

/**
 * Update an existing relationship
 */
export const useUpdateRelationship = () => {
  const updateRelationship = useMutation(api.relationships.updateRelationship)

  return {
    updateRelationship: useCallback(
      async (args: UpdateRelationshipArgs) => {
        try {
          await updateRelationship({
            ...args,
            relationshipId: args.relationshipId as Id<'relationships'>,
            userId: args.userId as Id<'users'>,
          })
          return { success: true }
        } catch (error) {
          console.error('Failed to update relationship:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update relationship',
          }
        }
      },
      [updateRelationship]
    ),
  }
}

/**
 * Delete a relationship
 */
export const useDeleteRelationship = () => {
  const deleteRelationship = useMutation(api.relationships.deleteRelationship)

  return {
    deleteRelationship: useCallback(
      async (relationshipId: string, userId: string) => {
        try {
          await deleteRelationship({
            relationshipId: relationshipId as Id<'relationships'>,
            userId: userId as Id<'users'>,
          })
          return { success: true }
        } catch (error) {
          console.error('Failed to delete relationship:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to delete relationship',
          }
        }
      },
      [deleteRelationship]
    ),
  }
}

// ============================================================================
// COMBINED RELATIONSHIPS HOOK
// ============================================================================

/**
 * Comprehensive relationships hook with all relationship functionality
 */
export const useRelationships = (userId?: string) => {
  const { relationships, isLoading, count, isEmpty, byType, active } =
    useRelationshipsByUser(userId ? { userId } : undefined)
  const { count: totalCount, isAtFreeLimit } = useRelationshipsCount(userId)
  const { createRelationship } = useCreateRelationship()
  const { updateRelationship } = useUpdateRelationship()
  const { deleteRelationship } = useDeleteRelationship()

  // Relationship type counts
  const typeCounts = {
    partner: byType('partner').length,
    family: byType('family').length,
    friend: byType('friend').length,
    colleague: byType('colleague').length,
    other: byType('other').length,
  }

  return {
    // Data
    relationships,
    active,
    count,
    totalCount,
    isEmpty,
    isLoading,
    isAtFreeLimit,
    typeCounts,

    // Helpers
    byType,
    getRelationshipName: useCallback(
      (id: string) => {
        return relationships.find(r => r._id === id)?.name || 'Unknown'
      },
      [relationships]
    ),

    getRelationshipInitials: useCallback(
      (id: string) => {
        return relationships.find(r => r._id === id)?.initials || '?'
      },
      [relationships]
    ),

    // Actions
    createRelationship,
    updateRelationship,
    deleteRelationship,

    // Computed properties
    hasPartner: typeCounts.partner > 0,
    relationshipOptions: relationships.map(r => ({
      value: r._id,
      label: r.name,
      type: r.type,
      initials: r.initials,
    })),
  }
}
