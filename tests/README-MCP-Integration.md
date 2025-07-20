# MCP Browser Integration for E2E Testing

## Overview

This project is configured to run Playwright E2E tests using the MCP (Model Context Protocol) browser server through Claude Code. This setup enables running browser automation tests without local browser installations.

## Quick Start

### Running Tests with Claude Code

1. **Simple Test Example**:
   ```javascript
   // Navigate to the app
   await mcp__playwright__browser_navigate({ url: "http://localhost:3000" })
   
   // Take a snapshot
   await mcp__playwright__browser_snapshot()
   
   // Fill and submit a form
   await mcp__playwright__browser_type({
     element: "email input",
     ref: "input[type='email']",
     text: "test@example.com"
   })
   
   await mcp__playwright__browser_click({
     element: "submit button",
     ref: "button[type='submit']"
   })
   ```

2. **Run the Demo Test Suite**:
   ```javascript
   // Import and run the test suite
   const { runAllMCPTests } = require("./tests/e2e/mcp-demo.test.ts")
   await runAllMCPTests()
   ```

3. **Run Individual Tests**:
   ```javascript
   const { runAuthenticationTest, runJournalCreationTest } = require("./tests/e2e/mcp-demo.test.ts")
   
   // Test authentication
   await runAuthenticationTest()
   
   // Test journal creation
   await runJournalCreationTest()
   ```

## Available MCP Browser Tools

Claude Code provides these Playwright MCP tools:

- `mcp__playwright__browser_navigate` - Navigate to URLs
- `mcp__playwright__browser_snapshot` - Capture page state
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text into inputs
- `mcp__playwright__browser_wait_for` - Wait for text/elements
- `mcp__playwright__browser_take_screenshot` - Capture screenshots
- `mcp__playwright__browser_evaluate` - Execute JavaScript
- `mcp__playwright__browser_select_option` - Select dropdown options
- `mcp__playwright__browser_hover` - Hover over elements
- `mcp__playwright__browser_press_key` - Press keyboard keys

## Configuration Files

### Main Configurations

- **`playwright.mcp.config.ts`** - MCP-specific Playwright configuration
- **`.env.test`** - Test environment variables
- **`tests/helpers/mcp-browser-helper.ts`** - MCP browser interface abstraction
- **`tests/e2e/mcp-demo.test.ts`** - Example MCP test implementation
- **`scripts/run-mcp-tests.js`** - MCP test runner script

### Test Structure

```
tests/
├── accounts/              # Test user personas and credentials
├── e2e/                   # E2E test suites
│   ├── auth/              # Authentication flow tests
│   ├── user-journeys/     # Core user journey tests
│   ├── advanced-features/ # Advanced feature tests
│   └── mcp-demo.test.ts   # MCP test examples
├── fixtures/              # Test data factories
├── helpers/               # Test utilities and MCP integration
│   ├── mcp-browser-helper.ts  # MCP abstraction layer
│   └── mcp-browser-runner.ts  # MCP test runner
└── setup/                 # Global setup and teardown
```

## Test Commands

```bash
# Show MCP test guide
npm run test:mcp:guide

# Run MCP test information script
npm run test:mcp

# Run E2E tests with MCP configuration (requires actual Playwright)
npm run test:e2e:mcp

# Run test setup validation
npm run test:e2e:mcp:setup
```

## Test User Personas

The system creates 4 test user personas:

1. **New User** (`new-user@test.resonant.local`)
   - Empty state for testing onboarding
   - 0 relationships, 0 journal entries

2. **Active User** (`active-user@test.resonant.local`)
   - Moderate data for typical workflows
   - 4 relationships, 12 journal entries

3. **Power User** (`power-user@test.resonant.local`)
   - Extensive data for performance testing
   - 15 relationships, 50 journal entries

4. **Edge Case User** (`edge-case-user@test.resonant.local`)
   - Boundary conditions and special characters
   - 8 relationships, 25 journal entries with unicode content

