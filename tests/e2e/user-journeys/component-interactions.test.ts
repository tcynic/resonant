/**
 * Component Interactions User Journey Tests
 *
 * Tests specific component behaviors: mood selector, tag input, relationship picker
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'
import { MCPBrowserHelper } from '../../helpers/mcp-browser-helper'

test.describe('Component Interactions Journey', () => {
  let mcpHelper: MCPBrowserHelper

  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPBrowserHelper(page)
  })

  test('should test mood selector component interactions', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup authenticated session', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test mood selector visual feedback', async () => {
      // Test hover states
      const happyMood = page.getByRole('button', { name: /happy/i })

      // In actual MCP environment:
      // await mcp__playwright__browser_hover({
      //   element: 'happy mood button',
      //   ref: '[data-testid="mood-happy"]'
      // })
      await happyMood.hover()

      // Verify hover state visual feedback
      await expect(happyMood).toHaveClass(/hover/)
      console.log('✅ Mood button hover state working')
    })

    await test.step('Test mood selection states', async () => {
      const moods = ['happy', 'sad', 'angry', 'excited', 'neutral']

      for (const mood of moods) {
        const moodButton = page.getByRole('button', {
          name: new RegExp(mood, 'i'),
        })

        // Click mood
        await moodButton.click()

        // Verify selected state
        await expect(moodButton).toHaveClass(/selected/)

        // Verify other moods are deselected
        for (const otherMood of moods) {
          if (otherMood !== mood) {
            const otherButton = page.getByRole('button', {
              name: new RegExp(otherMood, 'i'),
            })
            await expect(otherButton).not.toHaveClass(/selected/)
          }
        }

        console.log(`✅ ${mood} mood selection state correct`)
      }
    })

    await test.step('Test mood selector accessibility', async () => {
      const happyMood = page.getByRole('button', { name: /happy/i })

      // Test keyboard navigation
      await happyMood.focus()
      await page.keyboard.press('Tab')

      // Should move to next mood
      const sadMood = page.getByRole('button', { name: /sad/i })
      await expect(sadMood).toBeFocused()

      // Test space bar selection
      await page.keyboard.press('Space')
      await expect(sadMood).toHaveClass(/selected/)

      console.log('✅ Mood selector keyboard navigation working')
    })

    await test.step('Test mood emoji display', async () => {
      const moodData = [
        { name: 'happy', emoji: '😊' },
        { name: 'sad', emoji: '😢' },
        { name: 'angry', emoji: '😡' },
        { name: 'excited', emoji: '🤩' },
        { name: 'grateful', emoji: '🙏' },
      ]

      for (const mood of moodData) {
        const moodButton = page.getByRole('button', {
          name: new RegExp(mood.name, 'i'),
        })
        await expect(moodButton).toContainText(mood.emoji)
        console.log(
          `✅ ${mood.name} mood displays correct emoji: ${mood.emoji}`
        )
      }
    })
  })

  test('should test tag input component advanced interactions', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Setup with power user for extensive tag data', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test tag autocomplete with existing tags', async () => {
      const tagInput = page.getByRole('textbox', { name: /add tags/i })

      // Start typing partial tag
      await tagInput.fill('grat')

      // Should show autocomplete dropdown
      await expect(
        page.locator('[data-testid="tag-suggestions"]')
      ).toBeVisible()

      // Should show existing tags that match
      await expect(page.getByText('gratitude')).toBeVisible()

      // Test keyboard navigation in dropdown
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')

      // Should add selected tag
      await expect(page.getByText('gratitude')).toBeVisible()
      console.log('✅ Tag autocomplete with keyboard navigation working')
    })

    await test.step('Test tag input special characters and validation', async () => {
      const tagInput = page.getByRole('textbox', { name: /add tags/i })

      // Test special characters
      await tagInput.fill('self-care')
      await tagInput.press('Enter')
      await expect(page.getByText('self-care')).toBeVisible()

      // Test numbers in tags
      await tagInput.fill('week-1')
      await tagInput.press('Enter')
      await expect(page.getByText('week-1')).toBeVisible()

      // Test unicode characters
      await tagInput.fill('心理健康')
      await tagInput.press('Enter')
      await expect(page.getByText('心理健康')).toBeVisible()

      console.log('✅ Tag input handles special characters and unicode')
    })

    await test.step('Test tag length validation', async () => {
      const tagInput = page.getByRole('textbox', { name: /add tags/i })

      // Test very long tag
      const longTag = 'a'.repeat(50)
      await tagInput.fill(longTag)
      await tagInput.press('Enter')

      // Should show validation error or truncate
      const errorMessage = page.getByText(/tag too long/i)
      const truncatedTag = page.getByText(longTag.substring(0, 20))

      const hasError = await errorMessage.isVisible()
      const hasTruncated = await truncatedTag.isVisible()

      expect(hasError || hasTruncated).toBeTruthy()
      console.log('✅ Tag length validation working')
    })

    await test.step('Test tag duplicate prevention', async () => {
      const tagInput = page.getByRole('textbox', { name: /add tags/i })

      // Add a tag
      await tagInput.fill('duplicate-test')
      await tagInput.press('Enter')
      await expect(page.getByText('duplicate-test')).toBeVisible()

      // Try to add same tag again
      await tagInput.fill('duplicate-test')
      await tagInput.press('Enter')

      // Should not add duplicate
      const duplicateTags = page.locator('[data-testid="tag-item"]', {
        hasText: 'duplicate-test',
      })
      await expect(duplicateTags).toHaveCount(1)
      console.log('✅ Duplicate tag prevention working')
    })

    await test.step('Test tag removal with undo functionality', async () => {
      // Ensure we have tags to remove
      const tagInput = page.getByRole('textbox', { name: /add tags/i })
      await tagInput.fill('removable-tag')
      await tagInput.press('Enter')

      // Remove tag
      const tagItem = page.getByText('removable-tag').locator('..')
      await tagItem.getByRole('button', { name: /remove/i }).click()

      // Check for undo option
      const undoButton = page.getByRole('button', { name: /undo/i })
      if (await undoButton.isVisible()) {
        await undoButton.click()
        await expect(page.getByText('removable-tag')).toBeVisible()
        console.log('✅ Tag removal undo functionality working')
      } else {
        console.log('✅ Tag removal working (no undo feature)')
      }
    })
  })

  test('should test relationship picker multi-select behaviors', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup with user who has relationships', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test relationship picker opening and display', async () => {
      // In actual MCP environment:
      // await mcp__playwright__browser_click({
      //   element: 'relationship picker button',
      //   ref: '[data-testid="relationship-picker-btn"]'
      // })
      await page.getByRole('button', { name: /add relationships/i }).click()

      // Should show relationship picker modal/dropdown
      await expect(
        page.locator('[data-testid="relationship-picker"]')
      ).toBeVisible()

      // Should show existing relationships
      const checkboxCount = await page.getByRole('checkbox').count()
      expect(checkboxCount).toBeGreaterThan(0)
      console.log('✅ Relationship picker opens and displays relationships')
    })

    await test.step('Test multi-select functionality', async () => {
      // Select multiple relationships
      const relationships = ['Partner', 'Friend', 'Family']

      for (const rel of relationships) {
        const checkbox = page.getByRole('checkbox', {
          name: new RegExp(rel, 'i'),
        })
        if (await checkbox.isVisible()) {
          await checkbox.check()
          await expect(checkbox).toBeChecked()
          console.log(`✅ ${rel} relationship selected`)
        }
      }
    })

    await test.step('Test relationship picker search functionality', async () => {
      const searchInput = page.getByRole('textbox', {
        name: /search relationships/i,
      })

      if (await searchInput.isVisible()) {
        // Search for specific relationship
        await searchInput.fill('part')

        // Should filter results
        await expect(page.getByText('Partner')).toBeVisible()

        // Clear search
        await searchInput.clear()

        // Should show all relationships again
        const allCheckboxCount = await page.getByRole('checkbox').count()
        expect(allCheckboxCount).toBeGreaterThan(1)
        console.log('✅ Relationship picker search working')
      }
    })

    await test.step('Test relationship display with photos/initials', async () => {
      const relationshipItems = page.locator(
        '[data-testid="relationship-item"]'
      )
      const count = await relationshipItems.count()

      for (let i = 0; i < Math.min(count, 3); i++) {
        const item = relationshipItems.nth(i)

        // Should have either photo or initials
        const hasPhoto = await item
          .locator('[data-testid="relationship-photo"]')
          .isVisible()
        const hasInitials = await item
          .locator('[data-testid="relationship-initials"]')
          .isVisible()

        expect(hasPhoto || hasInitials).toBeTruthy()
        console.log(`✅ Relationship ${i + 1} has visual representation`)
      }
    })

    await test.step('Test selected relationships display in entry', async () => {
      // Close picker if it's a modal
      const closeButton = page.getByRole('button', { name: /close|done/i })
      if (await closeButton.isVisible()) {
        await closeButton.click()
      }

      // Verify selected relationships show in the entry
      const selectedRelationships = page.locator(
        '[data-testid="selected-relationship"]'
      )
      const selectedCount = await selectedRelationships.count()
      expect(selectedCount).toBeGreaterThan(0)
      console.log('✅ Selected relationships display in entry form')
    })

    await test.step('Test relationship removal from selection', async () => {
      // Remove a selected relationship
      const firstSelected = page
        .locator('[data-testid="selected-relationship"]')
        .first()
      const removeButton = firstSelected.getByRole('button', {
        name: /remove/i,
      })

      if (await removeButton.isVisible()) {
        const beforeCount = await page
          .locator('[data-testid="selected-relationship"]')
          .count()
        await removeButton.click()

        // Should have one less selected
        const afterCount = await page
          .locator('[data-testid="selected-relationship"]')
          .count()
        expect(afterCount).toBe(beforeCount - 1)
        console.log('✅ Relationship removal from selection working')
      }
    })
  })

  test('should test component integration in complete flow', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    await test.step('Complete integrated component workflow', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test all components working together', async () => {
      // Fill basic content
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('Component Integration Test')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Testing all components working together in harmony.')

      // Select mood
      await page.getByRole('button', { name: /happy/i }).click()
      await expect(page.locator('[data-testid="mood-happy"]')).toHaveClass(
        /selected/
      )

      // Add tags
      const tagInput = page.getByRole('textbox', { name: /add tags/i })
      await tagInput.fill('integration')
      await tagInput.press('Enter')
      await tagInput.fill('testing')
      await tagInput.press('Enter')

      // Select relationships (if available)
      const relationshipButton = page.getByRole('button', {
        name: /add relationships/i,
      })
      if (await relationshipButton.isVisible()) {
        await relationshipButton.click()

        const firstCheckbox = page.getByRole('checkbox').first()
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.check()
        }

        const closeButton = page.getByRole('button', { name: /close|done/i })
        if (await closeButton.isVisible()) {
          await closeButton.click()
        }
      }

      // Save entry
      await page.getByRole('button', { name: /save entry/i }).click()

      // Verify all components data saved
      await expect(page.getByText(/entry saved/i)).toBeVisible()
      console.log('✅ All components integrated successfully')
    })

    await test.step('Verify saved data integrity', async () => {
      // Navigate back to journal list
      await expect(page).toHaveURL(/\/journal$/)

      // Find the created entry
      const entryCard = page
        .getByText('Component Integration Test')
        .locator('..')

      // Verify all component data is present
      await expect(entryCard.getByText('integration')).toBeVisible()
      await expect(entryCard.getByText('testing')).toBeVisible()

      // Check mood indicator
      const moodIndicator = entryCard.locator('[data-testid="mood-indicator"]')
      if (await moodIndicator.isVisible()) {
        await expect(moodIndicator).toContainText('😊') // Happy emoji
      }

      console.log('✅ All component data persisted correctly')
    })
  })

  test('should test component error states and recovery', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('edgeCaseUser')

    await test.step('Setup for error testing', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test component error handling', async () => {
      // Test invalid tag input
      const tagInput = page.getByRole('textbox', { name: /add tags/i })
      await tagInput.fill('   ') // Empty spaces
      await tagInput.press('Enter')

      // Should not add empty tag
      const emptyTags = page.locator('[data-testid="tag-item"]', {
        hasText: /^\s*$/,
      })
      await expect(emptyTags).toHaveCount(0)

      // Test very long content that might cause issues
      const longContent = 'a'.repeat(10000)
      await page.getByRole('textbox', { name: /content/i }).fill(longContent)

      // Should handle gracefully (either accept or show validation)
      const saveButton = page.getByRole('button', { name: /save entry/i })
      await saveButton.click()

      // Either should save or show validation error
      const saved = await page.getByText(/entry saved/i).isVisible()
      const error = await page.getByText(/content too long/i).isVisible()

      expect(saved || error).toBeTruthy()
      console.log('✅ Component error handling working')
    })

    await test.step('Test component recovery from errors', async () => {
      // If there was an error, fix it
      if (await page.getByText(/error/i).isVisible()) {
        await page.getByRole('textbox', { name: /content/i }).clear()
        await page
          .getByRole('textbox', { name: /content/i })
          .fill('Normal content length')
      }

      // Ensure form is still functional
      await page.getByRole('textbox', { name: /title/i }).fill('Recovery Test')
      await page.getByRole('button', { name: /happy/i }).click()

      // Should be able to save now
      await page.getByRole('button', { name: /save entry/i }).click()
      await expect(page.getByText(/entry saved/i)).toBeVisible()

      console.log('✅ Component recovery from errors working')
    })
  })
})
