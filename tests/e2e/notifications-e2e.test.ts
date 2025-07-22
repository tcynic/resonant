import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test configuration
const TEST_USER = {
  email: 'test-notifications@resonant.com',
  password: 'TestPassword123!',
}

const NOTIFICATION_SETTINGS_URL = '/profile/settings/notifications'
const DASHBOARD_URL = '/dashboard'

class NotificationTestHelper {
  constructor(
    private page: Page,
    private context: BrowserContext
  ) {}

  async loginTestUser() {
    await this.page.goto('/sign-in')

    await this.page.fill('input[name="email"]', TEST_USER.email)
    await this.page.fill('input[name="password"]', TEST_USER.password)
    await this.page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await this.page.waitForURL(DASHBOARD_URL)
  }

  async navigateToNotificationSettings() {
    await this.page.goto(NOTIFICATION_SETTINGS_URL)
    await this.page.waitForSelector('[data-testid="reminder-settings"]')
  }

  async enableBrowserNotifications() {
    // Grant notification permissions
    await this.context.grantPermissions(['notifications'])

    // Click enable notifications button if present
    const enableButton = this.page.locator(
      'button:has-text("Enable Notifications")'
    )
    if (await enableButton.isVisible()) {
      await enableButton.click()
    }
  }

  async enableSmartReminders() {
    const masterToggle = this.page.locator(
      'input[type="checkbox"]:near(:text("Enable Smart Reminders"))'
    )
    if (!(await masterToggle.isChecked())) {
      await masterToggle.click()
    }
  }

  async configureReminderSettings(settings: {
    frequency?: 'daily' | 'every2days' | 'weekly'
    preferredTime?: string
    timezone?: string
    doNotDisturbStart?: string
    doNotDisturbEnd?: string
    reminderTypes?: {
      gentleNudge?: boolean
      relationshipFocus?: boolean
      healthScoreAlerts?: boolean
    }
  }) {
    // Configure frequency
    if (settings.frequency) {
      await this.page.click(`input[value="${settings.frequency}"]`)
    }

    // Configure preferred time
    if (settings.preferredTime) {
      await this.page.fill(
        'input[type="time"]:near(:text("Preferred Time"))',
        settings.preferredTime
      )
    }

    // Configure timezone
    if (settings.timezone) {
      await this.page.selectOption(
        'select:near(:text("Timezone"))',
        settings.timezone
      )
    }

    // Configure Do Not Disturb times
    if (settings.doNotDisturbStart) {
      await this.page.fill(
        'input[type="time"]:near(:text("Start Time"))',
        settings.doNotDisturbStart
      )
    }

    if (settings.doNotDisturbEnd) {
      await this.page.fill(
        'input[type="time"]:near(:text("End Time"))',
        settings.doNotDisturbEnd
      )
    }

    // Configure reminder types
    if (settings.reminderTypes) {
      if (settings.reminderTypes.gentleNudge !== undefined) {
        const toggle = this.page.locator(
          'input[type="checkbox"]:near(:text("Gentle Nudges"))'
        )
        const isChecked = await toggle.isChecked()
        if (isChecked !== settings.reminderTypes.gentleNudge) {
          await toggle.click()
        }
      }

      if (settings.reminderTypes.relationshipFocus !== undefined) {
        const toggle = this.page.locator(
          'input[type="checkbox"]:near(:text("Relationship Focus"))'
        )
        const isChecked = await toggle.isChecked()
        if (isChecked !== settings.reminderTypes.relationshipFocus) {
          await toggle.click()
        }
      }

      if (settings.reminderTypes.healthScoreAlerts !== undefined) {
        const toggle = this.page.locator(
          'input[type="checkbox"]:near(:text("Health Score Alerts"))'
        )
        const isChecked = await toggle.isChecked()
        if (isChecked !== settings.reminderTypes.healthScoreAlerts) {
          await toggle.click()
        }
      }
    }
  }

  async saveSettings() {
    await this.page.click('button:has-text("Save Settings")')

    // Wait for success message
    await expect(
      this.page.locator(':text("Reminder settings saved successfully")')
    ).toBeVisible()
  }

  async verifyNotificationBadgeState(
    expectedState: 'disabled' | 'enabled' | 'pending'
  ) {
    const badge = this.page.locator('[data-testid="notification-badge"]')
    await expect(badge).toBeVisible()

    switch (expectedState) {
      case 'disabled':
        await expect(badge.locator('.text-gray-400')).toBeVisible()
        break
      case 'enabled':
        await expect(badge.locator('.text-green-500')).toBeVisible()
        break
      case 'pending':
        await expect(badge.locator('.text-blue-600')).toBeVisible()
        break
    }
  }

  async triggerTestNotification() {
    // Use development test function if available
    const result = await this.page.evaluate(() => {
      if ((window as any).testNotification) {
        return (window as any).testNotification('gentle_nudge')
      }
      return false
    })
    return result
  }