## Example Test Patterns

### Authentication Test
```javascript
// Navigate to sign-in
await mcp__playwright__browser_navigate({ url: "http://localhost:3000/sign-in" })

// Fill credentials
await mcp__playwright__browser_type({
  element: "email input",
  ref: "input[type='email']",
  text: "active-user@test.resonant.local"
})

await mcp__playwright__browser_type({
  element: "password input",
  ref: "input[type='password']",
  text: "Test123!Active"
})

// Submit form
await mcp__playwright__browser_click({
  element: "sign in button",
  ref: "button[type='submit']"
})

// Wait for dashboard
await mcp__playwright__browser_wait_for({ text: "Dashboard" })
```

### Journal Entry Test
```javascript
// Navigate to new journal entry
await mcp__playwright__browser_navigate({ url: "http://localhost:3000/journal/new" })

// Fill form fields
await mcp__playwright__browser_type({
  element: "title input",
  ref: "input[name='title']",
  text: "My Test Entry"
})

await mcp__playwright__browser_type({
  element: "content textarea",
  ref: "textarea[name='content']",
  text: "This is a test journal entry."
})

// Select mood
await mcp__playwright__browser_click({
  element: "happy mood button",
  ref: "button[aria-label='happy']"
})

// Save entry
await mcp__playwright__browser_click({
  element: "save button",
  ref: "button[type='submit']"
})
```

## Prerequisites

Before running MCP tests:

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Start Convex Backend**:
   ```bash
   npm run convex:dev
   ```

3. **Ensure Test Environment**:
   - Copy `.env.local` to `.env.test` if needed
   - Verify test environment variables are set

## Global Setup Process

When tests run, the global setup:

1. Validates test environment configuration
2. Creates 4 test user personas
3. Seeds realistic test data for each persona
4. Prepares test database isolation
5. Logs detailed setup information

Example output:
```
🚀 Starting global test setup...
✅ Test environment validation passed
👥 Creating test account personas...
✅ Created 4 test account personas
🌱 Test data seeded for 4 personas
✅ Global test setup completed successfully
```

## Tips for MCP Testing

1. **Element Selection**: Use multiple selectors for reliability:
   ```javascript
   ref: "button[type='submit'], button:has-text('Sign In'), #sign-in-button"
   ```

2. **Wait Strategies**: Always wait for navigation/content:
   ```javascript
   await mcp__playwright__browser_wait_for({ text: "Dashboard", time: 5 })
   ```

3. **Snapshot for Debugging**: Take snapshots before assertions:
   ```javascript
   const snapshot = await mcp__playwright__browser_snapshot()
   console.log("Current page state:", snapshot)
   ```

4. **Error Handling**: Wrap tests in try-catch:
   ```javascript
   try {
     await runTest()
   } catch (error) {
     await mcp__playwright__browser_snapshot() // Capture error state
     throw error
   }
   ```

## Implementation Status

### ✅ Completed
- Test environment configuration
- MCP-specific Playwright config
- Test user personas and data generation
- Demo test implementation (`mcp-demo.test.ts`)
- MCP browser helper abstraction
- Test runner scripts and commands
- Global setup and teardown systems

### 🔄 Using MCP Tools
To run tests with Claude Code:
1. Use the examples in `tests/e2e/mcp-demo.test.ts`
2. Call MCP browser tools directly as shown above
3. Import and run test functions from the demo file

## Benefits of MCP Testing

- **No Browser Installation**: MCP server handles browser management
- **Cloud IDE Compatible**: Works in any environment with Claude Code
- **Consistent Test Data**: Deterministic personas and data generation
- **Real Browser Testing**: Uses actual browser automation, not mocks
- **TypeScript Support**: Full type safety for test development
- **Comprehensive Logging**: Detailed execution and debugging information

This configuration provides a complete E2E testing solution using Playwright MCP browser automation through Claude Code.