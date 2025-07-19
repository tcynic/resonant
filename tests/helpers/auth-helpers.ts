import { Page, expect } from '@playwright/test'
import { TestUserType, getTestUserCredentials } from '../accounts/test-user-personas'

/**
 * Authentication helpers for E2E tests using Playwright MCP
 */

export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Sign up a new test user
   */
  async signUpUser(userType: TestUserType): Promise<void> {
    const { email, password } = getTestUserCredentials(userType)
    
    console.log(`🔐 Signing up test user: ${userType} (${email})`)
    
    // Navigate to sign-up page
    await this.page.goto('/sign-up')
    
    // Wait for page to load
    await expect(this.page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    
    // Fill in the form
    await this.page.getByRole('textbox', { name: 'Email address' }).fill(email)
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password)
    
    // Submit the form
    await this.page.getByRole('button', { name: 'Continue' }).click()
    
    // Handle potential email verification step
    await this.handleEmailVerification()
  }

  /**
   * Sign in an existing test user
   */
  async signInUser(userType: TestUserType): Promise<void> {
    const { email, password } = getTestUserCredentials(userType)
    
    console.log(`🔐 Signing in test user: ${userType} (${email})`)
    
    // Navigate to sign-in page
    await this.page.goto('/sign-in')
    
    // Wait for page to load
    await expect(this.page.getByRole('heading', { name: 'Sign in to Resonant' })).toBeVisible()
    
    // Fill in the form
    await this.page.getByRole('textbox', { name: 'Email address' }).fill(email)
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password)
    
    // Submit the form
    await this.page.getByRole('button', { name: 'Continue' }).click()
    
    // Wait for successful authentication
    await this.waitForAuthentication()
  }

  /**
   * Handle email verification step (if required)
   */
  private async handleEmailVerification(): Promise<void> {
    try {
      // Check if we're on the email verification page
      const verificationHeading = this.page.getByRole('heading', { name: 'Verify your email' })
      
      if (await verificationHeading.isVisible({ timeout: 5000 })) {
        console.log('📧 Email verification required')
        
        // For testing, we'll log this requirement
        // In a real test environment, this would need proper email handling
        console.log('⚠️  Email verification step detected - would need test email service integration')
        
        // For now, we'll wait and see if we can proceed
        await this.page.waitForTimeout(2000)
      }
    } catch (error) {
      // Email verification might not be required, continue
      console.log('📧 No email verification required')
    }
    
    await this.waitForAuthentication()
  }

  /**
   * Wait for successful authentication
   */
  private async waitForAuthentication(): Promise<void> {
    try {
      // Wait for redirect to dashboard or main app
      await this.page.waitForURL(/\/(dashboard|journal|relationships)/, { timeout: 30000 })
      console.log('✅ Authentication successful')
    } catch (error) {
      // If we don't get redirected, check current state
      const currentUrl = this.page.url()
      console.log(`⚠️  Authentication state unclear. Current URL: ${currentUrl}`)
      
      // Check if we're still on auth pages
      if (currentUrl.includes('sign-in') || currentUrl.includes('sign-up')) {
        throw new Error('Authentication failed - still on auth page')
      }
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    console.log('🚪 Signing out user')
    
    try {
      // Look for user menu or sign out button
      // This depends on the UI implementation
      const userMenu = this.page.getByRole('button', { name: /user|account|profile/i })
      
      if (await userMenu.isVisible({ timeout: 5000 })) {
        await userMenu.click()
        
        // Look for sign out option
        const signOutButton = this.page.getByRole('button', { name: /sign out|logout/i })
        await signOutButton.click()
      } else {
        // Alternative: directly navigate to sign out endpoint
        await this.page.goto('/sign-out')
      }
      
      // Wait for redirect to landing page
      await this.page.waitForURL('/', { timeout: 10000 })
      console.log('✅ Sign out successful')
      
    } catch (error) {
      console.warn('⚠️  Sign out failed, continuing with test')
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const currentUrl = this.page.url()
    
    // If we're on auth pages, we're not authenticated
    if (currentUrl.includes('sign-in') || currentUrl.includes('sign-up')) {
      return false
    }
    
    // If we're on protected routes, we should be authenticated
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/journal') || currentUrl.includes('/relationships')) {
      return true
    }
    
    // Try to access a protected route to test authentication
    try {
      await this.page.goto('/dashboard')
      await this.page.waitForTimeout(2000)
      
      const finalUrl = this.page.url()
      return !finalUrl.includes('sign-in')
    } catch (error) {
      return false
    }
  }

  /**
   * Ensure user is authenticated (sign in if needed)
   */
  async ensureAuthenticated(userType: TestUserType): Promise<void> {
    if (!(await this.isAuthenticated())) {
      await this.signInUser(userType)
    }
  }

  /**
   * Ensure user is not authenticated (sign out if needed)
   */
  async ensureNotAuthenticated(): Promise<void> {
    if (await this.isAuthenticated()) {
      await this.signOut()
    }
  }
}