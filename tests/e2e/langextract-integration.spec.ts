/**
 * E2E Tests for LangExtract Integration
 * Story LangExtract-3: Integration Testing & Production Readiness
 */

import { test, expect } from '@playwright/test'

test.describe('LangExtract Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')

    // Handle authentication if needed
    // Note: Adjust this based on your authentication setup
    await page.waitForLoadState('networkidle')
  })

  test('should display structured insights in dashboard when LangExtract is enabled', async ({
    page,
  }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-container"]', {
      timeout: 10000,
    })

    // Check for enhanced insights indicator
    const enhancedInsightsIndicator = page.locator('text=Enhanced Insights')
    await expect(enhancedInsightsIndicator).toBeVisible()

    // Verify LangExtract enhancement badge is present
    const langExtractBadge = page.locator(
      '.bg-green-100:has-text("🔍 Enhanced Insights")'
    )
    await expect(langExtractBadge).toBeVisible()
  })

  test('should process journal entry with LangExtract structured data', async ({
    page,
  }) => {
    // Navigate to journal creation
    await page.goto('/journal/new')

    // Fill in a sample journal entry with rich emotional content
    const sampleEntry = `
      Today was an amazing day with Sarah! We had such a wonderful conversation over dinner. 
      I felt incredibly happy and grateful for our connection. The stress from work deadline 
      pressure seemed to melt away when we talked about our weekend plans. 
      We're really communicating well and I feel so emotionally connected to her.
    `

    await page.fill('[data-testid="journal-content-input"]', sampleEntry)

    // Select a relationship if needed
    const relationshipSelector = page.locator(
      '[data-testid="relationship-selector"]'
    )
    if (await relationshipSelector.isVisible()) {
      await relationshipSelector.click()
      await page.click('text=Sarah') // Assuming a relationship named Sarah exists
    }

    // Enable AI analysis
    const aiAnalysisToggle = page.locator('[data-testid="ai-analysis-toggle"]')
    if (await aiAnalysisToggle.isVisible()) {
      await aiAnalysisToggle.check()
    }

    // Submit the journal entry
    await page.click('[data-testid="submit-journal-entry"]')

    // Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]', {
      timeout: 30000,
    })

    // Navigate to the entry details to verify structured insights
    await page.goto('/journal') // Adjust path as needed
    await page.click('[data-testid="journal-entry-item"]')

    // Verify structured insights are displayed
    await expect(page.locator('text=Structured Insights')).toBeVisible()

    // Check for emotion badges
    await expect(page.locator('.bg-green-100:has-text("happy")')).toBeVisible()
    await expect(
      page.locator('.bg-green-100:has-text("grateful")')
    ).toBeVisible()

    // Check for theme badges
    await expect(
      page.locator('.bg-pink-100:has-text("quality time")')
    ).toBeVisible()
    await expect(
      page.locator('.bg-purple-100:has-text("work stress")')
    ).toBeVisible()

    // Check for trigger badges
    await expect(page.locator('[title*="deadline pressure"]')).toBeVisible()

    // Check for communication patterns
    await expect(page.locator('text=💬')).toBeVisible()

    // Check for relationship dynamics
    await expect(page.locator('text=👥')).toBeVisible()
  })

  test('should handle LangExtract processing failure gracefully', async ({
    page,
  }) => {
    // Mock a scenario where LangExtract processing fails
    await page.route('**/api/langextract/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'LangExtract processing failed' }),
      })
    })

    // Create a journal entry
    await page.goto('/journal/new')
    await page.fill(
      '[data-testid="journal-content-input"]',
      'Test entry for failure scenario'
    )
    await page.click('[data-testid="submit-journal-entry"]')

    // Wait for processing
    await page.waitForSelector('[data-testid="processing-complete"]', {
      timeout: 30000,
    })

    // Verify that basic analysis still works (fallback behavior)
    await page.goto('/journal')
    await page.click('[data-testid="journal-entry-item"]')

    // Should still show basic analysis results
    await expect(page.locator('[data-testid="sentiment-score"]')).toBeVisible()

    // Should not show structured insights section
    await expect(page.locator('text=Structured Insights')).not.toBeVisible()

    // Should not show enhanced insights indicator
    await expect(page.locator('text=+Enhanced')).not.toBeVisible()
  })

  test('should display processing time metrics when available', async ({
    page,
  }) => {
    // Navigate to AI processing summary
    await page.goto('/dashboard')

    // Look for processing time information
    const processingTime = page.locator('text=/\\d+ms/')

    // If LangExtract is enabled and processing, we should see timing metrics
    if (await processingTime.isVisible()) {
      await expect(processingTime).toContainText('ms')
    }

    // Check for enhanced processing indicator
    const enhancedIndicator = page.locator('text=🔍 Enhanced Insights')
    await expect(enhancedIndicator).toBeVisible()
  })

  test('should maintain backward compatibility with existing entries', async ({
    page,
  }) => {
    // Navigate to existing journal entries (entries created before LangExtract)
    await page.goto('/journal')

    // Click on an older entry that wouldn't have LangExtract data
    const oldEntries = page.locator('[data-testid="journal-entry-item"]')
    if ((await oldEntries.count()) > 0) {
      await oldEntries.first().click()

      // Should display basic analysis without errors
      await expect(
        page.locator('[data-testid="sentiment-score"]')
      ).toBeVisible()

      // Should not show structured insights for old entries
      const structuredInsights = page.locator('text=Structured Insights')
      const hasStructuredInsights = await structuredInsights.isVisible()

      // If no structured insights, that's expected for backward compatibility
      if (!hasStructuredInsights) {
        // Verify basic analysis is still shown
        await expect(
          page.locator('[data-testid="analysis-results"]')
        ).toBeVisible()
      }
    }
  })

  test('should handle feature flag toggle correctly', async ({ page }) => {
    // This test assumes there's an admin interface to toggle feature flags
    // Adjust based on your actual feature flag implementation

    // Navigate to admin or settings page
    await page.goto('/admin/feature-flags') // Adjust path as needed

    // Find LangExtract feature flag toggle
    const langExtractToggle = page.locator(
      '[data-testid="langextract-feature-toggle"]'
    )

    if (await langExtractToggle.isVisible()) {
      // Test disabling the feature
      await langExtractToggle.uncheck()
      await page.click('[data-testid="save-feature-flags"]')

      // Navigate to dashboard and verify enhanced insights are not shown
      await page.goto('/dashboard')
      await expect(page.locator('text=🔍 Enhanced Insights')).not.toBeVisible()

      // Re-enable the feature
      await page.goto('/admin/feature-flags')
      await langExtractToggle.check()
      await page.click('[data-testid="save-feature-flags"]')

      // Verify enhanced insights are shown again
      await page.goto('/dashboard')
      await expect(page.locator('text=🔍 Enhanced Insights')).toBeVisible()
    }
  })

  test('should load dashboard components without errors when LangExtract data is present', async ({
    page,
  }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')

    // Wait for all components to load
    await page.waitForLoadState('networkidle')

    // Check for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Wait a bit for any async operations
    await page.waitForTimeout(2000)

    // Verify no console errors related to LangExtract
    const langExtractErrors = consoleErrors.filter(
      error =>
        error.toLowerCase().includes('langextract') ||
        error.toLowerCase().includes('structured')
    )

    expect(langExtractErrors).toHaveLength(0)

    // Verify key dashboard components are present
    await expect(
      page.locator('[data-testid="health-score-card"]')
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="ai-processing-summary"]')
    ).toBeVisible()

    // Check for enhanced insights in dashboard components
    const enhancedInsights = page.locator(
      '.bg-green-100:has-text("🔍 Enhanced Insights")'
    )
    await expect(enhancedInsights).toBeVisible()
  })

  test('should handle network timeouts gracefully during LangExtract processing', async ({
    page,
  }) => {
    // Mock slow LangExtract processing
    await page.route('**/api/langextract/**', route => {
      // Delay response significantly
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            structuredData: {
              emotions: [],
              themes: [],
              triggers: [],
              communication: [],
              relationships: [],
            },
            extractedEntities: [],
            processingSuccess: false,
            errorMessage: 'Processing timeout',
          }),
        })
      }, 10000) // 10 second delay
    })

    // Create journal entry
    await page.goto('/journal/new')
    await page.fill(
      '[data-testid="journal-content-input"]',
      'Test timeout scenario'
    )
    await page.click('[data-testid="submit-journal-entry"]')

    // Should eventually complete with fallback analysis
    await page.waitForSelector('[data-testid="processing-complete"]', {
      timeout: 45000,
    })

    // Verify basic analysis is available
    await page.goto('/journal')
    await page.click('[data-testid="journal-entry-item"]')
    await expect(page.locator('[data-testid="sentiment-score"]')).toBeVisible()
  })
})
