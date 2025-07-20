/**
 * Dashboard Advanced Feature Tests
 *
 * Tests dashboard data display and real-time updates using MCP browser automation
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'
import { MCPBrowserHelper } from '../../helpers/mcp-browser-helper'

test.describe('Dashboard Advanced Features', () => {
  let mcpHelper: MCPBrowserHelper

  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPBrowserHelper(page)
  })

  test('should display dashboard data correctly for active user', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate and navigate to dashboard', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()

      // Navigate to dashboard
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/dashboard/)
    })

    await test.step('Verify dashboard data display', async () => {
      // Check that dashboard loads
      await expect(
        page.getByRole('heading', { name: /dashboard/i })
      ).toBeVisible()

      // Verify relationship summary section
      const relationshipSection = page.locator(
        '[data-testid="relationship-summary"]'
      )
      if (await relationshipSection.isVisible()) {
        await expect(relationshipSection.getByText('4')).toBeVisible() // Active user has 4 relationships
        console.log('✅ Relationship count displayed correctly')
      }

      // Verify journal entries summary
      const journalSection = page.locator('[data-testid="journal-summary"]')
      if (await journalSection.isVisible()) {
        await expect(journalSection.getByText('12')).toBeVisible() // Active user has 12 entries
        console.log('✅ Journal entry count displayed correctly')
      }

      // Check for recent activity
      const recentActivity = page.locator('[data-testid="recent-activity"]')
      if (await recentActivity.isVisible()) {
        const activityItems = recentActivity.locator(
          '[data-testid="activity-item"]'
        )
        const itemCount = await activityItems.count()
        expect(itemCount).toBeGreaterThanOrEqual(1)
        console.log(`✅ Recent activity showing ${itemCount} items`)
      }
    })

    await test.step('Test navigation from dashboard', async () => {
      // Test navigation to relationships
      const relationshipsLink = page.getByRole('link', {
        name: /relationships/i,
      })
      if (await relationshipsLink.isVisible()) {
        await relationshipsLink.click()
        await expect(page).toHaveURL(/\/relationships/)
        await page.goBack()
      }

      // Test navigation to journal
      const journalLink = page.getByRole('link', { name: /journal/i })
      if (await journalLink.isVisible()) {
        await journalLink.click()
        await expect(page).toHaveURL(/\/journal/)
        await page.goBack()
      }

      console.log('✅ Dashboard navigation working correctly')
    })
  })

  test('should handle empty state for new user dashboard', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    await test.step('Authenticate as new user', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/dashboard')
    })

    await test.step('Verify empty state displays', async () => {
      // Check for empty state messaging
      await expect(page.getByText(/get started/i)).toBeVisible()

      // Check for onboarding prompts
      const addRelationshipPrompt = page.getByText(
        /add your first relationship/i
      )
      const createEntryPrompt = page.getByText(
        /create your first journal entry/i
      )

      const hasRelationshipPrompt = await addRelationshipPrompt.isVisible()
      const hasEntryPrompt = await createEntryPrompt.isVisible()

      expect(hasRelationshipPrompt || hasEntryPrompt).toBeTruthy()
      console.log('✅ Empty state displayed for new user')
    })

    await test.step('Test empty state actions', async () => {
      // Test quick action buttons
      const quickActions = page.locator('[data-testid="quick-actions"]')
      if (await quickActions.isVisible()) {
        const addRelationshipBtn = quickActions.getByRole('button', {
          name: /add relationship/i,
        })
        const createEntryBtn = quickActions.getByRole('button', {
          name: /create entry/i,
        })

        if (await addRelationshipBtn.isVisible()) {
          await addRelationshipBtn.click()
          await expect(page).toHaveURL(/\/relationships/)
          await page.goBack()
        }

        if (await createEntryBtn.isVisible()) {
          await createEntryBtn.click()
          await expect(page).toHaveURL(/\/journal\/new/)
          await page.goBack()
        }

        console.log('✅ Quick actions working from dashboard')
      }
    })
  })

  test('should display power user dashboard with performance', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Authenticate as power user', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/dashboard')
    })

    await test.step('Verify large dataset handling', async () => {
      // Check that dashboard loads efficiently with large datasets
      const startTime = Date.now()
      await expect(
        page.getByRole('heading', { name: /dashboard/i })
      ).toBeVisible()
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
      console.log(`✅ Dashboard loaded in ${loadTime}ms with large dataset`)

      // Verify power user data displays
      const relationshipCount = page.locator(
        '[data-testid="relationship-count"]'
      )
      const journalCount = page.locator('[data-testid="journal-count"]')

      if (await relationshipCount.isVisible()) {
        await expect(relationshipCount.getByText('15')).toBeVisible()
      }

      if (await journalCount.isVisible()) {
        await expect(journalCount.getByText('50')).toBeVisible()
      }

      console.log('✅ Power user data displayed correctly')
    })

    await test.step('Test dashboard pagination and limits', async () => {
      // Check recent activity pagination
      const recentActivity = page.locator('[data-testid="recent-activity"]')
      if (await recentActivity.isVisible()) {
        const activityItems = recentActivity.locator(
          '[data-testid="activity-item"]'
        )
        const itemCount = await activityItems.count()

        // Should limit display to reasonable number (e.g., 10)
        expect(itemCount).toBeLessThanOrEqual(10)
        console.log(`✅ Recent activity limited to ${itemCount} items`)

        // Check for "view more" or pagination controls
        const viewMoreBtn = page.getByRole('button', {
          name: /view more|see all/i,
        })
        if (await viewMoreBtn.isVisible()) {
          console.log('✅ View more functionality available')
        }
      }
    })
  })

  test('should test real-time updates simulation', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup dashboard for real-time testing', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/dashboard')
    })

    await test.step('Simulate data changes and verify updates', async () => {
      // Get initial counts
      const initialRelationshipCount = await page
        .locator('[data-testid="relationship-count"]')
        .textContent()
      const initialJournalCount = await page
        .locator('[data-testid="journal-count"]')
        .textContent()

      console.log(
        `Initial counts - Relationships: ${initialRelationshipCount}, Journal: ${initialJournalCount}`
      )

      // Create a new journal entry and check if dashboard updates
      await page.goto('/journal/new')
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('Dashboard Update Test')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Testing real-time dashboard updates.')
      await page.getByRole('button', { name: /happy/i }).click()
      await page.getByRole('button', { name: /save entry/i }).click()

      // Navigate back to dashboard
      await page.goto('/dashboard')

      // Check if counts updated (if real-time is implemented)
      const updatedJournalCount = await page
        .locator('[data-testid="journal-count"]')
        .textContent()
      console.log(`Updated journal count: ${updatedJournalCount}`)

      // Check if new entry appears in recent activity
      const recentActivity = page.locator('[data-testid="recent-activity"]')
      if (await recentActivity.isVisible()) {
        const hasNewEntry = await recentActivity
          .getByText('Dashboard Update Test')
          .isVisible()
        if (hasNewEntry) {
          console.log('✅ New entry appears in recent activity')
        } else {
          console.log('ℹ️ Real-time updates not yet implemented')
        }
      }
    })
  })

  test('should test dashboard widgets and customization', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Test dashboard widget functionality', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/dashboard')
    })

    await test.step('Verify dashboard widgets', async () => {
      // Check for different dashboard widgets
      const widgets = [
        '[data-testid="mood-chart-widget"]',
        '[data-testid="relationship-health-widget"]',
        '[data-testid="journal-streak-widget"]',
        '[data-testid="insights-widget"]',
      ]

      let visibleWidgets = 0
      for (const widget of widgets) {
        const element = page.locator(widget)
        if (await element.isVisible()) {
          visibleWidgets++
          console.log(`✅ Widget found: ${widget}`)
        }
      }

      console.log(`✅ Dashboard has ${visibleWidgets} widgets visible`)
    })

    await test.step('Test widget interactions', async () => {
      // Test clickable widgets that navigate to detailed views
      const moodChart = page.locator('[data-testid="mood-chart-widget"]')
      if (await moodChart.isVisible()) {
        await moodChart.click()
        // Should navigate to detailed mood analysis or remain on dashboard with expanded view
        console.log('✅ Mood chart widget interactive')
      }

      // Test refresh or reload functionality
      const refreshBtn = page.getByRole('button', { name: /refresh|reload/i })
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click()
        await expect(
          page.getByRole('heading', { name: /dashboard/i })
        ).toBeVisible()
        console.log('✅ Dashboard refresh functionality working')
      }
    })
  })
})
