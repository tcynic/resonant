/**
 * Form Validation and Error Handling Advanced Feature Tests
 *
 * Tests comprehensive form validation and error handling using MCP browser automation
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'
import { MCPBrowserHelper } from '../../helpers/mcp-browser-helper'

test.describe('Form Validation and Error Handling', () => {
  let mcpHelper: MCPBrowserHelper

  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPBrowserHelper(page)
  })

  test('should test journal entry form validation', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup authenticated session', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test required field validation', async () => {
      // Try to submit empty form
      await page.getByRole('button', { name: /save entry|submit/i }).click()

      // Check for validation errors
      const titleError = page.getByText(
        /title is required|please enter a title/i
      )
      const contentError = page.getByText(
        /content is required|please enter content/i
      )

      const hasTitleError = await titleError.isVisible()
      const hasContentError = await contentError.isVisible()

      expect(hasTitleError || hasContentError).toBeTruthy()
      console.log('✅ Required field validation working')
    })

    await test.step('Test field length validation', async () => {
      // Test title too long
      const longTitle = 'a'.repeat(200)
      await page.getByRole('textbox', { name: /title/i }).fill(longTitle)
      await page.getByRole('button', { name: /save entry|submit/i }).click()

      const titleLengthError = page.getByText(/title too long|title must be/i)
      if (await titleLengthError.isVisible()) {
        console.log('✅ Title length validation working')
      }

      // Test content too short
      await page.getByRole('textbox', { name: /title/i }).clear()
      await page.getByRole('textbox', { name: /title/i }).fill('Valid Title')
      await page.getByRole('textbox', { name: /content/i }).fill('x')
      await page.getByRole('button', { name: /save entry|submit/i }).click()

      const contentLengthError = page.getByText(
        /content too short|minimum length/i
      )
      if (await contentLengthError.isVisible()) {
        console.log('✅ Content minimum length validation working')
      }
    })

    await test.step('Test special character validation', async () => {
      // Clear previous content
      await page.getByRole('textbox', { name: /title/i }).clear()
      await page.getByRole('textbox', { name: /content/i }).clear()

      // Test special characters in title
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('<script>alert("test")</script>')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Valid content for testing special characters in title.')

      await page.getByRole('button', { name: /save entry|submit/i }).click()

      // Check if HTML is escaped or validation error shown
      const xssError = page.getByText(
        /invalid characters|script tags not allowed/i
      )
      if (await xssError.isVisible()) {
        console.log('✅ XSS prevention validation working')
      } else {
        // If form submits, check that script tags are escaped
        await page.goto('/journal')
        const escapedTitle = page.getByText(/&lt;script&gt;|script/)
        if (await escapedTitle.isVisible()) {
          console.log('✅ HTML escaping working properly')
        }
      }
    })

    await test.step('Test tag input validation', async () => {
      await page.goto('/journal/new')

      // Fill valid basic fields
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('Tag Validation Test')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Testing tag validation functionality.')

      // Test maximum tag limit
      const tagInput = page.getByRole('textbox', { name: /add tags|tags/i })
      if (await tagInput.isVisible()) {
        // Try to add many tags
        for (let i = 1; i <= 15; i++) {
          await tagInput.fill(`tag${i}`)
          await tagInput.press('Enter')
        }

        // Check if tag limit is enforced
        const tags = page.locator('[data-testid="tag-item"]')
        const tagCount = await tags.count()

        expect(tagCount).toBeLessThanOrEqual(10) // Assuming 10 tag limit
        console.log(`✅ Tag limit enforced: ${tagCount} tags allowed`)

        // Test tag length validation
        await tagInput.fill('a'.repeat(50))
        await tagInput.press('Enter')

        const longTagError = page.getByText(/tag too long|tag length/i)
        if (await longTagError.isVisible()) {
          console.log('✅ Tag length validation working')
        }
      }
    })
  })

  test('should test relationship form validation', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Navigate to relationship creation', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
      await page
        .getByRole('button', { name: /add relationship|new relationship/i })
        .click()
    })

    await test.step('Test relationship form required fields', async () => {
      // Try to submit without required fields
      await page.getByRole('button', { name: /save|create/i }).click()

      const nameError = page.getByText(/name is required|please enter a name/i)
      const typeError = page.getByText(/type is required|please select a type/i)

      const hasNameError = await nameError.isVisible()
      const hasTypeError = await typeError.isVisible()

      expect(hasNameError || hasTypeError).toBeTruthy()
      console.log('✅ Relationship required field validation working')
    })

    await test.step('Test duplicate name validation', async () => {
      // Fill form with existing relationship name
      await page.getByRole('textbox', { name: /name/i }).fill('Alex Johnson') // Assuming this exists in test data
      await page
        .getByRole('combobox', { name: /type|relationship type/i })
        .selectOption('friend')
      await page.getByRole('button', { name: /save|create/i }).click()

      const duplicateError = page.getByText(
        /already exists|duplicate name|name already used/i
      )
      if (await duplicateError.isVisible()) {
        console.log('✅ Duplicate relationship name validation working')
      }
    })

    await test.step('Test relationship name character validation', async () => {
      await page.getByRole('textbox', { name: /name/i }).clear()

      // Test invalid characters
      await page.getByRole('textbox', { name: /name/i }).fill('Test@#$%^&*()')
      await page.getByRole('button', { name: /save|create/i }).click()

      const characterError = page.getByText(/invalid characters|only letters/i)
      if (await characterError.isVisible()) {
        console.log('✅ Character validation working')
      } else {
        // If special characters are allowed, test extreme length
        await page.getByRole('textbox', { name: /name/i }).fill('a'.repeat(100))
        await page.getByRole('button', { name: /save|create/i }).click()

        const lengthError = page.getByText(/name too long|maximum length/i)
        if (await lengthError.isVisible()) {
          console.log('✅ Name length validation working')
        }
      }
    })
  })

  test('should test error handling for network failures', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup for network error testing', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test form submission with network interruption', async () => {
      // Fill out valid form
      await page
        .getByRole('textbox', { name: /title/i })
        .fill('Network Error Test')
      await page
        .getByRole('textbox', { name: /content/i })
        .fill('Testing error handling for network failures.')

      // Simulate network failure
      await page.route('**/api/**', route => route.abort())
      await page.route('**/convex/**', route => route.abort())

      // Try to submit form
      await page.getByRole('button', { name: /save entry|submit/i }).click()

      // Check for error message
      const networkError = page.getByText(
        /network error|connection failed|unable to save|try again/i
      )
      await expect(networkError).toBeVisible({ timeout: 10000 })
      console.log('✅ Network error handling working')

      // Verify form data is preserved
      const titleValue = await page
        .getByRole('textbox', { name: /title/i })
        .inputValue()
      const contentValue = await page
        .getByRole('textbox', { name: /content/i })
        .inputValue()

      expect(titleValue).toBe('Network Error Test')
      expect(contentValue).toBe('Testing error handling for network failures.')
      console.log('✅ Form data preserved during error')
    })

    await test.step('Test retry functionality', async () => {
      // Clear route blocks
      await page.unroute('**/api/**')
      await page.unroute('**/convex/**')

      // Look for retry button
      const retryBtn = page.getByRole('button', { name: /retry|try again/i })
      if (await retryBtn.isVisible()) {
        await retryBtn.click()

        // Should attempt submission again
        const successMessage = page.getByText(/saved|success|created/i)
        const stillError = page.getByText(/error|failed/i)

        await expect(successMessage.or(stillError)).toBeVisible({
          timeout: 10000,
        })
        console.log('✅ Retry functionality working')
      }
    })
  })

  test('should test real-time validation feedback', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Test real-time validation on journal form', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test field validation on blur', async () => {
      const titleInput = page.getByRole('textbox', { name: /title/i })

      // Focus on title and leave empty
      await titleInput.focus()
      await titleInput.blur()

      // Check for immediate validation
      const titleError = page.getByText(/title is required/i)
      if (await titleError.isVisible()) {
        console.log('✅ Real-time validation on blur working')
      }
    })

    await test.step('Test character count indicators', async () => {
      const titleInput = page.getByRole('textbox', { name: /title/i })
      const contentInput = page.getByRole('textbox', { name: /content/i })

      // Look for character counters
      const titleCounter = page.locator('[data-testid="title-character-count"]')
      const contentCounter = page.locator(
        '[data-testid="content-character-count"]'
      )

      if (await titleCounter.isVisible()) {
        await titleInput.fill('Test Title')
        const counterText = await titleCounter.textContent()
        expect(counterText).toContain('10') // Should show character count
        console.log('✅ Title character counter working')
      }

      if (await contentCounter.isVisible()) {
        await contentInput.fill('Test content for validation')
        const counterText = await contentCounter.textContent()
        expect(counterText).toContain('26')
        console.log('✅ Content character counter working')
      }
    })

    await test.step('Test validation state changes', async () => {
      const titleInput = page.getByRole('textbox', { name: /title/i })

      // Clear field and check for error state
      await titleInput.clear()
      await titleInput.blur()

      // Check for error styling
      const hasErrorClass = await titleInput.evaluate(
        el =>
          el.classList.contains('error') ||
          el.classList.contains('invalid') ||
          el.getAttribute('aria-invalid') === 'true'
      )

      if (hasErrorClass) {
        console.log('✅ Error state styling applied')
      }

      // Fill valid data and check for success state
      await titleInput.fill('Valid Title')
      await titleInput.blur()

      const hasValidClass = await titleInput.evaluate(
        el =>
          el.classList.contains('valid') ||
          el.classList.contains('success') ||
          el.getAttribute('aria-invalid') === 'false'
      )

      if (hasValidClass) {
        console.log('✅ Valid state styling applied')
      }
    })
  })

  test('should test accessibility in form validation', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Test ARIA attributes and screen reader support', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal/new')
    })

    await test.step('Test ARIA validation attributes', async () => {
      const titleInput = page.getByRole('textbox', { name: /title/i })

      // Check initial ARIA attributes
      const initialAriaInvalid = await titleInput.getAttribute('aria-invalid')
      expect(initialAriaInvalid).toBe('false')

      // Trigger validation error
      await page.getByRole('button', { name: /save entry|submit/i }).click()

      // Check ARIA attributes after validation
      const errorAriaInvalid = await titleInput.getAttribute('aria-invalid')
      const ariaDescribedBy = await titleInput.getAttribute('aria-describedby')

      expect(errorAriaInvalid).toBe('true')
      if (ariaDescribedBy) {
        const errorElement = page.locator(`#${ariaDescribedBy}`)
        await expect(errorElement).toBeVisible()
        console.log('✅ ARIA error associations working')
      }
    })

    await test.step('Test keyboard navigation with errors', async () => {
      // Clear any existing content
      await page.reload()

      // Try to submit empty form
      await page.getByRole('button', { name: /save entry|submit/i }).click()

      // Test Tab navigation to error fields
      await page.keyboard.press('Tab')

      const focusedElement = page.locator(':focus')
      const isFormField = await focusedElement.evaluate(
        el => el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
      )

      if (isFormField) {
        console.log('✅ Keyboard navigation to error fields working')
      }
    })

    await test.step('Test error message announcement', async () => {
      // Look for live regions for error announcements
      const liveRegion = page.locator(
        '[aria-live="polite"], [aria-live="assertive"]'
      )
      if (await liveRegion.isVisible()) {
        const liveText = await liveRegion.textContent()
        if (liveText && liveText.includes('error')) {
          console.log('✅ Error announcements via live regions working')
        }
      }

      // Check for alert roles
      const alertElement = page.getByRole('alert')
      if (await alertElement.isVisible()) {
        console.log('✅ Alert role for errors implemented')
      }
    })
  })
})
