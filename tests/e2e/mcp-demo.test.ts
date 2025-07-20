/**
 * MCP Browser Automation Demo Test
 *
 * This test demonstrates how to use Playwright MCP browser tools
 * for E2E testing of the Resonant application
 */

import { getTestUserCredentials } from '../accounts/test-user-personas'

// Configuration
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

/**
 * Example test that demonstrates MCP browser automation
 * This function can be called directly by Claude Code to run E2E tests
 */
export async function runAuthenticationTest() {
  console.log('🚀 Starting MCP authentication test')
  console.log(`📍 Testing against: ${baseURL}`)

  try {
    // Step 1: Navigate to sign-in page
    console.log('\n1️⃣ Navigating to sign-in page...')
    await mcp__playwright__browser_navigate({ url: `${baseURL}/sign-in` })

    // Step 2: Take initial snapshot
    console.log('\n2️⃣ Taking snapshot of sign-in page...')
    const initialSnapshot = await mcp__playwright__browser_snapshot()
    console.log('✅ Sign-in page loaded')

    // Step 3: Get test user credentials
    const { email, password } = getTestUserCredentials('activeUser')
    console.log(`\n3️⃣ Using test user: ${email}`)

    // Step 4: Fill in email field
    console.log('\n4️⃣ Filling email field...')
    await mcp__playwright__browser_type({
      element: 'email input field',
      ref: 'input[type="email"]',
      text: email,
    })

    // Step 5: Fill in password field
    console.log('\n5️⃣ Filling password field...')
    await mcp__playwright__browser_type({
      element: 'password input field',
      ref: 'input[type="password"]',
      text: password,
    })

    // Step 6: Click sign-in button
    console.log('\n6️⃣ Clicking sign-in button...')
    await mcp__playwright__browser_click({
      element: 'sign in button',
      ref: 'button[type="submit"]',
    })

    // Step 7: Wait for authentication
    console.log('\n7️⃣ Waiting for authentication to complete...')
    await mcp__playwright__browser_wait_for({
      text: 'Dashboard',
      time: 5, // Wait up to 5 seconds
    })

    // Step 8: Verify we're on dashboard
    console.log('\n8️⃣ Taking snapshot of dashboard...')
    const dashboardSnapshot = await mcp__playwright__browser_snapshot()

    console.log('\n✅ Authentication test completed successfully!')
    console.log('🎉 User is now logged in and viewing the dashboard')

    return { success: true, message: 'Authentication test passed' }
  } catch (error) {
    console.error('\n❌ Test failed:', error)

    // Take error snapshot
    try {
      console.log('📸 Taking error snapshot...')
      await mcp__playwright__browser_snapshot()
    } catch (snapshotError) {
      console.log('Could not capture error snapshot')
    }

    return {
      success: false,
      message: `Authentication test failed: ${error}`,
      error,
    }
  }
}

/**
 * Test journal entry creation
 */
export async function runJournalCreationTest() {
  console.log('\n🚀 Starting journal creation test')

  try {
    // Navigate to new journal entry
    console.log('1️⃣ Navigating to new journal entry...')
    await mcp__playwright__browser_navigate({ url: `${baseURL}/journal/new` })

    // Wait for form
    await mcp__playwright__browser_wait_for({ text: 'Journal Entry' })

    // Fill in the form
    console.log('2️⃣ Filling journal entry form...')

    // Title
    await mcp__playwright__browser_type({
      element: 'title input',
      ref: 'input[name="title"]',
      text: 'MCP Test Journal Entry',
    })

    // Content
    await mcp__playwright__browser_type({
      element: 'content textarea',
      ref: 'textarea[name="content"]',
      text: 'This journal entry was created using Playwright MCP browser automation. Testing the E2E flow!',
    })

    // Select mood - click happy mood
    console.log('3️⃣ Selecting mood...')
    await mcp__playwright__browser_click({
      element: 'happy mood button',
      ref: 'button[aria-label="happy"]',
    })

    // Take snapshot before saving
    console.log('4️⃣ Taking snapshot before save...')
    await mcp__playwright__browser_snapshot()

    // Save the entry
    console.log('5️⃣ Saving journal entry...')
    await mcp__playwright__browser_click({
      element: 'save button',
      ref: 'button[type="submit"]',
    })

    // Wait for success
    await mcp__playwright__browser_wait_for({
      text: 'saved',
      time: 5,
    })

    console.log('\n✅ Journal entry created successfully!')
    return { success: true, message: 'Journal creation test passed' }
  } catch (error) {
    console.error('\n❌ Journal creation test failed:', error)
    return {
      success: false,
      message: `Journal creation test failed: ${error}`,
      error,
    }
  }
}

/**
 * Run all MCP tests
 */
export async function runAllMCPTests() {
  console.log('🎯 Running all MCP E2E tests\n')

  const results = []

  // Run authentication test
  const authResult = await runAuthenticationTest()
  results.push({ test: 'Authentication', ...authResult })

  // If auth passed, run journal test
  if (authResult.success) {
    const journalResult = await runJournalCreationTest()
    results.push({ test: 'Journal Creation', ...journalResult })
  }

  // Print summary
  console.log('\n📊 Test Summary:')
  console.log('================')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.test}: ${result.message}`)
  })

  const passed = results.filter(r => r.success).length
  const total = results.length
  console.log(`\nTotal: ${passed}/${total} tests passed`)

  return results
}
