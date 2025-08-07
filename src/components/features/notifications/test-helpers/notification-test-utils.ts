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
  // Mock implementation - these will be overridden in test files
  const mockUseUser = jest.fn() as jest.MockedFunction<() => unknown>
  const mockUseQuery = jest.fn() as jest.MockedFunction<
    (queryRef: unknown, args?: unknown) => unknown
  >
  const mockUseMutation = jest.fn() as jest.MockedFunction<() => unknown>
  const mockUseBrowserNotifications = jest.fn() as jest.MockedFunction<
    () => unknown
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
  mockUseQuery.mockImplementation((queryRef: unknown, args: unknown) => {
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
  ;(global as unknown as { Notification: unknown }).Notification = {
    permission: 'granted',
    requestPermission: jest.fn(),
  }

  return {
    mockUseUser,
    mockUseQuery,
    mockUseMutation,
    mockUseBrowserNotifications,
    mockUpdateReminderSettings,
  }
}

export function createCustomUserData(overrides: Record<string, unknown> = {}) {
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

export function createCustomAnalytics(overrides: Record<string, unknown> = {}) {
  return {
    ...mockReminderAnalytics,
    ...overrides,
  }
}
