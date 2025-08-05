import { jest } from '@jest/globals'
import type { UserResource } from '@clerk/types'

export const mockUser = {
  id: 'clerk_user_123',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  getFullName: () => 'John Doe',
} as unknown as UserResource

export const mockUserData = {
  _id: 'user_123',
  name: 'John Doe',
  email: 'john@example.com',
  clerkId: 'clerk_user_123',
  preferences: {
    reminderSettings: {
      enabled: true,
      frequency: 'daily' as const,
      preferredTime: '09:00',
      timezone: 'America/New_York',
      doNotDisturbStart: '22:00',
      doNotDisturbEnd: '07:00',
      reminderTypes: {
        gentleNudge: true,
        relationshipFocus: false,
        healthScoreAlerts: false,
      },
    },
  },
}

export const mockReminderAnalytics = {
  totalReminders: 15,
  clickedReminders: 8,
  clickThroughRate: 53.3,
  engagementScore: 68,
  deliveredReminders: 14,
  dismissedReminders: 3,
}

export const mockBrowserNotifications = {
  state: {
    permission: 'granted' as NotificationPermission,
    isSupported: true,
    isEnabled: true,
  },
  requestPermission: jest.fn(),
  showNotification: jest.fn(),
  clearNotifications: jest.fn(),
  registerServiceWorker: jest.fn(),
  handleNotificationClick: jest.fn(),
}

export function setupNotificationMocks() {
  const { useUser } = require('@clerk/nextjs')
  const { useQuery, useMutation } = require('convex/react')
  const {
    useBrowserNotifications,
  } = require('@/hooks/notifications/use-browser-notifications')

  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
  const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
  const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
  const mockUseBrowserNotifications =
    useBrowserNotifications as jest.MockedFunction<
      typeof useBrowserNotifications
    >

  const mockUpdateReminderSettings = Object.assign(jest.fn(), {
    withOptimisticUpdate: jest.fn(),
  })

  // Clear any existing mocks
  jest.clearAllMocks()

  // Setup user authentication
  mockUseUser.mockReturnValue({
    user: mockUser,
    isLoaded: true,
    isSignedIn: true,
  })

  // Setup Convex queries with proper handling
  mockUseQuery.mockImplementation((queryRef, args) => {
    if (args === 'skip') return null
    const queryStr = String(queryRef)
    if (queryStr.includes('getUserByClerkId')) {
      return mockUserData
    }
    if (queryStr.includes('getUserReminderAnalytics')) {
      return mockReminderAnalytics
    }
    return null
  })

  // Setup mutations
  mockUseMutation.mockReturnValue(mockUpdateReminderSettings)

  // Setup browser notifications
  mockUseBrowserNotifications.mockReturnValue(mockBrowserNotifications)

  // Setup Notification API
  Object.defineProperty(window, 'Notification', {
    value: {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    },
    writable: true,
  })

  return {
    mockUseUser,
    mockUseQuery,
    mockUseMutation,
    mockUseBrowserNotifications,
    mockUpdateReminderSettings,
  }
}

export function createCustomUserData(overrides: any = {}) {
  return {
    ...mockUserData,
    preferences: {
      ...mockUserData.preferences,
      reminderSettings: {
        ...mockUserData.preferences.reminderSettings,
        ...overrides,
      },
    },
  }
}

export function createCustomAnalytics(overrides: any = {}) {
  return {
    ...mockReminderAnalytics,
    ...overrides,
  }
}
