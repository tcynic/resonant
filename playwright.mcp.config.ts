import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

/**
 * Playwright configuration for MCP browser integration
 * This configuration disables local browser management entirely
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests sequentially for MCP integration */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* No retries for MCP testing */
  retries: 0,

  /* Single worker for MCP integration */
  workers: 1,

  /* Reporter to use */
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/mcp-results.json' }],
  ],

  /* Shared settings - no browser launch */
  use: {
    /* Base URL for navigation */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* No trace, screenshot, or timeout settings needed for MCP */
    actionTimeout: 0,
    navigationTimeout: 0,

    /* Disable headless mode since we're not launching browsers */
    headless: undefined,
  },

  /* No projects defined - MCP handles browser management */
  projects: [],

  /* Test output directories */
  outputDir: 'test-results/mcp/',

  /* No timeout - MCP manages execution */
  timeout: 0,

  /* No expect timeout */
  expect: {
    timeout: 0,
  },

  /* Global setup and teardown - keep these for data management */
  globalSetup: require.resolve('./tests/setup/global-setup.ts'),
  globalTeardown: require.resolve('./tests/setup/global-teardown.ts'),

  /* Web server configuration for local testing */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
