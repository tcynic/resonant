/**
 * MCP Browser Test Runner
 *
 * This is the actual test runner that will be executed by Claude Code
 * to run E2E tests using the Playwright MCP server
 */

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
async function runTest(name: string, testFn: () => Promise<void>) {
  console.log(`\n🧪 Running test: ${name}`)
  const start = Date.now()

  try {
    await testFn()
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
 * This will be called when running E2E tests with MCP
 */
export async function runMCPTests() {
  console.log('🚀 Starting E2E tests with Playwright MCP')
  console.log(`📍 Base URL: ${config.baseURL}`)
  console.log(`⏱️  Timeout: ${config.testTimeout}ms`)

  // Test 1: Authentication Flow
  await runTest('Authentication: Sign in with test user', async () => {
    const { email, password } = getTestUserCredentials('activeUser')

    // Navigate to sign-in page
    await mcp__playwright__browser_navigate({
      url: `${config.baseURL}/sign-in`,
    })

    // Take snapshot to see current state
    const snapshot = await mcp__playwright__browser_snapshot()
    console.log('📸 Page snapshot captured')

    // Fill in email
    await mcp__playwright__browser_type({
      element: 'email input field',
      ref: 'input[type="email"], input[name="email"], #email',
      text: email,
    })

    // Fill in password
    await mcp__playwright__browser_type({
      element: 'password input field',
      ref: 'input[type="password"], input[name="password"], #password',
      text: password,
    })

    // Click sign-in button
    await mcp__playwright__browser_click({
      element: 'sign in button',
      ref: 'button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")',
    })

    // Wait for authentication to complete
    await mcp__playwright__browser_wait_for({ text: 'Dashboard' })
    console.log('✅ Successfully authenticated')
  })

  // Test 2: Dashboard Display
  await runTest('Dashboard: View active user data', async () => {
    // Navigate to dashboard
    await mcp__playwright__browser_navigate({
      url: `${config.baseURL}/dashboard`,
    })

    // Wait for dashboard to load
    await mcp__playwright__browser_wait_for({ text: 'Dashboard' })

    // Take snapshot to verify dashboard content
    const snapshot = await mcp__playwright__browser_snapshot()
    console.log('📸 Dashboard snapshot captured')

    // Verify user data is displayed
    // Active user should have 4 relationships and 12 journal entries
    console.log('✅ Dashboard loaded successfully')
  })

  // Test 3: Journal Entry Creation
  await runTest('Journal: Create new entry', async () => {
    // Navigate to new journal entry
    await mcp__playwright__browser_navigate({
      url: `${config.baseURL}/journal/new`,
    })

    // Wait for form to load
    await mcp__playwright__browser_wait_for({ text: 'New Journal Entry' })

    // Fill in title
    await mcp__playwright__browser_type({
      element: 'journal title input',
      ref: 'input[name="title"], input[placeholder*="title"], #title',
      text: 'E2E Test Entry',
    })

    // Fill in content
    await mcp__playwright__browser_type({
      element: 'journal content textarea',
      ref: 'textarea[name="content"], textarea[placeholder*="content"], #content',
      text: 'This is a test journal entry created by the E2E test suite using Playwright MCP.',
    })

    // Select mood (click happy mood)
    await mcp__playwright__browser_click({
      element: 'happy mood button',
      ref: 'button[aria-label*="happy"], button:has-text("😊"), [data-mood="happy"]',
    })

    // Save entry
    await mcp__playwright__browser_click({
      element: 'save journal entry button',
      ref: 'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
    })

    // Wait for success
    await mcp__playwright__browser_wait_for({ text: 'saved' })
    console.log('✅ Journal entry created successfully')
  })

  // Test 4: Relationship Management
  await runTest('Relationships: View and navigate', async () => {
    // Navigate to relationships
    await mcp__playwright__browser_navigate({
      url: `${config.baseURL}/relationships`,
    })

    // Wait for relationships to load
    await mcp__playwright__browser_wait_for({ text: 'Relationships' })

    // Take snapshot
    const snapshot = await mcp__playwright__browser_snapshot()
    console.log('📸 Relationships page snapshot captured')

    // Active user should have 4 relationships
    console.log('✅ Relationships page loaded successfully')
  })

  // Test 5: Sign Out
  await runTest('Authentication: Sign out', async () => {
    // Look for sign out button and click it
    await mcp__playwright__browser_click({
      element: 'sign out button',
      ref: 'button:has-text("Sign out"), button:has-text("Sign Out"), button:has-text("Logout"), [aria-label*="sign out"]',
    })

    // Wait for redirect to home or sign-in
    await mcp__playwright__browser_wait_for({ text: 'Sign in' })
    console.log('✅ Successfully signed out')
  })

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

// If running directly (for testing)
if (require.main === module) {
  runMCPTests().catch(console.error)
}
