import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  CreateRelationshipData,
  UpdateRelationshipData,
  RelationshipType,
} from '@/lib/types'
import { Id } from '../../convex/_generated/dataModel'
import { useConvexUser } from './use-convex-user'

export function useRelationships() {
  const { convexUser } = useConvexUser()

  const relationships = useQuery(
    api.relationships.getRelationshipsByUser,
    convexUser?._id ? { userId: convexUser._id as Id<'users'> } : 'skip'
  )

  const relationshipsCount = useQuery(
    api.relationships.getRelationshipsCount,
    convexUser?._id ? { userId: convexUser._id as Id<'users'> } : 'skip'
  )

  return {
    relationships: relationships || [],
    relationshipsCount: relationshipsCount || 0,
    isLoading: !convexUser || relationships === undefined,
    currentUser: convexUser,
  }
}

export function useRelationshipsByType(type?: RelationshipType) {
  const { convexUser } = useConvexUser()

  const relationships = useQuery(
    api.relationships.getRelationshipsByUser,
    convexUser?._id
      ? {
          userId: convexUser._id as Id<'users'>,
          type: type,
        }
      : 'skip'
  )

  return {
    relationships: relationships || [],
    isLoading: !convexUser || relationships === undefined,
    currentUser: convexUser,
  }
}

export function useRelationshipMutations() {
  const { convexUser } = useConvexUser()

  const createRelationshipMutation = useMutation(
    api.relationships.createRelationship
  )
  const updateRelationshipMutation = useMutation(
    api.relationships.updateRelationship
  )
  const deleteRelationshipMutation = useMutation(
    api.relationships.deleteRelationship
  )

  const createRelationship = async (data: CreateRelationshipData) => {
    if (!convexUser?._id) {
      throw new Error('User not authenticated')
    }

    return await createRelationshipMutation({
      userId: convexUser._id as Id<'users'>,
      name: data.name,
      type: data.type,
      photo: data.photo,
    })
  }

  const updateRelationship = async (
    relationshipId: string,
    data: UpdateRelationshipData
  ) => {
    if (!convexUser?._id) {
      throw new Error('User not authenticated')
    }

    return await updateRelationshipMutation({
      relationshipId: relationshipId as Id<'relationships'>,
      userId: convexUser._id as Id<'users'>,
      name: data.name,
      type: data.type,
      photo: data.photo,
    })
  }

  const deleteRelationship = async (relationshipId: string) => {
    if (!convexUser?._id) {
      throw new Error('User not authenticated')
    }

    return await deleteRelationshipMutation({
      relationshipId: relationshipId as Id<'relationships'>,
      userId: convexUser._id as Id<'users'>,
    })
  }

  return {
    createRelationship,
    updateRelationship,
    deleteRelationship,
    isReady: !!convexUser?._id,
  }
}
