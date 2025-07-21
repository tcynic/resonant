import '@testing-library/jest-dom'

// Set up test environment variables to disable rate limiting during tests
process.env.NODE_ENV = 'test'
process.env.AI_RATE_LIMITING_DISABLED = 'true'
process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key-for-jest'

// Mock console methods to reduce noise during tests
const originalConsole = { ...console }
global.console = {
  ...console,
  info: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(), // Silence debug logs from cost tracker
  error: originalConsole.error, // Keep error for debugging
}
