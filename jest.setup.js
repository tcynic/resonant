import '@testing-library/jest-dom'

// Set up test environment variables to disable rate limiting during tests
process.env.NODE_ENV = 'test'
process.env.AI_RATE_LIMITING_DISABLED = 'true'
process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key-for-jest'

// LangExtract configuration
process.env.LANGEXTRACT_ENABLED = 'true'
process.env.LANGEXTRACT_TIMEOUT_MS = '5000'
process.env.LANGEXTRACT_MAX_RETRIES = '2'
process.env.LANGEXTRACT_FALLBACK_ENABLED = 'true'

// AI configuration for comprehensive testing
process.env.AI_RATE_LIMIT_ENABLED = 'false'
process.env.AI_COST_TRACKING_ENABLED = 'false'
process.env.AI_MAX_TOKENS_PER_REQUEST = '1000'
process.env.AI_TIMEOUT_MS = '5000'
process.env.AI_ANALYSIS_RATE_LIMIT = '1000'
process.env.AI_ANALYSIS_BATCH_SIZE = '5'
process.env.AI_ANALYSIS_TIMEOUT = '10000'

// Suppress JSDOM navigation warnings in console output
const originalConsoleError = console.error
console.error = (...args) => {
  // Suppress specific JSDOM navigation warnings
  if (
    args[0] &&
    args[0].toString &&
    args[0].toString().includes('Not implemented: navigation')
  ) {
    return
  }
  // Call original for other errors
  return originalConsoleError.apply(console, args)
}

// Mock URL.createObjectURL and revokeObjectURL for file downloads
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

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

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  notFound: jest.fn(() => {
    throw new Error('Not Found')
  }),
}))

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => null),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
  ConvexProvider: ({ children }) => children,
  ConvexReactClient: jest.fn(),
}))
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
  useConvexUserId: jest.fn(() => 'test-convex-user-id'),
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
    aiAnalysis: {
      getStatusWithQueue: { _isConvexFunction: true },
      getByEntryId: { _isConvexFunction: true },
      create: { _isConvexFunction: true },
      update: { _isConvexFunction: true },
      getProcessingStats: { _isConvexFunction: true },
      getUserActiveProcessing: { _isConvexFunction: true },
    },
    notifications: {
      updateReminderSettings: { _isConvexFunction: true },
      getReminderSettings: { _isConvexFunction: true },
      getReminderAnalytics: { _isConvexFunction: true },
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
