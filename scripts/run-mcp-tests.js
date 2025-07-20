#!/usr/bin/env node

/**
 * Script to run E2E tests using Playwright MCP
 * 
 * This script sets up the environment and provides instructions
 * for running tests with the MCP browser tools
 */

const path = require('path')
const fs = require('fs')

// Check if running in MCP environment
const isMCPEnvironment = () => {
  // Check for MCP-specific environment variables or indicators
  return process.env.MCP_BROWSER_ENABLED === 'true' || 
         process.env.PLAYWRIGHT_MCP_ENABLED === 'true'
}

// Load test environment
require('dotenv').config({ path: '.env.test' })

console.log('🧪 Resonant E2E Test Runner (MCP Mode)')
console.log('=====================================\n')

// Check environment
console.log('🔍 Environment Check:')
console.log(`- Base URL: ${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}`)
console.log(`- MCP Enabled: ${isMCPEnvironment() ? 'Yes ✅' : 'No ❌'}`)
console.log(`- Node Environment: ${process.env.NODE_ENV || 'test'}`)

if (!isMCPEnvironment()) {
  console.log('\n⚠️  MCP Browser tools not detected!')
  console.log('\n📋 To run MCP tests with Claude Code:')
  console.log('\n1. Make sure you have the Playwright MCP server configured')
  console.log('2. Use Claude Code to execute the test functions directly:')
  console.log('\n   Example commands to run in Claude Code:')
  console.log('   - Navigate to a URL: await mcp__playwright__browser_navigate({ url: "http://localhost:3000" })')
  console.log('   - Take a snapshot: await mcp__playwright__browser_snapshot()')
  console.log('   - Type text: await mcp__playwright__browser_type({ element: "input", ref: "input[type=email]", text: "test@example.com" })')
  console.log('   - Click element: await mcp__playwright__browser_click({ element: "button", ref: "button[type=submit]" })')
  console.log('\n3. Or import and run the test functions:')
  console.log('   const { runAllMCPTests } = require("./tests/e2e/mcp-demo.test.ts")')
  console.log('   await runAllMCPTests()')
  console.log('\n📚 Test files available:')
  console.log('   - tests/e2e/mcp-demo.test.ts (Simple MCP test examples)')
  console.log('   - tests/helpers/mcp-browser-runner.ts (Full test suite)')
  console.log('   - tests/e2e/auth/*.test.ts (Authentication tests)')
  console.log('   - tests/e2e/user-journeys/*.test.ts (User journey tests)')
  console.log('   - tests/e2e/advanced-features/*.test.ts (Advanced feature tests)')
} else {
  console.log('\n✅ MCP Browser tools detected!')
  console.log('\n🚀 Ready to run tests with MCP browser automation')
  console.log('\nUse the following functions to run tests:')
  console.log('- runAuthenticationTest() - Test user sign-in')
  console.log('- runJournalCreationTest() - Test journal entry creation')
  console.log('- runAllMCPTests() - Run all tests')
}

console.log('\n📖 Documentation:')
console.log('- MCP Integration Guide: tests/README-MCP-Integration.md')
console.log('- Test User Personas: tests/accounts/test-user-personas.ts')
console.log('- Test Data Factory: tests/fixtures/test-data-factory.ts')

console.log('\n💡 Tips:')
console.log('- Make sure the development server is running (npm run dev)')
console.log('- Ensure Convex is running (npm run convex:dev)')
console.log('- Test accounts are automatically created during test setup')
console.log('- Use test.resonant.local domain for test isolation')

// Export helper function for direct use
module.exports = {
  runMCPTests: async () => {
    console.log('\n🎯 Starting MCP test execution...\n')
    
    try {
      // Dynamically import the test module
      const { runAllMCPTests } = require('../tests/e2e/mcp-demo.test.ts')
      const results = await runAllMCPTests()
      return results
    } catch (error) {
      console.error('❌ Failed to run MCP tests:', error)
      throw error
    }
  }
}

// If running as a script
if (require.main === module) {
  console.log('\n💡 This script provides guidance for running MCP tests.')
  console.log('To execute tests, use Claude Code with the MCP browser tools.')
}