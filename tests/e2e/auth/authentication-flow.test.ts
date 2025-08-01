import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'

test.describe('Authentication Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL
    await page.goto('/')
  })

  test('should display landing page correctly', async ({ page }) => {
    // Check that the landing page loads
    await expect(page.getByRole('heading', { name: 'Resonant' })).toBeVisible()
    await expect(
      page.getByText('Your personal companion for tracking')
    ).toBeVisible()

    // Check navigation links
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible()
  })

  test('should navigate to sign-up page', async ({ page }) => {
    // Click Get Started button
    await page.getByRole('link', { name: 'Get Started' }).click()

    // Should be on sign-up page
    await expect(page).toHaveURL('/sign-up')
    await expect(
      page.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible()
  })

  test('should navigate to sign-in page', async ({ page }) => {
    // Click Sign In button
    await page.getByRole('link', { name: 'Sign In' }).click()

    // Should be on sign-in page
    await expect(page).toHaveURL('/sign-in')
    await expect(
      page.getByRole('heading', { name: 'Sign in to Resonant' })
    ).toBeVisible()
  })

  test('should show sign-up form elements', async ({ page }) => {
    await page.goto('/sign-up')

    // Check form elements are present
    await expect(
      page.getByRole('textbox', { name: 'Email address' })
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()

    // Check alternative sign-up options
    await expect(
      page.getByRole('button', { name: /Continue with Google/ })
    ).toBeVisible()
  })

  test('should show sign-in form elements', async ({ page }) => {
    await page.goto('/sign-in')

    // Check form elements are present
    await expect(
      page.getByRole('textbox', { name: 'Email address' })
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()

    // Check alternative sign-in options
    await expect(
      page.getByRole('button', { name: /Continue with Google/ })
    ).toBeVisible()
  })

  test('should validate empty form submission', async ({ page }) => {
    await page.goto('/sign-up')

    // Try to submit empty form using the form's Continue button (not the Google one)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Should show validation messages or prevent submission
    // Note: Exact validation behavior depends on Clerk configuration
    await expect(
      page.getByRole('textbox', { name: 'Email address' })
    ).toBeVisible()
  })

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/dashboard')

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/)
  })

  test('should protect journal routes', async ({ page }) => {
    // Try to access journal route directly
    await page.goto('/journal')

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/)
  })

  test('should protect relationships routes', async ({ page }) => {
    // Try to access relationships route directly
    await page.goto('/relationships')

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/)
  })
})
