import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

interface ConvexUser {
  _id: string
  clerkId: string
  name: string
  email: string
  createdAt: number
  preferences?: unknown
}

interface ConvexUserState {
  convexUser: ConvexUser | null | undefined
  isLoading: boolean
  isCreating: boolean
  error: string | null
}

/**
 * Custom hook that ensures Clerk users are properly synced with Convex
 * Provides a fallback mechanism if webhooks fail or for existing users
 */
export function useConvexUser(): ConvexUserState {
  const { user, isLoaded: clerkLoaded } = useUser()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Query for existing Convex user
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Mutation to create user if needed
  const createUser = useMutation(api.users.createUser)

  // Auto-create user if they don't exist in Convex
  useEffect(() => {
    async function syncUser() {
      if (!clerkLoaded || !user?.id || isCreating) {
        return
      }

      // If user exists in Convex, we're good
      if (convexUser !== null) {
        setError(null)
        return
      }

      // If we're still loading, wait
      if (convexUser === undefined) {
        return
      }

      // User doesn't exist in Convex (convexUser === null), create them
      console.log('User not found in Convex, creating...', user.id)
      setIsCreating(true)
      setError(null)

      try {
        const userData = {
          clerkId: user.id,
          name:
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            'Unknown User',
          email:
            user.emailAddresses?.[0]?.emailAddress || `${user.id}@unknown.com`,
        }

        await createUser(userData)
        console.log('User created successfully in Convex:', userData.clerkId)
      } catch (err) {
        console.error('Failed to create user in Convex:', err)
        setError(err instanceof Error ? err.message : 'Failed to create user')
      } finally {
        setIsCreating(false)
      }
    }

    syncUser()
  }, [
    user?.id,
    user?.firstName,
    user?.lastName,
    user?.emailAddresses,
    clerkLoaded,
    convexUser,
    createUser,
    isCreating,
  ])

  return {
    convexUser,
    isLoading: !clerkLoaded || convexUser === undefined,
    isCreating,
    error,
  }
}

/**
 * Hook to get the Convex user ID from Clerk user
 * Returns null if user is not authenticated or doesn't exist in Convex
 */
export function useConvexUserId(): Id<'users'> | null {
  const { convexUser, isLoading } = useConvexUser()

  if (isLoading || !convexUser) {
    return null
  }

  return convexUser._id
}
