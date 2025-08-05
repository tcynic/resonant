import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import type { UserResource } from '@clerk/types'
import { useQuery, useMutation } from 'convex/react'
import { ReminderSettings } from '../reminder-settings'
import {
  setupNotificationMocks,
  mockUserData,
  mockReminderAnalytics,
} from '../test-helpers/notification-test-utils'

// Mock dependencies
jest.mock('@clerk/nextjs')

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>

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
  createdAt: Date.now(),
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
        relationshipFocus: true,
        healthScoreAlerts: false,
      },
    },
  },
}

const mockReminderAnalytics = {
  totalReminders: 15,
  clickedReminders: 8,
  clickThroughRate: 53.3,
  engagementScore: 72,
  deliveredReminders: 12,
  dismissedReminders: 2,
}

describe('ReminderSettings', () => {
  const mockUpdateReminderSettings = Object.assign(jest.fn(), {
    withOptimisticUpdate: jest.fn(),
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup test-specific mock implementations
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })
    
    // Override the global useQuery mock to return specific data for this test
    mockUseQuery.mockImplementation((queryRef, args) => {
      if (args === 'skip') return null
      
      // Check if args has a clerkId (getUserByClerkId query)
      if (args && typeof args === 'object' && 'clerkId' in args) {
        return mockUserData
      }
      
      // Check if args has userId (analytics query)
      if (args && typeof args === 'object' && 'userId' in args) {
        return mockReminderAnalytics
      }
      return null
    })
    
    mockUseMutation.mockReturnValue(mockUpdateReminderSettings)
    
    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'granted',
        requestPermission: jest.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })
  })

  it('renders the reminder settings interface', () => {
    render(<ReminderSettings />)

    expect(screen.getByText('Smart Reminders')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Get personalized reminders to maintain consistent journaling and relationship reflection'
      )
    ).toBeInTheDocument()
    // The main toggle is the first checkbox (for enabling reminders)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeChecked()
  })

  it('displays analytics when available', () => {
    render(<ReminderSettings />)

    expect(screen.getByText('Your Reminder Stats')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument() // Total reminders
    expect(screen.getByText('8')).toBeInTheDocument() // Clicked
    expect(screen.getByText('53.3%')).toBeInTheDocument() // Click rate
    expect(screen.getByText('72')).toBeInTheDocument() // Engagement score
  })

  it('shows browser notification status correctly', () => {
    render(<ReminderSettings />)

    expect(screen.getByText('Browser Notifications')).toBeInTheDocument()
    expect(
      screen.getByText(/browser notifications are enabled/i)
    ).toBeInTheDocument()
  })

  it('allows toggling the master reminder switch', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    // The main toggle is the first checkbox (for enabling reminders)
    const checkboxes = screen.getAllByRole('checkbox')
    const masterToggle = checkboxes[0]
    expect(masterToggle).toBeChecked()

    await user.click(masterToggle)
    expect(masterToggle).not.toBeChecked()

    // Save button should become enabled
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    expect(saveButton).not.toHaveClass('cursor-not-allowed')
  })

  it('shows frequency options when reminders are enabled', () => {
    render(<ReminderSettings />)

    expect(screen.getByText('Timing & Frequency')).toBeInTheDocument()
    expect(screen.getByLabelText(/daily/i)).toBeChecked()
    expect(screen.getByLabelText(/every 2 days/i)).not.toBeChecked()
    expect(screen.getByLabelText(/weekly/i)).not.toBeChecked()
  })

  it('allows changing frequency selection', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    const weeklyOption = screen.getByLabelText(/weekly/i)
    await user.click(weeklyOption)

    expect(weeklyOption).toBeChecked()
    expect(screen.getByLabelText(/daily/i)).not.toBeChecked()
  })

  it('allows changing preferred time', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    const timeInput = screen.getByDisplayValue('09:00')
    await user.clear(timeInput)
    await user.type(timeInput, '14:30')

    expect(timeInput).toHaveValue('14:30')
  })

  it('allows changing timezone', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    const timezoneSelect = screen.getByDisplayValue('America/New_York')
    await user.selectOptions(timezoneSelect, 'Europe/London')

    expect(timezoneSelect).toHaveValue('Europe/London')
  })

  it('allows toggling reminder types', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    // Health score alerts should be the last checkbox (4th checkbox: master, gentle nudge, relationship focus, health alerts)
    const checkboxes = screen.getAllByRole('checkbox')
    const healthAlertsToggle = checkboxes[3]
    expect(healthAlertsToggle).not.toBeChecked()

    await user.click(healthAlertsToggle)
    expect(healthAlertsToggle).toBeChecked()
  })

  it('validates do not disturb time settings', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    const startTime = screen.getByDisplayValue('22:00')
    const endTime = screen.getByDisplayValue('07:00')

    expect(startTime).toBeInTheDocument()
    expect(endTime).toBeInTheDocument()

    await user.clear(startTime)
    await user.type(startTime, '23:00')

    expect(startTime).toHaveValue('23:00')
  })

  it('handles save operation correctly', async () => {
    const user = userEvent.setup()
    mockUpdateReminderSettings.mockResolvedValueOnce(undefined)

    render(<ReminderSettings />)

    // Make a change - toggle the main switch (first checkbox)
    const checkboxes = screen.getAllByRole('checkbox')
    const masterToggle = checkboxes[0]
    await user.click(masterToggle)

    // Save settings
    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateReminderSettings).toHaveBeenCalledWith({
        userId: 'user_123',
        settings: expect.objectContaining({
          enabled: false,
        }),
      })
    })
  })

  it('shows success message after saving', async () => {
    const user = userEvent.setup()
    mockUpdateReminderSettings.mockResolvedValueOnce(undefined)

    render(<ReminderSettings />)

    // Make a change and save - toggle the main switch (first checkbox)
    const checkboxes = screen.getAllByRole('checkbox')
    const masterToggle = checkboxes[0]
    await user.click(masterToggle)

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText(/reminder settings saved successfully/i)
      ).toBeInTheDocument()
    })
  })

  it('handles save errors gracefully', async () => {
    const user = userEvent.setup()
    mockUpdateReminderSettings.mockRejectedValueOnce(new Error('Save failed'))

    render(<ReminderSettings />)

    // Make a change and save - toggle the main switch (first checkbox)
    const checkboxes = screen.getAllByRole('checkbox')
    const masterToggle = checkboxes[0]
    await user.click(masterToggle)

    const saveButton = screen.getByRole('button', { name: /save settings/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to save settings/i)).toBeInTheDocument()
    })
  })

  it('allows resetting changes', async () => {
    const user = userEvent.setup()
    render(<ReminderSettings />)

    // Make a change - toggle the main switch (first checkbox)
    const checkboxes = screen.getAllByRole('checkbox')
    const masterToggle = checkboxes[0]
    await user.click(masterToggle)

    // Reset changes
    const resetButton = screen.getByRole('button', { name: /reset changes/i })
    await user.click(resetButton)

    // Should revert to original state
    expect(masterToggle).toBeChecked()
  })

  it('shows loading state when user data is not available', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    })

    render(<ReminderSettings />)

    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('handles notification permission requests', async () => {
    const user = userEvent.setup()

    // Mock denied permission initially
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: jest.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })

    render(<ReminderSettings />)

    expect(screen.getByText('Browser Notifications')).toBeInTheDocument()

    const enableButton = screen.getByRole('button', {
      name: /enable notifications/i,
    })
    await user.click(enableButton)

    expect(window.Notification.requestPermission).toHaveBeenCalled()
  })
})
