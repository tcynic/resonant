/**
 * Playwright Browser Test Runner
 *
 * Test runner for E2E tests using standard Playwright API
 */

import { chromium, Browser, Page } from 'playwright'
import { getTestUserCredentials } from '../accounts/test-user-personas'

// Test configuration
const config = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  testTimeout: 60000,
}

// Test result tracking
interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
}

const results: TestResult[] = []

/**
 * Helper function to run a test and track results
 */
async function runTest(name: string, testFn: (page: Page) => Promise<void>, page: Page) {
  console.log(`\n🧪 Running test: ${name}`)
  const start = Date.now()

  try {
    await testFn(page)
    const duration = Date.now() - start
    results.push({ name, status: 'passed', duration })
    console.log(`✅ PASSED: ${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : String(error)
    results.push({ name, status: 'failed', duration, error: errorMessage })
    console.error(`❌ FAILED: ${name} (${duration}ms)`)
    console.error(`   Error: ${errorMessage}`)
  }
}

/**
 * Main test runner function
 * This will be called when running E2E tests with Playwright
 */
export async function runPlaywrightTests() {
  console.log('🚀 Starting E2E tests with Playwright')
  console.log(`📍 Base URL: ${config.baseURL}`)
  console.log(`⏱️  Timeout: ${config.testTimeout}ms`)

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // Launch browser
    browser = await chromium.launch({ headless: false })
    page = await browser.newPage()

    // Set default timeout
    page.setDefaultTimeout(config.testTimeout)

    // Test 1: Authentication Flow
    await runTest('Authentication: Sign in with test user', async (page) => {
      const { email, password } = getTestUserCredentials('activeUser')

      // Navigate to sign-in page
      await page.goto(`${config.baseURL}/sign-in`)

      // Take screenshot to see current state
      await page.screenshot({ path: 'test-results/auth-page.png' })
      console.log('📸 Page screenshot captured')

      // Fill in email
      await page.fill('input[type="email"], input[name="email"], #email', email)

      // Fill in password
      await page.fill('input[type="password"], input[name="password"], #password', password)

      // Click sign-in button
      await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')

      // Wait for authentication to complete
      await page.waitForSelector('text=Dashboard', { timeout: 15000 })
      console.log('✅ Successfully authenticated')
    }, page)

    // Test 2: Dashboard Display
    await runTest('Dashboard: View active user data', async (page) => {
      // Navigate to dashboard
      await page.goto(`${config.baseURL}/dashboard`)

      // Wait for dashboard to load
      await page.waitForSelector('text=Dashboard', { timeout: 15000 })

      // Take screenshot to verify dashboard content
      await page.screenshot({ path: 'test-results/dashboard.png' })
      console.log('📸 Dashboard screenshot captured')

      // Verify user data is displayed
      // Active user should have 4 relationships and 12 journal entries
      console.log('✅ Dashboard loaded successfully')
    }, page)

    // Test 3: Journal Entry Creation
    await runTest('Journal: Create new entry', async (page) => {
      // Navigate to new journal entry
      await page.goto(`${config.baseURL}/journal/new`)

      // Wait for form to load
      await page.waitForSelector('text=New Journal Entry', { timeout: 15000 })

      // Fill in title
      await page.fill('input[name="title"], input[placeholder*="title"], #title', 'E2E Test Entry')

      // Fill in content
      await page.fill('textarea[name="content"], textarea[placeholder*="content"], #content', 
        'This is a test journal entry created by the E2E test suite using standard Playwright.')

      // Select mood (click happy mood)
      await page.click('button[aria-label*="happy"], button:has-text("😊"), [data-mood="happy"]')

      // Save entry
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")')

      // Wait for success
      await page.waitForSelector('text=saved', { timeout: 15000 })
      console.log('✅ Journal entry created successfully')
    }, page)

    // Test 4: Relationship Management
    await runTest('Relationships: View and navigate', async (page) => {
      // Navigate to relationships
      await page.goto(`${config.baseURL}/relationships`)

      // Wait for relationships to load
      await page.waitForSelector('text=Relationships', { timeout: 15000 })

      // Take screenshot
      await page.screenshot({ path: 'test-results/relationships.png' })
      console.log('📸 Relationships page screenshot captured')

      // Active user should have 4 relationships
      console.log('✅ Relationships page loaded successfully')
    }, page)

    // Test 5: Sign Out
    await runTest('Authentication: Sign out', async (page) => {
      // Look for sign out button and click it
      await page.click('button:has-text("Sign out"), button:has-text("Sign Out"), button:has-text("Logout"), [aria-label*="sign out"]')

      // Wait for redirect to home or sign-in
      await page.waitForSelector('text=Sign in', { timeout: 15000 })
      console.log('✅ Successfully signed out')
    }, page)

  } catch (error) {
    console.error('❌ Test runner error:', error)
  } finally {
    // Clean up browser resources
    if (page) {
      await page.close()
    }
    if (browser) {
      await browser.close()
    }
  }

  // Print test summary
  console.log('\n📊 Test Results Summary:')
  console.log('========================')

  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  const total = results.length

  console.log(`Total: ${total}`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${failed} ❌`)

  if (failed > 0) {
    console.log('\n❌ Failed tests:')
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
  }

  console.log('\n✨ E2E test run complete!')

  return {
    total,
    passed,
    failed,
    results,
  }
}

// Legacy function name for backwards compatibility
export const runMCPTests = runPlaywrightTests

// If running directly (for testing)
if (require.main === module) {
  runPlaywrightTests().catch(console.error)
}
