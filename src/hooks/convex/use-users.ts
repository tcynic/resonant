/**
 * React hooks for user-related Convex operations
 * Provides type-safe access to user functions with error handling
 */

import { useQuery, useMutation } from 'convex/react'
import { useAuth } from '@clerk/nextjs'
import { api } from '../../../convex/_generated/api'
import {
  CreateUserArgs,
  UpdateUserPreferencesArgs,
  CompleteOnboardingArgs,
  UserFeatureFlags,
} from '@/lib/types'
import { Id } from '../../../convex/_generated/dataModel'
import { useCallback } from 'react'

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Get current authenticated user
 */
export const useCurrentUser = () => {
  const { userId: clerkId } = useAuth()

  const user = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : 'skip'
  )

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: !!clerkId && !!user,
    isPremium: user?.tier === 'premium',
    isOnboardingComplete: user?.onboardingCompleted || false,
  }
}

/**
 * Get user by Clerk ID (alternative to useCurrentUser)
 */
export const useUserByClerkId = (clerkId?: string) => {
  const user = useQuery(
    api.users.getUserByClerkId,
    clerkId ? { clerkId } : 'skip'
  )

  return {
    user,
    isLoading: user === undefined,
    exists: !!user,
  }
}

/**
 * Get user by internal ID
 */
export const useUserById = (userId?: string) => {
  const user = useQuery(api.users.getUserById, userId ? { userId: userId as Id<'users'> } : 'skip')

  return {
    user,
    isLoading: user === undefined,
    exists: !!user,
  }
}

/**
 * Get user's feature flags
 */
export const useUserFeatureFlags = (userId?: string) => {
  const flags = useQuery(
    api.users.getUserFeatureFlags,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  )

  return {
    flags,
    isLoading: flags === undefined,
    hasFeature: useCallback(
      (feature: keyof UserFeatureFlags) => {
        return flags?.flags?.[feature] || false
      },
      [flags]
    ),
  }
}

// ============================================================================
// USER MUTATIONS
// ============================================================================

/**
 * Create a new user (typically called during sign-up)
 */
export const useCreateUser = () => {
  const createUser = useMutation(api.users.createUser)

  return {
    createUser: useCallback(
      async (args: CreateUserArgs) => {
        try {
          const userId = await createUser(args)
          return { success: true, userId }
        } catch (error) {
          console.error('Failed to create user:', error)
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Failed to create user',
          }
        }
      },
      [createUser]
    ),
  }
}

/**
 * Update user preferences
 */
export const useUpdateUserPreferences = () => {
  const updatePreferences = useMutation(api.users.updateUserPreferences)

  return {
    updatePreferences: useCallback(
      async (args: UpdateUserPreferencesArgs) => {
        try {
          await updatePreferences({
            ...args,
            userId: args.userId as Id<'users'>,
          })
          return { success: true }
        } catch (error) {
          console.error('Failed to update preferences:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update preferences',
          }
        }
      },
      [updatePreferences]
    ),
  }
}

/**
 * Update privacy settings
 */
export const useUpdatePrivacySettings = () => {
  const updatePrivacySettings = useMutation(api.users.updatePrivacySettings)

  return {
    updatePrivacySettings: useCallback(
      async (args: UpdateUserPreferencesArgs) => {
        try {
          await updatePrivacySettings({
            ...args,
            userId: args.userId as Id<'users'>,
          })
          return { success: true }
        } catch (error) {
          console.error('Failed to update privacy settings:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update privacy settings',
          }
        }
      },
      [updatePrivacySettings]
    ),
  }
}

/**
 * Complete onboarding process
 */
export const useCompleteOnboarding = () => {
  const completeOnboarding = useMutation(api.users.completeOnboarding)

  return {
    completeOnboarding: useCallback(
      async (args: CompleteOnboardingArgs) => {
        try {
          const result = await completeOnboarding({
            ...args,
            userId: args.userId as Id<'users'>,
          })
          return { success: true, data: result }
        } catch (error) {
          console.error('Failed to complete onboarding:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to complete onboarding',
          }
        }
      },
      [completeOnboarding]
    ),
  }
}

/**
 * Upgrade user to premium tier
 */
export const useUpgradeToPremium = () => {
  const upgradeToPremium = useMutation(api.users.upgradeToPremium)

  return {
    upgradeToPremium: useCallback(
      async (userId: string) => {
        try {
          const result = await upgradeToPremium({ userId: userId as Id<'users'> })
          return { success: true, data: result }
        } catch (error) {
          console.error('Failed to upgrade to premium:', error)
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to upgrade to premium',
          }
        }
      },
      [upgradeToPremium]
    ),
  }
}

// ============================================================================
// COMBINED USER HOOK
// ============================================================================

/**
 * Comprehensive user hook with all user-related functionality
 */
export const useUser = () => {
  const { user, isLoading, isAuthenticated, isPremium, isOnboardingComplete } =
    useCurrentUser()
  const { updatePreferences } = useUpdateUserPreferences()
  const { updatePrivacySettings } = useUpdatePrivacySettings()
  const { completeOnboarding } = useCompleteOnboarding()
  const { upgradeToPremium } = useUpgradeToPremium()
  const { flags, hasFeature } = useUserFeatureFlags(user?._id)

  return {
    // User data
    user,
    isLoading,
    isAuthenticated,
    isPremium,
    isOnboardingComplete,

    // Feature flags
    flags,
    hasFeature,

    // Actions
    updatePreferences,
    updatePrivacySettings,
    completeOnboarding,
    upgradeToPremium,

    // Computed properties
    canUseAI: user?.preferences?.aiAnalysisEnabled !== false,
    relationshipLimit: isPremium ? Infinity : 3,
    displayName: user?.name || 'User',
    initials:
      user?.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'U',
  }
}
