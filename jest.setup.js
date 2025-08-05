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

// Create stable mock data objects to prevent infinite re-renders
const mockUserData = {
  _id: 'test-convex-user-id',
  clerkId: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: Date.now(),
  preferences: {
    reminderSettings: {
      enabled: true,
      frequency: 'daily',
      preferredTime: '09:00',
      timezone: 'America/New_York',
      doNotDisturbStart: '22:00',
      doNotDisturbEnd: '07:00',
      reminderTypes: {
        gentleNudge: true,
        relationshipFocus: true,
        healthScoreAlerts: false,
      },
    },
  },
}

const mockReminderAnalytics = {
  totalReminders: 15,
  clickedReminders: 8,
  clickThroughRate: 53.3,
  engagementScore: 72,
  deliveredReminders: 12,
  dismissedReminders: 2,
}

// Mock Convex with flexible implementations
jest.mock('convex/react', () => ({
  useQuery: jest.fn((queryRef, args) => {
    // Skip queries marked as 'skip'
    if (args === 'skip') return null

    // Return mock data based on query type
    const queryStr = String(queryRef)

    if (
      queryStr.includes('getUserByClerkId') ||
      queryStr.includes('users.getUserByClerkId')
    ) {
      return mockUserData
    }
    if (
      queryStr.includes('getUserReminderAnalytics') ||
      queryStr.includes('notifications.getUserReminderAnalytics')
    ) {
      return mockReminderAnalytics
    }
    if (queryStr.includes('getLatestByUserId')) {
      return [
        {
          _id: 'test-health-score-id',
          userId: 'test-convex-user-id',
          relationshipId: 'test-relationship-id',
          overallScore: 85,
          communicationScore: 90,
          intimacyScore: 80,
          conflictResolutionScore: 85,
          createdAt: Date.now(),
          componentScores: {
            sentiment: 85,
            emotionalStability: 80,
            energyImpact: 90,
            conflictResolution: 75,
            gratitude: 85,
            communicationFrequency: 90,
          },
          confidenceLevel: 0.85,
          dataPoints: 10,
          lastUpdated: Date.now(),
        },
      ]
    }
    if (
      queryStr.includes('getByUserId') &&
      queryStr.includes('journalEntries')
    ) {
      return [
        {
          _id: 'test-entry-id',
          userId: 'test-convex-user-id',
          content: 'Test journal entry',
          mood: 'happy',
          tags: ['test'],
          createdAt: Date.now(),
        },
        {
          _id: 'test-entry-id-2',
          userId: 'test-convex-user-id',
          content: 'Another test entry',
          mood: 'content',
          tags: ['test2'],
          createdAt: Date.now() - 86400000,
        },
        {
          _id: 'test-entry-id-3',
          userId: 'test-convex-user-id',
          content: 'Third test entry',
          mood: 'grateful',
          tags: ['test3'],
          createdAt: Date.now() - 172800000,
        },
      ]
    }
    if (
      queryStr.includes('getByUserId') &&
      queryStr.includes('relationships')
    ) {
      return [
        {
          _id: 'test-relationship-id',
          userId: 'test-convex-user-id',
          name: 'Sarah',
          type: 'partner',
          createdAt: Date.now(),
        },
      ]
    }

    // Dashboard queries
    if (queryStr.includes('getDashboardData')) {
      return {
        relationships: [
          {
            _id: 'test-relationship-id',
            name: 'Sarah',
            type: 'partner',
            healthScore: {
              _id: 'test-health-score-id',
              overallScore: 85,
              componentScores: {
                sentiment: 85,
                emotionalStability: 80,
                energyImpact: 90,
                conflictResolution: 75,
                gratitude: 85,
                communicationFrequency: 90,
              },
              confidenceLevel: 0.85,
              dataPoints: 10,
              lastUpdated: Date.now(),
            },
          },
        ],
        stats: {
          totalEntries: 3,
          totalRelationships: 1,
          avgHealthScore: 85,
          lastUpdated: Date.now(),
        },
      }
    }

    if (queryStr.includes('getDashboardStats')) {
      return {
        totalEntries: 3,
        totalRelationships: 1,
        avgHealthScore: 85,
        analysisRate: 0.85,
        lastUpdated: Date.now(),
      }
    }

    if (queryStr.includes('getRecentActivity')) {
      return [
        {
          _id: 'test-entry-id',
          userId: 'test-convex-user-id',
          content: 'Test journal entry',
          mood: 'happy',
          tags: ['test'],
          createdAt: Date.now(),
          relationship: {
            _id: 'test-relationship-id',
            name: 'Sarah',
            type: 'partner',
          },
          analysisStatus: {
            sentimentScore: 85,
            emotions: ['happy', 'grateful'],
            confidence: 0.85,
          },
          preview: 'Test journal entry preview...',
        },
      ]
    }

    if (queryStr.includes('getDashboardTrends')) {
      return [
        {
          date: Date.now() - 172800000, // 2 days ago
          Sarah: 83,
        },
        {
          date: Date.now() - 86400000, // 1 day ago
          Sarah: 84,
        },
        {
          date: Date.now(), // today
          Sarah: 85,
        },
      ]
    }

    // Default return null for unhandled queries
    return null
  }),
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