  async verifyAnalyticsDashboard() {
    // Navigate to analytics view
    await this.page.click('text="View Analytics"')

    // Verify analytics components are present
    await expect(this.page.locator(':text("Total Reminders")')).toBeVisible()
    await expect(this.page.locator(':text("Click Rate")')).toBeVisible()
    await expect(this.page.locator(':text("Engagement Score")')).toBeVisible()
  }
}

test.describe('Notification System E2E Tests', () => {
  let helper: NotificationTestHelper

  test.beforeEach(async ({ page, context }) => {
    helper = new NotificationTestHelper(page, context)
    await helper.loginTestUser()
  })

  test('user can configure notification settings end-to-end', async ({
    page,
  }) => {
    await helper.navigateToNotificationSettings()

    // Verify initial state
    await expect(page.locator(':text("Smart Reminders")')).toBeVisible()

    // Enable browser notifications
    await helper.enableBrowserNotifications()

    // Enable smart reminders
    await helper.enableSmartReminders()

    // Configure comprehensive settings
    await helper.configureReminderSettings({
      frequency: 'every2days',
      preferredTime: '10:30',
      timezone: 'America/New_York',
      doNotDisturbStart: '22:00',
      doNotDisturbEnd: '07:00',
      reminderTypes: {
        gentleNudge: true,
        relationshipFocus: true,
        healthScoreAlerts: false,
      },
    })

    // Save settings
    await helper.saveSettings()

    // Verify settings persistence by refreshing and checking
    await page.reload()
    await page.waitForSelector('[data-testid="reminder-settings"]')

    // Verify settings were saved correctly
    await expect(page.locator('input[value="every2days"]')).toBeChecked()
    await expect(
      page.locator('input[type="time"][value="10:30"]')
    ).toBeVisible()
    await expect(
      page.locator('input[type="checkbox"]:near(:text("Gentle Nudges"))')
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"]:near(:text("Relationship Focus"))')
    ).toBeChecked()
    await expect(
      page.locator('input[type="checkbox"]:near(:text("Health Score Alerts"))')
    ).not.toBeChecked()
  })

  test('notification badge reflects system state correctly', async ({
    page,
  }) => {
    // Navigate to dashboard to check badge
    await page.goto(DASHBOARD_URL)

    // Initially should show disabled state
    await helper.verifyNotificationBadgeState('disabled')

    // Configure notifications
    await helper.navigateToNotificationSettings()
    await helper.enableBrowserNotifications()
    await helper.enableSmartReminders()
    await helper.saveSettings()

    // Return to dashboard
    await page.goto(DASHBOARD_URL)

    // Should now show enabled state
    await helper.verifyNotificationBadgeState('enabled')
  })

  test('user can view notification history and analytics', async ({ page }) => {
    // Configure notifications first
    await helper.navigateToNotificationSettings()
    await helper.enableBrowserNotifications()
    await helper.enableSmartReminders()
    await helper.saveSettings()

    // Navigate to history section
    await page.click(':text("Notification History")')

    // Initially should show empty state
    await expect(page.locator(':text("No Reminder History")')).toBeVisible()

    // If analytics are available, verify they display correctly
    const analyticsSection = page.locator(':text("Your Reminder Stats")')
    if (await analyticsSection.isVisible()) {
      await helper.verifyAnalyticsDashboard()
    }
  })

  test('timing controls work correctly with timezone handling', async ({
    page,
  }) => {
    await helper.navigateToNotificationSettings()

    // Test timezone detection
    const detectedTimezoneButton = page.locator(
      ':text("Use detected timezone")'
    )
    if (await detectedTimezoneButton.isVisible()) {
      await detectedTimezoneButton.click()
    }

    // Test Do Not Disturb configuration
    await page.fill('input[type="time"]:near(:text("Start Time"))', '23:00')
    await page.fill('input[type="time"]:near(:text("End Time"))', '06:00')

    // Should show overnight schedule indicator
    await expect(page.locator(':text("overnight schedule")')).toBeVisible()

    // Test same-day DND
    await page.fill('input[type="time"]:near(:text("Start Time"))', '12:00')
    await page.fill('input[type="time"]:near(:text("End Time"))', '14:00')

    // Should not show overnight indicator
    await expect(page.locator(':text("overnight schedule")')).not.toBeVisible()
  })

  test('reminder type toggles provide contextual guidance', async ({
    page,
  }) => {
    await helper.navigateToNotificationSettings()

    // Check that guidance changes based on selection
    const gentleNudgeToggle = page.locator(
      'input[type="checkbox"]:near(:text("Gentle Nudges"))'
    )
    const relationshipToggle = page.locator(
      'input[type="checkbox"]:near(:text("Relationship Focus"))'
    )

    await gentleNudgeToggle.click()
    await expect(
      page.locator(':text("perfect for maintaining consistent habits")')
    ).toBeVisible()

    await relationshipToggle.click()
    await expect(
      page.locator(':text("helps maintain connection awareness")')
    ).toBeVisible()

    // Check recommendations section updates
    await expect(page.locator(':text("Smart Recommendations")')).toBeVisible()
  })

  test('user can reset changes before saving', async ({ page }) => {
    await helper.navigateToNotificationSettings()

    const originalFrequency = await page
      .locator('input[type="radio"]:checked')
      .getAttribute('value')

    // Make changes
    await page.click('input[value="weekly"]')
    await page.fill('input[type="time"]:near(:text("Preferred Time"))', '15:00')

    // Verify changes were made
    await expect(page.locator('input[value="weekly"]')).toBeChecked()

    // Reset changes
    await page.click('button:has-text("Reset Changes")')

    // Verify reset worked
    if (originalFrequency) {
      await expect(
        page.locator(`input[value="${originalFrequency}"]`)
      ).toBeChecked()
    }
    await expect(page.locator('button:has-text("Save Settings")')).toHaveClass(
      /cursor-not-allowed/
    )
  })

  test('error states are handled gracefully', async ({ page, context }) => {
    await helper.navigateToNotificationSettings()

    // Test notification permission denied scenario
    await context.clearPermissions()

    const enableButton = page.locator('button:has-text("Enable Notifications")')
    if (await enableButton.isVisible()) {
      await enableButton.click()
    }

    // Should show appropriate message for denied permissions
    await expect(
      page.locator(':text("notifications are blocked")')
    ).toBeVisible()

    // Test save error handling by potentially disconnecting network
    await helper.enableSmartReminders()

    // Temporarily block network to simulate save error
    await context.setOffline(true)

    await page.click('button:has-text("Save Settings")')

    // Should show error message
    await expect(page.locator(':text("Failed to save settings")')).toBeVisible()

    // Restore network
    await context.setOffline(false)
  })

  test('keyboard navigation and accessibility work correctly', async ({
    page,
  }) => {
    await helper.navigateToNotificationSettings()

    // Test keyboard navigation through form elements
    await page.keyboard.press('Tab')

    // Should be able to reach and interact with master toggle
    const masterToggle = page.locator(
      'input[type="checkbox"]:near(:text("Enable Smart Reminders"))'
    )
    await expect(masterToggle).toBeFocused()

    await page.keyboard.press('Space')
    await expect(masterToggle).toBeChecked()

    // Continue tabbing through frequency options
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowDown') // Navigate radio group

    // Test that all interactive elements have proper labels
    const timeInputs = page.locator('input[type="time"]')
    const timeInputCount = await timeInputs.count()

    for (let i = 0; i < timeInputCount; i++) {
      const input = timeInputs.nth(i)
      const ariaLabel = await input.getAttribute('aria-label')
      const associatedLabel = await page
        .locator(`label[for="${await input.getAttribute('id')}"]`)
        .count()

      // Each time input should have either aria-label or associated label
      expect(ariaLabel || associatedLabel > 0).toBeTruthy()
    }
  })

  test('mobile responsiveness works correctly', async ({
    page,
    browserName,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    await helper.navigateToNotificationSettings()

    // Verify mobile layout adaptations
    await expect(page.locator(':text("Smart Reminders")')).toBeVisible()

    // Check that controls are still accessible on mobile
    const frequencyControls = page.locator('input[type="radio"]')
    const firstControl = frequencyControls.first()
    await expect(firstControl).toBeVisible()

    // Test mobile interaction
    await firstControl.click()

    // Verify mobile-specific elements if they exist
    const mobileMenu = page.locator('[data-testid="mobile-menu"]')
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
    }

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  // Development-only test for notification functionality
  test.skip('test notification display (development only)', async ({
    page,
  }) => {
    await helper.navigateToNotificationSettings()
    await helper.enableBrowserNotifications()
    await helper.enableSmartReminders()
    await helper.saveSettings()

    // Navigate to dashboard
    await page.goto(DASHBOARD_URL)

    // Trigger test notification if development function is available
    const testTriggered = await helper.triggerTestNotification()

    if (testTriggered) {
      // Wait for notification to appear (browser dependent)
      await page.waitForTimeout(1000)

      // Note: This test would require additional browser-specific handling
      // for actual notification verification, which varies by browser
    }
  })
})

// Test utilities for CI/CD integration
test.describe('Notification System Performance Tests', () => {
  test('settings page loads within performance budget', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/profile/settings/notifications')
    await page.waitForSelector('[data-testid="reminder-settings"]')

    const loadTime = Date.now() - startTime

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('settings updates are processed quickly', async ({ page }) => {
    const helper = new NotificationTestHelper(page, page.context())

    await helper.loginTestUser()
    await helper.navigateToNotificationSettings()
    await helper.enableBrowserNotifications()
    await helper.enableSmartReminders()

    const startTime = Date.now()
    await helper.saveSettings()
    const saveTime = Date.now() - startTime

    // Settings save should complete within 2 seconds
    expect(saveTime).toBeLessThan(2000)
  })
})
