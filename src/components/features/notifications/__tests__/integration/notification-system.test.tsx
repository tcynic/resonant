import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import type { UserResource } from '@clerk/types'
import { useQuery, useMutation } from 'convex/react'
import { NotificationProvider } from '../../../../../components/providers/notification-provider'
import { ReminderSettings } from '../../reminder-settings'
import { useBrowserNotifications } from '../../../../../hooks/notifications/use-browser-notifications'

// Mock all dependencies
jest.mock('@clerk/nextjs')
jest.mock('convex/react')
jest.mock('../../../../hooks/notifications/use-browser-notifications')
jest.mock('../../../hooks/use-is-client', () => ({
  useIsClient: () => true,
}))

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
const mockUseBrowserNotifications =
  useBrowserNotifications as jest.MockedFunction<typeof useBrowserNotifications>

const mockUser = {
  id: 'clerk_user_123',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  getFullName: () => 'John Doe',
} as unknown as UserResource

const mockUserData = {
  _id: 'user_123',
  name: 'John Doe',
  email: 'john@example.com',
  clerkId: 'clerk_user_123',
  preferences: {
    reminderSettings: {
      enabled: false,
      frequency: 'daily' as const,
      preferredTime: '09:00',
      timezone: 'UTC',
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

const mockBrowserNotifications = {
  state: {
    permission: 'default' as NotificationPermission,
    isSupported: true,
    isEnabled: false,
  },
  requestPermission: jest.fn(),
  showNotification: jest.fn(),
  clearNotifications: jest.fn(),
  registerServiceWorker: jest.fn(),
  handleNotificationClick: jest.fn(),
}

const mockUpdateReminderSettings = Object.assign(jest.fn(), {
  withOptimisticUpdate: jest.fn(),
})

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>
}

describe('Notification System Integration', () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })
    mockUseQuery
      .mockReturnValueOnce(mockUserData) // getUserByClerkId
      .mockReturnValueOnce({
        // getUserReminderAnalytics
        totalReminders: 0,
        clickedReminders: 0,
        clickThroughRate: 0,
        engagementScore: 50,
        deliveredReminders: 0,
        dismissedReminders: 0,
      })
    mockUseMutation.mockReturnValue(mockUpdateReminderSettings)
    mockUseBrowserNotifications.mockReturnValue(mockBrowserNotifications)

    // Mock window.Notification
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: jest.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('integrates provider with reminder settings component', () => {
    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    expect(screen.getByText('Smart Reminders')).toBeInTheDocument()
    expect(screen.getByText('Browser Notifications')).toBeInTheDocument()

    // Should show reminders as disabled initially
    const masterToggle = screen.getByRole('checkbox', {
      name: /enable smart reminders/i,
    })
    expect(masterToggle).not.toBeChecked()
  })

  it('handles enabling reminders flow end-to-end', async () => {
    const user = userEvent.setup()

    mockUpdateReminderSettings.mockResolvedValueOnce(undefined)
    mockBrowserNotifications.requestPermission.mockResolvedValueOnce('granted')

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Enable browser notifications first
    const enableNotificationsButton = screen.getByRole('button', {
      name: /enable notifications/i,
    })
    await user.click(enableNotificationsButton)

    // Enable reminders
    const masterToggle = screen.getByRole('checkbox', {
      name: /enable smart reminders/i,
    })
    await user.click(masterToggle)

    // Configure settings
    const relationshipFocusToggle = screen.getByRole('checkbox', {
      name: /relationship focus/i,
    })
    await user.click(relationshipFocusToggle)

    // Change timing
    const timeInput = screen.getByDisplayValue('09:00')
    await user.clear(timeInput)
    await user.type(timeInput, '10:30')

    // Save settings
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateReminderSettings).toHaveBeenCalledWith({
        userId: 'user_123',
        settings: expect.objectContaining({
          enabled: true,
          preferredTime: '10:30',
          reminderTypes: expect.objectContaining({
            relationshipFocus: true,
          }),
        }),
      })
    })

    expect(
      screen.getByText(/reminder settings saved successfully/i)
    ).toBeInTheDocument()
  })

  it('shows appropriate warnings when browser notifications are blocked', () => {
    mockBrowserNotifications.state.permission = 'denied'

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    expect(
      screen.getByText(/browser notifications are blocked/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/you won't receive reminders outside the app/i)
    ).toBeInTheDocument()
  })

  it('provides contextual help based on user engagement score', () => {
    // Mock low engagement user
    mockUseQuery.mockReturnValueOnce(mockUserData).mockReturnValueOnce({
      totalReminders: 20,
      clickedReminders: 3,
      clickThroughRate: 15,
      engagementScore: 25, // Low engagement
      deliveredReminders: 18,
      dismissedReminders: 10,
    })

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Should see low engagement specific guidance
    expect(
      screen.getByText(/recommended - start with gentle reminders/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/not recommended yet/i)).toBeInTheDocument()
  })

  it('adapts UI for high engagement users', () => {
    // Mock high engagement user
    mockUseQuery.mockReturnValueOnce(mockUserData).mockReturnValueOnce({
      totalReminders: 50,
      clickedReminders: 35,
      clickThroughRate: 70,
      engagementScore: 85, // High engagement
      deliveredReminders: 48,
      dismissedReminders: 5,
    })

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Should see high engagement specific guidance
    expect(screen.getByText(/highly recommended/i)).toBeInTheDocument()
    expect(
      screen.getByText(/you can handle important alerts/i)
    ).toBeInTheDocument()
  })

  it('handles service worker registration during initialization', async () => {
    mockBrowserNotifications.registerServiceWorker.mockResolvedValueOnce(
      undefined
    )

    const enabledUserData = {
      ...mockUserData,
      preferences: {
        ...mockUserData.preferences,
        reminderSettings: {
          ...mockUserData.preferences.reminderSettings,
          enabled: true,
        },
      },
    }

    mockUseQuery.mockReturnValueOnce(enabledUserData).mockReturnValueOnce({
      totalReminders: 0,
      clickedReminders: 0,
      clickThroughRate: 0,
      engagementScore: 50,
      deliveredReminders: 0,
      dismissedReminders: 0,
    })

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockBrowserNotifications.registerServiceWorker).toHaveBeenCalled()
    })
  })

  it('displays analytics when available', () => {
    mockUseQuery.mockReturnValueOnce(mockUserData).mockReturnValueOnce({
      totalReminders: 25,
      clickedReminders: 12,
      clickThroughRate: 48,
      engagementScore: 68,
      deliveredReminders: 23,
      dismissedReminders: 8,
    })

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    expect(screen.getByText('Your Reminder Stats')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument() // Total reminders
    expect(screen.getByText('12')).toBeInTheDocument() // Clicked
    expect(screen.getByText('48.0%')).toBeInTheDocument() // Click rate
    expect(screen.getByText('68')).toBeInTheDocument() // Engagement score
  })

  it('handles timezone detection and updates', async () => {
    // Mock Intl API
    Object.defineProperty(global, 'Intl', {
      value: {
        DateTimeFormat: jest.fn(() => ({
          resolvedOptions: jest.fn(() => ({
            timeZone: 'America/Los_Angeles',
          })),
        })),
      },
      writable: true,
    })

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Should show option to use detected timezone
    expect(screen.getByText(/use detected timezone/i)).toBeInTheDocument()
  })

  it('prevents saving invalid configurations', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Try to save without making any changes
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    expect(saveButton).toHaveClass('cursor-not-allowed')

    // Button should be disabled
    await user.click(saveButton)
    expect(mockUpdateReminderSettings).not.toHaveBeenCalled()
  })

  it('provides immediate feedback for user actions', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Make a change
    const masterToggle = screen.getByRole('checkbox', {
      name: /enable smart reminders/i,
    })
    await user.click(masterToggle)

    // Save button should become enabled
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    expect(saveButton).not.toHaveClass('cursor-not-allowed')

    // Reset should also become enabled
    const resetButton = screen.getByRole('button', { name: /reset changes/i })
    expect(resetButton).not.toBeDisabled()
  })

  it('resets changes correctly', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Make changes
    const masterToggle = screen.getByRole('checkbox', {
      name: /enable smart reminders/i,
    })
    await user.click(masterToggle)
    expect(masterToggle).toBeChecked()

    // Reset changes
    const resetButton = screen.getByRole('button', { name: /reset changes/i })
    await user.click(resetButton)

    // Should return to original state
    expect(masterToggle).not.toBeChecked()

    // Save button should be disabled again
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    expect(saveButton).toHaveClass('cursor-not-allowed')
  })

  it('maintains state consistency across re-renders', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // Make a change
    const masterToggle = screen.getByRole('checkbox', {
      name: /enable smart reminders/i,
    })
    await user.click(masterToggle)

    // Force re-render
    rerender(
      <TestWrapper>
        <ReminderSettings />
      </TestWrapper>
    )

    // State should be preserved
    expect(
      screen.getByRole('checkbox', { name: /enable smart reminders/i })
    ).toBeChecked()
  })
})
