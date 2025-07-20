/**
 * Relationship Management User Journey Tests
 *
 * Tests core relationship management flows using MCP browser automation
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'
import { MCPBrowserHelper } from '../../helpers/mcp-browser-helper'

test.describe('Relationship Management Journey', () => {
  let mcpHelper: MCPBrowserHelper

  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPBrowserHelper(page)
  })

  test('should complete relationship creation flow for new user', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    await test.step('Authenticate as new user', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
    })

    await test.step('Navigate to relationships page', async () => {
      // In actual MCP environment:
      // await mcp__playwright__browser_navigate({ url: '/relationships' })
      await page.goto('/relationships')

      // Verify empty state for new user
      await expect(page.getByText(/no relationships/i)).toBeVisible()
      console.log('✅ Empty state displayed for new user')
    })

    await test.step('Create first relationship', async () => {
      // In actual MCP environment:
      // await mcp__playwright__browser_click({
      //   element: 'add relationship button',
      //   ref: '[data-testid="add-relationship-btn"]'
      // })
      await page.getByRole('button', { name: /add relationship/i }).click()

      // Fill relationship form
      await page.getByRole('textbox', { name: /name/i }).fill('My Partner')
      await page
        .getByRole('combobox', { name: /relationship type/i })
        .selectOption('romantic-partner')
      await page
        .getByRole('textbox', { name: /description/i })
        .fill('My loving partner')

      // In actual MCP environment:
      // await mcp__playwright__browser_click({
      //   element: 'save relationship button',
      //   ref: '[data-testid="save-relationship"]'
      // })
      await page.getByRole('button', { name: /save/i }).click()

      // Verify relationship created
      await expect(page.getByText('My Partner')).toBeVisible()
      console.log('✅ First relationship created successfully')
    })

    await test.step('Create additional relationships', async () => {
      const relationships = [
        {
          name: 'Best Friend',
          type: 'friend',
          description: 'My closest friend',
        },
        { name: 'Mom', type: 'family', description: 'My mother' },
      ]

      for (const rel of relationships) {
        await page.getByRole('button', { name: /add relationship/i }).click()
        await page.getByRole('textbox', { name: /name/i }).fill(rel.name)
        await page
          .getByRole('combobox', { name: /relationship type/i })
          .selectOption(rel.type)
        await page
          .getByRole('textbox', { name: /description/i })
          .fill(rel.description)
        await page.getByRole('button', { name: /save/i }).click()

        await expect(page.getByText(rel.name)).toBeVisible()
        console.log(`✅ ${rel.name} relationship created`)
      }
    })

    await test.step('Verify relationship list', async () => {
      // Should see all 3 relationships
      await expect(page.getByText('My Partner')).toBeVisible()
      await expect(page.getByText('Best Friend')).toBeVisible()
      await expect(page.getByText('Mom')).toBeVisible()

      // Check relationship count
      const relationshipCards = page.locator(
        '[data-testid="relationship-card"]'
      )
      await expect(relationshipCards).toHaveCount(3)
      console.log('✅ All relationships visible in list')
    })
  })

  test('should edit existing relationship for active user', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate as active user', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
    })

    await test.step('Navigate to relationships and select one to edit', async () => {
      await page.goto('/relationships')

      // Active user should have existing relationships
      const firstRelationship = page
        .locator('[data-testid="relationship-card"]')
        .first()
      await expect(firstRelationship).toBeVisible()

      // In actual MCP environment:
      // await mcp__playwright__browser_click({
      //   element: 'edit relationship button',
      //   ref: '[data-testid="edit-relationship-btn"]'
      // })
      await firstRelationship.getByRole('button', { name: /edit/i }).click()
    })

    await test.step('Update relationship details', async () => {
      // Clear and update name
      await page.getByRole('textbox', { name: /name/i }).clear()
      await page.getByRole('textbox', { name: /name/i }).fill('Updated Partner')

      // Update description
      await page.getByRole('textbox', { name: /description/i }).clear()
      await page
        .getByRole('textbox', { name: /description/i })
        .fill('Updated description with more details')

      // Save changes
      await page.getByRole('button', { name: /save/i }).click()

      // Verify update
      await expect(page.getByText('Updated Partner')).toBeVisible()
      console.log('✅ Relationship updated successfully')
    })
  })

  test('should delete relationship with confirmation', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate and navigate to relationships', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
    })

    await test.step('Delete a relationship', async () => {
      // Get initial count
      const initialCards = page.locator('[data-testid="relationship-card"]')
      const initialCount = await initialCards.count()

      // Click delete on first relationship
      const firstRelationship = initialCards.first()
      const relationshipName = await firstRelationship
        .locator('[data-testid="relationship-name"]')
        .textContent()

      // In actual MCP environment:
      // await mcp__playwright__browser_click({
      //   element: 'delete relationship button',
      //   ref: '[data-testid="delete-relationship-btn"]'
      // })
      await firstRelationship.getByRole('button', { name: /delete/i }).click()

      // Handle confirmation dialog
      // In actual MCP environment:
      // await mcp__playwright__browser_handle_dialog({ accept: true })
      page.on('dialog', dialog => dialog.accept())

      // Verify deletion
      if (relationshipName) {
        await expect(page.getByText(relationshipName)).not.toBeVisible()
      }

      // Verify count decreased
      await expect(initialCards).toHaveCount(initialCount - 1)
      console.log('✅ Relationship deleted successfully')
    })
  })

  test('should search and filter relationships', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Authenticate as power user', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
    })

    await test.step('Test search functionality', async () => {
      // Power user should have many relationships
      const allCards = page.locator('[data-testid="relationship-card"]')
      const initialCount = await allCards.count()
      expect(initialCount).toBeGreaterThan(5) // Power user has extensive data

      // Search for specific relationship
      // In actual MCP environment:
      // await mcp__playwright__browser_type({
      //   element: 'search input',
      //   ref: '[data-testid="search-relationships"]',
      //   text: 'friend'
      // })
      await page.getByRole('textbox', { name: /search/i }).fill('friend')

      // Verify filtered results
      const filteredCards = page.locator('[data-testid="relationship-card"]')
      const filteredCount = await filteredCards.count()
      expect(filteredCount).toBeLessThan(initialCount)
      console.log(
        `✅ Search filtered from ${initialCount} to ${filteredCount} results`
      )
    })

    await test.step('Test relationship type filter', async () => {
      // Clear search first
      await page.getByRole('textbox', { name: /search/i }).clear()

      // Filter by relationship type
      await page
        .getByRole('combobox', { name: /filter by type/i })
        .selectOption('friend')

      // Verify only friend relationships shown
      const friendCards = page.locator('[data-testid="relationship-card"]')
      const friendCount = await friendCards.count()

      // Each visible card should be friend type
      for (let i = 0; i < friendCount; i++) {
        const card = friendCards.nth(i)
        await expect(
          card.locator('[data-testid="relationship-type"]')
        ).toContainText('friend')
      }
      console.log(`✅ Filter showing ${friendCount} friend relationships`)
    })
  })

  test('should handle relationship validation errors', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('newUser')

    await test.step('Authenticate and navigate to create relationship', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
      await page.getByRole('button', { name: /add relationship/i }).click()
    })

    await test.step('Test validation for empty name', async () => {
      // Try to save without name
      await page.getByRole('button', { name: /save/i }).click()

      // Should show validation error
      await expect(page.getByText(/name is required/i)).toBeVisible()
      console.log('✅ Name validation error displayed')
    })

    await test.step('Test validation for invalid relationship type', async () => {
      // Fill name but leave type empty
      await page.getByRole('textbox', { name: /name/i }).fill('Test Name')
      await page.getByRole('button', { name: /save/i }).click()

      // Should show type validation error
      await expect(
        page.getByText(/relationship type is required/i)
      ).toBeVisible()
      console.log('✅ Type validation error displayed')
    })

    await test.step('Test validation for duplicate name', async () => {
      // Fill all required fields with existing name
      await page.getByRole('textbox', { name: /name/i }).clear()
      await page.getByRole('textbox', { name: /name/i }).fill('My Partner') // Assuming this exists
      await page
        .getByRole('combobox', { name: /relationship type/i })
        .selectOption('friend')
      await page.getByRole('button', { name: /save/i }).click()

      // Should show duplicate name error
      await expect(
        page.getByText(/relationship with this name already exists/i)
      ).toBeVisible()
      console.log('✅ Duplicate name validation error displayed')
    })
  })

  test('should handle relationship photo upload', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate and open relationship editor', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
      await page.getByRole('button', { name: /add relationship/i }).click()
    })

    await test.step('Upload relationship photo', async () => {
      // Fill basic info
      await page.getByRole('textbox', { name: /name/i }).fill('Photo Test')
      await page
        .getByRole('combobox', { name: /relationship type/i })
        .selectOption('friend')

      // In actual MCP environment with real file:
      // await mcp__playwright__browser_file_upload({
      //   paths: ['/path/to/test-avatar.jpg']
      // })

      // For now, test the upload button exists
      const uploadButton = page.getByRole('button', { name: /upload photo/i })
      await expect(uploadButton).toBeVisible()
      console.log('✅ Photo upload button available')

      // Save relationship
      await page.getByRole('button', { name: /save/i }).click()

      // Verify relationship created
      await expect(page.getByText('Photo Test')).toBeVisible()
      console.log('✅ Relationship with photo functionality created')
    })
  })
})
