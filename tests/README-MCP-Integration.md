# MCP Browser Integration for E2E Testing

## Overview

This project is now configured to run Playwright E2E tests using the MCP (Model Context Protocol) browser server instead of local browser installations. This setup enables running browser automation tests through the Claude Code environment.

## Configuration Files

### Main Configurations

- **`playwright.mcp.config.ts`** - MCP-specific Playwright configuration
- **`.env.test`** - Test environment variables
- **`tests/helpers/mcp-browser-helper.ts`** - MCP browser interface abstraction

### Test Structure

```
tests/
├── accounts/              # Test user personas and credentials
├── e2e/                   # E2E test suites
│   └── auth/              # Authentication flow tests
├── fixtures/              # Test data factories
├── helpers/               # Test utilities and MCP integration
└── setup/                 # Global setup and teardown
```

## Running Tests

### MCP Test Commands

```bash
# Run all MCP tests (test infrastructure validation)
npm run test:e2e:mcp

# Run specific test files with MCP configuration
npx playwright test --config=playwright.mcp.config.ts

# Validate test infrastructure only
npx playwright test --config=playwright.mcp.config.ts tests/setup/test-setup-validation.test.ts
```

### Test Environment Setup

The MCP configuration includes:

✅ **Global Setup/Teardown**: Creates test accounts and seeds data  
✅ **No Browser Launch**: Skips local browser management (handled by MCP)  
✅ **Test Data Factory**: Generates realistic test data for 4 user personas  
✅ **Environment Isolation**: Separate test configuration and environment  
✅ **TypeScript Integration**: Full type safety for test development  

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

## MCP Browser Helper Interface

The `MCPBrowserHelper` class provides an abstraction layer for MCP browser operations:

```typescript
import { createMCPBrowser } from '../helpers/mcp-browser-helper'

const browser = createMCPBrowser()
await browser.navigate('/')
await browser.click('button[data-testid="sign-up"]')
await browser.type('input[name="email"]', 'test@example.com')
```

## Implementation Status

### ✅ Completed

- Test environment configuration
- Test user personas and data generation
- Global setup and teardown systems
- MCP configuration without browser launch conflicts
- Test data factory with realistic data generation
- Authentication helpers framework
- TypeScript integration and type safety

### 🔄 Next Steps for Full MCP Integration

To complete the MCP browser integration, tests need to be implemented using the actual MCP browser tools:

1. **Replace placeholder methods** in `mcp-browser-helper.ts` with actual MCP tool calls
2. **Implement E2E test scenarios** using the MCP browser interface
3. **Add error handling** for MCP browser tool failures
4. **Create test utilities** for common MCP browser operations

### Example MCP Implementation Pattern

```typescript
// In actual MCP tests, replace placeholders with:
// await mcp_playwright_browser_navigate({ url: '/' })
// await mcp_playwright_browser_click({ element: 'Sign Up', ref: 'button' })
// await mcp_playwright_browser_type({ element: 'Email', ref: 'input', text: email })
```

## Global Setup Output

When tests run, you'll see comprehensive logging:

```
🚀 Starting global test setup...
✅ Test environment validation passed
✅ Test database isolation setup prepared
👥 Creating test account personas...
✅ Created 4 test account personas
🌱 Test data seeded for 4 personas
✅ Global test setup completed successfully
ℹ️  Browser management handled by MCP server - skipping local browser warmup
```

## Configuration Benefits

- **No Browser Installation Required**: MCP handles browser management
- **Deterministic Test Data**: Consistent test accounts and data generation
- **Environment Isolation**: Separate test database and configuration
- **Type Safety**: Full TypeScript support for test development
- **Comprehensive Logging**: Detailed setup and execution logging
- **Scalable Architecture**: Ready for complex E2E test scenarios

## Test Data Generation

The system automatically generates:

- **Realistic Names**: Diverse, culturally appropriate names
- **Varied Content**: Different moods, tags, and relationship types
- **Edge Cases**: Unicode characters, long content, special cases
- **Deterministic IDs**: Consistent user identification for reliable testing

This configuration provides a solid foundation for comprehensive E2E testing with MCP browser integration.