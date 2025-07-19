import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

/**
 * Playwright configuration for E2E testing with MCP integration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel - reduced for MCP integration */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  
  /* Opt out of parallel tests for MCP integration */
  workers: 1,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  /* Shared settings for all tests */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Global timeout for all actions */
    actionTimeout: 15000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors for test environment */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for testing - simplified for MCP */
  projects: [
    {
      name: 'mcp-browser',
      use: { 
        viewport: { width: 1280, height: 720 },
        // Skip browser launch - handled by MCP server
        launchOptions: {
          // Disable local browser launch
        },
      },
    },
  ],

  /* Test output directories */
  outputDir: 'test-results/',
  
  /* Maximum time one test can run */
  timeout: 120000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 15000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),
})