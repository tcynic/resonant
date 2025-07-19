// TODO: Re-enable when ready for production
// import { useUser } from '@clerk/nextjs'
// TODO: Re-enable these imports when Convex integration is complete
// import { useMutation, useQuery } from 'convex/react'
import {
  CreateRelationshipData,
  UpdateRelationshipData,
  Relationship,
} from '@/lib/types'
// TODO: Re-enable RelationshipType import when type filtering is implemented
// RelationshipType,

// TODO: Re-enable Convex API imports when generated files are available
// Import Convex API - these will be mocked in tests
// let api: {
//   users: { getCurrentUser: string }
//   relationships: {
//     createRelationship: string
//     updateRelationship: string
//     deleteRelationship: string
//     getRelationshipsByUser: string
//     getRelationshipsCount: string
//   }
// }

// try {
//   // eslint-disable-next-line @typescript-eslint/no-require-imports
//   const convexApi = require('../../convex/_generated/api')
//   api = convexApi.api
// } catch {
//   // Handle case where generated files don't exist (e.g., in tests)
//   api = {
//     users: { getCurrentUser: 'users:getCurrentUser' },
//     relationships: {
//       createRelationship: 'relationships:createRelationship',
//       updateRelationship: 'relationships:updateRelationship',
//       deleteRelationship: 'relationships:deleteRelationship',
//       getRelationshipsByUser: 'relationships:getRelationshipsByUser',
//       getRelationshipsCount: 'relationships:getRelationshipsCount',
//     },
//   }
// }

export function useRelationships() {
  // TODO: Re-enable user authentication when ready for production
  // const { user } = useUser()

  // Mock data for development until Convex is fully integrated
  const currentUser = { _id: 'mock_user_id' }
  const relationships: Relationship[] = []
  const relationshipsCount = 0

  // TODO: Replace with actual Convex queries when generated files are available
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )
  // const relationships = useQuery(
  //   api.relationships.getRelationshipsByUser,
  //   currentUser ? { userId: currentUser._id } : 'skip'
  // )
  // const relationshipsCount = useQuery(
  //   api.relationships.getRelationshipsCount,
  //   currentUser ? { userId: currentUser._id } : 'skip'
  // )

  return {
    relationships: relationships || [],
    relationshipsCount: relationshipsCount || 0,
    isLoading: currentUser === undefined,
    currentUser,
  }
}

export function useRelationshipsByType() {
  // TODO: Re-enable user authentication when ready for production
  // const { user } = useUser()

  // Mock data for development until Convex is fully integrated
  const currentUser = { _id: 'mock_user_id' }
  const relationships: Relationship[] = []

  // TODO: Replace with actual Convex queries when generated files are available
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )
  // const relationships = useQuery(
  //   api.relationships.getRelationshipsByUser,
  //   currentUser ? { userId: currentUser._id, type } : 'skip'
  // )

  return {
    relationships: relationships || [],
    isLoading: false, // Set to false for development
    currentUser,
  }
}

export function useRelationshipMutations() {
  // TODO: Re-enable user authentication when ready for production
  // const { user } = useUser()

  // Mock data for development until Convex is fully integrated
  const currentUser = { _id: 'mock_user_id' }

  // TODO: Replace with actual Convex mutations when generated files are available
  // const currentUser = useQuery(
  //   api.users.getCurrentUser,
  //   user ? { clerkId: user.id } : 'skip'
  // )
  // const createRelationshipMutation = useMutation(
  //   api.relationships.createRelationship
  // )
  // const updateRelationshipMutation = useMutation(
  //   api.relationships.updateRelationship
  // )
  // const deleteRelationshipMutation = useMutation(
  //   api.relationships.deleteRelationship
  // )

  const createRelationship = async (data: CreateRelationshipData) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Mock implementation for development
    console.log('Mock createRelationship called with:', data)
    return `mock_relationship_${Date.now()}`

    // TODO: Replace with actual Convex mutation call
    // return await createRelationshipMutation({
    //   userId: currentUser._id,
    //   name: data.name,
    //   type: data.type,
    //   photo: data.photo,
    // })
  }

  const updateRelationship = async (
    relationshipId: string,
    data: UpdateRelationshipData
  ) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Mock implementation for development
    console.log('Mock updateRelationship called with:', relationshipId, data)
    return true

    // TODO: Replace with actual Convex mutation call
    // return await updateRelationshipMutation({
    //   relationshipId,
    //   userId: currentUser._id,
    //   name: data.name,
    //   type: data.type,
    //   photo: data.photo,
    // })
  }

  const deleteRelationship = async (relationshipId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }

    // Mock implementation for development
    console.log('Mock deleteRelationship called with:', relationshipId)
    return true

    // TODO: Replace with actual Convex mutation call
    // return await deleteRelationshipMutation({
    //   relationshipId,
    //   userId: currentUser._id,
    // })
  }

  return {
    createRelationship,
    updateRelationship,
    deleteRelationship,
    isReady: !!currentUser,
  }
}
