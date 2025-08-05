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

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: props => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock Convex
jest.mock('convex/react')
jest.mock('convex-test')

// Mock notification hooks
jest.mock('@/hooks/notifications/use-browser-notifications', () => ({
  useBrowserNotifications: jest.fn(() => ({
    permission: 'granted',
    requestPermission: jest.fn().mockResolvedValue('granted'),
    showNotification: jest.fn().mockResolvedValue(undefined),
    isSupported: true,
  })),
}))

// Mock useConvexUser hook
jest.mock('@/hooks/use-convex-user', () => ({
  useConvexUser: jest.fn(() => ({
    convexUser: {
      _id: 'test-convex-user-id',
      clerkId: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      createdAt: Date.now(),
    },
    isLoading: false,
    isCreating: false,
    error: null,
  })),
}))

// Mock useIsClient hook
jest.mock('@/hooks/use-is-client', () => ({
  useIsClient: jest.fn(() => true),
}))

// Mock Convex API
jest.mock('@/convex/_generated/api', () => ({
  api: {
    users: {
      getUserByClerkId: { _isConvexFunction: true },
    },
    dataExport: {
      getExportStatistics: { _isConvexFunction: true },
      createExport: { _isConvexFunction: true },
      createExportJob: { _isConvexFunction: true },
    },
    journalEntries: {
      search: { _isConvexFunction: true },
      getByUserId: { _isConvexFunction: true },
    },
    healthScores: {
      getLatestByUserId: { _isConvexFunction: true },
    },
    relationships: {
      getByUserId: { _isConvexFunction: true },
    },
    dashboard: {
      getDashboardData: { _isConvexFunction: true },
      getDashboardStats: { _isConvexFunction: true },
      getRecentActivity: { _isConvexFunction: true },
      getDashboardTrends: { _isConvexFunction: true },
    },
  },
}))

// Global cleanup after each test
afterEach(() => {
  // Clear all mocks to prevent memory leaks
  jest.clearAllMocks()
  jest.restoreAllMocks()

  // Clear any pending timers
  jest.clearAllTimers()

  // Restore console methods
  global.console = {
    ...console,
    info: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    error: originalConsole.error,
  }
})

// Clean up after all tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole
})
