/**
 * Browser Helper
 *
 * Provides a helper class for common Playwright browser actions in tests
 * This helper abstracts common patterns for easier test writing
 */

import { Page } from '@playwright/test'

/**
 * Browser Helper interface for test automation
 * This class provides methods that work with standard Playwright
 */
export class BrowserHelper {
  private baseURL: string
  private page: Page

  constructor(page: Page, baseURL: string = 'http://localhost:3000') {
    this.page = page
    this.baseURL = baseURL
  }

  /**
   * Navigate to a URL
   */
  async navigate(path: string): Promise<void> {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`
    console.log(`🌐 Navigate: ${url}`)
    await this.page.goto(url)
  }

  /**
   * Take a screenshot of the current page
   */
  async screenshot(path?: string): Promise<Buffer> {
    console.log('📸 Taking screenshot')
    const screenshotPath = path || `test-results/screenshot-${Date.now()}.png`
    return await this.page.screenshot({ path: screenshotPath })
  }

  /**
   * Take a snapshot (alias for screenshot for backwards compatibility)
   */
  async snapshot(path?: string): Promise<Buffer> {
    return await this.screenshot(path)
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    console.log(`👆 Click: ${selector}`)
    await this.page.click(selector)
  }

  /**
   * Type text into an element
   */
  async type(selector: string, text: string): Promise<void> {
    console.log(`⌨️  Type: ${selector} = "${text}"`)
    await this.page.fill(selector, text)
  }

  /**
   * Wait for an element to be visible
   */
  async waitForElement(
    selector: string,
    timeout: number = 30000
  ): Promise<void> {
    console.log(`⏳ Wait for element: ${selector}`)
    await this.page.waitForSelector(selector, { timeout })
  }

  /**
   * Get current URL
   */
  async getCurrentURL(): Promise<string> {
    console.log('🔗 Get current URL')
    return this.page.url()
  }

  /**
   * Check if element exists and is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    console.log(`👁️  Check visibility: ${selector}`)
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 })
      return await this.page.isVisible(selector)
    } catch {
      return false
    }
  }

  /**
   * Navigate to sign-in page
   */
  async navigateToSignIn(): Promise<void> {
    console.log('🔐 Navigate to Sign-In')
    await this.page.goto('/sign-in')
  }

  /**
   * Sign in a user with email and password
   */
  async signInUser(email: string, password: string): Promise<void> {
    console.log(`🔑 Sign In User: ${email}`)
    await this.page.fill(
      'input[type="email"], input[name="email"], #email',
      email
    )
    await this.page.fill(
      'input[type="password"], input[name="password"], #password',
      password
    )
    await this.page.click(
      'button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")'
    )
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthentication(): Promise<void> {
    console.log('⏳ Wait for Authentication')
    // Wait for redirect away from auth pages
    await this.page.waitForURL(/^(?!.*\/(sign-in|sign-up)).*$/, {
      timeout: 15000,
    })
  }
}

// Export class alias for backwards compatibility
export { BrowserHelper as MCPBrowserHelper }

/**
 * Factory function to create browser helper
 */
export function createBrowserHelper(
  page: Page,
  baseURL?: string
): BrowserHelper {
  return new BrowserHelper(page, baseURL || 'http://localhost:3000')
}

/**
 * Legacy factory function for backwards compatibility
 */
export function createMCPBrowser(page: Page, baseURL?: string): BrowserHelper {
  return createBrowserHelper(page, baseURL)
}

/**
 * Legacy test utility function for backwards compatibility
 */
export function withMCPBrowser(
  testFn: (browser: BrowserHelper) => Promise<void>
) {
  return async (page: Page) => {
    const browser = createBrowserHelper(page, process.env.PLAYWRIGHT_BASE_URL)
    await testFn(browser)
  }
}
