/**
 * Journal Entry Management User Journey Tests
 *
 * Tests core journal entry creation, editing, and deletion flows using standard Playwright
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'

test.describe('Journal Entry Management Journey', () => {
  // Helper function to sign in a user
  async function signInUser(page: any, email: string, password: string) {
    // Debug: Check server environment configuration first
    if (process.env.CI || process.env.TEST_ENVIRONMENT) {
      try {
        const debugResponse = await page.request.get('/api/debug/env')
        if (debugResponse.ok()) {
          const envStatus = await debugResponse.json()
          console.log(
            'Server environment status:',
            JSON.stringify(envStatus, null, 2)
          )
        }
      } catch (error) {
        console.log('Could not fetch debug endpoint:', error)
      }
    }

    await page.goto('/sign-in')

    try {
      // Debug: Log environment variables availability
      if (process.env.CI) {
        console.log('CI Environment detected')
        console.log(
          'Test env - Clerk key present:',
          !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        )
        console.log(
          'Test env - Clerk key prefix:',
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8)
        )
      }

      // Wait for the form to load - shorter timeout to fail fast if Clerk isn't configured
      await page.waitForSelector('[data-clerk-element]', { timeout: 5000 })

      // Use role-based selectors that match Clerk's form structure
      await page.getByRole('textbox', { name: 'Email address' }).fill(email)
      await page.getByRole('textbox', { name: 'Password' }).fill(password)
      await page.getByRole('button', { name: 'Continue' }).click()

      // Wait for successful sign-in
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      return true // Authentication successful
    } catch (error: any) {
      // More detailed error logging
      console.error('Authentication failed:', error.message)

      // Check what's actually on the page
      const pageUrl = page.url()
      console.log('Current page URL:', pageUrl)

      // If Clerk isn't loading, skip authentication for CI
      if (process.env.CI && error.message?.includes('data-clerk-element')) {
        console.log(
          '⚠️ Clerk authentication not available in CI - test will be skipped'
        )
        return false // Authentication not available
      } else {
        throw error
      }
    }
  }

  test('should complete journal entry creation flow for new user', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    // Check authentication first
    const authenticated = await signInUser(page, email, password)
    if (!authenticated && process.env.CI) {
      test.skip(true, 'Skipping test - authentication not available in CI')
      return
    }

    await test.step('Navigate to journal page', async () => {
      await page.goto('/journal')

      // Verify empty state for new user
      await expect(page.getByText(/no journal entries/i)).toBeVisible()
      console.log('✅ Empty state displayed for new user')
    })

    await test.step('Create first journal entry', async () => {
      await page.getByRole('button', { name: /new entry/i }).click()

      // Verify navigation to entry editor
      await expect(page).toHaveURL(/\/journal\/new/)
      console.log('✅ Navigated to journal entry editor')
    })

    await test.step('Fill journal entry content', async () => {
      // Fill title
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('My First Journal Entry')

      // Fill main content
      await page
        .getByRole('textbox', { name: /content/i })
        .fill(
          'Today was a great day. I felt really positive about starting this journey of reflection and growth.'
        )

      console.log('✅ Journal content filled')
    })

    await test.step('Select mood for entry', async () => {
      await page.getByRole('button', { name: /happy/i }).click()

      // Verify mood selected
      await expect(page.locator('[data-testid="mood-happy"]')).toHaveClass(
        /selected/
      )
      console.log('✅ Happy mood selected')
    })

    await test.step('Add tags to entry', async () => {
      await page.getByRole('textbox', { name: /add tags/i }).fill('gratitude')
      await page.getByRole('textbox', { name: /add tags/i }).press('Enter')

      // Add another tag
      await page.getByRole('textbox', { name: /add tags/i }).fill('reflection')
      await page.getByRole('textbox', { name: /add tags/i }).press('Enter')

      // Verify tags added
      await expect(page.getByText('gratitude')).toBeVisible()
      await expect(page.getByText('reflection')).toBeVisible()
      console.log('✅ Tags added successfully')
    })

    await test.step('Save journal entry', async () => {
      await page.getByRole('button', { name: /save entry/i }).click()

      // Verify success and navigation
      await expect(page.getByText(/entry saved/i)).toBeVisible()
      await expect(page).toHaveURL(/\/journal$/)
      console.log('✅ Journal entry saved successfully')
    })

    await test.step('Verify entry appears in journal list', async () => {
      // Should see the created entry
      await expect(page.getByText('My First Journal Entry')).toBeVisible()
      await expect(page.getByText('gratitude')).toBeVisible()
      await expect(page.getByText('reflection')).toBeVisible()

      // Check entry count
      const entryCards = page.locator('[data-testid="journal-entry-card"]')
      await expect(entryCards).toHaveCount(1)
      console.log('✅ Entry visible in journal list')
    })
  })

  test('should edit existing journal entry for active user', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate as active user', async () => {
      await signInUser(page, email, password)
    })

    await test.step('Navigate to journal and select entry to edit', async () => {
      await page.goto('/journal')

      // Active user should have existing entries
      const firstEntry = page
        .locator('[data-testid="journal-entry-card"]')
        .first()
      await expect(firstEntry).toBeVisible()

      await firstEntry.getByRole('button', { name: /edit/i }).click()

      // Verify navigation to edit page
      await expect(page).toHaveURL(/\/journal\/[^\/]+\/edit/)
      console.log('✅ Navigated to entry editor')
    })

    await test.step('Update entry content', async () => {
      // Update title
      const titleInput = page.getByRole('textbox', { name: /title/i })
      await titleInput.clear()
      await titleInput.fill('Updated Journal Entry Title')

      // Update content
      const contentInput = page.getByRole('textbox', { name: /content/i })
      await contentInput.clear()
      await contentInput.fill(
        'This is updated content with more reflections and insights about my day.'
      )

      console.log('✅ Entry content updated')
    })

    await test.step('Change mood selection', async () => {
      // Change to excited mood
      await page.getByRole('button', { name: /excited/i }).click()

      // Verify mood changed
      await expect(page.locator('[data-testid="mood-excited"]')).toHaveClass(
        /selected/
      )
      console.log('✅ Mood updated to excited')
    })

    await test.step('Update tags', async () => {
      // Remove existing tag (if any)
      const existingTag = page.locator('[data-testid="tag-item"]').first()
      if (await existingTag.isVisible()) {
        await existingTag.getByRole('button', { name: /remove/i }).click()
      }

      // Add new tags
      await page.getByRole('textbox', { name: /add tags/i }).fill('growth')
      await page.getByRole('textbox', { name: /add tags/i }).press('Enter')

      await page.getByRole('textbox', { name: /add tags/i }).fill('mindfulness')
      await page.getByRole('textbox', { name: /add tags/i }).press('Enter')

      // Verify new tags
      await expect(page.getByText('growth')).toBeVisible()
      await expect(page.getByText('mindfulness')).toBeVisible()
      console.log('✅ Tags updated successfully')
    })

    await test.step('Save updated entry', async () => {
      await page.getByRole('button', { name: /save entry/i }).click()

      // Verify success
      await expect(page.getByText(/entry updated/i)).toBeVisible()
      await expect(page).toHaveURL(/\/journal$/)
      console.log('✅ Entry updated successfully')
    })

    await test.step('Verify updates in journal list', async () => {
      await expect(page.getByText('Updated Journal Entry Title')).toBeVisible()
      await expect(page.getByText('growth')).toBeVisible()
      await expect(page.getByText('mindfulness')).toBeVisible()
      console.log('✅ Updates visible in journal list')
    })
  })

  test('should delete journal entry with confirmation', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate and navigate to journal', async () => {
      await signInUser(page, email, password)
      await page.goto('/journal')
    })

    await test.step('Delete a journal entry', async () => {
      // Get initial count
      const initialCards = page.locator('[data-testid="journal-entry-card"]')
      const initialCount = await initialCards.count()

      // Get entry title for verification
      const firstEntry = initialCards.first()
      const entryTitle = await firstEntry
        .locator('[data-testid="entry-title"]')
        .textContent()

      await firstEntry.getByRole('button', { name: /delete/i }).click()

      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept())

      // Verify deletion
      if (entryTitle) {
        await expect(page.getByText(entryTitle)).not.toBeVisible()
      }

      // Verify count decreased
      await expect(initialCards).toHaveCount(initialCount - 1)
      console.log('✅ Journal entry deleted successfully')
    })
  })

  test('should associate journal entry with relationships', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate and create new entry', async () => {
      await signInUser(page, email, password)
      await page.goto('/journal/new')
    })

    await test.step('Fill entry with relationship associations', async () => {
      // Fill basic content
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('Entry About Relationships')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Had a great conversation with my partner and friend today.')

      // Select mood
      await page.getByRole('button', { name: /content/i }).click()

      console.log('✅ Basic entry content filled')
    })

    await test.step('Select relationships for entry', async () => {
      await page.getByRole('button', { name: /add relationships/i }).click()

      // Select multiple relationships
      await page.getByRole('checkbox', { name: /partner/i }).check()
      await page.getByRole('checkbox', { name: /friend/i }).check()

      // Verify selections
      await expect(
        page.getByRole('checkbox', { name: /partner/i })
      ).toBeChecked()
      await expect(
        page.getByRole('checkbox', { name: /friend/i })
      ).toBeChecked()

      console.log('✅ Relationships selected for entry')
    })

    await test.step('Save entry with relationships', async () => {
      await page.getByRole('button', { name: /save entry/i }).click()

      // Verify success
      await expect(page.getByText(/entry saved/i)).toBeVisible()
      await expect(page).toHaveURL(/\/journal$/)
      console.log('✅ Entry with relationships saved')
    })

    await test.step('Verify relationship associations in list', async () => {
      const entryCard = page
        .getByText('Entry About Relationships')
        .locator('..')
      await expect(entryCard.getByText('Partner')).toBeVisible()
      await expect(entryCard.getByText('Friend')).toBeVisible()
      console.log('✅ Relationship associations visible')
    })
  })

  test('should handle mood selector functionality', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    await test.step('Authenticate and navigate to new entry', async () => {
      await signInUser(page, email, password)
      await page.goto('/journal/new')
    })

    await test.step('Test all mood options', async () => {
      const moods = [
        'ecstatic',
        'happy',
        'content',
        'neutral',
        'anxious',
        'sad',
        'angry',
        'frustrated',
        'excited',
        'grateful',
      ]

      for (const mood of moods) {
        await page.getByRole('button', { name: new RegExp(mood, 'i') }).click()

        // Verify mood selected
        await expect(page.locator(`[data-testid="mood-${mood}"]`)).toHaveClass(
          /selected/
        )
        console.log(`✅ ${mood} mood selectable`)
      }
    })

    await test.step('Test mood persistence in form', async () => {
      // Select a specific mood
      await page.getByRole('button', { name: /grateful/i }).click()

      // Fill other fields
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('Mood Test Entry')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Testing mood functionality')

      // Verify mood is still selected
      await expect(page.locator('[data-testid="mood-grateful"]')).toHaveClass(
        /selected/
      )
      console.log('✅ Mood selection persists during form interaction')
    })
  })

  test('should validate journal entry form fields', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    await test.step('Authenticate and navigate to new entry', async () => {
      await signInUser(page, email, password)
      await page.goto('/journal/new')
    })

    await test.step('Test validation for empty title', async () => {
      // Try to save without title
      await page.getByRole('button', { name: /save entry/i }).click()

      // Should show validation error
      await expect(page.getByText(/title is required/i)).toBeVisible()
      console.log('✅ Title validation error displayed')
    })

    await test.step('Test validation for empty content', async () => {
      // Fill title but leave content empty
      await page.getByRole('textbox', { name: /title/i }).fill('Test Title')
      await page.getByRole('button', { name: /save entry/i }).click()

      // Should show content validation error
      await expect(page.getByText(/content is required/i)).toBeVisible()
      console.log('✅ Content validation error displayed')
    })

    await test.step('Test validation for minimum content length', async () => {
      // Fill content with very short text
      await page.getByRole('textbox', { name: /content/i }).fill('Too short')
      await page.getByRole('button', { name: /save entry/i }).click()

      // Should show minimum length error
      await expect(
        page.getByText(/content must be at least \d+ characters/i)
      ).toBeVisible()
      console.log('✅ Minimum content length validation error displayed')
    })

    await test.step('Test successful validation with all fields', async () => {
      // Fill all required fields properly
      await page.getByRole('textbox', { name: /content/i }).clear()
      await page
        .getByRole('textbox', { name: /content/i })
        .fill(
          'This is a proper journal entry with sufficient content to pass validation requirements.'
        )

      // Select mood
      await page.getByRole('button', { name: /happy/i }).click()

      // Save should work now
      await page.getByRole('button', { name: /save entry/i }).click()

      // Should succeed
      await expect(page.getByText(/entry saved/i)).toBeVisible()
      console.log('✅ Form validation passes with complete data')
    })
  })

  test('should handle tag input functionality', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate and navigate to new entry', async () => {
      await signInUser(page, email, password)
      await page.goto('/journal/new')
    })

    await test.step('Test tag input and autocomplete', async () => {
      const tagInput = page.getByRole('textbox', { name: /add tags/i })

      // Start typing a tag
      await tagInput.fill('grat')

      // Should show autocomplete suggestions
      await expect(page.getByText('gratitude')).toBeVisible()
      console.log('✅ Tag autocomplete working')

      // Select suggestion
      await page.getByText('gratitude').click()

      // Verify tag added
      await expect(page.getByText('gratitude')).toBeVisible()
      console.log('✅ Tag added from autocomplete')
    })

    await test.step('Test custom tag creation', async () => {
      const tagInput = page.getByRole('textbox', { name: /add tags/i })

      // Add custom tag
      await tagInput.fill('custom-tag')
      await tagInput.press('Enter')

      // Verify custom tag added
      await expect(page.getByText('custom-tag')).toBeVisible()
      console.log('✅ Custom tag created')
    })

    await test.step('Test tag removal', async () => {
      // Remove a tag
      const tagToRemove = page.locator('[data-testid="tag-item"]').first()
      await tagToRemove.getByRole('button', { name: /remove/i }).click()

      // Verify tag removed
      await expect(tagToRemove).not.toBeVisible()
      console.log('✅ Tag removed successfully')
    })

    await test.step('Test tag limits', async () => {
      // Add multiple tags to test limits
      const tagInput = page.getByRole('textbox', { name: /add tags/i })
      const maxTags = 10

      for (let i = 0; i < maxTags + 2; i++) {
        await tagInput.fill(`tag-${i}`)
        await tagInput.press('Enter')
      }

      // Should limit to max tags
      const tags = page.locator('[data-testid="tag-item"]')
      await expect(tags).toHaveCount(maxTags)
      console.log(`✅ Tag limit enforced at ${maxTags} tags`)
    })
  })
})
